import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const js = fs.readFileSync('subPackage/pages/management/staff/staff.js', 'utf8')
const wxml = fs.readFileSync('subPackage/pages/management/staff/staff.wxml', 'utf8')

test('账户管理提供专职回仓和兼职末站结束操作', () => {
  assert.match(wxml, /专职·回仓/)
  assert.match(wxml, /兼职·末站结束/)
  assert.match(wxml, /bindtap="onDriverEmploymentTypeTap"/)
  assert.match(wxml, /data-type="FULL_TIME"/)
  assert.match(wxml, /data-type="PART_TIME"/)
})

test('司机类型更新复用正式Server接口并携带操作人', () => {
  assert.match(js, /updateDriverEmploymentType/)
  assert.match(js, /operatorUserId:\s*this\.data\.userId/)
  assert.match(js, /employmentType:\s*employmentType/)
  assert.match(js, /已经确认的装车路线保持原策略/)
})

test('缺省司机类型按专职处理并优先采用Server司机卡状态', () => {
  assert.match(js, /card && card\.employmentType \? card\.employmentType : user\.nxDiuDriverEmploymentType/)
  assert.match(js, /=== 'PART_TIME' \? 'PART_TIME' : 'FULL_TIME'/)
})

test('业务员与老板小程序用户独立分区显示', () => {
  assert.match(wxml, /老板小程序用户/)
  assert.match(wxml, /wx:for="\{\{ownerUserArr\}\}"/)
  assert.match(wxml, /业务员小程序用户/)
  assert.match(wxml, /wx:for="\{\{salesUserArr\}\}"/)
  assert.doesNotMatch(wxml, /老板、录单员和业务员/)
  assert.ok(wxml.indexOf('老板小程序用户') < wxml.indexOf('业务员小程序用户'))
})

test('录单员和业务员通过三个点菜单进入负责客户', () => {
  assert.match(wxml, /editUserItem\.nxDiuAdmin == 1 \|\| editUserItem\.nxDiuAdmin == 3/)
  assert.match(wxml, /查看负责客户/)
  assert.equal((wxml.match(/bindtap="toStaffCustomers"/g) || []).length, 1)
  assert.doesNotMatch(wxml, /staff-customer-button/)
  assert.match(js, /staffCustomers\/staffCustomers\?disId=/)
  assert.match(js, /user\.nxDiuAdmin != 1 && user\.nxDiuAdmin != 3/)
})

test('账户列表使用分组卡片和统一底部操作菜单', () => {
  assert.equal((wxml.match(/class="staff-group-card"/g) || []).length, 4)
  assert.match(wxml, /class="operation-sheet"/)
  assert.equal((wxml.match(/class="operation-menu"/g) || []).length, 2)
  assert.match(wxml, /class="operation-cancel"/)
  assert.match(js, /stopPropagation\(\) \{\}/)
})

test('账户管理页面标签完整闭合', () => {
  for (const tag of ['view', 'text', 'picker', 'button']) {
    const opens = (wxml.match(new RegExp('<' + tag + '\\b', 'g')) || []).length
    const closes = (wxml.match(new RegExp('</' + tag + '>', 'g')) || []).length
    assert.equal(opens, closes, `${tag} 标签必须完整闭合`)
  }
})

test('接口人员数据不再合并业务员', () => {
  assert.match(js, /var ownerUsers = admins\.concat\(clerks\)\.map/)
  assert.match(js, /var salesUsers = sales\.map/)
  assert.match(js, /ownerUserArr:\s*ownerUsers/)
  assert.match(js, /salesUserArr:\s*salesUsers/)
  assert.doesNotMatch(js, /combinedStaff/)
})

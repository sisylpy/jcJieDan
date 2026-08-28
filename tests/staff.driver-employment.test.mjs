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

import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const app = JSON.parse(fs.readFileSync('app.json', 'utf8'))
const api = fs.readFileSync('lib/apiDistributer.js', 'utf8')
const js = fs.readFileSync(
  'subPackage/pages/management/staffCustomers/staffCustomers.js',
  'utf8'
)
const wxml = fs.readFileSync(
  'subPackage/pages/management/staffCustomers/staffCustomers.wxml',
  'utf8'
)
const wxss = fs.readFileSync(
  'subPackage/pages/management/staffCustomers/staffCustomers.wxss',
  'utf8'
)

test('负责客户页面已注册到老板小程序', () => {
  const managementPackage = app.subPackages.find(item => item.root === 'subPackage/')
  assert.ok(managementPackage)
  assert.ok(managementPackage.pages.includes('pages/management/staffCustomers/staffCustomers'))
})

test('客户接口支持按业务员或录单员筛选', () => {
  assert.match(api, /disGetAllCustomer = \(disId, labelId, responsibleUserId\)/)
  assert.match(api, /responsibleUserId=/)
  assert.match(js, /disGetAllCustomer\(this\.data\.disId, null, this\.data\.targetUserId\)/)
})

test('客户列表允许同时修正业务员和录单员', () => {
  assert.match(wxml, /负责业务员/)
  assert.match(wxml, /bindchange="onSalesChange"/)
  assert.match(wxml, /负责录单员/)
  assert.match(wxml, /bindchange="onClerkChange"/)
  assert.match(wxml, /bindtap="saveCustomerAssignment"/)
  assert.match(js, /updateCustomerResponsibility\(customer\.nxDepartmentId/)
  assert.match(js, /salesUserId:\s*salesOption\.id/)
  assert.match(js, /clerkUserId:\s*clerkOption\.id/)
  assert.match(js, /expectedVersion:\s*Number\(customer\.nxDepartmentStaffVersion\)/)
})

test('保存后重新按当前员工过滤客户', () => {
  assert.match(js, /_applySavedAssignment\(customer\.nxDepartmentId, result\.data \|\| \{\}\)/)
  assert.match(js, /const stillAssigned = this\.data\.targetRole === 3/)
  assert.match(js, /return this\._reloadCustomers\(\)/)
  assert.match(wxml, /保存后该客户会从本列表移除/)
})

test('新页面结构和关键样式完整', () => {
  for (const tag of ['view', 'text', 'scroll-view', 'button', 'picker']) {
    const opens = (wxml.match(new RegExp('<' + tag + '\\b', 'g')) || []).length
    const closes = (wxml.match(new RegExp('</' + tag + '>', 'g')) || []).length
    assert.equal(opens, closes, `${tag} 标签必须完整闭合`)
  }
  assert.match(wxss, /\.customer-card\s*\{/)
  assert.match(wxss, /\.assignment-picker\s*\{/)
  assert.match(wxss, /safe-area-inset-bottom/)
})

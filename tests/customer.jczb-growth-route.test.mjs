import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const source = fs.readFileSync('subPackage/pages/customer/index/index.js', 'utf8')
const start = source.indexOf('toYifaPage(e)')
const end = source.indexOf('toInviteGb()', start)
const jczbRouteSource = source.slice(start, end)

test('精彩账本客户统一进入新版客户成长详情', () => {
  assert.ok(start >= 0 && end > start)
  assert.match(jczbRouteSource, /customerGrowth\/customerGrowth\?depId=/)
  assert.match(jczbRouteSource, /wx\.setStorageSync\('depInfo', customer\)/)
  assert.doesNotMatch(jczbRouteSource, /customerPageGb\/customerPageGb/)
  assert.doesNotMatch(jczbRouteSource, /customerPage\/customerPage\?depId=/)
})

test('精彩账本客户优先采用关系中的NX Department', () => {
  assert.match(jczbRouteSource, /business\.nxDgdFromNxDepId/)
  assert.match(jczbRouteSource, /business\.fromNxDepartment/)
  assert.match(jczbRouteSource, /embeddedCustomer\.nxDepartmentId/)
})

test('历史关系按精彩账本商户ID匹配本地客户并可重新同步', () => {
  assert.match(jczbRouteSource, /nxDepartmentGbDistributerId/)
  assert.match(jczbRouteSource, /myCustomerArrOne/)
  assert.match(jczbRouteSource, /myCustomerArrTwo/)
  assert.match(jczbRouteSource, /disGetAllCustomer\(this\.data\.disId\)/)
  assert.match(jczbRouteSource, /客户资料正在同步，请稍后重试/)
})

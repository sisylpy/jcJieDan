import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const js = fs.readFileSync('subPackage-order/pages/order/orderPageGb/orderPageGb.js', 'utf8')
const wxml = fs.readFileSync('subPackage-order/pages/order/orderPageGb/orderPageGb.wxml', 'utf8')
const wxss = fs.readFileSync('subPackage-order/pages/order/orderPageGb/orderPageGb.wxss', 'utf8')

test('GB客户订单在平铺和分部门结构中都整理客户要求', () => {
  assert.match(js, /page\._decorateCustomerStandards\(platformDisplay\.normalizeOrder\(order\)\)/)
  assert.equal((js.match(/page\._decorateCustomerStandards/g) || []).length, 2)
  assert.match(js, /relation\.nxDepartmentDisGoodsStandardItems\s*\|\| order\.customerStandardItems/)
  assert.match(js, /order\._hasCustomerStandards = displayItems\.length > 0/)
})

test('GB客户订单两种列表结构都显示客户要求', () => {
  assert.equal((wxml.match(/wx:if="\{\{order\._hasCustomerStandards\}\}"/g) || []).length, 2)
  assert.equal((wxml.match(/wx:for="\{\{order\._customerStandardItems\}\}"/g) || []).length, 2)
  assert.match(wxml, /customer-standard-label/)
  assert.match(wxml, /customer-standard-text/)
})

test('GB客户要求复用普通订单页的视觉层级', () => {
  assert.match(wxss, /\.customer-standard-line\s*\{/)
  assert.match(wxss, /border-left:\s*6rpx solid #178f83/)
  assert.match(wxss, /\.customer-standard-text\s*\{[\s\S]*font-size:\s*27rpx/)
})

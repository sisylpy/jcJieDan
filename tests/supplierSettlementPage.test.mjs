import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('supplier settlement page uses business names and explicit workflow states', () => {
  const page = read('subPackage/pages/management/purchaseManagement/settlementList/settlementList.wxml')
  const logic = read('subPackage/pages/management/purchaseManagement/settlementList/settlementList.js')
  assert.match(page, /supplierLabel/)
  assert.match(page, /goodsLabel/)
  assert.match(page, /goodsCountText/)
  assert.match(page, /等待供应商在精彩订货确认结算金额/)
  assert.match(page, /登记供应商付款/)
  assert.doesNotMatch(page, /供应商 \{\{item\.supplierRelationId\}\} · 商品 \{\{item\.purchaseGoodsId\}\}/)
  assert.match(logic, /一次只能结算同一供应商/)
  assert.match(logic, /paymentRequestKey/)
})

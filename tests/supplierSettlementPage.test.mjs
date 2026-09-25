import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('supplier settlement page uses business names and explicit workflow states', () => {
  const page = read('subPackage/pages/management/purchaseManagement/settlementList/settlementList.wxml')
  const logic = read('subPackage/pages/management/purchaseManagement/settlementList/settlementList.js')
  assert.match(page, /supplierLabel/)
  assert.match(page, /goodsLabel/)
  assert.match(page, /item\.quantityText/)
  assert.match(page, /等待供应商在精彩订货核对结账明细/)
  assert.match(page, /登记实际付款/)
  assert.match(page, /选择付款截图/)
  assert.doesNotMatch(page, /供应商 \{\{item\.supplierRelationId\}\} · 商品 \{\{item\.purchaseGoodsId\}\}/)
  assert.match(logic, /supplierRelationId: this\.data\.supplier\.supplierRelationId/)
  assert.match(logic, /paymentRequestKey/)
  assert.match(logic, /pendingVoucherPath/)
})

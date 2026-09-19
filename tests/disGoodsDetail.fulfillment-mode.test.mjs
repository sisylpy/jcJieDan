import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'

const require = createRequire(import.meta.url)
const fulfillmentUi = require('../utils/disGoodsFulfillmentUi.js')
const pageSource = readFileSync('subPackage/pages/goods/disGoodsDetail/disGoodsDetail.js', 'utf8')
const templateSource = readFileSync('subPackage/pages/goods/disGoodsDetail/disGoodsDetail.wxml', 'utf8')

test('履约选择态兼容历史2并从当前supplier组合识别自动订货', () => {
  assert.equal(fulfillmentUi.resolveMode({ nxDgPurchaseAuto: -1 }), 'stock')
  assert.equal(fulfillmentUi.resolveMode({ nxDgPurchaseAuto: 1 }), 'purchase')
  assert.equal(fulfillmentUi.resolveMode({ nxDgPurchaseAuto: 1, nxDgSupplierId: 88 }), 'auto')
  assert.equal(fulfillmentUi.resolveMode({ nxDgPurchaseAuto: 2 }), 'auto')
})

test('出库与采购只提交后端支持的数值且人工采购清除供应商', () => {
  const source = {
    nxDgPurchaseAuto: 2,
    nxDgSupplierId: 88,
    nxJrdhSupplierEntity: { nxJrdhsSupplierName: '供货商' }
  }

  const stock = fulfillmentUi.prepareForSave(source, 'stock')
  assert.equal(stock.ok, true)
  assert.equal(stock.goods.nxDgPurchaseAuto, -1)
  assert.equal(stock.goods.nxDgSupplierId, 88)

  const purchase = fulfillmentUi.prepareForSave(source, 'purchase')
  assert.equal(purchase.ok, true)
  assert.equal(purchase.goods.nxDgPurchaseAuto, 1)
  assert.equal(purchase.goods.nxDgSupplierId, null)
  assert.equal(purchase.goods.nxJrdhSupplierEntity, null)
})

test('自动订货保存为采购履约并要求有效供应商', () => {
  const missingSupplier = fulfillmentUi.prepareForSave({ nxDgPurchaseAuto: 2 }, 'auto')
  assert.equal(missingSupplier.ok, false)

  const configured = fulfillmentUi.prepareForSave({
    nxDgPurchaseAuto: 2,
    nxDgSupplierId: '88'
  }, 'auto')
  assert.equal(configured.ok, true)
  assert.equal(configured.goods.nxDgPurchaseAuto, 1)
  assert.equal(typeof configured.goods.nxDgPurchaseAuto, 'number')
})

test('商品详情页不再把自动订货直接写为purchaseAuto 2', () => {
  assert.doesNotMatch(pageSource, /name:\s*['"]2['"]\s*,\s*value:\s*['"]自动订货['"]/)
  assert.match(pageSource, /fulfillmentUi\.MODE_AUTO/)
  assert.match(templateSource, /fulfillmentUiMode == 'auto'/)
  assert.doesNotMatch(templateSource, /goods\.nxDgPurchaseAuto == 2/)
})

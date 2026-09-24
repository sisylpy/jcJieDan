import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('supplier settlement uses one scoped owner fact flow', () => {
  const page = read('subPackage/pages/management/purchaseManagement/settlementList/settlementList.js')
  const api = read('lib/apiSupplierSettlement.js')
  assert.match(api, /ownerRequest/)
  assert.match(api, /purchase-finance\/settlement-suppliers/)
  assert.match(page, /supplierRelationId/)
  assert.match(page, /getPurchaseFundingAllocations/)
  assert.match(page, /getSupplierSettlement/)
  assert.match(page, /recordPurchaseFinancePayment/)
  assert.match(page, /paymentRequestKey/)
  assert.match(page, /uploadPurchasePaymentVoucher/)
})

test('supplier settlement page distinguishes sources, batches, payments and evidence', () => {
  const view = read('subPackage/pages/management/purchaseManagement/settlementList/settlementList.wxml')
  for (const text of ['尚未开结账单', '已开单未付', '金额待核对', '采购来源', '付款与凭证',
    '确认生成结账单', '登记实际付款', '剩余未付', '凭证缺失']) assert.match(view, new RegExp(text))
  assert.match(view, /item\.quantityText/)
  assert.match(view, /item\.unitPriceText/)
  assert.match(view, /item\.subtotalText/)
  assert.match(view, /不会自动发起微信或银行转账/)
})

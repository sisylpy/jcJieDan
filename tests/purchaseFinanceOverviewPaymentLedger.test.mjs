import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('purchase finance overview separates current obligations from payment period', () => {
  const api = read('lib/apiDistributer.js')
  const logic = read('subPackage/pages/management/purchaseManagement/financeOverview/financeOverview.js')
  const view = read('subPackage/pages/management/purchaseManagement/financeOverview/financeOverview.wxml')
  assert.match(api, /getPurchaseFinanceOverview = data/)
  assert.match(logic, /periodStart.*periodEnd/)
  assert.match(logic, /pendingReimbursementAmount/)
  assert.match(logic, /settlementOutstandingAmount/)
  assert.match(logic, /pendingReviewAmount/)
  assert.match(logic, /amountToVerify/)
  assert.match(view, /尚未生成报销单/)
  assert.match(view, /报销单尚未付清/)
  assert.match(view, /尚未生成结账单/)
  assert.match(view, /结账单尚未付清/)
  assert.match(view, /全部历史未结事实/)
  assert.match(view, /按实际付款日期筛选/)
  assert.doesNotMatch(view, /资金总览.*pm-grid/)
})

test('overview drilldowns carry exact purchaser supplier and payment ids', () => {
  const overview = read('subPackage/pages/management/purchaseManagement/financeOverview/financeOverview.js')
  const reimbursement = read('subPackage/pages/management/purchaseManagement/reimbursementList/reimbursementList.js')
  const settlement = read('subPackage/pages/management/purchaseManagement/settlementList/settlementList.js')
  assert.match(overview, /purchaserUserId=/)
  assert.match(overview, /supplierRelationId=/)
  assert.match(overview, /paymentId=/)
  assert.match(reimbursement, /requestedPurchaserId/)
  assert.match(reimbursement, /requestedBatchId/)
  assert.match(settlement, /requestedSupplierId/)
  assert.match(settlement, /requestedBatchId/)
})

test('unified payment ledger uses server summary and traceable detail', () => {
  const api = read('lib/apiDistributer.js')
  const logic = read('subPackage/pages/management/purchaseManagement/paymentList/paymentList.js')
  const view = read('subPackage/pages/management/purchaseManagement/paymentList/paymentList.wxml')
  assert.match(api, /getPurchasePaymentLedger/)
  assert.match(api, /getPurchaseFinancePayment/)
  for (const token of ['businessType', 'recipientType', 'recipientKeyword', 'periodStart', 'periodEnd']) {
    assert.match(logic, new RegExp(token))
  }
  assert.match(logic, /summary: data\.summary/)
  assert.match(logic, /getPurchaseFinancePayment\(id\)/)
  assert.match(logic, /sourceType === 'REIMBURSEMENT'/)
  assert.match(logic, /sourceType === 'SETTLEMENT'/)
  for (const text of ['实际付款日期', '净付款', '采购员报销', '供应商货款', '对应来源单据', '付款凭证', '上传凭证', '冲正付款']) {
    assert.match(view, new RegExp(text))
  }
})

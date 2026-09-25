import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8')
test('stage3 finance pages are registered and use owner facts',()=>{
  const app=JSON.parse(read('app.json'))
  const pages=app.subPackages.flatMap(p=>(p.pages||[]).map(x=>p.root+'/'+x))
  ;['financeOverview','fundingClassification','reimbursementList','settlementList','paymentList','financeExceptionList']
    .forEach(name=>assert.ok(pages.some(p=>p.includes('/'+name+'/'+name)),name))
  const api=read('lib/apiDistributer.js')
  const ownerRequest=read('lib/ownerRequest.js')
  assert.match(api,/purchase-finance\//)
  assert.match(ownerRequest,/value\.replace\('\/api\/', OWNER_PREFIX\)/)
  assert.match(ownerRequest,/const OWNER_PREFIX = '\/api\/owner\/'/)
  assert.match(api,/Idempotency-Key/)
  assert.match(api,/confirmPurchaseFundingAllocation/)
  assert.match(api,/getPurchaserReimbursementPeople/)
  assert.match(read('subPackage/pages/management/purchaseManagement/fundingClassification/fundingClassification.js'),/COMPANY_DIRECT_PURCHASE/)
  assert.match(api,/downloadPurchasePaymentVoucher/)
  const stage3=api.slice(api.indexOf('// ===== 采购资金中心'))
  assert.doesNotMatch(stage3,/finishPayPurchaseBatch/)
})

test('funding, reimbursement and settlement screens expose core actions',()=>{
  assert.match(read('subPackage/pages/management/purchaseManagement/fundingClassification/fundingClassification.wxml'),/资金类型/)
  const reimbursementPage=read('subPackage/pages/management/purchaseManagement/reimbursementList/reimbursementList.wxml')
  const reimbursementLogic=read('subPackage/pages/management/purchaseManagement/reimbursementList/reimbursementList.js')
  assert.match(reimbursementPage,/汇总生成报销批次/)
  assert.match(reimbursementPage,/登记实际付款/)
  assert.match(reimbursementPage,/已付.*剩余/)
  assert.match(reimbursementPage,/上传凭证/)
  assert.match(reimbursementLogic,/paymentRequestKey/)
  assert.match(reimbursementLogic,/getPurchaserReimbursement/)
  assert.match(read('subPackage/pages/management/purchaseManagement/settlementList/settlementList.wxml'),/建立结算批次/)
  assert.match(read('subPackage/pages/management/purchaseManagement/paymentList/paymentList.wxml'),/上传凭证/)
  assert.match(read('subPackage/pages/management/purchaseManagement/paymentList/paymentList.wxml'),/作废/)
  assert.match(read('subPackage/pages/management/purchaseManagement/paymentList/paymentList.wxml'),/openVoucher/)
  assert.match(read('subPackage/pages/management/purchaseManagement/fundingClassification/fundingClassification.wxml'),/采购员垫付申报待确认/)
})

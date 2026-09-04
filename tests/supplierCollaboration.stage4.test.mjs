import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8')

test('Boss registers one protected supplier collaboration screen',()=>{
  const app=JSON.parse(read('app.json'))
  const pages=app.subPackages.find(p=>p.root==='subPackage/').pages
  assert.ok(pages.includes('pages/management/purchaseManagement/supplierCollaboration/supplierCollaboration'))
  const api=read('lib/apiDistributer.js')
  for(const method of ['createSupplierInvitation','reissueSupplierInvitation','getSupplierCollaborationRelations',
    'getSupplierCollaborationBatches','getSupplierCollaborationBatch','actSupplierRemainingDemand',
    'assignSupplierResponsiblePurchaser']) assert.match(api,new RegExp(method))
  assert.match(api,/supplier-collaboration\//)
  assert.match(read('lib/ownerRequest.js'),/const OWNER_PREFIX = '\/api\/owner\/'/)
})

test('Boss page exposes invitation ownership progress and remaining demand actions',()=>{
  const js=read('subPackage/pages/management/purchaseManagement/supplierCollaboration/supplierCollaboration.js')
  const wxml=read('subPackage/pages/management/purchaseManagement/supplierCollaboration/supplierCollaboration.wxml')
  assert.match(wxml,/首次邀请人/)
  assert.match(wxml,/当前负责人/)
  assert.match(wxml,/只影响新批次/)
  assert.match(wxml,/自动订货/)
  assert.match(wxml,/买方收货/)
  for(const action of ['WAIT','SELF_BUY','CHANGE_SUPPLIER','CANCEL']) assert.match(wxml,new RegExp(action))
  assert.doesNotMatch(js,/shortageQuantity\s*=/)
  assert.doesNotMatch(js,/buyerReceiptStatus\s*=/)
})

test('旧供应商入口统一进入安全邀请与供应协同页面',()=>{
  const legacySupplier=read('subPackage-supplier/pages/supplier/index/index.js')
  const addEntry=legacySupplier.match(/addSupplier\(\)\{[\s\S]*?\n  \},/)[0]
  const orderEntry=legacySupplier.match(/toMyJinridinghuo\(e\) \{[\s\S]*?\n  \},/)[0]
  assert.match(addEntry,/purchaseManagement\/supplierCollaboration\/supplierCollaboration/)
  assert.match(orderEntry,/purchaseManagement\/supplierCollaboration\/supplierCollaboration/)
  assert.doesNotMatch(addEntry,/\.\.\/addSupplier\/addSupplier/)
  assert.doesNotMatch(legacySupplier,/pages\/seller\/inviteSeller\/inviteSeller/)
})

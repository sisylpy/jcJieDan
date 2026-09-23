import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8')

test('Boss registers one protected external supplier collaboration screen',()=>{
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
  assert.match(wxml,/外部供应商/)
  assert.match(js,/payload\.supplierRelationId/)
})

test('外部供应商入口统一进入Boss安全邀请页面',()=>{
  const legacySupplier=read('subPackage-supplier/pages/supplier/index/index.js')
  const addEntry=legacySupplier.match(/addSupplier\(\)\{[\s\S]*?\n  \},/)[0]
  assert.match(addEntry,/purchaseManagement\/supplierCollaboration\/supplierCollaboration/)
  assert.doesNotMatch(addEntry,/\.\.\/addSupplier\/addSupplier/)
  assert.doesNotMatch(legacySupplier,/toMyJinridinghuo|\.\.\/addSupplier\/addSupplier/)

  const appoint=read('subPackage/pages/goods/appointSupplierList/appointSupplierList.js')
  assert.match(appoint,/supplierCollaboration\/supplierCollaboration\?openInvite=1&supplierRelationId=/)
  assert.doesNotMatch(appoint,/navigateToMiniProgram|jinriListWithLogin|toMyJinridinghuo/)
})

test('内部协作配送商只有offerNx正式邀请链',()=>{
  const app=JSON.parse(read('app.json'))
  const pages=app.subPackages.find(p=>p.root==='subPackage/').pages
  assert.ok(pages.includes('pages/offerNx/offerNxDistributerList/offerNxDistributerList'))
  assert.ok(pages.includes('pages/offerNx/inviteOfferDis/inviteOfferDis'))
  const management=read('subPackage/pages/management/purchaseManagement/index/index.js')
  const managementView=read('subPackage/pages/management/purchaseManagement/index/index.wxml')
  const list=read('subPackage/pages/offerNx/offerNxDistributerList/offerNxDistributerList.js')
  const invite=read('subPackage/pages/offerNx/inviteOfferDis/inviteOfferDis.js')
  assert.match(management,/offerNx\/offerNxDistributerList\/offerNxDistributerList\?disId=/)
  assert.match(managementView,/协作配送商/)
  assert.match(list,/offerNx\/inviteOfferDis\/inviteOfferDis\?disId=/)
  assert.match(invite,/saveBusiness/)
  assert.doesNotMatch(invite,/nxjrdhsupplier|supplier-collaboration/)
})

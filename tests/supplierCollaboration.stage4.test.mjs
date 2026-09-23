import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'

const read=p=>fs.readFileSync(new URL('../'+p,import.meta.url),'utf8')

test('采购管理不再注册重复的供应方邀请入口',()=>{
  const app=JSON.parse(read('app.json'))
  const pages=app.subPackages.find(p=>p.root==='subPackage/').pages
  assert.ok(!pages.includes('pages/management/purchaseManagement/supplierCollaboration/supplierCollaboration'))
  const management=read('subPackage/pages/management/purchaseManagement/index/index.wxml')
  assert.doesNotMatch(management,/协作配送商|外部供应商协同|supplierCollaboration/)
  const api=read('lib/apiDistributer.js')
  assert.doesNotMatch(api,/createSupplierInvitation|reissueSupplierInvitation|supplier-collaboration\//)
})

test('外部供应商由采购批次分享注册，供应商列表只负责管理',()=>{
  const supplier=read('subPackage-supplier/pages/supplier/index/index.js')
  const supplierView=read('subPackage-supplier/pages/supplier/index/index.wxml')
  const appoint=read('subPackage/pages/goods/appointSupplierList/appointSupplierList.js')
  const appointView=read('subPackage/pages/goods/appointSupplierList/appointSupplierList.wxml')
  const purchase=read('pages/purchase/index/purchaseComponent.js')
  assert.doesNotMatch(supplier,/addSupplier|supplierCollaboration/)
  assert.doesNotMatch(supplierView,/邀请外部供应商/)
  assert.doesNotMatch(appoint,/toExternalSupplierInvitation|supplierCollaboration/)
  assert.doesNotMatch(appointView,/邀请外部供应商激活/)
  assert.match(purchase,/pkgPurchase\/pages\/txs\/prepareBatch\/prepareBatch\?batchId=/)
  assert.match(purchase,/pkgPurchase\/pages\/txs\/disOrderBatch\/disOrderBatch\?batchId=/)
})

test('内部协作配送商只有offerNx正式邀请链',()=>{
  const app=JSON.parse(read('app.json'))
  const pages=app.subPackages.find(p=>p.root==='subPackage/').pages
  assert.ok(pages.includes('pages/offerNx/offerNxDistributerList/offerNxDistributerList'))
  assert.ok(pages.includes('pages/offerNx/inviteOfferDis/inviteOfferDis'))
  const management=read('subPackage/pages/management/homePage/homePage.js')
  const managementView=read('subPackage/pages/management/homePage/homePage.wxml')
  const list=read('subPackage/pages/offerNx/offerNxDistributerList/offerNxDistributerList.js')
  const invite=read('subPackage/pages/offerNx/inviteOfferDis/inviteOfferDis.js')
  assert.match(management,/offerNx\/offerNxDistributerList\/offerNxDistributerList\?disId=/)
  assert.match(managementView,/协作配送商/)
  assert.match(list,/offerNx\/inviteOfferDis\/inviteOfferDis\?disId=/)
  assert.match(invite,/saveBusiness/)
  assert.doesNotMatch(invite,/nxjrdhsupplier|supplier-collaboration/)
})

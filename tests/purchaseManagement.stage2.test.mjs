import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = path => fs.readFileSync(path, 'utf8')
const app = JSON.parse(read('app.json'))
const pages = app.subPackages.find(item => item.root === 'subPackage/').pages
const required = [
  'pages/management/purchaseManagement/index/index',
  'pages/management/purchaseManagement/purchaserList/purchaserList',
  'pages/management/purchaseManagement/purchaserDetail/purchaserDetail',
  'pages/management/purchaseManagement/supplierList/supplierList',
  'pages/management/purchaseManagement/supplierDetail/supplierDetail',
  'pages/management/purchaseManagement/purchaseBatchList/purchaseBatchList',
  'pages/management/purchaseManagement/purchaseBatchDetail/purchaseBatchDetail',
  'pages/management/purchaseManagement/purchaseExceptionList/purchaseExceptionList'
]
required.forEach(page => assert.ok(pages.includes(page), `missing page registration: ${page}`))

const api = read('lib/apiDistributer.js')
assert.match(api, /purchaseManagementRequest\('overview'/)
assert.match(api, /purchaseManagementRequest\('purchasers'/)
assert.match(api, /purchaseManagementRequest\('suppliers'/)
assert.match(api, /purchaseManagementRequest\('batches'/)
assert.match(api, /purchaseManagementRequest\('exceptions'/)
for (const legacy of ['disGetPurchaseDetailType', 'getPurUserDate', 'disUserGetPurchaserDateBill']) {
  const stage2 = required.map(page => read(`subPackage/${page}.js`)).join('\n')
  assert.ok(!stage2.includes(legacy), `new management pages must not use ${legacy}`)
}

const allJs = required.map(page => read(`subPackage/${page}.js`)).join('\n')
assert.ok(!/lossRate\s*=|margin\s*=|actualNetPurchaseAmount\s*=/.test(allJs),
  'Boss pages must render server ViewModels instead of calculating business metrics')
assert.match(read('subPackage/pages/management/homePage/homePage.wxml'), /采购管理/)
assert.match(read('subPackage/pages/management/purchaseManagement/purchaseBatchDetail/purchaseBatchDetail.wxml'), /完整时间线/)
assert.match(read('subPackage/pages/management/purchaseManagement/purchaseBatchDetail/purchaseBatchDetail.wxml'), /关联库存批次/)
assert.match(read('subPackage/pages/management/purchaseManagement/purchaseExceptionList/purchaseExceptionList.wxml'), /采购待办与异常/)
const batchList = read('subPackage/pages/management/purchaseManagement/purchaseBatchList/purchaseBatchList.wxml')
for (const filter of ['采购员', '供应商', '需求来源', '采购方式', '履约模式', '收货状态', '入库状态', '退货状态', '有异常']) {
  assert.ok(batchList.includes(filter), `missing batch filter: ${filter}`)
}
assert.match(allJs, /pageSize:\s*20/)
console.log('purchase management stage2 contracts passed')

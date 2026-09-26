import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = path => fs.readFileSync(path, 'utf8')
const app = JSON.parse(read('app.json'))
const home = read('subPackage/pages/management/homePage/homePage.wxml')
const homeJs = read('subPackage/pages/management/homePage/homePage.js')
const page = 'subPackage/pages/management/purchaseManagement/purchaseCollaboration/purchaseCollaboration'
const js = read(page + '.js')
const wxml = read(page + '.wxml')
const config = JSON.parse(read(page + '.json'))

const pages = app.subPackages.find(item => item.root === 'subPackage/').pages
assert.ok(pages.includes('pages/management/purchaseManagement/purchaseCollaboration/purchaseCollaboration'))
assert.match(home, />采购协同</)
assert.match(home, />批次与供应方</)
assert.doesNotMatch(home, />采购批次</)
assert.doesNotMatch(home, />供应方</)
assert.match(homeJs, /purchaseCollaboration\/purchaseCollaboration/)
assert.doesNotMatch(homeJs, /toPurchaseBatchList|toPurchaseSupplierList/)

assert.equal(config.usingComponents['report-date-filter'], '/components/report-date-filter/report-date-filter')
assert.match(wxml, /title="采购协同"/)
assert.match(wxml, /mode==='batch'/)
assert.match(wxml, /mode==='supplier'/)
assert.match(wxml, /待供应方/)
assert.match(wxml, /待我方处理/)
assert.match(wxml, /已完成/)
assert.match(wxml, /涉及采购员/)
assert.match(wxml, /涉及供应方/)
assert.match(wxml, /用途待核对/)
assert.match(wxml, /金额待核对/)
assert.match(wxml, /采购记录与商品汇总/)

assert.match(js, /getPurchaseManagementBatches/)
assert.match(js, /getPurchaseSupplierV2List/)
assert.match(js, /syncPurchaseSupplierV2/)
assert.match(js, /progressGroup:/)
assert.match(js, /dataIssue:/)
assert.match(js, /purchaserId: this\.data\.purchaserUserId/)
assert.match(js, /supplierRelationId: this\.data\.supplierRelationId/)
assert.match(js, /statistics: Object\.assign/)
assert.match(js, /purchaseBatchDetail\/purchaseBatchDetail/)
assert.match(js, /supplierDetail\/supplierDetail/)
assert.doesNotMatch(js, /suppliercollaboration|supplierInvitation|inviteSeller/)

console.log('purchase collaboration contracts passed')

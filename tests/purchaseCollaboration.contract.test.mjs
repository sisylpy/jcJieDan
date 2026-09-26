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
assert.match(home, />按供应方查看</)
assert.doesNotMatch(home, />采购批次</)
assert.doesNotMatch(home, />供应方</)
assert.match(homeJs, /purchaseCollaboration\/purchaseCollaboration/)
assert.doesNotMatch(homeJs, /toPurchaseBatchList|toPurchaseSupplierList/)

assert.equal(config.usingComponents['report-date-filter'], '/components/report-date-filter/report-date-filter')
assert.match(wxml, /title="采购协同"/)
assert.match(wxml, /<report-date-filter[^>]+label="{{dateLabel}}"/)
assert.ok(wxml.indexOf('<report-date-filter') < wxml.indexOf('class="page-heading"'))
assert.doesNotMatch(wxml, /按执行进度/)
assert.doesNotMatch(wxml, /mode==='/)
assert.doesNotMatch(wxml, /class="batch-card"/)
assert.match(wxml, /按合作关系查看采购/)
assert.match(wxml, /查看采购记录与批次/)

assert.doesNotMatch(js, /getPurchaseManagementBatches/)
assert.match(js, /getPurchaseSupplierV2List/)
assert.match(js, /syncPurchaseSupplierV2/)
assert.doesNotMatch(js, /progressGroup:|dataIssue:|batchItems:/)
assert.match(js, /dateName: 'thisMonth'/)
assert.match(js, /onReportDateSelected\(selection\)/)
assert.match(js, /supplierDetail\/supplierDetail/)
assert.doesNotMatch(js, /suppliercollaboration|supplierInvitation|inviteSeller/)

console.log('purchase collaboration contracts passed')

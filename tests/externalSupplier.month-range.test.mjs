import assert from 'node:assert/strict'
import fs from 'node:fs'

const listPage = fs.readFileSync(
  new URL('../subPackage-supplier/pages/supplier/index/index.js', import.meta.url),
  'utf8'
)
const billsPage = fs.readFileSync(
  new URL('../subPackage-supplier/pages/supplier/supplierBills/supplierBills.js', import.meta.url),
  'utf8'
)
const billsView = fs.readFileSync(
  new URL('../subPackage-supplier/pages/supplier/supplierBills/supplierBills.wxml', import.meta.url),
  'utf8'
)

assert.match(listPage, /getDateRange\('thisMonth'\)/)
assert.match(listPage, /dateType:\s*'month'/)
assert.match(listPage, /startDate='\s*\+\s*encodeURIComponent\(this\.data\.startDate/)
assert.match(listPage, /stopDate='\s*\+\s*encodeURIComponent\(this\.data\.stopDate/)

assert.match(billsPage, /options\.startDate\s*\|\|\s*monthRange\.startDate/)
assert.match(billsPage, /options\.stopDate\s*\|\|\s*monthRange\.stopDate/)
assert.match(billsView, /item\.nxDpbStatus == 1[^\n]*待确认供货/)

console.log('external supplier month range contract passed')

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(path, 'utf8')
const api = read('lib/apiDistributer.js')
const app = read('app.json')
const homeJs = read('subPackage/pages/management/homePage/homePage.js')
const homeWxml = read('subPackage/pages/management/homePage/homePage.wxml')
const pageJs = read('subPackage/pages/management/customerOrderAnomalies/customerOrderAnomalies.js')
const pageWxml = read('subPackage/pages/management/customerOrderAnomalies/customerOrderAnomalies.wxml')

assert.match(api, /disGetAllCustomerOrderAnomalies/)
assert.match(api, /nxdepartmentdisgoods\/disGetAllCustomerOrderAnomalies/)
assert.doesNotMatch(api.match(/export const disGetAllCustomerOrderAnomalies[\s\S]*?\n\}/)[0], /disId/)
assert.match(app, /pages\/management\/customerOrderAnomalies\/customerOrderAnomalies/)
assert.match(homeJs, /toCustomerOrderAnomalies/)
assert.match(homeWxml, /订货异常/)
assert.match(pageJs, /SUSPECTED_STOP/)
assert.match(pageJs, /ORDERING_DECLINE/)
assert.match(pageJs, /ORDERING_SURGE/)
assert.match(pageJs, /customerName/)
assert.match(pageWxml, /查看客户全部异常/)
assert.match(pageWxml, /上次订货 \{\{item\.lastOrderDateLabel\}\}/)
assert.match(pageJs, /_dateLabel\(value\)/)
assert.match(pageWxml, /不等于质量事故/)

console.log('customer order anomaly dashboard: 14 checks passed')

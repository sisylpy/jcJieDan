import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pageRoot = path.join(root, 'subPackage/pages/management/payPage')
const pageJs = fs.readFileSync(path.join(pageRoot, 'payPage.js'), 'utf8')
const pageView = fs.readFileSync(path.join(pageRoot, 'payPage.wxml'), 'utf8')
const pageJson = JSON.parse(fs.readFileSync(path.join(pageRoot, 'payPage.json'), 'utf8'))

assert.match(pageJs, /commercial-usage\/offers/)
assert.match(pageJs, /commercial-usage\/orders/)
assert.match(pageJs, /wx\.requestPayment/)
assert.match(pageJs, /offerCode/)
assert.doesNotMatch(pageJs, /disBuyUser|disGetBuyType|nxDistributerPay|subtotal:\s*this\.data/)
assert.doesNotMatch(pageJs, /300000|500000|1000000|3000|4500|8000/)

assert.match(pageView, /价格与赠送以当前活动接口为准/)
assert.match(pageView, /活动赠送/)
assert.match(pageView, /打印不会重复消费/)
assert.match(pageView, /最近购买记录/)
assert.equal(pageJson.enablePullDownRefresh, true)

console.log('commercial usage purchase: PASS')

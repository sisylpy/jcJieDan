import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const homeJs = fs.readFileSync(path.join(root,
  'subPackage-home/pages/management/homePage/homePage.js'), 'utf8')
const homeView = fs.readFileSync(path.join(root,
  'subPackage-home/pages/management/homePage/homePage.wxml'), 'utf8')
const centerJs = fs.readFileSync(path.join(root,
  'subPackage/pages/management/usageCenter/usageCenter.js'), 'utf8')
const centerView = fs.readFileSync(path.join(root,
  'subPackage/pages/management/usageCenter/usageCenter.wxml'), 'utf8')
const appJson = JSON.parse(fs.readFileSync(path.join(root, 'app.json'), 'utf8'))

const mainPackage = appJson.subPackages.find(item => item.root === 'subPackage/')
assert.ok(mainPackage)
assert.ok(mainPackage.pages.includes('pages/management/usageCenter/usageCenter'))

assert.match(homeJs, /commercial-usage\/me/)
assert.match(homeJs, /toUsageCenter/)
assert.match(homeView, /订单处理额度/)
assert.match(homeView, /commercialUsage\.availableQuantity/)

assert.match(centerJs, /commercial-usage\/me\/ledger/)
assert.match(centerJs, /NX_DEPARTMENT_ORDER/)
assert.match(centerJs, /pages\/management\/payPage\/payPage/)
assert.match(centerView, /额度明细/)
assert.match(centerView, /打印、补打和语音识别不消费此额度/)
assert.doesNotMatch(centerJs + centerView, /nxdistributerpay|nxDistributerBuyQuantity/)

console.log('commercial usage center: PASS')

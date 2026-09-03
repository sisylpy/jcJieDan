import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')

const appJson = JSON.parse(read('app.json'))
const charts = appJson.subPackages.find(item => item.root === 'subPackage-charts/')
assert.ok(charts.pages.includes('pages/smartReplenishment/index/index'))
assert.ok(charts.pages.includes('pages/smartReplenishment/customerPicker/customerPicker'))

const homeJs = read('subPackage/pages/management/homePage/homePage.js')
const homeWxml = read('subPackage/pages/management/homePage/homePage.wxml')
const pageJs = read('subPackage-charts/pages/smartReplenishment/index/index.js')
const pageWxml = read('subPackage-charts/pages/smartReplenishment/index/index.wxml')
const pickerJs = read('subPackage-charts/pages/smartReplenishment/customerPicker/customerPicker.js')
const pickerWxml = read('subPackage-charts/pages/smartReplenishment/customerPicker/customerPicker.wxml')
const api = read('lib/apiDistributer.js')

assert.match(homeWxml, /bindtap="toSmartReplenishment"/)
assert.match(homeWxml, /wx:if="\{\{canViewSmartReplenishment\}\}"/)
assert.match(homeJs, /Number\(.*nxDiuAdmin\) === 0/)
assert.match(homeJs, /pages\/smartReplenishment\/index\/index/)

assert.match(pageWxml, /bindtap="toCustomerPicker"/)
assert.match(pageJs, /pages\/smartReplenishment\/customerPicker/)
assert.match(pickerWxml, /搜索客户名称/)
assert.match(pickerWxml, /全部客户/)
assert.match(pickerJs, /getCurrentPages\(\)/)
assert.match(pickerJs, /applyCustomerSelection/)

assert.match(pageWxml, /A 直接备货/)
assert.match(pageWxml, /B 联系确认/)
assert.match(pageWxml, /库存数量/)
assert.match(pageWxml, /采购订货/)
assert.match(pageWxml, /添加采购/)
assert.match(pageWxml, /class="goods-photo"/)
assert.match(pageWxml, /src="\{\{item\.imageUrl\}\}"/)
assert.match(pageWxml, /订单自动生成的采购不计入/)
assert.match(pageJs, /forecastSmartReplenishment/)
assert.match(pageJs, /getSmartReplenishmentContexts/)
assert.match(pageJs, /createSmartReplenishmentProcurement/)
assert.match(pageJs, /algorithmVersion: BASELINE/)
assert.match(pageJs, /historyWindowDays: 30/)
assert.match(pageJs, /apiUrl\.server/)
assert.match(pageJs, /入库时再选择真实货架/)

const smartApiStart = api.indexOf('const ownerSmartReplenishmentRequest')
const smartApiEnd = api.indexOf('老板端当前配送商全部客户订货异常汇总')
const smartApi = api.slice(smartApiStart, smartApiEnd)
assert.match(smartApi, /purchase-prediction-lab\/' \+ path/)
assert.match(smartApi, /ownerSmartReplenishmentRequest\('forecasts', 'POST', data\)/)
assert.match(smartApi, /'goods\/' \+ encodeURIComponent\(goodsId\)/)
assert.doesNotMatch(smartApi, /nxdistributergoods\/disGetGoods/)
assert.doesNotMatch(smartApi, /demand_source|demandSource|business_event_type|businessEventType|procurement_mode|procurementMode|apply_shelf_id|applyShelfId/)

console.log('smart replenishment page contract tests passed')

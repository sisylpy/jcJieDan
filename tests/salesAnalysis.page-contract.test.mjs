import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')

const appJson = JSON.parse(read('app.json'))
const charts = appJson.subPackages.find(item => item.root === 'subPackage-charts/')
assert.ok(charts.pages.includes('pages/salesAnalysis/index/index'), '销售分析页必须注册到图表分包')

const homeWxml = read('subPackage/pages/management/homePage/homePage.wxml')
const homeJs = read('subPackage/pages/management/homePage/homePage.js')
const api = read('lib/apiDistributer.js')
const pageJs = read('subPackage-charts/pages/salesAnalysis/index/index.js')
const pageWxml = read('subPackage-charts/pages/salesAnalysis/index/index.wxml')
const datePageJs = read('subPackage-charts/pages/sel/date/date.js')
const datePageWxml = read('subPackage-charts/pages/sel/date/date.wxml')
const datePageWxss = read('subPackage-charts/pages/sel/date/date.wxss')

assert.match(homeWxml, /bindtap="toSalesAnalysis"/)
assert.match(homeWxml, /wx:if="\{\{canViewSalesAnalysis\}\}"/)
assert.match(homeJs, /Number\(.*nxDiuAdmin\) === 0/)
assert.match(api, /ownerSalesAnalysisGet\('overview'/)
assert.match(api, /'products\/' \+ encodeURIComponent\(goodsId\) \+ '\/customers'/)
assert.doesNotMatch(api.slice(api.indexOf('const ownerSalesAnalysisGet'), api.indexOf('老板端当前配送商全部客户')), /disId/)
assert.match(pageWxml, /class="drawer-mask"/)
assert.match(pageWxml, /src="\{\{item\.goodsImageUrl\}\}"/)
assert.match(pageWxml, /src="\{\{selectedProduct\.goodsImageUrl\}\}"/)
assert.match(pageJs, /resolveGoodsImage\(item, apiUrl\.server\)/)
assert.match(pageWxml, /数据只来自已完成历史订单/)
assert.match(pageWxml, /数量和平均价按原交易单位分别统计/)
assert.match(pageWxml, /bindtap="toDatePage"/)
assert.match(pageWxml, /\/images\/calender\.png/)
assert.match(pageWxml, /tool\.transferDateString\(startDate\)/)
assert.doesNotMatch(pageWxml, /class="preset-tabs"/)
assert.doesNotMatch(pageWxml, /picker mode="date"/)
assert.match(pageJs, /\/subPackage-charts\/pages\/sel\/date\/date\?startDate=/)
assert.match(pageJs, /&dateName=' \+ this\.data\.dateName/)
assert.match(pageJs, /validateSalesRange\(range\)/)
assert.match(datePageJs, /selectedDateName: options\.dateName \|\| ''/)
assert.match(datePageWxml, /selectedDateName == 'lastThirtyDays'/)
assert.match(datePageWxml, /当前/)
assert.match(datePageWxss, /\.date-option-selected/)

console.log('sales analysis page contract tests passed')

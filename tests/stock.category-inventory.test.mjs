import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

test('库存页彻底移除旧时间分段页面和 GB 客户端接口', () => {
  const appConfig = JSON.parse(read('app.json'))
  const charts = appConfig.subPackages.find(item => item.root === 'subPackage-charts/')
  const pageSource = read('subPackage-charts/pages/stock/index/index.js')
  const templateSource = read('subPackage-charts/pages/stock/index/index.wxml')

  assert.ok(charts.pages.includes('pages/stock/index/index'))
  assert.ok(!charts.pages.includes('pages/stock/stockList/stockList'))
  assert.ok(!charts.pages.includes('pages/stock/stockListOneDay/stockListOneDay'))
  assert.equal(fs.existsSync(path.join(root, 'subPackage-charts/lib/apiDistributerGb.js')), false)

  for (const oldToken of [
    'getMendianStockTypePeriod',
    'disGetDayStockByGreatId',
    'apiDistributerGb',
    'whichDay',
    'toStockPage',
    '<swiper',
    '所有库存'
  ]) {
    assert.doesNotMatch(pageSource + templateSource, new RegExp(oldToken))
  }
})

test('新库存页按一级商品类别展示当前库存商品和批次', () => {
  const pageSource = read('subPackage-charts/pages/stock/index/index.js')
  const templateSource = read('subPackage-charts/pages/stock/index/index.wxml')
  const apiSource = read('lib/apiDistributer.js')

  assert.match(pageSource, /getStockCategoryGoodsPage/)
  assert.match(apiSource, /nxdistributergoodsshelfstock\/getStockCategoryGoodsPage/)
  assert.match(apiSource, /if \(data\.categoryId !== null && data\.categoryId !== undefined && data\.categoryId !== ''\)/)
  assert.match(apiSource, /requestData\.categoryId = data\.categoryId/)
  assert.match(templateSource, /wx:for="\{\{categoryArr\}\}"/)
  assert.match(templateSource, /category\.nxDfgFatherGoodsName/)
  assert.match(templateSource, /wx:for="\{\{goodsArr\}\}"/)
  assert.match(templateSource, /wx:for="\{\{goods\.stockArr\}\}"/)
  assert.match(templateSource, /货架:/)
  assert.match(templateSource, /库存金额/)
  assert.match(templateSource, /库存批次/)
})

test('新库存页支持分类切换、下拉刷新和分页', () => {
  const pageSource = read('subPackage-charts/pages/stock/index/index.js')
  const templateSource = read('subPackage-charts/pages/stock/index/index.wxml')

  assert.match(pageSource, /changeCategory\(e\)/)
  assert.match(pageSource, /onRefresh\(\)/)
  assert.match(pageSource, /onScrollToLower\(\)/)
  assert.match(templateSource, /bindrefresherrefresh="onRefresh"/)
  assert.match(templateSource, /bindscrolltolower="onScrollToLower"/)
})

test('库存页可切换为货架双列布局并把无货架放在左侧末尾', () => {
  const pageSource = read('subPackage-charts/pages/stock/index/index.js')
  const templateSource = read('subPackage-charts/pages/stock/index/index.wxml')
  const styleSource = read('subPackage-charts/pages/stock/index/index.wxss')
  const apiSource = read('lib/apiDistributer.js')

  assert.match(pageSource, /viewMode:\s*'category'/)
  assert.match(pageSource, /toggleViewMode\(\)/)
  assert.match(pageSource, /getStockShelfGoodsPage/)
  assert.match(pageSource, /changeShelf\(e\)/)
  assert.match(apiSource, /nxdistributergoodsshelfstock\/getStockShelfGoodsPage/)
  assert.match(templateSource, /aria-label="\{\{viewMode === 'category' \? '切换到按货架显示'/)
  assert.match(templateSource, /wx:for="\{\{shelfArr\}\}"/)
  assert.match(templateSource, /shelf\.nxDistributerGoodsShelfId === -1/)
  assert.match(templateSource, /class="shelf-grid"/)
  assert.match(styleSource, /\.shelf-grid-card[\s\S]*?width:\s*48\.5%/)
  assert.match(styleSource, /\.shelf-menu-item--unshelved/)
})

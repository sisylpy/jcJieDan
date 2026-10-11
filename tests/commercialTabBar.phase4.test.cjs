const test = require('node:test')
const assert = require('node:assert/strict')

let storage = {}
global.wx = { getStorageSync: key => storage[key] }

const tabBar = require('../lib/routeDispatchTabBar.js')

function paths(snapshot, shelfMode, capability) {
  storage = {
    commercialEntitlement: snapshot,
    disInfo: { nxDistributerShelfMode: shelfMode },
    operatingCapability: capability || null
  }
  return tabBar.getTabBarList().map(item => item.pagePath)
}

test('BASIC only exposes order and normal outbound tabs', () => {
  assert.deepEqual(paths({ entitledFeatures: ['OUTBOUND'] }, true), [
    'pages/order/index/index', 'pages/stock/index/index'
  ])
})

test('SHELF adds purchase but never grants dispatch implicitly', () => {
  // SHELF 套餐本身含 PURCHASE_CORE，但备货 Tab 按 effectiveFeatures（经营模式∩套餐）判定：
  // 模式 2/3 的有效权限不含 PURCHASE_CORE → 不显示备货 Tab。
  assert.deepEqual(paths({ entitledFeatures: ['OUTBOUND', 'PURCHASE_CORE'] }, true,
    { effectiveFeatures: ['OUTBOUND', 'STOCK_IN'] }), [
    'pages/order/index/index',
    'pages/stock/index/index'
  ])
  // 模式 4：有效权限含 PURCHASE_CORE → 显示备货 Tab，且仍不隐式授予配送。
  assert.deepEqual(paths({ entitledFeatures: ['OUTBOUND', 'PURCHASE_CORE'] }, true,
    { effectiveFeatures: ['OUTBOUND', 'PURCHASE_CORE'] }), [
    'pages/order/index/index',
    'pages/stock/index/index',
    'pages/purchaseList/index/index'
  ])
})

test('配送 Tab 只看 ADVANCED_DISPATCH 有效能力，不再绑定货架开关', () => {
  // 未授予有效能力：即使货架开关打开也不显示配送 Tab
  assert.equal(paths({ entitledFeatures: ['ADVANCED_DISPATCH'] }, true,
    { effectiveFeatures: ['OUTBOUND'] }).includes('pages/dispatch/index/index'), false)
  // 授予有效能力：不开货架（模式 7 平台型批发商）也显示配送 Tab
  assert.equal(paths({ entitledFeatures: ['ADVANCED_DISPATCH'] }, false,
    { effectiveFeatures: ['ADVANCED_DISPATCH'] }).includes('pages/dispatch/index/index'), true)
})

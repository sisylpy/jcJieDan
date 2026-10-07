const test = require('node:test')
const assert = require('node:assert/strict')

let storage = {}
global.wx = { getStorageSync: key => storage[key] }

const tabBar = require('../lib/routeDispatchTabBar.js')

function paths(snapshot, businessType) {
  storage = {
    commercialEntitlement: snapshot,
    disInfo: { nxDistributerBusinessTypeId: businessType }
  }
  return tabBar.getTabBarList().map(item => item.pagePath)
}

test('BASIC only exposes order and normal outbound tabs', () => {
  assert.deepEqual(paths({ entitledFeatures: ['OUTBOUND'] }, 3), [
    'pages/order/index/index', 'pages/stock/index/index'
  ])
})

test('SHELF adds purchase but never grants dispatch implicitly', () => {
  assert.deepEqual(paths({ entitledFeatures: ['OUTBOUND', 'PURCHASE_CORE'] }, 3), [
    'pages/order/index/index',
    'pages/stock/index/index',
    'pages/purchaseList/index/index'
  ])
})

test('dispatch requires a separate capability and compatible business type', () => {
  assert.equal(paths({ entitledFeatures: ['ADVANCED_DISPATCH'] }, 1)
    .includes('pages/dispatch/index/index'), false)
  assert.equal(paths({ entitledFeatures: ['ADVANCED_DISPATCH'] }, 3)
    .includes('pages/dispatch/index/index'), true)
})

const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const root = path.resolve(__dirname, '..')
const accessPolicy = require('../utils/managementHomeAccess.js')
const owner = { nxDiuAdmin: 0 }

function access(features, shelfMode, plan) {
  return accessPolicy.build({
    currentPlan: plan || 'BASIC',
    subscriptionStatus: 'ACTIVE',
    entitlementVersion: 3,
    entitledFeatures: features
  }, owner, { nxDistributerShelfMode: shelfMode })
}

test('BASIC management home only exposes basic customer and order entries', () => {
  const value = access([
    'CUSTOMER_MASTER', 'GOODS_MASTER', 'ORDER_QUERY', 'CUSTOMER_DOCUMENT'
  ], false, 'BASIC')
  assert.equal(value.canViewCustomers, true)
  assert.equal(value.canViewGoods, true)
  assert.equal(value.canViewOrderAnomalies, true)
  assert.equal(value.canViewPurchaseManagement, false)
  assert.equal(value.showPurchaseSection, false)
  assert.equal(value.showInventorySection, false)
  assert.equal(value.showFinanceSection, false)
  assert.equal(value.showDispatchSection, false)
  assert.equal(value.canViewSalesAnalysis, false)
})

test('SHELF requires both commercial features and a shelf operating mode', () => {
  const features = ['PURCHASE_CORE', 'BASIC_SUPPLIER_MANAGEMENT', 'SHELF_MANAGEMENT',
    'INVENTORY_BATCH', 'INVENTORY_ANALYTICS', 'PURCHASE_ANALYTICS']
  const invalid = access(features, false, 'SHELF')
  const valid = access(features, true, 'SHELF')
  assert.equal(invalid.canViewShelf, false)
  assert.equal(invalid.canViewStock, false)
  assert.equal(valid.canViewShelf, true)
  assert.equal(valid.canViewStock, true)
  assert.equal(valid.canViewPurchaseManagement, true)
  assert.equal(valid.canViewPurchaserDetail, false)
  assert.equal(valid.canViewPurchaseCollaboration, false)
})

test('SALES_GROWTH exposes sales analysis but not enterprise add-ons', () => {
  const value = access(['SALES_ACTIVITY_ANALYTICS'], true, 'SALES_GROWTH')
  assert.equal(value.canViewSalesAnalysis, true)
  assert.equal(value.canViewDispatch, false)
  assert.equal(value.canViewSmartReplenishment, false)
  assert.equal(value.canViewPurchaseFinance, false)
})

test('management page refreshes entitlement and guards both tiles and handlers', () => {
  const page = fs.readFileSync(path.join(root,
    'subPackage-home/pages/management/homePage/homePage.js'), 'utf8')
  const view = fs.readFileSync(path.join(root,
    'subPackage-home/pages/management/homePage/homePage.wxml'), 'utf8')
  assert.match(page, /commercial-entitlements\/me/)
  assert.match(page, /toUsagePurchase/)
  assert.match(page, /pages\/management\/payPage\/payPage/)
  assert.match(view, /bindtap="toUsagePurchase"/)
  assert.match(view, />充值额度</)
  assert.match(view, /quick-item usage-purchase-item/)
  assert.match(page, /managementHomeAccess\.build/)
  assert.match(page, /requireHomeFeature\('PURCHASE_CORE'/)
  assert.match(page, /requireHomeFeature\('SHELF_MANAGEMENT'/)
  assert.match(page, /requireHomeFeature\('ADVANCED_DISPATCH'/)
  for (const flag of ['showPurchaseSection', 'showInventorySection',
    'showFinanceSection', 'showDispatchSection']) {
    assert.match(view, new RegExp(`wx:if="\\{\\{${flag}\\}\\}"`))
  }
})

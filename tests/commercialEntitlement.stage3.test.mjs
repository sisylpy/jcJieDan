import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('owner login transport persists entitlement snapshot without storing Feature in a token', () => {
  const ownerRequest = read('lib/ownerRequest.js')
  const helper = read('utils/commercialEntitlement.js')
  assert.match(ownerRequest, /responseData\.commercialEntitlement/)
  assert.match(ownerRequest, /responseData\.commercialUsage/)
  assert.match(ownerRequest, /setStorageSync\('commercialEntitlement'/)
  assert.match(ownerRequest, /setStorageSync\('commercialUsage'/)
  assert.match(ownerRequest, /'commercialEntitlement'/)
  assert.match(helper, /commercialEntitlement/)
  assert.match(helper, /if \(!current\) return false/)
  assert.match(helper, /entitledFeatures/)
  assert.doesNotMatch(helper, /token.*Feature|Feature.*token/i)
})

test('three representative pages use FeatureCode-based capability gates', () => {
  const cases = [
    ['subPackage-printer/pages/management/printerSetting/printerSetting.js', 'CUSTOMER_DOCUMENT'],
    ['subPackage/pages/shelf/inventoryBatchBusiness/inventoryBatchBusiness.js', 'INVENTORY_BATCH'],
    ['subPackage-charts/pages/smartReplenishment/index/index.js', 'SMART_REPLENISHMENT']
  ]
  for (const [path, feature] of cases) {
    const source = read(path)
    assert.match(source, /requireFeature/)
    assert.ok(source.includes(`'${feature}'`), `${path} must gate ${feature}`)
  }
})

test('sales staff invitation is hidden behind SALES_STAFF capability', () => {
  const page = read('subPackage/pages/management/staff/staff.js')
  assert.match(page, /requireFeature\('SALES_STAFF'/)
  assert.match(page, /salesGrowthEnabled/)
})

test('formal shelf entry requires both entitlement and applicable business workflow', () => {
  const helper = read('utils/commercialEntitlement.js')
  const homePage = read('subPackage/pages/management/homePage/homePage.js')
  const homeView = read('subPackage/pages/management/homePage/homePage.wxml')
  const shelfPage = read('subPackage/pages/shelf/index/index.js')
  assert.match(helper, /hasFeature\(featureCode\) && isShelfBusinessType\(disInfo\)/)
  assert.match(homePage, /hasShelfWorkflowFeature/)
  assert.match(homePage, /requireShelfWorkflowFeature/)
  assert.match(homeView, /wx:if="\{\{canUseShelf\}\}"/)
  assert.match(shelfPage, /requireShelfWorkflowFeature/)
})

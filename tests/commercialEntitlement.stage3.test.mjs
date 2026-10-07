import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const read = path => fs.readFileSync(new URL('../' + path, import.meta.url), 'utf8')

test('owner login transport persists entitlement snapshot without storing Feature in a token', () => {
  const ownerRequest = read('lib/ownerRequest.js')
  const helper = read('utils/commercialEntitlement.js')
  assert.match(ownerRequest, /responseData\.commercialEntitlement/)
  assert.match(ownerRequest, /setStorageSync\('commercialEntitlement'/)
  assert.match(ownerRequest, /'commercialEntitlement'/)
  assert.match(helper, /commercialEntitlement/)
  assert.match(helper, /legacyCompatibility === true/)
  assert.match(helper, /entitledFeatures/)
  assert.doesNotMatch(helper, /token.*Feature|Feature.*token/i)
})

test('three representative pages use FeatureCode-based capability gates', () => {
  const cases = [
    ['subPackage-printer/pages/management/printerSetting/printerSetting.js', 'PRINTING'],
    ['subPackage/pages/shelf/inventoryBatchBusiness/inventoryBatchBusiness.js', 'INVENTORY'],
    ['subPackage-charts/pages/smartReplenishment/index/index.js', 'SMART_REPLENISHMENT']
  ]
  for (const [path, feature] of cases) {
    const source = read(path)
    assert.match(source, /requireFeature/)
    assert.ok(source.includes(`'${feature}'`), `${path} must gate ${feature}`)
  }
})

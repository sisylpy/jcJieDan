const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const capability = require('../utils/operatingCapability.js')

const explicit = { nxDistributerOperatingModeCode: 'DISTRIBUTED_SHELF' }
const granted = { explicitOperatingMode: true, effectiveFeatures: ['SHELF_RESPONSIBILITY', 'SHELF_TRANSFER'] }
const denied = { explicitOperatingMode: true, effectiveFeatures: [] }
const shelfTrial = {
  explicitOperatingMode: true,
  effectiveFeatures: ['SHELF_STOCK_INITIALIZATION', 'PURCHASE_CORE', 'INVENTORY_COUNT']
}

assert.equal(capability.canManageShelfResponsibility(explicit, granted), true)
assert.equal(capability.canTransferShelfStock(explicit, granted), true)
assert.equal(capability.canTransferShelfStock(explicit, denied), false)
assert.equal(capability.canManageShelfResponsibility({}, null), false)
assert.equal(capability.canInitializeShelfStock(explicit, shelfTrial), true)
assert.equal(capability.canUsePurchaseCore(explicit, shelfTrial), true)
assert.equal(capability.canCountInventory(explicit, shelfTrial), true)
assert.equal(capability.canInitializeShelfStock(explicit, denied), false)

const ownerRequest = fs.readFileSync(path.join(__dirname, '../lib/ownerRequest.js'), 'utf8')
assert.match(ownerRequest, /setStorageSync\('operatingCapability'/)
assert.match(ownerRequest, /'operatingCapability'/)

const transferView = fs.readFileSync(path.join(__dirname, '../components/editShelfStock/editShelfStock.wxml'), 'utf8')
assert.match(transferView, /wx:if="\{\{canTransferShelfStock\}\}"/)

const shelfView = fs.readFileSync(path.join(__dirname, '../subPackage/pages/shelf/index/index.wxml'), 'utf8')
assert.match(shelfView, /wx:if="\{\{canInitializeShelfStock\}\}"/)
assert.match(shelfView, /wx:if="\{\{canUsePurchaseCore\}\}"/)
assert.doesNotMatch(shelfView,
  /nxDistributerBusinessTypeId|nxDistributerProfessionalPurchaseMode|nxDistributerShelfMode|nxDistributerType\s*==/)

const shelfPage = fs.readFileSync(path.join(__dirname, '../subPackage/pages/shelf/index/index.js'), 'utf8')
assert.match(shelfPage, /_syncShelfCapabilities\('onShow'\)/)
assert.match(shelfPage, /\[shelf-capability\]/)
assert.match(shelfPage, /purchaseButtonHiddenReason/)
assert.match(shelfPage, /OPERATING_MODE_MISMATCH/)
assert.match(shelfPage, /commercial-entitlements\/me/)

console.log('operatingMode.b2-capability tests passed')

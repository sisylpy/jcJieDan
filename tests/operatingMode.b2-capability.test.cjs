const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const capability = require('../utils/operatingCapability.js')

const explicit = { nxDistributerOperatingModeCode: 'DISTRIBUTED_SHELF', nxDistributerBusinessTypeId: 5 }
const granted = { explicitOperatingMode: true, effectiveFeatures: ['SHELF_RESPONSIBILITY', 'SHELF_TRANSFER'] }
const denied = { explicitOperatingMode: true, effectiveFeatures: [] }

assert.equal(capability.canManageShelfResponsibility(explicit, granted), true)
assert.equal(capability.canTransferShelfStock(explicit, granted), true)
assert.equal(capability.canTransferShelfStock(explicit, denied), false)
assert.equal(capability.canManageShelfResponsibility({ nxDistributerBusinessTypeId: 5 }, null), true)
assert.equal(capability.canManageShelfResponsibility({ nxDistributerBusinessTypeId: 1 }, null), false)

const ownerRequest = fs.readFileSync(path.join(__dirname, '../lib/ownerRequest.js'), 'utf8')
assert.match(ownerRequest, /setStorageSync\('operatingCapability'/)
assert.match(ownerRequest, /'operatingCapability'/)

const transferView = fs.readFileSync(path.join(__dirname, '../components/editShelfStock/editShelfStock.wxml'), 'utf8')
assert.match(transferView, /wx:if="\{\{canTransferShelfStock\}\}"/)

console.log('operatingMode.b2-capability tests passed')

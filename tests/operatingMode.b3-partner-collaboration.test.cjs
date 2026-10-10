const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const capability = require('../utils/operatingCapability.js')

const root = path.resolve(__dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

assert.equal(capability.canUsePartnerCollaboration(
  { nxDistributerOperatingModeCode: 'PARTNER_PLATFORM' },
  { explicitOperatingMode: true, effectiveFeatures: [
    'PARTNER_DISTRIBUTOR_COLLABORATION', 'PLATFORM_GOODS'
  ] }), true)
assert.equal(capability.canUsePartnerCollaboration(
  { nxDistributerOperatingModeCode: 'SHELF_PROFESSIONAL' },
  { explicitOperatingMode: true, effectiveFeatures: ['PLATFORM_GOODS'] }), false)
assert.equal(capability.canUsePartnerCollaboration(
  { nxDistributerBusinessTypeId: 6 }, null), true)
assert.equal(capability.canUsePartnerCollaboration(
  { nxDistributerBusinessTypeId: 5 }, null), false)

const homeJs = read('subPackage/pages/management/homePage/homePage.js')
const homeWxml = read('subPackage/pages/management/homePage/homePage.wxml')
const listJs = read('subPackage/pages/offerNx/offerNxDistributerList/offerNxDistributerList.js')
const inviteJs = read('subPackage/pages/offerNx/inviteOfferDis/inviteOfferDis.js')
const supplierDetail = read('subPackage/pages/management/purchaseManagement/supplierDetail/supplierDetail.js')

assert.match(homeJs, /canUsePartnerCollaboration/)
assert.match(homeWxml, /wx:if="\{\{canUsePartnerCollaboration\}\}"/)
assert.match(listJs, /_requirePartnerCapability/)
assert.match(inviteJs, /partnerAccessDenied/)
assert.match(supplierDetail, /canUsePartnerCollaboration/)

console.log('operating mode B3 partner collaboration checks passed')

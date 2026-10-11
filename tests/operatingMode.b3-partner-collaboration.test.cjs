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

// 管理首页协作入口：入口显示与点击拦截必须与 offerNx 页面、服务端同口径，
// 只按经营模式 ∩ 套餐的有效能力判断，不再附加货架履约流程限制。
const homeJs = read('subPackage-home/pages/management/homePage/homePage.js')
const homeWxml = read('subPackage-home/pages/management/homePage/homePage.wxml')
const accessJs = read('utils/managementHomeAccess.js')
const listJs = read('subPackage/pages/offerNx/offerNxDistributerList/offerNxDistributerList.js')
const inviteJs = read('subPackage/pages/offerNx/inviteOfferDis/inviteOfferDis.js')
const supplierDetail = read('subPackage/pages/management/purchaseManagement/supplierDetail/supplierDetail.js')

assert.match(homeJs, /canUsePartnerCollaboration/)
assert.match(homeWxml, /wx:if="\{\{canViewPartnerCollaboration\}\}"/)
assert.match(accessJs, /canViewPartnerCollaboration:[\s\S]{0,120}canUsePartnerCollaboration/)
assert.doesNotMatch(accessJs, /canViewPartnerCollaboration:\s*shelfWorkflowEnabled/)
assert.match(listJs, /_requirePartnerCapability/)
assert.match(inviteJs, /partnerAccessDenied/)
assert.match(supplierDetail, /canUsePartnerCollaboration/)

// 协作入口跳转不能被货架流程门禁拦截
const nxDisStart = homeJs.indexOf('toNxDisList(){')
const nxDisEnd = homeJs.indexOf('toDeliveryStrategy', nxDisStart)
assert.ok(nxDisStart > 0 && nxDisEnd > nxDisStart)
const toNxDisList = homeJs.slice(nxDisStart, nxDisEnd)
assert.match(toNxDisList, /requirePartnerCollaboration/)
assert.doesNotMatch(toNxDisList, /requireShelfWorkflow/)

console.log('operating mode B3 partner collaboration checks passed')

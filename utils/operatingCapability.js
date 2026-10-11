function features(snapshot) {
  return snapshot && Array.isArray(snapshot.effectiveFeatures)
    ? snapshot.effectiveFeatures : []
}

function hasEffectiveFeature(snapshot, code) {
  return features(snapshot).indexOf(code) !== -1
}

function isExplicit(disInfo, snapshot) {
  return !!((snapshot && snapshot.explicitOperatingMode === true) ||
    (disInfo && disInfo.nxDistributerOperatingModeCode))
}

function legacyShelfResponsibility(disInfo) {
  // 未迁移老客户保留原 business_type > 2 的已有入口。
  return !!disInfo && Number(disInfo.nxDistributerBusinessTypeId) > 2
}

function canManageShelfResponsibility(disInfo, snapshot) {
  return isExplicit(disInfo, snapshot)
    ? hasEffectiveFeature(snapshot, 'SHELF_RESPONSIBILITY')
    : legacyShelfResponsibility(disInfo)
}

function canTransferShelfStock(disInfo, snapshot) {
  return isExplicit(disInfo, snapshot)
    ? hasEffectiveFeature(snapshot, 'SHELF_TRANSFER')
    : legacyShelfResponsibility(disInfo)
}

function canUsePartnerCollaboration(disInfo, snapshot) {
  if (isExplicit(disInfo, snapshot)) {
    return hasEffectiveFeature(snapshot, 'PARTNER_DISTRIBUTOR_COLLABORATION') &&
      hasEffectiveFeature(snapshot, 'PLATFORM_GOODS')
  }
  // 未迁移客户继续沿用原平台型 business_type 6/7 入口。
  return !!disInfo && Number(disInfo.nxDistributerBusinessTypeId) > 5
}

// 专业采购（采购总览/采购任务/外采/备货 Tab）统一按有效权限 PURCHASE_CORE 判断。
// 模式 2/3 的 effectiveFeatures 不含 PURCHASE_CORE → 隐藏入口且不发起请求；
// 模式 4+ 含 PURCHASE_CORE → 正常显示。未迁移老客户沿用原 business_type > 2 入口。
function canUseProfessionalPurchase(disInfo, snapshot) {
  return isExplicit(disInfo, snapshot)
    ? hasEffectiveFeature(snapshot, 'PURCHASE_CORE')
    : legacyShelfResponsibility(disInfo)
}

module.exports = {
  hasEffectiveFeature,
  canManageShelfResponsibility,
  canTransferShelfStock,
  canUsePartnerCollaboration,
  canUseProfessionalPurchase
}

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

module.exports = {
  hasEffectiveFeature,
  canManageShelfResponsibility,
  canTransferShelfStock,
  canUsePartnerCollaboration
}

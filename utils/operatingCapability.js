function features(snapshot) {
  return snapshot && Array.isArray(snapshot.effectiveFeatures)
    ? snapshot.effectiveFeatures : []
}

function hasEffectiveFeature(snapshot, code) {
  return features(snapshot).indexOf(code) !== -1
}

function canManageShelfResponsibility(disInfo, snapshot) {
  return !!disInfo && hasEffectiveFeature(snapshot, 'SHELF_RESPONSIBILITY')
}

function canTransferShelfStock(disInfo, snapshot) {
  return !!disInfo && hasEffectiveFeature(snapshot, 'SHELF_TRANSFER')
}

function canInitializeShelfStock(disInfo, snapshot) {
  return !!disInfo && hasEffectiveFeature(snapshot, 'SHELF_STOCK_INITIALIZATION')
}

function canUsePurchaseCore(disInfo, snapshot) {
  return !!disInfo && hasEffectiveFeature(snapshot, 'PURCHASE_CORE')
}

// 普通货架商品入库：只看 STOCK_IN 有效权限（经营模式 ∩ 套餐），
// 不依赖 PURCHASE_CORE，因此模式 2/3/4 都能显示“采购入库”入口。
function canUseStockIn(disInfo, snapshot) {
  return !!disInfo && hasEffectiveFeature(snapshot, 'STOCK_IN')
}

function canCountInventory(disInfo, snapshot) {
  return !!disInfo && hasEffectiveFeature(snapshot, 'INVENTORY_COUNT')
}

function isExplicit(disInfo, snapshot) {
  return !!((snapshot && snapshot.explicitOperatingMode === true) ||
    (disInfo && disInfo.nxDistributerOperatingModeCode))
}

function legacyShelfResponsibility(disInfo) {
  // 未迁移老客户保留原 business_type > 2 的已有入口。
  return !!disInfo && Number(disInfo.nxDistributerBusinessTypeId) > 2
}

// 专业采购入口（采购总览页等）按有效权限 PURCHASE_CORE 判断；
// 未迁移老客户沿用原 business_type > 2 入口。
function canUseProfessionalPurchase(disInfo, snapshot) {
  return isExplicit(disInfo, snapshot)
    ? hasEffectiveFeature(snapshot, 'PURCHASE_CORE')
    : legacyShelfResponsibility(disInfo)
}

// 协作伙伴能力同样按有效权限判断；未迁移客户沿用原平台型 business_type 6/7 入口。
function canUsePartnerCollaboration(disInfo, snapshot) {
  if (isExplicit(disInfo, snapshot)) {
    return hasEffectiveFeature(snapshot, 'PARTNER_DISTRIBUTOR_COLLABORATION') &&
      hasEffectiveFeature(snapshot, 'PLATFORM_GOODS')
  }
  return !!disInfo && Number(disInfo.nxDistributerBusinessTypeId) > 5
}

module.exports = {
  hasEffectiveFeature,
  canManageShelfResponsibility,
  canTransferShelfStock,
  canInitializeShelfStock,
  canUsePurchaseCore,
  canUseStockIn,
  canCountInventory,
  canUseProfessionalPurchase,
  canUsePartnerCollaboration
}

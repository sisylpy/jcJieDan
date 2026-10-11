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

// 指定货架负责人是老板/授权管理员的账号权限，不应因为经营模式未包含
// SHELF_RESPONSIBILITY 就对老板隐藏入口。角色以后端签发的登录身份为准，
// 前端仅用于展示，后端 /setShelfUser 会再次校验真实角色。
function canAssignShelfStaff(disInfo, userInfo) {
  if (!disInfo) return false
  const role = userInfo && userInfo.nxDiuAdmin
  return Number(role) === 0
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

// 派单/配送：按有效权限 ADVANCED_DISPATCH 判断（经营模式 ∩ 套餐），
// 不再绑定货架履约流程；模式 7 平台型批发商同样具备派单能力。
function canUseDispatch(disInfo, snapshot) {
  return !!disInfo && hasEffectiveFeature(snapshot, 'ADVANCED_DISPATCH')
}

function canViewTraceabilityEvidence(disInfo, snapshot) {
  return !!disInfo && hasEffectiveFeature(snapshot, 'TRACEABILITY_EVIDENCE')
}

function canViewOrderTraceability(disInfo, snapshot) {
  return !!disInfo && hasEffectiveFeature(snapshot, 'ORDER_TRACEABILITY_OUTPUT')
}

module.exports = {
  hasEffectiveFeature,
  canManageShelfResponsibility,
  canAssignShelfStaff,
  canTransferShelfStock,
  canInitializeShelfStock,
  canUsePurchaseCore,
  canUseDispatch,
  canUseStockIn,
  canCountInventory,
  canViewTraceabilityEvidence,
  canViewOrderTraceability,
  canUseProfessionalPurchase,
  canUsePartnerCollaboration
}

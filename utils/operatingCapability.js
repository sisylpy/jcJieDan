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

// 商品与批次溯源资料（质检/溯源报告文件的上传与查看）：模式 5 有效能力。
function canViewTraceabilityEvidence(disInfo, snapshot) {
  return !!disInfo && hasEffectiveFeature(snapshot, 'TRACEABILITY_EVIDENCE')
}

// 订单溯源查看与输出：模式 5 有效能力，与上面的溯源资料权限不混用。
function canViewOrderTraceability(disInfo, snapshot) {
  return !!disInfo && hasEffectiveFeature(snapshot, 'ORDER_TRACEABILITY_OUTPUT')
}

module.exports = {
  hasEffectiveFeature,
  canManageShelfResponsibility,
  canTransferShelfStock,
  canInitializeShelfStock,
  canUsePurchaseCore,
  canUseStockIn,
  canCountInventory,
  canViewTraceabilityEvidence,
  canViewOrderTraceability
}

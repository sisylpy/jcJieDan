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

function canCountInventory(disInfo, snapshot) {
  return !!disInfo && hasEffectiveFeature(snapshot, 'INVENTORY_COUNT')
}

module.exports = {
  hasEffectiveFeature,
  canManageShelfResponsibility,
  canTransferShelfStock,
  canInitializeShelfStock,
  canUsePurchaseCore,
  canCountInventory
}

const STORAGE_KEY = 'commercialEntitlement'

function saveFromLogin(data) {
  if (data && data.commercialEntitlement) {
    wx.setStorageSync(STORAGE_KEY, data.commercialEntitlement)
  }
}

function snapshot() {
  return wx.getStorageSync(STORAGE_KEY) || null
}

function hasFeature(featureCode) {
  const current = snapshot()
  if (!current) return false
  const features = Array.isArray(current.entitledFeatures) ? current.entitledFeatures : []
  return features.indexOf(featureCode) >= 0
}

function requireFeature(featureCode, featureName) {
  if (hasFeature(featureCode)) return true
  wx.showModal({
    title: '当前套餐未开通',
    content: '“' + (featureName || featureCode) + '”不在当前商业套餐中，请联系管理员调整套餐。',
    showCancel: false
  })
  return false
}

function isShelfBusinessType(disInfo) {
  const type = Number(disInfo && disInfo.nxDistributerBusinessTypeId)
  return type >= 3 && type <= 5
}

function hasShelfWorkflowFeature(featureCode, disInfo) {
  return hasFeature(featureCode) && isShelfBusinessType(disInfo)
}

function requireShelfWorkflowFeature(featureCode, featureName, disInfo) {
  if (!requireFeature(featureCode, featureName)) return false
  if (isShelfBusinessType(disInfo)) return true
  wx.showModal({
    title: '经营类型不适用',
    content: '当前经营类型未启用完整货架工作流，请联系管理员确认 3–5 类型。',
    showCancel: false
  })
  return false
}

module.exports = {
  STORAGE_KEY,
  saveFromLogin,
  snapshot,
  hasFeature,
  requireFeature,
  isShelfBusinessType,
  hasShelfWorkflowFeature,
  requireShelfWorkflowFeature
}

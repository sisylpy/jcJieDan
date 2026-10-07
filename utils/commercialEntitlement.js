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

module.exports = {
  STORAGE_KEY,
  saveFromLogin,
  snapshot,
  hasFeature,
  requireFeature
}

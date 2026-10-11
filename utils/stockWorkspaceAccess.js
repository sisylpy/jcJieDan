const SMALL_WHOLESALE = 'SMALL_WHOLESALE'
const PARTNER_PLATFORM = 'PARTNER_PLATFORM'

function featureSet(entitlement, capability) {
  // 专业采购入口必须按 effectiveFeatures（经营模式 ∩ 套餐）判定：
  // SHELF 套餐本身含 PURCHASE_CORE，只看套餐 entitledFeatures 会让模式 2/3 误显示“外采”。
  // 能力快照缺失时回退到套餐维度，保持既有行为。
  const effective = capability && Array.isArray(capability.effectiveFeatures)
    ? capability.effectiveFeatures : []
  const entitled = entitlement && Array.isArray(entitlement.entitledFeatures)
    ? entitlement.entitledFeatures : []
  return new Set(effective.length ? effective : entitled)
}

function resolve(disInfo, entitlement, capability) {
  const modeCode = disInfo && disInfo.nxDistributerOperatingModeCode
  const features = featureSet(entitlement, capability)
  const showPurchaseWorkspace = modeCode !== SMALL_WHOLESALE &&
    features.has('PURCHASE_CORE')
  const showPartnerWorkspace = modeCode === PARTNER_PLATFORM &&
    features.has('PARTNER_DISTRIBUTOR_COLLABORATION')
  const workspaceNames = ['stock']

  if (showPurchaseWorkspace) workspaceNames.push('purchase')
  if (showPartnerWorkspace) workspaceNames.push('partner')

  return {
    showPurchaseWorkspace,
    showPartnerWorkspace,
    showWorkspaceTabs: workspaceNames.length > 1,
    workspaceNames,
    partnerWorkspaceIndex: workspaceNames.indexOf('partner')
  }
}

module.exports = { resolve }

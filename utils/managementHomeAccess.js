const operatingCapability = require('./operatingCapability.js')

const PLAN_NAMES = {
  BASIC: '基础出货版',
  SHELF: '货架经营版',
  SALES_GROWTH: '销售增长版',
  PLATFORM_PARTNER: '平台协作版'
}

const STATUS_NAMES = {
  ACTIVE: '已激活',
  PENDING: '待生效',
  SUPERSEDED: '已替换',
  EXPIRED: '已到期',
  CANCELLED: '已取消',
  NO_EFFECTIVE_SUBSCRIPTION: '无有效订阅'
}

function build(snapshot, userInfo, disInfo, capability) {
  const current = snapshot || {}
  // 专业采购必须按 effectiveFeatures（经营模式 ∩ 套餐）判定：SHELF 套餐本身含
  // PURCHASE_CORE，只看套餐 entitledFeatures 会让模式 2/3 仍显示“采购管理”。
  // effectiveFeatures 只存在于 operatingCapability 对象中，不在 commercialEntitlement 里，
  // 因此必须由调用方单独传入；两者都没有时才回退到套餐维度。
  const capabilityEffective = capability && Array.isArray(capability.effectiveFeatures)
    ? capability.effectiveFeatures : null
  const effective = capabilityEffective
    || (Array.isArray(current.effectiveFeatures) ? current.effectiveFeatures : [])
  const entitled = Array.isArray(current.entitledFeatures) ? current.entitledFeatures : []
  const featureSet = new Set(effective.length ? effective : entitled)
  const has = code => featureSet.has(code)
  const professionalPurchase = has('PURCHASE_CORE')
  const isOwner = Number(userInfo && userInfo.nxDiuAdmin) === 0
  const shelfWorkflowEnabled = Boolean(disInfo && disInfo.nxDistributerShelfMode)

  const access = {
    accessLoaded: Boolean(snapshot),
    commercialPlanName: PLAN_NAMES[current.currentPlan] || '未开通商业套餐',
    commercialStatusName: STATUS_NAMES[current.subscriptionStatus] || '未激活',
    entitlementVersion: Number(current.entitlementVersion || 0),
    shelfWorkflowEnabled,

    canManageStaff: isOwner,
    canEditStore: isOwner,
    canPrintCustomerDocument: has('CUSTOMER_DOCUMENT'),

    canViewCustomers: has('CUSTOMER_MASTER'),
    canViewGoods: has('GOODS_MASTER'),
    canViewOrderAnomalies: has('ORDER_QUERY'),
    canViewSalesAnalysis: isOwner && has('SALES_ACTIVITY_ANALYTICS'),

    canViewPurchaseManagement: professionalPurchase,
    canViewPurchaseCollaboration: professionalPurchase && has('SUPPLIER_COLLABORATION'),
    canViewPurchaserDetail: professionalPurchase && has('PURCHASER_MANAGEMENT'),
    canViewSupplierList: professionalPurchase && has('BASIC_SUPPLIER_MANAGEMENT'),
    // 协作伙伴是 offerNx 唯一入口，按经营模式 ∩ 套餐的有效能力判断；
    // 不能绑定货架履约流程，模式 7 平台型批发商不开货架也有权协作。
    canViewPartnerCollaboration: operatingCapability.canUsePartnerCollaboration(
      disInfo, capability),
    canViewBusinessDashboard: isOwner && has('OWNER_DASHBOARD'),
    canViewPurchaseAnalytics: isOwner && professionalPurchase && has('PURCHASE_ANALYTICS'),

    // 货架、库存、派单、分析一律按有效能力判断，不再绑定 nxDistributerShelfMode：
    // 模式 1 的 allowedFeatures 不含货架与派单能力，会被有效权限自然过滤。
    canViewShelf: has('SHELF_MANAGEMENT'),
    canViewStock: has('INVENTORY_BATCH'),
    canViewSmartReplenishment: isOwner && has('SMART_REPLENISHMENT'),
    canViewInventoryAnalytics: isOwner && has('INVENTORY_ANALYTICS'),

    canViewFinanceOverview: isOwner && has('FINANCIAL_ANALYTICS'),
    canViewPurchaseFinance: isOwner && has('PURCHASE_FINANCE'),
    canViewDispatch: isOwner && has('ADVANCED_DISPATCH'),

    canViewAnnouncement: false,
    canViewAfterSales: has('AFTER_SALES'),
    canViewCompensationCoupon: has('AFTER_SALES'),
    canViewCoupon: false
  }

  access.showCustomerSection = access.canViewCustomers || access.canViewGoods
    || access.canViewOrderAnomalies || access.canViewSalesAnalysis
  access.showPurchaseSection = professionalPurchase && (
    access.canViewPurchaseManagement
    || access.canViewPurchaseCollaboration || access.canViewPurchaserDetail
    || access.canViewSupplierList || access.canViewPartnerCollaboration
    || access.canViewBusinessDashboard || access.canViewPurchaseAnalytics)
  access.showInventorySection = access.canViewShelf || access.canViewStock
    || access.canViewSmartReplenishment || access.canViewInventoryAnalytics
  access.showFinanceSection = access.canViewFinanceOverview || access.canViewPurchaseFinance
  access.showDispatchSection = access.canViewDispatch
  access.showStoreSection = access.canViewAnnouncement || access.canViewAfterSales
    || access.canViewCompensationCoupon || access.canViewCoupon
  return access
}

module.exports = { build }

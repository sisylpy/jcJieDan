var MODE_STOCK = 'stock'
var MODE_PURCHASE = 'purchase'
var MODE_AUTO = 'auto'
var MODE_PARTNER = 'partner'

function hasSupplier(goods) {
  if (!goods) return false
  var supplierId = Number(goods.nxDgSupplierId)
  return isFinite(supplierId) && supplierId > 0
}

/**
 * 协作供货商：必须同时绑定具体协作伙伴和伙伴名下的商品，
 * 只有伙伴 id 或只有商品 id 都不算完成绑定。
 */
function hasPartnerBinding(goods) {
  if (!goods) return false
  var binding = goods.nxPartnerBinding
  if (!binding) return false
  var partnerDisId = Number(binding.partnerDistributerId)
  var partnerGoodsId = Number(binding.partnerDisGoodsId)
  return isFinite(partnerDisId) && partnerDisId > 0
    && isFinite(partnerGoodsId) && partnerGoodsId > 0
}

/**
 * nxDgPurchaseAuto 只表达履约模式；自动订货由 ORDER_PURCHASE + supplier 组合表达，
 * 协作供货商由 ORDER_PURCHASE + 伙伴绑定组合表达。历史值 2 仅用于页面回显，保存时收敛为 1。
 */
function resolveMode(goods) {
  goods = goods || {}
  var purchaseAuto = Number(goods.nxDgPurchaseAuto)
  if (purchaseAuto === -1) return MODE_STOCK
  if (purchaseAuto === 2) return MODE_AUTO
  if (hasPartnerBinding(goods)) return MODE_PARTNER
  if (purchaseAuto === 1 && hasSupplier(goods)) return MODE_AUTO
  return MODE_PURCHASE
}

function applyMode(goods, mode) {
  var next = Object.assign({}, goods || {})
  if (mode === MODE_STOCK) {
    next.nxDgPurchaseAuto = -1
  } else {
    next.nxDgPurchaseAuto = 1
  }

  if (mode === MODE_PURCHASE) {
    next.nxDgSupplierId = null
    next.nxJrdhSupplierEntity = null
    next.nxPartnerBinding = null
  }
  if (mode === MODE_AUTO) {
    next.nxPartnerBinding = null
  }
  if (mode === MODE_PARTNER) {
    // 协作供货商由伙伴绑定表达，不再使用外部供货商
    next.nxDgSupplierId = null
    next.nxJrdhSupplierEntity = null
  }
  return next
}

function prepareForSave(goods, mode) {
  var next = applyMode(goods, mode)
  if (mode === MODE_AUTO && !hasSupplier(next)) {
    return {
      ok: false,
      message: '请选择自动订货供货商'
    }
  }
  if (mode === MODE_PARTNER && !hasPartnerBinding(next)) {
    return {
      ok: false,
      message: '请选择协作供货伙伴和伙伴商品'
    }
  }
  return {
    ok: true,
    goods: next
  }
}

module.exports = {
  MODE_STOCK: MODE_STOCK,
  MODE_PURCHASE: MODE_PURCHASE,
  MODE_AUTO: MODE_AUTO,
  MODE_PARTNER: MODE_PARTNER,
  hasSupplier: hasSupplier,
  hasPartnerBinding: hasPartnerBinding,
  resolveMode: resolveMode,
  applyMode: applyMode,
  prepareForSave: prepareForSave
}

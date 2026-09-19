var MODE_STOCK = 'stock'
var MODE_PURCHASE = 'purchase'
var MODE_AUTO = 'auto'

function hasSupplier(goods) {
  if (!goods) return false
  var supplierId = Number(goods.nxDgSupplierId)
  return isFinite(supplierId) && supplierId > 0
}

/**
 * nxDgPurchaseAuto 只表达履约模式；自动订货由 ORDER_PURCHASE + supplier 组合表达。
 * 历史值 2 仅用于页面回显，保存时必须收敛为 1。
 */
function resolveMode(goods) {
  goods = goods || {}
  var purchaseAuto = Number(goods.nxDgPurchaseAuto)
  if (purchaseAuto === -1) return MODE_STOCK
  if (purchaseAuto === 2) return MODE_AUTO
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
  return {
    ok: true,
    goods: next
  }
}

module.exports = {
  MODE_STOCK: MODE_STOCK,
  MODE_PURCHASE: MODE_PURCHASE,
  MODE_AUTO: MODE_AUTO,
  hasSupplier: hasSupplier,
  resolveMode: resolveMode,
  applyMode: applyMode,
  prepareForSave: prepareForSave
}

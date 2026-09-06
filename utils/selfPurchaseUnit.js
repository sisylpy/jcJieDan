function normalized(value) {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

function positiveText(value) {
  if (value === null || value === undefined || value === '') return ''
  var number = Number(value)
  return isFinite(number) && number > 0 ? String(value) : ''
}

/**
 * 订单单位是客户的订货表达；采购单位只能来自配送商品本身。
 * 全部订单都明确按商品大包装下单时才使用大包装，否则统一按商品基础规格采购。
 */
function resolvePurchaseUnit(item) {
  item = item || {}
  var goods = item.nxDistributerGoodsEntity || {}
  var baseUom = normalized(item.nxDgGoodsStandardname || goods.nxDgGoodsStandardname)
  var cartonUom = normalized(item.nxDgCartonUnit || goods.nxDgCartonUnit)
  var orders = item.orders || item.nxDepartmentOrdersEntities || []
  var cartonMode = !!cartonUom && cartonUom !== baseUom && orders.length > 0 &&
    orders.every(function (order) {
      return normalized(order && order.nxDoStandard) === cartonUom
    })

  return {
    baseUom: baseUom,
    cartonUom: cartonUom,
    isCartonMode: cartonMode,
    purchaseUom: cartonMode ? cartonUom : baseUom,
    invalidUnit: cartonMode ? !cartonUom : !baseUom
  }
}

/**
 * 只有订单数量与采购单位相同时才能安全预填；跨单位必须由采购人录入实采量。
 */
function initialPurchaseQuantity(order, unit) {
  order = order || {}
  if (unit && unit.isCartonMode) {
    var actualScaleWeight = positiveText(order.nxDoScaleWeight)
    if (actualScaleWeight) return actualScaleWeight
    if (normalized(order.nxDoStandard) === normalized(unit.purchaseUom)) {
      return positiveText(order.nxDoQuantity)
    }
    return ''
  }
  var actualWeight = positiveText(order.nxDoWeight)
  if (actualWeight) return actualWeight
  if (normalized(order.nxDoStandard) === normalized(unit.purchaseUom)) {
    return positiveText(order.nxDoQuantity)
  }
  return ''
}

module.exports = {
  resolvePurchaseUnit: resolvePurchaseUnit,
  initialPurchaseQuantity: initialPurchaseQuantity
}

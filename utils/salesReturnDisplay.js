var TERMINAL_BUSINESS_STATUSES = {
  COMPLETED: true,
  REJECTED: true,
  CANCELLED: true
}

function quantityText(value) {
  if (value === undefined || value === null || value === '') return '0'
  var number = Number(value)
  if (!isFinite(number)) return String(value)
  return String(Number(number.toFixed(3)))
}

function moneyText(value) {
  var number = Number(value)
  return isFinite(number) ? number.toFixed(2) : '0.00'
}

function statusMeta(row) {
  var businessStatus = row.nxDsrBusinessStatus
  var logisticsStatus = row.nxDsrLogisticsStatus
  var taskStatus = row.shipmentTaskStatus

  if (businessStatus === 'SUBMITTED') {
    return { label: '待审核', tone: 'pending', actionHint: '请先审核退货申请' }
  }
  if (logisticsStatus === 'WAIT_ASSIGN') {
    if (taskStatus && taskStatus !== 'UNASSIGNED') {
      return { label: '已进路线', tone: 'assigned', actionHint: '司机路线已分派' }
    }
    return { label: '待派司机', tone: 'pending', actionHint: '请在配送页安排取货路线' }
  }
  if (logisticsStatus === 'ASSIGNED') {
    return { label: '已进路线', tone: 'assigned', actionHint: '司机路线已分派' }
  }
  if (logisticsStatus === 'IN_TRANSIT') {
    return { label: '取货运输中', tone: 'transit', actionHint: '等待仓库验收' }
  }
  if (logisticsStatus === 'RECEIVED') {
    if (businessStatus === 'WAIT_FINANCIAL') {
      return { label: '待账款处理', tone: 'financial', actionHint: '退货已验收，请处理退款或冲减' }
    }
    if (businessStatus === 'WAIT_CONFIRM') {
      return { label: '待客户确认', tone: 'confirm', actionHint: '退货处理已完成，等待客户确认' }
    }
    return { label: '仓库已收货', tone: 'received', actionHint: '退货已完成仓库验收' }
  }
  if (logisticsStatus === 'NOT_REQUIRED') {
    return { label: '无需取货', tone: 'received', actionHint: '本单不需要司机上门取货' }
  }
  if (businessStatus === 'WAIT_FINANCIAL') {
    return { label: '待账款处理', tone: 'financial', actionHint: '请处理退款或账款冲减' }
  }
  if (businessStatus === 'WAIT_CONFIRM') {
    return { label: '待客户确认', tone: 'confirm', actionHint: '等待客户确认处理结果' }
  }
  return { label: '处理中', tone: 'processing', actionHint: '退货正在处理中' }
}

function buildGoodsLine(item) {
  var quantity = item.nxDsriApprovedQuantity
  if (quantity === undefined || quantity === null) quantity = item.nxDsriRequestedQuantity
  return {
    id: item.nxDsriId,
    goodsName: item.nxDsriGoodsName || '未命名商品',
    quantityText: quantityText(quantity),
    unit: item.nxDsriUnit || ''
  }
}

function buildActiveSalesReturnOrders(rows) {
  return (Array.isArray(rows) ? rows : [])
    .filter(function (row) {
      return row && !TERMINAL_BUSINESS_STATUSES[row.nxDsrBusinessStatus]
    })
    .map(function (row) {
      var items = (Array.isArray(row.items) ? row.items : []).map(buildGoodsLine)
      var status = statusMeta(row)
      return Object.assign({}, row, {
        _rowKey: 'sales-return-' + row.nxDsrId,
        displayStatus: status.label,
        statusTone: status.tone,
        actionHint: status.actionHint,
        itemCount: items.length,
        displayItems: items,
        estimatedCreditText: moneyText(row.nxDsrEstimatedCreditAmount),
        routeDateText: row.nxDsrBusinessStatus === 'SUBMITTED'
          ? '待审核后安排'
          : (row.nxDsrPickupRequired === 1
            ? (row.nxDsrRouteDate || '待安排')
            : '无需上门取货')
      })
    })
}

module.exports = {
  buildActiveSalesReturnOrders: buildActiveSalesReturnOrders,
  statusMeta: statusMeta
}

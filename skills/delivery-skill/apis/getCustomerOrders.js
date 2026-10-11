// 某客户今日订单明细（只读）
// 数据源：phoneGetToFillDepOrders(form) → data.arr（订单数组）
// 订单字段：nxDepartmentOrdersId / nxDoQuantity / nxDoSubtotal /
//          nxDistributerGoodsEntity.nxDgGoodsName / nxDoStandard / nxDoWeight / nxDoPrice
// 独立 JS 环境使用 CommonJS 导出（官方 SKILL 规范）

const nxRequest = require('./request.js').nxRequest
const endpoints = require('./endpoints.js')

async function getCustomerOrders(args) {
  const depFatherId = args && args.depFatherId
  if (!depFatherId) {
    return { isError: true, content: [{ type: 'text', text: '缺少客户 ID，请先查询今日配送客户拿到 depFatherId。' }] }
  }
  try {
    const data = await nxRequest(endpoints.GET_CUSTOMER_ORDERS, {
      method: 'POST',
      form: {
        depFatherId: String(depFatherId),
        gbDepFatherId: '-1',
        disId: String(endpoints.currentDisId())
      }
    })
    const orders = (data && (data.arr || data.nxDepartmentOrdersEntities)) || []
    const rawTotal = data && (data.total != null ? data.total : data.subAmount)
    const totalAmount = rawTotal != null ? Number(rawTotal) : 0
    const items = orders.map(function (o) {
      const g = o.nxDistributerGoodsEntity || {}
      const pick = function () {
        for (let i = 0; i < arguments.length; i++) {
          const n = arguments[i]
          if (o[n] != null && o[n] !== '') return o[n]
        }
        return ''
      }
      return {
        orderId: pick('nxDepartmentOrdersId', 'nxDepartmentOrderId'),
        goodsName: g.nxDgGoodsName || pick('nxDoGoodsName', 'nxDoGoodsOriginalName'),
        standard: pick('nxDoStandard') || g.nxDgGoodsStandardname || '',
        quantity: String(pick('nxDoQuantity', 'nxDepartmentOrderQuantity')),
        weight: String(pick('nxDoWeight', 'nxDepartmentOrderWeight')),
        price: String(pick('nxDoPrice')),
        subtotal: String(pick('nxDoSubtotal', 'nxDepartmentOrderSubTotal'))
      }
    })
    return {
      isError: false,
      content: [{
        type: 'text',
        text: '该客户今日共 ' + items.length + ' 条订单，合计 ¥' + Number(totalAmount).toFixed(2) + '，接下来展示订单卡片。'
      }],
      structuredContent: {
        orderCount: items.length,
        totalAmount: Number(totalAmount),
        totalAmountHanzi: (data && data.totalHanzi) || '',
        items: items
      },
      _meta: { items: items }
    }
  } catch (err) {
    return { isError: true, content: [{ type: 'text', text: '查询失败：' + ((err && err.msg) || err) }] }
  }
}

module.exports = getCustomerOrders

// 某客户对账/账单（只读）
// 独立 JS 环境使用 CommonJS 导出（官方 SKILL 规范）

const nxRequest = require('./request.js').nxRequest
const endpoints = require('./endpoints.js')

async function getCustomerBill(args) {
  const depFatherId = args && args.depFatherId
  if (!depFatherId) {
    return { isError: true, content: [{ type: 'text', text: '缺少客户 ID，请先查询今日配送客户拿到 depFatherId。' }] }
  }
  try {
    const data = await nxRequest(endpoints.GET_CUSTOMER_BILL, {
      method: 'POST',
      data: { depFatherId: depFatherId, status: 'unsettled' }
    })
    const bills = (data && (data.bills || data.list)) || []
    const unsettledAmount = bills.reduce(function (sum, b) {
      return sum + (Number(b.arrearsAmount != null ? b.arrearsAmount : b.amount) || 0)
    }, 0)
    return {
      isError: false,
      content: [{
        type: 'text',
        text: '该客户共 ' + bills.length + ' 笔账单，未结算金额 ¥' + unsettledAmount.toFixed(2) + '，接下来展示对账卡片。'
      }],
      structuredContent: { billCount: bills.length, unsettledAmount: unsettledAmount },
      _meta: { bills: bills }
    }
  } catch (err) {
    return { isError: true, content: [{ type: 'text', text: '查询失败：' + ((err && err.msg) || err) }] }
  }
}

module.exports = getCustomerBill

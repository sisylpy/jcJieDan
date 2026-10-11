// 今日有待配送单的老客户清单（只读）
// 数据源：disGetTodayOrderCustomer → data.deps.nxDep（自有 nx 老客户）
// 独立 JS 环境使用 CommonJS 导出（官方 SKILL 规范）

const nxRequest = require('./request.js').nxRequest
const endpoints = require('./endpoints.js')

async function getTodayDeliveryCustomers() {
  try {
    const data = await nxRequest(endpoints.getTodayDeliveryCustomersUrl(endpoints.currentDisId()))
    const deps = (data && data.deps) || {}
    const list = deps.nxDep || []
    const customers = list.map(function (c) {
      const dep = c.dep || c
      const sub = Number(dep.nxDepartmentSubAmount || 0)
      return {
        depFatherId: dep.nxDepartmentId,
        name: dep.nxDepartmentAttrName || dep.nxDepartmentName || '',
        subDepartmentCount: sub,
        requiresPrintModeChoice: sub > 0
      }
    })
    return {
      isError: false,
      content: [{
        type: 'text',
        text: '今日共有 ' + customers.length + ' 个客户有待配送单，接下来展示客户卡片，禁止以纯文本罗列。'
      }],
      structuredContent: { total: customers.length, customers: customers },
      _meta: { customers: customers }
    }
  } catch (err) {
    return { isError: true, content: [{ type: 'text', text: '查询失败：' + ((err && err.msg) || err) }] }
  }
}

module.exports = getTodayDeliveryCustomers

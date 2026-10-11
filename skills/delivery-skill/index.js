// SKILL 入口：按微信小程序 AI 开发模式官方规范注册原子接口。
// 参考：https://developers.weixin.qq.com/miniprogram/dev/ai/integration
// 要求：
//   1. wx.modelContext.createSkill(path) 的 path 与 app.json 里 agent.skills[].path 一致
//   2. registerAPI 的 name 与 mcp.json 里 apis[].name 完全一致
//   3. 独立 JS 环境使用 CommonJS（require / module.exports）

const getTodayDeliveryCustomers = require('./apis/getTodayDeliveryCustomers.js')
const getCustomerOrders = require('./apis/getCustomerOrders.js')
const getCustomerBill = require('./apis/getCustomerBill.js')

const skill = wx.modelContext.createSkill('skills/delivery-skill')

skill.registerAPI('getTodayDeliveryCustomers', getTodayDeliveryCustomers)
skill.registerAPI('getCustomerOrders', getCustomerOrders)
skill.registerAPI('getCustomerBill', getCustomerBill)

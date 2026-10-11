// 后端地址与接口路径集中配置（已对照 boss-mini 现有调用填写，非占位）。
// 来源：grain-print-connector 源码 + boss-mini 自有 apiDepOrder.js / apiDistributer.js。
//   - disGetTodayOrderCustomer：pages/order/index/index.js 已在用（老板端鉴权 ownerRequest 风格）
//   - phoneGetToFillDepOrders：subPackage-order/orderPage.js 已在用（自有 nx 老客户链路）
// 独立 JS 环境使用 CommonJS 导出（官方 SKILL 规范）。

// ⚠️ 老板端所有业务请求都被 lib/ownerRequest.js 的 toOwnerUrl() 重写：
//   '/api/xxx' → '/api/owner/xxx'。SKILL 不走 ownerRequest（独立 JS 环境），必须自带 owner 前缀。
const BASE = 'https://grainservice.club:8443/nongxinle/api/owner/'

// 配送商 ID：优先读登录态 ownerDistributerId（persistOwnerAuth 写入），回落到测试值 160。
const DEFAULT_DIS_ID = 160

function currentDisId() {
  const n = Number(wx.getStorageSync('ownerDistributerId'))
  return n > 0 ? n : DEFAULT_DIS_ID
}

// 今日订货客户（自有老客户 = deps.nxDep；GB 客户 = deps.gbDisArrApp；平台客户 = deps.platformDep，已空）
// 参考：lib/apiDepOrder.js:3117  disGetTodayOrderCustomer
function getTodayDeliveryCustomersUrl(disId) {
  return BASE + 'nxdepartmentorders/disGetTodayOrderCustomer/' + disId
}

// 某客户今日订单明细（POST form-urlencoded）。参考：lib/apiDepOrder.js:1605  phoneGetToFillDepOrders
// 返回 data.arr（订单数组）；老客户传 gbDepFatherId=-1
const GET_CUSTOMER_ORDERS = BASE + 'nxdepartmentorders/phoneGetToFillDepOrders'

// 已有真实端点：按状态查配送商账单
const GET_CUSTOMER_BILL = BASE + 'nxdistributerbill/disGetNxDistributerBillsWithStatus'

module.exports = {
  BASE: BASE,
  DEFAULT_DIS_ID: DEFAULT_DIS_ID,
  currentDisId: currentDisId,
  getTodayDeliveryCustomersUrl: getTodayDeliveryCustomersUrl,
  GET_CUSTOMER_ORDERS: GET_CUSTOMER_ORDERS,
  GET_CUSTOMER_BILL: GET_CUSTOMER_BILL
}

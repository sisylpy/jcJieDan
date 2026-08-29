import assert from 'node:assert/strict'
import fs from 'node:fs'

const view = fs.readFileSync(
  'subPackage/pages/customer/customerDetail/customerDetail.wxml',
  'utf8'
)
const script = fs.readFileSync(
  'subPackage/pages/customer/customerDetail/customerDetail.js',
  'utf8'
)
const style = fs.readFileSync(
  'subPackage/pages/customer/customerDetail/customerDetail.wxss',
  'utf8'
)

assert.doesNotMatch(view, /客户商品|订货商品|客户账单/, '详情页不再重复显示商品和账单入口')
assert.doesNotMatch(script, /toDepGoods\s*\(|toCustomerBill\s*\(/, '详情页删除重复入口处理函数')

for (const moduleName of ['客户与打印', '负责员工', '交易规则', '标签与分组', '路线配送', '门店与部门', '合作状态']) {
  assert.ok(view.includes(moduleName), `页面必须保留清晰模块：${moduleName}`)
}

const profileModal = view.slice(
  view.indexOf('<!-- 客户与打印弹窗'),
  view.indexOf('<!-- 交易规则弹窗')
)
assert.match(profileModal, /客户名称[\s\S]*简称（标签打印）[\s\S]*对外订货代号[\s\S]*送货单与打印设备/)
assert.doesNotMatch(profileModal, /支付方式|定价方式|地理位置|配送时间/, '客户与打印弹窗不混入交易或配送字段')

const tradeModal = view.slice(
  view.indexOf('<!-- 交易规则弹窗'),
  view.indexOf('<!-- 地理位置和配送时间设置弹窗')
)
assert.match(tradeModal, /支付方式[\s\S]*定价方式/)
assert.doesNotMatch(tradeModal, /客户名称|打印格式|地理位置|配送时间/, '交易弹窗不混入客户、打印或配送字段')

const deliveryModal = view.slice(
  view.indexOf('<!-- 地理位置和配送时间设置弹窗'),
  view.indexOf('<!-- 调整客户归属前选择下级门店 -->')
)
assert.match(deliveryModal, /地理位置[\s\S]*详细地址[\s\S]*最早配送时间[\s\S]*最晚配送时间[\s\S]*卸货时间/)
assert.doesNotMatch(deliveryModal, /支付方式|定价方式|打印格式/, '配送弹窗只处理配送信息')

const profileHandlers = script.slice(
  script.indexOf('showProfileEditor()'),
  script.indexOf('showTradeSettingsEditor()')
)
assert.match(profileHandlers, /profileDraft\.name/)
assert.match(profileHandlers, /profileDraft\.printName/)
assert.doesNotMatch(profileHandlers, /tradeDraft|nxDepartmentSettleType/, '客户与打印使用独立草稿')

const tradeHandlers = script.slice(
  script.indexOf('showTradeSettingsEditor()'),
  script.indexOf('toCustomerUser()')
)
assert.match(tradeHandlers, /tradeDraft\.settleType/)
assert.match(tradeHandlers, /tradeDraft\.pricingType/)
assert.doesNotMatch(tradeHandlers, /nxDepartmentPrintName|profileDraft/, '交易规则使用独立草稿')

assert.match(style, /\.customer-header-card\s*\{[\s\S]*background:\s*#ffffff/)
assert.doesNotMatch(style.slice(style.lastIndexOf('.customer-header-card {'), style.indexOf('.customer-header-card:active')), /linear-gradient/, '客户摘要不再使用大块绿色渐变')
assert.match(style, /\.header-status-chip\s*\{[\s\S]*align-items:\s*center;[\s\S]*justify-content:\s*center;/, '合作状态文字水平、垂直居中')
assert.match(style, /\.section-subtitle\s*\{/)
assert.match(style, /\.module-action\s*\{/)
assert.match(style, /\.modal-header\s*\{/)
assert.match(profileModal, /客户主图片[\s\S]*更换图片/, '主图片是资料弹窗中的辅助操作')
assert.match(profileHandlers, /chooseCustomerImage\(\)[\s\S]*updateCustomerImage/, '客户主图片通过统一认证上传接口保存')
assert.match(style, /\.profile-popup \.form-label\s*\{[\s\S]*font-size:\s*30rpx/, '资料弹窗字段字体放大')

console.log('customer detail module boundary: PASS (22 checks)')

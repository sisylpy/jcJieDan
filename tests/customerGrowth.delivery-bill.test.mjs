import assert from 'node:assert/strict'
import fs from 'node:fs'

const view = fs.readFileSync(
  'subPackage/pages/customer/customerGrowth/customerGrowth.wxml',
  'utf8'
)
const script = fs.readFileSync(
  'subPackage/pages/customer/customerGrowth/customerGrowth.js',
  'utf8'
)
const style = fs.readFileSync(
  'subPackage/pages/customer/customerGrowth/customerGrowth.wxss',
  'utf8'
)

assert.equal((view.match(/配送信息/g) || []).length, 1, '页面只保留一处配送信息')
assert.doesNotMatch(view, /经营信息|开通状态|合作状态/, '移除重复的经营及开通状态信息区')
assert.ok(
  view.indexOf('delivery-summary') < view.indexOf('metric-grid'),
  '配送信息应上移到经营指标之前'
)
assert.match(style, /\.delivery-summary\s*\{[\s\S]*width:\s*100%/, '配送信息占满整行')
assert.match(style, /\.section-heading\s*\{[\s\S]*font-size:\s*30rpx/, '配送标题字体已放大')
assert.match(style, /\.info-row\s*\{[\s\S]*font-size:\s*26rpx/, '配送内容字体已放大')

const goodsIndex = view.indexOf('bindtap="openCustomerGoods"')
const billIndex = view.indexOf('bindtap="openCustomerBills"')
assert.ok(goodsIndex >= 0 && billIndex > goodsIndex, '客户账单位于常购商品下方')
assert.match(view, /<text class="action-name">客户账单<\/text>/, '显示客户账单入口')
assert.match(script, /openCustomerBills\(\)/, '客户账单入口有统一处理函数')
assert.match(
  script,
  /\.\.\/customerPage\/customerPage\?depId=' \+ depId/,
  '客户账单复用现有账单页并传入当前客户ID'
)

console.log('customer growth delivery and bill contract: PASS (10 checks)')

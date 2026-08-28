import assert from 'node:assert/strict'
import fs from 'node:fs'

const pageScript = fs.readFileSync(
  'subPackage/pages/customer/customerOrderAnomalies/customerOrderAnomalies.js',
  'utf8'
)
const pageView = fs.readFileSync(
  'subPackage/pages/customer/customerOrderAnomalies/customerOrderAnomalies.wxml',
  'utf8'
)
const customerGoodsScript = fs.readFileSync(
  'subPackage/pages/customer/customerGoods/customerGoods.js',
  'utf8'
)
const customerGoodsView = fs.readFileSync(
  'subPackage/pages/customer/customerGoods/customerGoods.wxml',
  'utf8'
)
const api = fs.readFileSync('lib/apiDistributer.js', 'utf8')
const app = JSON.parse(fs.readFileSync('app.json', 'utf8'))

assert.ok(
  app.subPackages[0].pages.includes('pages/customer/customerOrderAnomalies/customerOrderAnomalies'),
  '订货异常页面必须注册到 Boss 分包'
)
assert.ok(
  api.includes('disGetDepOrderAnomalies/') && api.includes("method: 'GET'"),
  '订货异常必须通过 Owner 认证请求读取 Server 报告'
)
assert.ok(
  pageScript.includes('disGetDepOrderAnomalies(this.data.depFatherId)'),
  '异常页必须按当前客户读取报告'
)
assert.ok(
  pageScript.includes("SUSPECTED_STOP") &&
    pageScript.includes("ORDERING_DECLINE") &&
    pageScript.includes("ORDERING_SURGE"),
  '页面必须支持疑似停订、订货下降和订货激增三类筛选'
)
assert.ok(
  pageView.includes('异常只代表订货行为偏离历史规律') &&
    pageView.includes('可能原因待确认'),
  '页面必须说明异常不是事故原因结论'
)
assert.ok(
  pageView.includes('按部门商品分别计算，不合并不同部门'),
  '页面必须明确部门商品关系口径'
)
assert.ok(
  pageView.includes('平时订货周期') && pageView.includes('最近订货记录'),
  '异常详情必须提供周期与历史证据'
)
assert.ok(
  customerGoodsScript.includes('toOrderAnomalies') &&
    customerGoodsView.includes('订货异常') &&
    customerGoodsView.includes('疑似停订'),
  '客户商品页必须提供异常汇总入口'
)
assert.ok(
  !pageScript.includes('depFatherId: 1151') &&
    !pageView.includes('质量不好'),
  '不得写死测试客户或自动断言质量原因'
)

console.log('customer order anomaly page contract: PASS (9 checks)')

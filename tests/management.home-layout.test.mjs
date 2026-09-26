import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')

const view = read('subPackage/pages/management/homePage/homePage.wxml')
const page = read('subPackage/pages/management/homePage/homePage.js')

for (const title of ['客户与销售', '采购管理', '库存管理', '资金结算', '配送管理', '经营分析', '店铺运营']) {
  assert.match(view, new RegExp(`>${title}<`), `控制台缺少“${title}”分组`)
}

assert.equal((view.match(/>采购总览</g) || []).length, 1, '采购总览按钮只能出现一次')
assert.match(view, /bindtap="toPurchaseManagement"[\s\S]*?采购总览/)
assert.match(view, /bindtap="toPurchasePerformance"[\s\S]*?库存经营/)
assert.match(view, /purchasePendingCount/)
assert.match(page, /getPurchaseManagementOverview\(\{ range: 'TODAY' \}\)/)

const directRoutes = [
  'purchaseBatchList/purchaseBatchList',
  'supplierList/supplierList',
  'purchaserList/purchaserList',
  'financeOverview/financeOverview',
  'reimbursementList/reimbursementList',
  'settlementList/settlementList',
  'paymentList/paymentList'
]
for (const route of directRoutes) assert.match(page, new RegExp(route.replaceAll('/', '\\/')))

for (const preserved of ['账号', '充值记录', '修改店铺', '打印机', '订货异常', '智能备货', '销售分析', '公司公告牌']) {
  assert.match(view, new RegExp(preserved), `重排后不应遗漏“${preserved}”`)
}

console.log('management home grouped layout: PASS')

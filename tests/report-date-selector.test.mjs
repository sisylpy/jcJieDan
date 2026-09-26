import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = path => fs.readFileSync(path, 'utf8')
const component = read('components/report-date-filter/report-date-filter.wxml')
assert.match(component, /date-label/)
assert.match(component, /date-range/)
assert.match(component, /calendar/)

const reportPages = [
  'subPackage/pages/management/purchaseManagement/index/index',
  'subPackage/pages/management/purchaseManagement/purchaseAmountDetail/purchaseAmountDetail',
  'subPackage/pages/management/purchaseManagement/purchaseCollaboration/purchaseCollaboration',
  'subPackage/pages/management/purchaseManagement/purchaseBatchList/purchaseBatchList',
  'subPackage/pages/management/purchaseManagement/purchaserList/purchaserList',
  'subPackage/pages/management/purchaseManagement/purchaserDetail/purchaserDetail',
  'subPackage/pages/management/purchaseManagement/supplierList/supplierList',
  'subPackage/pages/management/purchaseManagement/financeOverview/financeOverview',
  'subPackage/pages/management/purchaseManagement/paymentList/paymentList',
  'subPackage/pages/management/purchaseManagement/settlementList/settlementList',
  'subPackage/pages/management/dispatchPerformance/dispatchPerformance',
  'subPackage-purchase-management/pages/purchasePerformance/purchasePerformance',
  'subPackage-charts/pages/customer/customerGoodsPrice/customerGoodsPrice',
  'subPackage-charts/pages/customer/customerPdf/customerPdf',
  'subPackage-charts/pages/afterSales/index/index',
  'subPackage-charts/pages/salesAnalysis/index/index',
  'subPackage-charts/pages/smartReplenishment/index/index',
  'subPackage-charts/pages/statistic/index/index',
  'subPackage-charts/pages/statistic/indexRetail/indexRetail',
  'subPackage-charts/pages/statistic/purchaseDeatil/purchaseDeatil',
  'subPackage-charts/pages/statistic/stockPurGoods/stockPurGoods',
  'subPackage-charts/pages/statistic/costGoodsByDate/costGoodsByDate',
  'subPackage-charts/pages/statistic/purGoodsByDate/purGoodsByDate',
  'subPackage-charts/pages/mangement/costGoodsFenxi/costGoodsFenxi',
  'subPackage-charts/pages/mangement/goodsFenxiCost/goodsFenxiCost',
  'subPackage-charts/pages/mangement/goodsFenxiPurchase/goodsFenxiPurchase',
  'subPackage-charts/pages/mangement/inventoryBusinessAnalysis/inventoryBusinessAnalysis',
  'subPackage-charts/pages/mangement/purGoodsFenxi/purGoodsFenxi',
  'subPackage-charts/pages/mangement/purchaseCategoryDetail/purchaseCategoryDetail',
  'subPackage-charts/pages/mangement/purchaseCountAnalysis/purchaseCountAnalysis',
  'subPackage-charts/pages/mangement/selfPurchaseAnalysis/selfPurchaseAnalysis',
  'subPackage-charts/pages/mangement/supplierAnalysis/supplierAnalysis',
  'subPackage-charts/pages/mangement/unitPriceAnalysis/unitPriceAnalysis',
  'subPackage/pages/customer/jrdhGoodsStars/jrdhGoodsStars',
  'subPackage/pages/management/myBills/myBills',
  'subPackage/pages/offerNx/nxDisBills/nxDisBills',
  'subPackage/pages/offerNx/offerNxDistributerList/offerNxDistributerList'
]

for (const page of reportPages) {
  const view = read(page + '.wxml')
  const config = JSON.parse(read(page + '.json'))
  assert.match(view, /<report-date-filter\b/, `${page} must use the common report date selector`)
  assert.equal(config.usingComponents['report-date-filter'], '/components/report-date-filter/report-date-filter',
    `${page} must register the common report date selector`)
}

for (const page of [
  'subPackage/pages/management/purchaseManagement/index/index',
  'subPackage/pages/management/dispatchPerformance/dispatchPerformance'
]) {
  const view = read(page + '.wxml')
  assert.doesNotMatch(view, /近7天|近30天|mode="date"/, `${page} must not expose legacy quick date tabs or paired date pickers`)
}

assert.doesNotMatch(read('subPackage-charts/pages/smartReplenishment/index/index.wxml'),
  /date-mode-tabs|data-mode="NEXT_7"/,
  'smart replenishment must use the same compact date selector instead of visible quick date tabs')

for (const page of [
  'subPackage/pages/management/dispatchPerformance/dispatchPerformance',
  'subPackage-purchase-management/pages/purchasePerformance/purchasePerformance',
  'subPackage-charts/pages/salesAnalysis/index/index',
  'subPackage-charts/pages/afterSales/index/index',
  'subPackage-charts/pages/customer/customerGoodsPrice/customerGoodsPrice'
]) {
  assert.match(read(page + '.js'), /本月/, `${page} must default report dates to the current month`)
}

const datePage = read('subPackage-charts/pages/sel/date/date.js')
assert.match(datePage, /onReportDateSelected/)
assert.match(datePage, /hanzi:\s*hanzi/)
assert.match(read('utils/purchaseManagementOverviewPage.js'), /dateLabel:\s*'本月'/,
  'purchase overview must default report dates to the current month')

console.log('report date selector contract: PASS')

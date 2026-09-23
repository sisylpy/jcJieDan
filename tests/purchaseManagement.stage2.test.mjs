import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = path => fs.readFileSync(path, 'utf8')
const app = JSON.parse(read('app.json'))
const pages = app.subPackages.find(item => item.root === 'subPackage/').pages
const required = [
  'pages/management/purchaseManagement/index/index',
  'pages/management/purchaseManagement/purchaseAmountDetail/purchaseAmountDetail',
  'pages/management/purchaseManagement/purchaserList/purchaserList',
  'pages/management/purchaseManagement/purchaserDetail/purchaserDetail',
  'pages/management/purchaseManagement/supplierList/supplierList',
  'pages/management/purchaseManagement/supplierDetail/supplierDetail',
  'pages/management/purchaseManagement/purchaseBatchList/purchaseBatchList',
  'pages/management/purchaseManagement/purchaseBatchDetail/purchaseBatchDetail',
  'pages/management/purchaseManagement/purchaseExceptionList/purchaseExceptionList'
]
required.forEach(page => assert.ok(pages.includes(page), `missing page registration: ${page}`))

const api = read('lib/apiDistributer.js')
assert.match(api, /purchaseManagementRequest\('overview'/)
assert.match(api, /purchaseManagementRequest\('purchase-amount-records'/)
assert.match(api, /purchaseManagementRequest\('purchasers'/)
assert.match(api, /purchaseManagementRequest\('suppliers'/)
assert.match(api, /purchaseManagementRequest\('batches'/)
assert.match(api, /purchaseManagementRequest\('exceptions'/)
for (const legacy of ['disGetPurchaseDetailType', 'getPurUserDate', 'disUserGetPurchaserDateBill']) {
  const stage2 = required.map(page => read(`subPackage/${page}.js`)).join('\n')
  assert.ok(!stage2.includes(legacy), `new management pages must not use ${legacy}`)
}

const allJs = required.map(page => read(`subPackage/${page}.js`)).join('\n')
assert.ok(!/lossRate\s*=|margin\s*=|actualNetPurchaseAmount\s*=/.test(allJs),
  'Boss pages must render server ViewModels instead of calculating business metrics')

const managementIndexJs = read('subPackage/pages/management/purchaseManagement/index/index.js')
assert.match(managementIndexJs, /onLoad\(\)\s*\{[\s\S]*?this\.setData\([\s\S]*?\)\s*\},\s*onShow\(\)\s*\{\s*this\.load\(\)\s*\}/,
  'overview must load from onShow so returning to the page refreshes its data')
assert.doesNotMatch(managementIndexJs, /onLoad\(\)[^\n]*this\.load\(/,
  'overview must not also load from onLoad and issue two initial requests')

const overviewWxml = read('subPackage/pages/management/purchaseManagement/index/index.wxml')
const purchaserListWxml = read('subPackage/pages/management/purchaseManagement/purchaserList/purchaserList.wxml')
const purchaserDetailWxml = read('subPackage/pages/management/purchaseManagement/purchaserDetail/purchaserDetail.wxml')
const purchaserWxml = [overviewWxml, purchaserListWxml, purchaserDetailWxml]
for (const markup of purchaserWxml) {
  assert.doesNotMatch(markup, /==null\?'—':'¥'\}\}\{\{/,
    'null currency values must render as a single placeholder instead of —null')
  assert.doesNotMatch(markup, /¥\{\{[^}]*Amount\}\}/,
    'nullable amount values must not render as ¥null')
}
for (const markup of [purchaserListWxml, purchaserDetailWxml]) {
  assert.match(markup, /dataCoverageRateText\|\|'—'/,
    'coverage must use the formatted value supplied by the server')
}
assert.match(overviewWxml, /本期采购金额/)
assert.match(overviewWxml, /查看采购明细/)
assert.match(overviewWxml, /按采购需求日期归期/)
assert.match(overviewWxml, /历史账单/)
assert.doesNotMatch(overviewWxml, /期间金额|实际收货|实际净采购/,
  'overview must not keep the misleading period amount grid')
assert.match(overviewWxml, /\{\{item\.batchCount\}\} 批次 · \{\{item\.goodsLineCount\}\} 商品行/,
  'procurement-mode structure must expose batchless goods lines as well as real batch counts')
assert.match(overviewWxml, /当前实现毛利 \/ 率[\s\S]*?period\.currentRealizedMarginRateText\|\|'—'/,
  'overview must render the server-formatted current margin percentage')
assert.match(overviewWxml, /完结最终毛利 \/ 率[\s\S]*?period\.completedFinalMarginRateText\|\|'—'/,
  'overview must render the server-formatted completed margin percentage')
assert.doesNotMatch(overviewWxml, /period\.(?:currentRealizedMarginRate|completedFinalMarginRate)(?!Text)/,
  'overview must not render or format raw decimal margin rates')
assert.match(purchaserListWxml, /wx:if="\{\{item\.totalBatchCount\|\|item\.directSelfBuyRecordCount\}\}"/,
  'purchaser cards must remain non-empty for batchless self-buy records')
assert.match(purchaserListWxml, /直接采购 \{\{item\.directSelfBuyRecordCount\}\} 条（待采购 \{\{item\.directSelfBuyPendingCount\|\|0\}\} 条 · 已采购 \{\{item\.directSelfBuyPurchaseCount\|\|0\}\} 条 · 已入库 \{\{item\.directSelfBuyStockInCount\|\|0\}\} 条）/)
assert.match(purchaserListWxml, /wx:if="\{\{item\.totalBatchCount\}\}">\{\{item\.dataCompletenessText\}\}/,
  'batch completeness must not be shown as history-incomplete for a direct-only purchaser')
assert.match(purchaserListWxml, /wx:else[^>]*>当前范围暂无采购记录/)
assert.match(purchaserDetailWxml, /wx:if="\{\{detail\.summary\.totalBatchCount\|\|detail\.summary\.directSelfBuyRecordCount\}\}"/,
  'purchaser detail must remain non-empty for batchless self-buy records')
assert.match(purchaserDetailWxml, /直接采购 \{\{detail\.summary\.directSelfBuyRecordCount\}\} 条（待采购 \{\{detail\.summary\.directSelfBuyPendingCount\|\|0\}\} 条 · 已采购 \{\{detail\.summary\.directSelfBuyPurchaseCount\|\|0\}\} 条 · 已入库 \{\{detail\.summary\.directSelfBuyStockInCount\|\|0\}\} 条）/)
assert.match(purchaserDetailWxml, /wx:if="\{\{detail\.summary\.totalBatchCount\}\}">\{\{detail\.summary\.dataCompletenessText\}\}/,
  'batch completeness must be hidden when purchaser detail only has direct self-buy records')
assert.match(purchaserDetailWxml, /wx:else[^>]*>\{\{detail\.accountStatusText\}\} · 当前范围暂无采购记录/)

assert.match(read('subPackage/pages/management/homePage/homePage.wxml'), /采购管理/)
const batchDetailJs = read('subPackage/pages/management/purchaseManagement/purchaseBatchDetail/purchaseBatchDetail.js')
const batchDetail = read('subPackage/pages/management/purchaseManagement/purchaseBatchDetail/purchaseBatchDetail.wxml')
assert.match(batchDetail, /为客户订单采购/)
assert.match(batchDetail, /用于库存备货/)
assert.match(batchDetail, /供货单价/)
assert.match(batchDetail, /供货小计/)
assert.match(batchDetail, /订单来源/)
assert.match(batchDetail, /关联库存记录/)
assert.match(batchDetail, /客户订单订货不经过配送商采购收货和入库/)
assert.doesNotMatch(batchDetail, /确认收货|部分收货|拒收|待入库/)
assert.match(batchDetailJs, /pkgPurchase\/pages\/txs\/disOrderBatch\/disOrderBatch/)
assert.match(batchDetailJs, /fromBuyer=1&fromBoss=1/)
assert.match(batchDetailJs, /buyerConfirmationRequired/)
assert.match(read('subPackage/pages/management/purchaseManagement/purchaseExceptionList/purchaseExceptionList.wxml'), /采购待办与异常/)
const batchList = read('subPackage/pages/management/purchaseManagement/purchaseBatchList/purchaseBatchList.wxml')
const batchListJs = read('subPackage/pages/management/purchaseManagement/purchaseBatchList/purchaseBatchList.js')
for (const filter of ['客户订单订货', '库存备货', '用途待核对', '全部供应方', '最近采购', '供货金额']) {
  assert.ok((batchList + batchListJs).includes(filter), `missing batch filter: ${filter}`)
}
assert.doesNotMatch(batchList, /收货状态|入库状态|退货状态|有损耗|毛利/)
assert.match(batchListJs, /purchasePurpose:/)
assert.match(batchListJs, /supplierId: this\.data\.supplierRelationId/)
assert.match(batchListJs, /supplierOptions:\s*\[\{ supplierRelationId: '', supplierName: '全部供应方' \}\]/)
assert.doesNotMatch(batchListJs, /getPurchaseManagementSuppliers|getPurchaseManagementPurchasers/)
assert.match(batchListJs, /restoreScrollTop/)
assert.match(allJs, /pageSize:\s*20/)

// Stage5 direct-purchase record contracts on the purchaser detail page.
assert.match(api, /purchaseManagementRequest\('purchasers\/' \+ id \+ '\/direct-purchases'/,
  'detail page must read batchless direct purchases from their own endpoint, never as fake batches')
assert.match(read('subPackage/pages/management/purchaseManagement/purchaserDetail/purchaserDetail.js'),
  /import \{ getPurchaseManagementPurchaser, getPurchaseManagementPurchaserBatches, getPurchaseManagementPurchaserDirectPurchases \} /,
  'detail page must import the direct-purchase reader')
assert.match(purchaserDetailWxml, /直接采购记录（\{\{directTotal\}\}）/,
  'detail must split direct-purchase records into their own section')
assert.match(purchaserDetailWxml, /订货批次（\{\{total\}\}）/,
  'real order batches keep their own section header')
assert.match(purchaserDetailWxml, /showDirect && !listEmpty/,
  'direct-purchase section must respect execution-mode filtering')
for (const field of ['recordKindText', 'purchaseStatusText', 'quantityText', 'priceText', 'subtotalText', 'shelfText', 'specText', 'timeText']) {
  assert.match(purchaserDetailWxml, new RegExp('item\\.' + field), `detail card must render direct record field ${field}`)
}
assert.doesNotMatch(purchaserDetailWxml, /当前筛选暂无批次/,
  'the batch-empty message must not act as the whole-page empty state anymore')
assert.match(purchaserDetailWxml, /当前筛选暂无采购记录/,
  'whole-page empty state is only allowed when no record exists under the current filter')
console.log('purchase management stage2 contracts passed')

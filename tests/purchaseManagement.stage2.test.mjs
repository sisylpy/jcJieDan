import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = path => fs.readFileSync(path, 'utf8')
const app = JSON.parse(read('app.json'))
const pages = app.subPackages.find(item => item.root === 'subPackage/').pages
const required = [
  'pages/management/purchaseManagement/index/index',
  'pages/management/purchaseManagement/pendingStockInList/pendingStockInList',
  'pages/management/purchaseManagement/purchaseAmountDetail/purchaseAmountDetail',
  'pages/management/purchaseManagement/purchaserList/purchaserList',
  'pages/management/purchaseManagement/purchaserDetail/purchaserDetail',
  'pages/management/purchaseManagement/purchaseCollaboration/purchaseCollaboration',
  'pages/management/purchaseManagement/supplierList/supplierList',
  'pages/management/purchaseManagement/supplierDetail/supplierDetail',
  'pages/management/purchaseManagement/purchaseBatchList/purchaseBatchList',
  'pages/management/purchaseManagement/purchaseBatchDetail/purchaseBatchDetail'
]
required.forEach(page => assert.ok(pages.includes(page), `missing page registration: ${page}`))
const qualityPackage = app.subPackages.find(item => item.root === 'subPackage-purchase-management/')
assert.ok(qualityPackage && qualityPackage.pages.includes('pages/purchasePerformance/purchasePerformance'),
  'the standalone inventory business page must live in its own package so the legacy subpackage remains below 2MB')
assert.ok(!pages.includes('pages/management/purchaseManagement/purchaseExceptionList/purchaseExceptionList'),
  'the old standalone exception page must be removed after navigation replacement')

const api = read('lib/apiDistributer.js')
assert.match(api, /purchaseManagementRequest\('overview'/)
assert.match(api, /purchaseManagementRequest\('pending-stock-ins'/)
assert.match(api, /purchaseManagementRequest\('purchase-amount-records'/)
assert.match(api, /purchaseManagementRequest\('purchasers'/)
assert.match(api, /purchaseManagementRequest\('purchasers\/' \+ id \+ '\/tasks'/)
assert.match(api, /purchaseManagementRequest\('purchasers\/' \+ id \+ '\/purchased-goods'/)
assert.match(api, /purchaseManagementRequest\('suppliers'/)
assert.match(api, /purchaseManagementRequest\('batches'/)
assert.match(api, /purchaseManagementRequest\('exceptions'/)
assert.match(api, /assignSupplierPurchaseOwner/)
assert.match(api, /purchase\/supplier-ownership\/relations/)
for (const legacy of ['disGetPurchaseDetailType', 'getPurUserDate', 'disUserGetPurchaserDateBill']) {
  const stage2 = required.map(page => read(`subPackage/${page}.js`)).join('\n')
  assert.ok(!stage2.includes(legacy), `new management pages must not use ${legacy}`)
}

const purchaserListLogic = read('utils/purchaseManagementPurchaserListPage.js')
const purchaserDetailLogic = read('utils/purchaseManagementPurchaserDetailPage.js')
const overviewLogic = read('utils/purchaseManagementOverviewPage.js')
assert.match(read('subPackage/pages/management/purchaseManagement/purchaserList/purchaserList.js'),
  /createPurchaserListPage/,
  'subpackage keeps only the purchaser list entry while page logic lives in the main package')
const allJs = required.map(page => read(`subPackage/${page}.js`)).join('\n') +
  '\n' + overviewLogic + '\n' + purchaserListLogic + '\n' + purchaserDetailLogic
assert.ok(!/lossRate\s*=|margin\s*=|actualNetPurchaseAmount\s*=/.test(allJs),
  'Boss pages must render server ViewModels instead of calculating business metrics')

const managementIndexEntryJs = read('subPackage/pages/management/purchaseManagement/index/index.js')
const managementIndexJs = managementIndexEntryJs + '\n' + overviewLogic
assert.match(managementIndexEntryJs, /createPurchaseManagementOverviewPage/,
  'subpackage keeps only the purchase overview entry while page logic lives in the main package')
assert.match(managementIndexJs, /onLoad\(\)\s*\{[\s\S]*?this\.setData\([\s\S]*?\)\s*\},\s*onShow\(\)\s*\{\s*this\.load\(\);\s*this\.loadPending\(\)\s*\}/,
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
assert.match(overviewWxml, /本期采购金额/)
assert.match(overviewWxml, /待接收入库/)
assert.match(overviewWxml, /tasks\.waitingStockInGoodsLines/)
assert.match(overviewWxml, /waitingStockInAmountText/)
assert.match(overviewWxml, /waitingStockInUnresolvedAmountCount/)
assert.match(overviewWxml, /openPendingStockIns/)
assert.match(overviewWxml, /协作待出货/)
assert.match(overviewWxml, /tasks\.collaborationPendingOrderLines/)
assert.match(overviewWxml, /openCollaborationPending/)
assert.match(managementIndexJs, /openCollaborationPending\(\)[\s\S]*?\/pages\/doing\/index\/index/,
  'collaboration task must drill into the live unshipped collaboration workspace')
assert.match(managementIndexJs, /getPurchaseManagementExceptions/)
assert.match(managementIndexJs, /assignSupplierPurchaseOwner/)
for (const section of ['当前可处理', '等待其他角色', '阻断与核查', '历史只读提示']) {
  assert.ok((managementIndexJs + overviewWxml).includes(section), `purchase overview missing pending section: ${section}`)
}
assert.match(overviewWxml, /查看采购明细/)
assert.match(overviewWxml, /按采购需求日期归期/)
assert.match(overviewWxml, /历史账单/)
assert.doesNotMatch(overviewWxml, /期间金额|实际收货|实际净采购/,
  'overview must not keep the misleading period amount grid')
assert.match(overviewWxml, /\{\{item\.batchCount\}\} 批次 · \{\{item\.goodsLineCount\}\} 商品行/,
  'procurement-mode structure must expose batchless goods lines as well as real batch counts')
assert.doesNotMatch(overviewWxml, />经营结果</,
  'overview must not keep a second inventory-economics formula block')
assert.doesNotMatch(overviewWxml, /管理入口|采购质量与经营|采购员管理|供应方管理/,
  'purchase overview must not duplicate management-console entries')
assert.match(overviewWxml, /title="采购总览"/)
assert.match(overviewWxml, /report-date-filter/)
assert.doesNotMatch(overviewWxml, /period\.(?:currentRealizedMarginRate|completedFinalMarginRate)(?!Text)/,
  'overview must not render or format raw decimal margin rates')
assert.match(purchaserListWxml, /当前 \{\{item\.currentTaskCount\}\} 项任务/)
assert.match(purchaserListWxml, /待本人处理 \{\{item\.actionRequiredTaskCount\}\}/)
assert.match(purchaserListWxml, /等待供应商 \{\{item\.waitingSupplierTaskCount\}\}/)
assert.match(purchaserListWxml, /本期采购记录/)
assert.match(purchaserListWxml, /本期采购金额/)
assert.match(purchaserListWxml, /所选日期内暂无采购记录/)
assert.match(purchaserListWxml, /没有符合条件的采购员/)
assert.doesNotMatch(purchaserListWxml, /损耗率|毛利|拒收率|实际净采购/)
assert.match(purchaserDetailWxml, /class="detail-topbar"[\s\S]*start-date="\{\{startDate\}\}"[\s\S]*stop-date="\{\{stopDate\}\}"/,
  'purchaser detail date range must stay in the top toolbar instead of being repeated in record content')
assert.match(purchaserDetailWxml, /采购完成商品/)
assert.match(purchaserDetailWxml, /goods-category-tree/)
assert.doesNotMatch(purchaserDetailWxml, /当前任务|当前处理：|查看采购批次/,
  'purchaser detail must not duplicate the overview purchase-batch tasks')
assert.doesNotMatch(purchaserDetailWxml, /确认收货|损耗率|毛利/)

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
assert.match(batchDetailJs, /purchasePurpose !== 'CUSTOMER_ORDER'/)
assert.match(batchDetailJs, /demandScope=SHELF_REPLENISHMENT/)
assert.match(batchDetailJs, /inventoryReceiptRequired/)
assert.match(batchDetail, /前往精彩订货库存备货接收/)
const qualityJs = read('subPackage-purchase-management/pages/purchasePerformance/purchasePerformance.js')
const qualityWxml = read('subPackage-purchase-management/pages/purchasePerformance/purchasePerformance.wxml')
assert.doesNotMatch(qualityWxml, />待处理</)
assert.match(qualityWxml, /title="采购经营分析"/)
assert.match(qualityWxml, /report-date-filter/)
assert.match(qualityWxml, /内部协作订单|订单利润来源/)
assert.match(qualityWxml, /已识别采购额/)
assert.match(qualityWxml, /期间库存损耗/)
assert.match(qualityWxml, /商品经营明细/)
assert.match(qualityWxml, /category-rail/)
assert.match(qualityWxml, /product-card/)
assert.match(qualityWxml, /订单毛利/)
assert.match(qualityWxml, /经营结果/)
assert.match(qualityWxml, /待核算数据未按 0 计入/)
assert.doesNotMatch(qualityWxml, /库存经营概况|按入库日期筛选库存批次/)
assert.match(qualityJs, /getPurchasePerformance/)
assert.match(qualityJs, /data\.products/)
assert.match(qualityJs, /categoryOptions/)
assert.match(qualityJs, /selectCategory/)
assert.doesNotMatch(qualityJs, /getInventoryPurchasePerformance/)
assert.doesNotMatch(qualityJs, /getPurchaseManagementExceptions|assignSupplierPurchaseOwner|pendingError/)
assert.match(qualityJs, /dateLabel:\s*'本月'/)
const pendingStockInJs = read('subPackage/pages/management/purchaseManagement/pendingStockInList/pendingStockInList.js')
const pendingStockInWxml = read('subPackage/pages/management/purchaseManagement/pendingStockInList/pendingStockInList.wxml')
const pendingStockInJson = read('subPackage/pages/management/purchaseManagement/pendingStockInList/pendingStockInList.json')
assert.match(pendingStockInJs, /getPurchaseManagementPendingStockIns/)
assert.match(pendingStockInJs, /groupByPurchaser/)
assert.match(pendingStockInJs, /saveShelfGoodsStock/)
assert.match(pendingStockInJs, /findOnShelf/)
assert.match(pendingStockInJs, /findOffShelf/)
assert.doesNotMatch(pendingStockInJs, /subPackage\/pages\/shelf\/index\/index\?from=pendingStockIn/)
assert.match(pendingStockInWxml, /采购完成，按采购员接收入库/)
assert.match(pendingStockInWxml, /purchaserGroups/)
assert.match(pendingStockInWxml, /group\.items/)
assert.match(pendingStockInWxml, /item\.goodsName/)
assert.match(pendingStockInWxml, /item\.amountText/)
assert.match(pendingStockInWxml, /openReceipt/)
assert.match(pendingStockInWxml, /input-pur-stock/)
assert.match(pendingStockInJson, /inputPurStock/)
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

// Stage5 keeps the legacy direct-purchase endpoint but purchaser detail now consumes
// one completed-goods read model instead of mixing task batches with goods records.
assert.match(api, /purchaseManagementRequest\('purchasers\/' \+ id \+ '\/direct-purchases'/,
  'batchless direct purchases keep their source-owned endpoint')
const purchaserDetailEntryJs = read('subPackage/pages/management/purchaseManagement/purchaserDetail/purchaserDetail.js')
const purchaserDetailJs = purchaserDetailEntryJs + '\n' + purchaserDetailLogic
assert.match(purchaserDetailEntryJs, /createPurchaserDetailPage/,
  'subpackage keeps only the purchaser detail entry while page logic lives in the main package')
assert.match(purchaserDetailJs, /getPurchaseManagementPurchaserPurchasedGoods/,
  'detail page must load completed goods at goods-line granularity')
assert.doesNotMatch(purchaserDetailJs, /getPurchaseManagementPurchaserTasks|getPurchaseManagementPurchaserBatches|getPurchaseManagementPurchaserDirectPurchases/)
assert.match(purchaserDetailWxml, /goodsCategories/,
  'completed goods must use the shared left category tree')
assert.match(purchaserDetailWxml, /goodsSourceOptions/)
assert.match(purchaserDetailWxml, /goodsSortOptions/)
for (const field of ['imageUrl', 'title', 'sourceText', 'completionText', 'quantityPriceText', 'amountText']) {
  assert.match(purchaserDetailWxml, new RegExp('item\\.' + field), `completed-goods card must render ${field}`)
}
assert.doesNotMatch(purchaserDetailJs, /pkgPurchase\/pages\/|navigateToMiniProgram/)
assert.match(purchaserDetailWxml, /所选日期内暂无采购完成商品/)
console.log('purchase management stage2 contracts passed')

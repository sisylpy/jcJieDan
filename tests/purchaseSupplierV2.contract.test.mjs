import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = path => fs.readFileSync(path, 'utf8')
const api = read('lib/apiDistributer.js')
const listJs = read('subPackage/pages/management/purchaseManagement/supplierList/supplierList.js')
const listWxml = read('subPackage/pages/management/purchaseManagement/supplierList/supplierList.wxml')
const detailJs = read('subPackage/pages/management/purchaseManagement/supplierDetail/supplierDetail.js')
const detailWxml = read('subPackage/pages/management/purchaseManagement/supplierDetail/supplierDetail.wxml')

for (const path of [
  "purchaseSupplierV2Request('', data)",
  "purchaseSupplierV2Request('/' + id, data)",
  "purchaseSupplierV2Request('/' + id + '/facts', data)",
  "purchaseSupplierV2Request('/' + id + '/goods', data)"
]) {
  assert.ok(api.includes(path), `missing V2 supplier API contract: ${path}`)
}
assert.match(api, /inventoryBatchRequest\('purchase-management\/v2\/suppliers'/)
assert.match(api, /syncPurchaseSupplierV2 = data => purchaseSupplierV2Request\('\/sync', data, 'POST'\)/)
assert.doesNotMatch(api, /inventoryBatchRequest\('api\/purchase-management\/v2\/suppliers'/,
  'ownerRequest adds the owner API prefix and must not receive a duplicate api segment')
assert.doesNotMatch(api, /getPurchaseManagementSupplier =/,
  'switched supplier detail must not keep a V1 fallback wrapper')
assert.doesNotMatch(api, /getPurchaseManagementSupplierBatches =/,
  'unified facts must not be mixed with V1 supplier batches')
assert.match(api, /getPurchaseManagementSuppliers =/,
  'the shared V1 supplier filter remains for the out-of-scope purchase-batch page')

assert.match(listJs, /getPurchaseSupplierV2List/)
assert.match(listJs, /syncPurchaseSupplierV2/)
assert.match(listJs, /syncAndLoad/)
assert.match(detailJs, /getPurchaseSupplierV2Detail/)
assert.match(detailJs, /getPurchaseSupplierV2Facts/)
assert.match(detailJs, /getPurchaseSupplierV2Goods/)
for (const source of [listJs, detailJs]) {
  assert.doesNotMatch(source, /getPurchaseManagementSupplier(?:Batches)?/)
  assert.doesNotMatch(source, /supplierRelationId/)
}

for (const source of [listJs, detailJs]) {
  assert.doesNotMatch(source, /actualNetPurchase|lossRate|profit|paidAmount|settlement/,
    'phase one must not bind finance, loss or profit metrics')
}
assert.match(listWxml, /内部协作配送商/)
assert.match(listWxml, /外部供应商/)
assert.match(listWxml, /采购金额/)
assert.match(listWxml, /查看采购记录/)
assert.match(listWxml, /数据说明/)
assert.match(listWxml, /采购单数.*不等于已完成采购/s)
assert.match(listWxml, /商品记录数.*不是商品种类/s)
assert.match(listWxml, /bindtap="retry"/)
assert.match(detailWxml, /activeTab==='records'/)
assert.match(detailWxml, /采购记录/)
assert.match(detailWxml, /商品汇总/)
assert.match(detailWxml, /item\.orderedQuantityText/)
assert.match(detailWxml, /item\.actualQuantityText/)
assert.match(detailWxml, /item\.unitPriceText/)
assert.match(detailWxml, /item\.grossAmountText/)
assert.match(detailWxml, />小计</)
assert.match(detailWxml, /订单来源/)
assert.match(detailWxml, /主订单号/)
assert.match(detailWxml, /协作订单号/)
assert.match(detailWxml, /采购批次编号/)
assert.match(detailWxml, /商品记录编号/)
assert.doesNotMatch(detailWxml, /DPG_FINAL|FULFILLED|projectedAt|sourceStatus/,
  'technical projection codes must stay out of the page')
assert.match(detailJs, /offerNxDistributerList\/offerNxDistributerList/)
assert.match(detailJs, /subPackage-supplier\/pages\/supplier\/index\/index/)
assert.match(detailJs, /value == null \|\| value === ''/,
  'null money must stay unknown rather than becoming zero')
assert.match(listJs, /supplierType.*startDate.*stopDate.*sort/s,
  'list must forward identity, period and sort to the V2 contract')
assert.match(listJs, /options\.startDate \|\| ''/)
assert.match(listJs, /options\.stopDate \|\| ''/)
assert.doesNotMatch(listJs, /thisMonth|getFirstDateInMonth|本月/,
  'supplier page must inherit the selected period instead of resetting to this month')
assert.match(listJs, /_savedScrollTop/)
assert.match(listJs, /采购数据加载失败/)
assert.match(listJs, /items: \[\], total: 0, hasMore: false/,
  'a failed reset query must not leave results from the previous date range on screen')
assert.match(listWxml, /!syncing&&!loading&&!items\.length&&!error/,
  'initial projection refresh must not flash a false empty state')
assert.match(listJs, /本期暂无采购记录/)
assert.match(listJs, /金额均待核对/)
assert.match(listJs, /未计入上述金额/)
assert.match(detailJs, /activeTab: 'records'/)
assert.doesNotMatch(detailWxml, /确认收货|入库|付款操作|结算操作/,
  'supplier detail must stay read-only in this phase')

console.log('purchase supplier V2 contracts passed')

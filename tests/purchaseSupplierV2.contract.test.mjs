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

for (const source of [listJs, listWxml, detailJs, detailWxml]) {
  assert.doesNotMatch(source, /实际净采购|损耗率|毛利|已付款|待结算/,
    'phase one must not invent finance, loss or profit metrics')
}
assert.match(listWxml, /内部协作配送商/)
assert.match(listWxml, /外部供应商/)
assert.match(listWxml, /已识别采购金额/)
assert.match(listWxml, /采购供应方查询/)
assert.match(listWxml, /日期只筛选采购记录，不隐藏已经建立的供应方/)
assert.match(listWxml, /bindtap="retry"/)
assert.match(detailWxml, /真实采购记录/)
assert.match(detailWxml, /item\.quantityText/)
assert.match(detailWxml, /item\.unitPriceText/)
assert.match(detailWxml, /item\.grossAmountText/)
assert.match(detailJs, /offerNxDistributerList\/offerNxDistributerList/)
assert.match(detailJs, /subPackage-supplier\/pages\/supplier\/index\/index/)
assert.match(detailJs, /value == null \? '—' : '¥' \+ value/,
  'null money must stay unknown rather than becoming zero')
assert.match(detailJs, /主订单.*协作订单/,
  'internal facts must expose the exact collaboration link identities')
assert.match(listJs, /supplierType.*startDate.*stopDate.*sort/s,
  'list must forward identity, period and sort to the V2 contract')

console.log('purchase supplier V2 contracts passed')

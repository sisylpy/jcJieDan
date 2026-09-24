import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = path => fs.readFileSync(path, 'utf8')
const presenterSource = read('utils/purchaseAmountPresenter.js')
const presenterUrl = 'data:text/javascript;base64,' + Buffer.from(presenterSource).toString('base64')
const { formatPurchaseMoney, normalizePurchaseAmount, normalizePurchaseRecord } = await import(presenterUrl)

assert.equal(formatPurchaseMoney(null), '—')
assert.equal(formatPurchaseMoney(0), '¥0.00', '真实0元不能显示为未知')

const zero = normalizePurchaseAmount({
  amountState: 'AVAILABLE',
  recognizedAmount: 0,
  includedRecordCount: 1,
  unresolvedAmountCount: 0,
  conflictRecordCount: 0,
  undatedRecordCount: 0,
  historicalBillUnresolvedCount: 0,
  historicalDateFallbackCount: 0,
  pendingDemandCount: 0,
  groups: [{
    sourceType: 'SELF_PURCHASE', sourceTypeText: '自采', recognizedAmount: 0,
    includedRecordCount: 1, unresolvedAmountCount: 0, conflictRecordCount: 0
  }]
})
assert.equal(zero.amountText, '¥0.00')
assert.equal(zero.groups[0].recognizedAmountText, '¥0.00')
assert.equal(zero.contractValid, true)

const reconciled = normalizePurchaseAmount({
  amountState: 'PARTIAL_DATA_ISSUES',
  recognizedAmount: 1123.45,
  includedRecordCount: 17,
  unresolvedAmountCount: 3,
  conflictRecordCount: 1,
  undatedRecordCount: 1,
  historicalBillUnresolvedCount: 1,
  historicalBillUnresolvedAmount: 220,
  historicalDateFallbackCount: 6,
  historicalDateFallbackAmount: 27.5,
  pendingDemandCount: 4,
  groups: [
    {
      sourceType: 'SELF_PURCHASE', sourceTypeText: '自采', recognizedAmount: 882.5,
      includedRecordCount: 13, unresolvedAmountCount: 0, conflictRecordCount: 0
    },
    {
      sourceType: 'EXTERNAL_DPB', sourceTypeText: '外部供应', recognizedAmount: 213.95,
      includedRecordCount: 3, unresolvedAmountCount: 1, conflictRecordCount: 1
    },
    {
      sourceType: 'INTERNAL_COLLABORATION', sourceTypeText: '内部协作', recognizedAmount: 27,
      includedRecordCount: 1, unresolvedAmountCount: 2, conflictRecordCount: 0
    }
  ]
})
assert.equal(reconciled.amountText, '¥1123.45')
assert.equal(reconciled.includedRecordCount, 17)
assert.deepEqual(reconciled.groups.map(group => group.sourceType), [
  'INTERNAL_COLLABORATION', 'EXTERNAL_DPB', 'SELF_PURCHASE'
])
assert.deepEqual(reconciled.groups.map(group => group.recognizedAmountText), [
  '¥27.00', '¥213.95', '¥882.50'
])
assert.equal(reconciled.historicalDateFallbackCount, 6)
assert.equal(reconciled.historicalDateFallbackAmountText, '¥27.50')
assert.equal(reconciled.unresolvedAmountCount, 3)
assert.equal(reconciled.conflictRecordCount, 1)
assert.equal(reconciled.undatedRecordCount, 1)
assert.equal(reconciled.historicalBillUnresolvedCount, 1)
assert.equal(reconciled.historicalBillIssueAmountText, '¥220.00')
assert.equal(reconciled.pendingDemandCount, 4)

const unknown = normalizePurchaseAmount({
  amountState: 'ALL_AMOUNT_UNRESOLVED',
  recognizedAmount: null,
  includedRecordCount: 0,
  unresolvedAmountCount: 2,
  conflictRecordCount: 0,
  undatedRecordCount: 0,
  historicalBillUnresolvedCount: 0,
  historicalDateFallbackCount: 0,
  pendingDemandCount: 4,
  groups: []
})
assert.equal(unknown.amountText, '待形成')
assert.equal(unknown.unresolvedAmountCount, 2)
assert.equal(unknown.pendingDemandCount, 4, '未完成需求必须与金额未形成分开')

const billOnly = normalizePurchaseAmount({
  amountState: 'NO_RECORDS',
  recognizedAmount: null,
  includedRecordCount: 0,
  unresolvedAmountCount: 0,
  conflictRecordCount: 0,
  undatedRecordCount: 0,
  historicalBillUnresolvedCount: 1,
  historicalBillUnresolvedAmount: 220,
  historicalDateFallbackCount: 0,
  pendingDemandCount: 0,
  groups: []
})
assert.equal(billOnly.amountState, 'NO_RECORD')
assert.equal(billOnly.amountText, '—')
assert.equal(billOnly.hasAnyRecord, false, '历史账单问题不能伪装成采购记录')
assert.equal(billOnly.historicalBillIssueAmountText, '¥220.00')

const conflictOnly = normalizePurchaseAmount({
  amountState: 'ALL_SOURCE_CONFLICT',
  recognizedAmount: null,
  includedRecordCount: 0,
  unresolvedAmountCount: 0,
  conflictRecordCount: 1,
  undatedRecordCount: 1,
  historicalBillUnresolvedCount: 0,
  historicalDateFallbackCount: 0,
  pendingDemandCount: 0,
  groups: [{
    sourceType: 'EXTERNAL_DPB', sourceTypeText: '外部供应', recognizedAmount: null,
    includedRecordCount: 0, unresolvedAmountCount: 0, conflictRecordCount: 1
  }]
})
assert.equal(conflictOnly.hasAnyRecord, true)
assert.equal(conflictOnly.amountText, '—')
assert.equal(conflictOnly.groups[0].recognizedAmountText, '待核对')
assert.match(conflictOnly.stateText, /没有可计入金额/)

const line = normalizePurchaseRecord({
  recordKey: 'SELF_PURCHASE:42',
  sourceType: 'SELF_PURCHASE',
  sourceTypeText: '自采',
  sourceLineId: 42,
  supplierName: null,
  businessDate: '2026-09-19',
  dateBasis: 'LEGACY_ORDER_APPLY_DATE',
  dateBasisText: '按采购需求日期归期',
  historicalDateFallback: true,
  goodsName: '测试商品',
  specification: '箱',
  orderedQuantity: 10,
  orderedUnit: '斤',
  actualQuantity: 1,
  actualUnit: '箱',
  actualQuantityMeaningText: '采购数量',
  unitPrice: 0,
  amount: 0,
  amountBasisText: '自采商品来源小计',
  amountStatus: 'RECOGNIZED',
  amountStatusText: '金额已识别',
  included: true,
  businessStatusText: '采购执行完成',
  purchasePurpose: 'INVENTORY_REPLENISHMENT',
  relatedCustomerOrderCount: 0
}, 0)
assert.equal(line._key, 'SELF_PURCHASE:42')
assert.equal(line.orderedQuantityText, '10斤')
assert.equal(line.sourceQuantityText, '1箱', '订购和来源数量必须使用各自单位')
assert.equal(line.unitPriceText, '¥0.00', '合同未提供单价单位时不得用数量单位猜测')
assert.equal(line.sourceSubtotalText, '¥0.00')
assert.equal(line.purposeText, '库存备货')
assert.equal(line.actionType, '', '自采不得生成假详情链接')

const missingKey = normalizePurchaseRecord({
  sourceType: 'EXTERNAL_DPB', sourceLineId: 91, externalBatchId: 7,
  amountStatus: 'UNRESOLVED', included: false
}, 0)
assert.equal(missingKey.contractValid, false, '缺少后端稳定recordKey必须暴露合同错误')
assert.equal(missingKey._key, undefined)
assert.equal(missingKey.actionType, 'BATCH')
assert.equal(missingKey.externalBatchId, 7)

const app = JSON.parse(read('app.json'))
const pages = app.subPackages.find(item => item.root === 'subPackage/').pages
assert.ok(pages.includes('pages/management/purchaseManagement/purchaseAmountDetail/purchaseAmountDetail'))

const api = read('lib/apiDistributer.js')
assert.match(api, /purchaseManagementRequest\('purchase-amount-records', data\)/)

const homeJs = read('subPackage/pages/management/purchaseManagement/index/index.js')
const homeWxml = read('subPackage/pages/management/purchaseManagement/index/index.wxml')
const detailJs = read('subPackage/pages/management/purchaseManagement/purchaseAmountDetail/purchaseAmountDetail.js')
const detailWxml = read('subPackage/pages/management/purchaseManagement/purchaseAmountDetail/purchaseAmountDetail.wxml')

assert.match(homeJs, /normalizePurchaseAmount\(data\.purchaseAmount\)/)
assert.match(homeJs, /catch\(error => this\.setData\(\{ error:/,
  '首页接口失败必须进入错误态')
assert.doesNotMatch(homeJs, /purchaseAmount\s*\|\|\s*period|actualReceiptAmount/,
  '首页不得使用旧金额字段回退')
assert.match(homeWxml, /本期采购金额/)
assert.match(homeWxml, /purchaseAmount\.hasAnyRecord/)
assert.match(homeWxml, /金额尚未形成/)
assert.match(homeWxml, /按采购需求日期归期/)
assert.match(homeWxml, /历史账单/)
assert.match(homeWxml, /来源信息冲突/)
assert.match(homeWxml, /没有可靠业务日期/)
assert.doesNotMatch(homeWxml, /期间金额|实际收货|实际净采购/)
assert.doesNotMatch(homeWxml, /actualReceiptAmount/,
  '结构分析不得继续显示已证明不可靠的混合收货金额')
assert.doesNotMatch(homeWxml, /1123\.45|213\.95|882\.50/,
  '对账快照不得写死在页面')

assert.match(detailJs, /amountStatus:\s*this\.data\.amountStatus/)
assert.match(detailJs, /sourceType:\s*this\.data\.sourceType/)
assert.match(detailJs, /item\.externalBatchId/)
assert.doesNotMatch(detailJs, /item\.batchId/)
assert.match(detailJs, /采购明细标识缺失/)
assert.match(detailJs, /if \(reset\) this\.setData\(\{ error:/,
  '明细首页请求失败必须进入错误态')
assert.match(detailWxml, /wx:elif="\{\{error\}\}"[\s\S]*采购明细加载失败/)
assert.match(detailWxml, /尚未完成采购的需求[\s\S]*不计为金额待形成/)
assert.match(detailWxml, /summary\.hasAnyRecord/)
assert.match(detailWxml, /不代表收货、入库、付款或净采购/)
assert.match(detailWxml, /item\.actionText/)

const detailPresenter = read('utils/purchaseAmountPresenter.js')
for (const legacyAlias of ['sourceSubtotal,', 'grossAmount', 'batchId,', 'supplierRefId', 'EXTERNAL_PURCHASE', 'DIRECT_SELF_BUY']) {
  assert.ok(!detailPresenter.includes(legacyAlias), 'new amount contract must not read legacy alias ' + legacyAlias)
}

const supplierDetailJs = read('subPackage/pages/management/purchaseManagement/supplierDetail/supplierDetail.js')
const supplierDetailWxml = read('subPackage/pages/management/purchaseManagement/supplierDetail/supplierDetail.wxml')
assert.match(supplierDetailJs, /detail\.supplierType === 'EXTERNAL_JRDH' && detail\.relationStatus === 'ACTIVE'/)
assert.match(supplierDetailJs, /this\.data\.detail\.supplierType === 'EXTERNAL_JRDH'[\s\S]*relationStatus !== 'ACTIVE'[\s\S]*历史外部供应方不可进入业务管理/)
assert.match(supplierDetailWxml, /wx:if="\{\{detail\.canManage\}\}"/)
const supplierHelpers = supplierDetailJs
  .slice(supplierDetailJs.indexOf('const TYPE_TEXT'), supplierDetailJs.indexOf('Page({'))
  .replace('function decorateDetail', 'export function decorateDetail')
const supplierHelpersUrl = 'data:text/javascript;base64,' + Buffer.from(supplierHelpers).toString('base64')
const { decorateDetail } = await import(supplierHelpersUrl)
assert.equal(decorateDetail({
  supplierType: 'EXTERNAL_JRDH', relationStatus: 'HISTORICAL', goodsLineCount: 1,
  recognizedAmountLineCount: 1, unresolvedAmountLineCount: 0, purchaseAmount: 1
}, '2026-09-01', '2026-09-30').canManage, false)
assert.equal(decorateDetail({
  supplierType: 'EXTERNAL_JRDH', relationStatus: 'ACTIVE', goodsLineCount: 1,
  recognizedAmountLineCount: 1, unresolvedAmountLineCount: 0, purchaseAmount: 1
}, '2026-09-01', '2026-09-30').canManage, true)

console.log('purchase amount presentation contracts passed')

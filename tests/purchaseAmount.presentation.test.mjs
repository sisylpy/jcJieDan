import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = path => fs.readFileSync(path, 'utf8')
const presenterSource = read('utils/purchaseAmountPresenter.js')
const presenterUrl = 'data:text/javascript;base64,' + Buffer.from(presenterSource).toString('base64')
const { formatPurchaseMoney, normalizePurchaseAmount } = await import(presenterUrl)

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

const app = JSON.parse(read('app.json'))
const pages = app.subPackages.find(item => item.root === 'subPackage/').pages
assert.ok(!pages.includes('pages/management/purchaseManagement/purchaseAmountDetail/purchaseAmountDetail'))

const api = read('lib/apiDistributer.js')
assert.doesNotMatch(api, /purchase-amount-records/)

const homeJs = read('subPackage/pages/management/purchaseManagement/index/index.js') + '\n' +
  read('utils/purchaseManagementOverviewPage.js')
const homeWxml = read('subPackage/pages/management/purchaseManagement/index/index.wxml')
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
assert.match(homeWxml, /查看采购经营分析/)
assert.doesNotMatch(homeWxml, /查看采购明细/)
assert.match(homeJs, /subPackage-purchase-management\/pages\/purchasePerformance\/purchasePerformance/)
assert.doesNotMatch(homeJs, /purchaseAmountDetail|openAmountRecords/)

const amountPresenter = read('utils/purchaseAmountPresenter.js')
for (const legacyAlias of ['sourceSubtotal,', 'grossAmount', 'batchId,', 'supplierRefId', 'EXTERNAL_PURCHASE', 'DIRECT_SELF_BUY']) {
  assert.ok(!amountPresenter.includes(legacyAlias), 'new amount contract must not read legacy alias ' + legacyAlias)
}
assert.doesNotMatch(amountPresenter, /normalizePurchaseRecord/)

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

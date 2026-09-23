import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

function loadPage(path, exports) {
  const source = fs.readFileSync(path, 'utf8')
    .replace(/import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]+['"]\s*/, '')
  const context = {
    getApp: () => ({ globalData: { navBarHeight: 88, rpxR: 1 } }),
    Page: value => { context.page = value },
    console
  }
  const expose = exports.map(name => `globalThis.__${name}=${name}`).join(';')
  vm.runInNewContext(source + '\n' + expose, context)
  return context
}

const list = loadPage(
  'subPackage/pages/management/purchaseManagement/supplierList/supplierList.js',
  ['decorate']
)

const base = {
  supplierType: 'INTERNAL_DISTRIBUTER',
  relationStatus: 'ACTIVE',
  purchaseCount: 1,
  goodsLineCount: 1,
  purchaseAmount: '27.00',
  recognizedAmountLineCount: 1,
  unresolvedAmountLineCount: 0,
  dataQualityStatus: 'COMPLETE'
}

const normal = list.__decorate(base)
assert.equal(normal.purchaseAmountText, '¥27.00')
assert.equal(normal.amountState, 'recognized')
assert.equal(normal.amountScopeText, '')
assert.equal(normal.qualityText, '')

const partial = list.__decorate({
  ...base,
  goodsLineCount: 2,
  unresolvedAmountLineCount: 1,
  dataQualityStatus: 'INCOMPLETE'
})
assert.equal(partial.amountState, 'partial')
assert.match(partial.amountScopeText, /另有 1 条.*未计入上述金额/)

const recognizedLegacy = list.__decorate({
  ...base,
  dataQualityStatus: 'LEGACY_FALLBACK'
})
assert.equal(recognizedLegacy.qualityText, '', 'recognized historical source must stay in trace details instead of a red list warning')

const unresolved = list.__decorate({
  ...base,
  purchaseAmount: null,
  recognizedAmountLineCount: 0,
  unresolvedAmountLineCount: 1,
  dataQualityStatus: 'INCOMPLETE'
})
assert.equal(unresolved.purchaseAmountText, '待核对')
assert.equal(unresolved.amountState, 'unresolved')
assert.match(unresolved.amountScopeText, /均待核对/)

const noRecord = list.__decorate({
  ...base,
  purchaseAmount: null,
  purchaseCount: 0,
  goodsLineCount: 0,
  recognizedAmountLineCount: 0,
  unresolvedAmountLineCount: 0,
  dataQualityStatus: 'NO_FACT'
})
assert.equal(noRecord.purchaseAmountText, '—')
assert.equal(noRecord.amountState, 'no-record')
assert.equal(noRecord.amountScopeText, '本期暂无采购记录')

const detail = loadPage(
  'subPackage/pages/management/purchaseManagement/supplierDetail/supplierDetail.js',
  ['decorateFact', 'decorateGoods']
)

const internalFact = detail.__decorateFact({
  sourceType: 'INTERNAL_COLLABORATION',
  factStatus: 'FULFILLED',
  businessDate: '2026-09-19',
  sourceGoodsId: 39656,
  goodsName: '小油菜',
  specification: '斤',
  orderedQuantity: '10',
  actualQuantity: '10.8',
  unitPrice: '2.5',
  grossAmount: '27.0',
  amountBasis: 'COLLABORATION_ORDER',
  dataQualityStatus: 'COMPLETE'
})
assert.equal(internalFact.actualQuantityLabel, '供货数量')
assert.equal(internalFact.orderedQuantityText, '10斤')
assert.equal(internalFact.actualQuantityText, '10.8斤')
assert.equal(internalFact.unitPriceText, '¥2.50/斤')
assert.equal(internalFact.grossAmountText, '¥27.00')
assert.equal(internalFact.issueText, '')
assert.match(internalFact.progressText, /来源流程已完成/)

const externalMissing = detail.__decorateFact({
  sourceType: 'EXTERNAL_DPB',
  factStatus: 'FULFILLED',
  businessDate: '2026-09-19',
  sourceGoodsId: 8,
  goodsName: '测试商品',
  specification: '斤',
  orderedQuantity: '10',
  actualQuantity: '10',
  unitPrice: '5',
  grossAmount: null,
  amountBasis: 'UNRESOLVED',
  dataQualityStatus: 'INCOMPLETE'
})
assert.equal(externalMissing.actualQuantityLabel, '来源数量')
assert.match(externalMissing.issueText, /缺少小计/)
assert.doesNotMatch(externalMissing.progressText, /已收货|已付款/)

const goods = detail.__decorateGoods({
  purchaseCount: 2,
  goodsLineCount: 3,
  purchaseAmount: null,
  recognizedAmountLineCount: 0,
  unresolvedAmountLineCount: 3,
  dataQualityStatus: 'INCOMPLETE'
})
assert.equal(goods.purchaseAmountText, '待核对')
assert.equal(goods.purchaseCountText, 2)
assert.equal(goods.goodsLineCountText, 3)

console.log('purchase supplier presentation states passed')

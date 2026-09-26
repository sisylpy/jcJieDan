import apiUrl from '../../../config.js'
import { getInventoryPurchasePerformance } from '../../../lib/apiDistributer.js'
import { resolveGoodsImage } from '../../../utils/goodsImageView.js'

const app = getApp()

Page({
  data: {
    navBarHeight: 0,
    startDate: '',
    stopDate: '',
    dateType: 'month',
    dateName: 'thisMonth',
    dateLabel: '本月',
    dimension: 'PURCHASER',
    groups: [],
    products: [],
    categories: [],
    activeCategoryId: 'ALL',
    purchaserOptions: [{ id: 'ALL', name: '全部' }],
    supplierOptions: [{ id: 'ALL', name: '全部' }],
    selectedPurchaserId: 'ALL',
    selectedPurchaserName: '全部',
    selectedSupplierId: 'ALL',
    selectedSupplierName: '全部',
    filterPanelOpen: false,
    summary: emptySummary(),
    loading: false,
    error: '',
    excludedCount: 0,
    timeBasisText: ''
  },

  onLoad() {
    const end = new Date()
    const start = new Date(end.getFullYear(), end.getMonth(), 1)
    this.setData({
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      startDate: formatDate(start),
      stopDate: formatDate(end)
    })
    this._firstShow = true
    this._allBatches = []
    this.load()
  },

  onShow() {
    if (this._firstShow) {
      this._firstShow = false
      return
    }
    this.load()
  },

  toBack() { wx.navigateBack({ delta: 1 }) },

  toDatePage() {
    wx.navigateTo({
      url: '/subPackage-charts/pages/sel/date/date?startDate=' + this.data.startDate +
        '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType +
        '&dateName=' + this.data.dateName
    })
  },

  onReportDateSelected(selection) {
    this.setData({
      startDate: selection.startDate,
      stopDate: selection.stopDate,
      dateType: selection.dateType,
      dateName: selection.dateName,
      dateLabel: selection.hanzi || '自定义'
    })
  },

  toggleFilters() { this.setData({ filterPanelOpen: !this.data.filterPanelOpen }) },

  selectPurchaser(event) {
    const id = String(event.currentTarget.dataset.id)
    this.setData({ selectedPurchaserId: id, selectedPurchaserName: optionName(this.data.purchaserOptions, id) })
    this.applyView({ selectedPurchaserId: id })
  },

  selectSupplier(event) {
    const id = String(event.currentTarget.dataset.id)
    this.setData({ selectedSupplierId: id, selectedSupplierName: optionName(this.data.supplierOptions, id) })
    this.applyView({ selectedSupplierId: id })
  },

  clearFilters() {
    this.setData({ selectedPurchaserId: 'ALL', selectedPurchaserName: '全部', selectedSupplierId: 'ALL', selectedSupplierName: '全部' })
    this.applyView({ selectedPurchaserId: 'ALL', selectedSupplierId: 'ALL' })
  },

  selectCategory(event) {
    const id = String(event.currentTarget.dataset.id)
    this.setData({ activeCategoryId: id })
    this.applyView({ activeCategoryId: id })
  },

  retry() { this.load() },

  load() {
    if (this.data.loading) return Promise.resolve()
    this.setData({ loading: true, error: '' })
    return getInventoryPurchasePerformance({
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      dimension: this.data.dimension
    }).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw new Error(body.msg || '库存经营加载失败')
      const data = body.data || {}
      const groups = (data.groups || []).map(decorateGroup)
      const batches = uniqueBatches(groups)
      const purchaserOptions = sourceOptions(batches, 'purchaserUserId', 'purchaserText')
      const supplierOptions = sourceOptions(batches, 'supplierRelationId', 'supplierText')
      this._allBatches = batches
      this.setData({
        groups,
        purchaserOptions,
        supplierOptions,
        selectedPurchaserName: optionName(purchaserOptions, this.data.selectedPurchaserId),
        selectedSupplierName: optionName(supplierOptions, this.data.selectedSupplierId),
        excludedCount: data.excludedNonWarehouseOrUnresolvedCount || 0,
        timeBasisText: data.timeBasisText || '按入库日期筛选库存批次；经营事实显示截至当前的累计结果'
      })
      this.applyView()
    }).catch(error => this.setData({ error: error.message || '库存经营加载失败' }))
      .then(() => this.setData({ loading: false }))
  },

  applyView(overrides) {
    const state = Object.assign({}, this.data, overrides || {})
    const sourceFiltered = (this._allBatches || []).filter(batch =>
      (state.selectedPurchaserId === 'ALL' || normalizeId(batch.purchaserUserId) === state.selectedPurchaserId) &&
      (state.selectedSupplierId === 'ALL' || normalizeId(batch.supplierRelationId) === state.selectedSupplierId))
    const categories = categoryOptions(sourceFiltered)
    const activeCategoryId = categories.some(item => item.id === state.activeCategoryId) ? state.activeCategoryId : 'ALL'
    const visible = sourceFiltered.filter(batch => activeCategoryId === 'ALL' || categoryId(batch) === activeCategoryId)
    this.setData({ categories, activeCategoryId, products: productSummaries(visible), summary: summaryOf(sourceFiltered) })
  },

  openBatch(event) {
    wx.navigateTo({
      url: '/subPackage/pages/shelf/inventoryBatchBusiness/inventoryBatchBusiness?stockBatchId=' + event.currentTarget.dataset.id
    })
  }
})

function decorateGroup(raw) {
  const group = Object.assign({}, raw)
  group.unitSummaries = (raw.unitSummaries || []).map(summary => Object.assign({}, summary, {
    stockInText: quantity(summary.netStockInQuantity, summary.uom),
    remainingText: quantity(summary.remainingQuantity, summary.uom),
    lossText: quantity(summary.lossQuantity, summary.uom),
    discardText: quantity(summary.discardQuantity, summary.uom)
  }))
  group.stockBatches = (raw.stockBatches || []).map(decorateStockBatch)
  return group
}

function decorateStockBatch(raw) {
  const item = Object.assign({}, raw)
  const uom = raw.baseUom || '单位未记录'
  item.stockInText = quantity(raw.netStockInQuantity, uom)
  item.remainingText = quantity(raw.remainingQuantity, uom)
  item.lossText = quantity(raw.lossQuantity, uom)
  item.discardText = quantity(raw.discardQuantity, uom)
  item.goodsImageUrl = resolveGoodsImage({ goodsFileLarge: raw.goodsFileLarge, goodsFile: raw.goodsFile, nxDgNxFatherImg: raw.goodsFatherImage }, apiUrl.server)
  item.businessStatusText = raw.businessStatus === 'COMPLETED' ? '已完结' : raw.businessStatus === 'DATA_INCOMPLETE' ? '依据不足' : '经营中'
  return item
}

function uniqueBatches(groups) {
  const seen = {}
  const result = []
  ;(groups || []).forEach(group => (group.stockBatches || []).forEach(batch => {
    const key = String(batch.stockBatchId)
    if (seen[key]) return
    seen[key] = true
    result.push(batch)
  }))
  return result
}

function sourceOptions(batches, idField, nameField) {
  const found = {}
  const result = [{ id: 'ALL', name: '全部' }]
  ;(batches || []).forEach(batch => {
    const id = normalizeId(batch[idField])
    if (found[id]) return
    found[id] = true
    result.push({ id, name: batch[nameField] || (id === 'UNASSIGNED' ? '未关联' : '#' + id) })
  })
  return result
}

function optionName(options, id) {
  const match = (options || []).find(item => item.id === id)
  return match ? match.name : '全部'
}

function normalizeId(value) {
  return value === null || value === undefined || value === '' ? 'UNASSIGNED' : String(value)
}

function categoryId(batch) {
  return normalizeId(batch.categoryId === null || batch.categoryId === undefined ? 0 : batch.categoryId)
}

function categoryOptions(batches) {
  const counts = {}
  const names = {}
  const seenGoods = {}
  ;(batches || []).forEach(batch => {
    const id = categoryId(batch)
    const goodsKey = id + ':' + String(batch.disGoodsId || batch.goodsName || batch.stockBatchId)
    if (!seenGoods[goodsKey]) counts[id] = (counts[id] || 0) + 1
    seenGoods[goodsKey] = true
    names[id] = batch.categoryName || '未分类'
  })
  const values = Object.keys(counts).map(id => ({ id, name: names[id], count: counts[id] }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  return [{ id: 'ALL', name: '全部', count: Object.keys(seenGoods).length }].concat(values)
}

function productSummaries(batches) {
  const products = {}
  ;(batches || []).forEach(batch => {
    const id = String(batch.disGoodsId || ('NAME:' + (batch.goodsName || '') + ':' + (batch.baseUom || '')))
    if (!products[id]) products[id] = createProduct(id, batch)
    addBatch(products[id], batch)
  })
  return Object.keys(products).map(key => finishProduct(products[key]))
    .sort((a, b) => b.grossPurchaseCostSort - a.grossPurchaseCostSort || a.goodsName.localeCompare(b.goodsName, 'zh-CN'))
}

function createProduct(id, batch) {
  return {
    id,
    goodsName: batch.goodsName || '未命名商品',
    goodsImageUrl: batch.goodsImageUrl,
    stockBatches: [],
    unitMap: {},
    purchaserNames: {},
    supplierNames: {},
    grossPurchaseCost: 0,
    lossCost: 0,
    discardCost: 0,
    currentRealizedMargin: 0,
    costComplete: true,
    inventoryCostComplete: true,
    currentResultComplete: true,
    allCompleted: true,
    attentionCount: 0
  }
}

function addBatch(product, batch) {
  product.stockBatches.push(batch)
  addUnit(product.unitMap, batch)
  product.purchaserNames[batch.purchaserText || '未关联采购员'] = true
  product.supplierNames[batch.supplierText || '未关联供应方'] = true
  if (!knownNumber(batch.grossPurchaseCost) || !truthyFlag(batch.purchaseCostKnown, knownNumber(batch.grossPurchaseCost))) product.costComplete = false
  else product.grossPurchaseCost += Number(batch.grossPurchaseCost)
  if (!truthyFlag(batch.inventoryCostFactsComplete, batch.resultStatus !== 'INSUFFICIENT_BASIS') || !knownNumber(batch.lossCost) || !knownNumber(batch.discardCost)) product.inventoryCostComplete = false
  else {
    product.lossCost += Number(batch.lossCost)
    product.discardCost += Number(batch.discardCost)
  }
  if (!knownNumber(batch.currentRealizedMargin)) product.currentResultComplete = false
  else product.currentRealizedMargin += Number(batch.currentRealizedMargin)
  if (batch.businessStatus !== 'COMPLETED') product.allCompleted = false
  product.attentionCount += (batch.issues || []).length
}

function addUnit(unitMap, batch) {
  const uom = batch.baseUom || '单位未记录'
  if (!unitMap[uom]) unitMap[uom] = { uom, stockIn: 0, remaining: 0, complete: true }
  const unit = unitMap[uom]
  if (!knownNumber(batch.netStockInQuantity) || !knownNumber(batch.remainingQuantity)) unit.complete = false
  else {
    unit.stockIn += Number(batch.netStockInQuantity)
    unit.remaining += Number(batch.remainingQuantity)
  }
}

function finishProduct(product) {
  const quantitySummaries = Object.keys(product.unitMap).map(key => {
    const unit = product.unitMap[key]
    return { uom: unit.uom, stockInText: unit.complete ? numberText(unit.stockIn) + unit.uom : '依据不足', remainingText: unit.complete ? numberText(unit.remaining) + unit.uom : '依据不足' }
  })
  const inventoryReady = product.costComplete && product.inventoryCostComplete
  product.quantitySummaries = quantitySummaries
  product.remainingSummary = quantitySummaries.map(item => item.remainingText).join(' / ') || '依据不足'
  product.stockBatchCount = product.stockBatches.length
  product.grossPurchaseCostText = product.costComplete ? money(product.grossPurchaseCost) : '依据不足'
  product.grossPurchaseCostSort = product.costComplete ? product.grossPurchaseCost : -1
  product.currentRealizedMarginText = product.currentResultComplete ? money(product.currentRealizedMargin) : '依据不足'
  product.currentResultNegative = product.currentResultComplete && product.currentRealizedMargin < 0
  product.lossCostRateText = costRateText(product.lossCost, product.grossPurchaseCost, inventoryReady)
  product.discardCostRateText = costRateText(product.discardCost, product.grossPurchaseCost, inventoryReady)
  product.sourceSummary = compactSources(product.purchaserNames, '采购员') + ' · ' + compactSources(product.supplierNames, '供应方')
  product.statusText = product.attentionCount ? '需核查' : (product.allCompleted ? '已完结' : '经营中')
  product.statusClass = product.attentionCount ? 'warning' : (product.allCompleted ? 'completed' : '')
  return product
}

function compactSources(sourceMap, label) {
  const names = Object.keys(sourceMap)
  if (!names.length) return '未关联' + label
  return names.length === 1 ? names[0] : names[0] + '等' + names.length + '个' + label
}

function summaryOf(batches) {
  const products = productSummaries(batches)
  const gross = sumKnown(batches, 'grossPurchaseCost', batch => truthyFlag(batch.purchaseCostKnown, knownNumber(batch.grossPurchaseCost)))
  const loss = sumKnown(batches, 'lossCost', batch => truthyFlag(batch.inventoryCostFactsComplete, batch.resultStatus !== 'INSUFFICIENT_BASIS'))
  const discard = sumKnown(batches, 'discardCost', batch => truthyFlag(batch.inventoryCostFactsComplete, batch.resultStatus !== 'INSUFFICIENT_BASIS'))
  const current = sumKnown(batches, 'currentRealizedMargin')
  const costsReady = gross.complete && loss.complete && discard.complete
  return {
    goodsCount: products.length,
    stockBatchCount: (batches || []).length,
    grossPurchaseCostText: gross.complete ? money(gross.value) : '依据不足',
    currentRealizedMarginText: current.complete ? money(current.value) : '依据不足',
    currentResultNegative: current.complete && current.value < 0,
    lossCostText: loss.complete ? money(loss.value) : '依据不足',
    discardCostText: discard.complete ? money(discard.value) : '依据不足',
    lossCostRateText: costRateText(loss.value, gross.value, costsReady),
    discardCostRateText: costRateText(discard.value, gross.value, costsReady),
    attentionCount: (batches || []).reduce((sum, batch) => sum + (batch.issues || []).length, 0)
  }
}

function emptySummary() {
  return { goodsCount: 0, stockBatchCount: 0, grossPurchaseCostText: '—', currentRealizedMarginText: '—', lossCostText: '—', discardCostText: '—', lossCostRateText: '—', discardCostRateText: '—', attentionCount: 0, currentResultNegative: false }
}

function sumKnown(items, field, extraCheck) {
  let value = 0
  let complete = true
  ;(items || []).forEach(item => {
    if (!knownNumber(item[field]) || (extraCheck && !extraCheck(item))) complete = false
    else value += Number(item[field])
  })
  return { value, complete }
}

function truthyFlag(value, fallback) {
  if (value === null || value === undefined || value === '') return Boolean(fallback)
  return value === true || value === 1 || value === '1' || String(value).toLowerCase() === 'true'
}

function knownNumber(value) {
  return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))
}

function numberText(value) {
  if (!knownNumber(value)) return null
  return String(Number(Number(value).toFixed(3)))
}

function quantity(value, uom) {
  const text = numberText(value)
  return text === null ? '依据不足' : text + (uom || '')
}

function money(value) {
  if (!knownNumber(value)) return '依据不足'
  return '¥' + Number(value).toFixed(2)
}

function costRateText(numerator, denominator, complete) {
  if (!complete) return '依据不足'
  if (!knownNumber(denominator) || Number(denominator) === 0) return '不适用'
  return (Number(numerator) / Number(denominator) * 100).toFixed(2) + '%'
}

function formatDate(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
}

import {
  getInventoryBatchBusiness,
  addInventoryBatchLossFact,
  changeInventoryBatchPrice,
  reverseInventoryBatchLossFact
} from '../../../../lib/apiDistributer.js'

const app = getApp()

const REASONS = [
  { code: 'INVENTORY_DIFFERENCE', label: '盘点差异' },
  { code: 'ROTTEN', label: '腐烂变质' },
  { code: 'QUALITY_UNQUALIFIED', label: '品质不合格' },
  { code: 'HANDLING_DAMAGE', label: '搬运破损' },
  { code: 'WAREHOUSE_STORAGE', label: '仓储保管' },
  { code: 'NATURAL_LOSS', label: '自然损耗' },
  { code: 'OVERBUY_OR_SLOW_SALES', label: '采购过量或销售缓慢' },
  { code: 'OTHER', label: '其他' }
]

const ATTRIBUTIONS = [
  { code: 'UNATTRIBUTED', label: '暂不归责' },
  { code: 'SUPPLIER_QUALITY', label: '供货商品质' },
  { code: 'PURCHASER_SELECTION', label: '采购员选货' },
  { code: 'PURCHASER_OVERBUY', label: '采购过量' },
  { code: 'WAREHOUSE_STORAGE', label: '仓储保管' },
  { code: 'HANDLING_DAMAGE', label: '搬运损坏' },
  { code: 'NORMAL_NATURAL', label: '正常自然损耗' },
  { code: 'SALES_SLOW', label: '销售缓慢' }
]

const FACT_TYPES = [
  { code: 'DISCARD', label: '盘点报废', desc: '实物已经不存在或不能继续销售' },
  { code: 'LOSS', label: '库存损耗', desc: '损坏、变质或自然损耗' }
]

Page({
  data: {
    navBarHeight: 0,
    loading: false,
    saving: false,
    errorText: '',
    batchIds: [],
    rawStockList: [],
    batches: [],
    goodsName: '库存商品',
    standardName: '件',
    shelfName: '',
    totalRemainingText: '0',
    showEditSheet: false,
    selectedBatchIndex: -1,
    selectedBatch: null,
    actualQuantity: '',
    adjustmentQuantityText: '0',
    quantityError: '',
    canSubmitQuantity: false,
    factTypes: FACT_TYPES,
    factTypeIndex: 0,
    reasons: REASONS,
    reasonIndex: 0,
    attributions: ATTRIBUTIONS,
    attributionIndex: 0,
    note: '',
    newSellingPrice: '',
    priceReason: 'TAIL_STOCK_MARKDOWN',
    priceNote: '',
    expectedTailMargin: null,
    belowCost: false
  },

  onLoad(options) {
    const appData = app.globalData || {}
    const context = wx.getStorageSync('inventoryBatchBusinessContext') || {}
    const requestedStockId = Number(options.stockBatchId) || null
    const contextStocks = Array.isArray(context.stockList) ? context.stockList : []
    const matchedContextStocks = requestedStockId
      ? contextStocks.filter(stock => Number(stock.nxDistributerGoodsShelfStockId) === requestedStockId)
      : contextStocks
    const contextGoods = matchedContextStocks.length > 0 || !requestedStockId ? (context.goods || {}) : {}
    const batchIds = requestedStockId ? [requestedStockId] : this._uniqueBatchIds(matchedContextStocks)

    this.setData({
      navBarHeight: Number(appData.navBarHeight || 0) * Number(appData.rpxR || 1),
      batchIds,
      rawStockList: matchedContextStocks,
      goodsName: contextGoods.nxDgGoodsName || '库存商品',
      standardName: contextGoods.nxDgGoodsStandardname || '件',
      shelfName: context.shelfName || ''
    })

    if (batchIds.length === 0) {
      this.setData({ errorText: '没有找到可查看的库存批次' })
      return
    }
    this.loadBatches()
  },

  onPullDownRefresh() {
    this.loadBatches(true)
  },

  onUnload() {
    wx.removeStorageSync('inventoryBatchBusinessContext')
  },

  toBack() {
    wx.navigateBack({ delta: 1 })
  },

  preventTouchMove() {},

  retryBatches() {
    this.loadBatches()
  },

  _uniqueBatchIds(stockList) {
    const ids = []
    stockList.forEach(stock => {
      const id = Number(stock.nxDistributerGoodsShelfStockId)
      if (id > 0 && ids.indexOf(id) < 0) ids.push(id)
    })
    return ids
  },

  _rawStock(stockId) {
    return (this.data.rawStockList || []).find(
      stock => Number(stock.nxDistributerGoodsShelfStockId) === Number(stockId)
    ) || {}
  },

  loadBatches(stopRefresh) {
    const batchIds = this.data.batchIds || []
    if (batchIds.length === 0 || this.data.loading) {
      if (stopRefresh) wx.stopPullDownRefresh()
      return
    }

    this.setData({ loading: true, errorText: '' })
    Promise.all(batchIds.map(stockId => {
      return getInventoryBatchBusiness(stockId).then(res => {
        const result = res && res.result ? res.result : {}
        if (result.code !== 0) throw new Error(result.msg || '批次加载失败')
        return { stockId, detail: result.data || {}, failed: false }
      }).catch(error => ({ stockId, detail: {}, failed: true, message: error.message || '批次加载失败' }))
    })).then(results => {
      const previousExpanded = {}
      ;(this.data.batches || []).forEach(batch => {
        previousExpanded[batch.stockBatchId] = batch.expanded
      })

      const batches = results.map((result, index) => this._normalizeBatch(
        result.stockId,
        result.detail,
        this._rawStock(result.stockId),
        index,
        previousExpanded[result.stockId] === true,
        result.failed
      ))
      const successful = results.filter(result => !result.failed)
      const firstNamedBatch = batches.find(batch => batch.goodsName)
      const totalRemaining = batches.reduce((sum, batch) => sum + Number(batch.remainingQuantity || 0), 0)

      this.setData({
        batches,
        goodsName: firstNamedBatch ? firstNamedBatch.goodsName : this.data.goodsName,
        standardName: firstNamedBatch ? firstNamedBatch.baseUom : this.data.standardName,
        totalRemainingText: this._formatNumber(totalRemaining, 3),
        errorText: successful.length === 0 ? '批次经营数据暂时无法加载，请稍后重试' : '',
        loading: false
      })
    }).catch(() => {
      this.setData({ loading: false, errorText: '批次加载失败，请稍后重试' })
    }).then(() => {
      if (stopRefresh) wx.stopPullDownRefresh()
    })
  },

  _normalizeBatch(stockId, detail, raw, index, expanded, loadFailed) {
    const remainingQuantity = this._firstNumber(detail.remainingQuantity, raw.nxDgssRestWeight)
    const netStockInQuantity = this._firstNumber(detail.netStockInQuantity, raw.nxDgssWeight)
    const unitCost = this._firstNumber(detail.unitCost, raw.nxDgssPrice)
    const sellingPrice = this._firstNumber(detail.currentSellingPrice, raw.nxDgssSellingPrice)
    const baseUom = detail.baseUom || this.data.standardName || '件'
    const lossFacts = (detail.lossFacts || []).map(fact => ({
      ...fact,
      factTypeText: fact.factType === 'DISCARD' ? '报废' : (fact.factType === 'REVERSAL' ? '冲销' : '损耗'),
      reasonText: this._optionLabel(REASONS, fact.reasonCode),
      attributionText: this._optionLabel(ATTRIBUTIONS, fact.attributionCode),
      quantityText: this._formatNumber(fact.quantity, 3)
    }))

    return {
      ...detail,
      stockBatchId: Number(detail.stockBatchId || stockId),
      displayIndex: index + 1,
      goodsName: detail.goodsName || this.data.goodsName,
      baseUom,
      remainingQuantity,
      remainingQuantityText: this._formatNumber(remainingQuantity, 3),
      netStockInQuantityText: this._formatNumber(netStockInQuantity, 3),
      soldQuantityText: this._formatNumber(detail.soldQuantity, 3),
      lossQuantityText: this._formatNumber(detail.lossQuantity, 3),
      discardQuantityText: this._formatNumber(detail.discardQuantity, 3),
      supplierReturnQuantityText: this._formatNumber(detail.supplierReturnQuantity, 3),
      unitCost,
      unitCostText: this._formatNumber(unitCost, 2),
      currentSellingPrice: sellingPrice,
      currentSellingPriceText: this._formatNumber(sellingPrice, 2),
      currentRealizedMarginText: this._formatNumber(detail.currentRealizedMargin, 2),
      stockInDate: raw.nxDgssDate || raw.nxDgssInventoryDate || '',
      produceDate: raw.nxDgssProduceDate || '',
      expiryDate: raw.nxDgssExpiryDate || '',
      purchaserName: detail.purchaserName || '未分配采购员',
      supplierName: detail.supplierName || '未关联供货商',
      businessStatusText: detail.businessStatus === 'COMPLETED' ? '已完结' : '经营中',
      isCompleted: detail.businessStatus === 'COMPLETED',
      lossFacts,
      expanded,
      loadFailed
    }
  },

  _optionLabel(options, code) {
    const found = options.find(option => option.code === code)
    return found ? found.label : (code || '未填写')
  },

  _firstNumber() {
    for (let index = 0; index < arguments.length; index += 1) {
      const value = arguments[index]
      if (value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value))) {
        return Number(value)
      }
    }
    return 0
  },

  _formatNumber(value, digits) {
    const number = Number(value)
    if (!Number.isFinite(number)) return '0'
    return number.toFixed(digits).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
  },

  toggleBatchDetail(e) {
    const index = Number(e.currentTarget.dataset.index)
    const path = 'batches[' + index + '].expanded'
    this.setData({ [path]: !this.data.batches[index].expanded })
  },

  openBatchEditor(e) {
    const index = Number(e.currentTarget.dataset.index)
    const batch = this.data.batches[index]
    if (!batch || batch.loadFailed) {
      wx.showToast({ title: '批次数据尚未加载', icon: 'none' })
      return
    }
    this.setData({
      showEditSheet: true,
      selectedBatchIndex: index,
      selectedBatch: batch,
      actualQuantity: batch.remainingQuantityText,
      adjustmentQuantityText: '0',
      quantityError: '',
      canSubmitQuantity: false,
      factTypeIndex: 0,
      reasonIndex: 0,
      attributionIndex: 0,
      note: '',
      newSellingPrice: '',
      priceReason: 'TAIL_STOCK_MARKDOWN',
      priceNote: '',
      expectedTailMargin: null,
      belowCost: false
    })
  },

  closeBatchEditor() {
    if (this.data.saving) return
    this.setData({ showEditSheet: false, selectedBatch: null, selectedBatchIndex: -1 })
  },

  onActualQuantityInput(e) {
    const value = e.detail.value
    const current = Number(this.data.selectedBatch.remainingQuantity || 0)
    const actual = Number(value)
    let error = ''
    let adjustment = 0

    if (value === '' || !Number.isFinite(actual) || actual < 0) {
      error = value === '' ? '' : '请输入不小于 0 的实际库存'
    } else if (actual > current) {
      error = '实际库存不能大于当前库存；增加库存请使用采购入库'
    } else {
      adjustment = current - actual
    }

    this.setData({
      actualQuantity: value,
      adjustmentQuantityText: this._formatNumber(adjustment, 3),
      quantityError: error,
      canSubmitQuantity: !error && value !== '' && adjustment > 0
    })
  },

  chooseFactType(e) {
    this.setData({ factTypeIndex: Number(e.currentTarget.dataset.index) })
  },

  onReasonChange(e) {
    this.setData({ reasonIndex: Number(e.detail.value) })
  },

  onAttributionChange(e) {
    this.setData({ attributionIndex: Number(e.detail.value) })
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value })
  },

  submitQuantityChange() {
    if (!this.data.canSubmitQuantity || this.data.saving) return
    const batch = this.data.selectedBatch
    const quantity = Number(this.data.adjustmentQuantityText)
    const factType = FACT_TYPES[this.data.factTypeIndex]
    const reason = REASONS[this.data.reasonIndex]
    const attribution = ATTRIBUTIONS[this.data.attributionIndex]

    wx.showModal({
      title: '确认修改库存',
      content: '批次 #' + batch.stockBatchId + ' 将减少 ' + this.data.adjustmentQuantityText + batch.baseUom + '，并保留库存变动记录。',
      confirmText: '确认修改',
      confirmColor: '#15977f',
      success: modalResult => {
        if (!modalResult.confirm) return
        this.setData({ saving: true })
        addInventoryBatchLossFact(batch.stockBatchId, {
          factType: factType.code,
          quantity,
          reasonCode: reason.code,
          attributionCode: attribution.code,
          note: this.data.note || '库存批次盘点调整'
        }, requestKey('quantity')).then(res => {
          const result = res && res.result ? res.result : {}
          if (result.code !== 0) throw new Error(result.msg || '修改失败')
          this.setData({ showEditSheet: false, selectedBatch: null, selectedBatchIndex: -1 })
          wx.showToast({ title: '库存已更新', icon: 'success' })
          this.loadBatches()
        }).catch(error => {
          wx.showToast({ title: error.message || '修改失败', icon: 'none' })
        }).then(() => this.setData({ saving: false }))
      }
    })
  },

  onPriceInput(e) {
    const value = e.detail.value
    const price = Number(value)
    const batch = this.data.selectedBatch || {}
    const cost = Number(batch.unitCost || 0)
    const remaining = Number(batch.remainingQuantity || 0)
    this.setData({
      newSellingPrice: value,
      expectedTailMargin: value !== '' && Number.isFinite(price)
        ? this._formatNumber((price - cost) * remaining, 2)
        : null,
      belowCost: value !== '' && Number.isFinite(price) && price < cost
    })
  },

  onPriceReasonInput(e) {
    this.setData({ priceReason: e.detail.value })
  },

  onPriceNoteInput(e) {
    this.setData({ priceNote: e.detail.value })
  },

  submitPrice() {
    if (this.data.saving) return
    const price = Number(this.data.newSellingPrice)
    if (!Number.isFinite(price) || price < 0 || !this.data.priceReason.trim()) {
      wx.showToast({ title: '请填写正确的售价和调价原因', icon: 'none' })
      return
    }
    const batch = this.data.selectedBatch
    this.setData({ saving: true })
    changeInventoryBatchPrice(batch.stockBatchId, {
      newSellingPrice: price,
      reasonCode: this.data.priceReason.trim(),
      note: this.data.priceNote
    }, requestKey('price')).then(res => {
      const result = res && res.result ? res.result : {}
      if (result.code !== 0) throw new Error(result.msg || '调价失败')
      const warning = result.data && result.data.warning
      wx.showToast({ title: warning || '售价已更新', icon: 'none' })
      this.setData({
        showEditSheet: false,
        selectedBatch: null,
        selectedBatchIndex: -1
      })
      this.loadBatches()
    }).catch(error => {
      wx.showToast({ title: error.message || '调价失败', icon: 'none' })
    }).then(() => this.setData({ saving: false }))
  },

  reverseFact(e) {
    const stockBatchId = Number(e.currentTarget.dataset.stockId)
    const factId = Number(e.currentTarget.dataset.factId)
    if (!stockBatchId || !factId || this.data.saving) return
    wx.showModal({
      title: '冲销库存记录',
      editable: true,
      placeholderText: '请输入冲销原因',
      confirmColor: '#15977f',
      success: result => {
        if (!result.confirm || !result.content || !result.content.trim()) return
        this.setData({ saving: true })
        reverseInventoryBatchLossFact(
          stockBatchId,
          factId,
          { reason: result.content.trim() },
          requestKey('reverse')
        ).then(res => {
          const response = res && res.result ? res.result : {}
          if (response.code !== 0) throw new Error(response.msg || '冲销失败')
          wx.showToast({ title: '冲销成功', icon: 'success' })
          this.loadBatches()
        }).catch(error => {
          wx.showToast({ title: error.message || '冲销失败', icon: 'none' })
        }).then(() => this.setData({ saving: false }))
      }
    })
  },

  toPerformance() {
    wx.navigateTo({ url: '/subPackage/pages/management/purchasePerformance/purchasePerformance' })
  }
})

function requestKey(kind) {
  return kind + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10)
}

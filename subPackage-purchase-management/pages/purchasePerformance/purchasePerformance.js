import { getInventoryPurchasePerformance } from '../../../lib/apiDistributer.js'

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
    loading: false,
    error: '',
    stockBatchCount: 0,
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

  changeDimension(event) {
    this.setData({ dimension: event.currentTarget.dataset.value })
    this.load()
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
      this.setData({
        groups: (data.groups || []).map(decorateGroup),
        stockBatchCount: data.stockBatchCount || 0,
        excludedCount: data.excludedNonWarehouseOrUnresolvedCount || 0,
        timeBasisText: data.timeBasisText || '按入库日期筛选库存批次；经营事实显示截至当前的累计结果'
      })
    }).catch(error => this.setData({ error: error.message || '库存经营加载失败' }))
      .then(() => this.setData({ loading: false }))
  },

  openBatch(event) {
    wx.navigateTo({
      url: '/subPackage/pages/shelf/inventoryBatchBusiness/inventoryBatchBusiness?stockBatchId=' +
        event.currentTarget.dataset.id
    })
  }
})

function decorateGroup(raw) {
  const group = Object.assign({}, raw)
  group.grossPurchaseCostText = money(raw.grossPurchaseCost)
  group.lossCostText = money(raw.lossCost)
  group.discardCostText = money(raw.discardCost)
  group.lossCostRateText = costRate(raw.lossCostRate, raw.grossPurchaseCost)
  group.discardCostRateText = costRate(raw.discardCostRate, raw.grossPurchaseCost)
  group.currentRealizedMarginText = money(raw.currentRealizedMargin)
  group.completedFinalMarginText = raw.completedStockBatchCount > 0 ? money(raw.completedFinalMargin) : '暂无完结批次'
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
  item.grossPurchaseCostText = money(raw.grossPurchaseCost)
  item.currentResultText = money(raw.currentRealizedMargin)
  item.finalResultText = raw.businessStatus === 'COMPLETED' ? money(raw.finalMargin) : '经营中，尚无最终结果'
  item.businessStatusText = raw.businessStatus === 'COMPLETED' ? '已符合数量完结条件'
    : raw.businessStatus === 'DATA_INCOMPLETE' ? '状态依据不足' : '经营中'
  item.resultStatusText = raw.resultStatus === 'INSUFFICIENT_BASIS' ? '金额依据不足'
    : raw.resultStatus === 'FINAL_READY' ? '最终结果可核实' : '当前结果可核实'
  return item
}

function numberText(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  return Number.isFinite(number) ? String(Number(number.toFixed(3))) : null
}

function quantity(value, uom) {
  const text = numberText(value)
  return text === null ? '依据不足' : text + (uom || '')
}

function money(value) {
  if (value === null || value === undefined || value === '') return '依据不足'
  const number = Number(value)
  return Number.isFinite(number) ? '¥' + number.toFixed(2) : '依据不足'
}

function costRate(value, grossPurchaseCost) {
  if ((value === null || value === undefined || value === '') && Number(grossPurchaseCost) === 0) return '不适用（入库成本为0）'
  if (value === null || value === undefined || value === '') return '依据不足'
  const number = Number(value)
  return Number.isFinite(number) ? (number * 100).toFixed(2) + '%' : '依据不足'
}

function formatDate(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
}

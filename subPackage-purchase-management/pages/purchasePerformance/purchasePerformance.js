import apiUrl from '../../../config.js'
import { getPurchasePerformance } from '../../../lib/apiDistributer.js'
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
    summary: emptySummary(),
    purchaseAmount: emptyPurchaseAmount(),
    orderSourceGroups: [],
    products: [],
    categories: [],
    activeCategoryId: 'ALL',
    productCount: 0,
    timeBasisText: '',
    loading: false,
    error: ''
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
    this._allProducts = []
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

  retry() { this.load() },

  selectCategory(event) {
    const id = String(event.currentTarget.dataset.id)
    this.applyProductView(id)
  },

  load() {
    if (this.data.loading) return Promise.resolve()
    this.setData({ loading: true, error: '' })
    return getPurchasePerformance({
      startDate: this.data.startDate,
      stopDate: this.data.stopDate
    }).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw new Error(body.msg || '采购经营分析加载失败')
      const data = body.data || {}
      this._allProducts = (data.products || []).map(decorateProduct)
      this.setData({
        summary: data.summary || emptySummary(),
        purchaseAmount: data.purchaseAmount || emptyPurchaseAmount(),
        orderSourceGroups: (data.orderSourceGroups || []).map(decorateOrderSource),
        timeBasisText: data.timeBasisText || '订单、采购与损耗分别按真实业务发生日期归期'
      })
      this.applyProductView(this.data.activeCategoryId)
    }).catch(error => this.setData({ error: error.message || '采购经营分析加载失败' }))
      .then(() => this.setData({ loading: false }))
  },

  openPurchaseRecords() {
    wx.navigateTo({
      url: '/subPackage/pages/management/purchaseManagement/purchaseAmountDetail/purchaseAmountDetail?startDate=' +
        this.data.startDate + '&stopDate=' + this.data.stopDate
    })
  },

  applyProductView(requestedCategoryId) {
    const allProducts = this._allProducts || []
    const categories = categoryOptions(allProducts)
    const requested = requestedCategoryId || 'ALL'
    const activeCategoryId = categories.some(item => item.id === requested) ? requested : 'ALL'
    const products = allProducts.filter(item => activeCategoryId === 'ALL' || categoryId(item) === activeCategoryId)
    this.setData({ categories, activeCategoryId, products, productCount: allProducts.length })
  }
})

function decorateOrderSource(raw) {
  const item = Object.assign({}, raw)
  const meta = {
    INTERNAL_COLLABORATION: { mark: '协', tone: 'collaboration' },
    EXTERNAL_DPB: { mark: '供', tone: 'external' },
    SELF_PURCHASE: { mark: '采', tone: 'self' },
    INVENTORY_STOCK: { mark: '库', tone: 'inventory' },
    UNRESOLVED: { mark: '?', tone: 'unresolved' }
  }[raw.sourceType] || { mark: '?', tone: 'unresolved' }
  item.mark = meta.mark
  item.tone = meta.tone
  return item
}

function decorateProduct(raw) {
  const item = Object.assign({}, raw)
  item.id = String(raw.disGoodsId || raw.goodsName || '')
  item.goodsImageUrl = resolveGoodsImage({
    goodsFileLarge: raw.goodsFileLarge,
    goodsFile: raw.goodsFile,
    nxDgNxFatherImg: raw.goodsFatherImage
  }, apiUrl.server)
  item.statusClass = raw.resultStatus === 'PARTIAL' || raw.purchaseIssueCount ? 'warning' : raw.resultStatus === 'COMPLETE' ? 'complete' : 'muted'
  item.lossSummary = [
    raw.lossFactCount ? '损耗' + raw.lossFactCount + '笔' : '',
    raw.discardFactCount ? '废弃' + raw.discardFactCount + '笔' : ''
  ].filter(Boolean).join(' · ') || '无确认损耗'
  return item
}

function categoryId(item) {
  return String(item.categoryId === null || item.categoryId === undefined ? 0 : item.categoryId)
}

function categoryOptions(products) {
  const counts = {}
  const names = {}
  ;(products || []).forEach(item => {
    const id = categoryId(item)
    counts[id] = (counts[id] || 0) + 1
    names[id] = item.categoryName || '未分类'
  })
  const values = Object.keys(counts).map(id => ({ id, name: names[id], count: counts[id] }))
    .sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'))
  return [{ id: 'ALL', name: '全部', count: (products || []).length }].concat(values)
}

function emptySummary() {
  return {
    operatingResultText: '—',
    recognizedOperatingResultText: '—',
    resultStatus: 'NO_OPERATING_FACTS',
    resultStatusText: '本期暂无经营事实',
    salesRevenueText: '—',
    orderPurchaseCostText: '—',
    orderMarginText: '—',
    orderMarginRateText: '—',
    operatingMarginRateText: '—',
    lossCostText: '—',
    discardCostText: '—',
    periodOrderLineCount: 0,
    profitEligibleOrderCount: 0,
    profitIneligibleOrderCount: 0,
    lossFactCount: 0,
    discardFactCount: 0,
    dataIssueCount: 0
  }
}

function emptyPurchaseAmount() {
  return {
    recognizedAmountText: '—',
    includedRecordCount: 0,
    unresolvedAmountCount: 0,
    conflictRecordCount: 0,
    totalPurchaseFactRecordCount: 0,
    pendingDemandCount: 0,
    undatedRecordCount: 0,
    groups: []
  }
}

function formatDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return year + '-' + month + '-' + day
}

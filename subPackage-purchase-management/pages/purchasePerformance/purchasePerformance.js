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
    lossGoods: [],
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
      this.setData({
        summary: data.summary || emptySummary(),
        purchaseAmount: data.purchaseAmount || emptyPurchaseAmount(),
        orderSourceGroups: (data.orderSourceGroups || []).map(decorateOrderSource),
        lossGoods: (data.lossGoods || []).map(decorateLossGoods),
        timeBasisText: data.timeBasisText || '订单、采购与损耗分别按真实业务发生日期归期'
      })
    }).catch(error => this.setData({ error: error.message || '采购经营分析加载失败' }))
      .then(() => this.setData({ loading: false }))
  },

  openPurchaseRecords() {
    wx.navigateTo({
      url: '/subPackage/pages/management/purchaseManagement/purchaseAmountDetail/purchaseAmountDetail?startDate=' +
        this.data.startDate + '&stopDate=' + this.data.stopDate
    })
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

function decorateLossGoods(raw) {
  const item = Object.assign({}, raw)
  item.goodsImageUrl = resolveGoodsImage({
    goodsFileLarge: raw.goodsFileLarge,
    goodsFile: raw.goodsFile,
    nxDgNxFatherImg: raw.goodsFatherImage
  }, apiUrl.server)
  item.factSummary = [
    raw.lossFactCount ? '损耗' + raw.lossFactCount + '笔' : '',
    raw.discardFactCount ? '废弃' + raw.discardFactCount + '笔' : ''
  ].filter(Boolean).join(' · ')
  return item
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

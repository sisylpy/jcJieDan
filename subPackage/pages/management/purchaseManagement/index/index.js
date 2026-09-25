import { getPurchaseManagementOverview } from '../../../../../lib/apiDistributer.js'
import { formatPurchaseMoney, normalizePurchaseAmount } from '../../../../../utils/purchaseAmountPresenter.js'

const app = getApp()

Page({
  data: {
    navBarHeight: 0,
    range: 'TODAY',
    startDate: '',
    stopDate: '',
    loading: false,
    error: '',
    period: {},
    warehouseStockInAmountText: '—',
    waitingStockInAmountText: '¥0.00',
    purchaseAmount: normalizePurchaseAmount({}),
    tasks: {},
    structures: {}
  },

  onLoad() {
    this.setData({ navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR })
  },

  onShow() { this.load() },
  onPullDownRefresh() { this.load(true) },
  toBack() { wx.navigateBack({ delta: 1 }) },

  chooseRange(event) {
    const range = event.currentTarget.dataset.range
    this.setData({ range, startDate: '', stopDate: '' })
    this.load()
  },

  changeStart(event) {
    this.setData({ range: 'CUSTOM', startDate: event.detail.value })
    this.tryCustom()
  },

  changeStop(event) {
    this.setData({ range: 'CUSTOM', stopDate: event.detail.value })
    this.tryCustom()
  },

  tryCustom() {
    if (this.data.startDate && this.data.stopDate) this.load()
  },

  retry() { this.load() },

  load(refresh) {
    this.setData({ loading: true, error: '' })
    const query = this.data.range === 'CUSTOM'
      ? { startDate: this.data.startDate, stopDate: this.data.stopDate }
      : { range: this.data.range }
    getPurchaseManagementOverview(query).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw new Error(body.msg || '加载失败')
      const data = body.data || {}
      if (!data.purchaseAmount) throw new Error('本期采购金额数据未返回')
      const purchaseAmount = normalizePurchaseAmount(data.purchaseAmount)
      if (!purchaseAmount.contractValid) throw new Error('本期采购金额状态无法识别')
      const period = data.period || {}
      const tasks = data.currentTasks || {}
      const allWaitingAmountsUnresolved = Number(tasks.waitingStockInGoodsLines || 0) > 0 &&
        Number(tasks.waitingStockInUnresolvedAmountCount || 0) >= Number(tasks.waitingStockInGoodsLines || 0)
      this.setData({
        period,
        warehouseStockInAmountText: formatPurchaseMoney(period.warehouseStockInAmount),
        waitingStockInAmountText: allWaitingAmountsUnresolved
          ? '金额待核对' : formatPurchaseMoney(tasks.waitingStockInAmount || 0),
        purchaseAmount,
        tasks,
        structures: data.structures || {},
        startDate: data.startDate || '',
        stopDate: data.stopDate || ''
      })
    }).catch(error => this.setData({ error: error.message || '加载失败' }))
      .then(() => {
        this.setData({ loading: false })
        if (refresh) wx.stopPullDownRefresh()
      })
  },

  openAmountRecords() {
    wx.navigateTo({
      url: '/subPackage/pages/management/purchaseManagement/purchaseAmountDetail/purchaseAmountDetail'
        + '?startDate=' + encodeURIComponent(this.data.startDate)
        + '&stopDate=' + encodeURIComponent(this.data.stopDate)
    })
  },

  openPendingStockIns() {
    wx.navigateTo({
      url: '/subPackage/pages/management/purchaseManagement/pendingStockInList/pendingStockInList'
    })
  },

  openCollaborationPending() {
    wx.navigateTo({
      url: '/pages/doing/index/index'
    })
  },

  openQuality() {
    wx.navigateTo({
      url: '/subPackage-purchase-management/pages/purchasePerformance/purchasePerformance?tab=pending'
    })
  },

  open(event) {
    wx.navigateTo({
      url: event.currentTarget.dataset.url
        + '?startDate=' + encodeURIComponent(this.data.startDate)
        + '&stopDate=' + encodeURIComponent(this.data.stopDate)
    })
  }
})

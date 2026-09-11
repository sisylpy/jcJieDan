import { getPurchaseManagementPurchaser, getPurchaseManagementPurchaserBatches, getPurchaseManagementPurchaserDirectPurchases } from '../../../../../lib/apiDistributer.js'

const app = getApp()
const PAGE_SIZE = 20

Page({
  data: {
    navBarHeight: 0, purchaserId: 0, startDate: '', stopDate: '', detail: {},
    demandSource: '', procurementMode: '', showDirect: true,
    items: [], page: 1, total: 0, batchLoading: false,
    directItems: [], directPage: 1, directTotal: 0, directLoading: false,
    loading: false, error: '', listEmpty: true
  },
  onLoad(options) {
    this._batchRequestId = 0
    this._directRequestId = 0
    this._lastMore = ''
    this.setData({
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      purchaserId: Number(options.purchaserId), startDate: options.startDate || '', stopDate: options.stopDate || ''
    })
    this.load()
  },
  toBack() { wx.navigateBack({ delta: 1 }) },
  chooseSource(event) {
    this.setData({ demandSource: event.currentTarget.dataset.value || '' })
    this.reload()
  },
  chooseMode(event) {
    const mode = event.currentTarget.dataset.value || ''
    this.setData({ procurementMode: mode, showDirect: !mode || mode === 'SELF_BUY' })
    this.reload()
  },
  reload() {
    this.loadBatches(true)
    this.loadDirect(true)
  },
  load() {
    this.setData({ loading: true, error: '' })
    const query = { startDate: this.data.startDate, stopDate: this.data.stopDate }
    getPurchaseManagementPurchaser(this.data.purchaserId, query)
      .then(res => {
        const body = res.result || {}
        if (body.code !== 0) throw new Error(body.msg || '加载失败')
        this.setData({ detail: body.data || {} })
      })
      .catch(error => this.setData({ error: error.message || '加载失败' }))
      .then(() => this.setData({ loading: false }))
    this.loadBatches(true)
    this.loadDirect(true)
  },
  loadBatches(reset) {
    // 只拦截“上拉加载更多”的重复触发；切筛选/重新加载必须立即发起新请求
    if (!reset && this.data.batchLoading) return
    const requestId = ++this._batchRequestId
    const page = reset ? 1 : this.data.page + 1
    this.setData({ batchLoading: true })
    getPurchaseManagementPurchaserBatches(this.data.purchaserId, {
      startDate: this.data.startDate, stopDate: this.data.stopDate, page, pageSize: PAGE_SIZE,
      demandSource: this.data.demandSource, procurementMode: this.data.procurementMode
    }).then(res => {
      if (requestId !== this._batchRequestId) return
      const body = res.result || {}
      if (body.code !== 0) throw new Error(body.msg || '加载失败')
      const data = body.data || {}
      this.setData({ items: reset ? (data.items || []) : this.data.items.concat(data.items || []), page, total: data.total || 0 })
      this.refreshEmpty()
    }).catch(error => {
      if (requestId !== this._batchRequestId) return
      wx.showToast({ title: error.message || '加载失败', icon: 'none' })
      if (reset) {
        this.setData({ items: [], page: 1, total: 0 })
        this.refreshEmpty()
      }
    }).then(() => {
      if (requestId !== this._batchRequestId) return
      this.setData({ batchLoading: false })
    })
  },
  loadDirect(reset) {
    if (!this.data.showDirect) {
      // 切到供应商采购时要同时作废旧的直接采购请求并释放 loading，
      // 否则旧响应不会收尾，分页会一直被 directLoading 阻塞。
      ++this._directRequestId
      this.setData({ directItems: [], directPage: 1, directTotal: 0, directLoading: false })
      this.refreshEmpty()
      return
    }
    if (!reset && this.data.directLoading) return
    const requestId = ++this._directRequestId
    const page = reset ? 1 : this.data.directPage + 1
    this.setData({ directLoading: true })
    getPurchaseManagementPurchaserDirectPurchases(this.data.purchaserId, {
      startDate: this.data.startDate, stopDate: this.data.stopDate, page, pageSize: PAGE_SIZE,
      demandSource: this.data.demandSource
    }).then(res => {
      if (requestId !== this._directRequestId) return
      const body = res.result || {}
      if (body.code !== 0) throw new Error(body.msg || '加载失败')
      const data = body.data || {}
      const list = (data.items || []).map(item => this.decorate(item))
      this.setData({
        directItems: reset ? list : this.data.directItems.concat(list),
        directPage: page, directTotal: data.total || 0
      })
      this.refreshEmpty()
    }).catch(error => {
      if (requestId !== this._directRequestId) return
      wx.showToast({ title: error.message || '加载失败', icon: 'none' })
      if (reset) {
        this.setData({ directItems: [], directPage: 1, directTotal: 0 })
        this.refreshEmpty()
      }
    }).then(() => {
      if (requestId !== this._directRequestId) return
      this.setData({ directLoading: false })
    })
  },
  decorate(item) {
    const unit = (item.purchaseUnit || item.purchaseStandard || '').trim()
    const quantity = this.numberText(item.quantity)
    const planned = this.numberText(item.plannedQuantity)
    item.quantityText = quantity != null
      ? quantity + (unit ? ' ' + unit : '')
      : planned != null
        ? '计划 ' + planned + (unit ? ' ' + unit : '')
        : '—'
    item.priceText = this.moneyText(item.purchasePrice)
    item.subtotalText = this.moneyText(item.purchaseSubtotal)
    if (!item.timeText) item.timeText = item.purchaseTimeText || '时间未记录'
    // 规格优先本次采购填写/锁定的规格，其次才回退商品默认单位
    if (!item.specText) item.specText = (item.purchaseStandard || item.purchaseUnit || item.goodsStandard || '').trim()
    return item
  },
  numberText(value) {
    if (value == null || value === '') return null
    const number = Number(value)
    return isFinite(number) ? String(number) : null
  },
  moneyText(value) {
    const text = this.numberText(value)
    return text == null ? '—' : '¥' + text
  },
  refreshEmpty() {
    const count = this.data.showDirect ? this.data.total + this.data.directTotal : this.data.total
    this.setData({ listEmpty: count === 0 })
  },
  more() {
    if (this.data.batchLoading || this.data.directLoading) return
    const canBatch = this.data.items.length < this.data.total
    const canDirect = this.data.showDirect && this.data.directItems.length < this.data.directTotal
    if (!canBatch && !canDirect) return
    // 两个分区各自分页；若都能继续加载则轮换，避免订货批次一直占用加载导致直接采购第二页永远不出来
    const loadDirectFirst = canDirect && (!canBatch || this._lastMore === 'batch')
    if (loadDirectFirst) {
      this._lastMore = 'direct'
      this.loadDirect(false)
    } else if (canBatch) {
      this._lastMore = 'batch'
      this.loadBatches(false)
    }
  },
  openBatch(event) {
    wx.navigateTo({ url: '/subPackage/pages/management/purchaseManagement/purchaseBatchDetail/purchaseBatchDetail?batchId=' + event.currentTarget.dataset.id })
  }
})

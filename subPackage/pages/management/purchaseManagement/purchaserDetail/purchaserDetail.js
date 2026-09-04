import { getPurchaseManagementPurchaser, getPurchaseManagementPurchaserBatches } from '../../../../../lib/apiDistributer.js'

const app = getApp()

Page({
  data: {
    navBarHeight: 0, purchaserId: 0, startDate: '', stopDate: '', detail: {}, items: [],
    demandSource: '', procurementMode: '', page: 1, total: 0,
    loading: false, batchLoading: false, error: ''
  },
  onLoad(options) {
    this.setData({
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      purchaserId: Number(options.purchaserId), startDate: options.startDate || '', stopDate: options.stopDate || ''
    })
    this.load()
  },
  toBack() { wx.navigateBack({ delta: 1 }) },
  chooseSource(event) {
    this.setData({ demandSource: event.currentTarget.dataset.value || '' })
    this.loadBatches(true)
  },
  chooseMode(event) {
    this.setData({ procurementMode: event.currentTarget.dataset.value || '' })
    this.loadBatches(true)
  },
  load() {
    this.setData({ loading: true, error: '' })
    const query = { startDate: this.data.startDate, stopDate: this.data.stopDate }
    Promise.all([
      getPurchaseManagementPurchaser(this.data.purchaserId, query),
      getPurchaseManagementPurchaserBatches(this.data.purchaserId, Object.assign({ page: 1, pageSize: 20 }, query))
    ]).then(all => {
      const detailBody = all[0].result || {}, batchBody = all[1].result || {}
      if (detailBody.code !== 0 || batchBody.code !== 0) throw new Error(detailBody.msg || batchBody.msg || '加载失败')
      const batchData = batchBody.data || {}
      this.setData({ detail: detailBody.data || {}, items: batchData.items || [], page: 1, total: batchData.total || 0 })
    }).catch(error => this.setData({ error: error.message || '加载失败' }))
      .then(() => this.setData({ loading: false }))
  },
  loadBatches(reset) {
    if (this.data.batchLoading) return
    const page = reset ? 1 : this.data.page
    this.setData({ batchLoading: true })
    getPurchaseManagementPurchaserBatches(this.data.purchaserId, {
      startDate: this.data.startDate, stopDate: this.data.stopDate, page, pageSize: 20,
      demandSource: this.data.demandSource, procurementMode: this.data.procurementMode
    }).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw new Error(body.msg || '加载失败')
      const data = body.data || {}
      this.setData({ items: reset ? (data.items || []) : this.data.items.concat(data.items || []), page, total: data.total || 0 })
    }).catch(error => wx.showToast({ title: error.message || '加载失败', icon: 'none' }))
      .then(() => this.setData({ batchLoading: false }))
  },
  more() {
    if (!this.data.batchLoading && this.data.items.length < this.data.total) {
      this.setData({ page: this.data.page + 1 })
      this.loadBatches(false)
    }
  },
  openBatch(event) {
    wx.navigateTo({ url: '/subPackage/pages/management/purchaseManagement/purchaseBatchDetail/purchaseBatchDetail?batchId=' + event.currentTarget.dataset.id })
  }
})

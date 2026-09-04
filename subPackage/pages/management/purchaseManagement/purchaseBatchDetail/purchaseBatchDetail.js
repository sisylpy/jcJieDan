import { getPurchaseManagementBatch } from '../../../../../lib/apiDistributer.js'

const app = getApp()

Page({
  data: { navBarHeight: 0, batchId: 0, detail: { lines: [], stockBatches: [], timeline: [] }, loading: false, error: '' },
  onLoad(options) {
    this.setData({ navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR, batchId: Number(options.batchId) })
    this.load()
  },
  toBack() { wx.navigateBack({ delta: 1 }) },
  load() {
    this.setData({ loading: true, error: '' })
    getPurchaseManagementBatch(this.data.batchId).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw new Error(body.msg || '加载失败')
      this.setData({ detail: Object.assign({ lines: [], stockBatches: [], timeline: [] }, body.data || {}) })
    }).catch(error => this.setData({ error: error.message || '加载失败' }))
      .then(() => this.setData({ loading: false }))
  },
  openStock(event) {
    const id = event.currentTarget.dataset.id
    if (id) wx.navigateTo({ url: '/subPackage/pages/shelf/inventoryBatchBusiness/inventoryBatchBusiness?stockBatchId=' + id })
  }
})

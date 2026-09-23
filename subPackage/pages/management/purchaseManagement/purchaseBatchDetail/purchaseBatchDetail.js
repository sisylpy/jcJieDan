import { getPurchaseManagementBatch } from '../../../../../lib/apiDistributer.js'

const app = getApp()
const PURCHASE_APP_ID = 'wx1ea78d3f33234284'

Page({
  data: { navBarHeight: 0, batchId: 0, detail: { lines: [], stockBatches: [], timeline: [] }, loading: false, error: '' },
  onLoad(options) {
    this.setData({ navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR, batchId: Number(options.batchId) })
    this.load()
  },
  toBack() { wx.navigateBack({ delta: 1 }) },
  retry() { this.load() },
  load() {
    if (!this.data.batchId || this.data.loading) return
    this.setData({ loading: true, error: '' })
    getPurchaseManagementBatch(this.data.batchId).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw new Error(body.msg || '采购批次详情加载失败')
      const detail = Object.assign({ lines: [], stockBatches: [], timeline: [] }, body.data || {})
      detail.lines = (detail.lines || []).map(item => Object.assign({}, item, { sourceExpanded: false }))
      this.setData({ detail })
    }).catch(error => this.setData({ error: error.message || '采购批次详情加载失败' }))
      .then(() => this.setData({ loading: false }))
  },
  toggleSource(event) {
    const id = Number(event.currentTarget.dataset.id)
    const lines = (this.data.detail.lines || []).map(item => item.purchaseGoodsId === id
      ? Object.assign({}, item, { sourceExpanded: !item.sourceExpanded }) : item)
    this.setData({ 'detail.lines': lines })
  },
  openStock(event) {
    const id = event.currentTarget.dataset.id
    if (id) wx.navigateTo({ url: '/subPackage/pages/shelf/inventoryBatchBusiness/inventoryBatchBusiness?stockBatchId=' + id })
  },
  openBuyerConfirmation() {
    const detail = this.data.detail || {}
    if (!detail.buyerConfirmationRequired || !detail.batchId) return
    const path = '/pkgPurchase/pages/txs/disOrderBatch/disOrderBatch?batchId=' + encodeURIComponent(detail.batchId) +
      '&disId=' + encodeURIComponent(detail.distributerId || '') +
      '&purUserId=' + encodeURIComponent(detail.purchaserUserId || '') + '&fromBuyer=1&fromBoss=1'
    wx.navigateToMiniProgram({
      appId: PURCHASE_APP_ID,
      path,
      envVersion: 'trial',
      fail() { wx.showToast({ title: '暂时无法打开精彩订货', icon: 'none' }) }
    })
  }
})

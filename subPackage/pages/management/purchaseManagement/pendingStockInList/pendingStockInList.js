import { getPurchaseManagementPendingStockIns } from '../../../../../lib/apiDistributer.js'

const app = getApp()
const PAGE_SIZE = 20

Page({
  data: {
    navBarHeight: 0,
    items: [],
    page: 1,
    total: 0,
    loading: false,
    loadingMore: false,
    error: ''
  },

  onLoad() {
    this.setData({ navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR })
  },

  onShow() { this.load(true) },
  toBack() { wx.navigateBack({ delta: 1 }) },
  retry() { this.load(true) },

  load(reset) {
    if (this.data.loading || this.data.loadingMore) return
    const page = reset ? 1 : this.data.page + 1
    if (!reset && this.data.items.length >= this.data.total) return
    this.setData(reset ? { loading: true, error: '' } : { loadingMore: true, error: '' })
    getPurchaseManagementPendingStockIns({ page, pageSize: PAGE_SIZE }).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw new Error(body.msg || '待接收入库清单加载失败')
      const data = body.data || {}
      const rows = (data.items || []).map(item => this.decorate(item))
      this.setData({
        items: reset ? rows : this.data.items.concat(rows),
        page: Number(data.page || page),
        total: Number(data.total || 0)
      })
    }).catch(error => this.setData({ error: error.message || '待接收入库清单加载失败' }))
      .then(() => this.setData({ loading: false, loadingMore: false }))
  },

  decorate(item) {
    const unit = (item.purchaseUnit || '').trim()
    item.quantityText = this.numberText(item.quantity, unit)
    item.unitPriceText = this.moneyText(item.unitPrice, unit ? '/' + unit : '')
    item.amountText = this.moneyText(item.amount)
    item.purchaserText = item.purchaserName || '采购员待核对'
    item.shelfText = item.plannedShelfName ? '计划货架：' + item.plannedShelfName : '请在货架中选择接收位置'
    return item
  },

  numberText(value, unit) {
    if (value == null || value === '') return '—'
    const number = Number(value)
    return isFinite(number) ? String(number) + (unit || '') : '—'
  },

  moneyText(value, suffix) {
    if (value == null || value === '') return '金额待核对'
    const number = Number(value)
    return isFinite(number) ? '¥' + number.toFixed(2) + (suffix || '') : '金额待核对'
  },

  openShelf() {
    wx.navigateTo({ url: '/subPackage/pages/shelf/index/index?from=pendingStockIn' })
  },

  more() { this.load(false) }
})

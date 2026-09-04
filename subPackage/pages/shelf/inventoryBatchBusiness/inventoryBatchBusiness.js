import {
  getInventoryBatchBusiness,
  addInventoryBatchLossFact,
  changeInventoryBatchPrice,
  reverseInventoryBatchLossFact
} from '../../../../lib/apiDistributer.js'

const app = getApp()
const reasons = [
  { code: 'ROTTEN', label: '腐烂变质' }, { code: 'QUALITY_UNQUALIFIED', label: '品质不合格' },
  { code: 'HANDLING_DAMAGE', label: '搬运破损' }, { code: 'WAREHOUSE_STORAGE', label: '仓储保管' },
  { code: 'NATURAL_LOSS', label: '自然损耗' }, { code: 'OVERBUY_OR_SLOW_SALES', label: '采购过量或销售缓慢' },
  { code: 'INVENTORY_DIFFERENCE', label: '盘点差异' }, { code: 'OTHER', label: '其他' }
]
const attributions = [
  { code: 'SUPPLIER_QUALITY', label: '供货商品质' }, { code: 'PURCHASER_SELECTION', label: '采购员选货' },
  { code: 'PURCHASER_OVERBUY', label: '采购过量' }, { code: 'WAREHOUSE_STORAGE', label: '仓储保管' },
  { code: 'HANDLING_DAMAGE', label: '搬运损坏' }, { code: 'NORMAL_NATURAL', label: '正常自然损耗' },
  { code: 'SALES_SLOW', label: '销售缓慢' }, { code: 'UNATTRIBUTED', label: '暂不归责' }
]

Page({
  data: {
    navBarHeight: 0, stockBatchId: null, loading: false, detail: {},
    factTypes: [{ code: 'LOSS', label: '损耗' }, { code: 'DISCARD', label: '废弃' }], factTypeIndex: 0,
    reasons, reasonIndex: 0, attributions, attributionIndex: 7,
    quantity: '', note: '', newSellingPrice: '', priceReason: 'TAIL_STOCK_MARKDOWN', priceNote: '',
    expectedTailMargin: null, belowCost: false
  },
  onLoad(options) {
    this.setData({ navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR, stockBatchId: Number(options.stockBatchId) })
    this.loadDetail()
  },
  onPullDownRefresh() { this.loadDetail(true) },
  toBack() { wx.navigateBack({ delta: 1 }) },
  loadDetail(stopRefresh) {
    this.setData({ loading: true })
    getInventoryBatchBusiness(this.data.stockBatchId).then(res => {
      if (res.result && res.result.code === 0) this.setData({ detail: res.result.data || {} })
      else wx.showToast({ title: (res.result && res.result.msg) || '批次加载失败', icon: 'none' })
    }).catch(() => wx.showToast({ title: '批次加载失败', icon: 'none' }))
      .then(() => { this.setData({ loading: false }); if (stopRefresh) wx.stopPullDownRefresh() })
  },
  onFactTypeChange(e) { this.setData({ factTypeIndex: Number(e.detail.value) }) },
  onReasonChange(e) { this.setData({ reasonIndex: Number(e.detail.value) }) },
  onAttributionChange(e) { this.setData({ attributionIndex: Number(e.detail.value) }) },
  onQuantityInput(e) { this.setData({ quantity: e.detail.value }) },
  onNoteInput(e) { this.setData({ note: e.detail.value }) },
  onPriceInput(e) {
    const value = e.detail.value
    const price = Number(value), cost = Number(this.data.detail.unitCost || 0)
    const remaining = Number(this.data.detail.remainingQuantity || 0)
    this.setData({
      newSellingPrice: value,
      expectedTailMargin: value !== '' && Number.isFinite(price) ? ((price - cost) * remaining).toFixed(2) : null,
      belowCost: value !== '' && Number.isFinite(price) && price < cost
    })
  },
  onPriceReasonInput(e) { this.setData({ priceReason: e.detail.value }) },
  onPriceNoteInput(e) { this.setData({ priceNote: e.detail.value }) },
  submitLoss() {
    const quantity = Number(this.data.quantity)
    if (!(quantity > 0)) return wx.showToast({ title: '请输入正确数量', icon: 'none' })
    const data = {
      factType: this.data.factTypes[this.data.factTypeIndex].code, quantity,
      reasonCode: reasons[this.data.reasonIndex].code,
      attributionCode: attributions[this.data.attributionIndex].code, note: this.data.note
    }
    addInventoryBatchLossFact(this.data.stockBatchId, data, requestKey('loss')).then(res => {
      if (!res.result || res.result.code !== 0) throw new Error((res.result && res.result.msg) || '登记失败')
      this.setData({ quantity: '', note: '' }); wx.showToast({ title: '登记成功' }); this.loadDetail()
    }).catch(e => wx.showToast({ title: e.message || '登记失败', icon: 'none' }))
  },
  submitPrice() {
    const price = Number(this.data.newSellingPrice)
    if (!(price >= 0) || !this.data.priceReason) return wx.showToast({ title: '请填写价格和原因', icon: 'none' })
    changeInventoryBatchPrice(this.data.stockBatchId, {
      newSellingPrice: price, reasonCode: this.data.priceReason, note: this.data.priceNote
    }, requestKey('price')).then(res => {
      if (!res.result || res.result.code !== 0) throw new Error((res.result && res.result.msg) || '调价失败')
      const warning = res.result.data && res.result.data.warning
      this.setData({ newSellingPrice: '', priceNote: '', expectedTailMargin: null, belowCost: false }); wx.showToast({ title: warning || '调价成功', icon: 'none' }); this.loadDetail()
    }).catch(e => wx.showToast({ title: e.message || '调价失败', icon: 'none' }))
  },
  reverseFact(e) {
    const factId = e.currentTarget.dataset.factId
    wx.showModal({ title: '冲销事实', editable: true, placeholderText: '请输入冲销原因', success: result => {
      if (!result.confirm || !result.content) return
      reverseInventoryBatchLossFact(this.data.stockBatchId, factId, { reason: result.content }, requestKey('reverse'))
        .then(res => { if (!res.result || res.result.code !== 0) throw new Error((res.result && res.result.msg) || '冲销失败'); this.loadDetail() })
        .catch(e => wx.showToast({ title: e.message || '冲销失败', icon: 'none' }))
    } })
  },
  toPerformance() { wx.navigateTo({ url: '/subPackage/pages/management/purchasePerformance/purchasePerformance' }) }
})

function requestKey(kind) { return kind + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10) }

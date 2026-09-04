import {
  getPurchaseReceiptSummary,
  confirmPurchaseReceipt,
  stockInPurchaseReceipt,
  returnPurchaseReceiptToSupplier
} from '../../../../lib/apiDistributer.js'

Page({
  data: {
    navBarHeight: 88,
    batchId: null,
    loading: true,
    submitting: false,
    summary: null,
    draft: []
  },

  onLoad(options) {
    const app = getApp()
    this.setData({
      navBarHeight: app.globalData.navBarHeight || 88,
      batchId: Number(options.batchId)
    })
    this.loadSummary()
  },

  toBack() { wx.navigateBack({ delta: 1 }) },

  requestKey(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
  },

  loadSummary() {
    if (!this.data.batchId) return
    this.setData({ loading: true })
    getPurchaseReceiptSummary(this.data.batchId).then((res) => {
      const result = res && res.result
      if (!result || result.code != 0) throw new Error((result && result.msg) || '加载失败')
      this.applySummary(result.data)
    }).catch((error) => {
      this.setData({ loading: false })
      wx.showToast({ title: error.message || '加载失败', icon: 'none' })
    })
  },

  applySummary(summary) {
    const draft = (summary.lines || []).map((line) => {
      const uom = line.defaultReceiptUom || line.baseUom || ''
      const factor = uom === line.cartonUom ? Number(line.itemsPerCarton || 0) : 1
      const remainingBase = Number(line.remainingBaseQuantity)
      const quantity = isFinite(remainingBase) && remainingBase > 0 && factor > 0
        ? String(Math.round((remainingBase / factor) * 1000000) / 1000000) : ''
      return {
        purchaseGoodsId: line.purchaseGoodsId,
        goodsName: line.goodsName,
        purchaseUom: uom,
        deliveredQuantity: quantity,
        acceptedQuantity: quantity,
        rejectedQuantity: '0',
        finalPurchaseUnitPrice: line.suggestedUnitPrice || '',
        note: '',
        source: line
      }
    })
    this.setData({ summary: summary, draft: draft, loading: false })
  },

  onNumberInput(e) {
    const index = Number(e.currentTarget.dataset.index)
    const field = e.currentTarget.dataset.field
    const value = String(e.detail.value || '').replace(/[^0-9.]/g, '')
    this.setData({ ['draft[' + index + '].' + field]: value })
  },

  onNoteInput(e) {
    this.setData({ ['draft[' + Number(e.currentTarget.dataset.index) + '].note']: e.detail.value || '' })
  },

  confirmReceipt() {
    if (this.data.submitting) return
    const lines = []
    for (const draft of this.data.draft) {
      const delivered = Number(draft.deliveredQuantity)
      const accepted = Number(draft.acceptedQuantity)
      const rejected = Number(draft.rejectedQuantity || 0)
      const price = Number(draft.finalPurchaseUnitPrice)
      if (!draft.purchaseUom || !isFinite(delivered) || delivered < 0 ||
          !isFinite(accepted) || accepted < 0 || !isFinite(rejected) || rejected < 0 ||
          Math.abs(delivered - accepted - rejected) > 0.000001 ||
          (accepted > 0 && (!isFinite(price) || price <= 0))) {
        wx.showToast({ title: (draft.goodsName || '商品') + '数量或价格不正确', icon: 'none' })
        return
      }
      if (delivered === 0 && accepted === 0 && rejected === 0) continue
      lines.push({
        purchaseGoodsId: draft.purchaseGoodsId,
        purchaseUom: draft.purchaseUom,
        deliveredQuantity: draft.deliveredQuantity,
        acceptedQuantity: draft.acceptedQuantity,
        rejectedQuantity: draft.rejectedQuantity || '0',
        finalPurchaseUnitPrice: accepted > 0 ? draft.finalPurchaseUnitPrice : '0',
        note: draft.note
      })
    }
    if (!lines.length) {
      wx.showToast({ title: '请填写本次收货数量', icon: 'none' })
      return
    }
    this.setData({ submitting: true })
    confirmPurchaseReceipt(this.data.batchId, { lines: lines }, this.requestKey('owner-receipt'))
      .then((res) => this.handleMutation(res, '本次收货已确认'))
      .catch((error) => this.handleError(error, '收货失败'))
  },

  stockIn(e) {
    const line = this.data.summary.lines[Number(e.currentTarget.dataset.lineIndex)]
    const event = line.receiptEvents[Number(e.currentTarget.dataset.eventIndex)]
    if (!event || Number(event.availableToPutawayQuantity) <= 0) return
    this.setData({ submitting: true })
    stockInPurchaseReceipt(this.data.batchId, {
      receiptLineId: event.receiptLineId,
      quantity: event.availableToPutawayQuantity,
      shelfId: line.applyShelfId || null,
      note: 'Owner确认入库'
    }, this.requestKey('owner-stock-in'))
      .then((res) => this.handleMutation(res, '入库成功'))
      .catch((error) => this.handleError(error, '入库失败'))
  },

  returnToSupplier(e) {
    const lineIndex = Number(e.currentTarget.dataset.lineIndex)
    const eventIndex = Number(e.currentTarget.dataset.eventIndex)
    const event = this.data.summary.lines[lineIndex].receiptEvents[eventIndex]
    const stockIndex = e.currentTarget.dataset.stockBatchIndex
    const stock = stockIndex === undefined ? null : event.stockBatches[Number(stockIndex)]
    wx.showModal({
      title: '退还供应商', editable: true,
      placeholderText: '数量（' + event.purchaseUom + '）',
      success: (quantityResult) => {
        if (!quantityResult.confirm || Number(quantityResult.content) <= 0) return
        wx.showModal({
          title: '退货原因', editable: true, placeholderText: '请填写原因',
          success: (reasonResult) => {
            if (!reasonResult.confirm || !String(reasonResult.content || '').trim()) return
            this.setData({ submitting: true })
            returnPurchaseReceiptToSupplier(this.data.batchId, {
              receiptLineId: event.receiptLineId,
              stockBatchId: stock ? stock.stockBatchId : null,
              quantity: quantityResult.content,
              reason: reasonResult.content
            }, this.requestKey('owner-return'))
              .then((res) => this.handleMutation(res, '退货事实已记录'))
              .catch((error) => this.handleError(error, '退货失败'))
          }
        })
      }
    })
  },

  handleMutation(res, message) {
    const result = res && res.result
    if (!result || result.code != 0) {
      this.handleError(new Error((result && result.msg) || message + '失败'), message + '失败')
      return
    }
    this.setData({ submitting: false })
    this.applySummary(result.data.summary)
    wx.showToast({ title: message, icon: 'success' })
  },

  handleError(error, fallback) {
    this.setData({ submitting: false })
    wx.showToast({ title: error.message || fallback, icon: 'none' })
  }
})

import { getPurchasePaymentLedger, getPurchaseFinancePayment, reversePurchaseFinancePayment,
  uploadPurchasePaymentVoucher, downloadPurchasePaymentVoucher, voidPurchasePaymentVoucher } from '../../../../../lib/apiDistributer.js'

const app = getApp()
const typeOptions = [
  { value: '', name: '全部用途' }, { value: 'PURCHASER_REIMBURSEMENT', name: '采购员报销' },
  { value: 'SUPPLIER_SETTLEMENT', name: '供应商货款' }, { value: 'COMPANY_DIRECT_PURCHASE', name: '公司直付采购' }
]
const recipientOptions = [
  { value: '', name: '全部收款对象' }, { value: 'PURCHASER', name: '采购员' },
  { value: 'SUPPLIER', name: '供应商' }, { value: 'PURCHASE_COUNTERPARTY', name: '采购交易方' }
]
const methodNames = { WECHAT: '微信', BANK_TRANSFER: '银行转账', CASH: '现金', OTHER: '其他' }
function two(value) { return String(value).padStart(2, '0') }
function day(date) { return date.getFullYear() + '-' + two(date.getMonth() + 1) + '-' + two(date.getDate()) }
function money(value) { const n = Number(value || 0); return Number.isFinite(n) ? n.toFixed(2) : '0.00' }
function responseData(response) { const body = response.result || {}; if (body.code !== 0) throw new Error(body.msg || '请求失败'); return body.data || {} }
function typeName(type) { const option = typeOptions.find(item => item.value === type); return option ? option.name : type }
function recipientName(type) { const option = recipientOptions.find(item => item.value === type); return option ? option.name : type }
function decoratePayment(item) {
  const amount = Number(item.paymentAmount || 0)
  return Object.assign({}, item, { amountText: money(Math.abs(amount)), directionName: amount < 0 ? '冲正' : '付款',
    typeName: typeName(item.businessType), recipientTypeName: recipientName(item.recipientType),
    methodName: methodNames[item.paymentMethod] || item.paymentMethod,
    voucherText: Number(item.voucherCount || 0) > 0 ? (item.voucherCount + '个凭证') : '缺付款凭证',
    confirmationText: item.confirmationStatus === 'CONFIRMED' ? '对方已确认到账'
      : (item.confirmationStatus === 'DISPUTED' ? '对方反馈有异议' : '已登记付款') })
}
function decorateDetail(data) {
  const detail = decoratePayment(data)
  const source = data.source || {}
  source.payableText = money(source.approvedAmount === null || source.approvedAmount === undefined ? source.payableAmount : source.approvedAmount)
  source.paidText = money(source.paidAmount)
  source.remainingText = money(source.remainingAmount)
  source.allocationText = money(source.allocationAmount)
  source.lines = (source.lines || []).map(line => Object.assign({}, line, {
    title: line.goodsName || ('采购商品 #' + line.purchaseGoodsId),
    amountText: money(line.payableAmount === undefined ? line.sourceAmount : line.payableAmount),
    meta: [line.purchaseBatchNo, line.businessDate, line.supplierName].filter(Boolean).join(' · ')
  }))
  detail.source = source
  detail.vouchers = data.vouchers || []
  return detail
}

Page({
  data: { navBarHeight: 0, loading: false, loadingMore: false, error: '', list: [], summary: {}, page: 1, pageSize: 20, hasMore: false,
    periodStart: '', periodEnd: '', keyword: '', typeIndex: 0, recipientIndex: 0, typeOptions, recipientOptions,
    detail: null, detailLoading: false, requestedPaymentId: null },
  onLoad(options) {
    options = options || {}
    const now = new Date()
    this.setData({ navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      periodStart: options.periodStart || day(new Date(now.getFullYear(), now.getMonth(), 1)),
      periodEnd: options.periodEnd || day(now), requestedPaymentId: options.paymentId ? Number(options.paymentId) : null })
    this.load(true)
  },
  toBack() { if (this.data.detail) return this.closeDetail(); wx.navigateBack() },
  query() {
    const query = { page: this.data.page, pageSize: this.data.pageSize, periodStart: this.data.periodStart, periodEnd: this.data.periodEnd }
    const type = typeOptions[this.data.typeIndex].value
    const recipientType = recipientOptions[this.data.recipientIndex].value
    if (type) query.businessType = type
    if (recipientType) query.recipientType = recipientType
    if (this.data.keyword.trim()) query.recipientKeyword = this.data.keyword.trim()
    return query
  },
  load(reset) {
    if (reset) this.setData({ page: 1, loading: true, error: '', list: [] })
    else this.setData({ loadingMore: true })
    return getPurchasePaymentLedger(this.query()).then(response => {
      const data = responseData(response)
      const items = (data.items || []).map(decoratePayment)
      const list = reset ? items : this.data.list.concat(items)
      this.setData({ list, summary: data.summary || {}, hasMore: list.length < Number(data.total || 0) })
      if (reset && this.data.requestedPaymentId) {
        const paymentId = this.data.requestedPaymentId
        this.setData({ requestedPaymentId: null })
        return this.openDetailById(paymentId)
      }
    }).catch(error => this.setData({ error: error.message || '付款记录加载失败' }))
      .then(() => this.setData({ loading: false, loadingMore: false }))
  },
  loadMore() { if (!this.data.loadingMore && this.data.hasMore) { this.setData({ page: this.data.page + 1 }); this.load(false) } },
  startDate(event) { this.setData({ periodStart: event.detail.value }); this.load(true) },
  endDate(event) { this.setData({ periodEnd: event.detail.value }); this.load(true) },
  typeChange(event) { this.setData({ typeIndex: Number(event.detail.value) }); this.load(true) },
  recipientChange(event) { this.setData({ recipientIndex: Number(event.detail.value) }); this.load(true) },
  keywordInput(event) { this.setData({ keyword: event.detail.value }) },
  search() { this.load(true) },
  clearFilters() {
    const now = new Date()
    this.setData({ typeIndex: 0, recipientIndex: 0, keyword: '', periodStart: day(new Date(now.getFullYear(), now.getMonth(), 1)), periodEnd: day(now) })
    this.load(true)
  },
  show(event) { this.openDetailById(event.currentTarget.dataset.id) },
  openDetailById(id) {
    this.setData({ detailLoading: true, error: '' })
    return getPurchaseFinancePayment(id).then(response => this.setData({ detail: decorateDetail(responseData(response)) }))
      .catch(error => wx.showToast({ title: error.message || '付款详情加载失败', icon: 'none' }))
      .then(() => this.setData({ detailLoading: false }))
  },
  closeDetail() { this.setData({ detail: null }) },
  noop() {},
  openSource() {
    const detail = this.data.detail
    if (!detail || !detail.source) return
    if (detail.sourceType === 'REIMBURSEMENT') {
      wx.navigateTo({ url: '/subPackage/pages/management/purchaseManagement/reimbursementList/reimbursementList?purchaserUserId=' + detail.source.purchaserUserId + '&batchId=' + detail.source.batchId })
    } else if (detail.sourceType === 'SETTLEMENT') {
      wx.navigateTo({ url: '/subPackage/pages/management/purchaseManagement/settlementList/settlementList?supplierRelationId=' + detail.source.supplierRelationId + '&batchId=' + detail.source.batchId })
    }
  },
  openVoucher(event) {
    const item = this.data.detail.vouchers[event.currentTarget.dataset.index]
    downloadPurchasePaymentVoucher(item.voucherId).then(path => {
      if ((item.contentType || '').indexOf('image/') === 0) wx.previewImage({ urls: [path] })
      else wx.openDocument({ filePath: path, showMenu: true })
    }).catch(error => wx.showToast({ title: error.message || '凭证打开失败', icon: 'none' }))
  },
  voidVoucher(event) {
    const item = this.data.detail.vouchers[event.currentTarget.dataset.index]
    wx.showModal({ title: '作废付款凭证', content: '凭证历史会保留，确认作废？', success: result => {
      if (result.confirm) voidPurchasePaymentVoucher(item.voucherId, { reason: '老板确认凭证上传错误' })
        .then(() => this.openDetailById(this.data.detail.paymentId))
    } })
  },
  reverse() {
    const payment = this.data.detail
    wx.showModal({ title: '确认冲正', content: '将追加一条反向付款事实，原记录不会删除。', success: result => {
      if (result.confirm) reversePurchaseFinancePayment(payment.paymentId, { reason: '老板端付款冲正' }, 'boss-reverse-' + Date.now())
        .then(() => { this.setData({ detail: null }); this.load(true) })
    } })
  },
  upload() {
    const payment = this.data.detail
    wx.chooseMedia({ count: 1, mediaType: ['image'], success: result => {
      const file = result.tempFiles && result.tempFiles[0]
      if (file) uploadPurchasePaymentVoucher(payment.paymentId, file.tempFilePath, 'boss-voucher-' + Date.now())
        .then(() => this.openDetailById(payment.paymentId))
    } })
  }
})

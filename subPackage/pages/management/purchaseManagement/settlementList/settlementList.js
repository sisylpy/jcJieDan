import {
  getPurchaseFundingSources,
  getPurchaseFundingAllocations,
  getSupplierSettlements,
  getSupplierSettlement,
  createSupplierSettlement,
  submitSupplierSettlement,
  reviewSupplierSettlement,
  recordPurchaseFinancePayment,
  getPurchaseFinancePayments,
  getPurchasePaymentVouchers,
  uploadPurchasePaymentVoucher,
  downloadPurchasePaymentVoucher
} from '../../../../../lib/apiDistributer.js'
import { getSupplierSettlementPeople } from '../../../../../lib/apiSupplierSettlement.js'

const app = getApp()
const reviewNames = { DRAFT: '待提交', SUBMITTED: '待审核', APPROVED: '已核定', REJECTED: '已驳回', VOIDED: '已作废' }
const confirmationNames = { PENDING: '待供应商核对', CONFIRMED: '供应商已核对', DISPUTED: '供应商有异议', NOT_AVAILABLE: '无需线上核对' }
const paymentNames = { UNPAID: '未付款', PARTIALLY_PAID: '部分付款', PAID: '已付清', REVERSED: '已冲正' }
const methodNames = { WECHAT: '微信', BANK_TRANSFER: '银行转账', CASH: '现金', OTHER: '其他' }
const methods = [
  { value: 'WECHAT', name: '微信' }, { value: 'BANK_TRANSFER', name: '银行转账' },
  { value: 'CASH', name: '现金' }, { value: 'OTHER', name: '其他' }
]

function money(value) {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number.toFixed(2) : '0.00'
}
function responseData(response) {
  const body = response.result || {}
  if (body.code !== 0) throw new Error(body.msg || '请求失败')
  return body.data
}
function consumed(value) { return value === true || value === 1 || value === '1' || value === 'true' }
function two(value) { return String(value).padStart(2, '0') }
function today() {
  const d = new Date()
  return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate())
}
function paidAt(date) {
  const now = new Date()
  return date + ' ' + two(now.getHours()) + ':' + two(now.getMinutes()) + ':' + two(now.getSeconds())
}
function decorateSupplier(item) {
  const available = Number(item.availableAmount || 0)
  const pending = Number(item.pendingBatchAmount || 0)
  const outstanding = Number(item.outstandingAmount || 0)
  const verify = Number(item.amountToVerify || 0)
  return Object.assign({}, item, {
    supplierLabel: item.supplierName || '供应商名称待补全',
    availableText: money(available), pendingText: money(pending), outstandingText: money(outstanding),
    verifyText: money(verify), paidText: money(item.paidAmount),
    hasWork: available + pending + outstanding + verify > 0
  })
}
function decorateAllocation(item) {
  return Object.assign({}, item, {
    checked: false,
    goodsLabel: item.goodsName || '商品名称待补全',
    sourceLabel: [item.batchNo, item.businessDate].filter(Boolean).join(' · '),
    amountText: money(item.allocationAmount)
  })
}
function decorateLine(item) {
  const quantity = item.actualQuantity === null || item.actualQuantity === undefined ? '—' : Number(item.actualQuantity)
  const price = item.unitPrice === null || item.unitPrice === undefined ? '—' : money(item.unitPrice)
  return Object.assign({}, item, {
    goodsLabel: item.goodsName || '商品名称待补全',
    sourceLabel: [item.purchaseBatchNo, item.businessDate].filter(Boolean).join(' · '),
    quantityText: quantity === '—' ? quantity : quantity + (item.actualUom || ''),
    unitPriceText: price === '—' ? price : ('¥' + price + '/' + (item.actualUom || '单位')),
    subtotalText: money(item.sourceSubtotal === undefined ? item.sourceAmount : item.sourceSubtotal),
    payableText: money(item.payableAmount)
  })
}
function decoratePayment(item) {
  return Object.assign({}, item, {
    amountText: money(item.paymentAmount), methodText: methodNames[item.paymentMethod] || item.paymentMethod,
    confirmationText: item.confirmationStatus === 'CONFIRMED' ? '供应商已确认到账'
      : (item.confirmationStatus === 'DISPUTED' ? '供应商有异议' : '买方已登记，待确认到账'),
    hasVoucher: Number(item.voucherCount || 0) > 0
  })
}
function decorateSettlement(item) {
  const approved = item.approvedAmount === null || item.approvedAmount === undefined ? item.payableAmount : item.approvedAmount
  const remaining = Number(item.remainingAmount || 0)
  return Object.assign({}, item, {
    supplierLabel: item.supplierName || '供应商名称待补全',
    goodsLabel: item.goodsSummary || '查看来源商品',
    reviewText: reviewNames[item.reviewStatus] || item.reviewStatus,
    confirmationText: confirmationNames[item.confirmationStatus] || item.confirmationStatus,
    paymentText: paymentNames[item.paymentStatus] || item.paymentStatus,
    payableText: money(approved), paidText: money(item.paidAmount), remainingText: money(remaining),
    canPay: item.reviewStatus === 'APPROVED' &&
      (item.confirmationStatus === 'CONFIRMED' || item.confirmationStatus === 'NOT_AVAILABLE') && remaining > 0,
    waitingSupplier: item.reviewStatus === 'APPROVED' && item.confirmationStatus === 'PENDING',
    voided: item.reviewStatus === 'VOIDED'
  })
}

Page({
  data: {
    navBarHeight: 0, loading: false, error: '', suppliers: [], supplier: null, tab: 'sources',
    periodStart: '', periodEnd: '', allocations: [], reviewSources: [], list: [], payments: [],
    selected: [], selectedAmountText: '0.00', creating: false, createRequestKey: '',
    detail: null, detailLoading: false, payBatch: null, payAmount: '', payDate: '',
    payMethodIndex: 0, methods, paying: false, paymentRequestKey: '',
    pendingVoucherPath: '', pendingVoucherName: '', vouchers: [], voucherPayment: null
  },

  onLoad() {
    this.setData({ navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR, payDate: today() })
    this.loadSuppliers()
  },
  toBack() {
    if (this.data.detail) return this.setData({ detail: null, vouchers: [], voucherPayment: null })
    if (this.data.supplier) {
      this.setData({ supplier: null, allocations: [], reviewSources: [], list: [], payments: [], error: '' })
      return this.loadSuppliers()
    }
    wx.navigateBack()
  },
  retry() { this.data.supplier ? this.loadSupplier() : this.loadSuppliers() },
  loadSuppliers() {
    this.setData({ loading: true, error: '' })
    getSupplierSettlementPeople({ pageSize: 100 }).then(response => {
      this.setData({ suppliers: (responseData(response) || []).map(decorateSupplier) })
    }).catch(error => this.setData({ error: error.message || '供应商结算加载失败' }))
      .then(() => this.setData({ loading: false }))
  },
  openSupplier(event) {
    const supplier = this.data.suppliers.find(item => Number(item.supplierRelationId) === Number(event.currentTarget.dataset.id))
    if (!supplier) return
    this.setData({ supplier, tab: 'sources', detail: null })
    this.loadSupplier()
  },
  switchTab(event) { this.setData({ tab: event.currentTarget.dataset.tab, detail: null }) },
  startDate(event) { this.setData({ periodStart: event.detail.value }); this.loadSupplier() },
  endDate(event) { this.setData({ periodEnd: event.detail.value }); this.loadSupplier() },
  clearDates() { this.setData({ periodStart: '', periodEnd: '' }); this.loadSupplier() },
  loadSupplier() {
    const supplier = this.data.supplier
    if (!supplier) return this.loadSuppliers()
    const filter = { supplierRelationId: supplier.supplierRelationId, pageSize: 100 }
    if (this.data.periodStart) filter.periodStart = this.data.periodStart
    if (this.data.periodEnd) filter.periodEnd = this.data.periodEnd
    this.setData({ loading: true, error: '' })
    return Promise.all([
      getPurchaseFundingAllocations(Object.assign({ fundingType: 'SUPPLIER_CREDIT' }, filter)),
      getSupplierSettlements({ supplierRelationId: supplier.supplierRelationId, pageSize: 100 }),
      getPurchaseFinancePayments(Object.assign({ businessType: 'SUPPLIER_SETTLEMENT', recipientId: supplier.supplierRelationId }, filter)),
      getPurchaseFundingSources(Object.assign({ onlyAvailable: true }, filter))
    ]).then(responses => {
      const allocations = (responseData(responses[0]) || []).filter(item => item.status === 'ACTIVE' && !consumed(item.consumed)).map(decorateAllocation)
      this.setData({ allocations,
        list: (responseData(responses[1]) || []).map(decorateSettlement),
        payments: (responseData(responses[2]) || []).map(decoratePayment),
        reviewSources: responseData(responses[3]) || [],
        selected: [], selectedAmountText: '0.00', createRequestKey: '' })
    }).catch(error => this.setData({ error: error.message || '供应商详情加载失败' }))
      .then(() => this.setData({ loading: false }))
  },
  toggle(event) {
    const id = Number(event.currentTarget.dataset.id)
    const allocations = this.data.allocations.map(item => Number(item.allocationId) === id ? Object.assign({}, item, { checked: !item.checked }) : item)
    const checked = allocations.filter(item => item.checked)
    this.setData({ allocations, selected: checked.map(item => Number(item.allocationId)),
      selectedAmountText: money(checked.reduce((sum, item) => sum + Number(item.allocationAmount || 0), 0)), createRequestKey: '' })
  },
  create() {
    if (this.data.creating || !this.data.supplier) return
    if (!this.data.selected.length) return wx.showToast({ title: '请选择待结采购', icon: 'none' })
    const key = this.data.createRequestKey || ('boss-sb-' + this.data.selected.slice().sort().join('-') + '-' + Date.now())
    this.setData({ creating: true, createRequestKey: key })
    createSupplierSettlement({ supplierRelationId: this.data.supplier.supplierRelationId, allocationIds: this.data.selected,
      periodStart: this.data.periodStart || null, periodEnd: this.data.periodEnd || null }, key)
      .then(responseData).then(() => { wx.showToast({ title: '结算单已生成', icon: 'success' }); return this.loadSupplier() })
      .catch(error => wx.showToast({ title: error.message || '生成失败', icon: 'none' }))
      .then(() => this.setData({ creating: false }))
  },
  openBatch(event) {
    const id = event.currentTarget.dataset.id
    this.setData({ detailLoading: true, detail: null, vouchers: [], voucherPayment: null })
    getSupplierSettlement(id).then(response => {
      const data = responseData(response) || {}
      data.lines = (data.lines || []).map(decorateLine)
      data.payments = (data.payments || []).map(decoratePayment)
      this.setData({ detail: decorateSettlement(data) })
    }).catch(error => wx.showToast({ title: error.message || '结算详情加载失败', icon: 'none' }))
      .then(() => this.setData({ detailLoading: false }))
  },
  closeDetail() { this.setData({ detail: null, vouchers: [], voucherPayment: null }) },
  submit(event) {
    submitSupplierSettlement(event.currentTarget.dataset.id, { reason: '老板提交外部供应商结算核定' })
      .then(responseData).then(() => { this.setData({ detail: null }); return this.loadSupplier() }).catch(error => wx.showToast({ title: error.message || '提交失败', icon: 'none' }))
  },
  review(event) {
    const state = event.currentTarget.dataset.state
    reviewSupplierSettlement(event.currentTarget.dataset.id, { reviewStatus: state,
      reason: state === 'APPROVED' ? '老板核对来源明细后通过' : (state === 'VOIDED' ? '老板作废结算单' : '来源明细需要调整') })
      .then(responseData).then(() => { this.setData({ detail: null }); return this.loadSupplier() }).catch(error => wx.showToast({ title: error.message || '处理失败', icon: 'none' }))
  },
  choosePay(event) {
    const batch = this.data.list.find(item => Number(item.batchId) === Number(event.currentTarget.dataset.id)) || this.data.detail
    if (!batch || !batch.canPay) return
    this.setData({ payBatch: batch, payAmount: batch.remainingText, payDate: today(), payMethodIndex: 0,
      paymentRequestKey: 'boss-pay-sb-' + batch.batchId + '-' + Date.now(),
      pendingVoucherPath: '', pendingVoucherName: '' })
  },
  closePay() {
    if (!this.data.paying) this.setData({ payBatch: null, payAmount: '', paymentRequestKey: '',
      pendingVoucherPath: '', pendingVoucherName: '' })
  },
  closeOverlay() { this.data.payBatch ? this.closePay() : this.closeVouchers() },
  amount(event) { this.setData({ payAmount: event.detail.value }) },
  paymentDate(event) { this.setData({ payDate: event.detail.value }) },
  paymentMethod(event) { this.setData({ payMethodIndex: Number(event.detail.value) }) },
  choosePaymentVoucher() {
    if (this.data.paying) return
    wx.chooseMedia({ count: 1, mediaType: ['image'], success: result => {
      const file = result.tempFiles && result.tempFiles[0]
      if (!file || !file.tempFilePath) return wx.showToast({ title: '未读取到付款截图', icon: 'none' })
      const parts = file.tempFilePath.split('/')
      this.setData({ pendingVoucherPath: file.tempFilePath, pendingVoucherName: parts[parts.length - 1] || '微信付款截图' })
    }, fail: error => {
      if (!error || String(error.errMsg || '').indexOf('cancel') < 0) wx.showToast({ title: '付款截图选择失败', icon: 'none' })
    } })
  },
  clearPaymentVoucher() {
    if (!this.data.paying) this.setData({ pendingVoucherPath: '', pendingVoucherName: '' })
  },
  pay() {
    if (this.data.paying || !this.data.payBatch) return
    const amount = Number(this.data.payAmount)
    if (!(amount > 0)) return wx.showToast({ title: '请输入本次付款金额', icon: 'none' })
    if (amount > Number(this.data.payBatch.remainingAmount || 0)) return wx.showToast({ title: '不能超过剩余金额', icon: 'none' })
    const method = this.data.methods[this.data.payMethodIndex]
    const voucherPath = this.data.pendingVoucherPath
    this.setData({ paying: true })
    recordPurchaseFinancePayment('SUPPLIER_SETTLEMENT', this.data.payBatch.batchId, {
      amount: money(amount), paymentMethod: method.value, paidAt: paidAt(this.data.payDate), reason: '老板登记外部供应商付款'
    }, this.data.paymentRequestKey).then(response => {
      const payment = decoratePayment(responseData(response) || {})
      this.setData({ payBatch: null, payAmount: '', paymentRequestKey: '', pendingVoucherPath: '',
        pendingVoucherName: '', detail: null })
      if (!voucherPath) {
        wx.showModal({ title: '付款已登记', content: '本次未上传凭证，可在付款记录中随时补传。',
          confirmText: '知道了', showCancel: false })
        return this.loadSupplier()
      }
      return this.uploadVoucherPath(payment, voucherPath).then(() => {
        wx.showToast({ title: '付款和凭证已登记', icon: 'success' })
      }).catch(error => {
        wx.showModal({ title: '付款已登记，凭证待补传',
          content: (error.message || '凭证上传失败') + '。付款记录已经保存，请到付款记录中重新上传。',
          confirmText: '知道了', showCancel: false })
      }).then(() => this.loadSupplier())
    }, error => wx.showToast({ title: error.message || '付款登记失败', icon: 'none' }))
      .then(() => this.setData({ paying: false }))
  },
  showVouchers(event) {
    const id = Number(event.currentTarget.dataset.id)
    const payment = ((this.data.detail && this.data.detail.payments) || []).concat(this.data.payments).find(item => Number(item.paymentId) === id)
    if (!payment) return
    getPurchasePaymentVouchers(id).then(response => this.setData({ voucherPayment: payment, vouchers: responseData(response) || [] }))
      .catch(error => wx.showToast({ title: error.message || '凭证加载失败', icon: 'none' }))
  },
  closeVouchers() { this.setData({ voucherPayment: null, vouchers: [] }) },
  uploadVoucher(event) {
    const id = Number(event.currentTarget.dataset.id)
    const payment = ((this.data.detail && this.data.detail.payments) || []).concat(this.data.payments).find(item => Number(item.paymentId) === id)
    if (payment) this.uploadVoucherFor(payment)
  },
  uploadVoucherFor(payment) {
    wx.chooseMedia({ count: 1, mediaType: ['image'], success: result => {
      this.uploadVoucherPath(payment, result.tempFiles[0].tempFilePath)
        .then(() => { wx.showToast({ title: '凭证已上传', icon: 'success' }); this.loadSupplier() })
        .catch(error => wx.showToast({ title: error.message || '凭证上传失败', icon: 'none' }))
    } })
  },
  uploadVoucherPath(payment, filePath) {
    return uploadPurchasePaymentVoucher(payment.paymentId, filePath,
      'boss-supplier-voucher-' + payment.paymentId + '-' + Date.now()).then(responseData)
  },
  openVoucher(event) {
    const voucher = this.data.vouchers[event.currentTarget.dataset.index]
    if (!voucher) return
    downloadPurchasePaymentVoucher(voucher.voucherId).then(path => {
      if ((voucher.contentType || '').indexOf('image/') === 0) wx.previewImage({ urls: [path] })
      else wx.openDocument({ filePath: path, showMenu: true })
    }).catch(error => wx.showToast({ title: error.message || '凭证打开失败', icon: 'none' }))
  }
})

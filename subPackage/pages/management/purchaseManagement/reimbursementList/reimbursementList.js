import {
  getPurchaseFundingAllocations,
  getPurchaserReimbursementPeople,
  getPurchaserReimbursements,
  getPurchaserReimbursement,
  createPurchaserReimbursement,
  submitPurchaserReimbursement,
  reviewPurchaserReimbursement,
  recordPurchaseFinancePayment,
  getPurchasePaymentVouchers,
  uploadPurchasePaymentVoucher,
  downloadPurchasePaymentVoucher
} from '../../../../../lib/apiDistributer.js'

const app = getApp()
const methods = ['BANK_TRANSFER', 'WECHAT', 'CASH', 'OTHER']
const methodNames = ['银行转账', '微信', '现金', '其他']
const reviewNames = { DRAFT: '待提交', SUBMITTED: '待核定', APPROVED: '已核定', REJECTED: '已驳回', VOIDED: '已作废' }
const paymentNames = { UNPAID: '未付款', PARTIALLY_PAID: '部分付款', PAID: '已付清', REVERSED: '已冲正' }

function money(value) {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number.toFixed(2) : '0.00'
}

function responseData(response) {
  const body = response.result || {}
  if (body.code !== 0) throw new Error(body.msg || '请求失败')
  return body.data
}

function dateParts(date) {
  const pad = value => String(value).padStart(2, '0')
  return {
    date: date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()),
    time: pad(date.getHours()) + ':' + pad(date.getMinutes())
  }
}

function decoratePerson(item) {
  return Object.assign({}, item, {
    displayName: item.purchaserName || ('采购员 #' + item.purchaserUserId),
    pendingConfirmationText: money(item.pendingConfirmationAmount),
    availableText: money(item.availableAmount),
    pendingReviewText: money(item.pendingReviewAmount),
    outstandingText: money(item.approvedOutstandingAmount),
    paidText: money(item.paidAmount)
  })
}

function decorateAllocation(item) {
  return Object.assign({}, item, {
    checked: false,
    amountText: money(item.allocationAmount),
    sourceTitle: item.goodsName || ('采购商品 #' + item.purchaseGoodsId),
    sourceMeta: [item.batchNo, item.businessDate, item.supplierName || '自采'].filter(Boolean).join(' · '),
    evidenceText: '依据：已确认采购员垫付' + (item.reason ? ' · ' + item.reason : '')
  })
}

function decorateBatch(item) {
  const approved = item.approvedAmount === null || item.approvedAmount === undefined ? item.payableAmount : item.approvedAmount
  return Object.assign({}, item, {
    reviewText: reviewNames[item.reviewStatus] || item.reviewStatus,
    paymentText: paymentNames[item.paymentStatus] || item.paymentStatus,
    payableText: money(item.payableAmount),
    approvedText: money(approved),
    paidText: money(item.paidAmount),
    remainingText: money(item.remainingAmount)
  })
}

Page({
  data: {
    navBarHeight: 0,
    loading: false,
    error: '',
    people: [],
    selectedPerson: null,
    allocations: [],
    pendingConfirmations: [],
    selectedAllocationIds: [],
    reimbursements: [],
    selectedBatch: null,
    vouchers: [],
    voucherPayment: null,
    creating: false,
    paying: false,
    payBatch: null,
    payAmount: '',
    payReason: '',
    methodIndex: 0,
    methods,
    methodNames,
    paidDate: '',
    paidTime: '',
    paymentRequestKey: '',
    lastPaymentId: null
  },

  onLoad() {
    this.setData({ navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR })
  },

  onShow() {
    this.loadPeople(true)
  },

  toBack() {
    if (this.data.selectedPerson) return this.closePerson()
    wx.navigateBack()
  },

  loadPeople(keepSelection) {
    this.setData({ loading: true, error: '' })
    return getPurchaserReimbursementPeople().then(response => {
      const people = (responseData(response) || []).map(decoratePerson)
      const selected = keepSelection && this.data.selectedPerson
        ? people.find(item => Number(item.purchaserUserId) === Number(this.data.selectedPerson.purchaserUserId))
        : null
      this.setData({ people, selectedPerson: selected || null })
      if (selected) return this.loadPerson(selected.purchaserUserId, false)
    }).catch(error => {
      this.setData({ error: error.message || '采购员报销加载失败' })
    }).then(() => this.setData({ loading: false }))
  },

  retry() { this.loadPeople(true) },

  selectPerson(event) {
    const person = this.data.people[event.currentTarget.dataset.index]
    if (!person) return
    this.setData({ selectedPerson: person, selectedBatch: null, payBatch: null, vouchers: [], voucherPayment: null })
    this.loadPerson(person.purchaserUserId, true)
  },

  closePerson() {
    this.setData({ selectedPerson: null, allocations: [], pendingConfirmations: [], reimbursements: [], selectedBatch: null, payBatch: null })
  },

  loadPerson(purchaserUserId, showLoading) {
    if (showLoading) this.setData({ loading: true, error: '' })
    const query = { purchaserUserId, pageSize: 100 }
    return Promise.all([
      getPurchaseFundingAllocations(Object.assign({ fundingType: 'PURCHASER_ADVANCE' }, query)),
      getPurchaserReimbursements(query)
    ]).then(responses => {
      const allocations = (responseData(responses[0]) || []).map(decorateAllocation)
      const reimbursements = (responseData(responses[1]) || []).map(decorateBatch)
      this.setData({
        allocations: allocations.filter(item => item.status === 'ACTIVE' && !item.consumed),
        pendingConfirmations: allocations.filter(item => item.status === 'PENDING_CONFIRMATION'),
        selectedAllocationIds: [],
        reimbursements
      })
      if (this.data.selectedBatch) {
        const exists = reimbursements.some(item => Number(item.batchId) === Number(this.data.selectedBatch.batchId))
        if (exists) return this.openBatchById(this.data.selectedBatch.batchId)
        this.setData({ selectedBatch: null })
      }
    }).catch(error => this.setData({ error: error.message || '采购员报销明细加载失败' }))
      .then(() => { if (showLoading) this.setData({ loading: false }) })
  },

  toggleAllocation(event) {
    const id = Number(event.currentTarget.dataset.id)
    const allocations = this.data.allocations.map(item => Number(item.allocationId) === id
      ? Object.assign({}, item, { checked: !item.checked }) : item)
    this.setData({ allocations, selectedAllocationIds: allocations.filter(item => item.checked).map(item => Number(item.allocationId)) })
  },

  createBatch() {
    if (this.data.creating) return
    if (!this.data.selectedAllocationIds.length) return wx.showToast({ title: '请选择可报销明细', icon: 'none' })
    const person = this.data.selectedPerson
    const requestKey = 'boss-rb-' + person.purchaserUserId + '-' + this.data.selectedAllocationIds.slice().sort().join('-') + '-' + Date.now()
    this.setData({ creating: true })
    createPurchaserReimbursement({ purchaserUserId: person.purchaserUserId, allocationIds: this.data.selectedAllocationIds }, requestKey)
      .then(response => {
        responseData(response)
        wx.showToast({ title: '报销批次已建立', icon: 'success' })
        return this.refreshCurrent()
      }).catch(error => wx.showToast({ title: error.message || '建立失败', icon: 'none' }))
      .then(() => this.setData({ creating: false }))
  },

  refreshCurrent() {
    return this.loadPeople(true)
  },

  openBatch(event) {
    this.openBatchById(event.currentTarget.dataset.id)
  },

  openBatchById(id) {
    return getPurchaserReimbursement(id).then(response => {
      const data = responseData(response) || {}
      const lines = (data.lines || []).filter(item => item.status === 'ACTIVE').map(item => Object.assign({}, item, {
        amountText: money(item.payableAmount),
        title: item.goodsName || ('采购商品 #' + item.purchaseGoodsId),
        meta: [item.purchaseBatchNo, item.businessDate, item.supplierName || '自采'].filter(Boolean).join(' · ')
      }))
      const payments = (data.payments || []).map(item => Object.assign({}, item, {
        amountText: money(item.paymentAmount),
        methodText: methodNames[methods.indexOf(item.paymentMethod)] || item.paymentMethod
      }))
      this.setData({ selectedBatch: Object.assign(decorateBatch(data), { lines, payments }), vouchers: [], voucherPayment: null })
    }).catch(error => wx.showToast({ title: error.message || '报销详情加载失败', icon: 'none' }))
  },

  closeBatch() {
    this.setData({ selectedBatch: null, vouchers: [], voucherPayment: null })
  },

  submitBatch(event) {
    submitPurchaserReimbursement(event.currentTarget.dataset.id, { reason: '老板汇总后提交核定' })
      .then(response => responseData(response)).then(() => this.refreshCurrent())
      .catch(error => wx.showToast({ title: error.message || '提交失败', icon: 'none' }))
  },

  reviewBatch(event) {
    const state = event.currentTarget.dataset.state
    const batch = this.data.reimbursements.find(item => Number(item.batchId) === Number(event.currentTarget.dataset.id)) || this.data.selectedBatch
    const request = { reviewStatus: state, reason: state === 'APPROVED' ? '老板核对垫付依据后通过' : '垫付依据需补充' }
    if (state === 'APPROVED') request.approvedAmount = batch.payableAmount
    reviewPurchaserReimbursement(batch.batchId, request).then(response => responseData(response))
      .then(() => this.refreshCurrent()).catch(error => wx.showToast({ title: error.message || '核定失败', icon: 'none' }))
  },

  openPayment(event) {
    const batch = this.data.reimbursements.find(item => Number(item.batchId) === Number(event.currentTarget.dataset.id)) || this.data.selectedBatch
    const now = dateParts(new Date())
    this.setData({
      payBatch: batch,
      payAmount: batch.remainingText,
      payReason: '',
      methodIndex: 0,
      paidDate: now.date,
      paidTime: now.time,
      paymentRequestKey: 'boss-pay-rb-' + batch.batchId + '-' + Date.now(),
      lastPaymentId: null
    })
  },

  closePayment() {
    if (this.data.paying) return
    this.setData({ payBatch: null, paymentRequestKey: '', lastPaymentId: null })
  },

  paymentAmount(event) { this.setData({ payAmount: event.detail.value }) },
  paymentReason(event) { this.setData({ payReason: event.detail.value }) },
  paymentMethod(event) { this.setData({ methodIndex: Number(event.detail.value) }) },
  paymentDate(event) { this.setData({ paidDate: event.detail.value }) },
  paymentTime(event) { this.setData({ paidTime: event.detail.value }) },

  recordPayment() {
    if (this.data.paying) return
    const amount = Number(this.data.payAmount)
    if (!(amount > 0)) return wx.showToast({ title: '请输入本次付款金额', icon: 'none' })
    if (amount > Number(this.data.payBatch.remainingAmount || 0)) return wx.showToast({ title: '不能超过剩余金额', icon: 'none' })
    this.setData({ paying: true })
    const payload = {
      amount: money(amount),
      paymentMethod: methods[this.data.methodIndex],
      paidAt: this.data.paidDate + ' ' + this.data.paidTime + ':00',
      reason: this.data.payReason || '老板登记采购员报销付款'
    }
    recordPurchaseFinancePayment('PURCHASER_REIMBURSEMENT', this.data.payBatch.batchId, payload, this.data.paymentRequestKey)
      .then(response => {
        const payment = responseData(response) || {}
        this.setData({ lastPaymentId: payment.paymentId })
        wx.showToast({ title: payment.idempotent ? '已确认原付款记录' : '付款记录已保存', icon: 'success' })
        return this.refreshCurrent()
      }).catch(error => wx.showToast({ title: error.message || '付款登记失败', icon: 'none' }))
      .then(() => this.setData({ paying: false }))
  },

  uploadLastVoucher() {
    const paymentId = this.data.lastPaymentId
    if (!paymentId) return
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      success: result => {
        const file = result.tempFiles && result.tempFiles[0]
        if (!file) return
        uploadPurchasePaymentVoucher(paymentId, file.tempFilePath, 'boss-voucher-' + paymentId + '-' + Date.now())
          .then(response => {
            responseData(response)
            wx.showToast({ title: '凭证已上传', icon: 'success' })
            this.setData({ payBatch: null, lastPaymentId: null })
          }).catch(error => wx.showToast({ title: error.message || '凭证上传失败', icon: 'none' }))
      }
    })
  },

  showVouchers(event) {
    const paymentId = Number(event.currentTarget.dataset.id)
    const payment = (this.data.selectedBatch.payments || []).find(item => Number(item.paymentId) === paymentId)
    getPurchasePaymentVouchers(paymentId).then(response => this.setData({ vouchers: responseData(response) || [], voucherPayment: payment }))
      .catch(error => wx.showToast({ title: error.message || '凭证加载失败', icon: 'none' }))
  },

  openVoucher(event) {
    const voucher = this.data.vouchers[event.currentTarget.dataset.index]
    if (!voucher || voucher.status !== 'ACTIVE') return
    downloadPurchasePaymentVoucher(voucher.voucherId).then(path => {
      if ((voucher.contentType || '').indexOf('image/') === 0) wx.previewImage({ urls: [path] })
      else wx.openDocument({ filePath: path, showMenu: true })
    }).catch(error => wx.showToast({ title: error.message || '凭证打开失败', icon: 'none' }))
  }
})

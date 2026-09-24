import {
  getPurchaseFundingAllocations,
  getSupplierSettlements,
  createSupplierSettlement,
  submitSupplierSettlement,
  reviewSupplierSettlement,
  recordPurchaseFinancePayment
} from '../../../../../lib/apiDistributer.js'

const app = getApp()
const reviewNames = { DRAFT: '待提交', SUBMITTED: '待审核', APPROVED: '已审核', REJECTED: '已驳回', VOIDED: '已作废' }
const confirmationNames = { PENDING: '待供应商确认', CONFIRMED: '供应商已确认', DISPUTED: '供应商有异议', NOT_AVAILABLE: '无需线上确认' }
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

function consumed(value) {
  return value === true || value === 1 || value === '1' || value === 'true'
}

function decorateAllocation(item) {
  return Object.assign({}, item, {
    checked: false,
    supplierLabel: item.supplierName || '供应商名称待补全',
    supplierMeta: item.supplierName ? '' : '供应关系 #' + item.supplierRelationId,
    goodsLabel: item.goodsName || '商品名称待补全',
    goodsMeta: [item.batchNo, item.businessDate, item.goodsName ? '' : ('采购商品 #' + item.purchaseGoodsId)].filter(Boolean).join(' · '),
    amountText: money(item.allocationAmount)
  })
}

function decorateSettlement(item) {
  const approved = item.approvedAmount === null || item.approvedAmount === undefined ? item.payableAmount : item.approvedAmount
  const remaining = Number(item.remainingAmount || 0)
  return Object.assign({}, item, {
    supplierLabel: item.supplierName || '供应商名称待补全',
    reviewText: reviewNames[item.reviewStatus] || item.reviewStatus,
    confirmationText: confirmationNames[item.confirmationStatus] || item.confirmationStatus,
    paymentText: paymentNames[item.paymentStatus] || item.paymentStatus,
    payableText: money(approved),
    paidText: money(item.paidAmount),
    remainingText: money(remaining),
    canPay: item.reviewStatus === 'APPROVED' &&
      (item.confirmationStatus === 'CONFIRMED' || item.confirmationStatus === 'NOT_AVAILABLE') && remaining > 0,
    waitingSupplier: item.reviewStatus === 'APPROVED' && item.confirmationStatus === 'PENDING',
    voided: item.reviewStatus === 'VOIDED'
  })
}

Page({
  data: {
    navBarHeight: 0,
    loading: false,
    error: '',
    allocations: [],
    list: [],
    selected: [],
    selectedSupplierId: null,
    selectedSupplierName: '',
    selectedAmountText: '0.00',
    creating: false,
    createRequestKey: '',
    payBatch: null,
    payAmount: '',
    paying: false,
    paymentRequestKey: ''
  },

  onLoad() {
    this.setData({ navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR })
    this.load()
  },

  toBack() { wx.navigateBack() },
  retry() { this.load() },

  load() {
    this.setData({ loading: true, error: '' })
    return Promise.all([
      getPurchaseFundingAllocations({ fundingType: 'SUPPLIER_CREDIT', pageSize: 100 }),
      getSupplierSettlements({ pageSize: 100 })
    ]).then(responses => {
      const allocations = (responseData(responses[0]) || [])
        .filter(item => item.status === 'ACTIVE' && !consumed(item.consumed))
        .map(decorateAllocation)
      const list = (responseData(responses[1]) || []).map(decorateSettlement)
      this.setData({
        allocations,
        list,
        selected: [],
        selectedSupplierId: null,
        selectedSupplierName: '',
        selectedAmountText: '0.00',
        createRequestKey: ''
      })
    }).catch(error => this.setData({ error: error.message || '供应商结算加载失败' }))
      .then(() => this.setData({ loading: false }))
  },

  toggle(event) {
    const id = Number(event.currentTarget.dataset.id)
    const target = this.data.allocations.find(item => Number(item.allocationId) === id)
    if (!target) return
    if (!target.checked && this.data.selectedSupplierId !== null &&
      Number(target.supplierRelationId) !== Number(this.data.selectedSupplierId)) {
      return wx.showToast({ title: '一次只能结算同一供应商', icon: 'none' })
    }
    const allocations = this.data.allocations.map(item => Number(item.allocationId) === id
      ? Object.assign({}, item, { checked: !item.checked }) : item)
    const checked = allocations.filter(item => item.checked)
    const amount = checked.reduce((total, item) => total + Number(item.allocationAmount || 0), 0)
    this.setData({
      allocations,
      selected: checked.map(item => Number(item.allocationId)),
      selectedSupplierId: checked.length ? checked[0].supplierRelationId : null,
      selectedSupplierName: checked.length ? checked[0].supplierLabel : '',
      selectedAmountText: money(amount),
      createRequestKey: ''
    })
  },

  create() {
    if (this.data.creating) return
    if (!this.data.selected.length) return wx.showToast({ title: '请选择账期明细', icon: 'none' })
    const key = this.data.createRequestKey || ('boss-sb-' + this.data.selected.slice().sort().join('-') + '-' + Date.now())
    this.setData({ creating: true, createRequestKey: key })
    createSupplierSettlement({
      supplierRelationId: this.data.selectedSupplierId,
      allocationIds: this.data.selected
    }, key).then(response => {
      responseData(response)
      wx.showToast({ title: '结算批次已建立', icon: 'success' })
      return this.load()
    }).catch(error => wx.showToast({ title: error.message || '建立失败', icon: 'none' }))
      .then(() => this.setData({ creating: false }))
  },

  submit(event) {
    submitSupplierSettlement(event.currentTarget.dataset.id, { reason: '老板提交供应商结算审核' })
      .then(responseData).then(() => this.load())
      .catch(error => wx.showToast({ title: error.message || '提交失败', icon: 'none' }))
  },

  review(event) {
    const state = event.currentTarget.dataset.state
    reviewSupplierSettlement(event.currentTarget.dataset.id, {
      reviewStatus: state,
      reason: state === 'APPROVED' ? '老板核对供应商账期后通过' : (state === 'VOIDED' ? '老板作废结算批次' : '账期明细需要调整')
    }).then(responseData).then(() => this.load())
      .catch(error => wx.showToast({ title: error.message || '处理失败', icon: 'none' }))
  },

  choosePay(event) {
    const batch = this.data.list.find(item => Number(item.batchId) === Number(event.currentTarget.dataset.id))
    if (!batch || !batch.canPay) return
    this.setData({
      payBatch: batch,
      payAmount: batch.remainingText,
      paymentRequestKey: 'boss-pay-sb-' + batch.batchId + '-' + Date.now()
    })
  },

  closePay() {
    if (this.data.paying) return
    this.setData({ payBatch: null, payAmount: '', paymentRequestKey: '' })
  },

  amount(event) { this.setData({ payAmount: event.detail.value }) },

  pay() {
    if (this.data.paying || !this.data.payBatch) return
    const amount = Number(this.data.payAmount)
    if (!(amount > 0)) return wx.showToast({ title: '请输入本次付款金额', icon: 'none' })
    if (amount > Number(this.data.payBatch.remainingAmount || 0)) {
      return wx.showToast({ title: '不能超过剩余金额', icon: 'none' })
    }
    this.setData({ paying: true })
    recordPurchaseFinancePayment('SUPPLIER_SETTLEMENT', this.data.payBatch.batchId, {
      amount: money(amount),
      paymentMethod: 'BANK_TRANSFER',
      reason: '老板登记供应商结算付款'
    }, this.data.paymentRequestKey).then(response => {
      responseData(response)
      wx.showToast({ title: '付款记录已保存', icon: 'success' })
      this.setData({ payBatch: null, payAmount: '', paymentRequestKey: '' })
      return this.load()
    }).catch(error => wx.showToast({ title: error.message || '付款失败', icon: 'none' }))
      .then(() => this.setData({ paying: false }))
  }
})

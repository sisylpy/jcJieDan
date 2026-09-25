import { getPurchaseFinanceOverview } from '../../../../../lib/apiDistributer.js'

const app = getApp()
function two(value) { return String(value).padStart(2, '0') }
function dateText(date) { return date.getFullYear() + '-' + two(date.getMonth() + 1) + '-' + two(date.getDate()) }
function money(value) { const n = Number(value || 0); return Number.isFinite(n) ? n.toFixed(2) : '0.00' }
function responseData(response) {
  const body = response.result || {}
  if (body.code !== 0) throw new Error(body.msg || '加载失败')
  return body.data || {}
}
function decoratePerson(item) {
  return Object.assign({}, item, { displayName: item.purchaserName || ('采购员 #' + item.purchaserUserId),
    availableText: money(item.availableAmount), outstandingText: money(item.approvedOutstandingAmount),
    pendingReviewText: money(item.pendingReviewAmount), pendingConfirmationText: money(item.pendingConfirmationAmount) })
}
function decorateSupplier(item) {
  return Object.assign({}, item, { displayName: item.supplierName || ('供应商 #' + item.supplierRelationId),
    availableText: money(item.availableAmount), outstandingText: money(item.outstandingAmount),
    pendingBatchText: money(item.pendingBatchAmount), verifyText: money(item.amountToVerify) })
}
function decoratePayment(item) {
  const typeName = item.businessType === 'PURCHASER_REIMBURSEMENT' ? '采购员报销'
    : (item.businessType === 'SUPPLIER_SETTLEMENT' ? '供应商货款' : '公司直付采购')
  const methodName = { WECHAT: '微信', BANK_TRANSFER: '银行转账', CASH: '现金', OTHER: '其他' }[item.paymentMethod] || item.paymentMethod
  return Object.assign({}, item, { typeName, methodName, amountText: money(item.paymentAmount) })
}

Page({
  data: { navBarHeight: 0, loading: false, error: '', summary: {}, purchasers: [], suppliers: [], recentPayments: [],
    periodStart: '', periodEnd: '', purchaserAvailableText: '0.00', purchaserOutstandingText: '0.00',
    supplierAvailableText: '0.00', supplierOutstandingText: '0.00' },
  onLoad() {
    const today = new Date()
    this.setData({ navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      periodStart: dateText(new Date(today.getFullYear(), today.getMonth(), 1)), periodEnd: dateText(today) })
    this.load()
  },
  onShow() { if (this.loaded) this.load(); this.loaded = true },
  toBack() { wx.navigateBack() },
  startDate(event) { this.setData({ periodStart: event.detail.value }); this.load() },
  endDate(event) { this.setData({ periodEnd: event.detail.value }); this.load() },
  load() {
    this.setData({ loading: true, error: '' })
    return getPurchaseFinanceOverview({ periodStart: this.data.periodStart, periodEnd: this.data.periodEnd }).then(response => {
      const summary = responseData(response)
      const purchasers = (summary.purchasers || []).map(decoratePerson)
      const suppliers = (summary.suppliers || []).map(decorateSupplier)
      this.setData({ summary, purchasers, suppliers, recentPayments: (summary.recentPayments || []).map(decoratePayment),
        purchaserAvailableText: money(summary.pendingReimbursementAmount),
        purchaserOutstandingText: money(summary.reimbursementOutstandingAmount),
        supplierAvailableText: money(summary.pendingSettlementAmount),
        supplierOutstandingText: money(summary.settlementOutstandingAmount) })
    }).catch(error => this.setData({ error: error.message || '采购资金加载失败' }))
      .then(() => this.setData({ loading: false }))
  },
  retry() { this.load() },
  openPurchaser(event) {
    const id = event.currentTarget.dataset.id
    const suffix = id ? ('?purchaserUserId=' + id) : ''
    wx.navigateTo({ url: '/subPackage/pages/management/purchaseManagement/reimbursementList/reimbursementList' + suffix })
  },
  openSupplier(event) {
    const id = event.currentTarget.dataset.id
    const suffix = id ? ('?supplierRelationId=' + id) : ''
    wx.navigateTo({ url: '/subPackage/pages/management/purchaseManagement/settlementList/settlementList' + suffix })
  },
  openPayments(event) {
    const paymentId = event.currentTarget.dataset.id
    let url = '/subPackage/pages/management/purchaseManagement/paymentList/paymentList?periodStart=' + this.data.periodStart + '&periodEnd=' + this.data.periodEnd
    if (paymentId) url += '&paymentId=' + paymentId
    wx.navigateTo({ url })
  },
  openFunding() { wx.navigateTo({ url: '/subPackage/pages/management/purchaseManagement/fundingClassification/fundingClassification' }) },
  openExceptions() { wx.navigateTo({ url: '/subPackage/pages/management/purchaseManagement/financeExceptionList/financeExceptionList' }) }
})

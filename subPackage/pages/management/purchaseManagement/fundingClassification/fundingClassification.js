import {
  getPurchaseFundingSources,
  classifyPurchaseFunding,
  getPurchaseFundingAllocations,
  confirmPurchaseFundingAllocation,
  recordPurchaseFinancePayment
} from '../../../../../lib/apiDistributer.js'

const app = getApp()
const types = ['PURCHASER_ADVANCE', 'SUPPLIER_CREDIT', 'COMPANY_DIRECT', 'INTERNAL_TRANSFER']
const names = ['采购员垫付', '供应商账期', '公司直付', '内部调拨']
const methods = ['WECHAT', 'BANK_TRANSFER', 'CASH', 'OTHER']
const methodNames = ['微信', '银行转账', '现金', '其他']
const statusNames = { ACTIVE: '已归类', PENDING_CONFIRMATION: '待老板确认', REJECTED: '已驳回' }

function money(value) {
  const number = Number(value || 0)
  return Number.isFinite(number) ? number.toFixed(2) : '0.00'
}
function responseData(response) {
  const body = response.result || {}
  if (body.code !== 0) throw new Error(body.msg || '请求失败')
  return body.data || []
}
function decorateSource(item) {
  const available = Number(item.availableAmount || 0)
  const actual = Number(item.actualNetAmount || 0)
  return Object.assign({}, item, {
    goodsLabel: item.goodsName || ('采购商品 #' + item.purchaseGoodsId),
    purchaserLabel: item.purchaserName || (item.purchaserUserId ? ('采购员 #' + item.purchaserUserId) : '未关联采购员'),
    supplierLabel: item.supplierName || (item.supplierRelationId ? ('供应商 #' + item.supplierRelationId) : '无外部供应商'),
    availableText: money(available), actualText: money(actual), allocatedText: money(Math.max(actual - available, 0)),
    classified: available <= 0
  })
}
function decorateAllocation(item) {
  const typeIndex = types.indexOf(item.fundingType)
  return Object.assign({}, item, {
    goodsLabel: item.goodsName || ('采购商品 #' + item.purchaseGoodsId),
    typeName: typeIndex >= 0 ? names[typeIndex] : item.fundingType,
    statusName: statusNames[item.status] || item.status,
    amountText: money(item.allocationAmount), directPaidText: money(item.directPaidAmount),
    directRemainingText: money(item.directRemainingAmount)
  })
}
function sourceList(tab, sources, unclassified) {
  if (tab === 'all') return sources
  if (tab === 'unclassified') return unclassified
  return []
}

Page({
  data: {
    navBarHeight: 0, loading: false, error: '', activeTab: 'unclassified',
    allSources: [], unclassifiedSources: [], displaySources: [], processedAllocations: [],
    pendingDeclarations: [], directAllocations: [], selected: null, directSelected: null,
    unclassifiedCount: 0, unclassifiedAmountText: '0.00', processedCount: 0,
    amount: '', paymentAmount: '', typeIndex: 0, methodIndex: 1, types, names, methodNames
  },
  onLoad() {
    this.setData({ navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR })
    this.load()
  },
  toBack() { wx.navigateBack() },
  load() {
    this.setData({ loading: true, error: '' })
    return Promise.all([
      getPurchaseFundingSources({ pageSize: 100 }),
      getPurchaseFundingAllocations({ pageSize: 100 })
    ]).then(responses => {
      const sources = responseData(responses[0]).map(decorateSource)
      const allocations = responseData(responses[1]).map(decorateAllocation)
      const unclassified = sources.filter(item => Number(item.availableAmount || 0) > 0)
      const processed = allocations.filter(item => item.status !== 'PENDING_CONFIRMATION')
      const direct = allocations.filter(item => item.status === 'ACTIVE' && item.fundingType === 'COMPANY_DIRECT' && Number(item.directRemainingAmount || 0) > 0)
      this.setData({
        allSources: sources,
        unclassifiedSources: unclassified,
        displaySources: sourceList(this.data.activeTab, sources, unclassified),
        processedAllocations: processed,
        pendingDeclarations: allocations.filter(item => item.status === 'PENDING_CONFIRMATION'),
        directAllocations: direct,
        unclassifiedCount: unclassified.length,
        unclassifiedAmountText: money(unclassified.reduce((sum, item) => sum + Number(item.availableAmount || 0), 0)),
        processedCount: processed.length,
        selected: null,
        directSelected: null
      })
    }).catch(error => this.setData({ error: error.message || '资金归类加载失败' }))
      .then(() => this.setData({ loading: false }))
  },
  retry() { this.load() },
  switchTab(event) {
    const activeTab = event.currentTarget.dataset.tab
    this.setData({ activeTab,
      displaySources: sourceList(activeTab, this.data.allSources, this.data.unclassifiedSources), selected: null })
  },
  select(event) {
    const source = this.data.allSources.find(item => Number(item.purchaseGoodsId) === Number(event.currentTarget.dataset.id))
    if (!source || source.classified) return
    this.setData({ selected: source, amount: source.availableText })
  },
  chooseType(event) {
    const source = this.data.allSources.find(item => Number(item.purchaseGoodsId) === Number(event.currentTarget.dataset.id))
    const fundingType = event.currentTarget.dataset.type
    if (!source || source.classified) return wx.showToast({ title: '该采购金额已归类', icon: 'none' })
    if (fundingType === 'PURCHASER_ADVANCE' && !source.purchaserUserId) return wx.showToast({ title: '该采购未关联采购员', icon: 'none' })
    if (fundingType === 'SUPPLIER_CREDIT' && !source.supplierRelationId) return wx.showToast({ title: '该采购未关联外部供应商', icon: 'none' })
    this.setData({ selected: source, typeIndex: types.indexOf(fundingType), amount: source.availableText })
  },
  closeEditor() { this.setData({ selected: null, amount: '' }) },
  amount(event) { this.setData({ amount: event.detail.value }) },
  type(event) { this.setData({ typeIndex: Number(event.detail.value) }) },
  submit() {
    const source = this.data.selected
    if (!source) return
    const amount = Number(this.data.amount)
    const fundingType = types[this.data.typeIndex]
    if (!(amount > 0)) return wx.showToast({ title: '请输入归类金额', icon: 'none' })
    if (amount > Number(source.availableAmount || 0)) return wx.showToast({ title: '不能超过待归类金额', icon: 'none' })
    if (fundingType === 'PURCHASER_ADVANCE' && !source.purchaserUserId) return wx.showToast({ title: '该采购未关联采购员', icon: 'none' })
    if (fundingType === 'SUPPLIER_CREDIT' && !source.supplierRelationId) return wx.showToast({ title: '该采购未关联外部供应商', icon: 'none' })
    const data = { purchaseGoodsId: source.purchaseGoodsId, purchaserUserId: source.purchaserUserId,
      supplierRelationId: source.supplierRelationId, fundingType, amount: this.data.amount }
    classifyPurchaseFunding(data, 'boss-funding-' + source.purchaseGoodsId + '-' + fundingType + '-' + Date.now())
      .then(responseData).then(() => { wx.showToast({ title: '归类成功' }); return this.load() })
      .catch(error => wx.showToast({ title: error.message || '归类失败', icon: 'none' }))
  },
  confirmDeclaration(event) {
    const confirmationStatus = event.currentTarget.dataset.state
    confirmPurchaseFundingAllocation(event.currentTarget.dataset.id, {
      confirmationStatus,
      reason: confirmationStatus === 'CONFIRMED' ? '老板确认采购员垫付' : '老板驳回垫付申报'
    }).then(responseData).then(() => this.load())
      .catch(error => wx.showToast({ title: error.message || '处理失败', icon: 'none' }))
  },
  selectDirect(event) {
    const item = this.data.directAllocations.find(allocation => Number(allocation.allocationId) === Number(event.currentTarget.dataset.id))
    if (item) this.setData({ directSelected: item, paymentAmount: item.directRemainingText })
  },
  closeDirectEditor() { this.setData({ directSelected: null, paymentAmount: '' }) },
  paymentAmount(event) { this.setData({ paymentAmount: event.detail.value }) },
  paymentMethod(event) { this.setData({ methodIndex: Number(event.detail.value) }) },
  payDirect() {
    const item = this.data.directSelected
    if (!item) return
    const amount = Number(this.data.paymentAmount)
    if (!(amount > 0)) return wx.showToast({ title: '请输入付款金额', icon: 'none' })
    if (amount > Number(item.directRemainingAmount || 0)) return wx.showToast({ title: '不能超过剩余待付金额', icon: 'none' })
    recordPurchaseFinancePayment('COMPANY_DIRECT_PURCHASE', item.allocationId, {
      amount: this.data.paymentAmount,
      paymentMethod: methods[this.data.methodIndex],
      reason: '公司直接支付采购款'
    }, 'boss-direct-pay-' + item.allocationId + '-' + Date.now())
      .then(responseData).then(() => { wx.showToast({ title: '付款已记录' }); return this.load() })
      .catch(error => wx.showToast({ title: error.message || '付款失败', icon: 'none' }))
  }
})

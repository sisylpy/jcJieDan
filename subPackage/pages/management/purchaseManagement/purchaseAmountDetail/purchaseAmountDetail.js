import { getPurchaseManagementPurchaseAmountRecords } from '../../../../../lib/apiDistributer.js'
import {
  formatPurchaseMoney,
  normalizePurchaseAmount,
  normalizePurchaseRecord
} from '../../../../../utils/purchaseAmountPresenter.js'

const app = getApp()

const SOURCE_OPTIONS = [
  { value: '', name: '全部来源' },
  { value: 'INTERNAL_COLLABORATION', name: '内部协作' },
  { value: 'EXTERNAL_DPB', name: '外部供应' },
  { value: 'SELF_PURCHASE', name: '自采' }
]

const AMOUNT_OPTIONS = [
  { value: '', name: '全部记录' },
  { value: 'RECOGNIZED', name: '已计入金额' },
  { value: 'UNRESOLVED', name: '金额尚未形成' },
  { value: 'CONFLICT', name: '来源冲突' }
]

function normalizeHistoricalBill(issue) {
  return Object.assign({}, issue, {
    businessDateText: issue.businessDate || '业务日期待核对',
    supplierText: issue.supplierName
      ? issue.supplierName + (issue.supplierDistributerId ? ' (#' + issue.supplierDistributerId + ')' : '')
      : (issue.supplierDistributerId ? '协作配送商 #' + issue.supplierDistributerId : '协作配送商待核对'),
    amountText: formatPurchaseMoney(issue.amount),
    explanation: '缺少可核实的协作订单关联，未计入本期采购金额'
  })
}

Page({
  data: {
    navBarHeight: 0,
    startDate: '',
    stopDate: '',
    sourceOptions: SOURCE_OPTIONS,
    sourceIndex: 0,
    sourceType: '',
    amountOptions: AMOUNT_OPTIONS,
    amountIndex: 0,
    amountStatus: '',
    summary: normalizePurchaseAmount({}),
    items: [],
    historicalBillIssues: [],
    page: 1,
    pageSize: 20,
    total: 0,
    hasMore: false,
    loading: false,
    loadingMore: false,
    error: '',
    loadMoreError: '',
    scrollTop: 0
  },

  onLoad(options) {
    this.setData({
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      startDate: options.startDate || '',
      stopDate: options.stopDate || ''
    })
    if (!this.data.startDate || !this.data.stopDate) {
      this.setData({ error: '缺少查询日期，请从采购管理首页进入' })
      return
    }
    this.load(true)
  },

  onShow() {
    if (this._restoreScrollTop) this.setData({ scrollTop: this._restoreScrollTop })
  },

  onHide() {
    this._restoreScrollTop = this._lastScrollTop || 0
  },

  toBack() { wx.navigateBack({ delta: 1 }) },
  retry() { this.load(true) },
  rememberScroll(event) { this._lastScrollTop = event.detail.scrollTop || 0 },

  changeSource(event) {
    const index = Number(event.detail.value)
    const option = SOURCE_OPTIONS[index] || SOURCE_OPTIONS[0]
    this.setData({ sourceIndex: index, sourceType: option.value })
    this.load(true)
  },

  changeAmountStatus(event) {
    const index = Number(event.detail.value)
    const option = AMOUNT_OPTIONS[index] || AMOUNT_OPTIONS[0]
    this.setData({ amountIndex: index, amountStatus: option.value })
    this.load(true)
  },

  load(reset) {
    if (!this.data.startDate || !this.data.stopDate) return
    if (!reset && (this.data.loading || this.data.loadingMore || !this.data.hasMore)) return
    const page = reset ? 1 : this.data.page + 1
    const serial = (this._requestSerial || 0) + 1
    this._requestSerial = serial
    const loadingState = reset
      ? { loading: true, error: '', loadMoreError: '', items: [], total: 0, hasMore: false, scrollTop: 0 }
      : { loadingMore: true, loadMoreError: '' }
    if (reset) {
      this._lastScrollTop = 0
      this._restoreScrollTop = 0
    }
    this.setData(loadingState)

    getPurchaseManagementPurchaseAmountRecords({
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      sourceType: this.data.sourceType,
      amountStatus: this.data.amountStatus,
      page,
      pageSize: this.data.pageSize
    }).then(res => {
      if (serial !== this._requestSerial) return
      const body = res.result || {}
      if (body.code !== 0) throw new Error(body.msg || '采购明细加载失败')
      const data = body.data || {}
      if (!data.summary) throw new Error('采购金额汇总未返回')
      const offset = (page - 1) * this.data.pageSize
      const rows = (data.items || []).map((item, index) => normalizePurchaseRecord(item, offset + index))
      if (rows.some(item => !item.contractValid)) throw new Error('采购明细标识缺失')
      const summary = normalizePurchaseAmount(data.summary)
      if (!summary.contractValid) throw new Error('采购金额汇总状态无法识别')
      this.setData({
        summary,
        items: reset ? rows : this.data.items.concat(rows),
        historicalBillIssues: (data.historicalBillIssues || []).map(normalizeHistoricalBill),
        page: Number(data.page || page),
        pageSize: Number(data.pageSize || this.data.pageSize),
        total: Number(data.total || 0),
        hasMore: data.hasMore === true
      })
    }).catch(error => {
      if (serial !== this._requestSerial) return
      if (reset) this.setData({ error: error.message || '采购明细加载失败' })
      else this.setData({ loadMoreError: error.message || '加载更多失败' })
    }).then(() => {
      if (serial === this._requestSerial) this.setData({ loading: false, loadingMore: false })
    })
  },

  more() { this.load(false) },

  toggleSource(event) {
    const index = Number(event.currentTarget.dataset.index)
    const item = this.data.items[index]
    if (!item) return
    this.setData({ ['items[' + index + '].sourceExpanded']: !item.sourceExpanded })
  },

  openRecord(event) {
    const index = Number(event.currentTarget.dataset.index)
    const item = this.data.items[index]
    if (!item || !item.actionType) return
    this._restoreScrollTop = this._lastScrollTop || 0
    if (item.actionType === 'SUPPLIER') {
      wx.navigateTo({
        url: '/subPackage/pages/management/purchaseManagement/supplierDetail/supplierDetail'
          + '?purchaseSupplierRefId=' + encodeURIComponent(item.purchaseSupplierRefId)
          + '&startDate=' + encodeURIComponent(this.data.startDate)
          + '&stopDate=' + encodeURIComponent(this.data.stopDate)
      })
      return
    }
    if (item.actionType === 'BATCH') {
      wx.navigateTo({
        url: '/subPackage/pages/management/purchaseManagement/purchaseBatchDetail/purchaseBatchDetail'
          + '?batchId=' + encodeURIComponent(item.externalBatchId)
          + '&startDate=' + encodeURIComponent(this.data.startDate)
          + '&stopDate=' + encodeURIComponent(this.data.stopDate)
      })
    }
  }
})

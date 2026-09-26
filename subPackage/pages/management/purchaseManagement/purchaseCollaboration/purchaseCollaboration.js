import {
  getPurchaseManagementBatches,
  getPurchaseSupplierV2List,
  syncPurchaseSupplierV2
} from '../../../../../lib/apiDistributer.js'

const app = getApp()

const TYPE_TEXT = {
  INTERNAL_DISTRIBUTER: '内部协作配送商',
  EXTERNAL_JRDH: '外部供应商'
}

const RELATION_TEXT = {
  BLOCKED: '协作受限',
  INACTIVE: '合作未启用',
  HISTORICAL: '历史合作关系',
  UNKNOWN: '关系状态待核对'
}

const BATCH_SORT_OPTIONS = [
  { value: 'LATEST', name: '最近采购' },
  { value: 'SUPPLY_AMOUNT', name: '供货金额' }
]

const SUPPLIER_TYPE_OPTIONS = [
  { value: '', name: '全部供应方' },
  { value: 'INTERNAL_DISTRIBUTER', name: '内部协作配送商' },
  { value: 'EXTERNAL_JRDH', name: '外部供应商' }
]

const SUPPLIER_SORT_OPTIONS = [
  { value: 'LAST_PURCHASE', name: '最近采购' },
  { value: 'PURCHASE_AMOUNT', name: '采购金额' },
  { value: 'PURCHASE_COUNT', name: '采购单数' }
]

function today() {
  const date = new Date()
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
}

function formatMoney(value) {
  if (value == null || value === '') return '—'
  const parsed = Number(value)
  return isFinite(parsed) ? '¥' + parsed.toFixed(2) : '¥' + value
}

function decorateSupplier(item) {
  const recognized = Number(item.recognizedAmountLineCount || 0)
  const unresolved = Number(item.unresolvedAmountLineCount || 0)
  const goodsLines = Number(item.goodsLineCount || 0)
  const quality = item.dataQualityStatus || 'NO_FACT'
  const hasRecords = goodsLines > 0 || recognized > 0 || unresolved > 0
  let amountState = 'recognized'
  let amountScopeText = ''
  let purchaseAmountText = formatMoney(item.purchaseAmount)

  if (!hasRecords) {
    amountState = 'no-record'
    purchaseAmountText = '—'
    amountScopeText = '本期暂无采购记录'
  } else if (recognized === 0 && unresolved > 0) {
    amountState = 'unresolved'
    purchaseAmountText = '待核对'
    amountScopeText = '本期 ' + unresolved + ' 条采购记录金额均待核对，未计入采购金额'
  } else if (unresolved > 0) {
    amountState = 'partial'
    amountScopeText = '另有 ' + unresolved + ' 条采购记录金额待核对，未计入上述金额'
  }

  let qualityText = ''
  if (quality === 'CONFLICT') qualityText = '来源归属存在冲突'
  else if (quality === 'INCOMPLETE' && unresolved === 0) qualityText = '部分来源数据不完整'

  return Object.assign({}, item, {
    supplierTypeText: TYPE_TEXT[item.supplierType] || '供应方类型待核对',
    typeClass: item.supplierType === 'INTERNAL_DISTRIBUTER' ? 'internal' : 'external',
    relationText: item.relationStatus === 'ACTIVE' ? '' : (RELATION_TEXT[item.relationStatus] || ''),
    purchaseAmountText,
    amountState,
    amountScopeText,
    qualityText,
    purchaseCountText: Number(item.purchaseCount || 0),
    goodsLineCountText: goodsLines
  })
}

Page({
  data: {
    navBarHeight: 0,
    mode: 'batch',
    startDate: '',
    stopDate: '',
    dateType: 'month',
    dateName: 'thisMonth',
    dateLabel: '本月',
    scrollTop: 0,

    batchKeyword: '',
    batchItems: [],
    batchPage: 1,
    batchTotal: 0,
    batchHasMore: false,
    batchLoading: false,
    batchError: '',
    progressGroup: '',
    purchasePurpose: '',
    dataIssue: '',
    purchaserUserId: '',
    purchaserIndex: 0,
    purchaserOptions: [{ purchaserUserId: '', purchaserName: '全部采购员' }],
    supplierRelationId: '',
    batchSupplierIndex: 0,
    batchSupplierOptions: [{ supplierRelationId: '', supplierName: '全部供应方' }],
    batchSort: 'LATEST',
    batchSortText: '最近采购',
    batchFilterCount: 0,
    statistics: { batchCount: 0, purchaserCount: 0, supplierCount: 0 },
    showBatchFilters: false,

    supplierKeyword: '',
    supplierItems: [],
    supplierPage: 1,
    supplierTotal: 0,
    supplierHasMore: false,
    supplierLoading: false,
    supplierSyncing: false,
    supplierSyncNotice: '',
    supplierError: '',
    supplierType: '',
    supplierTypeIndex: 0,
    supplierTypeOptions: SUPPLIER_TYPE_OPTIONS,
    supplierSort: 'LAST_PURCHASE',
    supplierSortIndex: 0,
    supplierSortOptions: SUPPLIER_SORT_OPTIONS,
    showDataNote: false
  },

  onLoad(options) {
    const stopDate = options.stopDate || today()
    const mode = options.mode === 'supplier' ? 'supplier' : 'batch'
    this.setData({
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      mode,
      startDate: options.startDate || stopDate.slice(0, 7) + '-01',
      stopDate
    })
    this.loadBatch(true)
    if (mode === 'supplier') this.syncAndLoadSuppliers()
  },

  onShow() {
    if (!this._dateChanged) return
    this._dateChanged = false
    this.loadBatch(true)
    if (this.data.mode === 'supplier') this.syncAndLoadSuppliers()
  },

  toBack() { wx.navigateBack({ delta: 1 }) },

  toDatePage() {
    wx.navigateTo({
      url: '/subPackage-charts/pages/sel/date/date?startDate=' + this.data.startDate
        + '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType
        + '&dateName=' + this.data.dateName
    })
  },

  onReportDateSelected(selection) {
    this._dateChanged = true
    this._supplierSyncKey = ''
    this.setData({
      startDate: selection.startDate,
      stopDate: selection.stopDate,
      dateType: selection.dateType,
      dateName: selection.dateName,
      dateLabel: selection.hanzi || '自定义'
    })
  },

  switchMode(event) {
    const mode = event.currentTarget.dataset.mode
    if (!mode || mode === this.data.mode) return
    this.setData({ mode, scrollTop: 0 })
    if (mode === 'supplier') this.syncAndLoadSuppliers()
    else if (!this.data.batchItems.length && !this.data.batchLoading) this.loadBatch(true)
  },

  showSuppliersFromStat() {
    if (this.data.mode === 'supplier') return
    this.setData({ mode: 'supplier', scrollTop: 0 })
    this.syncAndLoadSuppliers()
  },

  inputKeyword(event) {
    if (this.data.mode === 'batch') this.setData({ batchKeyword: event.detail.value })
    else this.setData({ supplierKeyword: event.detail.value })
  },

  search() {
    if (this.data.mode === 'batch') this.loadBatch(true)
    else this.loadSuppliers(true)
  },

  chooseProgress(event) {
    this.setData({ progressGroup: event.currentTarget.dataset.value || '' })
    this.loadBatch(true)
  },

  changePurchaser(event) {
    const purchaserIndex = Number(event.detail.value)
    const option = this.data.purchaserOptions[purchaserIndex] || this.data.purchaserOptions[0]
    this.setData({ purchaserIndex, purchaserUserId: option.purchaserUserId || '' })
    this.loadBatch(true)
  },

  changeBatchSupplier(event) {
    const batchSupplierIndex = Number(event.detail.value)
    const option = this.data.batchSupplierOptions[batchSupplierIndex] || this.data.batchSupplierOptions[0]
    this.setData({ batchSupplierIndex, supplierRelationId: option.supplierRelationId || '' })
    this.loadBatch(true)
  },

  openBatchFilters() { this.setData({ showBatchFilters: true, showDataNote: false }) },
  openDataNote() { this.setData({ showDataNote: true, showBatchFilters: false }) },
  stopPropagation() {},

  choosePurpose(event) {
    this.setData({ purchasePurpose: event.currentTarget.dataset.value || '' })
    this._batchFilterDirty = true
  },

  chooseDataIssue(event) {
    this.setData({ dataIssue: event.currentTarget.dataset.value || '' })
    this._batchFilterDirty = true
  },

  chooseBatchSort(event) {
    const batchSort = event.currentTarget.dataset.value || 'LATEST'
    const option = BATCH_SORT_OPTIONS.find(item => item.value === batchSort) || BATCH_SORT_OPTIONS[0]
    this.setData({ batchSort, batchSortText: option.name })
    this._batchFilterDirty = true
  },

  resetBatchFilters() {
    this._batchFilterDirty = false
    this.setData({
      purchasePurpose: '', dataIssue: '', batchSort: 'LATEST', batchSortText: '最近采购',
      showBatchFilters: false, batchFilterCount: 0
    })
    this.loadBatch(true)
  },

  applyBatchFilters() {
    this._batchFilterDirty = false
    this.setData({ showBatchFilters: false })
    this.updateBatchFilterCount()
    this.loadBatch(true)
  },

  closeSheets() {
    const shouldReload = this.data.showBatchFilters && this._batchFilterDirty
    this._batchFilterDirty = false
    this.setData({ showBatchFilters: false, showDataNote: false })
    if (shouldReload) {
      this.updateBatchFilterCount()
      this.loadBatch(true)
    }
  },

  updateBatchFilterCount() {
    const count = (this.data.purchasePurpose ? 1 : 0)
      + (this.data.dataIssue ? 1 : 0)
      + (this.data.batchSort !== 'LATEST' ? 1 : 0)
    this.setData({ batchFilterCount: count })
  },

  loadBatch(reset) {
    if (this.data.batchLoading || !this.data.startDate || !this.data.stopDate) return
    const page = reset ? 1 : this.data.batchPage
    this.setData({ batchLoading: true, batchError: '', scrollTop: reset && this.data.mode === 'batch' ? 0 : this.data.scrollTop })
    getPurchaseManagementBatches({
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      page,
      pageSize: 20,
      keyword: this.data.batchKeyword.trim(),
      progressGroup: this.data.progressGroup,
      purchasePurpose: this.data.purchasePurpose,
      dataIssue: this.data.dataIssue,
      purchaserId: this.data.purchaserUserId,
      supplierRelationId: this.data.supplierRelationId,
      sort: this.data.batchSort
    }).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw new Error(body.msg || '采购批次加载失败')
      const data = body.data || {}
      const purchaserOptions = [{ purchaserUserId: '', purchaserName: '全部采购员' }]
        .concat((data.purchaserOptions || []).map(item => ({
          purchaserUserId: item.purchaserUserId,
          purchaserName: item.purchaserName || '采购员 #' + item.purchaserUserId
        })))
      const batchSupplierOptions = [{ supplierRelationId: '', supplierName: '全部供应方' }]
        .concat((data.supplierOptions || []).map(item => ({
          supplierRelationId: item.supplierRelationId,
          supplierName: item.supplierName || '名称待核对'
        })))
      let purchaserIndex = purchaserOptions.findIndex(item => String(item.purchaserUserId || '') === String(this.data.purchaserUserId || ''))
      let batchSupplierIndex = batchSupplierOptions.findIndex(item => String(item.supplierRelationId || '') === String(this.data.supplierRelationId || ''))
      if (purchaserIndex < 0) purchaserIndex = 0
      if (batchSupplierIndex < 0) batchSupplierIndex = 0
      this.setData({
        batchItems: reset ? (data.items || []) : this.data.batchItems.concat(data.items || []),
        batchPage: data.page || page,
        batchTotal: data.total || 0,
        batchHasMore: !!data.hasMore,
        statistics: Object.assign({ batchCount: 0, purchaserCount: 0, supplierCount: 0 }, data.statistics || {}),
        purchaserOptions,
        purchaserIndex,
        purchaserUserId: purchaserOptions[purchaserIndex].purchaserUserId || '',
        batchSupplierOptions,
        batchSupplierIndex,
        supplierRelationId: batchSupplierOptions[batchSupplierIndex].supplierRelationId || '',
        startDate: data.startDate || this.data.startDate,
        stopDate: data.stopDate || this.data.stopDate
      })
    }).catch(error => {
      const failed = { batchError: error.message || '采购批次加载失败' }
      if (reset) Object.assign(failed, { batchItems: [], batchTotal: 0, batchHasMore: false })
      this.setData(failed)
    }).then(() => this.setData({ batchLoading: false }))
  },

  retryBatch() { this.loadBatch(true) },

  openBatch(event) {
    wx.navigateTo({
      url: '/subPackage/pages/management/purchaseManagement/purchaseBatchDetail/purchaseBatchDetail?batchId='
        + event.currentTarget.dataset.id + '&startDate=' + encodeURIComponent(this.data.startDate)
        + '&stopDate=' + encodeURIComponent(this.data.stopDate)
    })
  },

  changeSupplierType(event) {
    const supplierTypeIndex = Number(event.detail.value)
    const option = this.data.supplierTypeOptions[supplierTypeIndex] || this.data.supplierTypeOptions[0]
    this.setData({ supplierTypeIndex, supplierType: option.value })
    this.loadSuppliers(true)
  },

  changeSupplierSort(event) {
    const supplierSortIndex = Number(event.detail.value)
    const option = this.data.supplierSortOptions[supplierSortIndex] || this.data.supplierSortOptions[0]
    this.setData({ supplierSortIndex, supplierSort: option.value })
    this.loadSuppliers(true)
  },

  syncAndLoadSuppliers() {
    const syncKey = this.data.startDate + ':' + this.data.stopDate
    if (this.data.supplierSyncing) return
    if (this._supplierSyncKey === syncKey) {
      this.loadSuppliers(true)
      return
    }
    this.setData({ supplierSyncing: true, supplierSyncNotice: '' })
    syncPurchaseSupplierV2({ startDate: this.data.startDate, stopDate: this.data.stopDate })
      .then(res => {
        const body = res.result || {}
        if (body.code !== 0) throw new Error(body.msg || '采购数据更新失败')
        this._supplierSyncKey = syncKey
        const result = body.data || {}
        if ((result.internal || {}).complete === false || (result.external || {}).complete === false) {
          this.setData({ supplierSyncNotice: '本次数据更新尚未完成，可稍后重新加载继续更新。' })
        }
      }).catch(() => {
        this.setData({ supplierSyncNotice: '采购数据更新失败，以下显示已保存的数据。' })
      }).then(() => {
        this.setData({ supplierSyncing: false })
        this.loadSuppliers(true)
      })
  },

  loadSuppliers(reset) {
    if (this.data.supplierLoading) return
    const page = reset ? 1 : this.data.supplierPage
    this.setData({ supplierLoading: true, supplierError: '', scrollTop: reset && this.data.mode === 'supplier' ? 0 : this.data.scrollTop })
    getPurchaseSupplierV2List({
      supplierType: this.data.supplierType,
      keyword: this.data.supplierKeyword.trim(),
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      sort: this.data.supplierSort,
      page,
      pageSize: 20
    }).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw new Error(body.msg || '加载供应方失败')
      const data = body.data || {}
      const rows = (data.items || []).map(decorateSupplier)
      this.setData({
        supplierItems: reset ? rows : this.data.supplierItems.concat(rows),
        supplierPage: data.page || page,
        supplierTotal: data.total || 0,
        supplierHasMore: !!data.hasMore
      })
    }).catch(error => {
      const failed = { supplierError: error.message || '采购数据加载失败' }
      if (reset) Object.assign(failed, { supplierItems: [], supplierTotal: 0, supplierHasMore: false })
      this.setData(failed)
    }).then(() => this.setData({ supplierLoading: false }))
  },

  retrySuppliers() {
    this._supplierSyncKey = ''
    this.syncAndLoadSuppliers()
  },

  openSupplier(event) {
    wx.navigateTo({
      url: '/subPackage/pages/management/purchaseManagement/supplierDetail/supplierDetail?purchaseSupplierRefId='
        + event.currentTarget.dataset.id + '&startDate=' + encodeURIComponent(this.data.startDate)
        + '&stopDate=' + encodeURIComponent(this.data.stopDate)
    })
  },

  recordScroll(event) { this.setData({ scrollTop: event.detail.scrollTop || 0 }) },

  more() {
    if (this.data.mode === 'batch') {
      if (this.data.batchLoading || !this.data.batchHasMore) return
      this.setData({ batchPage: this.data.batchPage + 1 })
      this.loadBatch(false)
      return
    }
    if (this.data.supplierLoading || !this.data.supplierHasMore) return
    this.setData({ supplierPage: this.data.supplierPage + 1 })
    this.loadSuppliers(false)
  }
})

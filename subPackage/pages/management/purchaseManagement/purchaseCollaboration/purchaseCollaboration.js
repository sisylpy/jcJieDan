import {
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

const SORT_TEXT = {
  LAST_PURCHASE: '最近采购',
  PURCHASE_AMOUNT: '采购金额从高到低',
  PURCHASE_COUNT: '采购单数从多到少'
}

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
    startDate: '',
    stopDate: '',
    dateType: 'month',
    dateName: 'thisMonth',
    dateLabel: '本月',
    supplierType: '',
    keyword: '',
    sort: 'LAST_PURCHASE',
    sortText: SORT_TEXT.LAST_PURCHASE,
    supplierItems: [],
    supplierPage: 1,
    supplierTotal: 0,
    supplierHasMore: false,
    supplierLoading: false,
    supplierSyncing: false,
    supplierSyncNotice: '',
    supplierError: '',
    showTypeSheet: false,
    showSortSheet: false,
    showDataNote: false,
    scrollTop: 0
  },

  onLoad(options) {
    const stopDate = options.stopDate || today()
    this.setData({
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      startDate: options.startDate || stopDate.slice(0, 7) + '-01',
      stopDate
    })
    this.syncAndLoadSuppliers()
  },

  onShow() {
    if (this._dateChanged) {
      this._dateChanged = false
      this._supplierSyncKey = ''
      this.syncAndLoadSuppliers()
      return
    }
    if (this._loaded && this._savedScrollTop > 0) {
      this.setData({ scrollTop: this._savedScrollTop })
    }
    this._loaded = true
  },

  onHide() {
    this._savedScrollTop = this._lastScrollTop || 0
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
    this.setData({
      startDate: selection.startDate,
      stopDate: selection.stopDate,
      dateType: selection.dateType,
      dateName: selection.dateName,
      dateLabel: selection.hanzi || '自定义'
    })
  },

  inputKeyword(event) { this.setData({ keyword: event.detail.value }) },
  search() { this.loadSuppliers(true) },
  retrySuppliers() {
    this._supplierSyncKey = ''
    this.syncAndLoadSuppliers()
  },
  stopPropagation() {},
  rememberScroll(event) { this._lastScrollTop = event.detail.scrollTop || 0 },

  openTypeSheet() { this.setData({ showTypeSheet: true, showSortSheet: false, showDataNote: false }) },
  openSortSheet() { this.setData({ showSortSheet: true, showTypeSheet: false, showDataNote: false }) },
  openDataNote() { this.setData({ showDataNote: true, showTypeSheet: false, showSortSheet: false }) },
  closeSheets() { this.setData({ showTypeSheet: false, showSortSheet: false, showDataNote: false }) },

  chooseType(event) {
    this.setData({ supplierType: event.currentTarget.dataset.value || '', showTypeSheet: false })
    this.loadSuppliers(true)
  },

  chooseSort(event) {
    const sort = event.currentTarget.dataset.value || 'LAST_PURCHASE'
    this.setData({ sort, sortText: SORT_TEXT[sort], showSortSheet: false })
    this.loadSuppliers(true)
  },

  syncAndLoadSuppliers() {
    if (!this.data.startDate || !this.data.stopDate) return
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
    if (reset) {
      this._lastScrollTop = 0
      this._savedScrollTop = 0
    }
    this.setData({ supplierLoading: true, supplierError: '', scrollTop: reset ? 0 : this.data.scrollTop })
    getPurchaseSupplierV2List({
      supplierType: this.data.supplierType,
      keyword: this.data.keyword.trim(),
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      sort: this.data.sort,
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

  more() {
    if (this.data.supplierLoading || !this.data.supplierHasMore) return
    this.setData({ supplierPage: this.data.supplierPage + 1 })
    this.loadSuppliers(false)
  },

  openSupplier(event) {
    this._savedScrollTop = this._lastScrollTop || 0
    wx.navigateTo({
      url: '/subPackage/pages/management/purchaseManagement/supplierDetail/supplierDetail?purchaseSupplierRefId='
        + event.currentTarget.dataset.id + '&startDate=' + encodeURIComponent(this.data.startDate)
        + '&stopDate=' + encodeURIComponent(this.data.stopDate)
    })
  }
})

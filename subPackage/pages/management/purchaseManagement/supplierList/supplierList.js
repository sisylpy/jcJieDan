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

function formatMoney(value) {
  if (value == null || value === '') return '—'
  const parsed = Number(value)
  return isFinite(parsed) ? '¥' + parsed.toFixed(2) : '¥' + value
}

function decorate(item) {
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
    hasRecords,
    purchaseCountText: Number(item.purchaseCount || 0),
    goodsLineCountText: goodsLines
  })
}

Page({
  data: {
    navBarHeight: 0,
    startDate: '',
    stopDate: '',
    supplierType: '',
    keyword: '',
    sort: 'LAST_PURCHASE',
    sortText: SORT_TEXT.LAST_PURCHASE,
    items: [],
    page: 1,
    total: 0,
    hasMore: false,
    loading: false,
    syncing: false,
    syncNotice: '',
    error: '',
    showTypeSheet: false,
    showSortSheet: false,
    showDataNote: false,
    scrollTop: 0
  },

  onLoad(options) {
    this.setData({
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      startDate: options.startDate || '',
      stopDate: options.stopDate || ''
    })
    this.syncAndLoad()
  },

  onShow() {
    if (this._loaded && this._savedScrollTop > 0) {
      this.setData({ scrollTop: this._savedScrollTop })
    }
    this._loaded = true
  },

  onHide() {
    this._savedScrollTop = this._lastScrollTop || 0
  },

  toBack() { wx.navigateBack({ delta: 1 }) },

  rememberScroll(event) {
    this._lastScrollTop = event.detail.scrollTop || 0
  },

  changeStart(event) {
    this.setData({ startDate: event.detail.value })
    this.syncAndLoad()
  },

  changeStop(event) {
    this.setData({ stopDate: event.detail.value })
    this.syncAndLoad()
  },

  inputKeyword(event) { this.setData({ keyword: event.detail.value }) },
  search() { this.load(true) },
  retry() { this.syncAndLoad() },
  stopPropagation() {},

  openTypeSheet() { this.setData({ showTypeSheet: true, showSortSheet: false }) },
  openSortSheet() { this.setData({ showSortSheet: true, showTypeSheet: false }) },
  openDataNote() { this.setData({ showDataNote: true }) },
  closeSheets() {
    this.setData({ showTypeSheet: false, showSortSheet: false, showDataNote: false })
  },

  chooseType(event) {
    this.setData({
      supplierType: event.currentTarget.dataset.value || '',
      showTypeSheet: false
    })
    this.load(true)
  },

  chooseSort(event) {
    const sort = event.currentTarget.dataset.value || 'LAST_PURCHASE'
    this.setData({ sort, sortText: SORT_TEXT[sort], showSortSheet: false })
    this.load(true)
  },

  syncAndLoad() {
    if (this.data.syncing || !this.data.startDate || !this.data.stopDate) {
      this.load(true)
      return
    }
    this.setData({ syncing: true, syncNotice: '' })
    syncPurchaseSupplierV2({
      startDate: this.data.startDate,
      stopDate: this.data.stopDate
    }).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw new Error(body.msg || '采购数据更新失败')
      const result = body.data || {}
      const internal = result.internal || {}
      const external = result.external || {}
      if (internal.complete === false || external.complete === false) {
        this.setData({ syncNotice: '本次数据更新尚未完成，可点击重新加载继续更新。' })
      }
    }).catch(() => {
      this.setData({ syncNotice: '采购数据更新失败，以下显示已保存的数据。' })
    }).then(() => {
      this.setData({ syncing: false })
      this.load(true)
    })
  },

  load(reset) {
    if (this.data.loading) return
    const page = reset ? 1 : this.data.page
    if (reset) {
      this._lastScrollTop = 0
      this._savedScrollTop = 0
    }
    this.setData({ loading: true, error: '', scrollTop: reset ? 0 : this.data.scrollTop })
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
      const rows = (data.items || []).map(decorate)
      this.setData({
        items: reset ? rows : this.data.items.concat(rows),
        page: data.page || page,
        total: data.total || 0,
        hasMore: !!data.hasMore
      })
    }).catch(error => {
      const failedState = { error: error.message || '采购数据加载失败' }
      if (reset) Object.assign(failedState, { items: [], total: 0, hasMore: false })
      this.setData(failedState)
    }).then(() => this.setData({ loading: false }))
  },

  more() {
    if (this.data.loading || !this.data.hasMore) return
    this.setData({ page: this.data.page + 1 })
    this.load(false)
  },

  open(event) {
    const id = event.currentTarget.dataset.id
    this._savedScrollTop = this._lastScrollTop || 0
    wx.navigateTo({
      url: '/subPackage/pages/management/purchaseManagement/supplierDetail/supplierDetail'
        + '?purchaseSupplierRefId=' + id
        + '&startDate=' + encodeURIComponent(this.data.startDate)
        + '&stopDate=' + encodeURIComponent(this.data.stopDate)
    })
  }
})

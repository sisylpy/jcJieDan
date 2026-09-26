import {
  getPurchaseManagementPurchasers,
  getPurchaseManagementPurchaserPurchasedGoods
} from '../lib/apiDistributer.js'
import apiUrl from '../config.js'
import {
  buildPurchaserGoodsView,
  purchaserGoodsInitialState
} from './purchaseManagementPurchaserGoodsView.js'

const app = getApp()
const PAGE_SIZE = 100
const MAX_PAGES = 100

function today() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return year + '-' + month + '-' + day
}

function monthStart(stopDate) {
  return String(stopDate || today()).slice(0, 7) + '-01'
}

function positiveId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : 0
}

function completedTotals(items) {
  let recognizedCount = 0
  let amount = 0
  let unresolvedCount = 0
  ;(items || []).forEach(item => {
    const value = item && item.amount
    if (item && item.amountStatus === 'RECOGNIZED' && value !== null && value !== undefined && value !== '' && isFinite(Number(value))) {
      recognizedCount += 1
      amount += Number(value)
    } else {
      unresolvedCount += 1
    }
  })
  const amountText = recognizedCount
    ? '¥' + Number(amount.toFixed(2)).toString()
    : '—'
  return {
    completedGoodsCount: (items || []).length,
    completedGoodsAmountText: amountText,
    completedUnresolvedCount: unresolvedCount
  }
}

export function createPurchaserDetailPage() {
  return {
  data: Object.assign({
    navBarHeight: 0,
    purchaserId: 0,
    purchasers: [],
    selectedAllPurchasers: true,
    selectedPurchaserIds: [],
    purchaserSelectionText: '全部采购员',
    showPurchaserFilter: false,
    draftAllPurchasers: true,
    draftPurchasers: [],
    draftSelectedCount: 0,
    startDate: '',
    stopDate: '',
    dateType: 'month',
    dateName: 'thisMonth',
    dateLabel: '本月',
    detail: {},
    loading: false,
    error: '',
    purchasedGoods: [],
    goodsLoading: false,
    goodsError: '',
    completedGoodsCount: 0,
    completedGoodsAmountText: '—',
    completedUnresolvedCount: 0
  }, purchaserGoodsInitialState()),

  onLoad(options) {
    const stopDate = options.stopDate || today()
    this._initialPurchaserId = positiveId(options.purchaserId)
    this._scopeVersion = 1
    this.setData({
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      purchaserId: this._initialPurchaserId,
      selectedAllPurchasers: !this._initialPurchaserId,
      selectedPurchaserIds: this._initialPurchaserId ? [this._initialPurchaserId] : [],
      startDate: options.startDate || monthStart(stopDate),
      stopDate,
      dateLabel: decodeURIComponent(options.dateLabel || '本月')
    })
    this.loadHeader().then(loaded => {
      if (loaded) this.loadGoods()
    })
  },

  onShow() {
    if (!this._dateChanged) return
    this._dateChanged = false
    this.reloadPeriod()
  },

  toBack() { wx.navigateBack({ delta: 1 }) },
  noop() {},
  retry() {
    this.loadHeader().then(loaded => {
      if (loaded) this.loadGoods()
    })
  },
  retryGoods() { this.loadGoods() },
  toDatePage() {
    wx.navigateTo({ url: '/subPackage-charts/pages/sel/date/date?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType + '&dateName=' + this.data.dateName })
  },
  onReportDateSelected(selection) {
    this._dateChanged = true
    this.setData({ startDate: selection.startDate, stopDate: selection.stopDate, dateType: selection.dateType, dateName: selection.dateName, dateLabel: selection.hanzi || '自定义' })
  },
  reloadPeriod() {
    this._scopeVersion += 1
    this.loadHeader().then(loaded => {
      if (loaded) this.loadGoods()
    })
  },

  loadAllPages(request, params, errorText, page, items) {
    const currentPage = page || 1
    const currentItems = items || []
    return request(Object.assign({}, params || {}, { page: currentPage, pageSize: PAGE_SIZE })).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw new Error(body.msg || errorText)
      const data = body.data || {}
      const nextItems = currentItems.concat(data.items || [])
      const hasMore = data.hasMore === true || nextItems.length < Number(data.total || 0)
      if (hasMore && currentPage < MAX_PAGES && (data.items || []).length) {
        return this.loadAllPages(request, params, errorText, currentPage + 1, nextItems)
      }
      return nextItems
    })
  },

  loadHeader() {
    this.setData({ loading: true, error: '' })
    return this.loadAllPages(
      data => getPurchaseManagementPurchasers(data),
      { startDate: this.data.startDate, stopDate: this.data.stopDate, sort: 'NAME' },
      '采购员统计加载失败'
    ).then(items => {
      const purchasers = (items || []).filter(item => positiveId(item.purchaserUserId))
      const validIds = purchasers.map(item => positiveId(item.purchaserUserId))
      let selectedAll = this.data.selectedAllPurchasers
      let selectedIds = (this.data.selectedPurchaserIds || []).filter(id => validIds.indexOf(positiveId(id)) >= 0)
      if (this._initialPurchaserId) {
        selectedIds = validIds.indexOf(this._initialPurchaserId) >= 0 ? [this._initialPurchaserId] : []
        selectedAll = !selectedIds.length
        this._initialPurchaserId = 0
      } else if (!selectedAll && !selectedIds.length) {
        selectedAll = true
      }
      this.setData({
        purchasers,
        selectedAllPurchasers: selectedAll,
        selectedPurchaserIds: selectedAll ? [] : selectedIds
      })
      this.updateSummary()
      return true
    }).catch(error => {
      this.setData({ error: error.message || '采购员统计加载失败' })
      return false
    }).then(loaded => {
      this.setData({ loading: false })
      return loaded
    })
  },

  activePurchasers() {
    if (this.data.selectedAllPurchasers) return this.data.purchasers || []
    const selected = this.data.selectedPurchaserIds || []
    return (this.data.purchasers || []).filter(item => selected.indexOf(positiveId(item.purchaserUserId)) >= 0)
  },

  activePurchaserIds() {
    return this.activePurchasers().map(item => positiveId(item.purchaserUserId)).filter(Boolean)
  },

  updateSummary() {
    const selected = this.activePurchasers()
    const names = selected.map(item => item.purchaserName || ('采购员 #' + item.purchaserUserId))
    const isAll = this.data.selectedAllPurchasers
    const single = selected.length === 1 ? selected[0] : null
    const detail = !isAll && single ? Object.assign({}, single) : {
      purchaserName: isAll ? '全部采购员' : selected.length + ' 位采购员',
      purchaserStatusText: isAll ? '全员汇总' : '组合筛选'
    }
    const selectionText = isAll ? '全部采购员（' + selected.length + '）'
      : single ? names[0] : '已选 ' + selected.length + ' 位采购员'
    this.setData({ detail, purchaserSelectionText: selectionText })
  },

  openPurchaserFilter() {
    const selectedIds = this.data.selectedAllPurchasers
      ? this.data.purchasers.map(item => positiveId(item.purchaserUserId))
      : this.data.selectedPurchaserIds
    const draftPurchasers = this.data.purchasers.map(item => Object.assign({}, item, {
      selected: selectedIds.indexOf(positiveId(item.purchaserUserId)) >= 0
    }))
    this.setData({
      showPurchaserFilter: true,
      draftAllPurchasers: this.data.selectedAllPurchasers,
      draftPurchasers,
      draftSelectedCount: draftPurchasers.filter(item => item.selected).length
    })
  },

  closePurchaserFilter() { this.setData({ showPurchaserFilter: false }) },

  selectAllPurchasers() {
    const draftPurchasers = this.data.draftPurchasers.map(item => Object.assign({}, item, { selected: true }))
    this.setData({
      draftAllPurchasers: true,
      draftPurchasers,
      draftSelectedCount: draftPurchasers.length
    })
  },

  clearDraftPurchasers() {
    const draftPurchasers = this.data.draftPurchasers.map(item => Object.assign({}, item, { selected: false }))
    this.setData({
      draftAllPurchasers: false,
      draftPurchasers,
      draftSelectedCount: 0
    })
  },

  togglePurchaser(event) {
    const purchaserId = positiveId(event.currentTarget.dataset.id)
    const draftPurchasers = this.data.draftPurchasers.map(item => {
      if (positiveId(item.purchaserUserId) !== purchaserId) return item
      return Object.assign({}, item, { selected: !item.selected })
    })
    const selectedCount = draftPurchasers.filter(item => item.selected).length
    this.setData({
      draftPurchasers,
      draftSelectedCount: selectedCount,
      draftAllPurchasers: draftPurchasers.length > 0 && selectedCount === draftPurchasers.length
    })
  },

  applyPurchaserFilter() {
    const ids = this.data.draftPurchasers.filter(item => item.selected)
      .map(item => positiveId(item.purchaserUserId)).filter(Boolean)
    if (!ids.length) {
      wx.showToast({ title: '请至少选择一位采购员', icon: 'none' })
      return
    }
    const selectedAll = ids.length === this.data.purchasers.length
    this._scopeVersion += 1
    this.setData(Object.assign({
      showPurchaserFilter: false,
      selectedAllPurchasers: selectedAll,
      selectedPurchaserIds: selectedAll ? [] : ids,
      purchaserId: selectedAll || ids.length !== 1 ? 0 : ids[0],
      purchasedGoods: [],
      goodsError: '',
      completedGoodsCount: 0,
      completedGoodsAmountText: '—',
      completedUnresolvedCount: 0
    }, purchaserGoodsInitialState()))
    this.updateSummary()
    this.loadGoods()
  },

  purchaserName(purchaserId) {
    const id = positiveId(purchaserId)
    const purchaser = (this.data.purchasers || []).find(item => positiveId(item.purchaserUserId) === id)
    return purchaser ? (purchaser.purchaserName || ('采购员 #' + id)) : ('采购员 #' + id)
  },

  decorateOwner(item, purchaserId) {
    const ownerId = positiveId(item.purchaserUserId) || positiveId(purchaserId)
    return Object.assign({}, item, {
      purchaserUserId: ownerId,
      purchaserName: item.purchaserName || this.purchaserName(ownerId)
    })
  },

  loadForPurchasers(request, params, errorText) {
    const ids = this.activePurchaserIds()
    return Promise.all(ids.map(purchaserId => this.loadAllPages(
      data => request(purchaserId, data), params, errorText
    ).then(items => (items || []).map(item => this.decorateOwner(item, purchaserId)))))
      .then(groups => groups.reduce((all, group) => all.concat(group), []))
  },

  loadGoods() {
    const token = this._scopeVersion
    if (!this.activePurchaserIds().length) {
      this.setData(Object.assign({
        purchasedGoods: [],
        goodsLoading: false,
        goodsError: ''
      }, purchaserGoodsInitialState(), completedTotals([])))
      return Promise.resolve()
    }
    this.setData({ goodsLoading: true, goodsError: '' })
    return this.loadForPurchasers(
      getPurchaseManagementPurchaserPurchasedGoods,
      { startDate: this.data.startDate, stopDate: this.data.stopDate },
      '已采购商品加载失败'
    ).then(items => {
      if (token !== this._scopeVersion) return
      this.setData(Object.assign({ purchasedGoods: items }, completedTotals(items), this.goodsView(items)))
    }).catch(error => {
      if (token === this._scopeVersion) this.setData({ goodsError: error.message || '已采购商品加载失败' })
    }).then(() => {
      if (token === this._scopeVersion) this.setData({ goodsLoading: false })
    })
  },

  goodsView(items, statePatch) {
    return buildPurchaserGoodsView(
      items,
      Object.assign({}, this.data, statePatch || {}),
      apiUrl.server
    )
  },

  chooseGoodsCategory(event) {
    const activeGoodsCategory = event.currentTarget.dataset.value || 'ALL'
    this.setData(Object.assign(
      { activeGoodsCategory },
      this.goodsView(this.data.purchasedGoods, { activeGoodsCategory })
    ))
  },

  changeGoodsSource(event) {
    const goodsSourceIndex = Number(event.detail.value || 0)
    this.setData(Object.assign(
      { goodsSourceIndex, activeGoodsCategory: 'ALL' },
      this.goodsView(this.data.purchasedGoods, { goodsSourceIndex, activeGoodsCategory: 'ALL' })
    ))
  },

  changeGoodsSort(event) {
    const goodsSortIndex = Number(event.detail.value || 0)
    this.setData(Object.assign(
      { goodsSortIndex },
      this.goodsView(this.data.purchasedGoods, { goodsSortIndex })
    ))
  }
  }
}

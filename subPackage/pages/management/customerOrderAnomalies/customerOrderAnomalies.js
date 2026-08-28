import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js')

import {
  disGetAllCustomerOrderAnomalies
} from '../../../../lib/apiDistributer'

const FILTERS = [
  { key: 'ALL', label: '全部', countKey: 'totalCount' },
  { key: 'SUSPECTED_STOP', label: '疑似停订', countKey: 'suspectedStopCount' },
  { key: 'ORDERING_DECLINE', label: '订货下降', countKey: 'declineCount' },
  { key: 'ORDERING_SURGE', label: '订货激增', countKey: 'surgeCount' }
]

Page({
  data: {
    navBarHeight: 0,
    asOfBusinessDate: '',
    summary: {
      customerCount: 0,
      affectedCustomerCount: 0,
      totalCount: 0,
      suspectedStopCount: 0,
      declineCount: 0,
      surgeCount: 0,
      highSeverityCount: 0,
      evaluatedGoodsCount: 0,
      insufficientDataCount: 0
    },
    filters: [],
    activeFilter: 'ALL',
    keyword: '',
    displayedItems: [],
    loading: true,
    loadFailed: false
  },

  onLoad() {
    const globalData = getApp().globalData || {}
    this.setData({
      navBarHeight: (globalData.navBarHeight || 0) * (globalData.rpxR || 1)
    })
    this._items = []
    this._load()
  },

  onPullDownRefresh() {
    this._load(true)
  },

  toBack() {
    wx.navigateBack({ delta: 1 })
  },

  retryLoad() {
    this._load()
  },

  _load(fromPullDown) {
    if (!fromPullDown) load.showLoading('分析全部客户')
    disGetAllCustomerOrderAnomalies()
      .then(res => {
        const result = res && res.result ? res.result : {}
        if (result.code !== 0 || !result.data) {
          throw new Error(result.msg || '读取失败')
        }
        const report = result.data
        const summary = this._normalizeSummary(report.summary)
        this._items = (report.items || []).map(item => this._normalizeItem(item))
        this.setData({
          loading: false,
          loadFailed: false,
          asOfBusinessDate: this._text(report.asOfBusinessDate),
          summary,
          filters: FILTERS.map(filter => ({
            key: filter.key,
            label: filter.label,
            count: this._toInteger(summary[filter.countKey])
          }))
        })
        this._applyFilters()
      })
      .catch(() => {
        this._items = []
        this.setData({ loading: false, loadFailed: true, displayedItems: [] })
        wx.showToast({ title: '异常分析读取失败', icon: 'none' })
      })
      .finally(() => {
        load.hideLoading()
        if (fromPullDown) wx.stopPullDownRefresh()
      })
  },

  changeFilter(e) {
    const key = e.currentTarget.dataset.key
    if (!key || key === this.data.activeFilter) return
    this.setData({ activeFilter: key })
    this._applyFilters()
  },

  searchInput(e) {
    this.setData({ keyword: this._text(e.detail.value) })
    this._applyFilters()
  },

  clearSearch() {
    this.setData({ keyword: '' })
    this._applyFilters()
  },

  toggleDetail(e) {
    const relationId = Number(e.currentTarget.dataset.id)
    this._items = (this._items || []).map(item => {
      if (Number(item.relationId) !== relationId) return item
      return Object.assign({}, item, { expanded: !item.expanded })
    })
    this._applyFilters()
  },

  toCustomerAnomalies(e) {
    const customerId = Number(e.currentTarget.dataset.customerId)
    const item = (this._items || []).find(candidate => Number(candidate.customerId) === customerId)
    if (!customerId || !item) return
    wx.navigateTo({
      url: '/subPackage/pages/customer/customerOrderAnomalies/customerOrderAnomalies' +
        '?depFatherId=' + encodeURIComponent(customerId) +
        '&customerName=' + encodeURIComponent(item.customerName || '')
    })
  },

  _applyFilters() {
    const active = this.data.activeFilter
    const keyword = this._text(this.data.keyword).toLowerCase()
    const displayedItems = (this._items || []).filter(item => {
      if (active !== 'ALL' && item.anomalyType !== active) return false
      if (!keyword) return true
      return [item.customerName, item.departmentName, item.goodsName, item.specification]
        .join(' ').toLowerCase().indexOf(keyword) >= 0
    })
    this.setData({ displayedItems })
  },

  _normalizeSummary(value) {
    const summary = value || {}
    return {
      customerCount: this._toInteger(summary.customerCount),
      affectedCustomerCount: this._toInteger(summary.affectedCustomerCount),
      totalCount: this._toInteger(summary.totalCount),
      suspectedStopCount: this._toInteger(summary.suspectedStopCount),
      declineCount: this._toInteger(summary.declineCount),
      surgeCount: this._toInteger(summary.surgeCount),
      highSeverityCount: this._toInteger(summary.highSeverityCount),
      evaluatedGoodsCount: this._toInteger(summary.evaluatedGoodsCount),
      insufficientDataCount: this._toInteger(summary.insufficientDataCount)
    }
  },

  _normalizeItem(item) {
    const quantityVerified = item.quantityVerified === true
    return {
      customerId: item.customerId,
      customerName: this._text(item.customerName) || '未命名客户',
      relationId: item.relationId,
      goodsId: item.goodsId,
      goodsName: this._text(item.goodsName) || '未命名商品',
      specification: this._text(item.specification),
      departmentName: this._text(item.departmentName) || '未命名部门',
      imageUrl: this._imageUrl(item.imagePath),
      initials: (this._text(item.goodsName) || '商').slice(0, 1),
      anomalyType: this._text(item.anomalyType),
      anomalyLabel: this._text(item.anomalyLabel),
      typeTone: this._typeTone(item.anomalyType),
      severity: this._text(item.severity),
      severityLabel: this._text(item.severityLabel),
      confidencePercent: this._toInteger(item.confidencePercent),
      reason: this._text(item.reason),
      actionHint: this._text(item.actionHint),
      averageCycleDays: this._text(item.averageCycleDays) || '—',
      daysSinceLast: this._toInteger(item.daysSinceLast),
      lastOrderDate: this._text(item.lastOrderDate),
      expectedOrderDate: this._text(item.expectedOrderDate),
      recentOrderDays14: this._toInteger(item.recentOrderDays14),
      expectedOrderDays14: this._text(item.expectedOrderDays14) || '—',
      quantityVerified,
      quantityUnit: this._text(item.quantityUnit),
      recentQuantity14: this._text(item.recentQuantity14),
      expectedQuantity14: this._text(item.expectedQuantity14),
      quantityChangeText: this._changeText(item.quantityChangePercent),
      dataQualityNote: this._text(item.dataQualityNote),
      recentOrders: (item.recentOrders || []).map(point => ({
        orderDate: this._text(point.orderDate),
        quantityText: point.quantity
          ? this._text(point.quantity) + (this._text(point.unit) || '')
          : '数量未验证'
      })),
      expanded: false
    }
  },

  _typeTone(type) {
    if (type === 'SUSPECTED_STOP') return 'stop'
    if (type === 'ORDERING_DECLINE') return 'decline'
    return 'surge'
  },

  _changeText(value) {
    if (value === null || value === undefined || value === '') return '—'
    const number = Number(value)
    if (!Number.isFinite(number)) return '—'
    return (number > 0 ? '+' : '') + Math.round(number) + '%'
  },

  _imageUrl(value) {
    const path = this._text(value)
    if (!path) return ''
    if (/^https?:\/\//.test(path)) return path
    return apiUrl.server + path
  },

  _toInteger(value) {
    const number = Number(value)
    return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0
  },

  _text(value) {
    return value === null || value === undefined ? '' : String(value).trim()
  }
})

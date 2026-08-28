import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js')

import {
  disGetDepOrderAnomalies
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
    depFatherId: null,
    customerName: '',
    asOfBusinessDate: '',
    algorithmVersion: '',
    summary: {
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
    displayedItems: [],
    loading: true,
    loadFailed: false,
    causeHints: [
      '商品质量或售后反馈',
      '价格变化',
      '菜单、季节或客户营业变化',
      '使用了替代商品',
      '改从其他渠道采购'
    ]
  },

  onLoad(options) {
    const app = getApp()
    const globalData = app.globalData || {}
    const depFatherId = Number(options.depFatherId)
    this.setData({
      navBarHeight: (globalData.navBarHeight || 0) * (globalData.rpxR || 1),
      depFatherId: Number.isFinite(depFatherId) && depFatherId > 0 ? depFatherId : null,
      customerName: this._text(options.customerName) || '客户'
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
    if (!this.data.depFatherId) {
      this.setData({ loading: false, loadFailed: true })
      if (fromPullDown) wx.stopPullDownRefresh()
      return
    }
    if (!fromPullDown) load.showLoading('分析订货变化')

    disGetDepOrderAnomalies(this.data.depFatherId)
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
          customerName: this._text(report.customerName) || this.data.customerName,
          asOfBusinessDate: this._text(report.asOfBusinessDate),
          algorithmVersion: this._text(report.algorithmVersion),
          summary,
          filters: FILTERS.map(filter => ({
            key: filter.key,
            label: filter.label,
            count: this._toInteger(summary[filter.countKey])
          }))
        })
        this._applyFilter()
      })
      .catch(() => {
        this._items = []
        this.setData({
          loading: false,
          loadFailed: true,
          displayedItems: []
        })
        wx.showToast({
          title: '异常分析读取失败',
          icon: 'none'
        })
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
    this._applyFilter()
  },

  toggleDetail(e) {
    const relationId = Number(e.currentTarget.dataset.id)
    this._items = (this._items || []).map(item => {
      if (Number(item.relationId) !== relationId) return item
      return Object.assign({}, item, { expanded: !item.expanded })
    })
    this._applyFilter()
  },

  toCustomerGoodsPrice(e) {
    const relationId = Number(e.currentTarget.dataset.id)
    const item = (this._items || []).find(candidate => Number(candidate.relationId) === relationId)
    if (!item || !item.goodsId) return

    wx.setStorageSync('disGoods', {
      nxDgGoodsName: item.goodsName,
      nxDgGoodsFileLarge: item.imagePath
    })
    const query = [
      'departmentDisGoodsId=' + encodeURIComponent(item.relationId),
      'depFatherId=' + encodeURIComponent(this.data.depFatherId),
      'goodsId=' + encodeURIComponent(item.goodsId),
      'customerName=' + encodeURIComponent(item.departmentName || this.data.customerName),
      'customerGoodsName=' + encodeURIComponent(item.goodsName || ''),
      'customerStandard=' + encodeURIComponent(item.specification || '')
    ].join('&')
    wx.navigateTo({
      url: '/subPackage-charts/pages/customer/customerGoodsPrice/customerGoodsPrice?' + query
    })
  },

  _applyFilter() {
    const active = this.data.activeFilter
    const displayedItems = active === 'ALL'
      ? (this._items || [])
      : (this._items || []).filter(item => item.anomalyType === active)
    this.setData({ displayedItems })
  },

  _normalizeSummary(value) {
    const summary = value || {}
    return {
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
      relationId: item.relationId,
      goodsId: item.goodsId,
      goodsName: this._text(item.goodsName) || '未命名商品',
      specification: this._text(item.specification),
      departmentName: this._text(item.departmentName) || this.data.customerName,
      imagePath: this._text(item.imagePath),
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
      historicalOrderDays: this._toInteger(item.historicalOrderDays),
      averageCycleDays: this._text(item.averageCycleDays) || '—',
      q75CycleDays: this._text(item.q75CycleDays) || '—',
      daysSinceLast: this._toInteger(item.daysSinceLast),
      lastOrderDate: this._text(item.lastOrderDate),
      expectedOrderDate: this._text(item.expectedOrderDate),
      recentOrderDays14: this._toInteger(item.recentOrderDays14),
      expectedOrderDays14: this._text(item.expectedOrderDays14) || '—',
      orderFrequencyChangeText: this._changeText(item.orderFrequencyChangePercent),
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
    if (number > 0) return '+' + Math.round(number) + '%'
    return Math.round(number) + '%'
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

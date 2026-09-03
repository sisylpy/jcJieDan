import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js')

import {
  disGetDepGoodsProfile,
  disGetDepOrderAnomalies
} from '../../../../lib/apiDistributer'

import {
  CUSTOMER_GOODS_AMOUNT_GROUPS,
  CUSTOMER_GOODS_AMOUNT_WINDOWS,
  buildCustomerGoodsAmountRows,
  resolveCustomerGoodsAverageQuantity,
  summarizeCustomerGoodsAmountRows
} from '../../../../utils/customerGoodsAmount'

const FREQUENCY_GROUPS = [
  {
    key: 'high',
    title: '高频订货',
    range: '每天 / 隔天',
    tone: 'green'
  },
  {
    key: 'regular',
    title: '常购',
    range: '3–7 天',
    tone: 'blue'
  },
  {
    key: 'periodic',
    title: '周期采购',
    range: '8–15 天',
    tone: 'orange'
  },
  {
    key: 'occasional',
    title: '偶尔采购',
    range: '15 天以上',
    tone: 'gray'
  },
  {
    key: 'unknown',
    title: '记录不足',
    range: '暂未形成周期',
    tone: 'light'
  }
]

Page({
  data: {
    navBarHeight: 0,
    windowHeight: 0,
    url: apiUrl.server,
    depFatherId: null,
    editDepAttrName: '',
    searchKeyword: '',
    viewMode: 'frequency',
    amountWindows: CUSTOMER_GOODS_AMOUNT_WINDOWS,
    amountWindowIndex: 1,
    amountWindowLabel: CUSTOMER_GOODS_AMOUNT_WINDOWS[1].label,
    groupedGoods: [],
    stats: {
      total: 0,
      requirement: 0,
      stable: 0,
      recent: 0
    },
    amountStats: {
      totalAmountText: '¥0',
      core: 0,
      withAmount: 0
    },
    anomalyAvailable: false,
    anomalyAsOf: '',
    anomalySummary: {
      totalCount: 0,
      suspectedStopCount: 0,
      declineCount: 0,
      surgeCount: 0,
      highSeverityCount: 0
    },
    loading: true
  },

  onLoad() {
    const app = getApp()
    const globalData = app.globalData || {}
    const depInfo = wx.getStorageSync('depInfo') || {}
    const depFatherId = depInfo.nxDepartmentId || depInfo.nxDepartmentFatherId

    this.setData({
      navBarHeight: (globalData.navBarHeight || 0) * (globalData.rpxR || 1),
      windowHeight: (globalData.windowHeight || 0) * (globalData.rpxR || 1),
      depInfo,
      depFatherId,
      editDepAttrName: depInfo.nxDepartmentAttrName || depInfo.nxDepartmentName || '客户商品'
    })

    this._allGoods = []
    this._loadGoods()
  },

  onPullDownRefresh() {
    this._loadGoods(true)
  },

  toBack() {
    wx.navigateBack({ delta: 1 })
  },

  _loadGoods(fromPullDown) {
    if (!this.data.depFatherId) {
      this.setData({
        loading: false,
        groupedGoods: []
      })
      if (fromPullDown) wx.stopPullDownRefresh()
      return
    }

    if (!fromPullDown) load.showLoading('获取数据')

    const anomalyRequest = disGetDepOrderAnomalies(this.data.depFatherId)
      .catch(() => ({ result: { code: -1 } }))

    Promise.all([
      disGetDepGoodsProfile(this.data.depFatherId),
      anomalyRequest
    ])
      .then(([res, anomalyRes]) => {
        const result = res && res.result ? res.result : {}
        if (result.code !== 0) {
          wx.showToast({
            title: result.msg || '读取失败',
            icon: 'none'
          })
          this.setData({
            loading: false,
            groupedGoods: []
          })
          this._allGoods = []
          return
        }

        const anomalyReport = this._normalizeAnomalyReport(anomalyRes)
        this._anomalyByRelation = anomalyReport.byRelation
        const allGoods = this._normalizeGoods(result.data || [])
        this._allGoods = allGoods
        this.setData({
          loading: false,
          stats: this._buildStats(allGoods),
          anomalyAvailable: anomalyReport.available,
          anomalyAsOf: anomalyReport.asOfBusinessDate,
          anomalySummary: anomalyReport.summary
        })
        this._applyFilter()
      })
      .catch(() => {
        wx.showToast({
          title: '读取失败，请稍后重试',
          icon: 'none'
        })
        this.setData({
          loading: false,
          groupedGoods: []
        })
        this._allGoods = []
      })
      .finally(() => {
        load.hideLoading()
        if (fromPullDown) wx.stopPullDownRefresh()
      })
  },

  _normalizeGoods(profiles) {
    const normalized = profiles.map(item => {
      const intervalDays = this._toNumber(item.averageOrderIntervalDays)
      const lastOrder = this._lastOrderView(item.lastOrderDate)
      const requirementCount = this._toInteger(item.requirementCount)
      const imageCount = this._toInteger(item.standardImageCount)
      const customerGoodsName = this._text(item.goodsName) || '未命名商品'
      const anomaly = this._anomalyByRelation
        ? this._anomalyByRelation[Number(item.relationId)]
        : null

      return {
        relationId: item.relationId,
        goodsId: item.goodsId,
        goodsName: customerGoodsName,
        originalGoodsName: this._text(item.originalGoodsName),
        spec: this._text(item.specification),
        categoryName: this._text(item.categoryName),
        customerName: this._text(item.customerName) || this.data.editDepAttrName,
        intervalDays,
        intervalText: intervalDays === null ? '—' : this._formatNumber(intervalDays),
        frequencyKey: this._frequencyKey(intervalDays),
        lastOrderDate: lastOrder.date,
        lastOrderText: lastOrder.text,
        lastOrderDays: lastOrder.days,
        orderDayCount: this._toInteger(item.orderDayCount),
        ordersLast30Days: this._toInteger(item.ordersLast30Days),
        orderAmount30Days: this._toAmount(item.orderAmount30Days),
        orderAmount90Days: this._toAmount(item.orderAmount90Days),
        orderAmount365Days: this._toAmount(item.orderAmount365Days),
        orderAmountAll: this._toAmount(item.orderAmountAll),
        averageOrderQuantity30Days: this._toAmount(item.averageOrderQuantity30Days),
        averageOrderQuantity90Days: this._toAmount(item.averageOrderQuantity90Days),
        averageOrderQuantity365Days: this._toAmount(item.averageOrderQuantity365Days),
        averageOrderQuantityAll: this._toAmount(item.averageOrderQuantityAll),
        averageOrderQuantityUnit: this._text(item.averageOrderQuantityUnit),
        requirementCount,
        imageCount,
        hasRequirement: requirementCount > 0,
        imageUrl: this._imageUrl(item.imagePath),
        imagePath: this._text(item.imagePath),
        initials: customerGoodsName.slice(0, 1),
        anomalyType: anomaly ? anomaly.anomalyType : '',
        anomalyLabel: anomaly ? anomaly.anomalyLabel : '',
        anomalySeverity: anomaly ? anomaly.severity : '',
        anomalyReason: anomaly ? anomaly.reason : ''
      }
    })

    return normalized.sort((a, b) => {
      const aInterval = a.intervalDays === null ? Number.MAX_SAFE_INTEGER : a.intervalDays
      const bInterval = b.intervalDays === null ? Number.MAX_SAFE_INTEGER : b.intervalDays
      if (aInterval !== bInterval) return aInterval - bInterval
      if (a.lastOrderDays !== b.lastOrderDays) return a.lastOrderDays - b.lastOrderDays
      return a.goodsName.localeCompare(b.goodsName, 'zh-CN')
    })
  },

  _buildStats(goods) {
    return {
      total: goods.length,
      requirement: goods.filter(item => item.hasRequirement).length,
      stable: goods.filter(item => item.intervalDays !== null && item.intervalDays <= 15).length,
      recent: goods.filter(item => item.lastOrderDays !== null && item.lastOrderDays <= 7).length
    }
  },

  _normalizeAnomalyReport(response) {
    const result = response && response.result ? response.result : {}
    const report = result.code === 0 && result.data ? result.data : null
    const emptySummary = {
      totalCount: 0,
      suspectedStopCount: 0,
      declineCount: 0,
      surgeCount: 0,
      highSeverityCount: 0
    }
    if (!report) {
      return {
        available: false,
        asOfBusinessDate: '',
        summary: emptySummary,
        byRelation: {}
      }
    }

    const byRelation = {}
    ;(report.items || []).forEach(item => {
      const relationId = Number(item.relationId)
      if (Number.isFinite(relationId)) byRelation[relationId] = item
    })
    const summary = report.summary || {}
    return {
      available: true,
      asOfBusinessDate: this._text(report.asOfBusinessDate),
      summary: {
        totalCount: this._toInteger(summary.totalCount),
        suspectedStopCount: this._toInteger(summary.suspectedStopCount),
        declineCount: this._toInteger(summary.declineCount),
        surgeCount: this._toInteger(summary.surgeCount),
        highSeverityCount: this._toInteger(summary.highSeverityCount)
      },
      byRelation
    }
  },

  _applyFilter() {
    const keyword = (this.data.searchKeyword || '').trim().toLowerCase()
    const amountMode = this.data.viewMode === 'amount'
    const amountWindow = CUSTOMER_GOODS_AMOUNT_WINDOWS[this.data.amountWindowIndex]
      || CUSTOMER_GOODS_AMOUNT_WINDOWS[1]
    const source = amountMode
      ? buildCustomerGoodsAmountRows(this._allGoods || [], amountWindow.field)
      : (this._allGoods || [])
    const amountSummary = summarizeCustomerGoodsAmountRows(source)
    const goods = (keyword
      ? source.filter(item => {
        return [
          item.goodsName,
          item.originalGoodsName,
          item.spec,
          item.categoryName,
          item.customerName,
          item.anomalyLabel,
          item.anomalyReason
        ].some(value => (value || '').toLowerCase().includes(keyword))
      })
      : source).map(item => this._decorateGoodsForView(item, amountWindow))

    const groups = amountMode ? CUSTOMER_GOODS_AMOUNT_GROUPS : FREQUENCY_GROUPS
    const groupedGoods = groups.map(group => {
      const items = goods.filter(item => amountMode
        ? item.amountKey === group.key
        : item.frequencyKey === group.key)
      const collapseKey = this.data.viewMode + ':' + group.key
      return Object.assign({}, group, {
        count: items.length,
        collapsed: !!(this._collapsedMap && this._collapsedMap[collapseKey]),
        items
      })
    }).filter(group => group.count > 0)

    this.setData({
      groupedGoods,
      amountWindowLabel: amountWindow.label,
      amountStats: {
        totalAmountText: this._formatMoney(amountSummary.totalAmount),
        core: amountSummary.core,
        withAmount: amountSummary.withAmount
      }
    })
  },

  _decorateGoodsForView(item, amountWindow) {
    const average = resolveCustomerGoodsAverageQuantity(item, this.data.viewMode, amountWindow)
    return Object.assign({}, item, {
      averageQuantityText: average.value === null
        ? '暂无数据'
        : '约 ' + this._formatNumber(average.value) + (average.unit || ''),
      amountText: this._formatMoney(item.amountValue || 0),
      amountShareText: this._formatNumber(item.amountShare || 0) + '%',
      cadenceText: item.intervalDays === null
        ? '暂未形成周期'
        : '约 ' + item.intervalText + '天一次'
    })
  },

  setViewMode(e) {
    const mode = e.currentTarget.dataset.mode
    if (mode !== 'frequency' && mode !== 'amount') return
    this.setData({ viewMode: mode })
    this._applyFilter()
  },

  onAmountWindowChange(e) {
    const index = Number(e.detail.value)
    this.setData({ amountWindowIndex: Number.isFinite(index) ? index : 1 })
    this._applyFilter()
  },

  toggleGroup(e) {
    const key = e.currentTarget.dataset.key
    if (!key) return

    const groupedGoods = this.data.groupedGoods.map(group => {
      if (group.key !== key) return group
      const collapsed = !group.collapsed
      this._collapsedMap = this._collapsedMap || {}
      this._collapsedMap[this.data.viewMode + ':' + key] = collapsed
      return Object.assign({}, group, { collapsed })
    })

    this.setData({ groupedGoods })
  },

  onSearchInput(e) {
    this.setData({
      searchKeyword: e.detail.value || ''
    })
    this._applyFilter()
  },

  clearSearch() {
    this.setData({ searchKeyword: '' })
    this._applyFilter()
  },

  toOrderAnomalies() {
    if (!this.data.anomalyAvailable) {
      wx.showToast({
        title: '异常分析暂不可用',
        icon: 'none'
      })
      return
    }
    wx.navigateTo({
      url: '../customerOrderAnomalies/customerOrderAnomalies' +
        '?depFatherId=' + encodeURIComponent(this.data.depFatherId) +
        '&customerName=' + encodeURIComponent(this.data.editDepAttrName || '')
    })
  },

  toCustomerGoodsPrice(e) {
    const item = this._findGoods(e.currentTarget.dataset.id)
    if (!item || !item.goodsId) return

    wx.setStorageSync('disGoods', {
      nxDgGoodsName: item.originalGoodsName || item.goodsName,
      nxDgGoodsFileLarge: item.imagePath
    })
    const query = [
      'departmentDisGoodsId=' + encodeURIComponent(item.relationId),
      'depFatherId=' + encodeURIComponent(this.data.depFatherId),
      'goodsId=' + encodeURIComponent(item.goodsId),
      'customerName=' + encodeURIComponent(item.customerName || this.data.editDepAttrName),
      'customerGoodsName=' + encodeURIComponent(item.goodsName || ''),
      'customerStandard=' + encodeURIComponent(item.spec || '')
    ].join('&')

    wx.navigateTo({
      url: '/subPackage-charts/pages/customer/customerGoodsPrice/customerGoodsPrice?' + query
    })
  },

  toCustomerGoodsStandard(e) {
    const item = this._findGoods(e.currentTarget.dataset.id)
    if (!item || !item.relationId) return

    wx.navigateTo({
      url: '../customerGoodsStandard/customerGoodsStandard' +
        '?depDisGoodsId=' + encodeURIComponent(item.relationId) +
        '&goodsName=' + encodeURIComponent(item.originalGoodsName || item.goodsName) +
        '&customerName=' + encodeURIComponent(item.goodsName) +
        '&departmentName=' + encodeURIComponent(item.customerName || this.data.editDepAttrName)
    })
  },

  _frequencyKey(intervalDays) {
    if (intervalDays === null) return 'unknown'
    if (intervalDays <= 2) return 'high'
    if (intervalDays <= 7) return 'regular'
    if (intervalDays <= 15) return 'periodic'
    return 'occasional'
  },

  _lastOrderView(value) {
    if (!value) {
      return {
        date: '',
        days: null,
        text: '暂无记录'
      }
    }

    const normalized = String(value).replace(/\./g, '-').replace(/\//g, '-').slice(0, 10)
    const parts = normalized.split('-').map(Number)
    if (parts.length !== 3 || parts.some(part => Number.isNaN(part))) {
      return {
        date: normalized,
        days: null,
        text: normalized
      }
    }

    const orderDate = new Date(parts[0], parts[1] - 1, parts[2])
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const days = Math.max(0, Math.round((today.getTime() - orderDate.getTime()) / 86400000))

    return {
      date: normalized,
      days,
      text: days === 0 ? '今天' : days + '天前'
    }
  },

  _findGoods(relationId) {
    const id = Number(relationId)
    return (this._allGoods || []).find(item => Number(item.relationId) === id)
  },

  _imageUrl(value) {
    const path = this._text(value)
    if (!path) return ''
    if (/^https?:\/\//.test(path)) return path
    return apiUrl.server + path
  },

  _formatNumber(value) {
    if (Number.isInteger(value)) return String(value)
    return value.toFixed(1).replace(/\.0$/, '')
  },

  _formatMoney(value) {
    const amount = Number(value)
    const safe = Number.isFinite(amount) ? amount : 0
    const fixed = safe.toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
    return '¥' + fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
  },

  _toAmount(value) {
    const number = Number(value)
    return Number.isFinite(number) && number > 0 ? number : 0
  },

  _toNumber(value) {
    if (value === null || value === undefined || value === '') return null
    const number = Number(value)
    return Number.isFinite(number) && number > 0 ? number : null
  },

  _toInteger(value) {
    const number = Number(value)
    return Number.isFinite(number) ? Math.max(0, Math.round(number)) : 0
  },

  _text(value) {
    return value === null || value === undefined ? '' : String(value).trim()
  }
})

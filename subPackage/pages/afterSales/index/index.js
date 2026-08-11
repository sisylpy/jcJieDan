import {
  getAfterSalesDictionaries,
  getAfterSalesStatistics,
  getAfterSalesList
} from '../../../../lib/apiDistributer'

function today() {
  var d = new Date()
  var m = d.getMonth() + 1 < 10 ? '0' + (d.getMonth() + 1) : String(d.getMonth() + 1)
  var day = d.getDate() < 10 ? '0' + d.getDate() : String(d.getDate())
  return d.getFullYear() + '-' + m + '-' + day
}

function number(source, key) {
  var value = source && source[key]
  return Number(value || 0)
}

Page({
  data: {
    navBarHeight: 0,
    distributerId: null,
    operatorUserId: null,
    startDate: '',
    endDate: '',
    loading: true,
    errorText: '',
    statistics: {},
    cases: [],
    severityMap: {},
    issueTypeMap: {},
    statusMap: {}
  },

  onLoad() {
    var app = getApp()
    var user = wx.getStorageSync('userInfo') || {}
    var dis = user.nxDistributerEntity || {}
    this.setData({
      navBarHeight: (app.globalData.navBarHeight || 0) * (app.globalData.rpxR || 1),
      distributerId: dis.nxDistributerId,
      operatorUserId: user.nxDistributerUserId,
      startDate: today(),
      endDate: today()
    })
    this.loadPage()
  },

  onShow() {
    if (this._loadedOnce) this.loadPage()
    this._loadedOnce = true
  },

  onPullDownRefresh() {
    this.loadPage(true)
  },

  scope() {
    return {
      distributerId: this.data.distributerId,
      operatorUserId: this.data.operatorUserId,
      startDate: this.data.startDate,
      endDate: this.data.endDate
    }
  },

  loadPage(fromPullDown) {
    if (!this.data.distributerId || !this.data.operatorUserId) {
      this.setData({ loading: false, errorText: '登录信息已失效' })
      return
    }
    this.setData({ loading: true, errorText: '' })
    var dictPromise = Object.keys(this.data.severityMap).length
      ? Promise.resolve()
      : this.loadDictionaries()
    dictPromise.then(() => Promise.all([
      getAfterSalesStatistics(this.scope()),
      getAfterSalesList(this.scope())
    ])).then((results) => {
      var statsResult = results[0].result || {}
      var listResult = results[1].result || {}
      if (statsResult.code !== 0) throw new Error(statsResult.msg || '统计加载失败')
      if (listResult.code !== 0) throw new Error(listResult.msg || '售后列表加载失败')
      this.setData({
        loading: false,
        statistics: this.normalizeStatistics(statsResult.data || {}),
        cases: this.normalizeCases(listResult.data || [])
      })
    }).catch((error) => {
      this.setData({ loading: false, errorText: error.message || '加载失败' })
    }).finally(() => {
      if (fromPullDown) wx.stopPullDownRefresh()
    })
  },

  loadDictionaries() {
    return getAfterSalesDictionaries().then((res) => {
      if (!res.result || res.result.code !== 0) throw new Error((res.result && res.result.msg) || '字典加载失败')
      var data = res.result.data || {}
      this.setData({
        severityMap: this.toMap(data.severities),
        issueTypeMap: this.toMap(data.issueTypes),
        statusMap: this.toMap(data.statuses)
      })
    })
  },

  toMap(list) {
    var map = {}
    ;(list || []).forEach(function (item) { map[item.code] = item.label })
    return map
  },

  normalizeStatistics(raw) {
    return {
      delivered: number(raw, 'deliveredOrderCount'),
      normal: number(raw, 'normalOrderCount'),
      light: number(raw, 'lightCount'),
      medium: number(raw, 'mediumCount'),
      serious: number(raw, 'seriousCount'),
      pending: number(raw, 'pendingCount'),
      processing: number(raw, 'processingCount'),
      waitConfirm: number(raw, 'waitConfirmCount'),
      completed: number(raw, 'completedCount')
    }
  },

  normalizeCases(list) {
    var severityMap = this.data.severityMap
    var issueTypeMap = this.data.issueTypeMap
    var statusMap = this.data.statusMap
    return (list || []).map(function (item) {
      var severity = item.severity || ''
      return Object.assign({}, item, {
        severityLabel: severityMap[severity] || severity,
        issueTypeLabel: issueTypeMap[item.issueType] || item.issueType,
        statusLabel: statusMap[item.status] || item.status,
        severityClass: String(severity).toLowerCase(),
        replenishmentLabel: Number(item.hasReplenishment)
          ? (item.status === 'COMPLETED' ? '已补货' : '正在补货')
          : '',
        createdText: item.createdAt ? String(item.createdAt).replace('T', ' ').slice(5, 16) : ''
      })
    })
  },

  onStartDateChange(e) {
    this.setData({ startDate: e.detail.value }, () => this.loadPage())
  },

  onEndDateChange(e) {
    this.setData({ endDate: e.detail.value }, () => this.loadPage())
  },

  openDetail(e) {
    var id = e.currentTarget.dataset.id
    var name = e.currentTarget.dataset.name || ''
    var cache = wx.getStorageSync('afterSalesCustomerNames') || {}
    cache[String(id)] = name
    wx.setStorageSync('afterSalesCustomerNames', cache)
    wx.navigateTo({ url: '../detail/detail?afterSalesId=' + id + '&customerName=' + encodeURIComponent(name) })
  },

  toBack() { wx.navigateBack({ delta: 1 }) }
})

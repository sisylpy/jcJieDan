import {
  getAfterSalesDictionaries,
  getAfterSalesOverview
} from '../../../../lib/apiDistributer'
var dateUtils = require('../../../../utils/dateUtil')
import * as echarts from '../../../ec-canvas/echarts'

function number(source, key) {
  var value = source && source[key]
  return Number(value || 0)
}

var ISSUE_TYPE_COLORS = ['#5B8FF9', '#61DDAA', '#F6BD16', '#7262FD', '#FF9D4D',
  '#78D3F8', '#9661BC', '#F6903D', '#008685', '#F08BB4']

Page({
  data: {
    navBarHeight: 0,
    distributerId: null,
    operatorUserId: null,
    startDate: '',
    stopDate: '',
    dateType: '',
    hanzi: '',
    update: false,
    loading: true,
    errorText: '',
    kpi: {},
    overview: { totalIssue: 0 },
    issueTypeStats: [],
    cases: [],
    ec: { lazyLoad: true },
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
      operatorUserId: user.nxDistributerUserId
    })
    this.initDate()
    this.loadPage()
  },

  onShow() {
    if (this.data.update) {
      var myDate = wx.getStorageSync('myDate')
      if (myDate) {
        var dateRange
        if (myDate.name === 'custom') {
          dateRange = dateUtils.getDateRange(myDate.name, myDate.startDate, myDate.stopDate)
        } else {
          dateRange = dateUtils.getDateRange(myDate.name)
        }
        var dateType = myDate.dateType
        if (myDate.name === 'lastSevenDays' && dateType !== 'week') {
          dateType = 'week'
        }
        this.setData({
          startDate: dateRange.startDate,
          stopDate: dateRange.stopDate,
          dateType: dateType,
          hanzi: myDate.hanzi || dateRange.name,
          update: false
        })
      }
      this.loadPage()
    }
  },

  initDate() {
    var myDate = wx.getStorageSync('myDate')
    if (myDate) {
      var dateRange
      if (myDate.name === 'custom') {
        dateRange = dateUtils.getDateRange(myDate.name, myDate.startDate, myDate.stopDate)
      } else {
        dateRange = dateUtils.getDateRange(myDate.name)
      }
      var dateType = myDate.dateType
      if (myDate.name === 'lastSevenDays' && dateType !== 'week') {
        dateType = 'week'
      }
      this.setData({
        startDate: dateRange.startDate,
        stopDate: dateRange.stopDate,
        dateType: dateType,
        hanzi: myDate.hanzi || dateRange.name
      })
    } else {
      var range = dateUtils.getDateRange('lastSevenDays')
      this.setData({
        dateType: 'week',
        startDate: range.startDate,
        stopDate: range.stopDate,
        hanzi: range.name
      })
    }
  },

  toDatePage() {
    this.setData({ update: true })
    wx.navigateTo({
      url: '/subPackage-charts/pages/sel/date/date?startDate=' + this.data.startDate +
        '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType
    })
  },

  onPullDownRefresh() {
    this.loadPage(true)
  },

  scope() {
    return {
      distributerId: this.data.distributerId,
      operatorUserId: this.data.operatorUserId,
      startDate: this.data.startDate,
      endDate: this.data.stopDate
    }
  },

  loadPage(fromPullDown) {
    if (!this.data.distributerId || !this.data.operatorUserId) {
      this.setData({ loading: false, errorText: '登录信息已失效' })
      return
    }
    this.setData({ loading: true, errorText: '' })
    var self = this
    var dictPromise = Object.keys(this.data.severityMap).length
      ? Promise.resolve()
      : this.loadDictionaries()
    dictPromise.then(() => getAfterSalesOverview(this.scope()))
      .then((res) => {
        var result = (res && res.result) || {}
        if (result.code !== 0) throw new Error(result.msg || '数据加载失败')
        var data = result.data || {}
        var kpi = data.kpi || {}
        var issueTypeStats = data.issueTypeStats || []
        self.setData({
          loading: false,
          kpi: {
            deliveredOrderCount: number(kpi, 'deliveredOrderCount'),
            problemOrderCount: number(kpi, 'problemOrderCount'),
            normalOrderCount: number(kpi, 'normalOrderCount'),
            lightCount: number(kpi, 'lightCount'),
            mediumCount: number(kpi, 'mediumCount'),
            seriousCount: number(kpi, 'seriousCount'),
            pendingCount: number(kpi, 'pendingCount'),
            processingCount: number(kpi, 'processingCount'),
            waitConfirmCount: number(kpi, 'waitConfirmCount'),
            completedCount: number(kpi, 'completedCount')
          },
          overview: { totalIssue: number(data, 'totalIssue') },
          issueTypeStats: issueTypeStats,
          cases: self.normalizeCases(data.list || [])
        })
        self.renderIssueTypeChart(issueTypeStats)
      })
      .catch((error) => {
        self.setData({ loading: false, errorText: error.message || '加载失败' })
      })
      .finally(() => {
        if (fromPullDown) wx.stopPullDownRefresh()
      })
  },

  renderIssueTypeChart(stats) {
    if (!stats || stats.length === 0) return
    var data = stats.map(function (item, idx) {
      return {
        value: item.count,
        name: item.issueTypeName,
        itemStyle: { color: ISSUE_TYPE_COLORS[idx % ISSUE_TYPE_COLORS.length] }
      }
    })
    var ecComponent = this.selectComponent('#issueTypeChart')
    if (!ecComponent) return
    ecComponent.init((canvas, width, height) => {
      var chart = echarts.init(canvas, null, { width: width, height: height })
      canvas.setStorageSync = undefined
      chart.setOption({
        tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
        series: [{
          name: '问题类型',
          type: 'pie',
          radius: ['40%', '68%'],
          center: ['50%', '50%'],
          avoidLabelOverlap: true,
          label: { show: false },
          data: data
        }]
      })
      return chart
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

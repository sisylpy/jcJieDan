import {
  getDrivers,
  getDispatchPerformanceRoutes
} from '../../../../lib/apiRouteDispatch.js'

var app = getApp()

Page({
  data: {
    navBarHeight: 0,
    loading: false,
    errorMessage: '',
    activeRange: 'today',
    rangeOptions: [
      { key: 'today', label: '今天' },
      { key: 'yesterday', label: '昨天' },
      { key: 'week', label: '近7天' },
      { key: 'month', label: '本月' }
    ],
    startDate: '',
    endDate: '',
    driverOptions: [{ driverUserId: null, driverName: '全部司机' }],
    driverIndex: 0,
    summary: defaultSummary(),
    drivers: [],
    routes: [],
    distanceBasisLabel: '华为道路规划里程，非GPS实际行驶里程'
  },

  onLoad: function () {
    this.setData({
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR
    })
    this.applyQuickRange('today', false)
    this.loadDriverOptions()
    this.loadData()
  },

  onPullDownRefresh: function () {
    this.loadData(true)
  },

  onQuickRangeTap: function (e) {
    this.applyQuickRange(e.currentTarget.dataset.key, true)
  },

  applyQuickRange: function (key, reload) {
    var today = startOfDay(new Date())
    var start = new Date(today.getTime())
    var end = new Date(today.getTime())
    if (key === 'yesterday') {
      start.setDate(start.getDate() - 1)
      end.setDate(end.getDate() - 1)
    } else if (key === 'week') {
      start.setDate(start.getDate() - 6)
    } else if (key === 'month') {
      start.setDate(1)
    }
    this.setData({
      activeRange: key,
      startDate: formatDate(start),
      endDate: formatDate(end)
    })
    if (reload) this.loadData()
  },

  onStartDateChange: function (e) {
    var startDate = e.detail.value
    var endDate = this.data.endDate
    if (startDate > endDate) endDate = startDate
    this.setData({ activeRange: 'custom', startDate: startDate, endDate: endDate })
    this.loadData()
  },

  onEndDateChange: function (e) {
    var endDate = e.detail.value
    var startDate = this.data.startDate
    if (endDate < startDate) startDate = endDate
    this.setData({ activeRange: 'custom', startDate: startDate, endDate: endDate })
    this.loadData()
  },

  onDriverChange: function (e) {
    this.setData({ driverIndex: Number(e.detail.value) || 0 })
    this.loadData()
  },

  loadDriverOptions: function () {
    var cached = wx.getStorageSync('disInfo') || {}
    var userInfo = wx.getStorageSync('userInfo') || {}
    var disId = cached.nxDistributerId
      || (userInfo.nxDistributerEntity && userInfo.nxDistributerEntity.nxDistributerId)
    if (!disId) return
    var that = this
    getDrivers({ disId: disId }).then(function (res) {
      if (!res.result || res.result.code !== 0) return
      var options = [{ driverUserId: null, driverName: '全部司机' }]
      ;(res.result.data || []).forEach(function (driver) {
        if (!driver || !driver.nxDistributerUserId) return
        options.push({
          driverUserId: driver.nxDistributerUserId,
          driverName: driver.nxDiuWxNickName || ('司机 ' + driver.nxDistributerUserId)
        })
      })
      that.setData({ driverOptions: options })
    }).catch(function () {
      // 司机筛选加载失败不影响历史路线主页面。
    })
  },

  loadData: function (fromPullDown) {
    if (!this.data.startDate || !this.data.endDate) return
    var option = this.data.driverOptions[this.data.driverIndex] || {}
    var that = this
    this.setData({ loading: true, errorMessage: '' })
    getDispatchPerformanceRoutes({
      startDate: this.data.startDate,
      endDate: this.data.endDate,
      driverUserId: option.driverUserId
    }).then(function (res) {
      var result = res.result || {}
      if (result.code !== 0) {
        throw new Error(result.msg || '派单记录加载失败')
      }
      var data = result.data || {}
      that.setData({
        loading: false,
        summary: data.summary || defaultSummary(),
        drivers: decorateDrivers(data.drivers || []),
        routes: decorateRoutes(data.routes || []),
        distanceBasisLabel: data.distanceBasisLabel || that.data.distanceBasisLabel
      })
    }).catch(function (error) {
      that.setData({
        loading: false,
        errorMessage: (error && error.message) || '派单记录加载失败，请稍后重试',
        summary: defaultSummary(),
        drivers: [],
        routes: []
      })
    }).finally(function () {
      if (fromPullDown) wx.stopPullDownRefresh()
    })
  },

  retryLoad: function () {
    this.loadData()
  },

  openRouteDetail: function (e) {
    var routeId = e.currentTarget.dataset.routeId
    if (!routeId) return
    wx.navigateTo({
      url: '../dispatchPerformanceDetail/dispatchPerformanceDetail?driverRouteId=' + routeId
    })
  }
})

function decorateRoutes(routes) {
  return routes.map(function (route, index) {
    var showDateHeader = index === 0 || routes[index - 1].routeDate !== route.routeDate
    return Object.assign({}, route, { showDateHeader: showDateHeader })
  })
}

function decorateDrivers(drivers) {
  return drivers.map(function (driver) {
    var name = driver.driverName || '司机'
    return Object.assign({}, driver, { cardInitial: name.charAt(0) || '司' })
  })
}

function defaultSummary() {
  return {
    routeCount: 0,
    completedRouteCount: 0,
    activeRouteCount: 0,
    closedRouteCount: 0,
    driverCount: 0,
    totalStopCount: 0,
    deliveredStopCount: 0,
    totalPlannedDistanceText: '0 米',
    completedPlannedDistanceText: '0 米',
    totalPlannedDurationText: '0分钟'
  }
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function formatDate(date) {
  var year = date.getFullYear()
  var month = pad2(date.getMonth() + 1)
  var day = pad2(date.getDate())
  return year + '-' + month + '-' + day
}

function pad2(value) {
  return value < 10 ? '0' + value : String(value)
}

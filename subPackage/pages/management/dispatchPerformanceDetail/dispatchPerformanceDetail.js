import { getDispatchPerformanceRouteDetail } from '../../../../lib/apiRouteDispatch.js'

var app = getApp()

Page({
  data: {
    navBarHeight: 0,
    driverRouteId: null,
    loading: true,
    errorMessage: '',
    route: null
  },

  onLoad: function (options) {
    this.setData({
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      driverRouteId: Number(options.driverRouteId) || null
    })
    this.loadDetail()
  },

  loadDetail: function () {
    if (!this.data.driverRouteId) {
      this.setData({ loading: false, errorMessage: '缺少路线编号' })
      return
    }
    var that = this
    this.setData({ loading: true, errorMessage: '' })
    getDispatchPerformanceRouteDetail(this.data.driverRouteId).then(function (res) {
      var result = res.result || {}
      if (result.code !== 0) throw new Error(result.msg || '路线详情加载失败')
      that.setData({
        loading: false,
        route: decorateRoute(result.data || {})
      })
    }).catch(function (error) {
      that.setData({
        loading: false,
        errorMessage: (error && error.message) || '路线详情加载失败'
      })
    })
  }
})

function decorateRoute(route) {
  var stops = (route.stops || []).map(function (stop, index) {
    return Object.assign({}, stop, {
      displaySeq: stop.stopSeq || (index + 1),
      delivered: stop.stopStatus === 'DELIVERED'
    })
  })
  return Object.assign({}, route, { stops: stops })
}

var load = require('../../../../lib/load.js')
var app = getApp()

import {
  getDispatchDeliveryToday
} from '../../../../lib/apiRouteDispatch.js'

import {
  resolveSession,
  getTodayDateStr
} from '../_session.js'

import { getPageViewModel } from '../_pageView.js'

import {
  submitDeliveryComplete,
  submitDeliveryException
} from '../_driverDeliveryActions.js'

var DELIVERY_BATCH_CODE = 'MORNING'

function applyPageView(page, data) {
  var pageViewModel = getPageViewModel(data)
  page.setData({
    loading: false,
    pageViewModel: pageViewModel,
    loadError: pageViewModel ? '' : '后端未返回 pageViewModel',
    actionSubmitting: false
  })
}

Page({
  data: {
    loading: true,
    disId: null,
    driverUserId: null,
    operatorUserId: null,
    pageViewModel: null,
    loadError: '',
    actionSubmitting: false
  },

  onLoad: function () {
    var globalData = app.globalData
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR
    })
    var session = resolveSession()
    this.setData({
      disId: session.disId,
      driverUserId: session.driverUserId,
      operatorUserId: session.operatorUserId
    })
  },

  onShow: function () {
    this.loadData()
  },

  onPullDownRefresh: function () {
    this.loadData(true)
  },

  loadData: function (fromPullDown, silent) {
    var that = this
    if (!this.data.disId || !this.data.driverUserId) {
      this.setData({
        loading: false,
        pageViewModel: null,
        loadError: '未获取到司机信息，请重新登录'
      })
      if (fromPullDown) {
        wx.stopPullDownRefresh()
      }
      return
    }
    if (!fromPullDown && !silent) {
      load.showLoading('加载配送任务')
    }
    getDispatchDeliveryToday({
      disId: this.data.disId,
      driverUserId: this.data.driverUserId,
      routeDate: getTodayDateStr(),
      batchCode: DELIVERY_BATCH_CODE
    }).then(function (res) {
      if (!silent) {
        load.hideLoading()
      }
      if (fromPullDown) {
        wx.stopPullDownRefresh()
      }
      if (res.result.code !== 0) {
        that.setData({
          loading: false,
          pageViewModel: null,
          loadError: res.result.msg || '加载失败'
        })
        return
      }
      applyPageView(that, res.result.data)
    }).catch(function () {
      if (!silent) {
        load.hideLoading()
      }
      if (fromPullDown) {
        wx.stopPullDownRefresh()
      }
      that.setData({
        loading: false,
        pageViewModel: null,
        loadError: '网络异常，请稍后重试'
      })
    })
  },

  onStopTap: function (e) {
    var stopIndex = e.currentTarget.dataset.stopIndex
    var vm = this.data.pageViewModel || {}
    var stopList = vm.stopList || []
    var stop = stopList[stopIndex]
    if (!stop || !stop.deliveryStopId) {
      return
    }
    wx.navigateTo({
      url: '../driverStopDetail/driverStopDetail?deliveryStopId=' + stop.deliveryStopId + '&source=delivery'
    })
  },

  onNavTap: function () {
    var vm = this.data.pageViewModel || {}
    wx.showToast({
      title: vm.navPendingLabel || '导航功能待接入',
      icon: 'none'
    })
  },

  onCompleteTap: function (e) {
    var that = this
    if (this.data.actionSubmitting) {
      return
    }
    var stopIndex = e.currentTarget.dataset.stopIndex
    var vm = this.data.pageViewModel || {}
    var stopList = vm.stopList || []
    var stop = stopList[stopIndex]
    if (!stop || !stop.deliveryStopId) {
      return
    }
    if (!stop.showComplete) {
      return
    }
    submitDeliveryComplete({
      deliveryStopId: stop.deliveryStopId,
      operatorUserId: this.data.operatorUserId,
      onSubmitStart: function () {
        that.setData({ actionSubmitting: true })
        load.showLoading('提交中')
      },
      onSuccess: function () {
        that.loadData(false, true)
      },
      onAlways: function () {
        load.hideLoading()
        that.setData({ actionSubmitting: false })
      }
    })
  },

  onExceptionTap: function (e) {
    var that = this
    if (this.data.actionSubmitting) {
      return
    }
    var stopIndex = e.currentTarget.dataset.stopIndex
    var vm = this.data.pageViewModel || {}
    var stopList = vm.stopList || []
    var stop = stopList[stopIndex]
    if (!stop || !stop.deliveryStopId) {
      return
    }
    if (!stop.showException) {
      return
    }
    submitDeliveryException({
      deliveryStopId: stop.deliveryStopId,
      operatorUserId: this.data.operatorUserId,
      onSubmitStart: function () {
        that.setData({ actionSubmitting: true })
        load.showLoading('提交中')
      },
      onSuccess: function () {
        that.loadData(false, true)
      },
      onAlways: function () {
        load.hideLoading()
        that.setData({ actionSubmitting: false })
      }
    })
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 })
  }
})

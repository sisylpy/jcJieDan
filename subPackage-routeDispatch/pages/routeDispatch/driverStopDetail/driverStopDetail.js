var load = require('../../../../lib/load.js')
var app = getApp()

import {
  getDispatchDeliveryToday,
  getDispatchLoadingToday
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

var BATCH_CODE = 'MORNING'

Page({
  data: {
    loading: true,
    disId: null,
    driverUserId: null,
    operatorUserId: null,
    deliveryStopId: null,
    source: 'delivery',
    pageViewModel: null,
    stopDetail: null,
    loadError: '',
    actionSubmitting: false
  },

  onLoad: function (options) {
    var globalData = app.globalData
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      deliveryStopId: options.deliveryStopId || null,
      source: options.source || 'delivery'
    })
    var session = resolveSession()
    this.setData({
      disId: session.disId,
      driverUserId: session.driverUserId,
      operatorUserId: session.operatorUserId
    })
    this.loadDetail()
  },

  loadDetail: function () {
    var that = this
    if (!this.data.disId || !this.data.driverUserId || !this.data.deliveryStopId) {
      this.setData({
        loading: false,
        pageViewModel: null,
        stopDetail: null,
        loadError: '缺少必要参数'
      })
      return
    }
    load.showLoading('加载客户详情')
    var fetcher = this.data.source === 'loading' ? getDispatchLoadingToday : getDispatchDeliveryToday
    fetcher({
      disId: this.data.disId,
      driverUserId: this.data.driverUserId,
      routeDate: getTodayDateStr(),
      batchCode: BATCH_CODE
    }).then(function (res) {
      load.hideLoading()
      if (res.result.code !== 0) {
        that.setData({
          loading: false,
          pageViewModel: null,
          stopDetail: null,
          loadError: res.result.msg || '加载失败'
        })
        return
      }
      var pageViewModel = getPageViewModel(res.result.data)
      var stopDetail = pageViewModel && pageViewModel.stopDetail
      that.setData({
        loading: false,
        pageViewModel: pageViewModel,
        stopDetail: stopDetail || null,
        loadError: stopDetail ? '' : '后端暂未返回 stopDetail'
      })
    }).catch(function () {
      load.hideLoading()
      that.setData({
        loading: false,
        pageViewModel: null,
        stopDetail: null,
        loadError: '网络异常，请稍后重试'
      })
    })
  },

  onNavTap: function () {
    var stopDetail = this.data.stopDetail || {}
    wx.showToast({
      title: stopDetail.navPendingLabel || '导航功能待接入',
      icon: 'none'
    })
  },

  onCompleteTap: function () {
    var that = this
    if (this.data.actionSubmitting) {
      return
    }
    var detail = this.data.stopDetail || {}
    if (!detail.deliveryStopId || !detail.showComplete) {
      return
    }
    submitDeliveryComplete({
      deliveryStopId: detail.deliveryStopId,
      operatorUserId: this.data.operatorUserId,
      onSubmitStart: function () {
        that.setData({ actionSubmitting: true })
        load.showLoading('提交中')
      },
      onSuccess: function () {
        that.loadDetail()
      },
      onAlways: function () {
        load.hideLoading()
        that.setData({ actionSubmitting: false })
      }
    })
  },

  onExceptionTap: function () {
    var that = this
    if (this.data.actionSubmitting) {
      return
    }
    var detail = this.data.stopDetail || {}
    if (!detail.deliveryStopId || !detail.showException) {
      return
    }
    submitDeliveryException({
      deliveryStopId: detail.deliveryStopId,
      operatorUserId: this.data.operatorUserId,
      onSubmitStart: function () {
        that.setData({ actionSubmitting: true })
        load.showLoading('提交中')
      },
      onSuccess: function () {
        that.loadDetail()
      },
      onAlways: function () {
        load.hideLoading()
        that.setData({ actionSubmitting: false })
      }
    })
  },

  onCallPhone: function () {
    var phone = (this.data.stopDetail || {}).customerPhone
    if (!phone) {
      return
    }
    wx.makePhoneCall({
      phoneNumber: String(phone)
    })
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 })
  }
})

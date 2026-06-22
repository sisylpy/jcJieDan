var load = require('../../../../lib/load.js')
var app = getApp()

import {
  getDispatchDeliveryToday
} from '../../../../lib/apiRouteDispatch.js'

import { resolveSession } from '../_session.js'
import { getPageViewModel } from '../_pageView.js'

var DELIVERY_BATCH_CODE = 'MORNING'

function applyPageViewModel(page, data) {
  var pageViewModel = getPageViewModel(data)
  page.setData({
    loading: false,
    pageViewModel: pageViewModel,
    loadError: pageViewModel ? '' : '后端未返回 pageViewModel'
  })
}

Page({
  data: {
    loading: true,
    pageViewModel: null,
    loadError: ''
  },

  onLoad: function () {
    var globalData = app.globalData
    this.setData({
      navBarHeight: globalData.navBarHeight * globalData.rpxR
    })
  },

  onShow: function () {
    this.loadPage()
  },

  onPullDownRefresh: function () {
    this.loadPage(true)
  },

  loadPage: function (fromPullDown) {
    var that = this
    var disId = resolveSession().disId
    if (!disId) {
      this.setLoadError('未获取到配送商信息，请重新登录', fromPullDown)
      return
    }
    if (!fromPullDown) {
      load.showLoading('加载配送任务')
    }
    getDispatchDeliveryToday({
      disId: disId,
      batchCode: DELIVERY_BATCH_CODE
    }).then(function (res) {
      if (!fromPullDown) {
        load.hideLoading()
      }
      if (fromPullDown) {
        wx.stopPullDownRefresh()
      }
      if (!res.result || res.result.code !== 0) {
        that.setLoadError((res.result && res.result.msg) || '加载失败', false)
        return
      }
      applyPageViewModel(that, res.result.data)
    }).catch(function () {
      if (!fromPullDown) {
        load.hideLoading()
      }
      if (fromPullDown) {
        wx.stopPullDownRefresh()
      }
      that.setLoadError('网络异常，请稍后重试', false)
    })
  },

  setLoadError: function (loadError, fromPullDown) {
    this.setData({
      loading: false,
      pageViewModel: null,
      loadError: loadError
    })
    if (fromPullDown) {
      wx.stopPullDownRefresh()
    }
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 })
  }
})

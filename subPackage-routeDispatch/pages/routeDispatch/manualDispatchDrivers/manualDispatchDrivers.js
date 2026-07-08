var load = require('../../../../lib/load.js')
var app = getApp()

import { postManualDispatchDriverPanorama } from '../../../../lib/apiRouteDispatch.js'

var PAYLOAD_STORAGE_KEY = 'routeDispatchManualDispatchPayload'

function normalizePrimaryAction(action) {
  if (!action || typeof action !== 'object') {
    return action
  }
  var enabled = action.enabled !== false && action.enabled !== 0
  return Object.assign({}, action, {
    toneClass: action.toneClass || (enabled ? 'stop-state-action' : 'stop-state-muted')
  })
}

function normalizeDriverCard(driver) {
  if (!driver || typeof driver !== 'object') {
    return driver
  }
  var blocked = driver.canSimulate === false || driver.canSimulate === 0
    || !!(driver.blockedReason && String(driver.blockedReason).trim())
  return Object.assign({}, driver, {
    cardToneClass: blocked ? 'driver-card-blocked' : '',
    primaryAction: normalizePrimaryAction(driver.primaryAction)
  })
}

function normalizePageData(pageData) {
  if (!pageData || typeof pageData !== 'object') {
    return pageData
  }
  var drivers = (pageData.drivers || []).map(normalizeDriverCard)
  return Object.assign({}, pageData, { drivers: drivers })
}

Page({
  data: {
    loading: true,
    pageData: null,
    loadError: '',
    requestPayload: null
  },

  onLoad: function () {
    var globalData = app.globalData
    var payload = wx.getStorageSync(PAYLOAD_STORAGE_KEY) || null
    wx.removeStorageSync(PAYLOAD_STORAGE_KEY)
    this.setData({
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      requestPayload: payload
    })
    if (!payload || !payload.driverPanoramaPath) {
      this.setLoadError('缺少人工调度参数 driverPanoramaPath')
      return
    }
    this.loadPage()
  },

  onPullDownRefresh: function () {
    this.loadPage(true)
  },

  loadPage: function (fromPullDown) {
    var that = this
    var payload = this.data.requestPayload
    if (!payload || !payload.driverPanoramaPath) {
      this.setLoadError('缺少人工调度参数 driverPanoramaPath', fromPullDown)
      return
    }
    if (!fromPullDown) {
      load.showLoading('加载司机列表')
    }
    postManualDispatchDriverPanorama(payload).then(function (res) {
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
      var pageData = normalizePageData(res.result.data || null)
      that.setData({
        loading: false,
        pageData: pageData,
        loadError: pageData ? '' : '后端未返回数据'
      })
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
      pageData: null,
      loadError: loadError
    })
    if (fromPullDown) {
      wx.stopPullDownRefresh()
    }
  },

  onSimulateAction: function (e) {
    var index = e.currentTarget.dataset.driverIndex
    if (index == null || index === '') {
      return
    }
    var pageData = this.data.pageData || {}
    var drivers = pageData.drivers || []
    var driver = drivers[index]
    if (!driver) {
      return
    }
    var action = driver.primaryAction || {}
    if (!action.label) {
      return
    }
    if (driver.canSimulate === false || driver.canSimulate === 0) {
      wx.showToast({ title: driver.blockedReason || '当前不可模拟', icon: 'none' })
      return
    }
    if (action.enabled === false || action.enabled === 0) {
      wx.showToast({ title: action.disabledReason || '当前不可操作', icon: 'none' })
      return
    }
    if (!action.payload || typeof action.payload !== 'object') {
      wx.showToast({ title: '缺少 primaryAction.payload', icon: 'none' })
      return
    }
    wx.setStorageSync('routeDispatchDriverRouteEditPayload', action.payload)
    wx.navigateTo({
      url: '/subPackage-routeDispatch/pages/routeDispatch/driverRouteEdit/driverRouteEdit',
      fail: function (err) {
        wx.showToast({
          title: (err && err.errMsg) || '跳转失败',
          icon: 'none'
        })
      }
    })
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 })
  }
})

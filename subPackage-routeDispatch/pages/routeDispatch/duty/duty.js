var load = require('../../../../lib/load.js')
var app = getApp()

import { getAvailableDrivers, driverCheckIn, driverCheckOut } from '../../../../lib/apiRouteDispatch.js'
import { resolveSession, getTodayDateStr } from '../_session.js'

Page({
  data: {
    loading: true,
    submitting: false,
    disId: null,
    operatorUserId: null,
    currentDriverUserId: null,
    dutyDate: '',
    pageData: null,
    loadError: ''
  },

  onLoad: function () {
    var globalData = app.globalData
    var session = resolveSession()
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      disId: session.disId,
      operatorUserId: session.operatorUserId,
      currentDriverUserId: session.driverUserId,
      dutyDate: getTodayDateStr()
    })
  },

  onShow: function () {
    this.loadDrivers()
  },

  onPullDownRefresh: function () {
    this.loadDrivers(true)
  },

  loadDrivers: function (fromPullDown) {
    var that = this
    if (!this.data.disId) {
      this.setData({
        loading: false,
        pageData: null,
        loadError: '未获取到配送商信息，请重新登录'
      })
      if (fromPullDown) {
        wx.stopPullDownRefresh()
      }
      return
    }
    if (!fromPullDown) {
      load.showLoading('加载司机')
    }
    var dutyDate = this.data.dutyDate || getTodayDateStr()
    getAvailableDrivers({
      disId: this.data.disId,
      routeDate: dutyDate
    }).then(function (res) {
      load.hideLoading()
      if (fromPullDown) {
        wx.stopPullDownRefresh()
      }
      if (!res.result || res.result.code !== 0) {
        that.setData({
          loading: false,
          pageData: null,
          loadError: (res.result && res.result.msg) || '加载司机失败'
        })
        return
      }
      that.setData({
        loading: false,
        pageData: res.result.data || null,
        loadError: res.result.data ? '' : '后端未返回数据'
      })
    }).catch(function () {
      load.hideLoading()
      if (fromPullDown) {
        wx.stopPullDownRefresh()
      }
      that.setData({
        loading: false,
        pageData: null,
        loadError: '网络异常，请稍后重试'
      })
    })
  },

  onToggleDispatch: function (e) {
    var index = e.currentTarget.dataset.index
    var pageData = this.data.pageData || {}
    var drivers = pageData.driverCards || []
    var driver = drivers[index]
    var that = this
    if (this.data.submitting || !driver || !driver.driverUserId) {
      return
    }
    var primaryAction = driver.primaryAction || {}
    if (!driver.canToggleDuty || !primaryAction.enabled) {
      wx.showToast({
        title: driver.toggleDisabledReason || primaryAction.disabledReason || '当前不可操作',
        icon: 'none'
      })
      return
    }
    var actionType = String(primaryAction.actionType || '').toUpperCase()
    var driverName = driver.driverName
    if (!driverName) {
      wx.showToast({ title: '缺少 driverName', icon: 'none' })
      return
    }
    if (actionType === 'TOGGLE_DUTY_ON') {
      wx.showModal({
        title: '开启可派',
        content: '开启后，「' + driverName + '」将参与今日派车，确认开启？',
        success: function (res) {
          if (res.confirm) {
            that.submitDuty('on', driver.driverUserId)
          }
        }
      })
      return
    }
    if (actionType === 'TOGGLE_DUTY_OFF') {
      wx.showModal({
        title: '关闭可派',
        content: '关闭后，系统不会给「' + driverName + '」派单，确认关闭？',
        success: function (res) {
          if (res.confirm) {
            that.submitDuty('off', driver.driverUserId)
          }
        }
      })
      return
    }
    wx.showToast({ title: '未知操作类型', icon: 'none' })
  },

  submitDuty: function (action, driverUserId) {
    var that = this
    var apiFn = action === 'on' ? driverCheckIn : driverCheckOut
    this.setData({ submitting: true })
    load.showLoading(action === 'on' ? '开启中' : '关闭中')
    apiFn({
      disId: this.data.disId,
      driverUserId: driverUserId,
      dutyDate: this.data.dutyDate,
      operatorUserId: this.data.operatorUserId
    }).then(function (res) {
      load.hideLoading()
      that.setData({ submitting: false })
      if (res.result.code !== 0) {
        wx.showToast({
          title: res.result.msg || '操作失败',
          icon: 'none'
        })
        return
      }
      wx.showToast({
        title: action === 'on' ? '已开启可派' : '已关闭可派',
        icon: 'success'
      })
      that.loadDrivers()
    }).catch(function () {
      load.hideLoading()
      that.setData({ submitting: false })
    })
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 })
  }
})

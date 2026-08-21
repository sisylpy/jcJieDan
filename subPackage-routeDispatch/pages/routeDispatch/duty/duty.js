var load = require('../../../../lib/load.js')
var app = getApp()

import { getAvailableDrivers, driverCheckIn, driverCheckOut, updateDriverEmploymentType } from '../../../../lib/apiRouteDispatch.js'
import { resolveSession } from '../_session.js'

function applyPageData(page, data) {
  if (data && data.driverCards) {
    data.driverCards = data.driverCards.map(function (card) {
      return Object.assign({}, card, {
        dutySwitchOn: card.dutyStatus !== 'OFF_DUTY'
      })
    })
  }
  page.setData({
    loading: false,
    pageData: data || null,
    loadError: data ? '' : '后端未返回数据'
  })
}

Page({
  data: {
    loading: true,
    submitting: false,
    disId: null,
    operatorUserId: null,
    currentDriverUserId: null,
    pageData: null,
    loadError: ''
  },

  onLoad: function () {
    var globalData = app.globalData
    var session = resolveSession()
    this.setData({
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      disId: session.disId,
      operatorUserId: session.operatorUserId,
      currentDriverUserId: session.driverUserId
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
    if (!this.data.disId) {
      this.setLoadError('未获取到配送商信息，请重新登录', fromPullDown)
      return
    }
    if (!fromPullDown) {
      load.showLoading('加载司机')
    }
    getAvailableDrivers({
      disId: this.data.disId
    }).then(function (res) {
      if (!res.result || res.result.code !== 0) {
        that.setLoadError((res.result && res.result.msg) || '加载司机失败', false)
        return
      }
      applyPageData(that, res.result.data)
    }).finally(function () {
      that.finishLoad(fromPullDown)
    })
  },

  finishLoad: function (fromPullDown) {
    if (!fromPullDown) {
      load.hideLoading()
    }
    if (fromPullDown) {
      wx.stopPullDownRefresh()
    }
    if (this.data.loading) {
      this.setData({ loading: false })
    }
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

  onDutySwitchChange: function (e) {
    var index = e.currentTarget.dataset.index
    var wantOn = e.detail.value
    var driver = (this.data.pageData && this.data.pageData.driverCards || [])[index]
    var switchKey = 'pageData.driverCards[' + index + '].dutySwitchOn'
    if (this.data.submitting || !driver || !driver.driverUserId) {
      this.setData({ [switchKey]: !wantOn })
      return
    }
    if (!driver.canToggleDuty) {
      wx.showToast({
        title: driver.toggleDisabledReason || '当前不可操作',
        icon: 'none'
      })
      this.setData({ [switchKey]: !wantOn })
      return
    }
    if (!driver.driverName) {
      wx.showToast({ title: '缺少 driverName', icon: 'none' })
      this.setData({ [switchKey]: !wantOn })
      return
    }
    var modal = wantOn
      ? {
          title: '开启可派',
          content: '开启后，「' + driver.driverName + '」会持续保持可派，直到手动关闭。确认开启？',
          duty: 'on'
        }
      : {
          title: '关闭可派',
          content: '关闭后，系统不会给「' + driver.driverName + '」派单，确认关闭？',
          duty: 'off'
        }
    var that = this
    wx.showModal({
      title: modal.title,
      content: modal.content,
      success: function (res) {
        if (res.confirm) {
          that.submitDuty(modal.duty, driver.driverUserId)
        } else {
          that.setData({ [switchKey]: !wantOn })
        }
      }
    })
  },

  submitDuty: function (action, driverUserId) {
    var that = this
    var apiFn = action === 'on' ? driverCheckIn : driverCheckOut
    this.setData({ submitting: true })
    load.showLoading(action === 'on' ? '开启中' : '关闭中')
    apiFn({
      disId: this.data.disId,
      driverUserId: driverUserId,
      operatorUserId: this.data.operatorUserId
    }).then(function (res) {
      load.hideLoading()
      that.setData({ submitting: false })
      if (res.result.code !== 0) {
        wx.showToast({ title: res.result.msg || '操作失败', icon: 'none' })
        return
      }
      wx.showToast({
        title: action === 'on' ? '已开启可派' : '已关闭可派',
        icon: 'success'
      })
      that.loadPage()
    }).catch(function (error) {
      load.hideLoading()
      that.setData({ submitting: false })
      wx.showToast({
        title: (error && error.message) || '操作失败，请检查登录状态',
        icon: 'none',
        duration: 3000
      })
      that.loadPage()
    })
  },

  onEmploymentTypeTap: function (e) {
    var index = e.currentTarget.dataset.index
    var employmentType = e.currentTarget.dataset.type
    var driver = (this.data.pageData && this.data.pageData.driverCards || [])[index]
    if (!driver || !driver.driverUserId || this.data.submitting
        || driver.employmentType === employmentType) return
    var that = this
    wx.showModal({
      title: employmentType === 'PART_TIME' ? '设为兼职司机' : '设为专职司机',
      content: employmentType === 'PART_TIME'
        ? '兼职司机送完最后一个客户后结束，不计算返回仓库。'
        : '专职司机送完后返回仓库，路线会计算返程。',
      success: function (res) {
        if (res.confirm) that.submitEmploymentType(driver, employmentType)
      }
    })
  },

  submitEmploymentType: function (driver, employmentType) {
    var that = this
    this.setData({ submitting: true })
    load.showLoading('保存中')
    updateDriverEmploymentType({
      disId: this.data.disId,
      operatorUserId: this.data.operatorUserId,
      driverUserId: driver.driverUserId,
      employmentType: employmentType
    }).then(function (res) {
      load.hideLoading()
      that.setData({ submitting: false })
      if (!res.result || res.result.code !== 0) {
        wx.showToast({ title: res.result && res.result.msg || '保存失败', icon: 'none' })
        return
      }
      wx.showToast({ title: '司机类型已更新', icon: 'success' })
      that.loadPage()
    }).catch(function (error) {
      load.hideLoading()
      that.setData({ submitting: false })
      wx.showToast({ title: error && error.message || '保存失败', icon: 'none' })
    })
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 })
  }
})

var load = require('../../../../lib/load.js')
var app = getApp()

import {
  getDispatchLoadingToday,
  confirmTaskLoading,
  confirmRouteLoadingAll,
  confirmDriverDepart
} from '../../../../lib/apiRouteDispatch.js'

import {
  resolveSession,
  getTodayDateStr
} from '../_session.js'

import { getPageViewModel } from '../_pageView.js'

var LOADING_BATCH_CODE = 'MORNING'

function applyPageView(page, data) {
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
      load.showLoading('加载装车任务')
    }
    getDispatchLoadingToday({
      disId: this.data.disId,
      driverUserId: this.data.driverUserId,
      routeDate: getTodayDateStr(),
      batchCode: LOADING_BATCH_CODE
    }).then(function (res) {
      if (!silent) {
        load.hideLoading()
      }
      if (fromPullDown) {
        wx.stopPullDownRefresh()
      }
      if (res.result.code !== 0) {
        if (silent) {
          wx.showToast({
            title: res.result.msg || '刷新失败',
            icon: 'none'
          })
          return
        }
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
      if (silent) {
        wx.showToast({
          title: '刷新失败，请稍后重试',
          icon: 'none'
        })
        return
      }
      that.setData({
        loading: false,
        pageViewModel: null,
        loadError: '网络异常，请稍后重试'
      })
    })
  },

  onConfirmLoadTap: function (e) {
    var that = this
    if (this.data.actionSubmitting) {
      return
    }
    var stopIndex = e.currentTarget.dataset.stopIndex
    var vm = this.data.pageViewModel || {}
    var stopList = vm.stopList || []
    var stop = stopList[stopIndex]
    if (!stop) {
      return
    }
    if (!stop.canConfirmLoad) {
      wx.showToast({
        title: stop.confirmLoadBlockedReason || '暂不可确认装车',
        icon: 'none'
      })
      return
    }
    if (!stop.taskId) {
      wx.showToast({
        title: '缺少 taskId，无法确认装车',
        icon: 'none'
      })
      return
    }
    wx.showModal({
      title: '确认装车',
      content: '确认客户「' + stop.customerName + '」已完成装车？',
      confirmText: '确认装车',
      success: function (res) {
        if (!res.confirm) {
          return
        }
        that.setData({ actionSubmitting: true })
        load.showLoading('提交中')
        confirmTaskLoading({
          disId: that.data.disId,
          taskId: stop.taskId,
          driverUserId: that.data.driverUserId,
          operatorUserId: that.data.operatorUserId
        }).then(function (resp) {
          load.hideLoading()
          that.setData({ actionSubmitting: false })
          if (resp.result.code !== 0) {
            wx.showToast({
              title: resp.result.msg || '确认装车失败',
              icon: 'none'
            })
            return
          }
          wx.showToast({
            title: '已确认装车',
            icon: 'success'
          })
          if (resp.result.data) {
            applyPageView(that, resp.result.data)
          } else {
            that.loadData(false, true)
          }
        }).catch(function () {
          load.hideLoading()
          that.setData({ actionSubmitting: false })
        })
      }
    })
  },

  onConfirmLoadAllTap: function () {
    var that = this
    var vm = this.data.pageViewModel || {}
    if (this.data.actionSubmitting) {
      return
    }
    if (!vm.confirmLoadAllEnabled) {
      wx.showToast({
        title: vm.confirmLoadAllLabel || '暂不可整车确认装车',
        icon: 'none'
      })
      return
    }
    if (!vm.driverRouteId) {
      wx.showToast({
        title: '缺少 driverRouteId，无法整车确认装车',
        icon: 'none'
      })
      return
    }
    wx.showModal({
      title: '整车确认装车',
      content: '确认整车所有客户已完成装车？',
      confirmText: '确认',
      success: function (res) {
        if (!res.confirm) {
          return
        }
        that.setData({ actionSubmitting: true })
        load.showLoading('提交中')
        confirmRouteLoadingAll({
          disId: that.data.disId,
          driverRouteId: vm.driverRouteId,
          driverUserId: that.data.driverUserId,
          operatorUserId: that.data.operatorUserId
        }).then(function (resp) {
          load.hideLoading()
          that.setData({ actionSubmitting: false })
          if (resp.result.code !== 0) {
            wx.showToast({
              title: resp.result.msg || '整车确认装车失败',
              icon: 'none'
            })
            return
          }
          wx.showToast({
            title: '整车已确认装车',
            icon: 'success'
          })
          if (resp.result.data) {
            applyPageView(that, resp.result.data)
          } else {
            that.loadData(false, true)
          }
        }).catch(function () {
          load.hideLoading()
          that.setData({ actionSubmitting: false })
        })
      }
    })
  },

  onDepartTap: function () {
    var that = this
    var vm = this.data.pageViewModel || {}
    if (this.data.actionSubmitting) {
      return
    }
    if (!vm.departActionEnabled) {
      wx.showToast({
        title: vm.departActionLabel || '暂不可出发',
        icon: 'none'
      })
      return
    }
    wx.showModal({
      title: '确认出发',
      content: '确认装车完成，开始配送？',
      confirmText: '确认出发',
      success: function (res) {
        if (!res.confirm) {
          return
        }
        that.setData({ actionSubmitting: true })
        load.showLoading('提交中')
        confirmDriverDepart({
          disId: that.data.disId,
          driverUserId: that.data.driverUserId,
          routeDate: getTodayDateStr(),
          batchCode: LOADING_BATCH_CODE,
          planId: vm.planId,
          operatorUserId: that.data.operatorUserId
        }).then(function (resp) {
          load.hideLoading()
          that.setData({ actionSubmitting: false })
          if (resp.result.code !== 0) {
            wx.showToast({
              title: resp.result.msg || '确认出发失败',
              icon: 'none'
            })
            return
          }
          wx.showToast({
            title: '已确认出发',
            icon: 'success'
          })
          if (resp.result.data) {
            applyPageView(that, resp.result.data)
          } else {
            that.loadData(false, true)
          }
        }).catch(function () {
          load.hideLoading()
          that.setData({ actionSubmitting: false })
        })
      }
    })
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 })
  }
})

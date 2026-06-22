var load = require('../../../../lib/load.js')
var app = getApp()

import {
  getSandboxToday,
  confirmSandboxStop,
  returnSandboxStopToSandbox,
  enterDriverRouteLoading
} from '../../../../lib/apiRouteDispatch.js'

import { resolveSession } from '../_session.js'
import {
  getPageViewModel,
  pickSectionCard,
  pickTimelineNode
} from '../_pageView.js'

var BATCH_CODE = 'MORNING'

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
    loadError: '',
    actionSubmitting: false
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
      load.showLoading('加载今日计划')
    }
    getSandboxToday({
      disId: disId,
      batchCode: BATCH_CODE
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

  onRouteCardPrimaryAction: function (e) {
    var ds = e.currentTarget.dataset
    var card = pickSectionCard(this.data.pageViewModel, ds.sectionIndex, ds.cardIndex)
    if (card && card.cardType === 'DRIVER_ROUTE' && card.primaryAction) {
      this.executePrimaryAction(card.primaryAction)
    }
  },

  onCardPrimaryAction: function (e) {
    var ds = e.currentTarget.dataset
    var card = pickSectionCard(this.data.pageViewModel, ds.sectionIndex, ds.cardIndex)
    if (card) {
      this.executePrimaryAction(card.primaryAction)
    }
  },

  onTimelineNodePrimaryAction: function (e) {
    var ds = e.currentTarget.dataset
    var node = pickTimelineNode(this.data.pageViewModel, ds.sectionIndex, ds.cardIndex, ds.nodeIndex)
    if (node && node.primaryAction) {
      this.executePrimaryAction(node.primaryAction)
    }
  },

  executePrimaryAction: function (action) {
    var that = this
    action = action || {}

    if (!action.actionType) {
      wx.showToast({ title: '缺少 primaryAction.actionType', icon: 'none' })
      return
    }

    var actionType = String(action.actionType).toUpperCase()
    if (actionType === 'STATUS_ONLY') {
      return
    }

    if (!action.payload || typeof action.payload !== 'object') {
      wx.showToast({ title: '缺少 primaryAction.payload', icon: 'none' })
      return
    }
    if (!action.enabled) {
      wx.showToast({ title: action.disabledReason || '当前不可操作', icon: 'none' })
      return
    }

    if (actionType === 'RETURN_TO_SANDBOX') {
      this.submitReturnToSandbox(action.payload)
      return
    }

    if (actionType === 'GO_LOADING') {
      this.submitGoLoading(action.payload)
      return
    }

    if (actionType === 'CONFIRM_SANDBOX_STOP') {
      if (this.data.actionSubmitting) {
        return
      }
      this.setData({ actionSubmitting: true })
      load.showLoading('确认中')
      confirmSandboxStop(action.payload).then(function (resp) {
        load.hideLoading()
        that.setData({ actionSubmitting: false })
        if (resp.result.code !== 0) {
          wx.showToast({ title: resp.result.msg || '确认失败', icon: 'none' })
          return
        }
        wx.showToast({ title: '已确认', icon: 'success' })
        applyPageViewModel(that, resp.result.data)
      }).catch(function () {
        load.hideLoading()
        that.setData({ actionSubmitting: false })
      })
      return
    }

    if (actionType === 'START_MANUAL_DISPATCH') {
      this.openManualDispatchDrivers(action.payload)
      return
    }

    wx.showToast({ title: '未接入 actionType: ' + actionType, icon: 'none' })
  },

  openManualDispatchDrivers: function (payload) {
    if (!payload.driverPanoramaPath) {
      wx.showToast({ title: 'payload 缺少 driverPanoramaPath', icon: 'none' })
      return
    }
    wx.setStorageSync('routeDispatchManualDispatchPayload', payload)
    wx.navigateTo({
      url: '/subPackage-routeDispatch/pages/routeDispatch/manualDispatchDrivers/manualDispatchDrivers'
    })
  },

  submitReturnToSandbox: function (payload) {
    var that = this
    if (!payload.deliveryStopId) {
      wx.showToast({ title: 'payload 缺少 deliveryStopId', icon: 'none' })
      return
    }
    if (!payload.confirmTitle || !payload.confirmMessage) {
      wx.showToast({ title: 'payload 缺少 confirmTitle / confirmMessage', icon: 'none' })
      return
    }
    wx.showModal({
      title: payload.confirmTitle,
      content: payload.confirmMessage,
      confirmText: '确认取消',
      cancelText: '不取消',
      success: function (res) {
        if (!res.confirm) {
          return
        }
        load.showLoading('取消中')
        returnSandboxStopToSandbox(payload).then(function (resp) {
          load.hideLoading()
          if (resp.result.code !== 0) {
            wx.showToast({ title: resp.result.msg || '取消失败', icon: 'none' })
            return
          }
          wx.showToast({ title: '已返回沙盘', icon: 'success' })
          applyPageViewModel(that, resp.result.data)
        }).catch(function () {
          load.hideLoading()
        })
      }
    })
  },

  submitGoLoading: function (payload) {
    var that = this
    var run = function () {
      if (that.data.actionSubmitting) {
        return
      }
      that.setData({ actionSubmitting: true })
      load.showLoading('提交中')
      enterDriverRouteLoading(payload).then(function (resp) {
        load.hideLoading()
        that.setData({ actionSubmitting: false })
        if (resp.result.code !== 0) {
          wx.showToast({ title: resp.result.msg || '操作失败', icon: 'none' })
          return
        }
        wx.showToast({ title: '已进入装车', icon: 'success' })
        applyPageViewModel(that, resp.result.data)
      }).catch(function () {
        load.hideLoading()
        that.setData({ actionSubmitting: false })
      })
    }
    if (payload.confirmTitle && payload.confirmMessage) {
      wx.showModal({
        title: payload.confirmTitle,
        content: payload.confirmMessage,
        confirmText: '确认',
        cancelText: '取消',
        success: function (res) {
          if (res.confirm) {
            run()
          }
        }
      })
      return
    }
    run()
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 })
  }
})

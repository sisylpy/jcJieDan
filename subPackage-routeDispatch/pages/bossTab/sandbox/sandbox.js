var load = require('../../../../lib/load.js')

import {
  getDispatchSandboxToday,
  returnSandboxStopToSandbox,
  enterDriverRouteLoading,
  overrideSandboxStopTimeWindow
} from '../../../../lib/apiRouteDispatch.js'

import { resolveSession } from '../../routeDispatch/_session.js'
import {
  getPageViewModel,
  pickSectionCard,
  pickTimelineNode
} from '../../routeDispatch/_pageView.js'
import { normalizeMapOverview } from '../../routeDispatch/_mapOverview.js'

var BATCH_CODE = 'MORNING'

function secondsToPickerValue(seconds) {
  if (seconds == null || seconds === '') {
    return ''
  }
  var total = parseInt(seconds, 10)
  if (isNaN(total)) {
    return ''
  }
  var h = Math.floor(total / 3600)
  var m = Math.floor((total % 3600) / 60)
  return ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2)
}

function pickerValueToSeconds(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') {
    return null
  }
  var parts = timeStr.split(':')
  if (parts.length < 2) {
    return null
  }
  var h = parseInt(parts[0], 10)
  var m = parseInt(parts[1], 10)
  if (isNaN(h) || isNaN(m)) {
    return null
  }
  return h * 3600 + m * 60
}

function applyPageViewModel(page, data) {
  var pageViewModel = getPageViewModel(data)
  if (pageViewModel) {
    var rawMapOverview = pageViewModel.mapOverview
    pageViewModel = Object.assign({}, pageViewModel, {
      mapOverview: rawMapOverview ? normalizeMapOverview(rawMapOverview) : null
    })
  }
  page.setData({
    loading: false,
    pageViewModel: pageViewModel,
    loadError: pageViewModel ? '' : '后端未返回 pageViewModel'
  })
}

Component({
  properties: {
    active: {
      type: Boolean,
      value: false
    },
    loadKey: {
      type: Number,
      value: 0
    }
  },

  data: {
    loading: true,
    pageViewModel: null,
    loadError: '',
    actionSubmitting: false,
    pageScrollEnabled: true,
    mapOverviewPadding: [132, 48, 112, 48],
    timeWindowModalVisible: false,
    timeWindowSubmitting: false,
    timeWindowForm: {
      customerName: '',
      customerWindowLabel: '',
      earliestPicker: '',
      latestPicker: '',
      reason: ''
    },
    timeWindowPayload: null
  },

  observers: {
    'active, loadKey': function (active, loadKey) {
      if (active && loadKey) {
        this.scheduleLoad()
      }
    }
  },

  methods: {
  scheduleLoad: function (forceRefresh) {
    if (forceRefresh) {
      this._pendingForceLoad = true
    }
    if (this._loadScheduled) {
      return
    }
    this._loadScheduled = true
    var that = this
    setTimeout(function () {
      that._loadScheduled = false
      var force = that._pendingForceLoad
      that._pendingForceLoad = false
      that.loadPageInternal(!!force)
    }, 0)
  },

  onRefreshMap: function () {
    this.scheduleLoad(true)
  },

  onMapTouchStart: function () {
    if (this.data.pageScrollEnabled) {
      this.setData({ pageScrollEnabled: false })
    }
  },

  onMapTouchEnd: function () {
    if (!this.data.pageScrollEnabled) {
      this.setData({ pageScrollEnabled: true })
    }
  },

  loadPage: function (fromPullDown) {
    this.scheduleLoad(!!fromPullDown)
  },

  loadPageInternal: function (forceRefresh) {
    var that = this
    var fromPullDown = !!forceRefresh
    var loadKey = this.properties.loadKey
    if (!fromPullDown) {
      if (this._inflightLoadKey === loadKey) {
        return
      }
      if (this._loadedKey === loadKey && this.data.pageViewModel && !this.data.loadError) {
        return
      }
    }
    var disId = resolveSession().disId
    if (!disId) {
      this.setLoadError('未获取到配送商信息，请重新登录', fromPullDown)
      return
    }
    this._inflightLoadKey = loadKey
    var seq = (this._loadSeq || 0) + 1
    this._loadSeq = seq
    if (!fromPullDown) {
      load.showLoading('加载今日计划')
    }
    getDispatchSandboxToday({
      disId: disId,
      batchCode: BATCH_CODE
    }).then(function (res) {
      if (seq !== that._loadSeq) {
        return
      }
      that._inflightLoadKey = null
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
      that._loadedKey = loadKey
      applyPageViewModel(that, res.result.data)
    }).catch(function () {
      if (seq !== that._loadSeq) {
        return
      }
      that._inflightLoadKey = null
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

  onDriverRouteEditTap: function (e) {
    var ds = e.currentTarget.dataset
    var card = pickSectionCard(this.data.pageViewModel, ds.sectionIndex, ds.cardIndex)
    if (!card || card.cardType !== 'DRIVER_ROUTE') {
      return
    }
    var action = card.routeEditAction || {}
    if (!action.payload || typeof action.payload !== 'object') {
      wx.showToast({ title: '缺少 routeEditAction.payload', icon: 'none' })
      return
    }
    if (action.enabled === false) {
      wx.showToast({ title: action.disabledReason || '当前不可编辑路线', icon: 'none' })
      return
    }
    wx.setStorageSync('routeDispatchDriverRouteEditPayload', action.payload)
    wx.navigateTo({
      url: '/subPackage-routeDispatch/pages/routeDispatch/driverRouteEdit/driverRouteEdit'
    })
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

    if (actionType === 'START_MANUAL_DISPATCH') {
      this.openManualDispatchDrivers(action.payload)
      return
    }

    if (actionType === 'OPEN_DRIVER_ROUTE_EDIT') {
      this.openDriverRouteEdit(action.payload, action)
      return
    }

    if (actionType === 'EDIT_TODAY_TIME_WINDOW') {
      this.openTimeWindowModal(action.payload)
      return
    }

    wx.showToast({ title: '未接入 actionType: ' + actionType, icon: 'none' })
  },

  openTimeWindowModal: function (payload) {
    payload = payload || {}
    var earliest = payload.earliestDeliveryTimeS
    var latest = payload.latestDeliveryTimeS
    this.setData({
      timeWindowModalVisible: true,
      timeWindowPayload: payload,
      timeWindowForm: {
        customerName: payload.customerName || '客户',
        customerWindowLabel: payload.customerWindowLabel || '',
        earliestPicker: secondsToPickerValue(earliest),
        latestPicker: secondsToPickerValue(latest),
        reason: ''
      }
    })
  },

  closeTimeWindowModal: function () {
    if (this.data.timeWindowSubmitting) {
      return
    }
    this.setData({
      timeWindowModalVisible: false,
      timeWindowPayload: null
    })
  },

  onTimeWindowEarliestChange: function (e) {
    this.setData({
      'timeWindowForm.earliestPicker': e.detail.value
    })
  },

  onTimeWindowLatestChange: function (e) {
    this.setData({
      'timeWindowForm.latestPicker': e.detail.value
    })
  },

  onTimeWindowReasonInput: function (e) {
    this.setData({
      'timeWindowForm.reason': e.detail.value
    })
  },

  submitTimeWindowModal: function () {
    var that = this
    if (this.data.timeWindowSubmitting) {
      return
    }
    var form = this.data.timeWindowForm || {}
    var payload = this.data.timeWindowPayload || {}
    var session = resolveSession()
    var latestSeconds = pickerValueToSeconds(form.latestPicker)
    if (latestSeconds == null) {
      wx.showToast({ title: '请选择最晚送达时间', icon: 'none' })
      return
    }
    var reason = (form.reason || '').trim()
    if (!reason) {
      wx.showToast({ title: '请填写调整原因', icon: 'none' })
      return
    }
    var request = Object.assign({}, payload, {
      disId: payload.disId || session.disId,
      batchCode: payload.batchCode || BATCH_CODE,
      operatorUserId: payload.operatorUserId || session.operatorUserId,
      earliestDeliveryTimeS: pickerValueToSeconds(form.earliestPicker),
      latestDeliveryTimeS: latestSeconds,
      reason: reason
    })
    this.setData({ timeWindowSubmitting: true })
    load.showLoading('保存中')
    overrideSandboxStopTimeWindow(request).then(function (resp) {
      load.hideLoading()
      that.setData({ timeWindowSubmitting: false })
      if (!resp.result || resp.result.code !== 0) {
        wx.showToast({ title: (resp.result && resp.result.msg) || '保存失败', icon: 'none' })
        return
      }
      that.setData({ timeWindowModalVisible: false, timeWindowPayload: null })
      wx.showToast({ title: '已更新送达时间', icon: 'success' })
      applyPageViewModel(that, resp.result.data)
    }).catch(function () {
      load.hideLoading()
      that.setData({ timeWindowSubmitting: false })
      wx.showToast({ title: '网络异常', icon: 'none' })
    })
  },

  openDriverRouteEdit: function (payload, action) {
    action = action || {}
    if (!payload || typeof payload !== 'object') {
      wx.showToast({ title: '缺少 routeEditAction.payload', icon: 'none' })
      return
    }
    if (action.enabled === false) {
      wx.showToast({ title: action.disabledReason || '当前不可编辑路线', icon: 'none' })
      return
    }
    wx.setStorageSync('routeDispatchDriverRouteEditPayload', payload)
    wx.navigateTo({
      url: '/subPackage-routeDispatch/pages/routeDispatch/driverRouteEdit/driverRouteEdit'
    })
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
  }
  }
})

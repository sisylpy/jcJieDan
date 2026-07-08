var load = require('../../../../lib/load.js')
var app = getApp()

import {
  postDriverRouteEditPage,
  postDriverRouteEditPreview,
  postDriverRouteEditConfirm,
  returnSandboxStopToSandbox,
  overrideSandboxStopTimeWindow
} from '../../../../lib/apiRouteDispatch.js'
import { getPageViewModel } from '../_pageView.js'
import { normalizeMapOverview } from '../_mapOverview.js'
import { resolveSession } from '../_session.js'

var timeWindowModal = require('../../../utils/timeWindowModal.js')

var EDIT_PAYLOAD_STORAGE_KEY = 'routeDispatchDriverRouteEditPayload'

function eventNodeDetail(e) {
  if (e && e.detail && (e.detail.nodeIndex != null || e.detail.index != null)) {
    return e.detail
  }
  return (e && e.currentTarget && e.currentTarget.dataset) || {}
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value || {}))
}

function resolveStopKey(stop) {
  if (!stop) {
    return ''
  }
  if (stop.stopKey) {
    return stop.stopKey
  }
  if (stop.departmentId != null) {
    return 'dep:' + stop.departmentId
  }
  return ''
}

function extractStopKeys(routeStops) {
  return (routeStops || []).map(function (item) {
    return resolveStopKey(item)
  }).filter(function (key) {
    return !!key
  })
}

function ensureStopKeys(stopKeys, routeStops) {
  if (Array.isArray(stopKeys)) {
    return stopKeys.filter(function (key) {
      return !!key
    })
  }
  return extractStopKeys(routeStops)
}

function normalizeStopList(stops) {
  return (stops || []).map(function (stop, index) {
    if (!stop || typeof stop !== 'object') {
      return stop
    }
    return Object.assign({}, stop, {
      seq: stop.seq != null ? stop.seq : index + 1
    })
  })
}

function indexStopMap(stops) {
  var map = {}
  ;(stops || []).forEach(function (stop) {
    if (stop && stop.stopKey) {
      map[stop.stopKey] = stop
    }
  })
  return map
}

function mergeStopMap(baseMap, stops) {
  var next = Object.assign({}, baseMap || {})
  ;(stops || []).forEach(function (stop) {
    if (stop && stop.stopKey) {
      next[stop.stopKey] = Object.assign({}, next[stop.stopKey] || {}, stop)
    }
  })
  return next
}

function computeConfirmReady(pageViewModel) {
  var actions = (pageViewModel && pageViewModel.actions) || {}
  return !!actions.confirmEnabled
}

function resolveTimelineStopKey(node, stop) {
  if (stop && stop.stopKey) {
    return stop.stopKey
  }
  if (node && node.stopKey) {
    return node.stopKey
  }
  if (node && node.cardKey) {
    return node.cardKey
  }
  if (node && node.depId != null) {
    return 'dep:' + node.depId
  }
  if (stop && stop.departmentId != null) {
    return 'dep:' + stop.departmentId
  }
  return ''
}

function buildTimelineStopLookup(timeline) {
  var lookup = {}
  ;(timeline || []).forEach(function (node) {
    if (!node || node.type !== 'stop') {
      return
    }
    var key = resolveTimelineStopKey(node, null)
    if (key) {
      lookup[key] = node
    }
    if (node.customerName) {
      lookup['name:' + node.customerName] = node
    }
  })
  return lookup
}

function buildEditTimeline(timeline, routeStops) {
  timeline = timeline || []
  routeStops = routeStops || []
  var endNode = null
  var returnLegText = null
  timeline.forEach(function (node) {
    if (!node) {
      return
    }
    if (node.type === 'end') {
      endNode = node
    } else if (node.type === 'leg' && node.legRole === 'RETURN') {
      returnLegText = node.legText
    }
  })
  var stopLookup = buildTimelineStopLookup(timeline)
  var result = []
  routeStops.forEach(function (stop, stopIndex) {
    if (!stop) {
      return
    }
    var key = stop.stopKey || resolveTimelineStopKey(null, stop)
    var node = (key && stopLookup[key])
      || (stop.customerName && stopLookup['name:' + stop.customerName])
      || {
        type: 'stop',
        customerName: stop.customerName,
        plannedArrivalLabel: stop.plannedArrivalLabel,
        plannedDepartureLabel: stop.plannedDepartureLabel,
        goodsSummary: stop.goodsSummary,
        constraintHint: stop.constraintHint
      }
    result.push(Object.assign({}, node, {
      type: 'stop',
      seq: stop.seq != null ? stop.seq : stopIndex + 1,
      stopIndex: stopIndex,
      isIncomingStop: stop.isIncomingStop,
      customerName: stop.customerName || node.customerName,
      windowRequirementLabel: node.windowRequirementLabel || stop.windowRequirementLabel,
      windowRequirementModified: node.windowRequirementModified != null
        ? node.windowRequirementModified
        : stop.windowRequirementModified,
      primaryAction: node.primaryAction
    }))
  })
  if (endNode) {
    var mergedEnd = Object.assign({}, endNode)
    if (returnLegText && !mergedEnd.legText) {
      mergedEnd.legText = returnLegText
    }
    result.push(mergedEnd)
  } else if (returnLegText) {
    result.push({
      type: 'end',
      marker: '终',
      name: '回仓',
      legText: returnLegText
    })
  }
  return result
}

Page({
  data: {
    loading: true,
    previewing: false,
    confirming: false,
    pageViewModel: null,
    loadError: '',
    requestPayload: null,
    initialPayload: null,
    pageTitle: '编辑司机路线',
    stopKeys: [],
    stopMap: {},
    routeStops: [],
    addableStops: [],
    editTimeline: [],
    confirmReady: false,
    pageScrollEnabled: true,
    mapOverviewPadding: [48, 48, 48, 48],
    removingStop: false,
    timeWindowModalVisible: false,
    timeWindowSubmitting: false,
    timeWindowPayload: null
  },

  onLoad: function () {
    var globalData = app.globalData
    var payload = wx.getStorageSync(EDIT_PAYLOAD_STORAGE_KEY) || null
    wx.removeStorageSync(EDIT_PAYLOAD_STORAGE_KEY)
    this.setData({
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      requestPayload: payload,
      initialPayload: cloneJson(payload),
      pageTitle: payload && payload.manualDispatch ? '调整送货顺序' : '编辑司机路线'
    })
    if (!payload || !payload.driverUserId) {
      this.setLoadError('缺少司机路线编辑参数')
      return
    }
    this.loadPage()
  },

  buildRequestPayload: function () {
    return Object.assign({}, this.data.requestPayload || {}, {
      stopKeys: (this.data.stopKeys || []).slice()
    })
  },

  isLoadingRemoveMode: function () {
    var pageViewModel = this.data.pageViewModel || {}
    var payload = this.data.requestPayload || {}
    return pageViewModel.removeStopMode === 'REMOTE'
      || pageViewModel.removeStopMode === 'RETURN_TO_SANDBOX'
      || payload.sourcePage === 'LOADING'
  },

  rememberActionPaths: function (pageViewModel) {
    var actions = (pageViewModel && pageViewModel.actions) || {}
    this._previewPath = actions.previewPath || actions.previewPagePath
    this._confirmPath = actions.confirmPath || actions.confirmPagePath
    if (actions.editPagePath) {
      this._editPagePath = actions.editPagePath
    }
  },

  applyPageViewModel: function (data, options) {
    options = options || {}
    var pageViewModel = getPageViewModel(data)
    if (!pageViewModel) {
      this.setLoadError('后端未返回 pageViewModel')
      return
    }
    this.rememberActionPaths(pageViewModel)
    var rawMapOverview = pageViewModel.mapOverview
    if (rawMapOverview) {
      pageViewModel = Object.assign({}, pageViewModel, {
        mapOverview: normalizeMapOverview(rawMapOverview)
      })
    }
    var routeStopsFromVm = pageViewModel.routeStops || []
    var addableFromVm = pageViewModel.addableStops || pageViewModel.availableCustomers || []
    var stopMap = mergeStopMap(this.data.stopMap, routeStopsFromVm.concat(addableFromVm))
    var stopKeys = options.keepStopKeys
      ? ensureStopKeys(this.data.stopKeys, routeStopsFromVm)
      : ensureStopKeys(
        Array.isArray(pageViewModel.stopKeys) ? pageViewModel.stopKeys : null,
        routeStopsFromVm
      )
    var that = this
    this._pageTimeline = pageViewModel.timeline || []
    this.setData({
      loading: false,
      previewing: false,
      pageViewModel: pageViewModel,
      stopMap: stopMap,
      stopKeys: stopKeys,
      confirmReady: computeConfirmReady(pageViewModel),
      loadError: '',
      pageTitle: pageViewModel.pageTitle || this.data.pageTitle
    }, function () {
      that.rebuildLists()
    })
  },

  rebuildLists: function () {
    var stopKeys = Array.isArray(this.data.stopKeys)
      ? this.data.stopKeys.filter(function (key) { return !!key })
      : []
    var stopMap = this.data.stopMap || {}
    var incomingDepId = this.data.requestPayload && (this.data.requestPayload.departmentId || this.data.requestPayload.depFatherId)
    var currentSet = {}
    var routeStops = stopKeys.map(function (stopKey, index) {
      currentSet[stopKey] = true
      var stop = stopMap[stopKey] || { stopKey: stopKey }
      return Object.assign({}, stop, {
        stopKey: stopKey,
        seq: index + 1,
        isIncomingStop: incomingDepId != null && stop.departmentId === incomingDepId
      })
    })
    var addableStops = Object.keys(stopMap).filter(function (stopKey) {
      return !currentSet[stopKey]
    }).map(function (stopKey) {
      return stopMap[stopKey]
    })
    this.setData({
      routeStops: routeStops,
      addableStops: addableStops,
      stopKeys: stopKeys,
      editTimeline: buildEditTimeline(this._pageTimeline || [], routeStops)
    })
  },

  loadPage: function () {
    var that = this
    var payload = cloneJson(this.data.initialPayload)
    if (!payload || !payload.driverUserId) {
      this.setLoadError('缺少 driverUserId')
      return
    }
    load.showLoading('加载路线')
    postDriverRouteEditPage(payload).then(function (res) {
      load.hideLoading()
      if (!res.result || res.result.code !== 0) {
        that.setLoadError((res.result && res.result.msg) || '加载失败')
        return
      }
      that.setData({ requestPayload: payload, stopMap: {} })
      that.applyPageViewModel(res.result.data)
    }).catch(function () {
      load.hideLoading()
      that.setLoadError('网络异常，请稍后重试')
    })
  },

  previewPage: function () {
    var that = this
    if (this.data.previewing) {
      return
    }
    var payload = this.buildRequestPayload()
    if (!payload.driverUserId) {
      wx.showToast({ title: '缺少 driverUserId', icon: 'none' })
      return
    }
    this.setData({ previewing: true })
    load.showLoading('重新试算')
    postDriverRouteEditPreview(payload).then(function (res) {
      load.hideLoading()
      if (!res.result || res.result.code !== 0) {
        that.setData({ previewing: false })
        wx.showToast({ title: (res.result && res.result.msg) || '试算失败', icon: 'none' })
        return
      }
      that.setData({ requestPayload: payload })
      that.applyPageViewModel(res.result.data, { keepStopKeys: true })
    }).catch(function () {
      load.hideLoading()
      that.setData({ previewing: false })
    })
  },

  setLoadError: function (loadError) {
    this.setData({
      loading: false,
      previewing: false,
      pageViewModel: null,
      loadError: loadError
    })
  },

  onMoveStop: function (e) {
    var ds = eventNodeDetail(e)
    var index = Number(ds.index)
    var direction = Number(ds.direction)
    if (isNaN(index) || !direction) {
      return
    }
    var stopKeys = Array.isArray(this.data.stopKeys) ? this.data.stopKeys.slice() : []
    var target = index + direction
    if (target < 0 || target >= stopKeys.length) {
      return
    }
    var temp = stopKeys[index]
    stopKeys[index] = stopKeys[target]
    stopKeys[target] = temp
    this.setData({ stopKeys: stopKeys })
    this.rebuildLists()
  },

  onRemoveStop: function (e) {
    var ds = eventNodeDetail(e)
    var index = Number(ds.index)
    if (isNaN(index)) {
      return
    }
    var routeStops = this.data.routeStops || []
    var target = routeStops[index]
    if (!target) {
      return
    }
    if (target.locked) {
      wx.showToast({ title: target.lockReason || '该客户不可移除', icon: 'none' })
      return
    }
    if (this.isLoadingRemoveMode()) {
      this.submitLoadingRemoveStop(target)
      return
    }
    var stopKeys = Array.isArray(this.data.stopKeys) ? this.data.stopKeys.slice() : []
    if (index < 0 || index >= stopKeys.length) {
      return
    }
    stopKeys.splice(index, 1)
    this.setData({ stopKeys: stopKeys })
    this.rebuildLists()
  },

  submitLoadingRemoveStop: function (stop) {
    var that = this
    if (!stop || !stop.deliveryStopId) {
      wx.showToast({ title: '缺少 deliveryStopId，无法移除', icon: 'none' })
      return
    }
    if (this.data.removingStop) {
      return
    }
    var session = resolveSession()
    var payload = this.data.requestPayload || {}
    var request = {
      deliveryStopId: stop.deliveryStopId,
      disId: payload.disId || session.disId,
      routeDate: payload.routeDate,
      batchCode: payload.batchCode,
      operatorUserId: payload.operatorUserId || session.operatorUserId,
      reason: '装车路线编辑移除',
      suppressTodayResponse: true
    }
    var run = function () {
      that.setData({ removingStop: true })
      load.showLoading('移除中')
      returnSandboxStopToSandbox(request).then(function (resp) {
        load.hideLoading()
        that.setData({ removingStop: false })
        if (!resp.result || resp.result.code !== 0) {
          wx.showToast({ title: (resp.result && resp.result.msg) || '移除失败', icon: 'none' })
          return
        }
        var data = (resp.result && resp.result.data) || {}
        if (data.exitedLoading) {
          wx.showToast({ title: '路线已清空，已回到分派', icon: 'success' })
          setTimeout(function () {
            wx.navigateBack({ delta: 1 })
          }, 400)
          return
        }
        wx.showToast({ title: '已移除', icon: 'success' })
        that.loadPage()
      }).catch(function () {
        load.hideLoading()
        that.setData({ removingStop: false })
        wx.showToast({ title: '网络异常', icon: 'none' })
      })
    }
    wx.showModal({
      title: stop.removeConfirmTitle || '移除门店',
      content: stop.removeConfirmMessage || '移除后该店将从装车路线移除，是否确认？',
      confirmText: '确认移除',
      cancelText: '取消',
      success: function (res) {
        if (res.confirm) {
          run()
        }
      }
    })
  },

  onAddStop: function (e) {
    var stopKey = e.currentTarget.dataset.stopKey
    if (!stopKey) {
      return
    }
    var stopKeys = Array.isArray(this.data.stopKeys) ? this.data.stopKeys.slice() : []
    if (stopKeys.indexOf(stopKey) >= 0) {
      return
    }
    stopKeys.push(stopKey)
    this.setData({ stopKeys: stopKeys })
    this.rebuildLists()
  },

  onBottomReset: function () {
    var initial = cloneJson(this.data.initialPayload)
    this.setData({
      requestPayload: initial,
      stopMap: {},
      stopKeys: [],
      editTimeline: [],
      pageTitle: initial && initial.manualDispatch ? '调整送货顺序' : '编辑司机路线'
    })
    this._pageTimeline = []
    this.loadPage()
  },

  onBottomPreview: function () {
    this.previewPage()
  },

  onBottomConfirm: function () {
    var that = this
    var pageViewModel = this.data.pageViewModel || {}
    var actions = pageViewModel.actions || {}
    if (!this.data.confirmReady) {
      wx.showToast({
        title: actions.confirmDisabledReason || '当前不可确认派单',
        icon: 'none'
      })
      return
    }
    if (this.data.confirming) {
      return
    }
    var payload = this.buildRequestPayload()
    this.setData({ confirming: true })
    load.showLoading('确认中')
    postDriverRouteEditConfirm(payload).then(function (res) {
      load.hideLoading()
      that.setData({ confirming: false })
      if (!res.result || res.result.code !== 0) {
        wx.showToast({ title: (res.result && res.result.msg) || '确认失败', icon: 'none' })
        return
      }
      var data = (res.result && res.result.data) || {}
      var payload = that.data.requestPayload || {}
      if (payload.sourcePage === 'LOADING') {
        wx.showToast({
          title: data.exitedLoading ? '路线已清空并回到分派' : '已更新装车路线',
          icon: 'success'
        })
        setTimeout(function () {
          wx.navigateBack({ delta: 1 })
        }, 400)
        return
      }
      if (data.enteredLoading) {
        wx.showToast({ title: '已确认并进入装车', icon: 'success' })
        setTimeout(function () {
          wx.navigateBack({ delta: 1 })
        }, 400)
        return
      }
      if (that.data.requestPayload && that.data.requestPayload.manualDispatch) {
        wx.showToast({ title: '已确认派单', icon: 'success' })
        setTimeout(function () {
          wx.navigateBack({ delta: 2 })
        }, 400)
        return
      }
      if (data.enterLoadingBlockedReason) {
        wx.showToast({ title: data.enterLoadingBlockedReason, icon: 'none', duration: 2500 })
      } else {
        wx.showToast({ title: '已确认派单', icon: 'success' })
      }
      setTimeout(function () {
        wx.navigateBack({ delta: 1 })
      }, 400)
    }).catch(function () {
      load.hideLoading()
      that.setData({ confirming: false })
    })
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 })
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

  onTimelineStopHeadTap: function (e) {
    var ds = eventNodeDetail(e)
    var index = Number(ds.nodeIndex)
    if (isNaN(index)) {
      return
    }
    var node = (this.data.editTimeline || [])[index]
    if (node && node.primaryAction) {
      this.executeTimeWindowAction(node.primaryAction)
    }
  },

  executeTimeWindowAction: function (action) {
    action = action || {}
    if (!action.actionType) {
      return
    }
    var actionType = String(action.actionType).toUpperCase()
    if (actionType === 'EDIT_TODAY_TIME_WINDOW') {
      if (!action.enabled) {
        wx.showToast({ title: action.disabledReason || '当前不可修改', icon: 'none' })
        return
      }
      if (!action.payload || typeof action.payload !== 'object') {
        wx.showToast({ title: '缺少时间窗口参数', icon: 'none' })
        return
      }
      this.openTimeWindowModal(action.payload)
      return
    }
    wx.showToast({ title: '未接入 actionType: ' + actionType, icon: 'none' })
  },

  openTimeWindowModal: function (payload) {
    this.setData({
      timeWindowModalVisible: true,
      timeWindowPayload: payload || {}
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

  submitTimeWindowModal: function (e) {
    var that = this
    if (this.data.timeWindowSubmitting) {
      return
    }
    var form = (e && e.detail && e.detail.form) || {}
    var payload = this.data.timeWindowPayload || {}
    var session = resolveSession()
    var requestPayload = this.data.requestPayload || {}
    var request = timeWindowModal.buildTimeWindowRequest(form, payload, {
      session: session,
      batchCode: payload.batchCode || requestPayload.batchCode
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
      that.loadPage()
    }).catch(function () {
      load.hideLoading()
      that.setData({ timeWindowSubmitting: false })
      wx.showToast({ title: '网络异常', icon: 'none' })
    })
  }
})

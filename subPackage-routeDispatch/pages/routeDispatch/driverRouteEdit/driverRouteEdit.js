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
var EARTH_RADIUS_METERS = 6371000

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

function matchesCustomerSearch(stop, keyword) {
  if (!keyword) {
    return true
  }
  stop = stop || {}
  var haystack = [stop.customerName, stop.address, stop.goodsSummary, stop.constraintHint]
    .filter(function (value) { return value != null })
    .join(' ')
    .toLowerCase()
  return haystack.indexOf(keyword.toLowerCase()) >= 0
}

function coordinateOf(source) {
  source = source || {}
  var lat = Number(source.lat != null ? source.lat : source.depotLat)
  var lng = Number(source.lng != null ? source.lng : source.depotLng)
  if (!isFinite(lat) || !isFinite(lng) || (lat === 0 && lng === 0)) {
    return null
  }
  return { lat: lat, lng: lng }
}

function distanceMeters(first, second) {
  if (!first || !second) {
    return 0
  }
  var latDelta = (second.lat - first.lat) * Math.PI / 180
  var lngDelta = (second.lng - first.lng) * Math.PI / 180
  var firstLat = first.lat * Math.PI / 180
  var secondLat = second.lat * Math.PI / 180
  var value = Math.sin(latDelta / 2) * Math.sin(latDelta / 2)
    + Math.cos(firstLat) * Math.cos(secondLat)
    * Math.sin(lngDelta / 2) * Math.sin(lngDelta / 2)
  return EARTH_RADIUS_METERS * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value))
}

function routeCoordinateDistance(depot, stops, includeReturn) {
  var depotPoint = coordinateOf(depot)
  if (!depotPoint) {
    return 0
  }
  var total = 0
  var previous = depotPoint
  ;(stops || []).forEach(function (stop) {
    var point = coordinateOf(stop)
    if (!point) {
      return
    }
    total += distanceMeters(previous, point)
    previous = point
  })
  if (includeReturn && stops && stops.length) {
    total += distanceMeters(previous, depotPoint)
  }
  return total
}

function uniqueStops(stops) {
  var seen = {}
  return (stops || []).filter(function (stop) {
    var key = resolveStopKey(stop)
    if (!key || seen[key]) {
      return false
    }
    seen[key] = true
    return true
  })
}

function optimizeStopOrder(depot, stops, includeReturn) {
  var depotPoint = coordinateOf(depot)
  if (!depotPoint || !stops || stops.length < 2) {
    return (stops || []).slice()
  }
  var remaining = stops.slice()
  var ordered = []
  var previous = depotPoint
  while (remaining.length) {
    var bestIndex = 0
    var bestDistance = Number.MAX_SAFE_INTEGER || 9007199254740991
    remaining.forEach(function (stop, index) {
      var point = coordinateOf(stop)
      var distance = point ? distanceMeters(previous, point) : bestDistance
      if (distance < bestDistance) {
        bestIndex = index
        bestDistance = distance
      }
    })
    var selected = remaining.splice(bestIndex, 1)[0]
    ordered.push(selected)
    previous = coordinateOf(selected) || previous
  }
  var improved = true
  var currentDistance = routeCoordinateDistance(depot, ordered, includeReturn)
  while (improved) {
    improved = false
    for (var start = 0; start < ordered.length - 1; start += 1) {
      for (var end = start + 1; end < ordered.length; end += 1) {
        var candidate = ordered.slice(0, start)
          .concat(ordered.slice(start, end + 1).reverse())
          .concat(ordered.slice(end + 1))
        var candidateDistance = routeCoordinateDistance(depot, candidate, includeReturn)
        if (candidateDistance + 1 < currentDistance) {
          ordered = candidate
          currentDistance = candidateDistance
          improved = true
        }
      }
    }
  }
  return ordered
}

function sameStopKeys(first, second) {
  first = first || []
  second = second || []
  if (first.length !== second.length) {
    return false
  }
  for (var index = 0; index < first.length; index += 1) {
    if (first[index] !== second[index]) {
      return false
    }
  }
  return true
}

function formatPlanningDistance(meters) {
  meters = Math.max(0, Number(meters || 0))
  if (meters >= 1000) {
    return (meters / 1000).toFixed(1).replace(/\.0$/, '') + ' 公里'
  }
  return Math.round(meters) + ' 米'
}

function formatPlanningDuration(minutes) {
  minutes = Math.max(0, Math.round(Number(minutes || 0)))
  var hours = Math.floor(minutes / 60)
  var rest = minutes % 60
  if (hours > 0) {
    return hours + '小时' + (rest ? rest + '分' : '')
  }
  return rest + '分钟'
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
      address: stop.address || node.address,
      goodsSummary: stop.goodsSummary || node.goodsSummary,
      constraintHint: stop.constraintHint || node.constraintHint,
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
    filteredAddableStops: [],
    candidatePoolCount: 0,
    customerSearchText: '',
    additionMode: 'SEARCH',
    routeSequenceMode: 'PRESERVE',
    targetRouteMinutes: '',
    targetDistanceKm: '',
    includeReturnDistance: true,
    constraintPreview: null,
    constraintFeedback: '输入上限后，系统会保留原路线客户并自动补充候选客户。',
    constraintResult: null,
    constraintAdjusting: false,
    editTimeline: [],
    confirmReady: false,
    routeDirty: false,
    hasUnsavedChanges: false,
    autoPreviewing: false,
    routeEstimateStatus: '路线已按当前顺序计算',
    mapInteractionEnabled: false,
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
    if (!options.keepStopKeys || !this._protectedStopKeys) {
      this._protectedStopKeys = stopKeys.slice()
    }
    var that = this
    this._pageTimeline = pageViewModel.timeline || []
    this.setData({
      loading: false,
      previewing: false,
      pageViewModel: pageViewModel,
      stopMap: stopMap,
      stopKeys: stopKeys,
      confirmReady: computeConfirmReady(pageViewModel),
      routeDirty: false,
      hasUnsavedChanges: options.keepStopKeys ? this.data.hasUnsavedChanges : false,
      autoPreviewing: false,
      constraintAdjusting: false,
      additionMode: options.constraintResult ? 'SEARCH' : this.data.additionMode,
      constraintPreview: options.constraintResult ? null : this.data.constraintPreview,
      constraintResult: options.constraintResult || this.data.constraintResult,
      routeEstimateStatus: '路线已按当前门店顺序重新计算',
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
    var keyword = String(this.data.customerSearchText || '').trim()
    var filteredAddableStops = addableStops.filter(function (stop) {
      return matchesCustomerSearch(stop, keyword)
    })
    if (!keyword && filteredAddableStops.length > 5) {
      filteredAddableStops = filteredAddableStops.slice(0, 5)
    }
    this.setData({
      routeStops: routeStops,
      addableStops: addableStops,
      filteredAddableStops: filteredAddableStops,
      candidatePoolCount: addableStops.length,
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

  previewPage: function (options) {
    options = options || {}
    var that = this
    if (this.data.previewing) {
      this._previewQueued = true
      return
    }
    var payload = this.buildRequestPayload()
    if (!payload.driverUserId) {
      wx.showToast({ title: '缺少 driverUserId', icon: 'none' })
      return
    }
    if (!payload.stopKeys || !payload.stopKeys.length) {
      this.setData({
        confirmReady: false,
        routeDirty: true,
        autoPreviewing: false,
        routeEstimateStatus: '当前路线暂无客户，请先添加客户'
      })
      if (!options.silent) {
        wx.showToast({ title: '请至少添加一个客户', icon: 'none' })
      }
      return
    }
    var requestRevision = this._editRevision || 0
    this.setData({
      previewing: true,
      autoPreviewing: !!options.silent,
      routeEstimateStatus: options.silent ? '正在自动重新试算路线…' : '正在重新试算路线…'
    })
    if (!options.silent) {
      load.showLoading('重新试算')
    }
    postDriverRouteEditPreview(payload).then(function (res) {
      if (!options.silent) {
        load.hideLoading()
      }
      if (requestRevision !== (that._editRevision || 0)) {
        that.setData({ previewing: false, autoPreviewing: false, constraintAdjusting: false })
        that.scheduleAutoPreview()
        return
      }
      if (!res.result || res.result.code !== 0) {
        if (options.constraintRollback) {
          that.rollbackConstraintPreview(options.constraintRollback)
          wx.showToast({
            title: (res.result && res.result.msg) || '自动计算失败，已恢复原路线',
            icon: 'none'
          })
          return
        }
        that.setData({
          previewing: false,
          autoPreviewing: false,
          constraintAdjusting: false,
          routeEstimateStatus: '试算失败，请点击重新试算'
        })
        if (!options.silent) {
          wx.showToast({ title: (res.result && res.result.msg) || '试算失败', icon: 'none' })
        }
        return
      }
      that.setData({ requestPayload: payload })
      that.applyPageViewModel(res.result.data, {
        keepStopKeys: true,
        constraintResult: options.constraintResult || null
      })
      if (options.constraintResult) {
        wx.showToast({ title: '客户已自动调整', icon: 'success' })
      }
    }).catch(function () {
      if (!options.silent) {
        load.hideLoading()
      }
      if (options.constraintRollback) {
        that.rollbackConstraintPreview(options.constraintRollback)
      } else {
        that.setData({
          previewing: false,
          autoPreviewing: false,
          constraintAdjusting: false,
          routeEstimateStatus: '网络异常，路线尚未重新试算'
        })
      }
    }).then(function () {
      if (that._previewQueued) {
        that._previewQueued = false
        that.scheduleAutoPreview()
      }
    })
  },

  markRouteChanged: function () {
    this._editRevision = (this._editRevision || 0) + 1
    this.setData({
      routeDirty: true,
      hasUnsavedChanges: true,
      confirmReady: false,
      additionMode: 'SEARCH',
      constraintPreview: null,
      constraintResult: null,
      routeEstimateStatus: '路线内容已变化，等待后台重新试算'
    })
    this.scheduleAutoPreview()
  },

  scheduleAutoPreview: function () {
    var that = this
    if (this._autoPreviewTimer) {
      clearTimeout(this._autoPreviewTimer)
    }
    if (!this.data.stopKeys || !this.data.stopKeys.length) {
      this.setData({ autoPreviewing: false })
      return
    }
    this._autoPreviewTimer = setTimeout(function () {
      that._autoPreviewTimer = null
      that.previewPage({ silent: true })
    }, 450)
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
    var that = this
    this.setData({ stopKeys: stopKeys }, function () {
      that.rebuildLists()
      that.markRouteChanged()
    })
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
    var that = this
    this.setData({ stopKeys: stopKeys }, function () {
      that.rebuildLists()
      that.markRouteChanged()
    })
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
    var candidate = (this.data.stopMap || {})[stopKey]
    if (candidate && candidate.blocked) {
      wx.showToast({ title: candidate.blockedReason || '该客户不适合当前司机', icon: 'none' })
      return
    }
    var stopKeys = Array.isArray(this.data.stopKeys) ? this.data.stopKeys.slice() : []
    if (stopKeys.indexOf(stopKey) >= 0) {
      return
    }
    stopKeys.push(stopKey)
    var that = this
    this.setData({
      stopKeys: stopKeys,
      customerSearchText: ''
    }, function () {
      that.rebuildLists()
      that.markRouteChanged()
    })
  },

  onCustomerSearchInput: function (e) {
    var that = this
    this.setData({
      customerSearchText: (e && e.detail && e.detail.value) || '',
      additionMode: 'SEARCH',
      constraintPreview: null
    }, function () {
      that.rebuildLists()
    })
  },

  onClearCustomerSearch: function () {
    var that = this
    this.setData({ customerSearchText: '' }, function () {
      that.rebuildLists()
    })
  },

  currentConstraintDefaults: function (mode) {
    var driver = (this.data.pageViewModel && this.data.pageViewModel.driver) || {}
    if (mode === 'TIME') {
      var minutes = Math.round(Number(driver.totalDurationS || 0) / 60)
      return { targetRouteMinutes: minutes > 0 ? String(minutes) : '' }
    }
    var distanceM = this.data.includeReturnDistance
      ? Number(driver.totalDistanceM || 0)
      : Number(driver.outboundDistanceM || 0)
    return {
      targetDistanceKm: distanceM > 0
        ? (distanceM / 1000).toFixed(1).replace(/\.0$/, '')
        : ''
    }
  },

  changeAdditionMode: function (e) {
    var requested = e && e.currentTarget && e.currentTarget.dataset
      ? e.currentTarget.dataset.mode
      : ''
    if (requested !== 'TIME' && requested !== 'DISTANCE') {
      return
    }
    var mode = this.data.additionMode === requested ? 'SEARCH' : requested
    if (mode === 'SEARCH') {
      this.setData({
        additionMode: 'SEARCH',
        constraintPreview: null,
        constraintFeedback: '输入上限后，系统会保留原路线客户并自动补充候选客户。'
      })
      return
    }
    var that = this
    this.setData(Object.assign({
      additionMode: mode,
      routeSequenceMode: 'PRESERVE',
      customerSearchText: '',
      constraintResult: null
    }, this.currentConstraintDefaults(mode)), function () {
      that.updateConstraintPreview()
    })
  },

  onTargetRouteMinutesInput: function (e) {
    var that = this
    this.setData({ targetRouteMinutes: (e && e.detail && e.detail.value) || '' }, function () {
      that.updateConstraintPreview()
    })
  },

  onTargetDistanceInput: function (e) {
    var that = this
    this.setData({ targetDistanceKm: (e && e.detail && e.detail.value) || '' }, function () {
      that.updateConstraintPreview()
    })
  },

  toggleReturnDistance: function (e) {
    var that = this
    this.setData({ includeReturnDistance: !!(e && e.detail && e.detail.value) }, function () {
      var defaults = that.currentConstraintDefaults('DISTANCE')
      that.setData(defaults, function () {
        that.updateConstraintPreview()
      })
    })
  },

  changeRouteSequenceMode: function (e) {
    var mode = (e && e.detail && e.detail.value)
      || (e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.mode)
    if (mode !== 'PRESERVE' && mode !== 'OPTIMIZE') {
      return
    }
    var that = this
    this.setData({ routeSequenceMode: mode }, function () {
      that.updateConstraintPreview()
    })
  },

  buildConstraintPlan: function () {
    var mode = this.data.additionMode
    var pageViewModel = this.data.pageViewModel || {}
    var driver = pageViewModel.driver || {}
    var depot = pageViewModel.routePlanningContext || {}
    var routeStops = (this.data.routeStops || []).slice()
    var addableStops = (this.data.addableStops || []).slice()
    var includeReturn = mode === 'TIME' ? true : !!this.data.includeReturnDistance
    var depotPoint = coordinateOf(depot)
    if (!depotPoint) {
      return {
        canApply: false,
        message: '仓库缺少坐标，暂时不能自动计算客户。',
        missingCoordinateCount: addableStops.length
      }
    }

    var protectedSet = {}
    ;(this._protectedStopKeys || []).forEach(function (key) { protectedSet[key] = true })
    routeStops.forEach(function (stop) {
      if (!coordinateOf(stop)) {
        protectedSet[resolveStopKey(stop)] = true
      }
    })
    var protectedStops = routeStops.filter(function (stop) {
      return !!protectedSet[resolveStopKey(stop)]
    })
    if (!protectedStops.length && routeStops.length) {
      protectedStops = [routeStops[0]]
      protectedSet[resolveStopKey(routeStops[0])] = true
    }
    var currentFlexible = routeStops.filter(function (stop) {
      return !protectedSet[resolveStopKey(stop)]
    })
    var eligibleExternal = addableStops.filter(function (stop) {
      return !protectedSet[resolveStopKey(stop)] && !stop.blocked && !!coordinateOf(stop)
    })
    var missingCoordinateCount = addableStops.filter(function (stop) {
      return !stop.blocked && !coordinateOf(stop)
    }).length
    var flexibleStops = uniqueStops(currentFlexible.concat(eligibleExternal))
    var currentSet = {}
    routeStops.forEach(function (stop) { currentSet[resolveStopKey(stop)] = true })

    var coordinateCurrent = routeCoordinateDistance(depot, routeStops, includeReturn)
    var actualDistance = includeReturn
      ? Number(driver.totalDistanceM || 0)
      : Number(driver.outboundDistanceM || 0)
    var distanceScale = coordinateCurrent > 0 && actualDistance > 0
      ? actualDistance / coordinateCurrent
      : 1
    var totalServiceMinutes = routeStops.reduce(function (sum, stop) {
      return sum + Math.max(0, Number(stop.serviceMinutes || 0))
    }, 0)
    var knownServiceCount = routeStops.filter(function (stop) {
      return Number(stop.serviceMinutes || 0) > 0
    }).length
    var averageServiceMinutes = knownServiceCount > 0
      ? totalServiceMinutes / knownServiceCount
      : 10
    var totalDurationMinutes = Number(driver.totalDurationS || 0) / 60
    var coordinateClosed = routeCoordinateDistance(depot, routeStops, true)
    var travelMinutes = Math.max(0, totalDurationMinutes - totalServiceMinutes)
    var travelMinutesPerMeter = coordinateClosed > 0 && travelMinutes > 0
      ? travelMinutes / coordinateClosed
      : 0
    var durationReady = totalDurationMinutes > 0 && travelMinutesPerMeter > 0

    var target = mode === 'TIME'
      ? Number(this.data.targetRouteMinutes)
      : Number(this.data.targetDistanceKm) * 1000
    if (!isFinite(target) || target <= 0) {
      return {
        canApply: false,
        message: mode === 'TIME' ? '请输入大于 0 的分钟数。' : '请输入大于 0 的公里数。',
        missingCoordinateCount: missingCoordinateCount
      }
    }
    if (mode === 'TIME' && !durationReady) {
      return {
        canApply: false,
        message: '当前路线还没有可用的全程时间，请先点击“重新计算”。',
        missingCoordinateCount: missingCoordinateCount
      }
    }

    var sequenceMode = this.data.routeSequenceMode
    var metricsOf = function (stops) {
      var coordinateDistance = routeCoordinateDistance(depot, stops, includeReturn)
      var serviceMinutes = stops.reduce(function (sum, stop) {
        var value = Number(stop.serviceMinutes || 0)
        return sum + (value > 0 ? value : averageServiceMinutes)
      }, 0)
      return {
        distance: coordinateDistance * distanceScale,
        duration: routeCoordinateDistance(depot, stops, true) * travelMinutesPerMeter + serviceMinutes
      }
    }
    var fits = function (metrics) {
      return mode === 'TIME'
        ? metrics.duration <= target + 0.01
        : metrics.distance <= target + 1
    }
    var buildPlanned = function (selectedFlexible) {
      selectedFlexible = uniqueStops(selectedFlexible)
      var selectedSet = {}
      selectedFlexible.forEach(function (stop) { selectedSet[resolveStopKey(stop)] = true })
      if (sequenceMode === 'OPTIMIZE') {
        return optimizeStopOrder(depot, uniqueStops(protectedStops.concat(selectedFlexible)), includeReturn)
      }
      var retained = routeStops.filter(function (stop) {
        var key = resolveStopKey(stop)
        return protectedSet[key] || selectedSet[key]
      })
      var appended = selectedFlexible.filter(function (stop) {
        return !currentSet[resolveStopKey(stop)]
      })
      return uniqueStops(retained.concat(appended))
    }

    var selectedFlexible = []
    var plannedStops = buildPlanned([])
    var plannedMetrics = metricsOf(plannedStops)
    var protectedOverTarget = !fits(plannedMetrics)
    if (!protectedOverTarget) {
      if (sequenceMode === 'PRESERVE') {
        currentFlexible.forEach(function (stop) {
          var trialSelected = selectedFlexible.concat([stop])
          var trialStops = buildPlanned(trialSelected)
          var trialMetrics = metricsOf(trialStops)
          if (fits(trialMetrics)) {
            selectedFlexible = trialSelected
            plannedStops = trialStops
            plannedMetrics = trialMetrics
          }
        })
      }
      var selectedSet = {}
      selectedFlexible.forEach(function (stop) { selectedSet[resolveStopKey(stop)] = true })
      var remaining = flexibleStops.filter(function (stop) {
        return !selectedSet[resolveStopKey(stop)]
      })
      while (remaining.length) {
        var ranked = remaining.map(function (candidate) {
          var trialStops = buildPlanned(selectedFlexible.concat([candidate]))
          var trialMetrics = metricsOf(trialStops)
          return {
            candidate: candidate,
            stops: trialStops,
            metrics: trialMetrics,
            delta: mode === 'TIME'
              ? trialMetrics.duration - plannedMetrics.duration
              : trialMetrics.distance - plannedMetrics.distance
          }
        }).filter(function (item) {
          return fits(item.metrics)
        }).sort(function (first, second) {
          return first.delta - second.delta
        })
        if (!ranked.length) {
          break
        }
        var best = ranked[0]
        selectedFlexible.push(best.candidate)
        plannedStops = best.stops
        plannedMetrics = best.metrics
        var bestKey = resolveStopKey(best.candidate)
        remaining = remaining.filter(function (stop) {
          return resolveStopKey(stop) !== bestKey
        })
      }
    }

    var plannedKeys = plannedStops.map(function (stop) { return resolveStopKey(stop) })
    var currentKeys = routeStops.map(function (stop) { return resolveStopKey(stop) })
    var plannedSet = {}
    plannedKeys.forEach(function (key) { plannedSet[key] = true })
    var addedCount = plannedStops.filter(function (stop) {
      return !currentSet[resolveStopKey(stop)]
    }).length
    var removedCount = routeStops.filter(function (stop) {
      return !plannedSet[resolveStopKey(stop)]
    }).length
    var routeChanged = !sameStopKeys(currentKeys, plannedKeys)
    var remainingCapacity = mode === 'TIME'
      ? formatPlanningDuration(Math.max(0, target - plannedMetrics.duration))
      : formatPlanningDistance(Math.max(0, target - plannedMetrics.distance))
    var message = protectedOverTarget
      ? '原路线的 ' + protectedStops.length + ' 位客户已经超过设置上限，系统不会自动移除原路线客户。'
      : (routeChanged
        ? '预计保留原路线客户，新增 ' + addedCount + ' 位、移除 ' + removedCount + ' 位后续加入的客户，剩余约 ' + remainingCapacity + '。'
        : '当前路线已经符合设置条件，没有可继续加入的客户。')
    if (missingCoordinateCount > 0) {
      message += ' 另有 ' + missingCoordinateCount + ' 位客户缺少坐标，未参与自动计算。'
    }
    return {
      canApply: routeChanged,
      stopKeys: plannedKeys,
      plannedCount: plannedKeys.length,
      addedCount: addedCount,
      removedCount: removedCount,
      remainingCapacityText: remainingCapacity,
      missingCoordinateCount: missingCoordinateCount,
      message: message
    }
  },

  updateConstraintPreview: function () {
    var plan = this.buildConstraintPlan()
    this.setData({
      constraintPreview: plan,
      constraintFeedback: plan.message
    })
  },

  applyConstraintPlan: function () {
    if (this.data.constraintAdjusting || this.data.previewing) {
      return
    }
    var plan = this.buildConstraintPlan()
    if (!plan.canApply || !plan.stopKeys || !plan.stopKeys.length) {
      wx.showToast({ title: plan.message || '当前条件无需调整', icon: 'none', duration: 2500 })
      return
    }
    if (this._autoPreviewTimer) {
      clearTimeout(this._autoPreviewTimer)
      this._autoPreviewTimer = null
    }
    this._editRevision = (this._editRevision || 0) + 1
    var result = {
      modeLabel: this.data.additionMode === 'TIME' ? '按时间' : '按距离',
      addedCount: plan.addedCount,
      removedCount: plan.removedCount,
      plannedCount: plan.plannedCount,
      summary: plan.message
    }
    var that = this
    var rollback = {
      stopKeys: (this.data.stopKeys || []).slice(),
      routeDirty: this.data.routeDirty,
      confirmReady: this.data.confirmReady,
      hasUnsavedChanges: this.data.hasUnsavedChanges,
      routeEstimateStatus: this.data.routeEstimateStatus
    }
    this.setData({
      stopKeys: plan.stopKeys.slice(),
      routeDirty: true,
      hasUnsavedChanges: true,
      confirmReady: false,
      constraintAdjusting: true,
      routeEstimateStatus: '正在按设置条件计算客户并获取后台路线…'
    }, function () {
      that.rebuildLists()
      that.previewPage({
        silent: false,
        constraintResult: result,
        constraintRollback: rollback
      })
    })
  },

  rollbackConstraintPreview: function (rollback) {
    rollback = rollback || {}
    var that = this
    this.setData({
      stopKeys: (rollback.stopKeys || []).slice(),
      routeDirty: !!rollback.routeDirty,
      confirmReady: !!rollback.confirmReady,
      hasUnsavedChanges: !!rollback.hasUnsavedChanges,
      previewing: false,
      autoPreviewing: false,
      constraintAdjusting: false,
      routeEstimateStatus: rollback.routeEstimateStatus || '自动计算失败，已恢复原路线'
    }, function () {
      that.rebuildLists()
      that.updateConstraintPreview()
    })
  },

  onBottomReset: function () {
    var initial = cloneJson(this.data.initialPayload)
    if (this._autoPreviewTimer) {
      clearTimeout(this._autoPreviewTimer)
      this._autoPreviewTimer = null
    }
    this._editRevision = (this._editRevision || 0) + 1
    this._previewQueued = false
    this.setData({
      requestPayload: initial,
      stopMap: {},
      stopKeys: [],
      editTimeline: [],
      customerSearchText: '',
      filteredAddableStops: [],
      additionMode: 'SEARCH',
      routeSequenceMode: 'PRESERVE',
      targetRouteMinutes: '',
      targetDistanceKm: '',
      constraintPreview: null,
      constraintResult: null,
      constraintAdjusting: false,
      routeDirty: false,
      hasUnsavedChanges: false,
      autoPreviewing: false,
      pageTitle: initial && initial.manualDispatch ? '调整送货顺序' : '编辑司机路线'
    })
    this._pageTimeline = []
    this._protectedStopKeys = null
    this.loadPage()
  },

  onBottomPreview: function () {
    this.previewPage({ silent: false })
  },

  onBottomConfirm: function () {
    var that = this
    var pageViewModel = this.data.pageViewModel || {}
    var actions = pageViewModel.actions || {}
    if (this.data.additionMode !== 'SEARCH') {
      wx.showToast({ title: '请先完成或取消时间、距离调整', icon: 'none' })
      return
    }
    if (!this.data.confirmReady) {
      wx.showToast({
        title: this.data.routeDirty
          ? '路线正在重新试算，请稍候'
          : (actions.confirmDisabledReason || '当前不可确认派单'),
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
    if (!this.data.hasUnsavedChanges) {
      wx.navigateBack({ delta: 1 })
      return
    }
    wx.showModal({
      title: '退出路线编辑？',
      content: '当前路线还有未确认的调整，退出后不会保存。',
      confirmText: '退出',
      cancelText: '继续编辑',
      success: function (res) {
        if (res.confirm) {
          wx.navigateBack({ delta: 1 })
        }
      }
    })
  },

  onMapTouchStart: function () {
    if (this.data.mapInteractionEnabled && this.data.pageScrollEnabled) {
      this.setData({ pageScrollEnabled: false })
    }
  },

  onMapTouchEnd: function () {
    if (!this.data.pageScrollEnabled) {
      this.setData({ pageScrollEnabled: true })
    }
  },

  toggleMapInteraction: function () {
    var enabled = !this.data.mapInteractionEnabled
    this.setData({
      mapInteractionEnabled: enabled,
      pageScrollEnabled: !enabled
    })
  },

  onRefreshRoute: function () {
    this.previewPage({ silent: false })
  },

  onUnload: function () {
    if (this._autoPreviewTimer) {
      clearTimeout(this._autoPreviewTimer)
      this._autoPreviewTimer = null
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

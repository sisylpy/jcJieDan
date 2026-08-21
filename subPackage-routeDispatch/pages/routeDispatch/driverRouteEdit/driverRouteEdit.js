var load = require('../../../../lib/load.js')
var app = getApp()

import {
  postDriverRouteEditPage,
  postDriverRouteEditPreview,
  postDriverRouteExpansionPreview,
  postDriverRouteEditConfirm,
  returnSandboxStopToSandbox,
  overrideSandboxStopTimeWindow,
  lockDispatchStopDriver,
  unlockDispatchStopDriver
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
      departmentId: stop.departmentId || node.departmentId || node.depFatherId,
      depFatherId: stop.departmentId || node.depFatherId || node.departmentId,
      driverLocked: !!stop.driverLocked,
      lockedDriverName: stop.lockedDriverName || '',
      lockWarning: stop.lockWarning || '',
      planningLock: stop.planningLock || null,
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

function formatRoadDistance(distanceM) {
  var value = Number(distanceM || 0)
  if (value < 1000) {
    return Math.round(value) + '米'
  }
  return (value / 1000).toFixed(1) + '公里'
}

function formatDuration(durationS) {
  var totalMinutes = Math.max(0, Math.round(Number(durationS || 0) / 60))
  var hours = Math.floor(totalMinutes / 60)
  var minutes = totalMinutes % 60
  if (hours > 0) {
    return hours + '小时' + (minutes ? minutes + '分' : '')
  }
  return totalMinutes + '分钟'
}

function formatMetricDelta(delta, formatter) {
  var value = Number(delta || 0)
  if (Math.abs(value) < 1) {
    return '不变'
  }
  return (value > 0 ? '+' : '-') + formatter(Math.abs(value))
}

function resolveProposalStop(stopKey, stopMap, proposalStopMap) {
  var stop = (stopMap && stopMap[stopKey]) || (proposalStopMap && proposalStopMap[stopKey]) || {}
  return Object.assign({}, stop, {
    stopKey: stopKey,
    customerName: stop.customerName || '未命名客户'
  })
}

function buildExpansionReview(proposal, stopMap) {
  proposal = proposal || {}
  stopMap = stopMap || {}
  var addedRaw = proposal.addedStops || []
  var proposalStopMap = {}
  var addedKeySet = {}
  addedRaw.forEach(function (stop) {
    var key = resolveStopKey(stop)
    if (!key) return
    proposalStopMap[key] = stop
    addedKeySet[key] = true
  })
  ;(proposal.notSelectedStops || []).forEach(function (stop) {
    var key = resolveStopKey(stop)
    if (key && !proposalStopMap[key]) {
      proposalStopMap[key] = stop
    }
  })

  var originalStops = (proposal.preservedStopKeys || []).map(function (stopKey, index) {
    return Object.assign(resolveProposalStop(stopKey, stopMap, proposalStopMap), {
      seq: index + 1
    })
  })
  var addedStops = addedRaw.map(function (stop, index) {
    var key = resolveStopKey(stop)
    return Object.assign(resolveProposalStop(key, stopMap, proposalStopMap), stop, {
      stopKey: key,
      seq: index + 1
    })
  })
  var finalStops = (proposal.proposedStopKeys || []).map(function (stopKey, index) {
    return Object.assign(resolveProposalStop(stopKey, stopMap, proposalStopMap), {
      seq: index + 1,
      isAiAdded: !!addedKeySet[stopKey],
      sourceLabel: addedKeySet[stopKey] ? 'AI新增' : '人工保留'
    })
  })
  var notSelectedStops = (proposal.notSelectedStops || []).map(function (stop, index) {
    var key = resolveStopKey(stop)
    return Object.assign(resolveProposalStop(key, stopMap, proposalStopMap), stop, {
      stopKey: key || ('not-selected-' + index),
      reason: stop.reason || '当前方案未选择该客户'
    })
  })

  var before = proposal.beforeMetrics || {}
  var after = proposal.afterMetrics || {}
  var metrics = [
    {
      key: 'distance',
      label: '道路距离',
      beforeLabel: formatRoadDistance(before.totalRoadDistanceM),
      afterLabel: formatRoadDistance(after.totalRoadDistanceM),
      deltaLabel: formatMetricDelta(
        Number(after.totalRoadDistanceM || 0) - Number(before.totalRoadDistanceM || 0),
        formatRoadDistance
      )
    },
    {
      key: 'drive',
      label: '驾驶时间',
      beforeLabel: formatDuration(before.totalDriveDurationS),
      afterLabel: formatDuration(after.totalDriveDurationS),
      deltaLabel: formatMetricDelta(
        Number(after.totalDriveDurationS || 0) - Number(before.totalDriveDurationS || 0),
        formatDuration
      )
    },
    {
      key: 'active',
      label: '司机占用',
      beforeLabel: formatDuration(before.activeRouteDurationS),
      afterLabel: formatDuration(after.activeRouteDurationS),
      deltaLabel: formatMetricDelta(
        Number(after.activeRouteDurationS || 0) - Number(before.activeRouteDurationS || 0),
        formatDuration
      )
    },
    {
      key: 'waiting',
      label: '等待时间',
      beforeLabel: formatDuration(before.totalWaitingDurationS),
      afterLabel: formatDuration(after.totalWaitingDurationS),
      deltaLabel: formatMetricDelta(
        Number(after.totalWaitingDurationS || 0) - Number(before.totalWaitingDurationS || 0),
        formatDuration
      )
    }
  ]

  return {
    proposalId: proposal.proposalId,
    hasAddedStops: addedStops.length > 0,
    summary: proposal.summary || (addedStops.length ? '已生成路线增补建议' : '当前没有适合补充的客户'),
    originalStops: originalStops,
    addedStops: addedStops,
    finalStops: finalStops,
    notSelectedStops: notSelectedStops,
    metrics: metrics
  }
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
    timeWindowPayload: null,
    planningLockSubmitting: false,
    expandingRoute: false,
    expansionProposal: null,
    expansionReviewVisible: false,
    expansionReview: null
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
      routeDirty: false,
      hasUnsavedChanges: options.keepStopKeys ? this.data.hasUnsavedChanges : false,
      autoPreviewing: false,
      routeEstimateStatus: '路线已按当前门店顺序重新计算',
      loadError: '',
      pageTitle: pageViewModel.pageTitle || this.data.pageTitle,
      requestPayload: Object.assign({}, this.data.requestPayload || {}, {
        previewToken: pageViewModel.previewToken || '',
        routeExpansionProposalId: '',
        routeDate: pageViewModel.routeDate || (this.data.requestPayload && this.data.requestPayload.routeDate),
        batchCode: pageViewModel.batchCode || (this.data.requestPayload && this.data.requestPayload.batchCode)
      })
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
    var pageViewModel = this.data.pageViewModel || {}
    var driver = pageViewModel.driver || {}
    var planningLocks = (pageViewModel.planning && pageViewModel.planning.stopLocks) || []
    var lockByDep = {}
    planningLocks.forEach(function (lock) {
      if (lock && lock.depFatherId != null) {
        lockByDep[String(lock.depFatherId)] = lock
      }
    })
    var routeStops = stopKeys.map(function (stopKey, index) {
      currentSet[stopKey] = true
      var stop = stopMap[stopKey] || { stopKey: stopKey }
      var depId = stop.departmentId || stop.depFatherId
      var planningLock = depId != null ? lockByDep[String(depId)] : null
      return Object.assign({}, stop, {
        stopKey: stopKey,
        seq: index + 1,
        isIncomingStop: incomingDepId != null && stop.departmentId === incomingDepId,
        planningLock: planningLock,
        driverLocked: !!planningLock,
        lockedDriverName: planningLock && planningLock.driverName || '',
        lockWarning: planningLock && planningLock.warning || '',
        lockedToCurrentDriver: !!planningLock
          && String(planningLock.driverUserId) === String(driver.driverUserId)
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
        that.setData({ previewing: false, autoPreviewing: false })
        that.scheduleAutoPreview()
        return
      }
      if (!res.result || res.result.code !== 0) {
        that.setData({
          previewing: false,
          autoPreviewing: false,
          routeEstimateStatus: '试算失败，请点击重新试算'
        })
        if (!options.silent) {
          wx.showToast({ title: (res.result && res.result.msg) || '试算失败', icon: 'none' })
        }
        return
      }
      that.setData({ requestPayload: payload })
      that.applyPageViewModel(res.result.data, {
        keepStopKeys: true
      })
    }).catch(function () {
      if (!options.silent) {
        load.hideLoading()
      }
      that.setData({
        previewing: false,
        autoPreviewing: false,
        routeEstimateStatus: '网络异常，路线尚未重新试算'
      })
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
      customerSearchText: (e && e.detail && e.detail.value) || ''
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
      routeDirty: false,
      hasUnsavedChanges: false,
      autoPreviewing: false,
      pageTitle: initial && initial.manualDispatch ? '调整送货顺序' : '编辑司机路线'
    })
    this._pageTimeline = []
    this.loadPage()
  },

  onBottomPreview: function () {
    this.previewPage({ silent: false })
  },

  onAiExpandRoute: function () {
    var that = this
    if (this.data.routeDirty || this.data.previewing) {
      wx.showToast({ title: '请等待当前路线试算完成', icon: 'none' })
      return
    }
    if (this.data.expandingRoute) return
    var payload = this.buildRequestPayload()
    var pageViewModel = this.data.pageViewModel || {}
    payload.previewToken = pageViewModel.previewToken || payload.previewToken
    if (!payload.previewToken) {
      wx.showToast({ title: '请先重新计算当前路线', icon: 'none' })
      return
    }
    this.setData({ expandingRoute: true })
    load.showLoading('AI 正在补充客户')
    postDriverRouteExpansionPreview(payload).then(function (res) {
      load.hideLoading()
      that.setData({ expandingRoute: false })
      if (!res.result || res.result.code !== 0) {
        wx.showToast({ title: (res.result && res.result.msg) || 'AI 增补失败', icon: 'none' })
        return
      }
      var proposal = (res.result && res.result.data) || {}
      that.setData({
        expansionProposal: proposal,
        expansionReview: buildExpansionReview(proposal, that.data.stopMap || {}),
        expansionReviewVisible: true
      })
    }).catch(function () {
      load.hideLoading()
      that.setData({ expandingRoute: false })
      wx.showToast({ title: '网络异常，AI 增补失败', icon: 'none' })
    })
  },

  onCancelExpansionReview: function () {
    this.setData({
      expansionReviewVisible: false,
      expansionReview: null,
      expansionProposal: null
    })
  },

  onAdoptExpansionProposal: function () {
    var that = this
    var proposal = this.data.expansionProposal || {}
    var review = this.data.expansionReview || {}
    if (!review.hasAddedStops) {
      wx.showToast({ title: '当前没有可采用的新增客户', icon: 'none' })
      return
    }
    var proposedStopKeys = proposal.proposedStopKeys || []
    if (!proposedStopKeys.length || !proposal.proposalId) {
      wx.showToast({ title: '建议数据已失效，请重新生成', icon: 'none' })
      return
    }
    var nextStopMap = mergeStopMap(this.data.stopMap, proposal.addedStops || [])
    this.setData({
      stopMap: nextStopMap,
      stopKeys: proposedStopKeys.slice(),
      expansionReviewVisible: false,
      expansionReview: null,
      requestPayload: Object.assign({}, this.data.requestPayload || {}, {
        routeExpansionProposalId: proposal.proposalId
      })
    }, function () {
      that.rebuildLists()
      that.markRouteChanged()
    })
  },

  stopExpansionReviewEvent: function () {
    // 阻止点击建议面板内容时触发遮罩取消。
  },

  onBottomConfirm: function () {
    var that = this
    var pageViewModel = this.data.pageViewModel || {}
    var actions = pageViewModel.actions || {}
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

  onPlanningLockTap: function (e) {
    var ds = eventNodeDetail(e)
    var index = Number(ds.nodeIndex)
    var node = (this.data.editTimeline || [])[index]
    var pageViewModel = this.data.pageViewModel || {}
    var driver = pageViewModel.driver || {}
    var depFatherId = node && (node.depFatherId || node.departmentId)
    if (!node || depFatherId == null || !driver.driverUserId) {
      wx.showToast({ title: '客户或司机信息不完整', icon: 'none' })
      return
    }
    if (this.data.planningLockSubmitting) return
    var currentLock = node.planningLock || null
    var lockedToCurrent = currentLock
      && String(currentLock.driverUserId) === String(driver.driverUserId)
    var that = this
    wx.showModal({
      title: lockedToCurrent ? '解除固定司机？' : '固定给当前司机？',
      content: lockedToCurrent
        ? (node.customerName + ' 将恢复自动分派。')
        : (node.customerName + ' 本批次固定由 ' + driver.driverName + ' 配送。'),
      confirmText: lockedToCurrent ? '解除固定' : '确认固定',
      cancelText: '取消',
      success: function (res) {
        if (!res.confirm) return
        that.submitCurrentDriverLock(node, driver, currentLock, lockedToCurrent)
      }
    })
  },

  submitCurrentDriverLock: function (node, driver, currentLock, unlock) {
    var that = this
    var session = resolveSession()
    var pageViewModel = this.data.pageViewModel || {}
    var request = {
      disId: session.disId,
      routeDate: pageViewModel.routeDate,
      batchCode: pageViewModel.batchCode || 'MORNING',
      depFatherId: node.depFatherId || node.departmentId,
      expectedVersion: currentLock && currentLock.version || 0,
      operatorUserId: session.operatorUserId
    }
    if (!unlock) request.driverUserId = driver.driverUserId
    this.setData({ planningLockSubmitting: true })
    load.showLoading(unlock ? '解除固定中' : '固定司机中')
    var task = unlock ? unlockDispatchStopDriver(request) : lockDispatchStopDriver(request)
    task.then(function (res) {
      load.hideLoading()
      that.setData({ planningLockSubmitting: false })
      if (!res.result || res.result.code !== 0) {
        wx.showToast({ title: res.result && res.result.msg || '操作失败', icon: 'none' })
        return
      }
      wx.showToast({ title: unlock ? '已解除固定' : '已固定司机', icon: 'success' })
      that.loadPage()
    }).catch(function (error) {
      load.hideLoading()
      that.setData({ planningLockSubmitting: false })
      wx.showToast({ title: error && error.message || '操作失败', icon: 'none' })
    })
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

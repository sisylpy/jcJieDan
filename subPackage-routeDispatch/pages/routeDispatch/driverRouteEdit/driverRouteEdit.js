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

function formatFinishTime(value) {
  var raw = value == null ? '' : String(value).trim()
  var match = raw.match(/T(\d{2}:\d{2})/)
  return match ? match[1] : (raw || '—')
}

function routeEndPresentation(pageViewModel) {
  pageViewModel = pageViewModel || {}
  var returnToDepotRequired = pageViewModel.returnToDepotRequired
  return {
    endLabel: pageViewModel.routeEndLabel || '预计结束',
    distanceScopeLabel: returnToDepotRequired === true
      ? '往返'
      : (returnToDepotRequired === false ? '全程' : '路线全程'),
    policyLabel: pageViewModel.routeEndType === 'RETURN_TO_DEPOT'
      ? '终点为仓库'
      : (pageViewModel.routeEndType === 'END_AT_LAST_STOP'
        ? '终点为最后一家饭店部门'
        : '路线终点以服务端返回为准')
  }
}

function expansionCapability(pageViewModel) {
  pageViewModel = pageViewModel || {}
  if (pageViewModel.candidatePolicy !== 'SANDBOX_REBALANCE') {
    return {
      enabled: false,
      reasonCode: 'ROUTE_EXPANSION_CLIENT_CONTRACT_MISMATCH',
      message: '路线增补合同已更新，请刷新页面或升级小程序'
    }
  }
  if (pageViewModel.canExpandRoute !== true) {
    return {
      enabled: false,
      reasonCode: pageViewModel.expandDisabledReasonCode || 'ROUTE_EXPANSION_NOT_ALLOWED',
      message: pageViewModel.expandDisabledMessage || '当前路线不可执行 AI 增补'
    }
  }
  return { enabled: true, reasonCode: '', message: '' }
}

function defaultExpansionForm(defaults) {
  defaults = defaults || {}
  var durationS = defaults.maxActiveRouteDurationS
  var distanceM = defaults.maxRoadDistanceM
  var finishAt = defaults.latestRouteFinishAt
  var finishMatch = finishAt != null ? String(finishAt).match(/T(\d{2}:\d{2})/) : null
  return {
    durationHours: durationS != null ? String(Math.floor(Number(durationS) / 3600)) : '',
    durationMinutes: durationS != null ? String(Math.floor((Number(durationS) % 3600) / 60)) : '',
    latestFinishTime: finishMatch ? finishMatch[1] : '',
    maxRoadDistanceKm: distanceM != null ? String(Number(distanceM) / 1000) : '',
    maxAddedStops: defaults.maxAddedStops != null ? String(defaults.maxAddedStops) : ''
  }
}

function isBlank(value) {
  return value == null || String(value).trim() === ''
}

function parseWholeNumber(value, label, options) {
  options = options || {}
  if (isBlank(value)) return { empty: true }
  var raw = String(value).trim()
  if (!/^\d+$/.test(raw)) {
    return { error: label + '必须是非负整数' }
  }
  var parsed = Number(raw)
  if (!Number.isSafeInteger(parsed)) {
    return { error: label + '超出允许范围' }
  }
  if (options.positive && parsed <= 0) {
    return { error: label + '必须大于0' }
  }
  if (options.max != null && parsed > options.max) {
    return { error: label + '不能超过' + options.max }
  }
  return { value: parsed }
}

function buildExpansionConstraintPayload(form, routeDate) {
  form = form || {}
  var hours = parseWholeNumber(form.durationHours, '工作时长小时', { max: 24 })
  if (hours.error) return { error: hours.error }
  var minutes = parseWholeNumber(form.durationMinutes, '工作时长分钟', { max: 59 })
  if (minutes.error) return { error: minutes.error }
  var durationConfigured = !hours.empty || !minutes.empty
  var durationS = null
  if (durationConfigured) {
    durationS = Number(hours.value || 0) * 3600 + Number(minutes.value || 0) * 60
    if (durationS <= 0) {
      return { error: '可工作时长必须大于0' }
    }
    if (durationS > 24 * 3600) {
      return { error: '可工作时长不能超过24小时' }
    }
  }

  var latestFinishAt = null
  if (!isBlank(form.latestFinishTime)) {
    var finish = String(form.latestFinishTime).trim()
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(finish)
        || !/^\d{4}-\d{2}-\d{2}$/.test(String(routeDate || ''))) {
      return { error: '最晚完成时间格式无效，请刷新路线日期后重试' }
    }
    latestFinishAt = String(routeDate) + 'T' + finish + ':00+08:00'
  }

  var maxRoadDistanceM = null
  if (!isBlank(form.maxRoadDistanceKm)) {
    var rawDistance = String(form.maxRoadDistanceKm).trim()
    if (!/^\d+(?:\.\d{1,3})?$/.test(rawDistance)) {
      return { error: '全程距离请填写最多三位小数的正数' }
    }
    var distanceKm = Number(rawDistance)
    if (!(distanceKm > 0) || distanceKm > 2000) {
      return { error: '全程距离必须大于0且不超过2000公里' }
    }
    maxRoadDistanceM = Math.round(distanceKm * 1000)
    if (maxRoadDistanceM <= 0) {
      return { error: '全程距离转换后必须大于0米' }
    }
  }

  var maxAddedStops = parseWholeNumber(form.maxAddedStops, '最多新增饭店部门', {
    positive: true,
    max: 20
  })
  if (maxAddedStops.error) return { error: maxAddedStops.error }
  if (durationS == null && latestFinishAt == null && maxRoadDistanceM == null) {
    return { error: '可工作时长、最晚完成时间、全程距离上限至少填写一项' }
  }

  var payload = {}
  if (durationS != null) payload.maxActiveRouteDurationS = durationS
  if (latestFinishAt != null) payload.latestRouteFinishAt = latestFinishAt
  if (maxRoadDistanceM != null) payload.maxRoadDistanceM = maxRoadDistanceM
  if (!maxAddedStops.empty) payload.maxAddedStops = maxAddedStops.value
  return { payload: payload }
}

function formatConstraintValue(key, value) {
  if (value == null || value === '') return '未设置'
  if (key === 'maxActiveRouteDurationS') return formatDuration(value)
  if (key === 'maxRoadDistanceM') return formatRoadDistance(value)
  if (key === 'latestRouteFinishAt') return formatFinishTime(value)
  if (key === 'maxAddedStops') return String(value) + ' 家'
  return String(value)
}

function expansionConstraintRows(proposal) {
  proposal = proposal || {}
  var constraints = proposal.constraints || {}
  var effective = constraints.effective || constraints.requested || {}
  return [
    { key: 'maxActiveRouteDurationS', label: '最大工作时长', valueLabel: formatConstraintValue('maxActiveRouteDurationS', effective.maxActiveRouteDurationS) },
    { key: 'latestRouteFinishAt', label: '最晚完成时间', valueLabel: formatConstraintValue('latestRouteFinishAt', effective.latestRouteFinishAt) },
    { key: 'maxRoadDistanceM', label: '最大道路距离', valueLabel: formatConstraintValue('maxRoadDistanceM', effective.maxRoadDistanceM) },
    { key: 'maxAddedStops', label: '最多新增', valueLabel: formatConstraintValue('maxAddedStops', effective.maxAddedStops) }
  ]
}

function requestFailure(value, fallbackMessage) {
  var result = value && value.result ? value.result : (value && value.body ? value.body : value)
  result = result || {}
  return {
    statusCode: Number(value && value.statusCode || result.statusCode || result.code || 0),
    errorCode: value && value.errorCode || result.errorCode || '',
    provider: value && value.provider || result.provider || '',
    message: value && value.message || result.msg || result.message || fallbackMessage
  }
}

function isHuaweiRoadFailure(failure) {
  failure = failure || {}
  return String(failure.provider || '').toUpperCase() === 'HUAWEI'
    || /HUAWEI|ROAD_SERVICE|MATRIX|ROUTING/.test(String(failure.errorCode || '').toUpperCase())
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
  var addedSourceLabelByKey = {}
  addedRaw.forEach(function (stop) {
    var key = resolveStopKey(stop)
    if (!key) return
    proposalStopMap[key] = stop
    addedKeySet[key] = true
    addedSourceLabelByKey[key] = stop.sourceType === 'MOVABLE_SANDBOX_SUGGESTION'
      ? ('来自' + (stop.sourceDriverName || ('司机 ' + stop.sourceDriverUserId)) + '沙箱路线')
      : '来自未分配区域'
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
      seq: index + 1,
      sourceLabel: addedSourceLabelByKey[key]
    })
  })
  var finalStops = (proposal.proposedStopKeys || []).map(function (stopKey, index) {
    return Object.assign(resolveProposalStop(stopKey, stopMap, proposalStopMap), {
      seq: index + 1,
      isAiAdded: !!addedKeySet[stopKey],
      sourceLabel: addedKeySet[stopKey] ? addedSourceLabelByKey[stopKey] : '人工保留'
    })
  })
  var notSelectedStops = (proposal.notSelectedStops || []).map(function (stop, index) {
    var key = resolveStopKey(stop)
    return Object.assign(resolveProposalStop(key, stopMap, proposalStopMap), stop, {
      stopKey: key || ('not-selected-' + index),
      reason: stop.reason || '当前方案未选择该客户'
    })
  })
  var sourceRouteChanges = (proposal.sourceRouteChanges || []).map(function (route) {
    var movedCount = Math.max(0,
      Number(route.beforeStopCount || 0) - Number(route.afterStopCount || 0))
    return Object.assign({}, route, {
      driverLabel: route.driverName || ('司机 ' + route.driverUserId),
      movedCount: movedCount,
      changeLabel: movedCount + ' 家调入当前司机',
      routeResultLabel: route.routeEmptied
        ? '原沙箱建议路线已清空'
        : ('剩余 ' + Number(route.afterStopCount || 0) + ' 家，路线已重新计算')
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
      label: '全程 active time',
      beforeLabel: formatDuration(before.activeRouteDurationS),
      afterLabel: formatDuration(after.activeRouteDurationS),
      deltaLabel: formatMetricDelta(
        Number(after.activeRouteDurationS || 0) - Number(before.activeRouteDurationS || 0),
        formatDuration
      )
    },
    {
      key: 'finish',
      label: proposal.routeEndLabel || '预计结束',
      beforeLabel: formatFinishTime(before.plannedRouteFinishAt),
      afterLabel: formatFinishTime(after.plannedRouteFinishAt),
      deltaLabel: '服务端试算'
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
    addedStopCount: proposal.addedStopCount != null ? proposal.addedStopCount : addedStops.length,
    summary: proposal.summary || (addedStops.length
      ? '已生成路线增补建议'
      : '当前没有未分配或可安全调入且符合条件的饭店部门'),
    emptyCandidateMessage: addedStops.length
      ? ''
      : '当前没有未分配或可安全调入且符合条件的饭店部门',
    candidatePolicy: proposal.candidatePolicy,
    candidatePolicyLabel: '可从未分配区及其他司机未确认、未锁定的沙箱建议路线补充',
    routeEndLabel: proposal.routeEndLabel || '预计结束',
    routeEndType: proposal.routeEndType || '',
    routeEndPolicyLabel: proposal.routeEndType === 'RETURN_TO_DEPOT'
      ? '终点为仓库'
      : (proposal.routeEndType === 'END_AT_LAST_STOP'
        ? '终点为最后一家饭店部门'
        : '路线终点以服务端策略为准'),
    constraints: expansionConstraintRows(proposal),
    originalStops: originalStops,
    addedStops: addedStops,
    finalStops: finalStops,
    sourceRouteChanges: sourceRouteChanges,
    hasSourceRouteChanges: sourceRouteChanges.length > 0,
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
    adoptingExpansion: false,
    expansionConditionsVisible: false,
    expansionConstraintError: '',
    expansionNeedsRefresh: false,
    expansionCapability: {
      enabled: false,
      reasonCode: '',
      message: ''
    },
    expansionForm: defaultExpansionForm(),
    routeEndPresentation: routeEndPresentation(),
    routeEndTimeLabel: '—',
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

  buildExpansionRequestPayload: function (constraints) {
    var source = this.data.requestPayload || {}
    var pageViewModel = this.data.pageViewModel || {}
    var payload = {
      disId: source.disId,
      routeDate: pageViewModel.routeDate || source.routeDate,
      batchCode: pageViewModel.batchCode || source.batchCode,
      driverUserId: source.driverUserId,
      previewToken: pageViewModel.previewToken || source.previewToken,
      routeResourceType: source.routeResourceType,
      sandboxEditCredential: source.sandboxEditCredential,
      canonicalSandboxVersion: source.canonicalSandboxVersion,
      sandboxStateFingerprint: source.sandboxStateFingerprint
    }
    Object.keys(payload).forEach(function (key) {
      if (payload[key] == null || payload[key] === '') delete payload[key]
    })
    return Object.assign(payload, constraints || {})
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
    var capability = expansionCapability(pageViewModel)
    var endPresentation = routeEndPresentation(pageViewModel)
    var expansionForm = this.data.expansionForm || defaultExpansionForm()
    if (!this._expansionConstraintsInitialized) {
      expansionForm = defaultExpansionForm(pageViewModel.expansionConstraintDefaults)
      this._expansionConstraintsInitialized = true
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
      routeEstimateStatus: '路线已按当前门店顺序重新计算',
      loadError: '',
      pageTitle: pageViewModel.pageTitle || this.data.pageTitle,
      expansionCapability: capability,
      expansionForm: expansionForm,
      expansionConstraintError: '',
      expansionNeedsRefresh: false,
      expansionProposal: null,
      expansionReviewVisible: false,
      expansionReview: null,
      adoptingExpansion: false,
      routeEndPresentation: endPresentation,
      routeEndTimeLabel: (pageViewModel.driver && pageViewModel.driver.plannedReturnLabel)
        || formatFinishTime(pageViewModel.currentRouteFinishAt),
      requestPayload: Object.assign({}, this.data.requestPayload || {}, {
        previewToken: pageViewModel.previewToken || '',
        routeExpansionProposalId: '',
        sandboxEditCredential: pageViewModel.sandboxEditCredential
          || (this.data.requestPayload && this.data.requestPayload.sandboxEditCredential),
        canonicalSandboxVersion: pageViewModel.canonicalSandboxVersion
          || (this.data.requestPayload && this.data.requestPayload.canonicalSandboxVersion),
        sandboxStateFingerprint: pageViewModel.sandboxStateFingerprint
          || (this.data.requestPayload && this.data.requestPayload.sandboxStateFingerprint),
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

  refreshWholeSandboxPage: function () {
    if (typeof getCurrentPages !== 'function') return
    var pages = getCurrentPages() || []
    var sandboxPage = pages.length > 1 ? pages[pages.length - 2] : null
    if (!sandboxPage) return
    if (typeof sandboxPage.bumpPanelLoad === 'function') {
      sandboxPage.bumpPanelLoad()
      return
    }
    if (typeof sandboxPage.loadPage === 'function') {
      sandboxPage.loadPage()
    }
  },

  rollbackExpansionAdoption: function (rawFailure) {
    var rollback = this._expansionAdoptionRollback
    var failure = requestFailure(rawFailure, '建议采用失败')
    var stale = failure.statusCode === 409
    this._expansionAdoptionRollback = null
    if (!rollback) {
      this.setData({ adoptingExpansion: false })
      return failure
    }
    var that = this
    this.setData({
      stopMap: rollback.stopMap,
      stopKeys: rollback.stopKeys,
      requestPayload: rollback.requestPayload,
      routeDirty: false,
      hasUnsavedChanges: rollback.hasUnsavedChanges,
      confirmReady: rollback.confirmReady,
      previewing: false,
      autoPreviewing: false,
      adoptingExpansion: false,
      expansionNeedsRefresh: stale,
      expansionProposal: stale ? null : rollback.expansionProposal,
      expansionReview: stale ? null : rollback.expansionReview,
      expansionReviewVisible: stale ? false : true,
      routeEstimateStatus: stale ? '建议已过期，请刷新路线后重新生成' : '建议未采用，原路线保持不变'
    }, function () {
      that.rebuildLists()
    })
    return failure
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
    var requestRevision = this._editRevision || 0
    this.setData({
      previewing: true,
      autoPreviewing: !!options.silent,
      routeEstimateStatus: options.silent ? '正在自动重新试算路线…' : '正在重新试算路线…'
    })
    if (!options.silent) {
      load.showLoading('重新试算')
    }
    return postDriverRouteEditPreview(payload).then(function (res) {
      if (!options.silent) {
        load.hideLoading()
      }
      if (requestRevision !== (that._editRevision || 0)) {
        that.setData({ previewing: false, autoPreviewing: false })
        that.scheduleAutoPreview()
        return
      }
      if (!res.result || res.result.code !== 0) {
        if (options.expansionAdoption) {
          var adoptionFailure = that.rollbackExpansionAdoption(res)
          wx.showToast({ title: adoptionFailure.message, icon: 'none', duration: 2600 })
          return
        }
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
      if (options.expansionAdoption) {
        that._expansionAdoptionRollback = null
        that.refreshWholeSandboxPage()
      }
      that.applyPageViewModel(res.result.data, {
        keepStopKeys: true
      })
    }).catch(function (error) {
      if (!options.silent) {
        load.hideLoading()
      }
      if (options.expansionAdoption) {
        var adoptionFailure = that.rollbackExpansionAdoption(error)
        wx.showToast({ title: adoptionFailure.message, icon: 'none', duration: 2600 })
        return
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
      expansionProposal: null,
      expansionReviewVisible: false,
      expansionReview: null,
      routeEstimateStatus: '路线内容已变化，等待后台重新试算'
    })
    this.scheduleAutoPreview()
  },

  scheduleAutoPreview: function () {
    var that = this
    if (this._autoPreviewTimer) {
      clearTimeout(this._autoPreviewTimer)
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
    var capability = this.data.expansionCapability || {}
    if (!capability.enabled) {
      wx.showToast({ title: capability.message || '当前路线不可执行 AI 增补', icon: 'none', duration: 2600 })
      return
    }
    if (this.data.routeDirty || this.data.previewing) {
      wx.showToast({ title: '请等待当前路线试算完成', icon: 'none' })
      return
    }
    this.setData({
      expansionConditionsVisible: true,
      expansionConstraintError: '',
      expansionNeedsRefresh: false
    })
  },

  onExpansionConstraintInput: function (e) {
    var field = e && e.currentTarget && e.currentTarget.dataset && e.currentTarget.dataset.field
    var allowed = {
      durationHours: true,
      durationMinutes: true,
      maxRoadDistanceKm: true,
      maxAddedStops: true
    }
    if (!allowed[field]) return
    var form = Object.assign({}, this.data.expansionForm || {})
    form[field] = e && e.detail ? e.detail.value : ''
    this.setData({
      expansionForm: form,
      expansionConstraintError: '',
      expansionProposal: null,
      expansionReview: null,
      expansionReviewVisible: false
    })
  },

  onExpansionFinishChange: function (e) {
    var form = Object.assign({}, this.data.expansionForm || {})
    form.latestFinishTime = e && e.detail ? e.detail.value : ''
    this.setData({
      expansionForm: form,
      expansionConstraintError: '',
      expansionProposal: null,
      expansionReview: null,
      expansionReviewVisible: false
    })
  },

  onClearExpansionFinish: function () {
    var form = Object.assign({}, this.data.expansionForm || {})
    form.latestFinishTime = ''
    this.setData({ expansionForm: form, expansionConstraintError: '' })
  },

  onCancelExpansionConditions: function () {
    if (this.data.expandingRoute || this.data.adoptingExpansion) return
    this.setData({
      expansionConditionsVisible: false,
      expansionConstraintError: '',
      expansionProposal: null,
      expansionReview: null,
      expansionReviewVisible: false
    })
  },

  handleExpansionProposalFailure: function (rawFailure) {
    var failure = requestFailure(rawFailure, 'AI 增补失败')
    var stale = failure.statusCode === 409
    var baselineExceeded = failure.statusCode === 422
    var roadFailure = isHuaweiRoadFailure(failure)
    var message = roadFailure
      ? '道路服务暂不可用，请稍后重试'
      : failure.message
    this.setData({
      expandingRoute: false,
      expansionProposal: null,
      expansionReview: null,
      expansionReviewVisible: false,
      expansionNeedsRefresh: stale,
      expansionConstraintError: baselineExceeded ? message : ''
    })
    wx.showToast({ title: message, icon: 'none', duration: 2800 })
  },

  onGenerateExpansionSuggestion: function () {
    var that = this
    var capability = this.data.expansionCapability || {}
    if (!capability.enabled) {
      wx.showToast({ title: capability.message || '当前路线不可执行 AI 增补', icon: 'none' })
      return
    }
    if (this.data.routeDirty || this.data.previewing) {
      wx.showToast({ title: '请等待当前路线试算完成', icon: 'none' })
      return
    }
    if (this.data.expandingRoute || this.data.adoptingExpansion) return
    var pageViewModel = this.data.pageViewModel || {}
    var parsed = buildExpansionConstraintPayload(
      this.data.expansionForm,
      pageViewModel.routeDate || (this.data.requestPayload && this.data.requestPayload.routeDate)
    )
    if (parsed.error) {
      this.setData({ expansionConstraintError: parsed.error })
      wx.showToast({ title: parsed.error, icon: 'none' })
      return
    }
    var payload = this.buildExpansionRequestPayload(parsed.payload)
    if (!payload.previewToken) {
      wx.showToast({ title: '请先重新计算当前路线', icon: 'none' })
      return
    }
    this.setData({
      expandingRoute: true,
      expansionConstraintError: '',
      expansionNeedsRefresh: false,
      expansionProposal: null,
      expansionReview: null,
      expansionReviewVisible: false
    })
    load.showLoading('AI 正在补充饭店部门')
    return postDriverRouteExpansionPreview(payload).then(function (res) {
      load.hideLoading()
      if (!res.result || res.result.code !== 0) {
        that.handleExpansionProposalFailure(res)
        return
      }
      var proposal = (res.result && res.result.data) || {}
      if (proposal.candidatePolicy !== 'SANDBOX_REBALANCE') {
        that.handleExpansionProposalFailure({
          statusCode: 409,
          errorCode: 'ROUTE_EXPANSION_CLIENT_CONTRACT_MISMATCH',
          message: '服务端候选策略已变化，请刷新或升级后重试'
        })
        return
      }
      that.setData({
        expandingRoute: false,
        expansionProposal: proposal,
        expansionReview: buildExpansionReview(proposal, that.data.stopMap || {}),
        expansionReviewVisible: true
      })
    }).catch(function (error) {
      load.hideLoading()
      that.handleExpansionProposalFailure(error)
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
    if (this.data.adoptingExpansion || this.data.previewing) return
    var proposal = this.data.expansionProposal || {}
    var review = this.data.expansionReview || {}
    if (!review.hasAddedStops) {
      wx.showToast({ title: '当前没有可采用的新增饭店部门', icon: 'none' })
      return
    }
    var proposedStopKeys = proposal.proposedStopKeys || []
    if (!proposedStopKeys.length || !proposal.proposalId) {
      wx.showToast({ title: '建议数据已失效，请重新生成', icon: 'none' })
      return
    }
    var nextStopMap = mergeStopMap(this.data.stopMap, proposal.addedStops || [])
    this._expansionAdoptionRollback = {
      stopMap: this.data.stopMap,
      stopKeys: (this.data.stopKeys || []).slice(),
      requestPayload: cloneJson(this.data.requestPayload),
      hasUnsavedChanges: this.data.hasUnsavedChanges,
      confirmReady: this.data.confirmReady,
      expansionProposal: proposal,
      expansionReview: review
    }
    this.setData({
      stopMap: nextStopMap,
      stopKeys: proposedStopKeys.slice(),
      adoptingExpansion: true,
      expansionConditionsVisible: false,
      expansionReviewVisible: false,
      expansionReview: null,
      requestPayload: Object.assign({}, this.data.requestPayload || {}, {
        routeExpansionProposalId: proposal.proposalId
      })
    }, function () {
      that.rebuildLists()
      that.markRouteChanged()
      if (that._autoPreviewTimer) {
        clearTimeout(that._autoPreviewTimer)
        that._autoPreviewTimer = null
      }
      that.previewPage({ silent: false, expansionAdoption: true })
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
      if (data.routeDeleted) {
        wx.showToast({ title: '路线已删除，客户已回到待分配', icon: 'success' })
        setTimeout(function () {
          wx.navigateBack({ delta: 1 })
        }, 400)
        return
      }
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

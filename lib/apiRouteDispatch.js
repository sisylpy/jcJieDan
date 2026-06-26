/**
 * 配送商路线派单 — 新主链接口封装（Phase 1.5+）
 *
 * 【数据主权】页面必须以 shipment_task 为主权对象，读模型结构为：
 *   plan → driverRoutes → stops → shipmentTask → items
 *
 * 请勿以 stop.orders / stop.orderIds / route_stop_order 作为派单主权（已废弃）。
 *
 * 【主链】live order → GET sandbox/today（自动沙盘）→ 确认分派 confirmSandboxStop → ASSIGNED → bill → READY_TO_GO
 *
 * 【deprecated 调试】simulateRoute：旧模式全量持久化，非老板日常操作。
 *
 * 【禁止】不要调用旧派单接口：preview / confirm / disGetTodayOrderCustomerRoute /
 *        disGetCustomerDistanceMatrix / disGetDriversOptimalRoute 等。
 *
 * 后端 Controller：api/nxdisroutedispatch
 */

import Promise from './bluebird'
import apiUrl from '../config.js'

var load = require('./load.js')

var JSON_HEADER = {
  'Content-Type': 'application/json;charset=utf-8'
}

/** shipment_task 状态文案（页面展示用） */
export const SHIPMENT_TASK_STATUS_LABEL = {
  SIMULATED: '系统建议',
  UNASSIGNED: '未分派',
  ASSIGNED: '已分派，可装车',
  READY_TO_GO: '单据齐全，可出发',
  IN_DELIVERY: '配送中',
  DELIVERED: '已送达',
  CANCELLED: '已取消',
  CLOSED: '已关闭'
}

/**
 * ASSIGNED ≠ 已出发；READY_TO_GO 才是可正式配送。
 * 装车页看 ASSIGNED；配送页看 READY_TO_GO。
 */

/** route_plan 状态文案（plan.nxDrpStatus） */
export const ROUTE_PLAN_STATUS_LABEL = {
  SIMULATED: '沙盘建议',
  ASSIGNED: '已分派',
  READY: '可出发',
  CANCELLED: '已取消'
}

/** 调度客户分类文案（读模型 customerTierLabel，tier 枚举兜底） */
export const DISPATCH_CUSTOMER_TIER_LABEL = {
  VIP: 'VIP客户',
  NORMAL: '普通客户',
  SMALL: '小客户',
  NEW: '新客户'
}

/** 司机可派状态文案 */
export const DRIVER_DUTY_STATUS_LABEL = {
  OFF_DUTY: '不可派',
  ON_DUTY: '可派'
}

function requestFail(reject, e) {
  reject(e)
  if (load && load.hideLoading) {
    load.hideLoading()
  }
  wx.showToast({
    title: '请检查网络',
    icon: 'none'
  })
}

function parseResponseBody(data) {
  if (data == null || typeof data === 'object') {
    return data
  }
  if (typeof data !== 'string') {
    return data
  }
  var text = data.trim()
  if (!text) {
    return data
  }
  try {
    return JSON.parse(text)
  } catch (e) {
    console.warn('[apiRouteDispatch] response is not JSON', text.slice(0, 200))
    return data
  }
}

function wrapRequest(options) {
  return new Promise(function (resolve, reject) {
    wx.request({
      url: options.url,
      method: options.method || 'GET',
      data: options.data,
      header: options.header,
      success: function (res) {
        resolve({ result: parseResponseBody(res.data) })
      },
      fail: function (e) {
        requestFail(reject, e)
      }
    })
  })
}

var BASE = apiUrl.apiUrl + 'nxdisroutedispatch/'

/**
 * @deprecated 调试专用：旧模式全量持久化，会写 plan/task/stop。老板主流程请用 GET sandbox/today。
 * POST /api/nxdisroutedispatch/simulate
 */
export const simulateRoute = function (data) {
  var payload = {
    disId: data.disId,
    routeDate: data.routeDate,
    depotLat: data.depotLat,
    depotLng: data.depotLng,
    operatorUserId: data.operatorUserId,
    optimizerType: data.optimizerType,
    costProviderType: data.costProviderType
  }
  if (data.driverUserIds != null && data.driverUserIds.length > 0) {
    payload.driverUserIds = data.driverUserIds
  }
  return wrapRequest({
    url: BASE + 'simulate',
    method: 'POST',
    header: JSON_HEADER,
    data: payload
  })
}

/**
 * 配送商全部司机账号（含不可派）
 * GET /api/nxdisroutedispatch/drivers?disId=
 */
export const getDrivers = function (data) {
  return wrapRequest({
    url: BASE + 'drivers',
    method: 'GET',
    data: {
      disId: data.disId
    }
  })
}

/**
 * 今日可派、可参与派车的司机
 * GET /api/nxdisroutedispatch/drivers/available
 */
export const getAvailableDrivers = function (data) {
  return wrapRequest({
    url: BASE + 'drivers/available',
    method: 'GET',
    data: {
      disId: data.disId,
      routeDate: data.routeDate
    }
  })
}

/**
 * 开启司机可派
 * POST /api/nxdisroutedispatch/drivers/{driverUserId}/duty/on
 */
export const driverCheckIn = function (data) {
  return wrapRequest({
    url: BASE + 'drivers/' + data.driverUserId + '/duty/on',
    method: 'POST',
    header: JSON_HEADER,
    data: {
      disId: data.disId,
      driverUserId: data.driverUserId,
      dutyDate: data.dutyDate,
      operatorUserId: data.operatorUserId
    }
  })
}

/**
 * 关闭司机可派
 * POST /api/nxdisroutedispatch/drivers/{driverUserId}/duty/off
 */
export const driverCheckOut = function (data) {
  return wrapRequest({
    url: BASE + 'drivers/' + data.driverUserId + '/duty/off',
    method: 'POST',
    header: JSON_HEADER,
    data: {
      disId: data.disId,
      driverUserId: data.driverUserId,
      dutyDate: data.dutyDate,
      operatorUserId: data.operatorUserId
    }
  })
}

function buildSandboxTodayQuery(data) {
  var query = {
    disId: data.disId
  }
  if (data.routeDate != null && data.routeDate !== '') {
    query.routeDate = data.routeDate
  }
  if (data.batchCode != null && data.batchCode !== '') {
    query.batchCode = data.batchCode
  }
  return query
}

/**
 * 今日派车主读接口（老板端）
 * GET /api/nxdisroutedispatch/dispatch/sandbox/today
 */
export const getDispatchSandboxToday = function (data) {
  return wrapRequest({
    url: BASE + 'dispatch/sandbox/today',
    method: 'GET',
    data: buildSandboxTodayQuery(data)
  })
}

/**
 * @deprecated 调试全量接口，老板端请用 getDispatchSandboxToday
 * GET /api/nxdisroutedispatch/sandbox/today
 */
export const getSandboxToday = function (data) {
  return wrapRequest({
    url: BASE + 'sandbox/today',
    method: 'GET',
    data: buildSandboxTodayQuery(data)
  })
}

/**
 * 确认沙盘客户装车/分派（无需预先 taskId）
 * POST /api/nxdisroutedispatch/sandbox/stops/confirm
 */
export const confirmSandboxStop = function (data) {
  return wrapRequest({
    url: BASE + 'sandbox/stops/confirm',
    method: 'POST',
    header: JSON_HEADER,
    data: {
      disId: data.disId,
      routeDate: data.routeDate,
      batchCode: data.batchCode,
      depFatherId: data.depFatherId,
      sandboxStopKey: data.sandboxStopKey,
      driverUserId: data.driverUserId,
      operatorUserId: data.operatorUserId,
      manualStopSeq: data.manualStopSeq,
      assignReason: data.assignReason,
      liveOrderIds: data.liveOrderIds,
      taskId: data.taskId
    }
  })
}

/**
 * 已确认站点返回动态沙盘
 * POST /api/nxdisroutedispatch/sandbox/stops/{deliveryStopId}/return-to-sandbox
 */
export const returnSandboxStopToSandbox = function (data) {
  return wrapRequest({
    url: BASE + 'sandbox/stops/' + data.deliveryStopId + '/return-to-sandbox',
    method: 'POST',
    header: JSON_HEADER,
    data: {
      disId: data.disId,
      routeDate: data.routeDate,
      batchCode: data.batchCode,
      operatorUserId: data.operatorUserId
    }
  })
}

/**
 * 今日路线计划（legacy，请优先 getSandboxToday）
 * GET /api/nxdisroutedispatch/plan/today
 *
 * @param {Object} data
 * @param {number} data.disId 配送商 ID
 * @param {string} [data.status] 计划状态：SIMULATED | ASSIGNED | READY
 * @param {string} [data.batchCode] 派车批次：MORNING 等
 * @returns {Promise<{ result: Object }>} result.data = { dispatchBatch, routeDate, plan, tasks }
 */
export const getPlanToday = function (data) {
  var query = {
    disId: data.disId
  }
  if (data.status != null && data.status !== '') {
    query.status = data.status
  }
  if (data.batchCode != null && data.batchCode !== '') {
    query.batchCode = data.batchCode
  }
  return wrapRequest({
    url: BASE + 'plan/today',
    method: 'GET',
    data: query
  })
}

/**
 * 按 planId 查询路线计划详情
 * GET /api/nxdisroutedispatch/plan/{planId}
 *
 * @param {number|string} planId
 * @returns {Promise<{ result: Object }>} result.data = { plan, tasks }
 */
export const getPlanById = function (planId) {
  return wrapRequest({
    url: BASE + 'plan/' + planId,
    method: 'GET'
  })
}

/**
 * 按 taskId 查询配送任务详情（含 items）
 * GET /api/nxdisroutedispatch/tasks/{taskId}
 *
 * @param {number|string} taskId
 * @returns {Promise<{ result: Object }>} result.data 为 NxDisShipmentTaskEntity
 */
export const getTaskById = function (taskId) {
  return wrapRequest({
    url: BASE + 'tasks/' + taskId,
    method: 'GET'
  })
}

/**
 * 人工确认分派（锁定司机与可选停靠序号）
 * POST /api/nxdisroutedispatch/tasks/{taskId}/assign
 *
 * @param {Object} data
 * @param {number} data.taskId 配送任务 ID
 * @param {number} data.assignedDriverUserId 目标司机
 * @param {number} data.operatorUserId 操作人
 * @param {string} [data.assignReason] 分派原因
 * @param {number} [data.manualStopSeq] 人工锁定停靠序号
 * @returns {Promise<{ result: Object }>} result.data 为更新后的 task
 */
export const assignTask = function (data) {
  var taskId = data.taskId
  return wrapRequest({
    url: BASE + 'tasks/' + taskId + '/assign',
    method: 'POST',
    header: JSON_HEADER,
    data: {
      taskId: taskId,
      assignedDriverUserId: data.assignedDriverUserId,
      operatorUserId: data.operatorUserId,
      assignReason: data.assignReason,
      manualStopSeq: data.manualStopSeq
    }
  })
}

/**
 * 调整已分派任务到其他司机（可选改停靠序号）
 * POST /api/nxdisroutedispatch/tasks/{taskId}/move
 *
 * @param {Object} data
 * @param {number} data.taskId
 * @param {number} data.assignedDriverUserId
 * @param {number} data.operatorUserId
 * @param {number} [data.manualStopSeq]
 * @param {string} [data.adjustReason]
 */
export const moveTask = function (data) {
  var taskId = data.taskId
  return wrapRequest({
    url: BASE + 'tasks/' + taskId + '/move',
    method: 'POST',
    header: JSON_HEADER,
    data: {
      taskId: taskId,
      assignedDriverUserId: data.assignedDriverUserId,
      operatorUserId: data.operatorUserId,
      manualStopSeq: data.manualStopSeq,
      adjustReason: data.adjustReason
    }
  })
}

/**
 * 解除人工锁定，允许后续 re-simulate 调整
 * POST /api/nxdisroutedispatch/tasks/{taskId}/unlock
 *
 * @param {Object} data
 * @param {number} data.taskId
 * @param {number} data.operatorUserId
 * @param {string} [data.adjustReason]
 */
export const unlockTask = function (data) {
  var taskId = data.taskId
  return wrapRequest({
    url: BASE + 'tasks/' + taskId + '/unlock',
    method: 'POST',
    header: JSON_HEADER,
    data: {
      taskId: taskId,
      operatorUserId: data.operatorUserId,
      adjustReason: data.adjustReason
    }
  })
}

/**
 * 当日送达时间窗 override（仅影响今日 task/stop 快照，不改 nx_department 长期默认）
 * POST /api/nxdisroutedispatch/tasks/{taskId}/time-window
 *
 * 返回与 GET /plan/today 相同结构的 buildPlanQueryData。
 *
 * @param {Object} data
 * @param {number} data.taskId
 * @param {number} data.operatorUserId
 * @param {number} data.earliestDeliveryTimeS
 * @param {number} data.latestDeliveryTimeS
 * @param {number} [data.serviceMinutes]
 * @param {string} data.reason 调整原因
 */
export const overrideTaskTimeWindow = function (data) {
  var taskId = data.taskId
  return wrapRequest({
    url: BASE + 'tasks/' + taskId + '/time-window',
    method: 'POST',
    header: JSON_HEADER,
    data: {
      earliestDeliveryTimeS: data.earliestDeliveryTimeS,
      latestDeliveryTimeS: data.latestDeliveryTimeS,
      serviceMinutes: data.serviceMinutes,
      reason: data.reason,
      operatorUserId: data.operatorUserId
    }
  })
}

/**
 * 沙箱站点当日送达时间窗 override（confirm 前无 taskId）
 * POST /api/nxdisroutedispatch/dispatch/sandbox/stops/time-window
 *
 * @param {Object} data
 */
export const overrideSandboxStopTimeWindow = function (data) {
  return wrapRequest({
    url: BASE + 'dispatch/sandbox/stops/time-window',
    method: 'POST',
    header: JSON_HEADER,
    data: {
      disId: data.disId,
      routeDate: data.routeDate,
      batchCode: data.batchCode,
      departmentId: data.departmentId,
      depFatherId: data.depFatherId,
      sandboxStopKey: data.sandboxStopKey,
      deliveryStopId: data.deliveryStopId,
      earliestDeliveryTimeS: data.earliestDeliveryTimeS,
      latestDeliveryTimeS: data.latestDeliveryTimeS,
      serviceMinutes: data.serviceMinutes,
      reason: data.reason,
      operatorUserId: data.operatorUserId
    }
  })
}

/**
 * 司机终端装车页读模型
 * GET /api/nxdisroutedispatch/driver-terminal/loading/today
 */
export const getDriverLoadingToday = function (data) {
  var query = {
    disId: data.disId,
    driverUserId: data.driverUserId
  }
  if (data.routeDate != null && data.routeDate !== '') {
    query.routeDate = data.routeDate
  }
  if (data.batchCode != null && data.batchCode !== '') {
    query.batchCode = data.batchCode
  }
  return wrapRequest({
    url: BASE + 'driver-terminal/loading/today',
    method: 'GET',
    data: query
  })
}

/**
 * 司机终端配送页读模型
 * GET /api/nxdisroutedispatch/driver-terminal/delivery/today
 */
export const getDriverDeliveryToday = function (data) {
  var query = {
    disId: data.disId,
    driverUserId: data.driverUserId
  }
  if (data.routeDate != null && data.routeDate !== '') {
    query.routeDate = data.routeDate
  }
  if (data.batchCode != null && data.batchCode !== '') {
    query.batchCode = data.batchCode
  }
  return wrapRequest({
    url: BASE + 'driver-terminal/delivery/today',
    method: 'GET',
    data: query
  })
}

/**
 * 配送商今日装车读模型（老板视角，ASSIGNED / READY_TO_GO，不含沙盘待确认）
 * GET /api/nxdisroutedispatch/loading/today
 *
 * result.data = { routeDate, plan, loadingDriverRoutes[], loadingSummary, loadingWorkbench }
 */
export const getDispatchLoadingToday = function (data) {
  var query = {
    disId: data.disId
  }
  if (data.routeDate != null && data.routeDate !== '') {
    query.routeDate = data.routeDate
  }
  if (data.batchCode != null && data.batchCode !== '') {
    query.batchCode = data.batchCode
  }
  if (data.driverUserId != null && data.driverUserId !== '') {
    query.driverUserId = data.driverUserId
  }
  return wrapRequest({
    url: BASE + 'loading/today',
    method: 'GET',
    data: query
  })
}

/**
 * 配送商今日配送读模型（老板视角，已出发 / 配送中 / 已完成）
 * GET /api/nxdisroutedispatch/delivery/today
 *
 * result.data 须含 pageViewModel（sections[] + DRIVER_ROUTE 卡 + timeline）。
 * 旧字段 executionDriverRoutes[] 已不再由前台组装展示。
 */
export const getDispatchDeliveryToday = function (data) {
  var query = {
    disId: data.disId
  }
  if (data.routeDate != null && data.routeDate !== '') {
    query.routeDate = data.routeDate
  }
  if (data.batchCode != null && data.batchCode !== '') {
    query.batchCode = data.batchCode
  }
  if (data.driverUserId != null && data.driverUserId !== '') {
    query.driverUserId = data.driverUserId
  }
  return wrapRequest({
    url: BASE + 'delivery/today',
    method: 'GET',
    data: query
  })
}

/**
 * 路线进入装车流程（今日派单页 GO_LOADING）
 * POST /api/nxdisroutedispatch/driver-routes/{driverRouteId}/enter-loading
 */
export const enterDriverRouteLoading = function (data) {
  return wrapRequest({
    url: BASE + 'driver-routes/' + data.driverRouteId + '/enter-loading',
    method: 'POST',
    header: JSON_HEADER,
    data: data
  })
}

/**
 * 路线撤销装车，回到今日派单（装车页 RETURN_TO_DISPATCH）
 * POST /api/nxdisroutedispatch/driver-routes/{driverRouteId}/return-to-dispatch
 */
export const returnDriverRouteToDispatch = function (data) {
  return wrapRequest({
    url: BASE + 'driver-routes/' + data.driverRouteId + '/return-to-dispatch',
    method: 'POST',
    header: JSON_HEADER,
    data: data
  })
}

/**
 * 单客户确认装车
 * POST /api/nxdisroutedispatch/tasks/{taskId}/confirm-loading
 */
export const confirmTaskLoading = function (data) {
  var taskId = data.taskId
  return wrapRequest({
    url: BASE + 'tasks/' + taskId + '/confirm-loading',
    method: 'POST',
    header: JSON_HEADER,
    data: {
      disId: data.disId,
      taskId: taskId,
      driverUserId: data.driverUserId,
      operatorUserId: data.operatorUserId
    }
  })
}

/**
 * 整车确认装车
 * POST /api/nxdisroutedispatch/driver-routes/{driverRouteId}/confirm-loading-all
 */
export const confirmRouteLoadingAll = function (data) {
  var driverRouteId = data.driverRouteId
  return wrapRequest({
    url: BASE + 'driver-routes/' + driverRouteId + '/confirm-loading-all',
    method: 'POST',
    header: JSON_HEADER,
    data: {
      disId: data.disId,
      driverRouteId: driverRouteId,
      driverUserId: data.driverUserId,
      operatorUserId: data.operatorUserId,
      routeDate: data.routeDate,
      batchCode: data.batchCode
    }
  })
}

/**
 * 司机装车完成，确认出发（进入配送执行阶段）
 * POST /api/nxdisroutedispatch/drivers/{driverUserId}/depart
 */
export const confirmDriverDepart = function (data) {
  return wrapRequest({
    url: BASE + 'drivers/' + data.driverUserId + '/depart',
    method: 'POST',
    header: JSON_HEADER,
    data: {
      disId: data.disId,
      driverUserId: data.driverUserId,
      routeDate: data.routeDate,
      batchCode: data.batchCode,
      planId: data.planId,
      operatorUserId: data.operatorUserId
    }
  })
}

/**
 * 送货完成
 * POST /api/nxdisroutedispatch/delivery/stops/{deliveryStopId}/complete
 */
export const completeDeliveryStop = function (deliveryStopId, data) {
  return wrapRequest({
    url: BASE + 'delivery/stops/' + deliveryStopId + '/complete',
    method: 'POST',
    header: JSON_HEADER,
    data: {
      operatorUserId: data.operatorUserId,
      remark: data.remark
    }
  })
}

/**
 * 配送异常
 * POST /api/nxdisroutedispatch/delivery/stops/{deliveryStopId}/exception
 */
export const markDeliveryStopException = function (deliveryStopId, data) {
  return wrapRequest({
    url: BASE + 'delivery/stops/' + deliveryStopId + '/exception',
    method: 'POST',
    header: JSON_HEADER,
    data: {
      operatorUserId: data.operatorUserId,
      exceptionType: data.exceptionType,
      remark: data.remark
    }
  })
}

function stripManualDispatchPathFields(payload) {
  payload = payload || {}
  var body = {}
  Object.keys(payload).forEach(function (key) {
    if (!/Path$/.test(key)) {
      body[key] = payload[key]
    }
  })
  return body
}

/**
 * 将后端返回的 /api/nxdisroutedispatch/... 路径解析为完整请求 URL
 */
export function resolveNxDisRouteDispatchPath(apiPath) {
  var path = String(apiPath || '').trim()
  if (!path) {
    return BASE + 'sandbox/manual-dispatch/driver-panorama'
  }
  var prefix = '/api/nxdisroutedispatch/'
  if (path.indexOf(prefix) === 0) {
    return apiUrl.apiUrl + 'nxdisroutedispatch/' + path.slice(prefix.length)
  }
  if (path.indexOf('nxdisroutedispatch/') >= 0) {
    var normalized = path.replace(/^\/api\//, '')
    if (normalized.indexOf('http') === 0) {
      return normalized
    }
    return apiUrl.apiUrl + normalized.replace(/^nxdisroutedispatch\//, 'nxdisroutedispatch/')
  }
  return BASE + path.replace(/^\//, '')
}

/**
 * 人工调度 — 司机全景列表
 * POST /api/nxdisroutedispatch/sandbox/manual-dispatch/driver-panorama
 * body 原样透传 payload（剔除 *Path 结尾字段）
 */
export const postManualDispatchDriverPanorama = function (payload) {
  payload = payload || {}
  if (!payload.driverPanoramaPath) {
    return Promise.reject(new Error('payload 缺少 driverPanoramaPath'))
  }
  return wrapRequest({
    url: resolveNxDisRouteDispatchPath(payload.driverPanoramaPath),
    method: 'POST',
    header: JSON_HEADER,
    data: stripManualDispatchPathFields(payload)
  })
}

/**
 * 人工路线编辑页
 * POST /api/nxdisroutedispatch/sandbox/manual-dispatch/edit-page
 * body 原样透传 payload（剔除 *Path 结尾字段），可追加 manualStopSeq / requiredLatestArrivalAt
 */
export const postManualDispatchEditPage = function (payload) {
  payload = payload || {}
  var apiPath = payload.editPagePath || '/api/nxdisroutedispatch/sandbox/manual-dispatch/edit-page'
  return wrapRequest({
    url: resolveNxDisRouteDispatchPath(apiPath),
    method: 'POST',
    header: JSON_HEADER,
    data: stripManualDispatchPathFields(payload)
  })
}

/**
 * 司机路线编辑 — 进入页
 * POST /api/nxdisroutedispatch/sandbox/driver-route-edit/page
 */
export const postDriverRouteEditPage = function (payload) {
  payload = payload || {}
  var apiPath = payload.editPagePath || '/api/nxdisroutedispatch/sandbox/driver-route-edit/page'
  return wrapRequest({
    url: resolveNxDisRouteDispatchPath(apiPath),
    method: 'POST',
    header: JSON_HEADER,
    data: stripManualDispatchPathFields(payload)
  })
}

/**
 * 司机路线编辑 — 重新试算
 * POST /api/nxdisroutedispatch/sandbox/driver-route-edit/preview
 */
export const postDriverRouteEditPreview = function (payload) {
  payload = payload || {}
  var apiPath = payload.previewPath || '/api/nxdisroutedispatch/sandbox/driver-route-edit/preview'
  return wrapRequest({
    url: resolveNxDisRouteDispatchPath(apiPath),
    method: 'POST',
    header: JSON_HEADER,
    data: stripManualDispatchPathFields(payload)
  })
}

/**
 * 司机路线编辑 — 确认派单
 * POST /api/nxdisroutedispatch/sandbox/driver-route-edit/confirm
 */
export const postDriverRouteEditConfirm = function (payload) {
  payload = payload || {}
  var apiPath = payload.confirmPath || '/api/nxdisroutedispatch/sandbox/driver-route-edit/confirm'
  return wrapRequest({
    url: resolveNxDisRouteDispatchPath(apiPath),
    method: 'POST',
    header: JSON_HEADER,
    data: stripManualDispatchPathFields(payload)
  })
}

/**
 * 配送商路线派单 — 正式主链接口封装
 *
 * 【主链】live order → GET dispatch/sandbox/today → confirmSandboxStop → ASSIGNED → bill → READY_TO_GO
 */
import apiUrl from '../config.js'

var dispatchAuthRefreshPromise = null

function buildDispatchHeader() {
  var header = { 'content-type': 'application/json' }
  var accessToken = wx.getStorageSync('dispatchAccessToken')
  if (accessToken) {
    header.Authorization = 'Bearer ' + accessToken
  }
  return header
}

function clearDispatchAuth() {
  wx.removeStorageSync('dispatchAccessToken')
  wx.removeStorageSync('dispatchPermissions')
  wx.removeStorageSync('dispatchTokenExpiresAt')
}

function hasUsableDispatchToken() {
  var token = wx.getStorageSync('dispatchAccessToken')
  if (!token) return false
  var expiresAt = wx.getStorageSync('dispatchTokenExpiresAt')
  if (!expiresAt) return true
  var expiresTime = typeof expiresAt === 'number' ? expiresAt : new Date(expiresAt).getTime()
  return !isNaN(expiresTime) && expiresTime > Date.now() + 60 * 1000
}

function persistDispatchAuth(auth) {
  if (!auth || !auth.accessToken) return false
  wx.setStorageSync('dispatchAccessToken', auth.accessToken)
  wx.setStorageSync('dispatchPermissions', auth.permissions || [])
  wx.setStorageSync('dispatchTokenExpiresAt', auth.expiresAt || '')
  delete auth.accessToken
  return true
}

function refreshBossDispatchAuth() {
  if (dispatchAuthRefreshPromise) return dispatchAuthRefreshPromise
  dispatchAuthRefreshPromise = new Promise(function (resolve, reject) {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'owner/auth/dispatch-session',
      method: 'POST',
      success: function (response) {
        var body = response && response.data
        if (!body || body.code !== 0 || !persistDispatchAuth(body.data)) {
          reject(new Error((body && (body.msg || body.message)) || '调度权限续签失败'))
          return
        }
        resolve()
      },
      fail: reject
    })
  })
  dispatchAuthRefreshPromise = dispatchAuthRefreshPromise.then(function (value) {
    dispatchAuthRefreshPromise = null
    return value
  }, function (error) {
    dispatchAuthRefreshPromise = null
    throw error
  })
  return dispatchAuthRefreshPromise
}

function ensureDispatchAuth() {
  return hasUsableDispatchToken() ? Promise.resolve() : refreshBossDispatchAuth()
}

function parseResponseBody(raw) {
  if (raw == null) {
    return { code: -1, msg: '空响应' }
  }
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch (e) {
      return { code: -1, msg: raw }
    }
  }
  return raw
}

function requestFail(reject, err) {
  reject(err || new Error('network error'))
}

function wrapRequest(options) {
  return new Promise(function (resolve, reject) {
    function send(retried) {
      getApp().ownerRequest({
        url: options.url,
        method: options.method || 'GET',
        data: options.data,
        header: options.dispatchAuth ? buildDispatchHeader() : options.header,
        success: function (res) {
          if (options.dispatchAuth && res.statusCode === 401 && !retried) {
            clearDispatchAuth()
            refreshBossDispatchAuth().then(function () { send(true) }).catch(reject)
            return
          }
          var body = parseResponseBody(res.data)
          if (res.statusCode >= 400) {
            reject(new Error(body.msg || body.message || ('请求失败（' + res.statusCode + '）')))
            return
          }
          resolve({ result: body })
        },
        fail: function (e) {
          requestFail(reject, e)
        }
      })
    }
    if (options.dispatchAuth) {
      ensureDispatchAuth().then(function () { send(false) }).catch(reject)
    } else {
      send(false)
    }
  })
}

var BASE = apiUrl.apiUrl + 'nxdisroutedispatch/'

function buildSandboxTodayQuery(data) {
  var query = { disId: data.disId }
  if (data.routeDate != null && data.routeDate !== '') {
    query.routeDate = data.routeDate
  }
  if (data.batchCode != null && data.batchCode !== '') {
    query.batchCode = data.batchCode
  }
  if (data.operatorUserId != null) {
    query.operatorUserId = data.operatorUserId
  }
  return query
}

export const getDrivers = function (data) {
  return wrapRequest({
    url: BASE + 'drivers',
    method: 'GET',
    data: { disId: data.disId }
  })
}

export const getAvailableDrivers = function (data) {
  var query = { disId: data.disId }
  if (data.routeDate != null && data.routeDate !== '' && data.routeDate !== 'undefined') {
    query.routeDate = data.routeDate
  }
  if (data.batchCode != null && data.batchCode !== '' && data.batchCode !== 'undefined') {
    query.batchCode = data.batchCode
  }
  return wrapRequest({
    url: BASE + 'drivers/available',
    method: 'GET',
    data: query
  })
}

export const driverCheckIn = function (data) {
  return wrapRequest({
    url: BASE + 'drivers/' + data.driverUserId + '/duty/on',
    method: 'POST',
    dispatchAuth: true,
    data: {
      disId: data.disId,
      driverUserId: data.driverUserId,
      operatorUserId: data.operatorUserId
    }
  })
}

export const driverCheckOut = function (data) {
  return wrapRequest({
    url: BASE + 'drivers/' + data.driverUserId + '/duty/off',
    method: 'POST',
    dispatchAuth: true,
    data: {
      disId: data.disId,
      driverUserId: data.driverUserId,
      operatorUserId: data.operatorUserId
    }
  })
}

export const getDispatchSandboxToday = function (data) {
  return wrapRequest({
    url: BASE + 'dispatch/sandbox/today',
    method: 'GET',
    data: buildSandboxTodayQuery(data)
  })
}

export const getDispatchLoadingToday = function (data) {
  return wrapRequest({
    url: BASE + 'dispatch/loading/today',
    method: 'GET',
    data: buildSandboxTodayQuery(data)
  })
}

export const getDispatchDeliveryToday = function (data) {
  return wrapRequest({
    url: BASE + 'delivery/today',
    method: 'GET',
    data: buildSandboxTodayQuery(data)
  })
}

export const confirmSandboxStop = function (data) {
  return wrapRequest({
    url: BASE + 'sandbox/stops/confirm',
    method: 'POST',
    dispatchAuth: true,
    data: {
      disId: data.disId,
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

export const returnSandboxStopToSandbox = function (data) {
  return wrapRequest({
    url: BASE + 'sandbox/stops/' + data.deliveryStopId + '/return-to-sandbox',
    method: 'POST',
    dispatchAuth: true,
    data: {
      disId: data.disId,
      batchCode: data.batchCode,
      operatorUserId: data.operatorUserId,
      reason: data.reason,
      suppressTodayResponse: data.suppressTodayResponse
    }
  })
}

export const overrideSandboxStopTimeWindow = function (data) {
  return wrapRequest({
    url: BASE + 'dispatch/sandbox/stops/time-window',
    method: 'POST',
    dispatchAuth: true,
    data: data
  })
}

export const confirmDriverDepartNow = function (data) {
  return wrapRequest({
    url: BASE + 'drivers/' + data.driverUserId + '/depart-now',
    method: 'POST',
    dispatchAuth: true,
    data: {
      disId: data.disId,
      driverUserId: data.driverUserId,
      batchCode: data.batchCode,
      planId: data.planId,
      operatorUserId: data.operatorUserId
    }
  })
}

export const completeDeliveryStopNow = function (deliveryStopId, data) {
  return wrapRequest({
    url: BASE + 'delivery/stops/' + deliveryStopId + '/complete-now',
    method: 'POST',
    dispatchAuth: true,
    data: {
      operatorUserId: data.operatorUserId,
      disId: data.disId,
      driverUserId: data.driverUserId,
      batchCode: data.batchCode
    }
  })
}

export const returnToSandboxNow = function (deliveryStopId, data) {
  return wrapRequest({
    url: BASE + 'sandbox/stops/' + deliveryStopId + '/return-to-sandbox-now',
    method: 'POST',
    dispatchAuth: true,
    data: {
      operatorUserId: data.operatorUserId,
      disId: data.disId,
      driverUserId: data.driverUserId,
      batchCode: data.batchCode,
      reason: data.reason
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

export const postManualDispatchDriverPanorama = function (payload) {
  payload = payload || {}
  if (!payload.driverPanoramaPath) {
    return Promise.reject(new Error('payload 缺少 driverPanoramaPath'))
  }
  return wrapRequest({
    url: resolveNxDisRouteDispatchPath(payload.driverPanoramaPath),
    method: 'POST',
    dispatchAuth: true,
    data: stripManualDispatchPathFields(payload)
  })
}

export const postDriverRouteEditPage = function (payload) {
  payload = payload || {}
  var apiPath = payload.editPagePath || '/api/nxdisroutedispatch/sandbox/driver-route-edit/page'
  return wrapRequest({
    url: resolveNxDisRouteDispatchPath(apiPath),
    method: 'POST',
    dispatchAuth: true,
    data: stripManualDispatchPathFields(payload)
  })
}

export const postDriverRouteEditPreview = function (payload) {
  payload = payload || {}
  var apiPath = payload.previewPath || '/api/nxdisroutedispatch/sandbox/driver-route-edit/preview'
  return wrapRequest({
    url: resolveNxDisRouteDispatchPath(apiPath),
    method: 'POST',
    dispatchAuth: true,
    data: stripManualDispatchPathFields(payload)
  })
}

export const postDriverRouteEditConfirm = function (payload) {
  payload = payload || {}
  var apiPath = payload.confirmPath || '/api/nxdisroutedispatch/sandbox/driver-route-edit/confirm'
  return wrapRequest({
    url: resolveNxDisRouteDispatchPath(apiPath),
    method: 'POST',
    dispatchAuth: true,
    data: stripManualDispatchPathFields(payload)
  })
}

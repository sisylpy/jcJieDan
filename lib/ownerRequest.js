import apiUrl from '../config.js'

const OWNER_TOKEN_KEY = 'ownerAccessToken'
const OWNER_EXPIRES_KEY = 'ownerTokenExpiresAt'
const OWNER_PREFIX = '/api/owner/'
const OWNER_ROOT_PREFIX = '/owner/'

// 只有完成微信身份确认前必需的登录/注册入口可以不带 Owner Token。
// 不允许用客户端版本号或自定义 Header 扩大此列表。
const PUBLIC_API_PATHS = [
  '/api/nxdistributeruser/disLogin',
  '/api/nxdistributeruser/wxworkLogin',
  '/api/nxdistributer/disAndUserSave',
  '/api/nxdistributer/disAndUserSaveWork',
  '/api/nxdistributer/jjshUserSaveWithFile',
  '/api/nxdistributer/jjshUserSaveWithFileInvite',
  '/api/nxdistributer/jjshUserSaveWithFileByGbInvite',
  '/api/nxdistributeruser/disUserSaveWithFile',
  '/api/syscitymarket/jjshGetMarket',
  '/api/nxdistributer/getInviteCode'
]
const SESSION_ISSUING_PATHS = [
  '/api/nxdistributeruser/disLogin',
  '/api/nxdistributeruser/wxworkLogin',
  '/api/nxdistributer/disAndUserSave',
  '/api/nxdistributer/disAndUserSaveWork',
  '/api/nxdistributer/jjshUserSaveWithFile',
  '/api/nxdistributer/jjshUserSaveWithFileInvite',
  '/api/nxdistributer/jjshUserSaveWithFileByGbInvite'
]

let redirectingToLogin = false
let ownerRequestCounter = 0

function nextOwnerRequestId() {
  ownerRequestCounter += 1
  const random = Math.random().toString(36).slice(2, 12)
  return `owner-${Date.now().toString(36)}-${ownerRequestCounter.toString(36)}-${random}`
}

function hasRequestId(header) {
  return Object.keys(header || {}).some(key => String(key).toLowerCase() === 'x-request-id')
}

function parseUrl(url) {
  const marker = '://'
  const start = String(url || '').indexOf(marker)
  const pathStart = start >= 0 ? String(url).indexOf('/', start + marker.length) : 0
  return pathStart >= 0 ? String(url).slice(pathStart) : String(url || '')
}

function isNongxinleApi(url) {
  const value = String(url || '')
  return value.indexOf(apiUrl.apiUrl) === 0
    || value.indexOf(apiUrl.server + 'owner/') === 0
}

function isNongxinleServerResource(url) {
  return String(url || '').indexOf(apiUrl.server) === 0
}

function isPublicApi(url) {
  const fullPath = parseUrl(url).split('?')[0]
  const apiIndex = fullPath.indexOf('/api/')
  const path = apiIndex >= 0 ? fullPath.slice(apiIndex) : fullPath
  return PUBLIC_API_PATHS.some(item => path === item || path.indexOf(item + '/') === 0)
}

function isSessionIssuingApi(url) {
  const fullPath = parseUrl(url).split('?')[0]
  const apiIndex = fullPath.indexOf('/api/')
  const path = apiIndex >= 0 ? fullPath.slice(apiIndex) : fullPath
  return SESSION_ISSUING_PATHS.some(item => path === item || path.indexOf(item + '/') === 0)
}

function toOwnerUrl(url) {
  if (!isNongxinleApi(url) || isPublicApi(url)) return url
  const value = String(url)
  if (value.indexOf(OWNER_PREFIX) >= 0 || value.indexOf(OWNER_ROOT_PREFIX) >= 0) return value
  return value.replace('/api/', OWNER_PREFIX)
}

function ownerTokenUsable() {
  const token = wx.getStorageSync(OWNER_TOKEN_KEY)
  if (!token) return false
  const expiresAt = wx.getStorageSync(OWNER_EXPIRES_KEY)
  if (!expiresAt) return true
  const expiry = typeof expiresAt === 'number' ? expiresAt : new Date(expiresAt).getTime()
  return !isNaN(expiry) && expiry > Date.now()
}

export function hasUsableOwnerToken() {
  return ownerTokenUsable()
}

export function persistOwnerAuth(responseBody) {
  const auth = responseBody && responseBody.data && responseBody.data.ownerAuth
  if (!auth || !auth.accessToken) return false
  wx.setStorageSync(OWNER_TOKEN_KEY, auth.accessToken)
  wx.setStorageSync(OWNER_EXPIRES_KEY, auth.expiresAt || '')
  wx.setStorageSync('ownerUserId', auth.userId || '')
  wx.setStorageSync('ownerDistributerId', auth.distributerId || '')
  wx.setStorageSync('ownerRoleCode', auth.roleCode)
  // 防止业务日志或页面状态再次持有明文 Token。
  delete auth.accessToken
  return true
}

export function clearOwnerLoginState() {
  ;[
    OWNER_TOKEN_KEY, OWNER_EXPIRES_KEY, 'ownerUserId', 'ownerDistributerId',
    'ownerRoleCode', 'userInfo', 'disInfo', 'loginType',
    'dispatchAccessToken', 'dispatchPermissions', 'dispatchTokenExpiresAt'
  ].forEach(key => wx.removeStorageSync(key))
}

function goLogin(message) {
  clearOwnerLoginState()
  if (redirectingToLogin) return
  redirectingToLogin = true
  wx.showToast({ title: message || '登录已失效，请重新登录', icon: 'none' })
  setTimeout(() => {
    wx.reLaunch({
      url: '/subPackage-auth/pages/login/login',
      complete: () => { redirectingToLogin = false }
    })
  }, 100)
}

function protectedOptions(options, protectServerResource) {
  const source = options || {}
  const url = source.url || ''
  const protectedApi = source.ownerAuth !== false && isNongxinleApi(url) && !isPublicApi(url)
  const protectedResource = source.ownerAuth !== false && protectServerResource
    && isNongxinleServerResource(url)
  const header = Object.assign({}, source.header || {})
  if (protectedApi || protectedResource) {
    if (!ownerTokenUsable()) {
      goLogin('请先登录老板端')
      return null
    }
    header['X-NX-Owner-Token'] = wx.getStorageSync(OWNER_TOKEN_KEY)
    header['X-NX-Owner-Client'] = 'nxl-boss-mini'
    if (!hasRequestId(header)) header['X-Request-Id'] = nextOwnerRequestId()
  }
  return Object.assign({}, source, {
    url: protectedApi ? toOwnerUrl(url) : url,
    header: header
  })
}

function authFailure(options, response) {
  goLogin((response && response.data && response.data.msg) || '登录已失效，请重新登录')
  const error = {
    errMsg: 'owner token invalid',
    statusCode: response && response.statusCode,
    response: response
  }
  if (typeof options.fail === 'function') options.fail(error)
}

function ownerAuthFailed(response) {
  if (!response || response.statusCode !== 401) return false
  let data = response.data
  try { data = typeof data === 'string' ? JSON.parse(data) : data } catch (e) {}
  const errorCode = data && data.errorCode
  return typeof errorCode === 'string' && errorCode.indexOf('OWNER_TOKEN_') === 0
}

export function describeOwnerRequestError(error, fallback) {
  const response = error && error.response
  let body = response && response.data
  try { body = typeof body === 'string' ? JSON.parse(body) : body } catch (e) {}
  if (body && body.msg) return body.msg

  const statusCode = (error && error.statusCode) || (response && response.statusCode)
  if (statusCode === 401) return '老板端登录凭证无效，请重新登录'
  if (statusCode === 403) return '当前老板账号没有此操作权限'
  if (statusCode === 404) return '测试后台没有此登录接口，请确认前后台版本一致'
  if (statusCode >= 500) return '测试后台处理登录失败，请查看后台日志'

  const detail = String((error && error.errMsg) || '')
  if (detail.indexOf('timeout') >= 0) return '连接测试后台超时，请稍后重试'
  if (detail.indexOf('fail') >= 0 || !statusCode) {
    return '无法连接测试后台，请检查网络和测试服务状态'
  }
  return fallback || '老板端请求失败，请重试'
}

export function ownerRequest(options) {
  const resolved = protectedOptions(options)
  if (!resolved) {
    if (options && typeof options.fail === 'function') {
      options.fail({ errMsg: 'owner token required', statusCode: 401 })
    }
    if (options && typeof options.complete === 'function') options.complete()
    return null
  }
  const success = resolved.success
  resolved.success = response => {
    if (ownerAuthFailed(response)) {
      authFailure(options || {}, response)
      return
    }
    const persisted = persistOwnerAuth(response && response.data)
    if (isSessionIssuingApi(resolved.url)
      && response && response.data && response.data.code === 0 && !persisted) {
      authFailure(options || {}, {
        statusCode: 401,
        data: { msg: '后台未签发老板端登录凭证，请确认前后台版本一致' }
      })
      return
    }
    if (typeof success === 'function') success(response)
  }
  return wx.request(resolved)
}

export function ownerUploadFile(options) {
  const resolved = protectedOptions(options)
  if (!resolved) {
    if (options && typeof options.fail === 'function') {
      options.fail({ errMsg: 'owner token required', statusCode: 401 })
    }
    if (options && typeof options.complete === 'function') options.complete()
    return null
  }
  const success = resolved.success
  resolved.success = response => {
    if (ownerAuthFailed(response)) {
      let data = response.data
      try { data = typeof data === 'string' ? JSON.parse(data) : data } catch (e) {}
      authFailure(options || {}, Object.assign({}, response, { data: data }))
      return
    }
    let body = response && response.data
    try { body = typeof body === 'string' ? JSON.parse(body) : body } catch (e) {}
    persistOwnerAuth(body)
    if (typeof success === 'function') success(response)
  }
  return wx.uploadFile(resolved)
}

export function ownerDownloadFile(options) {
  const resolved = protectedOptions(options, true)
  if (!resolved) {
    if (options && typeof options.fail === 'function') {
      options.fail({ errMsg: 'owner token required', statusCode: 401 })
    }
    if (options && typeof options.complete === 'function') options.complete()
    return null
  }
  const success = resolved.success
  resolved.success = response => {
    if (response && response.statusCode === 401) {
      authFailure(options || {}, response)
      return
    }
    if (typeof success === 'function') success(response)
  }
  return wx.downloadFile(resolved)
}

export function ownerLogout() {
  return new Promise(resolve => {
    ownerRequest({
      url: apiUrl.apiUrl + 'owner/auth/logout',
      method: 'POST',
      success: response => {
        clearOwnerLoginState()
        resolve(response)
      },
      fail: () => {
        clearOwnerLoginState()
        resolve(null)
      }
    })
  })
}

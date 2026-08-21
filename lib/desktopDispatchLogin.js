import { approveDesktopDispatchChallengeByWechat } from './apiRouteDispatch.js'

export var DESKTOP_DISPATCH_LOGIN_TYPE = 'NXL_DESKTOP_DISPATCH_LOGIN'

function scanCode() {
  return new Promise(function (resolve, reject) {
    wx.scanCode({
      scanType: ['qrCode'],
      success: resolve,
      fail: reject
    })
  })
}

function parseLoginPayload(scanResult) {
  var raw = scanResult && scanResult.result
  var payload
  try {
    payload = JSON.parse(raw || '')
  } catch (error) {
    throw new Error('这不是桌面调度登录二维码')
  }
  if (!payload || payload.type !== DESKTOP_DISPATCH_LOGIN_TYPE || payload.version !== 1) {
    throw new Error('二维码类型不正确')
  }
  if (!String(payload.challengeId || '').match(/^[0-9a-fA-F]{32}$/)) {
    throw new Error('二维码登录信息不完整')
  }
  if (payload.expiresAt) {
    var expiresAt = new Date(String(payload.expiresAt).replace(/-/g, '/')).getTime()
    if (!isNaN(expiresAt) && expiresAt <= Date.now()) {
      throw new Error('二维码已过期，请在电脑上重新生成')
    }
  }
  return payload
}

function confirmLogin(payload) {
  return new Promise(function (resolve, reject) {
    wx.showModal({
      title: '登录桌面调度',
      content: '设备：' + (payload.deviceName || '配送商桌面端')
        + '\n配送调度仅对老板开放；文员登录桌面端后只显示订单工作台。',
      confirmText: '确认登录',
      success: function (result) {
        if (result.confirm) resolve(payload)
        else reject({ cancelled: true })
      },
      fail: reject
    })
  })
}

function loginWechat() {
  return new Promise(function (resolve, reject) {
    wx.login({
      success: function (result) {
        if (result && result.code) resolve(result.code)
        else reject(new Error('未获取到微信登录凭证'))
      },
      fail: reject
    })
  })
}

export function scanDesktopDispatchLogin() {
  var payload
  return scanCode()
    .then(parseLoginPayload)
    .then(function (parsed) {
      payload = parsed
      return confirmLogin(parsed)
    })
    .then(loginWechat)
    .then(function (code) {
      return approveDesktopDispatchChallengeByWechat(payload.challengeId, code)
    })
    .then(function (response) {
      var body = response && response.result
      if (!body || body.code !== 0 || !body.data) {
        throw new Error((body && (body.msg || body.message)) || '桌面登录授权失败')
      }
      wx.showToast({
        title: '老板登录成功',
        icon: 'success',
        duration: 2200
      })
      return body.data
    })
    .catch(function (error) {
      if (error && error.cancelled) return null
      var message = error && (error.message || error.errMsg)
      wx.showToast({
        title: message || '扫码失败，请重试',
        icon: 'none',
        duration: 3200
      })
      return null
    })
}

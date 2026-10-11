// 自包含请求封装：微信 AI 原子接口运行在独立 JS 环境，不能依赖主包 lib，
// 这里直接读 storage 里的老板端 token，按 ownerRequest 的鉴权头风格发请求。
// 独立 JS 环境使用 CommonJS 导出（官方 SKILL 规范）。

const OWNER_TOKEN_KEY = 'ownerAccessToken'
const OWNER_EXPIRES_KEY = 'ownerTokenExpiresAt'

// 与 lib/ownerRequest.js 的 ownerTokenUsable 同规则：无 token 或已过期都不发请求
// 注意：ownerTokenExpiresAt 可能是 'YYYY-MM-DD HH:mm:ss' 字符串，iOS 的 Date 不认
// 该格式（NaN），必须先转成 'YYYY/MM/DD HH:mm:ss' 再解析
function parseExpiry(v) {
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    const t = new Date(v.replace(/-/g, '/')).getTime()
    return isNaN(t) ? NaN : t
  }
  return NaN
}

function ownerTokenUsable() {
  const token = wx.getStorageSync(OWNER_TOKEN_KEY)
  if (!token) return false
  const expiresAt = wx.getStorageSync(OWNER_EXPIRES_KEY)
  if (!expiresAt) return true
  const expiry = parseExpiry(expiresAt)
  return !isNaN(expiry) && expiry > Date.now()
}

let reqCounter = 0
function nextRequestId() {
  reqCounter += 1
  const random = Math.random().toString(36).slice(2, 12)
  return 'owner-' + Date.now().toString(36) + '-' + reqCounter.toString(36) + '-' + random
}

function nxRequest(url, options) {
  const opts = options || {}
  const method = opts.method || 'GET'
  const data = opts.data
  const form = opts.form
  return new Promise((resolve, reject) => {
    if (!ownerTokenUsable()) {
      reject({ statusCode: 401, msg: '老板端登录已失效，请先在老板端登录' })
      return
    }
    const header = {
      'X-NX-Owner-Token': wx.getStorageSync(OWNER_TOKEN_KEY),
      'X-NX-Owner-Client': 'nxl-boss-mini',
      'X-Request-Id': nextRequestId()
    }

    let body = null
    if (form) {
      // x-www-form-urlencoded（phoneGetToFillDepOrders 等端点要求）
      body = Object.keys(form)
        .map(function (k) {
          return encodeURIComponent(k) + '=' + encodeURIComponent(form[k] == null ? '' : form[k])
        })
        .join('&')
      header['content-type'] = 'application/x-www-form-urlencoded'
    } else if (data) {
      body = JSON.stringify(data)
      header['content-type'] = 'application/json'
    }

    // 只读查询，网络层失败（如 ERR_CONNECTION_CLOSED）自动重试 1 次
    let retried = false
    const send = () => {
      wx.request({
        url: url,
        method: method,
        data: body,
        header: header,
        success: function (res) {
          if (res.statusCode === 401) {
            reject({ statusCode: 401, msg: '老板端登录已失效，请先在老板端登录' })
            return
          }
          let resBody = res.data
          try { resBody = typeof resBody === 'string' ? JSON.parse(resBody) : resBody } catch (e) {}
          // 与项目一致：code === 0 视为成功（外层信封）
          if (resBody && resBody.code !== undefined && resBody.code !== 0) {
            reject({ statusCode: res.statusCode, msg: (resBody && resBody.msg) || '后台返回业务错误' })
            return
          }
          // 解包到内层 data，直接返回业务数据（与连接器 json.data 一致）
          resolve(resBody && resBody.data !== undefined ? resBody.data : resBody)
        },
        fail: function (err) {
          if (!retried) {
            retried = true
            send()
            return
          }
          reject({ statusCode: 0, msg: (err && err.errMsg) || '网络请求失败' })
        }
      })
    }
    send()
  })
}

module.exports = { nxRequest: nxRequest }

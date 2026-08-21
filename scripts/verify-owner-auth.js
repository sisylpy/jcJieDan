#!/usr/bin/env node
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const failures = []

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name)
    if (entry.name === '.git' || entry.name === 'node_modules') return []
    return entry.isDirectory() ? walk(full) : [full]
  })
}

for (const file of walk(root).filter(file => file.endsWith('.js'))) {
  const relative = path.relative(root, file)
  if (relative.startsWith('scripts' + path.sep)) continue
  const source = fs.readFileSync(file, 'utf8')
  if (relative !== path.join('lib', 'ownerRequest.js')
      && /\bwx\.(request|uploadFile|downloadFile)\s*\(/.test(source)) {
    failures.push(`${relative}: 正式网络请求绕过 ownerRequest`)
  }
  if (/X-NX-Admin-Token/.test(source)) {
    failures.push(`${relative}: 老板端不得使用 Community Admin Token`)
  }
  if (/apiUrl\.server\s*\+\s*['"]sys\//.test(source)) {
    failures.push(`${relative}: 根路径管理 API 必须经过 /owner/ 鉴权入口`)
  }
}

const ownerRequest = fs.readFileSync(path.join(root, 'lib', 'ownerRequest.js'), 'utf8')
for (const required of [
  "X-NX-Owner-Token", "/api/owner/", "/owner/", "ownerAccessToken",
  "ownerUploadFile", "ownerDownloadFile", "statusCode === 401"
]) {
  if (!ownerRequest.includes(required)) failures.push(`ownerRequest 缺少 ${required}`)
}

const cloudSource = fs.readFileSync(path.join(root, 'lib/miniProgramCloud.js'), 'utf8')
if (!cloudSource.includes('getApp().ownerRequest(') || cloudSource.includes('wx.login(')) {
  failures.push('lib/miniProgramCloud.js: ASR/DeepSeek 必须只使用 Owner Token，不得重复 wx.login')
}

const dispatchSource = fs.readFileSync(path.join(root, 'lib/apiRouteDispatch.js'), 'utf8')
if (dispatchSource.includes('wx.login(') || dispatchSource.includes('wx.qy.login(')
    || !dispatchSource.includes('owner/auth/dispatch-session')) {
  failures.push('lib/apiRouteDispatch.js: 调度续签必须复用 Owner Token，不得重复微信登录')
}

const orderHomeSource = fs.readFileSync(path.join(root, 'pages/order/index/index.js'), 'utf8')
if (orderHomeSource.includes('wx.login(') || orderHomeSource.includes('wx.qy.login(')
    || !orderHomeSource.includes('_restoreOwnerSession()')
    || !orderHomeSource.includes('hasUsableOwnerToken()')) {
  failures.push('pages/order/index/index.js: 已登录页面必须复用 Owner Token，不得反复微信登录')
}

const loginSource = fs.readFileSync(path.join(root, 'pages/login/login.js'), 'utf8')
const onLoadSource = loginSource.slice(loginSource.indexOf('onLoad:'), loginSource.indexOf('_checkPrivacyAuth()'))
if (!onLoadSource.includes('this._login()') || onLoadSource.includes('verifiedInviteCode')
    || !loginSource.includes('_requireInviteForRegistration()')) {
  failures.push('pages/login/login.js: 现有老板必须先换取 Owner Token，邀请码只能拦截新用户注册')
}

if (failures.length) {
  console.error(failures.join('\n'))
  process.exit(1)
}
console.log('Owner Token 客户端静态检查通过')

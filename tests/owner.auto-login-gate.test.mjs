import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const js = readFileSync('subPackage-auth/pages/login/login.js', 'utf8')
const wxml = readFileSync('subPackage-auth/pages/login/login.wxml', 'utf8')

assert.match(js, /registrationReady:\s*false/)
assert.match(js, /loginInProgress:\s*false/)
assert.match(js, /loginFailed:\s*false/)
assert.match(js, /_restoreCachedOwnerSession\(\)/)
assert.match(js, /app\.hasUsableOwnerToken\(\)/)
assert.match(js, /if \(!this\._restoreCachedOwnerSession\(\)\)\s*\{\s*this\.loginExistingOwner\(\)/)
assert.match(js, /_openRegistration\(\)[\s\S]*registrationReady:\s*true/)
assert.match(wxml, /<block wx:if="\{\{registrationReady\}\}">/)
assert.match(wxml, /wx:if="\{\{showPrivacy\}\}"/)
assert.doesNotMatch(js, /\b_login\s*\(/)
assert.match(wxml, /正在进入配送工作台/)
assert.match(wxml, /bindtap="retryAutomaticLogin"/)
assert.doesNotMatch(wxml, /已有账号|立即登录|existing-login-card/)
assert.doesNotMatch(wxml, /bindtap="loginExistingOwner"/)
assert.match(js, /loginExistingOwner\(\)[\s\S]*disLogin\(\{ nxDiuCode: code \}\)/)
assert.match(js, /_loginExistingWorkOwner\(\)[\s\S]*wxworkLogin\(\{ nxDiuCode: code \}\)/)
assert.match(js, /Number\(result\.code\) === -1[\s\S]*this\._openRegistration\(\)/)
assert.match(js, /_handleExistingOwnerLoginResult[\s\S]*wx\.switchTab\(\{\s*url: '\/pages\/order\/index\/index'/)
assert.match(wxml, /class="registration-hero"/)
assert.match(wxml, /class="registration-card"/)
assert.match(wxml, /class="field-control market-control"/)
assert.match(wxml, /class="register-button ready"/)
assert.doesNotMatch(wxml, /windowWidth - 280/)

const onLoad = js.slice(
  js.indexOf('onLoad:'),
  js.indexOf('\n  _restoreCachedOwnerSession() {')
)
assert.doesNotMatch(onLoad, /_checkPrivacyAuth\(/)
assert.doesNotMatch(onLoad, /jjshGetMarket\(/)
assert.match(onLoad, /loginExistingOwner\(\)/)
assert.doesNotMatch(onLoad, /disLogin|wxworkLogin/)

console.log('owner registration entry: PASS')

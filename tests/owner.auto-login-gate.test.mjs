import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const js = readFileSync('subPackage-auth/pages/login/login.js', 'utf8')
const wxml = readFileSync('subPackage-auth/pages/login/login.wxml', 'utf8')

assert.match(js, /checkingLogin:\s*true/)
assert.match(js, /registrationReady:\s*false/)
assert.match(js, /_restoreCachedOwnerSession\(\)/)
assert.match(js, /app\.hasUsableOwnerToken\(\)/)
assert.match(js, /if \(!this\._restoreCachedOwnerSession\(\)\)\s*\{\s*this\._login\(\)/)
assert.match(js, /_openRegistration\(\)[\s\S]*registrationReady:\s*true/)
assert.match(js, /_showLoginFailure\(message\)[\s\S]*registrationReady:\s*false/)
assert.match(wxml, /wx:if="\{\{checkingLogin\}\}"/)
assert.match(wxml, /<block wx:if="\{\{registrationReady\}\}">/)
assert.match(wxml, /老客户将直接进入配送工作台/)
assert.match(wxml, /wx:if="\{\{showPrivacy\}\}"/)

const onLoad = js.slice(js.indexOf('onLoad:'), js.indexOf('_restoreCachedOwnerSession'))
assert.doesNotMatch(onLoad, /_checkPrivacyAuth\(/)
assert.doesNotMatch(onLoad, /jjshGetMarket\(/)

console.log('owner auto-login gate: PASS (13 checks)')

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const js = readFileSync('components/inputPurStock/inputPurStock.js', 'utf8')
const wxml = readFileSync('components/inputPurStock/inputPurStock.wxml', 'utf8')
const wxss = readFileSync('components/inputPurStock/inputPurStock.wxss', 'utf8')

assert.doesNotMatch(wxml, /hold-keyboard/)
assert.equal((wxml.match(/confirm-type="done"/g) || []).length, 4)
assert.equal((wxml.match(/bindconfirm="hideKeyboard"/g) || []).length, 4)
assert.equal((wxml.match(/bindtap="hideKeyboard"/g) || []).length, 3)
assert.match(js, /_hideKeyboard\(\)[\s\S]*wx\.hideKeyboard/)
assert.match(js, /_checkPrice\(e\)\s*\{\s*this\._hideKeyboard\(\)/)
assert.match(js, /_checkQuantity\(e\)\s*\{\s*this\._hideKeyboard\(\)/)
assert.match(js, /onProduceDateChange\(e\)\s*\{\s*this\._hideKeyboard\(\)/)
assert.match(js, /onShelfLifeUnitChange\(e\)\s*\{\s*this\._hideKeyboard\(\)/)
assert.match(js, /onExpiryDateChange\(e\)\s*\{\s*this\._hideKeyboard\(\)/)
assert.match(js, /confirm\(e\)\s*\{\s*this\._hideKeyboard\(\)/)
assert.match(wxss, /min-height:\s*104rpx/)
assert.match(wxss, /height:\s*68rpx/)
assert.match(wxss, /padding-top:\s*12rpx/)
assert.match(wxss, /padding-bottom:\s*12rpx/)

console.log('inputPurStock keyboard and compact layout: PASS (15 checks)')

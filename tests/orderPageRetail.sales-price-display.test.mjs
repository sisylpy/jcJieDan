import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const display = require(path.join(root, 'utils/platformOrderDisplay.js'))

test('订单单价格式统一保留一位小数', () => {
  assert.equal(display.normalizeOrder({ nxDoPrice: '6.000000' })._displayPrice, '6.0')
  assert.equal(display.normalizeOrder({ nxDoPrice: '7' })._displayPrice, '7.0')
  assert.equal(display.normalizeOrder({ nxDoPrice: '0.1' })._displayPrice, '-')
})

test('零售订单页使用标准化后的单价展示字段', () => {
  const js = fs.readFileSync(path.join(root,
    'subPackage-order/pages/order/orderPageRetail/orderPageRetail.js'), 'utf8')
  const view = fs.readFileSync(path.join(root,
    'subPackage-order/pages/order/orderPageRetail/orderPageRetail.wxml'), 'utf8')

  assert.match(js, /platformDisplay\.normalizeOrder\(order\)/)
  assert.match(view, /\{\{order\._displayPrice\}\}/)
  assert.doesNotMatch(view, /\?\s*'-'\s*:\s*order\.nxDoPrice/)
})

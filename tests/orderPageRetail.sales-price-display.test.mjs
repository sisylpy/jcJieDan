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
  assert.equal(display.formatEditableUnitPrice('6.000000'), '6.0')
  assert.equal(display.formatEditableUnitPrice('7'), '7.0')
  assert.equal(display.formatEditableUnitPrice('0.100000'), '')
})

test('正式售价覆盖占位价后，小计按数量重新展示', () => {
  const order = display.normalizeOrder({
    nxDoPrice: '7',
    nxDoQuantity: '2',
    nxDoWeight: '2',
    nxDoStandard: '袋',
    nxDoPrintStandard: '袋',
    nxDoSubtotal: '0.2',
  })
  assert.equal(order._displaySubtotal, '14.0')
})

test('零售订单页使用标准化后的单价展示字段', () => {
  const js = fs.readFileSync(path.join(root,
    'subPackage-order/pages/order/orderPageRetail/orderPageRetail.js'), 'utf8')
  const view = fs.readFileSync(path.join(root,
    'subPackage-order/pages/order/orderPageRetail/orderPageRetail.wxml'), 'utf8')

  assert.match(js, /platformDisplay\.normalizeOrder\(order\)/)
  assert.match(view, /\{\{order\._displayPrice\}\}/)
  assert.match(view, /\{\{order\._displaySubtotal\}\}/)
  assert.doesNotMatch(view, /\?\s*'-'\s*:\s*order\.nxDoPrice/)
})

test('三个订单页面都使用重新核算后的小计展示字段', () => {
  const views = [
    'subPackage-order/pages/order/orderPage/orderPage.wxml',
    'subPackage-order/pages/order/orderPageGb/orderPageGb.wxml',
    'subPackage-order/pages/order/orderPageRetail/orderPageRetail.wxml',
  ]
  views.forEach((viewPath) => {
    const view = fs.readFileSync(path.join(root, viewPath), 'utf8')
    assert.match(view, /\{\{order\._displaySubtotal\}\}/, viewPath)
    assert.doesNotMatch(view, /\?\s*'-'\s*:\s*order\.nxDoSubtotal/, viewPath)
  })
})

test('写价格页加载数据库价格时格式化为一位小数', () => {
  const script = fs.readFileSync(path.join(root,
    'subPackage-order/pages/order/writePrice/writePrice.js'), 'utf8')
  assert.match(script, /platformDisplay\.formatEditableUnitPrice\(order\.nxDoPrice\)/)
  assert.match(script, /小数点后只能保留一位/)
})

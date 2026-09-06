import assert from 'node:assert/strict'
import test from 'node:test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const unit = require('../utils/selfPurchaseUnit.js')

test('客户按颗下单时采购仍按商品斤规格录入', () => {
  const item = {
    nxDgGoodsStandardname: '斤',
    nxDgCartonUnit: '箱',
    nxDpgStandard: '颗',
    orders: [{ nxDoStandard: '颗', nxDoQuantity: '3' }]
  }

  const resolved = unit.resolvePurchaseUnit(item)
  assert.equal(resolved.purchaseUom, '斤')
  assert.equal(resolved.isCartonMode, false)
  assert.equal(unit.initialPurchaseQuantity(item.orders[0], resolved), '')
})

test('全部订单按商品大包装下单时使用大包装采购单位', () => {
  const item = {
    nxDgGoodsStandardname: '瓶',
    nxDgCartonUnit: '箱',
    nxDpgStandard: '箱',
    orders: [{ nxDoStandard: '箱', nxDoQuantity: '2' }]
  }

  const resolved = unit.resolvePurchaseUnit(item)
  assert.equal(resolved.purchaseUom, '箱')
  assert.equal(resolved.isCartonMode, true)
  assert.equal(unit.initialPurchaseQuantity(item.orders[0], resolved), '2')
})

test('大包装模式不会把基础重量误当成箱数', () => {
  const item = {
    nxDgGoodsStandardname: '瓶',
    nxDgCartonUnit: '箱',
    orders: [{ nxDoStandard: '箱', nxDoQuantity: '2', nxDoWeight: '24' }]
  }

  const resolved = unit.resolvePurchaseUnit(item)
  assert.equal(unit.initialPurchaseQuantity(item.orders[0], resolved), '2')
})

test('采购基础规格绝不从采购行或客户订单单位回退', () => {
  const item = {
    nxDpgStandard: '颗',
    orders: [{ nxDoStandard: '颗', nxDoQuantity: '3' }]
  }

  const resolved = unit.resolvePurchaseUnit(item)
  assert.equal(resolved.purchaseUom, '')
  assert.equal(resolved.invalidUnit, true)
})

test('旧接口嵌套商品结构仍读取商品规格而不是订单规格', () => {
  const item = {
    nxDpgStandard: '颗',
    nxDistributerGoodsEntity: {
      nxDgGoodsStandardname: '斤',
      nxDgCartonUnit: '箱'
    },
    nxDepartmentOrdersEntities: [{ nxDoStandard: '颗', nxDoQuantity: '3' }]
  }

  const resolved = unit.resolvePurchaseUnit(item)
  assert.equal(resolved.purchaseUom, '斤')
  assert.equal(resolved.invalidUnit, false)
})

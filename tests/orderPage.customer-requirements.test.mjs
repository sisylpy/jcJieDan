import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const js = fs.readFileSync('subPackage-order/pages/order/orderPage/orderPage.js', 'utf8')
const wxml = fs.readFileSync('subPackage-order/pages/order/orderPage/orderPage.wxml', 'utf8')

test('商品详情不作为客户部门要求展示', () => {
  assert.doesNotMatch(js, /label:\s*'商品',\s*text:\s*relation\.nxDdgDepGoodsDetail/)
  assert.equal(
    (wxml.match(/\{\{order\.nxDistributerGoodsEntity\.nxDgGoodsDetail\}\}/g) || []).length,
    2
  )
})

test('普通客户订单仍只在有要求数据时显示要求卡片', () => {
  assert.match(js, /relation\.nxDepartmentDisGoodsStandardItems\s*\|\|\s*\[\]/)
  assert.match(js, /order\._hasCustomerStandards = displayItems\.length > 0/)
  assert.equal((wxml.match(/wx:if="\{\{order\._hasCustomerStandards\}\}"/g) || []).length, 2)
})

test('商品别名和打印单位为空时不显示空括号', () => {
  assert.equal(
    (wxml.match(/nxDepartmentDisGoodsEntity && order\.nxDepartmentDisGoodsEntity\.nxDdgOrderGoodsName && order\.nxDepartmentDisGoodsEntity\.nxDdgOrderGoodsName !== 'null'/g) || []).length,
    2
  )
  assert.equal(
    (wxml.match(/order\.nxDoGoodsName && order\.nxDoGoodsName !== 'null'/g) || []).length,
    2
  )
  assert.equal(
    (wxml.match(/order\.nxDoPrintStandard && order\.nxDoPrintStandard !== 'null'/g) || []).length,
    2
  )
})

test('包装单位重量为空时不显示空乘数', () => {
  assert.equal(
    (wxml.match(/nxDgGoodsStandardWeight && order\.nxDistributerGoodsEntity\.nxDgGoodsStandardWeight !== 'null'/g) || []).length,
    2
  )
  assert.equal(
    (wxml.match(/nxDgItemsPerCarton\}\}\{\{order\.nxDistributerGoodsEntity\.nxDgGoodsStandardname\}\}\/\{\{order\.nxDistributerGoodsEntity\.nxDgCartonUnit\}\}/g) || []).length,
    2
  )
})

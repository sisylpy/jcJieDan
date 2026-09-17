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

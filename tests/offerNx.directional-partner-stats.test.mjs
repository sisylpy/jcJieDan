import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const listBase = 'subPackage/pages/offerNx/offerNxDistributerList/offerNxDistributerList'
const detailBase = 'subPackage/pages/offerNx/nxDisBills/nxDisBills'
const listScript = readFileSync(`${listBase}.js`, 'utf8')
const listView = readFileSync(`${listBase}.wxml`, 'utf8')
const detailScript = readFileSync(`${detailBase}.js`, 'utf8')
const detailView = readFileSync(`${detailBase}.wxml`, 'utf8')
const billDetailScript = readFileSync(
  'subPackage/pages/offerNx/nxDisBillDetail/nxDisBillDetail.js',
  'utf8'
)
const billDetailView = readFileSync(
  'subPackage/pages/offerNx/nxDisBillDetail/nxDisBillDetail.wxml',
  'utf8'
)

test('协作伙伴卡片按订货和销售两个方向分别展示余额', () => {
  assert.match(listView, /supplier\.itemData\.purchase\.billTotal/)
  assert.match(listView, /supplier\.itemData\.sales\.billTotal/)
  assert.match(listView, /data-direction="purchase"/)
  assert.match(listView, /data-direction="sales"/)
  assert.match(listView, /我欠他/)
  assert.match(listView, /他欠我/)
  assert.doesNotMatch(listView, /supplier\.itemData\.billTotal/)
})

test('点击统计卡片把交易方向传给账单页', () => {
  assert.match(listScript, /dataset\.direction \|\| 'sales'/)
  assert.match(listScript, /'&direction=' \+ direction/)
  assert.match(detailScript, /initialDirection:\s*options\.direction \|\| 'sales'/)
  assert.match(detailScript, /initialDirection === 'purchase'/)
  assert.match(detailScript, /swiperCurrent:\s*1,\s*searchType:\s*'buy'/)
})

test('账单详情统一使用订货单和销售单名称', () => {
  assert.match(detailView, />订货单</)
  assert.match(detailView, />销售单</)
  assert.doesNotMatch(detailView, /进货单/)
  assert.match(billDetailScript, /\? '订货单' : '销售单'/)
  assert.match(billDetailView, />订货单</)
})

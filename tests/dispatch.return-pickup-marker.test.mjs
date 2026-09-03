import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const cardBase = path.join(root,
  'subPackage-routeDispatch/components/store-stop-card/store-stop-card')
const editSource = fs.readFileSync(path.join(root,
  'subPackage-routeDispatch/pages/routeDispatch/driverRouteEdit/driverRouteEdit.js'), 'utf8')
const pageViewSource = fs.readFileSync(path.join(root,
  'subPackage-routeDispatch/pages/routeDispatch/_pageView.js'), 'utf8')
const wxml = fs.readFileSync(cardBase + '.wxml', 'utf8')
const wxss = fs.readFileSync(cardBase + '.wxss', 'utf8')
const loadingWxml = fs.readFileSync(path.join(root,
  'subPackage-routeDispatch/pages/bossTab/myLoading/myLoading.wxml'), 'utf8')
const deliveryWxml = fs.readFileSync(path.join(root,
  'subPackage-routeDispatch/pages/bossTab/myDelivery/myDelivery.wxml'), 'utf8')

test('退货取货任务在分派、路线和司机执行卡片使用醒目标识', () => {
  assert.match(wxml, /stop\.isReturnPickup \|\| stop\.taskType === 'RETURN_PICKUP'/)
  assert.match(wxml, /（退货）/)
  assert.match(wxml, /退货取货/)
  assert.match(wxml, /到店拿回商品，无需装货/)
  assert.match(wxml, /'取货时长' : '卸货时长'/)
  assert.match(wxss, /\.boss-stop-return-name-tag/)
  assert.match(wxss, /\.boss-stop-return-reminder/)
})

test('路线编辑合并Server站点时不丢失退货业务类型', () => {
  assert.match(editSource, /function isReturnPickupStop/)
  assert.match(editSource, /taskType:\s*stop\.taskType \|\| node\.taskType/)
  assert.match(editSource, /isReturnPickup:\s*isReturnPickupStop\(stop, node\)/)
})

test('页面按退货独立站点编号兜底恢复退货标识', () => {
  assert.match(pageViewSource, /function hasReturnPickupKey/)
  assert.match(pageViewSource, /indexOf\('return-pickup:'\) === 0/)
  assert.match(pageViewSource, /isReturnPickup:\s*true/)
  assert.match(pageViewSource, /taskType:\s*'RETURN_PICKUP'/)
  assert.match(pageViewSource, /timeline:\s*card\.timeline\.map\(decorateReturnPickupStop\)/)
})

test('老板端装车中和配送中复用带退货标识的路线客户卡', () => {
  assert.match(loadingWxml, /<driver-route-card/)
  assert.match(loadingWxml, /variant="dispatch"/)
  assert.match(deliveryWxml, /<driver-route-card/)
  assert.match(deliveryWxml, /variant="delivery"/)
})

import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const js = fs.readFileSync('subPackage-order/pages/order/orderPage/orderPage.js', 'utf8')
const wxml = fs.readFileSync('subPackage-order/pages/order/orderPage/orderPage.wxml', 'utf8')
const wxss = fs.readFileSync('subPackage-order/pages/order/orderPage/orderPage.wxss', 'utf8')

test('协作订单按商品归属识别，供货方出库回写后锁定需求', () => {
  assert.match(js, /_isCollaborationOrder\(order\)/)
  assert.match(js, /String\(ownerId\)\s*!==\s*String\(this\.data\.nxDisId\)/)
  assert.match(js, /purchaseStatus\s*>=\s*1/)
  assert.equal((js.match(/_decorateCollaborationState\(/g) || []).length >= 3, true)
})

test('修改、换商品和两个删除入口共用同一锁定判定', () => {
  for (const method of ['delApply', 'delApplyPaste', 'editDepApplyGoods', 'toEditApply', '_updateDisOrder']) {
    const start = js.indexOf(`${method}(`)
    assert.notEqual(start, -1, `missing ${method}`)
    const body = js.slice(start, start + 1200)
    assert.match(body, /_isCollaborationDemandLocked/)
  }
  assert.match(js, /协作供货方已出库，不能修改或删除订单/)
})

test('页面显示锁定状态并隐藏会改变需求的操作', () => {
  assert.equal((wxml.match(/class="collaboration-lock-tag"/g) || []).length, 4)
  assert.equal((wxml.match(/class="collaboration-lock-tip"/g) || []).length, 2)
  assert.match(wxml, /!applyItem\._collaborationDemandLocked/)
  assert.match(wxss, /\.collaboration-lock-tag/)
  assert.match(wxss, /\.collaboration-lock-tip/)
})

test('协作方出库后仍保留采购方自己的完成出库动作', () => {
  assert.match(wxml, /catchtap="showIsOut"/)
  assert.doesNotMatch(wxml, /catchtap="showIsOut"[^>]*_collaborationDemandLocked/)
})

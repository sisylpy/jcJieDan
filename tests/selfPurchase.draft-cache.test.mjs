import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const draft = require('../utils/selfPurchaseDraft.js')
const componentSource = fs.readFileSync('pages/purchase/index/purchaseComponent.js', 'utf8')
const pageSource = fs.readFileSync('subPackage/pages/prepare/selfPurchase/selfPurchase.js', 'utf8')

const pork = { nxDistributerPurchaseGoodsId: 101, nxDgGoodsName: '猪肉后臀尖' }
const fish = { nxDistributerPurchaseGoodsId: 102, nxDgGoodsName: '鲜草鱼' }

test('进入自采时只保留服务端当前列表仍存在的商品', () => {
  assert.deepEqual(draft.intersectCurrent([pork, fish], [fish]), [fish])
})

test('旧数组缓存、跨组织缓存和过期缓存不能再次显示', () => {
  const now = 1000000
  assert.deepEqual(draft.consume([pork, fish], 160, now), [])
  assert.deepEqual(draft.consume(draft.create([fish], 166, now), 160, now), [])
  assert.deepEqual(
    draft.consume(draft.create([fish], 160, now - draft.MAX_AGE_MS - 1), 160, now),
    []
  )
})

test('新草稿在同一组织内只能作为短时页面交接', () => {
  const now = 1000000
  const value = draft.create([fish, fish], 160, now)
  assert.deepEqual(draft.consume(value, 160, now), [fish])
})

test('采购页刷新选择状态且自采页立即消费本地草稿', () => {
  assert.match(componentSource, /selectedArr:\s*\[\],\s*\n\s*selectedPrintArr:\s*\[\]/)
  assert.match(componentSource, /selfPurchaseDraft\.intersectCurrent\(/)
  assert.match(componentSource, /selfPurchaseDraft\.create\(selected, this\.data\.disId\)/)
  assert.match(pageSource, /wx\.removeStorageSync\(selfPurchaseDraft\.STORAGE_KEY\)/)
  assert.match(pageSource, /selfPurchaseDraft\.consume\(storedDraft, distributerId\)/)
})

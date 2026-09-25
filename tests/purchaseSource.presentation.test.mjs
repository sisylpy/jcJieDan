import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const shelfPage = readFileSync('subPackage/pages/shelf/index/index.js', 'utf8')
const purchasePage = readFileSync('pages/purchaseList/index/index.js', 'utf8')
const purchaseTemplate = readFileSync('pages/purchaseList/index/index.wxml', 'utf8')

test('无货架入口保留无货架采购来源', () => {
  assert.match(shelfPage,
    /isUnshelf \? 'UNSHELVED_REPLENISHMENT' : 'SHELF_REPLENISHMENT'/)
})

test('备货列表准确展示四类库存采购来源', () => {
  assert.match(purchasePage, /SHELF_REPLENISHMENT:\s*\{ text: '货架采购'/)
  assert.match(purchasePage, /UNSHELVED_REPLENISHMENT:\s*\{ text: '无货架'/)
  assert.match(purchasePage, /VOICE_PURCHASE:\s*\{ text: '语音采购'/)
  assert.match(purchasePage, /SMART_REPLENISHMENT:\s*\{ text: '智能备货'/)
  assert.match(purchaseTemplate, /货架、无货架、语音采购和智能备货任务/)
})

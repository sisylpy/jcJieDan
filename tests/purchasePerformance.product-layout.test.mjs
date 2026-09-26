import assert from 'node:assert/strict'
import fs from 'node:fs'

const read = path => fs.readFileSync(path, 'utf8')
const js = read('subPackage-purchase-management/pages/purchasePerformance/purchasePerformance.js')
const wxml = read('subPackage-purchase-management/pages/purchasePerformance/purchasePerformance.wxml')
const wxss = read('subPackage-purchase-management/pages/purchasePerformance/purchasePerformance.wxss')

assert.match(js, /data\.products/)
assert.match(js, /categoryOptions/)
assert.match(js, /selectCategory/)
assert.match(js, /applyProductView/)
assert.doesNotMatch(js, /orderMargin\s*=|operatingResult\s*=|lossCost\s*=/)

for (const marker of [
  '商品经营明细', '本期采购、订单及期间库存损耗涉及的全部商品',
  'category-rail', 'product-card', '已识别采购额', '订单毛利', '经营结果',
  '未按 0 计入'
]) assert.ok(wxml.includes(marker), `采购经营商品明细缺失: ${marker}`)

for (const selector of ['.inventory-layout', '.category-rail', '.category-item.active', '.product-column', '.product-card'])
  assert.ok(wxss.includes(selector), `采购经营商品布局样式缺失: ${selector}`)

console.log('purchase performance product layout: PASS')

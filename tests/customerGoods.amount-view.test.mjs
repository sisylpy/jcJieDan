import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = fs.readFileSync(path.join(root, 'utils/customerGoodsAmount.js'), 'utf8')
const presentation = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)

const goods = [
  { goodsName: '甲', lastOrderDays: 2, orderAmount90Days: 80, averageOrderQuantity90Days: 12.5, averageOrderQuantityUnit: '斤' },
  { goodsName: '乙', lastOrderDays: 1, orderAmount90Days: 15, averageOrderQuantity90Days: 3, averageOrderQuantityUnit: '斤' },
  { goodsName: '丙', lastOrderDays: 3, orderAmount90Days: 5 },
  { goodsName: '丁', lastOrderDays: null, orderAmount90Days: 0 }
]
const rows = presentation.buildCustomerGoodsAmountRows(goods, 'orderAmount90Days')

assert.deepEqual(rows.map(item => item.goodsName), ['甲', '乙', '丙', '丁'])
assert.deepEqual(rows.map(item => item.amountKey), ['core', 'important', 'general', 'noAmount'])
assert.equal(rows[0].amountShare, 80)
assert.deepEqual(presentation.summarizeCustomerGoodsAmountRows(rows), {
  totalAmount: 100,
  core: 1,
  withAmount: 3
})
assert.deepEqual(
  presentation.resolveCustomerGoodsAverageQuantity(goods[0], 'frequency', null),
  { value: 12.5, unit: '斤' }
)

const singleLarge = presentation.buildCustomerGoodsAmountRows([
  { goodsName: '大额商品', orderAmount30Days: 900 },
  { goodsName: '小额商品', orderAmount30Days: 100 }
], 'orderAmount30Days')
assert.equal(singleLarge[0].amountKey, 'core', '单个商品超过 70% 时核心档仍不能为空')

console.log('customer goods amount view tests passed')

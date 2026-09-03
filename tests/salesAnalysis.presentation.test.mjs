import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = fs.readFileSync(path.join(root, 'utils/salesAnalysisView.js'), 'utf8')
const view = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)

assert.equal(view.formatMoney('1234.50'), '¥1,234.5')
assert.equal(view.formatQuantities([
  { quantity: 12.5, unit: '斤' },
  { quantity: 2, unit: '箱' }
]), '12.5斤 · 2箱')
assert.equal(view.formatAveragePrices([{ price: 5.25, unit: '斤' }]), '¥5.25/斤')
assert.deepEqual(view.decorateRelativeBars([
  { salesAmount: 100 },
  { salesAmount: 25 },
  { salesAmount: 1 }
]).map(item => item.barWidth), [100, 25, 4])
assert.deepEqual(view.rangeForDays(7, new Date(2026, 8, 2)), {
  startDate: '2026-08-27',
  endDate: '2026-09-02'
})
assert.equal(view.validateSalesRange({ startDate: '2026-08-01', endDate: '2026-09-02' }), '')
assert.equal(
  view.validateSalesRange({ startDate: '2026-05-01', endDate: '2026-09-02' }),
  '单次统计范围不能超过90天'
)

console.log('sales analysis presentation tests passed')

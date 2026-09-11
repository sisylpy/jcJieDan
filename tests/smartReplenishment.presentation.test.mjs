import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = fs.readFileSync(path.join(root, 'utils/smartReplenishmentView.js'), 'utf8')
const view = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)

assert.deepEqual(view.forecastRangeForMode('TODAY', '2026-09-02'), {
  startDate: '2026-09-02', endDate: '2026-09-02'
})
assert.deepEqual(view.forecastRangeForMode('TOMORROW', '2026-09-02'), {
  startDate: '2026-09-03', endDate: '2026-09-03'
})
assert.deepEqual(view.forecastRangeForMode('NEXT_7', '2026-09-02'), {
  startDate: '2026-09-02', endDate: '2026-09-08'
})
assert.equal(view.validateForecastRange(
  { startDate: '2026-09-02', endDate: '2026-10-02' },
  '2026-09-02',
  '2026-10-03'
), '')
assert.equal(view.validateForecastRange(
  { startDate: '2026-09-02', endDate: '2026-10-03' },
  '2026-09-02',
  '2026-10-03'
), '单次最多查看31天，请缩短日期范围')

const run = {
  departmentName: '餐厅',
  items: [
    {
      goodsId: 1,
      goodsName: '圆白菜',
      goodsCategoryId: 10,
      goodsCategoryName: '新鲜蔬菜',
      predictedQuantity: 60,
      predictedUnit: '斤',
      policy: { level: 'LEVEL_A', trustScorePercent: 93.66, supportingReasons: ['订货节奏稳定'] },
      departmentForecasts: [{
        departmentId: 20,
        departmentName: '餐厅',
        predictedQuantity: 60,
        unit: '斤',
        dateForecasts: [{ date: '2026-09-02', quantity: 60, unit: '斤' }]
      }]
    },
    {
      goodsId: 2,
      goodsName: '花椒',
      goodsCategoryId: 11,
      goodsCategoryName: '调料干货',
      predictedQuantity: 2,
      predictedUnit: '斤',
      policy: { level: 'LEVEL_B', trustScorePercent: 61.33, riskReasons: ['样本较少'] }
    },
    {
      goodsId: 3,
      goodsName: '不展示商品',
      policy: { level: 'LEVEL_C', trustScorePercent: 30 }
    }
  ]
}

const products = view.decorateSmartProducts(
  run,
  { 1: {
    nxDgNxFatherImg: 'upload/vegetable-father.jpg',
    nxDgGoodsDetail: '净菜', nxDgGoodsStandardWeight: '10', nxDgGoodsStandardname: '斤',
    goodsType: -1
  }, 2: { nxGoodsFileBig: 'upload/pepper-big.jpg', goodsType: 1 } },
  {
    1: {
      goodsId: 1, stockQuantity: 8, stockUnit: '斤', activePurchaseCount: 1,
      activePurchaseGoodsId: 701, activePurchaseQuantity: 40, activePurchaseUnit: '斤',
      activePurchaseStatus: 0, activePurchaseEditable: true
    },
    2: { goodsId: 2, stockQuantity: 0, stockUnit: '斤', activePurchaseCount: 0 }
  },
  'https://grainservice.club:8443/nongxinle/'
)

assert.equal(products.length, 2, '只允许展示服务端 A/B 级')
assert.deepEqual(products.map(item => item.level), ['LEVEL_A', 'LEVEL_B'])
assert.equal(products[0].context.state, 'active')
assert.equal(products[0].context.canCreate, false)
assert.equal(products[0].context.purchaseText, '40斤')
assert.equal(products[0].context.canEdit, true)
assert.equal(products[1].context.state, 'idle')
assert.equal(products[1].context.canCreate, true)
assert.match(products[0].detailText, /净菜/)
assert.equal(products[0].imageUrl, 'https://grainservice.club:8443/nongxinle/upload/vegetable-father.jpg')
assert.equal(products[1].imageUrl, 'https://grainservice.club:8443/nongxinle/upload/pepper-big.jpg')
assert.equal(products[0].goodsTypeText, '自采商品')
assert.equal(products[1].goodsTypeText, '出库商品')
assert.equal(products[0].departmentLines[0].forecastText, '9月2日 60斤')
assert.deepEqual(products[0].departmentLines[0].forecastItems, [{
  key: '2026-09-02-0', dateText: '9/2', quantityText: '60', unit: '斤'
}])
assert.deepEqual(view.smartSummary(products), { total: 2, levelA: 1, levelB: 1 })
assert.deepEqual(
  view.buildSmartCategories(products).map(item => item.name).sort(),
  ['新鲜蔬菜', '调料干货'].sort()
)
assert.equal(view.applySmartProductFilters(products, { level: 'LEVEL_B' })[0].goodsName, '花椒')
assert.equal(view.applySmartProductFilters(products, { goodsType: -1 })[0].goodsName, '圆白菜')
assert.equal(view.applySmartProductFilters(products, { keyword: '净菜' })[0].goodsName, '圆白菜')
assert.deepEqual(view.smartGoodsTypeSummary(products), { total: 2, self: 1, stock: 1 })

const unknown = view.decorateProcurementContext({ error: true }, '斤')
assert.equal(unknown.stockText, '未知')
assert.equal(unknown.canCreate, false, '状态读取失败时不得误开放添加采购')

const missingQuantity = view.decorateSmartProducts({
  items: [{ goodsId: 9, goodsName: '缺数量', predictedUnit: '斤', policy: { level: 'LEVEL_A' } }]
}, {}, { 9: { goodsId: 9, stockQuantity: 0, stockUnit: '斤', activePurchaseCount: 0 } })[0]
assert.equal(missingQuantity.context.canCreate, false, '数量不完整时不得开放添加采购')
assert.equal(missingQuantity.imageUrl, '/images/photozhaoxiang.png', '所有图片来源为空才允许使用占位图')
assert.equal(missingQuantity.goodsTypeText, '未设置', '未知采购类型不得默认成自采或出库')

console.log('smart replenishment presentation tests passed')

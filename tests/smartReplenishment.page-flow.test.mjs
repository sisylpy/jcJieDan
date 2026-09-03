import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = fs.readFileSync(
  path.join(root, 'subPackage-charts/pages/smartReplenishment/index/index.js'),
  'utf8'
).replace(/import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]+['"]\s*/g, '')
  .replace(/import\s+\w+\s+from\s*['"][^'"]+['"]\s*/g, '')

let pageConfig
let forecastPayload
let createPayload
const storage = {}
const toasts = []
const forecastRun = {
  departmentName: '餐厅',
  items: [
    {
      goodsId: 1, goodsName: '圆白菜', goodsCategoryId: 10, goodsCategoryName: '新鲜蔬菜',
      predictedQuantity: 60, predictedUnit: '斤',
      policy: { level: 'LEVEL_A', trustScorePercent: 93.66 }
    },
    {
      goodsId: 2, goodsName: '花椒', goodsCategoryId: 11, goodsCategoryName: '调料干货',
      predictedQuantity: 2, predictedUnit: '斤',
      policy: { level: 'LEVEL_B', trustScorePercent: 61.33 }
    }
  ]
}

function productRows(run, details, contexts) {
  return (run.items || []).map(item => {
    const context = contexts[item.goodsId]
    const active = context && Number(context.activePurchaseCount || 0) > 0
    return {
      key: item.goodsId + '::' + item.predictedUnit,
      goodsId: item.goodsId,
      goodsName: item.goodsName,
      imageUrl: details[item.goodsId] && (details[item.goodsId].nxDgGoodsFileLarge ||
        details[item.goodsId].nxDgGoodsFile || details[item.goodsId].nxDgNxFatherImg ||
        details[item.goodsId].nxGoodsFileBig || details[item.goodsId].nxGoodsFile)
        ? 'https://example.test/' + (details[item.goodsId].nxDgGoodsFileLarge ||
          details[item.goodsId].nxDgGoodsFile || details[item.goodsId].nxDgNxFatherImg ||
          details[item.goodsId].nxGoodsFileBig || details[item.goodsId].nxGoodsFile)
        : '/images/photozhaoxiang.png',
      detailText: details[item.goodsId] ? '规格' : '',
      categoryKey: 'CAT_' + item.goodsCategoryId,
      categoryName: item.goodsCategoryName,
      level: item.policy.level,
      levelLetter: item.policy.level === 'LEVEL_A' ? 'A' : 'B',
      levelLabel: item.policy.level === 'LEVEL_A' ? '直接备货' : '联系确认',
      levelClass: item.policy.level === 'LEVEL_A' ? 'level-a' : 'level-b',
      trustText: item.policy.trustScorePercent + '%',
      predictedQuantity: item.predictedQuantity,
      predictedQuantityText: String(item.predictedQuantity),
      predictedUnit: item.predictedUnit,
      departmentLines: [], reasons: [], riskReasons: [], quantityMethod: '',
      context: context ? {
        state: active ? 'active' : 'idle',
        stockText: String(context.stockQuantity || 0), stockUnit: context.stockUnit || '斤',
        purchaseText: active ? '采购中' : '暂无采购', canCreate: !active
      } : { state: 'loading', stockText: '查询中', stockUnit: '斤', purchaseText: '查询中', canCreate: false }
    }
  })
}

const context = vm.createContext({
  console,
  Promise,
  Date,
  Math,
  Number,
  String,
  Object,
  Array,
  Set,
  Error,
  apiUrl: { server: 'https://example.test/' },
  setTimeout: callback => callback(),
  Page: config => { pageConfig = config },
  getApp: () => ({ globalData: {} }),
  wx: {
    getStorageSync(key) { return storage[key] || null },
    setStorageSync(key, value) { storage[key] = value },
    showToast(options) { toasts.push(options.title) },
    showModal(options) { options.success({ confirm: true }) },
    navigateBack() {},
    navigateTo() {},
    stopPullDownRefresh() {}
  },
  getSmartReplenishmentCatalog: async () => ({ result: { code: 0, data: {
    forecastDate: '2026-09-02', maxForecastDate: '2026-10-03',
    departments: [{ departmentId: 20, departmentName: '餐厅', historicalLineCount: 100 }]
  } } }),
  forecastSmartReplenishment: async payload => {
    forecastPayload = payload
    return { result: { code: 0, data: forecastRun } }
  },
  getSmartReplenishmentContexts: async () => ({ result: { code: 0, data: [
    { goodsId: 1, stockQuantity: 8, stockUnit: '斤', activePurchaseCount: 1 },
    { goodsId: 2, stockQuantity: 0, stockUnit: '斤', activePurchaseCount: 0 }
  ] } }),
  getSmartReplenishmentGoodsDetail: async (disId, goodsId) => ({ result: { code: 0, data: {
    goodsId, disId, nxDgNxFatherImg: goodsId === 1 ? 'upload/vegetable-father.jpg' : ''
  } } }),
  createSmartReplenishmentProcurement: async payload => {
    createPayload = payload
    return { result: { code: 0, data: {
      created: true,
      context: { goodsId: 2, stockQuantity: 0, stockUnit: '斤', activePurchaseCount: 1 }
    } } }
  },
  forecastRangeForMode: (mode, base) => ({ startDate: base, endDate: base }),
  validateForecastRange: () => '',
  decorateSmartProducts: productRows,
  smartSummary: products => ({
    total: products.length,
    levelA: products.filter(item => item.level === 'LEVEL_A').length,
    levelB: products.filter(item => item.level === 'LEVEL_B').length
  }),
  buildSmartCategories: products => Array.from(new Set(products.map(item => item.categoryKey)))
    .map(key => ({ key, name: products.find(item => item.categoryKey === key).categoryName, count: 1 })),
  applySmartProductFilters: products => products
})

new vm.Script(source, { filename: 'smartReplenishment/index.js' }).runInContext(context)
assert.ok(pageConfig)

const page = {
  ...pageConfig,
  data: JSON.parse(JSON.stringify(pageConfig.data)),
  setData(update) { Object.assign(this.data, update) }
}
page._catalog = null
page._run = null
page._goodsDetails = {}
page._contexts = {}
page._expandedGoods = {}
page._creatingGoods = {}
page._forecastRequestId = 0
page._customerSelectionChanged = false
page.setData({ disId: 13 })

await page.loadCatalog()
assert.equal(page.data.selectedDepartmentId, 20, '首次进入默认选择有历史记录的客户')
assert.equal(page.data.summary.total, 2)
assert.equal(page.data.products[0].context.state, 'active')
assert.equal(page.data.products[1].context.state, 'idle')
assert.equal(page.data.products[0].imageUrl, 'https://example.test/upload/vegetable-father.jpg')
assert.deepEqual(JSON.parse(JSON.stringify(forecastPayload)), {
  distributerId: 13,
  departmentId: 20,
  predictionDate: '2026-09-02',
  predictionEndDate: '2026-09-02',
  historyWindowDays: 30,
  algorithmVersion: 'V8_REPLENISHMENT_STATE'
})

page.applyCustomerSelection({ departmentId: null, departmentName: '全部客户', historyLabel: '汇总所有有效客户' })
assert.equal(page.data.selectedDepartmentId, null)
assert.equal(page._customerSelectionChanged, true)

const purchasable = page.data.products.find(item => item.goodsId === 2)
await page._createProcurement(purchasable)
assert.deepEqual(Object.keys(createPayload).sort(), ['distributerId', 'goodsId', 'quantity', 'unit'])
assert.deepEqual(JSON.parse(JSON.stringify(createPayload)), {
  distributerId: 13, goodsId: 2, quantity: 2, unit: '斤'
})
assert.equal(page.data.products.find(item => item.goodsId === 2).context.state, 'active')
assert.equal(toasts.at(-1), '已加入采购')

page.setData({
  dateMode: 'CUSTOM',
  dateModeLabel: '自定义',
  startDate: '2026-09-05',
  endDate: '2026-09-10'
})
await page.loadCatalog()
assert.equal(page.data.startDate, '2026-09-05', '刷新目录时应保留仍然有效的自定义范围')
assert.equal(page.data.endDate, '2026-09-10')

console.log('smart replenishment page flow tests passed')

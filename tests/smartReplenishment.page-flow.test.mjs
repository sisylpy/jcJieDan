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
let updatePayload
let deletePayload
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
      goodsType: details[item.goodsId] && details[item.goodsId].goodsType,
      departmentLines: [], reasons: [], riskReasons: [], quantityMethod: '',
      context: context ? {
        state: active ? 'active' : 'idle',
        stockText: String(context.stockQuantity || 0), stockUnit: context.stockUnit || '斤',
        purchaseText: active ? String(context.activePurchaseQuantity || '') +
          (context.activePurchaseUnit || '斤') : '暂无采购',
        canCreate: !active,
        canEdit: active && Boolean(context.activePurchaseEditable),
        activePurchaseCount: Number(context.activePurchaseCount || 0),
        activePurchaseGoodsId: context.activePurchaseGoodsId || null,
        activePurchaseQuantity: context.activePurchaseQuantity || null,
        activePurchaseUnit: context.activePurchaseUnit || item.predictedUnit
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
    departments: [
      { departmentId: 20, departmentName: '餐厅', historicalLineCount: 100 },
      { departmentId: 21, departmentName: '酒店', historicalLineCount: 80 }
    ]
  } } }),
  forecastSmartReplenishment: async payload => {
    forecastPayload = payload
    return { result: { code: 0, data: forecastRun } }
  },
  getSmartReplenishmentContexts: async () => ({ result: { code: 0, data: [
    {
      goodsId: 1, stockQuantity: 8, stockUnit: '斤', activePurchaseCount: 1,
      activePurchaseGoodsId: 701, activePurchaseQuantity: 40,
      activePurchaseUnit: '斤', activePurchaseEditable: true
    },
    { goodsId: 2, stockQuantity: 0, stockUnit: '斤', activePurchaseCount: 0 }
  ] } }),
  getSmartReplenishmentGoodsDetail: async (disId, goodsId) => ({ result: { code: 0, data: {
    goodsId, disId, goodsType: goodsId === 1 ? -1 : 1,
    nxDgNxFatherImg: goodsId === 1 ? 'upload/vegetable-father.jpg' : ''
  } } }),
  createSmartReplenishmentProcurement: async payload => {
    createPayload = payload
    return { result: { code: 0, data: {
      created: true,
      context: {
        goodsId: 2, stockQuantity: 0, stockUnit: '斤', activePurchaseCount: 1,
        activePurchaseGoodsId: 702, activePurchaseQuantity: payload.quantity,
        activePurchaseUnit: payload.unit, activePurchaseEditable: true
      }
    } } }
  },
  updateSmartReplenishmentProcurement: async (purchaseGoodsId, payload) => {
    updatePayload = { purchaseGoodsId, ...payload }
    return { result: { code: 0, data: {
      goodsId: 2, activePurchaseCount: 1, activePurchaseGoodsId: purchaseGoodsId,
      activePurchaseQuantity: payload.quantity, activePurchaseUnit: payload.unit,
      activePurchaseEditable: true
    } } }
  },
  deleteSmartReplenishmentProcurement: async (purchaseGoodsId, payload) => {
    deletePayload = { purchaseGoodsId, ...payload }
    return { result: { code: 0, data: { goodsId: 2, activePurchaseCount: 0 } } }
  },
  forecastRangeForMode: (mode, base) => ({
    startDate: mode === 'TOMORROW' ? '2026-09-03' : base,
    endDate: mode === 'NEXT_7' ? '2026-09-08' : (mode === 'TOMORROW' ? '2026-09-03' : base)
  }),
  validateForecastRange: () => '',
  decorateSmartProducts: productRows,
  smartGoodsTypeSummary: products => ({
    total: products.length,
    self: products.filter(item => item.goodsType === -1).length,
    stock: products.filter(item => item.goodsType === 1).length
  }),
  smartSummary: products => ({
    total: products.length,
    levelA: products.filter(item => item.level === 'LEVEL_A').length,
    levelB: products.filter(item => item.level === 'LEVEL_B').length
  }),
  buildSmartCategories: products => Array.from(new Set(products.map(item => item.categoryKey)))
    .map(key => ({ key, name: products.find(item => item.categoryKey === key).categoryName, count: 1 })),
  applySmartProductFilters: (products, options = {}) => products.filter(item =>
    (!options.category || item.categoryKey === options.category) &&
    (options.goodsType === '' || options.goodsType === undefined || item.goodsType === options.goodsType)
  )
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
assert.equal(page.data.goodsTypeSummary.total, 2)
assert.deepEqual(JSON.parse(JSON.stringify(page.data.predictionSummary)), {
  total: 2, levelA: 1, levelB: 1
})
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

page.applyCustomerSelection({ departmentIds: [20, 21] })
assert.deepEqual(JSON.parse(JSON.stringify(page.data.selectedDepartmentIds)), [20, 21])
assert.equal(page.data.selectedDepartmentName, '餐厅，酒店')
await page.loadForecast()
assert.deepEqual(JSON.parse(JSON.stringify(forecastPayload.departmentIds)), [20, 21])
assert.equal('departmentId' in forecastPayload, false)

await page.selectDateMode({ currentTarget: { dataset: { mode: 'NEXT_7' } } })
assert.equal(page.data.dateModeLabel, '未来7天')
assert.equal(page.data.startDate, '2026-09-02')
assert.equal(page.data.endDate, '2026-09-08')

page.selectDateMode({ currentTarget: { dataset: { mode: 'CUSTOM' } } })
assert.equal(page.data.showCustomDate, true)
assert.equal(page.data.customStartDate, '2026-09-02')
assert.equal(page.data.customEndDate, '2026-09-08')
page.onCustomStartDateChange({ detail: { value: '2026-09-10' } })
page.onCustomEndDateChange({ detail: { value: '2026-09-12' } })
await page.confirmCustomDate()
assert.equal(page.data.dateModeLabel, '自定义')
assert.equal(page.data.showCustomDate, false)
assert.equal(page.data.startDate, '2026-09-10')
assert.equal(page.data.endDate, '2026-09-12')
assert.equal(forecastPayload.predictionDate, '2026-09-10')
assert.equal(forecastPayload.predictionEndDate, '2026-09-12')

const purchasable = page.data.products.find(item => item.goodsId === 2)
page.addProcurement({ currentTarget: { dataset: { id: 2 } } })
assert.equal(page.data.showPurchaseModal, true)
assert.equal(page.data.purchaseQuantity, '2', '智能预测数量应默认带入输入框')
assert.equal(page.data.purchaseUnit, '斤', '智能预测规格应默认带入可编辑输入框')
page.onPurchaseQuantityInput({ detail: { value: '3.5' } })
page.onPurchaseUnitInput({ detail: { value: '件' } })
page._rpxRatio = 2
page.onPurchaseKeyboardHeightChange({ detail: { height: 300 } })
assert.equal(page.data.purchaseKeyboardHeight, 600)
await page.confirmPurchase()
assert.deepEqual(Object.keys(createPayload).sort(), ['distributerId', 'goodsId', 'quantity', 'unit'])
assert.deepEqual(JSON.parse(JSON.stringify(createPayload)), {
  distributerId: 13, goodsId: 2, quantity: '3.5', unit: '件'
})
assert.equal(page.data.products.find(item => item.goodsId === 2).context.state, 'active')
assert.equal(toasts.at(-1), '已加入采购')

page.editProcurement({ currentTarget: { dataset: { id: 2 } } })
assert.equal(page.data.purchaseModalMode, 'edit')
assert.equal(page.data.purchaseQuantity, '3.5')
assert.equal(page.data.purchaseUnit, '件')
page.onPurchaseQuantityInput({ detail: { value: '4' } })
page.onPurchaseUnitInput({ detail: { value: '箱' } })
await page.confirmPurchase()
assert.deepEqual(JSON.parse(JSON.stringify(updatePayload)), {
  purchaseGoodsId: 702, distributerId: 13, quantity: '4', unit: '箱'
})
assert.equal(toasts.at(-1), '采购数量已修改')

const editedProduct = page.data.products.find(item => item.goodsId === 2)
await page._deleteProcurement(editedProduct)
assert.deepEqual(JSON.parse(JSON.stringify(deletePayload)), {
  purchaseGoodsId: 702, distributerId: 13
})
assert.equal(page.data.products.find(item => item.goodsId === 2).context.state, 'idle')
assert.equal(toasts.at(-1), '采购已删除')

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

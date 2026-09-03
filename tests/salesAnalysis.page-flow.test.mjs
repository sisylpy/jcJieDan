import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = fs.readFileSync(
  path.join(root, 'subPackage-charts/pages/salesAnalysis/index/index.js'),
  'utf8'
).replace(/import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]+['"]\s*/g, '')
  .replace(/import\s+\w+\s+from\s*['"][^'"]+['"]\s*/g, '')

let pageConfig
let datePageUrl = ''
let storedMyDate = null
const toastMessages = []
const context = vm.createContext({
  console,
  Promise,
  Date,
  Math,
  Number,
  String,
  Object,
  Array,
  Error,
  Page: config => { pageConfig = config },
  getApp: () => ({ globalData: {} }),
  wx: {
    navigateBack() {},
    navigateTo(options) { datePageUrl = options.url },
    getStorageSync(key) { return key === 'myDate' ? storedMyDate : null },
    showToast(options) { toastMessages.push(options.title) },
    stopPullDownRefresh() {}
  },
  getSalesAnalysisOverview: async () => ({ result: { code: 0, data: {
    summary: {
      salesAmount: 100,
      customerCount: 1,
      goodsCount: 1,
      subcategoryCount: 1,
      primaryQuantity: { quantity: 20, unit: '斤' },
      otherUnitCount: 0
    },
    categories: [{ id: 10, name: '新鲜蔬菜', salesAmount: 100, share: 100, customerCount: 1, goodsCount: 1 }],
    topCustomers: [{ customerId: 20, customerName: '餐厅', salesAmount: 100, share: 100, goodsCount: 1, categoryCount: 1 }],
    quality: {}
  } } }),
  getSalesAnalysisCategory: async () => ({ result: { code: 0, data: {
    category: { id: 10, name: '新鲜蔬菜' },
    subcategories: [{ id: 101, name: '叶菜类', salesAmount: 100, share: 100, customerCount: 1, quantities: [{ quantity: 20, unit: '斤' }] }],
    products: [{ goodsId: 1001, goodsName: '菠菜', goodsStandard: '斤', nxDgNxFatherImg: 'goodsImage/leafy.jpg', subcategoryId: 101, salesAmount: 100, share: 100, customerCount: 1, quantities: [{ quantity: 20, unit: '斤' }], averagePrices: [{ price: 5, unit: '斤' }], topCustomers: [{ customerName: '餐厅' }] }],
    topCustomers: [{ customerId: 20, customerName: '餐厅', salesAmount: 100, share: 100, goodsCount: 1, categoryCount: 1 }]
  } } }),
  getSalesAnalysisProductCustomers: async () => ({ result: { code: 0, data: {
    product: { goodsId: 1001, goodsName: '菠菜', goodsStandard: '斤', nxDgGoodsFileLarge: 'goodsImage/spinach-large.jpg', salesAmount: 100, share: 100, customerCount: 1, quantities: [{ quantity: 20, unit: '斤' }], averagePrices: [{ price: 5, unit: '斤' }] },
    customers: [{ customerId: 20, customerName: '餐厅', salesAmount: 100, share: 100, quantities: [{ quantity: 20, unit: '斤' }], averagePrices: [{ price: 5, unit: '斤' }], orderDays: 3, lastOrderDate: '2026-09-01' }]
  } } }),
  decorateRelativeBars: rows => rows.map(item => ({ ...item, barWidth: 100 })),
  apiUrl: { server: 'https://example.test/root/' },
  resolveGoodsImage: item => 'https://example.test/root/' + (
    item.nxDgGoodsFileLarge || item.nxDgGoodsFile || item.nxDgNxFatherImg || item.nxGoodsFileBig || item.nxGoodsFile
  ),
  formatAveragePrices: values => values && values.length ? '¥5/斤' : '暂无有效均价',
  formatDecimal: value => String(Number(value || 0)),
  formatMoney: value => '¥' + Number(value || 0),
  formatQuantities: values => values && values.length ? values[0].quantity + values[0].unit : '暂无有效数量',
  percentageLabel: value => Number(value || 0) + '%',
  rangeForDays: () => ({ startDate: '2026-08-04', endDate: '2026-09-02' }),
  validateSalesRange: range => {
    const start = new Date(range.startDate + 'T00:00:00')
    const end = new Date(range.endDate + 'T00:00:00')
    const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
    return days > 90 ? '单次统计范围不能超过90天' : ''
  }
})

new vm.Script(source, { filename: 'salesAnalysis/index.js' }).runInContext(context)
assert.ok(pageConfig, '页面必须注册 Page')

const page = {
  ...pageConfig,
  data: JSON.parse(JSON.stringify(pageConfig.data)),
  setData(update) {
    Object.entries(update).forEach(([key, value]) => {
      if (key.includes('.')) {
        const [parent, child] = key.split('.')
        this.data[parent] = { ...this.data[parent], [child]: value }
      } else {
        this.data[key] = value
      }
    })
  }
}
page._overviewRequestId = 0
page._detailRequestId = 0
page._productRequestId = 0

await page.loadReport()
assert.equal(page.data.selectedCategoryId, 10)
assert.equal(page.data.selectedSubcategoryId, 101)
assert.equal(page.data.visibleProducts.length, 1)
assert.equal(page.data.visibleProducts[0].goodsImageUrl, 'https://example.test/root/goodsImage/leafy.jpg')
assert.equal(page.data.drawerOpen, false, '加载大类和小类时不应自动打开商品客户面板')

await page._loadProductCustomers(page.data.visibleProducts[0])
assert.equal(page.data.drawerOpen, true)
assert.equal(page.data.productCustomers.length, 1)
assert.equal(page.data.productCustomers[0].customerName, '餐厅')
assert.equal(page.data.selectedProduct.goodsImageUrl, 'https://example.test/root/goodsImage/spinach-large.jpg')

page.setData({
  range: { startDate: '2026-08-04', endDate: '2026-09-02' },
  startDate: '2026-08-04',
  stopDate: '2026-09-02',
  dateType: 'month',
  dateName: 'lastThirtyDays',
  hanzi: '过去30天'
})
page.toDatePage()
assert.equal(page.data.update, true)
assert.equal(
  datePageUrl,
  '/subPackage-charts/pages/sel/date/date?startDate=2026-08-04&stopDate=2026-09-02&dateType=month&dateName=lastThirtyDays'
)

storedMyDate = { dateType: 'week', name: 'lastSevenDays', hanzi: '过去7天' }
page.setData({
  startDate: '2026-08-27',
  stopDate: '2026-09-02',
  dateType: 'week',
  update: true
})
await page.onShow()
assert.deepEqual(
  JSON.parse(JSON.stringify(page.data.range)),
  { startDate: '2026-08-27', endDate: '2026-09-02' }
)
assert.equal(page.data.hanzi, '过去7天')
assert.equal(page.data.dateName, 'lastSevenDays')
assert.equal(page.data.update, false)

page.toDatePage()
storedMyDate = { dateType: 'customer', name: 'custom', hanzi: '自定义' }
page.setData({
  startDate: '2026-01-01',
  stopDate: '2026-09-02',
  dateType: 'customer',
  update: true
})
page.onShow()
assert.deepEqual(
  JSON.parse(JSON.stringify(page.data.range)),
  { startDate: '2026-08-27', endDate: '2026-09-02' },
  '超过90天时应恢复上一个有效范围'
)
assert.equal(toastMessages.at(-1), '单次统计范围不能超过90天')

console.log('sales analysis page flow tests passed')

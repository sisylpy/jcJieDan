import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const wxml = fs.readFileSync(
  path.join(root, 'subPackage/pages/shelf/index/index.wxml'),
  'utf8'
)
const source = fs.readFileSync(
  path.join(root, 'subPackage/pages/shelf/index/index.js'),
  'utf8'
).replace(/import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]+['"]\s*/g, '')
  .replace(/import\s+\w+\s+from\s*['"][^'"]+['"]\s*/g, '')

const branchStart = wxml.indexOf('<block wx:if="{{isUnshelfSelected}}">')
const branchEnd = wxml.indexOf('<block wx:else="">', branchStart)
assert.ok(branchStart >= 0 && branchEnd > branchStart)
const unshelfMenu = wxml.substring(branchStart, branchEnd)
assert.match(unshelfMenu, /disGoods\.shelfPurGoods == null/)
assert.match(unshelfMenu, /disGoods\.nxDgPurchaseAuto == -1/)
assert.match(unshelfMenu, /catchtap="showInputOrder"/)
assert.match(unshelfMenu, />\s*订货\s*</)
assert.doesNotMatch(unshelfMenu, /采购入库|toOpenInputPurSock|receivePurGoods/)

let pageConfig
let submitted
let directStockCalls = 0
const toasts = []
const load = {
  showLoading() {},
  hideLoading() {}
}
const context = vm.createContext({
  console,
  require: () => load,
  Page: config => { pageConfig = config },
  getApp: () => ({ globalData: {} }),
  wx: {
    showToast(options) { toasts.push(options.title) },
    showModal() {},
    getStorageSync() { return null },
    setStorageSync() {},
    removeStorageSync() {}
  },
  staffApplyPurGoods: async payload => {
    submitted = payload
    return {
      result: {
        code: 0,
        data: {
          ...payload,
          nxDistributerPurchaseGoodsId: 9001,
          nxDpgStatus: 0
        }
      }
    }
  },
  disSavePurGoodsSaveStock: async () => { directStockCalls += 1 },
  saveShelfGoodsStock: async () => { directStockCalls += 1 }
})

new vm.Script(source, { filename: 'shelf/index.js' }).runInContext(context)
assert.ok(pageConfig)

const page = {
  ...pageConfig,
  data: JSON.parse(JSON.stringify(pageConfig.data)),
  setData(update) { Object.assign(this.data, update) }
}
const goods = {
  nxDistributerGoodsId: 501,
  nxDgDfgGoodsFatherId: 502,
  nxDgDfgGoodsGrandId: 503,
  nxDgGoodsName: '无货架测试商品',
  nxDgPurchaseAuto: -1,
  nxDgGoodsStandardname: '袋',
  nxDgCartonUnit: '箱',
  stockList: [{ nxDgssRestWeight: '2.5' }],
  shelfPurGoods: null
}
page.setData({
  disId: 160,
  shelfId: 88,
  shelfGoods: { nxDistributerGoodsShelfGoodsId: 77 },
  restWeight: '99',
  maxRestWeight: 99,
  unShelfGoodsList: [goods],
  showOperation: false
})

page.setData({ disGoods: { ...goods, nxDgPurchaseAuto: 1 } })
page.showInputOrder()
assert.equal(page.data.showPlanPurchase, false)
assert.equal(toasts.at(-1), '该商品不是库房库存商品')

page.showChoiceUn({ currentTarget: { dataset: { goods, index: 0 } } })
assert.equal(page.data.isUnshelfSelected, true)
assert.equal(page.data.shelfGoods, null, '选择非货架商品时必须清掉上一个货架商品')

page.showInputOrder()
assert.equal(page.data.showPlanPurchase, true)
assert.equal(page.data.item, goods)
assert.equal(page.data.applyStandardName, '箱')
assert.equal(page.data.restWeight, '2.5')
assert.equal(page.data.maxRestWeight, 2.5)
assert.equal(page.data.showOperation, false)

page.confirm({
  detail: {
    planOrder: '3',
    applyStandardName: '箱',
    priceLevel: 1,
    restWeight: '2.5'
  }
})
await new Promise(resolve => setImmediate(resolve))

assert.ok(submitted)
assert.equal(submitted.nxDpgDisGoodsId, 501)
assert.equal(submitted.nxDpgDistributerId, 160)
assert.equal(submitted.nxDpgQuantity, '3')
assert.equal(submitted.nxDpgStandard, '箱')
assert.equal(Object.hasOwn(submitted, 'nxDpgApplyShelfId'), false,
  '非货架订货不能携带上一次浏览留下的货架 ID')
assert.equal(Object.hasOwn(submitted, 'nxDpgBatchId'), false,
  '客户端只创建补货需求，不自行伪造采购批次')
assert.equal(directStockCalls, 0, '订货入口不能调用直接采购入库接口')
assert.equal(page.data.showPlanPurchase, false)
assert.equal(page.data.unShelfGoodsList[0].shelfPurGoods.nxDistributerPurchaseGoodsId, 9001)
assert.equal(toasts.at(-1), '进货商品保存成功')

console.log('unshelf plan purchase flow: PASS')

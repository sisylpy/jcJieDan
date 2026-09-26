import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = fs.readFileSync(
  path.join(root, 'subPackage/pages/management/purchaseManagement/pendingStockInList/pendingStockInList.js'),
  'utf8'
).replace(/import\s*\{[\s\S]*?\}\s*from\s*['"][^'"]+['"]\s*/g, '')

let pageConfig
let submitted
let shelfLookups = 0
let navigatedTo = ''
const toasts = []
const purchaseGoods = {
  nxDistributerPurchaseGoodsId: 501,
  nxDpgStatus: 2,
  nxDpgBatchId: null,
  nxDpgPurUserId: 77,
  nxDpgStandard: '箱',
  nxDpgBuyQuantity: '2',
  nxDpgBuyPrice: '80',
  nxDpgBuySubtotal: '160',
  nxDpgBuyScale: '20',
  nxDpgExpectPrice: ''
}
const disGoods = {
  nxDistributerGoodsId: 91,
  nxDgGoodsName: '明禾春菜籽油',
  nxDgGoodsStandardname: '瓶',
  nxDgCartonUnit: '箱',
  nxDgItemsPerCarton: 20
}

const context = vm.createContext({
  console,
  Page: config => { pageConfig = config },
  getApp: () => ({
    globalData: {
      navBarHeight: 44,
      rpxR: 2,
      windowHeight: 800,
      windowWidth: 375
    }
  }),
  require: () => ({
    begin(owner, request, payload) {
      return { started: true, promise: request(payload, 'receipt-test-key') }
    }
  }),
  wx: {
    getStorageSync() {
      return { nxDistributerEntity: { nxDistributerId: 160 } }
    },
    showLoading() {},
    hideLoading() {},
    showToast(options) { toasts.push(options.title) },
    navigateBack() {},
    navigateTo(options) { navigatedTo = options.url }
  },
  getPurchaseManagementPendingStockIns: async () => ({ result: { code: 0, data: {} } }),
  getShelfGoods: async () => {
    shelfLookups += 1
    return {
      result: {
        code: 0,
        page: {
          currPage: 1,
          totalPage: 1,
          list: [{
            nxDistributerGoodsEntity: disGoods,
            shelfPurGoods: purchaseGoods
          }]
        }
      }
    }
  },
  disGetUnshelfGoods: async () => ({
    result: { code: 0, page: { currPage: 1, totalPage: 1, list: [] } }
  }),
  saveShelfGoodsStock: async payload => {
    submitted = payload
    return { result: { code: 0, data: {} } }
  }
})

new vm.Script(source, { filename: 'pendingStockInList.js' }).runInContext(context)
assert.ok(pageConfig)

const page = {
  ...pageConfig,
  data: JSON.parse(JSON.stringify(pageConfig.data)),
  setData(update) { Object.assign(this.data, update) }
}
page.onLoad()
assert.equal(page.data.disId, 160)

const groups = page.groupByPurchaser([
  { purchaserUserId: 77, purchaserText: '采购员甲', purchaseGoodsId: 1 },
  { purchaserUserId: 88, purchaserText: '采购员乙', purchaseGoodsId: 2 },
  { purchaserUserId: 77, purchaserText: '采购员甲', purchaseGoodsId: 3 }
])
assert.equal(groups.length, 2)
assert.equal(groups[0].purchaserName, '采购员甲')
assert.equal(groups[0].itemCount, 2)
assert.deepEqual(Array.from(groups[0].items, item => item.purchaseGoodsId), [1, 3])

page.setData({
  items: [{ purchaseGoodsId: 501, batchId: null, plannedShelfId: 12 }]
})
page.openReceipt({ currentTarget: { dataset: { purchaseGoodsId: 501 } } })
await new Promise(resolve => setImmediate(resolve))
await new Promise(resolve => setImmediate(resolve))

assert.equal(shelfLookups, 1)
assert.equal(page.data.showInputPurStock, true)
assert.equal(page.data.receiptItem.nxDistributerPurchaseGoodsId, 501)
assert.equal(page.data.receiptItem.nxDistributerGoodsEntity.nxDgGoodsName, '明禾春菜籽油')

let reloaded = false
page.load = () => { reloaded = true }
page.confirmInputPurStock({
  detail: {
    item: {
      ...page.data.receiptItem,
      nxDpgExpectPrice: '3',
      nxDpgProduceDate: '2026-09-26'
    }
  }
})
await new Promise(resolve => setImmediate(resolve))
await new Promise(resolve => setImmediate(resolve))

assert.ok(submitted)
assert.equal(submitted.nxDistributerPurchaseGoodsId, 501)
assert.equal(submitted.nxDpgExpectPrice, '60')
assert.equal(submitted.nxDpgProcurementMode, 'SELF_BUY')
assert.equal(Object.hasOwn(submitted, 'nxDistributerGoodsEntity'), false)
assert.equal(page.data.showInputPurStock, false)
assert.equal(reloaded, true)
assert.equal(toasts.at(-1), '接收入库完成')

page.setData({
  items: [{ purchaseGoodsId: 601, batchId: 701, plannedShelfId: 12 }]
})
page.openReceipt({ currentTarget: { dataset: { purchaseGoodsId: 601 } } })
assert.equal(navigatedTo, '/subPackage/pages/prepare/purchaseReceipt/purchaseReceipt?batchId=701')
assert.equal(shelfLookups, 1, '批次商品应直接进入批次收货流程，不读取旧货架页面')

console.log('pending stock-in purchaser grouping and inline receipt: PASS')

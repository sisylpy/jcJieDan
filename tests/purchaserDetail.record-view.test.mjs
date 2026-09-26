import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const helperPath = path.join(root, 'utils/purchaseManagementPurchaserRecordView.js')
const wxmlPath = path.join(root, 'subPackage/pages/management/purchaseManagement/purchaserDetail/purchaserDetail.wxml')
const wxssPath = path.join(root, 'subPackage/pages/management/purchaseManagement/purchaserDetail/purchaserDetail.wxss')
const source = fs.readFileSync(helperPath, 'utf8')
  .replace(/import \{ resolveGoodsImage \} from '.\/goodsImageView\.js'\n/,
    "const resolveGoodsImage = goods => goods.goodsFile || '/images/photozhaoxiang.png'\n")
  .replace(/export function /g, 'function ')
  .concat('\nthis.purchaserRecordInitialState=purchaserRecordInitialState;this.buildPurchaserRecordView=buildPurchaserRecordView;')

const context = vm.createContext({
  Number, String, Object, Array, Math, isFinite,
  console
})
new vm.Script(source, { filename: 'purchaseManagementPurchaserRecordView.js' }).runInContext(context)

const batches = [{
  batchId: 101,
  goodsSummary: '黄瓜、菜心',
  goodsCategories: '蔬菜类',
  goodsImage: 'goodsImage/cucumber.jpg',
  businessDate: '2026-09-25',
  procurementMode: 'EXTERNAL_SUPPLIER',
  purchaseKindText: '供应方采购',
  purchasePurpose: 'INVENTORY_REPLENISHMENT',
  purchasePurposeText: '库存备货',
  businessProgress: 'PURCHASE_RECORDED',
  goodsLineCount: 2,
  recognizedSupplyAmount: 60
}]
const directItems = [{
  purchaseGoodsId: 202,
  goodsName: '西兰花',
  goodsCategory: '蔬菜类',
  purchaseDate: '2026-09-24',
  purchaseStatus: 'STOCKED',
  quantityText: '8件',
  priceText: '¥9',
  purchaseSubtotal: 72,
  recordKindText: '无货架自采',
  demandSourceText: '无货架',
  demandSource: 'UNSHELVED_REPLENISHMENT'
}]

const initial = context.purchaserRecordInitialState()
let view = context.buildPurchaserRecordView(batches, directItems, initial, '')
assert.equal(view.recordGroups[0].count, 2)
assert.equal(view.recordGroups.find(item => item.key === '蔬菜类').count, 2)
assert.deepEqual(JSON.parse(JSON.stringify(view.recordItems.map(item => item.key))), ['BATCH:101', 'DIRECT:202'])
assert.equal(view.recordItems[0].statusText, '待入库')
assert.equal(view.recordItems[1].statusText, '已入库')
assert.equal(view.recordItems[1].sourceText, '无货架')
assert.equal(view.recordItems[1].quantityPriceText, '8件 × ¥9')

view = context.buildPurchaserRecordView(batches, directItems,
  Object.assign({}, initial, { recordModeIndex: 1 }), '')
assert.deepEqual(JSON.parse(JSON.stringify(view.recordItems.map(item => item.key))), ['BATCH:101'])

view = context.buildPurchaserRecordView(batches, directItems,
  Object.assign({}, initial, { recordStatusIndex: 1 }), '')
assert.deepEqual(JSON.parse(JSON.stringify(view.recordItems.map(item => item.key))), ['DIRECT:202'])

const wxml = fs.readFileSync(wxmlPath, 'utf8')
const wxss = fs.readFileSync(wxssPath, 'utf8')
assert.match(wxml, /record-groups/)
assert.match(wxml, /recordModeOptions/)
assert.match(wxml, /recordStatusOptions/)
assert.match(wxml, /recordSortOptions/)
assert.doesNotMatch(wxml, /采购批次（|自采记录（/)
assert.match(wxss, /\.purchase-record-card/)
assert.match(wxss, /\.record-group\.on/)

console.log('purchaser detail unified record view tests passed')

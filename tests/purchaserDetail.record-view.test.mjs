import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const helperPath = path.join(root, 'utils/purchaseManagementPurchaserGoodsView.js')
const wxmlPath = path.join(root, 'subPackage/pages/management/purchaseManagement/purchaserDetail/purchaserDetail.wxml')
const wxssPath = path.join(root, 'subPackage/pages/management/purchaseManagement/purchaserDetail/purchaserDetail.wxss')
const source = fs.readFileSync(helperPath, 'utf8')
  .replace(/import \{ resolveGoodsImage \} from '.\/goodsImageView\.js'\n/,
    "const resolveGoodsImage = goods => goods.goodsFile || '/images/photozhaoxiang.png'\n")
  .replace(/export function /g, 'function ')
  .concat('\nthis.purchaserGoodsInitialState=purchaserGoodsInitialState;this.buildPurchaserGoodsView=buildPurchaserGoodsView;')

const context = vm.createContext({
  Number, String, Object, Array, Math, isFinite,
  console
})
new vm.Script(source, { filename: 'purchaseManagementPurchaserGoodsView.js' }).runInContext(context)

const goods = [{
  recordKey: 'EXTERNAL_DPB:101',
  purchaseGoodsId: 201,
  purchaserUserId: 11,
  purchaserName: '采购员甲',
  goodsName: '海天生抽酱油',
  goodsImage: 'goodsImage/soy.jpg',
  categoryName: '调味品',
  businessDate: '2026-09-25',
  sourceType: 'EXTERNAL_DPB',
  sourceText: '外部供应',
  supplierName: '160外供货商',
  purchasePurposeText: '库存备货',
  completionText: '采购完成',
  quantity: 2,
  unit: '件',
  unitPrice: 80,
  amount: 160,
  amountStatus: 'RECOGNIZED'
}, {
  recordKey: 'SELF_PURCHASE:202',
  purchaseGoodsId: 202,
  purchaserUserId: 12,
  purchaserName: '采购员乙',
  goodsName: '西兰花',
  categoryName: '蔬菜类',
  businessDate: '2026-09-24',
  sourceType: 'SELF_PURCHASE',
  sourceText: '自采',
  purchasePurposeText: '库存备货',
  completionText: '采购完成',
  quantity: 8,
  unit: '件',
  unitPrice: 9,
  amount: 72,
  amountStatus: 'RECOGNIZED'
}, {
  recordKey: 'EXTERNAL_DPB:103',
  purchaseGoodsId: 203,
  purchaserUserId: 11,
  purchaserName: '采购员甲',
  goodsName: '小油菜',
  categoryName: '蔬菜类',
  businessDate: '2026-09-23',
  sourceType: 'EXTERNAL_DPB',
  sourceText: '外部供应',
  purchasePurposeText: '客户订单订货',
  completionText: '采购完成',
  quantity: 5.8,
  unit: '斤',
  unitPrice: 1.8,
  amount: 10.4,
  amountStatus: 'RECOGNIZED'
}]

const initial = context.purchaserGoodsInitialState()
let view = context.buildPurchaserGoodsView(goods, initial, '')
assert.equal(view.goodsCategories[0].name, '全部商品')
assert.equal(view.goodsCategories[0].count, 3)
assert.equal(view.goodsCategories.find(item => item.key === '蔬菜类').count, 2)
assert.deepEqual(JSON.parse(JSON.stringify(view.goodsItems.map(item => item.key))),
  ['EXTERNAL_DPB:101', 'SELF_PURCHASE:202', 'EXTERNAL_DPB:103'])
assert.equal(view.goodsItems[0].title, '海天生抽酱油')
assert.equal(view.goodsItems[0].quantityPriceText, '2件 × ¥80/件')
assert.equal(view.goodsItems[0].completionText, '采购完成')

view = context.buildPurchaserGoodsView(goods,
  Object.assign({}, initial, { goodsSourceIndex: 1 }), '')
assert.deepEqual(JSON.parse(JSON.stringify(view.goodsItems.map(item => item.key))),
  ['EXTERNAL_DPB:101', 'EXTERNAL_DPB:103'])

view = context.buildPurchaserGoodsView(goods,
  Object.assign({}, initial, { activeGoodsCategory: '蔬菜类', goodsSortIndex: 2 }), '')
assert.deepEqual(JSON.parse(JSON.stringify(view.goodsItems.map(item => item.key))),
  ['EXTERNAL_DPB:103', 'SELF_PURCHASE:202'])

const wxml = fs.readFileSync(wxmlPath, 'utf8')
const wxss = fs.readFileSync(wxssPath, 'utf8')
assert.match(wxml, /goodsCategories/)
assert.match(wxml, /goodsSourceOptions/)
assert.match(wxml, /goodsSortOptions/)
assert.match(wxml, /item\.purchaserName/)
assert.match(wxml, /class="goods-tree-layout"[\s\S]*scroll-view scroll-y class="goods-category-tree"/,
  '商品大类应位于左侧树形结构')
assert.doesNotMatch(wxml, /当前任务|detail-tabs|openTask|openRecord|查看采购批次/)
assert.match(wxss, /\.purchased-goods-card/)
assert.match(wxss, /\.goods-category\.on/)
assert.match(wxss, /\.goods-tree-layout\s*\{[\s\S]*?display:\s*flex/)
assert.match(wxss, /\.goods-category-tree\s*\{[\s\S]*?width:\s*142rpx/)
assert.match(wxss, /\.purchased-goods-name\s*\{[\s\S]*?font-size:\s*34rpx/,
  '采购完成商品名称应保持醒目的大字号')

console.log('purchaser completed-goods tree view tests passed')

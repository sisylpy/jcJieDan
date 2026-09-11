const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '../..')
const read = value => fs.readFileSync(path.join(root, value), 'utf8')
const must = (condition, message) => { if (!condition) throw new Error(message) }

const app = JSON.parse(read('app.json'))
const pages = app.subPackages.find(item => item.root === 'subPackage/').pages
must(pages.includes('pages/shelf/inventoryBatchBusiness/inventoryBatchBusiness'), '库存批次经营页未注册')
must(pages.includes('pages/management/purchasePerformance/purchasePerformance'), '采购绩效页未注册')

const api = read('lib/apiDistributer.js')
;['getInventoryBatchBusiness', 'addInventoryBatchLossFact', 'changeInventoryBatchPrice',
  'reverseInventoryBatchLossFact', 'getInventoryPurchasePerformance'].forEach(name =>
  must(api.includes('export const ' + name), '缺少 API: ' + name))
must(api.includes("getApp().ownerRequest"), '采购批次 API 必须使用 Owner 鉴权请求')
must(api.includes("'X-Idempotency-Key'"), '事实写入必须携带幂等键')

const detailJs = read('subPackage/pages/shelf/inventoryBatchBusiness/inventoryBatchBusiness.js')
const detailWxml = read('subPackage/pages/shelf/inventoryBatchBusiness/inventoryBatchBusiness.wxml')
;['SUPPLIER_QUALITY', 'PURCHASER_SELECTION', 'WAREHOUSE_STORAGE', 'NORMAL_NATURAL', 'UNATTRIBUTED']
  .forEach(code => must(detailJs.includes(code), '责任归因缺失: ' + code))
;['库存批次列表', '修改批次', '盘点库存数量', '调整当前售价', '查看经营明细', '损耗 / 报废记录']
  .forEach(text => must(detailWxml.includes(text), '新版批次页缺失: ' + text))
;['openBatchEditor', 'onActualQuantityInput', 'submitQuantityChange', 'addInventoryBatchLossFact']
  .forEach(text => must(detailJs.includes(text), '批次数量修改流程缺失: ' + text))
must(detailJs.includes('actual > current'), '批次页必须阻止绕过入库直接增加库存')
must(detailWxml.includes('reverseFact'), '损耗事实必须支持冲销而非删除')

const performance = read('subPackage/pages/management/purchasePerformance/purchasePerformance.wxml')
must(performance.includes('按采购员') && performance.includes('按供货商'), '绩效维度不完整')
must(performance.includes('降价影响') && performance.includes('供货商品质'), '绩效指标不完整')
const shelfWxml = read('subPackage/pages/shelf/index/index.wxml')
const shelfJs = read('subPackage/pages/shelf/index/index.js')
const shelfJson = JSON.parse(read('subPackage/pages/shelf/index/index.json'))
must(shelfWxml.includes('openInventoryBatchList'), '货架商品未接库存批次列表入口')
must(shelfWxml.includes('打开库存批次列表'), '货架商品库存入口文案不正确')
must(!shelfWxml.includes('catchtap="showStockDetail"'), '货架商品仍保留旧库存详细按钮')
must(!shelfWxml.includes('catchtap="showStock"'), '货架商品仍保留旧修改库存数量按钮')
must(shelfJs.includes("setStorageSync('inventoryBatchBusinessContext'"), '货架页未传递商品的全部库存批次')
must(!shelfJson.usingComponents.editShelfStock && !shelfJson.usingComponents.editShelfStockDetail,
  '货架页仍加载旧库存修改组件')
must(shelfWxml.includes('toInventoryBatchBusiness'), '货架批次未接单批次详情入口')
must(read('subPackage/pages/management/homePage/homePage.wxml').includes('toPurchasePerformance'), '管理首页未接绩效入口')

console.log('inventory batch stage 1C boss contract: PASS')

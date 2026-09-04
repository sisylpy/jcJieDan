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
;['登记损耗 / 废弃', '尾货调价', '当前实现毛利', '损耗事实']
  .forEach(text => must(detailWxml.includes(text), '批次页缺失: ' + text))
must(detailWxml.includes('reverseFact'), '损耗事实必须支持冲销而非删除')

const performance = read('subPackage/pages/management/purchasePerformance/purchasePerformance.wxml')
must(performance.includes('按采购员') && performance.includes('按供货商'), '绩效维度不完整')
must(performance.includes('降价影响') && performance.includes('供货商品质'), '绩效指标不完整')
must(read('subPackage/pages/shelf/index/index.wxml').includes('toInventoryBatchBusiness'), '货架批次未接详情入口')
must(read('subPackage/pages/management/homePage/homePage.wxml').includes('toPurchasePerformance'), '管理首页未接绩效入口')

console.log('inventory batch stage 1C boss contract: PASS')

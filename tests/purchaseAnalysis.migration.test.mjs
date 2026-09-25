import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const exists = relative => fs.existsSync(path.join(root, relative))

const pageNames = [
  'inventoryBusinessAnalysis',
  'selfPurchaseAnalysis',
  'supplierAnalysis',
  'unitPriceAnalysis',
  'purchaseCountAnalysis',
  'purchaseCategoryDetail'
]
const app = JSON.parse(read('app.json'))
const chartPackage = app.subPackages.find(item => item.root === 'subPackage-charts/')

assert.ok(chartPackage, 'subPackage-charts must remain registered')
for (const pageName of pageNames) {
  const route = `pages/mangement/${pageName}/${pageName}`
  assert.ok(chartPackage.pages.includes(route), `${route} must be registered`)
  for (const extension of ['js', 'json', 'wxml', 'wxss']) {
    assert.ok(exists(`subPackage-charts/${route}.${extension}`), `${route}.${extension} must exist`)
  }
}

const apiSource = read('subPackage-charts/lib/purchaseAnalysisApi.js')
for (const endpoint of [
  'getNxSelfPurchaseAnalysis',
  'getNxPurchaseCountAnalysis',
  'getNxUnitPriceAnalysis',
  'getNxPurchaseCategoryDetail',
  'getNxSupplierAnalysis',
  'getNxInventoryBusinessAnalysis'
]) {
  assert.match(apiSource, new RegExp(`export const ${endpoint}\\b`))
}

const migratedSource = pageNames
  .concat(['purGoodsFenxi'])
  .map(pageName => read(`subPackage-charts/pages/mangement/${pageName}/${pageName}.js`))
  .join('\n')
assert.doesNotMatch(migratedSource, /getGb|gbDistributer|pages\/cost|grainservice\.club/)

const purchaseOverviewSource = read('subPackage-charts/pages/mangement/purGoodsFenxi/purGoodsFenxi.js')
const purchaseDateSource = read('subPackage-charts/pages/sel/searchDate/searchDate.js')
assert.match(purchaseOverviewSource, /name: this\.data\.dateName \|\| 'custom'/)
assert.match(purchaseOverviewSource, /PURCHASE_DATE_PRESETS\[myDate\.hanzi\] \|\| 'custom'/)
assert.match(purchaseOverviewSource, /dateName: dateName \|\| 'custom'/)
assert.match(purchaseOverviewSource, /&dateName=' \+ \(this\.data\.dateName \|\| ''\)/)
assert.match(purchaseDateSource, /prevPage\.setData\(\{[\s\S]*?dateName: dateName,[\s\S]*?startDate: startDate/)
assert.match(purchaseDateSource, /dateName: "custom"/)

for (const banner of [
  'self-purchase-analysis-banner.jpg',
  'purchase-count-analysis-banner.jpg',
  'unit-price-analysis-banner.jpg'
]) {
  assert.ok(exists(`subPackage-charts/images/purchase/${banner}`), `${banner} must be local`)
}

for (const asset of ['delete.png', 'qiandaizi.png', 'search.png', 'warn.png', 'zhuanhuan.svg']) {
  assert.ok(exists(`subPackage-charts/images/purchase/${asset}`), `${asset} must be in subPackage-charts`)
  assert.equal(exists(`images/${asset}`), false, `${asset} must not increase the main package`)
}

for (const [source, destination] of [
  ['images/calender.png', 'subPackage-charts/images/purchase/calender.png'],
  ['images/user-group.png', 'subPackage/images/user-group.png'],
  ['images/app-shop.png', 'subPackage-routeDispatch/images/app-shop.png']
]) {
  assert.equal(exists(source), false, `${source} must not increase the main package`)
  assert.ok(exists(destination), `${destination} must exist`)
}

const projectConfig = JSON.parse(read('project.config.json'))
assert.ok(
  projectConfig.packOptions.ignore.some(item => item.type === 'folder' && item.value === 'tests'),
  'test sources must not be included in the upload package'
)

console.log('purchase analysis migration tests passed')

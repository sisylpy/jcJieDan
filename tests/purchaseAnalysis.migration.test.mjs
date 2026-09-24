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

const apiSource = read('lib/apiDepOrder.js')
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

for (const banner of [
  'self-purchase-analysis-banner.jpg',
  'purchase-count-analysis-banner.jpg',
  'unit-price-analysis-banner.jpg'
]) {
  assert.ok(exists(`subPackage-charts/images/purchase/${banner}`), `${banner} must be local`)
}

console.log('purchase analysis migration tests passed')

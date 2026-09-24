const fs = require('fs')
const path = require('path')
const assert = require('assert')

const root = path.resolve(__dirname, '../..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')

const page = read('subPackage-charts/pages/statistic/purchaseDeatil/purchaseDeatil.js')
const view = read('subPackage-charts/pages/statistic/purchaseDeatil/purchaseDeatil.wxml')
const stockPage = read('subPackage-charts/pages/statistic/stockPurGoods/stockPurGoods.js')

assert.ok(page.includes("type === 0 || this.data.type === 10"))
assert.ok(page.includes("this.data.type === 1"))
assert.ok(!page.includes('this.data.type < 12'))
assert.ok(!page.includes('this.data.type == 12'))
assert.ok(page.includes('greatId: options.id || options.greatId || -1'))
assert.ok(view.includes('type == 0 || type == 10'))
assert.ok(view.includes('type == 1'))
assert.ok(stockPage.includes("'&disId=' + this.data.disId + '&id=' + this.data.greatId"))

console.log('PASS statistic purchase detail type contract')

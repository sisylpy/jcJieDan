import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(
  'subPackage-order/pages/order/resGoodsList/resGoodsList.js',
  'utf8'
)

assert.match(source, /_againSearchString\(downloadedGoods\)/,
  '下载后应使用下载接口返回的配送商商品')
assert.match(source, /strArr:\s*\[downloadedGoods\]/,
  '下载后应只展示当前下载的商品')
assert.match(source, /nxArr:\s*\[\]/,
  '下载后不应保留标准库的模糊匹配结果')
assert.match(source, /this\._againSearchString\(res\.result\.data\)/,
  '下载成功后应将新建商品传给结果刷新')

const refreshStart = source.indexOf('_againSearchString(downloadedGoods)')
const refreshEnd = source.indexOf('\n  },', refreshStart)
const refreshMethod = source.slice(refreshStart, refreshEnd)
assert.doesNotMatch(refreshMethod, /queryNxGoodsByQuickSearch\(/,
  '下载后不应再调用易扩散的标准库搜索')

console.log('resGoodsList download search result: PASS')

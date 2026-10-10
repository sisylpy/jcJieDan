import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(
  'subPackage-order/pages/order/resGoodsList/resGoodsList.js',
  'utf8'
)

assert.match(source, /pageAlive:\s*false/)
assert.match(source, /isLeaving:\s*false/)
assert.match(source, /_navigateBackOnce\(\)/)
assert.match(source, /if \(!this\.pageAlive \|\| this\.isLeaving\) return/,
  '页面已销毁或正在返回时不得重复路由')
assert.match(source, /if \(pages\.length > 1\)[\s\S]*wx\.navigateBack/,
  '只有存在上一页时才能 navigateBack')
assert.match(source, /wx\.switchTab\(\{\s*url: '\/pages\/order\/index\/index'/,
  '直接调试本页时应返回订单首页')
assert.match(source, /onUnload\(\)[\s\S]*this\.pageAlive = false/)
assert.match(source, /onUnload\(\)[\s\S]*clearTimeout\(this\.inputBlurTimer\)/,
  '页面卸载必须取消失焦延迟回调')
assert.match(source, /if \(!this\.pageAlive\) return;/,
  '延迟回调不得操作已卸载页面')

const navigateBackCalls = source.match(/wx\.navigateBack\(/g) || []
assert.equal(navigateBackCalls.length, 1,
  '所有返回必须统一经过防重入口')

console.log('resGoodsList route lifecycle: PASS')

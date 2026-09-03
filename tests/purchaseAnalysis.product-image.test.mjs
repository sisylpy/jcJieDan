import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const source = read('utils/goodsImageView.js')
const visual = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`)

assert.equal(
  visual.resolveGoodsImage({ nxDgGoodsFileLarge: 'upload/potato-large.jpg' }, 'https://example.test/root/'),
  'https://example.test/root/upload/potato-large.jpg'
)
assert.equal(
  visual.resolveGoodsImage({ nxDgGoodsFile: 'https://cdn.example.test/potato.jpg' }, 'https://example.test/root/'),
  'https://cdn.example.test/potato.jpg'
)
assert.equal(
  visual.resolveGoodsImage({ nxDgNxFatherImg: 'upload/vegetable-father.jpg' }, 'https://example.test/root/'),
  'https://example.test/root/upload/vegetable-father.jpg'
)
assert.equal(
  visual.resolveGoodsImage({ nxGoodsFileBig: 'upload/potato-platform.jpg' }, 'https://example.test/root/'),
  'https://example.test/root/upload/potato-platform.jpg'
)
assert.equal(
  visual.resolveGoodsImage({
    nxDgGoodsFile: 'goodsImage/logo.jpg',
    nxDgNxFatherImg: 'upload/vegetable-father.jpg'
  }, 'https://example.test/root/'),
  'https://example.test/root/upload/vegetable-father.jpg'
)
assert.equal(visual.resolveGoodsImage({}, 'https://example.test/root/'), '/images/photozhaoxiang.png')
assert.equal(
  visual.resolveGoodsImage({ nxDgGoodsFile: 'goodsImage/logo.jpg' }, 'https://example.test/root/'),
  '/images/photozhaoxiang.png'
)

const purchaseJs = read('subPackage-charts/pages/mangement/purGoodsFenxi/purGoodsFenxi.js')
const purchaseWxml = read('subPackage-charts/pages/mangement/purGoodsFenxi/purGoodsFenxi.wxml')
const detailJs = read('subPackage-charts/pages/mangement/goodsFenxiPurchase/goodsFenxiPurchase.js')
const detailWxml = read('subPackage-charts/pages/mangement/goodsFenxiPurchase/goodsFenxiPurchase.wxml')

assert.match(purchaseJs, /topTimesGoods\.map\(item => decorateGoodsVisual/)
assert.match(purchaseJs, /topSubtotalGoods\.map\(item => decorateGoodsVisual/)
assert.match(purchaseJs, /topGoodsPrice\.map\(item => decorateGoodsVisual/)
assert.equal((purchaseWxml.match(/src="\{\{item\.goodsImageUrl\}\}"/g) || []).length, 3)
assert.match(detailJs, /disGoods: decorateGoodsVisual\(disGoods, apiUrl\.server\)/)
assert.match(detailWxml, /src="\{\{disGoods\.goodsImageUrl\}\}"/)

console.log('purchase analysis product image tests passed')

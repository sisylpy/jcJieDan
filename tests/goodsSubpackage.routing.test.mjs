import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import test from 'node:test'

const appConfig = JSON.parse(readFileSync('app.json', 'utf8'))

test('goods pages live in a dedicated subpackage', () => {
  const goodsPackage = appConfig.subPackages.find(item => item.root === 'subPackage-goods/')
  const legacyPackage = appConfig.subPackages.find(item => item.root === 'subPackage/')

  assert.ok(goodsPackage)
  assert.ok(goodsPackage.pages.length > 0)
  assert.ok(goodsPackage.pages.every(page => page.startsWith('pages/goods/')))
  assert.ok(legacyPackage.pages.every(page => !page.startsWith('pages/goods/')))

  goodsPackage.pages.forEach(page => {
    assert.ok(existsSync(`subPackage-goods/${page}.js`), `${page}.js should exist`)
    assert.ok(existsSync(`subPackage-goods/${page}.json`), `${page}.json should exist`)
    assert.ok(existsSync(`subPackage-goods/${page}.wxml`), `${page}.wxml should exist`)
    assert.ok(existsSync(`subPackage-goods/${page}.wxss`), `${page}.wxss should exist`)
  })
})

test('duplicated temporary-goods editor logic stays inside the goods subpackage', () => {
  const updatePage = readFileSync(
    'subPackage-goods/pages/goods/disUpdateGoodsLinshi/disUpdateGoodsLinshi.js',
    'utf8'
  )
  const revertPage = readFileSync(
    'subPackage-goods/pages/goods/disRevertGoodsLinshi/disRevertGoodsLinshi.js',
    'utf8'
  )

  assert.match(updatePage, /\.\.\/\.\.\/\.\.\/shared\/disGoodsLinshiEditorPage\.js/)
  assert.match(revertPage, /\.\.\/\.\.\/\.\.\/shared\/disGoodsLinshiEditorPage\.js/)
  assert.ok(existsSync('subPackage-goods/shared/disGoodsLinshiEditorPage.js'))
  assert.equal(existsSync('utils/disGoodsLinshiEditorPage.js'), false)
})

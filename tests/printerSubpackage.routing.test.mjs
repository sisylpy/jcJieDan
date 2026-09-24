import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const exists = relative => fs.existsSync(path.join(root, relative))

const routes = [
  'pages/management/printerSet/printerSet',
  'pages/management/printerSetting/printerSetting',
  'pages/management/labelPrinter/labelPrinter'
]
const app = JSON.parse(read('app.json'))
const generalPackage = app.subPackages.find(item => item.root === 'subPackage/')
const printerPackage = app.subPackages.find(item => item.root === 'subPackage-printer/')

assert.ok(generalPackage, 'general subpackage must remain registered')
assert.ok(printerPackage, 'printer subpackage must be registered')
for (const route of routes) {
  assert.equal(generalPackage.pages.includes(route), false, `${route} must leave the crowded subpackage`)
  assert.ok(printerPackage.pages.includes(route), `${route} must be registered in printer subpackage`)
  for (const extension of ['js', 'json', 'wxml', 'wxss']) {
    assert.ok(exists(`subPackage-printer/${route}.${extension}`), `${route}.${extension} must exist`)
  }
}

const entrySources = [
  read('pages/stock/index/index.js'),
  read('subPackage/pages/management/homePage/homePage.js'),
  read('subPackage-printer/pages/management/printerSetting/printerSetting.js')
].join('\n')
assert.doesNotMatch(entrySources, /\/subPackage\/pages\/management\/(?:printerSet|printerSetting|labelPrinter)/)
assert.match(entrySources, /\/subPackage-printer\/pages\/management\/printerSetting\/printerSetting/)
assert.match(entrySources, /\/subPackage-printer\/pages\/management\/labelPrinter\/labelPrinter/)

console.log('printer subpackage routing tests passed')

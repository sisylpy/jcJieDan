import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const exists = relative => fs.existsSync(path.join(root, relative))

const routes = [
  'pages/management/distributerCoupon/distributerCoupon',
  'pages/management/distributerCoupon/couponEdit',
  'pages/management/distributerCoupon/couponGoodsPicker',
  'pages/management/compensationCoupon/compensationCoupon',
  'pages/management/compensationCoupon/compensationCouponEdit'
]
const app = JSON.parse(read('app.json'))
const generalPackage = app.subPackages.find(item => item.root === 'subPackage/')
const couponPackage = app.subPackages.find(item => item.root === 'subPackage-coupon/')

assert.ok(generalPackage, 'general subpackage must remain registered')
assert.ok(couponPackage, 'coupon subpackage must be registered')
for (const route of routes) {
  assert.equal(generalPackage.pages.includes(route), false, `${route} must leave the crowded subpackage`)
  assert.ok(couponPackage.pages.includes(route), `${route} must be registered in coupon subpackage`)
  for (const extension of ['js', 'json', 'wxml', 'wxss']) {
    assert.ok(exists(`subPackage-coupon/${route}.${extension}`), `${route}.${extension} must exist`)
  }
}

const entrySources = [
  read('subPackage/pages/management/homePage/homePage.js'),
  read('subPackage-charts/pages/afterSales/detail/detail.js'),
  read('subPackage-coupon/pages/management/distributerCoupon/distributerCoupon.js'),
  read('subPackage-coupon/pages/management/distributerCoupon/couponEdit.js')
].join('\n')
assert.doesNotMatch(entrySources, /\/subPackage\/pages\/management\/(?:distributerCoupon|compensationCoupon)/)
assert.match(entrySources, /\/subPackage-coupon\/pages\/management\/distributerCoupon\/distributerCoupon/)
assert.match(entrySources, /\/subPackage-coupon\/pages\/management\/compensationCoupon\/compensationCoupon/)
assert.match(entrySources, /\/subPackage-coupon\/pages\/management\/distributerCoupon\/couponEdit/)
assert.match(entrySources, /\/subPackage-coupon\/pages\/management\/distributerCoupon\/couponGoodsPicker/)

console.log('coupon subpackage routing tests passed')

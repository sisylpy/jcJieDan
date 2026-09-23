import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const pageBase = 'subPackage/pages/offerNx/nxDisBillDetail/nxDisBillDetail'
const script = fs.readFileSync(`${pageBase}.js`, 'utf8')
const view = fs.readFileSync(`${pageBase}.wxml`, 'utf8')
const style = fs.readFileSync(`${pageBase}.wxss`, 'utf8')

test('协作账单商品下展示正常订单的申请人与四项结算数据', () => {
  assert.match(script, /purchaseDepartmentName:\s*departmentName/)
  assert.match(script, /purchaseApplicantName:\s*this\._formatPurchaseApplicant\(order\)/)
  assert.match(script, /requestQuantityText:\s*this\._formatQuantity\(order\.nxDoQuantity, order\.nxDoStandard\)/)
  assert.match(script, /replyQuantityText:\s*this\._formatQuantity\(order\.nxDoWeight, replyUnit\)/)
  assert.match(script, /unitPriceText:\s*this\._formatUnitPrice\(order\.nxDoPrice, replyUnit\)/)
  assert.match(script, /subtotalText:\s*this\._formatMoney\(order\.nxDoSubtotal\)/)

  assert.match(view, /门店部门/)
  assert.match(view, /申请人/)
  assert.match(view, /申请数量/)
  assert.match(view, /回复数量/)
  assert.match(view, /单价/)
  assert.match(view, /小计/)
  assert.match(view, /order\.purchaseApplicantName/)
  assert.match(style, /\.order-metrics\s*\{[\s\S]*grid-template-columns:\s*1fr 1fr/)
})

import assert from 'node:assert/strict'
import test from 'node:test'
import { readFileSync } from 'node:fs'

const pageSource = readFileSync(
  'subPackage/pages/offerNx/nxDisBillDetail/nxDisBillDetail.js',
  'utf8'
)
const templateSource = readFileSync(
  'subPackage/pages/offerNx/nxDisBillDetail/nxDisBillDetail.wxml',
  'utf8'
)

test('offerNx账单详情优先展示精确关联的采购方主订单', () => {
  assert.match(pageSource, /order\.nxDoCollaborationMainOrderId/)
  assert.match(pageSource, /order\.nxDepartmentOrdersId/)
  assert.match(pageSource, /purchaseSourceOrderLabel:\s*mainOrderId\s*\?\s*'关联采购订单'/)
  assert.match(templateSource, /#\{\{order\.purchaseSourceOrderId\}\}/)
})

test('offerNx账单详情展示订单对应的采购客户', () => {
  assert.match(pageSource, /order\.nxDepartmentEntity/)
  assert.match(pageSource, /department\.fatherDepartmentEntity/)
  assert.match(templateSource, /为客户采购:/)
  assert.match(templateSource, /order\.purchaseCustomerName/)
})

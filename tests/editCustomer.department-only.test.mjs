import assert from 'node:assert/strict'
import fs from 'node:fs'

const view = fs.readFileSync('subPackage/pages/customer/editCustomer/editCustomer.wxml', 'utf8')
const script = fs.readFileSync('subPackage/pages/customer/editCustomer/editCustomer.js', 'utf8')
const style = fs.readFileSync('subPackage/pages/customer/editCustomer/editCustomer.wxss', 'utf8')

assert.doesNotMatch(view, /客户负责人|保存负责人|业务员|录单员/)
assert.doesNotMatch(script, /getDisUsers|updateCustomerResponsibility|saveResponsibility|onSalesChange|onClerkChange/)
assert.doesNotMatch(style, /responsibility-card|responsibility-save|responsibility-picker/)
assert.match(view, /订货部门[\s\S]*修改子部门/, '页面继续只负责部门结构维护')

console.log('edit customer department-only contract: PASS (4 checks)')

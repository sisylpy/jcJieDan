import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const pagePath = new URL(
  '../subPackage-supplier/pages/trans/fromOrderPageGb/fromOrderPageGb.js',
  import.meta.url
)
const source = fs.readFileSync(pagePath, 'utf8')

test('already transferred JCDZB batches bypass the transfer form', () => {
  assert.match(source, /_isBatchTransferred\(batch\)/)
  assert.match(source, /if \(this\._isBatchTransferred\(batch\)\) \{\s*this\._goOrderHome\(\)/)
  assert.match(source, /Number\(order && order\.gbDoNxDepartmentOrderId \|\| 0\)/)
})

test('successful and confirmed transfers open the order home tab', () => {
  assert.match(source, /url: '\/pages\/order\/index\/index'/)
  assert.match(source, /if\(Number\(result\.code\) === 0\)\{\s*[\s\S]*?this\._goOrderHome\(\)/)
  assert.match(source, /_verifyTransferThenOpenHome\(result\.msg \|\| '转单失败'\)/)
  assert.match(source, /this\._verifyTransferThenOpenHome\('无法连接配送服务'\)/)
})

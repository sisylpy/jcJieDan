import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const require = createRequire(import.meta.url)
const directStockSubmission = require('../utils/directStockSubmission.js')

const payload = {
  nxDpgDisGoodsId: 31992,
  nxDpgDistributerId: 160,
  nxDistributerGoodsShelfGoodsId: 2523
}
const owner = {}
let requestCalls = 0
let receivedPayload
let receivedKey
let completeFirst
const firstRequest = new Promise(resolve => { completeFirst = resolve })
const request = (data, key) => {
  requestCalls += 1
  receivedPayload = data
  receivedKey = key
  return firstRequest
}

const first = directStockSubmission.begin(owner, request, payload)
const duplicate = directStockSubmission.begin(owner, request, payload)
assert.equal(first.started, true)
assert.equal(duplicate.started, false)
assert.equal(duplicate.key, first.key)
assert.equal(duplicate.promise, first.promise)
assert.match(first.key, /^owner-direct-stock-[a-z0-9-]+$/)

await Promise.resolve()
assert.equal(requestCalls, 1, '连续确认只能发出一个入库请求')
assert.equal(receivedPayload, payload, '提交锁不能复制或修改业务 payload')
assert.equal(receivedKey, first.key)
assert.equal(payload.nxDistributerGoodsShelfGoodsId, 2523, '货架位置关系必须保留')
assert.equal(Object.hasOwn(payload, 'batchId'), false)
assert.equal(Object.hasOwn(payload, 'nxDpgBatchId'), false)

completeFirst({ result: { code: 0 } })
await first.promise
const afterSuccess = directStockSubmission.begin(owner, () => Promise.resolve('ok'), payload)
assert.equal(afterSuccess.started, true, '成功后必须释放提交锁')
assert.notEqual(afterSuccess.key, first.key, '新一次弹窗提交必须使用新幂等键')
await afterSuccess.promise

const failed = directStockSubmission.begin(owner, () => Promise.reject(new Error('network')), payload)
await assert.rejects(failed.promise, /network/)
const afterFailure = directStockSubmission.begin(owner, () => Promise.resolve('retry'), payload)
assert.equal(afterFailure.started, true, '失败后必须释放提交锁')
await afterFailure.promise

const api = read('lib/apiDistributer.js')
const standardStart = api.indexOf('export const disSavePurGoodsSaveStock =')
const standardEnd = api.indexOf('\nexport const ', standardStart + 1)
const standardApi = api.slice(standardStart, standardEnd < 0 ? api.length : standardEnd)
assert.match(standardApi, /\(data, idempotencyKey\)/)
assert.match(standardApi, /header\['X-Idempotency-Key'\] = idempotencyKey/)
assert.match(standardApi, /\n\s*data,\n\s+header,/)

const traceStart = api.indexOf('export const disSavePurGoodsSaveStockWithTraceReport =')
const traceEnd = api.indexOf('\nexport const ', traceStart + 1)
const traceApi = api.slice(traceStart, traceEnd < 0 ? api.length : traceEnd)
assert.match(traceApi, /\(options, idempotencyKey\)/)
assert.match(traceApi, /'X-Idempotency-Key': idempotencyKey/)
assert.match(traceApi, /ownerUploadFile\(\{[\s\S]*?header: idempotencyHeader/)
assert.match(traceApi, /ownerRequest\(\{[\s\S]*?Object\.assign\([\s\S]*?idempotencyHeader\)/)

const ownerRequest = read('lib/ownerRequest.js')
assert.match(ownerRequest, /Object\.assign\(\{\}, source\.header \|\| \{\}\)/,
  'Owner 请求层必须保留调用方传入的幂等头')

const pages = [
  'subPackage/pages/shelf/index/index.js',
  'subPackage/pages/shelf/indexStock/indexStock.js',
  'subPackage/pages/shelf/indexSuyuan/indexSuyuan.js',
  'subPackage/pages/shelf/shelfGoodsSearch/shelfGoodsSearch.js'
]
for (const pagePath of pages) {
  const page = read(pagePath)
  assert.match(page, /directStockSubmission\.begin\(this, disSavePurGoodsSaveStock, purGoods\)/,
    `${pagePath} 未接入直接入库提交锁`)
  assert.match(page, /if \(!submission\.started\) return;/,
    `${pagePath} 未阻止 pending 期间的重复提交`)
  assert.match(page, /submission\.promise\.then\(/,
    `${pagePath} 未使用受保护的请求 Promise`)
}

const tracePage = read('subPackage/pages/shelf/indexSuyuan/indexSuyuan.js')
assert.match(tracePage,
  /directStockSubmission\.begin\(this, disSavePurGoodsSaveStockWithTraceReport, \{/,
  '溯源文件上传入口未接入相同提交锁')

console.log('direct stock idempotency and duplicate-submit guard: PASS')

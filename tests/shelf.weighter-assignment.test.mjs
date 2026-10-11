import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const api = fs.readFileSync('lib/apiDistributer.js', 'utf8')
const page = fs.readFileSync(
  'subPackage/pages/shelf/settlePage/settlePage.js',
  'utf8'
)
const template = fs.readFileSync(
  'subPackage/pages/shelf/settlePage/settlePage.wxml',
  'utf8'
)

test('货架称重员候选请求必须携带 Owner 会话', () => {
  const start = api.indexOf('export const getShelfWeighterCandidates')
  assert.ok(start >= 0)
  const end = api.indexOf('\nexport const ', start + 1)
  const candidateApi = api.slice(start, end < 0 ? api.length : end)
  assert.match(candidateApi, /getApp\(\)\.ownerRequest\(/)
  assert.doesNotMatch(candidateApi, /wx\.request\(/)
})

test('设置员工页面按 nx_weight_user 数组和字段渲染、选择与提交', () => {
  assert.match(page, /Array\.isArray\(res\.result\.data\)/)
  assert.match(page, /nxWuWxNickName/)
  assert.match(page, /nxWuLoginPhone/)
  assert.match(page, /userId:\s*selectedStaff\[0\]\.nxWeightUserId/)
  assert.match(template, /wx:key="nxWeightUserId"/)
  assert.match(template, /item\.nxWuWxNickName/)
  assert.match(template, /item\.nxWuWxAvartraUrl/)
  assert.doesNotMatch(template, /item\.nxDiu/)
})

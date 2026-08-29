import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const files = [
  'subPackage-routeDispatch/pages/bossTab/myLoading/myLoading.js',
  'subPackage-routeDispatch/pages/bossTab/sandbox/sandbox.js'
]

function actionBlocks(source) {
  const marker = /(?:onDriverRouteEditTap|onIdleDriverRouteEditTap|openDriverRouteEditFromAction):\s*function/g
  const blocks = []
  let match
  while ((match = marker.exec(source)) !== null) {
    const next = source.indexOf('\n  },', match.index)
    blocks.push(source.slice(match.index, next >= 0 ? next : source.length))
  }
  return blocks
}

test('路线编辑按钮优先展示Server禁用原因，再检查payload', () => {
  let checked = 0
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8')
    assert.doesNotMatch(source, /缺少 routeEditAction\.payload/)
    for (const block of actionBlocks(source)) {
      const disabled = block.indexOf('action.enabled === false')
      const payload = block.indexOf("!action.payload || typeof action.payload !== 'object'")
      if (disabled < 0 || payload < 0) continue
      assert.ok(disabled < payload, `${file} 必须先展示禁用原因`)
      assert.match(block, /action\.editDisabledMessage \|\| action\.disabledReason/)
      assert.match(block, /路线编辑参数缺失，请刷新后重试/)
      checked++
    }
  }
  assert.equal(checked, 4)
})

test('分派页遇到已形成正式归属的路线时直接切换到装车页', () => {
  const sandbox = fs.readFileSync(
    'subPackage-routeDispatch/pages/bossTab/sandbox/sandbox.js', 'utf8')
  const dispatchPage = fs.readFileSync('pages/dispatch/index/index.js', 'utf8')
  const dispatchView = fs.readFileSync('pages/dispatch/index/index.wxml', 'utf8')

  assert.match(sandbox,
    /editDisabledReasonCode === 'ROUTE_EDIT_FORMAL_RESOURCE_REQUIRED'[\s\S]*triggerEvent\('switchloading'\)/)
  assert.match(dispatchPage, /onSwitchLoading:\s*function[\s\S]*innerCurrent:\s*1/)
  assert.match(dispatchView, /bind:switchloading="onSwitchLoading"/)
})

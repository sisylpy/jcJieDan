import assert from 'node:assert/strict'
import fs from 'node:fs'
import test from 'node:test'

const cardView = fs.readFileSync(
  'subPackage-routeDispatch/components/driver-route-card/driver-route-card.wxml',
  'utf8'
)

test('配送中卡片只用Server实际出发时间，不用建议时间冒充', () => {
  assert.match(cardView, /variant === 'delivery' \? '实际出发' : '建议出发'/)
  assert.match(cardView,
    /variant === 'delivery' \? \(card\.actualDepartLabel \|\| '—'\) : \(card\.plannedDepartLabel \|\| '—'\)/)
})

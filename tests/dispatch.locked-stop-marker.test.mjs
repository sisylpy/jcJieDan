import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const helperPath = path.join(
  root,
  'subPackage-routeDispatch/pages/routeDispatch/_planningLocks.js'
)
const sandboxPath = path.join(
  root,
  'subPackage-routeDispatch/pages/bossTab/sandbox/sandbox.js'
)
const cardBase = path.join(
  root,
  'subPackage-routeDispatch/components/store-stop-card/store-stop-card'
)

function loadDecorator() {
  const source = fs.readFileSync(helperPath, 'utf8')
    .replace(/\bexport\s+function\s+decoratePlanningLocks/, 'function decoratePlanningLocks')
  const context = vm.createContext({ Object, Array, String })
  new vm.Script(source + '\nthis.decoratePlanningLocks = decoratePlanningLocks').runInContext(context)
  return context.decoratePlanningLocks
}

test('沙箱只按Server stopLocks事实标记路线客户和未分派客户', () => {
  const decoratePlanningLocks = loadDecorator()
  const original = {
    planning: {
      stopLocks: [{
        depFatherId: 201,
        driverUserId: 56,
        driverName: '56司机',
        warning: ''
      }]
    },
    sections: [
      {
        cards: [{
          cardType: 'DRIVER_ROUTE',
          driverUserId: 56,
          timeline: [
            { type: 'stop', depFatherId: 201, customerName: '送单味百味-1' },
            { type: 'stop', depFatherId: 202, customerName: '未锁客户' }
          ]
        }]
      },
      {
        cards: [{ cardType: 'UNASSIGNED_CUSTOMER', departmentId: 201 }]
      }
    ]
  }

  const result = decoratePlanningLocks(original)
  const lockedRouteStop = result.sections[0].cards[0].timeline[0]
  const ordinaryRouteStop = result.sections[0].cards[0].timeline[1]
  const lockedUnassignedStop = result.sections[1].cards[0]

  assert.equal(lockedRouteStop.driverLocked, true)
  assert.equal(lockedRouteStop.lockedDriverUserId, 56)
  assert.equal(lockedRouteStop.lockedDriverName, '56司机')
  assert.equal(lockedRouteStop.driverLockLabel, '本次锁定：56司机')
  assert.equal(ordinaryRouteStop.driverLocked, undefined,
    '不能根据客户当前位于某条司机路线而推断为锁定')
  assert.equal(lockedUnassignedStop.driverLocked, true,
    '即使锁定客户暂时出现在未分派区，也必须显示Server锁定事实')
  assert.equal(original.sections[0].cards[0].timeline[0].driverLocked, undefined,
    '页面装饰不能回写原始Server对象')
})

test('长期绑定使用明确文案并与普通当次锁定区分', () => {
  const decoratePlanningLocks = loadDecorator()
  const page = {
    planning: {
      stopLocks: [{
        depFatherId: 201,
        driverUserId: 56,
        driverName: '56司机',
        lockType: 'LONG_TERM',
        longTerm: true
      }]
    },
    sections: [{
      cards: [{
        timeline: [{ type: 'stop', depFatherId: 201, customerName: '米线李' }]
      }]
    }]
  }

  const stop = decoratePlanningLocks(page).sections[0].cards[0].timeline[0]
  assert.equal(stop.driverLocked, true)
  assert.equal(stop.longTermDriverBound, true)
  assert.equal(stop.driverLockLabel, '长期绑定：56司机')
})

test('没有Server stopLocks时不产生任何锁定标识', () => {
  const decoratePlanningLocks = loadDecorator()
  const page = {
    planning: { stopLocks: [] },
    sections: [{
      cards: [{
        cardType: 'DRIVER_ROUTE',
        driverUserId: 56,
        timeline: [{ type: 'stop', depFatherId: 201 }]
      }]
    }]
  }
  assert.equal(decoratePlanningLocks(page), page)
  assert.equal(page.sections[0].cards[0].timeline[0].driverLocked, undefined)
})

test('pages/dispatch沙箱链路渲染醒目的司机锁定标识', () => {
  const sandboxSource = fs.readFileSync(sandboxPath, 'utf8')
  const wxml = fs.readFileSync(cardBase + '.wxml', 'utf8')
  const wxss = fs.readFileSync(cardBase + '.wxss', 'utf8')

  assert.match(sandboxSource, /decoratePlanningLocks\(pageViewModel\)/)
  assert.match(wxml, /boss-stop-driver-lock-badge/)
  assert.match(wxml, /stop\.driverLockLabel \|\| '已锁定司机'/)
  assert.match(wxml, /今天已锁定/)
  assert.match(wxml, /长期已绑定/)
  assert.match(wxml, /双重锁定/)
  assert.match(wxml, /本次锁定：/)
  assert.match(wxml, /长期绑定：/)
  assert.match(wxml, /boss-stop-driver-lock-badge-long-term/)
  assert.match(wxml, /锁定司机/)
  assert.match(wxml, /boss-timeline-stop-card-locked/)
  assert.match(wxss, /\.boss-timeline-stop-card-locked/)
  assert.match(wxss, /\.boss-stop-driver-lock-badge/)
})

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import vm from 'node:vm'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pageBase = path.join(root,
  'subPackage-routeDispatch/pages/routeDispatch/driverRouteEdit/driverRouteEdit')
const pageSource = fs.readFileSync(pageBase + '.js', 'utf8')
const pageWxml = fs.readFileSync(pageBase + '.wxml', 'utf8')
const apiSource = fs.readFileSync(path.join(root, 'lib/apiRouteDispatch.js'), 'utf8')

test('锁定司机弹窗明确区分仅今天锁定和长期锁定', () => {
  assert.match(pageSource, /lockDispatchStopDriver/)
  assert.match(pageSource, /unlockDispatchStopDriver/)
  assert.match(pageSource, /bindCustomerLongTermDriver/)
  assert.match(pageSource, /unbindCustomerLongTermDriver/)
  assert.match(pageSource, /submitTodayDriverLock/)
  assert.match(pageSource, /确认改绑常送司机/)
  assert.match(pageSource, /取消今天锁定/)
  assert.match(pageSource, /取消长期绑定/)
  assert.match(pageSource, /历史操作记录仍会保留/)
  assert.match(pageWxml, /仅今天锁定/)
  assert.match(pageWxml, /onConfirmTodayDriverLock/)
  assert.match(pageWxml, /确认今天锁定给/)
  assert.match(pageWxml, /长期锁定/)
  assert.match(pageWxml, /明天自动恢复/)
  assert.match(pageWxml, /长期关系不会改变/)
  assert.match(pageWxml, /当前长期绑定/)
  assert.match(pageWxml, /当前路线司机/)
  assert.match(pageWxml, /点击下方司机可以改绑/)
})

test('长期绑定接口独立于当次派单锁定接口', () => {
  assert.match(apiSource,
    /dispatch\/planning\/customer-driver-bindings\/bind/)
  assert.match(apiSource,
    /dispatch\/planning\/customer-driver-bindings\/unbind/)
  assert.match(apiSource, /export const bindCustomerLongTermDriver/)
  assert.match(apiSource, /export const unbindCustomerLongTermDriver/)
})

test('今天或长期锁定变更后都使用Server返回的新沙箱凭据刷新路线', () => {
  let shownModal = null
  const runnableSource = pageSource.replace(
    /^import[\s\S]*?from\s+['"][^'"]+['"]\s*$/gm,
    ''
  )
  const context = vm.createContext({
    console,
    Promise,
    Date,
    Math,
    JSON,
    Number,
    String,
    Object,
    Array,
    setTimeout() { return 1 },
    clearTimeout() {},
    require: specifier => specifier.includes('timeWindowModal')
      ? { buildTimeWindowRequest() { return {} } }
      : { showLoading() {}, hideLoading() {} },
    getApp: () => ({ globalData: {} }),
    Page: config => { context.pageConfig = config },
    getPageViewModel(data) { return data && data.pageViewModel },
    wx: {
      showModal(options) { shownModal = options },
      showToast() {}
    }
  })
  new vm.Script(runnableSource, { filename: pageBase + '.js' }).runInContext(context)

  const routePayload = {
    driverUserId: 314,
    canonicalSandboxVersion: 'SANDBOX_V1:1:fresh',
    sandboxEditCredential: 'fresh-route-credential',
    sandboxStateFingerprint: 'fresh'
  }
  const found = context.findDriverRouteEditRefreshPayload({
    pageViewModel: {
      sections: [{
        cards: [{
          cardType: 'DRIVER_ROUTE',
          driverUserId: 314,
          routeEditAction: { enabled: true, payload: routePayload }
        }]
      }],
      availableDrivers: []
    }
  }, 314)
  assert.equal(found.canonicalSandboxVersion, 'SANDBOX_V1:1:fresh')
  assert.equal(found.sandboxEditCredential, 'fresh-route-credential')
  assert.notEqual(found, routePayload, '刷新参数必须复制，不能修改Server响应对象')
  assert.equal(context.isLongTermPlanningLock({ lockType: 'LONG_TERM' }), true)
  assert.equal(context.isLongTermPlanningLock({ lockType: 'TODAY' }), false)
  assert.equal(context.defaultDriverLockMode({ driverUserId: 56 }, null), 'TODAY')
  assert.equal(context.defaultDriverLockMode(null, { driverUserId: 56 }), 'LONG_TERM')
  assert.equal(context.defaultDriverLockMode(null, null), '')
  assert.equal(context.upgradesTodayLockToLongTerm(
    { todayLock: { driverUserId: 56 } }, { driverUserId: 56 }, false), true)
  assert.equal(context.upgradesTodayLockToLongTerm(
    { todayLock: { driverUserId: 56 } }, { driverUserId: 314 }, false), false)
  assert.match(pageSource, /现有今天锁定会自动升级为长期锁定/)
  assert.match(pageSource, /unlockDispatchStopDriver\(todayUnlockRequest\)/)

  const page = {
    data: {
      longTermBindingSubmitting: false,
      driverLockMode: '',
      longTermBindingDrivers: [{ driverUserId: 56, driverName: '56司机666' }],
      longTermBindingTarget: {
        customerName: '米线李',
        currentRouteDriverUserId: 56,
        currentRouteDriverName: '56司机666',
        todayLock: null
      }
    },
    confirmTodayDriverLock: context.pageConfig.confirmTodayDriverLock,
    setData(patch) { Object.assign(this.data, patch) }
  }
  context.pageConfig.onDriverLockModeTap.call(page, {
    currentTarget: { dataset: { mode: 'TODAY' } }
  })
  assert.equal(page.data.driverLockMode, 'TODAY')
  context.pageConfig.onConfirmTodayDriverLock.call(page)
  assert.equal(shownModal.title, '确认仅今天锁定？')
  assert.equal(shownModal.confirmText, '锁定今天')
  assert.ok([...shownModal.confirmText].length <= 4,
    '微信 showModal 的 confirmText 最多允许 4 个汉字')
  assert.match(shownModal.content, /56司机666/)

  assert.match(pageSource,
    /refreshAfterDriverLockChange\(\s*res\.result\.data, successMessage, routeOwnerChanged\)/)
  assert.match(pageSource, /postDriverRouteEditPage\(nextPayload\)/)
  assert.doesNotMatch(pageSource,
    /已设置常送司机'[\s\S]{0,500}that\.loadPage\(\)/,
    '绑定成功后不能再用首次打开时的旧凭据加载页面')
})

test('锁定客户后保留老板当前删除、增加和排序的路线', async () => {
  let appliedOptions = null
  let markedChanged = false
  let toastTitle = ''
  const runnableSource = pageSource.replace(
    /^import[\s\S]*?from\s+['"][^'"]+['"]\s*$/gm,
    ''
  )
  const freshEditPage = {
    stopKeys: ['dep:1', 'dep:2'],
    routeStops: [
      { stopKey: 'dep:1', customerName: '原来已删除客户' },
      { stopKey: 'dep:2', customerName: '保留客户' }
    ],
    addableStops: [{ stopKey: 'dep:3', customerName: '老板新增客户' }]
  }
  const context = vm.createContext({
    console,
    Promise,
    Date,
    Math,
    JSON,
    Number,
    String,
    Object,
    Array,
    setTimeout() { return 1 },
    clearTimeout() {},
    require: specifier => specifier.includes('timeWindowModal')
      ? { buildTimeWindowRequest() { return {} } }
      : { showLoading() {}, hideLoading() {} },
    getApp: () => ({ globalData: {} }),
    Page: config => { context.pageConfig = config },
    getPageViewModel(data) { return data && data.pageViewModel },
    postDriverRouteEditPage() {
      return Promise.resolve({ result: { code: 0, data: { pageViewModel: freshEditPage } } })
    },
    wx: {
      showToast(options) { toastTitle = options.title },
      navigateBack() {}
    }
  })
  new vm.Script(runnableSource, { filename: pageBase + '.js' }).runInContext(context)

  const page = {
    data: {
      stopKeys: ['dep:2', 'dep:3'],
      stopMap: {
        'dep:2': { stopKey: 'dep:2', customerName: '保留客户' },
        'dep:3': { stopKey: 'dep:3', customerName: '老板新增客户' }
      },
      pageViewModel: { driver: { driverUserId: 56 } },
      requestPayload: { driverUserId: 56 },
      longTermBindingSubmitting: true
    },
    refreshWholeSandboxPage() {},
    applyPageViewModel(data, options) {
      appliedOptions = options
      if (options && options.afterApply) options.afterApply(data.pageViewModel)
    },
    markRouteChanged() { markedChanged = true },
    setData(patch, callback) {
      Object.assign(this.data, patch)
      if (callback) callback()
    }
  }
  const dispatchData = {
    pageViewModel: {
      sections: [{
        cards: [{
          cardType: 'DRIVER_ROUTE',
          driverUserId: 56,
          routeEditAction: {
            enabled: true,
            payload: {
              driverUserId: 56,
              canonicalSandboxVersion: 'SANDBOX_V1:2:fresh',
              sandboxEditCredential: 'fresh-lock-credential',
              sandboxStateFingerprint: 'fresh-lock-state'
            }
          }
        }]
      }],
      availableDrivers: []
    }
  }

  await context.pageConfig.refreshAfterDriverLockChange.call(
    page, dispatchData, '今天司机已锁定', false)

  assert.deepEqual(Array.from(page.data.stopKeys), ['dep:2', 'dep:3'])
  assert.deepEqual(Array.from(page._pendingRemovedStopKeys), ['dep:1'])
  assert.ok(page._pendingRemovalCommandId)
  assert.equal(appliedOptions.keepStopKeys, true)
  assert.equal(markedChanged, true)
  assert.match(toastTitle, /已保留当前路线/)
})

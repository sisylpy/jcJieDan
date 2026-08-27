import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pageBase = path.join(
  root,
  'subPackage-routeDispatch/pages/routeDispatch/driverRouteEdit/driverRouteEdit'
);
const pageSource = fs.readFileSync(pageBase + '.js', 'utf8');
const wxml = fs.readFileSync(pageBase + '.wxml', 'utf8');
const apiSource = fs.readFileSync(path.join(root, 'lib/apiRouteDispatch.js'), 'utf8');

function jsonCopy(value) {
  return JSON.parse(JSON.stringify(value));
}

function evaluateDriverRouteEditPage() {
  const previewRequests = [];
  const confirmRequests = [];
  const runnableSource = pageSource.replace(
    /^import[\s\S]*?from\s+['"][^'"]+['"]\s*$/gm,
    ''
  );
  const okPageResponse = () => Promise.resolve({
    result: {
      code: 0,
      data: {
        pageViewModel: {
          stopKeys: [],
          routeStops: [],
          actions: { confirmEnabled: true },
          timeline: []
        }
      }
    }
  });
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
    setTimeout: () => 1,
    clearTimeout() {},
    require: specifier => specifier.includes('timeWindowModal')
      ? { buildTimeWindowRequest() { return {}; } }
      : { showLoading() {}, hideLoading() {} },
    getApp: () => ({ globalData: { navBarHeight: 44, rpxR: 2 } }),
    Page: config => { context.pageConfig = config; },
    postDriverRouteEditPage: okPageResponse,
    postDriverRouteEditPreview(payload) {
      previewRequests.push(jsonCopy(payload));
      return okPageResponse();
    },
    postDriverRouteExpansionPreview: okPageResponse,
    postDriverRouteEditConfirm(payload) {
      confirmRequests.push(jsonCopy(payload));
      return Promise.resolve({ result: { code: 0, data: { routeDeleted: true } } });
    },
    returnSandboxStopToSandbox: okPageResponse,
    overrideSandboxStopTimeWindow: okPageResponse,
    lockDispatchStopDriver: okPageResponse,
    unlockDispatchStopDriver: okPageResponse,
    getPageViewModel(data) { return data && data.pageViewModel; },
    normalizeMapOverview(value) { return value; },
    resolveSession() { return { disId: 56, operatorUserId: 99 }; },
    wx: {
      showToast() {},
      showModal() {},
      navigateBack() {},
      getStorageSync() { return null; },
      removeStorageSync() {}
    }
  });
  new vm.Script(runnableSource, { filename: pageBase + '.js' }).runInContext(context);
  assert.ok(context.pageConfig, '路线编辑Page必须成功注册');
  return { config: context.pageConfig, previewRequests, confirmRequests };
}

function pageInstance(config) {
  const stop = {
    stopKey: 'dep:1540',
    departmentId: 1540,
    customerName: '孙胖子',
    locked: false
  };
  const page = Object.assign({}, config, {
    data: Object.assign({}, config.data, {
      requestPayload: {
        disId: 56,
        driverUserId: 314,
        operatorUserId: 99,
        routeDate: '2026-08-26',
        batchCode: 'MORNING',
        sourcePage: 'DISPATCH_SANDBOX',
        previewPath: '/api/nxdisroutedispatch/sandbox/driver-route-edit/preview',
        confirmPath: '/api/nxdisroutedispatch/sandbox/driver-route-edit/confirm'
      },
      pageViewModel: {
        removeStopMode: 'LOCAL',
        actions: { confirmEnabled: true }
      },
      stopKeys: ['dep:1540'],
      stopMap: { 'dep:1540': stop },
      routeStops: [stop],
      confirmReady: true,
      previewing: false,
      confirming: false
    })
  });
  page.setData = function (update, callback) {
    Object.assign(this.data, update);
    if (typeof callback === 'function') callback.call(this);
  };
  return page;
}

test('真实页面删除最后一家使用明确删除命令，confirm仍提交空stopKeys', async () => {
  const { config, previewRequests, confirmRequests } = evaluateDriverRouteEditPage();
  const page = pageInstance(config);
  assert.deepEqual(jsonCopy(page.data.stopKeys), ['dep:1540'], '初始路线必须只有一个stopKey');

  page.onRemoveStop({ currentTarget: { dataset: { index: 0 } } });
  assert.deepEqual(jsonCopy(page.data.stopKeys), [], '删除最后一家后页面stopKeys必须为空数组');

  await page.previewPage({ silent: true });
  assert.equal(previewRequests.length, 1, '必须实际进入preview请求');
  assert.ok(Object.hasOwn(previewRequests[0], 'stopKeys'), 'preview JSON必须包含stopKeys字段');
  assert.deepEqual(previewRequests[0].stopKeys, []);
  assert.match(JSON.stringify(previewRequests[0]), /"stopKeys":\[\]/);
  assert.deepEqual(previewRequests[0].removedStopKeys, ['dep:1540'],
    '只有明确点击删除才发送removedStopKeys');
  assert.match(previewRequests[0].removalCommandId, /^owner-remove-/,
    '明确删除必须携带独立命令标识');

  page.setData({ confirmReady: true, confirming: false });
  page.onBottomConfirm();
  assert.equal(confirmRequests.length, 1, '必须实际进入confirm请求');
  assert.ok(Object.hasOwn(confirmRequests[0], 'stopKeys'), 'confirm JSON必须包含stopKeys字段');
  assert.deepEqual(confirmRequests[0].stopKeys, []);
  assert.match(JSON.stringify(confirmRequests[0]), /"stopKeys":\[\]/);
  assert.equal(Object.hasOwn(confirmRequests[0], 'removedStopKeys'), false,
    '删除证据由Server preview保存，confirm不得重复伪造');
  assert.equal(Object.hasOwn(confirmRequests[0], 'removalCommandId'), false);

  await Promise.resolve();
});

test('postDriverRouteEditConfirm字段过滤保留空stopKeys', async () => {
  let sentOptions = null;
  const runnableApi = apiSource
    .replace(/^import apiUrl from ['"][^'"]+['"]\s*$/m, "var apiUrl = { apiUrl: 'https://unit.test/' }")
    .replace(/\bexport\s+const\s+/g, 'var ')
    .replace(/\bexport\s+function\s+/g, 'function ');
  const context = vm.createContext({
    console,
    Promise,
    Date,
    JSON,
    Object,
    String,
    Number,
    Array,
    encodeURIComponent,
    wx: {
      getStorageSync(key) { return key === 'dispatchAccessToken' ? 'unit-token' : null; },
      setStorageSync() {},
      removeStorageSync() {}
    },
    getApp: () => ({
      ownerRequest(options) {
        sentOptions = options;
        options.success({ statusCode: 200, data: { code: 0, data: {} } });
      }
    })
  });
  new vm.Script(runnableApi, { filename: 'lib/apiRouteDispatch.js' }).runInContext(context);
  assert.equal(typeof context.postDriverRouteEditConfirm, 'function');

  await context.postDriverRouteEditConfirm({
    disId: 56,
    driverUserId: 314,
    previewToken: 'preview-token',
    confirmPath: '/api/nxdisroutedispatch/sandbox/driver-route-edit/confirm',
    stopKeys: []
  });

  assert.ok(sentOptions, '实际API封装必须发起ownerRequest');
  assert.equal(sentOptions.method, 'POST');
  assert.ok(Object.hasOwn(sentOptions.data, 'stopKeys'), '字段过滤后仍必须存在stopKeys');
  assert.deepEqual(jsonCopy(sentOptions.data.stopKeys), []);
  assert.match(JSON.stringify(sentOptions.data), /"stopKeys":\[\]/);
  assert.equal(Object.hasOwn(sentOptions.data, 'confirmPath'), false, '仅路径字段应被过滤');
});

test('空路线页面仍允许预览确认并明确删除语义', () => {
  const previewHandler = pageSource.match(/previewPage:\s*function[\s\S]*?markRouteChanged:\s*function/);
  assert.ok(previewHandler, '必须保留路线预览入口');
  assert.doesNotMatch(previewHandler[0], /请至少添加一个客户|stopKeys\.length\)\s*\{[\s\S]*?return/,
    '空路线不能在小程序拦截');
  assert.match(pageSource, /if \(data\.routeDeleted\)/, '确认后必须处理路线已删除结果');
  assert.match(wxml, /actions\.confirmWillDeleteRoute \? '删除这条路线'/,
    '确认按钮必须明确表达删除路线');
  assert.match(wxml, /客户保留在本轮待分配/, '页面必须说明客户回到待分配');
});

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
const source = fs.readFileSync(pageBase + '.js', 'utf8');
const wxml = fs.readFileSync(pageBase + '.wxml', 'utf8');
const apiSource = fs.readFileSync(path.join(root, 'lib/apiRouteDispatch.js'), 'utf8');

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function proposal(overrides = {}) {
  return Object.assign({
    proposalId: 'proposal-1',
    previewToken: 'preview-1',
    candidatePolicy: 'UNASSIGNED_ONLY',
    routeEndType: 'END_AT_LAST_STOP',
    routeEndLabel: '预计完成',
    preservedStopKeys: ['dep:1'],
    proposedStopKeys: ['dep:1', 'dep:2'],
    addedStops: [{ stopKey: 'dep:2', departmentId: 2, customerName: '新饭店' }],
    notSelectedStops: [],
    addedStopCount: 1,
    beforeMetrics: {
      totalRoadDistanceM: 10000,
      totalDriveDurationS: 1800,
      totalWaitingDurationS: 300,
      activeRouteDurationS: 3600,
      plannedRouteFinishAt: '2026-08-27T08:00:00+08:00'
    },
    afterMetrics: {
      totalRoadDistanceM: 15000,
      totalDriveDurationS: 2400,
      totalWaitingDurationS: 360,
      activeRouteDurationS: 5400,
      plannedRouteFinishAt: '2026-08-27T08:30:00+08:00'
    },
    constraints: {
      scope: 'TOTAL_ROUTE',
      effective: {
        maxActiveRouteDurationS: 10800,
        latestRouteFinishAt: '2026-08-27T10:30:00+08:00',
        maxRoadDistanceM: 30000,
        maxAddedStops: 3
      }
    }
  }, overrides);
}

function pageVm(overrides = {}) {
  return Object.assign({
    pageTitle: '编辑司机路线',
    routeDate: '2026-08-27',
    batchCode: 'MORNING',
    previewToken: 'preview-1',
    canExpandRoute: true,
    expandDisabledReasonCode: null,
    expandDisabledMessage: null,
    candidatePolicy: 'UNASSIGNED_ONLY',
    expansionConstraintDefaults: {
      source: 'NONE',
      maxActiveRouteDurationS: null,
      latestRouteFinishAt: null,
      maxRoadDistanceM: null,
      maxAddedStops: null
    },
    returnToDepotRequired: false,
    routeEndType: 'END_AT_LAST_STOP',
    routeEndLabel: '预计完成',
    currentRouteFinishAt: '2026-08-27T08:00:00+08:00',
    driver: { driverUserId: 314, driverName: '测试司机' },
    routeStops: [{ stopKey: 'dep:1', departmentId: 1, customerName: '原饭店' }],
    stopKeys: ['dep:1'],
    timeline: [],
    planning: { stopLocks: [] },
    actions: { confirmEnabled: true }
  }, overrides);
}

function loadPage(overrides = {}) {
  let registered;
  const calls = { toast: [], expansion: [], preview: [] };
  const expansionImpl = overrides.expansion || (payload => Promise.resolve({
    result: { code: 0, data: proposal() }
  }));
  const previewImpl = overrides.preview || (payload => Promise.resolve({
    result: { code: 0, data: { pageViewModel: pageVm({ stopKeys: payload.stopKeys }) } }
  }));
  const runnable = source.replace(/^import[\s\S]*?from\s+['"][^'"]+['"]\s*$/gm, '');
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
    setTimeout: overrides.setTimeout || (() => 1),
    clearTimeout() {},
    require: specifier => specifier.includes('timeWindowModal')
      ? { buildTimeWindowRequest() { return {}; } }
      : { showLoading() {}, hideLoading() {} },
    getApp: () => ({ globalData: { navBarHeight: 44, rpxR: 2 } }),
    Page: config => { registered = config; },
    wx: {
      showToast(options) { calls.toast.push(options); },
      showModal() {},
      navigateBack() {},
      getStorageSync() { return null; },
      removeStorageSync() {}
    },
    postDriverRouteEditPage: () => Promise.resolve({ result: { code: 0, data: { pageViewModel: pageVm() } } }),
    postDriverRouteEditPreview(payload) {
      calls.preview.push(clone(payload));
      return previewImpl(payload);
    },
    postDriverRouteExpansionPreview(payload) {
      calls.expansion.push(clone(payload));
      return expansionImpl(payload);
    },
    postDriverRouteEditConfirm: () => Promise.resolve({ result: { code: 0, data: {} } }),
    returnSandboxStopToSandbox: () => Promise.resolve({ result: { code: 0, data: {} } }),
    overrideSandboxStopTimeWindow: () => Promise.resolve({ result: { code: 0, data: {} } }),
    lockDispatchStopDriver: () => Promise.resolve({ result: { code: 0, data: {} } }),
    unlockDispatchStopDriver: () => Promise.resolve({ result: { code: 0, data: {} } }),
    getPageViewModel: data => data && data.pageViewModel ? data.pageViewModel : data,
    normalizeMapOverview: value => value,
    resolveSession: () => ({ disId: 56, operatorUserId: 99 })
  });
  new vm.Script(runnable, { filename: pageBase + '.js' }).runInContext(context);
  assert.ok(registered, '路线编辑 Page 必须成功注册');
  const page = {};
  for (const [key, value] of Object.entries(registered)) {
    if (key !== 'data') page[key] = typeof value === 'function' ? value.bind(page) : value;
  }
  page.data = clone(registered.data);
  page.setData = function (patch, callback) {
    Object.assign(page.data, patch || {});
    if (callback) callback();
  };
  page.data.requestPayload = {
    disId: 56,
    routeDate: '2026-08-27',
    batchCode: 'MORNING',
    driverUserId: 314,
    routeResourceType: 'DISPATCH_SANDBOX',
    sandboxEditCredential: 'opaque-credential',
    canonicalSandboxVersion: 'canonical-v1',
    sandboxStateFingerprint: 'fingerprint-v1',
    operatorUserId: 999,
    candidatePolicy: 'SANDBOX_REBALANCE',
    returnToDepot: true,
    employmentType: 'FULL_TIME'
  };
  page.applyPageViewModel({ pageViewModel: pageVm(overrides.vm || {}) });
  return { page, calls };
}

function loadApi(responseOverride) {
  const requests = [];
  const runnable = apiSource
    .replace(/^import[^\n]+$/gm, '')
    .replace(/export\s+const\s+/g, 'const ')
    .replace(/export\s+function\s+/g, 'function ')
    + '\n;globalThis.__api = { postDriverRouteExpansionPreview };';
  const context = vm.createContext({
    console,
    Promise,
    Date,
    Error,
    encodeURIComponent,
    apiUrl: { apiUrl: 'https://example.invalid/api/' },
    wx: {
      getStorageSync(key) { return key === 'dispatchAccessToken' ? 'test-token' : ''; },
      setStorageSync() {},
      removeStorageSync() {}
    },
    getApp: () => ({
      ownerRequest(options) {
        requests.push(clone(options));
        options.success(responseOverride || { statusCode: 200, data: { code: 0, data: {} } });
      }
    })
  });
  new vm.Script(runnable, { filename: 'lib/apiRouteDispatch.js' }).runInContext(context);
  return { api: context.__api, requests };
}

test('1. 页面只保留一个统一 AI 增补入口', () => {
  assert.equal((wxml.match(/AI补充饭店部门/g) || []).length, 1);
  assert.doesNotMatch(wxml, /按时间补充|按距离补充/);
});

test('2. AI 增补能力完全服从 Server', () => {
  const { page, calls } = loadPage({
    vm: { canExpandRoute: false, expandDisabledMessage: '配送中不可增补' }
  });
  page.onAiExpandRoute();
  assert.equal(page.data.expansionConditionsVisible, false);
  assert.equal(calls.toast.at(-1).title, '配送中不可增补');
  assert.doesNotMatch(wxml, /wx:if="\{\{!pageViewModel\.manualDispatchMode\}\}"[^>]*class="route-expansion/);
});

test('3. 装车、配送和历史路线都显示 Server 禁用原因', () => {
  for (const reason of ['装车中不可增补', '配送中不可增补', '历史路线不可增补']) {
    const { page } = loadPage({ vm: { canExpandRoute: false, expandDisabledMessage: reason } });
    assert.equal(page.data.expansionCapability.enabled, false);
    assert.equal(page.data.expansionCapability.message, reason);
  }
});

test('4. candidatePolicy 缺失或不兼容时第一版失败关闭', () => {
  for (const candidatePolicy of [undefined, 'SANDBOX_REBALANCE']) {
    const { page } = loadPage({ vm: { candidatePolicy } });
    assert.equal(page.data.expansionCapability.enabled, false);
    assert.equal(page.data.expansionCapability.reasonCode, 'ROUTE_EXPANSION_CLIENT_CONTRACT_MISMATCH');
  }
});

test('5. 前三项能力约束至少填写一项', async () => {
  const { page, calls } = loadPage();
  page.data.expansionForm = { durationHours: '', durationMinutes: '', latestFinishTime: '', maxRoadDistanceKm: '', maxAddedStops: '' };
  await page.onGenerateExpansionSuggestion();
  assert.match(page.data.expansionConstraintError, /至少填写一项/);
  assert.equal(calls.expansion.length, 0);
});

test('6. maxAddedStops 不能单独提交', async () => {
  const { page, calls } = loadPage();
  page.data.expansionForm = { durationHours: '', durationMinutes: '', latestFinishTime: '', maxRoadDistanceKm: '', maxAddedStops: '2' };
  await page.onGenerateExpansionSuggestion();
  assert.equal(calls.expansion.length, 0);
  assert.match(page.data.expansionConstraintError, /至少填写一项/);
});

test('7. 3小时精确转换为10800秒', async () => {
  const { page, calls } = loadPage();
  page.data.expansionForm = { durationHours: '3', durationMinutes: '0', latestFinishTime: '', maxRoadDistanceKm: '', maxAddedStops: '' };
  await page.onGenerateExpansionSuggestion();
  assert.equal(calls.expansion[0].maxActiveRouteDurationS, 10800);
});

test('8. 公里精确转换为整数米', async () => {
  const { page, calls } = loadPage();
  page.data.expansionForm = { durationHours: '', durationMinutes: '', latestFinishTime: '', maxRoadDistanceKm: '30.125', maxAddedStops: '' };
  await page.onGenerateExpansionSuggestion();
  assert.equal(calls.expansion[0].maxRoadDistanceM, 30125);
});

test('9. 最晚完成时间使用routeDate和+08:00，不转UTC日期', async () => {
  const { page, calls } = loadPage();
  page.data.expansionForm = { durationHours: '', durationMinutes: '', latestFinishTime: '10:30', maxRoadDistanceKm: '', maxAddedStops: '' };
  await page.onGenerateExpansionSuggestion();
  assert.equal(calls.expansion[0].latestRouteFinishAt, '2026-08-27T10:30:00+08:00');
  assert.doesNotMatch(source, /toISOString\s*\(/);
});

test('10. API 过滤空字段和客户端无权字段', async () => {
  const { api, requests } = loadApi();
  await api.postDriverRouteExpansionPreview({
    disId: 56,
    routeDate: '2026-08-27',
    batchCode: 'MORNING',
    driverUserId: 314,
    previewToken: 'preview-1',
    maxActiveRouteDurationS: 10800,
    latestRouteFinishAt: '',
    maxRoadDistanceM: null,
    maxAddedStops: undefined,
    operatorUserId: 999,
    candidatePolicy: 'SANDBOX_REBALANCE',
    returnToDepot: true,
    employmentType: 'FULL_TIME'
  });
  assert.deepEqual(Object.keys(requests[0].data).sort(), [
    'batchCode', 'disId', 'driverUserId', 'maxActiveRouteDurationS', 'previewToken', 'routeDate'
  ]);
});

test('11. sandbox credential、canonical版本和状态指纹不丢失', async () => {
  const { page, calls } = loadPage();
  page.data.expansionForm = { durationHours: '3', durationMinutes: '', latestFinishTime: '', maxRoadDistanceKm: '', maxAddedStops: '' };
  await page.onGenerateExpansionSuggestion();
  assert.equal(calls.expansion[0].sandboxEditCredential, 'opaque-credential');
  assert.equal(calls.expansion[0].canonicalSandboxVersion, 'canonical-v1');
  assert.equal(calls.expansion[0].sandboxStateFingerprint, 'fingerprint-v1');
  assert.equal(calls.expansion[0].routeResourceType, 'DISPATCH_SANDBOX');
});

test('12. 终点和往返文案只读取Server路线策略', () => {
  const partTime = loadPage({ vm: {
    returnToDepotRequired: false,
    routeEndType: 'END_AT_LAST_STOP',
    routeEndLabel: '预计完成'
  } }).page;
  assert.equal(partTime.data.routeEndPresentation.endLabel, '预计完成');
  assert.equal(partTime.data.routeEndPresentation.distanceScopeLabel, '全程');
  const fullTime = loadPage({ vm: {
    returnToDepotRequired: true,
    routeEndType: 'RETURN_TO_DEPOT',
    routeEndLabel: '预计返仓'
  } }).page;
  assert.equal(fullTime.data.routeEndPresentation.endLabel, '预计返仓');
  assert.equal(fullTime.data.routeEndPresentation.distanceScopeLabel, '往返');
  assert.doesNotMatch(source, /pageViewModel\.employmentType|driver\.employmentType/);
});

test('13. 建议展示before/after、新增数量、完成时间和实际约束', async () => {
  const { page } = loadPage();
  page.data.expansionForm = { durationHours: '3', durationMinutes: '', latestFinishTime: '', maxRoadDistanceKm: '', maxAddedStops: '' };
  await page.onGenerateExpansionSuggestion();
  assert.equal(page.data.expansionReview.addedStopCount, 1);
  assert.ok(page.data.expansionReview.metrics.some(item => item.key === 'active'));
  assert.ok(page.data.expansionReview.metrics.some(item => item.key === 'distance'));
  assert.ok(page.data.expansionReview.metrics.some(item => item.key === 'finish'));
  assert.equal(page.data.expansionReview.constraints.length, 4);
});

test('14. 无候选时显示正常空状态', async () => {
  const emptyProposal = proposal({ proposedStopKeys: ['dep:1'], addedStops: [], addedStopCount: 0 });
  const { page } = loadPage({ expansion: () => Promise.resolve({ result: { code: 0, data: emptyProposal } }) });
  page.data.expansionForm = { durationHours: '3', durationMinutes: '', latestFinishTime: '', maxRoadDistanceKm: '', maxAddedStops: '' };
  await page.onGenerateExpansionSuggestion();
  assert.equal(page.data.expansionReview.hasAddedStops, false);
  assert.equal(page.data.expansionReview.emptyCandidateMessage, '当前没有真正未分配且符合条件的饭店部门');
});

test('15. 409清除旧建议并要求刷新，同时保留输入', async () => {
  const error = Object.assign(new Error('沙箱状态已变化，请刷新'), { statusCode: 409, errorCode: 'ROUTE_EXPANSION_PROPOSAL_STALE' });
  const { page } = loadPage({ expansion: () => Promise.reject(error) });
  page.data.expansionForm = { durationHours: '3', durationMinutes: '0', latestFinishTime: '', maxRoadDistanceKm: '', maxAddedStops: '2' };
  await page.onGenerateExpansionSuggestion();
  assert.equal(page.data.expansionProposal, null);
  assert.equal(page.data.expansionNeedsRefresh, true);
  assert.equal(page.data.expansionForm.durationHours, '3');
});

test('16. 422 baseline超限保留输入便于调整', async () => {
  const error = Object.assign(new Error('当前路线已超过限制'), { statusCode: 422, errorCode: 'ROUTE_EXPANSION_BASELINE_EXCEEDS_CONSTRAINT' });
  const { page } = loadPage({ expansion: () => Promise.reject(error) });
  page.data.expansionForm = { durationHours: '1', durationMinutes: '', latestFinishTime: '', maxRoadDistanceKm: '', maxAddedStops: '' };
  await page.onGenerateExpansionSuggestion();
  assert.equal(page.data.expansionForm.durationHours, '1');
  assert.match(page.data.expansionConstraintError, /超过限制/);
  assert.equal(page.data.expansionNeedsRefresh, false);
});

test('17. Huawei失败只提示道路服务，不展示直线建议', async () => {
  const error = Object.assign(new Error('matrix unavailable'), { statusCode: 503, errorCode: 'ROAD_SERVICE_UNAVAILABLE', provider: 'HUAWEI' });
  const { page, calls } = loadPage({ expansion: () => Promise.reject(error) });
  page.data.expansionForm = { durationHours: '3', durationMinutes: '', latestFinishTime: '', maxRoadDistanceKm: '', maxAddedStops: '' };
  await page.onGenerateExpansionSuggestion();
  assert.equal(page.data.expansionReviewVisible, false);
  assert.equal(calls.toast.at(-1).title, '道路服务暂不可用，请稍后重试');
  assert.doesNotMatch(wxml, /直线建议|直线距离/);
});

test('18. 重复点击生成被阻止', async () => {
  let resolveRequest;
  const pending = new Promise(resolve => { resolveRequest = resolve; });
  const { page, calls } = loadPage({ expansion: () => pending });
  page.data.expansionForm = { durationHours: '3', durationMinutes: '', latestFinishTime: '', maxRoadDistanceKm: '', maxAddedStops: '' };
  const first = page.onGenerateExpansionSuggestion();
  page.onGenerateExpansionSuggestion();
  assert.equal(calls.expansion.length, 1);
  resolveRequest({ result: { code: 0, data: proposal() } });
  await first;
});

test('19. 采用建议仍进入原route-edit preview/confirm主链', async () => {
  const { page, calls } = loadPage();
  const currentProposal = proposal();
  page.data.expansionProposal = currentProposal;
  page.data.expansionReview = {
    hasAddedStops: true,
    addedStopCount: 1,
    finalStops: [{ stopKey: 'dep:1' }, { stopKey: 'dep:2' }]
  };
  page.data.expansionReviewVisible = true;
  page.onAdoptExpansionProposal();
  assert.equal(calls.preview.length, 1);
  assert.deepEqual(calls.preview[0].stopKeys, ['dep:1', 'dep:2']);
  assert.equal(calls.preview[0].routeExpansionProposalId, 'proposal-1');
  assert.match(wxml, /采用后仍需点击“确认这条路线”/);
  await Promise.resolve();
});

test('20. 普通路线编辑的人工增删、移动和确认保持不变', () => {
  for (const handler of ['onAddStop', 'onRemoveStop', 'onMoveStop', 'onBottomConfirm']) {
    assert.match(source, new RegExp(handler + ':\\s*function'));
  }
  assert.match(source, /postDriverRouteEditPreview\(payload\)/);
  assert.match(source, /postDriverRouteEditConfirm\(payload\)/);
});

test('21. 前端不恢复道路估算或全局TIME-DISTANCE优化模式', () => {
  for (const forbidden of [
    'distanceMeters(',
    'routeCoordinateDistance',
    'optimizeStopOrder',
    'travelMinutesPerMeter',
    'targetRouteMinutes',
    'targetDistanceKm'
  ]) {
    assert.equal(source.includes(forbidden), false, `不得恢复前端道路算法: ${forbidden}`);
  }
});

test('22. 零、负数、非数字和非整数新增数都不发请求', async () => {
  const invalidForms = [
    { durationHours: '0', durationMinutes: '0', latestFinishTime: '', maxRoadDistanceKm: '', maxAddedStops: '' },
    { durationHours: '-1', durationMinutes: '', latestFinishTime: '', maxRoadDistanceKm: '', maxAddedStops: '' },
    { durationHours: 'abc', durationMinutes: '', latestFinishTime: '', maxRoadDistanceKm: '', maxAddedStops: '' },
    { durationHours: '1', durationMinutes: '', latestFinishTime: '', maxRoadDistanceKm: '', maxAddedStops: '1.5' }
  ];
  for (const form of invalidForms) {
    const { page, calls } = loadPage();
    page.data.expansionForm = form;
    await page.onGenerateExpansionSuggestion();
    assert.equal(calls.expansion.length, 0);
    assert.ok(page.data.expansionConstraintError);
  }
});

test('23. 采用阶段409会回滚Boss临时路线并清除过期建议', async () => {
  const error = Object.assign(new Error('建议已过期，请刷新'), {
    statusCode: 409,
    errorCode: 'ROUTE_EXPANSION_PROPOSAL_STALE'
  });
  const { page } = loadPage({ preview: () => Promise.reject(error) });
  page.data.expansionProposal = proposal();
  page.data.expansionReview = { hasAddedStops: true, addedStopCount: 1 };
  page.data.expansionReviewVisible = true;
  page.onAdoptExpansionProposal();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(page.data.stopKeys, ['dep:1']);
  assert.equal(page.data.expansionNeedsRefresh, true);
  assert.equal(page.data.expansionProposal, null);
  assert.equal(page.data.adoptingExpansion, false);
});

test('24. canonical数据重新加载会清除旧建议但保留合法输入', () => {
  const { page } = loadPage();
  page.data.expansionForm = { durationHours: '3', durationMinutes: '15', latestFinishTime: '', maxRoadDistanceKm: '30', maxAddedStops: '2' };
  page.data.expansionProposal = proposal();
  page.data.expansionReview = { hasAddedStops: true };
  page.data.expansionReviewVisible = true;
  page.applyPageViewModel({ pageViewModel: pageVm({ previewToken: 'preview-2' }) });
  assert.equal(page.data.expansionProposal, null);
  assert.equal(page.data.expansionReviewVisible, false);
  assert.equal(page.data.expansionForm.durationHours, '3');
  assert.equal(page.data.requestPayload.previewToken, 'preview-2');
});

test('25. API将HTTP状态和业务错误码传给页面分类处理', async () => {
  const { api } = loadApi({
    statusCode: 409,
    data: { code: 409, errorCode: 'ROUTE_EXPANSION_PROPOSAL_STALE', msg: '建议已过期' }
  });
  await assert.rejects(
    api.postDriverRouteExpansionPreview({
      disId: 56,
      routeDate: '2026-08-27',
      batchCode: 'MORNING',
      driverUserId: 314,
      previewToken: 'preview-1',
      maxActiveRouteDurationS: 10800
    }),
    error => error.statusCode === 409
      && error.errorCode === 'ROUTE_EXPANSION_PROPOSAL_STALE'
      && error.message === '建议已过期'
  );
});

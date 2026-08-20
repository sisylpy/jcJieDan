import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const issuePagePath = path.join(root, 'subPackage/pages/customer/issuePage/issuePage.js');
const issuePageWxmlPath = path.join(root, 'subPackage/pages/customer/issuePage/issuePage.wxml');
const createPagePath = path.join(root, 'subPackage/pages/afterSales/create/create.js');
const createPageWxmlPath = path.join(root, 'subPackage/pages/afterSales/create/create.wxml');
const detailPagePath = path.join(root, 'subPackage/pages/afterSales/detail/detail.js');
const detailPageWxmlPath = path.join(root, 'subPackage/pages/afterSales/detail/detail.wxml');
const storage = new Map();
let pageConfig = null;
let navigatedUrl = '';
let submittedRequest = null;
let navigateBackCount = 0;
let lastToast = '';

const context = vm.createContext({
  console,
  Promise,
  Number,
  String,
  Object,
  Array,
  JSON,
  Date,
  Math,
  setTimeout: fn => { fn(); return 1; },
  clearTimeout() {},
  require: () => ({ showLoading() {}, hideLoading() {} }),
  Page: config => { pageConfig = config; },
  getApp: () => ({
    globalData: { windowWidth: 375, windowHeight: 667, navBarHeight: 44, rpxR: 2 }
  }),
  wx: {
    getStorageSync(key) { return storage.get(key); },
    setStorageSync(key, value) { storage.set(key, value); },
    removeStorageSync(key) { storage.delete(key); },
    showLoading() {},
    hideLoading() {},
    showToast({ title }) { lastToast = title; },
    navigateTo({ url }) { navigatedUrl = url; },
    redirectTo({ url }) { navigatedUrl = url; },
    navigateBack() { navigateBackCount += 1; }
  }
});

function synthetic(identifier, exportsObject) {
  const names = Object.keys(exportsObject);
  return new vm.SyntheticModule(names, function initialize() {
    names.forEach(name => this.setExport(name, exportsObject[name]));
  }, { context, identifier });
}

async function evaluatePage(filePath, imports) {
  pageConfig = null;
  const module = new vm.SourceTextModule(fs.readFileSync(filePath, 'utf8'), {
    context,
    identifier: filePath
  });
  await module.link(async specifier => {
    for (const [suffix, exportsObject] of imports) {
      if (specifier.endsWith(suffix)) return synthetic(specifier, exportsObject);
    }
    throw new Error(`Unexpected import: ${specifier}`);
  });
  await module.evaluate();
  assert.ok(pageConfig, `${path.basename(filePath)} 应注册 Page`);
  return pageConfig;
}

function pageInstance(config, data) {
  return {
    ...config,
    data: { ...config.data, ...data },
    setData(update) { Object.assign(this.data, update); }
  };
}

const issueConfig = await evaluatePage(issuePagePath, [
  ['/apiDepOrder', { getBillApplys() {}, updateOrderReturn() {}, updateBillOrders() {} }],
  ['/apiRouteDispatch', { getDispatchDeliveryToday() {} }]
]);
const issueWxml = fs.readFileSync(issuePageWxmlPath, 'utf8');
assert.doesNotMatch(issueWxml, /after-sales-order-entry/, '商品行不应再单独占位展示售后按钮');
assert.match(issueWxml, /bindtap="createAfterSalesFromOperation"/, '售后入口应放入三点操作菜单');
assert.equal(typeof issueConfig.createAfterSalesFromOperation, 'function');
const createWxml = fs.readFileSync(createPageWxmlPath, 'utf8');
const detailSource = fs.readFileSync(detailPagePath, 'utf8');
const detailWxml = fs.readFileSync(detailPageWxmlPath, 'utf8');
assert.match(createWxml, /issueScope === 'ORDER'/, '整单问题应有独立范围提示');
assert.match(createWxml, /issueScope === 'ITEM'/, '只有商品问题才应显示商品选择');
assert.match(detailWxml, /detail\.orderScoped/, '售后详情应区分整单问题');
assert.match(detailWxml, /detail\.completed && items\.length/, '整单问题不应出现客户商品标准入口');
assert.match(detailSource, /item\.code !== 'REPLENISHMENT'/, '整单问题不应提供商品补货入口');
const historyOrder = {
  nxDepartmentOrdersId: 501,
  nxDoDepartmentId: 21,
  nxDoDepartmentFatherId: 20,
  nxDoDepDisGoodsId: 301,
  nxDoDisGoodsId: 401,
  nxDoGoodsName: '大土豆',
  nxDoWeight: '2',
  nxDoPrintStandard: '斤',
  afterSalesEntryVisible: true,
  afterSalesContext: null
};
const issuePage = pageInstance(issueConfig, {
  bill: { nxDepartmentOrdersEntities: [historyOrder] },
  applyArr: [],
  depName: '测试餐厅',
  item: historyOrder,
  showOperation: true
});
issuePage._refreshAfterSalesContexts = async () => true;
issuePage.hideModal = () => {};
issuePage.createAfterSalesFromOperation();
await Promise.resolve();

assert.equal(navigatedUrl, '../../afterSales/create/create', '未派单订单也应进入售后创建页');
const draft = storage.get('afterSalesCreateDraft');
assert.equal(draft.originalShipmentTaskId, null, '未派单订单的草稿应明确不带配送任务');
assert.equal(draft.anchorHistoryOrderId, 501);
assert.equal(draft.orders.length, 1);
assert.equal(draft.orders[0].selected, true);

navigatedUrl = '';
lastToast = '';
const assignedOrder = {
  ...historyOrder,
  afterSalesTaskContext: { deliveryStopId: 900, delivered: false },
  afterSalesContext: null
};
const assignedPage = pageInstance(issueConfig, {
  bill: { nxDepartmentOrdersEntities: [assignedOrder] },
  applyArr: [],
  depName: '测试餐厅',
  item: assignedOrder,
  showOperation: true
});
assignedPage._refreshAfterSalesContexts = async () => true;
assignedPage.hideModal = () => {};
assignedPage.createAfterSalesFromOperation();
await Promise.resolve();
assert.equal(navigatedUrl, '', '已分派但未送达的订单仍不应进入售后创建页');
assert.equal(lastToast, '配送任务尚未送达');

storage.set('userInfo', {
  nxDistributerUserId: 7,
  nxDistributerEntity: { nxDistributerId: 10 }
});
const createConfig = await evaluatePage(createPagePath, [
  ['/apiDistributer', {
    getAfterSalesDictionaries: async () => ({ result: { code: 0, data: {
      severities: [{ code: 'MEDIUM', label: '中度' }],
      issueTypes: [
        { code: 'QUALITY', label: '品质', scopeMode: 'ITEM' },
        { code: 'LATE_DELIVERY', label: '配送晚到', scopeMode: 'ORDER' },
        { code: 'SERVICE_ATTITUDE', label: '服务态度', scopeMode: 'ORDER' },
        { code: 'OTHER', label: '其他', scopeMode: 'FLEXIBLE' }
      ]
    } } }),
    createDepartmentAfterSales: async request => {
      submittedRequest = request;
      return { result: { code: 0, data: {
        nxDasId: 1,
        items: request.items.length ? [{ nxDasiId: 2 }] : []
      } } };
    },
    uploadDepartmentAfterSalesImage: async () => ({ result: { code: 0 } })
  }]
]);
const createPage = pageInstance(createConfig, {});
createPage.onLoad();
await Promise.resolve();
assert.equal(navigateBackCount, 0, '创建页不应因缺少配送任务而返回');
createPage.setData({ description: '商品有损坏', loading: false });
createPage.save();
await Promise.resolve();
await Promise.resolve();

assert.ok(submittedRequest, '应向后台提交售后请求');
assert.equal('originalShipmentTaskId' in submittedRequest, false, '未派单订单不应伪造配送任务 ID');
assert.equal(submittedRequest.originalHistoryOrderId, 501);
assert.equal(submittedRequest.issueScope, 'ITEM');
assert.equal(submittedRequest.items.length, 1);

storage.set('afterSalesCreateDraft', draft);
submittedRequest = null;
const serviceIssuePage = pageInstance(createConfig, {});
serviceIssuePage.onLoad();
await Promise.resolve();
serviceIssuePage.selectIssueType({ currentTarget: { dataset: { code: 'SERVICE_ATTITUDE' } } });
assert.equal(serviceIssuePage.data.issueScope, 'ORDER', '服务态度应自动设为整单问题');
serviceIssuePage.setData({ description: '送货员服务态度不好', loading: false });
serviceIssuePage.save();
await Promise.resolve();
await Promise.resolve();
assert.ok(submittedRequest, '服务态度问题应可直接提交');
assert.equal(submittedRequest.issueScope, 'ORDER');
assert.equal(submittedRequest.items.length, 0, '整单服务问题不应归到土豆等商品上');
assert.equal(submittedRequest.originalHistoryOrderId, 501);

console.log('PASS after-sales scope: 未派单可提交，商品问题选商品，服务问题记整单');

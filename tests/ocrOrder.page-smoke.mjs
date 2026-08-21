import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pageBase = path.join(root, 'subPackage-order/pages/order/ocrOrder/ocrOrder');
const listBase = path.join(root, 'subPackage-order/components/ocrOrderList/ocrOrderList');
const pastePath = path.join(root, 'subPackage-order/pages/order/paste/paste.js');
const appJsonPath = path.join(root, 'app.json');

function liveEventHandlers(filePath) {
  const source = fs.readFileSync(filePath, 'utf8').replace(/<!--[\s\S]*?-->/g, '');
  const handlers = new Set();
  const eventPattern = /(?:bind|catch)(?::[A-Za-z_$][\w$]*|[A-Za-z_$][\w$]*)\s*=\s*["']([A-Za-z_$][\w$]*)["']/g;
  for (const match of source.matchAll(eventPattern)) {
    if (!['true', 'ture', 'false'].includes(match[1])) handlers.add(match[1]);
  }
  return [...handlers].sort();
}

const pageJson = JSON.parse(fs.readFileSync(pageBase + '.json', 'utf8'));
assert.equal(
  pageJson.usingComponents.ocrOrderList,
  '/subPackage-order/components/ocrOrderList/ocrOrderList',
  '正式页面应继续使用稳定的原组件地址'
);

const context = vm.createContext({
  console,
  Promise,
  Map,
  Set,
  Number,
  String,
  Object,
  Array,
  JSON,
  Date,
  Math,
  setTimeout: () => 1,
  clearTimeout() {},
  setInterval: () => 1,
  clearInterval() {},
  Page: config => { context.pageConfig = config; },
  getApp: () => ({
    globalData: {
      windowWidth: 375,
      windowHeight: 667,
      statusBarHeight: 20,
      navBarHeight: 44,
      rpxR: 2
    }
  }),
  wx: {}
});

function synthetic(identifier, exportsObject) {
  const names = Object.keys(exportsObject);
  return new vm.SyntheticModule(names, function initialize() {
    names.forEach(name => this.setExport(name, exportsObject[name]));
  }, { context, identifier });
}

const pageModule = new vm.SourceTextModule(fs.readFileSync(pageBase + '.js', 'utf8'), {
  context,
  identifier: pageBase + '.js'
});

await pageModule.link(async specifier => {
  if (specifier.endsWith('/load')) {
    return synthetic(specifier, { default: { showLoading() {}, hideLoading() {} } });
  }
  if (specifier.endsWith('/config.js')) return synthetic(specifier, { default: { server: '' } });
  if (specifier.endsWith('/ttsHelper')) return synthetic(specifier, { default: class TTSHelper {} });
  if (specifier.endsWith('/retailPriceLevel')) {
    return synthetic(specifier, { resolveNxDoCostPriceLevel: () => '' });
  }
  if (specifier.endsWith('/apiDepOrder')) {
    return synthetic(specifier, {
      choiceGoodsForApply() {}, updateOrder() {}, deleteTaskOrder() {}, getTaskOrders() {},
      revertTaskOrder() {}, textToSpeech() {}, deleteTaskData() {}, finishTask() {}
    });
  }
  if (specifier.endsWith('/apiDistributer')) {
    return synthetic(specifier, {
      disSaveStandard() {}, queryDisGoodsByQuickSearchWithDepIdCollDis() {}, disDeleteStandard() {}
    });
  }
  if (specifier.endsWith('/apiibook')) {
    return synthetic(specifier, { downDisGoods() {}, disGetGoods() {} });
  }
  throw new Error(`Unexpected import: ${specifier}`);
});

await pageModule.evaluate();
assert.ok(context.pageConfig, '正式 OCR Page 配置应成功注册');
const pageHandlers = liveEventHandlers(pageBase + '.wxml');
for (const handler of pageHandlers) {
  assert.equal(typeof context.pageConfig[handler], 'function', `正式页面事件 ${handler} 必须存在`);
}

const listSource = fs.readFileSync(listBase + '.js', 'utf8');
for (const handler of liveEventHandlers(listBase + '.wxml')) {
  const escaped = handler.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const methodPattern = new RegExp(`(?:^|\\n)\\s*${escaped}\\s*:\\s*(?:async\\s+)?function\\s*\\(`);
  assert.match(listSource, methodPattern, `正式列表组件事件 ${handler} 必须存在`);
}

const pageWxml = fs.readFileSync(pageBase + '.wxml', 'utf8');
assert.match(pageWxml, /重新上传/, '整单删除入口应明确标注为重新上传');
assert.match(pageWxml, /对照检查/, '原图或原文对照入口应有文字说明');
assert.match(pageWxml, /朗读检查/, '朗读入口应有文字说明');
assert.match(pageWxml, /商品[\s\S]*数量[\s\S]*单位[\s\S]*更多/, '订单列表应明确标注列含义');

const listWxml = fs.readFileSync(listBase + '.wxml', 'utf8');
assert.match(listWxml, /请选择匹配商品/, '匹配区应明确提示用户下一步操作');
assert.match(listWxml, /已有配送商品[\s\S]*可直接选用/, '已有商品应说明可以直接选用');
assert.match(listWxml, /系统商品[\s\S]*添加后自动选用/, '系统商品应说明添加后的结果');
assert.match(listWxml, /添加并选用/, '下载图标应补充清楚的操作文字');
assert.doesNotMatch(listWxml, /到底了!/, '匹配结果不应再用大面积到底提示占用空间');

const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
const orderPackage = appJson.subPackages.find(item => item.root === 'subPackage-order/');
assert.ok(orderPackage.pages.includes('pages/order/ocrOrder/ocrOrder'), '正式 OCR 页面必须保持原路由');
assert.ok(!orderPackage.pages.includes('pages/order/ocrOrderV2/ocrOrderV2'), '临时 V2 路由应完成收口');
assert.ok(orderPackage.pages.includes('pages/order/paste/paste'), '正式 AI 下单页必须保持原路由');
assert.ok(!orderPackage.pages.includes('pages/order/pasteV2/pasteV2'), '临时 AI 下单 V2 路由应完成收口');

const pasteSource = fs.readFileSync(pastePath, 'utf8');
assert.match(pasteSource, /\.\.\/ocrOrder\/ocrOrder\?taskId=/, '正式 AI 下单页应进入正式 OCR 页面');
assert.doesNotMatch(pasteSource, /ocrOrderV2|openLegacyPaste|openPasteV2/, '正式 AI 下单页不应再依赖临时或旧版入口');

console.log('PASS ocrOrder official smoke: V2 界面已正式替换原路由，页面、组件和入口检查通过');

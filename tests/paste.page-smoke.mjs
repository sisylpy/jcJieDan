import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pagePath = path.join(root, 'subPackage-order/pages/order/paste/paste.js');
const wxmlPath = path.join(root, 'subPackage-order/pages/order/paste/paste.wxml');
let pageConfig = null;
let deepSeekResponse = '[]';
let redirectedUrl = '';

const context = vm.createContext({
  console,
  Map,
  Set,
  Promise,
  Number,
  String,
  Object,
  Array,
  JSON,
  encodeURIComponent,
  decodeURIComponent,
  setInterval: () => 1,
  clearInterval: () => {},
  requirePlugin: () => ({ speechRecognizerManager: () => ({ start() {}, stop() {} }) }),
  require: () => ({ tencentCloud: {} }),
  Page: config => { pageConfig = config; },
  wx: {
    showToast() {},
    showModal() {},
    navigateBack() {},
    redirectTo({ url }) { redirectedUrl = url; }
  },
  getApp: () => ({ globalData: {} })
});

function synthetic(identifier, exportsObject) {
  const names = Object.keys(exportsObject);
  return new vm.SyntheticModule(names, function initialize() {
    names.forEach(name => this.setExport(name, exportsObject[name]));
  }, { context, identifier });
}

const module = new vm.SourceTextModule(fs.readFileSync(pagePath, 'utf8'), {
  context,
  identifier: pagePath
});

await module.link(async specifier => {
  if (specifier.endsWith('/load')) {
    return synthetic(specifier, { default: { showLoading() {}, hideLoading() {} } });
  }
  if (specifier.endsWith('/config.js')) return synthetic(specifier, { default: { server: '' } });
  if (specifier.endsWith('/apiDepOrder')) {
    return synthetic(specifier, {
      pasteSearchGoods: async () => ({ result: { code: 0 } }),
      addRecord: async () => ({}),
      recognizeOrderAsync: async () => ({ result: { code: 0 } }),
      recognizeOrderFast: async () => ({ result: { code: 0, taskId: 321 } })
    });
  }
  if (specifier.endsWith('/apiDistributer')) {
    return synthetic(specifier, {
      getBrandForPrompts: async () => ({ result: { code: 0, data: [] } }),
      saveRetailDepartment: async () => ({ result: { code: 0, data: {} } })
    });
  }
  if (specifier.endsWith('/orderParserV2')) {
    return synthetic(specifier, { parseOrderFromTextV2: () => ({ orders: [] }) });
  }
  if (specifier.endsWith('/deepSeekHelper')) {
    return synthetic(specifier, { optimizeTextWithDeepSeek: async () => deepSeekResponse });
  }
  if (specifier.endsWith('/miniProgramCloud')) {
    return synthetic(specifier, { getAsrCredentials: async () => ({}) });
  }
  throw new Error(`Unexpected import: ${specifier}`);
});

await module.evaluate();
assert.ok(pageConfig, 'Page 配置应成功注册');

const wxml = fs.readFileSync(wxmlPath, 'utf8');
const eventHandlerNames = new Set();
for (const match of wxml.matchAll(/bind(?:tap|input|focus|blur|confirm|change|navbuttontap|:imageChange|:startOCR|:startOCRFast)="([A-Za-z_$][\w$]*)"/g)) {
  eventHandlerNames.add(match[1]);
}
for (const handlerName of eventHandlerNames) {
  assert.equal(typeof pageConfig[handlerName], 'function', `WXML 事件 ${handlerName} 必须存在`);
}
assert.equal(typeof pageConfig.startRecord, 'function');
assert.equal(typeof pageConfig.stopRecord, 'function');
assert.match(wxml, /DeepSeek 智能识别/, '输入页应明确提供 DeepSeek 入口');
assert.match(wxml, /isRecording \|\| ocrSubmitting/, '图片入口不应因输入框已有文字而禁用');
assert.doesNotMatch(wxml, /体验 AI 智能下单 V2|旧版/, '正式新版不应再显示体验横幅或旧版切换');

const page = {
  ...pageConfig,
  data: {
    ...pageConfig.data,
    depId: 11,
    depFatherId: 1,
    depName: '测试饭店-凉菜',
    disId: 99,
    userId: 88,
    orderArr: []
  },
  setData(update) {
    Object.assign(this.data, update);
  }
};

const departments = page._buildDepartmentOptions({
  nxDepartmentEntities: [
    { nxDepartmentId: 11, nxDepartmentFatherId: 1, nxDepartmentName: '凉菜' },
    { nxDepartmentId: 12, nxDepartmentFatherId: 1, nxDepartmentName: '面点' }
  ]
}, { depId: 11, depFatherId: 1, depName: '测试饭店-凉菜' });
assert.equal(JSON.stringify(departments.map(item => item.name)), JSON.stringify(['凉菜', '面点']));

page.onInput({ detail: { value: '香油1桶' } });
assert.equal(page.data.inputAreaHeight, 600, '短内容应保持默认输入框高度');
page.data.inputFocused = true;
page.onInput({ detail: { value: Array(20).fill('湘君府小米泡辣1件').join('\n') } });
assert.ok(page.data.inputAreaHeight > 600, '长内容应自动增加输入框高度');
assert.ok(page.data.inputAreaHeight <= 920, '输入框高度应保留合理上限');
assert.equal(page.data.inputFocused, false, '一次性粘贴长内容后应自动释放输入框焦点');
page.data.inputFocused = true;
page.onInput({ detail: { value: '香油1桶' } });
assert.equal(page.data.inputAreaHeight, 600, '删除长内容后应缩回默认高度');
assert.equal(page.data.inputFocused, true, '正常编辑短内容时不应强制关闭键盘');

let chooseImageCalled = false;
page.data.inputContent = '已有文字也应允许选择图片';
page.selectComponent = () => ({ chooseImages() { chooseImageCalled = true; } });
page.recognizeOrder();
assert.equal(chooseImageCalled, true, '已有文字时图片识别入口仍应可用');

let deepSeekParseCalled = false;
page.data.sourceText = '佳汀香油1捅';
deepSeekResponse = '[{"name":"佳汀香油","qty":"1","unit":"桶","remark":""}]';
page._parseContent = (text, aiEnhanced) => {
  deepSeekParseCalled = aiEnhanced && text.includes('佳汀香油');
  return { orders: [{}] };
};
await page.aiEnhance();
assert.equal(deepSeekParseCalled, true, 'DeepSeek 结果应进入新版解析流程');
assert.equal(page.data.isAiOptimizing, false, 'DeepSeek 完成后应恢复按钮状态');

page.data.depId = 11;
page.data.depFatherId = 1;
page.data.disId = 99;
page._ocrImageToBase64 = async () => 'image-base64';
await page.onStartOCRFast({ detail: { imageList: [{ path: '/tmp/order.png' }] } });
assert.equal(redirectedUrl, '../ocrOrder/ocrOrder?taskId=321', '单列图片识别后应进入正式 OCR 复核页');
assert.equal(page.data.ocrSubmitting, false, '图片识别完成后应恢复按钮状态');

page.data.orderArr = [{
  nxDoGoodsName: '香油',
  nxDoQuantity: '1',
  nxDoStandard: '桶',
  nxDoDepartmentId: 11,
  nxDoGoodsOriginalName: '香油',
  nxDoIsValid: true,
  v2NeedsReview: false,
  v2Warning: ''
}];
assert.equal(JSON.stringify(page._validateOrdersForSave()), JSON.stringify({ valid: true }));
const apiOrder = page._orderForApi(page.data.orderArr[0]);
assert.equal('v2NeedsReview' in apiOrder, false);
assert.equal('nxDoIsValid' in apiOrder, false);

console.log('PASS paste official smoke: AI 下单 V2 已替换原路由，页面、事件、部门和保存检查通过');

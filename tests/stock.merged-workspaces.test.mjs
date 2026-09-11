import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('库存页的三个一级工作区使用同一个 swiper', () => {
  const wxml = read('pages/stock/index/index.wxml');
  const overlayStart = wxml.indexOf("<view class='overlay {{showOperationCarStock");
  const purchaseWorkspace = wxml.indexOf('<purchase-workspace');
  const partnerWorkspace = wxml.indexOf('<partner-workspace');

  assert.equal((wxml.match(/<swiper-item>/g) || []).length, 3, '一级工作区数量应为 3');
  assert.match(wxml, /current="{{workspaceCurrent}}"/);
  assert.match(wxml, /bindchange="onWorkspaceSwiperChange"/);
  assert.ok(purchaseWorkspace > 0, '缺少外采工作区');
  assert.ok(partnerWorkspace > 0, '缺少协作伙伴工作区');
  assert.ok(overlayStart > purchaseWorkspace, '外采工作区被放进了默认隐藏的 overlay');
  assert.ok(overlayStart > partnerWorkspace, '协作伙伴工作区被放进了默认隐藏的 overlay');
  assert.doesNotMatch(wxml, /<purchase-workspace[^>]*wx:if=/, '外采工作区不应滑动后才创建');
  assert.doesNotMatch(wxml, /<partner-workspace[^>]*wx:if=/, '协作工作区不应滑动后才创建');
});

test('顶部点击和 swiper 手势同步一级工作区状态', () => {
  const page = read('pages/stock/index/index.js');
  assert.match(page, /workspaceCurrent:\s*0/);
  assert.match(page, /switchWorkspace\(e\)/);
  assert.match(page, /onWorkspaceSwiperChange\(e\)/);
  assert.match(page, /\['stock', 'purchase', 'partner'\]/);
});

test('内嵌工作区允许 app.wxss 工具类进入组件', () => {
  for (const configPath of [
    'pages/purchase/index/workspace.json',
    'pages/doing/index/workspace.json'
  ]) {
    const config = JSON.parse(read(configPath));
    assert.equal(config.component, true, configPath);
    assert.equal(config.styleIsolation, 'apply-shared', configPath);
  }
});

test('外采工作区声明其 WXML 使用的 stockOutGoods 组件', () => {
  const config = JSON.parse(read('pages/purchase/index/workspace.json'));
  assert.equal(config.usingComponents.stockOutGoods, '/components/stockOutGoods/stockOutGoods');
});

test('外采工作区只展示未采购列表，不再保留采购中二级内容', () => {
  for (const wxmlPath of [
    'pages/purchase/index/index.wxml',
    'pages/purchase/index/workspace.wxml'
  ]) {
    const wxml = read(wxmlPath);
    assert.doesNotMatch(wxml, /tabs_wx|innerCurrent|onTab1ClickSub|onInnerSwiperChange/, wxmlPath);
    assert.doesNotMatch(wxml, /copySwiperItem|<swiper(?:\s|>)/, wxmlPath);
    assert.match(wxml, /wx:for="{{purGoodsArr}}"/, wxmlPath);
  }
});

test('取消二级页签后未采购列表取回原页签占用的高度', () => {
  const component = read('pages/purchase/index/purchaseComponent.js');
  assert.match(component, /screenHeight - navBarHeight - tabBarHeight\) \* rpxRatio - mergedWorkBarHeight/);
  assert.doesNotMatch(component, /screenHeight - navBarHeight - tabBarHeight - viewBarHeight/);
});

test('外采工作区顶部提供精彩订货入口并为列表保留正确高度', () => {
  const workspace = read('pages/purchase/index/workspace.wxml');
  const component = read('pages/purchase/index/purchaseComponent.js');
  const styles = read('pages/purchase/index/workspace.wxss');

  const entryRow = workspace.indexOf('purchase-app-entry-row');
  const goodsList = workspace.indexOf('wx:for="{{purGoodsArr}}"');
  assert.ok(entryRow > 0 && entryRow < goodsList, '精彩订货入口应位于未采购数据上方');
  assert.match(workspace, /class="purchase-app-entry-row flex flex-row-between bg-white border-bottom pt-20"/);
  assert.match(workspace, /bindtap="openPurchaseApp">打开精彩订货<\/view>/);
  assert.match(workspace, /height: \{\{purchaseWorkspaceHeight\}\}rpx/);
  assert.match(styles, /\.purchase-app-open-button[\s\S]*?border:\s*1rpx solid #168474/);
  assert.match(component, /const purchaseAppEntryBarHeight = viewBarHeight \* rpxRatio/);
  assert.match(component, /contentHeight - \(this\.data\.embedded \? purchaseAppEntryBarHeight \+ 20 : 0\)/);
  assert.match(component, /pages\/workbenchV2\/workbenchV2\?nxDisId=/);
  assert.match(component, /'&nxDisPurUserId='/);
  assert.match(component, /'&from=nx'/);
  assert.match(component, /appId:\s*PURCHASE_APP_ID/);
});

test('协作伙伴的内层 swiper 不抢占外层工作区的横向手势', () => {
  const workspace = read('pages/doing/index/workspace.wxml');
  assert.match(workspace, /<swiper[^>]*disable-touch="{{embedded}}"/s);
});

test('协作伙伴第一个内层页右滑可退回外采工作区', () => {
  const hostWxml = read('pages/stock/index/index.wxml');
  const hostJs = read('pages/stock/index/index.js');
  const partnerWxml = read('pages/doing/index/workspace.wxml');
  const partnerJs = read('pages/doing/index/doingComponent.js');

  assert.match(partnerWxml, /<swiper-item[^>]*bindtouchstart="onEmbeddedWorkspaceTouchStart"[^>]*bindtouchend="onEmbeddedWorkspaceTouchEnd"/);
  assert.match(partnerJs, /deltaX >= 60/);
  assert.match(partnerJs, /triggerEvent\('workspaceback'\)/);
  assert.match(hostWxml, /bindworkspaceback="onPartnerWorkspaceBack"/);
  assert.match(hostJs, /onPartnerWorkspaceBack\(\)[\s\S]*?workspaceCurrent:\s*1[\s\S]*?activeWorkspace:\s*'purchase'/);
});

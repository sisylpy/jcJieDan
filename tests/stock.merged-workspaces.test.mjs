import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');
const require = createRequire(import.meta.url);

test('库存页按经营模式和授权挂载可用工作区', () => {
  const wxml = read('pages/stock/index/index.wxml');
  const overlayStart = wxml.indexOf("<view class='overlay {{showOperationCarStock");
  const purchaseWorkspace = wxml.indexOf('<purchase-workspace');
  const partnerWorkspace = wxml.indexOf('<partner-workspace');

  assert.equal((wxml.match(/<swiper-item(?:\s|>)/g) || []).length, 3, '一级工作区声明数量应为 3');
  assert.match(wxml, /current="{{workspaceCurrent}}"/);
  assert.match(wxml, /bindchange="onWorkspaceSwiperChange"/);
  assert.match(wxml, /wx:if="{{showWorkspaceTabs}}" class="merged-work-tabs"/);
  assert.ok(purchaseWorkspace > 0, '缺少外采工作区');
  assert.ok(partnerWorkspace > 0, '缺少协作伙伴工作区');
  assert.ok(overlayStart > purchaseWorkspace, '外采工作区被放进了默认隐藏的 overlay');
  assert.ok(overlayStart > partnerWorkspace, '协作伙伴工作区被放进了默认隐藏的 overlay');
  assert.match(wxml, /<swiper-item>\s*<view class="content flex-1 flex-column"/);
  assert.match(wxml, /<swiper-item wx:if="{{showPurchaseWorkspace}}">\s*<purchase-workspace/);
  assert.match(wxml, /<swiper-item wx:if="{{showPartnerWorkspace}}">\s*<partner-workspace/);
});

test('顶部点击和 swiper 手势同步一级工作区状态', () => {
  const page = read('pages/stock/index/index.js');
  assert.match(page, /workspaceCurrent:\s*0/);
  assert.match(page, /switchWorkspace\(e\)/);
  assert.match(page, /onWorkspaceSwiperChange\(e\)/);
  assert.match(page, /this\.data\.workspaceNames \|\| \['stock'\]/);
});

test('工作区权限严格区分第 1、2、3 和第 7 种经营模式', () => {
  const access = require(path.join(root, 'utils/stockWorkspaceAccess.js'));
  const entitlement = (...features) => ({ entitledFeatures: features });

  assert.deepEqual(access.resolve(
    { nxDistributerOperatingModeCode: 'SMALL_WHOLESALE' },
    entitlement('PURCHASE_CORE', 'PARTNER_DISTRIBUTOR_COLLABORATION')
  ).workspaceNames, ['stock']);

  for (const mode of ['SHELF_TRIAL', 'SHELF_STANDARD']) {
    assert.deepEqual(access.resolve(
      { nxDistributerOperatingModeCode: mode },
      entitlement('PURCHASE_CORE', 'PARTNER_DISTRIBUTOR_COLLABORATION')
    ).workspaceNames, ['stock', 'purchase']);
  }

  assert.deepEqual(access.resolve(
    { nxDistributerOperatingModeCode: 'PARTNER_PLATFORM' },
    entitlement('PURCHASE_CORE', 'PARTNER_DISTRIBUTOR_COLLABORATION')
  ).workspaceNames, ['stock', 'purchase', 'partner']);
});

test('出库订单转为采购后立即刷新外采工作区', () => {
  const page = read('pages/stock/index/index.js');
  assert.match(page, /_refreshPurchaseWorkspace\(\)/);
  assert.match(page, /保存成功[\s\S]*?that\._refreshPurchaseWorkspace\(\)[\s\S]*?that\._refreshDataWithSelection\(\)/);
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
  assert.match(component, /jrdhinvite\/owner-entry/);
  assert.match(component, /'&inviteToken='/);
  assert.doesNotMatch(component, /nxDisPurUserId/);
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
  assert.match(hostJs, /onPartnerWorkspaceBack\(\)[\s\S]*?indexOf\('purchase'\)[\s\S]*?activeWorkspace:\s*purchaseIndex >= 0 \? 'purchase' : 'stock'/);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const pageSource = readFileSync('pages/purchaseList/index/index.js', 'utf8');
const templateSource = readFileSync('pages/purchaseList/index/index.wxml', 'utf8');
const styleSource = readFileSync('pages/purchaseList/index/index.wxss', 'utf8');

test('备货页只保留未采购工作区，不再包含订货中视图和状态', () => {
  const combined = pageSource + templateSource + styleSource;

  for (const removedToken of [
    '订货中',
    'switchInnerTab',
    'loadBatches',
    'purchaseGetPasteBatch',
    'deleteDisPurBatchItem',
    'updatePasteBatch',
    'batchArr',
    'buyingCount',
    'showPasteModal',
    'paste-modal',
    'batch-card'
  ]) {
    assert.doesNotMatch(combined, new RegExp(removedToken));
  }

  assert.match(templateSource, /class="purchase-workspace/);
  assert.doesNotMatch(templateSource, /wx:if="\{\{tabIndex/);
});

test('备货页顶部按钮带采购身份打开精彩订货工作台', () => {
  assert.match(templateSource, /aria-label="打开精彩订货"/);
  assert.match(templateSource, /bindtap="openPurchaseApp"/);
  assert.match(pageSource, /appId:\s*PURCHASE_APP_ID/);
  assert.match(pageSource, /pages\/workbenchV2\/workbenchV2\?nxDisId=/);
  assert.match(pageSource, /'&nxDisPurUserId='/);
  assert.match(pageSource, /'&from=nx'/);
  assert.match(pageSource, /envVersion:\s*'trial'/);
});

test('移除业务页签后未采购工作区使用释放出的页面高度', () => {
  assert.match(pageSource, /contentHeight\s*=\s*Math\.max\(320,\s*\(screenHeight - navBarHeight - 50\) \* ratio - 100\)/);
  assert.doesNotMatch(pageSource, /- 88 - 100/);
});

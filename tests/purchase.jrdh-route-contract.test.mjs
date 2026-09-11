import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync('pages/purchase/index/purchaseComponent.js', 'utf8');
const shelfSource = readFileSync('subPackage/pages/shelf/index/index.js', 'utf8');
const apiSource = readFileSync('lib/apiDepOrder.js', 'utf8');
const orderListSource = readFileSync('subPackage/pages/prepare/orderList/orderList.js', 'utf8');
const supplierBillSource = readFileSync('subPackage-supplier/pages/supplier/supplierBills/supplierBills.wxml', 'utf8');
const copyTemplateSource = readFileSync('template/copySwiperItem/copySwiperItem.wxml', 'utf8');

test('Boss创建采购批次进入精彩订货已注册的分包准备页', () => {
  assert.match(source, /path:\s*'\/pkgPurchase\/pages\/txs\/prepareBatch\/prepareBatch\?batchId='/);
  assert.doesNotMatch(source, /path:\s*'\/pages\/txs\/prepareBatch\/prepareBatch\?batchId='/);
  assert.match(source, /'&fromBuyer=1&fromBoss=1'/);
});

test('Boss重新打开采购批次进入精彩订货已注册的分包详情页', () => {
  assert.match(source, /path:\s*'\/pkgPurchase\/pages\/txs\/disOrderBatch\/disOrderBatch\?batchId='/);
  assert.doesNotMatch(source, /path:\s*'\/pages\/txs\/disOrderBatch\/disOrderBatch\?batchId='/);
  assert.doesNotMatch(source, /sourceEnv=boss/);
});

test('Boss采购页不再引用任何精彩订货旧txs主包路径', () => {
  assert.doesNotMatch(source, /['"]\/pages\/txs\//);
});

test('Boss货架采购入口进入当前采购员控制台并保留采购身份参数', () => {
  assert.match(shelfSource, /path:\s*'pages\/workbenchV2\/workbenchV2\?nxDisId='/);
  assert.match(shelfSource, /'&nxDisPurUserId='/);
  assert.match(shelfSource, /'&from=nx'/);
  assert.doesNotMatch(shelfSource, /pages\/jinriListWithLogin\/jinriListWithLogin/);
});

test('Boss批次命令按工作台、复制、打印和部门入口固定语义', () => {
  for (const endpoint of [
    'saveBossPurchaseBatch',
    'saveBossDepartmentPurchaseBatch',
    'saveBossCopiedPurchaseBatch',
    'saveBossPrintedPurchaseBatch',
    'saveBossCopiedDepartmentPurchaseBatch',
    'saveBossPrintedDepartmentPurchaseBatch'
  ]) {
    assert.match(apiSource, new RegExp(`['"]${endpoint}['"]`));
  }
  assert.doesNotMatch(apiSource, /nxdistributerpurchasebatch\/saveDisPurGoodsBatch/);
  assert.doesNotMatch(orderListSource, /nxDpbPurchaseType/);
});

test('Boss展示只读批次正交语义字段', () => {
  const combined = supplierBillSource + copyTemplateSource;
  assert.doesNotMatch(combined, /nxDpbPurchaseType/);
  assert.match(combined, /nxDpbBusinessEventType/);
  assert.match(combined, /nxDpbProcurementMode/);
  assert.match(combined, /nxDpbEntryChannel/);
});

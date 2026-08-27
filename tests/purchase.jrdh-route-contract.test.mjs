import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const source = readFileSync('pages/purchase/index/index.js', 'utf8');

test('Boss创建采购批次进入精彩订货已注册的分包准备页', () => {
  assert.match(source, /path:\s*'\/pkgPurchase\/pages\/txs\/prepareBatch\/prepareBatch\?batchId='/);
  assert.doesNotMatch(source, /path:\s*'\/pages\/txs\/prepareBatch\/prepareBatch\?batchId='/);
});

test('Boss重新打开采购批次进入精彩订货已注册的分包详情页', () => {
  assert.match(source, /path:\s*'\/pkgPurchase\/pages\/txs\/disOrderBatch\/disOrderBatch\?batchId='/);
  assert.doesNotMatch(source, /path:\s*'\/pages\/txs\/disOrderBatch\/disOrderBatch\?batchId='/);
});

test('Boss采购页不再引用任何精彩订货旧txs主包路径', () => {
  assert.doesNotMatch(source, /['"]\/pages\/txs\//);
});

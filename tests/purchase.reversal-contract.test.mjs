import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const apiSource = readFileSync('lib/apiDepOrder.js', 'utf8');
const ownerRequestSource = readFileSync('lib/ownerRequest.js', 'utf8');
const purchasePageSource = readFileSync('pages/purchase/index/purchaseComponent.js', 'utf8');

function exportedFunction(name) {
  const start = apiSource.indexOf(`export const ${name} =`);
  assert.ok(start >= 0, `${name} must exist`);
  const next = apiSource.indexOf('\nexport const ', start + 1);
  return apiSource.slice(start, next < 0 ? apiSource.length : next);
}

test('批次商品撤销使用POST并提交固定审计原因', () => {
  const source = exportedFunction('deleteDisPurBatchItem');
  assert.match(source, /method:\s*'POST'/);
  assert.doesNotMatch(source, /method:\s*'GET'/);
  assert.match(source, /reasonCode:\s*'OWNER_REMOVE_BATCH_ITEM'/);
  assert.match(source, /reason:\s*'老板端撤销采购批次商品'/);
});

test('整批撤销使用POST并提交固定审计原因', () => {
  const source = exportedFunction('deleteDisBatch');
  assert.match(source, /method:\s*'POST'/);
  assert.doesNotMatch(source, /method:\s*'GET'/);
  assert.match(source, /reasonCode:\s*'OWNER_CANCEL_BATCH'/);
});

test('待采购商品移除不再通过GET执行写操作', () => {
  const source = exportedFunction('deletePlanPurchase');
  assert.match(source, /method:\s*'POST'/);
  assert.doesNotMatch(source, /method:\s*'GET'/);
});

test('Owner统一请求层为写命令生成关联请求ID', () => {
  assert.match(ownerRequestSource, /header\['X-Request-Id'\]\s*=\s*nextOwnerRequestId\(\)/);
  assert.match(ownerRequestSource, /function nextOwnerRequestId\(\)/);
  assert.match(purchasePageSource, /deleteDisPurBatchItem\(this\.data\.deleteGoodsId\)/);
});

test('批次商品撤销提交期间禁止重复点击', () => {
  assert.match(purchasePageSource, /this\.data\.deletingBatchItem/);
  assert.match(purchasePageSource, /this\.setData\(\{ deletingBatchItem: true \}\)/);
  assert.match(purchasePageSource, /this\.setData\(\{ deletingBatchItem: false \}\)/);
});

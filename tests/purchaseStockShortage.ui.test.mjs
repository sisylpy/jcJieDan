import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('出库完成不再弹出库存诊断弹窗', () => {
  const pages = [
    'subPackage-order/pages/order/writeWeight/writeWeight.js',
    'subPackage-order/pages/order/orderPageColl/orderPageColl.js',
    'subPackage-order/pages/order/orderPageGb/orderPageGb.js',
    'subPackage-order/pages/order/orderPage/orderPage.js',
    'subPackage-order/pages/order/orderPageRetail/orderPageRetail.js',
    'subPackage-order/pages/order/orderPageSuyuan/orderPageSuyuan.js'
  ];
  for (const page of pages) {
    const source = fs.readFileSync(path.join(root, page), 'utf8');
    assert.doesNotMatch(source, /stockOutboundShortage/, page);
  }
  assert.equal(fs.existsSync(path.join(root, 'utils/stockOutboundShortage.js')), false);
});

test('溯源订单页显式导入两个出库接口', () => {
  const source = fs.readFileSync(path.join(root,
    'subPackage-order/pages/order/orderPageSuyuan/orderPageSuyuan.js'), 'utf8');
  assert.match(source, /giveOrderWeightListForStockAndFinish,/);
  assert.match(source, /giveOrderWeightListForStockShelfGoods,/);
});

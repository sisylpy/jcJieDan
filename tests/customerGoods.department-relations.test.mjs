import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = fs.readFileSync(
  path.join(root, 'subPackage/pages/customer/customerGoods/customerGoods.js'), 'utf8');
const view = fs.readFileSync(
  path.join(root, 'subPackage/pages/customer/customerGoods/customerGoods.wxml'), 'utf8');

assert.ok(view.includes('wx:key="relationId"'), '列表必须按部门商品关系逐条展示');
assert.ok(view.includes('{{item.customerName}}'), '同一配送商品必须显示所属子部门');
assert.ok(view.includes('部门商品'), '汇总标题必须说明统计的是部门商品关系');
assert.ok(page.includes('relationId: item.relationId'), '不能按配送商品ID去重');
assert.ok(page.includes('item.customerName'), '搜索必须支持按子部门名称查找');

console.log('PASS customer goods keep department relations visible');

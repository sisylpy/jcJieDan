import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const page = fs.readFileSync(path.join(root, 'pages/purchase/index/index.js'), 'utf8');
const copy = fs.readFileSync(path.join(root, 'template/copySwiperItem/copySwiperItem.wxml'), 'utf8');
const wechat = fs.readFileSync(path.join(root, 'template/wxSwiperItem/wxSwiperItem.wxml'), 'utf8');

assert.ok(page.includes("title: '确认供货信息'"));
assert.ok(page.includes('disFinishPurchaseBatch(batch)'));
assert.equal(page.includes("title: '确认收货'"), false);
for (const [name, source] of [['copy', copy], ['wechat', wechat]]) {
  assert.ok(source.includes('(已确认供货)总计:'), name);
  assert.equal(source.includes('(已收货)总计:'), false, name);
}

console.log('PASS boss purchase completion copy contract');

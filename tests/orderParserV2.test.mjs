import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = fs.readFileSync(path.join(root, 'lib/orderParserV2.js'), 'utf8');
const parser = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

const departments = [
  { id: 11, fatherId: 1, name: '凉菜' },
  { id: 12, fatherId: 1, name: '面点' },
  { id: 13, fatherId: 1, name: '后厨' }
];

const options = {
  depId: 11,
  depFatherId: 1,
  depName: '测试饭店-凉菜',
  disId: 99,
  userId: 88,
  departments
};

const sample = parser.parseOrderFromTextV2(
  '凉菜\n湘君府小米泡辣1件\n王守义十三香1板\n小秋耳2斤\n佳汀香油1捅\n水塔陈醋2捅',
  options
);

assert.equal(sample.orders.length, 5, '部门标题不能生成商品');
assert.equal(sample.summary.validCount, 5);
assert.equal(sample.summary.reviewCount, 0);
assert.equal(sample.summary.correctionCount, 2);
assert.equal(sample.departmentSegments[0].departmentName, '凉菜');
assert.deepEqual(
  sample.orders.map(order => [order.nxDoGoodsName, order.nxDoQuantity, order.nxDoStandard]),
  [
    ['湘君府小米泡辣', '1', '件'],
    ['王守义十三香', '1', '板'],
    ['小秋耳', '2', '斤'],
    ['佳汀香油', '1', '桶'],
    ['水塔陈醋', '2', '桶']
  ]
);

const mixedDepartments = parser.parseOrderFromTextV2(
  '凉菜：木耳2斤\n面点\n面粉1袋\n后厨\n土豆5斤',
  options
);
assert.deepEqual(
  mixedDepartments.orders.map(order => Number(order.nxDoDepartmentId)),
  [11, 12, 13],
  '部门标题后的商品应继承对应部门'
);
assert.equal(mixedDepartments.summary.departmentCount, 3);

const partial = parser.parseOrderFromTextV2('凉菜\n土豆2斤\n香菜', options);
assert.equal(partial.orders.length, 2, '不完整行应保留供人工修改');
assert.equal(partial.summary.validCount, 1, '正确行不应被错误行清空');
assert.equal(partial.summary.reviewCount, 1);
assert.equal(partial.orders[1].nxDoGoodsName, '香菜');

const spoken = parser.parseOrderFromTextV2('加丁香油一桶\n餐盒2代\n矿泉水3平', options);
assert.deepEqual(
  spoken.orders.map(order => [order.nxDoGoodsName, order.nxDoQuantity, order.nxDoStandard]),
  [
    ['丁香油', '1', '桶'],
    ['餐盒', '2', '袋'],
    ['矿泉水', '3', '瓶']
  ]
);

const json = parser.parseOrderFromTextV2(
  '[{"departmentName":"面点","name":"馒头","qty":"2","unit":"代","remark":"大个"}]',
  options
);
assert.equal(json.orders[0].nxDoDepartmentId, 12);
assert.equal(json.orders[0].nxDoStandard, '袋');
assert.equal(json.orders[0].nxDoRemark, '大个');

console.log('PASS orderParserV2: 餐厅部门、单位容错、部分成功与 AI JSON 回归测试通过');

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('外采按客户视图不直接显示空部门编码', () => {
  const component = read('pages/purchase/index/purchaseComponent.js');
  assert.match(component, /_normalizeDepartmentList\(res\.result\.data\.arr\)/);
  assert.match(component, /item\.depName/);
  assert.match(component, /value\.toLowerCase\(\) !== 'null'/);
  assert.match(component, /displayName: that\._departmentDisplayName\(department\)/);

  for (const templatePath of [
    'pages/purchase/index/index.wxml',
    'pages/purchase/index/workspace.wxml'
  ]) {
    const template = read(templatePath);
    assert.match(template, /\{\{dep\.displayName\}\}/, templatePath);
    assert.doesNotMatch(template, /\{\{dep\.depOrderCode\}\}/, templatePath);
  }
});

test('外采打印沿用页面已经归一化的客户名称', () => {
  const component = read('pages/purchase/index/purchaseComponent.js');
  assert.match(component, /selectedDep\.displayName \|\| this\._departmentDisplayName\(selectedDep\)/);
  assert.match(component, /setStorageSync\('printCustomerName', selectedDepName\)/);
  assert.match(component, /setStorageSync\('purchaseSelectedDepName', selectedDepName\)/);
});

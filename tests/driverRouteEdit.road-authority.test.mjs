import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pageBase = path.join(
  root,
  'subPackage-routeDispatch/pages/routeDispatch/driverRouteEdit/driverRouteEdit'
);
const source = fs.readFileSync(pageBase + '.js', 'utf8');
const wxml = fs.readFileSync(pageBase + '.wxml', 'utf8');

for (const forbidden of [
  'EARTH_RADIUS_METERS',
  'distanceMeters',
  'routeCoordinateDistance',
  'optimizeStopOrder',
  'buildConstraintPlan',
  'travelMinutesPerMeter',
  'targetRouteMinutes',
  'targetDistanceKm'
]) {
  assert.doesNotMatch(source, new RegExp(forbidden), `路线编辑不得保留前端估算逻辑: ${forbidden}`);
}

assert.doesNotMatch(wxml, /按时间补充|按距离补充|智能重排路线/, '第一阶段不得暴露前端自动补充或重排');
assert.doesNotMatch(wxml, /直线估算|腾讯路线接口/, '路线编辑不得提示可使用旧道路降级');

assert.match(source, /stopKeys:\s*\(this\.data\.stopKeys\s*\|\|\s*\[\]\)\.slice\(\)/,
  '预览请求必须提交人工 stopKeys 顺序');
assert.match(source, /postDriverRouteEditPreview\(payload\)/, '人工调整后必须请求后端预览');
assert.match(source, /onAddStop:\s*function/, '必须保留人工添加客户');
assert.match(source, /onRemoveStop:\s*function/, '必须保留人工删除客户');
assert.match(source, /onMoveStop:\s*function/, '必须保留人工上移下移');
assert.match(source, /onPlanningLockTap:\s*function/, '必须保留固定司机操作');

assert.match(wxml, /markers="\{\{pageViewModel\.mapOverview\.markers\}\}"/, '必须保留地图 marker');
assert.match(wxml, /polyline="\{\{pageViewModel\.mapOverview\.polylines\}\}"/, '必须保留道路 polyline 展示');
assert.match(wxml, /Huawei 真实道路重新试算/, '页面必须明确由后台真实道路试算');

const runnableSource = source.replace(/^import[\s\S]*?from\s+['"][^'"]+['"]\s*$/gm, '');
const context = vm.createContext({
  console,
  Promise,
  Date,
  Math,
  JSON,
  Number,
  String,
  Object,
  Array,
  setTimeout: () => 1,
  clearTimeout() {},
  require: specifier => specifier.includes('timeWindowModal')
    ? { buildTimeWindowRequest() { return {}; } }
    : { showLoading() {}, hideLoading() {} },
  getApp: () => ({ globalData: { navBarHeight: 44, rpxR: 2 } }),
  Page: config => { context.pageConfig = config; },
  wx: {}
});
new vm.Script(runnableSource, { filename: pageBase + '.js' }).runInContext(context);
assert.ok(context.pageConfig, '路线编辑 Page 必须能成功注册');

const handlers = new Set();
for (const match of wxml.replace(/<!--[\s\S]*?-->/g, '').matchAll(
  /(?:bind|catch)(?::[A-Za-z_$][\w$]*|[A-Za-z_$][\w$]*)\s*=\s*["']([A-Za-z_$][\w$]*)["']/g
)) {
  handlers.add(match[1]);
}
for (const handler of handlers) {
  assert.equal(typeof context.pageConfig[handler], 'function', `页面事件 ${handler} 必须存在`);
}

console.log('PASS driverRouteEdit road authority: 人工 stopKeys 由后台 Huawei 道路能力统一试算');

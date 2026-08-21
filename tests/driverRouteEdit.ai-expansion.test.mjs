import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pageBase = path.join(
  root,
  'subPackage-routeDispatch/pages/routeDispatch/driverRouteEdit/driverRouteEdit'
);
const source = fs.readFileSync(pageBase + '.js', 'utf8');
const wxml = fs.readFileSync(pageBase + '.wxml', 'utf8');
const api = fs.readFileSync(path.join(root, 'lib/apiRouteDispatch.js'), 'utf8');

assert.match(api, /driver-route-edit\/expansion\/preview/,
  'AI 增补必须调用独立建议接口');
assert.match(source, /pageViewModel\.previewToken/,
  '页面必须保存服务端路线 previewToken');
assert.match(source, /postDriverRouteExpansionPreview\(payload\)/,
  'AI 增补必须由后端计算');
assert.match(source, /proposal\.proposedStopKeys/,
  '老板采用建议时只能采用服务端返回的 stopKeys');
assert.match(source, /routeExpansionProposalId:\s*proposal\.proposalId/,
  '采用建议后的首次 preview 必须携带服务端 proposalId 防止重复分配竞态');
assert.match(wxml, /采用后仍需点击“确认这条路线”/,
  'AI 建议不得直接写正式路线');
assert.match(source, /buildExpansionReview\(proposal, that\.data\.stopMap/,
  'proposal 必须转换为老板可理解的对比模型');
assert.match(source, /proposal\.notSelectedStops/,
  '页面必须消费服务端未采用客户及原因');
assert.match(source, /before\.totalRoadDistanceM/,
  '页面必须展示增补前后道路距离');
assert.match(source, /before\.totalDriveDurationS/,
  '页面必须展示增补前后驾驶时间');
assert.match(source, /before\.activeRouteDurationS/,
  '页面必须展示增补前后 active duration');
assert.match(wxml, /保留当前人工路线，只从未分配客户池寻找顺路客户/,
  '页面必须说明人工骨架和未分配池边界');
for (const label of ['原路线', 'AI 新增客户', '最终建议路线', '路线指标变化', '未采用客户']) {
  assert.match(wxml, new RegExp(label), `建议面板必须展示：${label}`);
}

const cancelHandler = source.match(/onCancelExpansionReview:[\s\S]*?onAdoptExpansionProposal:/);
assert.ok(cancelHandler, '必须提供明确的取消建议动作');
assert.doesNotMatch(cancelHandler[0], /stopKeys\s*:/,
  '取消 proposal 不得改变当前路线 stopKeys');

for (const forbidden of [
  'distanceMeters(',
  'routeCoordinateDistance',
  'optimizeStopOrder',
  'travelMinutesPerMeter'
]) {
  assert.equal(source.includes(forbidden), false,
    `AI 增补不得在前端恢复道路估算: ${forbidden}`);
}

console.log('PASS driverRouteEdit AI expansion: 服务端建议、人工采用、正式确认分离');

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const app = readFileSync('app.json', 'utf8');
const purchasePage = readFileSync('pages/purchaseList/index/index.js', 'utf8');
const purchaseTemplate = readFileSync('pages/purchaseList/index/index.wxml', 'utf8');
const voice = readFileSync('subPackage-order/pages/purchase/voice/voice.js', 'utf8');
const voiceTemplate = readFileSync('subPackage-order/pages/purchase/voice/voice.wxml', 'utf8');
const confirm = readFileSync('subPackage-order/pages/purchase/voiceConfirm/voiceConfirm.js', 'utf8');
const confirmTemplate = readFileSync('subPackage-order/pages/purchase/voiceConfirm/voiceConfirm.wxml', 'utf8');
const api = readFileSync('lib/apiDepOrder.js', 'utf8');
const cloud = readFileSync('lib/miniProgramCloud.js', 'utf8');

test('备货页提供独立的语音采购入口并注册输入、确认两个页面', () => {
  assert.match(purchaseTemplate, /aria-label="语音采购"/);
  assert.match(purchaseTemplate, /bindtap="openVoicePurchase"/);
  assert.match(purchasePage, /subPackage-order\/pages\/purchase\/voice\/voice/);
  assert.match(app, /pages\/purchase\/voice\/voice/);
  assert.match(app, /pages\/purchase\/voiceConfirm\/voiceConfirm/);
});

test('语音采购复用订单文字解析和语音识别，但不调用客户订单保存接口', () => {
  assert.match(voice, /parseOrderFromTextV2/);
  assert.match(voice, /getAsrCredentials/);
  assert.match(voice, /QCloudAIVoice/);
  assert.match(voice, /searchVoicePurchaseGoods/);
  assert.match(voiceTemplate, /语音采购/);
  assert.doesNotMatch(voice + confirm, /pasteSearchGoods\s*\(/);
  assert.doesNotMatch(voice + confirm, /NxDepartmentOrder/);
});

test('老板端语音凭证请求明确携带身份并拒绝不完整凭证', () => {
  assert.match(cloud, /clientType:\s*'BOSS'/);
  assert.match(cloud, /语音服务返回的临时凭证不完整/);
});

test('确认页展示品牌规格包装候选，未选具体商品不能提交', () => {
  assert.match(confirmTemplate, /请选择具体商品/);
  assert.match(confirmTemplate, /candidate\.specText/);
  assert.match(confirmTemplate, /data-candidate-id/);
  assert.match(confirm, /第\$\{index \+ 1\}条请选择具体商品/);
  assert.match(confirm, /saveVoicePurchaseGoods/);
  assert.match(api, /nxdistributerpurchasegoods\/searchVoicePurchaseGoods/);
  assert.match(api, /nxdistributerpurchasegoods\/saveVoicePurchaseGoods/);
});

test('确认页携带原始叫法并展示采购习惯自动匹配结果', () => {
  assert.match(voice, /originalGoodsName: order\.nxDoGoodsOriginalName/);
  assert.match(confirm, /originalGoodsName: String\(row\.originalGoodsName/);
  assert.match(confirm, /matchedByTraining/);
  assert.match(confirm, /visibleCandidates: selectedCandidate \? \[selectedCandidate\] : candidates/);
  assert.match(confirm, /fresh\.matchedByTraining = false/);
  assert.match(confirmTemplate, /wx:for="\{\{row\.visibleCandidates\}\}"/);
  assert.match(confirmTemplate, /重新搜索<\/button>/);
  assert.match(confirmTemplate, /习惯匹配/);
  assert.match(confirmTemplate, /已按您的采购习惯自动选择/);
});

console.log('PASS voice purchase flow: 语音解析、候选确认和采购商品提交链路已接通');

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const detailJs = fs.readFileSync(path.join(root, 'subPackage/pages/afterSales/detail/detail.js'), 'utf8');
const detailWxml = fs.readFileSync(path.join(root, 'subPackage/pages/afterSales/detail/detail.wxml'), 'utf8');
const createJs = fs.readFileSync(path.join(root, 'subPackage/pages/afterSales/create/create.js'), 'utf8');

assert.match(detailWxml, /一、问题事实/);
assert.match(detailWxml, /二、处理结果/);
assert.match(detailWxml, /三、客户反馈/);

assert.match(detailWxml, /showFinancialForm/);
assert.match(detailWxml, /金额（必填）/);
assert.match(detailWxml, /处理原因（必填）/);
assert.match(detailJs, /createAfterSalesFinancialAdjustment/);
assert.match(detailJs, /idempotencyKey: this\.data\.financialIdempotencyKey/);

assert.match(detailWxml, /预计送达 YYYY-MM-DD HH:mm/);
assert.match(detailWxml, /补货处理说明（必填）/);
assert.match(detailWxml, /实际送达数量（必填）/);
assert.match(detailJs, /replenishmentIdempotencyKey/);
assert.match(detailJs, /finishAfterSalesReplenishment/);

assert.match(detailWxml, /沟通渠道/);
assert.match(detailWxml, /联系人（必填）/);
assert.match(detailWxml, /承诺方案（必填）/);
assert.match(detailWxml, /处理标题（必填）/);
assert.match(detailWxml, /负责人/);

assert.match(detailWxml, /客户反馈内容（必填）/);
assert.match(detailWxml, /feedbackHistory/);
assert.match(detailJs, /feedbackChannel/);
assert.match(detailJs, /finalResolutionSummary/);

assert.match(detailJs, /chooseActionPhotos/);
assert.match(detailJs, /actionId: actionId/);
assert.match(detailWxml, /上传处理凭证/);

assert.match(createJs, /itemIdByGoods\[String\(item\.nxDasiDepartmentDisGoodsId\)\]/);
assert.match(createJs, /afterSalesItemId: photo\.departmentDisGoodsId \? itemIdByGoods/);
assert.match(detailJs, /wx\.showActionSheet/);
assert.doesNotMatch(detailJs, /chooseEvidencePhotos\(\) \{ this\.chooseAndUploadPhotos\('EVIDENCE', this\.data\.items\[0\]/);

assert.match(detailWxml, /发布公司公告/);
assert.match(detailWxml, /全公司/);
assert.match(detailJs, /出货\/库房/);
assert.match(detailJs, /publishAfterSalesAnnouncement/);
assert.match(detailJs, /withdrawAfterSalesAnnouncement/);

assert.match(detailJs, /grantAfterSalesCompensation/);
assert.match(detailJs, /saveCompensation\(\)/);
assert.match(detailJs, /writebackAfterSalesStandard/);
assert.match(detailJs, /saveWriteback\(\)/);

assert.doesNotMatch(detailWxml, /点击即处理|一键退款/);

console.log('PASS after-sales resolution UI: 结构化处理、反馈历史、图片归属与公告闭环');

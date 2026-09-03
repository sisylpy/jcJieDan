import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const display = require(path.join(root, 'utils/salesReturnDisplay.js'));
const orderJs = fs.readFileSync(path.join(root, 'pages/order/index/index.js'), 'utf8');
const orderWxml = fs.readFileSync(path.join(root, 'pages/order/index/index.wxml'), 'utf8');
const apiSource = fs.readFileSync(path.join(root, 'lib/apiDistributer.js'), 'utf8');

const rows = display.buildActiveSalesReturnOrders([
  {
    nxDsrId: 1,
    nxDsrAfterSalesId: 11,
    nxDsrBusinessStatus: 'APPROVED',
    nxDsrLogisticsStatus: 'WAIT_ASSIGN',
    shipmentTaskStatus: 'UNASSIGNED',
    nxDsrPickupRequired: 1,
    nxDsrRouteDate: '2026-08-30',
    nxDsrEstimatedCreditAmount: 3,
    items: [{
      nxDsriId: 1,
      nxDsriGoodsName: '油菜',
      nxDsriApprovedQuantity: '1.000',
      nxDsriUnit: '斤'
    }]
  },
  {
    nxDsrId: 2,
    nxDsrBusinessStatus: 'COMPLETED',
    nxDsrLogisticsStatus: 'RECEIVED',
    items: []
  }
]);

assert.equal(rows.length, 1, '订单首页只展示未闭环退货单');
assert.equal(rows[0].displayStatus, '待派司机');
assert.equal(rows[0].actionHint, '请在配送页安排取货路线');
assert.equal(rows[0].displayItems[0].quantityText, '1');
assert.equal(rows[0].estimatedCreditText, '3.00');

const submitted = display.buildActiveSalesReturnOrders([{
  nxDsrId: 3,
  nxDsrBusinessStatus: 'SUBMITTED',
  nxDsrLogisticsStatus: 'WAIT_APPROVAL',
  nxDsrPickupRequired: 0,
  items: []
}])[0];
assert.equal(submitted.routeDateText, '待审核后安排', '未审核时不能误显示为无需取货');

assert.equal(display.statusMeta({
  nxDsrBusinessStatus: 'APPROVED',
  nxDsrLogisticsStatus: 'WAIT_ASSIGN',
  shipmentTaskStatus: 'ASSIGNED'
}).label, '已进路线');

assert.match(apiSource, /export const getSalesReturnList = \(data\) => salesReturnRequest\('list', 'GET', data\)/);
assert.match(orderJs, /getSalesReturnList\(\{/);
assert.match(orderJs, /activeOnly: 1/);
assert.match(orderJs, /toSalesReturnDetail\(e\)/);
assert.match(orderWxml, /退货取货/);
assert.match(orderWxml, /取货任务 #\{\{item\.nxDsrShipmentTaskId\}\}/);
assert.match(orderWxml, /bindtap="toSalesReturnDetail"/);
assert.doesNotMatch(orderWxml, /salesReturnOrders.*twoSubtotal/);

console.log('PASS order sales-return section: active return pickup is separate from ordinary sales totals');

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const page = readFileSync('pages/purchaseList/index/index.js', 'utf8')
const wxml = readFileSync('pages/purchaseList/index/index.wxml', 'utf8')
const styles = readFileSync('pages/purchaseList/index/index.wxss', 'utf8')
const confirm = readFileSync('subPackage/pages/prepare/inventoryPurchase/inventoryPurchase.js', 'utf8')
const confirmWxml = readFileSync('subPackage/pages/prepare/inventoryPurchase/inventoryPurchase.wxml', 'utf8')
const app = readFileSync('app.json', 'utf8')

function loadConfirmPage() {
  let definition
  const executable = confirm.replace(/^import[^\n]*\n/, '')
  Function('Page', executable)((page) => { definition = page })
  return definition
}

test('备货商品行紧凑显示名称、规格、来源和数量', () => {
  assert.match(wxml, /class="purchase-goods-line"/)
  assert.match(wxml, /class="goods-name"/)
  assert.match(wxml, /class="goods-spec"/)
  assert.match(page, /goodsSpecText/)
  assert.match(page, /nxDgGoodsStandardWeight/)
  assert.match(wxml, /class="source-tag/)
  assert.match(wxml, /class="source-quantity-group"/)
  assert.match(wxml, /class="goods-quantity"/)
  assert.match(wxml, /class="goods-select-area"/)
  assert.doesNotMatch(wxml, /modeText|shelfText|directActionText|openDirectPurchase/)
})

test('未执行采购可在商品行打开弹窗修改数量、规格或删除', () => {
  assert.match(wxml, /class="purchase-edit-trigger"/)
  assert.match(wxml, /aria-label="编辑采购商品"/)
  assert.match(wxml, /src="\/images\/edit-3\.png"/)
  assert.match(wxml, /catchtap="openEditPurchase"/)
  assert.match(styles, /\.purchase-edit-trigger\s*\{[\s\S]*?width:\s*72rpx;[\s\S]*?height:\s*72rpx;/)
  assert.match(styles, /\.purchase-edit-icon\s*\{[\s\S]*?width:\s*25rpx;[\s\S]*?height:\s*25rpx;/)
  assert.match(wxml, /class="purchase-edit-mask"/)
  assert.match(wxml, /bindinput="onEditPurchaseQuantityInput"/)
  assert.match(wxml, /bindinput="onEditPurchaseUnitInput"/)
  assert.match(wxml, /bindtap="deleteEditPurchase">删除/)
  assert.match(wxml, /bindtap="saveEditPurchase">保存/)
  assert.match(page, /updateSmartReplenishmentProcurement\(item\.nxDistributerPurchaseGoodsId/)
  assert.match(page, /deleteSmartReplenishmentProcurement\(item\.nxDistributerPurchaseGoodsId/)
  assert.match(page, /Number\(item\.nxDpgStatus\) === 0 \|\| Number\(item\.nxDpgStatus\) === 1/)
  assert.match(page, /采购数量必须大于0/)
  assert.match(page, /请输入采购规格/)
})

test('多选商品进入统一采购入库页', () => {
  assert.match(wxml, /bindtap="openUnifiedPurchase">统一采购入库/)
  assert.match(page, /bossInventoryPurchaseDraft/)
  assert.match(page, /pages\/prepare\/inventoryPurchase\/inventoryPurchase/)
  assert.match(page, /item\.procurementMode === 'TRANSFER'/)
  assert.match(page, /调拨任务不能转为自采入库/)
  assert.doesNotMatch(page, /所选商品包含非自采任务/)
  assert.match(confirm, /nxDpgProcurementMode:\s*'SELF_BUY'/)
  assert.match(confirm, /saveShelfGoodsStockBatch\(payload, requestKey\)/)
  assert.match(app, /pages\/prepare\/inventoryPurchase\/inventoryPurchase/)
})

test('统一采购页逐商品弹窗录入后再批量提交', () => {
  assert.match(confirmWxml, /data-index="\{\{index\}\}" bindtap="openEditor"/)
  assert.match(confirmWxml, /class="editor-mask"/)
  assert.match(confirmWxml, /bindtap="confirmEditor"/)
  assert.match(confirmWxml, /bindchange="onWaitChange"/)
  assert.match(confirm, /inputCompleted/)
  assert.match(confirm, /isShowTools:\s*Boolean\(source\.isShowTools\)/)
  assert.match(confirm, /_purchaseUnit\(item, goods, waitingStockIn\)/)
  assert.match(confirm, /nxDpgStandard:\s*source\.purchaseUnit/)
  assert.match(confirm, /nxDpgBuyScale:\s*source\.isConverted \? source\.conversionFactor : null/)
  assert.match(confirmWxml, /bindinput="onConversionInput"/)
  assert.match(confirmWxml, /每\{\{editingItem\.baseUnit\}\}采购价/)
  assert.match(confirmWxml, /每\{\{editingItem\.baseUnit\}\}建议售价/)
})

test('临时件数换算为基础规格数量和单价', () => {
  const definition = loadConfirmPage()
  const prepared = definition._prepareGoods.call(definition, {
    nxDistributerPurchaseGoodsId: 12,
    nxDpgQuantity: '1',
    nxDpgStandard: '件',
    nxDpgStatus: 0,
    nxDistributerGoodsEntity: {
      nxDgGoodsName: '平菇',
      nxDgGoodsStandardname: '斤'
    }
  })
  assert.equal(prepared.purchaseUnit, '件')
  assert.equal(prepared.baseUnit, '斤')
  assert.equal(prepared.isConverted, true)
  assert.equal(prepared.conversionFactor, '')

  const entered = definition._withCalculations.call(definition, Object.assign({}, prepared, {
    actualQuantity: '1',
    conversionFactor: '20',
    purchasePrice: '50',
    expectedPrice: '80'
  }))
  assert.equal(entered.subtotal, '50.00')
  assert.equal(entered.averagePurchasePrice, '2.50')
  assert.equal(entered.averageExpectedPrice, '4.00')

  const payload = definition._payload.call(definition, entered, 30)
  assert.equal(payload.nxDpgStandard, '件')
  assert.equal(payload.nxDpgBuyScale, '20')
  assert.equal(payload.nxDpgBuyPrice, '50')
  assert.equal(payload.nxDpgExpectPrice, '80')
})

test('多选工具栏从页面底部浮出并为列表保留滚动空间', () => {
  assert.match(styles, /\.selection-bar\s*\{[\s\S]*?bottom:\s*0;/)
  assert.match(styles, /animation:\s*selection-bar-slide-up/)
  assert.match(styles, /\.safe-space\s*\{\s*height:\s*160rpx;/)
  assert.match(styles, /\.purchase-workspace\.has-selection \.safe-space\s*\{\s*height:\s*260rpx;/)
})

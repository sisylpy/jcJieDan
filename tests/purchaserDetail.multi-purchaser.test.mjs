import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const read = path => fs.readFileSync(path, 'utf8')
const homePage = read('subPackage/pages/management/homePage/homePage.js')
const homeView = read('subPackage/pages/management/homePage/homePage.wxml')
const detailPage = read('utils/purchaseManagementPurchaserDetailPage.js')
const detailView = read('subPackage/pages/management/purchaseManagement/purchaserDetail/purchaserDetail.wxml')

assert.match(homePage, /toPurchaserDetail\(\)[\s\S]*purchaserDetail\/purchaserDetail/,
  '控制台采购员入口应直接进入采购详细')
assert.doesNotMatch(homePage, /toPurchaserList\(\)[\s\S]*purchaserList\/purchaserList/,
  '控制台不应再先进入采购员列表')
assert.match(homeView, /bindtap="toPurchaserDetail"[\s\S]*采购详细/)

assert.match(detailPage, /getPurchaseManagementPurchasers/,
  '采购详细应先读取全部采购员及其汇总')
assert.match(detailPage, /getPurchaseManagementPurchaserPurchasedGoods/,
  '采购详细应读取采购完成的商品行')
assert.match(detailPage, /loadForPurchasers/,
  '采购完成商品应覆盖当前选中的全部采购员')
assert.match(detailPage, /Promise\.all\(ids\.map/,
  '多采购员数据应并行加载')
assert.match(detailPage, /selectedAllPurchasers/)
assert.match(detailPage, /togglePurchaser/)
assert.match(detailPage, /clearDraftPurchasers/)
assert.match(detailPage, /applyPurchaserFilter/)
assert.match(detailPage, /请至少选择一位采购员/)
assert.match(detailPage, /pageSize: PAGE_SIZE/,
  '每位采购员的数据应通过分页完整读取')

assert.match(detailView, /title="采购详细"/)
assert.match(detailView, /class="detail-topbar"[\s\S]*report-date-filter[\s\S]*class="top-filter-button/,
  '日期应位于页面顶部，采购员筛选按钮应位于同一行右侧')
assert.ok(detailView.indexOf('class="detail-topbar"') < detailView.indexOf('class="person-summary"'),
  '日期筛选行应显示在汇总卡片之前')
assert.match(detailView, /采购员范围/)
assert.match(detailView, /全部采购员/)
assert.match(detailView, /可选择一位或多位/)
assert.match(detailView, /draftPurchasers/)
assert.match(detailView, /应用筛选/)
assert.doesNotMatch(detailView, /purchaser-filter-trigger/,
  '汇总卡片内不应重复显示大块采购员筛选入口')
assert.match(detailView, /item\.purchaserName/,
  '合并后的采购完成商品必须标明采购员')
assert.doesNotMatch(detailView, /当前任务|查看采购批次|采购批次/,
  '采购员详细页不再展示任务批次')
assert.match(detailView, /采购完成商品/)
assert.match(detailView, /goods-category-tree/)

const executable = detailPage
  .replace(/import \{[\s\S]*?\} from '\.\.\/lib\/apiDistributer\.js'\n/, '')
  .replace(/import apiUrl from '\.\.\/config\.js'\n/, "const apiUrl={server:''}\n")
  .replace(/import \{[\s\S]*?\} from '\.\/purchaseManagementPurchaserGoodsView\.js'\n/,
    "const purchaserGoodsInitialState=()=>({});const buildPurchaserGoodsView=()=>({})\n")
  .replace(/export function /g, 'function ')
  .concat('\nthis.createPurchaserDetailPage=createPurchaserDetailPage;')
const context = vm.createContext({
  Date, Number, String, Object, Array, Promise, Math, isFinite, encodeURIComponent,
  getApp: () => ({ globalData: { navBarHeight: 0, rpxR: 1 } }),
  wx: { showToast() {}, navigateBack() {}, navigateTo() {}, navigateToMiniProgram() {} },
  console
})
new vm.Script(executable, { filename: 'purchaseManagementPurchaserDetailPage.js' }).runInContext(context)
const page = context.createPurchaserDetailPage()
page.data = JSON.parse(JSON.stringify(page.data))
page.setData = patch => Object.assign(page.data, patch)
page.data.purchasers = [
  { purchaserUserId: 11, purchaserName: '甲', currentTaskCount: 2, periodPurchaseRecordCount: 3, periodPurchaseAmount: 15.2, periodUnresolvedAmountCount: 1 },
  { purchaserUserId: 12, purchaserName: '乙', currentTaskCount: 1, periodPurchaseRecordCount: 4, periodPurchaseAmount: 20, periodUnresolvedAmountCount: 0 },
  { purchaserUserId: 13, purchaserName: '丙', currentTaskCount: 0, periodPurchaseRecordCount: 0, periodPurchaseAmount: null, periodUnresolvedAmountCount: 0 }
]
page.updateSummary()
assert.equal(page.data.detail.purchaserName, '全部采购员')
page.openPurchaserFilter()
page.clearDraftPurchasers()
page.togglePurchaser({ currentTarget: { dataset: { id: 12 } } })
page.loadGoods = () => Promise.resolve()
page.applyPurchaserFilter()
assert.deepEqual(page.data.selectedPurchaserIds, [12])
assert.equal(page.data.detail.purchaserName, '乙')
page.openPurchaserFilter()
page.clearDraftPurchasers()
page.togglePurchaser({ currentTarget: { dataset: { id: 11 } } })
page.togglePurchaser({ currentTarget: { dataset: { id: 12 } } })
page.applyPurchaserFilter()
assert.deepEqual(page.data.selectedPurchaserIds, [11, 12])
assert.equal(page.data.detail.purchaserName, '2 位采购员')
page.openPurchaserFilter()
page.selectAllPurchasers()
page.applyPurchaserFilter()
assert.equal(page.data.selectedAllPurchasers, true)
assert.equal(page.data.detail.purchaserName, '全部采购员')

const paged = await page.loadAllPages(data => Promise.resolve({
  result: {
    code: 0,
    data: data.page === 1
      ? { items: [{ id: 1 }], total: 2, hasMore: true }
      : { items: [{ id: 2 }], total: 2, hasMore: false }
  }
}), {}, '分页加载失败')
assert.deepEqual(JSON.parse(JSON.stringify(paged)), [{ id: 1 }, { id: 2 }])

console.log('purchaser detail multi-purchaser filter: PASS')

import {
  getSalesAnalysisOverview,
  getSalesAnalysisCategory,
  getSalesAnalysisProductCustomers,
  getSalesAnalysisCategoryCustomers,
  getSalesAnalysisCustomerProducts
} from '../../../../lib/apiDistributer'

import {
  decorateRelativeBars,
  formatAveragePrices,
  formatMoney,
  formatQuantities,
  percentageLabel,
  validateSalesRange
} from '../../../../utils/salesAnalysisView'
import apiUrl from '../../../../config.js'
import { resolveGoodsImage } from '../../../../utils/goodsImageView.js'

Page({
  data: {
    navBarHeight: 0,
    contentHeight: 0,
    range: currentMonthRange(),
    startDate: '',
    stopDate: '',
    dateType: 'month',
    dateName: 'thisMonth',
    hanzi: '本月',
    update: false,
    loading: true,
    pageError: '',
    summary: {
      salesAmountText: '¥0',
      customerCount: 0,
      goodsCount: 0,
      subcategoryCount: 0,
      quantityText: '暂无有效数量',
      quantityNote: '按原交易单位统计'
    },
    qualityIssueCount: 0,

    // 两种分析模式：按商品 / 按客户
    viewMode: 'goods',
    categories: [],
    expandedCategoryId: null,

    // 按商品模式：左侧大类 -> 小类，右侧选中小类的商品
    goodsDetail: {},
    selectedSubcategoryId: null,
    selectedSubcategoryName: '商品',
    products: [],
    visibleProducts: [],
    keyword: '',

    // 按客户模式：左侧大类 -> 客户，右侧选中客户的商品
    customerList: {},
    selectedCustomerId: null,
    selectedCustomerName: '',
    customerProducts: [],
    customerProductPage: 1,
    customerProductTotal: 0,
    customerProductFinished: false,
    customerProductLoading: false,
    productError: ''
  },

  onLoad() {
    const app = getApp()
    const globalData = app.globalData || {}
    const ratio = globalData.rpxR || 1
    const navBarHeight = (globalData.navBarHeight || 0) * ratio
    const windowHeight = (globalData.windowHeight || 0) * ratio
    const range = currentMonthRange()
    this.setData({
      navBarHeight,
      contentHeight: Math.max(0, windowHeight - navBarHeight),
      range,
      startDate: range.startDate,
      stopDate: range.endDate,
      dateType: 'month',
      dateName: 'thisMonth',
      hanzi: '本月',
      update: false
    })
    this._dateBeforeSelection = null
    this._overviewRequestId = 0
    this._detailRequestId = 0
    this._customerListRequestId = 0
    this._productRequestId = 0
    this.loadReport()
  },

  onShow() {
    if (!this.data.update) return

    const range = {
      startDate: this.data.startDate,
      endDate: this.data.stopDate
    }
    const rangeError = validateSalesRange(range)
    if (rangeError) {
      const previous = this._dateBeforeSelection || {}
      this.setData({
        range: previous.range || this.data.range,
        startDate: previous.startDate || this.data.range.startDate,
        stopDate: previous.stopDate || this.data.range.endDate,
        dateType: previous.dateType || this.data.dateType,
        dateName: previous.dateName || this.data.dateName,
        hanzi: previous.hanzi || this.data.hanzi,
        update: false
      })
      this._dateBeforeSelection = null
      wx.showToast({ title: rangeError, icon: 'none' })
      return
    }

    const myDate = wx.getStorageSync('myDate') || {}
    this.setData({
      range,
      dateName: myDate.name || this.data.dateName,
      hanzi: myDate.hanzi || this.data.hanzi || '自定义',
      update: false
    })
    this._dateBeforeSelection = null
    return this.loadReport()
  },

  onUnload() {
    this._overviewRequestId += 1
    this._detailRequestId += 1
    this._customerListRequestId += 1
    this._productRequestId += 1
  },

  onPullDownRefresh() {
    this.loadReport(true)
  },

  toBack() {
    wx.navigateBack({ delta: 1 })
  },

  toDatePage() {
    this._dateBeforeSelection = {
      range: Object.assign({}, this.data.range),
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      dateType: this.data.dateType,
      dateName: this.data.dateName,
      hanzi: this.data.hanzi
    }
    this.setData({ update: true })
    wx.navigateTo({
      url: '/subPackage-charts/pages/sel/date/date?startDate=' + this.data.startDate +
        '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType +
        '&dateName=' + this.data.dateName
    })
  },

  refreshReport() {
    this.loadReport()
  },

  async loadReport(fromPullDown) {
    const rangeError = validateSalesRange(this.data.range)
    if (rangeError) {
      wx.showToast({ title: rangeError, icon: 'none' })
      if (fromPullDown) wx.stopPullDownRefresh()
      return
    }

    const requestId = ++this._overviewRequestId
    this._resetDetail()
    this.setData({ loading: true, pageError: '' })
    try {
      const response = await getSalesAnalysisOverview(Object.assign({}, this.data.range))
      if (requestId !== this._overviewRequestId) return
      const overview = this._requireData(response, '销售分析加载失败')
      const categories = (overview.categories || []).map(item => this._decorateCategory(item))
      const summary = overview.summary || {}
      const quality = overview.quality || {}
      this.setData({
        loading: false,
        summary: {
          salesAmountText: formatMoney(summary.salesAmount),
          customerCount: Number(summary.customerCount || 0),
          goodsCount: Number(summary.goodsCount || 0),
          subcategoryCount: Number(summary.subcategoryCount || 0),
          quantityText: summary.primaryQuantity
            ? formatQuantities([summary.primaryQuantity])
            : '暂无有效数量',
          quantityNote: Number(summary.otherUnitCount || 0) > 0
            ? '另有 ' + summary.otherUnitCount + ' 种交易单位'
            : '按原交易单位统计'
        },
        categories,
        qualityIssueCount: this._qualityIssueCount(quality)
      })
      if (categories.length) {
        this._expandCategory(categories[0].id)
      }
    } catch (error) {
      if (requestId !== this._overviewRequestId) return
      this.setData({
        loading: false,
        pageError: error && error.message ? error.message : '销售分析加载失败'
      })
    } finally {
      if (fromPullDown) wx.stopPullDownRefresh()
    }
  },

  switchMode(e) {
    const mode = e.currentTarget.dataset.mode
    if (mode === this.data.viewMode) return
    this._resetDetail()
    this.setData({ viewMode: mode })
    if (this.data.categories.length) {
      this._expandCategory(this.data.categories[0].id)
    }
  },

  toggleCategory(e) {
    const id = Number(e.currentTarget.dataset.id)
    if (this.data.expandedCategoryId === id) {
      this.setData({
        expandedCategoryId: null,
        selectedSubcategoryId: null,
        selectedSubcategoryName: '商品',
        selectedCustomerId: null,
        selectedCustomerName: '',
        customerProducts: []
      })
      return
    }
    this._expandCategory(id)
  },

  _expandCategory(id) {
    this.setData({ expandedCategoryId: id })
    if (this.data.viewMode === 'goods') {
      if (!this.data.goodsDetail[id]) {
        this.setData({
          ['goodsDetail.' + id]: { loadingChildren: true, subcategories: [], products: [], loaded: false, error: '' }
        })
        this._loadCategoryDetail(id)
      }
    } else {
      if (!this.data.customerList[id]) {
        this.setData({
          ['customerList.' + id]: { loading: true, list: [], page: 0, total: 0, totalPages: 0, finished: false, error: '' }
        })
        this._loadCategoryCustomers(id, 1)
      }
    }
  },

  async _loadCategoryDetail(id) {
    const requestId = ++this._detailRequestId
    try {
      const response = await getSalesAnalysisCategory(id, Object.assign({}, this.data.range))
      if (requestId !== this._detailRequestId) return
      const detail = this._requireData(response, '商品大类加载失败')
      const subcategories = (detail.subcategories || []).map(item => this._decorateSubcategory(item))
      const products = (detail.products || []).map(item => this._decorateProduct(item))
      this.setData({
        ['goodsDetail.' + id]: { loadingChildren: false, subcategories, products, loaded: true, error: '' }
      })
      if (subcategories.length) {
        this._selectSubcategory(id, subcategories[0])
      }
    } catch (error) {
      if (requestId !== this._detailRequestId) return
      this.setData({
        ['goodsDetail.' + id]: {
          loadingChildren: false,
          subcategories: [],
          products: [],
          loaded: true,
          error: error && error.message ? error.message : '商品大类加载失败'
        }
      })
    }
  },

  selectSubcategory(e) {
    const categoryId = Number(e.currentTarget.dataset.category)
    const subId = Number(e.currentTarget.dataset.id)
    const detail = this.data.goodsDetail[categoryId]
    if (!detail) return
    const sub = this._findById(detail.subcategories, 'id', subId)
    if (sub) this._selectSubcategory(categoryId, sub)
  },

  _selectSubcategory(categoryId, sub) {
    const detail = this.data.goodsDetail[categoryId] || {}
    this.setData({
      selectedSubcategoryId: sub.id,
      selectedSubcategoryName: sub.name,
      keyword: '',
      products: detail.products || []
    })
    this._applyProductFilter()
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value || '' })
    this._applyProductFilter()
  },

  clearSearch() {
    this.setData({ keyword: '' })
    this._applyProductFilter()
  },

  _applyProductFilter() {
    const selectedId = this.data.selectedSubcategoryId
    const keyword = (this.data.keyword || '').trim().toLowerCase()
    const visibleProducts = (this.data.products || []).filter(item => {
      if (String(item.subcategoryId) !== String(selectedId)) return false
      if (!keyword) return true
      return [item.goodsName, item.goodsStandard]
        .some(value => String(value || '').toLowerCase().includes(keyword))
    })
    this.setData({ visibleProducts })
  },

  // ---- 按客户模式 ----

  _updateCustomerList(id, patch) {
    const prev = this.data.customerList[id] || {
      list: [], page: 0, total: 0, totalPages: 0, finished: false, loading: false, error: ''
    }
    this.setData({ ['customerList.' + id]: Object.assign({}, prev, patch) })
  },

  async _loadCategoryCustomers(id, page) {
    const requestId = ++this._customerListRequestId
    this._updateCustomerList(id, { loading: true, error: '' })
    try {
      const response = await getSalesAnalysisCategoryCustomers(
        id,
        Object.assign({}, this.data.range),
        page,
        20
      )
      if (requestId !== this._customerListRequestId) return
      const detail = this._requireData(response, '客户列表加载失败')
      const newItems = this._decorateCustomers(detail.customers || [])
      const prev = this.data.customerList[id] || { list: [] }
      const merged = page === 1 ? newItems : (prev.list || []).concat(newItems)
      const total = Number(detail.totalCount || 0)
      this._updateCustomerList(id, {
        loading: false,
        list: merged,
        page: Number(detail.page || page),
        totalPages: Number(detail.totalPages || 0),
        total,
        finished: merged.length >= total
      })
      if (page === 1 && newItems.length && !this.data.selectedCustomerId) {
        this._selectCustomer(id, newItems[0])
      }
    } catch (error) {
      if (requestId !== this._customerListRequestId) return
      this._updateCustomerList(id, {
        loading: false,
        error: error && error.message ? error.message : '客户列表加载失败'
      })
    }
  },

  selectCustomer(e) {
    const categoryId = Number(e.currentTarget.dataset.category)
    const custId = Number(e.currentTarget.dataset.id)
    const list = (this.data.customerList[categoryId] || {}).list || []
    const cust = this._findById(list, 'customerId', custId)
    if (cust) this._selectCustomer(categoryId, cust)
  },

  _selectCustomer(categoryId, cust) {
    this.setData({
      selectedCustomerId: cust.customerId,
      selectedCustomerName: cust.customerName,
      customerProducts: [],
      customerProductPage: 1,
      customerProductTotal: 0,
      customerProductFinished: false
    })
    this._loadCustomerProducts(categoryId, cust.customerId, 1)
  },

  async _loadCustomerProducts(categoryId, customerId, page) {
    const requestId = ++this._productRequestId
    this.setData({ customerProductLoading: true, productError: '' })
    try {
      const response = await getSalesAnalysisCustomerProducts(
        categoryId,
        customerId,
        Object.assign({}, this.data.range),
        page,
        20
      )
      if (requestId !== this._productRequestId) return
      const detail = this._requireData(response, '商品明细加载失败')
      const newItems = (detail.products || []).map(item => this._decorateProduct(item))
      const merged = page === 1 ? newItems : this.data.customerProducts.concat(newItems)
      const total = Number(detail.totalCount || 0)
      this.setData({
        customerProducts: merged,
        customerProductPage: Number(detail.page || page),
        customerProductTotal: total,
        customerProductFinished: merged.length >= total,
        customerProductLoading: false,
        selectedCustomerName: (detail.customer && detail.customer.customerName)
          || this.data.selectedCustomerName
      })
    } catch (error) {
      if (requestId !== this._productRequestId) return
      this.setData({
        customerProductLoading: false,
        productError: error && error.message ? error.message : '商品明细加载失败'
      })
    }
  },

  loadMoreCustomers(e) {
    const id = Number(e.currentTarget.dataset.id)
    const list = this.data.customerList[id]
    if (!list || list.loading || list.finished) return
    this._loadCategoryCustomers(id, (list.page || 0) + 1)
  },

  loadMoreCustomerProducts() {
    if (this.data.customerProductLoading || this.data.customerProductFinished) return
    if (!this.data.selectedCustomerId) return
    this._loadCustomerProducts(
      this.data.expandedCategoryId,
      this.data.selectedCustomerId,
      (this.data.customerProductPage || 0) + 1
    )
  },

  onTreeScrollToLower() {
    if (this.data.viewMode !== 'customer') return
    const id = this.data.expandedCategoryId
    if (!id) return
    const list = this.data.customerList[id]
    if (!list || list.loading || list.finished) return
    this._loadCategoryCustomers(id, (list.page || 0) + 1)
  },

  onProductScrollToLower() {
    if (this.data.viewMode !== 'customer') return
    this.loadMoreCustomerProducts()
  },

  // ---- 内部工具 ----

  _resetDetail() {
    this._detailRequestId += 1
    this._customerListRequestId += 1
    this._productRequestId += 1
    this.setData({
      expandedCategoryId: null,
      goodsDetail: {},
      selectedSubcategoryId: null,
      selectedSubcategoryName: '商品',
      products: [],
      visibleProducts: [],
      keyword: '',
      customerList: {},
      selectedCustomerId: null,
      selectedCustomerName: '',
      customerProducts: [],
      customerProductPage: 1,
      customerProductTotal: 0,
      customerProductFinished: false,
      customerProductLoading: false,
      productError: ''
    })
  },

  _decorateCategory(item) {
    return Object.assign({}, item, {
      amountText: formatMoney(item.salesAmount),
      shareText: percentageLabel(item.share),
      quantityText: formatQuantities(item.quantities),
      shareWidth: Math.max(3, Math.min(100, Number(item.share || 0)))
    })
  },

  _decorateSubcategory(item) {
    return Object.assign({}, this._decorateCategory(item), {
      customerText: Number(item.customerCount || 0) + '家客户'
    })
  },

  _decorateProduct(item) {
    return Object.assign({}, item, {
      goodsImageUrl: resolveGoodsImage(item, apiUrl.server),
      amountText: formatMoney(item.salesAmount),
      shareText: percentageLabel(item.share),
      quantityText: formatQuantities(item.quantities),
      averagePriceText: formatAveragePrices(item.averagePrices),
      customerCountText: Number(item.customerCount || 0) + '家',
      orderCountText: Number(item.orderCount || 0) + '次',
      topCustomerText: (item.topCustomers || []).map(customer => customer.customerName).join('、') || '暂无'
    })
  },

  _decorateCustomers(rows) {
    return decorateRelativeBars(rows).map(item => this._decorateCustomer(item))
  },

  _decorateCustomer(item) {
    return Object.assign({}, item, {
      amountText: formatMoney(item.salesAmount),
      shareText: percentageLabel(item.share),
      quantityText: formatQuantities(item.quantities),
      averagePriceText: formatAveragePrices(item.averagePrices),
      lastOrderText: item.lastOrderDate || '暂无',
      orderDaysText: Number(item.orderDays || 0) + '个订货日'
    })
  },

  _qualityIssueCount(quality) {
    return [
      quality.invalidAmountLineCount,
      quality.invalidQuantityLineCount,
      quality.missingGoodsLineCount,
      quality.missingCustomerLineCount,
      quality.missingCategoryLineCount
    ].reduce((sum, value) => sum + Number(value || 0), 0)
  },

  _findById(rows, field, value) {
    return (rows || []).find(item => String(item[field]) === String(value))
  },

  _requireData(response, fallback) {
    const result = response && response.result ? response.result : {}
    if (result.code !== 0) throw new Error(result.msg || fallback)
    return result.data || {}
  }
})

function currentMonthRange() {
  const end = new Date()
  const start = new Date(end.getFullYear(), end.getMonth(), 1)
  const iso = date => date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
  return { startDate: iso(start), endDate: iso(end) }
}

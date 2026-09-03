import {
  getSalesAnalysisOverview,
  getSalesAnalysisCategory,
  getSalesAnalysisProductCustomers
} from '../../../../lib/apiDistributer'

import {
  decorateRelativeBars,
  formatAveragePrices,
  formatMoney,
  formatQuantities,
  percentageLabel,
  rangeForDays,
  validateSalesRange
} from '../../../../utils/salesAnalysisView'
import apiUrl from '../../../../config.js'
import { resolveGoodsImage } from '../../../../utils/goodsImageView.js'

Page({
  data: {
    navBarHeight: 0,
    contentHeight: 0,
    range: rangeForDays(30),
    startDate: '',
    stopDate: '',
    dateType: 'month',
    dateName: 'lastThirtyDays',
    hanzi: '过去30天',
    update: false,
    loading: true,
    detailLoading: false,
    productLoading: false,
    pageError: '',
    detailError: '',
    productError: '',
    summary: {
      salesAmountText: '¥0',
      customerCount: 0,
      goodsCount: 0,
      subcategoryCount: 0,
      quantityText: '暂无有效数量',
      quantityNote: '按原交易单位统计'
    },
    categories: [],
    selectedCategoryId: null,
    selectedCategoryName: '商品大类',
    topCustomers: [],
    subcategories: [],
    selectedSubcategoryId: null,
    selectedSubcategoryName: '商品',
    products: [],
    visibleProducts: [],
    keyword: '',
    qualityIssueCount: 0,
    drawerOpen: false,
    selectedProduct: null,
    productCustomers: [],
    productOthers: null
  },

  onLoad() {
    const app = getApp()
    const globalData = app.globalData || {}
    const ratio = globalData.rpxR || 1
    const navBarHeight = (globalData.navBarHeight || 0) * ratio
    const windowHeight = (globalData.windowHeight || 0) * ratio
    const range = rangeForDays(30)
    this.setData({
      navBarHeight,
      contentHeight: Math.max(0, windowHeight - navBarHeight),
      range,
      startDate: range.startDate,
      stopDate: range.endDate,
      dateType: 'month',
      dateName: 'lastThirtyDays',
      hanzi: '过去30天',
      update: false
    })
    this._dateBeforeSelection = null
    this._overviewRequestId = 0
    this._detailRequestId = 0
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
    this._closeDrawer()
    this.setData({ loading: true, pageError: '', detailError: '' })
    try {
      const response = await getSalesAnalysisOverview(Object.assign({}, this.data.range))
      if (requestId !== this._overviewRequestId) return
      const overview = this._requireData(response, '销售分析加载失败')
      const categories = (overview.categories || []).map(item => this._decorateCategory(item))
      const summary = overview.summary || {}
      const quality = overview.quality || {}
      this._overview = overview
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
        topCustomers: this._decorateCustomers(overview.topCustomers || []),
        qualityIssueCount: this._qualityIssueCount(quality)
      })
      if (categories.length) {
        await this._selectCategory(categories[0])
      } else {
        this._resetDetail()
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

  selectCategory(e) {
    const category = this._findById(this.data.categories, 'id', e.currentTarget.dataset.id)
    if (category) this._selectCategory(category)
  },

  async _selectCategory(category) {
    const requestId = ++this._detailRequestId
    this._closeDrawer()
    this._products = []
    this.setData({
      selectedCategoryId: category.id,
      selectedCategoryName: category.name,
      selectedSubcategoryId: null,
      selectedSubcategoryName: '商品',
      subcategories: [],
      products: [],
      visibleProducts: [],
      keyword: '',
      detailLoading: true,
      detailError: ''
    })
    try {
      const response = await getSalesAnalysisCategory(
        category.id,
        Object.assign({}, this.data.range)
      )
      if (requestId !== this._detailRequestId) return
      const detail = this._requireData(response, '商品大类加载失败')
      const subcategories = (detail.subcategories || []).map(item => this._decorateSubcategory(item))
      const products = (detail.products || []).map(item => this._decorateProduct(item))
      this._products = products
      this.setData({
        detailLoading: false,
        selectedCategoryName: detail.category && detail.category.name
          ? detail.category.name
          : category.name,
        subcategories,
        products,
        topCustomers: this._decorateCustomers(detail.topCustomers || [])
      })
      if (subcategories.length) this._selectSubcategory(subcategories[0])
    } catch (error) {
      if (requestId !== this._detailRequestId) return
      this.setData({
        detailLoading: false,
        detailError: error && error.message ? error.message : '商品大类加载失败'
      })
    }
  },

  selectSubcategory(e) {
    const item = this._findById(this.data.subcategories, 'id', e.currentTarget.dataset.id)
    if (item) this._selectSubcategory(item)
  },

  _selectSubcategory(item) {
    this._closeDrawer()
    this.setData({
      selectedSubcategoryId: item.id,
      selectedSubcategoryName: item.name,
      keyword: ''
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
    const visibleProducts = (this._products || []).filter(item => {
      if (String(item.subcategoryId) !== String(selectedId)) return false
      if (!keyword) return true
      return [item.goodsName, item.goodsStandard]
        .some(value => String(value || '').toLowerCase().includes(keyword))
    })
    this.setData({ visibleProducts })
  },

  openProduct(e) {
    const product = this._findById(this._products || [], 'goodsId', e.currentTarget.dataset.id)
    if (!product) return
    this._loadProductCustomers(product)
  },

  async _loadProductCustomers(product) {
    const requestId = ++this._productRequestId
    this.setData({
      drawerOpen: true,
      selectedProduct: product,
      productCustomers: [],
      productOthers: null,
      productLoading: true,
      productError: ''
    })
    try {
      const response = await getSalesAnalysisProductCustomers(
        product.goodsId,
        Object.assign({}, this.data.range),
        200
      )
      if (requestId !== this._productRequestId) return
      const detail = this._requireData(response, '客户分布加载失败')
      this.setData({
        selectedProduct: this._decorateProduct(detail.product || product),
        productCustomers: this._decorateCustomers(detail.customers || []),
        productOthers: detail.others ? this._decorateCustomer(detail.others) : null,
        productLoading: false
      })
    } catch (error) {
      if (requestId !== this._productRequestId) return
      this.setData({
        productLoading: false,
        productError: error && error.message ? error.message : '客户分布加载失败'
      })
    }
  },

  closeDrawer() {
    this._closeDrawer()
  },

  stopTap() {},

  _closeDrawer() {
    this._productRequestId += 1
    this.setData({
      drawerOpen: false,
      productLoading: false,
      productError: ''
    })
  },

  _resetDetail() {
    this._products = []
    this.setData({
      selectedCategoryId: null,
      selectedCategoryName: '商品大类',
      selectedSubcategoryId: null,
      selectedSubcategoryName: '商品',
      subcategories: [],
      products: [],
      visibleProducts: []
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

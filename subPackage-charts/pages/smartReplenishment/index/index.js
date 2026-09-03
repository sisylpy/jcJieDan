import {
  createSmartReplenishmentProcurement,
  forecastSmartReplenishment,
  getSmartReplenishmentCatalog,
  getSmartReplenishmentContexts,
  getSmartReplenishmentGoodsDetail
} from '../../../../lib/apiDistributer'

import {
  applySmartProductFilters,
  buildSmartCategories,
  decorateSmartProducts,
  forecastRangeForMode,
  smartSummary,
  validateForecastRange
} from '../../../../utils/smartReplenishmentView'

import apiUrl from '../../../../config.js'

const BASELINE = 'V8_REPLENISHMENT_STATE'
const CUSTOMER_CACHE_KEY = 'smartReplenishmentCustomerCatalog'
const CUSTOMER_SELECTION_KEY = 'smartReplenishmentCustomerSelection'

Page({
  data: {
    navBarHeight: 0,
    contentHeight: 0,
    loading: true,
    pageError: '',
    contextNotice: '',
    disId: null,
    selectedDepartmentId: null,
    selectedDepartmentName: '全部客户',
    selectedDepartmentHistory: '汇总所有有效客户',
    forecastToday: '',
    maxForecastDate: '',
    dateMode: 'TODAY',
    startDate: '',
    endDate: '',
    dateModeLabel: '今天',
    showCustomDate: false,
    summary: { total: 0, levelA: 0, levelB: 0 },
    products: [],
    visibleProducts: [],
    categories: [],
    activeLevel: '',
    activeCategory: '',
    keyword: ''
  },

  onLoad() {
    const app = getApp()
    const globalData = app.globalData || {}
    const ratio = globalData.rpxR || 1
    const user = wx.getStorageSync('userInfo') || {}
    const disInfo = wx.getStorageSync('disInfo') || user.nxDistributerEntity || {}
    const disId = Number(user.nxDiuDistributerId || disInfo.nxDistributerId)
    if (Number(user.nxDiuAdmin) !== 0) {
      wx.showToast({ title: '只有老板账号可以使用智能备货', icon: 'none' })
      setTimeout(() => wx.navigateBack({ delta: 1 }), 300)
      return
    }
    this._catalog = null
    this._run = null
    this._goodsDetails = {}
    this._contexts = {}
    this._expandedGoods = {}
    this._creatingGoods = {}
    this._forecastRequestId = 0
    this._customerSelectionChanged = false
    this.setData({
      navBarHeight: (globalData.navBarHeight || 0) * ratio,
      contentHeight: Math.max(0, (globalData.windowHeight || 0) * ratio -
        (globalData.navBarHeight || 0) * ratio),
      disId: Number.isFinite(disId) && disId > 0 ? disId : null
    })
    this.loadCatalog()
  },

  onShow() {
    if (!this._customerSelectionChanged || !this._catalog) return
    this._customerSelectionChanged = false
    this.loadForecast()
  },

  onUnload() {
    this._forecastRequestId += 1
  },

  onPullDownRefresh() {
    this.loadCatalog(true)
  },

  toBack() {
    wx.navigateBack({ delta: 1 })
  },

  async loadCatalog(fromPullDown) {
    if (!this.data.disId) {
      this.setData({ loading: false, pageError: '当前账号缺少配送商信息，请重新登录后再试' })
      if (fromPullDown) wx.stopPullDownRefresh()
      return
    }
    this.setData({ loading: true, pageError: '', contextNotice: '' })
    try {
      const response = await getSmartReplenishmentCatalog(this.data.disId)
      const catalog = this._requireData(response, '客户目录加载失败')
      this._catalog = catalog
      const departments = Array.isArray(catalog.departments) ? catalog.departments : []
      const forecastToday = catalog.forecastDate || ''
      const maxForecastDate = catalog.maxForecastDate || forecastToday
      const selected = this._resolveInitialCustomer(departments)
      const existingRange = { startDate: this.data.startDate, endDate: this.data.endDate }
      const preserveCustomRange = this.data.dateMode === 'CUSTOM' &&
        !validateForecastRange(existingRange, forecastToday, maxForecastDate)
      const range = preserveCustomRange
        ? existingRange
        : forecastRangeForMode(this.data.dateMode, forecastToday)
      wx.setStorageSync(CUSTOMER_CACHE_KEY, {
        distributerId: this.data.disId,
        departments,
        selectedDepartmentId: selected.departmentId
      })
      this.setData({
        forecastToday,
        maxForecastDate,
        startDate: range.startDate,
        endDate: range.endDate,
        selectedDepartmentId: selected.departmentId,
        selectedDepartmentName: selected.departmentName,
        selectedDepartmentHistory: selected.historyLabel
      })
      await this.loadForecast()
    } catch (error) {
      this.setData({
        loading: false,
        pageError: error && error.message ? error.message : '智能备货加载失败'
      })
    } finally {
      if (fromPullDown) wx.stopPullDownRefresh()
    }
  },

  refreshPage() {
    this.loadCatalog()
  },

  toCustomerPicker() {
    if (!this._catalog) return
    wx.setStorageSync(CUSTOMER_CACHE_KEY, {
      distributerId: this.data.disId,
      departments: this._catalog.departments || [],
      selectedDepartmentId: this.data.selectedDepartmentId
    })
    wx.navigateTo({
      url: '/subPackage-charts/pages/smartReplenishment/customerPicker/customerPicker?selectedId=' +
        (this.data.selectedDepartmentId === null ? 'ALL' : this.data.selectedDepartmentId)
    })
  },

  applyCustomerSelection(selection) {
    const departmentId = selection && selection.departmentId !== null &&
      selection.departmentId !== undefined && selection.departmentId !== ''
      ? Number(selection.departmentId) : null
    const customer = {
      departmentId,
      departmentName: selection && selection.departmentName ? selection.departmentName : '全部客户',
      historyLabel: selection && selection.historyLabel ? selection.historyLabel : '汇总所有有效客户'
    }
    wx.setStorageSync(CUSTOMER_SELECTION_KEY, customer)
    this.setData({
      selectedDepartmentId: customer.departmentId,
      selectedDepartmentName: customer.departmentName,
      selectedDepartmentHistory: customer.historyLabel,
      activeLevel: '',
      activeCategory: '',
      keyword: ''
    })
    this._customerSelectionChanged = true
  },

  selectDateMode(e) {
    const mode = e.currentTarget.dataset.mode
    if (mode === 'CUSTOM') {
      this.setData({ dateMode: mode, dateModeLabel: '自定义', showCustomDate: true })
      return
    }
    const labels = { TODAY: '今天', TOMORROW: '明天', NEXT_7: '未来7天' }
    const range = forecastRangeForMode(mode, this.data.forecastToday)
    this.setData({
      dateMode: mode,
      dateModeLabel: labels[mode] || '今天',
      showCustomDate: false,
      startDate: range.startDate,
      endDate: range.endDate,
      activeLevel: '',
      activeCategory: '',
      keyword: ''
    })
    this.loadForecast()
  },

  onStartDateChange(e) {
    let startDate = e.detail.value
    let endDate = this.data.endDate
    if (!endDate || startDate > endDate) endDate = startDate
    this.setData({ dateMode: 'CUSTOM', dateModeLabel: '自定义', startDate, endDate })
    this.loadForecast()
  },

  onEndDateChange(e) {
    let endDate = e.detail.value
    let startDate = this.data.startDate
    if (!startDate || endDate < startDate) startDate = endDate
    this.setData({ dateMode: 'CUSTOM', dateModeLabel: '自定义', startDate, endDate })
    this.loadForecast()
  },

  async loadForecast() {
    const range = { startDate: this.data.startDate, endDate: this.data.endDate }
    const rangeError = validateForecastRange(
      range,
      this.data.forecastToday,
      this.data.maxForecastDate
    )
    if (rangeError) {
      wx.showToast({ title: rangeError, icon: 'none' })
      return
    }
    const requestId = ++this._forecastRequestId
    this.setData({ loading: true, pageError: '', contextNotice: '' })
    try {
      const response = await forecastSmartReplenishment({
        distributerId: this.data.disId,
        departmentId: this.data.selectedDepartmentId,
        predictionDate: this.data.startDate,
        predictionEndDate: this.data.endDate,
        historyWindowDays: 30,
        algorithmVersion: BASELINE
      })
      if (requestId !== this._forecastRequestId) return
      this._run = this._requireData(response, '智能备货预测失败')
      this._goodsDetails = {}
      this._contexts = {}
      this._expandedGoods = {}
      this._creatingGoods = {}
      const goodsIds = this._forecastGoodsIds(this._run)
      goodsIds.forEach(goodsId => { this._contexts[goodsId] = { loading: true } })
      this._decorateProducts()
      this.setData({ loading: false })
      await Promise.all([
        this._loadProcurementContexts(goodsIds, requestId),
        this._loadGoodsDetails(goodsIds, requestId)
      ])
    } catch (error) {
      if (requestId !== this._forecastRequestId) return
      this.setData({
        loading: false,
        pageError: error && error.message ? error.message : '智能备货预测失败'
      })
    }
  },

  async _loadProcurementContexts(goodsIds, requestId) {
    if (!goodsIds.length) return
    try {
      const contexts = []
      for (let index = 0; index < goodsIds.length; index += 200) {
        const response = await getSmartReplenishmentContexts({
          distributerId: this.data.disId,
          goodsIds: goodsIds.slice(index, index + 200)
        })
        const rows = this._requireData(response, '库存和采购状态读取失败')
        contexts.push(...(Array.isArray(rows) ? rows : []))
      }
      if (requestId !== this._forecastRequestId) return
      const returned = {}
      contexts.forEach(context => {
        const goodsId = Number(context.goodsId)
        returned[goodsId] = true
        this._contexts[goodsId] = Object.assign({}, context, { loading: false })
      })
      goodsIds.forEach(goodsId => {
        if (!returned[goodsId]) this._contexts[goodsId] = { goodsId, loading: false, error: true }
      })
      this.setData({ contextNotice: '' })
    } catch (error) {
      if (requestId !== this._forecastRequestId) return
      goodsIds.forEach(goodsId => {
        this._contexts[goodsId] = { goodsId, loading: false, error: true }
      })
      this.setData({ contextNotice: '库存和采购状态暂时无法读取，预测清单仍可查看' })
    }
    this._decorateProducts()
  },

  async _loadGoodsDetails(goodsIds, requestId) {
    for (let index = 0; index < goodsIds.length; index += 6) {
      const batch = goodsIds.slice(index, index + 6)
      const results = await Promise.all(batch.map(goodsId =>
        getSmartReplenishmentGoodsDetail(this.data.disId, goodsId).catch(() => null)
      ))
      if (requestId !== this._forecastRequestId) return
      results.forEach((response, position) => {
        if (response && response.result && Number(response.result.code) === 0) {
          this._goodsDetails[batch[position]] = response.result.data || {}
        }
      })
      this._decorateProducts()
    }
  },

  selectLevel(e) {
    const level = e.currentTarget.dataset.level || ''
    this.setData({ activeLevel: this.data.activeLevel === level ? '' : level, activeCategory: '' })
    this._applyFilters()
  },

  selectCategory(e) {
    const category = e.currentTarget.dataset.category || ''
    this.setData({ activeCategory: this.data.activeCategory === category ? '' : category })
    this._applyFilters()
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value || '' })
    this._applyFilters()
  },

  clearKeyword() {
    this.setData({ keyword: '' })
    this._applyFilters()
  },

  toggleEvidence(e) {
    const goodsId = Number(e.currentTarget.dataset.id)
    this._expandedGoods[goodsId] = !this._expandedGoods[goodsId]
    this._decorateProducts()
  },

  addProcurement(e) {
    const goodsId = Number(e.currentTarget.dataset.id)
    const product = this.data.products.find(item => Number(item.goodsId) === goodsId)
    if (!product || !product.context.canCreate || this._creatingGoods[goodsId]) return
    if (!Number.isFinite(Number(product.predictedQuantity)) ||
      Number(product.predictedQuantity) <= 0 || !String(product.predictedUnit || '').trim()) {
      wx.showToast({ title: '预估数量或订货单位不完整，暂时不能加入采购', icon: 'none' })
      return
    }
    wx.showModal({
      title: '添加采购商品',
      content: '确认将“' + product.goodsName + '” ' + product.predictedQuantityText +
        product.predictedUnit + ' 加入采购吗？\n入库时再选择真实货架。',
      confirmText: '加入采购',
      success: result => {
        if (result.confirm) this._createProcurement(product)
      }
    })
  },

  async _createProcurement(product) {
    const goodsId = Number(product.goodsId)
    this._creatingGoods[goodsId] = true
    this._decorateProducts()
    try {
      const response = await createSmartReplenishmentProcurement({
        distributerId: this.data.disId,
        goodsId,
        quantity: product.predictedQuantity,
        unit: product.predictedUnit
      })
      const result = this._requireData(response, '加入采购失败')
      this._contexts[goodsId] = Object.assign({}, result.context || {}, {
        goodsId,
        loading: false
      })
      wx.showToast({
        title: result.created ? '已加入采购' : '已有采购任务，未重复添加',
        icon: 'none'
      })
    } catch (error) {
      wx.showToast({
        title: error && error.message ? error.message : '加入采购失败',
        icon: 'none'
      })
    } finally {
      delete this._creatingGoods[goodsId]
      this._decorateProducts()
    }
  },

  _decorateProducts() {
    const products = decorateSmartProducts(
      this._run,
      this._goodsDetails,
      this._contexts,
      apiUrl.server
    ).map(product => Object.assign({}, product, {
      expanded: Boolean(this._expandedGoods[product.goodsId]),
      creating: Boolean(this._creatingGoods[product.goodsId])
    }))
    this.setData({
      products,
      summary: smartSummary(products),
      categories: buildSmartCategories(products)
    })
    this._applyFilters(products)
  },

  _applyFilters(source) {
    const products = source || this.data.products
    this.setData({
      visibleProducts: applySmartProductFilters(products, {
        level: this.data.activeLevel,
        category: this.data.activeCategory,
        keyword: this.data.keyword
      })
    })
  },

  _forecastGoodsIds(run) {
    const ids = (run && Array.isArray(run.items) ? run.items : [])
      .filter(item => item && item.policy &&
        (item.policy.level === 'LEVEL_A' || item.policy.level === 'LEVEL_B'))
      .map(item => Number(item.goodsId))
      .filter(goodsId => Number.isFinite(goodsId) && goodsId > 0)
    return Array.from(new Set(ids))
  },

  _resolveInitialCustomer(departments) {
    const saved = wx.getStorageSync(CUSTOMER_SELECTION_KEY) || null
    if (saved && (saved.departmentId === null || saved.departmentId === '')) {
      return { departmentId: null, departmentName: '全部客户', historyLabel: '汇总所有有效客户' }
    }
    if (saved) {
      const matched = departments.find(item =>
        String(item.departmentId) === String(saved.departmentId))
      if (matched) return this._customerFromDepartment(matched)
    }
    const first = departments.find(item => Number(item.historicalLineCount || 0) > 0) || departments[0]
    return first ? this._customerFromDepartment(first) : {
      departmentId: null,
      departmentName: '全部客户',
      historyLabel: '汇总所有有效客户'
    }
  },

  _customerFromDepartment(department) {
    const count = Number(department.historicalLineCount || 0)
    return {
      departmentId: Number(department.departmentId),
      departmentName: department.departmentName || '未命名客户',
      historyLabel: count > 0 ? '历史 ' + count.toLocaleString('zh-CN') + ' 条' : '暂无历史数据'
    }
  },

  _requireData(response, fallback) {
    const envelope = response && response.result
    if (!envelope || Number(envelope.code) !== 0) {
      throw new Error(envelope && envelope.msg ? envelope.msg : fallback)
    }
    return envelope.data
  }
})

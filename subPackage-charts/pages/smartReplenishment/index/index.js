import {
  createSmartReplenishmentProcurement,
  deleteSmartReplenishmentProcurement,
  forecastSmartReplenishment,
  getSmartReplenishmentCatalog,
  getSmartReplenishmentContexts,
  getSmartReplenishmentGoodsDetail,
  updateSmartReplenishmentProcurement
} from '../../../../lib/apiDistributer'

import {
  applySmartProductFilters,
  buildSmartCategories,
  decorateSmartProducts,
  forecastRangeForMode,
  smartGoodsTypeSummary,
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
    selectedDepartmentIds: [],
    hasCustomerFilter: false,
    selectedDepartmentName: '全部客户',
    selectedDepartmentHistory: '汇总所有有效客户',
    forecastToday: '',
    maxForecastDate: '',
    dateMode: 'TODAY',
    startDate: '',
    endDate: '',
    dateModeLabel: '今天',
    showCustomDate: false,
    customStartDate: '',
    customEndDate: '',
    goodsTypeSummary: { total: 0, self: 0, stock: 0 },
    predictionSummary: { total: 0, levelA: 0, levelB: 0 },
    products: [],
    visibleProducts: [],
    categories: [],
    activeGoodsType: '',
    activeCategory: '',
    activeCategoryName: '',
    keyword: '',
    showPurchaseModal: false,
    purchaseModalMode: 'create',
    purchaseDraft: null,
    purchaseQuantity: '',
    purchaseUnit: '',
    purchaseKeyboardHeight: 0
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
    this._rpxRatio = ratio
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

  preventMove() {},

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
        selectedDepartmentIds: selected.departmentIds
      })
      this.setData({
        forecastToday,
        maxForecastDate,
        startDate: range.startDate,
        endDate: range.endDate,
        selectedDepartmentId: selected.departmentId,
        selectedDepartmentIds: selected.departmentIds,
        hasCustomerFilter: selected.departmentIds.length > 0,
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
      selectedDepartmentIds: this.data.selectedDepartmentIds
    })
    wx.navigateTo({
      url: '/subPackage-charts/pages/smartReplenishment/customerPicker/customerPicker?selectedIds=' +
        encodeURIComponent(this.data.selectedDepartmentIds.length
          ? this.data.selectedDepartmentIds.join(',') : 'ALL')
    })
  },

  selectDateMode(e) {
    const mode = e.currentTarget.dataset.mode
    if (mode === 'CUSTOM') {
      this.setData({
        showCustomDate: true,
        customStartDate: this.data.startDate || this.data.forecastToday,
        customEndDate: this.data.endDate || this.data.forecastToday
      })
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
      activeCategory: '',
      keyword: ''
    })
    return this.loadForecast()
  },

  closeCustomDate() {
    this.setData({ showCustomDate: false })
  },

  onCustomStartDateChange(e) {
    const customStartDate = e.detail.value
    const customEndDate = !this.data.customEndDate || customStartDate > this.data.customEndDate
      ? customStartDate : this.data.customEndDate
    this.setData({ customStartDate, customEndDate })
  },

  onCustomEndDateChange(e) {
    const customEndDate = e.detail.value
    const customStartDate = !this.data.customStartDate || customEndDate < this.data.customStartDate
      ? customEndDate : this.data.customStartDate
    this.setData({ customStartDate, customEndDate })
  },

  confirmCustomDate() {
    const range = {
      startDate: this.data.customStartDate,
      endDate: this.data.customEndDate
    }
    const rangeError = validateForecastRange(
      range,
      this.data.forecastToday,
      this.data.maxForecastDate
    )
    if (rangeError) {
      wx.showToast({ title: rangeError, icon: 'none' })
      return
    }
    this.setData({
      dateMode: 'CUSTOM',
      dateModeLabel: '自定义',
      showCustomDate: false,
      startDate: range.startDate,
      endDate: range.endDate,
      activeCategory: '',
      keyword: ''
    })
    return this.loadForecast()
  },

  applyCustomerSelection(selection) {
    const requestedIds = selection && Array.isArray(selection.departmentIds)
      ? selection.departmentIds : (selection && selection.departmentId ? [selection.departmentId] : [])
    const uniqueIds = Array.from(new Set(requestedIds.map(Number)
      .filter(id => Number.isFinite(id) && id > 0)))
    const departments = this._catalog && Array.isArray(this._catalog.departments)
      ? this._catalog.departments : []
    const selected = uniqueIds.map(id => departments.find(item =>
      Number(item.departmentId) === id)).filter(Boolean)
    const customer = this._selectionFromDepartments(selected)
    wx.setStorageSync(CUSTOMER_SELECTION_KEY, customer)
    this.setData({
      selectedDepartmentId: customer.departmentId,
      selectedDepartmentIds: customer.departmentIds,
      hasCustomerFilter: customer.departmentIds.length > 0,
      selectedDepartmentName: customer.departmentName,
      selectedDepartmentHistory: customer.historyLabel,
      activeCategory: '',
      keyword: ''
    })
    this._customerSelectionChanged = true
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
      const departmentIds = this.data.selectedDepartmentIds || []
      const forecastRequest = {
        distributerId: this.data.disId,
        predictionDate: this.data.startDate,
        predictionEndDate: this.data.endDate,
        historyWindowDays: 30,
        algorithmVersion: BASELINE
      }
      if (departmentIds.length === 1) forecastRequest.departmentId = departmentIds[0]
      if (departmentIds.length > 1) forecastRequest.departmentIds = departmentIds
      const response = await forecastSmartReplenishment(forecastRequest)
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

  selectGoodsType(e) {
    const goodsType = e.currentTarget.dataset.type
    this.setData({ activeGoodsType: goodsType === '' ? '' : Number(goodsType) })
    this._applyFilters()
  },

  clearCustomerFilter() {
    if (!this.data.hasCustomerFilter) return
    this.applyCustomerSelection({ departmentIds: [] })
    this._customerSelectionChanged = false
    this.loadForecast()
  },

  selectCategory(e) {
    const category = e.currentTarget.dataset.category || ''
    this.setData({ activeCategory: category })
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
    this.setData({
      showPurchaseModal: true,
      purchaseModalMode: 'create',
      purchaseDraft: product,
      purchaseQuantity: String(product.predictedQuantity),
      purchaseUnit: String(product.predictedUnit || '')
    })
  },

  editProcurement(e) {
    const goodsId = Number(e.currentTarget.dataset.id)
    const product = this.data.products.find(item => Number(item.goodsId) === goodsId)
    if (!product || !product.context.activePurchaseCount) return
    if (!product.context.canEdit) {
      wx.showToast({ title: '采购已经进入执行流程，不能在这里修改', icon: 'none' })
      return
    }
    this.setData({
      showPurchaseModal: true,
      purchaseModalMode: 'edit',
      purchaseDraft: product,
      purchaseQuantity: String(product.context.activePurchaseQuantity),
      purchaseUnit: String(product.context.activePurchaseUnit || product.predictedUnit || '')
    })
  },

  onPurchaseQuantityInput(e) {
    this.setData({ purchaseQuantity: e.detail.value || '' })
  },

  onPurchaseUnitInput(e) {
    this.setData({ purchaseUnit: e.detail.value || '' })
  },

  onPurchaseKeyboardHeightChange(e) {
    const height = Number(e && e.detail && e.detail.height) || 0
    const ratio = this._rpxRatio || ((getApp().globalData || {}).rpxR || 1)
    this.setData({ purchaseKeyboardHeight: Math.max(0, Math.ceil(height * ratio)) })
  },

  closePurchaseModal() {
    this.setData({
      showPurchaseModal: false,
      purchaseModalMode: 'create',
      purchaseDraft: null,
      purchaseQuantity: '',
      purchaseUnit: '',
      purchaseKeyboardHeight: 0
    })
  },

  confirmPurchase() {
    const product = this.data.purchaseDraft
    const quantityText = String(this.data.purchaseQuantity || '').trim()
    const unit = String(this.data.purchaseUnit || '').trim()
    const quantity = Number(quantityText)
    if (!product || !Number.isFinite(quantity) || quantity <= 0) {
      wx.showToast({ title: '请输入大于0的备货数量', icon: 'none' })
      return
    }
    if (!unit || unit.length > 32) {
      wx.showToast({ title: unit ? '采购规格不能超过32个字' : '请输入采购规格', icon: 'none' })
      return
    }
    const mode = this.data.purchaseModalMode
    this.closePurchaseModal()
    if (mode === 'edit') return this._updateProcurement(product, quantityText, unit)
    return this._createProcurement(Object.assign({}, product, {
      predictedQuantity: quantityText,
      predictedUnit: unit
    }))
  },

  deleteProcurement() {
    const product = this.data.purchaseDraft
    if (!product || this.data.purchaseModalMode !== 'edit' || !product.context.canEdit) return
    wx.showModal({
      title: '删除采购',
      content: '确认删除“' + product.goodsName + '”这条采购吗？',
      confirmText: '删除',
      confirmColor: '#d94d43',
      success: result => {
        if (!result.confirm) return
        this.closePurchaseModal()
        this._deleteProcurement(product)
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

  async _updateProcurement(product, quantity, unit) {
    const goodsId = Number(product.goodsId)
    const purchaseGoodsId = Number(product.context.activePurchaseGoodsId)
    this._creatingGoods[goodsId] = true
    this._decorateProducts()
    try {
      const response = await updateSmartReplenishmentProcurement(purchaseGoodsId, {
        distributerId: this.data.disId,
        quantity,
        unit
      })
      this._contexts[goodsId] = Object.assign({}, this._requireData(response, '修改采购失败'), {
        goodsId,
        loading: false
      })
      wx.showToast({ title: '采购数量已修改', icon: 'none' })
    } catch (error) {
      wx.showToast({ title: error && error.message ? error.message : '修改采购失败', icon: 'none' })
    } finally {
      delete this._creatingGoods[goodsId]
      this._decorateProducts()
    }
  },

  async _deleteProcurement(product) {
    const goodsId = Number(product.goodsId)
    const purchaseGoodsId = Number(product.context.activePurchaseGoodsId)
    this._creatingGoods[goodsId] = true
    this._decorateProducts()
    try {
      const response = await deleteSmartReplenishmentProcurement(purchaseGoodsId, {
        distributerId: this.data.disId
      })
      this._contexts[goodsId] = Object.assign({}, this._requireData(response, '删除采购失败'), {
        goodsId,
        loading: false
      })
      wx.showToast({ title: '采购已删除', icon: 'none' })
    } catch (error) {
      wx.showToast({ title: error && error.message ? error.message : '删除采购失败', icon: 'none' })
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
      goodsTypeSummary: smartGoodsTypeSummary(products),
      predictionSummary: smartSummary(products)
    })
    this._applyFilters(products)
  },

  _applyFilters(source) {
    const products = source || this.data.products
    const matchingProducts = applySmartProductFilters(products, {
        goodsType: this.data.activeGoodsType,
        keyword: this.data.keyword
      })
    const categories = buildSmartCategories(matchingProducts)
    let activeCategoryKey = this.data.activeCategory
    if (!categories.some(item => item.key === activeCategoryKey)) {
      activeCategoryKey = categories.length ? categories[0].key : ''
    }
    const visibleProducts = applySmartProductFilters(matchingProducts, {
      category: activeCategoryKey
    })
    const activeCategory = categories.find(item => item.key === activeCategoryKey)
    this.setData({
      visibleProducts,
      categories,
      activeCategory: activeCategoryKey,
      activeCategoryName: activeCategory ? activeCategory.name : ''
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
    if (saved && Array.isArray(saved.departmentIds)) {
      const selected = saved.departmentIds.map(Number).map(id => departments.find(item =>
        Number(item.departmentId) === id)).filter(Boolean)
      return this._selectionFromDepartments(selected)
    }
    if (saved && (saved.departmentId === null || saved.departmentId === '')) {
      return this._selectionFromDepartments([])
    }
    if (saved) {
      const matched = departments.find(item =>
        String(item.departmentId) === String(saved.departmentId))
      if (matched) return this._selectionFromDepartments([matched])
    }
    const first = departments.find(item => Number(item.historicalLineCount || 0) > 0) || departments[0]
    return this._selectionFromDepartments(first ? [first] : [])
  },

  _selectionFromDepartments(departments) {
    const selected = Array.isArray(departments) ? departments : []
    const departmentIds = selected.map(item => Number(item.departmentId))
    return {
      departmentId: departmentIds.length === 1 ? departmentIds[0] : null,
      departmentIds,
      departmentName: selected.length
        ? selected.map(item => item.departmentName || '未命名客户').join('，') : '全部客户',
      historyLabel: selected.length ? '已选 ' + selected.length + ' 家客户' : '汇总所有有效客户'
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

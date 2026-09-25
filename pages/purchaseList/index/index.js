var tabBar = require('../../../lib/routeDispatchTabBar.js')

import apiUrl from '../../../config.js'
import {
  purchaseGetGoodsByDemandScope,
  saveBossInventoryPurchaseBatch
} from '../../../lib/apiDepOrder'
import {
  deleteSmartReplenishmentProcurement,
  updateSmartReplenishmentProcurement
} from '../../../lib/apiDistributer'

const DEMAND_SCOPE = 'SHELF_REPLENISHMENT'
const PURCHASE_APP_ID = 'wx1ea78d3f33234284'
const PURCHASE_SOURCE_PRESENTATION = {
  SHELF_REPLENISHMENT: { text: '货架采购', className: 'shelf' },
  UNSHELVED_REPLENISHMENT: { text: '无货架', className: 'unshelved' },
  VOICE_PURCHASE: { text: '语音采购', className: 'voice' },
  SMART_REPLENISHMENT: { text: '智能备货', className: 'smart' }
}

Page({
  data: {
    navBarHeight: 0,
    contentHeight: 500,
    toolBadgeCount: 0,
    windowWidth: 750,
    windowHeight: 1200,
    url: '',
    avatarUrl: '',
    userInfo: null,
    disInfo: null,
    disId: null,
    purchaserId: null,
    disName: '',
    purchaseGoods: [],
    purchaseCategories: [],
    selectedCategoryIndex: 0,
    categoryIntoView: '',
    leftCategoryIntoView: '',
    leftMenuWidth: 120,
    purchaseLoading: false,
    selectedGoods: [],
    showSelectionDrawer: false,
    pendingRefresh: false,
    submittingBatch: false,
    batchRequestKey: '',
    showEditPurchaseModal: false,
    editPurchaseDraft: null,
    editPurchaseQuantity: '',
    editPurchaseUnit: '',
    editPurchaseKeyboardHeight: 0,
    editPurchaseSubmitting: false
  },

  onLoad() {
    this._restoreContext()
    this._measurePage()
  },

  onShow() {
    this._restoreContext()
    this._measurePage()
    var bar = typeof this.getTabBar === 'function' && this.getTabBar()
    if (bar) {
      if (typeof bar.refreshTabs === 'function') bar.refreshTabs()
      bar.setData({
        selected: tabBar.getTabIndex('pages/purchaseList/index/index')
      })
    }
    this.loadPurchaseGoods()
  },

  onUnload() {
    clearTimeout(this._categoryScrollTimer)
  },

  _restoreContext() {
    var userInfo = wx.getStorageSync('userInfo') || {}
    var storedDis = wx.getStorageSync('disInfo') || {}
    var userDis = userInfo.nxDistributerEntity || {}
    var disInfo = Object.keys(storedDis).length ? storedDis : userDis
    var ownerDisId = Number(wx.getStorageSync('ownerDistributerId') || 0)
    var ownerUserId = Number(wx.getStorageSync('ownerUserId') || 0)
    var disId = ownerDisId || disInfo.nxDistributerId || userDis.nxDistributerId || null
    var avatar = userInfo.nxDiuWxAvartraUrl || ''
    var avatarUrl = /^https?:\/\//.test(avatar) ? avatar : (avatar ? apiUrl.server + avatar : '')
    this.setData({
      userInfo: userInfo,
      disInfo: disInfo,
      disId: disId,
      purchaserId: ownerUserId || userInfo.nxDistributerUserId || null,
      disName: disInfo.nxDistributerName || '',
      url: apiUrl.server,
      avatarUrl: avatarUrl
    })
  },

  _measurePage() {
    var globalData = getApp().globalData || {}
    var windowWidth = Number(globalData.windowWidth || 375)
    var screenHeight = Number(globalData.screenHeight || globalData.windowHeight || 667)
    var navBarHeight = Number(globalData.navBarHeight || 64)
    var ratio = 750 / windowWidth
    // 50px 是自定义底栏，100rpx 是顶部按钮栏。
    var contentHeight = Math.max(320, (screenHeight - navBarHeight - 50) * ratio - 100)
    this.setData({
      navBarHeight: navBarHeight * ratio,
      contentHeight: contentHeight,
      windowWidth: windowWidth * ratio,
      windowHeight: Number(globalData.windowHeight || screenHeight) * ratio
    })
  },

  _validContext() {
    if (Number(this.data.disId) > 0 && Number(this.data.purchaserId) > 0) return true
    wx.showToast({ title: '采购身份信息不完整', icon: 'none' })
    return false
  },

  onToolCart() {
    var disInfo = this.data.disInfo || {}
    if (disInfo.nxDistributerType == 2) {
      wx.navigateTo({ url: '/subPackage/pages/shelf/indexSuyuan/indexSuyuan' })
    } else {
      wx.navigateTo({ url: '/subPackage/pages/shelf/index/index' })
    }
  },

  toStock(){
    wx.navigateTo({
      url: '/subPackage-charts/pages/stock/index/index',
    })
  },

  openVoicePurchase() {
    if (!this._validContext()) return
    wx.navigateTo({
      url: '/subPackage-order/pages/purchase/voice/voice'
    })
  },

  openPurchaseApp() {
    if (!this._validContext()) return
    var path = 'pages/workbenchV2/workbenchV2?nxDisId=' + encodeURIComponent(this.data.disId) +
      '&nxDisPurUserId=' + encodeURIComponent(this.data.purchaserId) +
      '&from=nx'
    wx.navigateToMiniProgram({
      appId: PURCHASE_APP_ID,
      path: path,
      envVersion: 'trial',
      fail: function () {
        wx.showToast({ title: '暂时无法打开精彩订货', icon: 'none' })
      }
    })
  },

  onToolSearch() {
    wx.navigateTo({
      url: '/subPackage/pages/management/customerOrderAnomalies/customerOrderAnomalies'
    })
  },

  onToolAdd() {
    wx.navigateTo({
      url: '/subPackage-charts/pages/smartReplenishment/index/index'
    })
  },

  loadPurchaseGoods() {
    if (!this._validContext() || this.data.purchaseLoading) return
    this.setData({ purchaseLoading: true })
    purchaseGetGoodsByDemandScope({
      disId: this.data.disId,
      demandScope: DEMAND_SCOPE
    }).then((res) => {
      var result = res && res.result
      if (!result || result.code != 0) throw new Error((result && result.msg) || '采购任务加载失败')
      var data = result.data || {}
      var rows = (data.arr || []).map((item) => this._decoratePurchaseGoods(item))
      var presentation = this._buildCategoryPresentation(rows, data.cataArr || data.categoryArr || [])
      this.setData({
        purchaseGoods: presentation.rows,
        purchaseCategories: presentation.categories,
        selectedCategoryIndex: 0,
        categoryIntoView: '',
        leftCategoryIntoView: '',
        selectedGoods: [],
        showSelectionDrawer: false,
        batchRequestKey: ''
      })
    }).catch((error) => {
      wx.showToast({ title: error.message || '采购任务加载失败', icon: 'none' })
    }).then(() => {
      this.setData({ purchaseLoading: false, pendingRefresh: false })
    })
  },

  _decoratePurchaseGoods(source) {
    var item = Object.assign({}, source)
    var goods = item.nxDistributerGoodsEntity || {}
    var standardWeight = this._cleanText(goods.nxDgGoodsStandardWeight || item.nxDgGoodsStandardWeight)
    var standardName = this._cleanText(goods.nxDgGoodsStandardname || item.nxDgGoodsStandardname)
    var demandSource = item.nxDpgDemandSource || item.demandSource || DEMAND_SCOPE
    var mode = item.nxDpgProcurementMode || item.procurementMode || 'UNASSIGNED'
    var sourcePresentation = PURCHASE_SOURCE_PRESENTATION[demandSource] || {
      text: '来源待核对', className: 'unresolved'
    }
    item.selected = false
    item.goodsNameText = [goods.nxDgGoodsBrand, goods.nxDgGoodsName].filter(function (v) {
      return v && v !== 'null'
    }).join('') || '未命名商品'
    item.goodsSpecText = standardWeight
      ? standardWeight + (standardName ? '/' + standardName : '')
      : ''
    item.demandSource = demandSource
    item.sourceText = sourcePresentation.text
    item.sourceClass = sourcePresentation.className
    item.procurementMode = mode
    item.isSelfBuy = mode === 'SELF_BUY'
    item.waitingStockIn = item.isSelfBuy && Number(item.nxDpgStatus) === 2
    // 库存采购接口会同时返回未采购和已采购待入库商品；只有 status=0 可转成供应商批次。
    item.canSupplierOrder = Number(item.nxDpgStatus) === 0 && !(Number(item.nxDpgBatchId) > 0)
    // 已完成采购的待入库商品统一回到货架页接收，不再从采购列表重复入库。
    item.canSelect = item.canSupplierOrder
    item.canEditPurchase = (Number(item.nxDpgStatus) === 0 || Number(item.nxDpgStatus) === 1) &&
      Boolean(PURCHASE_SOURCE_PRESENTATION[demandSource])
    return item
  },

  _cleanText(value) {
    var text = String(value == null ? '' : value).trim()
    return text && text !== 'null' && text !== 'undefined' && text !== '-1' ? text : ''
  },

  _buildCategoryPresentation(rows, serverCategories) {
    var categoryMap = {}
    var categories = []
    var categorySources = serverCategories || []

    categorySources.forEach(function (source) {
      var rawId = source.nxDistributerFatherGoodsId
      var categoryId = rawId == null ? 'OTHER' : String(rawId)
      if (categoryMap[categoryId]) return
      var category = Object.assign({}, source, {
        categoryId: categoryId,
        anchorId: 'purchaseCategory' + categories.length,
        leftAnchorId: 'purchaseLeftCategory' + categories.length,
        nxDfgFatherGoodsName: source.nxDfgFatherGoodsName || '其他商品',
        newOrderCount: Number(source.newOrderCount || 0),
        isAllSelected: false
      })
      categoryMap[categoryId] = category
      categories.push(category)
    })

    rows.forEach(function (item) {
      var goods = item.nxDistributerGoodsEntity || {}
      var rawId = goods.nxDgNxGreatGrandId
      var categoryId = rawId == null ? 'OTHER' : String(rawId)
      var category = categoryMap[categoryId]
      if (!category) {
        category = {
          nxDistributerFatherGoodsId: rawId == null ? -1 : rawId,
          nxDfgFatherGoodsName: goods.nxDgNxGreatGrandName || '其他商品',
          newOrderCount: 0,
          categoryId: categoryId,
          anchorId: 'purchaseCategory' + categories.length,
          leftAnchorId: 'purchaseLeftCategory' + categories.length,
          isAllSelected: false
        }
        categoryMap[categoryId] = category
        categories.push(category)
      }
      item.categoryId = categoryId
      item.categoryName = category.nxDfgFatherGoodsName
    })

    var orderedRows = []
    categories.forEach(function (category) {
      var categoryRows = rows.filter(function (item) {
        return item.categoryId === category.categoryId
      })
      // 接口返回的是采购商品数，而不是客户订单行数；旧服务未返回类目时在这里兼容计算。
      category.newOrderCount = categoryRows.length
      category.selectableCount = categoryRows.filter(function (item) {
        return item.canSelect
      }).length
      categoryRows.forEach(function (item, index) {
        item.showCategoryHeader = index === 0
        item.isFirstCategory = orderedRows.length === 0
        item.categoryAnchor = category.anchorId
        item.categoryIsAllSelected = false
        item.categorySelectableCount = category.selectableCount
        orderedRows.push(item)
      })
    })

    return { rows: orderedRows, categories: categories }
  },

  _applySelection(rows) {
    var categories = this.data.purchaseCategories.map(function (source) {
      var category = Object.assign({}, source)
      var selectable = rows.filter(function (item) {
        return item.categoryId === category.categoryId && item.canSelect
      })
      category.selectableCount = selectable.length
      category.isAllSelected = selectable.length > 0 && selectable.every(function (item) {
        return item.selected
      })
      return category
    })
    var selectedByCategory = {}
    categories.forEach(function (category) {
      selectedByCategory[category.categoryId] = category.isAllSelected
    })
    rows = rows.map(function (item) {
      return Object.assign({}, item, {
        categoryIsAllSelected: !!selectedByCategory[item.categoryId]
      })
    })
    this.setData({
      purchaseGoods: rows,
      purchaseCategories: categories,
      selectedGoods: rows.filter(function (item) { return item.selected && item.canSelect }),
      batchRequestKey: ''
    })
  },

  selectPurchaseCategory(e) {
    var index = Number(e.currentTarget.dataset.index)
    var category = this.data.purchaseCategories[index]
    if (!category) return
    this.setData({
      selectedCategoryIndex: index,
      leftCategoryIntoView: category.leftAnchorId,
      categoryIntoView: ''
    }, () => {
      this.setData({ categoryIntoView: category.anchorId })
    })
  },

  onPurchaseGoodsScroll() {
    clearTimeout(this._categoryScrollTimer)
    this._categoryScrollTimer = setTimeout(() => {
      var query = wx.createSelectorQuery().in(this)
      query.select('.right-content').boundingClientRect()
      query.selectAll('.category-header-wrapper').boundingClientRect()
      query.exec((result) => {
        var container = result && result[0]
        var headers = result && result[1]
        if (!container || !headers || !headers.length) return
        var activeIndex = 0
        headers.forEach(function (header, index) {
          if (header.top <= container.top + 12) activeIndex = index
        })
        if (activeIndex === this.data.selectedCategoryIndex) return
        var category = this.data.purchaseCategories[activeIndex]
        this.setData({
          selectedCategoryIndex: activeIndex,
          leftCategoryIntoView: category ? category.leftAnchorId : ''
        })
      })
    }, 80)
  },

  selectAllCategoryGoods(e) {
    var categoryId = String(e.currentTarget.dataset.categoryId)
    var category = this.data.purchaseCategories.find(function (item) {
      return item.categoryId === categoryId
    })
    if (!category || !category.selectableCount) {
      wx.showToast({ title: '该类商品当前不能加入订货', icon: 'none' })
      return
    }
    var selected = !category.isAllSelected
    var rows = this.data.purchaseGoods.map(function (item) {
      if (item.categoryId !== categoryId || !item.canSelect) return item
      return Object.assign({}, item, { selected: selected })
    })
    this._applySelection(rows)
  },

  onPendingRefresh() {
    if (this.data.purchaseLoading) {
      this.setData({ pendingRefresh: false })
      return
    }
    this.setData({ pendingRefresh: true })
    this.loadPurchaseGoods()
  },

  toggleGoods(e) {
    var goodsId = String(e.currentTarget.dataset.id || '')
    var rows = this.data.purchaseGoods.slice()
    var index = rows.findIndex(function (item) {
      return String(item.nxDistributerPurchaseGoodsId) === goodsId
    })
    var current = rows[index]
    if (!current) return
    if (!current.canSelect) {
      wx.showToast({ title: '该商品当前不能采购', icon: 'none' })
      return
    }
    rows[index] = Object.assign({}, current, { selected: !current.selected })
    this._applySelection(rows)
  },

  openEditPurchase(e) {
    var goodsId = String(e.currentTarget.dataset.id || '')
    var item = this.data.purchaseGoods.find(function (row) {
      return String(row.nxDistributerPurchaseGoodsId) === goodsId
    })
    if (!item) return
    if (!item.canEditPurchase) {
      wx.showToast({ title: '采购已经执行，不能修改', icon: 'none' })
      return
    }
    this.setData({
      showEditPurchaseModal: true,
      editPurchaseDraft: item,
      editPurchaseQuantity: String(item.nxDpgQuantity || ''),
      editPurchaseUnit: String(item.nxDpgStandard || ''),
      editPurchaseKeyboardHeight: 0
    })
  },

  onEditPurchaseQuantityInput(e) {
    this.setData({ editPurchaseQuantity: e.detail.value || '' })
  },

  onEditPurchaseUnitInput(e) {
    this.setData({ editPurchaseUnit: e.detail.value || '' })
  },

  onEditPurchaseKeyboardHeightChange(e) {
    var height = Number(e && e.detail && e.detail.height) || 0
    var globalData = getApp().globalData || {}
    var ratio = Number(globalData.rpxR || 0) || 750 / Number(globalData.windowWidth || 375)
    this.setData({ editPurchaseKeyboardHeight: Math.max(0, Math.ceil(height * ratio)) })
  },

  closeEditPurchase() {
    if (this.data.editPurchaseSubmitting) return
    this.setData({
      showEditPurchaseModal: false,
      editPurchaseDraft: null,
      editPurchaseQuantity: '',
      editPurchaseUnit: '',
      editPurchaseKeyboardHeight: 0
    })
  },

  saveEditPurchase() {
    var item = this.data.editPurchaseDraft
    var quantityText = String(this.data.editPurchaseQuantity || '').trim()
    var quantity = Number(quantityText)
    var unit = String(this.data.editPurchaseUnit || '').trim()
    if (!item || this.data.editPurchaseSubmitting) return
    if (!Number.isFinite(quantity) || quantity <= 0) {
      wx.showToast({ title: '采购数量必须大于0', icon: 'none' })
      return
    }
    if (!unit || unit.length > 32) {
      wx.showToast({ title: unit ? '采购规格不能超过32个字' : '请输入采购规格', icon: 'none' })
      return
    }
    this.setData({ editPurchaseSubmitting: true })
    wx.showLoading({ title: '正在保存' })
    updateSmartReplenishmentProcurement(item.nxDistributerPurchaseGoodsId, {
      distributerId: this.data.disId,
      quantity: quantityText,
      unit: unit
    }).then((res) => {
      this._requireApiSuccess(res, '修改采购失败')
      this._resetEditPurchase()
      wx.showToast({ title: '采购已修改', icon: 'success' })
      this.loadPurchaseGoods()
    }).catch((error) => {
      wx.showToast({ title: error.message || '修改采购失败', icon: 'none' })
    }).then(() => {
      wx.hideLoading()
      this.setData({ editPurchaseSubmitting: false })
    })
  },

  deleteEditPurchase() {
    var item = this.data.editPurchaseDraft
    if (!item || this.data.editPurchaseSubmitting) return
    wx.showModal({
      title: '删除采购',
      content: '确认删除“' + item.goodsNameText + '”这条采购吗？',
      confirmText: '删除',
      confirmColor: '#d94d43',
      success: (result) => {
        if (!result.confirm) return
        this._deletePurchaseItem(item)
      }
    })
  },

  _deletePurchaseItem(item) {
    this.setData({ editPurchaseSubmitting: true })
    wx.showLoading({ title: '正在删除' })
    deleteSmartReplenishmentProcurement(item.nxDistributerPurchaseGoodsId, {
      distributerId: this.data.disId
    }).then((res) => {
      this._requireApiSuccess(res, '删除采购失败')
      this._resetEditPurchase()
      wx.showToast({ title: '采购已删除', icon: 'success' })
      this.loadPurchaseGoods()
    }).catch((error) => {
      wx.showToast({ title: error.message || '删除采购失败', icon: 'none' })
    }).then(() => {
      wx.hideLoading()
      this.setData({ editPurchaseSubmitting: false })
    })
  },

  _resetEditPurchase() {
    this.setData({
      showEditPurchaseModal: false,
      editPurchaseDraft: null,
      editPurchaseQuantity: '',
      editPurchaseUnit: '',
      editPurchaseKeyboardHeight: 0
    })
  },

  _requireApiSuccess(response, fallback) {
    var result = response && response.result
    if (!result || Number(result.code) !== 0) {
      throw new Error(result && result.msg ? result.msg : fallback)
    }
    return result.data
  },

  clearSelection() {
    var rows = this.data.purchaseGoods.map(function (item) {
      return Object.assign({}, item, { selected: false })
    })
    this._applySelection(rows)
    this.setData({ showSelectionDrawer: false })
  },

  openSelectionDrawer() {
    if (!this.data.selectedGoods.length) return
    this.setData({ showSelectionDrawer: true })
  },

  closeSelectionDrawer() {
    this.setData({ showSelectionDrawer: false })
  },

  deleteSelectedGoods(e) {
    var goodsId = String(e.currentTarget.dataset.id || '')
    var rows = this.data.purchaseGoods.map(function (item) {
      if (String(item.nxDistributerPurchaseGoodsId) !== goodsId) return item
      return Object.assign({}, item, { selected: false })
    })
    this._applySelection(rows)
    if (!rows.some(function (item) { return item.selected && item.canSelect })) {
      this.setData({ showSelectionDrawer: false })
    }
  },

  openUnifiedPurchase() {
    var selected = this.data.selectedGoods || []
    if (!selected.length) return
    if (selected.some(function (item) { return item.procurementMode === 'TRANSFER' })) {
      wx.showToast({ title: '调拨任务不能转为自采入库', icon: 'none' })
      return
    }
    wx.setStorageSync('bossInventoryPurchaseDraft', selected.map((item) => this._cleanPurchaseGoods(item)))
    this.clearSelection()
    wx.navigateTo({
      url: '/subPackage/pages/prepare/inventoryPurchase/inventoryPurchase'
    })
  },

  _batchPayload() {
    var purchaserId = this.data.purchaserId
    var goods = this.data.selectedGoods.map((source) => {
      var item = this._cleanPurchaseGoods(source)
      delete item.nxDpgBuyUserId
      delete item.nxDpbBuyUserId
      if (!(Number(item.nxDpgPurUserId) > 0)) item.nxDpgPurUserId = purchaserId
      return item
    })
    return {
      nxDpbDistributerId: this.data.disId,
      nxDpbPurUserId: purchaserId,
      nxDPGEntities: goods
    }
  },

  _cleanPurchaseGoods(source) {
    var item = Object.assign({}, source)
    var presentationFields = ['selected', 'goodsNameText', 'goodsSpecText', 'demandSource', 'sourceText',
      'sourceClass', 'procurementMode', 'isSelfBuy', 'waitingStockIn',
      'canSupplierOrder', 'categoryId', 'categoryName',
      'showCategoryHeader', 'isFirstCategory', 'categoryAnchor', 'categoryIsAllSelected',
      'categorySelectableCount', 'canSelect', 'canEditPurchase']
    presentationFields.forEach(function (key) { delete item[key] })
    return item
  },

  _requestKey(prefix) {
    return prefix + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10)
  },

  createWechatBatch() {
    if ((this.data.selectedGoods || []).some(function (item) { return !item.canSupplierOrder })) {
      wx.showToast({ title: '待入库商品不能再次生成订货批次', icon: 'none' })
      return
    }
    this._createBatch()
  },

  _createBatch() {
    if (!this.data.selectedGoods.length || this.data.submittingBatch) {
      if (!this.data.selectedGoods.length) wx.showToast({ title: '请先选择订货商品', icon: 'none' })
      return
    }
    var payload = this._batchPayload()
    var key = this.data.batchRequestKey || this._requestKey('boss-inventory-wechat')
    if (key !== this.data.batchRequestKey) {
      this.setData({ batchRequestKey: key })
    }
    this.setData({ submittingBatch: true })
    wx.showLoading({ title: '生成订货批次' })
    saveBossInventoryPurchaseBatch(payload, key).then((res) => {
      var result = res && res.result
      if (!result || result.code != 0) throw new Error((result && result.msg) || '批次生成失败')
      var batchId = result.data
      this.clearSelection()
      this._openPurchaseMiniProgram(batchId, 'prepare')
    }).then(() => {
      this.loadPurchaseGoods()
    }).catch((error) => {
      wx.showToast({ title: error.message || '批次生成失败', icon: 'none' })
    }).then(() => {
      wx.hideLoading()
      this.setData({ submittingBatch: false })
    })
  },

  _openPurchaseMiniProgram(batchId, target, batchPurchaserId) {
    if (!batchId) return
    var base = target === 'prepare'
      ? '/pkgPurchase/pages/txs/prepareBatch/prepareBatch'
      : '/pkgPurchase/pages/txs/disOrderBatch/disOrderBatch'
    var path = base + '?batchId=' + encodeURIComponent(batchId) +
      '&retName=' + encodeURIComponent(this.data.disName || '') +
      '&disId=' + encodeURIComponent(this.data.disId || '') +
      '&purUserId=' + encodeURIComponent(batchPurchaserId || this.data.purchaserId || '') +
      '&fromBuyer=1&fromBoss=1&demandScope=' + DEMAND_SCOPE
    wx.navigateToMiniProgram({
      appId: PURCHASE_APP_ID,
      path: path,
      envVersion: 'trial',
      fail: function () {
        wx.showToast({ title: '暂时无法打开精彩订货', icon: 'none' })
      }
    })
  },

  preventMove() {},
  stopTap() {},

  onNavButtonTap() {
    wx.navigateTo({ url: '/subPackage/pages/management/homePage/homePage' })
  }
})

import { saveShelfGoodsStockBatch } from '../../../../lib/apiDistributer'

const DRAFT_KEY = 'bossInventoryPurchaseDraft'

Page({
  data: {
    navBarHeight: 0,
    goods: [],
    totalAmount: '0.00',
    submitting: false,
    requestKey: '',
    showEditor: false,
    editingIndex: -1,
    editingItem: null
  },

  onLoad() {
    var globalData = getApp().globalData || {}
    var draft = wx.getStorageSync(DRAFT_KEY) || []
    this.setData({
      navBarHeight: (globalData.navBarHeight || 44) * (globalData.rpxR || 2),
      goods: draft.map((item) => this._prepareGoods(item))
    })
    this._recalculate()
  },

  _prepareGoods(source) {
    var item = Object.assign({}, source)
    var goods = item.nxDistributerGoodsEntity || {}
    var waitingStockIn = Number(item.nxDpgStatus) === 2
    var unit = this._purchaseUnit(item, goods, waitingStockIn)
    var quantity = waitingStockIn ? item.nxDpgBuyQuantity : (item.nxDpgBuyQuantity || item.nxDpgQuantity)
    var purchasePrice = item.nxDpgBuyPrice == null ? '' : String(item.nxDpgBuyPrice)
    var standardWeight = this._cleanText(goods.nxDgGoodsStandardWeight)
    var standardName = this._cleanText(goods.nxDgGoodsStandardname)
    var cartonUnit = this._cleanText(goods.nxDgCartonUnit)
    var cartonFactor = Number(goods.nxDgItemsPerCarton)
    var isConverted = Boolean(unit && standardName && unit !== standardName)
    var isProductCarton = isConverted && unit === cartonUnit && cartonFactor > 0
    var prepared = Object.assign(item, {
      goodsNameText: [goods.nxDgGoodsBrand, goods.nxDgGoodsName]
        .filter(function (value) { return value && value !== 'null' }).join('') || '未命名商品',
      goodsSpecText: standardWeight
        ? standardWeight + (standardName ? '/' + standardName : '')
        : '',
      purchaseUnit: unit,
      baseUnit: standardName,
      isConverted: isConverted,
      conversionLocked: waitingStockIn || isProductCarton,
      conversionFactor: this._cleanText(item.nxDpgBuyScale)
        || (isProductCarton ? String(cartonFactor) : ''),
      actualQuantity: quantity == null ? '' : String(quantity),
      purchasePrice: purchasePrice,
      expectedPrice: item.nxDpgExpectPrice == null ? '' : String(item.nxDpgExpectPrice),
      waitingStockIn: waitingStockIn,
      isShowTools: waitingStockIn ? false : Boolean(item.isShowTools),
      inputCompleted: waitingStockIn || purchasePrice !== '',
      subtotal: '0.00',
      averagePurchasePrice: '',
      averageExpectedPrice: ''
    })
    return this._withCalculations(prepared)
  },

  _purchaseUnit(item, goods, waitingStockIn) {
    var baseUnit = this._cleanText(goods.nxDgGoodsStandardname)
    var plannedUnit = this._cleanText(item.nxDpgStandard)
    if (waitingStockIn) {
      return this._cleanText(item.nxDpgBuyScale) ? (plannedUnit || baseUnit) : baseUnit
    }
    return plannedUnit || baseUnit
  },

  _cleanText(value) {
    var text = String(value == null ? '' : value).trim()
    return text && text !== 'null' && text !== 'undefined' && text !== '-1' ? text : ''
  },

  _sanitize(value) {
    var text = String(value || '').replace(/[^0-9.]/g, '')
    var dot = text.indexOf('.')
    if (dot >= 0) {
      text = text.slice(0, dot + 1) + text.slice(dot + 1).replace(/\./g, '')
      text = text.slice(0, dot + 4)
    }
    return text.slice(0, 18)
  },

  onQuantityInput(e) {
    this._updateEditor(e, 'actualQuantity')
  },

  onPriceInput(e) {
    this._updateEditor(e, 'purchasePrice')
  },

  onExpectedPriceInput(e) {
    this._updateEditor(e, 'expectedPrice')
  },

  onConversionInput(e) {
    this._updateEditor(e, 'conversionFactor')
  },

  _updateEditor(e, field) {
    if (!this.data.editingItem) return
    var editingItem = Object.assign({}, this.data.editingItem, {
      [field]: this._sanitize(e.detail.value)
    })
    this.setData({ editingItem: this._withCalculations(editingItem) })
  },

  onWaitChange(e) {
    if (!this.data.editingItem) return
    this.setData({ 'editingItem.isShowTools': Boolean(e.detail.value) })
  },

  openEditor(e) {
    var index = Number(e.currentTarget.dataset.index)
    var item = this.data.goods[index]
    if (!item) return
    this.setData({
      showEditor: true,
      editingIndex: index,
      editingItem: Object.assign({}, item)
    })
  },

  closeEditor() {
    this.closeKeyboard()
    this.setData({ showEditor: false, editingIndex: -1, editingItem: null })
  },

  confirmEditor() {
    var item = this.data.editingItem
    if (!item) return
    var error = this._validateItem(item)
    if (error) {
      wx.showToast({ title: error, icon: 'none' })
      return
    }
    item = this._withCalculations(item)
    item.inputCompleted = true
    this.setData({
      [`goods[${this.data.editingIndex}]`]: item,
      showEditor: false,
      editingIndex: -1,
      editingItem: null
    }, () => this._recalculate())
    this.closeKeyboard()
  },

  preventMove() {},

  stopTap() {},

  _subtotal(item) {
    var subtotal = (Number(item.actualQuantity) || 0) * (Number(item.purchasePrice) || 0)
    return subtotal.toFixed(2)
  },

  _withCalculations(item) {
    var factor = item.isConverted ? Number(item.conversionFactor) : 1
    var converted = item.isConverted && isFinite(factor) && factor > 0
    var averagePurchasePrice = converted && item.purchasePrice !== ''
      ? (Number(item.purchasePrice) / factor).toFixed(2) : ''
    var averageExpectedPrice = converted && item.expectedPrice !== ''
      ? (Number(item.expectedPrice) / factor).toFixed(2) : ''
    return Object.assign({}, item, {
      subtotal: this._subtotal(item),
      averagePurchasePrice: averagePurchasePrice,
      averageExpectedPrice: averageExpectedPrice
    })
  },

  _recalculate() {
    var updates = {}
    var total = 0
    ;(this.data.goods || []).forEach(function (item, index) {
      var subtotal = (Number(item.actualQuantity) || 0) * (Number(item.purchasePrice) || 0)
      updates[`goods[${index}].subtotal`] = subtotal.toFixed(2)
      total += subtotal
    })
    updates.totalAmount = total.toFixed(2)
    this.setData(updates)
  },

  _validateItem(item) {
    var quantity = Number(item.actualQuantity)
    var price = Number(item.purchasePrice)
    var expectedPrice = Number(item.expectedPrice)
    if (!item.purchaseUnit) return item.goodsNameText + '未配置商品采购单位'
    if (!item.baseUnit) return item.goodsNameText + '未配置商品基础规格'
    if (item.isConverted && (!isFinite(Number(item.conversionFactor)) || !(Number(item.conversionFactor) > 0))) {
      return '请填写1' + item.purchaseUnit + '等于多少' + item.baseUnit
    }
    if (!isFinite(quantity) || !(quantity > 0)) return '请填写' + item.goodsNameText + '的采购数量'
    if (item.purchasePrice === '' || !isFinite(price) || price < 0) {
      return '请填写' + item.goodsNameText + '的采购单价'
    }
    if (item.expectedPrice !== '' && (!isFinite(expectedPrice) || expectedPrice < 0)) {
      return '请填写正确的建议售价'
    }
    return ''
  },

  _validate() {
    if (!this.data.goods.length) return '没有选择采购商品'
    for (var i = 0; i < this.data.goods.length; i++) {
      var item = this.data.goods[i]
      if (!item.inputCompleted) return '请先录入' + item.goodsNameText + '的采购信息'
      var error = this._validateItem(item)
      if (error) return error
    }
    return ''
  },

  _payload(source, purchaserId) {
    var item = Object.assign({}, source, {
      nxDpgBuyQuantity: source.actualQuantity,
      nxDpgBuyPrice: source.purchasePrice,
      nxDpgBuySubtotal: source.subtotal,
      nxDpgExpectPrice: source.expectedPrice === '' ? null : source.expectedPrice,
      nxDpgPurUserId: Number(source.nxDpgPurUserId) > 0 ? source.nxDpgPurUserId : purchaserId,
      nxDpgProcurementMode: 'SELF_BUY',
      nxDpgStandard: source.purchaseUnit,
      nxDpgBuyScale: source.isConverted ? source.conversionFactor : null,
      isShowTools: Boolean(source.isShowTools)
    })
    ;['goodsNameText', 'purchaseUnit', 'actualQuantity', 'purchasePrice', 'expectedPrice',
      'goodsSpecText', 'baseUnit', 'isConverted', 'conversionLocked', 'conversionFactor',
      'averagePurchasePrice', 'averageExpectedPrice',
      'waitingStockIn', 'inputCompleted', 'subtotal'].forEach(function (key) { delete item[key] })
    delete item.nxDpgBuyUserId
    delete item.nxDpbBuyUserId
    return item
  },

  submit() {
    if (this.data.submitting) return
    var error = this._validate()
    if (error) {
      wx.showToast({ title: error, icon: 'none' })
      return
    }
    var userInfo = wx.getStorageSync('userInfo') || {}
    var purchaserId = Number(wx.getStorageSync('ownerUserId') || userInfo.nxDistributerUserId || 0)
    var requestKey = this.data.requestKey || ('boss-inventory-group-' + Date.now().toString(36))
    this.setData({ submitting: true, requestKey: requestKey })
    wx.showLoading({ title: '统一采购入库', mask: true })
    var payload = this.data.goods.map((item) => this._payload(item, purchaserId))
    saveShelfGoodsStockBatch(payload, requestKey).then((res) => {
      var result = res && res.result
      if (!result || result.code != 0) throw new Error((result && result.msg) || '采购入库失败')
      wx.removeStorageSync(DRAFT_KEY)
      this.setData({ requestKey: '' })
      wx.showToast({ title: '统一入库完成', icon: 'success' })
      setTimeout(function () { wx.navigateBack() }, 700)
    }).catch((failure) => {
      wx.showToast({ title: failure.message || '采购入库失败', icon: 'none' })
    }).then(() => {
      wx.hideLoading()
      this.setData({ submitting: false })
    })
  },

  closeKeyboard() {
    wx.hideKeyboard()
  },

  toBack() {
    wx.navigateBack()
  }
})

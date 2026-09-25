import { completeBossSelfPurchase } from '../../../../lib/apiDepOrder'
const selfPurchaseUnit = require('../../../../utils/selfPurchaseUnit')
const selfPurchaseDraft = require('../../../../utils/selfPurchaseDraft')

Page({
  data: {
    goods: [],
    submitting: false,
    totalAmount: '0.00',
    idempotencyKey: '',
    emptyText: '没有可自采的商品，请返回刷新后重新选择'
  },

  onLoad() {
    const app = getApp()
    const globalData = app.globalData || {}
    const storedDraft = wx.getStorageSync(selfPurchaseDraft.STORAGE_KEY)
    // 页面交接数据必须一次性消费，不能成为跨页面、跨业务状态的长期缓存。
    wx.removeStorageSync(selfPurchaseDraft.STORAGE_KEY)
    const userInfo = wx.getStorageSync('userInfo') || {}
    const distributerId = wx.getStorageSync('ownerDistributerId') ||
      (userInfo.nxDistributerEntity && userInfo.nxDistributerEntity.nxDistributerId)
    const draft = selfPurchaseDraft.consume(storedDraft, distributerId)
    const goods = draft.map((item, goodsIndex) => this._prepareGoods(item, goodsIndex))
    this.setData({
      navBarHeight: (globalData.navBarHeight || 44) * (globalData.rpxR || 2),
      goods
    })
    this._recalculate()
  },

  _prepareGoods(item, goodsIndex) {
    const unit = selfPurchaseUnit.resolvePurchaseUnit(item)
    const sourceOrders = item.orders || []
    const orders = sourceOrders.map((order, orderIndex) => {
      const initial = selfPurchaseUnit.initialPurchaseQuantity(order, unit)
      return Object.assign({}, order, {
        orderKey: String(item.nxDistributerPurchaseGoodsId) + '-' + String(order.nxDepartmentOrdersId || orderIndex),
        customerName: order.depName || order.gbDepName || order.restrauntName ||
          order.nxDepartmentOrderCode || '客户订单',
        actualQuantity: unit.isCartonMode ? '' : initial,
        actualScaleQuantity: unit.isCartonMode ? initial : '',
        isCarton: unit.isCartonMode
      })
    })
    return Object.assign({}, item, {
      goodsKey: item.nxDistributerPurchaseGoodsId || goodsIndex,
      baseUom: unit.baseUom,
      cartonUom: unit.cartonUom,
      purchaseUom: unit.purchaseUom,
      isCartonMode: unit.isCartonMode,
      invalidUnit: unit.invalidUnit,
      purchasePrice: '',
      purchaseScalePrice: '',
      estimatedSubtotal: '0.00',
      orders
    })
  },

  _sanitize(value) {
    let text = String(value || '').replace(/[^0-9.]/g, '')
    const firstDot = text.indexOf('.')
    if (firstDot >= 0) {
      text = text.slice(0, firstDot + 1) + text.slice(firstDot + 1).replace(/\./g, '')
      text = text.slice(0, firstDot + 7)
    }
    return text.slice(0, 24)
  },

  onPriceInput(e) {
    const goodsIndex = Number(e.currentTarget.dataset.goodsIndex)
    const field = this.data.goods[goodsIndex].isCartonMode
      ? 'purchaseScalePrice' : 'purchasePrice'
    this.setData({ [`goods[${goodsIndex}].${field}`]: this._sanitize(e.detail.value) })
    this._recalculate()
  },

  onQuantityInput(e) {
    const goodsIndex = Number(e.currentTarget.dataset.goodsIndex)
    const orderIndex = Number(e.currentTarget.dataset.orderIndex)
    const field = this.data.goods[goodsIndex].orders[orderIndex].isCarton
      ? 'actualScaleQuantity' : 'actualQuantity'
    this.setData({
      [`goods[${goodsIndex}].orders[${orderIndex}].${field}`]: this._sanitize(e.detail.value)
    })
    this._recalculate()
  },

  closeKeyboard() {
    wx.hideKeyboard()
  },

  _recalculate() {
    const updates = {}
    let total = 0
    ;(this.data.goods || []).forEach((goods, goodsIndex) => {
      const price = Number(goods.isCartonMode ? goods.purchaseScalePrice : goods.purchasePrice)
      let quantity = 0
      ;(goods.orders || []).forEach(order => {
        quantity += Number(order.isCarton ? order.actualScaleQuantity : order.actualQuantity) || 0
      })
      const subtotal = price > 0 && quantity > 0 ? price * quantity : 0
      updates[`goods[${goodsIndex}].estimatedSubtotal`] = subtotal.toFixed(2)
      total += subtotal
    })
    updates.totalAmount = total.toFixed(2)
    this.setData(updates)
  },

  _validate() {
    if (!this.data.goods.length) return '没有可自采的商品'
    for (let i = 0; i < this.data.goods.length; i++) {
      const goods = this.data.goods[i]
      if (goods.invalidUnit) return `${goods.nxDgGoodsName || '商品'}缺少商品规格`
      const price = Number(goods.isCartonMode ? goods.purchaseScalePrice : goods.purchasePrice)
      if (!isFinite(price) || price <= 0) return `请填写${goods.nxDgGoodsName || '商品'}的采购单价`
      if (!goods.orders || !goods.orders.length) return `${goods.nxDgGoodsName || '商品'}缺少订单`
      for (let j = 0; j < goods.orders.length; j++) {
        const order = goods.orders[j]
        const quantity = Number(order.isCarton ? order.actualScaleQuantity : order.actualQuantity)
        if (!isFinite(quantity) || quantity <= 0) return `请填写${order.customerName}的实际采购数量`
      }
    }
    return ''
  },

  submit() {
    if (this.data.submitting) return
    const error = this._validate()
    if (error) {
      wx.showToast({ title: error, icon: 'none' })
      return
    }
    const payload = {
      goods: this.data.goods.map(goods => ({
        purchaseGoodsId: goods.nxDistributerPurchaseGoodsId,
        purchasePrice: goods.isCartonMode ? null : goods.purchasePrice,
        purchaseScalePrice: goods.isCartonMode ? goods.purchaseScalePrice : null,
        orders: goods.orders.map(order => ({
          orderId: order.nxDepartmentOrdersId,
          actualQuantity: order.isCarton ? null : order.actualQuantity,
          actualScaleQuantity: order.isCarton ? order.actualScaleQuantity : null
        }))
      }))
    }
    const key = this.data.idempotencyKey || ('boss-self-' + Date.now().toString(36) + '-' +
      Math.random().toString(36).slice(2, 12))
    this.setData({ submitting: true, idempotencyKey: key })
    wx.showLoading({ title: '保存自采', mask: true })
    completeBossSelfPurchase(payload, key).then(res => {
      wx.hideLoading()
      this.setData({ submitting: false })
      if (res.result && res.result.code === 0) {
        this.setData({ idempotencyKey: '' })
        wx.removeStorageSync(selfPurchaseDraft.STORAGE_KEY)
        wx.showToast({ title: '自采已完成', icon: 'success' })
        setTimeout(() => wx.navigateBack(), 700)
        return
      }
      this.setData({ idempotencyKey: '' })
      wx.showToast({ title: (res.result && res.result.msg) || '自采保存失败', icon: 'none' })
    }).catch(() => {
      wx.hideLoading()
      this.setData({ submitting: false })
    })
  },

  toBack() {
    wx.navigateBack()
  },

  onUnload() {
    wx.removeStorageSync(selfPurchaseDraft.STORAGE_KEY)
  }
})

var app = getApp()
import apiUrl from '../../../../config.js'

const STATUS_NAMES = {
  PENDING: '待支付', PAYING: '支付处理中', PAID: '已到账',
  FAILED: '支付失败', CLOSED: '已关闭'
}

Page({
  data: {
    navBarHeight: 0,
    loading: false,
    paying: false,
    offers: [],
    selectedIndex: 0,
    selectedOffer: null,
    orders: [],
    account: { grantedQuantity: 0, consumedQuantity: 0, availableQuantity: 0 }
  },

  onLoad() {
    this.setData({
      navBarHeight: (app.globalData.navBarHeight || 44) * (app.globalData.rpxR || 2),
      account: wx.getStorageSync('commercialUsage') || this.data.account
    })
    this.loadPage()
  },

  onShow() {
    if (this.data.offers.length) this.loadOrders()
  },

  onPullDownRefresh() {
    this.loadPage().finally(() => wx.stopPullDownRefresh())
  },

  toBack() { wx.navigateBack({ delta: 1 }) },

  loadPage() {
    if (this.data.loading) return Promise.resolve()
    this.setData({ loading: true })
    return Promise.all([this.loadOffers(), this.loadOrders(), this.loadAccount()])
      .catch(error => {
        wx.showToast({ title: (error && error.message) || '加量方案读取失败', icon: 'none' })
      })
      .finally(() => this.setData({ loading: false }))
  },

  ownerRequest(options) {
    return new Promise((resolve, reject) => {
      app.ownerRequest(Object.assign({}, options, {
        success: response => {
          const body = response.data || {}
          if (body.code !== 0) {
            reject(new Error(body.msg || '请求失败'))
            return
          }
          resolve(body.data)
        },
        fail: reject
      }))
    })
  },

  loadOffers() {
    return this.ownerRequest({
      url: apiUrl.apiUrl + 'commercial-usage/offers', method: 'GET'
    }).then(data => {
      const offers = (data || []).map(item => this.decorateOffer(item))
      const selectedIndex = Math.min(this.data.selectedIndex, Math.max(0, offers.length - 1))
      this.setData({ offers, selectedIndex, selectedOffer: offers[selectedIndex] || null })
    })
  },

  loadOrders() {
    return this.ownerRequest({
      url: apiUrl.apiUrl + 'commercial-usage/orders', method: 'GET'
    }).then(data => {
      this.setData({ orders: (data || []).map(item => this.decorateOrder(item)) })
    })
  },

  loadAccount() {
    return this.ownerRequest({
      url: apiUrl.apiUrl + 'commercial-usage/me', method: 'GET'
    }).then(data => {
      const account = data || this.data.account
      wx.setStorageSync('commercialUsage', account)
      this.setData({ account })
    })
  },

  decorateOffer(item) {
    const bonus = Number(item.bonusQuantity || 0)
    const amountText = this.moneyText(item.payableAmountFen)
    return Object.assign({}, item, {
      quantityText: this.quantityText(item.totalQuantity),
      baseText: this.quantityText(item.baseQuantity),
      bonusText: this.quantityText(bonus),
      amountText,
      purchaseButtonText: '¥' + amountText + ' 立即购买',
      originalAmountText: this.moneyText(item.originalAmountFen),
      hasDiscount: Number(item.originalAmountFen || 0) > Number(item.payableAmountFen || 0),
      hasBonus: bonus > 0,
      validityText: this.validityText(item)
    })
  },

  decorateOrder(item) {
    return Object.assign({}, item, {
      statusName: STATUS_NAMES[item.paymentStatus] || item.paymentStatus || '未知状态',
      amountText: this.moneyText(item.payableAmountFen),
      quantityText: this.quantityText(item.totalQuantity),
      createdText: this.timeText(item.createdAt),
      paid: item.paymentStatus === 'PAID'
    })
  },

  selectOffer(event) {
    const index = Number(event.currentTarget.dataset.index || 0)
    this.setData({ selectedIndex: index, selectedOffer: this.data.offers[index] || null })
  },

  purchaseSelected() {
    const offer = this.data.selectedOffer
    if (!offer || this.data.paying) return
    const bonus = offer.hasBonus ? '，其中活动赠送 ' + offer.bonusText : ''
    wx.showModal({
      title: '确认购买订单额度',
      content: '支付 ¥' + offer.amountText + '，到账 ' + offer.quantityText + bonus + '。支付金额不参与套餐权限判断。',
      confirmText: '微信支付',
      success: result => { if (result.confirm) this.createAndPay(offer) }
    })
  },

  createAndPay(offer) {
    this.setData({ paying: true })
    wx.showLoading({ title: '正在创建订单', mask: true })
    this.ownerRequest({
      url: apiUrl.apiUrl + 'commercial-usage/orders',
      method: 'POST',
      header: { 'content-type': 'application/json' },
      data: { offerCode: offer.offerCode }
    }).then(order => {
      wx.hideLoading()
      const pay = order && order.paymentParameters
      if (!pay) throw new Error('微信支付参数缺失')
      return new Promise((resolve, reject) => {
        wx.requestPayment({
          timeStamp: pay.timeStamp,
          nonceStr: pay.nonceStr,
          package: pay.package,
          signType: pay.signType || 'MD5',
          paySign: pay.paySign,
          success: () => resolve(order.orderNo),
          fail: reject
        })
      })
    }).then(orderNo => {
      wx.showLoading({ title: '正在确认到账', mask: true })
      return this.waitUntilPaid(orderNo, 0)
    }).then(() => {
      wx.hideLoading()
      wx.showToast({ title: '额度已到账', icon: 'success' })
      return Promise.all([this.loadOrders(), this.loadAccount()])
    }).catch(error => {
      wx.hideLoading()
      const message = String((error && (error.message || error.errMsg)) || '')
      if (message.indexOf('cancel') >= 0) {
        wx.showToast({ title: '已取消支付', icon: 'none' })
      } else {
        wx.showModal({
          title: '支付未完成',
          content: message || '如果已经付款，请稍后下拉刷新查看到账状态。',
          showCancel: false
        })
      }
    }).finally(() => this.setData({ paying: false }))
  },

  waitUntilPaid(orderNo, attempt) {
    if (attempt >= 10) return Promise.reject(new Error('支付结果仍在确认，请稍后下拉刷新'))
    return this.ownerRequest({
      url: apiUrl.apiUrl + 'commercial-usage/orders/' + encodeURIComponent(orderNo),
      method: 'GET'
    }).then(order => {
      if (order && order.paymentStatus === 'PAID' && order.usageGrantedAt) return order
      if (order && (order.paymentStatus === 'FAILED' || order.paymentStatus === 'CLOSED')) {
        throw new Error('支付订单未成功')
      }
      return new Promise(resolve => setTimeout(resolve, 800))
        .then(() => this.waitUntilPaid(orderNo, attempt + 1))
    })
  },

  quantityText(value) {
    const quantity = Number(value || 0)
    if (quantity >= 10000 && quantity % 10000 === 0) return (quantity / 10000) + '万条'
    return quantity + '条'
  },

  moneyText(fen) {
    const value = Number(fen || 0) / 100
    return Number.isInteger(value) ? String(value) : value.toFixed(2)
  },

  validityText(item) {
    if (item.validityPolicy === 'SUBSCRIPTION_END') return '随当前套餐周期到期'
    if (item.validityPolicy === 'FIXED_DAYS') return '到账后 ' + item.validityDays + ' 天有效'
    return '长期有效'
  },

  timeText(value) {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)
    const pad = number => String(number).padStart(2, '0')
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
      ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes())
  }
})

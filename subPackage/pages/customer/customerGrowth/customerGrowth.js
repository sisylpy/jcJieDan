import apiUrl from '../../../../config.js'
import { getCustomerGrowth } from '../../../../lib/apiDistributer.js'

Page({
  data: {
    navBarHeight: 0,
    depId: null,
    loading: true,
    loadError: '',
    customer: {},
    metrics: {
      orderCount: 0,
      totalAmountText: '0.00',
      recentOrderText: '暂无',
      cooperationDays: 0
    },
    stage: {
      label: '待首单',
      description: ''
    },
    coupons: {
      availableCount: 0,
      receivedCount: 0,
      usedCount: 0
    },
    timeline: []
  },

  onLoad(options) {
    const app = getApp()
    const globalData = app.globalData || {}
    const stored = wx.getStorageSync('depInfo') || {}
    const depId = options && options.depId
      ? options.depId
      : (stored.nxDepartmentId || stored.nxDepartmentFatherId)

    this._storedDepInfo = stored

    this.setData({
      navBarHeight: (globalData.navBarHeight || 0) * (globalData.rpxR || 1),
      depId,
      url: apiUrl.server,
      loading: !!depId,
      loadError: depId ? '' : '缺少客户信息，请返回客户列表后重试'
    })
  },

  onShow() {
    if (this.data.depId) this._loadGrowth(false)
  },

  onPullDownRefresh() {
    this._loadGrowth(true)
  },

  toBack() {
    wx.navigateBack({ delta: 1 })
  },

  retry() {
    this._loadGrowth(false)
  },

  openCustomerDetail() {
    if (!this.data.customer.nxDepartmentId) return
    wx.setStorageSync('depInfo', this.data.customer)
    wx.navigateTo({
      url: '../customerDetail/customerDetail?depId=' + this.data.customer.nxDepartmentId
    })
  },

  openCustomerGoods() {
    if (!this.data.customer.nxDepartmentId) return
    wx.setStorageSync('depInfo', this.data.customer)
    wx.navigateTo({
      url: '../customerGoods/customerGoods'
    })
  },

  openCustomerBills() {
    const depId = this.data.customer.nxDepartmentId
    if (!depId) return
    wx.setStorageSync('depInfo', this.data.customer)
    wx.navigateTo({
      url: '../customerPage/customerPage?depId=' + depId
    })
  },

  _loadGrowth(fromPullDown) {
    const requestId = (this._requestId || 0) + 1
    this._requestId = requestId
    this.setData({ loading: true, loadError: '' })

    getCustomerGrowth(this.data.depId)
      .then(res => {
        if (requestId !== this._requestId) return
        const result = res && res.result ? res.result : {}
        if (result.code !== 0) {
          this.setData({
            loading: false,
            loadError: result.msg || '客户业务信息读取失败'
          })
          return
        }
        this._applyGrowth(result.data || {})
      })
      .catch(() => {
        if (requestId !== this._requestId) return
        this.setData({
          loading: false,
          loadError: '网络不稳定，请稍后重试'
        })
      })
      .then(() => {
        if (fromPullDown) wx.stopPullDownRefresh()
      })
  },

  _applyGrowth(data) {
    const rawCustomer = data.customer || {}
    const rawMetrics = data.metrics || {}
    const rawCoupons = data.coupons || {}
    const earliest = this._deliveryTime(rawCustomer.nxDepartmentEarliestDeliveryTime)
    const latest = this._deliveryTime(rawCustomer.nxDepartmentLatestDeliveryTime)
    const stored = this._storedDepInfo || {}
    const storedUsers = stored.nxDepartmentUserEntities || []
    const filePath = rawCustomer.nxDepartmentFilePath
      || stored.nxDepartmentFilePath
      || (storedUsers[0] && storedUsers[0].nxDuWxAvartraUrl)
      || ''
    const customer = Object.assign({}, rawCustomer, {
      displayName: rawCustomer.nxDepartmentAttrName || rawCustomer.nxDepartmentName || '客户',
      avatarUrl: filePath ? this._imageUrl(filePath) : '/images/customer.png',
      addressText: rawCustomer.nxDepartmentAddress || '未设置配送地址',
      deliveryTimeText: earliest && latest ? earliest + ' - ' + latest : '未设置',
      cooperationText: this._cooperationText(rawMetrics.cooperationDays)
    })
    const metrics = Object.assign({}, rawMetrics, {
      orderCount: this._integer(rawMetrics.orderCount),
      totalAmountText: this._money(rawMetrics.totalAmount),
      recentOrderText: rawMetrics.recentOrderDate || '暂无',
      cooperationDays: this._integer(rawMetrics.cooperationDays)
    })
    const coupons = {
      availableCount: this._integer(rawCoupons.availableCount),
      receivedCount: this._integer(rawCoupons.receivedCount),
      usedCount: this._integer(rawCoupons.usedCount)
    }
    const timelineSource = data.timeline || []
    const timeline = timelineSource.map((item, index) => {
      const afterSales = item.afterSales
        ? Object.assign({}, item.afterSales, {
          steps: (item.afterSales.steps || []).map((step, stepIndex) => {
            const sameDay = !step.eventDate || step.eventDate === item.eventDate
            const displayTime = sameDay
              ? (step.eventTime || step.eventDate)
              : (step.eventDate.slice(5) + (step.eventTime ? ' ' + step.eventTime : ''))
            return Object.assign({}, step, {
              key: step.key || ('after-sales-step-' + stepIndex),
              eventDate: step.eventDate || '',
              eventTime: step.eventTime || '',
              displayTime,
              detail: step.detail || '',
              result: step.result || '',
              handlerName: step.handlerName || '未记录'
            })
          })
        })
        : null
      return Object.assign({}, item, {
        key: item.key || ('timeline-' + index),
        sequence: timelineSource.length - index,
        eventDate: item.eventDate || '日期未知',
        eventTime: item.eventTime || '',
        content: item.content || '',
        feedback: item.feedback || '',
        afterSales
      })
    })

    wx.setStorageSync('depInfo', customer)
    this.setData({
      loading: false,
      loadError: '',
      customer,
      metrics,
      stage: data.stage || this.data.stage,
      coupons,
      timeline
    })
  },

  _imageUrl(path) {
    if (!path) return '/images/customer.png'
    if (/^https?:\/\//.test(path)) return path
    const server = this.data.url || apiUrl.server || ''
    if (!server) return path
    const serverEndsWithSlash = server.slice(-1) === '/'
    const pathStartsWithSlash = path.charAt(0) === '/'
    if (serverEndsWithSlash && pathStartsWithSlash) return server + path.slice(1)
    if (!serverEndsWithSlash && !pathStartsWithSlash) return server + '/' + path
    return server + path
  },

  _deliveryTime(value) {
    if (value === null || value === undefined || value === '') return ''
    if (typeof value === 'string' && /^\d{1,2}:\d{2}$/.test(value)) {
      const parts = value.split(':')
      return parts[0].padStart(2, '0') + ':' + parts[1]
    }
    const seconds = Number(value)
    if (isNaN(seconds) || seconds < 0 || seconds >= 24 * 3600) return ''
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0')
  },

  _money(value) {
    const number = Number(value)
    if (isNaN(number)) return '0.00'
    const parts = number.toFixed(2).split('.')
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',')
    return parts.join('.')
  },

  _integer(value) {
    const number = parseInt(value, 10)
    return isNaN(number) ? 0 : number
  },

  _cooperationText(days) {
    const value = this._integer(days)
    return value > 0 ? '合作 ' + value + ' 天' : '新客户'
  }
})

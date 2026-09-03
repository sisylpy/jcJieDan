import { getSmartReplenishmentCatalog } from '../../../../lib/apiDistributer'

const CUSTOMER_CACHE_KEY = 'smartReplenishmentCustomerCatalog'

Page({
  data: {
    navBarHeight: 0,
    contentHeight: 0,
    loading: true,
    pageError: '',
    selectedId: 'ALL',
    keyword: '',
    customers: [],
    visibleCustomers: []
  },

  onLoad(options) {
    const globalData = getApp().globalData || {}
    const ratio = globalData.rpxR || 1
    this.setData({
      navBarHeight: (globalData.navBarHeight || 0) * ratio,
      contentHeight: Math.max(0, (globalData.windowHeight || 0) * ratio -
        (globalData.navBarHeight || 0) * ratio),
      selectedId: options && options.selectedId ? String(options.selectedId) : 'ALL'
    })
    this.loadCustomers()
  },

  toBack() {
    wx.navigateBack({ delta: 1 })
  },

  async loadCustomers() {
    this.setData({ loading: true, pageError: '' })
    try {
      const user = wx.getStorageSync('userInfo') || {}
      const disInfo = wx.getStorageSync('disInfo') || user.nxDistributerEntity || {}
      const disId = Number(user.nxDiuDistributerId || disInfo.nxDistributerId)
      const cache = wx.getStorageSync(CUSTOMER_CACHE_KEY) || {}
      let departments = Number(cache.distributerId) === disId && Array.isArray(cache.departments)
        ? cache.departments : []
      if (!departments.length) {
        const response = await getSmartReplenishmentCatalog(disId)
        const envelope = response && response.result
        if (!envelope || Number(envelope.code) !== 0) {
          throw new Error(envelope && envelope.msg ? envelope.msg : '客户目录加载失败')
        }
        departments = Array.isArray(envelope.data.departments) ? envelope.data.departments : []
      }
      const customers = departments.map(item => {
        const count = Number(item.historicalLineCount || 0)
        return {
          departmentId: Number(item.departmentId),
          departmentName: item.departmentName || '未命名客户',
          historyLabel: count > 0 ? '历史 ' + count.toLocaleString('zh-CN') + ' 条' : '暂无历史数据',
          lastOrderLabel: item.lastOrderDate ? '最近订货 ' + item.lastOrderDate : '',
          initial: String(item.departmentName || '客').charAt(0)
        }
      })
      this.setData({ loading: false, customers, visibleCustomers: customers })
    } catch (error) {
      this.setData({
        loading: false,
        pageError: error && error.message ? error.message : '客户目录加载失败'
      })
    }
  },

  onKeywordInput(e) {
    const keyword = String(e.detail.value || '')
    const normalized = keyword.trim().toLocaleLowerCase('zh-CN')
    this.setData({
      keyword,
      visibleCustomers: normalized ? this.data.customers.filter(item =>
        String(item.departmentName || '').toLocaleLowerCase('zh-CN').includes(normalized)
      ) : this.data.customers
    })
  },

  clearKeyword() {
    this.setData({ keyword: '', visibleCustomers: this.data.customers })
  },

  selectAll() {
    this._commit({
      departmentId: null,
      departmentName: '全部客户',
      historyLabel: '汇总所有有效客户'
    })
  },

  selectCustomer(e) {
    const id = Number(e.currentTarget.dataset.id)
    const customer = this.data.customers.find(item => Number(item.departmentId) === id)
    if (customer) this._commit(customer)
  },

  _commit(customer) {
    const pages = getCurrentPages()
    const previous = pages.length > 1 ? pages[pages.length - 2] : null
    if (previous && typeof previous.applyCustomerSelection === 'function') {
      previous.applyCustomerSelection(customer)
    }
    wx.navigateBack({ delta: 1 })
  }
})

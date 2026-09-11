import { getSmartReplenishmentCatalog } from '../../../../lib/apiDistributer'

const CUSTOMER_CACHE_KEY = 'smartReplenishmentCustomerCatalog'

Page({
  data: {
    navBarHeight: 0,
    contentHeight: 0,
    loading: true,
    pageError: '',
    selectedIds: [],
    allSelected: true,
    keyword: '',
    customers: [],
    visibleCustomers: []
  },

  onLoad(options) {
    const globalData = getApp().globalData || {}
    const ratio = globalData.rpxR || 1
    const selectedIds = this._parseSelectedIds(options && options.selectedIds)
    this.setData({
      navBarHeight: (globalData.navBarHeight || 0) * ratio,
      contentHeight: Math.max(0, (globalData.windowHeight || 0) * ratio -
        (globalData.navBarHeight || 0) * ratio),
      selectedIds,
      allSelected: selectedIds.length === 0
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
          initial: String(item.departmentName || '客').charAt(0),
          selected: false
        }
      })
      this.setData({ loading: false, customers })
      this._syncSelection()
    } catch (error) {
      this.setData({
        loading: false,
        pageError: error && error.message ? error.message : '客户目录加载失败'
      })
    }
  },

  onKeywordInput(e) {
    this.setData({ keyword: String(e.detail.value || '') })
    this._syncSelection()
  },

  clearKeyword() {
    this.setData({ keyword: '' })
    this._syncSelection()
  },

  selectAll() {
    this.setData({ selectedIds: [], allSelected: true })
    this._syncSelection()
  },

  selectCustomer(e) {
    const id = Number(e.currentTarget.dataset.id)
    if (!Number.isFinite(id) || id <= 0) return
    const selected = this.data.allSelected ? [] : this.data.selectedIds.slice()
    const index = selected.indexOf(id)
    if (index >= 0) selected.splice(index, 1)
    else selected.push(id)
    this.setData({ selectedIds: selected, allSelected: selected.length === 0 })
    this._syncSelection()
  },

  confirmSelection() {
    this._commit({ departmentIds: this.data.allSelected ? [] : this.data.selectedIds.slice() })
  },

  _syncSelection() {
    const selected = new Set(this.data.selectedIds.map(Number))
    const customers = this.data.customers.map(item => Object.assign({}, item, {
      selected: !this.data.allSelected && selected.has(Number(item.departmentId))
    }))
    const normalized = String(this.data.keyword || '').trim().toLocaleLowerCase('zh-CN')
    const visibleCustomers = normalized ? customers.filter(item =>
      String(item.departmentName || '').toLocaleLowerCase('zh-CN').includes(normalized)
    ) : customers
    this.setData({ customers, visibleCustomers })
  },

  _parseSelectedIds(value) {
    if (!value || String(value).toUpperCase() === 'ALL') return []
    return Array.from(new Set(String(value).split(',').map(Number)
      .filter(id => Number.isFinite(id) && id > 0)))
  },

  _commit(selection) {
    const pages = getCurrentPages()
    const previous = pages.length > 1 ? pages[pages.length - 2] : null
    if (previous && typeof previous.applyCustomerSelection === 'function') {
      previous.applyCustomerSelection(selection)
    }
    wx.navigateBack({ delta: 1 })
  }
})

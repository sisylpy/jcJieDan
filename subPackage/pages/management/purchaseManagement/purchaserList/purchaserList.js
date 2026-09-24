import { getPurchaseManagementPurchasers } from '../../../../../lib/apiDistributer.js'

const app = getApp()

function today() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return year + '-' + month + '-' + day
}

function monthStart(stopDate) {
  return (stopDate || today()).slice(0, 7) + '-01'
}

Page({
  data: {
    navBarHeight: 0,
    startDate: '', stopDate: '', keyword: '', purchaserStatus: '',
    sort: 'LAST_PURCHASE', sortIndex: 0,
    sortOptions: [{ value: 'LAST_PURCHASE', name: '最近采购' }, { value: 'NAME', name: '姓名' }],
    items: [], page: 1, pageSize: 20, total: 0,
    loading: false, error: '', scrollTop: 0, restoreScrollTop: 0
  },

  onLoad(options) {
    const stopDate = options.stopDate || today()
    this.setData({
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      startDate: options.startDate || monthStart(stopDate),
      stopDate
    })
    this.load(true)
  },

  onShow() {
    if (!this._returningFromDetail) return
    this._returningFromDetail = false
    const loadedSize = Math.max(20, Math.min(100, this.data.items.length || 20))
    this.setData({ pageSize: loadedSize })
    this.load(true, true)
  },

  toBack() { wx.navigateBack({ delta: 1 }) },
  input(event) { this.setData({ keyword: event.detail.value }) },
  search() { this.load(true) },
  retry() { this.load(true) },
  recordScroll(event) { this.setData({ restoreScrollTop: event.detail.scrollTop }) },
  changeStart(event) { this.setData({ startDate: event.detail.value }); this.load(true) },
  changeStop(event) { this.setData({ stopDate: event.detail.value }); this.load(true) },
  chooseStatus(event) {
    this.setData({ purchaserStatus: event.currentTarget.dataset.value || '' })
    this.load(true)
  },
  changeSort(event) {
    const index = Number(event.detail.value)
    const option = this.data.sortOptions[index] || this.data.sortOptions[0]
    this.setData({ sortIndex: index, sort: option.value })
    this.load(true)
  },

  load(reset, restorePosition) {
    if (this.data.loading || !this.data.startDate || !this.data.stopDate) return
    const page = reset ? 1 : this.data.page
    this.setData({ loading: true, error: '' })
    getPurchaseManagementPurchasers({
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      keyword: this.data.keyword,
      purchaserStatus: this.data.purchaserStatus,
      sort: this.data.sort,
      page,
      pageSize: this.data.pageSize
    }).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw new Error(body.msg || '采购员加载失败')
      const data = body.data || {}
      this.setData({
        items: reset ? (data.items || []) : this.data.items.concat(data.items || []),
        page,
        total: data.total || 0,
        startDate: data.startDate || this.data.startDate,
        stopDate: data.stopDate || this.data.stopDate,
        scrollTop: restorePosition ? this.data.restoreScrollTop : (reset ? 0 : this.data.scrollTop)
      })
    }).catch(error => this.setData({ error: error.message || '采购员加载失败' }))
      .then(() => this.setData({ loading: false }))
  },

  more() {
    if (!this.data.loading && this.data.items.length < this.data.total) {
      this.setData({ page: this.data.page + 1 })
      this.load(false)
    }
  },

  open(event) {
    this._returningFromDetail = true
    wx.navigateTo({
      url: '/subPackage/pages/management/purchaseManagement/purchaserDetail/purchaserDetail?purchaserId=' +
        event.currentTarget.dataset.id + '&startDate=' + encodeURIComponent(this.data.startDate) +
        '&stopDate=' + encodeURIComponent(this.data.stopDate)
    })
  }
})

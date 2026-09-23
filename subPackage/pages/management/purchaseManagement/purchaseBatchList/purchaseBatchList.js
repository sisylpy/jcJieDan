import { getPurchaseManagementBatches } from '../../../../../lib/apiDistributer.js'

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
    startDate: '', stopDate: '', page: 1, total: 0, items: [], loading: false, error: '',
    keyword: '', purchasePurpose: '', supplierRelationId: '', supplierIndex: 0,
    supplierOptions: [{ supplierRelationId: '', supplierName: '全部供应方' }],
    sort: 'LATEST', sortIndex: 0,
    sortOptions: [{ value: 'LATEST', name: '最近采购' }, { value: 'SUPPLY_AMOUNT', name: '供货金额' }],
    scrollTop: 0, restoreScrollTop: 0
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
    if (this.data.restoreScrollTop) this.setData({ scrollTop: this.data.restoreScrollTop })
  },

  toBack() { wx.navigateBack({ delta: 1 }) },
  input(event) { this.setData({ keyword: event.detail.value }) },
  search() { this.load(true) },
  retry() { this.load(true) },
  recordScroll(event) { this.setData({ restoreScrollTop: event.detail.scrollTop }) },
  changeStart(event) { this.setData({ startDate: event.detail.value }); this.load(true) },
  changeStop(event) { this.setData({ stopDate: event.detail.value }); this.load(true) },
  choosePurpose(event) {
    this.setData({ purchasePurpose: event.currentTarget.dataset.value || '' })
    this.load(true)
  },
  changeSupplier(event) {
    const index = Number(event.detail.value)
    const option = this.data.supplierOptions[index] || this.data.supplierOptions[0]
    this.setData({ supplierIndex: index, supplierRelationId: option.supplierRelationId || '' })
    this.load(true)
  },
  changeSort(event) {
    const index = Number(event.detail.value)
    const option = this.data.sortOptions[index] || this.data.sortOptions[0]
    this.setData({ sortIndex: index, sort: option.value })
    this.load(true)
  },
  load(reset) {
    if (this.data.loading || !this.data.startDate || !this.data.stopDate) return
    const page = reset ? 1 : this.data.page
    const query = {
      startDate: this.data.startDate, stopDate: this.data.stopDate, page, pageSize: 20,
      keyword: this.data.keyword, purchasePurpose: this.data.purchasePurpose,
      supplierId: this.data.supplierRelationId, sort: this.data.sort
    }
    this.setData({ loading: true, error: '' })
    getPurchaseManagementBatches(query).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw new Error(body.msg || '采购批次加载失败')
      const data = body.data || {}
      const serverSuppliers = (data.supplierOptions || []).map(item => ({
        supplierRelationId: item.supplierRelationId,
        supplierName: item.supplierName || '名称待核对'
      }))
      const supplierOptions = [{ supplierRelationId: '', supplierName: '全部供应方' }].concat(serverSuppliers)
      let supplierIndex = supplierOptions.findIndex(item => String(item.supplierRelationId || '') === String(this.data.supplierRelationId || ''))
      if (supplierIndex < 0) supplierIndex = 0
      this.setData({
        items: reset ? (data.items || []) : this.data.items.concat(data.items || []),
        page, total: data.total || 0, supplierOptions, supplierIndex,
        supplierRelationId: supplierOptions[supplierIndex].supplierRelationId || '',
        startDate: data.startDate || this.data.startDate,
        stopDate: data.stopDate || this.data.stopDate,
        scrollTop: reset ? 0 : this.data.scrollTop,
        restoreScrollTop: reset ? 0 : this.data.restoreScrollTop
      })
    }).catch(error => this.setData({ error: error.message || '采购批次加载失败' }))
      .then(() => this.setData({ loading: false }))
  },
  more() {
    if (!this.data.loading && this.data.items.length < this.data.total) {
      this.setData({ page: this.data.page + 1 })
      this.load(false)
    }
  },
  open(event) {
    const batchId = event.currentTarget.dataset.id
    wx.navigateTo({
      url: '/subPackage/pages/management/purchaseManagement/purchaseBatchDetail/purchaseBatchDetail?batchId=' + batchId +
        '&startDate=' + encodeURIComponent(this.data.startDate) + '&stopDate=' + encodeURIComponent(this.data.stopDate)
    })
  }
})

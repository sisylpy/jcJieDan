import {
  getPurchaseManagementBatches,
  getPurchaseManagementPurchasers,
  getPurchaseManagementSuppliers
} from '../../../../../lib/apiDistributer.js'

const app = getApp()

Page({
  data: {
    navBarHeight: 0,
    startDate: '', stopDate: '', page: 1, total: 0, items: [], loading: false, error: '',
    filtersOpen: false, keyword: '', purchaserId: '', supplierRelationId: '',
    purchaserIndex: 0, supplierIndex: 0,
    purchaserOptions: [{ id: '', name: '全部采购员' }],
    supplierOptions: [{ id: '', name: '全部供应商' }],
    demandSource: '', procurementMode: '', fulfillmentMode: '',
    receiptStatus: '', putawayStatus: '', returnStatus: '',
    hasLoss: '', hasMarkdown: '', hasException: ''
  },
  onLoad(options) {
    this.setData({
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      startDate: options.startDate || '', stopDate: options.stopDate || ''
    })
    this.loadOptions()
    this.load(true)
  },
  toBack() { wx.navigateBack({ delta: 1 }) },
  toggle() { this.setData({ filtersOpen: !this.data.filtersOpen }) },
  input(event) { this.setData({ keyword: event.detail.value }) },
  choose(event) {
    this.setData({ [event.currentTarget.dataset.key]: event.currentTarget.dataset.value || '' })
    this.load(true)
  },
  resetFacts() {
    this.setData({ hasLoss: '', hasMarkdown: '', hasException: '' })
    this.load(true)
  },
  changePurchaser(event) {
    const index = Number(event.detail.value)
    this.setData({ purchaserIndex: index, purchaserId: this.data.purchaserOptions[index].id })
    this.load(true)
  },
  changeSupplier(event) {
    const index = Number(event.detail.value)
    this.setData({ supplierIndex: index, supplierRelationId: this.data.supplierOptions[index].id })
    this.load(true)
  },
  loadOptions() {
    const query = { startDate: this.data.startDate, stopDate: this.data.stopDate, page: 1, pageSize: 100 }
    Promise.all([getPurchaseManagementPurchasers(query), getPurchaseManagementSuppliers(query)]).then(all => {
      const purchaserBody = all[0].result || {}, supplierBody = all[1].result || {}
      if (purchaserBody.code !== 0 || supplierBody.code !== 0) return
      const purchasers = ((purchaserBody.data && purchaserBody.data.items) || []).map(item => ({
        id: item.purchaserUserId, name: item.purchaserName || item.purchaserStatusText
      }))
      const suppliers = ((supplierBody.data && supplierBody.data.items) || []).map(item => ({
        id: item.supplierRelationId, name: item.supplierName || item.relationStatusText
      }))
      this.setData({
        purchaserOptions: [{ id: '', name: '全部采购员' }].concat(purchasers),
        supplierOptions: [{ id: '', name: '全部供应商' }].concat(suppliers)
      })
    })
  },
  search() { this.load(true) },
  load(reset) {
    if (this.data.loading) return
    const page = reset ? 1 : this.data.page
    const query = {
      startDate: this.data.startDate, stopDate: this.data.stopDate, page, pageSize: 20,
      keyword: this.data.keyword, purchaserId: this.data.purchaserId,
      supplierRelationId: this.data.supplierRelationId, demandSource: this.data.demandSource,
      procurementMode: this.data.procurementMode, fulfillmentMode: this.data.fulfillmentMode,
      receiptStatus: this.data.receiptStatus, putawayStatus: this.data.putawayStatus,
      returnStatus: this.data.returnStatus
    }
    if (this.data.hasLoss !== '') query.hasLoss = this.data.hasLoss === 'true'
    if (this.data.hasMarkdown !== '') query.hasMarkdown = this.data.hasMarkdown === 'true'
    if (this.data.hasException !== '') query.hasException = this.data.hasException === 'true'
    this.setData({ loading: true, error: '' })
    getPurchaseManagementBatches(query).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw new Error(body.msg || '加载失败')
      const data = body.data || {}
      this.setData({
        items: reset ? (data.items || []) : this.data.items.concat(data.items || []),
        page, total: data.total || 0
      })
    }).catch(error => this.setData({ error: error.message || '加载失败' }))
      .then(() => this.setData({ loading: false }))
  },
  more() {
    if (this.data.items.length < this.data.total) {
      this.setData({ page: this.data.page + 1 })
      this.load(false)
    }
  },
  open(event) {
    wx.navigateTo({
      url: '/subPackage/pages/management/purchaseManagement/purchaseBatchDetail/purchaseBatchDetail?batchId=' + event.currentTarget.dataset.id
    })
  }
})

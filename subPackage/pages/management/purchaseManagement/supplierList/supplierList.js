import {
  getPurchaseSupplierV2List,
  syncPurchaseSupplierV2
} from '../../../../../lib/apiDistributer.js'

const app = getApp()

const TYPE_TEXT = {
  INTERNAL_DISTRIBUTER: '内部协作配送商',
  EXTERNAL_JRDH: '外部供应商'
}

const QUALITY_TEXT = {
  COMPLETE: '数据完整',
  LEGACY_FALLBACK: '历史口径',
  INCOMPLETE: '数据未解析完整',
  CONFLICT: '数据存在冲突',
  NO_FACT: '暂无采购事实'
}

function decorate(item) {
  const unresolved = Number(item.unresolvedAmountLineCount || 0)
  const quality = item.dataQualityStatus || 'NO_FACT'
  return Object.assign({}, item, {
    supplierTypeText: TYPE_TEXT[item.supplierType] || '未知供应方',
    dataQualityText: QUALITY_TEXT[quality] || quality,
    qualityClass: quality === 'CONFLICT' ? 'error' : (quality === 'INCOMPLETE' ? 'warn' : ''),
    purchaseAmountText: item.purchaseAmount == null ? '—' : '¥' + item.purchaseAmount,
    amountScopeText: unresolved > 0
      ? '另有 ' + unresolved + ' 条金额未解析'
      : '金额覆盖全部已投影商品行'
  })
}

Page({
  data: {
    navBarHeight: 0,
    startDate: '',
    stopDate: '',
    supplierType: '',
    keyword: '',
    sort: 'LAST_PURCHASE',
    items: [],
    page: 1,
    total: 0,
    hasMore: false,
    loading: false,
    syncing: false,
    syncNotice: '',
    error: ''
  },
  onLoad(options) {
    this.setData({
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      startDate: options.startDate || '',
      stopDate: options.stopDate || ''
    })
    this.syncAndLoad()
  },
  toBack() { wx.navigateBack({ delta: 1 }) },
  changeStart(event) {
    this.setData({ startDate: event.detail.value })
    this.syncAndLoad()
  },
  changeStop(event) {
    this.setData({ stopDate: event.detail.value })
    this.syncAndLoad()
  },
  inputKeyword(event) { this.setData({ keyword: event.detail.value }) },
  search() { this.load(true) },
  retry() { this.syncAndLoad() },
  chooseType(event) {
    this.setData({ supplierType: event.currentTarget.dataset.value || '' })
    this.load(true)
  },
  chooseSort(event) {
    this.setData({ sort: event.currentTarget.dataset.value })
    this.load(true)
  },
  syncAndLoad() {
    if (this.data.syncing || !this.data.startDate || !this.data.stopDate) {
      this.load(true)
      return
    }
    this.setData({ syncing: true, syncNotice: '' })
    syncPurchaseSupplierV2({
      startDate: this.data.startDate,
      stopDate: this.data.stopDate
    }).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw new Error(body.msg || '采购事实同步失败')
      const result = body.data || {}
      const internal = result.internal || {}
      const external = result.external || {}
      if (internal.complete === false || external.complete === false) {
        this.setData({ syncNotice: '本次同步已达到安全上限，可再次点击重新加载继续同步。' })
      }
    }).catch(error => {
      this.setData({ syncNotice: error.message || '采购事实同步失败，已继续查询现有数据。' })
    }).then(() => {
      this.setData({ syncing: false })
      this.load(true)
    })
  },
  load(reset) {
    if (this.data.loading) return
    const page = reset ? 1 : this.data.page
    this.setData({ loading: true, error: '' })
    getPurchaseSupplierV2List({
      supplierType: this.data.supplierType,
      keyword: this.data.keyword.trim(),
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      sort: this.data.sort,
      page,
      pageSize: 20
    }).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw new Error(body.msg || '加载供应方失败')
      const data = body.data || {}
      const rows = (data.items || []).map(decorate)
      this.setData({
        items: reset ? rows : this.data.items.concat(rows),
        page: data.page || page,
        total: data.total || 0,
        hasMore: !!data.hasMore
      })
    }).catch(error => this.setData({ error: error.message || '加载供应方失败' }))
      .then(() => this.setData({ loading: false }))
  },
  more() {
    if (this.data.loading || !this.data.hasMore) return
    this.setData({ page: this.data.page + 1 })
    this.load(false)
  },
  open(event) {
    const id = event.currentTarget.dataset.id
    wx.navigateTo({
      url: '/subPackage/pages/management/purchaseManagement/supplierDetail/supplierDetail'
        + '?purchaseSupplierRefId=' + id
        + '&startDate=' + encodeURIComponent(this.data.startDate)
        + '&stopDate=' + encodeURIComponent(this.data.stopDate)
    })
  }
})

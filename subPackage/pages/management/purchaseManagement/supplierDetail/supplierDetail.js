import {
  getPurchaseSupplierV2Detail,
  getPurchaseSupplierV2Facts,
  getPurchaseSupplierV2Goods
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
const FACT_STATUS_TEXT = {
  CREATED: '已创建',
  IN_PROGRESS: '履约中',
  FULFILLED: '已履约',
  CANCELLED: '已取消',
  UNKNOWN: '状态未解析'
}
const SOURCE_TEXT = {
  INTERNAL_COLLABORATION: 'offerNx协作订单',
  EXTERNAL_DPB: '精彩订货采购批次'
}

function qualityText(value) { return QUALITY_TEXT[value] || value || '状态未解析' }
function qualityClass(value) {
  return value === 'CONFLICT' ? 'error' : (value === 'INCOMPLETE' ? 'warn' : '')
}
function money(value) { return value == null ? '—' : '¥' + value }
function number(value) { return value == null ? '—' : value }

function decorateDetail(detail) {
  const unresolved = Number(detail.unresolvedAmountLineCount || 0)
  return Object.assign({}, detail, {
    supplierTypeText: TYPE_TEXT[detail.supplierType] || '未知供应方',
    relationStatusText: detail.relationStatus || 'UNKNOWN',
    dataQualityText: qualityText(detail.dataQualityStatus || 'NO_FACT'),
    qualityClass: qualityClass(detail.dataQualityStatus),
    purchaseAmountText: money(detail.purchaseAmount),
    amountScopeText: unresolved > 0
      ? '另有 ' + unresolved + ' 条金额未解析，以上仅为已识别范围'
      : '金额覆盖全部已投影商品行',
    manageText: detail.supplierType === 'INTERNAL_DISTRIBUTER'
      ? '进入offerNx协作管理'
      : '进入外部供应商管理'
  })
}

function decorateFact(item) {
  const hasActual = item.actualQuantity != null
  return Object.assign({}, item, {
    sourceTypeText: SOURCE_TEXT[item.sourceType] || item.sourceType || '来源未解析',
    factStatusText: FACT_STATUS_TEXT[item.factStatus] || item.factStatus || '状态未解析',
    dataQualityText: qualityText(item.dataQualityStatus),
    qualityClass: qualityClass(item.dataQualityStatus),
    quantityLabel: hasActual ? '实际数量' : '订购数量',
    quantityText: number(hasActual ? item.actualQuantity : item.orderedQuantity),
    unitPriceText: money(item.unitPrice),
    grossAmountText: money(item.grossAmount),
    orderLinkText: item.sourceType === 'INTERNAL_COLLABORATION'
      ? '主订单 ' + number(item.mainOrderId) + ' · 协作订单 ' + number(item.collaborationOrderId)
      : '采购批次 ' + number(item.externalBatchId) + ' · 采购商品 ' + number(item.externalPurchaseGoodsId)
  })
}

function decorateGoods(item) {
  const unresolved = Number(item.unresolvedAmountLineCount || 0)
  return Object.assign({}, item, {
    purchaseAmountText: money(item.purchaseAmount),
    orderedQuantityText: number(item.orderedQuantity),
    actualQuantityText: number(item.actualQuantity),
    dataQualityText: qualityText(item.dataQualityStatus),
    qualityClass: qualityClass(item.dataQualityStatus),
    amountScopeText: unresolved > 0 ? unresolved + ' 条金额未解析' : '金额已识别'
  })
}

Page({
  data: {
    navBarHeight: 0,
    purchaseSupplierRefId: 0,
    startDate: '',
    stopDate: '',
    detail: {},
    facts: [],
    factPage: 1,
    factTotal: 0,
    factHasMore: false,
    goods: [],
    goodsPage: 1,
    goodsTotal: 0,
    goodsHasMore: false,
    loading: false,
    factLoading: false,
    goodsLoading: false,
    error: ''
  },
  onLoad(options) {
    this.setData({
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      purchaseSupplierRefId: Number(options.purchaseSupplierRefId),
      startDate: options.startDate || '',
      stopDate: options.stopDate || ''
    })
    this.load()
  },
  toBack() { wx.navigateBack({ delta: 1 }) },
  periodQuery() {
    return { startDate: this.data.startDate, stopDate: this.data.stopDate }
  },
  load() {
    const id = this.data.purchaseSupplierRefId
    const period = this.periodQuery()
    this.setData({ loading: true, error: '' })
    Promise.all([
      getPurchaseSupplierV2Detail(id, period),
      getPurchaseSupplierV2Facts(id, Object.assign({ page: 1, pageSize: 20 }, period)),
      getPurchaseSupplierV2Goods(id, Object.assign({ page: 1, pageSize: 20 }, period))
    ]).then(all => {
      const bodies = all.map(item => item.result || {})
      const failed = bodies.find(item => item.code !== 0)
      if (failed) throw new Error(failed.msg || '加载供应方详情失败')
      const factPage = bodies[1].data || {}
      const goodsPage = bodies[2].data || {}
      this.setData({
        detail: decorateDetail(bodies[0].data || {}),
        facts: (factPage.items || []).map(decorateFact),
        factPage: factPage.page || 1,
        factTotal: factPage.total || 0,
        factHasMore: !!factPage.hasMore,
        goods: (goodsPage.items || []).map(decorateGoods),
        goodsPage: goodsPage.page || 1,
        goodsTotal: goodsPage.total || 0,
        goodsHasMore: !!goodsPage.hasMore
      })
    }).catch(error => this.setData({ error: error.message || '加载供应方详情失败' }))
      .then(() => this.setData({ loading: false }))
  },
  loadMoreFacts() {
    if (this.data.loading || this.data.factLoading || !this.data.factHasMore) return
    const page = this.data.factPage + 1
    this.setData({ factLoading: true })
    getPurchaseSupplierV2Facts(this.data.purchaseSupplierRefId,
      Object.assign({ page, pageSize: 20 }, this.periodQuery()))
      .then(res => {
        const body = res.result || {}
        if (body.code !== 0) throw new Error(body.msg || '加载采购记录失败')
        const data = body.data || {}
        this.setData({
          facts: this.data.facts.concat((data.items || []).map(decorateFact)),
          factPage: data.page || page,
          factTotal: data.total || this.data.factTotal,
          factHasMore: !!data.hasMore
        })
      }).catch(error => wx.showToast({ title: error.message || '加载采购记录失败', icon: 'none' }))
      .then(() => this.setData({ factLoading: false }))
  },
  loadMoreGoods() {
    if (this.data.loading || this.data.goodsLoading || !this.data.goodsHasMore) return
    const page = this.data.goodsPage + 1
    this.setData({ goodsLoading: true })
    getPurchaseSupplierV2Goods(this.data.purchaseSupplierRefId,
      Object.assign({ page, pageSize: 20 }, this.periodQuery()))
      .then(res => {
        const body = res.result || {}
        if (body.code !== 0) throw new Error(body.msg || '加载商品汇总失败')
        const data = body.data || {}
        this.setData({
          goods: this.data.goods.concat((data.items || []).map(decorateGoods)),
          goodsPage: data.page || page,
          goodsTotal: data.total || this.data.goodsTotal,
          goodsHasMore: !!data.hasMore
        })
      }).catch(error => wx.showToast({ title: error.message || '加载商品汇总失败', icon: 'none' }))
      .then(() => this.setData({ goodsLoading: false }))
  },
  manageSupplier() {
    const disInfo = wx.getStorageSync('disInfo') || {}
    const currentDisId = disInfo.nxDistributerId
    if (!currentDisId) {
      wx.showToast({ title: '当前配送商身份无效', icon: 'none' })
      return
    }
    let url
    if (this.data.detail.supplierType === 'INTERNAL_DISTRIBUTER') {
      url = '/subPackage/pages/offerNx/offerNxDistributerList/offerNxDistributerList?disId=' + currentDisId
    } else if (this.data.detail.supplierType === 'EXTERNAL_JRDH') {
      url = '/subPackage-supplier/pages/supplier/index/index?disId=' + currentDisId
    } else {
      wx.showToast({ title: '供应方类型未解析，无法进入管理', icon: 'none' })
      return
    }
    wx.navigateTo({ url })
  }
})

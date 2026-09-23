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

const RELATION_TEXT = {
  BLOCKED: '协作受限',
  INACTIVE: '合作未启用',
  HISTORICAL: '历史合作关系',
  UNKNOWN: '关系状态待核对'
}

function formatMoney(value) {
  if (value == null || value === '') return '—'
  const parsed = Number(value)
  return isFinite(parsed) ? '¥' + parsed.toFixed(2) : '¥' + value
}

function formatQuantity(value, unit) {
  if (value == null || value === '') return '—'
  return String(value) + (unit || '')
}

function periodText(startDate, stopDate) {
  if (startDate && stopDate) return startDate + ' 至 ' + stopDate
  if (startDate) return startDate + ' 起'
  if (stopDate) return stopDate + ' 止'
  return '全部业务日期'
}

function aggregateAmountState(item) {
  const recognized = Number(item.recognizedAmountLineCount || 0)
  const unresolved = Number(item.unresolvedAmountLineCount || 0)
  const goodsLines = Number(item.goodsLineCount || 0)
  const hasRecords = goodsLines > 0 || recognized > 0 || unresolved > 0
  if (!hasRecords) {
    return { amountState: 'no-record', purchaseAmountText: '—', amountScopeText: '本期暂无采购记录' }
  }
  if (recognized === 0 && unresolved > 0) {
    return {
      amountState: 'unresolved',
      purchaseAmountText: '待核对',
      amountScopeText: '本期 ' + unresolved + ' 条采购记录金额均待核对，未计入采购金额'
    }
  }
  return {
    amountState: unresolved > 0 ? 'partial' : 'recognized',
    purchaseAmountText: formatMoney(item.purchaseAmount),
    amountScopeText: unresolved > 0
      ? '另有 ' + unresolved + ' 条采购记录金额待核对，未计入上述金额'
      : ''
  }
}

function decorateDetail(detail, startDate, stopDate) {
  const amount = aggregateAmountState(detail)
  return Object.assign({}, detail, amount, {
    supplierTypeText: TYPE_TEXT[detail.supplierType] || '供应方类型待核对',
    typeClass: detail.supplierType === 'INTERNAL_DISTRIBUTER' ? 'internal' : 'external',
    relationText: detail.relationStatus === 'ACTIVE' ? '' : (RELATION_TEXT[detail.relationStatus] || ''),
    periodText: periodText(startDate, stopDate),
    manageText: detail.supplierType === 'INTERNAL_DISTRIBUTER'
      ? '进入协作伙伴'
      : '进入外部供应商'
  })
}

function progressText(item) {
  const internal = item.sourceType === 'INTERNAL_COLLABORATION'
  const subject = internal ? '协作订单' : '外部采购记录'
  if (item.factStatus === 'CREATED') return subject + '已创建'
  if (item.factStatus === 'IN_PROGRESS') return subject + '进行中'
  if (item.factStatus === 'FULFILLED') return subject + '来源流程已完成'
  if (item.factStatus === 'CANCELLED') return subject + '已取消'
  return subject + '状态待核对'
}

function issueTexts(item) {
  const issues = []
  const incomplete = item.dataQualityStatus === 'INCOMPLETE'
  if (item.dataQualityStatus === 'CONFLICT') issues.push('来源归属存在冲突')
  if (!item.businessDate && incomplete) issues.push('缺少业务日期')
  if (!item.sourceGoodsId && incomplete) issues.push('商品身份未解析')
  if (!item.goodsName && incomplete) issues.push('缺少商品名称')
  if (item.orderedQuantity == null && incomplete) issues.push('缺少订购数量')
  if (item.factStatus === 'FULFILLED' && item.actualQuantity == null && incomplete) issues.push('缺少来源数量')
  if (item.factStatus === 'FULFILLED' && item.unitPrice == null && incomplete) issues.push('缺少单价')
  if (item.grossAmount == null) {
    issues.push(item.factStatus === 'FULFILLED' ? '缺少小计' : '小计尚未形成')
  }
  return Array.from(new Set(issues))
}

function decorateFact(item) {
  const internal = item.sourceType === 'INTERNAL_COLLABORATION'
  const issues = issueTexts(item)
  let sourceAmountText = '来源金额尚未完整形成'
  if (item.amountBasis === 'COLLABORATION_ORDER') {
    sourceAmountText = item.dataQualityStatus === 'LEGACY_FALLBACK'
      ? '协作订单记录；缺失字段使用对应主订单历史记录'
      : '协作订单中的供货数量、单价和小计'
  } else if (item.amountBasis === 'DPG_FINAL') {
    sourceAmountText = '采购商品记录中的最终数量、单价和小计'
  }
  return Object.assign({}, item, {
    internal,
    actualQuantityLabel: internal ? '供货数量' : '来源数量',
    orderedQuantityText: formatQuantity(item.orderedQuantity, item.specification),
    actualQuantityText: formatQuantity(item.actualQuantity, item.specification),
    unitPriceText: item.unitPrice == null
      ? '—'
      : formatMoney(item.unitPrice) + (item.specification ? '/' + item.specification : ''),
    grossAmountText: formatMoney(item.grossAmount),
    progressText: progressText(item),
    progressClass: item.factStatus === 'CANCELLED' ? 'cancelled' : '',
    issueText: issues.join('；'),
    sourceAmountText,
    sourceExpanded: false
  })
}

function decorateGoods(item) {
  const amount = aggregateAmountState(item)
  let issueText = ''
  if (item.dataQualityStatus === 'CONFLICT') issueText = '来源归属存在冲突'
  else if (item.dataQualityStatus === 'INCOMPLETE' && !amount.amountScopeText) issueText = '部分来源数据不完整'
  return Object.assign({}, item, amount, {
    issueText,
    purchaseCountText: Number(item.purchaseCount || 0),
    goodsLineCountText: Number(item.goodsLineCount || 0)
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
    activeTab: 'records',
    loading: false,
    factLoading: false,
    goodsLoading: false,
    showDataNote: false,
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
  stopPropagation() {},
  openDataNote() { this.setData({ showDataNote: true }) },
  closeDataNote() { this.setData({ showDataNote: false }) },

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
        detail: decorateDetail(bodies[0].data || {}, this.data.startDate, this.data.stopDate),
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

  switchTab(event) {
    this.setData({ activeTab: event.currentTarget.dataset.tab || 'records' })
  },

  toggleSource(event) {
    const index = Number(event.currentTarget.dataset.index)
    this.setData({ ['facts[' + index + '].sourceExpanded']: !this.data.facts[index].sourceExpanded })
  },

  loadMore() {
    if (this.data.activeTab === 'records') this.loadMoreFacts()
    else this.loadMoreGoods()
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

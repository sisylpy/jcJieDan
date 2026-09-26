import {
  disGetUnshelfGoods,
  getPurchaseManagementPendingStockIns,
  getShelfGoods,
  saveShelfGoodsStock
} from '../../../../../lib/apiDistributer.js'

const directStockSubmission = require('../../../../../utils/directStockSubmission.js')
const app = getApp()
const PAGE_SIZE = 20
const RECEIPT_LOOKUP_PAGE_SIZE = 100

function scalePriceToPurchaseUnit(baseUnitPrice, factor) {
  if (baseUnitPrice == null || String(baseUnitPrice).trim() === '') return ''
  const scaled = Number(baseUnitPrice) * Number(factor)
  if (!Number.isFinite(scaled)) return baseUnitPrice
  return scaled.toFixed(6).replace(/\.?0+$/, '')
}

Page({
  data: {
    navBarHeight: 0,
    windowHeight: 0,
    windowWidth: 0,
    disId: null,
    items: [],
    purchaserGroups: [],
    page: 1,
    total: 0,
    loading: false,
    loadingMore: false,
    error: '',
    receiptLoadingId: null,
    showInputPurStock: false,
    receiptItem: null
  },

  onLoad() {
    const globalData = app.globalData || {}
    const userInfo = wx.getStorageSync('userInfo') || {}
    const distributer = userInfo.nxDistributerEntity || {}
    this.setData({
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      windowWidth: globalData.windowWidth * globalData.rpxR,
      disId: distributer.nxDistributerId || null
    })
  },

  onShow() { this.load(true) },
  toBack() { wx.navigateBack({ delta: 1 }) },
  retry() { this.load(true) },

  load(reset) {
    if (this.data.loading || this.data.loadingMore) return
    const page = reset ? 1 : this.data.page + 1
    if (!reset && this.data.items.length >= this.data.total) return
    this.setData(reset ? { loading: true, error: '' } : { loadingMore: true, error: '' })
    getPurchaseManagementPendingStockIns({ page, pageSize: PAGE_SIZE }).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw new Error(body.msg || '待接收入库清单加载失败')
      const data = body.data || {}
      const rows = (data.items || []).map(item => this.decorate(item))
      const items = reset ? rows : this.data.items.concat(rows)
      this.setData({
        items,
        purchaserGroups: this.groupByPurchaser(items),
        page: Number(data.page || page),
        total: Number(data.total || 0)
      })
    }).catch(error => this.setData({ error: error.message || '待接收入库清单加载失败' }))
      .then(() => this.setData({ loading: false, loadingMore: false }))
  },

  decorate(item) {
    const value = Object.assign({}, item)
    const unit = (value.purchaseUnit || '').trim()
    value.quantityText = this.numberText(value.quantity, unit)
    value.unitPriceText = this.moneyText(value.unitPrice, unit ? '/' + unit : '')
    value.amountText = this.moneyText(value.amount)
    value.purchaserText = value.purchaserName || '采购员待核对'
    value.shelfText = value.plannedShelfName ? '计划货架：' + value.plannedShelfName : '未指定货架，入库后归入非货架商品'
    value.actionText = Number(value.batchId) > 0 ? '处理批次收货入库' : '接收入库'
    return value
  },

  groupByPurchaser(items) {
    const groups = []
    const groupMap = Object.create(null)
    items.forEach(item => {
      const purchaserName = item.purchaserText || '采购员待核对'
      const purchaserKey = Number(item.purchaserUserId) > 0
        ? 'user-' + item.purchaserUserId
        : 'name-' + purchaserName
      let group = groupMap[purchaserKey]
      if (!group) {
        group = {
          purchaserKey,
          purchaserName,
          purchaserInitial: purchaserName.slice(0, 1),
          items: [],
          itemCount: 0
        }
        groupMap[purchaserKey] = group
        groups.push(group)
      }
      group.items.push(item)
      group.itemCount = group.items.length
    })
    return groups
  },

  numberText(value, unit) {
    if (value == null || value === '') return '—'
    const number = Number(value)
    return isFinite(number) ? String(number) + (unit || '') : '—'
  },

  moneyText(value, suffix) {
    if (value == null || value === '') return '金额待核对'
    const number = Number(value)
    return isFinite(number) ? '¥' + number.toFixed(2) + (suffix || '') : '金额待核对'
  },

  openReceipt(e) {
    const purchaseGoodsId = Number(e.currentTarget.dataset.purchaseGoodsId)
    if (!purchaseGoodsId || this.data.receiptLoadingId) return
    const row = this.data.items.find(item => Number(item.purchaseGoodsId) === purchaseGoodsId)
    if (!row) {
      wx.showToast({ title: '待入库商品已变化，请刷新后重试', icon: 'none' })
      return
    }

    // 供货商批次的收货、拒收和分次入库以采购批次事实为准，继续进入专用收货页。
    if (Number(row.batchId) > 0) {
      wx.navigateTo({
        url: '/subPackage/pages/prepare/purchaseReceipt/purchaseReceipt?batchId=' + row.batchId
      })
      return
    }

    if (!this.data.disId) {
      wx.showToast({ title: '配送商信息缺失，请重新进入页面', icon: 'none' })
      return
    }
    this.setData({ receiptLoadingId: purchaseGoodsId })
    wx.showLoading({ title: '加载入库信息' })
    this.findReceiptContext(row).then(context => {
      if (!context || !context.purchaseGoods || !context.disGoods) {
        throw new Error('商品入库信息已变化，请刷新后重试')
      }
      const purchaseGoods = context.purchaseGoods
      if (Number(purchaseGoods.nxDpgStatus) !== 2 || Number(purchaseGoods.nxDpgBatchId) > 0) {
        throw new Error('当前商品不是可直接接收入库状态')
      }
      this.setData({
        receiptItem: Object.assign({}, purchaseGoods, {
          nxDistributerGoodsEntity: context.disGoods,
          isShowTools: false
        }),
        showInputPurStock: true
      })
    }).catch(error => {
      wx.showToast({ title: error.message || '入库信息加载失败', icon: 'none' })
    }).then(() => {
      wx.hideLoading()
      this.setData({ receiptLoadingId: null })
    })
  },

  findReceiptContext(row) {
    const plannedShelfId = Number(row.plannedShelfId)
    const shelfLookup = plannedShelfId > 0
      ? this.findOnShelf(plannedShelfId, row.purchaseGoodsId, 1)
      : Promise.resolve(null)
    return shelfLookup.then(context => context || this.findOffShelf(row.purchaseGoodsId, 1))
  },

  findOnShelf(shelfId, purchaseGoodsId, page) {
    return getShelfGoods({
      shelfId,
      page,
      limit: RECEIPT_LOOKUP_PAGE_SIZE,
      shelfGoodsType: '5',
      shelfGoodsQuerySort: 0
    }).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw new Error(body.msg || '货架待入库商品加载失败')
      const pageData = body.page || {}
      const list = pageData.list || []
      for (const shelfGoods of list) {
        const purchaseGoods = shelfGoods && shelfGoods.shelfPurGoods
        if (purchaseGoods && Number(purchaseGoods.nxDistributerPurchaseGoodsId) === Number(purchaseGoodsId)) {
          return {
            purchaseGoods,
            disGoods: shelfGoods.nxDistributerGoodsEntity
          }
        }
      }
      const totalPage = Number(pageData.totalPage || 1)
      return page < totalPage ? this.findOnShelf(shelfId, purchaseGoodsId, page + 1) : null
    })
  },

  findOffShelf(purchaseGoodsId, page) {
    return disGetUnshelfGoods(this.data.disId, page, RECEIPT_LOOKUP_PAGE_SIZE, '5').then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw new Error(body.msg || '非货架待入库商品加载失败')
      const pageData = body.page || {}
      const list = pageData.list || []
      for (const disGoods of list) {
        const purchaseGoods = disGoods && disGoods.shelfPurGoods
        if (purchaseGoods && Number(purchaseGoods.nxDistributerPurchaseGoodsId) === Number(purchaseGoodsId)) {
          return { purchaseGoods, disGoods }
        }
      }
      const totalPage = Number(pageData.totalPage || 1)
      return page < totalPage ? this.findOffShelf(purchaseGoodsId, page + 1) : null
    })
  },

  confirmInputPurStock(e) {
    const item = e.detail.item
    const payload = Object.assign({}, item, {
      isShowTools: false,
      nxDpgProcurementMode: 'SELF_BUY',
      nxDpgBuyUserId: null,
      nxDpgPurUserId: item.nxDpgPurUserId
    })
    const disGoods = item.nxDistributerGoodsEntity || {}
    const factor = Number(payload.nxDpgBuyScale)
    const purchaseUnit = String(payload.nxDpgStandard || '').trim()
    const baseUnit = String(disGoods.nxDgGoodsStandardname || '').trim()
    if (Number.isFinite(factor) && factor > 0 && purchaseUnit && baseUnit && purchaseUnit !== baseUnit) {
      payload.nxDpgExpectPrice = scalePriceToPurchaseUnit(payload.nxDpgExpectPrice, factor)
    }
    delete payload.nxDistributerGoodsEntity

    const submission = directStockSubmission.begin(this, saveShelfGoodsStock, payload)
    if (!submission.started) return
    wx.showLoading({ title: '正在接收入库' })
    submission.promise.then(res => {
      const result = res && res.result
      if (!result || result.code != 0) {
        throw new Error((result && result.msg) || '接收入库失败')
      }
      this.setData({ showInputPurStock: false, receiptItem: null })
      wx.showToast({ title: '接收入库完成', icon: 'success' })
      this.load(true)
    }).catch(error => {
      wx.showToast({ title: error.message || '接收入库失败', icon: 'none' })
    }).then(() => wx.hideLoading())
  },

  cancleInputPurStock() {
    this.setData({ showInputPurStock: false, receiptItem: null })
  },

  more() { this.load(false) }
})

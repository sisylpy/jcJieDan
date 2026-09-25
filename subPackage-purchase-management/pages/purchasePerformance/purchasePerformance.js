import {
  assignSupplierPurchaseOwner,
  getInventoryPurchasePerformance,
  getPurchaseManagementExceptions,
  getPurchaseManagementPurchasers
} from '../../../lib/apiDistributer.js'

const app = getApp()

Page({
  data: {
    navBarHeight: 0,
    activeTab: 'PENDING',
    pendingLoading: false,
    pendingError: '',
    pendingTotal: 0,
    actionSection: { title: '当前可处理', note: '当前Boss有正式操作入口的事项', tone: 'action', items: [] },
    waitingSection: { title: '等待其他角色', note: '正常等待采购员或供应方推进，不计入紧急异常', tone: 'waiting', items: [] },
    blockedSection: { title: '阻断与核查', note: '只提供可靠的来源记录，不允许直接改数字消除问题', tone: 'blocked', items: [] },
    historySection: { title: '历史只读提示', note: '历史资料不足，仅供追溯，不计入当前待办', tone: 'history', items: [] },
    showAssignment: false,
    assignItem: null,
    purchasers: [],
    purchasersLoading: false,
    assigning: false,
    startDate: '',
    stopDate: '',
    dimension: 'PURCHASER',
    groups: [],
    inventoryLoading: false,
    inventoryError: '',
    stockBatchCount: 0,
    excludedCount: 0,
    timeBasisText: ''
  },

  onLoad(options) {
    const end = new Date()
    const start = new Date()
    start.setDate(end.getDate() - 29)
    const activeTab = options && options.tab === 'inventory' ? 'INVENTORY' : 'PENDING'
    this.setData({
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      startDate: formatDate(start),
      stopDate: formatDate(end),
      activeTab
    })
    this._firstShow = true
    this.loadActive()
  },

  onShow() {
    if (this._firstShow) {
      this._firstShow = false
      return
    }
    this.loadActive()
  },

  toBack() { wx.navigateBack({ delta: 1 }) },
  noop() {},

  changeTab(event) {
    const activeTab = event.currentTarget.dataset.value
    if (!activeTab || activeTab === this.data.activeTab) return
    this.setData({ activeTab })
    this.loadActive()
  },

  loadActive() {
    if (this.data.activeTab === 'INVENTORY') this.loadInventory()
    else this.loadPending()
  },

  retryPending() { this.loadPending() },

  loadPending() {
    if (this.data.pendingLoading) return
    this.setData({ pendingLoading: true, pendingError: '' })
    this.fetchPendingPage(1, []).then(result => {
      const sections = { ACTION_REQUIRED: [], WAITING_OTHER: [], BLOCKED_REVIEW: [], HISTORICAL_READ_ONLY: [] }
      ;(result.items || []).forEach(raw => {
        const item = decoratePending(raw)
        const category = sections[item.handlingCategory] ? item.handlingCategory : categoryFor(item.statusCode)
        sections[category].push(item)
      })
      this.setData({
        pendingTotal: result.total || 0,
        'actionSection.items': sections.ACTION_REQUIRED,
        'waitingSection.items': sections.WAITING_OTHER,
        'blockedSection.items': sections.BLOCKED_REVIEW,
        'historySection.items': sections.HISTORICAL_READ_ONLY
      })
    }).catch(error => {
      this.setData({ pendingError: error.message || '待处理事项加载失败' })
    }).then(() => this.setData({ pendingLoading: false }))
  },

  fetchPendingPage(page, collected) {
    return getPurchaseManagementExceptions({ page, pageSize: 100 }).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw new Error(body.msg || '待处理事项加载失败')
      const data = body.data || {}
      const items = collected.concat(data.items || [])
      const total = Number(data.total || items.length)
      if (items.length < total) return this.fetchPendingPage(page + 1, items)
      return { items, total }
    })
  },

  openPending(event) {
    const resource = event.currentTarget.dataset.resource
    const id = event.currentTarget.dataset.id
    if (resource === 'BATCH') {
      wx.navigateTo({ url: '/subPackage/pages/management/purchaseManagement/purchaseBatchDetail/purchaseBatchDetail?batchId=' + id })
    } else if (resource === 'STOCK_BATCH') {
      wx.navigateTo({ url: '/subPackage/pages/shelf/inventoryBatchBusiness/inventoryBatchBusiness?stockBatchId=' + id })
    }
  },

  beginAssign(event) {
    const relationId = Number(event.currentTarget.dataset.relation)
    if (!relationId) return
    this.setData({
      showAssignment: true,
      assignItem: { relationId, subjectName: event.currentTarget.dataset.subject || '采购商品' }
    })
    if (!this.data.purchasers.length) this.loadPurchasers()
  },

  closeAssignment() {
    if (!this.data.assigning) this.setData({ showAssignment: false, assignItem: null })
  },

  loadPurchasers() {
    const stopDate = formatDate(new Date())
    this.setData({ purchasersLoading: true })
    getPurchaseManagementPurchasers({
      startDate: stopDate.slice(0, 7) + '-01',
      stopDate,
      purchaserStatus: 'CURRENT',
      sort: 'NAME',
      page: 1,
      pageSize: 100
    }).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw new Error(body.msg || '采购员加载失败')
      this.setData({ purchasers: ((body.data || {}).items || []).filter(item => item.purchaserUserId) })
    }).catch(error => wx.showToast({ title: error.message || '采购员加载失败', icon: 'none' }))
      .then(() => this.setData({ purchasersLoading: false }))
  },

  choosePurchaser(event) {
    if (this.data.assigning || !this.data.assignItem) return
    const purchaserUserId = Number(event.currentTarget.dataset.id)
    const purchaserName = event.currentTarget.dataset.name || ('采购员 #' + purchaserUserId)
    const relationId = this.data.assignItem.relationId
    wx.showModal({
      title: '确认负责人',
      content: '将“' + this.data.assignItem.subjectName + '”对应供应关系的采购负责人设为“' + purchaserName + '”。保存后系统会按正式规则继续自动订货。',
      success: result => {
        if (!result.confirm) return
        this.setData({ assigning: true })
        assignSupplierPurchaseOwner(relationId, purchaserUserId,
          'quality-owner-' + relationId + '-' + purchaserUserId + '-' + Date.now())
          .then(res => {
            const body = res.result || {}
            if (body.code !== 0) throw new Error(body.msg || '负责人保存失败')
            wx.showToast({ title: '负责人已保存', icon: 'success' })
            this.setData({ showAssignment: false, assignItem: null })
            this.loadPending()
          }).catch(error => wx.showToast({ title: error.message || '负责人保存失败', icon: 'none' }))
          .then(() => this.setData({ assigning: false }))
      }
    })
  },

  changeDimension(event) {
    this.setData({ dimension: event.currentTarget.dataset.value })
    this.loadInventory()
  },
  changeStart(event) { this.setData({ startDate: event.detail.value }); this.loadInventory() },
  changeStop(event) { this.setData({ stopDate: event.detail.value }); this.loadInventory() },
  retryInventory() { this.loadInventory() },

  loadInventory() {
    if (this.data.inventoryLoading) return
    this.setData({ inventoryLoading: true, inventoryError: '' })
    getInventoryPurchasePerformance({
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      dimension: this.data.dimension
    }).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw new Error(body.msg || '库存经营加载失败')
      const data = body.data || {}
      this.setData({
        groups: (data.groups || []).map(decorateGroup),
        stockBatchCount: data.stockBatchCount || 0,
        excludedCount: data.excludedNonWarehouseOrUnresolvedCount || 0,
        timeBasisText: data.timeBasisText || '按入库日期筛选库存批次；经营事实显示截至当前的累计结果'
      })
    }).catch(error => this.setData({ inventoryError: error.message || '库存经营加载失败' }))
      .then(() => this.setData({ inventoryLoading: false }))
  },

  openBatch(event) {
    wx.navigateTo({
      url: '/subPackage/pages/shelf/inventoryBatchBusiness/inventoryBatchBusiness?stockBatchId=' +
        event.currentTarget.dataset.id
    })
  }
})

function decoratePending(raw) {
  const item = Object.assign({}, raw)
  item.businessDateText = item.businessDate || '当前事项'
  item.canAssign = item.actionMode === 'OPERATE' && item.actionCode === 'ASSIGN_SUPPLIER_PURCHASER' && item.supplierRelationId
  item.canView = item.actionMode === 'VIEW' && (item.resourceType === 'BATCH' || item.resourceType === 'STOCK_BATCH')
  item.actionLabel = item.resourceType === 'STOCK_BATCH' ? '查看库存批次' : '查看来源记录'
  return item
}

function categoryFor(status) {
  if (status === 'WAITING') return 'WAITING_OTHER'
  if (status === 'READ_ONLY') return 'HISTORICAL_READ_ONLY'
  if (status === 'BLOCKED' || status === 'ATTENTION') return 'BLOCKED_REVIEW'
  return 'ACTION_REQUIRED'
}

function decorateGroup(raw) {
  const group = Object.assign({}, raw)
  group.grossPurchaseCostText = money(raw.grossPurchaseCost)
  group.lossCostText = money(raw.lossCost)
  group.discardCostText = money(raw.discardCost)
  group.lossCostRateText = costRate(raw.lossCostRate, raw.grossPurchaseCost)
  group.discardCostRateText = costRate(raw.discardCostRate, raw.grossPurchaseCost)
  group.currentRealizedMarginText = money(raw.currentRealizedMargin)
  group.completedFinalMarginText = raw.completedStockBatchCount > 0 ? money(raw.completedFinalMargin) : '暂无完结批次'
  group.unitSummaries = (raw.unitSummaries || []).map(summary => {
    const item = Object.assign({}, summary)
    item.stockInText = quantity(summary.netStockInQuantity, summary.uom)
    item.remainingText = quantity(summary.remainingQuantity, summary.uom)
    item.lossText = quantity(summary.lossQuantity, summary.uom)
    item.discardText = quantity(summary.discardQuantity, summary.uom)
    return item
  })
  group.stockBatches = (raw.stockBatches || []).map(decorateStockBatch)
  return group
}

function decorateStockBatch(raw) {
  const item = Object.assign({}, raw)
  const uom = raw.baseUom || '单位未记录'
  item.stockInText = quantity(raw.netStockInQuantity, uom)
  item.remainingText = quantity(raw.remainingQuantity, uom)
  item.lossText = quantity(raw.lossQuantity, uom)
  item.discardText = quantity(raw.discardQuantity, uom)
  item.grossPurchaseCostText = money(raw.grossPurchaseCost)
  item.currentResultText = money(raw.currentRealizedMargin)
  item.finalResultText = raw.businessStatus === 'COMPLETED'
    ? money(raw.finalMargin) : '经营中，尚无最终结果'
  item.businessStatusText = raw.businessStatus === 'COMPLETED' ? '已符合数量完结条件'
    : raw.businessStatus === 'DATA_INCOMPLETE' ? '状态依据不足' : '经营中'
  item.resultStatusText = raw.resultStatus === 'INSUFFICIENT_BASIS' ? '金额依据不足'
    : raw.resultStatus === 'FINAL_READY' ? '最终结果可核实' : '当前结果可核实'
  return item
}

function numberText(value) {
  if (value === null || value === undefined || value === '') return null
  const number = Number(value)
  if (!Number.isFinite(number)) return null
  return String(Number(number.toFixed(3)))
}

function quantity(value, uom) {
  const text = numberText(value)
  return text === null ? '依据不足' : text + (uom || '')
}

function money(value) {
  if (value === null || value === undefined || value === '') return '依据不足'
  const number = Number(value)
  return Number.isFinite(number) ? '¥' + number.toFixed(2) : '依据不足'
}

function percentage(value) {
  if (value === null || value === undefined || value === '') return '依据不足'
  const number = Number(value)
  return Number.isFinite(number) ? (number * 100).toFixed(2) + '%' : '依据不足'
}

function costRate(value, grossPurchaseCost) {
  if ((value === null || value === undefined || value === '') && Number(grossPurchaseCost) === 0) {
    return '不适用（入库成本为0）'
  }
  return percentage(value)
}

function formatDate(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
}

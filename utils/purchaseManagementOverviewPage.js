import {
  assignSupplierPurchaseOwner,
  getPurchaseManagementExceptions,
  getPurchaseManagementOverview,
  getPurchaseManagementPurchasers
} from '../lib/apiDistributer.js'
import { formatPurchaseMoney, normalizePurchaseAmount } from './purchaseAmountPresenter.js'

const app = getApp()

export function createPurchaseManagementOverviewPage() {
  return {
    data: {
      navBarHeight: 0,
      startDate: '',
      stopDate: '',
      dateType: 'month',
      dateName: 'thisMonth',
      dateLabel: '本月',
      loading: false,
      error: '',
      period: {},
      warehouseStockInAmountText: '—',
      waitingStockInAmountText: '¥0.00',
      purchaseAmount: normalizePurchaseAmount({}),
      tasks: {},
      structures: {},
      pendingLoading: false,
      pendingError: '',
      pendingTotal: 0,
      actionItems: [],
      waitingItems: [],
      blockedItems: [],
      historyItems: [],
      showAssignment: false,
      assignItem: null,
      purchasers: [],
      purchasersLoading: false,
      assigning: false
    },

    onLoad() {
      const end = new Date()
      const start = new Date(end.getFullYear(), end.getMonth(), 1)
      this.setData({
        navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
        startDate: formatDate(start),
        stopDate: formatDate(end)
      })
    },

    onShow() { this.load(); this.loadPending() },
    onPullDownRefresh() { Promise.all([this.load(), this.loadPending()]).then(() => wx.stopPullDownRefresh()) },
    toBack() { wx.navigateBack({ delta: 1 }) },

    toDatePage() {
      wx.navigateTo({
        url: '/subPackage-charts/pages/sel/date/date?startDate=' + this.data.startDate +
          '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType +
          '&dateName=' + this.data.dateName
      })
    },

    onReportDateSelected(selection) {
      this.setData({
        startDate: selection.startDate,
        stopDate: selection.stopDate,
        dateType: selection.dateType,
        dateName: selection.dateName,
        dateLabel: selection.hanzi || '自定义'
      })
    },

    retry() { this.load() },

    load() {
      this.setData({ loading: true, error: '' })
      const query = { startDate: this.data.startDate, stopDate: this.data.stopDate }
      return getPurchaseManagementOverview(query).then(res => {
        const body = res.result || {}
        if (body.code !== 0) throw new Error(body.msg || '加载失败')
        const data = body.data || {}
        if (!data.purchaseAmount) throw new Error('本期采购金额数据未返回')
        const purchaseAmount = normalizePurchaseAmount(data.purchaseAmount)
        if (!purchaseAmount.contractValid) throw new Error('本期采购金额状态无法识别')
        const period = data.period || {}
        const tasks = data.currentTasks || {}
        const allWaitingAmountsUnresolved = Number(tasks.waitingStockInGoodsLines || 0) > 0 &&
          Number(tasks.waitingStockInUnresolvedAmountCount || 0) >= Number(tasks.waitingStockInGoodsLines || 0)
        this.setData({
          period,
          warehouseStockInAmountText: formatPurchaseMoney(period.warehouseStockInAmount),
          waitingStockInAmountText: allWaitingAmountsUnresolved
            ? '金额待核对' : formatPurchaseMoney(tasks.waitingStockInAmount || 0),
          purchaseAmount,
          tasks,
          structures: data.structures || {},
          startDate: data.startDate || '',
          stopDate: data.stopDate || ''
        })
      }).catch(error => this.setData({ error: error.message || '加载失败' }))
        .then(() => this.setData({ loading: false }))
    },

    loadPending() {
      if (this.data.pendingLoading) return Promise.resolve()
      this.setData({ pendingLoading: true, pendingError: '' })
      return this.fetchPendingPage(1, []).then(result => {
        const sections = { ACTION_REQUIRED: [], WAITING_OTHER: [], BLOCKED_REVIEW: [], HISTORICAL_READ_ONLY: [] }
        ;(result.items || []).forEach(raw => {
          const item = decoratePending(raw)
          const category = sections[item.handlingCategory] ? item.handlingCategory : categoryFor(item.statusCode)
          sections[category].push(item)
        })
        this.setData({
          pendingTotal: result.total || 0,
          actionItems: sections.ACTION_REQUIRED,
          waitingItems: sections.WAITING_OTHER,
          blockedItems: sections.BLOCKED_REVIEW,
          historyItems: sections.HISTORICAL_READ_ONLY
        })
      }).catch(error => this.setData({ pendingError: error.message || '待处理事项加载失败' }))
        .then(() => this.setData({ pendingLoading: false }))
    },

    fetchPendingPage(page, collected) {
      return getPurchaseManagementExceptions({ page, pageSize: 100 }).then(res => {
        const body = res.result || {}
        if (body.code !== 0) throw new Error(body.msg || '待处理事项加载失败')
        const data = body.data || {}
        const items = collected.concat(data.items || [])
        const total = Number(data.total || items.length)
        return items.length < total ? this.fetchPendingPage(page + 1, items) : { items, total }
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
    noop() {},

    loadPurchasers() {
      this.setData({ purchasersLoading: true })
      return getPurchaseManagementPurchasers({
        startDate: this.data.stopDate.slice(0, 7) + '-01', stopDate: this.data.stopDate,
        purchaserStatus: 'CURRENT', sort: 'NAME', page: 1, pageSize: 100
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
        content: '将“' + this.data.assignItem.subjectName + '”对应供应关系的采购负责人设为“' + purchaserName + '”。',
        success: result => {
          if (!result.confirm) return
          this.setData({ assigning: true })
          assignSupplierPurchaseOwner(relationId, purchaserUserId, 'overview-owner-' + relationId + '-' + purchaserUserId + '-' + Date.now())
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

    openAmountRecords() {
      wx.navigateTo({
        url: '/subPackage/pages/management/purchaseManagement/purchaseAmountDetail/purchaseAmountDetail'
          + '?startDate=' + encodeURIComponent(this.data.startDate)
          + '&stopDate=' + encodeURIComponent(this.data.stopDate)
      })
    },

    openPendingStockIns() {
      wx.navigateTo({ url: '/subPackage/pages/management/purchaseManagement/pendingStockInList/pendingStockInList' })
    },

    openCollaborationPending() {
      wx.navigateTo({ url: '/pages/doing/index/index' })
    }
  }
}

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

function formatDate(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0')
}

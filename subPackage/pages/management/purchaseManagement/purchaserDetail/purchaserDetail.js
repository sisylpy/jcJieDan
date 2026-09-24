import {
  getPurchaseManagementPurchaser,
  getPurchaseManagementPurchaserTasks,
  getPurchaseManagementPurchaserBatches,
  getPurchaseManagementPurchaserDirectPurchases
} from '../../../../../lib/apiDistributer.js'

const app = getApp()
const PAGE_SIZE = 20
const PURCHASE_APP_ID = 'wx1ea78d3f33234284'

Page({
  data: {
    navBarHeight: 0, purchaserId: 0, startDate: '', stopDate: '', activeTab: 'TASKS',
    detail: { summary: {} }, loading: false, error: '',
    tasks: [], taskPage: 1, taskTotal: 0, taskLoading: false, taskError: '',
    batches: [], batchPage: 1, batchTotal: 0, batchLoading: false, batchError: '',
    directItems: [], directPage: 1, directTotal: 0, directLoading: false, directError: '',
    recordsLoaded: false
  },

  onLoad(options) {
    this.setData({
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      purchaserId: Number(options.purchaserId),
      startDate: options.startDate || '',
      stopDate: options.stopDate || ''
    })
    this.loadHeader()
    this.loadTasks(true)
  },

  onShow() {
    if (!this._returningFromBusiness) return
    this._returningFromBusiness = false
    this.loadHeader()
    this.loadTasks(true)
    if (this.data.recordsLoaded) this.loadRecords()
  },

  toBack() { wx.navigateBack({ delta: 1 }) },
  retry() { this.loadHeader(); this.loadTasks(true) },
  retryTasks() { this.loadTasks(true) },
  retryRecords() { this.loadRecords() },
  changeStart(event) {
    this.setData({ startDate: event.detail.value })
    this.reloadPeriod()
  },
  changeStop(event) {
    this.setData({ stopDate: event.detail.value })
    this.reloadPeriod()
  },
  reloadPeriod() {
    this.loadHeader()
    if (this.data.recordsLoaded || this.data.activeTab === 'RECORDS') this.loadRecords()
  },
  chooseTab(event) {
    const tab = event.currentTarget.dataset.value
    this.setData({ activeTab: tab })
    if (tab === 'RECORDS' && !this.data.recordsLoaded) this.loadRecords()
  },

  loadHeader() {
    if (!this.data.purchaserId) return
    this.setData({ loading: true, error: '' })
    getPurchaseManagementPurchaser(this.data.purchaserId, {
      startDate: this.data.startDate, stopDate: this.data.stopDate
    }).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw new Error(body.msg || '采购员详情加载失败')
      this.setData({ detail: Object.assign({ summary: {} }, body.data || {}) })
    }).catch(error => this.setData({ error: error.message || '采购员详情加载失败' }))
      .then(() => this.setData({ loading: false }))
  },

  loadTasks(reset) {
    if (this.data.taskLoading) return
    const page = reset ? 1 : this.data.taskPage + 1
    this.setData({ taskLoading: true, taskError: '' })
    getPurchaseManagementPurchaserTasks(this.data.purchaserId, { page, pageSize: PAGE_SIZE })
      .then(res => {
        const body = res.result || {}
        if (body.code !== 0) throw new Error(body.msg || '当前任务加载失败')
        const data = body.data || {}
        this.setData({
          tasks: reset ? (data.items || []) : this.data.tasks.concat(data.items || []),
          taskPage: page,
          taskTotal: data.total || 0
        })
      }).catch(error => this.setData({ taskError: error.message || '当前任务加载失败' }))
      .then(() => this.setData({ taskLoading: false }))
  },

  loadRecords() {
    this.setData({ recordsLoaded: true })
    this.loadBatches(true)
    this.loadDirect(true)
  },

  loadBatches(reset) {
    if (this.data.batchLoading) return
    const page = reset ? 1 : this.data.batchPage + 1
    this.setData({ batchLoading: true, batchError: '' })
    getPurchaseManagementPurchaserBatches(this.data.purchaserId, {
      startDate: this.data.startDate, stopDate: this.data.stopDate, page, pageSize: PAGE_SIZE,
      sort: 'LATEST'
    }).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw new Error(body.msg || '采购批次加载失败')
      const data = body.data || {}
      this.setData({
        batches: reset ? (data.items || []) : this.data.batches.concat(data.items || []),
        batchPage: page, batchTotal: data.total || 0
      })
    }).catch(error => this.setData({ batchError: error.message || '采购批次加载失败' }))
      .then(() => this.setData({ batchLoading: false }))
  },

  loadDirect(reset) {
    if (this.data.directLoading) return
    const page = reset ? 1 : this.data.directPage + 1
    this.setData({ directLoading: true, directError: '' })
    getPurchaseManagementPurchaserDirectPurchases(this.data.purchaserId, {
      startDate: this.data.startDate, stopDate: this.data.stopDate, page, pageSize: PAGE_SIZE,
      sort: 'LATEST'
    }).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw new Error(body.msg || '自采记录加载失败')
      const data = body.data || {}
      const list = (data.items || []).map(item => this.decorateDirect(item))
      this.setData({
        directItems: reset ? list : this.data.directItems.concat(list),
        directPage: page, directTotal: data.total || 0
      })
    }).catch(error => this.setData({ directError: error.message || '自采记录加载失败' }))
      .then(() => this.setData({ directLoading: false }))
  },

  decorateDirect(item) {
    const unit = (item.purchaseUnit || item.purchaseStandard || '').trim()
    const quantity = this.numberText(item.quantity)
    const planned = this.numberText(item.plannedQuantity)
    const source = item.demandSource
    item.quantityText = quantity != null ? quantity + (unit ? unit : '')
      : planned != null ? '计划 ' + planned + (unit ? unit : '') : '—'
    item.priceText = this.moneyText(item.purchasePrice)
    item.subtotalText = this.moneyText(item.purchaseSubtotal)
    item.specText = (item.purchaseStandard || item.purchaseUnit || item.goodsStandard || '').trim()
    item.purchasePurposeText = source === 'ORDER_GENERATED' ? '客户订单订货'
      : (source === 'SHELF_REPLENISHMENT' || source === 'SMART_REPLENISHMENT') ? '库存备货' : '用途待核对'
    return item
  },

  numberText(value) {
    if (value == null || value === '') return null
    const number = Number(value)
    return isFinite(number) ? String(number) : null
  },
  moneyText(value) {
    const text = this.numberText(value)
    return text == null ? '—' : '¥' + text
  },

  openTask(event) {
    const task = event.currentTarget.dataset.item || {}
    if (task.actionCode === 'OPEN_BOSS_BATCH') return this.openBatchById(task.batchId)
    if (!task.canOperate || !task.buyerJrdhUserId) {
      wx.showToast({ title: '请对应采购员在精彩订货中处理', icon: 'none' })
      return
    }
    let path = ''
    if (task.actionCode === 'OPEN_JRDH_PURCHASE_TASKS') {
      path = '/pkgPurchase/pages/purchaseTasks/purchaseTasks?disId=' + encodeURIComponent(task.distributerId) +
        '&buyerId=' + encodeURIComponent(task.buyerJrdhUserId) +
        '&purUserId=' + encodeURIComponent(task.purchaserUserId) +
        '&disName=' + encodeURIComponent(task.buyerDistributerName || '')
    } else if (task.actionCode === 'OPEN_JRDH_BATCH_SHARE') {
      const scope = task.purchasePurpose === 'CUSTOMER_ORDER' ? 'ORDER_GENERATED'
        : task.purchasePurpose === 'INVENTORY_REPLENISHMENT' ? 'SHELF_REPLENISHMENT' : ''
      path = '/pkgPurchase/pages/txs/purPrepareBatch/purPrepareBatch?batchId=' + encodeURIComponent(task.batchId) +
        '&disId=' + encodeURIComponent(task.distributerId) +
        '&purUserId=' + encodeURIComponent(task.purchaserUserId) +
        '&demandScope=' + encodeURIComponent(scope)
    } else if (task.actionCode === 'OPEN_JRDH_BUYER_CONFIRM') {
      path = '/pkgPurchase/pages/txs/disOrderBatch/disOrderBatch?batchId=' + encodeURIComponent(task.batchId) +
        '&disId=' + encodeURIComponent(task.distributerId) +
        '&purUserId=' + encodeURIComponent(task.purchaserUserId) +
        '&buyerUserId=' + encodeURIComponent(task.buyerJrdhUserId) + '&fromBuyer=1&fromBoss=1'
    }
    if (!path) return this.openBatchById(task.batchId)
    this._returningFromBusiness = true
    wx.navigateToMiniProgram({
      appId: PURCHASE_APP_ID,
      path,
      envVersion: 'trial',
      fail() {
        wx.showToast({ title: '暂时无法打开精彩订货', icon: 'none' })
      }
    })
  },

  openBatch(event) { this.openBatchById(event.currentTarget.dataset.id) },
  openBatchById(batchId) {
    if (!batchId) return
    this._returningFromBusiness = true
    wx.navigateTo({
      url: '/subPackage/pages/management/purchaseManagement/purchaseBatchDetail/purchaseBatchDetail?batchId=' + batchId +
        '&startDate=' + encodeURIComponent(this.data.startDate) + '&stopDate=' + encodeURIComponent(this.data.stopDate)
    })
  },

  more() {
    if (this.data.activeTab === 'TASKS') {
      if (this.data.tasks.length < this.data.taskTotal) this.loadTasks(false)
      return
    }
    if (this.data.batches.length < this.data.batchTotal) this.loadBatches(false)
    if (this.data.directItems.length < this.data.directTotal) this.loadDirect(false)
  }
})

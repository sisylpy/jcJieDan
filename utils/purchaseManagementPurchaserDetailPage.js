import {
  getPurchaseManagementPurchasers,
  getPurchaseManagementPurchaserTasks,
  getPurchaseManagementPurchaserBatches,
  getPurchaseManagementPurchaserDirectPurchases
} from '../lib/apiDistributer.js'
import apiUrl from '../config.js'
import {
  buildPurchaserRecordView,
  purchaserRecordInitialState
} from './purchaseManagementPurchaserRecordView.js'

const app = getApp()
const PAGE_SIZE = 100
const MAX_PAGES = 100
const PURCHASE_APP_ID = 'wx1ea78d3f33234284'

function today() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return year + '-' + month + '-' + day
}

function monthStart(stopDate) {
  return String(stopDate || today()).slice(0, 7) + '-01'
}

function positiveId(value) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : 0
}

function sum(rows, key) {
  let hasValue = false
  const total = (rows || []).reduce((result, row) => {
    const value = row && row[key]
    if (value === null || value === undefined || value === '') return result
    const number = Number(value)
    if (!isFinite(number)) return result
    hasValue = true
    return result + number
  }, 0)
  return hasValue ? Number(total.toFixed(2)) : null
}

function count(rows, key) {
  return (rows || []).reduce((result, row) => result + Number((row && row[key]) || 0), 0)
}

function latestFirst(left, right) {
  const leftDate = String(left.businessDate || left.purchaseDate || '')
  const rightDate = String(right.businessDate || right.purchaseDate || '')
  if (leftDate !== rightDate) return rightDate.localeCompare(leftDate)
  return String(right.taskKey || right.batchId || right.purchaseGoodsId || '')
    .localeCompare(String(left.taskKey || left.batchId || left.purchaseGoodsId || ''))
}

export function createPurchaserDetailPage() {
  return {
  data: {
    navBarHeight: 0,
    purchaserId: 0,
    purchasers: [],
    selectedAllPurchasers: true,
    selectedPurchaserIds: [],
    purchaserSelectionText: '全部采购员',
    showPurchaserFilter: false,
    draftAllPurchasers: true,
    draftPurchasers: [],
    draftSelectedCount: 0,
    startDate: '', stopDate: '', dateType: 'month', dateName: 'thisMonth', dateLabel: '本月', activeTab: 'TASKS',
    detail: { summary: {} }, loading: false, error: '',
    tasks: [], taskPage: 1, taskTotal: 0, taskLoading: false, taskError: '',
    batches: [], batchPage: 1, batchTotal: 0, batchLoading: false, batchError: '',
    directItems: [], directPage: 1, directTotal: 0, directLoading: false, directError: '',
    recordsLoaded: false
  },

  onLoad(options) {
    const stopDate = options.stopDate || today()
    this._initialPurchaserId = positiveId(options.purchaserId)
    this._scopeVersion = 1
    this.setData({
      navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR,
      purchaserId: this._initialPurchaserId,
      selectedAllPurchasers: !this._initialPurchaserId,
      selectedPurchaserIds: this._initialPurchaserId ? [this._initialPurchaserId] : [],
      startDate: options.startDate || monthStart(stopDate),
      stopDate,
      dateLabel: decodeURIComponent(options.dateLabel || '本月')
    })
    this.loadHeader().then(loaded => {
      if (loaded) this.loadTasks(true)
    })
  },

  onShow() {
    if (this._dateChanged) {
      this._dateChanged = false
      this.reloadPeriod()
      return
    }
    if (!this._returningFromBusiness) return
    this._returningFromBusiness = false
    this.loadHeader().then(loaded => {
      if (!loaded) return
      this.loadTasks(true)
      if (this.data.recordsLoaded) this.loadRecords()
    })
  },

  toBack() { wx.navigateBack({ delta: 1 }) },
  noop() {},
  retry() {
    this.loadHeader().then(loaded => {
      if (loaded) this.loadTasks(true)
    })
  },
  retryTasks() { this.loadTasks(true) },
  retryRecords() { this.loadRecords() },
  toDatePage() {
    wx.navigateTo({ url: '/subPackage-charts/pages/sel/date/date?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType + '&dateName=' + this.data.dateName })
  },
  onReportDateSelected(selection) {
    this._dateChanged = true
    this.setData({ startDate: selection.startDate, stopDate: selection.stopDate, dateType: selection.dateType, dateName: selection.dateName, dateLabel: selection.hanzi || '自定义' })
  },
  reloadPeriod() {
    this._scopeVersion += 1
    this.loadHeader().then(loaded => {
      if (loaded && (this.data.recordsLoaded || this.data.activeTab === 'RECORDS')) this.loadRecords()
    })
  },
  chooseTab(event) {
    const tab = event.currentTarget.dataset.value
    const initial = tab === 'RECORDS' && !this.data.recordsLoaded
      ? purchaserRecordInitialState() : {}
    this.setData(Object.assign({ activeTab: tab }, initial))
    if (tab === 'RECORDS' && !this.data.recordsLoaded) this.loadRecords()
  },

  loadAllPages(request, params, errorText, page, items) {
    const currentPage = page || 1
    const currentItems = items || []
    return request(Object.assign({}, params || {}, { page: currentPage, pageSize: PAGE_SIZE })).then(res => {
      const body = res.result || {}
      if (body.code !== 0) throw new Error(body.msg || errorText)
      const data = body.data || {}
      const nextItems = currentItems.concat(data.items || [])
      const hasMore = data.hasMore === true || nextItems.length < Number(data.total || 0)
      if (hasMore && currentPage < MAX_PAGES && (data.items || []).length) {
        return this.loadAllPages(request, params, errorText, currentPage + 1, nextItems)
      }
      return nextItems
    })
  },

  loadHeader() {
    this.setData({ loading: true, error: '' })
    return this.loadAllPages(
      data => getPurchaseManagementPurchasers(data),
      { startDate: this.data.startDate, stopDate: this.data.stopDate, sort: 'NAME' },
      '采购员统计加载失败'
    ).then(items => {
      const purchasers = (items || []).filter(item => positiveId(item.purchaserUserId))
      const validIds = purchasers.map(item => positiveId(item.purchaserUserId))
      let selectedAll = this.data.selectedAllPurchasers
      let selectedIds = (this.data.selectedPurchaserIds || []).filter(id => validIds.indexOf(positiveId(id)) >= 0)
      if (this._initialPurchaserId) {
        selectedIds = validIds.indexOf(this._initialPurchaserId) >= 0 ? [this._initialPurchaserId] : []
        selectedAll = !selectedIds.length
        this._initialPurchaserId = 0
      } else if (!selectedAll && !selectedIds.length) {
        selectedAll = true
      }
      this.setData({
        purchasers,
        selectedAllPurchasers: selectedAll,
        selectedPurchaserIds: selectedAll ? [] : selectedIds
      })
      this.updateSummary()
      return true
    }).catch(error => {
      this.setData({ error: error.message || '采购员统计加载失败' })
      return false
    }).then(loaded => {
      this.setData({ loading: false })
      return loaded
    })
  },

  activePurchasers() {
    if (this.data.selectedAllPurchasers) return this.data.purchasers || []
    const selected = this.data.selectedPurchaserIds || []
    return (this.data.purchasers || []).filter(item => selected.indexOf(positiveId(item.purchaserUserId)) >= 0)
  },

  activePurchaserIds() {
    return this.activePurchasers().map(item => positiveId(item.purchaserUserId)).filter(Boolean)
  },

  updateSummary() {
    const selected = this.activePurchasers()
    const names = selected.map(item => item.purchaserName || ('采购员 #' + item.purchaserUserId))
    const isAll = this.data.selectedAllPurchasers
    const single = selected.length === 1 ? selected[0] : null
    const summary = {
      currentTaskCount: count(selected, 'currentTaskCount'),
      periodPurchaseRecordCount: count(selected, 'periodPurchaseRecordCount'),
      periodPurchaseAmount: sum(selected, 'periodPurchaseAmount'),
      periodUnresolvedAmountCount: count(selected, 'periodUnresolvedAmountCount')
    }
    const detail = !isAll && single ? Object.assign({}, single, { summary }) : {
      purchaserName: isAll ? '全部采购员' : selected.length + ' 位采购员',
      purchaserStatusText: isAll ? '全员汇总' : '组合筛选',
      accountStatusText: isAll ? '共 ' + selected.length + ' 位采购员' : names.slice(0, 2).join('、') + (names.length > 2 ? ' 等' : ''),
      summary
    }
    const selectionText = isAll ? '全部采购员（' + selected.length + '）'
      : single ? names[0] : '已选 ' + selected.length + ' 位采购员'
    this.setData({ detail, purchaserSelectionText: selectionText })
  },

  openPurchaserFilter() {
    const selectedIds = this.data.selectedAllPurchasers
      ? this.data.purchasers.map(item => positiveId(item.purchaserUserId))
      : this.data.selectedPurchaserIds
    const draftPurchasers = this.data.purchasers.map(item => Object.assign({}, item, {
      selected: selectedIds.indexOf(positiveId(item.purchaserUserId)) >= 0
    }))
    this.setData({
      showPurchaserFilter: true,
      draftAllPurchasers: this.data.selectedAllPurchasers,
      draftPurchasers,
      draftSelectedCount: draftPurchasers.filter(item => item.selected).length
    })
  },

  closePurchaserFilter() { this.setData({ showPurchaserFilter: false }) },

  selectAllPurchasers() {
    const draftPurchasers = this.data.draftPurchasers.map(item => Object.assign({}, item, { selected: true }))
    this.setData({
      draftAllPurchasers: true,
      draftPurchasers,
      draftSelectedCount: draftPurchasers.length
    })
  },

  clearDraftPurchasers() {
    const draftPurchasers = this.data.draftPurchasers.map(item => Object.assign({}, item, { selected: false }))
    this.setData({
      draftAllPurchasers: false,
      draftPurchasers,
      draftSelectedCount: 0
    })
  },

  togglePurchaser(event) {
    const purchaserId = positiveId(event.currentTarget.dataset.id)
    const draftPurchasers = this.data.draftPurchasers.map(item => {
      if (positiveId(item.purchaserUserId) !== purchaserId) return item
      return Object.assign({}, item, { selected: !item.selected })
    })
    const selectedCount = draftPurchasers.filter(item => item.selected).length
    this.setData({
      draftPurchasers,
      draftSelectedCount: selectedCount,
      draftAllPurchasers: draftPurchasers.length > 0 && selectedCount === draftPurchasers.length
    })
  },

  applyPurchaserFilter() {
    const ids = this.data.draftPurchasers.filter(item => item.selected)
      .map(item => positiveId(item.purchaserUserId)).filter(Boolean)
    if (!ids.length) {
      wx.showToast({ title: '请至少选择一位采购员', icon: 'none' })
      return
    }
    const selectedAll = ids.length === this.data.purchasers.length
    this._scopeVersion += 1
    this.setData({
      showPurchaserFilter: false,
      selectedAllPurchasers: selectedAll,
      selectedPurchaserIds: selectedAll ? [] : ids,
      purchaserId: selectedAll || ids.length !== 1 ? 0 : ids[0],
      tasks: [], batches: [], directItems: [],
      taskError: '', batchError: '', directError: ''
    })
    this.updateSummary()
    this.loadTasks(true)
    if (this.data.recordsLoaded || this.data.activeTab === 'RECORDS') this.loadRecords()
  },

  purchaserName(purchaserId) {
    const id = positiveId(purchaserId)
    const purchaser = (this.data.purchasers || []).find(item => positiveId(item.purchaserUserId) === id)
    return purchaser ? (purchaser.purchaserName || ('采购员 #' + id)) : ('采购员 #' + id)
  },

  decorateOwner(item, purchaserId) {
    const ownerId = positiveId(item.purchaserUserId) || positiveId(purchaserId)
    return Object.assign({}, item, {
      purchaserUserId: ownerId,
      purchaserName: item.purchaserName || this.purchaserName(ownerId)
    })
  },

  loadForPurchasers(request, params, errorText, decorator) {
    const ids = this.activePurchaserIds()
    return Promise.all(ids.map(purchaserId => this.loadAllPages(
      data => request(purchaserId, data), params, errorText
    ).then(items => (items || []).map(item => decorator.call(this, item, purchaserId)))))
      .then(groups => groups.reduce((all, group) => all.concat(group), []))
  },

  loadTasks(reset) {
    const token = this._scopeVersion
    const ids = this.activePurchaserIds()
    if (!ids.length) {
      this.setData({ tasks: [], taskTotal: 0, taskLoading: false, taskError: '' })
      return Promise.resolve()
    }
    this.setData({ taskLoading: true, taskError: '' })
    return this.loadForPurchasers(
      getPurchaseManagementPurchaserTasks,
      {},
      '当前任务加载失败',
      this.decorateOwner
    ).then(items => {
      if (token !== this._scopeVersion) return
      const tasks = items.sort(latestFirst)
      this.setData({ tasks, taskPage: 1, taskTotal: tasks.length })
    }).catch(error => {
      if (token === this._scopeVersion) this.setData({ taskError: error.message || '当前任务加载失败' })
    }).then(() => {
      if (token === this._scopeVersion) this.setData({ taskLoading: false })
    })
  },

  loadRecords() {
    this.setData(Object.assign({
      recordsLoaded: true,
      batches: [],
      directItems: []
    }, purchaserRecordInitialState()))
    this.loadBatches(true)
    this.loadDirect(true)
  },

  recordView(batches, directItems, statePatch) {
    return buildPurchaserRecordView(
      batches,
      directItems,
      Object.assign({}, this.data, statePatch || {}),
      apiUrl.server
    )
  },

  loadBatches(reset) {
    const token = this._scopeVersion
    if (!this.activePurchaserIds().length) {
      this.setData({ batches: [], batchTotal: 0, batchLoading: false, batchError: '' })
      return Promise.resolve()
    }
    this.setData({ batchLoading: true, batchError: '' })
    return this.loadForPurchasers(
      getPurchaseManagementPurchaserBatches,
      { startDate: this.data.startDate, stopDate: this.data.stopDate, sort: 'LATEST' },
      '采购批次加载失败',
      this.decorateOwner
    ).then(items => {
      if (token !== this._scopeVersion) return
      const batches = items.sort(latestFirst)
      this.setData(Object.assign({
        batches,
        batchPage: 1,
        batchTotal: batches.length
      }, this.recordView(batches, this.data.directItems)))
    }).catch(error => {
      if (token === this._scopeVersion) this.setData({ batchError: error.message || '采购批次加载失败' })
    }).then(() => {
      if (token === this._scopeVersion) this.setData({ batchLoading: false })
    })
  },

  loadDirect(reset) {
    const token = this._scopeVersion
    if (!this.activePurchaserIds().length) {
      this.setData({ directItems: [], directTotal: 0, directLoading: false, directError: '' })
      return Promise.resolve()
    }
    this.setData({ directLoading: true, directError: '' })
    return this.loadForPurchasers(
      getPurchaseManagementPurchaserDirectPurchases,
      { startDate: this.data.startDate, stopDate: this.data.stopDate, sort: 'LATEST' },
      '自采记录加载失败',
      function (item, purchaserId) {
        return this.decorateDirect(this.decorateOwner(item, purchaserId))
      }
    ).then(items => {
      if (token !== this._scopeVersion) return
      const directItems = items.sort(latestFirst)
      this.setData(Object.assign({
        directItems,
        directPage: 1,
        directTotal: directItems.length
      }, this.recordView(this.data.batches, directItems)))
    }).catch(error => {
      if (token === this._scopeVersion) this.setData({ directError: error.message || '自采记录加载失败' })
    }).then(() => {
      if (token === this._scopeVersion) this.setData({ directLoading: false })
    })
  },

  decorateDirect(source) {
    const item = Object.assign({}, source)
    const unit = (item.purchaseUnit || item.purchaseStandard || '').trim()
    const quantity = this.numberText(item.quantity)
    const planned = this.numberText(item.plannedQuantity)
    const demandSource = item.demandSource
    item.quantityText = quantity != null ? quantity + (unit ? unit : '')
      : planned != null ? '计划 ' + planned + (unit ? unit : '') : '—'
    item.priceText = this.moneyText(item.purchasePrice)
    item.subtotalText = this.moneyText(item.purchaseSubtotal)
    item.specText = (item.purchaseStandard || item.purchaseUnit || item.goodsStandard || '').trim()
    item.purchasePurposeText = demandSource === 'ORDER_GENERATED' ? '客户订单订货'
      : (demandSource === 'SHELF_REPLENISHMENT' || demandSource === 'UNSHELVED_REPLENISHMENT' ||
        demandSource === 'VOICE_PURCHASE' || demandSource === 'SMART_REPLENISHMENT') ? '库存备货' : '用途待核对'
    return item
  },

  chooseRecordGroup(event) {
    const activeRecordGroup = event.currentTarget.dataset.value || 'ALL'
    this.setData(Object.assign(
      { activeRecordGroup },
      this.recordView(this.data.batches, this.data.directItems, { activeRecordGroup })
    ))
  },
  changeRecordMode(event) {
    const recordModeIndex = Number(event.detail.value || 0)
    this.setData(Object.assign(
      { recordModeIndex },
      this.recordView(this.data.batches, this.data.directItems, { recordModeIndex })
    ))
  },
  changeRecordStatus(event) {
    const recordStatusIndex = Number(event.detail.value || 0)
    this.setData(Object.assign(
      { recordStatusIndex },
      this.recordView(this.data.batches, this.data.directItems, { recordStatusIndex })
    ))
  },
  changeRecordSort(event) {
    const recordSortIndex = Number(event.detail.value || 0)
    this.setData(Object.assign(
      { recordSortIndex },
      this.recordView(this.data.batches, this.data.directItems, { recordSortIndex })
    ))
  },

  openRecord(event) {
    const batchId = event.currentTarget.dataset.id
    if (batchId) this.openBatchById(batchId)
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
    } else if (task.actionCode === 'OPEN_JRDH_INVENTORY_RECEIPT') {
      path = '/pkgPurchase/pages/txs/disOrderBatch/disOrderBatch?batchId=' + encodeURIComponent(task.batchId) +
        '&disId=' + encodeURIComponent(task.distributerId) +
        '&purUserId=' + encodeURIComponent(task.purchaserUserId) +
        '&buyerUserId=' + encodeURIComponent(task.buyerJrdhUserId) +
        '&demandScope=SHELF_REPLENISHMENT&fromBuyer=1&fromBoss=1'
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

  more() {}
  }
}

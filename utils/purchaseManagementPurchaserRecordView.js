import { resolveGoodsImage } from './goodsImageView.js'

const MODE_OPTIONS = [
  { value: 'ALL', label: '采购方式' },
  { value: 'SUPPLIER', label: '供应方采购' },
  { value: 'SELF_BUY', label: '自采' }
]

const STATUS_OPTIONS = [
  { value: 'ALL', label: '状态' },
  { value: 'STOCKED', label: '已入库' },
  { value: 'WAITING_STOCK', label: '待入库' },
  { value: 'COMPLETED', label: '已完成' },
  { value: 'IN_PROGRESS', label: '处理中' },
  { value: 'CANCELLED', label: '已取消' }
]

const SORT_OPTIONS = [
  { value: 'LATEST', label: '最近采购' },
  { value: 'AMOUNT_DESC', label: '金额从高到低' },
  { value: 'AMOUNT_ASC', label: '金额从低到高' }
]

function clean(value) {
  if (value === null || value === undefined) return ''
  const text = String(value).trim()
  return text === 'null' || text === 'undefined' ? '' : text
}

function number(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return isFinite(parsed) ? parsed : null
}

function moneyText(value) {
  const amount = number(value)
  if (amount === null) return '金额待形成'
  const fixed = amount.toFixed(2)
  return '¥' + fixed.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
}

function splitCategories(value) {
  const categories = clean(value).split('、').map(clean).filter(Boolean)
  return categories.length ? categories : ['其他商品']
}

function batchStatus(item) {
  const progress = clean(item.businessProgress)
  const putaway = clean(item.putawayStatus)
  const receipt = clean(item.receiptStatus)
  const purpose = clean(item.purchasePurpose)
  const execution = clean(item.executionStatus)
  if (progress === 'CANCELLED' || execution === 'REVERSED') {
    return { key: 'CANCELLED', text: '已取消' }
  }
  if (putaway === 'COMPLETED') return { key: 'STOCKED', text: '已入库' }
  if (purpose === 'INVENTORY_REPLENISHMENT' && (
    progress === 'PURCHASE_RECORDED' || execution === 'COMPLETED' ||
    receipt === 'RECEIVED' || receipt === 'PARTIALLY_RECEIVED'
  )) {
    return { key: 'WAITING_STOCK', text: putaway === 'PARTIALLY_PUT_AWAY' ? '部分入库' : '待入库' }
  }
  if (purpose === 'CUSTOMER_ORDER' && (
    progress === 'SUPPLY_CONFIRMED' || execution === 'COMPLETED'
  )) return { key: 'COMPLETED', text: '已完成' }
  return { key: 'IN_PROGRESS', text: clean(item.businessProgressText) || clean(item.executionStatusText) || '处理中' }
}

function batchRecord(item, serverBase) {
  const status = batchStatus(item)
  const amount = number(item.recognizedSupplyAmount)
  const lineCount = Number(item.goodsLineCount || 0)
  const mode = clean(item.procurementMode) === 'SELF_BUY' ? 'SELF_BUY' : 'SUPPLIER'
  return {
    key: 'BATCH:' + item.batchId,
    recordType: 'BATCH',
    batchId: item.batchId,
    clickable: true,
    title: clean(item.goodsSummary) || clean(item.batchNumber) || '采购批次',
    categories: splitCategories(item.goodsCategories),
    imageUrl: resolveGoodsImage({ goodsFile: item.goodsImage }, serverBase),
    businessDate: clean(item.businessDate) || '日期待核对',
    sourceKey: mode,
    sourceText: clean(item.purchaseKindText) || (mode === 'SELF_BUY' ? '自采' : '供应方采购'),
    purposeText: clean(item.purchasePurposeText) || '采购用途待核对',
    statusKey: status.key,
    statusText: status.text,
    quantityPriceText: lineCount > 0 ? lineCount + '种商品' : '商品明细待核对',
    amount,
    amountText: moneyText(item.recognizedSupplyAmount)
  }
}

function directPurpose(item) {
  const source = clean(item.demandSource)
  if (source === 'ORDER_GENERATED') return '客户订单订货'
  if (source === 'SHELF_REPLENISHMENT' || source === 'UNSHELVED_REPLENISHMENT' ||
    source === 'VOICE_PURCHASE' || source === 'SMART_REPLENISHMENT') return '库存备货'
  return clean(item.purchasePurposeText) || '采购用途待核对'
}

function directRecord(item, serverBase) {
  const state = clean(item.purchaseStatus)
  const status = state === 'STOCKED'
    ? { key: 'STOCKED', text: '已入库' }
    : state === 'PURCHASED'
      ? { key: 'WAITING_STOCK', text: '待入库' }
      : { key: 'IN_PROGRESS', text: clean(item.purchaseStatusText) || '处理中' }
  const quantity = clean(item.quantityText) || '数量待核对'
  const price = clean(item.priceText)
  return {
    key: 'DIRECT:' + item.purchaseGoodsId,
    recordType: 'DIRECT',
    purchaseGoodsId: item.purchaseGoodsId,
    clickable: false,
    title: clean(item.goodsName) || '商品名称待补全',
    categories: splitCategories(item.goodsCategory),
    imageUrl: resolveGoodsImage({ goodsFile: item.goodsImage }, serverBase),
    businessDate: clean(item.purchaseDate) || '日期待核对',
    sourceKey: 'SELF_BUY',
    sourceText: clean(item.demandSourceText) || clean(item.recordKindText) || '直接自采',
    purposeText: directPurpose(item),
    statusKey: status.key,
    statusText: status.text,
    quantityPriceText: price && price !== '—' ? quantity + ' × ' + price : quantity,
    amount: number(item.purchaseSubtotal),
    amountText: moneyText(item.purchaseSubtotal)
  }
}

function selectedValue(options, index) {
  const selected = options[Number(index) || 0]
  return selected ? selected.value : 'ALL'
}

function compareRecords(sortValue) {
  return function (left, right) {
    if (sortValue === 'AMOUNT_DESC' || sortValue === 'AMOUNT_ASC') {
      if (left.amount === null && right.amount === null) return right.key.localeCompare(left.key)
      if (left.amount === null) return 1
      if (right.amount === null) return -1
      const delta = sortValue === 'AMOUNT_DESC' ? right.amount - left.amount : left.amount - right.amount
      if (delta) return delta
    }
    return right.businessDate.localeCompare(left.businessDate) || right.key.localeCompare(left.key)
  }
}

export function purchaserRecordInitialState() {
  return {
    activeRecordGroup: 'ALL',
    recordGroups: [{ key: 'ALL', name: '全部记录', count: 0 }],
    recordItems: [],
    recordModeOptions: MODE_OPTIONS,
    recordModeIndex: 0,
    recordStatusOptions: STATUS_OPTIONS,
    recordStatusIndex: 0,
    recordSortOptions: SORT_OPTIONS,
    recordSortIndex: 0
  }
}

export function buildPurchaserRecordView(batches, directItems, viewState, serverBase) {
  const state = Object.assign({}, purchaserRecordInitialState(), viewState || {})
  const records = (batches || []).map(item => batchRecord(item, serverBase))
    .concat((directItems || []).map(item => directRecord(item, serverBase)))
  const counts = {}
  records.forEach(item => item.categories.forEach(category => {
    counts[category] = (counts[category] || 0) + 1
  }))
  const groups = [{ key: 'ALL', name: '全部记录', count: records.length }]
    .concat(Object.keys(counts).sort().map(name => ({ key: name, name, count: counts[name] })))
  const groupExists = groups.some(group => group.key === state.activeRecordGroup)
  const activeGroup = groupExists ? state.activeRecordGroup : 'ALL'
  const mode = selectedValue(MODE_OPTIONS, state.recordModeIndex)
  const status = selectedValue(STATUS_OPTIONS, state.recordStatusIndex)
  const sort = selectedValue(SORT_OPTIONS, state.recordSortIndex)
  const items = records.filter(item => {
    if (activeGroup !== 'ALL' && item.categories.indexOf(activeGroup) < 0) return false
    if (mode !== 'ALL' && item.sourceKey !== mode) return false
    return status === 'ALL' || item.statusKey === status
  }).sort(compareRecords(sort))
  return { activeRecordGroup: activeGroup, recordGroups: groups, recordItems: items }
}

const SOURCE_TEXT = {
  INTERNAL_COLLABORATION: '内部协作',
  EXTERNAL_DPB: '外部供应',
  SELF_PURCHASE: '自采'
}

const SOURCE_ORDER = {
  INTERNAL_COLLABORATION: 1,
  EXTERNAL_DPB: 2,
  SELF_PURCHASE: 3
}

const PURPOSE_TEXT = {
  CUSTOMER_ORDER: '客户订单订货',
  INVENTORY_REPLENISHMENT: '库存备货',
  UNCLASSIFIED: '用途待核对',
  UNKNOWN: '用途待核对'
}

function present(value) {
  return value !== undefined && value !== null && value !== ''
}

export function formatPurchaseMoney(value) {
  if (!present(value)) return '—'
  const amount = Number(value)
  return isFinite(amount) ? '¥' + amount.toFixed(2) : '—'
}

function amountState(raw, included, unresolved, conflicts) {
  const value = String(raw || '').toUpperCase()
  if (value === 'NO_RECORDS') return 'NO_RECORD'
  if (value === 'ALL_AMOUNT_UNRESOLVED') return 'ALL_UNRESOLVED'
  if (value === 'ALL_SOURCE_CONFLICT') return 'ALL_CONFLICT'
  if (value === 'ALL_UNRESOLVED_OR_CONFLICT') return 'ALL_ISSUES'
  if (value === 'PARTIAL_AMOUNT_UNRESOLVED') return 'PARTIAL'
  if (value === 'PARTIAL_SOURCE_CONFLICT') return 'PARTIAL_CONFLICT'
  if (value === 'PARTIAL_DATA_ISSUES') return 'PARTIAL_ISSUES'
  if (value === 'AVAILABLE') return 'RECOGNIZED'
  if (included === 0 && unresolved === 0 && conflicts === 0) return 'NO_RECORD'
  if (included === 0 && unresolved === 0 && conflicts > 0) return 'ALL_CONFLICT'
  if (included === 0 && unresolved > 0 && conflicts > 0) return 'ALL_ISSUES'
  if (included === 0 && unresolved > 0) return 'ALL_UNRESOLVED'
  if (included > 0 && unresolved > 0 && conflicts > 0) return 'PARTIAL_ISSUES'
  if (included > 0 && conflicts > 0) return 'PARTIAL_CONFLICT'
  if (included > 0 && unresolved > 0) return 'PARTIAL'
  return 'RECOGNIZED'
}

function normalizeGroup(group) {
  const sourceType = group.sourceType || ''
  const includedRecordCount = Number(group.includedRecordCount || 0)
  const unresolvedAmountCount = Number(group.unresolvedAmountCount || 0)
  const conflictRecordCount = Number(group.conflictRecordCount || 0)
  let recognizedAmountText = formatPurchaseMoney(group.recognizedAmount)
  if (includedRecordCount === 0 && conflictRecordCount > 0) recognizedAmountText = '待核对'
  else if (includedRecordCount === 0 && unresolvedAmountCount > 0) recognizedAmountText = '待形成'
  return Object.assign({}, group, {
    sourceType,
    sourceText: group.sourceTypeText || SOURCE_TEXT[sourceType] || '来源待核对',
    includedRecordCount,
    unresolvedAmountCount,
    conflictRecordCount,
    recognizedAmountText,
    contractValid: includedRecordCount === 0 || present(group.recognizedAmount)
  })
}

export function normalizePurchaseAmount(raw) {
  const source = raw || {}
  const includedRecordCount = Number(source.includedRecordCount || 0)
  const unresolvedAmountCount = Number(source.unresolvedAmountCount || 0)
  const historicalBillUnresolvedCount = Number(source.historicalBillUnresolvedCount || 0)
  const historicalDateFallbackCount = Number(source.historicalDateFallbackCount || 0)
  const pendingDemandCount = Number(source.pendingDemandCount || 0)
  const conflictRecordCount = Number(source.conflictRecordCount || 0)
  const undatedRecordCount = Number(source.undatedRecordCount || 0)
  const state = amountState(source.amountState, includedRecordCount, unresolvedAmountCount, conflictRecordCount)
  const recognizedAmount = source.recognizedAmount
  let amountText = formatPurchaseMoney(recognizedAmount)
  let stateText = ''

  if (state === 'NO_RECORD') {
    amountText = '—'
    stateText = conflictRecordCount > 0
      ? '本期没有可计入金额的采购记录'
      : '本期暂无采购记录'
  } else if (state === 'ALL_UNRESOLVED') {
    amountText = '待形成'
    stateText = '本期采购记录的金额尚未形成'
  } else if (state === 'ALL_CONFLICT' || state === 'ALL_ISSUES') {
    amountText = '—'
    stateText = '本期没有可计入金额的采购记录'
  } else if (state === 'PARTIAL' || state === 'PARTIAL_CONFLICT' || state === 'PARTIAL_ISSUES') {
    stateText = '已识别金额合计'
  } else {
    stateText = includedRecordCount + '条商品级采购记录'
  }

  const groups = (source.groups || []).map(normalizeGroup).sort((left, right) =>
    (SOURCE_ORDER[left.sourceType] || 99) - (SOURCE_ORDER[right.sourceType] || 99))
  const knownStates = ['NO_RECORDS', 'ALL_AMOUNT_UNRESOLVED', 'ALL_SOURCE_CONFLICT',
    'ALL_UNRESOLVED_OR_CONFLICT', 'PARTIAL_AMOUNT_UNRESOLVED', 'PARTIAL_SOURCE_CONFLICT',
    'PARTIAL_DATA_ISSUES', 'AVAILABLE']
  const contractValid = knownStates.indexOf(String(source.amountState || '').toUpperCase()) >= 0 &&
    Array.isArray(source.groups) && groups.every(group => group.contractValid) &&
    (includedRecordCount === 0 || present(source.recognizedAmount))

  return Object.assign({}, source, {
    amountState: state,
    amountText,
    stateText,
    includedRecordCount,
    unresolvedAmountCount,
    historicalBillUnresolvedCount,
    historicalDateFallbackCount,
    pendingDemandCount,
    conflictRecordCount,
    undatedRecordCount,
    historicalDateFallbackAmountText: formatPurchaseMoney(source.historicalDateFallbackAmount),
    historicalBillIssueAmountText: formatPurchaseMoney(source.historicalBillUnresolvedAmount),
    historicalBillIssueAmountKnown: present(source.historicalBillUnresolvedAmount),
    groups,
    hasAnyRecord: includedRecordCount > 0 || unresolvedAmountCount > 0 || conflictRecordCount > 0,
    hasRecognizedAmount: state === 'RECOGNIZED' || state === 'PARTIAL' ||
      state === 'PARTIAL_CONFLICT' || state === 'PARTIAL_ISSUES',
    contractValid
  })
}

function formatQuantity(value, unit) {
  if (!present(value)) return '—'
  return String(value) + (unit || '')
}

function normalizeInclusionStatus(raw) {
  const value = String(raw || '').toUpperCase()
  if (value === 'INCLUDED') return { text: '已计入', cssClass: 'included' }
  if (value === 'UNRESOLVED') {
    return { text: '金额尚未形成', cssClass: 'unresolved' }
  }
  if (value === 'CONFLICT') return { text: '来源信息冲突，未计入', cssClass: 'conflict' }
  return { text: '未计入', cssClass: 'excluded' }
}

function sourceQuantityLabel(sourceType, suppliedLabel) {
  if (suppliedLabel) return suppliedLabel
  if (sourceType === 'INTERNAL_COLLABORATION') return '供货数量'
  if (sourceType === 'SELF_PURCHASE') return '采购数量'
  return '来源数量'
}

export function normalizePurchaseRecord(item, index) {
  const source = item || {}
  const sourceType = source.sourceType || ''
  const inclusionStatus = source.included === true ? 'INCLUDED' : (source.amountStatus || '')
  const inclusion = normalizeInclusionStatus(inclusionStatus)
  const orderedQuantity = source.orderedQuantity
  const sourceQuantity = source.actualQuantity
  const sourceSubtotal = source.amount
  const historicalDateFallback = source.historicalDateFallback === true || source.dateBasis === 'LEGACY_ORDER_APPLY_DATE'
  const purchaseSupplierRefId = source.purchaseSupplierRefId
  let actionText = ''
  let actionType = ''
  if (sourceType === 'INTERNAL_COLLABORATION' && purchaseSupplierRefId) {
    actionText = '查看供应方采购记录'
    actionType = 'SUPPLIER'
  } else if (sourceType === 'EXTERNAL_DPB' && source.externalBatchId) {
    actionText = '查看采购批次'
    actionType = 'BATCH'
  }

  return Object.assign({}, source, {
    _key: source.recordKey,
    contractValid: present(source.recordKey),
    sourceType,
    sourceTypeText: source.sourceTypeText || SOURCE_TEXT[sourceType] || '来源待核对',
    sourceClass: SOURCE_ORDER[sourceType] || 99,
    supplierDisplayName: source.supplierName ||
      (sourceType === 'SELF_PURCHASE' ? '自采' : '供应方名称待核对'),
    purposeText: PURPOSE_TEXT[source.purchasePurpose] || '用途待核对',
    goodsDisplayName: source.goodsName || '商品名称待核对',
    businessDateText: source.businessDate || '业务日期待核对',
    historicalDateFallback,
    orderedQuantityText: formatQuantity(orderedQuantity, source.orderedUnit),
    sourceQuantityText: formatQuantity(sourceQuantity, source.actualUnit),
    sourceQuantityLabel: sourceQuantityLabel(sourceType, source.actualQuantityMeaningText),
    unitPriceText: formatPurchaseMoney(source.unitPrice),
    sourceSubtotalText: formatPurchaseMoney(sourceSubtotal),
    inclusionText: source.included === true ? '已计入本期采购金额' : (source.amountStatusText || inclusion.text),
    inclusionClass: inclusion.cssClass,
    businessStatusText: source.businessStatusText || '',
    issueText: source.amountStatus === 'UNRESOLVED'
      ? '来源小计尚未形成'
      : (source.amountStatus === 'CONFLICT' ? '来源归属存在冲突' : ''),
    amountBasisText: source.amountBasisText || '',
    purchaseSupplierRefId,
    actionText,
    actionType,
    sourceExpanded: false
  })
}

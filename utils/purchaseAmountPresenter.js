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

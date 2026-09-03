export const CUSTOMER_GOODS_AMOUNT_GROUPS = [
  { key: 'core', title: '核心商品', range: '累计贡献前 70%', tone: 'green' },
  { key: 'important', title: '重要商品', range: '累计贡献 70%–90%', tone: 'blue' },
  { key: 'general', title: '一般商品', range: '其余订货额', tone: 'orange' },
  { key: 'noAmount', title: '无订货额', range: '当前范围暂无有效金额', tone: 'light' }
]

export const CUSTOMER_GOODS_AMOUNT_WINDOWS = [
  { key: '30', label: '近30天', field: 'orderAmount30Days', quantityField: 'averageOrderQuantity30Days' },
  { key: '90', label: '近90天', field: 'orderAmount90Days', quantityField: 'averageOrderQuantity90Days' },
  { key: '365', label: '近一年', field: 'orderAmount365Days', quantityField: 'averageOrderQuantity365Days' },
  { key: 'all', label: '全部', field: 'orderAmountAll', quantityField: 'averageOrderQuantityAll' }
]

function positiveNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : 0
}

/**
 * 以商品开始贡献前的累计占比划分 70%/90% 档位。
 * 搜索只过滤结果，不应拿搜索子集重新计算档位。
 */
export function buildCustomerGoodsAmountRows(goods, field) {
  const rows = (goods || []).map(item => Object.assign({}, item, {
    amountValue: positiveNumber(item && item[field])
  })).sort((left, right) => {
    if (left.amountValue !== right.amountValue) return right.amountValue - left.amountValue
    const leftLast = left.lastOrderDays === null ? Number.MAX_SAFE_INTEGER : left.lastOrderDays
    const rightLast = right.lastOrderDays === null ? Number.MAX_SAFE_INTEGER : right.lastOrderDays
    if (leftLast !== rightLast) return leftLast - rightLast
    return String(left.goodsName || '').localeCompare(String(right.goodsName || ''), 'zh-CN')
  })

  const totalAmount = rows.reduce((sum, item) => sum + item.amountValue, 0)
  let cumulative = 0
  return rows.map(item => {
    if (item.amountValue <= 0 || totalAmount <= 0) {
      return Object.assign({}, item, { amountShare: 0, amountKey: 'noAmount' })
    }
    const cumulativeBefore = cumulative / totalAmount
    const amountKey = cumulativeBefore < 0.7
      ? 'core'
      : (cumulativeBefore < 0.9 ? 'important' : 'general')
    cumulative += item.amountValue
    return Object.assign({}, item, {
      amountShare: item.amountValue / totalAmount * 100,
      amountKey
    })
  })
}

export function summarizeCustomerGoodsAmountRows(rows) {
  const source = rows || []
  return {
    totalAmount: source.reduce((sum, item) => sum + positiveNumber(item.amountValue), 0),
    core: source.filter(item => item.amountKey === 'core').length,
    withAmount: source.filter(item => positiveNumber(item.amountValue) > 0).length
  }
}

export function resolveCustomerGoodsAverageQuantity(item, viewMode, amountWindow) {
  const quantityField = viewMode === 'amount' && amountWindow
    ? amountWindow.quantityField
    : 'averageOrderQuantity90Days'
  const value = positiveNumber(item && item[quantityField])
  return {
    value: value > 0 ? value : null,
    unit: String((item && (item.averageOrderQuantityUnit || item.spec)) || '').trim()
  }
}

function number(value) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function formatDecimal(value, digits = 2) {
  const fixed = number(value).toFixed(digits)
    .replace(/\.0+$/, '')
    .replace(/(\.\d*[1-9])0+$/, '$1')
  return fixed.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

export function formatMoney(value) {
  return '¥' + formatDecimal(value, 2)
}

export function formatQuantities(values, empty = '暂无有效数量') {
  if (!Array.isArray(values) || !values.length) return empty
  return values.map(item => formatDecimal(item.quantity, 4) + (item.unit || '')).join(' · ')
}

export function formatAveragePrices(values, empty = '暂无有效均价') {
  if (!Array.isArray(values) || !values.length) return empty
  return values.map(item => formatMoney(item.price) + '/' + (item.unit || '单位')).join(' · ')
}

export function percentageLabel(value) {
  return formatDecimal(value, 2) + '%'
}

export function decorateRelativeBars(rows) {
  const source = Array.isArray(rows) ? rows : []
  const max = source.reduce((value, row) => Math.max(value, number(row.salesAmount)), 0)
  return source.map(row => Object.assign({}, row, {
    barWidth: max > 0 ? Math.max(4, Math.round(number(row.salesAmount) / max * 100)) : 0
  }))
}

function iso(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return year + '-' + month + '-' + day
}

export function rangeForDays(days, now = new Date()) {
  const size = Math.max(1, Number(days) || 30)
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const start = new Date(end)
  start.setDate(start.getDate() - size + 1)
  return { startDate: iso(start), endDate: iso(end) }
}

export function validateSalesRange(range) {
  const start = new Date((range && range.startDate ? range.startDate : '') + 'T00:00:00')
  const end = new Date((range && range.endDate ? range.endDate : '') + 'T00:00:00')
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '请选择完整日期'
  if (start.getTime() > end.getTime()) return '开始日期不能晚于结束日期'
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  return days > 90 ? '单次统计范围不能超过90天' : ''
}

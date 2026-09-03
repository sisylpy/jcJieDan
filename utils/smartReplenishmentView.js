const LEVELS = Object.freeze({
  LEVEL_A: Object.freeze({ letter: 'A', label: '直接备货', className: 'level-a' }),
  LEVEL_B: Object.freeze({ letter: 'B', label: '联系确认', className: 'level-b' })
})

function numeric(value) {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function cleanText(value) {
  const text = String(value === null || value === undefined ? '' : value).trim()
  return text && text !== 'null' && text !== 'undefined' && text !== '-1' ? text : ''
}

function goodsImageUrl(goods, imageBaseUrl) {
  const source = cleanText(
    goods.nxDgGoodsFileLarge || goods.nxDgGoodsFile ||
    goods.nxDgNxFatherImg || goods.nxGoodsFileBig || goods.nxGoodsFile ||
    goods.goodsFileLarge || goods.goodsFile
  )
  if (!source) return '/images/photozhaoxiang.png'
  if (/^(https?:)?\/\//i.test(source) || source.startsWith('data:')) return source
  const base = cleanText(imageBaseUrl)
  if (!base) return source
  return base.replace(/\/+$/, '') + '/' + source.replace(/^\/+/, '')
}

function iso(date) {
  return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0')
}

function parseIso(value) {
  const parts = String(value || '').split('-').map(Number)
  if (parts.length !== 3 || parts.some(item => !Number.isFinite(item))) return null
  const date = new Date(parts[0], parts[1] - 1, parts[2])
  return Number.isNaN(date.getTime()) ? null : date
}

export function addForecastDays(value, days) {
  const date = parseIso(value)
  if (!date) return ''
  date.setDate(date.getDate() + Number(days || 0))
  return iso(date)
}

export function forecastRangeForMode(mode, baseDate) {
  const base = cleanText(baseDate)
  if (mode === 'TOMORROW') {
    const tomorrow = addForecastDays(base, 1)
    return { startDate: tomorrow, endDate: tomorrow }
  }
  if (mode === 'NEXT_7') {
    return { startDate: base, endDate: addForecastDays(base, 6) }
  }
  return { startDate: base, endDate: base }
}

export function validateForecastRange(range, minimumDate, maximumDate) {
  const start = parseIso(range && range.startDate)
  const end = parseIso(range && range.endDate)
  const minimum = parseIso(minimumDate)
  const maximum = parseIso(maximumDate)
  if (!start || !end) return '请选择完整的备货日期'
  if (start.getTime() > end.getTime()) return '开始日期不能晚于结束日期'
  if (minimum && start.getTime() < minimum.getTime()) return '备货日期不能早于服务器今天'
  if (maximum && end.getTime() > maximum.getTime()) return '所选日期超过服务器可预测范围'
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1
  return days > 31 ? '单次最多查看31天，请缩短日期范围' : ''
}

export function formatSmartNumber(value, digits = 2) {
  const parsed = numeric(value)
  if (parsed === null) return '—'
  const text = parsed.toFixed(digits)
    .replace(/\.0+$/, '')
    .replace(/(\.\d*[1-9])0+$/, '$1')
  return text.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

function shortDate(value) {
  const parts = String(value || '').split('-')
  return parts.length === 3 ? Number(parts[1]) + '月' + Number(parts[2]) + '日' : String(value || '')
}

function reasonText(value) {
  return cleanText(value)
    .replace(/^相对拟合样本，/, '')
    .replace(/，形成正向模型证据$/, '')
    .replace(/，形成负向条件贡献$/, '')
}

function detailText(goods, item) {
  const brand = cleanText(goods.nxDgGoodsBrand || goods.goodsBrand)
  const detail = cleanText(goods.nxDgGoodsDetail || goods.goodsDetail)
  const weight = cleanText(goods.nxDgGoodsStandardWeight || goods.goodsStandardWeight)
  const standard = cleanText(goods.nxDgGoodsStandardname || goods.goodsStandardName)
  const parts = []
  ;[brand, detail].forEach(value => {
    if (value && value !== item.goodsName && !parts.includes(value)) parts.push(value)
  })
  if (weight && standard) parts.push(weight + '/' + standard)
  else if (weight) parts.push(weight)
  else if (standard && standard !== (item.predictedUnit || item.unit)) parts.push(standard)
  return parts.join(' · ')
}

function dateForecastText(forecasts, fallbackQuantity, fallbackUnit) {
  const rows = Array.isArray(forecasts) ? forecasts : []
  if (rows.length) {
    return rows.map(item => shortDate(item.date) + ' ' + formatSmartNumber(item.quantity) +
      (item.unit || fallbackUnit || '')).join('、')
  }
  return '预估 ' + formatSmartNumber(fallbackQuantity) + (fallbackUnit || '')
}

function departmentLines(item, run) {
  const departments = Array.isArray(item.departmentForecasts) ? item.departmentForecasts : []
  if (departments.length) {
    return departments.map((department, index) => ({
      key: String(department.departmentId || index) + '-' + String(department.unit || ''),
      departmentName: department.departmentName || '客户' + (index + 1),
      forecastText: dateForecastText(
        department.dateForecasts,
        department.predictedQuantity,
        department.unit || item.predictedUnit || item.unit
      )
    }))
  }
  return [{
    key: 'summary',
    departmentName: item.departmentName || run.departmentName || '当前客户',
    forecastText: dateForecastText(
      item.dateForecasts,
      item.predictedQuantity,
      item.predictedUnit || item.unit
    )
  }]
}

export function decorateProcurementContext(context, predictedUnit) {
  if (!context) {
    return {
      state: 'loading', stockText: '查询中', stockUnit: predictedUnit || '',
      purchaseText: '查询中', canCreate: false
    }
  }
  if (context.loading) {
    return {
      state: 'loading', stockText: '查询中', stockUnit: predictedUnit || '',
      purchaseText: '查询中', canCreate: false
    }
  }
  if (context.error) {
    return {
      state: 'unknown', stockText: '未知', stockUnit: '',
      purchaseText: '状态未知', canCreate: false
    }
  }
  const activeCount = Math.max(0, Number(context.activePurchaseCount || 0))
  return {
    state: activeCount > 0 ? 'active' : 'idle',
    stockText: formatSmartNumber(context.stockQuantity),
    stockUnit: context.stockUnit || predictedUnit || '',
    purchaseText: activeCount > 0 ? '采购中' + (activeCount > 1 ? ' · ' + activeCount + '笔' : '') : '暂无采购',
    canCreate: activeCount === 0,
    activePurchaseCount: activeCount
  }
}

export function decorateSmartProducts(run, goodsDetails, contexts, imageBaseUrl) {
  const details = goodsDetails || {}
  const contextMap = contexts || {}
  return (run && Array.isArray(run.items) ? run.items : [])
    .map(item => {
      const level = item && item.policy ? item.policy.level : item.policyLevel
      const meta = LEVELS[level]
      if (!meta) return null
      const goodsId = Number(item.goodsId)
      const goods = details[goodsId] || {}
      const unit = item.predictedUnit || item.unit || '—'
      const categoryName = cleanText(item.goodsCategoryName || item.categoryName || item.fatherGoodsName) || '未分类'
      const categoryId = item.goodsCategoryId || item.categoryId || item.fatherGoodsId || categoryName
      const trust = numeric(item.policy && item.policy.trustScorePercent !== undefined
        ? item.policy.trustScorePercent : item.policyTrustPercent)
      const supporting = item.policy && item.policy.supportingReasons
        ? item.policy.supportingReasons : item.supportingReasons
      const risks = item.policy && item.policy.riskReasons ? item.policy.riskReasons : item.riskReasons
      const quantity = numeric(item.predictedQuantity)
      const context = decorateProcurementContext(contextMap[goodsId], unit)
      context.canCreate = context.canCreate && quantity !== null && quantity > 0 && Boolean(cleanText(unit))
      return {
        key: String(goodsId) + '::' + unit,
        goodsId,
        goodsName: item.goodsName || '未命名商品',
        imageUrl: goodsImageUrl(goods, imageBaseUrl),
        detailText: detailText(goods, item),
        categoryKey: 'CAT_' + categoryId,
        categoryName,
        level,
        levelLetter: meta.letter,
        levelLabel: meta.label,
        levelClass: meta.className,
        trustValue: trust,
        trustText: trust === null ? '—' : formatSmartNumber(trust) + '%',
        predictedQuantity: quantity,
        predictedQuantityText: formatSmartNumber(item.predictedQuantity),
        predictedUnit: unit,
        departmentLines: departmentLines(item, run || {}),
        reasons: (Array.isArray(supporting) ? supporting : []).map(reasonText).filter(Boolean).slice(0, 4),
        riskReasons: (Array.isArray(risks) ? risks : []).map(reasonText).filter(Boolean).slice(0, 3),
        quantityMethod: cleanText(item.quantityMethod),
        context,
        expanded: false,
        creating: false
      }
    })
    .filter(Boolean)
    .sort((left, right) => {
      if (left.level !== right.level) return left.level === 'LEVEL_A' ? -1 : 1
      return (right.trustValue || 0) - (left.trustValue || 0) ||
        left.goodsName.localeCompare(right.goodsName, 'zh-CN')
    })
}

export function buildSmartCategories(products) {
  const map = new Map()
  ;(Array.isArray(products) ? products : []).forEach(product => {
    const current = map.get(product.categoryKey) || {
      key: product.categoryKey,
      name: product.categoryName,
      count: 0
    }
    current.count += 1
    map.set(product.categoryKey, current)
  })
  return Array.from(map.values()).sort((left, right) =>
    right.count - left.count || left.name.localeCompare(right.name, 'zh-CN'))
}

export function applySmartProductFilters(products, options) {
  const settings = options || {}
  const keyword = cleanText(settings.keyword).toLocaleLowerCase('zh-CN')
  return (Array.isArray(products) ? products : []).filter(product => {
    if (settings.level && product.level !== settings.level) return false
    if (settings.category && product.categoryKey !== settings.category) return false
    if (!keyword) return true
    return [product.goodsName, product.detailText, product.categoryName]
      .some(value => String(value || '').toLocaleLowerCase('zh-CN').includes(keyword))
  })
}

export function smartSummary(products) {
  const source = Array.isArray(products) ? products : []
  return {
    total: source.length,
    levelA: source.filter(item => item.level === 'LEVEL_A').length,
    levelB: source.filter(item => item.level === 'LEVEL_B').length
  }
}

export default {
  addForecastDays,
  forecastRangeForMode,
  validateForecastRange,
  formatSmartNumber,
  decorateProcurementContext,
  decorateSmartProducts,
  buildSmartCategories,
  applySmartProductFilters,
  smartSummary
}

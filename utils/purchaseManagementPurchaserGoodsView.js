import { resolveGoodsImage } from './goodsImageView.js'

const SOURCE_OPTIONS = [
  { value: 'ALL', label: '全部来源' },
  { value: 'EXTERNAL_DPB', label: '外部供应' },
  { value: 'SELF_PURCHASE', label: '自采' }
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

function decimalText(value) {
  const parsed = number(value)
  if (parsed === null) return ''
  return String(Number(parsed.toFixed(6)))
}

function moneyText(value) {
  const amount = number(value)
  if (amount === null) return '金额待形成'
  const fixed = amount.toFixed(2)
  return '¥' + fixed.replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
}

function selectedValue(options, index) {
  const selected = options[Number(index) || 0]
  return selected ? selected.value : 'ALL'
}

function purchasedGoodsItem(item, serverBase) {
  const unit = clean(item.unit) || clean(item.specification)
  const quantity = decimalText(item.quantity)
  const price = number(item.unitPrice)
  const quantityText = quantity ? quantity + unit : '数量待核对'
  const priceText = price === null ? '' : '¥' + decimalText(price) + (unit ? '/' + unit : '')
  return {
    key: clean(item.recordKey) || 'GOODS:' + clean(item.purchaseGoodsId),
    purchaseGoodsId: item.purchaseGoodsId,
    purchaserUserId: item.purchaserUserId,
    purchaserName: clean(item.purchaserName) || '采购员待核对',
    title: clean(item.goodsName) || '商品名称待核对',
    category: clean(item.categoryName) || '未分类',
    imageUrl: resolveGoodsImage({ goodsFile: item.goodsImage }, serverBase),
    businessDate: clean(item.businessDate) || '日期待核对',
    sourceKey: clean(item.sourceType),
    sourceText: clean(item.sourceText) || '采购来源待核对',
    supplierText: clean(item.supplierName) || (clean(item.sourceType) === 'SELF_PURCHASE' ? '采购员自采' : '供应商待核对'),
    purposeText: clean(item.purchasePurposeText) || '采购用途待核对',
    completionText: clean(item.completionText) || '采购完成',
    quantityPriceText: priceText ? quantityText + ' × ' + priceText : quantityText,
    amount: number(item.amount),
    amountText: moneyText(item.amount),
    amountStatus: clean(item.amountStatus)
  }
}

function compareGoods(sortValue) {
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

export function purchaserGoodsInitialState() {
  return {
    activeGoodsCategory: 'ALL',
    goodsCategories: [{ key: 'ALL', name: '全部商品', count: 0 }],
    goodsItems: [],
    goodsSourceOptions: SOURCE_OPTIONS,
    goodsSourceIndex: 0,
    goodsSortOptions: SORT_OPTIONS,
    goodsSortIndex: 0
  }
}

export function buildPurchaserGoodsView(items, viewState, serverBase) {
  const state = Object.assign({}, purchaserGoodsInitialState(), viewState || {})
  const source = selectedValue(SOURCE_OPTIONS, state.goodsSourceIndex)
  const sort = selectedValue(SORT_OPTIONS, state.goodsSortIndex)
  const goods = (items || []).map(item => purchasedGoodsItem(item, serverBase))
    .filter(item => source === 'ALL' || item.sourceKey === source)
  const counts = {}
  goods.forEach(item => { counts[item.category] = (counts[item.category] || 0) + 1 })
  const categories = [{ key: 'ALL', name: '全部商品', count: goods.length }]
    .concat(Object.keys(counts).sort((left, right) => counts[right] - counts[left] || left.localeCompare(right))
      .map(name => ({ key: name, name, count: counts[name] })))
  const categoryExists = categories.some(category => category.key === state.activeGoodsCategory)
  const activeCategory = categoryExists ? state.activeGoodsCategory : 'ALL'
  const visible = goods.filter(item => activeCategory === 'ALL' || item.category === activeCategory)
    .sort(compareGoods(sort))
  return {
    activeGoodsCategory: activeCategory,
    goodsCategories: categories,
    goodsItems: visible
  }
}

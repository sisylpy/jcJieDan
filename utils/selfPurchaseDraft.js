const STORAGE_KEY = 'bossSelfPurchaseDraft'
const MAX_AGE_MS = 5 * 60 * 1000

function idOf(item) {
  const value = item && item.nxDistributerPurchaseGoodsId
  if (value === null || value === undefined || value === '') return ''
  return String(value)
}

function sameId(left, right) {
  if (left === null || left === undefined || right === null || right === undefined) return false
  return String(left) === String(right)
}

function intersectCurrent(selected, currentGoods) {
  const currentById = {}
  ;(currentGoods || []).forEach(item => {
    const id = idOf(item)
    if (id) currentById[id] = item
  })

  const seen = {}
  return (selected || []).reduce((result, item) => {
    const id = idOf(item)
    if (!id || seen[id] || !currentById[id]) return result
    seen[id] = true
    result.push(currentById[id])
    return result
  }, [])
}

function create(goods, distributerId, createdAt) {
  return {
    version: 1,
    distributerId,
    createdAt: createdAt === undefined ? Date.now() : createdAt,
    goods: intersectCurrent(goods, goods)
  }
}

function consume(value, distributerId, now) {
  if (!value || Array.isArray(value) || value.version !== 1 || !Array.isArray(value.goods)) return []
  if (!sameId(value.distributerId, distributerId)) return []

  const currentTime = now === undefined ? Date.now() : Number(now)
  const createdAt = Number(value.createdAt)
  if (!Number.isFinite(createdAt) || createdAt > currentTime + 30000 || currentTime - createdAt > MAX_AGE_MS) {
    return []
  }
  return intersectCurrent(value.goods, value.goods)
}

module.exports = {
  STORAGE_KEY,
  MAX_AGE_MS,
  create,
  consume,
  intersectCurrent
}

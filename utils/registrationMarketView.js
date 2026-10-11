const OUTSIDE_MARKET_NAME = '不在市场'
const OUTSIDE_MARKET_ALIASES = new Set(['不在市场', '不在批发市场'])

export function buildRegistrationMarketOptions(markets) {
  const result = [{
    sysCityMarketId: 0,
    sysCmMarketName: OUTSIDE_MARKET_NAME
  }]
  const seenIds = new Set(['0'])
  const seenNames = new Set([OUTSIDE_MARKET_NAME])

  ;(Array.isArray(markets) ? markets : []).forEach(item => {
    if (!item) return

    const id = Number(item.sysCityMarketId)
    const name = normalizeMarketName(item.sysCmMarketName)
    if (!name || id <= 0 || OUTSIDE_MARKET_ALIASES.has(name)) return

    const idKey = String(item.sysCityMarketId)
    if (seenIds.has(idKey) || seenNames.has(name)) return

    seenIds.add(idKey)
    seenNames.add(name)
    result.push(Object.assign({}, item, { sysCmMarketName: name }))
  })

  return result
}

function normalizeMarketName(value) {
  return String(value === null || value === undefined ? '' : value).trim()
}

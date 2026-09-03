function clean(value) {
  const text = String(value === null || value === undefined ? '' : value).trim()
  return text && text !== 'null' && text !== 'undefined' && text !== '-1' ? text : ''
}

export function resolveGoodsImage(goods, serverBase) {
  const item = goods || {}
  const candidates = [
    item.nxDgGoodsFileLarge, item.nxDgGoodsFile, item.nxDgNxFatherImg,
    item.nxGoodsFileBig, item.nxGoodsFile, item.goodsFileLarge, item.goodsFile
  ].map(clean).filter(Boolean)
  const source = candidates.find(path => !/^(?:\/)?goodsImage\/logo\.jpg$/i.test(path))
  if (!source) return '/images/photozhaoxiang.png'
  if (/^(https?:)?\/\//i.test(source) || source.startsWith('data:')) return source
  const base = clean(serverBase)
  return base
    ? base.replace(/\/+$/, '') + '/' + source.replace(/^\/+/, '')
    : source
}

export function goodsSpecification(goods) {
  const item = goods || {}
  const brand = clean(item.nxDgGoodsBrand)
  const detail = clean(item.nxDgGoodsDetail)
  const weight = clean(item.nxDgGoodsStandardWeight)
  const standard = clean(item.nxDgGoodsStandardname)
  const cartonUnit = clean(item.nxDgCartonUnit)
  const pieces = Number(item.nxDgItemsPerCarton || 0)
  const values = []
  ;[brand, detail].forEach(value => {
    if (value && !values.includes(value)) values.push(value)
  })
  if (weight && standard) values.push(weight + '/' + standard)
  else if (weight) values.push(weight)
  else if (standard) values.push(standard)
  if (cartonUnit && pieces > 0) values.push('大包装 ' + pieces + standard + '/' + cartonUnit)
  return values.join(' · ') || '暂无规格说明'
}

export function decorateGoodsVisual(goods, serverBase) {
  return Object.assign({}, goods || {}, {
    goodsImageUrl: resolveGoodsImage(goods, serverBase),
    goodsSpecificationText: goodsSpecification(goods)
  })
}

export default {
  resolveGoodsImage,
  goodsSpecification,
  decorateGoodsVisual
}

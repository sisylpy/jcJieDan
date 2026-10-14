import { disGetPartnerBindingList } from './apiDistributer'

/**
 * 商品列表/搜索的供货方展示与去重。
 *
 * 规则：
 * - 本方商品若已固定绑定到伙伴的具体商品（nx_distributer_partner_goods_binding），
 *   该伙伴商品不再单独列出，只在本方商品名后显示「X供货」；
 * - 未绑定的伙伴商品保留，仍可用于临时协作订货；
 * - 只按绑定关系判断，不按商品名称去重，不删除任何商品记录；
 * - 普通 supplier 沿用原 nxJrdhSupplierEntity，不与 offerNx 协作伙伴混用。
 */

var cachedBindings = null

export function loadPartnerBindings(disId) {
  if (cachedBindings && cachedBindings.disId === disId) {
    return Promise.resolve(cachedBindings)
  }
  return new Promise(function (resolve) {
    disGetPartnerBindingList(disId).then(function (res) {
      var body = (res && res.result) ? res.result : {}
      var ok = body.code == 0
      cachedBindings = {
        disId: disId,
        bindings: ok ? (body.data || []) : [],
        names: ok ? (body.partnerNames || {}) : {}
      }
      resolve(cachedBindings)
    }).catch(function () {
      cachedBindings = { disId: disId, bindings: [], names: {} }
      resolve(cachedBindings)
    })
  })
}

export function decorateSupplierLabels(list, disId, bindings, names) {
  var partnerGoodsToOwn = {};
  var ownBinding = {};
  (bindings || []).forEach(function (b) {
    if (!b) return;
    if (b.disGoodsId != null) {
      ownBinding[String(b.disGoodsId)] = {
        partnerDisId: b.partnerDistributerId,
        name: names[String(b.partnerDistributerId)] || ''
      };
    }
    if (b.partnerDisGoodsId != null && b.disGoodsId != null) {
      partnerGoodsToOwn[String(b.partnerDisGoodsId)] = b.disGoodsId;
    }
  });

  var ownIdInResult = {};
  (list || []).forEach(function (g) {
    if (g && String(g.nxDgDistributerId) === String(disId)) {
      ownIdInResult[String(g.nxDistributerGoodsId)] = true;
    }
  });

  var result = [];
  (list || []).forEach(function (g) {
    if (!g) return;
    var gid = String(g.nxDistributerGoodsId);
    var isOwn = String(g.nxDgDistributerId) === String(disId);
    if (!isOwn) {
      var ownId = partnerGoodsToOwn[gid];
      if (ownId != null && ownIdInResult[String(ownId)]) return;
      g._supplyLabel = '';
      result.push(g);
      return;
    }
    var bind = ownBinding[gid];
    if (bind && bind.name) {
      var goodsName = g.nxDgGoodsName || '';
      // 历史商品名若已带 [李] 前缀，避免重复出现两个标签（不修改数据库商品名）
      g._supplyLabel = goodsName.indexOf('[' + bind.name + ']') >= 0 ? '' : (bind.name + '供货');
    } else if (g.nxJrdhSupplierEntity) {
      var sname = g.nxJrdhSupplierEntity.nxJrdhsSupplierName
        || (g.nxJrdhSupplierEntity.jrdhUserEntity && g.nxJrdhSupplierEntity.jrdhUserEntity.nxJrdhWxNickName)
        || '';
      g._supplyLabel = sname ? ('普通供货商:' + sname) : '普通供货商';
    } else {
      g._supplyLabel = '';
    }
    result.push(g);
  });
  return result;
}

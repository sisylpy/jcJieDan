/**
 * Phase 2b：平台订单展示字段归一化（配送商小程序）
 */

function isPlatformFlag(v) {
  return v === 1 || v === '1' || v === true;
}

function isPlatformOrder(order) {
  if (!order) return false;
  if (isPlatformFlag(order.isPlatformOrder)) return true;
  return order.orderSource === 'PLATFORM';
}

function pickField(obj) {
  var keys = Array.prototype.slice.call(arguments, 1);
  for (var i = 0; i < keys.length; i++) {
    var v = obj[keys[i]];
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
}

function formatPrice(v) {
  if (v === null || v === undefined || v === '' || v === '0.1') return '-';
  return v;
}

function formatPriceDiff(v) {
  if (v === null || v === undefined || v === '') return '-';
  var n = parseFloat(v);
  if (isNaN(n)) return v;
  if (n > 0) return '+' + v;
  return v;
}

function formatQty(n) {
  if (!n) return '0';
  if (Math.abs(n - Math.round(n)) < 0.0001) return String(Math.round(n));
  return String(n);
}

function parseQty(v) {
  if (v === null || v === undefined || v === '') return 0;
  var n = parseFloat(v);
  return isNaN(n) ? 0 : n;
}

function sortOrders(orders) {
  if (!orders || orders.length < 2) return;
  orders.sort(function (a, b) {
    var sa = a.platformSort != null ? a.platformSort : (isPlatformOrder(a) ? 0 : 1);
    var sb = b.platformSort != null ? b.platformSort : (isPlatformOrder(b) ? 0 : 1);
    if (sa !== sb) return sa - sb;
    var fa = a.nxDoDepartmentFatherId || 0;
    var fb = b.nxDoDepartmentFatherId || 0;
    if (fa !== fb) return fa - fb;
    return (a.nxDepartmentOrdersId || 0) - (b.nxDepartmentOrdersId || 0);
  });
}

function normalizeOrder(order) {
  if (!order) return order;
  var platform = isPlatformOrder(order);
  order.isPlatformOrder = platform ? 1 : 0;
  if (platform) {
    order.platformLabel = order.platformLabel || '平台';
  }
  order.expectPrice = pickField(order, 'expectPrice', 'nxDoExpectPrice');
  order.actualPrice = pickField(order, 'actualPrice', 'nxDoPrice');
  order.priceDifferent = pickField(order, 'priceDifferent', 'nxDoPriceDifferent');
  if (order.priceEditable === undefined || order.priceEditable === null) {
    order.priceEditable = platform ? 1 : 0;
  }
  order._displayExpectPrice = formatPrice(order.expectPrice);
  order._displayActualPrice = formatPrice(order.actualPrice);
  order._displayPriceDiff = formatPriceDiff(order.priceDifferent);
  if (order.purSelected === undefined || order.purSelected === null) {
    order.purSelected = false;
  }
  if (order.hasChoice === undefined || order.hasChoice === null) {
    order.hasChoice = false;
  }
  return order;
}

function processGoodsItem(goods) {
  if (!goods) return goods;
  if (goods.nxDepartmentOrdersEntities && Array.isArray(goods.nxDepartmentOrdersEntities)) {
    goods.nxDepartmentOrdersEntities = goods.nxDepartmentOrdersEntities.map(normalizeOrder);
    sortOrders(goods.nxDepartmentOrdersEntities);
  }
  if (goods.isSelected === undefined || goods.isSelected === null) {
    goods.isSelected = false;
  }
  var pq = parseQty(goods.platformQuantity);
  var oq = parseQty(goods.ownQuantity);
  if (pq === 0 && oq === 0 && goods.nxDepartmentOrdersEntities) {
    goods.nxDepartmentOrdersEntities.forEach(function (o) {
      var q = parseQty(o.nxDoQuantity);
      if (isPlatformOrder(o)) pq += q;
      else oq += q;
    });
    goods.platformQuantity = formatQty(pq);
    goods.ownQuantity = formatQty(oq);
  }
  goods._totalQuantity = formatQty(pq + oq);
  goods._hasPlatformQty = pq > 0;
  goods._hasOwnQty = oq > 0;
  return goods;
}

function processGoodsList(list) {
  if (!Array.isArray(list)) return [];
  return list.map(processGoodsItem);
}

function withCustomerRowKeys(items) {
  if (!Array.isArray(items)) return [];
  return items.map(function (item, idx) {
    var depId = item.dep && item.dep.nxDepartmentId;
    if (item.routeGbDepFatherId != null && Number(item.routeGbDepFatherId) > 0) {
      item._rowKey = 'platform-gb-' + item.routeGbDepFatherId;
    } else if (item.routeDepFatherId != null) {
      item._rowKey = 'platform-nx-' + item.routeDepFatherId;
    } else {
      item._rowKey = depId != null ? String(depId) : ('dep-' + idx);
    }
    return item;
  });
}

/** 平台客户跳转 orderPage 时的 depFatherId / gbDepFatherId（见 docs/平台客户订单接口说明.md §4.1） */
function resolvePlatformOrderRouteParams(item) {
  if (!item) {
    return { depFatherId: -1, gbDepFatherId: -1 };
  }
  if (item.customerSource === 'GB') {
    return {
      depFatherId: item.routeDepFatherId != null ? item.routeDepFatherId : -1,
      gbDepFatherId: item.routeGbDepFatherId != null ? item.routeGbDepFatherId : -1,
    };
  }
  if (item.customerSource === 'NX') {
    return {
      depFatherId: item.routeDepFatherId != null ? item.routeDepFatherId : (item.dep && item.dep.nxDepartmentId),
      gbDepFatherId: -1,
    };
  }
  if (item.routeGbDepFatherId != null && Number(item.routeGbDepFatherId) > 0) {
    return {
      depFatherId: item.routeDepFatherId != null ? item.routeDepFatherId : -1,
      gbDepFatherId: item.routeGbDepFatherId,
    };
  }
  return {
    depFatherId: item.routeDepFatherId != null ? item.routeDepFatherId : (item.dep && item.dep.nxDepartmentId),
    gbDepFatherId: -1,
  };
}

function resolvePlatformDisplayName(item) {
  if (!item) return '';
  return item.displayName || item.gbDepartmentName || (item.dep && item.dep.nxDepartmentAttrName) || '';
}

function buildCustomerGroups(platformDep, ownDep, nxDep) {
  var platform = Array.isArray(platformDep) ? platformDep : [];
  var own = Array.isArray(ownDep) ? ownDep : [];
  if (platform.length > 0 || own.length > 0) {
    var sections = [];
    if (platform.length > 0) {
      sections.push({ key: 'platform', title: '平台客户', items: withCustomerRowKeys(platform) });
    }
    if (own.length > 0) {
      sections.push({ key: 'own', title: '我的客户', items: withCustomerRowKeys(own) });
    }
    return { sections: sections, useGrouped: true };
  }
  var flat = Array.isArray(nxDep) ? nxDep : [];
  if (flat.length === 0) {
    return { sections: [], useGrouped: false };
  }
  var p = [];
  var o = [];
  flat.forEach(function (item) {
    var flag = item.isPlatformCustomer;
    if (flag === undefined || flag === null) {
      flag = item.dep && item.dep.isPlatformCustomer;
    }
    if (isPlatformFlag(flag)) p.push(item);
    else o.push(item);
  });
  if (p.length === 0) {
    return { sections: [{ key: 'all', title: '', items: withCustomerRowKeys(flat) }], useGrouped: false };
  }
  var result = [];
  if (p.length > 0) result.push({ key: 'platform', title: '平台客户', items: withCustomerRowKeys(p) });
  if (o.length > 0) result.push({ key: 'own', title: '我的客户', items: withCustomerRowKeys(o) });
  return { sections: result, useGrouped: true };
}

function depSectionHeader(depArr, index) {
  if (!depArr || index < 0 || index >= depArr.length) return '';
  var dep = depArr[index];
  var prev = index > 0 ? depArr[index - 1] : null;
  var isPlatform = isPlatformFlag(dep.isPlatformCustomer);
  var prevPlatform = prev ? isPlatformFlag(prev.isPlatformCustomer) : false;
  if (isPlatform && (index === 0 || !prevPlatform)) return 'platform';
  if (!isPlatform && (index === 0 || prevPlatform)) return 'own';
  return '';
}

module.exports = {
  isPlatformOrder: isPlatformOrder,
  isPlatformFlag: isPlatformFlag,
  normalizeOrder: normalizeOrder,
  processGoodsItem: processGoodsItem,
  processGoodsList: processGoodsList,
  buildCustomerGroups: buildCustomerGroups,
  withCustomerRowKeys: withCustomerRowKeys,
  resolvePlatformOrderRouteParams: resolvePlatformOrderRouteParams,
  resolvePlatformDisplayName: resolvePlatformDisplayName,
  depSectionHeader: depSectionHeader,
  formatPrice: formatPrice,
  formatPriceDiff: formatPriceDiff,
};

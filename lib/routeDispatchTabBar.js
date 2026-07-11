var BASE_TABS = [
  {
    pagePath: 'pages/order/index/index',
    text: '订单',
    iconPath: '/images/icons/icon_orders.png',
    selectedIconPath: '/images/icons/icon_orders_active.png'
  },
  {
    pagePath: 'pages/stock/index/index',
    text: '出货中',
    iconPath: '/images/icons/icon_stock.png',
    selectedIconPath: '/images/icons/icon_stock_active.png'
  },
  {
    pagePath: 'pages/purchase/index/index',
    text: '采购中',
    iconPath: '/images/icons/icon_purchase.png',
    selectedIconPath: '/images/icons/icon_purchase_active.png'
  },
  {
    pagePath: 'pages/doing/index/index',
    text: '协作伙伴',
    iconPath: '/images/icons/hezuowoshou.png',
    selectedIconPath: '/images/icons/hezuowoshou-2.png'
  }
]

var DISPATCH_TAB = {
  pagePath: 'pages/dispatch/index/index',
  text: '配送',
  iconPath: '/images/icons/icon_prepare.png',
  selectedIconPath: '/images/icons/icon_prepare_active.png'
}

function hasRouteDispatch() {
  var disInfo = wx.getStorageSync('disInfo') || {}
  return disInfo.nxDistributerBusinessTypeId > 2
}


function getTabBarList() {
  if (!hasRouteDispatch()) {
    return BASE_TABS.slice()
  }
  var list = BASE_TABS.slice()
  list.splice(2, 0, DISPATCH_TAB)
  return list
}

function getTabIndex(pagePath) {
  var list = getTabBarList()
  for (var i = 0; i < list.length; i++) {
    if (list[i].pagePath === pagePath) {
      return i
    }
  }
  return 0
}

function getBadgeIndices() {
  if (!hasRouteDispatch()) {
    return { stock: 1, purchase: 2, doing: 3 }
  }
  return { stock: 1, purchase: 3, doing: 4 }
}

module.exports = {
  hasRouteDispatch: hasRouteDispatch,
  getTabBarList: getTabBarList,
  getTabIndex: getTabIndex,
  getBadgeIndices: getBadgeIndices,
  DISPATCH_PAGE: DISPATCH_TAB.pagePath
}

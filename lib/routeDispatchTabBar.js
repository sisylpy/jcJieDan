var BASE_TABS = [
  {
    pagePath: 'pages/order/index/index',
    text: '订单',
    iconPath: '/images/icons/icon_orders.png',
    selectedIconPath: '/images/icons/icon_orders_active.png'
  },
  {
    pagePath: 'pages/stock/index/index',
    text: '出货',
    iconPath: '/images/icons/icon_stock.png',
    selectedIconPath: '/images/icons/icon_stock_active.png'
  },
  {
    pagePath: 'pages/purchaseList/index/index',
    text: '备货',
    iconPath: '/images/icons/icon_purchase.png',
    selectedIconPath: '/images/icons/icon_purchase_active.png'
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
  // 出货中、采购中和协作伙伴共用第 2 个底部入口。
  if (pagePath === 'pages/purchase/index/index' || pagePath === 'pages/doing/index/index') {
    pagePath = 'pages/stock/index/index'
  }
  var list = getTabBarList()
  for (var i = 0; i < list.length; i++) {
    if (list[i].pagePath === pagePath) {
      return i
    }
  }
  return 0
}

function getBadgeIndices() {
  return { stock: 1, purchase: 1, doing: 1 }
}

module.exports = {
  hasRouteDispatch: hasRouteDispatch,
  getTabBarList: getTabBarList,
  getTabIndex: getTabIndex,
  getBadgeIndices: getBadgeIndices,
  DISPATCH_PAGE: DISPATCH_TAB.pagePath
}

var tabBar = require('../../../lib/routeDispatchTabBar.js')
var app = getApp()

var tabBarHeight = 50
var viewBarHeight = 50

Page({
  data: {
    innerCurrent: 0,
    panelLoadKey: 1,
    tabs: [
      { name: '分派中' },
      { name: '装车中' },
      { name: '配送中' }
    ],
    tabActive: [true, false, false]
  },

  onLoad: function () {
    if (!tabBar.hasRouteDispatch()) {
      wx.switchTab({ url: '/pages/order/index/index' })
      return
    }
    var globalData = app.globalData
    var rpxRatio = 750 / globalData.screenWidth
    var contentHeight = (globalData.screenHeight - globalData.navBarHeight - tabBarHeight - viewBarHeight) * rpxRatio
    this.setData({
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      viewBarHeight: viewBarHeight * globalData.rpxR,
      contentHeight: contentHeight
    })
  },

  onShow: function () {
    if (!tabBar.hasRouteDispatch()) {
      return
    }
    var tabBarComp = typeof this.getTabBar === 'function' && this.getTabBar()
    if (tabBarComp) {
      if (typeof tabBarComp.refreshTabs === 'function') {
        tabBarComp.refreshTabs()
      }
      tabBarComp.setData({
        selected: tabBar.getTabIndex(tabBar.DISPATCH_PAGE)
      })
    }
    // 首次进入已由 panelLoadKey 初始值触发子面板加载，避免 onShow 再 bump 一次
    if (this._dispatchShownOnce) {
      this.bumpPanelLoad()
    } else {
      this._dispatchShownOnce = true
      this.syncActivePanel()
    }
  },

  bumpPanelLoad: function () {
    var current = this.data.innerCurrent
    this.setData({
      tabActive: [
        current === 0,
        current === 1,
        current === 2
      ],
      panelLoadKey: Date.now()
    })
  },

  syncActivePanel: function () {
    var current = this.data.innerCurrent
    this.setData({
      tabActive: [
        current === 0,
        current === 1,
        current === 2
      ]
    })
  },

  onTabClick: function (e) {
    var current = e.currentTarget.dataset.current
    if (current === this.data.innerCurrent) {
      return
    }
    this._swiperChangeFromTab = true
    this.setData({
      innerCurrent: current
    }, this.bumpPanelLoad.bind(this))
  },

  onSwiperChange: function (e) {
    if (this._swiperChangeFromTab) {
      this._swiperChangeFromTab = false
      return
    }
    var current = e.detail.current
    if (current === this.data.innerCurrent) {
      return
    }
    this.setData({
      innerCurrent: current
    }, this.bumpPanelLoad.bind(this))
  }
})

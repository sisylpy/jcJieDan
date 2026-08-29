var tabBar = require('../../../lib/routeDispatchTabBar.js')
var app = getApp()

import apiUrl from '../../../config.js'

var tabBarHeight = 50
var viewBarHeight = 50

Page({
  data: {
    innerCurrent: 0,
    panelLoadKey: 1,
    url: '',
    userInfo: null,
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
    this.setData({
      url: apiUrl.server,
      userInfo: wx.getStorageSync('userInfo') || null
    })
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
  },

  onSwitchLoading: function () {
    if (this.data.innerCurrent === 1) {
      this.bumpPanelLoad()
      return
    }
    this._swiperChangeFromTab = true
    this.setData({
      innerCurrent: 1
    }, this.bumpPanelLoad.bind(this))
  },

  onPullDownRefresh: function () {
    var panelIds = ['sandbox-panel', 'loading-panel', 'delivery-panel']
    var panelId = panelIds[this.data.innerCurrent] || panelIds[0]
    var panel = this.selectComponent('#' + panelId)
    if (panel && typeof panel.loadPage === 'function') {
      panel.loadPage(true)
      return
    }
    wx.stopPullDownRefresh()
  },

  onNavButtonTap: function () {
    var userInfo = this.data.userInfo || {}
    if (userInfo.nxDiuAdmin == 0) {
      wx.navigateTo({
        url: '../../../subPackage/pages/management/homePage/homePage'
      })
      return
    }
    wx.showModal({
      title: '没有权限',
      content: '请首位注册的用户进入"账号管理",为您开通管理员权限',
      showCancel: false
    })
  }
})

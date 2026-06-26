var tabBar = require('../lib/routeDispatchTabBar.js')

Component({
  data: {
    selected: 0,
    showTabBar: true,
    list: tabBar.getTabBarList(),
    badgeIndices: tabBar.getBadgeIndices(),
    stockCount: 0,
    puringCount: 0,
    collCount: 0
  },
  lifetimes: {
    attached: function () {
      this.refreshTabs()
    }
  },
  methods: {
    refreshTabs: function () {
      this.setData({
        list: tabBar.getTabBarList(),
        badgeIndices: tabBar.getBadgeIndices()
      })
    },
    switchTab(e) {
      wx.removeStorageSync('toDetail');
      wx.removeStorageSync('sons');
      wx.removeStorageSync('depFatherId');
      wx.removeStorageSync('greatGrandFatherId');
      wx.removeStorageSync('grandFatherId');
      wx.removeStorageSync('disGoods');
      wx.removeStorageSync('fatherGoods');
      wx.removeStorageSync('weightItem');
      wx.removeStorageSync('showType');
      wx.removeStorageSync('toOrderWx');
      wx.removeStorageSync('notUpdate');
      
      const data = e.currentTarget.dataset;
      const url = '/' + data.path;
      wx.switchTab({ url });
      this.setData({
        selected: data.index
      });
    }
  }
});

const globalData = getApp().globalData;

Page({

  data: {
    disId: 0,
    currentTab: 0,
    swiperHeight: 0,
    navBarHeight: 0,
  },

  onLoad: function (options) {
    let disId = options.disId;
    if (!disId) {
      const value = wx.getStorageSync('userInfo');
      if (value && value.nxDistributerEntity) {
        disId = value.nxDistributerEntity.nxDistributerId;
      }
    }
    const tabBarHeight = 90;
    const navBarHeight = globalData.navBarHeight * globalData.rpxR;
    this.setData({
      disId: disId,
      navBarHeight: navBarHeight,
      swiperHeight: globalData.windowHeight * globalData.rpxR - navBarHeight - tabBarHeight,
    });
  },

  switchTab(e) {
    this.setData({ currentTab: Number(e.currentTarget.dataset.index) });
  },

  onSwiperChange(e) {
    this.setData({ currentTab: e.detail.current });
  },

  toBack() {
    wx.navigateBack({ delta: 1 });
  },

})

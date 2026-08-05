const globalData = getApp().globalData;

Page({

  data: {
    disId: 0,
    contentHeight: 0,
  },

  onLoad: function (options) {
    let disId = options.disId;
    if (!disId) {
      const value = wx.getStorageSync('userInfo');
      if (value && value.nxDistributerEntity) {
        disId = value.nxDistributerEntity.nxDistributerId;
      }
    }
    this.setData({
      disId: disId,
      contentHeight: globalData.windowHeight * globalData.rpxR - globalData.navBarHeight * globalData.rpxR,
    });
  },

  toBack() {
    wx.navigateBack({ delta: 1 });
  },

})

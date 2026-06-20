Page({
  data: {},
  onLoad(options) {
    const app = getApp();
    const globalData = app.globalData;
    this.setData({
      
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      navBarHeightRpx: globalData.navBarHeight * globalData.rpxR,
    
    });
  },
  toBack(){
    wx.navigateBack()
  }
})

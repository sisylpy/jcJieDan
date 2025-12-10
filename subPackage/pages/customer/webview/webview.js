import apiUrl from '../../../../config.js'

Page({
  onLoad(options) {

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      url: apiUrl.server,
    })


    this.setData({ pdfUrl: decodeURIComponent(options.pdfUrl) });
  }
});
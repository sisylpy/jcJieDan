var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config.js'



Page({

  /**
   * 页面的初始数据
   */
  data: {
    update: false,
    bottomHeight: 300,
    formHeight: 590,
    headerHeight: 80,
    isTishi: false,
    lastInput: true,
    focusIndex: -1,
    isSellRegiste: false,
    helpWeight: 0,
    buyUser: false

  },


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const app = getApp();
    const globalData = app.globalData;

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,

    })

    var batchValue = wx.getStorageSync('batch');
      if(batchValue){
        this.setData({
          batch: batchValue,
          batchStatus: batchValue.nxDpbStatus
        })
      }
  },


  toTxsIndexReceive(){
    wx.redirectTo({
      url: '../index/index?receive=1',
    })
  },
  
  toBack() {
    wx.navigateBack({
      delta: 1,
    })  
  }




})
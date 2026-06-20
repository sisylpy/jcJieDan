var load = require('../../../../lib/load.js');

import {
  getDisPurchaseGoodsBatchGb
} from '../../../../lib/apiDistributer'


Page({

  /**
   * 页面的初始数据
   */
  data: {


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
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      batchId: options.batchId
    })

   
  
    this._getInitData()
  },

  
  _getInitData(){
    load.showLoading("获取进货商铺")
     
    getDisPurchaseGoodsBatchGb(this.data.batchId)
    .then(res => {
      this.setData({
        batch: res.result.data,
      })
      load.hideLoading();
      console.log(res.result.data)
     
    })
  },


  
  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  },







})
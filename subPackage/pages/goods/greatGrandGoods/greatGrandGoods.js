// pages/goodsDetail/goodsDetail.js

var app = getApp();

import {
  getLevelOneGoods,
} from '../../../../lib/apiDistributer'

import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');


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
    const globalData = app.globalData;

   

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      url: apiUrl.server,
      disId: options.disId,
      type: options.type,
      id: options.id,
      supplierId: options.supplierId
    })

    this._getInitData();

  },


  _getInitData(e) {
 
    getLevelOneGoods(this.data.disId)
      .then(res => {
        if (res.result.code == 0) {
          this.setData({
            greatGrandArr: res.result.data,
            
          })
        
        }
      })
  },
  

  // toGrandGoods(e){
  //   console.log(e);
  //   wx.navigateTo({
  //     url: '../grandGoods/grandGoods?fatherId=' + e.currentTarget.dataset.id
  //     +'&fatherName=' + e.currentTarget.dataset.name,
  //   })
  // },

  selectedFatherId1(e){
    var pages = getCurrentPages();
    var prevPage = pages[pages.length - 2]; //上一个页面
    //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
    var fatherIdData = "goods.nxDgDfgGoodsFatherId";
    var fatherColorData = "goods.nxDgNxGoodsFatherColor";
    prevPage.setData({
      [fatherIdData]:  e.currentTarget.dataset.id,
       fatherName: e.currentTarget.dataset.name,
       fatherId: e.currentTarget.dataset.id,
      [fatherColorData]: e.currentTarget.dataset.color,
       update: true
    })
    wx.navigateBack({
      delta: 1,
    })
  },

  selectedFatherId(e){
   wx.navigateTo({
     url: '../grandGoods/grandGoods?fatherId=' + e.currentTarget.dataset.id+'&type=' + this.data.type
     + '&id=' +  this.data.supplierId,
   })
  },

  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  }





})
// pages/goodsDetail/goodsDetail.js

var app = getApp();

import {
  getFatherGoods,
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

    var disInfoValue = wx.getStorageSync('disInfo');
    this.setData({
      disInfo: disInfoValue,
    })

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      url: apiUrl.server,
      fatherId: options.fatherId,
      fatherName: options.fatherName,
      type: options.type,
      id: options.id,
    })

    var goodsSetType = wx.getStorageSync('goodsSetType');
    if(goodsSetType){
      this.setData({
        goodsSetType: goodsSetType
      })
    }
    
    this._getInitData();

  },


  _getInitData(e) {
 
    getFatherGoods(this.data.fatherId)
      .then(res => {
        if (res.result.code == 0) {
          this.setData({
            greatGrandArr: res.result.data,
            
          })
        
        }
      })
  },
  

  // toFatherGoods(e){
  //   console.log(e);
  //   wx.navigateTo({
  //     url: '../fatherGoods/fatherGoods?fatherId=' + e.currentTarget.dataset.id
  //     +'&fatherName=' + e.currentTarget.dataset.name,
  //   })
  // },

  toGoodsList(e){
    console.log(e);
    if(this.data.type == 'add'){
      wx.navigateTo({
        url: '../goodsList/goodsList?fatherId=' + e.currentTarget.dataset.id
        +'&fatherName=' + e.currentTarget.dataset.name ,
      })
    }else{
      wx.navigateTo({
        url: '../goodsListExchange/goodsListExchange?fatherId=' + e.currentTarget.dataset.id
        +'&fatherName=' + e.currentTarget.dataset.name + "&type=" + this.data.type + '&id=' + this.data.id,
      })
    }
  },
  

  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  }





})
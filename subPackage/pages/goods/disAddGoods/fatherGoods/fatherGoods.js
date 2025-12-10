
var app = getApp();

import {
  getFatherGoods,
} from '../../../../../lib/apiDistributer'

import apiUrl from '../../../../../config.js'
var load = require('../../../../../lib/load.js');


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
      type: options.type,
      fatherId: options.fatherId,
      fatherName: options.fatherName,
    })

    var exchangeItem = wx.getStorageSync('exchangeItem');
    if(exchangeItem){
      this.setData({
        exchangeItem : exchangeItem,
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
  


  addThisGoodsBefore(e){
    var pages = getCurrentPages();
    var prevPage = pages[pages.length - 3]; //上一个页面
    //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
    var fatherIdData = "goods.nxDgDfgGoodsGrandId";
    var fatherColorData = "goods.nxDgNxGoodsFatherColor";
    var fatherSortData = "goods.nxDgGoodsSort";
    var nameData = "fatherName";

    var sort = Number(e.currentTarget.dataset.sort);
    prevPage.setData({
      [fatherIdData]:  e.currentTarget.dataset.id,
      [fatherColorData]: e.currentTarget.dataset.color,
      [fatherSortData]: sort,
      [nameData]: e.currentTarget.dataset.name,
      canSave: true
    })

    wx.navigateBack({
      delta: 2,
    })
  },




  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  },

  




})
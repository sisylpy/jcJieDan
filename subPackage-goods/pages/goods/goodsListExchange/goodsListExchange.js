var app = getApp();

import {
  disGetNxDisGoodsListByFatherId,
  exchangeNewGoodsDis,
  queryDisExchangeGoodsByQuickSearch
}
from '../../../../lib/apiDistributer'


import apiUrl from '../../../../config.js'

var load = require('../../../../lib/load.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    // winHeight: "",//窗口高度
    currentTab: 0, //预设当前项的值
    scrollLeft: 0, //tab标题的滚动条位置
    fatherId: null,
    hide: false,
    scrollTop: 0,
    choiceAll: false,

  },

 
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const globalData = app.globalData;

   
    var value = wx.getStorageSync('userInfo');
    if (value) {

      this.setData({
        disId: value.nxDistributerEntity.nxDistributerId,
        userInfo: value
      })
    }

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      url: apiUrl.server,
      fatherId: options.fatherId,
      name: options.name
     
    })

    var exchangeItem = wx.getStorageSync('exchangeItem');
    if(exchangeItem){
      this.setData({
        exchangeItem : exchangeItem,
      })
    }
    
    this._getInitData();
  },


  _getInitData(){


    var data = {
      fatherId: this.data.fatherId,
      disId: this.data.disId
    }
    disGetNxDisGoodsListByFatherId(data).then(res =>{
      if(res.result.code == 0){
        this.setData({
          goodsList: res.result.data,
        })
      }
    })    
  },

  


  getSearchString(e) {
    if (e.detail.value.length > 0) {
      this.setData({
        searchStr: e.detail.value
      })
      this._searchGoods();

    }

  },

  _searchGoods(e) {
    var data = {
      disId: this.data.disId,
      searchStr: e.detail.value,
      fatherId: this.data.fatherId
    }
    load.showLoading("商品搜索中")
    queryDisExchangeGoodsByQuickSearch(data).then(res => {
      load.hideLoading();
      console.log(res.result.data);
      if (res.result.code == 0) {
       
        this.setData({
          goodsList: res.result.data
        })

      }
    })

  },



  choiceExchange(e){
    console.log(e)
    var data = {
      changeId:  this.data.exchangeItem.nxDistributerGoodsId,
      toGoodsId:  e.currentTarget.dataset.id,
    }
    exchangeNewGoodsDis(data).then(res =>{
      if(res.result.code == 0){
        var pages = getCurrentPages();
        var prevPage = pages[pages.length - 4]; //上一个页面
        //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
        prevPage.setData({  
          update: true,
        })
        var prevPageF = pages[pages.length - 4]; //上一个页面
        //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
        prevPageF.setData({  
          isFirstLoad: true,
        })
        wx.navigateBack({
          delta: 3
        })
        wx.removeStorageSync('exchangeItem')
      }
    })
  },


  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  }



})
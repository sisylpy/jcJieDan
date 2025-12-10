var app = getApp();

import {
  disGetDisGoodsListByFatherId,
  saveSupplierGoods
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
      supplierId: options.supplierId,
      ids: [],
    

    })

    var supplier = wx.getStorageSync('supplierItem');
    if(supplier){
      this.setData({
        supplierItem : supplier,
        supplierId: supplier.nxJrdhSupplierId
      })
    }
    
    this._getInitData();
  },


  _getInitData(){


    var data = {
      fatherId: this.data.fatherId,
      disId: this.data.disId
    }
    disGetDisGoodsListByFatherId(data).then(res =>{
      if(res.result.code == 0){
        this.setData({
          goodsList: res.result.data,
        })
      }
    })
    
  },

  choiceGoods(e){
    console.log(e);
    var id = e.currentTarget.dataset.id;
    var ids = this.data.ids;
    if(ids.includes(id)){
      ids = ids.filter(item => item !== id);
      console.log(ids);
      this.setData({
        ids: ids,
      })
    }else{
      ids.push(id);
      this.setData({
        ids: ids,
      })
      console.log(ids);
    }
  },

  choiceAll(){
    var choiceAll = this.data.choiceAll;
    if(choiceAll){
      this.setData({
        choiceAll: false,
      })
      var goodsList = this.data.goodsList;
      for(var i =0; i < goodsList.length; i++){
        var data = "goodsList["+ i +"].nxDgSupplierId";
        this.setData({
          [data]: null,
        }) 
      }
      this.setData({
        ids: [],
      })

    }else{
      this.setData({
        choiceAll: false,
      })
      var goodsList = this.data.goodsList;
      var temp = [];
      for(var i =0; i < goodsList.length; i++){
        var data = "goodsList["+ i +"].nxDgSupplierId";
        this.setData({
          [data]: this.data.supplierId,
        })
        var id = this.data.goodsList[i].nxDistributerGoodsId;
        temp.push(id);
      }
      this.setData({
        ids: temp,
      })
    }
  },

  saveGoods(){

    var data = {
      ids: this.data.ids,
      supplierId: this.data.supplierId,
    }
    saveSupplierGoods(data).then(res =>{
      if(res.result.code == 0){
        wx.navigateBack({
          delta: 1
        })
      }
    })
  },

  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  }



})
var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config.js'

import {
  nxDisGetAllSuppliers,
  
} from '../../../../lib/apiDepOrder'

import {
  disGoodsUpdate,
  

} from '../../../../lib/apiDistributer'



Page({

  onShow(){
    if(this.data.update){
      this._initData();
    }
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
        statusBarHeight: globalData.statusBarHeight  * globalData.rpxR,
        disId: options.disId,
        url: apiUrl.server,

    })

    var userInfo = wx.getStorageSync('userInfo');
    if(userInfo){
      this.setData({
        userInfo: userInfo,
        userId: userInfo.nxDistributerUserId,
        disId: userInfo.nxDiuDistributerId
      })
    }

    var goodsItem = wx.getStorageSync('goodsItem');
    if(goodsItem){
      this.setData({
        goodsItem: goodsItem
      })
    }

    this._initData();
    
   
  },

  _initData(){
    var data ={
      nxDisId: this.data.disId,
      userId: -1
    }
    nxDisGetAllSuppliers(data).then(res => {
      load.showLoading("获取供货商")
      if (res.result.code == 0) {
        load.hideLoading();
        this.setData({
          supplierArr: res.result.data,
        })
      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },

  addSupplier(e){
    wx.navigateTo({
      url: '../addSupplier/addSupplier?fatherId=' + e.currentTarget.dataset.id
       + '&name=' + e.currentTarget.dataset.name + '&disId=' + this.data.disId,
    })
  },


  toMyJinridinghuo(e) {
    var that  = this;
    console.log('disId=' + this.data.disId+'&nxDisPurUserId=' + this.data.userId)
    wx.navigateToMiniProgram({
      appId: 'wx1ea78d3f33234284',
      path: 'pages/jinriListWithLogin/jinriListWithLogin?nxDisId=' + this.data.disId
      +'&nxDisPurUserId=' + this.data.userId + '&commId=-1&commPurUserId=-1&gbDisId=-1&gbDepId=-1&gbDepUserId=-1' ,
      envVersion: 'release', //release  develop  trial
      success(res) {
        
      },
    })
  },


  choiceSupplier(e) {
    var supplierItem = e.currentTarget.dataset.item;
    console.log(e);
     var goodsItem = wx.getStorageSync('goodsItem');
     goodsItem.nxDgSupplierId = supplierItem.nxJrdhSupplierId;
     goodsItem.nxDgPurchaseAuto = 1;
     disGoodsUpdate(goodsItem).then(res =>{
      if(res.result.code == 0){
        var pages = getCurrentPages();
        var prevPage = pages[pages.length - 2]; //上一个页面
        prevPage.setData({
          update: true
        })

        wx.navigateBack({
          delta: 1,
        })
      }
    })
  
    
  },



  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  },

})
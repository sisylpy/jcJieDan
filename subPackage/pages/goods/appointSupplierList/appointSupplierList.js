var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config.js'


import {
  disGoodsUpdate,
  nxDisGetAllSuppliers,

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
        navBarHeight: globalData.navBarHeight  * globalData.rpxR,
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

  toExternalSupplierInvitation(e) {
    const supplier = e.currentTarget.dataset.item || {}
    const relationId = Number(supplier.nxJrdhSupplierId)
    if (!relationId) return wx.showToast({ title: '外部供应商关系无效', icon: 'none' })
    const supplierName = supplier.nxJrdhsSupplierName || ''
    wx.navigateTo({
      url: '/subPackage/pages/management/purchaseManagement/supplierCollaboration/supplierCollaboration?openInvite=1&supplierRelationId=' + relationId + '&supplierName=' + encodeURIComponent(supplierName)
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

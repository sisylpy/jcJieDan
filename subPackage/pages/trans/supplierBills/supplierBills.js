var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil');

import apiUrl from '../../../../config.js'
import {
  disGetGbSupplierBillsWithStatus,


} from '../../../../lib/apiDistributer'




Page({


  onShow(){
    var supplierItem = wx.getStorageSync('supplierItem');
    if (supplierItem) {
      this.setData({
        supplier: supplierItem,
        supplierId: supplierItem.nxJrdhSupplierId,
        supplierName: supplierItem.nxJrdhsSupplierName,
      })
    }
    var myDate = wx.getStorageSync('myDate');
    if(myDate){
      this.setData({
        startDate: myDate.startDate,
        stopDate: myDate.stopDate,
        dateType: myDate.dateType,
      })
    }

    this._initData();
  },

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
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      dateType: 'month',
      startDate: dateUtils.getFirstDateInMonth(),
      stopDate: dateUtils.getArriveDate(0),
      status: 1,
      equalSatus: -1
      
    })
    var userInfoValue = wx.getStorageSync('userInfo');
    if (userInfoValue) {
      this.setData({
        userInfo: userInfoValue
      })
    }

  },

  _initData() {
    load.showLoading("获取账单")
    var data = {
      status: this.data.status,
      supplierId: this.data.supplierId,
      startDate: this.data.startDate,
      stopDate: this.data.stopDate
    }
    disGetGbSupplierBillsWithStatus(data).then(res => {
      console.log(res.result.data)
      if (res.result.code == 0) {
        load.hideLoading();
        this.setData({
          billArr: res.result.data.arr,
          totalSettle: res.result.data.total,
        })
      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
        this.setData({
          applyArr: []
        })
      }
    })
  },


  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },

  
  openBatchDetail(e) {
    wx.navigateTo({
      url: '../myPurchaseDetail/myPurchaseDetail?batchId=' + e.currentTarget.dataset.id,
    })
  },


  toSettle(){
    wx.navigateTo({
      url: '../settlePageGb/settlePageGb?supplierId=' + this.data.supplierId + '&disId=' +this.data.supplier.nxJrdhsGbDistributerId,
    })
  },


  toDatePage(){
    wx.navigateTo({
      url: '../../sel/date/date?dateType=' + this.data.dateType + '&startDate='
       + this.data.startDate + '&stopDate=' + this.data.stopDate, 
    })
  },


 onUnload(){
   wx.removeStorageSync('myDate');
 }















})
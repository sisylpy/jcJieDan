
import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');

import {
disGetUnPayAccountBillsGb,
settleDepBills,
} from '../../../../lib/apiDepOrder'

//
Page({

  /**
   * 页面的初始数据
   */
  data: {
    selAmount: 0,
    total: 0,
    selectArr: [],
    isTishi: false,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const app = getApp();
    const globalData = app.globalData;

    var value = wx.getStorageSync('userInfo');
    if (value) {

      this.setData({
        disId: value.nxDistributerEntity.nxDistributerId,
        userInfo: value,
      })
    }
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      url: apiUrl.server,
    })
    this._getAccountBills();
  },


  _getAccountBills() {
    load.showLoading("获取未结账账单")
  disGetUnPayAccountBillsGb(this.data.disId).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        this.setData({
          accountBillArr: res.result.data,
        })
      }else{
        this.setData({
          accountBillArr: []
        })
      }
    })
  },

//subPackage/pages/customer/issuePageGb/issuePageGb


toOpenGbBill(e){
  console.log(e);
    wx.navigateTo({
      url: '../issuePageGb/issuePageGb?billId=' +  e.currentTarget.dataset.item.nxDepartmentBillId 
      + '&depFatherId=' + e.currentTarget.dataset.item.nxDbGbDepFatherId
    })
  },
  


  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  }






})
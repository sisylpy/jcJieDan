
import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');

import {
disGetUnPayAccountBills,
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
  disGetUnPayAccountBills(this.data.disId).then(res => {
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



  selectBill(e) {
    var index = e.currentTarget.dataset.index;
    var isSelect = e.detail.value;
    var itemBill = this.data.accountBillArr[index];
    var selectArr = this.data.selectArr;

    if (isSelect) {
      console.log(isSelect)
      console.log("tureetuutututututuut")
      console.log(itemBill.nxDepartmentBillId)
      selectArr.push(itemBill);
      this.setData({
        selectArr: selectArr
      })
    } else {
      console.log(isSelect)
      console.log("fallssllslslsleekeke")
      console.log(itemBill.nxDepartmentBillId)
      selectArr.splice(selectArr.findIndex(item => item.nxDepartmentBillId === itemBill.nxDepartmentBillId), 1);
      this.setData({
        selectArr: selectArr
      })
    }
    this._countTotal();
  },

  _countTotal() {
    var selectArr = this.data.selectArr;
    var temp = 0;
    for (var i = 0; i < selectArr.length; i++) {
      var itemTotal = Number(selectArr[i].nxDbTotal);
      console.log(selectArr[i]);
      console.log(Number(selectArr[i].nxDbTotal));
      temp = temp + itemTotal;
      console.log(temp);
    }
    this.setData({
      total: temp.toFixed(1),
      selAmount: selectArr.length
    })
  },

  settleBills() {
    this.setData({
      isTishi: true,
    })
  },

  cancleSettle() {
    this.setData({
      isTishi: false,
      selAmount: 0,
      total: 0,
      selectArr: []
    })
    this._getAccountBills();
  },

  settleAccount() {
    settleDepBills(this.data.selectArr).then(res => {
      this.setData({
        isTishi: false,
        selAmount: 0,
      })
      if (res.result.code == 0) {
        console.log(res);
        wx.showToast({
          title: '结账成功',
        })
        this._getAccountBills();
      }
    })
  },



  openAccountBill(e){
    var depInfo = e.currentTarget.dataset.item.nxDepartmentEntity;
    wx.navigateTo({
      url: '../issuePage/issuePage?billId=' +  e.currentTarget.dataset.item.nxDepartmentBillId
      + '&depName=' + depInfo.nxDepartmentName + '&depFatherId='
      + depInfo.nxDepartmentId + '&depHasSubs=' + depInfo.nxDepartmentSubAmount,
    })
  },
  


  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  }






})
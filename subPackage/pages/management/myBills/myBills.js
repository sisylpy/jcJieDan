var load = require('../../../../lib/load.js');

import {
  disUserGetPurchaserDateBill,
} from '../../../../lib/apiDistributer'

var dateUtils = require('../../../../utils/dateUtil')


Page({

  /**
   * 页面的初始数据
   */
  data: {
   showType: 1

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
      userId: options.userId,
      stopDate: dateUtils.getArriveDate(0),

    })

  
    this._initListData();
  },


  showCalender(e) {
    this.setData({
      showOperation: true,
    })
  },

  dayClick(e) {
    console.log(e)
    var year = e.detail.year;
    var month = e.detail.month;
    if (month < 10) {
      month = "0" + month
    }
    var day = e.detail.day;
    if (day < 10) {
      day = "0" + day
    }
    var date = year + "-" + month + "-" + day;
    this.setData({
      stopDate: date
    })
    this.setData({
      showOperation: false
    })
    this._initListData();
  },

  _initListData() {
        load.showLoading("获取数据中")
    var data = {
      date: this.data.stopDate ,
      userId: this.data.userId,
    }
    disUserGetPurchaserDateBill(data)
      .then(res => {
        load.hideLoading();
        console.log(res.result.data);
        this.setData({
          total: res.result.data.total,
          maileTotal: res.result.data.maileTotal,
          batchBillTotal: res.result.data.batchBillTotal,
          batchCashTotal: res.result.data.batchCashTotal,
          maileArr: res.result.data.maileArr,
          batchCashArr: res.result.data.batchCashArr,
          batchBillArr: res.result.data.batchBillArr,
        })
       
      })
  },
  changeShow(e){
    this.setData({
      showType: e.currentTarget.dataset.type
    })
  },
  
  hideMask(){
    this.setData({
      showOperation: false,
     
    })
  },
  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },
















})
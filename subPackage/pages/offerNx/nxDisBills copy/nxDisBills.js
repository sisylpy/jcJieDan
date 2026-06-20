const globalData = getApp().globalData;
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil');

import apiUrl from '../../../../config.js'
import {
  disGetNxDistributerBillsWithStatus,


} from '../../../../lib/apiDistributer'




Page({


  onShow(){
    var collItem = wx.getStorageSync('collItem');
    if (collItem) {
      this.setData({
        collItem: collItem,
      })
    }
   

    if(this.data.update){
      var myDate = wx.getStorageSync('myDate');
      if(myDate){
       // 如果是自定义日期，传递具体的开始和结束日期
       var dateRange;
       if (myDate.name === 'custom') {
         dateRange = dateUtils.getDateRange(myDate.name, myDate.startDate, myDate.stopDate);
       } else {
         dateRange = dateUtils.getDateRange(myDate.name);
       }
       this.setData({
         startDate: dateRange.startDate,
         stopDate: dateRange.stopDate,
         dateType: myDate.dateType,
         hanzi: myDate.hanzi || dateRange.name,
         update: false,
       })
  
      }
      
      this._initData();
     }

  },

  /**
   * 页面的初始数据
   */
  data: {
    searchType: "offer",
    collCount: 0,
    billArr: [],
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      type: options.type,
      collNxDisId: options.collNxDisId,
      value: options.value,
      
    })

    var myDate = wx.getStorageSync('myDate');
    if(myDate){
      // 如果是自定义日期，传递具体的开始和结束日期
      var dateRange;
      if (myDate.name === 'custom') {
        dateRange = dateUtils.getDateRange(myDate.name, myDate.startDate, myDate.stopDate);
      } else {
        dateRange = dateUtils.getDateRange(myDate.name);
      }
      
    
      this.setData({
        startDate: dateRange.startDate,
        stopDate: dateRange.stopDate,
        dateType: myDate.dateType,
        hanzi: myDate.hanzi || dateRange.name,
      })
    }else{
      this.setData({
        dateType: 'month',
        startDate: dateUtils.getFirstDateInMonth(),
        stopDate: dateUtils.getArriveDate(0),
        hanzi:  "本月",
      })
    }
    var userInfoValue = wx.getStorageSync('userInfo');
    if (userInfoValue) {
      this.setData({
        userInfo: userInfoValue,
        disId: userInfoValue.nxDiuDistributerId,
      })
    }
    this.getOfferBills();
  },

  getOfferBills() {
    this._fetchBills('offer');
  },

  getOrderBills() {
    this._fetchBills('buy');
  },

  _fetchBills(searchType) {
    load.showLoading("获取账单");
    this.setData({ searchType });
    // 供货订单: 我方供货 → orderDisId=对方 offerDisId=我方
    // 我购买: 我方订货 → orderDisId=我方 offerDisId=对方
    const data = {
      type: this.data.type,
      orderDisId: searchType === 'offer' ? this.data.collNxDisId : this.data.disId,
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      offerDisId: searchType === 'offer' ? this.data.disId : this.data.collNxDisId
    };
    disGetNxDistributerBillsWithStatus(data).then(res => {
      if (res.result.code == 0) {
        load.hideLoading();
        this.setData({
          billArr: res.result.data || [],
          collCount: res.result.collCount || 0,
        });
      } else {
        load.hideLoading();
        wx.showToast({ title: res.result.msg, icon: 'none' });
        this.setData({ billArr: [] });
      }
    }).catch(() => {
      load.hideLoading();
      this.setData({ billArr: [] });
    });
  },

  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },

  
  openBatchDetail(e) {
    var nxDisBill = e.currentTarget.dataset.item;
    wx.setStorageSync('batchItem', nxDisBill);
    wx.navigateTo({
      url: '../nxDisBillDetail/nxDisBillDetail?billId=' + e.currentTarget.dataset.id
       +'&collNxDisId=' + nxDisBill.nxDbdOrderDisId + '&total=' + e.currentTarget.dataset.value,
    })
  },


  toSettle(){
    wx.navigateTo({
      url: '../settleAccount/settleAccount?supplierId=' + this.data.supplierId,
    })
  },


  toDatePage(){
    this.setData({
      update: true,
    })
    wx.navigateTo({
      url: '../../sel/date/date?dateType=' + this.data.dateType + '&startDate='
       + this.data.startDate + '&stopDate=' + this.data.stopDate, 
    })
  },


 onUnload(){
   
 }















})
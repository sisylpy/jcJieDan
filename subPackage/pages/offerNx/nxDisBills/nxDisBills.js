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
      
      this._fetchBills('offer');
      this.setData({ buyBillArr: [], buyCollCount: 0 });
     }

  },

  /**
   * 页面的初始数据
   */
  data: {
    searchType: "offer",
    swiperCurrent: 0,
    offerBillArr: [],
    buyBillArr: [],
    buyCollCount: 0,  // 进货单数量，来自 offer 接口的 collCount
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

    // 优先使用上一页传入的日期（与 offerNxDistributerList 保持一致）
    if (options.startDate && options.stopDate) {
      this.setData({
        startDate: options.startDate,
        stopDate: options.stopDate,
        dateType: options.dateType || 'month',
        hanzi: options.hanzi ? decodeURIComponent(options.hanzi) : '自定义',
      });
    } else {
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
    this.setData({ swiperCurrent: 0, searchType: 'offer' });
    this._fetchBills('offer');
  },

  switchToOffer() {
    this.setData({ swiperCurrent: 0, searchType: 'offer' });
  },

  switchToBuy() {
    this.setData({ swiperCurrent: 1, searchType: 'buy' });
    if (this.data.buyBillArr.length === 0) this._fetchBills('buy');
  },

  onBillTypeChange(e) {
    const index = e.detail.current;
    this.setData({ swiperCurrent: index, searchType: index === 0 ? 'offer' : 'buy' });
  },

  onBillTypeAnimationFinish(e) {
    const index = e.detail.current;
    if (index === 1 && this.data.buyBillArr.length === 0) {
      this._fetchBills('buy');
    }
  },

  _fetchBills(searchType) {
    load.showLoading("获取账单");
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
        const arr = res.result.data || [];
        const collCount = res.result.collCount || 0;
        if (searchType === 'offer') {
          this.setData({ offerBillArr: arr, buyCollCount: collCount });
        } else {
          this.setData({ buyBillArr: arr });
        }
      } else {
        load.hideLoading();
        wx.showToast({ title: res.result.msg, icon: 'none' });
        this.setData(searchType === 'offer' ? { offerBillArr: [] } : { buyBillArr: [] });
      }
    })
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


var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil');
import apiUrl from '../../../../config.js'

var app = getApp()

import {
  saveCollationoBill,
  getCollectionDisDepOrdersFinish
} from '../../../../lib/apiDepOrder'


Page({

  /**
   * 页面的初始数据
   */
  data: {
  
    hide: false,
    scrollTop: 0,
    scrollViewTop: 0,

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
        userInfo: value,
        userId: value.nxDistributerUserId,

      })
    }
    var todayDate = dateUtils.getWhichFullDate(0);

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      url: apiUrl.server,
      collDisId: options.coolNxDisId,
      nxDisId: options.disId,
      name: options.name,
      todayDate: todayDate
    })

    this._initData();

  },

  _initData(){
    var data = {
      collDisId: this.data.collDisId,
      nxDisId: this.data.nxDisId
    }
    getCollectionDisDepOrdersFinish(data).then(res =>{
      console.log(res)
      if(res.result.code == 0){
          this.setData({ 
            tradeNo: res.result.data.tradeNo,
            total: res.result.data.total,
            totalHanzi: res.result.data.totalHanzi,
            finishCount: res.result.data.finishCount,
            totalCount: res.result.data.totalCount,
            hasPriceCount: res.result.data.hasPriceCount,
            hasWeightCount: res.result.data.hasWeightCount,
            applyArr: res.result.data.arr,
          })         
     
      }

    })
  },
  

  saveBill() {


      this.setData({
        showPopupSave: true,
        warnContent: "将保存账单?",
        popupType: "saveBillTishi"
      })
  },
  
  closeSaveBill() {
    console.log("closeSaveBillcloseSaveBill")
    this.setData({
      showPopupSave: false,
    })
  },

  confirmSaveBill() {
    load.showLoading("保存订单中");
    var bill = {
      nxDbdTradeNo: this.data.tradeNo,
      nxDbdOfferNxDisId: this.data.disId,
      nxDbdOrderDisId: this.data.collDisId,
      nxDbdTotal: this.data.total,
      nxDbdIssueUserId: this.data.userInfo.nxDistributerUserId,
   
    }

    console.log(bill);
    saveCollationoBill(bill)
      .then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          wx.showToast({
            title: '订单保存成功',
            icon: 'none'
          })
          wx.navigateBack({
            delta: 1
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

 toBack(){
  wx.navigateBack({
    delta: 1,
  })
 },

})
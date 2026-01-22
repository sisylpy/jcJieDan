var app = getApp()
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil')

import apiUrl from '../../../../config.js'
import {
  disGetPayList,
  disPayUser,
  updateDisUser
} from '../../../../lib/apiDistributer'


let itemWidth = 0;
let windowWidth = 0;
Page({


  /**
   * 页面的初始数据
   */
  data: {

    tabs: [
      
      {
        name: "用户",
        amount: "",
        amountOk: "",
      }, {
        name: "流量",
        amount: "",
        amountOk: "",
      }, 
    ],
    sliderOffset: 0,
    sliderOffsets: [],
    sliderLeft: 0,

    swipeIndex: 0,
    currentTab: 0,
    quantity: -1,

  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const globalData = app.globalData;


    var disInfoValue = wx.getStorageSync('disInfo');
    if (disInfoValue) {
      this.setData({
        disInfo: disInfoValue,
        disId: disInfoValue.nxDistributerId,
        subtotal: "1.0"
      })
    }else{
      wx.redirectTo({
        url: '../../../../pages/loginPay/loginPay',
      })
    }

    var userInfo = wx.getStorageSync('userInfo');
    if(userInfo){
      this.setData({
        userInfo: userInfo
      })
    }
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      screenWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      rpxR: globalData.rpxR,
      sysDeviceId: globalData.sysDeviceId,
      url: apiUrl.server,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      type:  options.type,
      startDate: dateUtils.getFirstDateInMonth(),
      stopDate: dateUtils.getArriveDate(0),
    })

   
    this._initData();
  
  },


  _initData(){
    var data = {
      disId: this.data.disId,
    }
   load.showLoading("获取数据中");
    disGetPayList(data).then(res =>{
      load.hideLoading();
      if(res.result.code ==0){
        this.setData({
          payArr: res.result.data,
        })
      }

    })
  },


  toPayPage(){
    wx.navigateTo({
      url: '../payPage/payPage',
    })
  },


  toPay(e){
    var subtotal = e.currentTarget.dataset.item.nxNdpPaySubtotal;
    var payId = e.currentTarget.dataset.item.nxDistributerPayId;
    var that = this;
    var data = {
      payId: payId,
      openId: this.data.userInfo.nxDiuWxOpenId,
      subtotal: subtotal,
    }
   
    disPayUser(data)
      .then(res => {
        if (res.result.code == 0) {
          console.log(res)
          var map = res.result.map;
       
          wx.requestPayment({
            nonceStr: map.nonceStr,
            package: map.package,
            signType: "MD5",
            timeStamp: map.timeStamp,
            paySign: map.paySign,

            success: function (resPay) {

              that._initData()
              
           
            },
            fail: function (res) {
              

            }
          })


        }
      })
  },

  
  toPayDetail(){
 console.log("toPayDetail")
  wx.navigateTo({
    url: '../payDetail/payDetail',
  })
  },


  toPrintSet(){
    wx.navigateTo({
      url: '/subPackage-charts/pages/order/pSearchPrinter/pSearchPrinter',
    })

  },


  delPrint(){
    wx.showModal({
      title: '确定要删除打印机吗？',
      content: '',
      complete: (res) => {
        if (res.cancel) {
          
        }
    
        if (res.confirm) {
          this._updateUserInf()
        }
      }
    })
  },

  _updateUserInf(){
    var userInfo = this.data.userInfo;
    var data = {
      userName: userInfo.nxDiuWxNickName,
      userId: userInfo.nxDistributerUserId,
      phone: userInfo.nxDiuWxPhone,
      deviceId: -1,
    }
 updateDisUser(data).then(res => {
        if (res.result.code == 0) {
        load.hideLoading();
      
        this.setData({
          userInfo: res.result.data
        })
        wx.setStorageSync('userInfo', res.result.data);
        
      }else{
        load.hideLoading();
        wx.showToast({
          title: '获取信息失败',
          icon: 'none'
        })
      }
      })
  },

  
  toBack(){
    wx.navigateBack({
      delta: 1
    })
  },


})
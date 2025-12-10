var app = getApp()
var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config.js'

import {
  disGetPayList,
  disBuyUserMarket,
  disBuyApp,
  disPayUser,
  setPayForDep,
  disGetBuyTypeMarket,
  buyMachines
} from '../../../../lib/apiDistributer'


let itemWidth = 0;
let windowWidth = 0;

Page({

  onShow(){
    if(this.data.update){
   
    }

  },

  /**
   * 页面的初始数据
   */
  data: {
    sliderOffset: 0,
    sliderOffsets: [],
    sliderLeft: 0,
    tabs: [
      
      {
        name: "流量",
        amount: "",
        amountOk: "",
      }, 
      
      {
        name: "设备",
        amount: "",
        amountOk: "",
      },
    ],
    selArr: [],
    aaa: 0,
      currentTab: 0,
      selIndex: 0,
  

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
        marketId: disInfoValue.nxDistributerSysMarketId
      
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
      url: apiUrl.server,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      
      img: 'userImage/index_share.png',

    })

    this._initData();
    this.clueOffset(options.type);
  },

  changeIndex(e){
    var index =  e.currentTarget.dataset.index;
    this.setData({
      selIndex: index,
      orderSubtotal: this.data.payArr[index].nxNdpPaySubtotal,
      quantity: this.data.payArr[index].nxNdpBuyQuantity,
    })
  },



  _initData(){
    var data = {
      marketId: this.data.marketId,
      type: this.data.currentTab,
    }
   load.showLoading("获取数据中");
   disGetBuyTypeMarket(data).then(res =>{
      load.hideLoading();
      if(res.result.code ==0){
        this.setData({
          payArr: res.result.data.list,
          payEntities: res.result.data.payEntities,
         
        })
        if(this.data.currentTab < 2){
          this.setData({
            orderSubtotal: res.result.data.list[0].nxNdpPaySubtotal,
            quantity: res.result.data.list[0].nxNdpBuyQuantity,
          })
        }else{
          this.setData({
            orderSubtotal: 0,
            quantity: 0,
          })
          
        }
      }
    })


  },



  toDep(){

    wx.navigateTo({
      url: '../selDepartment/selDepartment?quantity=' + this.data.quantity + "&subtotal=" + this.data.orderSubtotal,
    })
  },


  gorRunnerLobbyList(){
    console.log("gorRunnerLobbyList");
    var arr = [];
    var sel = this.data.selArr;
    for(var i = 0 ; i < sel.length; i++){
   
      var price = sel[i].perPrice;

      var  one = {
        perPrice: price,
        nxNdpPaySubtotal: sel[i].nxNdpPaySubtotal,
        payUserOpenId: this.data.userInfo.nxDiuWxOpenId,
        nxNdpBuyQuantity: 1,
        nxNdpNxDisId: this.data.disId,
        nxNdpType: 2,
        nxNdpImgUrl: sel[i].nxNdpImgUrl,
        nxNdpSellDetail: sel[i].nxNdpSellDetail,
      }
      arr.push(one);
    }
    buyMachines(arr)
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
            wx.showToast({
              title: '充值成功',

            })
            wx.navigateBack({delta: 1})
           
          },
          fail: function (res) {
            console.log(res);
            console.log("failelleeespapayayyaayyay")

          }
        })


      }
    })
  },

  
  gorRunnerLobby: function (e) {

        var data = {
          disId: this.data.disId,
          openId: this.data.userInfo.nxDiuWxOpenId,
          subtotal: this.data.orderSubtotal,
          type: 1,
           quantity: this.data.quantity,
           marketId:  this.data.disInfo.nxDistributerSysMarketId
        }
       
        disBuyUserMarket(data)
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

                   wx.showToast({
              title: '充值成功',
              
            })
            wx.navigateBack({delta: 1})
                },
                fail: function (res) {
                  console.log(res);
                  console.log("failelleeespapayayyaayyay")

                }
              })


            }
          })
  },


  gorRunnerLobbyApp: function (e) {

    var data = {
      disId: this.data.disId,
      openId: this.data.userInfo.nxDiuWxOpenId,
      subtotal: this.data.orderSubtotal,
      type: this.data.type,
       quantity: this.data.quantity,
    }
   console.log("buyapp" , data);
    disBuyApp(data)
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

               wx.showToast({
          title: '充值成功',
          
        })
        wx.navigateBack({delta: 1})
            },
            fail: function (res) {
              console.log(res);
              console.log("failelleeespapayayyaayyay")

            }
          })


        }
      })
},


  /**
   * 计算偏移量
   */
  clueOffset(type) {
  
    itemWidth = Math.ceil(this.data.windowWidth / this.data.tabs.length);
    console.log("thiswiek", this.data.windowWidth, "itemw", itemWidth);
    let tempArr = [];
    for (let i in this.data.tabs) {
      tempArr.push(itemWidth * i);
    }
    // tab 样式初始化
    this.setData({
      sliderOffsets: tempArr,
      sliderLeft: (this.data.windowWidth / 5),
    });

  },

  /**
   * tabItme点击
   */
  onTab1Click(event) {

    console.log("onTab1Click");
    this.setData({
      currentTab: event.currentTarget.dataset.current,
      selIndex: 0,
    })
   
  },


  bindChange: function (e) {
       console.log(e);
      this.setData({
        currentTab: e.detail.current,
        sliderOffset: this.data.sliderOffsets[e.detail.current],
        type: Number(e.detail.current) + Number(1),
        selIndex: 0,
      })
 
      this._initData()
    
  },


  // // 跳转客服subPackage/pages/management/staff/staff
  toCustomerServicePages: function () {
    console.log("kefu")
    try {
      wx.openCustomerServiceChat({
        extInfo: {
          url: 'https://work.weixin.qq.com/kfid/kfc016b04fed31d2375' //客服ID
        },
        corpId: 'ww9778dea409045fe6', //企业微信ID
        success(res) {}
      })
    } catch (error) {
      showToast("请更新至微信最新版本")
    }
  },


  /**
   * 邀请采购员
   * @param {*} options 
   */
  onShareAppMessage: function (options) {
  
    return {
      title: "超好用的配送小程序", // 默认是小程序的名称(可以写slogan等)
      path: '/pages/inviteLogin/inviteLogin?disId=' + this.data.userInfo.nxDiuDistributerId
       +'&disName=' + this.data.disInfo.nxDistributerName,
      imageUrl: this.data.url + this.data.img ,
    }
  },



  addMachine(e){
 
    var index = e.currentTarget.dataset.index;
    console.log(index);
    var arr = this.data.selArr;
    var item = this.data.payArr[index];
    var data  = "payArr[" + index + "].isSelected";
    if(item.isSelected){
      this.setData({
        [data]: false
      })
      var purId = item.perPrice;
       var choicePrintArr = arr.filter(item => item.perPrice !== purId);
    this.setData({
      selArr: choicePrintArr
    })
     
    }else{
      this.setData({
        [data]: true
      })
      var selArr = this.data.selArr;
      selArr.push(item);
      this.setData({
        selArr: selArr
      })
    }
    
    var selArr = this.data.selArr;
    var total = 0;
    if(selArr.length > 0){
      for(var i = 0; i < selArr.length; i++){
        total += Number(selArr[i].nxNdpPaySubtotal);
      }
    }
   console.log("tootoa", total);
    this.setData({
      orderSubtotal:total,
      aaa: total
    })

  },

  toBack(){
    wx.navigateBack({
      delta: 1
    })
  },


})
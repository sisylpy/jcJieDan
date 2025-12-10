
var load = require('../../../../lib/load.js');
var app = getApp()

import {
 
  getBillApplysGbDep,
  updateOrder,
  updateBillOrders,
  saveGbReturn
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


  

    //login页面存储的信息
    var value = wx.getStorageSync('userInfo');
    if (value) {
      this.setData({
        disId: value.nxDistributerEntity.nxDistributerId,
        userInfo: value,
        userId: value.nxDistributerUserId,

      })
    }
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      billId: options.billId,
      depName: options.depName,
      depFatherId: options.depFatherId,
      depHasSubs: options.depHasSubs
    })

    this._getAccountBillApplys();

  },

  _getAccountBillApplys(){
    var data = {
      billId: this.data.billId,
      depFatherId: this.data.depFatherId
    }
    getBillApplysGbDep(data).then(res =>{
      console.log(res)
      if(res.result.code == 0){
          this.setData({
            applyArr: res.result.data.arr,
            bill: res.result.data.bill,
            returnCount: res.result.data.returnNumber,
          })         
       
      }

    })
  },

  saveReturn(){
    load.showLoading("保存订单中");
    saveGbReturn(this.data.bill.nxDepartmentBillId).then(res =>{
      load.hideLoading();
      if(res.result.code == 0){
        wx.navigateBack({delta: 1});
      }
    })
  },
  

  openTools(e){
    console.log(e);
    this.setData({
      showOperation: true,
      item: e.currentTarget.dataset.item,
      itemDis: e.currentTarget.dataset.item.nxDistributerGoodsEntity,
      index: e.currentTarget.dataset.index,
    })
    if(this.data.depHasSubs > 0){
      this.setData({
        depIndex: e.currentTarget.dataset.depindex,
      })
    }
  },

  

  editBill(e){
    console.log(e);
    this.setData({
      showOperation: false,
      show: true,
      applyNumber: this.data.item.nxDoWeight,
      applyPrice: this.data.item.nxDoPrice,
      applySubtotal: this.data.item.nxDoSubtotal
      
    })
   


  },
  addReturn(e){
    this.setData({
      showOperation: false,
      showReturn: true, 
      returnNumber: this.data.item.nxDoWeight
    })
  },

  /**
   * 修改配送申请
   * @param {} e 
   */
  confirm(e) {
    var total = "";

    if(this.data.depHasSubs == 0){
      var index = this.data.index;
      var orderItemWeight = "applyArr[" + index + "].nxDoWeight";
      var orderItemPrice = "applyArr[" + index + "].nxDoPrice";
      var orderItemSubtotal = "applyArr[" + index + "].nxDoSubtotal";
      this.setData({    
        [orderItemWeight]: e.detail.applyNumber,
        [orderItemPrice]: e.detail.applyPrice,
        [orderItemSubtotal]: e.detail.applySubtotal,
      })
      var arr  = this.data.applyArr;
      for(var i = 0; i < arr.length; i++){
        var sub = arr[i].nxDoSubtotal;
        total = Number(total) + Number(sub);
      }
      this.setData({
        billSubtotal: total.toFixed(1),
        ["bill.nxDbTotal"]: total.toFixed(1)
      })
    }else{
      var depIndex = this.data.depIndex;
      var index = this.data.index;
      var orderItemWeight = "applyArr[" + depIndex + "].depOrders[" + index + "].nxDoWeight";
      var orderItemPrice = "applyArr[" + depIndex + "].depOrders[" + index + "].nxDoPrice";
      var orderItemSubtotal = "applyArr[" + depIndex + "].depOrders[" + index + "].nxDoSubtotal";
      this.setData({
        [orderItemWeight]: e.detail.applyNumber,
        [orderItemPrice]: e.detail.applyPrice,
        [orderItemSubtotal]: e.detail.applySubtotal,
      })
      var depArr = this.data.applyArr;
      for(var i = 0; i < depArr.length; i++){
        var orderArr =  depArr[i].depOrders;
        for(var j = 0;  j < orderArr.length; j ++){
          console.log(j)
          console.log(orderArr[j].nxDoSubtotal)
           var sub = orderArr[j].nxDoSubtotal;
           total = Number(total) + Number(sub);
        }
    }

      this.setData({
        billSubtotal: total.toFixed(1),
        ["bill.nxDbTotal"]: total.toFixed(1)
      })
    }

    var data = {
      billId: this.data.billId,
      orderId: this.data.item.nxDepartmentOrdersId,
      billSubtotal: this.data.billSubtotal,
      orderPrice: e.detail.applyPrice,
      orderWeight: e.detail.applyNumber,
      orderSubtotal: e.detail.applySubtotal,
    };

    updateBillOrders(data).then(res => {
      load.showLoading("修改订单")
        if (res.result.code == 0) {
          load.hideLoading();
          this._getAccountBillApplys();

        }else{
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })
        }
      
    })
  },

  
  toOpenPrint() {
    console.log('billId=' + this.data.billId +'&depFatherId=' + this.data.depFatherId + '&depHasSubs=' + this.data.depHasSubs + '&depName=' + this.data.depName +'&userId=' + this.data.userInfo.nxDistributerUserId);
    wx.navigateToMiniProgram({
      appId: 'wx2dccb807db0ea0d7',
      path: 'pages/issuePageTwo/issuePageTwo?billId=' + this.data.billId +'&depFatherId=' + this.data.depFatherId + '&depHasSubs=' + this.data.depHasSubs + '&depName=' + this.data.depName +'&userId=' + this.data.userInfo.nxDistributerUserId,
      envVersion: 'trial', //release  develop  trial
    })
  },


  toReturnPage(){
    console.log(this.data.billId)
    wx.navigateTo({
      url: '../returnPage/returnPage?billId=' + this.data.billId
      + '&depName=' + this.data.depName + '&depFatherId=' + this.data.depFatherId 
      +'&disId=' + this.data.disId,  
    })
  },

  
  /**
   * 修改配送申请
   * @param {} e 
   */
  confirmReturn(e) {
  
    var dg = {
      nxDepartmentOrdersId: this.data.item.nxDepartmentOrdersId,
      nxDoReturnWeight: e.detail.applyNumber,
      nxDoReturnSubtotal: (Number(e.detail.applyNumber) * Number(this.data.item.nxDoPrice)).toFixed(1),
      nxDoReturnStatus: 0,
      
      
    };

    updateOrder(dg).then(res => {
      load.showLoading("添加退货商品")
        if (res.result.code == 0) {
          load.hideLoading();
          this._getAccountBillApplys();
          
        }else{
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })
        }
      
    })
  },


  
  onPageScroll: function (e) {
    this.setData({
      scrollViewTop: e.scrollTop * globalData.rpxR,

    })
    var _this = this;
    if (e.scrollTop <= 0) {
      e.scrollTop = 0;
    } else if (e.scrollTop > wx.getSystemInfoSync().windowHeight) {
      e.scrollTop = wx.getSystemInfoSync().windowHeight;
    }

    if (e.scrollTop > this.data.scrollTop || e.scrollTop == wx.getSystemInfoSync().windowHeight) {
      this.setData({
        hide: true
      })
    } else {
      this.setData({
        hide: false
      })
    }
    setTimeout(function () {
      _this.setData({
        scrollTop: e.scrollTop
      })
    }, 0)
  },

 toBack(){
  wx.navigateBack({
    delta: 1,
  })
 },

})
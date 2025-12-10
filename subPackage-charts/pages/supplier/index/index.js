var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config.js'
var dateUtils = require('../../../../utils/dateUtil');


import {
  nxDisGetAllSuppliers,
  deleteNxDisSuppler
} from '../../../../lib/apiDistributer'


Page({

  /**
   * 页面的初始数据
   */
  data: {
    buyer: false,
    seller: false
  },

  onShow(){

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


    this._initData()
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
      disId: options.disId,
      userId: options.userId,
      url: apiUrl.server,
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
    var disInfo = wx.getStorageSync('disInfo');
    if(disInfo){
      this.setData({
        disInfo: disInfo
      })
    }
   
  },


  _initData(){
    var data ={
      nxDisId: this.data.disId,
      userId: 0,
      startDate: this.data.startDate,
      stopDate: this.data.stopDate
    }
    nxDisGetAllSuppliers(data).then(res =>{
      if(res.result.code == 0){
        console.log(res.result.data)
        this.setData({
          supplierArr: res.result.data
        })
      }
    })
  },


  addSupplier(){
    wx.navigateTo({
      url: '../addSupplier/addSupplier?disId=' + this.data.disId 
       + '&userId=' + this.data.userId,
    })
  },

 

  toMyJinridinghuo(e) {
    var that  = this;
    console.log('nxDisId=' + this.data.disId +'&nxDisPurUserId=' + this.data.userId + '&commId=-1&commPurUserId=-1&gbDisId=-1&gbDepId=-1&gbDepUserId=-1&supplierId=' + this.data.supplierItem.nxJrdhSupplierId)
    wx.navigateToMiniProgram({
      appId: 'wx1ea78d3f33234284',
      path: 'pages/seller/inviteSeller/inviteSeller?nxDisId=' + this.data.disId
      +'&nxDisPurUserId=' + this.data.userId + '&commId=-1&commPurUserId=-1&gbDisId=-1&gbDepId=-1&gbDepUserId=-1&supplierId=' + this.data.supplierItem.nxJrdhSupplierId,
      envVersion: 'trial', //release  develop  trial
      success(res) {
        that.setData({
          navigateAuto: true
        })
      },
    })
  },

 
  openOperation(e) {   
    this.setData({
      showOperation: true,
      supplierItem: e.currentTarget.dataset.item,
    })
    this.chooseSezi();

  },


  hideMask() {
   
    this.setData({
      showOperation: false,
    })
  },

  chooseSezi: function (e) {
    // 用that取代this，防止不必要的情况发生
    var that = this;
    // 创建一个动画实例
    var animation = wx.createAnimation({
      // 动画持续时间
      duration: 100,
      // 定义动画效果，当前是匀速
      timingFunction: 'linear'
    })
    // 将该变量赋值给当前动画
    that.animation = animation
    // 先在y轴偏移，然后用step()完成一个动画
    animation.translateY(200).step()
    // 用setData改变当前动画
    that.setData({
      // 通过export()方法导出数据
      animationData: animation.export(),
      // 改变view里面的Wx：if
      chooseSize: true
    })
    // 设置setTimeout来改变y轴偏移量，实现有感觉的滑动
    setTimeout(function () {
      animation.translateY(0).step()
      that.setData({
        animationData: animation.export()
      })
    }, 20)
  },

  hideModal: function (e) {
    var that = this;
    var animation = wx.createAnimation({
      duration: 1000,
      timingFunction: 'linear'
    })
    that.animation = animation
    animation.translateY(200).step()
    that.setData({
      animationData: animation.export()

    })
    setTimeout(function () {
      animation.translateY(0).step()
      that.setData({
        animationData: animation.export(),
        chooseSize: false
      })
    }, 200)
  },
  
  
  buyerCheckUnPay(e){
    console.log("buyercheneem")
    wx.setStorageSync('supplierItem', this.data.supplierItem);
    wx.navigateTo({
      url: '../buyerCheckUnPay/buyerCheckUnPay?disId=' + this.data.disId ,
    })
  },

  toSupplierGoods(){
  var supplierId = this.data.supplierItem.nxJrdhSupplierId;
   wx.setStorageSync('supplierItem', this.data.supplierItem);
  wx.navigateTo({
    url: '../goodsIndex/goodsIndex?disId=' + this.data.disId + '&supplierId='
    +  supplierId,
  })
  },


  edit(e){
    wx.setStorageSync('supplierItem', this.data.supplierItem);
    wx.navigateTo({
      url: '../addSupplier/addSupplier?type=edit'
    })
  },

  deleteSuppler(){
    this.setData({
      deleteShow: true,
    })

  },
  deleteNo(){
    this.setData({
      deleteShow: false,
      supplierItem: "",
    })
  },


toSupplierDetail(e) {
  console.log("ee",e);
  wx.setStorageSync('supplierItem', e.currentTarget.dataset.item);
  wx.navigateTo({
    url: '../supplierBills/supplierBills?type=' + e.currentTarget.dataset.type + '&supplierId=' +
    e.currentTarget.dataset.item.nxJrdhSupplierId + '&value=' + e.currentTarget.dataset.value,
  })
},


  deleteYes(){

    deleteNxDisSuppler(this.data.supplierItem.nxJrdhSupplierId)
    .then(res =>{
      if(res.result.code == 0){
        this.setData({
          deleteShow: false,
          supplierItem: "",
        })
        this._initData()
      }else{
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
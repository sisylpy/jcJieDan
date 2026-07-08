
var load = require('../../../../lib/load.js');

import {
  disGetAllCustomer
} from '../../../../lib/apiDistributer.js'


Page({

  onShow(){

    this._initData();

  },

  onLoad: function (options) {
    const globalData = getApp().globalData;
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      rpxR: globalData.rpxR,
    })
    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
        disId: userInfo.nxDiuDistributerId,
        deviceId: userInfo.nxDiuPrintDeviceId,
        disInfo: userInfo.nxDistributerEntity,
      })
    }
    this._initData();
  
  },


  _filterCustomers() {
    const keyword = (this.data.customerFilterKeyword || '').trim().toLowerCase();
    const filterFn = (item) => !keyword || (item.nxDepartmentAttrName || '').toLowerCase().includes(keyword);
    this.setData({
      filteredCustomerArrOne: (this.data.myCustomerArrOne || []).filter(filterFn),
      filteredCustomerArrTwo: (this.data.myCustomerArrTwo || []).filter(filterFn),
    });
  },

  onCustomerFilterInput(e) {
    this.setData({
      customerFilterKeyword: e.detail.value
    }, () => this._filterCustomers());
  },

  _initData() {
    disGetAllCustomer(this.data.disId).then(res => {
      load.showLoading("获取客户")
      if (res.result.code == 0) {
        load.hideLoading();
        const arrOne = res.result.data.settleTypeOne || [];
        const arrTwo = res.result.data.settleTypeTwo || [];
        this.setData({
          myCustomerArrOne: arrOne,
          myCustomerArrTwo: arrTwo,
          myCustomerArrThree: res.result.data.settleTypeThree || [],
        }, () => this._filterCustomers());
        var that = this;
        var query = wx.createSelectorQuery();
        //选择id
        query.select('#mjltest').boundingClientRect()
        query.exec(function (res) {
          that.setData({
            maskHeight: res[0].height * that.data.rpxR + 50
          })
        })
      }else{ 
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },



  addNewCustomer(e) {
    wx.navigateTo({
      url: '../../../../subPackage/pages/customer/addCustomer/addCustomer?disId=' + this.data.disId,
    })
  },


  toDepOrders(e) {
    wx.setStorageSync('depItem', e.currentTarget.dataset.item);
    var nxDisId = this.data.disId;
    var depId = e.currentTarget.dataset.id;
    var gbDisId = e.currentTarget.dataset.gbdisid;
    var gbDepId = e.currentTarget.dataset.gbid;
    var resId = e.currentTarget.dataset.resid;
    var comId = e.currentTarget.dataset.comid;
    var name = e.currentTarget.dataset.name;
    var depHasSubs = e.currentTarget.dataset.depsub;

    wx.navigateTo({
      url: '../orderPage/orderPage?depFatherId=' + depId +
        '&name=' + name + '&gbDepFatherId=' + gbDepId  + '&nxDisId=' + nxDisId + '&gbDisId=' + gbDisId + '&comId=' + comId +
        '&depHasSubs=' + depHasSubs,
    })
  },


  

  selectDepartment(e){
    console.log(e.currentTarget.dataset.item);
    var dep = e.currentTarget.dataset.item;
    var depFatherId = dep.nxDepartmentId;
    var depId = dep.nxDepartmentId;
    var depName = dep.nxDepartmentName;
    if(dep.nxDepartmentFatherId > 0){
       depFatherId = dep.nxDepartmentFatherId;
       depName = e.currentTarget.dataset.fathername + "-" + depName
    }
   
    this.setData({
      dep: dep,
      depFatherId: depFatherId,
      depId: depId,
      depName: depName,
      showOperation: true,
    })
  },


  hideMast(){
    this.setData({
      showOperation: false
    })
  },

  toResGoods(){
    this.hideMast();
    wx.setStorageSync('depItem', this.data.dep);
    wx.navigateTo({
      url: '../resGoodsList/resGoodsList?depFatherId=' + this.data.depFatherId
      +'&depId=' + this.data.depId + '&depName=' + this.data.depName +
      '&gbDepFatherId=-1&depSettleType=' + this.data.dep.nxDepartmentSettleType + '&beforeId=-1',
    })
  },

  toResGoodsList(e) {
    this.setData({
      showOperation:false
    })
    console.log("depId=" + this.data.depFatherId + '&depHasSubs=' + this.data.dep.nxDepartmentSubAmount)
   var appId = this.data.disInfo.nxDistributerAppId;
    wx.navigateToMiniProgram({
      appId: appId,
      path: '/pages/index_admin/index_admin?depId=' + this.data.depFatherId + '&depHasSubs=' + this.data.dep.nxDepartmentSubAmount , 
      envVersion: 'release', //release develop trial
      success(res) {
        // that.setData({
        //   toOpenMini: false
        // })
      }
    })

  },

  toRecord(){
    this.hideMast();
    wx.setStorageSync('depItem', this.data.dep);
    wx.navigateTo({
      url: '../../../../subPackage/pages/order/record/record?depFatherId=' + this.data.depFatherId
      +'&depId=' + this.data.depId + '&depName=' + this.data.depName +
      '&gbDepFatherId=-1&depType=' + this.data.dep.nxDepartmentType,
    })

  },


  toPaste(){
    this.hideMast();
    wx.setStorageSync('depItem', this.data.dep);
    wx.navigateTo({
      url: '../paste/paste?depFatherId=' + this.data.depFatherId
      +'&depId=' + this.data.depId + '&depName=' + this.data.depName +
      '&gbDepFatherId=-1&depType=' + this.data.dep.nxDepartmentType,
    })

  },



  hideMask(){
    this.setData({
      showOperation: false,
    })
  },
  toBack() {
    wx.navigateBack({
      delta: 2,
    })
  },






})
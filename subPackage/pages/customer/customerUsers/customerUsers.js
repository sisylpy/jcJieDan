import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil.js');

let windowWidth = 0;
let itemWidth = 0;

import {
  
  updateDepGoodsSellingPrice,
  deleteDepGoods,
  getDepUsersByFatherId,
  disGetDepGoods,
  getDepInfo,
  deleteGroupDep,
  delHisotory,
  deleteDepUser,

  updateDepUserAdmin,
  updateGroupName

}
from '../../../../lib/apiDistributer'



Page({

  

  /**
   * 页面的初始数据
   */
  data: {
    
  },

  onShow() {
    const app = getApp();
    const globalData = app.globalData;
   
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
    })
    
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
    })
    
    var value = wx.getStorageSync('userInfo');
    if (value) {
      this.setData({
        disId: value.nxDistributerEntity.nxDistributerId,
        userInfo: value,
      })
      var depInfoValue = wx.getStorageSync('depInfo');

      if (depInfoValue.nxDepartmentSubAmount > 0) {
        this.setData({
          subArr: depInfoValue.nxDepartmentEntities,
        })
      } else {
        //没有下级部门
        // 如果是群用户登陆
        this.setData({
          depId: depInfoValue.nxDepartmentId,
          depFatherId: depInfoValue.nxDepartmentFatherId,
          groupName: depInfoValue.nxDepartmentName,
          depType: depInfoValue.nxDepartmentType
        })
        wx.setStorageSync('depFatherId', depInfoValue.nxDepartmentFatherId)
        wx.setStorageSync('depInfo', depInfoValue);
      }
      this.setData({
        depInfo: depInfoValue,
        depFatherId: depInfoValue.nxDepartmentId,
        settleType: depInfoValue.nxDepartmentSettleType,
        editDepName: depInfoValue.nxDepartmentName,
        editDepAttrName: depInfoValue.nxDepartmentAttrName
      })
    }

    var disInfo = wx.getStorageSync('disInfo');
 if(disInfo){
   this.setData({
     disInfo: disInfo
   })
 }

    this._getGroupUsers();
   

  },

 
  _getGroupUsers() {
    load.showLoading("获取订货组用户")
    getDepUsersByFatherId(this.data.depFatherId).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        this.setData({
          userArr: res.result.data,
        })
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },




  switchChange(e) {
    console.log(e)
    var index = e.currentTarget.dataset.index;
    var user = this.data.userArr[index];
    var admin = this.data.userArr[index].nxDuAdmin;
    if (admin == 0) {
      user.nxDuAdmin = 1;
    } else {
      user.nxDuAdmin = 0;
    }
    updateDepUserAdmin(user)
      .then(res => {
        if (res.result.code == 0) {
          this._getGroupUsers();
        }
      })
  },


 showUser(e){
  this.setData({
    showOperationUser: true,
    userId: e.currentTarget.dataset.id,

  })
 },
 



 delUser(){
   console.log("delUserdelUserdelUser")
  deleteDepUser(this.data.userId).then(res =>{
    if(res.result.code == 0){
      this._getGroupUsers();
    }else{
      wx.showToast({
        title:  res.result.msg,
        icon: 'none'
      })
    }
  })
 },

 hideMaskUser(){
   this.setData({
     showOperationUser : false,
     
     userId: "",
   })

 },
  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },







})
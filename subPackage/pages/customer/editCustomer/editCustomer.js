var load = require('../../../../lib/load.js');

import {
  updateNxDep,
  disDeleteSubDeps,
  saveOneCustomerDesk,
  changeMultiDeps,
  delSubDep,
  getDepInfo
} from '../../../../lib/apiDistributer'


Page({

  /**
   * 页面的初始数据
   */
  data: {
    changeSubNumber: false,
    hasSubs: "",
    addDep: false
  },




  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const globalData = getApp().globalData;

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
    })

    var depInfo = wx.getStorageSync('depInfo');
    if (depInfo) {
      const deepCopy = JSON.parse(JSON.stringify(depInfo));

      this.setData({
        depInfo: depInfo,
        hasSubs: depInfo.nxDepartmentEntities.length,
     
        editDepItem: deepCopy,
      })
    }

  },


  editSubDep(e) {
    var index = e.currentTarget.dataset.index;
    console.log("index", index);
    var depArr = this.data.depInfo.nxDepartmentEntities;
    for (var i = 0; i < depArr.length; i++) {
      var data = "depInfo.nxDepartmentEntities[" + i + "].isSelected";
      if (i == index) {
        this.setData({
          [data]: true,
          editDep: depArr[i],
        })
      } else {
        this.setData({
          [data]: null,
        })
      }
    }
  },


  addDep() {
    this.setData({
      addDep: true,
    })
  },


  getName(e) {
    if (e.detail.value.length > 0) {
      this.setData({
        depName: e.detail.value,
      })
    }

  },

  saveDep() {
    var data = {
      nxDepartmentFatherId: this.data.depInfo.nxDepartmentId,
      nxDepartmentSubAmount: 0,
      nxDepartmentType: this.data.depInfo.nxDepartmentType,
      nxDepartmentIsGroupDep: 0,
      nxDepartmentSettleType: this.data.depInfo.nxDepartmentSettleType,
      nxDepartmentDisId: this.data.depInfo.nxDepartmentDisId,
      nxDepartmentName: this.data.depName,
      nxDepartmentAttrName: this.data.depName,
      nxDepartmentPrintName: this.data.depInfo.nxDepartmentPrintName,
      nxDepartmentShowWeeks: this.data.depInfo.nxDepartmentShowWeeks,
      nxDepartmentJoinDate: this.data.depInfo.nxDepartmentJoinDate,
      nxDepartmentWorkingStatus: 0,
    }
    saveOneCustomerDesk(data).then(res => {
      if (res.result.code == 0) {
        this.setData({
          addDep: false,
        })
        this._getDepInfo();
      }
    })

  },

  getDepartmentName(e) {
    if (e.detail.value.length > 0) {
      var editDep = this.data.editDep;
      editDep.nxDepartmentAttrName = e.detail.value;
      editDep.nxDepartmentName = e.detail.value;
      editDep.nxDepartmentOrderCode = e.detail.value;
    }
  },

  updateDepName() {

    updateNxDep(this.data.editDep).then(res => {
      if (res.result.code == 0) {
        this._getDepInfo();
      }
    })

  },


  _getDepInfo() {
    getDepInfo(this.data.depInfo.nxDepartmentId).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        wx.setStorageSync('depInfo', res.result.data)
        this.setData({
          depInfo: res.result.data,
          depName: "",
          hasSubs: res.result.data.nxDepartmentEntities.length,
        })
        var pages = getCurrentPages();
        var prevPage = pages[pages.length - 2]; //上一个页面
        //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
        prevPage.setData({
          update: true
        })
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },


  deleteNo() {
    this.setData({
      deleteShow: false,
    })
  },

  deleteYes() {
    load.showLoading("删除部门")
    disDeleteSubDeps(this.data.depInfo.nxDepartmentId).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        wx.removeStorageSync('depInfo');
        var pages = getCurrentPages();
        var prevPage = pages[pages.length - 2]; //上一个页面
        //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
        prevPage.setData({
          update: true
        })
        wx.navigateBack({detail: 1})
      }
    })

  },

  delSubDep(e){
    var id = this.data.depInfo.nxDepartmentEntities[e.currentTarget.dataset.index].nxDepartmentId;
    delSubDep(id).then(res =>{
      if(res.result.code == 0){
        this._getDepInfo();
      }
    })
  },


  radioChange: function (e) {
    console.log("radiscahge", e.detail.value);
    if (e.detail.value == 0) {
      var data = "editDepItem.nxDepartmentEntities";
      this.setData({
      
        hasSubs: 0,
        [data]: [],
        hasSubs: 0,
        changeSubNumber: false,
      })
      if(this.data.depInfo.nxDepartmentEntities.length > 0){
        this.setData({
          deleteShow: true,
        })
      }
    } else {
      if(this.data.depInfo.nxDepartmentEntities.length == 0){
        var data = "editDepItem.nxDepartmentEntities";
        var item = {
          nxDepartmentFatherId: this.data.depInfo.nxDepartmentId,
          nxDepartmentSubAmount: 0,
          nxDepartmentType: this.data.depInfo.nxDepartmentType,
          nxDepartmentIsGroupDep: 0,
          nxDepartmentSettleType: this.data.depInfo.nxDepartmentSettleType,
          nxDepartmentDisId: this.data.depInfo.nxDepartmentDisId,
          nxDepartmentName: this.data.depName,
          nxDepartmentAttrName: this.data.depName,
          nxDepartmentPrintName: this.data.depInfo.nxDepartmentPrintName,
          nxDepartmentShowWeeks: this.data.depInfo.nxDepartmentShowWeeks,
          nxDepartmentJoinDate: this.data.depInfo.nxDepartmentJoinDate,
          nxDepartmentWorkingStatus: 0,
        }
        var temp = [];
        temp.push(item);
        this.setData({
          [data]: temp,
          hasSubs: 1,
          changeSubNumber: true,
        })
      }else{
        wx.showToast({
          title: '可以添加或删除、修改部门',
          icon: 'none'
        })

      }
     
    }
  },


  inputSubNumber(e) {
    var num = e.detail.value;
    if(num.length > 0 && num > 0){
     
  
      var temp = [];
      for (var i = 0; i < num; i++) {
        var item = {
          nxDepartmentFatherId: this.data.depInfo.nxDepartmentId,
          nxDepartmentSubAmount: 0,
          nxDepartmentType: this.data.depInfo.nxDepartmentType,
          nxDepartmentIsGroupDep: 0,
          nxDepartmentSettleType: this.data.depInfo.nxDepartmentSettleType,
          nxDepartmentDisId: this.data.depInfo.nxDepartmentDisId,
          nxDepartmentName: this.data.depName,
          nxDepartmentAttrName: this.data.depName,
          nxDepartmentPrintName: this.data.depInfo.nxDepartmentPrintName,
          nxDepartmentShowWeeks: this.data.depInfo.nxDepartmentShowWeeks,
          nxDepartmentJoinDate: this.data.depInfo.nxDepartmentJoinDate,
          nxDepartmentWorkingStatus: 0,
        }
        temp.push(item);
      }
  
      var data = "editDepItem.nxDepartmentEntities";
      this.setData({
        [data]: temp,
      })
    }
  },

  getNewName(e){
    console.log(e);
    var index = e.currentTarget.dataset.index;
    console.log("index", index);
    var itemData = "editDepItem.nxDepartmentEntities[" + index + "].nxDepartmentName";
    this.setData({
      [itemData]: e.detail.value
    })
  },


  //群名称输入
  bindKeyInput: function (e) {

    if (e.detail.value.length > 0) {
      this.setData({
        inputValue: e.detail.value,
      })
      this._ifCanSave();
    } else {
      this.setData({
        inputValue: "",
      })
    }

  },


  changeMultiDeps(){
    load.showLoading("保存部门名称")
    changeMultiDeps(this.data.editDepItem).then(res =>{
      load.hideLoading();
      if(res.result.code == 0){
        wx.removeStorageSync('depInfo');
        var pages = getCurrentPages();
        var prevPage = pages[pages.length - 2]; //上一个页面
        //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
        prevPage.setData({
          update: true
        })
        wx.navigateBack({detail: 1})
      }else{
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },

  
  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  }





})
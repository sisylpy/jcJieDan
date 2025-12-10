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
  delHisotory,

}
from '../../../../lib/apiDistributer'



Page({

  /**
   * 页面的初始数据
   */
  data: {
    showChoice: false,
   
    itemDis: null,
    maskHeight: 0,
    openIndex: -1,
    applyArr: [],
    applyHeight: "",
    depGoods: null,

  },

  onShow() {
    if(this.data.update){
      this._getDepInfo();
    }
    
  },


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const app = getApp();
    const globalData = app.globalData;

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

    var tadayDate = dateUtils.getWhichFullDate(0);
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      tadayDate: tadayDate
    })

    this._getResGoodsWithOrders();
   

  },

 
  toPdf(){
    wx.navigateTo({
      url: '../customerPdf/customerPdf',
    })
  },
  
  _getDepInfo() {
    getDepInfo(this.data.depFatherId).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        this.setData({
          depInfo: res.result.data,
        })
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },



  // /////
  _getResGoodsWithOrders() {
    var that = this;
    load.showLoading("获取数据");
    disGetDepGoods(this.data.depFatherId)
    .then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          this.setData({
            depGoodsArr: res.result.data,
          })
          that._openIndex();
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
          this.setData({
            depGoodsArr: []
          })
        }
      
    })

    
  },



  // swiper 1
  //0 
  openFather(e) {
    var fatherIndex = e.currentTarget.dataset.fatherindex;
    var data = "depGoodsArr[" + fatherIndex + "].isSelected";
    var isSel = this.data.depGoodsArr[fatherIndex].isSelected;

    if(this.data.openIndex == fatherIndex){
      this.setData({
        [data]: false,
        openIndex: -1,
      })
    }else{
      if(this.data.openIndex > -1){
        var dataLast = "depGoodsArr[" + this.data.openIndex + "].isSelected";

        this.setData({
          [dataLast]: false,
          [data]: true,
          openIndex: fatherIndex
        })
      }else{
        this.setData({
          [data]: true,
          openIndex: fatherIndex
        })
        
      }
     
    }

  },


  delHistory(e){
   
    wx.showModal({
      title: '删除重复数据',
      content: e.currentTarget.dataset.item.nxDgGoodsName,
      complete: (res) => {
        if (res.cancel) {

          
        }
    
        if (res.confirm) {
          load.showLoading("删除数据")
          delHisotory(e.currentTarget.dataset.id).then(res => {
            if (res.result.code == 0) {
              load.hideLoading();
               this._getDepApplys();
            }
          })
        }
      }
    })
   

  },
  //


  _openIndex(){
    if(this.data.openIndex !== -1){
      var data = "depGoodsArr[" + this.data.openIndex + "].isSelected";    
          this.setData({
            [data]: true,
          })
    }

  },


  hideMask(){
    this.setData({
      showOperationPrice: false
    })
  },


  deleteDepGoods(e){
    deleteDepGoods(e.currentTarget.dataset.id).then(
      res =>{
        if(res.result.code == 0){
          this._getResGoodsWithOrders();
        }
      }
    )
  },


  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },





  selDepartment(e){
    var item = e.currentTarget.dataset.depgoods;
     var disGoods = e.currentTarget.dataset.goods;
    this.setData({
      depGoodsId: item.nxDepartmentDisGoodsId,
      showOperationPrice: true,
      disGoods: disGoods,
      item: item,
      sellingPrice: item.nxDdgOrderPrice,
      orderName: item.nxDdgOrderGoodsName,
      pickDetail: item.nxDdgPickDetail
    })
  },

  inputSellingPrice(e){
    console.log(e.detail.value)
    this.setData({
      sellingPrice: e.detail.value,
    })

  },

  inputOrderName(e){
    console.log(e.detail.value)
    this.setData({
      orderName: e.detail.value,
    })
  },

  inputPickDetail(e){
    console.log(e.detail.value)
    this.setData({
      pickDetail: e.detail.value,
    })
  },

  _updateDepGoods(){
    var data = {
      depGoodsId: this.data.depGoodsId,
      sellingPrice: this.data.sellingPrice,
      pickDetail: this.data.pickDetail,
      orderName: this.data.orderName,

    }
    updateDepGoodsSellingPrice(data).then(res =>{
      if(res.result.code == 0){
        this.setData({
          showOperationPrice: false,
          depGoodsId: "",
          sellingPrice: ""
        })
        this._getResGoodsWithOrders();
        this._openIndex();

      }
    })

  },



})
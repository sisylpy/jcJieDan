const globalData = getApp().globalData;
var load = require('../../../../lib/load.js');
import download from "../../../../utils/download"

import apiUrl from '../../../../config.js'
import {
  depGetGbAppointSupplierGoods,
  disCancleSupplierGoods,

  deleteGbDisSuppler
} from '../../../../lib/apiDistributerGb'




Page({


  /**
   * 页面的初始数据
   */
  data: {
  
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server
    })
    var userInfoValue = wx.getStorageSync('userInfo');
    if (userInfoValue) {
      this.setData({
        userInfo: userInfoValue
      })
    }

    var supplierItem = wx.getStorageSync('supplierItem');
    if (supplierItem) {
      this.setData({
        supplier: supplierItem,
        supplierId: supplierItem.nxJrdhSupplierId,
        supplierName: supplierItem.nxJrdhsSupplierName,
      })
    }

    this._initData();
  },


  _initData() {
    load.showLoading("获取账单")
    depGetGbAppointSupplierGoods(this.data.supplierId).then(res => {
      console.log(res.result.data)
      if (res.result.code == 0) {
        load.hideLoading();
        this.setData({
          goodsList: res.result.data.goodsArr,

        })
        if (res.result.data.supplier !== null) {
          this.setData({
            supplier: res.result.data.supplier,
            user: res.result.data.supplier.jrdhUserEntity,
          })
        }
        var that = this;
        var query = wx.createSelectorQuery();
        //选择id
        query.select('#mjltestGoods').boundingClientRect()
        query.exec(function (res) {
          that.setData({
            maskHeight: res[0].height * globalData.rpxR + 50
          })
        })
      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
        this.setData({
          applyArr: []
        })
      }
    })
  },




  choiceGoods(e) {
    var id = e.currentTarget.dataset.id;
     disCancleSupplierGoods(id).then(res =>{
      if(res.result.code == 0){
        this._initData();
        // var pages = getCurrentPages();
        // var prevPage = pages[pages.length - 2]; //上一个页面
        // prevPage.setData({
        //   update: true
        // })
      }
    })
  
    
  },


  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },
  

















})
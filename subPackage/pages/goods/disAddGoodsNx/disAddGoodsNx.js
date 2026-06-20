var app = getApp();

import {
  disSaveDisGoods,
} from '../../../lib/apiibook'

import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');


Page({

  /**
   * 页面的初始数据
   */
  data: {
    showAdd: false,
    showEdit: false,
    standardArr: [],
    canSave: false,
    name: null,
    standard: null,
  },


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const globalData = app.globalData;

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      focusIndex: options.focusIndex,

    })


    var value = wx.getStorageSync('brotherGoods');
    if (value) {
      this.setData({
        brotherGoods: value,
        name: value.nxDgGoodsName
      })
    }
  },


  getDisGoodsContent(e) {

    if (e.currentTarget.dataset.type == 0) {
      this.setData({
        brand: e.detail.value
      })
    }
    if (e.currentTarget.dataset.type == 1) {
      this.setData({
        place: e.detail.value
      })
    }
    if (e.currentTarget.dataset.type == 2) {
      this.setData({
        detail: e.detail.value
      })
    }
    if (e.currentTarget.dataset.type == 3) {
      this.setData({
        name: e.detail.value
      })
    }
    if (e.currentTarget.dataset.type == 4) {
      this.setData({
        standard: e.detail.value
      })
    }
    if (e.currentTarget.dataset.type == 5) {
      this.setData({
        standardWeight: e.detail.value
      })
    }
    if (this.data.name != null && this.data.standard != null) {
      this.setData({
        canSave: true
      })
    }
  },


  saveDisGoods() {

    if (this.data.canSave) {
      var nxDgGoodsSonsSort = Number(this.data.brotherGoods.nxDgGoodsSonsSort) + Number(1);
      var data = {
        nxDgNxFatherImg: this.data.brotherGoods.nxDgNxFatherImg,
        nxDgNxGoodsFatherColor: this.data.brotherGoods.nxDgNxGoodsFatherColor,
        nxDgDistributerId: this.data.brotherGoods.nxDgDistributerId,
        nxDgGoodsBrand: this.data.brand,
        nxDgGoodsPlace: this.data.place,
        nxDgGoodsDetail: this.data.detail,
        nxDgGoodsName: this.data.name,
        nxDgGoodsStandardname: this.data.standard,
        nxDgGoodsStandardWeight: this.data.standardWeight,
        nxDgPullOff: 0,
        nxDgPurchaseAuto: 1,
        nxDgSupplierId: -1,
        nxDgNxGoodsId: this.data.brotherGoods.nxDgNxGoodsId,
        nxDgNxFatherId: this.data.brotherGoods.nxDgNxFatherId,
        nxDgNxGrandId: this.data.brotherGoods.nxDgNxGrandId,
        nxDgNxGreatGrandId: this.data.brotherGoods.nxDgNxGreatGrandId,
        nxDgDfgGoodsGrandId: this.data.brotherGoods.nxDgDfgGoodsGrandId,
        nxDgGoodsSort: this.data.brotherGoods.nxDgGoodsSort,
        // nxDgGoodsSonsSort: nxDgGoodsSonsSort,
        nxDgDfgGoodsFatherId: this.data.brotherGoods.nxDgDfgGoodsFatherId,
      }
      console.log(data);
      disSaveDisGoods(data).then(res => {
        if (res.result.code == 0) {
          var pages = getCurrentPages();
          var prevPage1 = pages[pages.length - 3];
          var arr = prevPage1.data.goodsList; // 注意：goosList 可能是拼写错误，应该是 goodsList？
          const index = Number(this.data.focusIndex) + 1; // 或者 parseInt(...)
          // 在 focusIndex + 1 的位置插入 res.result.data
          arr.splice(index, 0, res.result.data);
          // 更新 prevPage1 的数据
          prevPage1.setData({
            goodsList: arr
          });
          wx.navigateBack({
            delta: 2,
          })

        } else {
          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })
        }
      })
    } else {
      wx.showToast({
        title: '商品名称和规格必须填写',
        icon: 'none'
      })

    }


  },

  //添加客户
  showAddGoodsDepartments() {
    wx.navigateTo({
      url: '../disGoodsAddCustomer/disGoodsAddCustomer?disGoodsId=' + this.data.disGoodsId + '&disId=' + this.data.disId,
    })

  },




  onPageScroll: function (e) {
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

  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  }


})
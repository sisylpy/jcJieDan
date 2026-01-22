var app = getApp();

import {
  disGetDisGoodsListByFatherId,
  saveSupplierGoods,
  saveShelfGoods,
  saveAutoPurchase,
}
from '../../../../lib/apiDistributer'

import apiUrl from '../../../../config.js'

var load = require('../../../../lib/load.js');

Page({

  /**
   * 页面的初始数据
   */
  data: {
    // winHeight: "",//窗口高度
    currentTab: 0, //预设当前项的值
    scrollLeft: 0, //tab标题的滚动条位置
    fatherId: null,
    hide: false,
    scrollTop: 0,
    choiceAll: false,

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
      fatherId: options.fatherId,
      supplierId: options.supplierId,
      ids: [],
    })

    var value = wx.getStorageSync('userInfo');
    if (value) {
      this.setData({
        disId: value.nxDistributerEntity.nxDistributerId,
        userInfo: value
      })
    }

    var setType = wx.getStorageSync('goodsSetType');
    if (setType) {
      this.setData({
        setType: setType,
      })
      if (setType == 'shelf') {
        var shelfItem = wx.getStorageSync('shelfItem');
        if (shelfItem) {
          this.setData({
            shelfItem: shelfItem,
            shelfId: shelfItem.nxDistributerGoodsShelfId,
          })
        }
      }
    }

    var supplier = wx.getStorageSync('supplierItem');
    if (supplier) {
      this.setData({
        supplierItem: supplier,
        supplierId: supplier.nxJrdhSupplierId
      })
    }

    this._getInitData();
  },


  _getInitData() {

    var data = {
      fatherId: this.data.fatherId,
      disId: this.data.disId
    }
    disGetDisGoodsListByFatherId(data).then(res => {
      if (res.result.code == 0) {
        this.setData({
          goodsList: res.result.data,
        })
      }
    })

  },

  choiceGoods(e) {
    console.log(e);
    var id = e.currentTarget.dataset.id;
    var ids = this.data.ids;
    if (ids.includes(id)) {
      ids = ids.filter(item => item !== id);
      console.log(ids);
      this.setData({
        ids: ids,
      })
    } else {
      ids.push(id);
      this.setData({
        ids: ids,
      })
      console.log(ids);
    }
  },

  choiceAll() {
    var choiceAll = this.data.choiceAll;
    console.log("choiceall" , this.data.choiceAll);
    if (choiceAll) {
      this.setData({
        choiceAll: false,
      })

      var goodsList = this.data.goodsList;
      for (var i = 0; i < goodsList.length; i++) {
        if (this.data.setType == 'supplier') {
          var data = "goodsList[" + i + "].nxDgSupplierId";
          this.setData({
            [data]: null,
          })
        } else {
          var data = "goodsList[" + i + "].isDownload";
          this.setData({
            [data]: null,
          })
        }

      }


      this.setData({
        ids: [],
      })

    } else {
      this.setData({
        choiceAll: true,
      })

      var goodsList = this.data.goodsList;
      var temp = [];
      for (var i = 0; i < goodsList.length; i++) {
        if (this.data.setType == 'supplier') {
          var data = "goodsList[" + i + "].nxDgSupplierId";
          this.setData({
            [data]: this.data.supplierId,
          })
        } else {
          console.log("good.lsit", goodsList[i].isDownload)
          var data = "goodsList[" + i + "].isDownload";
          this.setData({
            [data]: true,
          })
        }

        var id = this.data.goodsList[i].nxDistributerGoodsId;
        temp.push(id);
      }
      this.setData({
        ids: temp,
      })
    }
  },

  saveGoods() {

    if (this.data.setType == 'shelf') {
      var data = {
        ids: this.data.ids,
        shelfId: this.data.shelfId,
      }
      console.log("Data", data);
      load.showLoading("保存数据中");
      saveShelfGoods(data).then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          wx.removeStorageSync('shelfItem');
          wx.navigateBack({
            delta: 1
          })
        }
      })

    } else if (this.data.setType == 'supplier') {
      var data = {
        ids: this.data.ids,
        supplierId: this.data.supplierId,
      }

      load.showLoading("保存数据中");
      saveSupplierGoods(data).then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
         
          wx.navigateBack({
            delta: 1
          })
        }
      })
    } else if (this.data.setType == 'autoPurchase') {
      var data = {
        ids: this.data.ids,
        purchaseType: this.data.purchaseType,
      }
      console.log("susur", data);

      load.showLoading("保存数据中");
      saveAutoPurchase(data).then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          wx.navigateBack({
            delta: 1
          })
        }
      })
    }
   
    wx.removeStorageSync('goodsSetType');
  },



  /**
   * 设置商品类型
   */
  setGoodsType(e) {
    var type = parseInt(e.currentTarget.dataset.type); // -1: 出库商品, 1: 采购商品
    var typeName = type === -1 ? '出库商品' : '采购商品';
    this.setData({
      purchaseType: type,
    })
    if (this.data.ids.length === 0) {
      wx.showToast({
        title: '请至少选择一个商品',
        icon: 'none'
      });
      return;
    }

    var that = this;
    wx.showModal({
      title: '确认设置',
      content: `确定要将选中的${this.data.ids.length}个商品设置为"${typeName}"吗？`,
      success: function (res) {
        if (res.confirm) {
          that.saveGoods();

        }
      }
    });
  },




  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  }



})
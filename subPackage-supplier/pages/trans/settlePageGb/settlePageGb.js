var load = require('../../../../lib/load.js');

import {
  disCheckUnPayBillsGb,
  finishPayPurchaseBatchGb
} from '../../../../lib/apiDistributer'


Page({

  

  /**
   * 页面的初始数据
   */
  data: {
    selectArr: []
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
       supplierId: options.supplierId,
    })
  
      var supplier = wx.getStorageSync('supplierItem');
      if(supplier){
        this.setData({
          supplier: supplier
        })
      }
    this._initData();


  },


  _initData() {
    var data = {
      supplierId: this.data.supplierId,
      disId: this.data.disId
    }
    load.showLoading("获取数据")
    disCheckUnPayBillsGb(data)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          console.log(res.result.data);
          this.setData({
            arr: res.result.data.arr,
            total: 0,
            selectArr: [],
          })
        
        }
      })
  },


  openBatchDetail(e) {
    wx.navigateTo({
      url: '../disOrderBatchDetail/disOrderBatchDetail?batchId=' + e.currentTarget.dataset.item.gbDistributerPurchaseBatchId,
    })
  },

  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },


  selectBill(e) {
    var index = e.currentTarget.dataset.index;
    var isSelect = e.detail.value;
    var item = this.data.arr[index];
    var selectArr = this.data.selectArr;

    if (isSelect) {
      selectArr.push(item);
      this.setData({
        selectArr: selectArr
      })
    } else {
      var selectId = this.data.arr[index].nxDistributerPurchaseBatchId;
      selectArr.splice(selectArr.findIndex(item => item.nxDistributerPurchaseBatchId === selectId), 1);
      this.setData({
        selectArr: selectArr
      })
    }
    this._countTotal();
  },

  _countTotal() {
    var selectArr = this.data.selectArr;
    var temp = 0;
    for (var i = 0; i < selectArr.length; i++) {
      var itemTotal = Number(selectArr[i].gbDpbSubtotal);
      temp = temp + itemTotal;
    }
    this.setData({
      total: temp.toFixed(1),
      selAmount: selectArr.length
    })
  },

  settleBills() {
    this.setData({
      isTishi: true,
    })
  },

  cancleSettle() {
    this.setData({
      isTishi: false,
      selAmount: 0,
    })
    this._initData();
  },
  

  settleAccount() {
    var that = this;
    load.showLoading("结算订单");
    finishPayPurchaseBatchGb(this.data.selectArr).then(res => {
      load.hideLoading();
      this.setData({
        isTishi: false,
        selAmount: 0,
        total: ""
      })
      if (res.result.code == 0) {
        var pages = getCurrentPages();
        var prevPage = pages[pages.length - 2]; //上一个页面
        //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
        prevPage.setData({
          update: true
        })
        wx.navigateBack({delta: 1})
        
      }
    })
  },
  

})
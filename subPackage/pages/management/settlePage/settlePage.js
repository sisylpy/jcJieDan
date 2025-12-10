var load = require('../../../../lib/load.js');

import {
  disCheckUnPayBills,
  
} from '../../../../lib/apiDepOrder';
import{
  finishPayPurchaseBatch
}from '../../../../lib/apiDistributer'


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
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
       disId: options.disId,
       supplierId: options.supplierId,
    })
  
    var sellerInfoValue = wx.getStorageSync('userInfo');
    if(sellerInfoValue){
      this.setData({
        userInfo: sellerInfoValue
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
    disCheckUnPayBills(data)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          this.setData({
            arr: res.result.data.arr,
            total: res.result.data.total,
          })
        
        }
      })
  },


  openBatchDetail(e) {
    wx.setStorageSync('batch', e.currentTarget.dataset.item);
    wx.navigateTo({
      url: '../batchDetail/batchDetail',
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
      var itemTotal = Number(selectArr[i].nxDpbSellSubtotal);
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
    finishPayPurchaseBatch(this.data.selectArr).then(res => {
      this.setData({
        isTishi: false,
        selAmount: 0,
        total: ""
      })
      if (res.result.code == 0) {
        this._initData();
      }
    })
  },

})
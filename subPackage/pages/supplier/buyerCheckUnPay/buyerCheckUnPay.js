var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config.js'

import {
  supplierGetPurchaseBatchs,
} from '../../../../lib/apiDepOrder'


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
      url: apiUrl.server,
      disId: options.disId

    })
    

    var sellerInfoValue = wx.getStorageSync('supplierItem');
    if(sellerInfoValue){
      this.setData({
        supplierInfo: sellerInfoValue,
        supplierId: sellerInfoValue.nxJrdhSupplierId
      })
    }

    this._initData();

  },
  toSettlePage(e){
    wx.navigateTo({
      url: '../settlePage/settlePage?disId=' + this.data.disId + '&supplierId=' + this.data.supplierId,
    })
  },

  _initData() {
    var data = {
      disId: this.data.disId,
      supplierId: this.data.supplierId
    }
    load.showLoading("获取数据")
    supplierGetPurchaseBatchs(data)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          this.setData({
            arr: res.result.data
          })
          var arr = res.result.data;
          var temp = "0";
          var count = 0;
          for (var i = 0; i < arr.length; i++) {
            var arrTemp = arr[i].arr;
            for (var j = 0; j < arrTemp.length; j++) {
              var total = arrTemp[j].nxDpbSellSubtotal;
              var type = arrTemp[j].nxDpbPayType;
              var status = arrTemp[j].nxDpbStatus;
              if (total && type == 1 && status == 2) {
                temp = Number(temp) + Number(total);
                temp = temp.toFixed(1);
                count = count + 1;
              }
            }
          }
          this.setData({
            totalSettle: temp,
            count: count
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
    var monthIndex = e.currentTarget.dataset.monthindex;
    var index = e.currentTarget.dataset.index;
    var isSelect = e.detail.value;
    var item = this.data.arr[monthIndex].arr[index];
    var selectArr = this.data.selectArr;

    if (isSelect) {
      selectArr.push(item);
      this.setData({
        selectArr: selectArr
      })
    } else {
      var selectId = this.data.arr[monthIndex].arr[index].nxDistributerPurchaseBatchId;
      selectArr.splice(selectArr.findIndex(item => item.nxDistributerPurchaseBatchId === selectId), 1);
      console.log("item;iddd===" + item.nxDistributerPurchaseBatchId + "ddd=" + selectId);
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


})
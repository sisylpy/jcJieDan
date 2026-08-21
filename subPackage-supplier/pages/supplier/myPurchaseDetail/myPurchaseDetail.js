var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config.js'
import { getDisPurchaseGoodsBatch } from '../../../../lib/apiDepOrder.js'

Page({
  data: {
    batch: null,
    goodsArr: []
  },

  onLoad(options) {
    var globalData = getApp().globalData;
    this.setData({
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      batchId: options.batchId
    });
    this._getInitData();
  },

  _getInitData() {
    load.showLoading("获取订货明细");
    getDisPurchaseGoodsBatch(this.data.batchId).then(res => {
      load.hideLoading();
      if (res.result.code === 0) {
        var batch = res.result.data || {};
        this.setData({
          batch: batch,
          goodsArr: batch.nxDPGEntities || []
        });
      } else {
        wx.showToast({ title: res.result.msg || '获取订单失败', icon: 'none' });
      }
    }).catch(() => {
      load.hideLoading();
      wx.showToast({ title: '请检查网络', icon: 'none' });
    });
  },

  toBack() {
    wx.navigateBack({ delta: 1 });
  }
})

var app = getApp()
var load = require('../../../../lib/load.js');

import {
  disLogin,
  getDisPurchaseGoodsBatchGb,
  nxDisSaveGbPurchaserBatch
} from '../../../../lib/apiDistributer'


Page({

  onShow(){
    this._login();
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const globalData = app.globalData;

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      batchId: options.batchId     
    })

  },

  _login() {
    var that = this;
    // 首次登录
    wx.login({
      success(res) {
        console.log(res);
        if (res.code) {
          var disUser = {
            nxDiuCode: res.code,
          }
          disLogin(disUser)
            .then(res => {
              if (res.result.code !== -1) {
                console.log(res.result)
                //缓存用户信息
                wx.setStorageSync('userInfo', res.result.data.userInfo);
                wx.setStorageSync('disInfo', res.result.data.disInfo);
                that.setData({
                  userInfo: res.result.data.userInfo,
                  disInfo: res.result.data.disInfo,
                  disId: res.result.data.disInfo.nxDistributerId,
                })
                that._getInitData();
              } else {
                console.log("faileler")
                wx.navigateTo({
                  url: '../inviteCode/inviteCode',
                })
              }
            })
        }
      }
    })
    //login finish
  },


  _getInitData() {
    var that = this;
    load.showLoading("获取订货商品")
    getDisPurchaseGoodsBatchGb(this.data.batchId)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          this.setData({
            batch: res.result.data,
            batchStatus: res.result.data.gbDpbStatus,
          })
        } else {
          this.setData({
            billCancle: true,
          })
        }
      })
  },


  saveOrder(){
    var data = {
      batchId: this.data.batchId,
      nxDisId: this.data.disId
    }
    load.showLoading("转到订单")
    nxDisSaveGbPurchaserBatch(data).then(res =>{
      load.hideLoading();
      if(res.result.code == 0){
        wx.switchTab({
          url: '../../../../pages/order/index/index',
        })
      }
    })
  },

  toBack() {
    wx.switchTab({
      url: '../../../../pages/order/index/index',
    })
  },



 

})
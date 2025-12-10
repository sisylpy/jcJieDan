var load = require('../../../lib/load.js');
import {
  disGetToPlanPurchaseGoodsSearch
} from '../../../lib/apiDepOrder'


Page({



  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const globalData = getApp().globalData;
   
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      searchArr: [],
    })

    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
        disId: userInfo.nxDiuDistributerId,
        deviceId: userInfo.nxDiuPrintDeviceId,
        disInfo: userInfo.nxDistributerEntity,
      })
    }
    

  },

 
  stopSearch() {
    this.setData({
      isSearching: false,
      searchStr: "",
      searchArr: [],
    })

  },
  getSearchString(e) {
    var data = {
      disId: this.data.disId,
      searchStr: e.detail.value
    }
    console.log(e.detail.value);
    disGetToPlanPurchaseGoodsSearch(data)
      .then(res => {
        console.log(res.result.data);
        if (res.result.code == 0) {
          load.hideLoading();
          this.setData({
            searchArr: res.result.data
          })

        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: "none"
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
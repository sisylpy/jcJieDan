var load = require('../../../../lib/load.js');
import {
  disGetToPlanPurchaseGoodsSearch
} from '../../../../lib/apiDepOrder'


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
    const searchValue = e.detail.value;
    this.setData({
      searchStr: searchValue
    });

    if (!searchValue || searchValue.trim() === '') {
      this.setData({
        searchArr: []
      });
      return;
    }

    var data = {
      disId: this.data.disId,
      searchStr: searchValue
    }
    console.log(searchValue);
    load.showLoading("搜索中");
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
      .catch(err => {
        load.hideLoading();
        console.error('搜索失败:', err);
        wx.showToast({
          title: '搜索失败，请重试',
          icon: "none"
        })
      })

  },



  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  }




})
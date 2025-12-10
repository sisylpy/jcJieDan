var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config.js'

import {
  
  queryDisGoodsAndNxGoodsByQuickSearch,
  disUpdateBuyingPrice,
 
} from '../../../../lib/apiDistributer'
const viewBarHeight = 70;

Page({
  onShow(){
    if(this.data.update){
      this._searchGoods();
    }
  },

  data: {
   update: false,
    
  },

  onLoad(options) {
    const app = getApp();
    const globalData = app.globalData;

    var barHeight = 90;
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      viewBarHeight: barHeight * globalData.rpxR,
      url: apiUrl.server,
    })
   
    var value = wx.getStorageSync('userInfo');
    if (value) {
      this.setData({
        disId: value.nxDistributerEntity.nxDistributerId,
        userInfo: value,
        disInfo: value.nxDistributerEntity
      })
     
    } 
  },



  isInputing(e) {
    if (e.detail.value.length == 0) {
      this.setData({
        nxArr: [],
        strArr: [],
      })
    }
  },

  beginSearch() {
    this.setData({
      isSearching: true,
    })

  },

  stopSearch() {
    this.setData({
      isSearching: false,
      searchStr: "",
      strArr: [],
      nxArr: [],
    })
  },

  getSearchString(e) {
    if (e.detail.value.length > 0) {
      this.setData({
        searchStr: e.detail.value
      })
      this._searchGoods();

    } else {
      this.setData({
        strArr: [],
        nxArr: [],
      })
    }

  },

  _searchGoods() {
    var data = {
      disId: this.data.disId,
      searchStr: this.data.searchStr
    }
    load.showLoading("商品搜索中")
    queryDisGoodsAndNxGoodsByQuickSearch(data).then(res => {
      load.hideLoading();
      console.log(res.result.data);
      if (res.result.code == 0) {
        this.setData({
          strArr: res.result.data.disArr,
          nxArr: res.result.data.nxArr,
        })

      }
    })

  },



  /**
   * 修改售价
   * @param {修改商品 id} e 
   */
  showIsPurchase(e) {
    var item = e.currentTarget.dataset.item;
    if (this.data.disInfo.nxDistributerType == 1) {
      this.setData({
        goodsIndex: e.currentTarget.dataset.index,
        showBuyingPrice: true,
        item: item,
      })
    } else if (this.data.disInfo.nxDistributerType == 1) {
      this.setData({
        goodsIndex: e.currentTarget.dataset.index,
        showIsPurchaseSingle: true,
        item: item,
      })
    } else if (this.data.disInfo.nxDistributerType == 2) {
      var profit = "";
      var willPrice = "";
      var buyingPrice = "";
      var weight = "";
      this.setData({
        goodsIndex: e.currentTarget.dataset.index,
        showIsPurchase: true,
        item: item,

      })
    } else if (this.data.disInfo.nxDistributerType == 1) {
      var profit = "";
      var willPrice = "";
      var buyingPrice = "";
      var weight = "";
      if (e.currentTarget.dataset.level == 1) {
        profit = item.nxDgPriceProfitOne;
        willPrice = item.nxDgWillPriceOne;
        buyingPrice = item.nxDgBuyingPriceOne;
        weight = item.nxDgWillPriceOneWeight;
      }
      if (e.currentTarget.dataset.level == 2) {
        profit = item.nxDgPriceProfitTwo;
        willPrice = item.nxDgWillPriceTwo;
        buyingPrice = item.nxDgBuyingPriceTwo;
        weight = item.nxDgWillPriceTwoWeight;
      }
      if (e.currentTarget.dataset.level == 3) {
        profit = item.nxDgPriceProfitThree;
        willPrice = item.nxDgWillPriceThree;
        buyingPrice = item.nxDgBuyingPriceThree;
        weight = item.nxDgWillPriceThreeWeight;
      }

      this.setData({
        goodsIndex: e.currentTarget.dataset.index,
        showIsPurchaseSingle: true,
        item: item,
        level: e.currentTarget.dataset.level,
        profit: profit,
        willPrice: willPrice,
        buyingPrice: buyingPrice,
        weight: weight
      })
    }

  },

  /**
   * 修改售价接口
   */
  confirm(e) {
    var item = e.detail.item;
    console.log(item);
    item.nxDgWillPriceOneWeight = 0;
    item.nxDgWillPriceTwoWeight = 0;
    item.nxDgWillPriceThreeWeight = 0;

    disUpdateBuyingPrice(item)
      .then(res => {
        if (res.result.code == 0) {
          var data = "strArr[" + this.data.goodsIndex + "]";
          this.setData({
            [data]: item,
          })
        }
      })
  },

  
  /**
   * 打开修改图片页面
   */
  toEditGoodsImage(e) {
    wx.setStorageSync('disGoods', e.currentTarget.dataset.item);
    wx.navigateTo({
      url: '../nxGoodsPicture/nxGoodsPicture?editIndex=' +  e.currentTarget.dataset.index 
      +'&from=search',
    })
  },

  toDetail(e) {
  
    wx.navigateTo({
      url: '../disGoodsPage/disGoodsPage?disGoodsId=' + e.currentTarget.dataset.id + '&goodsName=' + e.currentTarget.dataset.name + '&color=' + e.currentTarget.dataset.color  +'&from=search',
    })

  },

  toBack() {
   wx.navigateBack({delta: 1});
  }
});

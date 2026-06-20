var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config.js'

import {
  
  queryDisGoodsAndNxGoodsByQuickSearch,
  disUpdateBuyingPrice,
 
} from '../../../../lib/apiDistributer'


import { 
  downDisGoods,

}from '../../../lib/apiibook'

let itemWidth = 0;
const viewBarHeight = 70;

Page({
  onShow(){
    if(this.data.update){
      this._searchGoods();
    }
  },

  data: {
    strArr:[],
    nxArr: [],
    tab1IndexSearch: 0,
    itemIndexSearch: 0,
    sliderOffsetSearch: 0,
    sliderOffsetsSearch: [],
    sliderLeftSearch: 0,
   update: false,
   tabsSearch: [{
    id: 0,
    amount: 0,
    words: "我的商品"
  }, {
    id: 1,
    amount: 0,
    words: "下载目录"
  }],
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
    this.clueOffsetSearch();
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
        var depTabCount = "tabsSearch[0].amount";
        var disTabCount = "tabsSearch[1].amount";
        this.setData({
        
          [depTabCount]:  res.result.data.disArr.length,
          [disTabCount] : res.result.data.nxArr.length,
          strArr: res.result.data.disArr,
          nxArr: res.result.data.nxArr,
          itemIndexSearch: 0,
        })

      }
    })

  },

  clueOffsetSearch() {
    var that = this;
    const app = getApp();
    const globalData = app.globalData;

    wx.getSystemInfo({
      success: function (res) {
        itemWidth = Math.ceil(res.windowWidth / 2);
        let tempArr = [];
        for (let i in that.data.tabsSearch) {
          tempArr.push(itemWidth * i);
        }
        // tab 样式初始化
        that.setData({
          sliderOffsetsSearch: tempArr,
          sliderOffsetSearch: tempArr[that.data.tab1IndexSearch],
          sliderLeftSearch: globalData.windowWidth / 8 ,
         
        });
      }
    });
  },

  /**
   * tabItme点击
   */
  onTab1ClickSearch(event) {
    let index = event.currentTarget.dataset.index;
    this.setData({
      sliderOffsetSearch: this.data.sliderOffsetsSearch[index],
      tab1IndexSearch: index,
      itemIndexSearch: index,
      showOperation: false
    })
    this.clueOffsetSearch();
  },

  swiperChangeSearch(event) {
    this.setData({
      sliderOffsetSearch: this.data.sliderOffsetsSearch[event.detail.current],
      tab1IndexSearch: event.detail.current,
      itemIndexSearch: event.detail.current,
    })
   
  },



  /**
   * 保存批发商商品
   * @param {*} e 
   */
  downLoadGoods: function (e) {
  
    this.setData({
      item: e.currentTarget.dataset.item,
    })
    var dg = {
      nxDgDistributerId: this.data.disId,
      nxDgNxGoodsId: this.data.item.nxGoodsId,
      nxDgGoodsName: this.data.item.nxGoodsName,
      nxDgNxFatherId: this.data.fatherId,
      nxDgNxFatherImg: this.data.fatherImg,
      nxDgNxFatherName: this.data.fatherName,
      nxDgGoodsDetail: this.data.item.nxGoodsDetail,
      nxDgGoodsPlace: this.data.item.nxGoodsPlace,
      nxDgGoodsBrand: this.data.item.nxGoodsBrand,
      nxDgGoodsStandardname: this.data.item.nxGoodsStandardname,
      nxDgGoodsStandardWeight: this.data.item.nxGoodsStandardWeight,
      nxDgGoodsPinyin: this.data.item.nxGoodsPinyin,
      nxDgGoodsPy: this.data.item.nxGoodsPy,
      nxDgPullOff: 0,
      nxDgGoodsStatus: 0,
      nxDgNxGoodsFatherColor: this.data.color,
      nxStandardEntities: this.data.item.nxGoodsStandardEntities,
      nxAliasEntities: this.data.item.nxAliasEntities,
      nxDgPurchaseAuto: 1,
    };

    load.showLoading("保存商品")
    downDisGoods(dg)
      .then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          this._searchGoods();
       
       
        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
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
    // if (e.currentTarget.dataset.level == 3) {
    //   profit = item.nxDgPriceProfitThree;
    //   willPrice = item.nxDgWillPriceThree;
    //   buyingPrice = item.nxDgBuyingPriceThree;
    //   weight = item.nxDgWillPriceThreeWeight;
    // }

    this.setData({
      goodsIndex: e.currentTarget.dataset.index,
      showIsPurchase: true,
      item: item,
      level: e.currentTarget.dataset.level,
      profit: profit,
      willPrice: willPrice,
      buyingPrice: buyingPrice,
      weight: weight
    })

},


delPrice(e){

  var item = e.detail.item;
  console.log(item);
  if(this.data.level == "1"){
    item.nxDgBuyingPriceOne = null;
    item.nxDgBuyingPrice = "0.1";
    item.nxDgWillPriceOne = null;
    item.nxDgWillPriceOneAboutPrice = null;

  }else if(this.data.level == "2"){
    console.log("lev2222222")
    
    item.nxDgBuyingPriceTwo = null;
    item.nxDgWillPriceTwo = null;
    item.nxDgWillPriceTwoAboutPrice = null;
    item.nxDgWillPriceTwoStandard = null;
    item.nxDgWillPriceTwoWeight = null;
  }
  
  disUpdateBuyingPrice(item)
    .then(res => {
      if (res.result.code == 0) {
       this._searchGoods();
      }
    })

},

  /**
   * 修改售价接口
   */
  confirm(e) {
    var item = e.detail.item;
    console.log(item);
    disUpdateBuyingPrice(item)
      .then(res => {
        if (res.result.code == 0) {
          this._searchGoods();
        }
      })
  },

  cancleIsPurchase(){
    this.getTabBar().setData({
      showTabBar: true
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

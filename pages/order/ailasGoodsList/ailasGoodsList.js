var app = getApp();

import apiUrl from '../../../config.js'
var load = require('../../../lib/load.js');

import {
  queryLinshiGoodsAndNxGoodsByQuickSearch,
  helpSaveLinshi,
  disSaveDepGoodsName,
  saveDisAlias
}
from '../../../lib/apiDistributer'


import { 
  downDisGoods,

}from '../../../lib/apiibook'


let itemWidth = 0;

Page({
  data:{
    strArr:[],
    nxArr: [],
    tab1IndexSearch: 0,
    itemIndexSearch: 0,
    sliderOffsetSearch: 0,
    sliderOffsetsSearch: [],
    sliderLeftSearch: 0,
    tabsSearch: [{
      id: 0,
      amount: 0,
      words: "我的商品"
    }, {
      id: 1,
      amount: 0,
      words: "下载目录"
    }],
    isSearching: true,
    searchResult: false,
    placeHolder: "输入商品名称或拼音字母、首字母",
  },


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const globalData = getApp().globalData;

    var value = wx.getStorageSync('userInfo');
    if (value) {
      this.setData({
        disId: value.nxDistributerEntity.nxDistributerId,
        userInfo: value,
      })
    }

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      name: options.name,
      standard: options.standard,
      searchStr: options.name,
      standard: options.standard,
      depId: options.depId,
    })
   
    this.clueOffsetSearch();
    this.beginSearchGoodsWithStr();
  },

  helpAdd(){
    helpSaveLinshi(this.data.linshiId).then(res =>{
      if(res.result.code == 0){
        wx.navigateBack({delta: 1})
      }
    })
  },  


  
  // !!!!!!!!!!!!!!!!!!!search--------------------------------------
  /**
   * 计算偏移量
   */
  clueOffsetSearch() {
    var that = this;

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



  toChoice(e){
    var data = {
      depId: this.data.depId,
      goodsName: this.data.name,
      disGoodsId: e.currentTarget.dataset.id,
    }
    disSaveDepGoodsName(data).then(res =>{
      if(res.result.code == 0){
        var pages = getCurrentPages();
        var prevPage = pages[pages.length - 2]; //上一个页面
        prevPage.setData({
          goodsId: e.currentTarget.dataset.id,
          findGoods: true,
          name: e.currentTarget.dataset.name,
        })
    
        wx.navigateBack({
          delta: 1,
        })

      }
    })
   
   
  },

  toChoiceOnly(e){
    var pages = getCurrentPages();
    var prevPage = pages[pages.length - 2]; //上一个页面
    prevPage.setData({
      goodsId: e.currentTarget.dataset.id,
      findGoods: true,
      name: e.currentTarget.dataset.name,
    })

    wx.navigateBack({
      delta: 1,
    })
   
   
  },


  addAlias(e){
    console.log("savealisas");

    this.setData({
      goods: e.currentTarget.dataset.item
    })
    var data = {
      nxDaDisGoodsId: e.currentTarget.dataset.id,
      nxDaAliasName: this.data.name,
    }
    saveDisAlias(data).then(res => {
      console.log("savealisas");
      if (res.result.code == 0) {
        var pages = getCurrentPages();
        var prevPage = pages[pages.length - 2]; //上一个页面
        prevPage.setData({
          goodsId: this.data.goods.nxDistributerGoodsId,
          findGoods: true,
          name: this.data.goods.nxDgGoodsName,
        })

        wx.navigateBack({
          delta: 1,
        })
      } else {
        load.hideLoading();
        wx.showToast({
          title: '获取商品失败',
          icon: 'none'
        })
      }
    })
  },

 

  _searchGoods(e) {
    this.setData({
      searchStr: e.detail.value
    })
    var data = {
      disId: this.data.disId,
      searchStr: e.detail.value
    }
    load.showLoading("商品搜索中")
    queryLinshiGoodsAndNxGoodsByQuickSearch(data).then(res => {
      load.hideLoading();
      console.log(res.result.data);
      if (res.result.code == 0) {
        var depTabCount = "tabsSearch[0].amount";
        var disTabCount = "tabsSearch[1].amount";
        this.setData({
          [depTabCount]:  res.result.data.disArr.length,
          [disTabCount] : res.result.data.nxArr.length,
          strArr: res.result.data.disArr,
          nxArr: res.result.data.nxArr,
        })

      }
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
          this.searchGoodsWithStr();
          var pages = getCurrentPages();
        var prevPage = pages[pages.length - 3]; //上一个页面
        //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
        prevPage.setData({
          update: true,
          isFirstLoad: true
        })
       
        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
      })
  },


  searchGoodsWithStr(e) {
  
    var data = {
      disId: this.data.disId,
      searchStr: this.data.searchStr
    }
    load.showLoading("商品搜索中")
    queryLinshiGoodsAndNxGoodsByQuickSearch(data).then(res => {
      load.hideLoading();
      console.log(res.result.data);
      if (res.result.code == 0) {
        var depTabCount = "tabsSearch[0].amount";
        var disTabCount = "tabsSearch[1].amount";
        if(res.result.data.disArr.length > 0){
          
        }
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
    beginSearchGoodsWithStr(e) {
  
    var data = {
      disId: this.data.disId,
      searchStr: this.data.searchStr
    }
    load.showLoading("商品搜索中")
    queryLinshiGoodsAndNxGoodsByQuickSearch(data).then(res => {
      load.hideLoading();
      console.log(res.result.data);
      if (res.result.code == 0) {
        var depTabCount = "tabsSearch[0].amount";
        var disTabCount = "tabsSearch[1].amount";
        if(res.result.data.disArr.length > 0){
          
        }
        this.setData({
          [depTabCount]:  res.result.data.disArr.length,
          [disTabCount] : res.result.data.nxArr.length,
          strArr: res.result.data.disArr,
          nxArr: res.result.data.nxArr,
          
        })
        if(res.result.data.disArr.length == 0){
          this.setData({
            itemIndexSearch: 1
          })
        }
        
      }
    })

  },
  toBack() {
   
    wx.navigateBack({
      delta: 1,
    })
  },
  

  
  toAddGoods(e){ 
    wx.navigateTo({
      url: '../../../subPackage/pages/goods/disAddGoodsLinshi/disAddGoodsLinshi?goodsName=' + this.data.name + '&from=paste' + '&standard=' + this.data.standard ,
    })
  },

})
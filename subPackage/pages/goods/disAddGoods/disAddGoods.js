var app = getApp();
var dateUtils = require('../../../../utils/dateUtil');
import {
  disSaveSelfGoods,
  
} from '../../../../lib/apiDistributer'

import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');

Page({


  onShow() {

  },

  /**
   * 页面的初始数据
   */
  data: {

    canSave: false,

  },


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const globalData = app.globalData;

    var disInfoValue = wx.getStorageSync('disInfo');
    this.setData({
      disInfo: disInfoValue,
      disId: disInfoValue.nxDistributerId
    })
    var linshiGoods = wx.getStorageSync('linshiGoods');
    if(linshiGoods){
      this.setData({
        linshiGoods: linshiGoods
      })
    }

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
    
      goods: {
        nxDgDfgGoodsGrandId: null,
        nxDgNxGoodsId: options.id,
        nxDgPullOff: 0,
        nxDgGoodsStatus: 1,
        nxDgBuyingPriceIsGrade: 0,
        nxDgBuyingPrice: "0.1",
        nxDgBuyingPriceUpdate: dateUtils.getArriveDate(0),
        nxDgDistributerId: this.data.disId,
        nxDgGoodsName: options.name, 
        nxDgGoodsStandardname:  linshiGoods.nxDgGoodsStandardname,
        nxDgGoodsSort: -1,
        nxDgGoodsStandardWeight: linshiGoods.nxDgGoodsStandardWeight,
        nxDgGoodsBrand: linshiGoods.nxDgGoodsBrand,
        nxDgGoodsPlace: linshiGoods.nxDgGoodsPlace,
        nxDgGoodsDetail: linshiGoods.nxDgGoodsDetail,
        // nxDgGoodsInventoryType: 1,
        // nxDgNxGoodsFatherColor: "#20afb8",
        nxDgGoodsFile: 'goodsImage/logo.jpg',
        nxDistributerStandardEntities: []
      },
      fatherName: "",
      isGrade: 0,
    })

    if(options.standard){
      var data = "";
      this.setData({
       [data]: options.standard,
      //  canSave: true,
      })
    }else{
      this.setData({
        [data]: "",
       
      })
    }
  },

  
  toGreatGrandGoods() {
    console.log("toGreatGrandGoods")
    wx.navigateTo({
      url:'../disAddGoods/greatGrandGoods/greatGrandGoods?disId=' + this.data.disId

    })
  },


  radioChange(e) {
    console.log(e.detail.value);
    var gradeData = "goods.nxDgBuyingPriceIsGrade"
    this.setData({
      [gradeData]: e.detail.value,
      isGrade: e.detail.value
    })
    this._ifCanSave();
  },

  getBuyingPrice(e) {
    var gradeData = "goods.nxDgBuyingPriceIsGrade";
    var priceData = "goods.nxDgBuyingPrice";
    var priceUpdateData = "goods.nxDgBuyingPriceUpdate";
    var priceOneData = "goods.nxDgBuyingPriceOne";
    var priceOneUpdateData = "goods.nxDgBuyingPriceOneUpdate";
    var priceTwoData = "goods.nxDgBuyingPriceTwo";
    var priceTwoUpdateData = "goods.nxDgBuyingPriceTwoUpdate";
    var priceThreeData = "goods.nxDgBuyingPriceThree";
    var priceThreeUpdateData = "goods.nxDgBuyingPriceThreeUpdate";

    var type = e.currentTarget.dataset.type;
    if (type == 0) {
      this.setData({
        [gradeData]: 0,
        [priceData]: e.detail.value,
        [priceUpdateData]: this.data.upTime,
        [priceOneData]: null,
        [priceTwoData]: null,
        [priceThreeData]: null,
        [priceOneUpdateData]: null,
        [priceTwoUpdateData]: null,
        [priceThreeUpdateData]: null,

      })
    }
    if (type == 1) {
      this.setData({
        [gradeData]: 1,
        [priceData]: null,
        [priceUpdateData]: null,
        [priceOneData]: e.detail.value,
        [priceOneUpdateData]: this.data.upTime,
      })
    }
    if (type == 2) {
      this.setData({
        [gradeData]: 1,
        [priceData]: null,
        [priceTwoData]: e.detail.value,
        [priceTwoUpdateData]: this.data.upTime,
      })
    }
    if (type == 3) {
      this.setData({
        [gradeData]: 1,
        [priceData]: null,
        [priceThreeData]: e.detail.value,
        [priceThreeUpdateData]: this.data.upTime,
      })
    }
    this._ifCanSave();

  },

  getDisGoodsContent(e) {
    var nameData = "goods.nxDgGoodsName";
    var standardData = "goods.nxDgGoodsStandardname";
    var standardWeightData = "goods.nxDgGoodsStandardWeight";
    var brandData = "goods.nxDgGoodsBrand";
    var placeData = "goods.nxDgGoodsPlace";
    var detailData = "goods.nxDgGoodsDetail";


    if (e.currentTarget.dataset.type == 0) {
      this.setData({
        name: e.detail.value,
        [nameData]: e.detail.value
      })
    }
    if (e.currentTarget.dataset.type == 1) {
      this.setData({
        standard: e.detail.value,
        [standardData]: e.detail.value
      })
    }
    if (e.currentTarget.dataset.type == 2) {
      this.setData({
        [standardWeightData]: e.detail.value
      })
    }
    if (e.currentTarget.dataset.type == 3) {
      this.setData({
        [brandData]: e.detail.value
      })
    }
    if (e.currentTarget.dataset.type == 4) {
      this.setData({
        [placeData]: e.detail.value
      })
    }

    if (e.currentTarget.dataset.type == 5) {
      this.setData({
        [detailData]: e.detail.value
      })
    }

    this._ifCanSave();


  },

  _ifCanSave() {
    console.log("_ifCanSave")
    if (this.data.isGrade == 0) {
      if (this.data.goods.nxDgGoodsName != null && this.data.goods.nxDgGoodsName.length > 0 && this.data.standard != null && this.data.standard.length > 0 && this.data.fatherName != null && this.data.goods.nxDgBuyingPrice > 0) {
        this.setData({
          canSave: true
        })
      } else {
        this.setData({
          canSave: false
        })
      }
    }
    if (this.data.isGrade == 1) {
      if (this.data.name != null && this.data.standard != null && this.data.fatherName != null && this.data.goods.nxDgBuyingPriceOne > 0 &&
        this.data.goods.nxDgBuyingPriceTwo > 0 && this.data.goods.nxDgBuyingPriceThree > 0) {
        this.setData({
          canSave: true
        })
      } else {
        this.setData({
          canSave: false
        })
      }
    }
  },


  saveDisGoods() {
    if (this.data.canSave) {
      load.showLoading("保存商品")
      disSaveSelfGoods(this.data.goods).then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
        
          wx.navigateBack({
            delta: 2,
          })

        } else {       
          wx.showModal({
            title: '保存失败',
            content: res.result.msg,
            showCancel: false,
            confirmText: "知道了", //默认是“确定”
            confirmColor: 'blac'
            
          })
        }
      })
    } else {
      wx.showToast({
        title: '请填写必填项',
        icon: 'none'
      })
    }

  },
  
  
  hideMask(){
    this.setData({
      showTishi: false
    })
  },

  orderGoods(e){
    var item = e.currentTarget.dataset.item;
    var pages = getCurrentPages();
    var prevPage = pages[pages.length - 2]; //上一个页面
    prevPage.setData({
      itemDis: item,
      show: true,
      applyStandardName: item.nxDgGoodsStandardname,
    })

    wx.navigateBack({
      delta: 1,
    })
  
  },






  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },









})
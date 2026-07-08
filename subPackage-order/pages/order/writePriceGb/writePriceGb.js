const innerAudioContext = wx.createInnerAudioContext();
const app = getApp()
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil')

import {
  getOrderPageGb,
  phoneGetToFillDepOrdersGb,
  getGbPurGoods
} from '../../../../lib/apiDepOrder.js'

import {
  nxDisSavePurGoodsPrice,
} from '../../../../lib/apiDistributer.js'


Page({

  data: {
    hide: false,
    scrollTop: 0,
    depArr: [],
    edit: false,
  },

  onLoad: function (options) {
    const globalData = getApp().globalData;
    var todayDate = dateUtils.getWhichFullDate(0);
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      depFatherId: options.depFatherId,
      gbDepFatherId: options.gbDepFatherId,
      name: options.name,
      todayDate: todayDate,
      depHasSubs: options.depHasSubs,
      focusIndex: -1,
      focusParentIndex: -1,
    })

    var disValue = wx.getStorageSync('disInfo');
    if (disValue) {
      this.setData({
        disInfo: disValue,
        nxDisId: disValue.nxDistributerId
      })
    }

    // 获取初始数据
    this._initData();


    // 监听播放回调  
    innerAudioContext.onPlay(() => {
      console.log('原音开始播放aaaa');
    })

    innerAudioContext.onStop(() => {
      console.log('原音播放停止');
    })
    innerAudioContext.onEnded(() => {
      console.log('原音播放结束');
    })
    innerAudioContext.onError((res) => {
      console.log(res)
    })
  },

  _initDataWithOutFocus(){
    var data = {
      depFatherId: this.data.depFatherId,
      gbDepFatherId: this.data.gbDepFatherId,
    }
    load.showLoading("获取订单中")
    getOrderPageGb(data)
      .then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          this.setData({
            applyArr: res.result.data,
            focusParentIndex: -1,
            focusIndex: -1,
          })
        }else{
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
       
      })
  },

  _initData() {
  

    var data = {
      depFatherId: this.data.depFatherId,
      gbDepFatherId: this.data.gbDepFatherId,
      disId: this.data.nxDisId
    }
    phoneGetToFillDepOrdersGb(data)
      .then(res => {
        console.log("printdata", res.result.data);
        if (res.result.code == 0) {
          load.hideLoading();
          this.setData({
            tradeNo: res.result.data.tradeNo,
            total: res.result.data.total,
            totalHanzi: res.result.data.totalHanzi,
            finishCount: res.result.data.finishCount,
            totalCount: res.result.data.totalCount,
            hasPriceCount: res.result.data.hasPriceCount,
            hasWeightCount: res.result.data.hasWeightCount,
          })
          if (this.data.depHasSubs > 0) {
            this.setData({
              depArr: res.result.data.arr,

            })
          } else {
            this.setData({
              applyArr: res.result.data.arr,
            })
          }

        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })
        }

      })



  },



  _autoFillPrice() {
    if (this.data.depArr.length > 0) {

    } else {
      var applyArr = this.data.applyArr;
      if (applyArr.length > 0) {
        for (var i = 0; i < applyArr.length; i++) {
          var historyPrice = applyArr[i].nxDepartmentDisGoodsEntity.nxDdgOrderPrice;
          if (historyPrice !== null && historyPrice > 0) {
            var orderPrice = "applyArr[" + i + "].nxDoPrice";
            this.setData({
              [orderPrice]: historyPrice
            })
          }
        }
      }
    }
  },



  _savePriceOrder(e) {
    var itemOrder = this.data.applyArr[this.data.focusIndex];
    var itemOrderPrice = this.data.applyArr[this.data.focusIndex].nxDoPrice;
    if (itemOrderPrice !== null && itemOrderPrice > 0) {
      var data = {
        orderId: itemOrder.nxDepartmentOrdersId,
        price: itemOrderPrice
      }
      giveOrderPrice(data).then(res => {
        if (res.result.code == 0) {
          this.setData({
            focusIndex: -1,
            focusParentIndex: -1,
          })
          this._initDataWithOutFocus()
        }
      })
    
    }
  },


  _updatePriceOrder(e) {
    var itemOrder = this.data.applyArr[this.data.focusIndex];
    var itemOrderPrice = this.data.applyArr[this.data.focusIndex].nxDoPrice;
    if (itemOrderPrice !== null && itemOrderPrice > 0) {
      var data = {
        orderId: itemOrder.nxDepartmentOrdersId,
        price: itemOrderPrice
      }
      updateOrderPrice(data).then(res => {
        if (res.result.code == 0) {
         
          this._initDataWithOutFocus()
        }
      })
    
    }
  },

  changeFocusIndexPrice(e) {
    if (this.data.focusIndex !== -1) {
      var itemPrice = this.data.applyArr[this.data.focusIndex].nxDoPrice;
      console.log(itemPrice);
      if (itemPrice !== null && itemPrice > 0) {
        this._save();
      }
    }
    this.setData({
      orderIndex: e.currentTarget.dataset.index,
      focusIndex: e.currentTarget.dataset.index,
      lastInput: false,
    })
    this._checkEdit(e);


    //如果是多部门
  
  },



  onPageScroll: function (e) {
    var _this = this;
    if (e.scrollTop <= 0) {
      e.scrollTop = 0;
    } else if (e.scrollTop > wx.getSystemInfoSync().windowHeight) {
      e.scrollTop = wx.getSystemInfoSync().windowHeight;
    }

    if (e.scrollTop > this.data.scrollTop || e.scrollTop == wx.getSystemInfoSync().windowHeight) {
      this.setData({
        hide: true
      })
    } else {
      this.setData({
        hide: false
      })
    }
    setTimeout(function () {
      _this.setData({
        scrollTop: e.scrollTop
      })
    }, 0)
  },

  quickPrice(e) {
    if (this.data.applyArr[this.data.focusIndex].nxDoPrice !== null) {
      this._save();
    }

    var index = e.currentTarget.dataset.index;
    var orderData = this.data.applyArr[index].nxDepartmentDisGoodsEntity.nxDdgOrderPrice;
    var orderPrice = "applyArr[" + index + "].nxDoPrice";
    this.setData({
      focusIndex: index,
      [orderPrice]: orderData,
      orderIndex: index,
    })
    this._save();
    this._checkEdit(e);
  },



  _checkNextEdit(){
    var oIndex = this.data.focusIndex;
    var price = this.data.applyArr[oIndex].nxDoPrice;
    if(price !== null && price > 0){
      this.setData({
        edit: true
      })
    }else{
      this.setData({
        edit: false
      })
    }
  },

  _checkEdit(e){
    var oIndex = e.currentTarget.dataset.index;
    var price = this.data.applyArr[oIndex].nxDoPrice;
    console.log("checkEdit", price)
    if(price !== null && price > 0){
      console.log("editidididiididididiididi")
      this.setData({
        edit: true
      })
    }else{
      this.setData({
        edit: false
      })
    }
  },

  _save(){
    console.log("SaveEdit ====", this.data.edit);
    if(this.data.edit){
     this._updatePriceOrder();
    }else{
      this._savePriceOrder();
    }
  },


  toGoodsDetail(e){
    console.log(e)
    var goods = e.currentTarget.dataset.item;
    wx.setStorageSync('disGoods', goods)
    wx.navigateTo({
      url: '../../goods/disGoodsPage/disGoodsPage?disGoodsId=' + goods.nxDistributerGoodsId + '&goodsName=' + goods.nxDgGoodsName + '&type=order',
    })
  },


  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },



  toInputOrder(e) {
    this.setData({
      focusIndex:  e.currentTarget.dataset.index,
    })
    var id = e.currentTarget.dataset.id;
    getGbPurGoods(id).then(res =>{
      if(res.result.code == 0){
            var item  = res.result.data;
        this.setData({
          showOperationGoods: false,
          show: true,
          item: item,
        })
    
      }
    })
    
  },


  toInputOrderDep(e) {
    console.log(e);
    this.setData({
      focusParentIndex: e.currentTarget.dataset.fatherindex,
      focusIndex:  e.currentTarget.dataset.index,
    })
    var id = e.currentTarget.dataset.id;
    load.showLoading("保存数据中");
    getGbPurGoods(id).then(res =>{
      if(res.result.code == 0){
        load.hideLoading();
          var item  = res.result.data;
        this.setData({
          showOperationGoods: false,
          show: true,
          item: item,
          windowHeight: this.data.windowHeight,
        })
    
      }
    })
    
  },

  confirm(e) {
    console.log(e);
    var item = e.detail.item;
    item.gbDpgPurchaseDepartmentId = this.data.toDepId;
    load.showLoading("保存数据中");
      nxDisSavePurGoodsPrice(item).then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          this.setData({
            show: false,
            item: "",
            focusParentIndex: -1,
            focusIndex: -1,
          })
          this._initData();
        }
      })
  },




})
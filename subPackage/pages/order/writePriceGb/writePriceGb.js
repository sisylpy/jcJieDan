const innerAudioContext = wx.createInnerAudioContext();
const app = getApp()
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil')

import {
  getHaveWeightDepOrders,
  giveOrderPrice
} from '../../../../lib/apiDepOrder.js'

import {
  
  updateOrderPrice,
} from '../../../../lib/apiDistributer.js'
Page({

  data: {
    hide: false,
    scrollTop: 0,
    depArr: [],
    edit: false,
  },

  onLoad: function (options) {
    const globalData = app.globalData;

    var todayDate = dateUtils.getWhichFullDate(0);
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      depFatherId: options.depFatherId,
      resFatherId: options.resFatherId,
      gbDepFatherId: options.gbDepFatherId,
      name: options.name,
      todayDate: todayDate,
      depHasSubs: 0
    })

    var disValue = wx.getStorageSync('disInfo');
    if (disValue) {
      this.setData({
        disInfo: disValue,
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
      resFatherId: this.data.resFatherId
    }
    load.showLoading("获取订单中")
    getHaveWeightDepOrders(data)
      .then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          this.setData({
            applyArr: res.result.data,
          })
          // this._checkFocus();
          // this._autoFillPrice();
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
      resFatherId: this.data.resFatherId
    }
    load.showLoading("获取订单中")
    getHaveWeightDepOrders(data)
      .then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          this.setData({
            applyArr: res.result.data,
          })
          this._checkFocus();
          // this._autoFillPrice();
        }else{
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
       
      })
  },

  _checkFocus() {
    var applyArr = this.data.applyArr;
    if (applyArr.length > 0) {
      var isFocuse = false;
      for (var i = 0; i < applyArr.length; i++) {
        var orderPrice = applyArr[i].nxDoPrice;
        if (orderPrice == null) {
          this.setData({
            orderIndex: i,
            focusIndex: i,
            lastInput: false
          })
          isFocuse = true;
          return;
        }
      }
      if (!isFocuse) {
        this.setData({
          orderIndex: -1,
          focusIndex: -1,
          lastInput: true
        })
      }
    }
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



  // ********
  try (data) {
    var value = wx.getStorageSync("num");
    var obj = "";
    for (var i = 0; i < value.length; i++) {
      var id = value[i].id;
      if (data == id) {
        obj = value[i];
      }
    }
    if (obj) {
      innerAudioContext.autoplay = true;
      innerAudioContext.src = obj.filePath;
      innerAudioContext.play();
    }
  },

  //input methos ======
  //1,输入
  inputValue(e) {
    console.log(e);
    var value = e.currentTarget.dataset.value;
      // begin
      //1，输入数字
      if (value <= 9 && value >= 0) {
        var oldValue = this.data.applyArr[this.data.focusIndex].nxDoPrice;
        oldValue = this.data.applyArr[this.data.focusIndex].nxDoPrice;
        var newValue = 0;
        if (oldValue !== null && oldValue !== '-1') {
          newValue = oldValue + value;
        } else {
          newValue = value
        }
        this.setData({
          ["applyArr[" + this.data.focusIndex + "].nxDoPrice"]: newValue,
        })
        this.try(value); // read 数字
        if(this.data.depFatherId == -1){
          this._getProfit();
        }
      } else {

        console.log("点击了非数字")
        //2，输入“dian”
        if (value == ".") {
          oldValue = this.data.applyArr[this.data.focusIndex].nxDoPrice;
          var newValue = 0;
          if (oldValue.indexOf(".") != -1) {
            this.try("tishi");
          } else {
            if (oldValue > 0 && oldValue !== '-1') {
              newValue = oldValue + value;
              this.try("dian") // read 清除
            } else {
              newValue = "0."
              this.try("lingdian") // read 清除
            }
            this.setData({
              ["applyArr[" + this.data.focusIndex + "].nxDoPrice"]: newValue,
            })
          }
          if(this.data.depFatherId == -1){
            this._getProfit();
          }
        }


        //2，输入“删除”
        if (value == "del") {
          oldValue = this.data.applyArr[this.data.focusIndex].nxDoPrice;
          newValue = oldValue.substr(0, oldValue.length - 1);
          if (newValue.length > 0) {
            this.setData({
              ["applyArr[" + this.data.focusIndex + "].nxDoPrice"]: newValue,
            })
          } else {
            this.setData({
              ["applyArr[" + this.data.focusIndex + "].nxDoPrice"]: "",
            })
          }
          this.try("delete") // read 清除
          if(this.data.depFatherId == -1){
            this._getProfit();
          }
        }

        //3，输入“关闭”
        if (value == "close") {
          if (this.data.applyArr[this.data.focusIndex].nxDoPrice !== null) {
            this._save();
          }
          this.setData({
            focusIndex: -1,
            lastInput: true,
          })
          this.try("close"); // read 关闭
         
        }
        //4,输入“下一个”
        if (value == "next") {
          if (this.data.applyArr[this.data.focusIndex].nxDoPrice !== null) {
            this._save();
          }
          var focusIndex = this.data.focusIndex;
          if (focusIndex !== this.data.applyArr.length - 1) {
            this.setData({
              focusIndex: focusIndex + 1,
            })
            this._checkNextEdit();
          } else {
            this.setData({
              focusIndex: -1,
              lastInput: true
            })
          }

          this.try("next"); // read 下一个

        }
      }
      
    
  },

  _getProfit(){
    console.log("getpfrororor");
    var itemOrder = this.data.applyArr[this.data.focusIndex];
    var costPrice = itemOrder.nxDoCostPrice;
    var weight = itemOrder.nxDoWeight;
    var costSutbotal = (Number(costPrice) * Number(weight)).toFixed(1);
    var price = itemOrder.nxDoPrice;
    var subtotal = (Number(price) * Number(weight)).toFixed(1);
    var proft = (Number(subtotal) - Number(costSutbotal)).toFixed(1);
    var data = "applyArr[" + this.data.focusIndex+"].nxDoProfitSubtotal";
    var dataScale = "applyArr[" + this.data.focusIndex+"].nxDoProfitScale";
    var scale = (((Number(price) - Number(costPrice)) / Number(price))* Number(100)).toFixed(1);
    this.setData({
      [data]: proft,
      [dataScale]: scale,
    })
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






})
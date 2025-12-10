var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config.js'
var app = getApp();

import {
 
  nxDisGetPurchaseGoodsGb, // 未采购
  nxDisSavePurGoodsPrice,
  nxDisFinishPurGoods,
  nxDisFinishPurchaseGoodsBatchGb,
  getDisPurchaseGoodsBatchGb,
  supplierEditBatchGb
} from '../../../../lib/apiDistributer'


Page({

  /**
   * 页面的初始数据
   */
  data: {
    focusIndex: -1,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const globalData = app.globalData;


    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      toDepId: options.id,
      name: options.name,
      disId: options.disId,
    
    })
    var disInfo = wx.getStorageSync('disInfo');
    if(disInfo){
      this.setData({
        disInfo: disInfo,
        nxDisId: disInfo.nxDistributerId,
      })
    }
   this._getInitData();

  },



  
  _getInitData() {
    load.showLoading("获取进货商铺")
    var data = {
      disId: this.data.disId,
      nxDisId: this.data.nxDisId
    }
    nxDisGetPurchaseGoodsGb(data)
      .then(res => {
        load.hideLoading();
        console.log(res.result.data)
        if (res.result.code == 0) {
          this.setData({
            purArr: res.result.data,
          })

          // this._countPurGoodsData();
          //创建节点选择器
        } else {
          this.setData({
            purArr: [],
           
          })
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
         
        }
      })
  },
 

  _countPurGoodsData(){
    var arr = this.data.purArr;
    console.log(arr.length);
    // for(var i = 0; i < arr.length; i++){
      // var goodsArr = arr[i].gbDistributerPurchaseGoodsEntities;
      for(var j = 0; j < arr.length; j++){
        console.log( goodsArr.length)
        var status =  goodsArr[j].gbDpgStatus;
        if(status == 1){
          var arrlength = goodsArr[j].gbDepartmentOrdersEntities.length;
          var num = 0;
          var weightTotal = 0;
          var orderArr = goodsArr[j].gbDepartmentOrdersEntities;
          for( var m = 0; m < orderArr.length; m++){
            var orderStatus = orderArr[m].gbDoStatus;
            console.log(orderStatus)
            if(orderStatus == 1){
              num = Number(num) + Number(1);
              var weight = orderArr[m].gbDoWeight;
              weightTotal = Number(weightTotal)  + Number(weight) ;
            }

            if(num == arrlength){
              var weightData = "purArr["+ i +"].gbDistributerPurchaseGoodsEntities["+ j +"].gbDpgBuyQuantity";
              var subtotalData = "purArr["+ i +"].gbDistributerPurchaseGoodsEntities["+ j +"].gbDpgBuySubtotal";
              var price = this.data.purArr[i].gbDistributerPurchaseGoodsEntities[j].gbDpgBuyPrice;
              var subtotal = (Number(price) * Number(weightTotal)).toFixed(1);
              console.log(subtotal)
              this.setData({
                [weightData]: weightTotal,
                [subtotalData]: subtotal
              })
            }

          }
        }
      }
    // }
  },

  noChoicePurchase(e) {
    var fatherIndex = e.currentTarget.dataset.fatherindex;
    var index = e.currentTarget.dataset.index;
    var orderIndex = e.currentTarget.dataset.orderindex;
    var itemChoice = this.data.purArr[index].gbDepartmentOrdersEntities[orderIndex].hasChoice;
    var itemData = "purArr[" + index + "].gbDepartmentOrdersEntities[" + orderIndex + "].hasChoice";
    if (itemChoice) {
      this.setData({
        [itemData]: false
      })
    } else {
      this.setData({
        [itemData]: true
      })
    }
    this._checkSelectedAmount(e);
  },


  _checkSelectedAmount(e) {
    var fatherIndex = e.currentTarget.dataset.fatherindex;
    var index = e.currentTarget.dataset.index;
    var arr = this.data.purArr[index].gbDepartmentOrdersEntities;
    var selectedAmount = 0;
    for (var i = 0; i < arr.length; i++) {
      var itemChoice = this.data.purArr[index].gbDepartmentOrdersEntities[i].hasChoice;
      if (itemChoice) {
        selectedAmount = Number(selectedAmount) + Number(1)
      }
    }
    var itemData = "purArr[" + index + "].isSelected";
    if (selectedAmount == 0) {
      this.setData({
        [itemData]: false
      })
    } else {
      this.setData({
        [itemData]: true
      })
    }
  },


  showInputOrder(e) {
    console.log(e);
    var item = e.currentTarget.dataset.item;
    // item.gbDpgBuyPrice = "";
    if (item.gbDpgBuyScale !== null && item.gbDpgBuyScale > 0) {
      this.setData({
        scaleInput: true,
      })
    }
    this.setData({
      show: true,
      item: item,
      windowHeight: this.data.windowHeight,
    })
  },

  confirm(e) {
    var item = e.detail.item;
    item.gbDpgPurchaseDepartmentId = this.data.toDepId
    console.log(item);
      nxDisSavePurGoodsPrice(item).then(res => {
        if (res.result.code == 0) {
          this.setData({
            show: false,
            item: "",
          })
       
          
          this._getInitData();
        }
      })
  },

  savePurGoods() {
    
    var item = this.data.purArr[this.data.focusIndex];
        console.log(item);
      nxDisSavePurGoodsPrice(item).then(res => {
        if (res.result.code == 0) {
          this.setData({
            show: false,
            item: "",
          })
          this._getInitData();
        }
      })
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
      var oldValue = "";
      oldValue = this.data.purArr[this.data.focusIndex].gbDpgBuyPrice;

      var newValue = 0;
      if (oldValue !== null && oldValue !== '-1') {
        newValue = oldValue + value;
      } else {
        newValue = value
      }
      this.setData({
        ["purArr[" + this.data.focusIndex + "].gbDpgBuyPrice"]: newValue,
        ["item.gbDpgBuyPrice"] : newValue
      })

      this.try(value); // read 数字

    } else {

      console.log("点击了非数字")
      //2，输入“dian”
      if (value == ".") {

        oldValue = this.data.purArr[this.data.focusIndex].gbDpgBuyPrice;

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
            ["purArr[" + this.data.focusIndex + "].gbDpgBuyPrice"]: newValue,
        ["item.gbDpgBuyPrice"] : newValue
          })
        }
      }
      //2，输入“删除”
      if (value == "del") {

        oldValue = this.data.purArr[this.data.focusIndex].gbDpgBuyPrice;

        newValue = oldValue.substr(0, oldValue.length - 1);
        if (newValue.length > 0) {
          this.setData({
            ["purArr[" + this.data.focusIndex + "].gbDpgBuyPrice"]: newValue,
        ["item.gbDpgBuyPrice"] : newValue
          })

        } else {
          this.setData({
            ["purArr[" + this.data.focusIndex + "].gbDpgBuyPrice"]: "",
            ["item.gbDpgBuyPrice"] : "",
          })
        }
        this.try("delete") // read 清除

      }

      //3，输入“关闭”
      if (value == "close") {
        if (this.data.purArr[this.data.focusIndex].gbDpgBuyPrice !== null) {
          this.savePurGoods();
        }
        this.setData({
          focusIndex: -1,
          lastInput: true,
        })

        this.try("close"); // read 关闭

      }
      //4,输入“下一个”
      if (value == "next") {
          if (this.data.purArr[this.data.focusIndex].gbDpgBuyPrice !== null) {
            this.savePurGoods();
          }
          var focusIndex = this.data.focusIndex;
          if (focusIndex !== this.data.purArr.length - 1) {
            this.setData({
              focusIndex: focusIndex + 1,
            })
          } else {
            console.log("lasososososososososoossoo")
              this.setData({
             
                focusIndex: -1,
                lastInput: true
              })
          }
      
        this.try("next"); // read 下一个

      }
    }

    if(this.data.focusIndex !== -1){
      this._countEveryOrderData();
    }
    
  },

  _countEveryOrderData() {
    
    var item  = this.data.purArr[this.data.focusIndex];
    this.setData({
      item: item,
    })
    var price = Number(item.gbDpgBuyPrice);
    var arr = item.gbDepartmentOrdersEntities;
    for (var i = 0; i < arr.length; i++) {
      var orderPriceData = "item.gbDepartmentOrdersEntities[" + i + "].gbDoPrice";
      var orderPriceDataNx = "item.gbDepartmentOrdersEntities[" + i + "].nxDepartmentOrdersEntity.nxDoPrice";
      this.setData({
        [orderPriceData]: price,
        [orderPriceDataNx]: price,

      })
      var orderWeight = this.data.item.gbDepartmentOrdersEntities[i].nxDepartmentOrdersEntity.nxDoWeight;

      if(orderWeight !== null && orderWeight > 0){
        this._getSubTotal(i);
      }

    }
    this._getBuySubtotal();
  },


  _getSubTotal: function (indexData) {
    var nxDoPrice = Number(this.data.item.gbDepartmentOrdersEntities[indexData].nxDepartmentOrdersEntity.nxDoPrice);
    var nxDoWeight = Number(this.data.item.gbDepartmentOrdersEntities[indexData].nxDepartmentOrdersEntity.nxDoWeight);
    var nxDoSubtotal = "item.gbDepartmentOrdersEntities[" + indexData + "].nxDepartmentOrdersEntity.nxDoSubtotal";
   var gbDoSubtotal = "item.gbDepartmentOrdersEntities[" + indexData + "].gbDoSubtotal";
    if (nxDoPrice > 0 && nxDoWeight > 0) {
      var subtotal = (nxDoPrice * nxDoWeight).toFixed(1);
      console.log(subtotal);
      this.setData({
        [nxDoSubtotal]: subtotal,
        [gbDoSubtotal]: subtotal
      })
      //profit 
      var nxDoCostPrice = this.data.item.gbDepartmentOrdersEntities[indexData].nxDepartmentOrdersEntity.nxDoCostPrice;
      var nxDoCostSubtotal = (Number(nxDoCostPrice) * Number(nxDoWeight)).toFixed(1);
      
      var profitSubData = "item.gbDepartmentOrdersEntities[" + indexData + "].nxDepartmentOrdersEntity.nxDoProfitSubtotal";
      var profitScaleData = "item.gbDepartmentOrdersEntities[" + indexData + "].nxDepartmentOrdersEntity.nxDoProfitScale";
      var costSubtotalData = "item.gbDepartmentOrdersEntities[" + indexData + "].nxDepartmentOrdersEntity.nxDoCostSubtotal";
      
      var profitSubtotal = (Number(subtotal) - Number(nxDoCostSubtotal)).toFixed(1);
      var profitScale = (Number(profitSubtotal) / Number(subtotal) * 100).toFixed(2);

      this.setData({
        [profitSubData]: profitSubtotal,
        [profitScaleData]: profitScale,
        [costSubtotalData]: nxDoCostSubtotal
      })

    } else {
      this.setData({
        [nxDoSubtotal]: null,
        [profitSubData]: "0",
      })
    }

    var costPrice = this.data.item.gbDepartmentOrdersEntities[indexData].nxDepartmentOrdersEntity.nxDoCostPrice;
    var profitScaleData = "item.gbDepartmentOrdersEntities[" + indexData +"].nxDepartmentOrdersEntity.nxDoProfitScale";
    if (costPrice !== null && nxDoPrice !== null && nxDoPrice > 0) {
      console.log("profitScaleDataprofitScaleData")
      var profitScale = Number((Number(nxDoPrice) - Number(costPrice)) / Number(nxDoPrice) * 100).toFixed(2);
      this.setData({
        [profitScaleData]: profitScale,
        
      })
    }else{
      this.setData({
        [profitScaleData]: null,
      })
    }
  
},

    _getBuySubtotal(e) {
      console.log("_getBuySubtotal")
      var arr = this.data.item.gbDepartmentOrdersEntities;
      var total = "";
      var weightTotal = "";
      for (var i = 0; i < arr.length; i++) {
        var sub = arr[i].nxDepartmentOrdersEntity.nxDoSubtotal;
        var wei = arr[i].nxDepartmentOrdersEntity.nxDoWeight;
        console.log(sub);
        console.log("subsbsb?????????")
        if (sub !== null) {
          weightTotal = Number(weightTotal) + Number(wei);
          total = Number(total) + Number(sub);
          total = total.toFixed(1);
        }
      }
      // var data = "item.gbDpgBuySubtotal";
     
      var weightData = "item.gbDpgBuyQuantity";
      var ifTemp = ((weightTotal + '').indexOf('.') != -1) ? weightTotal.toFixed(1) : weightTotal;
      console.log("weigtototoototot", weightTotal);
      this.setData({
        ["purArr[" + this.data.focusIndex + "].gbDpgBuySubtotal"]:total,
        // [data]: total,
        [weightData]: ifTemp,
        ["purArr[" + this.data.focusIndex + "]"]: this.data.item,
      })

      this._countTotal();
    },

    _countTotal(){

      var goodArr = this.data.batch.gbDPGEntities;
      var subTemp = "";
      var finishCount = 0;
      var orderCount = 0;
      var goodsCount = 0;
      var finishGoodsCount = 0;
      for (var i = 0; i < goodArr.length; i++) {
        goodsCount = goodsCount + 1;
        var subTot = this.data.batch.gbDPGEntities[i].gbDpgBuySubtotal;
        if (subTot !== "null") {
          finishGoodsCount = finishGoodsCount + 1;
          subTemp = Number(subTemp) + Number(subTot);
          var orderArr = this.data.batch.gbDPGEntities[i].gbDepartmentOrdersEntities;
          if(orderArr.length > 0){
            for(var j =0; j < orderArr.length; j++){
              orderCount  = orderCount + 1;
              var status = orderArr[j].nxDepartmentOrdersEntity.nxDoPurchaseStatus;
              if(status == 4){
                finishCount = finishCount + 1;
              }

            }
          }
        }
      }
  
      console.log("subtootot--------------", subTemp);
      console.log("subtootot--------------", orderCount, finishCount); 
      console.log("subtootot--------------", goodsCount,"--",finishGoodsCount);
      if(orderCount == finishCount && goodsCount == finishGoodsCount){
        this.setData({
          canSave: true,
        })
      }else{
        this.setData({
          canSave: false
        })
      }
      this.setData({
        payTotal: subTemp.toFixed(1),
        
      })
    },


  changeFocusIndexPrice(e){
   
     console.log(e.currentTarget.dataset);
    if (this.data.focusIndex !== -1 ) {
      var itemPrice = this.data.purArr[this.data.focusIndex].gbDpgBuyPrice;
      console.log(itemPrice);
      if (itemPrice !== null && itemPrice > 0) {
        this.savePurGoods()
      }
    }
    console.log("xunzesnn11111111")
    this.setData({
      focusIndex: e.currentTarget.dataset.index,
      lastInput: false,
      item: e.currentTarget.dataset.item,
    })
    
  },



  toBack(){
    wx.navigateBack({
      delta: 1
    })
  },



  sendSucess() {
    if(!this.data.canSave){

      wx.showToast({
        title: '完成出库和单价',
        icon: 'none'
      })

    }else{
      this.setData({
        isTishi: true,
      })
    }
    
  },

  cancelCostBatch() {
    this.setData({
      isTishi: false
    })
  },

  radioChange(e){
    console.log(e);
    var typeData = "batch.gbDpbPayType";
    this.setData({
      [typeData]:  e.detail.value,
    })
    console.log(this.data.batch)
  },


  _saveBatch(){
    if(this.data.batch.gbDpbPayType == null){
      wx.showToast({
        title: '请选择支付方式',
        icon: 'none'
      })
    }else{
      load.showLoading();
      var batch = this.data.batch;
      batch.gbDpbSubtotal = this.data.payTotal;
      batch.gbDpbNxDistributerId = this.data.disInfo.nxDistributerId;
      load.showLoading();
      nxDisFinishPurchaseGoodsBatchGb(this.data.batch)
        .then(res => {
          load.hideLoading();
          if (res.result.code == 0) {
            load.hideLoading();
             wx.navigateBack({delta: 2});    
          } else {
            wx.showToast({
              title: res.result.msg,
              icon: 'none'
            })
          }
        })
    }
   
  },


  toEditOrders() {
    load.showLoading("修改订单");
    supplierEditBatchGb(this.data.batch.gbDistributerPurchaseBatchId)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          this.setData({
            batch: res.result.data,
          })
        }
      })
  },



})
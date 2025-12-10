Component({
  /**
   * 组件的属性列表
   */
  properties: {
    //是否显示modal
    show: {
      type: Boolean,
      value: true
    },
    item: {
      type: Object,
      value: ""
    },
    maskHeight: {
      type: Number,
      value: ""
    },
    windowHeight: {
      type: Number,
      value: ""
    },
    windowWidth: {
      type: Number,
      value: ""
    },
    scaleInput: {
      type: Boolean,
      value: "false"
    },
    scrollViewTop: {
      type: Number,
      value: ""
    }

    
  },

  /**
   * 组件的初始数据
   */
  data: {
    showReason: false,
  },

  /**
   * 组件的方法列表
   */
  methods: {

    clickMask() {
      this.setData({
        show: false,
        showReason: false,
        scaleInput: false
      })
    },

    cancle() {
      this.setData({
        show: false,
        editApply: false,
        item: "",
        scaleInput: false
      })
      this.triggerEvent('cancle')
    },
    finish(e){
      this.setData({
        show: false,
        editApply: false,
        item: "",
        showReason: false,
        scaleInput: false
      })
      this.triggerEvent('finish')
    },

    
    confirm(e) {
    
        if (this.data.item.gbDpgBuyPrice == null || !this.data.item.gbDpgBuyPrice > 0) {
          //panduan1
          var price = this.data.item.gbDpgBuyPrice;
          if (price.length == 0) {
            wx.showToast({
              title: '单价不能为空',
              icon: 'none'
            })
            return;
          }
        }
       
        this.triggerEvent('confirm', {
          item: this.data.item
        })
        this.setData({
          show: false,
          showReason: false,
          scaleInput: false,
        })
      
      
    },

    getPurchasePrice: function (e) {
      console.log("getPurchasePrice")
      var itemData = "item.gbDpgBuyPrice";
      var numberStr = e.detail.value;
      //输入非空 
      if (e.detail.value.length > 0) {
        //0
        this.setData({
          [itemData]: numberStr,
        })
        //1. 小数点
        var y = String(numberStr).indexOf("."); //获取小数点的位置
        if (y !== -1) {
          var count = String(numberStr).length - y; //获取小数点后的个数
        }
        if (count > 2) {
          wx.showToast({
            title: '小数点只能保留一位',
          })
          this.setData({
            [itemData]: numberStr.substring(0, numberStr.length - 1),
          })
        }
        //2. 值大小判断
        if (numberStr > 99999) {
          wx.showToast({
            title: '最大不能超过九万九千九百九十九',
            icon: "none"
          })
          this.setData({
            [itemData]: numberStr.substring(0, numberStr.length - 1),
          })
        }
        this._countEveryOrderData();
       
      } else {
        this._emptyInputPrice();
      }
    },


    getOrderWeight(e) {
      var index = e.currentTarget.dataset.index;
      var price = Number(this.data.item.gbDpgBuyPrice);
      var orderWeightData = "item.gbDepartmentOrdersEntities[" + index + "].nxDepartmentOrdersEntity.nxDoWeight";
      var orderPriceData = "item.gbDepartmentOrdersEntities[" + index + "].nxDepartmentOrdersEntity.nxDoPrice";
      var subData = "item.gbDepartmentOrdersEntities[" + index + "].nxDepartmentOrdersEntity.nxDoSubtotal";
      var orderWeighValue = e.detail.value;
      //输入非空 
      if (orderWeighValue.length > 0) {
        //0
        var sub = (Number(price) * Number(orderWeighValue)).toFixed(1);
        this.setData({
          [orderWeightData]: orderWeighValue,
          [orderPriceData]: price,
          [subData]: sub
        })

        //1. 小数点
        var y = String(orderWeighValue).indexOf("."); //获取小数点的位置
       
        if (y !== -1) {
          var count = String(orderWeighValue).length - y; //获取小数点后的个数
        }
        if (count > 2) {
          wx.showToast({
            title: '小数点只能保留一位',
          })
          var newWeight = Number(orderWeighValue.substring(0, orderWeighValue.length - 1));
          var sub = (Number(price) * newWeight).toFixed(1);
          this.setData({
            [orderWeightData]: newWeight,
            [orderPriceData]: price,
            [subData]: sub
          })
        }
        //2. 值大小判断
        if (e.detail.value > 99999) {
          wx.showToast({
            title: '最大不能超过九万九千九百九十九',
            icon: "none"
          })
          var newWeight = Number(orderWeighValue.substring(0, orderWeighValue.length - 1));
          var sub = (Number(price) * newWeight).toFixed(1);
          this.setData({
            [orderWeightData]: newWeight,
            [orderPriceData]: price,
            [subData]: sub
          })
        }
      } else {
        this.setData({
          [orderWeightData]: "",
          [subData]: ""
        })
      }
      this._countEveryOrderData(index);
    },
  

    getPurchasePriceScale: function (e) {
      var itemData = "item.gbDpgBuyScalePrice";
      var numberStr = e.detail.value;
     
      //输入非空 
      if (e.detail.value.length > 0) {
        //0
        this.setData({
          [itemData]: numberStr,
        })
        //1. 小数点
        var y = String(numberStr).indexOf("."); //获取小数点的位置
        if (y !== -1) {
          var count = String(numberStr).length - y; //获取小数点后的个数
        }
        if (count > 2) {
          wx.showToast({
            title: '小数点只能保留一位',
          })
          this.setData({
            [itemData]: numberStr.substring(0, numberStr.length - 1),
          })
        }
        //2. 值大小判断
        if (numberStr > 99999) {
          wx.showToast({
            title: '最大不能超过九万九千九百九十九',
            icon: "none"
          })
          this.setData({
            [itemData]: numberStr.substring(0, numberStr.length - 1),
          })
        }

        var itemPriceData = "item.gbDpgBuyPrice";
        var scale = this.data.item.gbDpgBuyScale;
        var buyPrice = (Number(this.data.item.gbDpgBuyScalePrice) / Number(scale)).toFixed(2);
        this.setData({
          [itemPriceData]: buyPrice
        })

       this._getBuySubtotalScale();
        this._getOrderSubtotalScale();
      } else {
        this._emptyInputPriceScale();
      }
    },

   
    _checkPrice() {
      console.log("check" + this.data.item.gbDpgBuyPrice)
      if (this.data.item.gbDistributerGoodsEntity.gbDgControlPrice == 1 && this.data.item.gbDpgBuyPrice > 0) {
        if (Number(this.data.item.gbDpgBuyPrice) < Number(this.data.item.gbDistributerGoodsEntity.gbDgGoodsLowestPrice) || Number(this.data.item.gbDpgBuyPrice) > Number(this.data.item.gbDistributerGoodsEntity.gbDgGoodsHighestPrice)) {
          this.setData({
            showReason: true,
          })
        } else {
          this.setData({
            showReason: false,
          })
        }
      }
    },

    getPurchasePriceReason(e) {
      console.log(e.detail.value.length);
      if ( e.detail.value.length < 20 && e.detail.value.length > 0) {
        var itemData = "item.gbDpgBuyPriceReason";
        var resonStr = e.detail.value;
        this.setData({
          [itemData]: resonStr,
        })
      } else {
        wx.showToast({
          title: '内容在20个汉字',
          icon: 'none'
        })
      }
    },

    _emptyInputPrice() {
      var arr = this.data.item.gbDepartmentOrdersEntities;
      for (var i = 0; i < arr.length; i++) {
        var orderPriceData = "item.gbDepartmentOrdersEntities[" + i + "].gbDoPrice";
        var subData = "item.gbDepartmentOrdersEntities[" + i + "].gbDoSubtotal";
        this.setData({
          [orderPriceData]: "",
          [subData]: ""
        })
      }
      var subData = "item.gbDpgBuySubtotal";
      var priceData = "item.gbDpgBuyPrice";
      this.setData({
        [subData]: "",
        [priceData]: "",
      })
    },
    
    _emptyInputPriceScale() {
      var arr = this.data.item.gbDepartmentOrdersEntities;
      for (var i = 0; i < arr.length; i++) {
        var orderPriceData = "item.gbDepartmentOrdersEntities[" + i + "].gbDoPrice";
        var subData = "item.gbDepartmentOrdersEntities[" + i + "].gbDoSubtotal";
        var sellingSubData = "item.gbDepartmentOrdersEntities[" + i +"].gbDoSellingSubtotal";
        this.setData({
          [orderPriceData]: "",
          [subData]: "",
          [sellingSubData]: ""
        })
      }

      var subData = "item.gbDpgBuySubtotal";
      var priceData = "item.gbDpgBuyPrice";
      var scalePrice = "item.gbDpgBuyScalePrice";
    
      this.setData({
        [subData]: "",
        [priceData]: "",
        [scalePrice] : "",
      })
    },

    _countEveryOrderData() {
      console.log(this.data.item)
      var price = Number(this.data.item.gbDpgBuyPrice);
      var arr = this.data.item.gbDepartmentOrdersEntities;
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

        this._getBuySubtotal();

      }
    },
    

  _getSubTotal: function (indexData) {
    var nxDoPrice = Number(this.data.item.gbDepartmentOrdersEntities[indexData].nxDepartmentOrdersEntity.nxDoPrice);
    var nxDoWeight = Number(this.data.item.gbDepartmentOrdersEntities[indexData].nxDepartmentOrdersEntity.nxDoWeight);
    var nxDoSubtotal = "item.gbDepartmentOrdersEntities[" + indexData + "].nxDepartmentOrdersEntity.nxDoSubtotal";
  
    if (nxDoPrice > 0 && nxDoWeight > 0) {
      var subtotal = (nxDoPrice * nxDoWeight).toFixed(1);
      console.log(subtotal);
      this.setData({
        [nxDoSubtotal]: subtotal,
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
      var data = "item.gbDpgBuySubtotal";
      var weightData = "item.gbDpgBuyQuantity";
      var ifTemp = ((weightTotal + '').indexOf('.') != -1) ? weightTotal.toFixed(1) : weightTotal;
      console.log("weigtototoototot", weightTotal);
      this.setData({
        [data]: total,
        [weightData]: ifTemp,
      })
    },

    // // 88888
    getScaleWeight(e) {
      var value = e.detail.value;
      var orderIndex = e.currentTarget.dataset.index;
      var scale = this.data.item.gbDepartmentOrdersEntities[orderIndex].gbDoDsStandardScale;
      var orderWeight = Number(scale) * Number(value);

      var itemData = "item.gbDepartmentOrdersEntities[" + orderIndex + "].gbDoScaleWeight";
      var itemOrderData = "item.gbDepartmentOrdersEntities[" + orderIndex + "].gbDoWeight";
      this.setData({
        orderIndex: orderIndex,
        [itemData]: value,
        [itemOrderData]: orderWeight
      })

      //核算小计

      //统计采购商品的全部重量
      this._getTotalWeightScale();
      this._getOrderSubtotalScale();
    },

    _getTotalWeightScale() {
      var arr = this.data.item.gbDepartmentOrdersEntities;
      var scaleQuantityTotal = 0;
      var scaleOrderQuantityTotal = 0;
      for (var i = 0; i < arr.length; i++) {
        var scaleWeight = arr[i].gbDoScaleWeight;
        scaleQuantityTotal = Number(scaleQuantityTotal) + Number(scaleWeight);
        var scareOrderWeight = arr[i].gbDoWeight;
        scaleOrderQuantityTotal = Number(scaleOrderQuantityTotal) + Number(scareOrderWeight);
      }
      
      var scaleWeightTotal = "item.gbDpgBuyScaleQuantity";
      var buyQuantity = "item.gbDpgBuyQuantity";
      this.setData({
        [scaleWeightTotal]: scaleQuantityTotal,
        [buyQuantity]: scaleOrderQuantityTotal
      })
     
      this._getBuySubtotalScale();
    },

    _getOrderSubtotalScale(){
      var arr = this.data.item.gbDepartmentOrdersEntities;
      for(var i = 0; i < arr.length; i++){
        var subData = "item.gbDepartmentOrdersEntities[" + i +"].gbDoSubtotal";
        var weight = arr[i].gbDoScaleWeight;
        var price = arr[i].gbDoScalePrice;
       
        var subtotal = (Number(weight) * Number(price)).toFixed(1);
        this.setData({
          [subData]: subtotal,
        })
      }
    },

    _getBuySubtotalScale() {
      //核算订单规格单位的单价
      console.log("_getBuySubtotalScale_getBuySubtotalScale")
      var buyPrice = this.data.item.gbDpgBuyScalePrice;
      if (buyPrice !== null && buyPrice > 0) {
        var subData = "item.gbDpgBuySubtotal";
       var scaleWeight = this.data.item.gbDpgBuyScaleQuantity;
       var sub = Number(scaleWeight) * Number(buyPrice);

       this.setData({
        [subData]: sub.toFixed(1)
       })
      }
      this._countOrderPrice();
    },

    _countOrderPrice(){
      var doPrice = this.data.item.gbDpgBuyPrice;
      var scalePrice = this.data.item.gbDpgBuyScalePrice;
      var arr = this.data.item.gbDepartmentOrdersEntities;
      for(var i = 0; i < arr.length; i++){
        var priceData = "item.gbDepartmentOrdersEntities[" + i +"].gbDoPrice";
        var scalePriceData = "item.gbDepartmentOrdersEntities[" + i +"].gbDoScalePrice";

        this.setData({
          [priceData]: doPrice,
          [scalePriceData]: scalePrice
        })
      }
    },

    











  },




})
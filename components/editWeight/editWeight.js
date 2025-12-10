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


    scrollViewTop: {
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
    url: {
      type: String,
      value: ""
    }

  },

  /**
   * 组件的初始数据
   */
  data: {
    showInput: false,

  },

  /**
   * 组件的方法列表
   */
  methods: {

    clickMask() {
      this.setData({
        show: false
      })
    },

    cancle() {
      this.setData({
        show: false,
        editApply: false,
        item: "",
      })
      this.triggerEvent('cancle')
    },



    confirm(e) {
     
      this.triggerEvent('confirm', {
        item: this.data.item
      })
      this.setData({
        show: false,
        item: ""
      })
    },

    quickToOrderData(e){
      var orderData = "";
      var quickData = "";
      if(e.currentTarget.dataset.type == 'price'){
        orderData = "item.nxDoPrice";
         quickData = this.data.item.nxDepartmentDisGoodsEntity.nxDdgOrderPrice;
      } 
      if(e.currentTarget.dataset.type == 'weight'){
        orderData = "item.nxDoWeight";
        quickData = this.data.item.nxDoQuantity;
      }  
      console.log(orderData) 
      this.setData({
        [orderData]: quickData
      })  
      this._countSubtotal();
  
    },

    getOrderWeight(e) {
    
      var orderWeightData = "item.nxDoWeight";
      var orderWeighValue = e.detail.value;
      //输入非空 
      if (orderWeighValue.length > 0) {
        this.setData({
          [orderWeightData]: orderWeighValue,
        })

        //1. 小数点
        var y = String(orderWeighValue).indexOf("."); //获取小数点的位置
        console.log(y);
        console.log("getOrderWeight")
        if (y !== -1) {
          var count = String(orderWeighValue).length - y; //获取小数点后的个数
        }
        if (count > 2) {
          wx.showToast({
            title: '小数点只能保留一位',
          })
        
          var newWeight = Number(orderWeighValue.substring(0, orderWeighValue.length  - 1));
          this.setData({
            [orderWeightData]: newWeight,
          })
        }
        //2. 值大小判断
        if (e.detail.value > 99999) {
          wx.showToast({
            title: '最大不能超过九万九千九百九十九',
            icon: "none"
          })
          var newWeight = Number(orderWeighValue.substring(0, orderWeighValue.length - 1));
          this.setData({
            [orderWeightData]: newWeight,           
          })
        }
      } else {
        this.setData({
          [orderWeightData]: "",
        })
      }
      this._countSubtotal();

    },

    getDoCostPrice(e){
      console.log("costprice")
      var orderPriceData = "item.nxDoCostPrice";
      var orderPriceValue = e.detail.value;
      //输入非空 
      if (orderPriceValue.length > 0) {
        this.setData({
          [orderPriceData]: orderPriceValue,
        })

        //1. 小数点
        var y = String(orderPriceValue).indexOf("."); //获取小数点的位置
       
        if (y !== -1) {
          var count = String(orderPriceValue).length - y; //获取小数点后的个数
        }
        if (count > 2) {
          wx.showToast({
            title: '小数点只能保留一位',
          })
        
          var newPrice = Number(orderPriceValue.substring(0, orderPriceValue.length  - 1));
          this.setData({
            [orderPriceData]: newPrice,
          })
        }
        //2. 值大小判断
        if (e.detail.value > 99999) {
          wx.showToast({
            title: '最大不能超过九万九千九百九十九',
            icon: "none"
          })
          var newPrice = Number(orderPriceValue.substring(0, orderPriceValue.length - 1));
          this.setData({
            [orderPriceData]: newPrice,           
          })
        }
      } else {
        this.setData({
          [orderPriceData]: "",
        })
      }
      this._countSubtotal();
    },

    getOrderPrice(e) {
      var orderPriceData = "item.nxDoPrice";
      var orderPriceValue = e.detail.value;
      //输入非空 
      if (orderPriceValue.length > 0) {
        this.setData({
          [orderPriceData]: orderPriceValue,
        })

        //1. 小数点
        var y = String(orderPriceValue).indexOf("."); //获取小数点的位置
        console.log(y);
        console.log("getOrderPrice yyy")
        if (y !== -1) {
          var count = String(orderPriceValue).length - y; //获取小数点后的个数
        }
        if (count > 2) {
          wx.showToast({
            title: '小数点只能保留一位',
          })
        
          var newPrice = Number(orderPriceValue.substring(0, orderPriceValue.length  - 1));
          this.setData({
            [orderPriceData]: newPrice,
          })
        }
        //2. 值大小判断
        if (e.detail.value > 99999) {
          wx.showToast({
            title: '最大不能超过九万九千九百九十九',
            icon: "none"
          })
          var newPrice = Number(orderPriceValue.substring(0, orderPriceValue.length - 1));
          this.setData({
            [orderPriceData]: newPrice,           
          })
        }
      } else {
        this.setData({
          [orderPriceData]: "",
        })
      }
      this._countSubtotal();
    },

    _countSubtotal(){
      var orderWeight = this.data.item.nxDoWeight;
      var orderPrice = this.data.item.nxDoPrice;
      var costPrice = this.data.item.nxDoCostPrice;

      if(orderWeight !== null && orderWeight !== '0.0' 
         && orderPrice !== null && orderPrice !=='0.0'){
           var subtotal = Number(orderWeight) * Number(orderPrice);
           var subtotalData= "item.nxDoSubtotal";
           this.setData({
            [subtotalData]: subtotal.toFixed(1),
          })
          console.log("orderWeightorderWeight")
         console.log(orderWeight)
          //profit 
          var costSubtotal = (Number(costPrice) * Number(orderWeight)).toFixed(1);
            var profitSubData = "item.nxDoProfitSubtotal";
            var costSubtotalData = "item.nxDoCostSubtotal";
            var profitSubtotal = (Number(subtotal) - Number(costSubtotal)).toFixed(1);
           this.setData({
            [profitSubData]: profitSubtotal,
            [costSubtotalData]: costSubtotal
          })           
          
         }


         if(costPrice !== null && orderPrice !== null){
          var profitScaleData = "item.nxDoProfitScale";
          var profitScale = Number((Number(orderPrice) - Number(costPrice)) / Number(orderPrice) * 100).toFixed(2);
          this.setData({
            [profitScaleData]: profitScale ,

          })


         }
    }




  },




})
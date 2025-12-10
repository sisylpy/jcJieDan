
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
    applyNumber: {
      type: String,
      value: ""
    },
    applyPrice: {
      type: String,
      value: ""
    },
    applySubtotal:{
      type: String,
      value: ""
    },
    
    maskHeight:{
      type: Number,
      value: ""
    },
    
  },

  /**
   * 组件的初始数据
   */
  data: {
    
  },

  /**
   * 组件的方法列表
   */
  methods: {
   
    clickMask() {
      this.setData({show: false})
    },

    cancle() {
      this.setData({ show: false,applyNumber: "", applyPrice: "", applySubtotal: "" })
      this.triggerEvent('cancle')
    },

    confirm(e) {
    
        if(this.data.applyNumber  > 0 && this.data.applyPrice  > 0){
          var regex=/^[0]+/; //整数验证正则        
        var apply = "";
        if(this.data.applyNumber.indexOf(".") !== -1){
          apply = this.data.applyNumber;
        }else{
          apply = this.data.applyNumber.replace(regex, "");
        }
          var regex=/^[0]+/; //整数验证正则        
          var price = "";
          if(this.data.applyPrice.indexOf(".") !== -1){
            price = this.data.applyPrice;
          }else{
            price = this.data.applyPrice.replace(regex, "");
          }
          var subtotal = (apply  * price).toFixed(1);
        this.triggerEvent('confirm', {
          applyNumber: apply ,
          applyPrice: price,
          applySubtotal: subtotal
         
        })
      
        this.setData({
          show: false,
          applyNumber: "",
          applyPrice: "",
          applySubtotal: ""
         
        })
      }else{
        wx.showToast({
          title: '数量只能填写数字',
          icon: "none"
        })
      }
     
     
    },

   
    getApplyNumber: function (e) {
        console.log(e);
      var numberStr = this.data.applyNumber.toString();
      var y = String(numberStr).indexOf(".") ;//获取小数点的位置
      if(y !== -1){
        var count = String(numberStr).length - y;//获取小数点后的个数
      }

      if(e.detail.value > 99999){
        wx.showToast({
          title: '不能超过9999',
          icon: "none"
        })   
        this.setData({
          applyNumber: numberStr.substring(0, numberStr.length ),

        })
   
      } else if(count > 2 || count == 2){

        wx.showToast({
          title: '小数点只能保留一位',
        })
        this.setData({
          applyNumber: numberStr.substring(0, numberStr.length - 1),
        })
      }
      
      else {
       
        if(e.detail.value > 0  || e.detail.value == 0){
          console.log("ishereeee")
          this.setData({
            applyNumber: e.detail.value
          })
          var price = Number(this.data.applyPrice);
        var subtotal = Number(e.detail.value) * price;
        this.setData({
          applySubtotal: subtotal.toFixed(1)
        })
        }else{
          wx.showToast({
            title: '只能填写数字',
            icon: 'none'
          })

          // var g
          // var reg = new RegExp("([0]*)([1-9]+[0-9]+)", "g");

          this.setData({
            applyNumber: numberStr.substring(0, numberStr.length ),
          })
        }
      }
    },

    getApplyPrice: function (e) {
      console.log(e);
    var numberStr = this.data.applyPrice.toString();
    var y = String(numberStr).indexOf(".") ;//获取小数点的位置
    if(y !== -1){
      var count = String(numberStr).length - y;//获取小数点后的个数
    }

    if(e.detail.value  > 99999){
      wx.showToast({
        title: '不能超过订单出货数量',
        icon: "none"
      })   
      this.setData({
        applyPrice: numberStr.substring(0, numberStr.length ),

      })
 
    } else if(count > 2 || count == 2){

      wx.showToast({
        title: '小数点只能保留一位',
      })
      this.setData({
        applyPrice: numberStr.substring(0, numberStr.length - 1),
      })
    }
    
    else {
     
      if(e.detail.value > 0  || e.detail.value == 0){
        console.log("ishereeee")
        this.setData({
          applyPrice: e.detail.value
        })
        var number = Number(this.data.applyNumber);
      var subtotal = Number(e.detail.value) * number;
      this.setData({
        applySubtotal: subtotal.toFixed(1),

      })
      }else{
        wx.showToast({
          title: '只能填写数字',
          icon: 'none'
        })

        // var g
        // var reg = new RegExp("([0]*)([1-9]+[0-9]+)", "g");

        this.setData({
          applyNumber: numberStr.substring(0, numberStr.length ),
        })
      }
    }
  },

   





  },
  

  
  
})

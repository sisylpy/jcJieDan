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
    returnSubtotal: {
      type: String,
      value: ""
    },

    maskHeight: {
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
      this.setData({
        show: false
      })
    },

    cancle() {
      this.setData({
        show: false,
        returnNumber: ""
      })
      this.triggerEvent('cancle')
    },

    confirm(e) {

      if (this.data.applyNumber > 0) {
        var regex = /^[0]+/; //整数验证正则        
        var apply = "";
        if (this.data.applyNumber.indexOf(".") !== -1) {
          apply = this.data.applyNumber;
        } else {
          apply = this.data.applyNumber.replace(regex, "");
        }

        this.triggerEvent('confirm', {
          applyNumber: apply,

        })

        this.setData({
          show: false,
          applyNumber: "",

        })
      } else {
        wx.showToast({
          title: '数量只能填写数字',
          icon: "none"
        })
      }


    },


    getApplyNumber: function (e) {

      var numberStr = this.data.applyNumber.toString();
      var y = String(numberStr).indexOf("."); //获取小数点的位置
      if (y !== -1) {
        var count = String(numberStr).length - y; //获取小数点后的个数
      }

      if (e.detail.value > 9999) {
        wx.showToast({
          title: '最大不能超过9999',
          icon: "none"
        })

        this.setData({
          applyNumber: numberStr.substring(0, numberStr.length),
        })

      } else if (count > 2 || count == 2) {

        // wx.showToast({
        //   title: '小数点只能保留一位',
        // })
        this.setData({
          applyNumber: numberStr.substring(0, numberStr.length - 1),
        })
      } else {

        if (e.detail.value > 0 || e.detail.value == 0) {


          this.setData({
            applyNumber: e.detail.value
          })
        } else {
          wx.showToast({
            title: '只能填写数字',
            icon: 'none'
          })

          // var g
          // var reg = new RegExp("([0]*)([1-9]+[0-9]+)", "g");

          this.setData({
            applyNumber: numberStr.substring(0, numberStr.length),
          })
        

        }

      }

      console.log("aaa",this.data.applyNumber , "bb",this.data.item.nxDoWeight)
      if(Number(this.data.applyNumber) < Number(this.data.item.nxDoWeight) || Number(this.data.applyNumber) == Number(this.data.item.nxDoWeight)){
        var nxDoReturnSubtotal = (Number(this.data.applyNumber) * Number(this.data.item.nxDoPrice)).toFixed(1);
        this.setData({
          returnSubtotal: nxDoReturnSubtotal,
        })
      }else{
        wx.showToast({
          title: '退货数量不能超过订单数量',
          icon: 'none'
        })
        this.setData({
          applyNumber: ""
        })

      }

      
    },








  },




})

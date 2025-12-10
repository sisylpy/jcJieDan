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
    focusIndex: 0,
    isSure: false,
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
        item: "",
      })
      this.triggerEvent('cancle')
    },



    confirm(e) {
      var arr = this.data.item.neetNotPurOrders;
      var empty = 0;
       for(var i = 0; i < arr.length; i++){
         var weight = arr[i].nxDoWeight;
         if(weight == null || weight == "" || weight == 0 ){
           wx.showToast({
             title: '未填写出货数量',
             icon: 'none'
           }) 
           empty = 1;
         }
       }
       if(empty == 0){
         this.triggerEvent('confirm', {
        item: this.data.item
      })
      this.setData({
        show: false,
          item: "",
          focusIndex: -1,
          isSure: false
      })
        
       }
      
     
    
    },

   

getOrderWeight(e) {
  var index = e.currentTarget.dataset.index;
  var doWeightData = "item.neetNotPurOrders[" + index + "].nxDoWeight";
  var orderWeighValue = e.detail.value;
  var weightValue = "";
  //输入非空 
  if (orderWeighValue.length > 0) {
    weightValue = orderWeighValue;
    //1. 小数点
    var y = String(orderWeighValue).indexOf("."); //获取小数点的位置
    console.log(y);
    if (y !== -1) {
      var count = String(orderWeighValue).length - y; //获取小数点后的个数
    }
    if (count > 2) {
      wx.showToast({
        title: '小数点只能保留一位',
      })
    weightValue = Number(orderWeighValue.substring(0, orderWeighValue.length - 1));     
    }
    //2. 值大小判断
    if (e.detail.value > 99999) {
      wx.showToast({
        title: '最大不能超过九万九千九百九十九',
        icon: "none"
      })
     weightValue = Number(orderWeighValue.substring(0, orderWeighValue.length - 1));
    }
    this.setData({
      [doWeightData]: weightValue,
    })
  } else {
    this.setData({
      [doWeightData]: "",
    })
  }
},


//



choiceOrder(e){
  var index = e.currentTarget.dataset.index;
  var value = this.data.item.neetNotPurOrders[index].purSelected;
  var orderData = "item.neetNotPurOrders[" + index +"].purSelected";
  if(value){
    this.setData({
      [orderData]: false,
    })
  }else{
    this.setData({
      [orderData]: true
    })
  }
},

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
    var oldValue = this.data.item.neetNotPurOrders[this.data.focusIndex].nxDoWeight;
    oldValue = this.data.item.neetNotPurOrders[this.data.focusIndex].nxDoWeight;
    var newValue = 0;
    if (oldValue !== null && oldValue !== '-1') {
      newValue = oldValue + value;
    } else {
      newValue = value
    }
    this.setData({
      ["item.neetNotPurOrders[" + this.data.focusIndex + "].nxDoWeight"]: newValue,
    })
    this.try(value); // read 数字
  } else {

    console.log("点击了非数字")
    //2，输入“dian”
    if (value == ".") {
      oldValue = this.data.item.neetNotPurOrders[this.data.focusIndex].nxDoWeight;
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
          ["item.neetNotPurOrders[" + this.data.focusIndex + "].nxDoWeight"]: newValue,
        })
      }
    }


    //2，输入“删除”
    if (value == "del") {
      oldValue = this.data.item.neetNotPurOrders[this.data.focusIndex].nxDoWeight;
      newValue = oldValue.substr(0, oldValue.length - 1);
      if (newValue.length > 0) {
        this.setData({
          ["item.neetNotPurOrders[" + this.data.focusIndex + "].nxDoWeight"]: newValue,
        })
      } else {
        this.setData({
          ["item.neetNotPurOrders[" + this.data.focusIndex + "].nxDoWeight"]: "",
        })
      }

      this.try("delete") // read 清除
    }

    //3，输入“关闭”
    if (value == "close") {
      this.setData({
        focusIndex: 0,
      })
      this.try("close"); // read 关闭
      this.cancle();

    }
    //4,输入“下一个”
    if (value == "next") {
     
      var focusIndex = this.data.focusIndex;
      if (focusIndex !== this.data.item.neetNotPurOrders.length - 1) {
        this.setData({
          focusIndex: focusIndex + 1,
        })
      } else {
        this.setData({
          focusIndex: 0,
        })
      }

      this.try("next"); // read 下一个

    }


  }


// .over
},



changeFocusIndex(e) {
  console.log(e);
  console.log("changeFocusIndexchangeFocusIndex");
  console.log( e.currentTarget.dataset.index);
 this.setData({
   abc:  e.currentTarget.dataset.index,
   focusIndex: e.currentTarget.dataset.index,
 })

},



  },




})
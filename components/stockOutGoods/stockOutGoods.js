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


    statusBarHeight: {
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
      var arr = this.data.item.nxDepartmentOrdersEntities;
      var empty = 0;
       for(var i = 0; i < arr.length; i++){
         var weight = arr[i].nxDoWeight;
         console.log(weight);
          var choice = arr[i].hasChoice;
          if(choice){
            if(weight == null || weight == "" || weight == 0){
              wx.showToast({
                title: '未填写出货数量',
                icon: 'none'
              }) 
              empty = 1;
            }
          }
        
       }
       if(empty == 0){
         this.triggerEvent('confirm', {
           item: this.data.item
         })
         this.setData({
           show: false,
           item: ""
         })
       }
    },


    choiceOrder(e){
      var index = e.currentTarget.dataset.index;
      var data = "item.nxDepartmentOrdersEntities[" + index + "].hasChoice";
      var choice = this.data.item.nxDepartmentOrdersEntities[index].hasChoice;
      if(choice){
        this.setData({
          [data]: false
        })
      }else{
        this.setData({
          [data]: true,
        })
      } 
    },
   

getOrderWeight(e) {
  var index = e.currentTarget.dataset.index;
  var doWeightData = "item.nxDepartmentOrdersEntities[" + index + "].nxDoWeight";
  var orderWeighValue = e.detail.value;
  var weightValue = "";
  //输入非空 
  if (orderWeighValue.length > 0) {
    weightValue = orderWeighValue;
    //1. 小数点
    var y = String(orderWeighValue).indexOf("."); //获取小数点的位置
    console.log(y);
    var count = 0;
    if (y !== -1) {
      count = String(orderWeighValue).length - y - 1; //获取小数点后的个数（不包括小数点本身）
    }
    if (count > 2) {
      wx.showToast({
        title: '小数点只能保留两位',
        icon: 'none'
      })
      // 保留小数点后2位
      var parts = String(orderWeighValue).split(".");
      if (parts.length > 1 && parts[1].length > 2) {
        weightValue = parts[0] + "." + parts[1].substring(0, 2);
      } else {
        weightValue = Number(orderWeighValue.substring(0, orderWeighValue.length - 1));
      }
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






  },




})

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
    modalHeight: {
      type: Number,
      value: ""
    },
    scrollViewTop: {
      type: Number,
      value: ""
    },
    modalContentHeight: {
      type: Number,
      value: ""
    },
    windowHeight: {
      type: Number,
      value: ""
    },
    planOrder: {
      type: String,
      value: ""
    } ,
    priceLevel:{
      type: String,
      value: "-1"
    },
    applyStandardName: {
      type: String,
      value: ""
    },
    restWeight: {
      type: String,
      value: ""
    },
    maxRestWeight: {
      type: [String, Number],
      value: "0"
    }
    
    
    



  },
  lifetimes: {
    attached() {
      const item = this.properties.item || {};
      // 根据 nxDgCartonUnit 是否为 null 决定使用哪个规格
      let defaultStandardName = item.nxDgGoodsStandardname || "";
      if (item.nxDgCartonUnit !== null && item.nxDgCartonUnit !== undefined && item.nxDgCartonUnit !== '') {
        defaultStandardName = item.nxDgCartonUnit;
      }
      const applyStandardName = this.properties.applyStandardName || defaultStandardName || "";
      const maxRestWeight = Number(this.properties.maxRestWeight || 0);
      const restWeight = this.properties.restWeight !== undefined ? this.properties.restWeight : "";
      this.setData({
        maxRestWeight,
        restWeight: restWeight,
        applyStandardName: applyStandardName
      })
    }
  },

  observers: {
    // 只监听 show 属性，当弹窗打开时初始化规格
    'show': function(newVal) {
      if (newVal) {
        // 弹窗打开时，初始化规格
        const item = this.properties.item || {};
        // 根据 nxDgCartonUnit 是否为 null 决定使用哪个规格
        let defaultStandardName = item.nxDgGoodsStandardname || "";
        if (item.nxDgCartonUnit !== null && item.nxDgCartonUnit !== undefined && item.nxDgCartonUnit !== '') {
          defaultStandardName = item.nxDgCartonUnit;
        }
        const applyStandardName = this.properties.applyStandardName || defaultStandardName || "";
        const maxRestWeight = Number(this.properties.maxRestWeight || 0);
        const restWeight = this.properties.restWeight !== undefined ? this.properties.restWeight : "";
        
        // 只有当当前值为空或与要设置的值不同时才更新，避免死循环
        if (!this.data.applyStandardName || this.data.applyStandardName !== applyStandardName) {
          this.setData({
            maxRestWeight,
            restWeight: restWeight,
            applyStandardName: applyStandardName
          })
        } else {
          // 即使规格相同，也要更新其他值
          this.setData({
            maxRestWeight,
            restWeight: restWeight
          })
        }
      }
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    applyStandardName: ""
  },

  /**
   * 组件的方法列表
   */
  methods: {

    cancle() {
      // 重置规格为商品默认规格
      const item = this.properties.item || {};
      // 根据 nxDgCartonUnit 是否为 null 决定使用哪个规格
      let defaultStandard = item.nxDgGoodsStandardname || "";
      if (item.nxDgCartonUnit !== null && item.nxDgCartonUnit !== undefined && item.nxDgCartonUnit !== '') {
        defaultStandard = item.nxDgCartonUnit;
      }
      this.setData({
        show: false,
        priceLevel: "-1",
        planOrder: "",
        applyStandardName: defaultStandard
      })
      this.triggerEvent('cancle')
    },

    confirm(e) {
      if (this.data.planOrder.length > 0) {
        const restWeight = this.data.restWeight !== undefined && this.data.restWeight !== "" ? this.data.restWeight : this.properties.restWeight;
        const maxRestWeight = Number(this.data.maxRestWeight || this.properties.maxRestWeight || 0);
        const restWeightNum = Number(restWeight || 0);
        if(maxRestWeight && restWeightNum > maxRestWeight){
          wx.showToast({
            title: '剩余库存不能超过' + maxRestWeight,
            icon: 'none'
          })
          this.setData({
            restWeight: maxRestWeight.toString()
          })
          return;
        }
        // 确保规格不为空，如果为空则使用商品默认规格
        const item = this.properties.item || {};
        // 根据 nxDgCartonUnit 是否为 null 决定使用哪个规格
        let defaultStandardName = item.nxDgGoodsStandardname || "";
        if (item.nxDgCartonUnit !== null && item.nxDgCartonUnit !== undefined && item.nxDgCartonUnit !== '') {
          defaultStandardName = item.nxDgCartonUnit;
        }
        const finalStandardName = this.data.applyStandardName || defaultStandardName || "";
        
        this.triggerEvent('confirm', {
          planOrder: this.data.planOrder,
          priceLevel: this.data.priceLevel,
          applyStandardName: finalStandardName,
          restWeight: restWeightNum.toString()
        })
        
        // 重置规格为商品默认规格
        this.setData({
          priceLevel: "-1",
          planOrder: "",
          restWeight: restWeightNum.toString(),
          applyStandardName: defaultStandardName,
          show: false
        })
      }else{
        wx.showToast({
          title: '请输入进货数量',
          icon: 'none'
        })
      } 
    },

   
    getPlan: function (e) {
      if (e.detail.value.length > 0) {
        this.setData({
          planOrder: e.detail.value
        })
      }else{
        this.setData({
          planOrder: ""
        })
      }
    },

    // 获取规格输入
    getStandard: function (e) {
      const value = e.detail.value;
      // 直接使用用户输入的值，允许为空（确认时会处理空值情况）
      this.setData({
        applyStandardName: value
      })
    },

    radioChange(e){ 
        this.setData({
          priceLevel: e.detail.value
        })
  },
  
  getNewRestWeight(e){
    let value = e.detail.value;
    if(value === ''){
      this.setData({ restWeight: '' });
      return;
    }
    // 只允许输入数字和一个小数点
    const decimalPattern = /^\d*(\.\d*)?$/;
    if(!decimalPattern.test(value)){
      return;
    }
    const maxRestWeight = Number(this.data.maxRestWeight || this.properties.maxRestWeight || 0);
    let num = parseFloat(value);
    if(isNaN(num)){
      this.setData({ restWeight: value });
      return;
    }
    if(num < 0){
      num = 0;
    }
    if(maxRestWeight && num > maxRestWeight){
      wx.showToast({
        title: '剩余库存不能超过' + maxRestWeight,
        icon: 'none'
      })
      num = maxRestWeight;
      value = maxRestWeight.toString();
    }
    this.setData({
      restWeight: value,
      maxRestWeight: maxRestWeight
    })
  },
   
    getFocus: function(e){
      this.triggerEvent('getFocus', {
        keyboardHeight: e.detail.height,
      })
    }



  },










})
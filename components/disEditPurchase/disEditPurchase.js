
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
   
    ids: {
      type: Array,
      value: []
    },
    planOrder: {
      type: String,
      value: ""
    },
    
    puringIndex: {
      type: Number,
      value: ""
    },
    priceLevel:{
      type: Number,
      value: 0,
    },
    purchaseGoods:{
      type: Object,
      value: ""
    },
    applyStandardName:{
      type: String,
      value: ""
    }
  },

  lifetimes: {
    attached() {
      // 初始化规格名称
      const item = this.properties.item || {};
      const applyStandardName = this.properties.applyStandardName || item.nxDgGoodsStandardname || "";
      if (applyStandardName) {
        this.setData({
          applyStandardName: applyStandardName
        })
      }
    }
  },

  observers: {
    // 监听 show 属性，当弹窗打开时初始化规格
    'show': function(newVal) {
      if (newVal) {
        const item = this.properties.item || {};
        const applyStandardName = this.properties.applyStandardName || item.nxDgGoodsStandardname || "";
        if (applyStandardName && applyStandardName !== this.data.applyStandardName) {
          this.setData({
            applyStandardName: applyStandardName
          })
        }
      }
    },
    // 监听 applyStandardName 属性变化
    'applyStandardName': function(newVal) {
      if (newVal && newVal !== this.data.applyStandardName) {
        this.setData({
          applyStandardName: newVal
        })
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
   

    getPlanOrder: function(e){
      if (e.detail.value.length > 0) {
        this.setData({
          planOrder: e.detail.value
        })
      } else {
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

    cancle() {
      this.setData({
        show: false,
      })
      this.triggerEvent('cancle')
    },
    delete(){
      // this.setData({
      //   show: false,
      // })
      console.log("delPurGoodsdelPurGoods")
      this.triggerEvent('delPurGoods')

    },

    confirmEdit(e) {
        console.log("commdmddedididid")
        // 确保规格不为空，如果为空则使用商品默认规格
        const item = this.properties.item || {};
        const finalStandardName = this.data.applyStandardName || item.nxDgGoodsStandardname || "";
        
        this.triggerEvent('confirmEditGoods', {
          ids: this.data.ids,
          planOrder: this.data.planOrder,
          applyStandardName: finalStandardName,
          priceLevel: this.data.priceLevel
        })

        // 重置规格为商品默认规格
        const defaultStandard = item.nxDgGoodsStandardname || "";
        this.setData({
          show: false,
          ids: [],
          planOrder: "",
          applyStandardName: defaultStandard
        })
    },

   

   



  },










})
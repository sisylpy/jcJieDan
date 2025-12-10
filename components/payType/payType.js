
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
    scrollViewTop:{
      type: Number,
      value: ""
    },
    
    maskHeight:{
      type: Number,
      value: ""
    },
    hasSupplier: {
      type: Boolean,
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

    radioChange(e){
      console.log(e);
      var typeData = "item.nxDpbPayType";
      this.setData({
        [typeData]:  e.detail.value,
      })
      console.log(this.data.item)
    },


    clickMask() {
      this.setData({show: false})
    },

    cancle() {
      this.setData({ show: false,})
      this.triggerEvent('cancle')
    },
    toSupplier(){
      var typeData = "item.nxDpbPayType";
      this.setData({
        [typeData]:  1,
      })
      this.triggerEvent('toSupplier')
    },

    // 自动订货开关切换
    changeNotice(e) {
      console.log('自动订货开关:', e.detail.value);
      var noticeData = "item.nxDpbOrderIsNotice";
      // 将boolean值转换为integer: true->1, false->0
      var noticeValue = e.detail.value ? 1 : 0;
      this.setData({
        [noticeData]: noticeValue
      });
      console.log('更新后的item:', this.data.item);
    },

    confirm(e) {
      
      this.triggerEvent('confirmPay', {
        item: this.data.item, 
      })
      this.setData({
       
        item: ""
      })
   
    },

  
   


  },
  

  
  
})

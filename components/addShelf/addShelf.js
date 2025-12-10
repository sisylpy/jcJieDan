
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
    itemShelf: {
      type: Object,
      value: ""
    },
   
    shelfName: {
      type: String,
      value: ""
    },
    isEditShelf:{
      type: Boolean,
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


   

    cancle() {
      this.setData({ show: false, standardName: "",depGoodsName: "",itemShelf:"" })
      this.triggerEvent('cancle')
    },

    confirm(e) {
      if(this.data.shelfName.length > 0){
        this.triggerEvent('confirmShelf', {
          shelfName: this.data.shelfName,
        })
      }
     

      this.setData({
        show: false,
        shelfName: "",
        itemShelf: ""

      })
    },

    getShlefName: function (e) {
      console.log(e)
      this.setData({   
        shelfName: e.detail.value
      })
    },


    









  },
  

  
  
})

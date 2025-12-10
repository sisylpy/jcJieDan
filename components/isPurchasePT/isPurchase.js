const { disGetToStockGoodsWithDepIds } = require("../../lib/apiDistributer")

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
    scrollViewTop: {
      type: Number,
      value: ""
    },
    percentOne: {
      type: Number,
      value: ""
    },
    level: {
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

    cancle() {
      this.setData({
        show: false,
        item: "",
      })
      this.triggerEvent('cancle')
    },




    confirm(e) {
      this.triggerEvent('confirm', {
        item: this.data.item,
      
      })
      this.setData({
        show: false,
        item : ""
      })
    },

    changeWillPrice(e){
      var itemData = "item.nxDgWillPrice";
      var price = this.data.item.nxDgWillPrice;
      var newPrice = "";
      var type = e.currentTarget.dataset.type;
      if(type == 'add'){
        newPrice = (Number(price) + Number(0.1)).toFixed(1);
        
      }
      if(type == 'reduce'){
         newPrice = (Number(price) - Number(0.1)).toFixed(1);
      }

      this.setData({
        [itemData]: newPrice,
      })
      this._getPercent();
    },

    // changePrice(e){
    //   var itemData = "item.nxDgBuyingPrice";
    //   var price = this.data.item.nxDgBuyingPrice;
    //   var newPrice = "";
    //   var type = e.currentTarget.dataset.type;
    //   if(type == 'add'){
    //     newPrice = (Number(price) + Number(0.1)).toFixed(1);
        
    //   }
    //   if(type == 'reduce'){
    //      newPrice = (Number(price) - Number(0.1)).toFixed(1);
    //   }

    //   this.setData({
    //     [itemData]: newPrice,
    //   })
    //   this._getPercent();
    // },

    getUpdate(e){

     
      if(this.data.level == 1){
        var itemData = "item.nxDgBuyingPriceOneUpdate";
        this.setData({
         [itemData]: e.detail.value,
        })
      }else if(this.data.level == 2){
        var itemData = "item.nxDgBuyingPriceTwoUpdate";
        this.setData({
         [itemData]: e.detail.value,
        })
      }
      else if(this.data.level == 3){
        var itemData = "item.nxDgBuyingPriceThreeUpdate";
        this.setData({
         [itemData]: e.detail.value,
        })
      }
    },

    getBuyingPrice(e){
      if(this.data.level == 1){
        var itemData = "item.nxDgBuyingPriceOne";
        this.setData({
         [itemData]: e.detail.value,
        })
      }else if(this.data.level == 2){
        var itemData = "item.nxDgBuyingPriceTwo";
        this.setData({
         [itemData]: e.detail.value,
        })
      }
      else if(this.data.level == 3){
        var itemData = "item.nxDgBuyingPriceThree";
        this.setData({
         [itemData]: e.detail.value,
        })
      }
     
      this._getPercent();

    },

    getWillPrice(e){
      if(this.data.level == 1){
        var itemData = "item.nxDgWillPriceOne";
        this.setData({
         [itemData]: e.detail.value,
        })
      }else if(this.data.level == 2){
        var itemData = "item.nxDgWillPriceTwo";
        this.setData({
         [itemData]: e.detail.value,
        })
      }
      else if(this.data.level == 3){
        var itemData = "item.nxDgWillPriceThree";
        this.setData({
         [itemData]: e.detail.value,
        })
      }
     
      this._getPercent(); 
      

    },
   

    _getPercent(){
      if(this.data.level == 1){
        var willPrice = this.data.item.nxDgWillPriceOne;
        var outPrice = this.data.item.nxDgBuyingPriceOne;
  
        var percent = (Number(willPrice) - Number(outPrice)) / Number(willPrice);
        console.log(percent);
        percent = (percent * 100).toFixed(2);
        this.setData({
          percentOne: percent
        })
      }else if(this.data.level == 2){
        var willPrice = this.data.item.nxDgWillPriceTwo;
        var outPrice = this.data.item.nxDgBuyingPriceTwo;
  
        var percent = (Number(willPrice) - Number(outPrice)) / Number(willPrice);
        console.log(percent);
        percent = (percent * 100).toFixed(2);
        this.setData({
          percentTwo: percent
        })
      }else if(this.data.level == 3){
        var willPrice = this.data.item.nxDgWillPriceThree;
        var outPrice = this.data.item.nxDgBuyingPriceThree;
  
        var percent = (Number(willPrice) - Number(outPrice)) / Number(willPrice);
        console.log(percent);
        percent = (percent * 100).toFixed(2);
        this.setData({
          percentThree: percent
        })
      }
      
    },












  },




})
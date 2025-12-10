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

    delPrice(e){
      this.triggerEvent('delPrice', {
        item: this.data.item,
      
      })
      this.setData({
        show: false,
        item : ""
      })
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



    editLevelWeight(e){

     
      if(this.data.level == 1){
        var itemData = "item.nxDgWillPriceOneWeight";
        this.setData({
         [itemData]: e.detail.value,
        })
      }else if(this.data.level == 2){
        var itemData = "item.nxDgWillPriceTwoWeight";
        this.setData({
         [itemData]: e.detail.value,
        })
      }
      else if(this.data.level == 3){
        var itemData = "item.nxDgWillPriceThreeWeight";
        this.setData({
         [itemData]: e.detail.value,
        })
      }

      this._getPercent();
    },


    getLevelStandard(e){

      if(this.data.level == 1){
        var itemData = "item.nxDgWillPriceOneStandard";
        this.setData({
         [itemData]: e.detail.value,
        })
      }else if(this.data.level == 2){
        var itemData = "item.nxDgWillPriceTwoStandard";
        this.setData({
         [itemData]: e.detail.value,
        })
      }
      else if(this.data.level == 3){
        var itemData = "item.nxDgWillPriceThreeStandard";
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
        var levelWeight = this.data.item.nxDgWillPriceOneWeight;
        var percent = (Number(willPrice) - Number(outPrice)) / Number(willPrice);
        percent = (percent * 100).toFixed(2);
        var itemData = "item.nxDgPriceProfitOne";
        var itemAboutData = "item.nxDgWillPriceOneAboutPrice";
        // var aboutPrice = (Number(willPrice) / Number(levelWeight)).toFixed(1);
        this.setData({
          percentOne: percent,
          [itemData]: percent,
          [itemAboutData]: willPrice,
        })
      }else if(this.data.level == 2){
        var willPrice = this.data.item.nxDgWillPriceTwo;
        var outPrice = this.data.item.nxDgBuyingPriceTwo;
        var levelWeight = this.data.item.nxDgWillPriceTwoWeight;
        var percent = (Number(willPrice) - Number(outPrice)) / Number(willPrice);
        console.log(percent);
        percent = (percent * 100).toFixed(2);
        var itemData = "item.nxDgPriceProfitTwo";
        var itemAboutData = "item.nxDgWillPriceTwoAboutPrice";
        var aboutPrice = (Number(willPrice) / Number(levelWeight)).toFixed(1);
        this.setData({
          percentTwo: percent,
          [itemData]: percent,
          [itemAboutData]: aboutPrice,
        })
      }else if(this.data.level == 3){
        var willPrice = this.data.item.nxDgWillPriceThree;
        var outPrice = this.data.item.nxDgBuyingPriceThree;
        var levelWeight = this.data.item.nxDgWillPriceThreeWeight;
        var percent = (Number(willPrice) - Number(outPrice)) / Number(willPrice);
        console.log(percent);
        percent = (percent * 100).toFixed(2);
        var itemData = "item.nxDgPriceProfitThree";
        var itemAboutData = "item.nxDgWillPriceThreeAboutPrice";
        var aboutPrice = (Number(willPrice) / Number(levelWeight)).toFixed(1);
        this.setData({
          percentThree: percent,
          [itemData]: percent,
          [itemAboutData]: aboutPrice,
        })
      }
      
    },












  },




})
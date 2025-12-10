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


  },

  /**
   * 组件的初始数据
   */
  data: {
    level: 1

  },

  /**
   * 组件的方法列表
   */
  methods: {
    radioChange(e) {
      this.setData({
        level: e.detail.value
      })
      console.log(this.data.level)
    },


    cancle() {
      this.setData({
        show: false,
        item: "",
        percent: "0"
      })
      this.triggerEvent('cancle')
    },


    confirm(e) {
      var value  = this.data.item.nxDgWillPrice; 
     var willItemData = "item.nxDgWillPrice";
     if (!isNaN(value) && value.indexOf('.') === -1) {
      // 添加小数点
       value = value + '.0';
    }

      this.setData({
        [willItemData]: value,
      })      
     
      this.triggerEvent('confirm', {
        item: this.data.item,
      })

      this.setData({
        show: false,
        item: ""
      })
    },


    changeWillPrice(e) {
      var newPrice = "";
      var type = e.currentTarget.dataset.type;

      var onePrice  = this.data.item.nxDgWillPrice;
      var oneItemData = "item.nxDgWillPrice";
    
      if (type == 'add') {
        newPrice = (Number(onePrice) + Number(0.1)).toFixed(1);
      }
      if (type == 'reduce') {
        newPrice = (Number(onePrice) - Number(0.1)).toFixed(1);
      }
     
      this.setData({
        [oneItemData]: newPrice,
      })

      var buyPrice = this.data.item.nxDgBuyingPrice;
      if(buyPrice == '0.1'){
        var buyingPrice = "item.nxDgBuyingPrice";
        this.setData({
          [buyingPrice]: (Number(newPrice) / 2).toFixed(1)
        })
      }

      this._getPercent();
    },


    changePrice(e) {
      var newPrice = "";
      var price = this.data.item.nxDgBuyingPrice;
      var type = e.currentTarget.dataset.type;
      var itemData = "item.nxDgBuyingPrice";
      if (type == 'add') {
        newPrice = (Number(price) + Number(0.1)).toFixed(1);
      }
      if (type == 'reduce') {
        newPrice = (Number(price) - Number(0.1)).toFixed(1);
      }
      this.setData({
        [itemData]: newPrice
      })
      this._getPercent();
    },


    getBuyingPrice(e) {
      var itemData = itemData = "item.nxDgBuyingPrice";
      this.setData({
        [itemData]: e.detail.value,
      })
      this._getPercent();
    },

    getWillPrice(e) {
     var value = e.detail.value;
      var oneItemData = "item.nxDgWillPrice";
      this.setData({
        [oneItemData]: value
      })
      var buyPrice = this.data.item.nxDgBuyingPrice;
      if(buyPrice == '0.1'){
        var buyingPrice = "item.nxDgBuyingPrice";
        this.setData({
          [buyingPrice]: (Number(newPrice) / 2).toFixed(1)
        })
      }
     
      this._getPercent();

    },

    getWeight(e) {
      var itemData = "";
      if (this.data.level == 1) {
        itemData = "item.nxDgWillPriceOneWeight";
      }
      if (this.data.level == 2) {
        itemData = "item.nxDgWillPriceTwoWeight";
      }
      if (this.data.level == 3) {
        itemData = "item.nxDgWillPriceThreeWeight";
      }
      this.setData({
        [itemData]: e.detail.value,
      })
    },


    _getPercent() {
      var buyingPrice = this.data.item.nxDgBuyingPrice;
      var willPriceOne = this.data.item.nxDgWillPriceOne;
      var itemDataOne = "item.nxDgPriceProfitOne";
      var percentOne = ((Number(willPriceOne) - Number(buyingPrice)) / Number(willPriceOne)).toFixed(2);
      this.setData({
        [itemDataOne]: percentOne,
      })

     var  itemDataTwo = "item.nxDgPriceProfitTwo";
     var  willPriceTwo = this.data.item.nxDgWillPriceTwo;
      var percentTwo = ((Number(willPriceTwo) - Number(buyingPrice)) / Number(willPriceTwo)).toFixed(2);
      this.setData({
        [itemDataTwo]: percentTwo,
      })
     var itemDataThree = "item.nxDgPriceProfitThree";
     var  willPriceThree = this.data.item.nxDgWillPriceThree;
      var percentThree = ((Number(willPriceThree) - Number(buyingPrice)) / Number(willPriceThree)).toFixed(2);
      this.setData({
        [itemDataThree]: percentThree,
      })
    },
  },




})
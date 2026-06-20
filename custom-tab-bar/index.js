Component({
  data: {
    selected: 0,
    showTabBar: true,
    list: [
      {
        "pagePath": "pages/order/index/index",
        "text": "订单",     
         "iconPath": "/images/icons/icon_orders.png",
        "selectedIconPath": "/images/icons/icon_orders_active.png"
      }, 
      {
        "pagePath": "pages/stock/index/index",
        "text": "出货中",
        "iconPath": "/images/icons/icon_stock.png",
        "selectedIconPath": "/images/icons/icon_stock_active.png"
      }, {
        "pagePath": "pages/purchase/index/index",
        "text": "采购中",
        "iconPath": "/images/icons/icon_purchase.png",
        "selectedIconPath": "/images/icons/icon_purchase_active.png"
      }, 
      {
        "pagePath": "pages/doing/index/index",
        "text": "协作伙伴",
        "iconPath": "/images/icons/hezuowoshou.png",
        "selectedIconPath": "/images/icons/hezuowoshou-2.png"
      }, 
      // {
      //   "pagePath": "pages/goods/goods",
      //   "text": "商品",
      //   "iconPath": "/images/icons/icon_goods.png",
      //   "selectedIconPath": "/images/icons/icon_goods_active.png"
      // }
    ]
  },
  methods: {
    switchTab(e) {
      wx.removeStorageSync('toDetail');
      wx.removeStorageSync('sons');
      wx.removeStorageSync('depFatherId');
      wx.removeStorageSync('greatGrandFatherId');
      wx.removeStorageSync('grandFatherId');
      wx.removeStorageSync('disGoods');
      wx.removeStorageSync('fatherGoods');
      wx.removeStorageSync('weightItem');
      wx.removeStorageSync('showType');
      wx.removeStorageSync('toOrderWx');
      wx.removeStorageSync('notUpdate');
      
      const data = e.currentTarget.dataset;
      const url = '/' + data.path;
      wx.switchTab({ url });
      this.setData({
        selected: data.index
      });
    }
  }
});

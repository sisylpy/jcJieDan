var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil');

let windowWidth = 0;
let itemWidth = 0;

import {
  reSearchNxGoodsForTempGoods,
  disGetGoodsDetail

} from '../../../../lib/apiDistributer'
Page({

 onShow(){
  if(this.data.update){
    this._getGoodsDetail();
  }
 },

  /**
   * 页面的初始数据
   */
  data: {
    items: [{
      name: '-1',
      value: '出库'
    },
    {
      name: '1',
      value: '采购',
    },
    // {
    //   name: '2',
    //   value: '指定供货',
    // },
    // {
    //   name: '0',
    //   value: '自采'
    // },
  ],


  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const app = getApp();
    const globalData = app.globalData;

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      color: options.color,
      upTime: dateUtils.getDateTimeString(),
      fatherName: options.fatherName,
      disId: options.disId,
      canSave: true,
      from: options.from
    })
    var value = wx.getStorageSync('disGoods');
    if (value) {
      this.setData({
        goods: value
      })
    }
    var disInfo = wx.getStorageSync('disInfo');
    if(disInfo){
      this.setData({
        disInfo: disInfo
      })
    }
  },

  _getGoodsDetail() {
    load.showLoading("获取商品信息")
    disGetGoodsDetail(this.data.goods.nxDistributerGoodsId).then(res => {
      if (res.result.code == 0) {
        console.log(res.result.data.orderArr);
        load.hideLoading();
        this.setData({
          goods: res.result.data.goodsInfo,
         
        })
      }else{
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
        })

      }
       //创建节点选择器
       var that = this;
       var query = wx.createSelectorQuery();
       //选择id
       query.select('#mjltest').boundingClientRect()
       query.exec(function (res) {
         that.setData({
           maskHeight: res[0].height * globalData.rpxR
         })
       })
    })
  },
  radioChangePurType: function (e) {
    console.log(e);
    var value = e.detail.value;
    console.log(value);
    if(value < 2){
      var detail = "goods.nxDgPurchaseAuto";
      this.setData({
        [detail]: value,
      })
      // var data = "goods.nxDgSupplierId";
      // if(value !== 2){
      //   this.setData({
      //     [data]: null,
      //   })
  
      // }
    }else{
      wx.showToast({
        title: '直接选择指定供货商',
        icon: 'none'
      })
      var detail = "goods.nxDgPurchaseAuto";
      this.setData({
        [detail]: this.data.goods.nxDgPurchaseAuto,
      })
    }
   
  },


  delSupplierId(){
      var data = "goods.nxDgSupplierId";
      var dataSupplier = "goods.nxJrdhSupplierEntity";
        this.setData({
          [data]: null,
          [dataSupplier] : null,
        })
  
      
      // var goods = this.data.goods;
      // goods.nxDgSupplierId = null;
      

  },


  radioChange(e) {
    console.log(e.detail.value);
    var gradeData = "goods.nxDgBuyingPriceIsGrade"
    this.setData({
      [gradeData]: e.detail.value,
    })
    this._ifCanSave();
  },

  getBuyingPrice(e) {
    var gradeData = "goods.nxDgBuyingPriceIsGrade";
    var priceData = "goods.nxDgBuyingPrice";
    var priceUpdateData = "goods.nxDgBuyingPriceUpdate";
    var priceOneData = "goods.nxDgBuyingPriceOne";
    var priceOneUpdateData = "goods.nxDgBuyingPriceOneUpdate";
    var priceTwoData = "goods.nxDgBuyingPriceTwo";
    var priceTwoUpdateData = "goods.nxDgBuyingPriceTwoUpdate";
    var priceThreeData = "goods.nxDgBuyingPriceThree";
    var priceThreeUpdateData = "goods.nxDgBuyingPriceThreeUpdate";

    var type = e.currentTarget.dataset.type;
    if (type == 0) {
      this.setData({
        [gradeData]: 0,
        [priceData]: e.detail.value,
        [priceUpdateData]: this.data.upTime,
        [priceOneData]: null,
        [priceTwoData]: null,
        [priceThreeData]: null,
        [priceOneUpdateData]: null,
        [priceTwoUpdateData]: null,
        [priceThreeUpdateData]: null,

      })
    }
    if (type == 1) {
      this.setData({
        [gradeData]: 1,
        [priceData]: null,
        [priceUpdateData]: null,
        [priceOneData]: e.detail.value,
        [priceOneUpdateData]: this.data.upTime,
      })
    }
    if (type == 2) {
      this.setData({
        [gradeData]: 1,
        [priceData]: null,
        [priceTwoData]: e.detail.value,
        [priceTwoUpdateData]: this.data.upTime,
      })
    }
    if (type == 3) {
      this.setData({
        [gradeData]: 1,
        [priceData]: null,
        [priceThreeData]: e.detail.value,
        [priceThreeUpdateData]: this.data.upTime,

      })
    }
    this._ifCanSave();

  },


  toGreatGrandGoods() {
    console.log("toGreatGrandGoods")
    wx.navigateTo({
      url: '../../goods/greatGrandGoods/greatGrandGoods?disId=' + this.data.disId,
    })
  },

  _ifCanSave() {
    console.log("_ifCanSave")
    if (this.data.goods.nxDgBuyingPriceIsGrade == 0) {
      if (this.data.goods.nxDgGoodsName.length > 0 && this.data.goods.nxDgGoodsStandardname.length > 0 && this.data.goods.nxDgDfgGoodsFatherId > 0 && this.data.goods.nxDgBuyingPrice > 0) {
        this.setData({
          canSave: true
        })
      } else {
        this.setData({
          canSave: false
        })
      }
    }
    if (this.data.goods.nxDgBuyingPriceIsGrade == 1) {
      console.log("nxDgBuyingPriceIsGrade==111")
      if (this.data.goods.nxDgGoodsName.length > 0 && this.data.goods.nxDgGoodsStandardname.length > 0 && this.data.goods.nxDgDfgGoodsFatherId > 0 && this.data.goods.nxDgBuyingPriceOne > 0 &&
        this.data.goods.nxDgBuyingPriceTwo > 0 && this.data.goods.nxDgBuyingPriceThree > 0) {
        this.setData({
          canSave: true
        })
      } else {
        this.setData({
          canSave: false
        })
      }
    }
  },


  getDisGoodsContent(e) {
    console.log(e.currentTarget.dataset.type)
    var eValue = e.detail.value;
    var name = "goods.nxDgGoodsName";
    var standard = "goods.nxDgGoodsStandardname";
    var standardWeight = "goods.nxDgGoodsStandardWeight";
    var brand = "goods.nxDgGoodsBrand";
    console.log(e);
    if (e.currentTarget.dataset.type == 0) {
      this.setData({
        [name]: eValue
      })
      console.log(this.data.goods.nxDgGoodsName);
    }
    if (e.currentTarget.dataset.type == 1) {
      this.setData({
        [standard]: eValue
      })
    }

    if (e.currentTarget.dataset.type == 2) {
      this.setData({
        [standardWeight]: eValue
      })
    }
    if (e.currentTarget.dataset.type == 3) {
      this.setData({
        [brand]: eValue
      })
    }
    if (e.currentTarget.dataset.type == 4) {
      var place = "goods.nxDgGoodsPlace";
      this.setData({
        [place]: eValue
      })
    }
    if (e.currentTarget.dataset.type == 7) {
      var detail = "goods.nxDgGoodsDetail";
      this.setData({
        [detail]: eValue
      })

    } if (e.currentTarget.dataset.type == 8) {
      var detail = "goods.nxDgQuantityDays";
      this.setData({
        [detail]: eValue
      })

    }
    
    this._ifCanSave();

  },


  // getInformation(e) {
  //   if (e.currentTarget.dataset.type == 0) {
  //     var detail = "goods.nxDgGoodsDetail";
  //     this.setData({
  //       [detail]: e.detail.value,
  //     })
  //   }
  //   if (e.currentTarget.dataset.type == 1) {
  //     wx.navigateTo({
  //       url: '../distributer/distributer',
  //     })
  //   }
  //   if (e.currentTarget.dataset.type == 2) {
  //     var priceData = "goods.nxDgGoodsPrice";
  //     var integerData = "goods.nxDgGoodsPriceInteger";
  //     var deceimalData = "goods.nxDgGoodsPriceDecimal";
  //     var inputValue = e.detail.value;
  //     if (inputValue.indexOf(".") != -1) {
  //       var temPrice = inputValue.split('.')
  //       var integer = temPrice[0];
  //       var decimal = temPrice[1];

  //     } else {
  //       decimal = 0;
  //     }
  //     if (e.detail.value.length > 0) {
  //       this.setData({
  //         [priceData]: e.detail.value,
  //         [integerData]: integer,
  //         [deceimalData]: decimal
  //       })
  //     } else {
  //       this.setData({
  //         [priceData]: "",
  //         [integerData]: "",
  //         [deceimalData]: ""
  //       })
  //     }
  //   }
  //   if (e.currentTarget.dataset.type == 3) {
  //     var price2 = "goods.nxDgGoodsTwoPrice";
  //     if (e.detail.value.length > 0) {
  //       this.setData({
  //         [price2]: e.detail.value,
  //       })
  //     } else {
  //       this.setData({
  //         [price2]: "",
  //       })
  //     }
  //   }
  //   if (e.currentTarget.dataset.type == 4) {
  //     var price3 = "goods.nxDgGoodsThreePrice";
  //     if (e.detail.value.length > 0) {
  //       this.setData({
  //         [price3]: e.detail.value,
  //       })
  //     } else {
  //       this.setData({
  //         [price3]: "",
  //       })
  //     }

  //   }
  //   if (e.currentTarget.dataset.type == 5) {
  //     var price4 = "goods.nxDgBuyingPrice";
  //     if (e.detail.value.length > 0) {
  //       this.setData({
  //         [price4]: e.detail.value,
  //       })
  //     }
  //   }
  //   if (e.currentTarget.dataset.type == 6) {
  //     wx.navigateTo({
  //       url: '../distributerCata/distributerCata?disId=' + this.data.goods.nxDistributerEntity.nxDistributerId + '&name=' + this.data.goods.nxDgGoodsName,
  //     })

  //   }
  // },

  updateDisGoods(e) {
    load.showLoading("保存商品")
    reSearchNxGoodsForTempGoods(this.data.goods).then(res => {
      if (res.result.code == 0) {
        load.hideLoading();

        // 更新所有相关页面的数据
        this._updateAllPages();

        wx.navigateBack({
          delta: 1,
        })
      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })

  },

  // 更新所有相关页面的数据
  _updateAllPages() {
    var pages = getCurrentPages();
    
    // 更新 disGoodsPage (第二个页面)
    var disGoodsPage = pages[pages.length - 2];
    if (disGoodsPage) {
      disGoodsPage.setData({
        update: true,
        isFirstLoad: true
      })
    }

    // 更新 goods 页面 (第一个页面) - 直接更新对应索引的商品
    var goodsPage = pages[pages.length - 3];
    if (goodsPage && goodsPage.data.goodsList) {
      // 获取 editIndex，这个值应该从 disGoodsPage 传递过来
      var editIndex = disGoodsPage.data.editIndex;
      if (editIndex !== undefined && goodsPage.data.goodsList[editIndex]) {
        var data = "goodsList[" + editIndex + "]";
        goodsPage.setData({
          [data]: this.data.goods,
        })
        console.log("从 disGoodsDetail 更新 goods 页面商品成功，索引:", editIndex);
      } else {
        console.log("无法从 disGoodsDetail 更新 goods 页面，editIndex:", editIndex);
      }
    }
  },

  toSupplier(){
    wx.setStorageSync('goodsItem', this.data.goods);
    wx.navigateTo({
      url: '../appointSupplierList/appointSupplierList?disId=' + this.data.disId,
    })
  },

  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  }





})
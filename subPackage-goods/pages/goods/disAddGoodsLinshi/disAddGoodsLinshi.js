var app = getApp();
var dateUtils = require('../../../../utils/dateUtil');
import {
  saveNxDisLinshiGoods,
  
} from '../../../../lib/apiDistributer'

import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');

/**
 * 将标准重量单位从中文转换为英文标准单位
 * @param {string} standardWeight - 标准重量字符串，如 "500g", "1kg", "500毫升", "1升", "2斤" 等
 * @returns {string} 转换后的标准单位字符串，如 "500g", "1kg", "500ml", "1L" 等
 */
function convertStandardWeightUnit(standardWeight) {
  if (!standardWeight || typeof standardWeight !== 'string') {
    return standardWeight || '';
  }

  // 单位映射表：中文单位 -> 英文单位
  const unitMap = {
    '升': 'L',
    '毫升': 'ml',
    '斤': 'Kg',  // 注意：1斤=0.5kg，但这里只转换单位，不转换数值
    '公斤': 'Kg',
    '千克': 'Kg',
    '克': 'g'
  };

  // 去除首尾空格
  let value = standardWeight.trim();
  
  // 如果已经是空字符串，直接返回
  if (!value) {
    return value;
  }

  // 匹配数字和单位（支持小数和空格）
  // 匹配模式：数字部分（可能包含小数点）+ 可选的空格 + 单位部分（中文或英文）
  const match = value.match(/^([\d.]+)\s*([^\d\s]+)$/);
  
  if (match) {
    const numberPart = match[1]; // 数字部分
    let unitPart = match[2].trim(); // 单位部分，去除首尾空格
    
    // 检查单位是否是中文单位
    if (unitMap[unitPart]) {
      // 如果是中文单位，转换为英文单位
      return numberPart + unitMap[unitPart];
    } else {
      // 如果已经是英文单位（g/kg/ml/L），直接返回
      // 验证是否为标准单位
      const standardUnits = ['g', 'kg', 'ml', 'L', 'G', 'KG', 'ML'];
      if (standardUnits.includes(unitPart)) {
        // 统一转换为小写（L保持大写）
        if (unitPart.toUpperCase() === 'L') {
          return numberPart + 'L';
        } else {
          return numberPart + unitPart.toLowerCase();
        }
      }
      // 如果不是标准单位，返回原值
      return value;
    }
  }
  
  // 如果没有匹配到数字+单位的模式，返回原值
  return value;
}

Page({



  /**
   * 页面的初始数据
   */
  data: {
    // 价格策略选项（仅作字段保存，不接入计价逻辑）
    priceStrategyList: [
      { value: 'STANDARD_PRICE', label: '普通单价' },
      { value: 'GROSS_WEIGHT_PRICE', label: '按毛重计价' },
      { value: 'NET_WEIGHT_PRICE', label: '按净重计价' },
      { value: 'CUSTOMER_PRICE', label: '客户价' },
    ],
    priceStrategyIndex: 0,
  },


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const globalData = app.globalData;

    var disInfoValue = wx.getStorageSync('disInfo');
    this.setData({
      disInfo: disInfoValue,
      disId: disInfoValue.nxDistributerId
    })

    // 解码 URL 参数（如果使用 encodeURIComponent 编码过）
    var goodsName = options.goodsName ? decodeURIComponent(options.goodsName) : '';
    var standard = options.standard ? decodeURIComponent(options.standard) : '';
    var standardWeight = options.standardWeight ? convertStandardWeightUnit(decodeURIComponent(options.standardWeight)) : '';
    var cartonUnit = options.cartonUnit ? decodeURIComponent(options.cartonUnit) : '';
    var itemsPerCarton = options.itemsPerCarton ? decodeURIComponent(options.itemsPerCarton) : '';

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      from: options.from,
      goods: {
        nxDgGoodsId: "-1",
        nxDgPullOff: 0,
        nxDgGoodsStatus: 0,
        nxDgBuyingPriceOne: "1",
        nxDgBuyingPriceUpdate: dateUtils.getArriveDate(0),
        nxDgDistributerId: this.data.disId,
        nxDgGoodsName: goodsName, 
         nxDgGoodsStandardWeight: standardWeight,
        nxDgGoodsBrand: "-1",
        nxDgGoodsPlace: "-1",
        nxDgGoodsInventoryType: 1,
        nxDgNxGoodsFatherColor: "#20afb8",
        nxDgGoodsFile: 'goodsImage/logo.jpg',
        nxDistributerStandardEntities: [],
        nxDgCartonUnit: cartonUnit,
        nxDgItemsPerCarton: itemsPerCarton,
        nxDgPriceStrategy: "STANDARD_PRICE"
      },
      fatherName: "临时添加",
      isGrade: 0,
    })

    var data = "goods.nxDgGoodsStandardname";
    if(standard){
      this.setData({
       [data]: standard,
      }, () => {
        // 设置完规格后，重新检查是否可以保存
        this._ifCanSave();
      })
    }else{
      this.setData({
        [data]: "",
      }, () => {
        // 初始化完成后检查是否可以保存
        this._ifCanSave();
      })
    }
  },
  

  toGreatGrandGoods() {
    console.log("toGreatGrandGoods")
    wx.navigateTo({
      url: '../../goods/greatGrandGoods/greatGrandGoods?disId=' + this.data.disId,
    })
  },


  // 价格策略选择（仅作字段保存，不接入计价逻辑）
  changePriceStrategy(e) {
    var index = e.detail.value;
    var list = this.data.priceStrategyList;
    this.setData({
      priceStrategyIndex: index,
      'goods.nxDgPriceStrategy': list[index].value,
    })
  },

  getDisGoodsContent(e) {
    var nameData = "goods.nxDgGoodsName";
    var standardData = "goods.nxDgGoodsStandardname";
    var standardWeightData = "goods.nxDgGoodsStandardWeight";
    var brandData = "goods.nxDgGoodsBrand";
    var placeData = "goods.nxDgGoodsPlace";
    var detailData = "goods.nxDgGoodsDetail";
    var cartonUnitData = "goods.nxDgCartonUnit";
    var itemsPerCartonData = "goods.nxDgItemsPerCarton";


    if (e.currentTarget.dataset.type == 0) {
      this.setData({
        name: e.detail.value,
        [nameData]: e.detail.value
      })
    }
    if (e.currentTarget.dataset.type == 1) {
      this.setData({
        standard: e.detail.value,
        [standardData]: e.detail.value
      })
    }
    if (e.currentTarget.dataset.type == 2) {
      // 转换标准重量单位：将中文单位转换为英文标准单位
      const convertedValue = convertStandardWeightUnit(e.detail.value);
      this.setData({
        [standardWeightData]: convertedValue
      })
    }
    if (e.currentTarget.dataset.type == 3) {
      this.setData({
        [brandData]: e.detail.value
      })
    }
    if (e.currentTarget.dataset.type == 4) {
      this.setData({
        [placeData]: e.detail.value
      })
    }

    if (e.currentTarget.dataset.type == 5) {
      this.setData({
        [detailData]: e.detail.value
      })
    }

    if (e.currentTarget.dataset.type == 6) {
      this.setData({
        [cartonUnitData]: e.detail.value
      })
    }

    if (e.currentTarget.dataset.type == 7) {
      this.setData({
        [itemsPerCartonData]: e.detail.value
      })
    }

    if (e.currentTarget.dataset.type == 12) {
      this.setData({ "goods.nxDgGrossWeightJin": e.detail.value })
    }
    if (e.currentTarget.dataset.type == 13) {
      this.setData({ "goods.nxDgNetWeightJin": e.detail.value })
    }
    
    if (e.currentTarget.dataset.type == 16) {
      this.setData({ "goods.nxDgOuterGrossWeightJin": e.detail.value })
    }
    if (e.currentTarget.dataset.type == 17) {
      this.setData({ "goods.nxDgOuterNetWeightJin": e.detail.value })
    }
  

    this._ifCanSave();


  },

  _ifCanSave() {
    console.log("_ifCanSave")
    const goods = this.data.goods || {};
    const goodsName = goods.nxDgGoodsName;
    const standardName = goods.nxDgGoodsStandardname;
    
    // 检查商品名称和规格是否都已填写
    if (goodsName && goodsName.trim().length > 0 && 
        standardName && standardName.trim().length > 0) {
      this.setData({
        canSave: true
      })
    } else {
      this.setData({
        canSave: false
      })
    }
  },


  saveDisGoods() {
    if (this.data.canSave) {
      load.showLoading("保存商品")
      saveNxDisLinshiGoods(this.data.goods).then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
        
          if(this.data.from == 'resGoods'){

            var pages = getCurrentPages();
            var prevPage = pages[pages.length - 2]; //上一个页面
            prevPage.setData({
              itemDis: res.result.data,
              goodsId: res.result.data.nxDistributerGoodsId,
              show: true,
              findGoods: true,
              applyStandardName: res.result.data.nxDgGoodsStandardname,
            })
            wx.navigateBack({
              delta: 1,
            })
          } else if(this.data.from == 'shelf'){
            // 从货架页面跳转过来，返回商品数据供添加为货架商品
            var pages = getCurrentPages();
            var prevPage = pages[pages.length - 2]; //上一个页面
            prevPage.setData({
              tempGoodsAdded: true,
              tempGoodsData: res.result.data,
            })
            wx.navigateBack({
              delta: 1,
            })
          } else {
            var pages = getCurrentPages();
            var prevPage = pages[pages.length - 2]; //上一个页面
            prevPage.setData({
              goodsId: res.result.data.nxDistributerGoodsId,
              findGoods: true,
              name: this.data.goods.nxDgGoodsName,
              standard: this.data.nxDgGoodsStandardname,
              item: this.data.goods,
            })
            wx.navigateBack({delta: 1})
    
          }
          

        } else {
         
          wx.showModal({
            title: '保存失败',
            content: '存在相同商品',
            showCancel: false,
            confirmText: "知道了", //默认是"确定"
            confirmColor: 'blac'
            
          })
        }
      })
    } else {
      wx.showToast({
        title: '请填写必填项',
        icon: 'none'
      })
    }

  },
  
  
  hideMask(){
    this.setData({
      showTishi: false
    })
  },

  orderGoods(e){
    var item = e.currentTarget.dataset.item;
    var pages = getCurrentPages();
    var prevPage = pages[pages.length - 2]; //上一个页面
    prevPage.setData({
      itemDis: item,
      show: true,
      applyStandardName: item.nxDgGoodsStandardname,
    })

    wx.navigateBack({
      delta: 1,
    })
  
  },






  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },









})
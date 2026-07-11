var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil');

let windowWidth = 0;
let itemWidth = 0;

import {
  disGoodsUpdate,
  disGetGoodsDetail,
  disGetGoodsTierPriceList,
  disSaveOrUpdateGoodsTierPrice,
  disDeleteGoodsTierPrice,
  disUpdateGoodsTierPriceStatus

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


  // 价格策略选项（仅作字段保存，不接入计价逻辑）
  priceStrategyList: [
    { value: 'STANDARD_PRICE', label: '普通单价' },
    { value: 'GROSS_WEIGHT_PRICE', label: '按毛重计价' },
    { value: 'NET_WEIGHT_PRICE', label: '按净重计价' },
    { value: 'CUSTOMER_PRICE', label: '客户价' },
  ],
  priceStrategyIndex: 0,

  // 价格阶梯配置
  tierPriceUnitTypeList: [
    { value: 'GOODS_STANDARD', label: '按商品规格计价' },
    { value: 'OUTER_PACKAGE', label: '按大包装计价' },
  ],
  tierPriceUnitTypeIndex: 0,
  tierRuleId: null,
  saleRule: {
    saleUnit: '',
    minOrderQuantity: '',
    incrementStep: 1,
    maxOrderQuantity: '',
    perUserLimitQuantity: '',
    status: 'ACTIVE'
  },
  tierPrices: [],
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
      // 回显价格策略选中项
      var strategy = value.nxDgPriceStrategy;
      var idx = 0;
      var list = this.data.priceStrategyList;
      for (var i = 0; i < list.length; i++) {
        if (list[i].value === strategy) {
          idx = i;
          break;
        }
      }
      this.setData({
        priceStrategyIndex: idx
      });
      this._loadTierPrice(value.nxDistributerGoodsId);
    }
    var disInfo = wx.getStorageSync('disInfo');
    if(disInfo){
      var businessTypeId = disInfo.nxDistributerBusinessTypeId;
      var items = [
        { name: '-1', value: '出库' },
        { name: '1', value: '采购' },
      ];
      if (businessTypeId > 2) {
        items.push({ name: '2', value: '自动订货' });
      }
      this.setData({
        disInfo: disInfo,
        businessTypeId: businessTypeId,
        items: items,
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
    var value = e.detail.value;
    var detail = "goods.nxDgPurchaseAuto";
    this.setData({
      [detail]: value,
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
    if (e.currentTarget.dataset.type == 9) {
      var cartonUnit = "goods.nxDgCartonUnit";
      this.setData({
        [cartonUnit]: eValue
      })
    }
    if (e.currentTarget.dataset.type == 10) {
      var itemsPerCarton = "goods.nxDgItemsPerCarton";
      this.setData({
        [itemsPerCarton]: eValue === '' || eValue === undefined ? null : eValue
      })
    }

    if (e.currentTarget.dataset.type == 12) {
      this.setData({ "goods.nxDgGrossWeightJin": eValue === '' || eValue === undefined ? null : eValue })
    }
    if (e.currentTarget.dataset.type == 13) {
      this.setData({ "goods.nxDgNetWeightJin": eValue === '' || eValue === undefined ? null : eValue })
    }
    if (e.currentTarget.dataset.type == 14) {
      this.setData({ "goods.nxDgGrossWeightPricePerJin": eValue === '' || eValue === undefined ? null : eValue })
    }
    if (e.currentTarget.dataset.type == 15) {
      this.setData({ "goods.nxDgNetWeightPricePerJin": eValue === '' || eValue === undefined ? null : eValue })
    }
    if (e.currentTarget.dataset.type == 16) {
      this.setData({ "goods.nxDgOuterGrossWeightJin": eValue === '' || eValue === undefined ? null : eValue })
    }
    if (e.currentTarget.dataset.type == 17) {
      this.setData({ "goods.nxDgOuterNetWeightJin": eValue === '' || eValue === undefined ? null : eValue })
    }
    if (e.currentTarget.dataset.type == 18) {
      this.setData({ "goods.nxDgOuterGrossWeightPricePerJin": eValue === '' || eValue === undefined ? null : eValue })
    }
    if (e.currentTarget.dataset.type == 19) {
      this.setData({ "goods.nxDgOuterNetWeightPricePerJin": eValue === '' || eValue === undefined ? null : eValue })
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

  // ===== 价格阶梯 =====
  _defaultSaleUnit(unitType) {
    if (unitType === 'OUTER_PACKAGE') {
      return this.data.goods.nxDgCartonUnit || '';
    }
    return this.data.goods.nxDgGoodsStandardname || '';
  },

  _initTierDefault() {
    this.setData({
      tierRuleId: null,
      tierPriceUnitTypeIndex: 0,
      saleRule: {
        saleUnit: this._defaultSaleUnit('GOODS_STANDARD'),
        minOrderQuantity: '',
        incrementStep: 1,
        maxOrderQuantity: '',
        perUserLimitQuantity: '',
        status: 'ACTIVE'
      },
      tierPrices: []
    });
  },

  _loadTierPrice(goodsId) {
    var that = this;
    disGetGoodsTierPriceList(goodsId).then(function (res) {
      if (res.result.code == 0) {
        var data = res.result.data;
        if (data && data.saleRule) {
          var rule = data.saleRule;
          var unitType = rule.tierPriceUnitType || 'GOODS_STANDARD';
          var idx = unitType === 'OUTER_PACKAGE' ? 1 : 0;
          var tiers = data.tierPrices || [];
          that.setData({
            tierRuleId: rule.id || null,
            tierPriceUnitTypeIndex: idx,
            saleRule: {
              saleUnit: rule.saleUnit || that._defaultSaleUnit(unitType),
              minOrderQuantity: rule.minOrderQuantity != null ? rule.minOrderQuantity : '',
              incrementStep: rule.incrementStep != null ? rule.incrementStep : 1,
              maxOrderQuantity: rule.maxOrderQuantity != null ? rule.maxOrderQuantity : '',
              perUserLimitQuantity: rule.perUserLimitQuantity != null ? rule.perUserLimitQuantity : '',
              status: rule.status || 'ACTIVE'
            },
            tierPrices: tiers.map(function (t, i) {
              return {
                id: t.id,
                key: t.id ? ('id_' + t.id) : ('new_' + Date.now() + '_' + i),
                minQuantity: t.minQuantity != null ? t.minQuantity : '',
                maxQuantity: t.maxQuantity != null ? t.maxQuantity : '',
                unitPrice: t.unitPrice != null ? t.unitPrice : '',
                sort: t.sort || (i + 1)
              };
            })
          });
        } else {
          that._initTierDefault();
        }
      } else {
        that._initTierDefault();
      }
    }).catch(function () {
      that._initTierDefault();
    });
  },

  changeTierPriceUnitType(e) {
    var index = e.detail.value;
    var unitType = this.data.tierPriceUnitTypeList[index].value;
    this.setData({
      tierPriceUnitTypeIndex: index,
      'saleRule.saleUnit': this._defaultSaleUnit(unitType)
    });
  },

  onTierSaleUnit(e) { this.setData({ 'saleRule.saleUnit': e.detail.value }); },
  onTierMinOrder(e) { this.setData({ 'saleRule.minOrderQuantity': e.detail.value }); },
  onTierIncrement(e) { this.setData({ 'saleRule.incrementStep': e.detail.value }); },
  onTierMaxOrder(e) { this.setData({ 'saleRule.maxOrderQuantity': e.detail.value }); },
  onTierPerUser(e) { this.setData({ 'saleRule.perUserLimitQuantity': e.detail.value }); },

  addTierRow() {
    var tiers = this.data.tierPrices;
    tiers.push({
      id: null,
      key: 'new_' + Date.now() + '_' + tiers.length,
      minQuantity: '',
      maxQuantity: '',
      unitPrice: '',
      sort: tiers.length + 1
    });
    this.setData({ tierPrices: tiers });
  },

  deleteTierRow(e) {
    var index = e.currentTarget.dataset.index;
    var tiers = this.data.tierPrices;
    var row = tiers[index];
    var that = this;
    if (row && row.id) {
      load.showLoading('删除');
      disDeleteGoodsTierPrice(row.id).then(function (res) {
        load.hideLoading();
        if (res.result.code == 0) {
          tiers.splice(index, 1);
          that.setData({ tierPrices: tiers });
        } else {
          wx.showToast({ title: res.result.msg || '删除失败', icon: 'none' });
        }
      }).catch(function () {
        load.hideLoading();
        wx.showToast({ title: '删除失败，请检查网络', icon: 'none' });
      });
    } else {
      tiers.splice(index, 1);
      that.setData({ tierPrices: tiers });
    }
  },

  onTierMin(e) {
    var i = e.currentTarget.dataset.index;
    this.setData({ ['tierPrices[' + i + '].minQuantity']: e.detail.value });
  },
  onTierMax(e) {
    var i = e.currentTarget.dataset.index;
    this.setData({ ['tierPrices[' + i + '].maxQuantity']: e.detail.value });
  },
  onTierUnitPrice(e) {
    var i = e.currentTarget.dataset.index;
    this.setData({ ['tierPrices[' + i + '].unitPrice']: e.detail.value });
  },

  toggleTierStatus(e) {
    var enabled = e.detail.value;
    this.setData({ 'saleRule.status': enabled ? 'ACTIVE' : 'INACTIVE' });
    if (this.data.tierRuleId) {
      var that = this;
      disUpdateGoodsTierPriceStatus({
        id: this.data.tierRuleId,
        status: enabled ? 'ACTIVE' : 'INACTIVE'
      }).then(function (res) {
        if (res.result.code != 0) {
          wx.showToast({ title: res.result.msg || '状态更新失败', icon: 'none' });
        }
      });
    }
  },

  _saveTierPrice() {
    var rule = this.data.saleRule;
    var tiers = this.data.tierPrices;
    var unitType = this.data.tierPriceUnitTypeList[this.data.tierPriceUnitTypeIndex].value;

    var incrementStep = rule.incrementStep;
    if (incrementStep === '' || incrementStep === null || incrementStep === undefined) {
      incrementStep = 1;
    }

    if (unitType === 'OUTER_PACKAGE' && !this.data.goods.nxDgCartonUnit) {
      wx.showToast({ title: '请先填写大包装单位', icon: 'none' });
      return;
    }

    var validTiers = [];
    if (tiers.length > 0) {
      for (var i = 0; i < tiers.length; i++) {
        var t = tiers[i];
        var minQ = parseFloat(t.minQuantity);
        var maxQ = parseFloat(t.maxQuantity);
        var price = parseFloat(t.unitPrice);
        if (isNaN(minQ) || minQ <= 0) {
          wx.showToast({ title: '第' + (i + 1) + '档起始数量有误', icon: 'none' }); return;
        }
        if (isNaN(price) || price <= 0) {
          wx.showToast({ title: '第' + (i + 1) + '档单价必须大于0', icon: 'none' }); return;
        }
        if (!isNaN(maxQ) && minQ > maxQ) {
          wx.showToast({ title: '第' + (i + 1) + '档区间有误', icon: 'none' }); return;
        }
        validTiers.push({ minQ: minQ, maxQ: maxQ });
      }
      var sorted = validTiers.slice().sort(function (a, b) { return a.minQ - b.minQ; });
      for (var j = 1; j < sorted.length; j++) {
        var prevMax = sorted[j - 1].maxQ;
        var curMin = sorted[j].minQ;
        if (!isNaN(prevMax) && prevMax >= curMin) {
          wx.showToast({ title: '阶梯区间存在交叉', icon: 'none' }); return;
        }
      }
    }

    var payload = {
      id: this.data.tierRuleId,
      distributerGoodsId: this.data.goods.nxDistributerGoodsId,
      distributerId: this.data.goods.nxDistributerId || this.data.disId,
      tierPriceUnitType: unitType,
      saleUnit: rule.saleUnit,
      minOrderQuantity: rule.minOrderQuantity || '',
      incrementStep: incrementStep,
      maxOrderQuantity: rule.maxOrderQuantity || '',
      perUserLimitQuantity: rule.perUserLimitQuantity || '',
      status: rule.status || 'ACTIVE',
      tierPrices: tiers.map(function (t, idx) {
        return {
          id: t.id,
          minQuantity: t.minQuantity,
          maxQuantity: t.maxQuantity,
          unitPrice: t.unitPrice,
          sort: t.sort || (idx + 1)
        };
      })
    };

    disSaveOrUpdateGoodsTierPrice(payload).then(function (res) {
      if (res.result.code != 0) {
        wx.showToast({ title: (res.result.msg || '阶梯价保存失败'), icon: 'none' });
      }
    }).catch(function () {
      wx.showToast({ title: '阶梯价保存失败，请检查网络', icon: 'none' });
    });
  },

  updateDisGoods(e) {
    load.showLoading("保存商品")
    disGoodsUpdate(this.data.goods).then(res => {
      if (res.result.code == 0) {
        load.hideLoading();

        // 更新所有相关页面的数据
        this._updateAllPages();

        // 设置刷新标识，通知商品列表页面刷新
        wx.setStorageSync('goodsNeedRefresh', true);

        // 商品保存成功后，再保存阶梯价（失败仅 toast，不影响商品保存结果）
        this._saveTierPrice();

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
    
    // 检查是否从货架页面跳转过来
    const fromShelfPage = wx.getStorageSync('fromShelfPage');
    const shelfGoodsListIndex = wx.getStorageSync('shelfGoodsListIndex');
    
    if (fromShelfPage && shelfGoodsListIndex !== undefined && shelfGoodsListIndex !== null) {
      // 从货架页面跳转过来，直接更新 shelfGoodsList[index].nxDistributerGoodsEntity
      var prevPage = pages[pages.length - 2]; // 上一个页面（货架页面）
      
      if (prevPage && prevPage.setData && prevPage.data.shelfGoodsList) {
        const shelfGoodsList = [...prevPage.data.shelfGoodsList];
        if (shelfGoodsList[shelfGoodsListIndex]) {
          shelfGoodsList[shelfGoodsListIndex] = {
            ...shelfGoodsList[shelfGoodsListIndex],
            nxDistributerGoodsEntity: this.data.goods // 替换商品实体
          };
          
          prevPage.setData({
            shelfGoodsList: shelfGoodsList
          });
          
          console.log('disGoodsDetail - 成功更新货架页面的 shelfGoodsList[' + shelfGoodsListIndex + '].nxDistributerGoodsEntity');
        } else {
          console.warn('disGoodsDetail - shelfGoodsListIndex 超出范围:', shelfGoodsListIndex);
        }
      }
      
      // 清除 storage
      wx.removeStorageSync('fromShelfPage');
      wx.removeStorageSync('shelfGoodsListIndex');
    } else {
      // 从其他页面跳转过来，保持原有逻辑
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
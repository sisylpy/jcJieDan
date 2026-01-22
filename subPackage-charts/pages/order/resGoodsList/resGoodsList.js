import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil');

import {
  queryDisGoodsByQuickSearchWithDepId,
  queryDisGoodsByQuickSearchWithDepIdDis,
  disSaveStandard,
  disDeleteStandard,
}
from '../../../../lib/apiDistributer'

import {
  saveOrder,
  updateOrder,
  deleteOrder,
  saveCash,
  saveOrderBefore,
  saveCashBefore,
} from '../../../../lib/apiDepOrder.js'


import {
  downDisGoods,
  disGetGoods,
} from '../../../../lib/apiibook'


Page({

  /**
   * 页面的初始数据
   */
  data: {

    fatherId: null,
    showArr: [],
    toSearch: true,
    bottom: 20, // 输入框距离底部的距离，初始值设为 20px
    keyBordHeight: 0,
    applyNumber: "",
    applyRemark: "",
    applyStandardName: "",
    item: "",
    maskHeight: "",
    scrollViewTop: 0,
    searchStr: "",
    item: null,
    strArr: [],
    nxArr: [],
    count: 0,
    level: "1",
    fromOcrOrder: '0', // 是否从 ocrOrder 页面跳转过来

  },


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    console.log('resGoodsList onLoad options:', options);
    const app = getApp();
    const globalData = app.globalData;

    var value = wx.getStorageSync('userInfo');
    if (value) {
      this.setData({
        disId: value.nxDistributerEntity.nxDistributerId,
        userInfo: value
      })
    }

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      depFatherId: options.depFatherId,
      depId: options.depId,
      depName: options.depName,
      redFatherId: options.resFatherId,
      gbDepFatherId: options.gbDepFatherId,
      depSettleType: options.depSettleType,
      beforeId: options.beforeId,
      fromOcrOrder: options.fromOcrOrder || wx.getStorageSync('fromOcrOrder') || '0', // 是否从 ocrOrder 页面跳转过来
      bottom: 20 // 设置输入框初始位置，确保显示在页面底部
    })
    
    console.log('========== resGoodsList onLoad 初始化 ==========');
    console.log('初始 bottom 值:', 20);
    console.log('windowHeight:', globalData.windowHeight * globalData.rpxR);
    console.log('windowWidth:', globalData.windowWidth * globalData.rpxR);
    console.log('===============================================');
    
    // 如果从 storage 读取到了标记，清除它
    if (wx.getStorageSync('fromOcrOrder') === '1') {
      wx.removeStorageSync('fromOcrOrder');
    }
    
    console.log('resGoodsList 设置后的 fromOcrOrder:', this.data.fromOcrOrder);

  },



  delStandard(e) {
    this.setData({
      warnContent: e.detail.standardName,
      show: false,
      popupType: 'deleteSpec',
      showPopupWarn: true,
      disStandardId: e.detail.id,
    })

  },

  /**
   * 删除申请
   */
  deleteApply() {
    this.setData({
      warnContent: this.data.goodsName + "  " + this.data.applyItem.nxDoQuantity + this.data.applyItem.nxDoStandard,
      // deleteShow: true,
      // show: false,
      popupType: 'deleteOrder',
      showPopupWarn: true,
      showOperation: false,
    })
  },

  confirmWarn() {
    if (this.data.popupType == 'deleteSpec') {
      this.deleteStandardApi()
    } else {
      this.deleteApplyApi()
    }
  },

  deleteStandardApi() {
    var that = this;
    disDeleteStandard(this.data.disStandardId).then(res => {
      if (res.result.code == 0) {
        this.setData({
          popupType: "",
          showPopupWarn: false,
          disStandardId: "",
        })

        that.setData({
          itemDis: res.result.data,
          item: res.result.data,
          // editApply: true,
          show: true,

        })

      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },

  /**
   * 删除申请
   */
  delApply() {
    if (this.data.applyItem.nxDoDepartmentId !== -1) {

      if (this.data.applyItem.nxDoPurchaseStatus == 3) {

        if (this.data.applyItem.purchaseGoodsEntity.nxDpgPayType == 1) {
          wx.showToast({
            title: '请采购员先删除采购记账数据',
            icon: 'none'
          })
        }

      } else {
        this.setData({
          warnContent: this.data.goodsName + "  " + this.data.applyItem.nxDoQuantity + this.data.applyItem.nxDoStandard,
          deleteShow: true,
          show: false,

          popupType: 'deleteOrder',
          showPopupWarn: true,
          showOperationGoods: false,
          showOperationLinshi: false
        })
      }
      this.setData({
        showOperationGoods: false,
        showOperationLinshi: false
      })
      this.hideModal();
    } else {
      wx.showToast({
        title: '不能修改客户订单',
        icon: 'none'
      })
      this.setData({
        showOperationGoods: false,
        showOperationLinshi: false
      })
      this.hideModal();
    }

  },


  deleteApplyApi() {

    this.setData({
      popupType: "",
      showPopupWarn: false,
    })

    var that = this;
    deleteOrder(this.data.applyItem.nxDepartmentOrdersId).then(res => {
      if (res.result.code == 0) {
        var arr = that.data.showArr;
        arr.splice(that.data.index, 1);
        that.setData({
          isSearching: false,
          strArr: [],
          searchStr: "",
          toSearch: true,
          showArr: arr,
          editApply: false,
          deleteShow: false,
        })

      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },

  closeWarn() {
    this.setData({
      applyItem: "",
      warnContent: "",
      show: false,
      popupType: '',
      showPopupWarn: false,
    })
  },

  onClosePopup() {
    this.setData({
      applyItem: "",
      warnContent: "",
      show: false,
      popupType: '',
      showPopupWarn: false,
    })
  },




  bindkeyboardheightchange(e) {
    const app = getApp();
    const globalData = app.globalData;
    const keyboardHeight = e.detail.height || 0;
    const currentBottom = this.data.bottom;
    const newBottom = keyboardHeight > 0 ? keyboardHeight : 20;
    
    console.log('========== bindkeyboardheightchange ==========');
    console.log('键盘高度 (px):', keyboardHeight);
    console.log('当前 bottom 值:', currentBottom);
    console.log('新的 bottom 值:', newBottom);
    console.log('键盘状态:', keyboardHeight > 0 ? '弹起' : '收起');
    console.log('keyBordHeight (rpx):', keyboardHeight * globalData.rpxR);
    console.log('=============================================');
    
    // 当键盘弹起时，设置 bottom 为键盘高度，使输入框位于键盘上方
    // 当键盘收起时（height 为 0），设置 bottom 为 20，使输入框回到底部
    // 延迟一下，确保动画流畅
    setTimeout(() => {
      this.setData({
        keyBordHeight: keyboardHeight * globalData.rpxR,
        bottom: newBottom,
      });
      console.log('✅ setData 完成，bottom 已设置为:', newBottom);
    }, 50);
  },


  getSearchString(e) {
    this.setData({
      isSearching: true,
      searchMore: true,
    })

    if (e.detail.value.length > 0) {
      var data = {
        disId: this.data.disId,
        searchStr: e.detail.value,
        depId: this.data.depId,
      }
      this.setData({
        searchStr: e.detail.value,
      })

      queryDisGoodsByQuickSearchWithDepIdDis(data).then(res => {
        if(res.result.code == 0){
         console.log("resss", res.result.data);
          const resultData = res.result.data || [];
          
          // 如果搜索结果数量为 0，自动请求 queryDisGoodsByQuickSearchWithDepId 接口
          if (resultData.length === 0) {
            console.log("搜索结果为空，自动请求 queryDisGoodsByQuickSearchWithDepId");
            load.showLoading("查询更多商品");
            var that = this;
            queryDisGoodsByQuickSearchWithDepId(data).then(res2 => {
              load.hideLoading();
              if(res2.result.code == 0){
                console.log("→ 自动查询更多商品结果，设置 strArr，长度:", res2.result.data.disArr?.length || 0);
                const strArr = res2.result.data.disArr || [];
                const nxArr = res2.result.data.nxArr || [];
                const totalCount = strArr.length + nxArr.length;
                that.setData({
                  strArr: strArr,
                  nxArr: nxArr,
                  count: totalCount,
                  searchMore: false,
                });
              } else {
                wx.showToast({
                  title: res2.result.msg || '查询失败',
                  icon: 'none'
                });
                that.setData({
                  nxArr: [],
                  strArr: [],
                  count: 0
                });
              }
            }).catch(err => {
              load.hideLoading();
              console.error('自动查询更多商品失败:', err);
              wx.showToast({
                title: '查询失败，请检查网络',
                icon: 'none'
              });
              that.setData({
                nxArr: [],
                strArr: [],
                count: 0
              });
            });
          } else {
            // 有搜索结果，正常设置
            this.setData({
              strArr: resultData,
              nxArr: [], // 确保 nxArr 被明确设置
              count: resultData.length,
              isSearching: true, // 确保 isSearching 保持为 true
            });
          }
        }else{
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        this.setData({
          nxArr: [],
          strArr: [],
          count: 0
        })
        }
      })
    } else {
      this.setData({
        searchArr: [],
        isSearching: false,
        searchStr: "",
        strArr: [],
        nxArr: [],
        count: 0
      })
    }

  },

  searchMore() {
   
    
    // 如果已经进行了更多范围搜索，提示用户（不管搜索结果如何）
    if(this.data.searchMore === false){
      console.log("✓ 条件满足：searchMore === false，准备弹窗")
      wx.showModal({
        title:  this.data.searchStr,
        content: '搜索结果中没有您需要的订货商品，您可以重新搜索或添加临时商品',
        confirmText: '添加商品',
        cancelText: '重新搜索',
        success: (res) => {
          console.log("弹窗回调 success，res:", res)
          if (res.cancel) {
            console.log("用户点击了取消（重新搜索）")
            // 重新搜索：清空搜索内容
            this.setData({
              searchStr: "",
              strArr: [],
              nxArr: [],
              count: 0,
              isSearching: false,
              searchMore: true,
              toSearch: false
            })
            // 延迟一下让弹窗关闭后再弹出键盘
            setTimeout(() => {
              this.setData({
                toSearch: true
              })
            }, 300)
          }
      
          if (res.confirm) {
            console.log("用户点击了确认（添加临时商品）")
            // 添加临时商品
            this.toAddGoods();
          }
        },
        fail: (err) => {
          console.error("弹窗失败，错误信息:", err)
        },
        complete: () => {
          console.log("弹窗 complete 回调")
        }
      })
      console.log("弹窗调用完成，准备 return")
      return;
    }
    
    console.log("✗ 条件不满足：searchMore !== false，searchMore 值为:", this.data.searchMore)
    
    // 如果 searchMore === true，说明还没有进行更多范围搜索，执行搜索
    if(this.data.searchMore === true){
      console.log("✓ searchMore 为 true，执行更多范围搜索")
      // 继续执行下面的搜索逻辑
    } else {
      console.log("✗ searchMore 状态异常，值为:", this.data.searchMore, "直接返回")
      return;
    }
    this.setData({
      isSearching: true,
    })

    if (this.data.searchStr.length > 0) {
      var data = {
        disId: this.data.disId,
        searchStr: this.data.searchStr,
        depId: this.data.depId,
      }
      this.setData({
        searchMore: false,
      })

      load.showLoading("查询更多商品")
      queryDisGoodsByQuickSearchWithDepId(data).then(res => {
        load.hideLoading();
        if(res.result.code == 0){
          console.log("→ 设置 strArr，长度:", res.result.data.disArr.length);
          const strArr = res.result.data.disArr || [];
          const nxArr = res.result.data.nxArr || [];
          const totalCount = strArr.length + nxArr.length;
          this.setData({
            strArr: strArr,
            nxArr: nxArr,
            count: totalCount
          })
        }else{
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        this.setData({
          nxArr: [],
          strArr: [],
          count: 0
        })
        }
      })
    } else {
      this.setData({
        searchArr: [],
        isSearching: false,
        searchStr: "",
        strArr: [],
        nxArr: [],
        count: 0
      })
    }

  },



  applyGoods(e) {
    var item = e.currentTarget.dataset.item;
    this.setData({
      itemDis: item,
      depGoods: item.departmentDisGoodsEntity,

    })
    if (this.data.depSettleType == 0) {
      this.setData({
        showCash: true
      })
    } else if (this.data.depSettleType == 1) {
      this.setData({
        show: true
      })
    }
    
    if (item.departmentDisGoodsEntity !== null) {
      var depGoodsStand = item.departmentDisGoodsEntity.nxDdgOrderStandard;
      if (depGoodsStand !== null) {
        this.setData({
          applyStandardName: item.departmentDisGoodsEntity.nxDdgOrderStandard,
          applyRemark: item.departmentDisGoodsEntity.nxDdgOrderRemark,
          level: item.departmentDisGoodsEntity.nxDdgOrderPriceLevel,
        })
      } else {
        this.setData({
          applyStandardName: item.nxDgGoodsStandardname,
          level: "1"
        })
      }
    } else {
      this.setData({
        applyStandardName: item.nxDgGoodsStandardname,
      })
    }
  },

  tishi() {
    wx.showToast({
      title: '下架商品不能订货',
      icon: 'none'
    })

  },


  toEditApply() {
    console.log("========== toEditApply 开始 ==========");
    var applyItem = this.data.applyItem;
    console.log("订单信息:", applyItem);
    console.log("订单信息 - nxDoDisGoodsId:", applyItem.nxDoDisGoodsId);
    
    this.hideModal();
    
    // 参考 ocrOrder.js 的 editOrderItem，先获取配送商品信息
    var goodsId = applyItem.nxDoDisGoodsId;
    console.log('商品ID检查 - nxDoDisGoodsId:', applyItem.nxDoDisGoodsId);
    console.log('商品ID检查 - 最终使用的 goodsId:', goodsId);
    
    // 根据 nxDoDisGoodsId 先请求接口获取 nxDistributerGoodsEntity
    if (goodsId) {
      console.log('进入获取商品信息分支，goodsId:', goodsId);
      load.showLoading('加载商品信息');
      var that = this;
      console.log('准备调用 disGetGoods，参数:', goodsId);
      disGetGoods(goodsId).then(res => {
        console.log('disGetGoods 返回:', res);
        load.hideLoading();
        if (res.result.code == 0 && res.result.data) {
          // 获取到商品信息后，设置到 itemDis
          console.log("获取到商品信息:", res.result.data);
          that._setEditApplyData(applyItem, res.result.data);
        } else {
          // 接口返回失败，使用原有的 nxDistributerGoodsEntity（如果有）
          wx.showToast({
            title: res.result.msg || '获取商品信息失败',
            icon: 'none'
          });
          that._setEditApplyData(applyItem, applyItem.nxDistributerGoodsEntity || null);
        }
      }).catch(err => {
        load.hideLoading();
        console.error('获取商品信息失败:', err);
        wx.showToast({
          title: '获取商品信息失败',
          icon: 'none'
        });
        // 失败时使用原有的 nxDistributerGoodsEntity（如果有）
        that._setEditApplyData(applyItem, applyItem.nxDistributerGoodsEntity || null);
      });
    } else {
      // 没有商品ID，直接使用原有的 nxDistributerGoodsEntity
      console.log('没有商品ID，直接使用原有商品信息，goodsId:', goodsId);
      this._setEditApplyData(applyItem, applyItem.nxDistributerGoodsEntity || null);
    }
    
    console.log("========== toEditApply 结束 ==========");
  },
  
  // 设置编辑订单的数据（提取公共逻辑）
  _setEditApplyData: function(applyItem, itemDisData) {
    if (this.data.depSettleType == 0) {
      console.log("cashshhshshshhshh")
      this.setData({
        showCash: true,
        showOperation: false,
        applyStandardName: applyItem.nxDoStandard || '',
        itemDis: itemDisData,
        item: applyItem.nxDepartmentDisGoodsEntity || null,
        editApply: true,
        applyNumber: applyItem.nxDoQuantity || '',
        applyRemark: applyItem.nxDoRemark || '',
        printStandard: applyItem.nxDoPrintStandard || applyItem.nxDoStandard || '',
        priceLevel: applyItem.nxDoCostPriceLevel || '',
        applyGoodsName: applyItem.nxDoGoodsName || '',
        applyGoodsId: applyItem.nxDoDisGoodsId || '',
      });
    } else if (this.data.depSettleType == 1) {
      this.setData({
        show: true,
        showOperation: false,
        applyStandardName: applyItem.nxDoStandard || '',
        itemDis: itemDisData,
        item: applyItem.nxDepartmentDisGoodsEntity || null,
        editApply: true,
        applyNumber: applyItem.nxDoQuantity || '',
        applyRemark: applyItem.nxDoRemark || '',
        printStandard: applyItem.nxDoPrintStandard || applyItem.nxDoStandard || '',
        priceLevel: applyItem.nxDoCostPriceLevel || '',
        applyGoodsName: applyItem.nxDoGoodsName || '',
        applyGoodsId: applyItem.nxDoDisGoodsId || '',
      });
    }
  },



  confirm: function (e) {
    console.log("cofnirmmmm", e, 'fromOcrOrder:', this.data.fromOcrOrder)
    if (this.data.editApply) {
      this._updateDisOrder(e);
    } else {
      console.log('调用 _saveFillOrder');
      this._saveFillOrder(e);
    }

    this.setData({
      show: false,
      editApply: false,
      applyItem: "",
      item: "",
      applyNumber: "",
      applyStandardName: "",
      level: "",
      printStandard: "",
      showMyIndependent: false,
      showOperation: false,
      showAdd: false
    })
  },


  /**
   * 保存配送申请
   * @param {*} 
   */
  _saveFillOrder: function (e) {
    console.log('_saveFillOrder 开始执行，fromOcrOrder:', this.data.fromOcrOrder, 'beforeId:', this.data.beforeId);
    
    var arriveDate = dateUtils.getArriveDate(0);
    var arriveOnlyDate = dateUtils.getArriveOnlyDate(0);
    var weekYear = dateUtils.getArriveWeeksYear(0);
    var week = dateUtils.getArriveWhatDay(0);
    var depDisGoodsId = -1;
    var price = null;
    var weight = null;
    var subtotal = null;
    var printStandard = null;
    var costSubtotal = null;
    var profitSubtotal = 0;
    var profitScale = 0;
    var costPrice = 0;
    var costPriceUpdate = 0;
    var level = this.data.level;

   
    console.log("levee", e);
    //是否给weight赋值
    if (level == "1") {
      console.log("lev11111111111111");
      costPrice = this.data.itemDis.nxDgBuyingPriceOne;
      costPriceUpdate = this.data.itemDis.nxDgBuyingPriceOneUpdate;
      price = this.data.itemDis.nxDgWillPriceOne;
      printStandard = this.data.itemDis.nxDgGoodsStandardname;
     
      if (e.detail.applyStandardName == this.data.itemDis.nxDgGoodsStandardname) {
        weight = e.detail.applyNumber;
        subtotal = (Number(price) * Number(e.detail.applyNumber)).toFixed(1);
        costSubtotal = (Number(costPrice) * Number(e.detail.applyNumber)).toFixed(1);
        profitSubtotal = (Number(subtotal) - Number(costSubtotal)).toFixed(1);
        profitScale = Number((Number(price) - Number(costPrice)) / Number(price) * 100).toFixed(2);
      } 
      
    } else if (level == "2") {
      console.log("lev2222222222222222");
      printStandard = this.data.itemDis.nxDgWillPriceTwoStandard;
      weight = e.detail.applyNumber;
      costPriceUpdate = this.data.itemDis.nxDgBuyingPriceTwoUpdate;
      costPrice = this.data.itemDis.nxDgBuyingPriceTwo;
      price = this.data.itemDis.nxDgWillPriceTwo;
      subtotal = (Number(price) * Number(e.detail.applyNumber)).toFixed(1);
      profitSubtotal = (Number(subtotal) - Number(costSubtotal)).toFixed(1);
      profitScale = Number((Number(price) - Number(costPrice)) / Number(price) * 100).toFixed(2);
    }

    // console.log("pridicieie", price, "subtotota,", subtotal);
    // 是否有部门商品
    if (this.data.itemDis.departmentDisGoodsEntity !== null) {
      depDisGoodsId = this.data.itemDis.departmentDisGoodsEntity.nxDepartmentDisGoodsId;
      if (e.detail.applyStandardName == this.data.itemDis.departmentDisGoodsEntity.nxDdgOrderStandard) {
        
          price = this.data.itemDis.departmentDisGoodsEntity.nxDdgOrderPrice;
          weight = e.detail.applyNumber;
          subtotal = (Number(price) * Number(e.detail.applyNumber)).toFixed(1);
          costSubtotal = (Number(costPrice) * Number(weight)).toFixed(1);
          profitSubtotal = (Number(subtotal) - Number(costSubtotal)).toFixed(1);
          profitScale = Number((Number(price) - Number(costPrice)) / Number(price) * 100).toFixed(2);
        
        // console.log("esubtotalsubtotal", subtotal)
      }
    }

    var dg = {
      nxDoOrderUserId: this.data.userInfo.nxDistributerUserId,
      nxDoDepDisGoodsId: depDisGoodsId, //
      nxDoDisGoodsFatherId: this.data.itemDis.nxDgDfgGoodsFatherId,
      nxDoDisGoodsGrandId: this.data.itemDis.nxDgDfgGoodsGrandId,
      nxDoDisGoodsId: this.data.itemDis.nxDistributerGoodsId, //1
      nxDoDepartmentId: this.data.depId,
      nxDoDistributerId: this.data.disId,
      nxDoDepartmentFatherId: this.data.depFatherId,
      nxDoQuantity: e.detail.applyNumber,
      nxDoPrice: price,
      nxDoWeight: weight,
      nxDoSubtotal: subtotal,
      nxDoStandard: e.detail.applyStandardName,
      nxDoRemark: e.detail.applyRemark,
      nxDoIsAgent: -1,
      nxDoArriveDate: arriveDate,
      nxDoArriveWeeksYear: weekYear,
      nxDoArriveOnlyDate: arriveOnlyDate,
      nxDoArriveWhatDay: week,
      nxDoCostPriceUpdate: costPriceUpdate,
      nxDoCostPrice: costPrice,
      nxDoPurchaseGoodsId: -1,
      nxDoCostSubtotal: costSubtotal,
      nxDoProfitSubtotal: profitSubtotal,
      nxDoProfitScale: profitScale,
      nxDoNxGoodsId: this.data.itemDis.nxDgNxGoodsId,
      nxDoNxGoodsFatherId: this.data.itemDis.nxDgNxFatherId,
      nxDoGoodsType: this.data.itemDis.nxDgPurchaseAuto,
      nxDoPurchaseUserId: this.data.beforeId,
      nxDoPrintStandard: printStandard,
      nxDoCostPriceLevel: level,
      nxDoGoodsName: this.data.itemDis.nxDgGoodsName,
    };

    var that = this;
    console.log('准备保存订单，beforeId:', this.data.beforeId, 'fromOcrOrder:', this.data.fromOcrOrder);
    if (this.data.beforeId !== '-1') {
      console.log('使用 saveOrderBefore');
      saveOrderBefore(dg).then(res => {
        console.log('saveOrderBefore 返回:', res.result.code);
        if (res.result.code == 0) {
          // 如果是从 ocrOrder 页面跳转过来的，需要特殊处理
          // 同时检查 URL 参数和 storage 标记
          var fromOcrOrder2 = this.data.fromOcrOrder === '1' || this.data.fromOcrOrder === 1 || wx.getStorageSync('fromOcrOrder') === '1';
          console.log('saveOrderBefore - fromOcrOrder:', this.data.fromOcrOrder, 'fromStorage:', wx.getStorageSync('fromOcrOrder'), '最终判断:', fromOcrOrder2);
          if (fromOcrOrder2) {
            console.log('从 ocrOrder 跳转过来（saveOrderBefore），准备返回');
            var pages = getCurrentPages();
            var prevPage = pages[pages.length - 2]; // 上一个页面（ocrOrder）
            
            console.log('prevPage route:', prevPage ? prevPage.route : 'null');
            console.log('所有页面路由:', pages.map(p => p.route));
            
            // 将新订单数据传递给 ocrOrder 页面
            // 检查路由路径，支持多种可能的路径格式
            var isOcrOrderPage2 = prevPage && prevPage.route && (
              prevPage.route.includes('ocrOrder') || 
              prevPage.route.includes('OcrOrder') ||
              prevPage.route.includes('ocr') ||
              prevPage.route.includes('Ocr')
            );
            console.log('saveOrderBefore - isOcrOrderPage:', isOcrOrderPage2);
            
            if (isOcrOrderPage2) {
              // 获取插入位置
              var insertIndex = wx.getStorageSync('ocrOrderInsertIndex') || 0;
              console.log('插入位置:', insertIndex);
              
              // 将新订单转换为 ocrOrder 格式
              var newOrder = {
                ...res.result.data,
                nxDoGoodsNameOriginal: res.result.data.nxDoGoodsName || '',
                nxDoStandardWarn: 0,
                goodsNameWarn: 0,
              };
              
              // 更新 ocrOrder 页面的订单列表
              var orderArr = prevPage.data.orderArr || [];
              orderArr.splice(insertIndex, 0, newOrder);
              
              prevPage.setData({
                orderArr: orderArr,
              });
              
              // 更新缓存
              if (prevPage._saveToStorage) {
                prevPage._saveToStorage(orderArr);
              }
              
              // 清除标记
              wx.removeStorageSync('ocrOrderInsertIndex');
              wx.removeStorageSync('fromOcrOrder');
              
              wx.showToast({
                title: '保存成功',
                icon: 'success',
                duration: 1000
              });
              
              // 延迟返回，确保数据已更新
              setTimeout(() => {
                wx.navigateBack({
                  delta: 1
                });
              }, 1000);
            } else {
              console.log('未找到 ocrOrder 页面，使用原有逻辑');
              wx.removeStorageSync('fromOcrOrder');
              // 原有逻辑：更新上一页的 orderItem
              prevPage.setData({
                orderItem: res.result.data,
                addOrder: true,
              })
              wx.navigateBack({
                delta: 1
              })
            }
          } else {
            // 原有逻辑：更新上一页的 orderItem
            var pages = getCurrentPages();
            var prevPage = pages[pages.length - 2]; //上一个页面
            prevPage.setData({
              orderItem: res.result.data,
              addOrder: true,
            })
            wx.navigateBack({
              delta: 1
            })
          }

        } else {
          wx.showToast({
            title: '订单保存失败',
            icon: 'none'
          })
        }
      })
    } else {
      console.log('使用 saveOrder');
      saveOrder(dg).then(res => {
        console.log('saveOrder 返回:', res.result.code, 'fromOcrOrder:', this.data.fromOcrOrder);
        if (res.result.code == 0) {
          // 如果是从 ocrOrder 页面跳转过来的，保存后自动返回
          // 同时检查 URL 参数和 storage 标记
          var fromOcrOrder = this.data.fromOcrOrder === '1' || this.data.fromOcrOrder === 1 || wx.getStorageSync('fromOcrOrder') === '1';
          console.log('fromOcrOrder:', this.data.fromOcrOrder, 'fromStorage:', wx.getStorageSync('fromOcrOrder'), '最终判断:', fromOcrOrder);
          if (fromOcrOrder) {
            console.log('从 ocrOrder 跳转过来，准备返回');
            // 获取返回的订单数据，传递给上一页
            var pages = getCurrentPages();
            var prevPage = pages[pages.length - 2]; // 上一个页面（ocrOrder）
            
            console.log('prevPage route:', prevPage ? prevPage.route : 'null');
            console.log('所有页面路由:', pages.map(p => p.route));
            
            // 将新订单数据传递给 ocrOrder 页面
            // 检查路由路径，支持多种可能的路径格式
            var isOcrOrderPage = prevPage && prevPage.route && (
              prevPage.route.includes('ocrOrder') || 
              prevPage.route.includes('OcrOrder') ||
              prevPage.route.includes('ocr') ||
              prevPage.route.includes('Ocr')
            );
            console.log('isOcrOrderPage:', isOcrOrderPage);
            
            if (isOcrOrderPage) {
              // 获取插入位置
              var insertIndex = wx.getStorageSync('ocrOrderInsertIndex') || 0;
              console.log('插入位置:', insertIndex);
              
              // 将新订单转换为 ocrOrder 格式
              var newOrder = {
                ...res.result.data,
                nxDoGoodsNameOriginal: res.result.data.nxDoGoodsName || '',
                nxDoStandardWarn: 0,
                goodsNameWarn: 0,
              };
              
              // 更新 ocrOrder 页面的订单列表
              var orderArr = prevPage.data.orderArr || [];
              orderArr.splice(insertIndex, 0, newOrder);
              
              prevPage.setData({
                orderArr: orderArr,
              });
              
              // 更新缓存
              if (prevPage._saveToStorage) {
                prevPage._saveToStorage(orderArr);
              }
              
              // 清除标记
              wx.removeStorageSync('ocrOrderInsertIndex');
              wx.removeStorageSync('fromOcrOrder');
              
              wx.showToast({
                title: '保存成功',
                icon: 'success',
                duration: 1000
              });
              
              // 延迟返回，确保数据已更新
              setTimeout(() => {
                wx.navigateBack({
                  delta: 1
                });
              }, 1000);
            } else {
              console.log('未找到 ocrOrder 页面，使用原有逻辑');
              wx.removeStorageSync('fromOcrOrder');
              wx.showToast({
                title: '保存成功',
              });
              
              this.setData({
                isSearching: false,
                strArr: [],
                searchStr: "",
                toSearch: true,
                show: false,
                editApply: false,
                applyItem: "",
                item: "",
                applyNumber: "",
                applyStandardName: "",
                showMyIndependent: false,
                showOperation: false,
                showAdd: false,
              })
              var arr = this.data.showArr;
              arr.push(res.result.data);
              that.setData({
                showArr: arr,
              })
            }
          } else {
            // 原有逻辑：不返回，更新当前页面
            wx.showToast({
              title: '保存成功',
            })
            
            this.setData({
              isSearching: false,
              strArr: [],
              searchStr: "",
              toSearch: true,
              show: false,
              editApply: false,
              applyItem: "",
              item: "",
              applyNumber: "",
              applyStandardName: "",
              showMyIndependent: false,
              showOperation: false,
              showAdd: false,

            })
            var arr = this.data.showArr;
            arr.push(res.result.data);
            that.setData({
              showArr: arr,
            })
          }
        } else {
          wx.showToast({
            title: '订单保存失败',
            icon: 'none'
          })
        }
      })
    }

  },

  cancle() {
    console.log("cancle....")
    this.setData({
      item: "",
      applyStandardName: "",
      show: false,
      editApply: false,
      applyItem: "",
      applyNumber: "",
      depStandardArr: [],

    })

    if (this.data.isSearching) {
      this.setData({
        isSearching: false,
        searchStr: ""
      })
    }
  },



  inputFocus(e) {
    // 输入框获得焦点时，键盘高度会通过 bindkeyboardheightchange 回调更新
    // 这里不需要设置 bottom，让 bindkeyboardheightchange 来处理
    console.log('========== inputFocus ==========');
    console.log('输入框获得焦点');
    console.log('当前 bottom 值:', this.data.bottom);
    console.log('e.detail:', e.detail);
    console.log('===============================');
  },

  inputBlur() {
    // 输入框失去焦点时，键盘收起会触发 bindkeyboardheightchange
    // 那里会设置 bottom 为 20，这里不需要重复设置
    // 但为了保险，也设置一下（延迟更久，避免冲突）
    console.log('========== inputBlur ==========');
    console.log('输入框失去焦点');
    console.log('当前 bottom 值:', this.data.bottom);
    console.log('将在 200ms 后设置 bottom 为 20');
    console.log('==============================');
    
    setTimeout(() => {
      const beforeBottom = this.data.bottom;
      this.setData({
        bottom: 20
      });
      console.log('✅ inputBlur 延迟设置完成');
      console.log('设置前 bottom:', beforeBottom);
      console.log('设置后 bottom:', 20);
    }, 200);
  },

  /**
   * 打开操作面板
   * @param {}} e 
   */
  openOperation(e) {
    this.setData({
      showOperation: true,
      applyItem: e.currentTarget.dataset.item,
      index: e.currentTarget.dataset.index,
      itemDis: e.currentTarget.dataset.item.nxDistributerGoodsEntity,
      goodsName: e.currentTarget.dataset.item.nxDistributerGoodsEntity.nxDgGoodsName,
    })
    this.chooseSezi();

  },

  chooseSezi: function (e) {
    // 用that取代this，防止不必要的情况发生
    var that = this;
    // 创建一个动画实例
    var animation = wx.createAnimation({
      // 动画持续时间
      duration: 100,
      // 定义动画效果，当前是匀速
      timingFunction: 'linear'
    })
    // 将该变量赋值给当前动画
    that.animation = animation
    // 先在y轴偏移，然后用step()完成一个动画
    animation.translateY(200).step()
    // 用setData改变当前动画
    that.setData({
      // 通过export()方法导出数据
      animationData: animation.export(),
      // 改变view里面的Wx：if
      chooseSize: true
    })
    // 设置setTimeout来改变y轴偏移量，实现有感觉的滑动
    setTimeout(function () {
      animation.translateY(0).step()
      that.setData({
        animationData: animation.export()
      })
    }, 20)
  },

  hideModal: function (e) {
    var that = this;
    var animation = wx.createAnimation({
      duration: 1000,
      timingFunction: 'linear'
    })
    that.animation = animation
    animation.translateY(200).step()
    that.setData({
      animationData: animation.export()

    })
    setTimeout(function () {
      animation.translateY(0).step()
      that.setData({
        animationData: animation.export(),
        chooseSize: false
      })
    }, 200)
  },



  /**
   * 关闭操作面板
   */
  hideMask() {
    this.setData({
      showOperation: false,
    })
    this.hideModal();

  },

  /**
   * 配送申请，换订货规格
   * @param {*} e 
   */
  changeStandard: function (e) {
    this.setData({
      applyStandardName: e.detail.applyStandardName,
      level: e.detail.level,
    })
    if (e.detail.level == "1") {
      this.setData({
        printStandard: this.data.itemDis.nxDgGoodsStandardname,

      })
    } else {
      this.setData({
        printStandard: this.data.itemDis.nxDgWillPriceTwoStandard
      })
    }
  },

  /**
   * 修改配送申请
   * @param {} e 
   */
  _updateDisOrder(e) {

    var dg = {
      id: this.data.applyItem.nxDepartmentOrdersId,
      weight: e.detail.applyNumber,
      standard: e.detail.applyStandardName,
      remark: e.detail.applyRemark,
      printStandard: this.data.printStandard,
      priceLevel: this.data.level,
    };
    updateOrder(dg).then(res => {
      load.showLoading("修改订单")
      if (res.result.code == 0) {
        load.hideLoading();
        var data = "showArr[" + this.data.index + "]";
        this.setData({
          [data]: res.result.data,
          isSearching: false,
          strArr: [],
          searchStr: "",
          toSearch: true
        })

      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: "none"
        })
      }

    })
  },


  _againSearchString(e) {

    var data = {
      disId: this.data.disId,
      searchStr: this.data.searchStr,
      depId: this.data.depId,
    }
    queryDisGoodsByQuickSearchWithDepId(data).then(res => {
      console.log(res)
      if(res.result.code == 0){
        console.log("→ 设置 strArr，长度:", res.result.data.disArr.length);
        const strArr = res.result.data.disArr || [];
        const nxArr = res.result.data.nxArr || [];
        const totalCount = strArr.length + nxArr.length;
        this.setData({
          strArr: strArr,
          nxArr: nxArr,
          count: totalCount
        })
      }else{
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
        this.setData({
          nxArr: [],
          strArr: [],
          count: 0
        })
      }
    })

  },



  onUnload() {
    let pages = getCurrentPages();
    let prevPage = pages[pages.length - 2];
    prevPage.setData({
      updateOrder: true
    })
  },


  confirmStandard(e) {

    var data = {
      nxDsDisGoodsId: this.data.itemDis.nxDistributerGoodsId,
      nxDsStandardName: e.detail.newStandardName,
    }
    disSaveStandard(data).
    then(res => {
      if (res.result.code == 0) {
        var standardArr = this.data.itemDis.nxDistributerStandardEntities;
        standardArr.push(res.result.data);
        var standards = "itemDis.nxDistributerStandardEntities"
        this.setData({
          [standards]: standardArr,
          applyStandardName: res.result.data.nxDsStandardName,
        })
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },


  /**
   * 保存批发商商品
   * @param {*} e 
   */
  downLoadGoods: function (e) {
    this.setData({
      item: e.currentTarget.dataset.item,
    })
    var dg = {
      nxDgDistributerId: this.data.disId,
      nxDgNxGoodsId: this.data.item.nxGoodsId,
      nxDgGoodsName: this.data.item.nxGoodsName,
      nxDgNxFatherId: this.data.fatherId,
      nxDgNxFatherImg: this.data.fatherImg,
      nxDgNxFatherName: this.data.fatherName,
      nxDgGoodsDetail: this.data.item.nxGoodsDetail,
      nxDgGoodsPlace: this.data.item.nxGoodsPlace,
      nxDgGoodsBrand: this.data.item.nxGoodsBrand,
      nxDgGoodsStandardname: this.data.item.nxGoodsStandardname,
      nxDgGoodsStandardWeight: this.data.item.nxGoodsStandardWeight,
      nxDgGoodsPinyin: this.data.item.nxGoodsPinyin,
      nxDgGoodsPy: this.data.item.nxGoodsPy,
      nxDgPullOff: 0,
      nxDgGoodsStatus: 0,
      nxDgPurchaseAuto: this.data.purchaseAuto,
      nxDgNxGoodsFatherColor: this.data.color,
      nxStandardEntities: this.data.item.nxGoodsStandardEntities,
      nxAliasEntities: this.data.item.nxAliasEntities,
      nxDgPurchaseAuto: 1,
    };

    load.showLoading("保存商品")
    downDisGoods(dg)
      .then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          this.setData({
            showType: 0,
          })
          this._againSearchString();
        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
      })
  },


  toAddGoods() {
    if (this.data.searchStr.length > 0) {
      console.log(this.data.searchStr);
      wx.navigateTo({
        url: '../../../../subPackage/pages/goods/disAddGoodsLinshi/disAddGoodsLinshi?goodsName=' + this.data.searchStr + '&from=resGoods',
      })
    }
  },



  toBack() {
    let pages = getCurrentPages();
    let prevPage = pages[pages.length - 2];
    prevPage.setData({
      updateOrder: true
    })
    wx.navigateBack({
      delta: 1,
    })
  },



  // 保存订货订单
  confirmCash: function (e) {
    if (this.data.editApply) {
      this._updateDisOrderCash(e);
    } else {
      this._saveOrderCash(e);
    }

    this.setData({
      show: false,
      editApply: false,
      applyItem: "",
      item: "",
      applyNumber: "",
      applyStandardName: "",
    })
  },

  /**
   * 修改配送申请
   * @param {} e 
   */
  _updateDisOrderCash(e) {
    console.log("updadatecakkskskskksks")

    var dg = {
      id: this.data.applyItem.nxDepartmentOrdersId,
      weight: e.detail.applyNumber,
      standard: e.detail.applyStandardName,
      remark: e.detail.applyRemark,
    };

    updateOrder(dg).then(res => {
      load.showLoading("修改订单")
      if (res.result.code == 0) {
        load.hideLoading();
        var data = "showArr[" + this.data.index + "]";
        this.setData({
          [data]: res.result.data,
          isSearching: false,
          strArr: [],
          searchStr: "",
          toSearch: true
        })

      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: "none"
        })
      }
    })
  },


  _saveOrderCash: function (e) {

    var arriveDate = dateUtils.getArriveDate(0);
    var arriveOnlyDate = dateUtils.getArriveOnlyDate(0);
    var weekYear = dateUtils.getArriveWeeksYear(0);
    var week = dateUtils.getArriveWhatDay(0);
    var depDisGoodsId = -1;
    var price = "";
    if (this.data.itemDis.nxDgWillPrice !== null) {
      price = this.data.itemDis.nxDgWillPrice;
    } else {
      price = 0;
    }

    var weight = null;
    var subtotal = null;
    var costSubtotal = 0;
    var profitSubtotal = 0;
    var profitScale = 0;

    var costPrice = this.data.itemDis.nxDgBuyingPrice;

    //是否给weight赋值
    if (e.detail.applyStandardName == this.data.itemDis.nxDgGoodsStandardname) {
      weight = e.detail.applyNumber;
      costSubtotal = (Number(costPrice) * Number(weight)).toFixed(1);
      subtotal = (Number(price) * Number(weight)).toFixed(1);
      profitSubtotal = (Number(subtotal) - Number(costSubtotal)).toFixed(1);
      profitScale = Number((Number(price) - Number(costPrice)) / Number(price) * 100).toFixed(2);
    }

    // 是否有部门商品
    if (this.data.depGoods !== null) {
      depDisGoodsId = this.data.depGoods.nxDepartmentDisGoodsId;
    }
 
    var dg = {
      nxDoOrderUserId: this.data.userInfo.nxDepartmentUserId,
      nxDoDepDisGoodsId: depDisGoodsId, //
      nxDoDisGoodsFatherId: this.data.itemDis.nxDgDfgGoodsFatherId,
      nxDoDisGoodsGrandId: this.data.itemDis.nxDgDfgGoodsGrandId,
      nxDoDisGoodsId: this.data.itemDis.nxDistributerGoodsId, //1
      nxDoDepartmentId: this.data.depId,
      nxDoDistributerId: this.data.disId,
      nxDoDepartmentFatherId: this.data.depFatherId,
      nxDoQuantity: e.detail.applyNumber,
      nxDoPrice: price,
      nxDoWeight: weight,
      nxDoSubtotal: subtotal,
      nxDoStandard: e.detail.applyStandardName,
      nxDoRemark: e.detail.applyRemark,
      nxDoIsAgent: -1,
      nxDoArriveDate: arriveDate,
      nxDoArriveWeeksYear: weekYear,
      nxDoArriveOnlyDate: arriveOnlyDate,
      nxDoArriveWhatDay: week,
      nxDoCostPriceUpdate: this.data.itemDis.nxDgBuyingPriceUpdate,
      nxDoCostPrice: this.data.itemDis.nxDgBuyingPrice,
      nxDoPurchaseGoodsId: -1,
      nxDoCostSubtotal: costSubtotal,
      nxDoProfitSubtotal: profitSubtotal,
      nxDoProfitScale: profitScale,
      nxDoNxGoodsId: this.data.itemDis.nxDgNxGoodsId,
      nxDoNxGoodsFatherId: this.data.itemDis.nxDgNxFatherId,
      nxDoGoodsType: this.data.itemDis.nxDgPurchaseAuto,
      nxDoPurchaseUserId: this.data.beforeId,
      nxDoPrintStandard: e.detail.applyStandardName,
      nxDoExpectPrice: this.data.itemDis.nxDgWillPrice,
    };
    console.log(dg);
    var that = this;
    if (this.data.beforeId !== '-1') {
      saveCashBefore(dg).then(res => {
        if (res.result.code == 0) {
          var pages = getCurrentPages();
          var prevPage = pages[pages.length - 2]; //上一个页面
          prevPage.setData({
            orderItem: res.result.data,
            addOrder: true,
          })
          wx.navigateBack({
            delta: 1
          })

        } else {
          wx.showToast({
            title: '订单保存失败',
            icon: 'none'
          })
        }
      })

    } else {
      saveCash(dg).then(res => {
        if (res.result.code == 0) {
          wx.showToast({
            title: '保存成功',
          })
          this.setData({
            isSearching: false,
            strArr: [],
            searchStr: "",
            toSearch: true,
            show: false,
            editApply: false,
            applyItem: "",
            item: "",
            applyNumber: "",
            applyStandardName: "",
            showMyIndependent: false,
            showOperation: false,
            showAdd: false,
          })
          var arr = this.data.showArr;
          arr.push(res.result.data);
          that.setData({
            showArr: arr,
          })

        } else {
          wx.showToast({
            title: '订单保存失败',
            icon: 'none'
          })
        }
      })
    }

  },


})
var load = require('../../../../lib/load.js');

var dateUtils = require('../../../../utils/dateUtil');
import apiUrl from '../../../../config.js'
let windowWidth = 0;
let itemWidth = 0;
let heightArr = [0];
import {
  queryDisShelfGoods,
  deleteShelfGoods,
  staffApplyPurGoods,
  disSavePurGoodsSaveStock,
  saveShelfGoodsStock,
  deletePlanPurchaseGoods,
  updatePurchaseGoods,
  updateDisStock,
  setShelfLayer,
  clearShelfLayer
} from '../../../../lib/apiDistributer';



Page({
  data: {
    placeHolder: "输入商品名称或拼音字母、首字母",
    showOperation: false,
    isEditGoods: false,
    isUnshelfSelected: false,
    disGoods: null,
    shelfGoods: null,
    showPlanPurchase: false,
    showInputPurGoods: false,
    showInputPurStock: false,
    showEditPurGoods: false,
    isEditPurchase: false,
    restWeight: "0",
    maxRestWeight: 0,
    purchaseGoods: null,
    item: null,
    applyStandardName: '',
    planOrder: '',
    priceLevel: '',
    showStock: false,
    showStockDetail: false,
    stockRestWeightTotal: 0,
    shelfItem: null,
    userId: null,
    userInfo: null,
  },


  onLoad: function (options) {
    const app = getApp();
    const globalData = app.globalData;

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      disId: options.disId,
    })

    // 获取用户信息
    var value = wx.getStorageSync('userInfo');
    if (value) {
      this.setData({
        userInfo: value,
        userId: value.nxDistributerUserId,
      })
    }
  },

  _formatStockList(list = []) {
    if (!Array.isArray(list)) {
      return [];
    }
    return list.map(item => {
      const stockList = Array.isArray(item.nxDisGoodsShelfStockEntities) ? item.nxDisGoodsShelfStockEntities : [];
      const totalRestWeight = stockList.reduce((sum, stock) => {
        const weight = Number(stock && stock.nxDgssRestWeight ? stock.nxDgssRestWeight : 0);
        return sum + (isNaN(weight) ? 0 : weight);
      }, 0);
      return {
        ...item,
        totalRestWeight
      };
    });
  },

  _formatShelfGoodsList(list = []) {
    return this._formatStockList(list);
  },

  _formatUnShelfGoodsList(list = []) {
    return list.map(item => {
      const stockList = Array.isArray(item.nxDisGoodsShelfStockEntities) ? item.nxDisGoodsShelfStockEntities : [];
      const totalRestWeight = stockList.reduce((sum, stock) => {
        const weight = Number(stock && stock.nxDgssRestWeight ? stock.nxDgssRestWeight : 0);
        return sum + (isNaN(weight) ? 0 : weight);
      }, 0);
      return {
        ...item,
        totalRestWeight,
        stockList
      };
    });
  },



  getString(e){
    console.log("searchindindidnid");
   
      var string = e.detail.value;
      string = string.replace(/\s*/g, "");
      if(string.length > 0){
        this.setData({
          searchString: string
        })
      }else{
        this.setData({
          searchString: ""
        })
      }

  },

  getSearchString(e) {
    if (this.data.searchString.length > 0) {
      var data = {
        disId: this.data.disId,
        searchStr: this.data.searchString,
      }
      load.showLoading("搜索商品中...")
      queryDisShelfGoods(data).then(res => {
        if (res.result.code == 0) {
          console.log(res.result.data);
          load.hideLoading();
          // 格式化搜索结果
          const shelfArr = res.result.data.shelfArr || [];
          const formattedShelfArr = shelfArr.map(shelf => {
            if (shelf.nxDisGoodsShelfGoodsEntities && Array.isArray(shelf.nxDisGoodsShelfGoodsEntities)) {
              shelf.nxDisGoodsShelfGoodsEntities = this._formatShelfGoodsList(shelf.nxDisGoodsShelfGoodsEntities);
            }
            return shelf;
          });
          const goodsArr = res.result.data.goodsArr || [];
          const formattedGoodsArr = this._formatUnShelfGoodsList(goodsArr);
          
          this.setData({
            disSearchArr: formattedShelfArr,
            unShelfGoodsList: formattedGoodsArr,
          })
          
        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })
        }
      })
    } else {
      console.log("thisd.ata.dfasslenene===0")
      load.hideLoading();
      this.setData({
        disSearchArr: [],
        unShelfGoodsList: [],
        searchString: ""
      })
    }
  },




  deleteYes() {
    this.setData({
      deleteShow: false,
    })
    var that = this;
    deleteOrder(this.data.applyItem.nxDepartmentOrdersId).then(res => {
      if (res.result.code == 0) {
           this.setData({
             searchString: "",
             applyItem: "",
             editApply: false,
             isSearching: true,
           })
          that.getSearchStringPlaceHolder();

      }
    })
  },

  deleteNo() {
    this.setData({
      applyItem: "",
      deleteShow: false,
    })
  },


  /**
   * 修改配送商品申请
   */
  editApply() {
    var applyItem = this.data.applyItem;
    this.setData({
      show: true,
      applyStandardName: applyItem.nxDoStandard,
      itemDis: this.data.applyItem.nxDistributerGoodsEntity,
      editApply: true,
      applyNumber: applyItem.nxDoQuantity,
      applyRemark: applyItem.nxDoRemark,

    })
    if (applyItem.nxDoSubtotal !== null) {
      console.log("eidididiiidid");
      this.setData({
        applySubtotal: applyItem.nxDoSubtotal + "元"
      })

    }
  },


  _cancle() {
    this.setData({
      show: false,
      applyStandardName: "",
      itemDis: "",
      editApply: false,
      applyNumber: "",
      applyRemark: "",
      applySubtotal: ""
    })
  },

  // no use


  getSearchStringPlaceHolder() {

    var that = this;
    console.log("hpalslhdolddller");
    console.log(that.data.placeHolder.length);
    if (that.data.placeHolder.length > 0 ) {

      var data = {
        disId: this.data.disId,
        searchStr: this.data.placeHolder,
      }
      load.showLoading("搜索商品中...")
      queryDisShelfGoods(data).then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          this.setData({
            disSearchArr: res.result.data,
          })
        
        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })

        }
      })
    } else {
      var resCom = "tabsSearch[1].amount";
      var res = "tabsSearch[0].amount";
      that.setData({
        [resCom]: 0,
        [res]: 0,
        depSearchArr: [],
        disSearchArr: [],
        searchResult: false,
        isSearching: true,

      })

    }
  },



  hideMask() {
    this.setData({
      showOperation: false,
    })
  },

  // 阻止事件冒泡
  stopPropagation(e){
    // 空方法，仅用于阻止事件冒泡
  },

  hideChoice() {
    this.setData({
      isEditGoods: false,
      showOperation: false,
      item: "",      
      isUnshelfSelected: false,
    })
  },

  showChoice(e) {
    var disGoods = e.currentTarget.dataset.goods;
    var shelfGoods = e.currentTarget.dataset.shelfgoods;
    var shelfItem = e.currentTarget.dataset.item; // 获取货架信息
    
    this.setData({ 
      showOperation: true,
      isEditGoods: true,
      disGoods: disGoods,
      shelfGoods: shelfGoods,
      shelfItem: shelfItem, // 设置货架信息，供 changeShelf 使用
      isUnshelfSelected: false,
    })
  },

  showChoiceUn(e){
    var disGoods = e.currentTarget.dataset.goods;
    const stockList = Array.isArray(disGoods.nxDisGoodsShelfStockEntities) ? disGoods.nxDisGoodsShelfStockEntities : [];
    const fakeShelfGoods = {
      nxDistributerGoodsEntity: disGoods,
      nxDisGoodsShelfStockEntities: stockList,
    };
    this.setData({ 
      showOperation: true,
      isEditGoods: true,
      disGoods: disGoods,
      shelfGoods: fakeShelfGoods,
      isUnshelfSelected: true,
    })
  },

  /**
   * 修改采购商品
   */
  editPurchaseGoods() {
    console.log('editPurchaseGoods called');
    console.log('shelfGoods:', this.data.shelfGoods);
    console.log('shelfPurGoods:', this.data.shelfGoods.shelfPurGoods);
    
    this.setData({
      showEditPurGoods: true,
      item: this.data.disGoods,
      applyStandardName: this.data.shelfGoods.shelfPurGoods.nxDpgStandard,
      planOrder: this.data.shelfGoods.shelfPurGoods.nxDpgQuantity.toString(),
      priceLevel: this.data.shelfGoods.shelfPurGoods.nxDpgCostLevel,
      purchaseGoods: this.data.shelfGoods.shelfPurGoods,
      showOperation: false,
      isEditPurchase: true, // 标识为修改模式
    })
    
    console.log('showEditPurGoods set to true');
  },

  /**
   * 确认修改采购商品
   */
  confirmEditPurGoods(e) {
    var purGoods = this.data.purchaseGoods;
    purGoods.nxDpgQuantity = e.detail.planOrder;
    purGoods.nxDpgStandard = e.detail.applyStandardName;
    purGoods.nxDpgCostLevel = e.detail.priceLevel;
    
    load.showLoading("修改进货商品")
    updatePurchaseGoods(purGoods).then(res => {
      if (res.result.code == 0) {
        wx.showToast({
          title: '进货商品修改成功',
        })
        load.hideLoading();
        this.setData({
          showEditPurGoods: false,
          showOperation: false,
          isEditPurchase: false,
        })
        // 刷新搜索结果
        this.refreshAfterStockOperation();
      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },

  /**
   * 关闭修改采购弹窗
   */
  closeEditPurGoods() {
    this.setData({
      showEditPurGoods: false,
      showOperation: false,
      isEditPurchase: false,
    })
  },

  /**
   * 删除采购商品
   */
  deletePurGoods() {
    var id = this.data.purchaseGoods.nxDistributerPurchaseGoodsId;
    
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个采购商品吗？',
      success: (res) => {
        if (res.confirm) {
          load.showLoading("删除采购商品中");
          deletePlanPurchaseGoods(id).then(res => {
            load.hideLoading();
            if (res.result.code == 0) {
              wx.showToast({
                title: '删除成功',
              })
              this.setData({
                showEditPurGoods: false,
                showOperation: false,
              })
              // 刷新搜索结果
              this.getSearchString();
            } else {
              wx.showToast({
                title: res.result.msg,
                icon: 'none'
              })
            }
          })
        }
      }
    })
  },

  toGoodsDetail(){
    var id = this.data.disGoods.nxDistributerGoodsId;
    // 判断是否从非货架商品跳转（通过检查是否有 shelfGoods 来判断）
    const isFromUnshelf = !this.data.shelfGoods;
    
    this.setData({
      isEditGoods: false,
      showOperation: false,
    })
    // 记录是否从非货架商品跳转
    if(isFromUnshelf){
      wx.setStorageSync('fromUnshelfGoods', true);
    }else{
      wx.removeStorageSync('fromUnshelfGoods');
    }
    // 清除 ailasGoodsList 标记（如果跳转到 disGoodsDetail）
    wx.removeStorageSync('fromAilasGoodsList');
    if(this.data.disGoods.nxDgNxGoodsId != null && this.data.disGoods.nxDgNxGoodsId != '' 
       && this.data.disGoods.nxDgNxGoodsId > 0){
        wx.setStorageSync('disGoods', this.data.disGoods)

        wx.navigateTo({
          url: '../../goods/disGoodsDetail/disGoodsDetail?id=' + id,
        })
       }else{
  
    wx.setStorageSync('linshiGoods', this.data.disGoods)
    // 设置标记，表示从货架页面跳转到 ailasGoodsList
    console.log('toGoodsDetail - 设置 fromAilasGoodsList 标记');
    wx.setStorageSync('fromAilasGoodsList', true)
    console.log('toGoodsDetail - 标记已设置，准备跳转到 ailasGoodsList');
    wx.navigateTo({
      url: '../../goods/ailasGoodsList/ailasGoodsList?name=' + this.data.disGoods.nxDgGoodsName
       + '&id=' + this.data.disGoods.nxDistributerGoodsId + '&standard=' + this.data.disGoods.nxDgGoodsStandardname,
    })
       }
  
  },

  // 打开订货弹窗
  // toOpenDisPlanPurchase(){
  //   // 获取商品信息（从 shelfGoods 中获取）
  //   console.log("indotuutot");
  //   const shelfGoods = this.data.shelfGoods || {};
  //   const stockList = Array.isArray(shelfGoods.nxDisGoodsShelfStockEntities) ? shelfGoods.nxDisGoodsShelfStockEntities : [];
  //   let restWeightTotal = 0;
  //   stockList.forEach(item => {
  //     restWeightTotal += Number(item && item.nxDgssRestWeight ? item.nxDgssRestWeight : 0);
  //   });
  //   const disGoods = shelfGoods.nxDistributerGoodsEntity || this.data.disGoods;
  //   if(!disGoods){
  //     console.warn('toOpenDisPlanPurchase: disGoods is undefined');
  //     return;
  //   }
  //   this.setData({
  //     showPlanPurchase: true,
  //     item: disGoods,
  //     disGoods: disGoods,
  //     applyStandardName: disGoods.nxDgGoodsStandardname,
  //     windowHeight: this.data.windowHeight,
  //     showOperation: false,
  //     restWeight: restWeightTotal.toString(),
  //     maxRestWeight: restWeightTotal
  //   })
  // },


  // 打开订货弹窗name=朝天椒皮&id=26929&type=undefined&standard=袋
  toOpenDisPlanPurchase() {
    // 获取商品信息（从 shelfGoods 中获取）
    console.log("indotuutot");
    const shelfGoods = this.data.shelfGoods || {};
    const stockList = Array.isArray(shelfGoods.nxDisGoodsShelfStockEntities) ? shelfGoods.nxDisGoodsShelfStockEntities : [];
    let restWeightTotal = 0;
    stockList.forEach(item => {
      restWeightTotal += Number(item && item.nxDgssRestWeight ? item.nxDgssRestWeight : 0);
    });
    const disGoods = shelfGoods.nxDistributerGoodsEntity;
    if (!disGoods) {
      console.warn('toOpenDisPlanPurchase: disGoods is undefined');
      return;
    }
    // 根据 nxDgCartonUnit 是否为 null 决定使用哪个规格
    const standardName = disGoods.nxDgCartonUnit !== null && disGoods.nxDgCartonUnit !== undefined && disGoods.nxDgCartonUnit !== '' ?
      disGoods.nxDgCartonUnit :
      disGoods.nxDgGoodsStandardname;
    this.setData({
      showPlanPurchase: true,
      item: disGoods,
      disGoods: disGoods,
      applyStandardName: standardName,
      windowHeight: this.data.windowHeight,
      showOperation: false,
      restWeight: restWeightTotal.toString(),
      maxRestWeight: restWeightTotal
    })
  },
  // 打开采购入库弹窗（直接生成采购商品并入库）
  toOpenInputPurSock(){
    const disGoods = this.data.shelfGoods ? this.data.shelfGoods.nxDistributerGoodsEntity : this.data.disGoods;
    // 初始化采购商品数据
    const purGoodsItem = {
      nxDpgDisGoodsId: disGoods.nxDistributerGoodsId,
      nxDpgDisGoodsFatherId: disGoods.nxDgDfgGoodsFatherId,
      nxDpgDisGoodsGrandId: disGoods.nxDgDfgGoodsGrandId,
      nxDpgBuyPrice: "",
      nxDpgBuyQuantity: "",
      nxDpgBuySubtotal: "",
      nxDpgExpectPrice: "",
      nxDpgStandard: disGoods.nxDgGoodsStandardname,
      nxDpgDistributerId: this.data.disId,
      isShowTools: false, // 等待入库，默认 false
      nxDistributerGoodsEntity: disGoods
    };
    this.setData({
      showInputPurStock: true,
      item: purGoodsItem,
      disGoods: disGoods,
      applyStandardName: disGoods.nxDgGoodsStandardname,
      windowHeight: this.data.windowHeight,
      windowWidth: this.data.windowWidth,
      showOperation: false
    })
  },

  // 取消采购入库
  cancleInputPurStock(){
    this.setData({
      showInputPurStock: false,
    })
  },

  // 处理采购入库确认
  confirmInputPurGoods(e){
    const item = e.detail.item;
    load.showLoading("保存采购入库");    
    item.nxDpgPurUserId = this.data.userInfo.nxDistributerUserId;
    saveShelfGoodsStock(item).then(res =>{
      if(res.result.code == 0){
        load.hideLoading();
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })
        this.setData({
          showInputPurGoods: false,
          showOperation: false,
        })
        // 刷新搜索结果
        this.refreshAfterStockOperation();
      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg || '保存失败',
          icon: 'none'
        })
      }
    })
  },

  // 取消采购入库
  cancleInputPurGoods(){
    this.setData({
      showInputPurGoods: false,
    })
  },

  // 取消订货
  canclePlanPurchase(){
    this.setData({
      showPlanPurchase: false,
    })
  },

  confirm(e){
    console.log(e);
    var goodsId = this.data.disGoods.nxDistributerGoodsId;
    var fatherGoodsId = this.data.disGoods.nxDgDfgGoodsFatherId;
    var grandGoodsId = this.data.disGoods.nxDgDfgGoodsGrandId;
    var plan = e.detail.planOrder;
    var standard = e.detail.applyStandardName || this.data.item.nxDgGoodsStandardname;      
    var restWeight = typeof e.detail.restWeight !== 'undefined' ? e.detail.restWeight : this.data.restWeight;
    if(restWeight === '' || restWeight === null || typeof restWeight === 'undefined'){
      restWeight = 0;
    }
    var restWeightNum = Number(restWeight);
    if(isNaN(restWeightNum) || restWeightNum < 0){
      restWeightNum = 0;
    }
    var maxRestWeightNum = Number(this.data.maxRestWeight || 0);
    if(maxRestWeightNum && restWeightNum > maxRestWeightNum){
      wx.showToast({
        title: '剩余库存不能超过' + this.data.maxRestWeight,
        icon: 'none'
      })
      restWeightNum = maxRestWeightNum;
    }
    var usedStockWeight = maxRestWeightNum ? maxRestWeightNum - restWeightNum : 0;
    if(usedStockWeight < 0){
      usedStockWeight = 0;
    }

    var purGoods = {
      nxDpgDisGoodsId: goodsId,
      nxDpgDisGoodsFatherId: fatherGoodsId,
      nxDpgDisGoodsGrandId: grandGoodsId,
      nxDpgQuantity: plan,
      nxDpgStandard: standard,
      nxDpgDistributerId: this.data.disId,
      nxDpgInputType: 1,
      nxDpgCostLevel: e.detail.priceLevel,
      nxDpgPurchaseType: 0,
      nxDpgPurchaseDate: this.data.arriveDate,
      nxDpgStockRestWeight: usedStockWeight
    }
    
    // 如果是修改模式，添加采购商品ID
    if (this.data.isEditPurchase && this.data.shelfGoods && this.data.shelfGoods.shelfPurGoods) {
      purGoods.nxDistributerPurchaseGoodsId = this.data.shelfGoods.shelfPurGoods.nxDistributerPurchaseGoodsId;
    }
    var loadingText = this.data.isEditPurchase ? "修改进货商品" : "保存进货商品";
    var successText = this.data.isEditPurchase ? "进货商品修改成功" : "进货商品保存成功";
    
    load.showLoading(loadingText)
    staffApplyPurGoods(purGoods).then(res => {
      if (res.result.code  == 0) {
        wx.showToast({
          title: successText,
        })
        load.hideLoading();
        this.setData({
          showPlanPurchase: false,
          showOperation: false,
          isEditPurchase: false, // 重置修改模式
        })
        // 刷新搜索结果
        this.refreshAfterStockOperation();
      }else{
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },

  confirmInputPurStock(e){
    // 从组件获取数据
    const item = e.detail.item;
    
    // 获取商品基本信息
    const disGoods = this.data.disGoods || item.nxDistributerGoodsEntity;
    const goodsId = disGoods.nxDistributerGoodsId;
    const fatherGoodsId = disGoods.nxDgDfgGoodsFatherId;
    const grandGoodsId = disGoods.nxDgDfgGoodsGrandId;
    
    // 获取采购相关数据
    const buyQuantity = item.nxDpgBuyQuantity || item.nxDpgQuantity || "";
    const buyPrice = item.nxDpgBuyPrice || "";
    const buySubtotal = item.nxDpgBuySubtotal || "";
    const expectPrice = item.nxDpgExpectPrice || "";
    const standard = item.nxDpgStandard || disGoods.nxDgGoodsStandardname || "";
    const isShowTools = item.isShowTools || false;
    
    // 验证必填字段
    if (!buyQuantity || buyQuantity.length == 0) {
      wx.showToast({
        title: '采购数量不能为空',
        icon: 'none'
      })
      return;
    }
    
    if (!buyPrice || buyPrice.length == 0) {
      wx.showToast({
        title: '采购单价不能为空',
        icon: 'none'
      })
      return;
    }
    
    // 构建采购商品数据
    const purGoods = {
      nxDpgDisGoodsId: goodsId,
      nxDpgDisGoodsFatherId: fatherGoodsId,
      nxDpgDisGoodsGrandId: grandGoodsId,
      nxDpgQuantity: buyQuantity,
      nxDpgStandard: standard,
      nxDpgBuyPrice: buyPrice,
      nxDpgBuySubtotal: buySubtotal,
      nxDpgExpectPrice: expectPrice,
      nxDpgDistributerId: this.data.disId,
      nxDpgInputType: 1,
      nxDpgPurchaseType: 0,
      isShowTools: isShowTools,
      nxDpgPurUserId: this.data.userInfo ? this.data.userInfo.nxDistributerUserId : null
    }
    
    // 如果有到货日期，添加
    if (this.data.arriveDate) {
      purGoods.nxDpgPurchaseDate = this.data.arriveDate;
    }
    
    var loadingText = this.data.isEditPurchase ? "修改进货商品" : "保存进货商品";
    var successText = this.data.isEditPurchase ? "进货商品修改成功" : "进货商品保存成功";
    
    load.showLoading(loadingText)
    disSavePurGoodsSaveStock(purGoods).then(res => {
      if (res.result.code == 0) {
        wx.showToast({
          title: successText,
          icon: 'success'
        })
        load.hideLoading();
        this.setData({
          showInputPurStock: false,
          showOperation: false,
          isEditPurchase: false,
        })
        // 刷新搜索结果
        this.refreshAfterStockOperation();
      }else{
        load.hideLoading();
        wx.showToast({
          title: res.result.msg || '保存失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      load.hideLoading();
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      })
    })
  },

  showStock(){
    console.log('=== 点击修改库存 ===')
    console.log('shelfGoods:', this.data.shelfGoods)
    
    if (!this.data.shelfGoods) {
      console.error('错误：shelfGoods为null或undefined')
      wx.showToast({
        title: '商品数据异常',
        icon: 'none'
      })
      return
    }
    
    console.log('批次数据:', this.data.shelfGoods.nxDisGoodsShelfStockEntities)
    console.log('批次数量:', this.data.shelfGoods.nxDisGoodsShelfStockEntities ? this.data.shelfGoods.nxDisGoodsShelfStockEntities.length : 0)

    const stockList = Array.isArray(this.data.shelfGoods.nxDisGoodsShelfStockEntities) ? this.data.shelfGoods.nxDisGoodsShelfStockEntities : []
    const totalRestWeight = stockList.reduce((sum, item) => {
      const weight = Number(item && item.nxDgssRestWeight ? item.nxDgssRestWeight : 0)
      return sum + (isNaN(weight) ? 0 : weight)
    }, 0)
    
    console.log('设置showStock为true')
    this.setData({
      showStock: true,
      showOperation:false,
      stockRestWeightTotal: totalRestWeight
    }, () => {
      console.log('setData完成，showStock应该为true')
      console.log('当前showStock值:', this.data.showStock)
      console.log('当前总剩余库存:', this.data.stockRestWeightTotal)
    })
  },

  showStockDetail(){
    console.log('=== 点击查看库存 ===')
    const shelfGoods = this.data.shelfGoods

    if (!shelfGoods) {
      console.error('错误：shelfGoods为null或undefined')
      wx.showToast({
        title: '商品数据异常',
        icon: 'none'
      })
      return
    }

    this.setData({
      showStockDetail: true,
      showOperation: false
    }, () => {
      console.log('showStockDetail 设置完成，当前值:', this.data.showStockDetail)
    })
  },

  confirmStockDetail(e){
    const { stockId, restWeight, sellingPrice } = e.detail || {}
    if (!stockId) {
      console.warn('confirmStockDetail 缺少 stockId', e)
      wx.showToast({
        title: '批次数据异常',
        icon: 'none'
      })
      return
    }

    load.showLoading('保存中...')
    updateDisStock({
      stockId,
      restWeight,
      sellingPrice,
      disId: this.data.disId,
      userId: this.data.userId
    }).then(res => {
      load.hideLoading()
      if (res.result.code === 0) {
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        })
        this.setData({
          isEditGoods: false,
          showStockDetail: false
        })
        // 刷新搜索结果
        this.refreshAfterStockOperation();
      } else {
        wx.showToast({
          title: res.result.msg || '更新失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      console.error('更新库存失败:', err)
      load.hideLoading()
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      })
    })
  },

  // 关闭库存弹窗
  closeStockModal(){
    this.setData({
      showStock: false,
    })
  },

  closeStockDetailModal(){
    this.setData({
      showStockDetail: false
    })
  },

  // 库存操作成功后刷新数据
  refreshAfterStockOperation(){
    // 刷新搜索结果 - 如果有搜索关键词，重新搜索
    if (this.data.searchString && this.data.searchString.length > 0) {
      const data = {
        disId: this.data.disId,
        searchStr: this.data.searchString,
      }
      load.showLoading("刷新数据中...")
      queryDisShelfGoods(data).then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          const shelfArr = res.result.data.shelfArr || [];
          const formattedShelfArr = shelfArr.map(shelf => {
            if (shelf.nxDisGoodsShelfGoodsEntities && Array.isArray(shelf.nxDisGoodsShelfGoodsEntities)) {
              shelf.nxDisGoodsShelfGoodsEntities = this._formatShelfGoodsList(shelf.nxDisGoodsShelfGoodsEntities);
            }
            return shelf;
          });
          const goodsArr = res.result.data.goodsArr || [];
          const formattedGoodsArr = this._formatUnShelfGoodsList(goodsArr);
          
          this.setData({
            disSearchArr: formattedShelfArr,
            unShelfGoodsList: formattedGoodsArr,
          })
        } else {
          load.hideLoading();
        }
      })
    }
  },

  changeShelf(e){
    console.log('=== changeShelf 方法开始 ===');
    console.log('this.data.shelfGoods:', this.data.shelfGoods);
    console.log('this.data.disGoods:', this.data.disGoods);
    console.log('this.data.shelfItem:', this.data.shelfItem);
    console.log('this.data.isUnshelfSelected:', this.data.isUnshelfSelected);
    
    this.setData({
      showOperation: false
    })
    
    // 如果是非货架商品（添加模式）
    if (this.data.isUnshelfSelected) {
      // 添加模式：清除 shelfItem 和 shelfGoods，只保存 disGoods
      console.log('📝 添加模式：清除 shelfItem 和 shelfGoods');
      wx.removeStorageSync('shelfItem'); // 清除可能存在的旧数据
      wx.removeStorageSync('shelfGoods'); // 清除可能存在的旧数据
      console.log('已清除 shelfItem 和 shelfGoods');
      
      // 保存 disGoods 用于添加模式
      if (this.data.disGoods) {
        console.log('📝 保存 disGoods 到 goodsItem');
        wx.setStorageSync('goodsItem', this.data.disGoods);
        console.log('保存的 disGoods:', this.data.disGoods);
      }
    } else {
      // 更新模式：保存 shelfItem 和 shelfGoods
      console.log('📝 更新模式：保存 shelfItem 和 shelfGoods');
      if (this.data.shelfItem) {
        wx.setStorageSync('shelfItem', this.data.shelfItem);
        console.log('保存的 shelfItem:', this.data.shelfItem);
      }
      if (this.data.shelfGoods) {
        wx.setStorageSync('shelfGoods', this.data.shelfGoods);
        console.log('保存的 shelfGoods:', this.data.shelfGoods);
      }
    }
    
    // 验证 storage 中的值
    console.log('=== 验证 storage 中的值 ===');
    console.log('storage shelfItem:', wx.getStorageSync('shelfItem'));
    console.log('storage shelfGoods:', wx.getStorageSync('shelfGoods'));
    console.log('storage goodsItem:', wx.getStorageSync('goodsItem'));
    
    wx.navigateTo({
      url: '../changeShelf/changeShelf?disId=' + this.data.disId,
    })
  },

  setShelfLayer() {
    const shelfGoods = this.data.shelfGoods;
    if (!shelfGoods || !shelfGoods.nxDistributerGoodsShelfGoodsId) {
      wx.showToast({
        title: '未找到货架商品',
        icon: 'none'
      });
      return;
    }

    const goodsName = shelfGoods.nxDistributerGoodsEntity
      ? shelfGoods.nxDistributerGoodsEntity.nxDgGoodsName
      : '';

    wx.showModal({
      title: '设置层架',
      content: goodsName ? `确认将「${goodsName}」设置为本层结尾？` : '确认设置该商品为本层结尾？',
      success: (res) => {
        if (!res.confirm) {
          return;
        }
        load.showLoading('设置层架');
        setShelfLayer(shelfGoods.nxDistributerGoodsShelfGoodsId)
          .then((response) => {
            load.hideLoading();
            const result = response.result || {};
            if (result.code === 0) {
              wx.showToast({
                title: result.msg || '设置成功',
                icon: 'success'
              });
              this.setData({
                showOperation: false
              });
              // 刷新搜索结果
              this.getSearchString();
            } else {
              wx.showToast({
                title: result.msg || '设置失败',
                icon: 'none'
              });
            }
          })
          .catch((error) => {
            console.error('setShelfLayer error', error);
            load.hideLoading();
            wx.showToast({
              title: '设置失败，请重试',
              icon: 'none'
            });
          });
      }
    });
  },

  clearShelfLayer() {
    const shelfGoods = this.data.shelfGoods;
    if (!shelfGoods || !shelfGoods.nxDistributerGoodsShelfGoodsId) {
      wx.showToast({
        title: '未找到货架商品',
        icon: 'none'
      });
      return;
    }

    const goodsName = shelfGoods.nxDistributerGoodsEntity
      ? shelfGoods.nxDistributerGoodsEntity.nxDgGoodsName
      : '';

    wx.showModal({
      title: '取消层架',
      content: goodsName ? `确认取消「${goodsName}」的层架标记？` : '确认取消该商品的层架标记？',
      success: (res) => {
        if (!res.confirm) {
          return;
        }
        load.showLoading('取消层架');
        clearShelfLayer(shelfGoods.nxDistributerGoodsShelfGoodsId)
          .then((response) => {
            load.hideLoading();
            const result = response.result || {};
            if (result.code === 0) {
              wx.showToast({
                title: result.msg || '已取消',
                icon: 'success'
              });
              this.setData({
                showOperation: false
              });
              // 刷新搜索结果
              this.getSearchString();
            } else {
              wx.showToast({
                title: result.msg || '取消失败',
                icon: 'none'
              });
            }
          })
          .catch((error) => {
            console.error('clearShelfLayer error', error);
            load.hideLoading();
            wx.showToast({
              title: '取消失败，请重试',
              icon: 'none'
            });
          });
      }
    });
  },

  toAddShelfGoodsSort(e){
    this.setData({
      showOperation:false,     
    })

    var sort = this.data.shelfGoods.nxDgsgSort;
    sort = Number(sort) - Number(1);
    // 从 shelfGoods 中获取货架信息
    const shelfId = this.data.shelfGoods.nxDgsgShelfId;
    // 需要从搜索结果中找到对应的货架信息
    let shelfName = '';
    let shelfSort = 0;
    if (this.data.disSearchArr && Array.isArray(this.data.disSearchArr)) {
      const shelf = this.data.disSearchArr.find(s => s.nxDistributerGoodsShelfId === shelfId);
      if (shelf) {
        shelfName = shelf.nxDistributerGoodsShelfName;
        shelfSort = shelf.nxDistributerGoodsShelfSort || 0;
      }
    }
    
    wx.navigateTo({
      url: '../resGoodsListShelf/resGoodsListShelf?name=' + shelfName
       + '&disId=' + this.data.disId + '&shelfId=' + shelfId + '&sort=' + sort + '&shelfSort=' + shelfSort,
    })
  },

  deleteGoods() {
    load.showLoading("删除货架商品中");
    deleteShelfGoods(this.data.shelfGoods.nxDistributerGoodsShelfGoodsId)
    .then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        })
        this.setData({
          showOperation: false,
          isEditGoods: false,
          item: "",
          shelfGoods: "",
        })
        // 刷新搜索结果
        this.refreshAfterStockOperation();
      } else {
        wx.showToast({
          title: res.result.msg || '删除失败',
          icon: 'none'
        })
      }
    })
  },

  /**
   * 弹窗获取页面高度
   * @param {*} e 
   */
  getFocus(e) {
    const app = getApp();
    const globalData = app.globalData;
    var modalContentHeight = (globalData.windowHeight - e.detail.keyboardHeight) * globalData.rpxR;
    this.setData({
      modalContentHeight: modalContentHeight
    })
  },

  toBack() {
    wx.navigateBack({
      delta: 1
    })
  },

  onUnload(){
    // 页面卸载时，标记需要刷新
    var pages = getCurrentPages();
    if(pages.length > 1){
      var prevPage = pages[pages.length - 2];
      prevPage.setData({
        update: true
      })
    }
  }

})

import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');
let heightArrDis = [0];
import {
  supplierGetDisGoodsCata,
  supplierGetGoodsListByFatherId,
  disUpdateBuyingPrice,
  queryDisGoodsAndNxGoodsByQuickSearch,
  disUpdateDisGoodsWillPrice
} from '../../../../lib/apiDistributer'

const tabBarHeight = 50; // 根据实际情况调整
const viewBarHeight = 60;


Page({

  onShow(){
    const app = getApp();
    const globalData = app.globalData;
    const navBarHeight = globalData.navBarHeight;
    const screenHeight = globalData.screenHeight;
    const screenWidth = globalData.screenWidth;
    const rpxRatio = 750 / screenWidth;
    const navBarHeightRpx = navBarHeight * rpxRatio;
    const viewBarHeightRpx = viewBarHeight * rpxRatio;
    const tabBarHeightRpx = 100;

    const contentHeight = (screenHeight - navBarHeight - tabBarHeight) * rpxRatio;
  
    this.setData({
    
      // contentHeight: 0,
      // navBarHeight: 0,
      // tabBarHeight: 0,
      rpxRatio: rpxRatio,
      contentHeight: contentHeight,
      navBarHeight: navBarHeightRpx,
      tabBarHeight: tabBarHeightRpx,
      viewBarHeight: viewBarHeightRpx,
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      leftMenuWidth: 160, // 左侧菜单宽度，单位 rpx

      
     

    });
    this._getCataGoods();
  },



  onLoad(options) {

    this.setData({
      
      url: apiUrl.server,
      totalPage: 0,
      totalCount: 0,
      limit: 15,
      currentPage: 1,
      toTop: 0,
      leftIndex: 0,
      supplierId: options.supplierId,
      disId: options.disId
     
    })

    var value = wx.getStorageSync('disInfo');
    if (value) {
      this.setData({
        disId: value.nxDistributerId,
        disInfo: value
      })
    }

  
  },

  _getCataGoods() {
    var that = this;
    load.showLoading("获取数据中");
    var data ={
      disId: this.data.disId,
      supplierId: this.data.supplierId
    }
    supplierGetDisGoodsCata(data).then(res => {
      if (res.result.code == 0) {
        load.hideLoading();
        
        // 检查数据是否为空
        if (res.result.data && res.result.data.length > 0) {
          this.setData({
            grandList: res.result.data,
            leftGreatId: res.result.data[0].nxDistributerFatherGoodsId,
            greatName: res.result.data[0].nxDfgFatherGoodsName,
          })
          that._getFatherGoods();
        } else {
          // 数据为空时的处理
          this.setData({
            grandList: [],
            leftGreatId: null,
            greatName: '',
          })
          wx.showToast({
            title: '暂无商品分类数据',
            icon: 'none'
          })
        }
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })

  },


  changeGreatGrand(e) {
    console.log(e);
    this.setData({
      leftGreatId: e.currentTarget.dataset.id,
      leftIndex: e.currentTarget.dataset.index,
      currentPage: 1,
      greatName: e.currentTarget.dataset.name,

    })

    this._getFatherGoods();

  },




  _getFatherGoods() {

    var data = {
      supplierId: this.data.supplierId,
      fatherId: this.data.leftGreatId,
      limit: this.data.limit,
      page: this.data.currentPage,
    }
    supplierGetGoodsListByFatherId(data).then(res => {
      if (res.result.code == 0) {
        console.log(res.result.page)
        this.setData({
          goodsList: res.result.page.list,
          totalPage: res.result.page.totalPage,
          totalCount: res.result.page.totalCount,
        })

      }
    })
  },


  onScrollToLower: function () {

    let {
      currentPage,
      totalPage,
      isLoading
    } = this.data



    if (currentPage == totalPage) {
      console.log("coming??");
      return;
    } else {

      var data = {
        limit: this.data.limit,
        page: this.data.currentPage + 1,
        supplierId: this.data.supplierId,
        fatherId: this.data.leftGreatId,
      }
      supplierGetGoodsListByFatherId(data)
        .then((res) => {
          if (res.result.code == 0) {
            load.hideLoading();
            console.log(res.result.page)
            var arr = res.result.page.list;
            if (arr.length > 0) {
              var currentPage = this.data.currentPage; // 获取当前页码
              currentPage += 1; // 加载当前页面的下一页数据
              var now = this.data.goodsList;
              var newdata = now.concat(arr);
              this.setData({
                goodsList: newdata,
                currentPage,
                isLoading: false,
                totalPage: res.result.page.totalPage,
                totalCount: res.result.page.totalCount,
              })
            }
          } else {
            wx.showToast({
              title: '获取商品失败',
              icon: 'none'
            })
          }
        })
    }

  },








  toIbooks() {
    wx.navigateTo({
      url: '../../ibook/ibookCover/ibookCover',
    })
  },



  hide: function () {
    this.setData({
      showOperation: false,
      item: "",
      isSearching: false,
      strArr: [],
      nxArr: [],
      searchStr: ""
    })
  },


  addGoods(e){
    wx.navigateTo({
      url: '../../goods/greatGrandGoods/greatGrandGoods?disId=' + this.data.disId
      + "&supplierId=" + this.data.supplierId + '&type=add',
    })
  },




  // 
toSupplierGoods(){
  console.log("d")
  wx.navigateTo({
    url: '../supplierGoods/supplierGoods?supplierId=' + this.data.supplierId,
  })
},

  showIsPurchase(e) {
    var item = e.currentTarget.dataset.item;
    console.log("eee",e);
    var profit = "";
      var willPrice = "";
      var buyingPrice = "";
      var weight = "";
      if (e.currentTarget.dataset.level == 1) {
        profit = item.nxDgPriceProfitOne;
        willPrice = item.nxDgWillPriceOne;
        buyingPrice = item.nxDgBuyingPriceOne;
        weight = item.nxDgWillPriceOneWeight;
      }
      if (e.currentTarget.dataset.level == 2) {
        profit = item.nxDgPriceProfitTwo;
        willPrice = item.nxDgWillPriceTwo;
        buyingPrice = item.nxDgBuyingPriceTwo;
        weight = item.nxDgWillPriceTwoWeight;
      }
     
  
      this.setData({
        goodsIndex: e.currentTarget.dataset.index,
        showIsPurchase: true,
        item: item,
        level: e.currentTarget.dataset.level,
        profit: profit,
        willPrice: willPrice,
        buyingPrice: buyingPrice,
        weight: weight
      })
  
  },
  
  
  delPrice(e){
  
    var item = e.detail.item;
    console.log(item);
    if(this.data.level == "1"){
      item.nxDgBuyingPriceOne = null;
      item.nxDgBuyingPrice = "0.1";
      item.nxDgWillPriceOne = null;
      item.nxDgWillPriceOneAboutPrice = null;
  
    }else if(this.data.level == "2"){
      console.log("lev2222222")
      
      item.nxDgBuyingPriceTwo = null;
      item.nxDgWillPriceTwo = null;
      item.nxDgWillPriceTwoAboutPrice = null;
      item.nxDgWillPriceTwoStandard = null;
      item.nxDgWillPriceTwoWeight = null;
    }
    
    disUpdateBuyingPrice(item)
      .then(res => {
        if (res.result.code == 0) {
         
          var data = "goodsList[" + this.data.goodsIndex + "]";
            this.setData({
              [data]: item,
              item: item,
            })
        }
      })
  
  },
  
    /**
     * 修改售价接口
     */
    confirm(e) {
      var item = e.detail.item;
      console.log(item);
      disUpdateBuyingPrice(item)
        .then(res => {
          if (res.result.code == 0) {
          
            var data = "goodsList[" + this.data.goodsIndex + "]";
              this.setData({
                [data]: item,
                item: item,
              })
          }
        })
    },
  
  
  /**
   * 打开修改商品页面
   * @param {*} e 
   */
  toGoodsDetailPage(e) {
    wx.setStorageSync('notUpdate', true);
    wx.navigateTo({
      url: '../../goods/disGoodsPage/disGoodsPage?disGoodsId=' + e.currentTarget.dataset.id + '&goodsName=' + e.currentTarget.dataset.name + '&color=' + e.currentTarget.dataset.color + '&editIndex=' + e.currentTarget.dataset.index
      +'&from=index',
    })

  },


  /**
   * 关闭操作面板
   */
  hideMask(e) {
    this.setData({
      showOperation: false,
      item: "",
    })
  },




  toBack() {
    wx.navigateBack({
      delta: 1
    })
  },







})
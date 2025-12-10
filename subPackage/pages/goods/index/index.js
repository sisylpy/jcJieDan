import apiUrl from '../../config.js'
var load = require('../../lib/load.js');
var dateUtils = require('../../utils/dateUtil');

// let heightArrDis = [0];


import {
 
  getDisGoodsCataWithCount,
  getDisGoodsByGreatGrandIdWithCount,
  getDisGoodsByGrandId,
  disUpdateBuyingPrice,
} from '../../lib/apiDistributer'


const tabBarHeight = 50; // 根据实际情况调整
const viewBarHeight = 60;

Component({

  data:{
    isFirstLoad: true,
    goodsType: 99,
    upTime: dateUtils.getDateTimeString(),
    url: apiUrl.server,
    showBuyingPrice:false,
    leftMenuWidth: 160, // 左侧菜单宽度，单位 rpx
  },


  pageLifetimes: {


  show() {
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({
        selected: 4
      });
    }

    // if(this.data.isFirstLoad){
      this.setData({
        isFirstLoad: false
      })
      const app = getApp();
      const globalData = app.globalData;
      const navBarHeight = globalData.navBarHeight;
      const screenHeight = globalData.screenHeight;
      const screenWidth = globalData.screenWidth;
      const rpxRatio = 750 / screenWidth;
      const navBarHeightRpx = navBarHeight * rpxRatio;
      const viewBarHeightRpx = viewBarHeight * rpxRatio;
      const tabBarHeightRpx = 100;
  
      const contentHeight = (screenHeight - navBarHeight - tabBarHeight - viewBarHeight) * rpxRatio;
    
      this.setData({
      
        contentHeight: 0,
        navBarHeight: 0,
        tabBarHeight: 0,
        rpxRatio: rpxRatio,
        contentHeight: contentHeight,
        navBarHeight: navBarHeightRpx,
        tabBarHeight: tabBarHeightRpx,
        viewBarHeight: viewBarHeightRpx,

        totalPage: 0,
        totalCount: 0,
        limit: 15,
        currentPage: 1,
        toTop: 0,
        leftIndex: 0,
        searchFather: false,
        topHeight: 0,
        searchId: "",
       
  
      });
  
      var value = wx.getStorageSync('userInfo');
      if (value) {
        this.setData({
          disId: value.nxDistributerEntity.nxDistributerId,
          userInfo: value,
          disInfo: value.nxDistributerEntity
        })
        console.log("userInfo")
        this._getCataGoods();
      }
      //  else {
  
      //   this._login();
  
      // }
    // }
    

  },

},


methods: {
 

  _getCataGoods() {
    var that = this;
    load.showLoading("获取数据中");
    var data = {
      disId: this.data.disId,
      goodsType: this.data.goodsType
    }
    getDisGoodsCataWithCount(data).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        console.log("aaa", res.result.data);
        this.setData({
          grandList: res.result.data.list,
          linshiCount: res.result.data.lishiCount,
          priceCount: res.result.data.priceCount,
          buyPriceCount: res.result.data.buyPriceCount,
         
        })
        if(res.result.data.list.length > 0){
          this.setData({
            fatherArr: res.result.data.list[0].fatherGoodsEntities,
            leftGreatId: res.result.data.list[0].nxDistributerFatherGoodsId,
            greatName: res.result.data.list[0].nxDfgFatherGoodsName,
          })
          that._getFatherGoods();
        }else{
          this.setData({
            fatherArr: [],
            goodsList:[],
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
      searchFather: false,
      searchId: '',
      greatName: e.currentTarget.dataset.name,
      fatherArr: this.data.grandList[e.currentTarget.dataset.index].fatherGoodsEntities,
    })

    this._getFatherGoods();

  },

  _getFatherGoods() {
     var that  = this;
    var data = {
      disId: this.data.disId,
      depId: this.data.depFatherId,
      fatherId: this.data.leftGreatId,
      limit: this.data.limit,
      page: this.data.currentPage,
      goodsType: this.data.goodsType
    }
    getDisGoodsByGreatGrandIdWithCount(data).then(res => {
      if (res.result.code == 0) {
        console.log("byGreatidididididididwithcoutntnt------", res.result.page);
        this.setData({
          goodsList: res.result.page.is.list,
          currentPage: this.data.currentPage + 1,
          totalPage: res.result.page.is.totalPage,
          totalCount: res.result.page.is.totalCount,
        })
        that.getTabBar().setData({
          stockCount: res.result.page.stockCount,
          stockCountOk: res.result.page.stockCountOk,
          wxCount: res.result.page.wxCount,
          wxCountOk: res.result.page.wxCountOk,
          prepareCount: res.result.page.preOrders,
          buyOrders: res.result.page.buyOrders,
          buyOrdersOk: res.result.page.buyOrdersOk,
          })

        wx.nextTick(() => {
          this.updateFixedContentHeight();
        });

      }
    })
  },

  updateFixedContentHeight() {
    const query = wx.createSelectorQuery();
    query.select('#miltest').boundingClientRect((rect) => {
      const fixedContentHeightPx = rect.height; // 单位 px
      // const rpxRatio = 750 / wx.getSystemInfoSync().windowWidth;
      const fixedContentHeightRpx = fixedContentHeightPx * this.data.rpxRatio;

      // 更新 fixedContentHeight
      this.setData({
        fixedContentHeight: fixedContentHeightRpx,
      });

      // 重新计算滚动区域高度
      const scrollContentHeight = this.data.contentHeight - fixedContentHeightRpx;
      this.setData({
        scrollContentHeight: scrollContentHeight,
      });
    }).exec();
  },

  
  _getTopFatherGoods(e) {
    if(this.data.searchFather){
      this.setData({
        searchFather: false,
        searchId: '',
      })
      this._getFatherGoods();
    }else{
      console.log(e);
      this.setData({
        searchFather: true,
        searchId: e.currentTarget.dataset.id,
      })
      var data = {
        fatherId: e.currentTarget.dataset.id,
      }
      getDisGoodsByGrandId(data).then(res => {
        if (res.result.code == 0) {
          this.setData({
            goodsList: res.result.data,
            toTop: 0,
            currentPage: 1,
  
          })
        }
      })
    }
   
  },

  onScrollToLower: function () {
    var that  = this;
    // 防止重复请求
    if (this.data.isLoading || this.data.goodsList.length >= this.data.totalCount) return;

    this.setData({
      isLoading: true
    });

    const {
      currentPage,
      totalPage,
      searchFather,
      leftGreatId,
      goodsType,
      depFatherId,
      disId,
      limit
    } = this.data;

    // 确保非搜索模式，并且当前页数未超过总页数
    if (!searchFather && currentPage <= totalPage) {
      const data = {
        limit: limit,
        page: currentPage,
        fatherId: leftGreatId,
        goodsType: goodsType,
        disId: disId,
      };

      getDisGoodsByGreatGrandIdWithCount(data)
        .then((res) => {
          if (res.result.code == 0) {
            const newItems = res.result.page.is.list || [];
            const updatedGoodsList = [...this.data.goodsList, ...newItems];

            // 更新当前页和商品列表
            this.setData({
              goodsList: updatedGoodsList,
              currentPage: currentPage + 1,
              totalPage: res.result.page.is.totalPage,
              totalCount: res.result.page.is.totalCount,
              isLoading: false,
            });
            that.getTabBar().setData({
              stockCount: res.result.page.stockCount,
              stockCountOk: res.result.page.stockCountOk,
              wxCount: res.result.page.wxCount,
              wxCountOk: res.result.page.wxCountOk,
              prepareCount: res.result.page.preOrders,
              buyOrders: res.result.page.buyOrders,
              buyOrdersOk: res.result.page.buyOrdersOk,
              })
    

            // 如果已达到 totalCount，停止加载
            if (updatedGoodsList.length >= this.data.totalCount) {
              this.setData({
                isLoading: false
              });
            }
            
          } else {
            wx.showToast({
              title: '获取商品失败',
              icon: 'none'
            });
            this.setData({
              isLoading: false
            });
          }
        })
        .catch((err) => {
          console.log(err);
          wx.showToast({
            title: '加载错误，请稍后再试',
            icon: 'none'
          });
          this.setData({
            isLoading: false
          });
        });
    } else {
      this.setData({
        isLoading: false
      });
    }
  },

  openOperation(e) {
    this.setData({
      showOperationGoods: true,
    })
    this.getTabBar().setData({
      showTabBar: false
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

  hideMask() {
    this.getTabBar().setData({
      showTabBar: true
    })
    this.hideModal();
    this.setData({
      showOperationGoods: false,
    })
  },

  getGoodsType(e) {
    var goodsType = e.currentTarget.dataset.type;
    this.setData({
      goodsType: goodsType,
      currentPage: 1,
      showOperationGoods: false
    })
    this._getCataGoods();
    this.hideModal();
  },

  /**
   * 修改售价
   * @param {修改商品 id} e 
   */
  showIsPurchase(e) {
    var item = e.currentTarget.dataset.item;
    this.getTabBar().setData({
      showTabBar: false
    })
    if (this.data.disInfo.nxDistributerBusinessTypeId == 1) {
      this.setData({
        goodsIndex: e.currentTarget.dataset.index,
        showBuyingPrice: true,
        item: item,
      })
    } else if (this.data.disInfo.nxDistributerBusinessTypeId == 1) {
      this.setData({
        goodsIndex: e.currentTarget.dataset.index,
        showIsPurchaseSingle: true,
        item: item,
      })
    } else if (this.data.disInfo.nxDistributerBusinessTypeId == 2) {
      var profit = "";
      var willPrice = "";
      var buyingPrice = "";
      var weight = "";
      this.setData({
        goodsIndex: e.currentTarget.dataset.index,
        showIsPurchase: true,
        item: item,

      })
    } else if (this.data.disInfo.nxDistributerBusinessTypeId == 1) {
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
      if (e.currentTarget.dataset.level == 3) {
        profit = item.nxDgPriceProfitThree;
        willPrice = item.nxDgWillPriceThree;
        buyingPrice = item.nxDgBuyingPriceThree;
        weight = item.nxDgWillPriceThreeWeight;
      }

      this.setData({
        goodsIndex: e.currentTarget.dataset.index,
        showIsPurchaseSingle: true,
        item: item,
        level: e.currentTarget.dataset.level,
        profit: profit,
        willPrice: willPrice,
        buyingPrice: buyingPrice,
        weight: weight
      })
    }

  },

  /**
   * 修改售价接口
   */
  confirm(e) {
    var item = e.detail.item;
    console.log(item);
    item.nxDgWillPriceOneWeight = 0;
    item.nxDgWillPriceTwoWeight = 0;
    item.nxDgWillPriceThreeWeight = 0;

    disUpdateBuyingPrice(item)
      .then(res => {
        if (res.result.code == 0) {
          this.getTabBar().setData({
            showTabBar: true
          })
          var data = "goodsList[" + this.data.goodsIndex + "]";
            this.setData({
              [data]: item,
              item: item,
            })
        }
      })
  },

  cancleIsPurchase(){
    this.getTabBar().setData({
      showTabBar: true
    })
  },


  toEditHome() {
    if (this.data.userInfo.nxDiuAdmin == 0) {
      wx.navigateTo({
        url: '../../../../subPackage/pages/mangement/homePage/homePage',
      })
    }
  },
  
  /**
   * 打开修改商品页面
   * @param {*} e 
   */
  toGoodsDetailPage(e) {
    wx.navigateTo({
      url: '../../subPackage/pages/goods/disGoodsPage/disGoodsPage?disGoodsId=' + e.currentTarget.dataset.id + '&goodsName=' + e.currentTarget.dataset.name + '&color=' + e.currentTarget.dataset.color + '&editIndex=' + e.currentTarget.dataset.index
      +'&from=index',
    })

  },




  /**
   * 打开修改图片页面
   */
  toEditGoodsImage(e) {
    wx.setStorageSync('disGoods', e.currentTarget.dataset.item);
    wx.navigateTo({
      url: '../../subPackage/pages/goods/nxGoodsPicture/nxGoodsPicture?editIndex=' +  e.currentTarget.dataset.index,
    })
  },



  beginSearch(){
    wx.navigateTo({
      url: '../../subPackage/pages/goods/searchGoods/searchGoods',
    })
  },
  
  toLinshiGoods() {
    wx.navigateTo({
      url: '../../subPackage/pages/goods/linshiGoodsDis/linshiGoodsDis?disId=' + this.data.disId,
    })
  },


  toUpdatePriceGoods(e) {
    wx.navigateTo({
      url: '../../subPackage/pages/goods/updatePriceGoods/updatePriceGoods?type=' + e.currentTarget.dataset.type,
    })
  },



  onNavButtonTap() {
   wx.navigateTo({
     url: '../../subPackage/pages/management/homePage/homePage',
   })
  },

}

});

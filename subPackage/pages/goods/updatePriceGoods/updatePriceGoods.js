import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil');

import {

  disUpdateBuyingPrice,
  disGetUpdatePriceGoods
} from '../../../../lib/apiDistributer'


Page({



  onLoad(options) {
    const app = getApp();
    const globalData = app.globalData;


    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      type: options.type,
      disId: options.id,
      upTime: dateUtils.getDateTimeString(),
      // 分页相关
      currentPage: 1,
      pageSize: 20,
      totalPage: 1,
      hasMore: true,
      isLoading: false,
      goodsList: [], // 初始化商品列表为空数组
    })

    var value = wx.getStorageSync('userInfo');
    if (value) {
      this.setData({
        disId: value.nxDistributerEntity.nxDistributerId,
        userInfo: value
      })
    }
    var valueD = wx.getStorageSync('disInfo');
    if (valueD) {
      this.setData({
        disInfo: valueD
      })
    }

    this._initData();

  },

  // 本地变量跟踪加载状态
  _isLoading: false,

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    console.log('=== 下拉刷新 ===');
    this._refreshData();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
    console.log('=== 触发上拉加载更多 ===');
    console.log('当前状态:', {
      _isLoading: this._isLoading,
      hasMore: this.data.hasMore,
      currentPage: this.data.currentPage,
      totalPage: this.data.totalPage,
      isLoading: this.data.isLoading
    });
    
    if (!this._isLoading && this.data.hasMore && !this.data.isLoading) {
      this._loadMoreData();
    } else {
      console.log('条件不满足，不加载更多:', {
        _isLoading: this._isLoading,
        hasMore: this.data.hasMore,
        isLoading: this.data.isLoading
      });
    }
  },

  /**
   * 下拉刷新
   */
  _refreshData() {
    console.log('=== 开始刷新数据 ===');
    this.setData({
      currentPage: 1,
      goodsList: [],
      hasMore: true,
      refresherTriggered: true
    });
    
    this._initData().then(() => {
      this.setData({
        refresherTriggered: false
      });
      wx.stopPullDownRefresh();
      console.log('=== 刷新完成 ===');
    }).catch(() => {
      this.setData({
        refresherTriggered: false
      });
      wx.stopPullDownRefresh();
      console.log('=== 刷新失败 ===');
    });
  },

  /**
   * 加载更多数据
   */
  _loadMoreData() {
    console.log('=== _loadMoreData 被调用 ===');
    console.log('检查条件:', {
      _isLoading: this._isLoading,
      hasMore: this.data.hasMore,
      currentPage: this.data.currentPage,
      totalPage: this.data.totalPage
    });
    
    if (this._isLoading || !this.data.hasMore) {
      console.log('条件不满足，退出加载:', {
        _isLoading: this._isLoading,
        hasMore: this.data.hasMore
      });
      return;
    }
    
    console.log('开始加载下一页，当前页:', this.data.currentPage);
    this.setData({
      currentPage: this.data.currentPage + 1
    });
    console.log('页码已更新为:', this.data.currentPage);
    
    this._initData().then(() => {
      console.log('=== 加载更多完成 ===');
    }).catch(() => {
      console.log('=== 加载更多失败 ===');
      this.setData({
        currentPage: this.data.currentPage - 1
      });
    });
  },

  /**
   * 获取初始数据（支持分页）
   */
  _initData() {
    if (this._isLoading) {
      console.log('正在加载中，跳过请求');
      return Promise.resolve();
    }

    console.log('开始设置 _isLoading: true');
    this._isLoading = true;
    this.setData({
      isLoading: true
    });

    var data = {
      disId: this.data.disId,
      type: this.data.type,
      limit: this.data.pageSize,
      page: this.data.currentPage,
    }

    console.log('=== 请求分页数据 ===');
    console.log('请求参数:', data);

    return disGetUpdatePriceGoods(data).then(res => {
      console.log('=== API响应 ===');
      console.log('完整响应:', res);
      
      if (res.result.code == 0) {
        const pageData = res.result.page;
        const newGoodsList = pageData.list || [];
        
        console.log('=== 数据处理 ===');
        console.log('当前页码:', this.data.currentPage);
        console.log('返回数据:', {
          listLength: newGoodsList.length,
          totalPage: pageData.totalPage,
          currentPage: pageData.currPage || pageData.currentPage
        });
        
        // 如果是第一页，直接替换；否则追加
        const finalGoodsList = this.data.currentPage === 1 
          ? newGoodsList 
          : [...this.data.goodsList, ...newGoodsList];
        
        const hasMore = this.data.currentPage < (pageData.totalPage || 1);
        
        console.log('更新状态:', {
          finalListLength: finalGoodsList.length,
          totalPage: pageData.totalPage || 1,
          hasMore: hasMore
        });
        
        this.setData({
          goodsList: finalGoodsList,
          totalPage: pageData.totalPage || 1,
          hasMore: hasMore,
          isLoading: false
        });
        
        this._isLoading = false;
        console.log('=== 数据更新完成 ===');
      } else {
        this.setData({
          isLoading: false
        });
        this._isLoading = false;
        wx.showToast({
          title: res.result.msg || '获取数据失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      console.error('获取商品列表失败:', err);
      this.setData({
        isLoading: false
      });
      this._isLoading = false;
      wx.showToast({
        title: '网络连接失败',
        icon: 'none'
      });
    });
  },

  toDetail(e) {
    console.log(e);
    // this.stopSearch();
    this.setData({
      goodsIndex: e.currentTarget.dataset.index,
    })
    wx.navigateTo({
      url: '../disGoodsPage/disGoodsPage?disGoodsId=' + e.currentTarget.dataset.id + '&goodsName=' + e.currentTarget.dataset.name + '&color=' + e.currentTarget.dataset.color
    })

  },



  showIsPurchase(e) {
    var item = e.currentTarget.dataset.item;
    if (this.data.disInfo.nxDistributerType == 1 && this.data.type == 'sell') {
      this.setData({
        goodsIndex: e.currentTarget.dataset.index,
        showBuyingPrice: true,
        item: item,
        // level: e.currentTarget.dataset.level,
        // profit:profit,
        // willPrice: willPrice,
        // buyingPrice: buyingPrice,
        // weight: weight
      })
    } else if (this.data.disInfo.nxDistributerType == 1 && this.data.type == 'buyingPrice') {
      this.setData({
        goodsIndex: e.currentTarget.dataset.index,
        showIsPurchaseSingle: true,
        item: item,
        // level: e.currentTarget.dataset.level,
        // profit:profit,
        // willPrice: willPrice,
        // buyingPrice: buyingPrice,
        // weight: weight
      })
    } else if (this.data.disInfo.nxDistributerType == 3) {

      console.log(e);
      console.log(e.currentTarget.dataset.level);
      var profit = "";
      var willPrice = "";
      var buyingPrice = "";
      var weight = "";
      // if(e.currentTarget.dataset.level == 1){
      //   profit = item.nxDgPriceProfitOne;
      //   willPrice = item.nxDgWillPriceOne;
      //   buyingPrice = item.nxDgBuyingPriceOne;
      //   weight = item.nxDgWillPriceOneWeight;
      // }
      // if(e.currentTarget.dataset.level == 2){
      //   profit = item.nxDgPriceProfitTwo;
      //   willPrice = item.nxDgWillPriceTwo;
      //   buyingPrice = item.nxDgBuyingPriceTwo;
      //   weight = item.nxDgWillPriceTwoWeight;
      // }
      // if(e.currentTarget.dataset.level == 3){
      //   profit = item.nxDgPriceProfitThree;
      //   willPrice = item.nxDgWillPriceThree;
      //   buyingPrice = item.nxDgBuyingPriceThree;
      //   weight = item.nxDgWillPriceThreeWeight;
      // }

      this.setData({
        goodsIndex: e.currentTarget.dataset.index,
        showIsPurchase: true,
        item: item,
        // level: e.currentTarget.dataset.level,
        // profit:profit,
        // willPrice: willPrice,
        // buyingPrice: buyingPrice,
        // weight: weight
      })
    } else if (this.data.disInfo.nxDistributerType == 1) {

      console.log(e);
      console.log(e.currentTarget.dataset.level);
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


  confirm(e) {
    var item = e.detail.item;
    console.log(item);
    item.nxDgWillPriceOneWeight = 0;
    item.nxDgWillPriceTwoWeight = 0;
    item.nxDgWillPriceThreeWeight = 0;

    disUpdateBuyingPrice(item)
      .then(res => {
        if (res.result.code == 0) {
          // 刷新数据，重置到第一页
          this.setData({
            currentPage: 1,
            goodsList: [],
            hasMore: true
          });
          this._initData();
        }
      })
  },



  // 跳转客服
  toCustomerServicePages: function () {
    console.log("kefu")
    try {
      wx.openCustomerServiceChat({
        extInfo: {
          url: 'https://work.weixin.qq.com/kfid/kfc016b04fed31d2375' //客服ID
        },
        corpId: 'ww9778dea409045fe6', //企业微信ID
        success(res) {}
      })
    } catch (error) {
      showToast("请更新至微信最新版本")
    }
  },

  radioChange(e) {
    console.log(e.detail.value);
    this.setData({
      purchaseAuto: e.detail.value,
    })
  },

  handleContact(e) {
    console.log(e)
  },





  radioChange(e) {
    console.log(e.detail.value);
    this.setData({
      isGrade: e.detail.value,
    })
    if (this.data.isGrade == 0) {
      if (this.data.buyingPrice > 0) {
        console.log("buyingPrice>000")
        this.setData({
          canDownLoad: true
        })
      }
    } else {
      this.setData({
        canDownLoad: false
      })
    }
    if (this.data.isGrade == 1) {

      if (this.data.buyingPriceOne > 0 && this.data.buyingPriceTwo > 0 &&
        this.data.buyingPriceThree > 0) {
        if (this.data.buyingPrice > 0) {
          this.setData({
            canDownLoad: true
          })
        }
      } else {
        this.setData({
          canDownLoad: false
        })
      }
    }

  },



  toLinshiGoodsList() {
    wx.navigateTo({
      url: '../../../../subPackage/pages/ibook/linshiGoods/linshiGoods?disId=' +
        this.data.disId,
    })
  },

  toBack() {
    wx.navigateBack({
      delta: 1
    })
  },







})
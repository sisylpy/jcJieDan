var app = getApp();

import {
  disGetDisTypeGoodsListByFatherId,
  disUpdateBuyingPrice
}
from '../../../../lib/apiDistributer'

import apiUrl from '../../../../config.js'

var load = require('../../../../lib/load.js');

Page({

  onShow(){
    const app = getApp();
    const globalData = app.globalData;
    
    // 计算 tabbar 高度（rpx）
    const tabBarHeightRpx = 120; // tabbar 高度为 120rpx
    
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      tabBarHeight: tabBarHeightRpx,
    })

  },

  /**
   * 页面的初始数据
   */
  data: {
    // winHeight: "",//窗口高度
    currentTab: 0, //预设当前项的值
    scrollLeft: 0, //tab标题的滚动条位置
    fatherId: null,
    hide: false,
    scrollTop: 0,
    choiceAll: false,
    hasPerCarton: null,
    hasCartonUnit: null, // 外包装查询条件：1-有外包装，0-无外包装，null-不筛选
    hasTraceReport: null, // 溯源查询条件：1-有溯源，0-无溯源，null-不筛选
    // 分页相关
    currentPage: 1,
    pageSize: 20,
    totalPage: 1,
    hasMore: true,
    isLoading: false,
    // 商品列表
    goodsList: [],
    // 刷新相关
    refresherTriggered: false,
    // tabbar 高度
    tabBarHeight: 120,
    // 货架价格弹窗
    showShelfPriceModal: false,
    shelfPriceModalItem: null,
    shelfPriceModalGoodsIndex: -1,
    // 搜索相关
    searchStr: '',
    allGoodsList: [],
    // 显示模式：true-详细模式，false-简洁模式
    showDetailMode: true,
    // 展开的商品索引（简洁模式下使用）
    expandedIndex: -1,
  },

  // 本地变量跟踪加载状态
  _isLoading: false,

 
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
   
    var value = wx.getStorageSync('disInfo');
    if (value) {

      this.setData({
        disId: value.nxDistributerId,
        disInfo: value
      })
    }

    // 从 URL 参数读取外包装筛选条件
    var hasCartonUnit = null;
    if (options.hasCartonUnit !== undefined && options.hasCartonUnit !== '') {
      if (options.hasCartonUnit === 'null') {
        hasCartonUnit = null;
      } else {
        hasCartonUnit = parseInt(options.hasCartonUnit);
      }
    }

    var hasPerCarton = null;
    if (options.hasPerCarton !== undefined && options.hasPerCarton !== '') {
      if (options.hasPerCarton === 'null') {
        hasPerCarton = null;
      } else {
        hasPerCarton = parseInt(options.hasPerCarton);
      }
    }
    // 从 URL 参数读取溯源筛选条件
    var hasTraceReport = null;
    if (options.hasTraceReport !== undefined && options.hasTraceReport !== '') {
      if (options.hasTraceReport === 'null') {
        hasTraceReport = null;
      } else {
        hasTraceReport = parseInt(options.hasTraceReport);
      }
    }

    this.setData({
      url: apiUrl.server,
      fatherId: options.fatherId,
      goodsType: options.goodsType,
      name: options.name,
      hasCartonUnit: hasCartonUnit,
      hasTraceReport: hasTraceReport,
      hasPerCarton: hasPerCarton
    })
    
    console.log('📦 从 goods 页面传递的外包装筛选条件:', hasCartonUnit);
    console.log('🔍 从 goods 页面传递的溯源筛选条件:', hasTraceReport);

    if(options.goodsType == 99){
      this.setData({
        typeName: "全部",
      })
    }
    else if(options.goodsType == -1){
      this.setData({
        typeName: "出库",
      })
    } else if(options.goodsType == 1){
      this.setData({
        typeName: "自采",
      })
    } else if(options.goodsType == 11){
      this.setData({
        typeName: "自动订货(供货商)",
      })
    }
   
    
    this._getInitData();
  },


  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh: function () {
    this._refreshData();
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom: function () {
    console.log('触发上拉加载更多');
    console.log('当前状态:', {
      isLoading: this.data.isLoading,
      hasMore: this.data.hasMore,
      currentPage: this.data.currentPage,
      totalPage: this.data.totalPage
    });
    this._loadMoreData();
  },

  /**
   * 滚动事件
   */
  onScroll: function (e) {
    console.log('滚动事件:', e.detail);
  },


  /**
   * 加载更多数据
   */
  _loadMoreData() {
    console.log('_loadMoreData 被调用');
    console.log('检查条件:', {
      _isLoading: this._isLoading,
      hasMore: this.data.hasMore
    });
    
    if (this._isLoading || !this.data.hasMore) {
      console.log('条件不满足，退出加载');
      return;
    }
    
    console.log('开始加载下一页，当前页:', this.data.currentPage);
    this.setData({
      currentPage: this.data.currentPage + 1
    });
    
    this._getInitData().then(() => {
      console.log('加载完成');
    }).catch(() => {
      console.log('加载失败');
      this.setData({
        currentPage: this.data.currentPage - 1
      });
    });
  },

  /**
   * 获取初始数据
   */
  _getInitData(){
    console.log('_getInitData 被调用，当前 _isLoading:', this._isLoading);
    
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
      fatherId: this.data.fatherId,
      goodsType: this.data.goodsType,
      limit: this.data.pageSize,
      page: this.data.currentPage,
    }
    // 添加外包装查询条件（只有当值不为 null 且不为 undefined 时才添加）
    if (this.data.hasCartonUnit != null && this.data.hasCartonUnit !== undefined) {
      data.hasCartonUnit = this.data.hasCartonUnit;
    }
     // 添加外包装查询条件（只有当值不为 null 且不为 undefined 时才添加）
     if (this.data.hasPerCarton != null && this.data.hasPerCarton !== undefined) {
      data.hasPerCarton = this.data.hasPerCarton;
    }
    // 添加溯源查询条件（只有当值不为 null 且不为 undefined 时才添加）
    if (this.data.hasTraceReport != null && this.data.hasTraceReport !== undefined) {
      data.hasTraceReport = this.data.hasTraceReport;
    }
    
    console.log('=== 请求分页数据 ===');
    console.log('请求参数:', data);
    console.log('当前页码:', this.data.currentPage);
    console.log('每页数量:', this.data.pageSize);
    console.log('外包装筛选:', this.data.hasCartonUnit);
    console.log('溯源筛选:', this.data.hasTraceReport);

    return disGetDisTypeGoodsListByFatherId(data).then(res => {
      console.log('=== API响应 ===');
      console.log('完整响应:', res);
      console.log('响应code:', res.result.code);
      console.log('响应数据:', res.result.data);
      console.log('响应page:', res.result.page);
      
      if(res.result.code == 0){
        const pageData = res.result.page;
        console.log('=== 分页数据结构 ===');
        console.log('pageData:', pageData);
        console.log('pageData.list:', pageData?.list);
        console.log('pageData.totalPage:', pageData?.totalPage);
        console.log('pageData.totalCount:', pageData?.totalCount);
        console.log('pageData.currPage:', pageData?.currPage);
        console.log('pageData.currentPage:', pageData?.currentPage);
        
        const newGoodsList = pageData?.list || [];
        
        console.log('=== 分页数据汇总 ===');
        console.log('请求页码:', this.data.currentPage);
        console.log('返回总页数:', pageData?.totalPage);
        console.log('返回当前页:', pageData?.currPage || pageData?.currentPage);
        console.log('返回列表长度:', newGoodsList.length);
        console.log('现有列表长度:', this.data.goodsList.length);
        console.log('合并后列表长度:', this.data.goodsList.length + newGoodsList.length);
        
        // 如果是第一页，直接替换；否则追加
        const finalGoodsList = this.data.currentPage === 1 ? newGoodsList : [...this.data.goodsList, ...newGoodsList];
        
        this.setData({
          totalCount: pageData.totalCount,
          goodsList: finalGoodsList,
          allGoodsList: finalGoodsList,
          totalPage: pageData.totalPage || 1,
          hasMore: this.data.currentPage < (pageData.totalPage || 1),
          isLoading: false
        });
        
        this._isLoading = false;
        
        console.log('更新后的状态:', {
          hasMore: this.data.currentPage < (pageData.totalPage || 1),
          totalPage: pageData.totalPage || 1
        });
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





  
  showIsPurchase(e) {
    var item = e.currentTarget.dataset.item;
    // this.getTabBar().setData({
    //   showTabBar: false
    // })
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
      // if (e.currentTarget.dataset.level == 3) {
      //   profit = item.nxDgPriceProfitThree;
      //   willPrice = item.nxDgWillPriceThree;
      //   buyingPrice = item.nxDgBuyingPriceThree;
      //   weight = item.nxDgWillPriceThreeWeight;
      // }
  
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
          // this.getTabBar().setData({
          //   showTabBar: true
          // })
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
            // this.getTabBar().setData({
            //   showTabBar: true
            // })
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
      url: '../disGoodsPage/disGoodsPage?disGoodsId=' + e.currentTarget.dataset.id + '&goodsName=' + e.currentTarget.dataset.name + '&color=' + e.currentTarget.dataset.color + '&editIndex=' + e.currentTarget.dataset.index
      +'&from=index',
    })

  },

  /**
   * 预览商品图片
   */
  /**
   * 搜索输入
   */
  onSearchInput(e) {
    const searchStr = e.detail.value.trim();
    this.setData({ searchStr });
    this._filterGoods(searchStr);
  },

  /**
   * 搜索确认
   */
  onSearchInputConfirm(e) {
    const searchStr = e.detail.value.trim();
    this.setData({ searchStr });
    this._filterGoods(searchStr);
  },

  /**
   * 清除搜索词
   */
  clearSearch() {
    this.setData({
      searchStr: '',
      goodsList: this.data.allGoodsList,
      totalCount: this.data.allGoodsList.length
    });
  },

  /**
   * 切换显示模式
   */
  toggleViewMode() {
    this.setData({
      showDetailMode: !this.data.showDetailMode,
      expandedIndex: -1
    });
  },

  /**
   * 点击商品行（简洁模式下展开详情）
   */
  onGoodsItemTap(e) {
    if (this.data.showDetailMode) {
      // 详细模式下跳转到详情页
      this.toGoodsDetailPage(e);
      return;
    }
    // 简洁模式下
    const index = e.currentTarget.dataset.index;
    if (this.data.expandedIndex === index) {
      // 已展开：跳转到详情页
      this.toGoodsDetailPage(e);
      return;
    }
    // 未展开：展开详情
    this.setData({
      expandedIndex: index
    });
  },

  /**
   * 过滤商品列表
   */
  _filterGoods(searchStr) {
    const allGoodsList = this.data.allGoodsList;
    if (!searchStr) {
      this.setData({
        goodsList: allGoodsList,
        totalCount: allGoodsList.length
      });
      return;
    }
    const filteredList = allGoodsList.filter(item => {
      const goodsName = item.nxDgGoodsName || '';
      const brand = item.nxDgGoodsBrand || '';
      const alias = item.nxDistributerAliasEntities || [];
      const aliasStr = alias.map(a => a.nxDaAliasName).join('');
      const searchLower = searchStr.toLowerCase();
      return goodsName.toLowerCase().includes(searchLower) ||
        brand.toLowerCase().includes(searchLower) ||
        aliasStr.toLowerCase().includes(searchLower);
    });
    this.setData({
      goodsList: filteredList,
      totalCount: filteredList.length
    });
  },

  /**
   * 预览商品图片
   */
  previewImage(e) {
    const item = e.currentTarget.dataset.item;
    let imageUrl = '';
    if (item.nxDgGoodsFileLarge && item.nxDgGoodsFileLarge !== 'null') {
      imageUrl = this.data.url + item.nxDgGoodsFileLarge;
    } else if (item.nxDgGoodsFile && item.nxDgGoodsFile !== 'null' && item.nxDgGoodsFile !== 'goodsImage/logo.jpg') {
      imageUrl = this.data.url + item.nxDgGoodsFile;
    }
    if (imageUrl) {
      wx.previewImage({
        urls: [imageUrl],
        current: imageUrl
      });
    }
  },

  /**
   * 打开修改图片页面
   */
  toEditGoodsImage(e) {
    wx.setStorageSync('notUpdate', true);
    wx.setStorageSync('editNxGoods', e.currentTarget.dataset.item);
    wx.setStorageSync('brotherGoods', e.currentTarget.dataset.goods);
    wx.navigateTo({
      url: '../nxPicture/nxPicture?editIndex=' +  e.currentTarget.dataset.index,
    })
  },




  /**
   * 货架型专业批发商（businessTypeId==3）：弹窗编辑 nxDgWillPriceOne / nxDgWillPriceTwo
   */
  openShelfGoodsPriceModal(e) {
    const typeId = Number(this.data.disInfo && this.data.disInfo.nxDistributerBusinessTypeId);
    if (!this.data.disInfo || typeId !== 3) {
      return;
    }
    const goodsIndex = Number(e.currentTarget.dataset.index);
    const list = this.data.goodsList || [];
    const item = list[goodsIndex];
    if (!item) {
      return;
    }
    let entity;
    try {
      entity = JSON.parse(JSON.stringify(item));
    } catch (err) {
      entity = Object.assign({}, item);
    }
    this.setData({
      showShelfPriceModal: true,
      shelfPriceModalItem: entity,
      shelfPriceModalGoodsIndex: goodsIndex,
    });
  },

  onShelfPriceModalCancel() {
    this.setData({
      showShelfPriceModal: false,
      shelfPriceModalItem: null,
      shelfPriceModalGoodsIndex: -1,
    });
  },

  onShelfPriceModalConfirm(e) {
    const updated = e.detail && e.detail.item;
    const idx = this.data.shelfPriceModalGoodsIndex;
    if (!updated || idx < 0) {
      this.onShelfPriceModalCancel();
      return;
    }
    load.showLoading('保存价格');
    disUpdateBuyingPrice(updated)
      .then(res => {
        load.hideLoading();
        if (res.result.code === 0) {
          const path = `goodsList[${idx}]`;
          this.setData({
            [path]: updated,
            showShelfPriceModal: false,
            shelfPriceModalItem: null,
            shelfPriceModalGoodsIndex: -1,
          });
          wx.showToast({ title: '已保存', icon: 'success' });
        } else {
          wx.showToast({ title: res.result.msg || '保存失败', icon: 'none' });
        }
      })
      .catch(() => {
        load.hideLoading();
        wx.showToast({ title: '保存失败', icon: 'none' });
      });
  },

  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  }



})
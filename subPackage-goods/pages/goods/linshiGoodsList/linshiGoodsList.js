
import apiUrl from '../../../../config.js'

var load = require('../../../../lib/load.js');
import {
  disGetLinshiGoodsList,
} from '../../../../lib/apiDepOrder.js'


Page({


  /**
   * 页面的初始数据
   */
  data: {
    goodsId: null,
    showImageModal: false,
    currentImage: '',
    currentGoods: null,
    // 分页相关
    goodsList: [],
    currentPage: 1,
    totalPage: 1,
    totalCount: 0,
    limit: 10,
    isLoading: false,
    hasMore: true
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
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      disId: options.disId,
      url: apiUrl.server,

    
    })
    this._initData();
   
   
  },

  _initData() {
    // 重置分页状态
    this.setData({
      currentPage: 1,
      goodsList: [],
      hasMore: true,
      isLoading: false
    });
    
    load.showLoading("获取商品中");
    var data = {
      disId: this.data.disId,
      page: 1,
      limit: this.data.limit
    };
    
    disGetLinshiGoodsList(data).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        const pageData = res.result.page || {};
        const goodsList = pageData.list || [];
        const totalCount = pageData.totalCount || 0;
        const totalPage = pageData.totalPage || 1;
        const currPage = pageData.currPage || 1;
        
        this.setData({
          goodsList: goodsList,
          currentPage: currPage,
          totalPage: totalPage,
          totalCount: totalCount,
          hasMore: currPage < totalPage
        });
      } else {
        wx.showToast({
          title: res.result.msg || '获取商品失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      load.hideLoading();
      wx.showToast({
        title: '获取商品失败',
        icon: 'none'
      });
    });
  },

  // 加载更多数据
  _loadMoreData() {
    // 防止重复请求
    if (this.data.isLoading || !this.data.hasMore) {
      return;
    }
    
    // 如果已经是最后一页，不加载
    if (this.data.currentPage >= this.data.totalPage) {
      this.setData({
        hasMore: false
      });
      return;
    }
    
    this.setData({
      isLoading: true
    });
    
    const nextPage = this.data.currentPage + 1;
    var data = {
      disId: this.data.disId,
      page: nextPage,
      limit: this.data.limit
    };
    
    disGetLinshiGoodsList(data).then(res => {
      this.setData({
        isLoading: false
      });
      
      if (res.result.code == 0) {
        const pageData = res.result.page || {};
        const newList = pageData.list || [];
        const totalPage = pageData.totalPage || 1;
        const currPage = pageData.currPage || nextPage;
        
        // 合并新数据到现有列表
        const updatedList = [...this.data.goodsList, ...newList];
        
        this.setData({
          goodsList: updatedList,
          currentPage: currPage,
          totalPage: totalPage,
          hasMore: currPage < totalPage
        });
        
        // 如果没有更多数据，提示用户
        if (currPage >= totalPage) {
          wx.showToast({
            title: '没有更多数据了',
            icon: 'none',
            duration: 1500
          });
        }
      } else {
        wx.showToast({
          title: res.result.msg || '加载失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      this.setData({
        isLoading: false
      });
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      });
    });
  },

  // 触底加载更多
  onReachBottom() {
    this._loadMoreData();
  },


  toAlias(e){
    wx.setStorageSync('linshiGoods', e.currentTarget.dataset.item)
    wx.navigateTo({
      url: '../ailasGoodsList/ailasGoodsList?name=' + e.currentTarget.dataset.name
       + '&id=' + e.currentTarget.dataset.id + '&type=' + e.currentTarget.dataset.type
       + '&standard=' + e.currentTarget.dataset.standard,
    })
  },

  //跳转客服
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

  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },

  // 显示图片弹窗
  shwoIImage: function(e) {
    const goods = e.currentTarget.dataset.goods;
    const imageUrl = this.data.url + goods.nxDgGoodsFileLarge;
    
    this.setData({
      showImageModal: true,
      currentImage: imageUrl,
      currentGoods: goods
    });
  },

  // 隐藏图片弹窗
  hideImageModal: function() {
    this.setData({
      showImageModal: false,
      currentImage: '',
      currentGoods: null
    });
  },

  // 阻止事件冒泡
  stopPropagation: function() {
    // 阻止事件冒泡，防止点击内容区域时关闭弹窗
  },

  // 图片加载成功
  onImageLoad: function() {
    console.log('图片加载成功');
  },

  // 图片加载失败
  onImageError: function() {
    wx.showToast({
      title: '图片加载失败',
      icon: 'none'
    });
  }
});
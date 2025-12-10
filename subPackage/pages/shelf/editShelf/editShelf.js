var load = require('../../../../lib/load.js');
var app = getApp()

import {
  disGetShelfList,
  updateShelfSort

} from '../../../../lib/apiDistributer'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    isChanged: false,
    hide: false,
    scrollTop: 0
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const globalData = app.globalData;
    const rpxRatio = 750 / globalData.windowWidth;
    
    // 计算导航栏高度（rpx）
    const navBarHeight = globalData.navBarHeight * rpxRatio;

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      navBarHeight: navBarHeight,
      disId: options.disId,
    });
    
    this._initData();
  },


  _initData(){
    disGetShelfList(this.data.disId)
    .then(res =>{
      if(res.result.code == 0){
        this.setData({
          shelfArr: res.result.data.shelfArr
        })
      }
    })
  },

  // 输入框失去焦点时触发排序
  onSortInputBlur(e) {
    this._handleSortInput(e);
  },

  // 输入框确认时触发排序
  onSortInputConfirm(e) {
    this._handleSortInput(e);
  },

  // 处理排序输入
  _handleSortInput: function(e) {
    var index = e.currentTarget.dataset.index;
    var id = e.currentTarget.dataset.id;
    var value = parseInt(e.detail.value);
    
    // 通过ID查找当前货架，而不是通过索引
    var shelfArr = this.data.shelfArr;
    var currentItem = null;
    var currentIndex = -1;
    
    for (var i = 0; i < shelfArr.length; i++) {
      if (shelfArr[i].nxDistributerGoodsShelfId == id) {
        currentItem = shelfArr[i];
        currentIndex = i;
        break;
      }
    }
    
    if (!currentItem) {
      console.log('未找到对应货架');
      return;
    }
    
    if (isNaN(value) || value <= 0) {
      wx.showToast({
        title: '请输入有效的排序数字',
        icon: 'none'
      });
      return;
    }
    
    // 如果输入的值超出范围，提示错误
    if (value > shelfArr.length) {
      wx.showToast({
        title: '排序号不能超过货架总数',
        icon: 'none'
      });
      return;
    }
    
    // 如果输入的值就是当前位置，不需要移动
    if (value === currentIndex + 1) {
      return;
    }
    
    // 将当前项从数组中移除
    shelfArr.splice(currentIndex, 1);
    
    // 将当前项插入到新的位置（value-1 因为数组索引从0开始）
    shelfArr.splice(value - 1, 0, currentItem);
    
    // 更新所有项的排序号
    for (var i = 0; i < shelfArr.length; i++) {
      shelfArr[i].nxDistributerGoodsShelfSort = i + 1;
    }
  
    this.setData({
      shelfArr: shelfArr,
      isChanged: true
    });
  },


  onPageScroll: function (e) {
    var _this = this;
    if (e.scrollTop <= 0) {
      e.scrollTop = 0;
    } else if (e.scrollTop > wx.getSystemInfoSync().windowHeight) {
      e.scrollTop = wx.getSystemInfoSync().windowHeight;
    }

    if (e.scrollTop > this.data.scrollTop || e.scrollTop == wx.getSystemInfoSync().windowHeight) {
      this.setData({
        hide: true
      })
    } else {
      this.setData({
        hide: false
      })
    }
    setTimeout(function () {
      _this.setData({
        scrollTop: e.scrollTop
      })
    }, 0)
  },



  saveChange(){
   
    load.showLoading("保存修改货架")
    updateShelfSort(this.data.shelfArr)
    .then(res =>{
      if(res.result.code == 0){
        load.hideLoading();
        wx.navigateBack({
          delta: 1,
        })
      }else {
        load.hideLoading();
      }
    })
  },

  
  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },


})
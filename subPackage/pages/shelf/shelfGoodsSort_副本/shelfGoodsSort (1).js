


let self;
const app = getApp()
var load = require('../../../../lib/load.js');

import {
 
  getShelfGoods,
  updateShelfGoodsSort,
  deleteShelfGoods
} from '../../../../lib/apiDistributer'

Page({
  /**
   * 页面的初始数据
   */
  data: {
    isChanged: false,
    hide: false,
    scrollTop: 0,
    // 拖拽相关
    draggingIndex: -1,        // 当前拖拽的商品索引
    dragStartY: 0,            // 拖拽开始的Y坐标
    dragStartX: 0,            // 拖拽开始的X坐标
    dragCurrentY: 0,         // 当前拖拽的Y坐标
    dragCurrentX: 0,         // 当前拖拽的X坐标
    placeholderIndex: -1,    // 占位符位置索引
    itemWidth: 0,            // 每个商品卡片的宽度
    itemHeight: 0,           // 每个商品卡片的高度
    gridColumns: 3,          // 网格列数
    touchStartIndex: -1,     // 触摸开始的索引（用于判断是否开始拖拽）
    longPressTimer: null,    // 长按定时器
    isDragging: false        // 是否正在拖拽（用于区分点击和拖拽）
  },

  /**
  * 生命周期函数--监听页面加载
  */
  onLoad: function (options) {
    const globalData = app.globalData;

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      shelfId: options.shelfId,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      bottomViewHeight: 100 * globalData.rpxR, // 底部按钮区域高度（100rpx：按钮高度80rpx + padding 20rpx）
    })
    self = this;

    this._getInitData();
    
  },

  _getInitData(){
   load.showLoading("获取商品中")
   var data = {
    shelfId: this.data.shelfId,
    page: 1,
    limit: 500,
    shelfGoodsType: '99'
   }
   getShelfGoods(data)
    .then(res =>{
      if(res.result.code == 0){
        load.hideLoading();
        console.log(res);
       const respData = res.result.data || res.result.page || {};
       const goodsList = Array.isArray(respData.list) ? respData.list : (Array.isArray(respData) ? respData : []);
       this.setData({
         shelfGoodsList: goodsList,
       }, () => {
         // 计算商品卡片尺寸
         this._calculateItemSize();
       }) 
      }else{
        load.hideLoading();

      }
    })  
  },

  // 计算商品卡片尺寸
  _calculateItemSize: function() {
    const query = wx.createSelectorQuery();
    query.select('.goods-item').boundingClientRect();
    query.exec((res) => {
      if (res && res[0]) {
        const item = res[0];
        this.setData({
          itemWidth: item.width,
          itemHeight: item.height
        });
      }
    });
  },

  // 触摸开始
  onTouchStart: function(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const touch = e.touches[0];
    
    // 清除之前的长按定时器
    if (this.data.longPressTimer) {
      clearTimeout(this.data.longPressTimer);
    }
    
    // 记录触摸开始的位置和索引，但不立即开始拖拽
    this.setData({
      touchStartIndex: index,
      dragStartX: touch.clientX,
      dragStartY: touch.clientY,
      dragCurrentX: touch.clientX,
      dragCurrentY: touch.clientY,
      isDragging: false
    });
    
    // 设置长按延迟（200ms）后才允许开始拖拽
    const longPressTimer = setTimeout(() => {
      if (this.data.touchStartIndex === index) {
        this.setData({
          draggingIndex: index,
          isDragging: true
        });
        // 触觉反馈
        wx.vibrateShort({
          type: 'medium'
        });
      }
    }, 200);
    
    this.setData({
      longPressTimer: longPressTimer
    });
  },

  // 触摸移动
  onTouchMove: function(e) {
    // 如果还没有开始拖拽，判断是否应该开始
    if (!this.data.isDragging && this.data.touchStartIndex !== -1) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - this.data.dragStartX;
      const deltaY = touch.clientY - this.data.dragStartY;
      const moveDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // 判断移动方向：主要是垂直移动（可能是滚动）还是其他方向（可能是拖拽）
      const isVerticalMove = Math.abs(deltaY) > Math.abs(deltaX) * 2; // 垂直移动明显大于水平移动（2倍）
      
      // 如果移动距离超过20px，且不是明显的垂直滚动，则开始拖拽
      if (moveDistance > 20 && !isVerticalMove) {
        // 清除长按定时器
        if (this.data.longPressTimer) {
          clearTimeout(this.data.longPressTimer);
          this.setData({
            longPressTimer: null
          });
        }
        // 开始拖拽
        this.setData({
          draggingIndex: this.data.touchStartIndex,
          isDragging: true
        });
        // 触觉反馈
        wx.vibrateShort({
          type: 'light'
        });
      } else if (isVerticalMove && moveDistance > 15) {
        // 如果是明显的垂直滚动，清除触摸状态，允许滚动
        if (this.data.longPressTimer) {
          clearTimeout(this.data.longPressTimer);
          this.setData({
            longPressTimer: null,
            touchStartIndex: -1
          });
        }
        // 不阻止事件，允许滚动
        return;
      } else {
        // 移动距离太小，不处理，但也不阻止滚动
        return;
      }
    }
    
    // 只有正在拖拽时才处理移动
    if (this.data.draggingIndex === -1 || !this.data.isDragging) {
      return;
    }
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - this.data.dragStartX;
    const deltaY = touch.clientY - this.data.dragStartY;
    const moveDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // 如果移动距离太小，不触发位置计算
    if (moveDistance < 20) {
      return;
    }
    
    this.setData({
      dragCurrentX: touch.clientX,
      dragCurrentY: touch.clientY
    });
    
    // 节流计算目标位置（避免频繁查询DOM）
    if (!this._throttleTimer) {
      this._throttleTimer = setTimeout(() => {
        this._calculateTargetIndex(touch.clientX, touch.clientY);
        this._throttleTimer = null;
      }, 50);
    }
  },

  // 触摸结束
  onTouchEnd: function(e) {
    // 清除长按定时器
    if (this.data.longPressTimer) {
      clearTimeout(this.data.longPressTimer);
      this.setData({
        longPressTimer: null
      });
    }
    
    // 清除节流定时器
    if (this._throttleTimer) {
      clearTimeout(this._throttleTimer);
      this._throttleTimer = null;
    }
    
    // 只有真正拖拽了才处理排序
    if (this.data.draggingIndex === -1 || !this.data.isDragging) {
      // 重置触摸状态
      this.setData({
        touchStartIndex: -1,
        isDragging: false
      });
      return;
    }
    
    const targetIndex = this.data.placeholderIndex !== -1 ? this.data.placeholderIndex : this.data.draggingIndex;
    
    if (targetIndex !== this.data.draggingIndex && targetIndex !== -1) {
      // 执行排序
      this._moveItem(this.data.draggingIndex, targetIndex);
    }
    
    // 重置拖拽状态
    this.setData({
      draggingIndex: -1,
      placeholderIndex: -1,
      touchStartIndex: -1,
      isDragging: false,
      dragStartX: 0,
      dragStartY: 0,
      dragCurrentX: 0,
      dragCurrentY: 0
    });
  },

  // 计算目标索引位置
  _calculateTargetIndex: function(clientX, clientY) {
    const query = wx.createSelectorQuery();
    query.selectAll('.goods-item').boundingClientRect();
    query.selectViewport().scrollOffset();
    query.exec((res) => {
      if (!res || !res[0] || res[0].length === 0) return;
      
      const items = res[0];
      const scrollTop = res[1].scrollTop;
      const adjustedY = clientY + scrollTop;
      
      // 计算当前触摸点对应的商品索引
      let targetIndex = -1;
      let minDistance = Infinity;
      
      for (let i = 0; i < items.length; i++) {
        // 跳过正在拖拽的商品
        if (i === this.data.draggingIndex) continue;
        
        const item = items[i];
        const centerX = item.left + item.width / 2;
        const centerY = item.top + item.height / 2;
        
        // 计算触摸点到商品中心的距离
        const distance = Math.sqrt(
          Math.pow(clientX - centerX, 2) + Math.pow(adjustedY - centerY, 2)
        );
        
        // 如果触摸点在商品区域内，或者距离最近
        if ((clientX >= item.left && clientX <= item.right &&
             adjustedY >= item.top && adjustedY <= item.bottom) ||
            distance < minDistance) {
          if (distance < minDistance) {
            minDistance = distance;
            targetIndex = i;
          }
        }
      }
      
      if (targetIndex !== -1 && targetIndex !== this.data.draggingIndex) {
        this.setData({
          placeholderIndex: targetIndex
        });
      } else if (targetIndex === -1) {
        // 如果没有找到目标位置，清除占位符
        this.setData({
          placeholderIndex: -1
        });
      }
    });
  },

  // 移动商品到新位置
  _moveItem: function(fromIndex, toIndex) {
    const shelfGoodsList = this.data.shelfGoodsList.slice();
    const item = shelfGoodsList[fromIndex];
    
    // 移除原位置
    shelfGoodsList.splice(fromIndex, 1);
    // 插入新位置
    shelfGoodsList.splice(toIndex, 0, item);
    
    // 更新排序号
    for (let i = 0; i < shelfGoodsList.length; i++) {
      shelfGoodsList[i].nxDgsgSort = i + 1;
    }
    
    this.setData({
      shelfGoodsList: shelfGoodsList,
      isChanged: true
    });
  },

  // 输入框失去焦点时触发排序
  onSortInputBlur: function(e) {
    console.log('🔍 输入框失去焦点事件');
    console.log('点击的商品索引:', e.currentTarget.dataset.index);
    console.log('点击的商品ID:', e.currentTarget.dataset.id);
    console.log('输入框的值:', e.detail.value);
    this._handleSortInput(e);
  },

  // 输入框确认时触发排序
  onSortInputConfirm: function(e) {
    console.log('🔍 输入框确认事件');
    console.log('点击的商品索引:', e.currentTarget.dataset.index);
    console.log('点击的商品ID:', e.currentTarget.dataset.id);
    console.log('输入框的值:', e.detail.value);
    this._handleSortInput(e);
  },

  // 处理排序输入
  _handleSortInput: function(e) {
    var index = e.currentTarget.dataset.index;
    var id = e.currentTarget.dataset.id;
    var value = parseInt(e.detail.value);
    
    console.log('=== 开始排序操作 ===');
    console.log('输入排序值:', value);
    console.log('当前商品索引:', index);
    console.log('当前商品ID:', id);
    
    // 通过ID查找当前商品，而不是通过索引
    var shelfGoodsList = this.data.shelfGoodsList;
    var currentItem = null;
    var currentIndex = -1;
    
    for (var i = 0; i < shelfGoodsList.length; i++) {
      if (shelfGoodsList[i].nxDistributerGoodsShelfGoodsId == id) {
        currentItem = shelfGoodsList[i];
        currentIndex = i;
        break;
      }
    }
    
    if (!currentItem) {
      console.log('❌ 未找到对应商品');
      return;
    }
    
    console.log('当前商品名称:', currentItem.nxDistributerGoodsEntity.nxDgGoodsName);
    console.log('当前商品原排序:', currentItem.nxDgsgSort);
    console.log('当前商品实际索引:', currentIndex);
    
    // 显示网格布局的索引映射
    console.log('📊 网格布局索引映射:');
    shelfGoodsList.forEach((item, idx) => {
      var row = Math.floor(idx / 4) + 1;
      var col = (idx % 4) + 1;
      console.log(`  数组索引${idx}: ${item.nxDistributerGoodsEntity.nxDgGoodsName} → 第${row}行第${col}列`);
    });
    
    if (isNaN(value) || value <= 0) {
      console.log('❌ 输入值无效，退出排序');
      wx.showToast({
        title: '请输入有效的排序数字',
        icon: 'none'
      });
      return;
    }
    
    console.log('📋 排序前商品列表:');
    shelfGoodsList.forEach((item, idx) => {
      var row = Math.floor(idx / 4) + 1;
      var col = (idx % 4) + 1;
      console.log(`  ${idx + 1}. ${item.nxDistributerGoodsEntity.nxDgGoodsName} (排序:${item.nxDgsgSort}) [第${row}行第${col}列]`);
    });
    
    // 如果输入的值超出范围，提示错误
    if (value > shelfGoodsList.length) {
      console.log('❌ 排序值超出范围，退出排序');
      wx.showToast({
        title: '排序号不能超过商品总数',
        icon: 'none'
      });
      return;
    }
    
    // 如果输入的值就是当前位置，不需要移动
    if (value === currentIndex + 1) {
      console.log('✅ 位置相同，无需移动');
      return;
    }
    
    console.log(`🔄 开始移动商品: ${currentItem.nxDistributerGoodsEntity.nxDgGoodsName}`);
    console.log(`   从位置 ${currentIndex + 1} 移动到位置 ${value}`);
    
    // 将当前项从数组中移除
    shelfGoodsList.splice(currentIndex, 1);
    console.log('   1. 已从原位置移除商品');
    
    // 将当前项插入到新的位置（value-1 因为数组索引从0开始）
    shelfGoodsList.splice(value - 1, 0, currentItem);
    console.log(`   2. 已插入到新位置 ${value}`);
    
    console.log('📋 移动后商品列表:');
    shelfGoodsList.forEach((item, idx) => {
      var row = Math.floor(idx / 4) + 1;
      var col = (idx % 4) + 1;
      console.log(`  ${idx + 1}. ${item.nxDistributerGoodsEntity.nxDgGoodsName} (排序:${item.nxDgsgSort}) [第${row}行第${col}列]`);
    });
    
    // 更新所有项的排序号
    console.log('🔄 开始重新编号...');
    for (var i = 0; i < shelfGoodsList.length; i++) {
      var oldSort = shelfGoodsList[i].nxDgsgSort;
      shelfGoodsList[i].nxDgsgSort = i + 1;
      console.log(`   ${shelfGoodsList[i].nxDistributerGoodsEntity.nxDgGoodsName}: ${oldSort} → ${i + 1}`);
    }
    
    console.log('📋 重新编号后商品列表:');
    shelfGoodsList.forEach((item, idx) => {
      var row = Math.floor(idx / 4) + 1;
      var col = (idx % 4) + 1;
      console.log(`  ${idx + 1}. ${item.nxDistributerGoodsEntity.nxDgGoodsName} (排序:${item.nxDgsgSort}) [第${row}行第${col}列]`);
    });
    
    this.setData({
      shelfGoodsList: shelfGoodsList,
      isChanged: true
    });
    console.log('✅ 页面数据已更新');
    
    // 添加一个小延迟确保UI更新
    setTimeout(() => {
      console.log('📋 UI更新后的最终状态:');
      this.data.shelfGoodsList.forEach((item, idx) => {
        var row = Math.floor(idx / 4) + 1;
        var col = (idx % 4) + 1;
        console.log(`  ${idx + 1}. ${item.nxDistributerGoodsEntity.nxDgGoodsName} (排序:${item.nxDgsgSort}) [第${row}行第${col}列]`);
      });
      console.log('=== 排序操作完成 ===');
    }, 100);
  },

  saveChange(){
    var arr = this.data.shelfGoodsList;
    var temp = [];
    for(var i = 0; i < arr.length; i++){
      var item = arr[i];
      item.nxDgsgSort = i + 1;
      temp.push(item);
    }
    load.showLoading("保存修改商品")
    updateShelfGoodsSort(temp)
    .then(res =>{
      if(res.result.code == 0){
        load.hideLoading();
        var pages = getCurrentPages();
        var prevPage = pages[pages.length - 2]; //上一个页面
        //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
        prevPage.setData({
          update: true,
        })
        wx.navigateBack({
          delta: 1,
        })
      }else {
        load.hideLoading();
      }
    })
  },

  deleteGoods(e){
     deleteShelfGoods(e.currentTarget.dataset.id)
     .then(res =>{
       if(res.result.code == 0){
         
         this._getInitData();
       }
     })
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

  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  },

})



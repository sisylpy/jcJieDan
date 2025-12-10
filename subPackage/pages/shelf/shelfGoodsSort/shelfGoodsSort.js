


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
    draggingIndex: -1,        // 正在拖拽的卡片 index
    placeholderIndex: -1,      // 目标位置 index
    isDragging: false,         // 是否正在拖拽
    dragPageX: 0,              // 当前手指 pageX
    dragPageY: 0,              // 当前手指 pageY
    // 网格布局参数
    gridColumns: 3,            // 一行几个（与样式一致）
    itemWidth: 0,              // 单个卡片宽度
    itemHeight: 0,             // 单个卡片高度
    containerTop: 0,           // 网格容器 top
    containerLeft: 0,          // 网格容器 left
    // 长按相关
    longPressTimer: null,      // 长按定时器
    touchStartIndex: -1,       // 触摸开始的索引
    // 是否禁止滚动
    disableScroll: false,       // 拖拽时禁止滚动
    // 层级文本映射
    layerTextMap: {
      1: '第一层结束',
      2: '第二层结束',
      3: '第三层结束',
      4: '第四层结束',
      5: '第五层结束',
      6: '第六层结束',
      7: '第七层结束',
      8: '第八层结束',
      9: '第九层结束',
    }
  },
  
  // 初始化滚动位置缓存
  _currentScrollTop: 0,
  _scrollQueryTimer: null,

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
    })
    self = this;

    this._getInitData();
    
  },

  _getInitData(){
   load.showLoading("获取商品中")
   getShelfGoods(this.data.shelfId, 1, 500)
    .then(res =>{
      if(res.result.code == 0){
        load.hideLoading();
        console.log(res);
       const respData = res.result.data || res.result.page || {};
       const goodsList = Array.isArray(respData.list) ? respData.list : (Array.isArray(respData) ? respData : []);
       this.setData({
         shelfGoodsList: goodsList,
       }, () => {
         // 测量一次网格尺寸
         this._measureGrid();
       }) 
      }else{
        load.hideLoading();

      }
    })  
  },

  // 测量网格尺寸（只测量一次）
  _measureGrid: function() {
    const query = wx.createSelectorQuery();
    // 测量网格容器和单个商品卡片
    query.select('.goods-container').boundingClientRect();
    query.select('.goods-item').boundingClientRect();
    query.exec((res) => {
      if (!res || !res[0] || !res[1]) return;
      
      const container = res[0];
      const item = res[1];
      
      this.setData({
        containerTop: container.top,
        containerLeft: container.left,
        itemWidth: item.width,
        itemHeight: item.height
      });
      
      console.log('网格尺寸测量完成:', {
        containerTop: container.top,
        containerLeft: container.left,
        itemWidth: item.width,
        itemHeight: item.height
      });
    });
  },

  // 触摸开始
  onTouchStart: function(e) {
    const index = parseInt(e.currentTarget.dataset.index);
    const touch = e.touches[0];
    
    // 清掉之前的长按定时器
    if (this.data.longPressTimer) {
      clearTimeout(this.data.longPressTimer);
    }
    
    this.setData({
      touchStartIndex: index,
      dragPageX: touch.pageX,
      dragPageY: touch.pageY,
      draggingIndex: -1,
      placeholderIndex: -1,
      isDragging: false
    });
    
    // 200ms 长按后进入拖拽
    const timer = setTimeout(() => {
      if (this.data.touchStartIndex === index) {
        this.setData({
          draggingIndex: index,
          placeholderIndex: index,
          isDragging: true,
          disableScroll: true   // 拖拽时关掉滚动
        });
        wx.vibrateShort({ type: 'medium' });
      }
    }, 200);
    
    this.setData({ longPressTimer: timer });
  },

  // 触摸移动
  onTouchMove: function(e) {
    const touch = e.touches[0];
    const pageX = touch.pageX;
    const pageY = touch.pageY;
    
    // 如果正在拖拽，处理拖拽逻辑（滚动已通过 scroll-y 控制，不需要 stopPropagation）
    if (this.data.isDragging) {
      this.setData({
        dragPageX: pageX,
        dragPageY: pageY
      });
      // 根据坐标计算目标 index
      this._updatePlaceholderByPosition(pageX, pageY);
      return;
    }
    
    // 如果没有进入拖拽状态，检查是否应该取消长按（如果移动距离较大，可能是滚动）
    if (this.data.touchStartIndex !== -1) {
      const deltaX = Math.abs(pageX - this.data.dragPageX);
      const deltaY = Math.abs(pageY - this.data.dragPageY);
      const moveDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      // 如果移动距离超过 10px，可能是滚动，取消长按定时器
      if (moveDistance > 10) {
        if (this.data.longPressTimer) {
          clearTimeout(this.data.longPressTimer);
          this.setData({
            longPressTimer: null,
            touchStartIndex: -1
          });
        }
      }
    }
  },

  // 触摸结束
  onTouchEnd: function(e) {
    // 清定时器
    if (this.data.longPressTimer) {
      clearTimeout(this.data.longPressTimer);
      this.setData({ longPressTimer: null });
    }
    
    // 清除滚动查询定时器
    if (this._scrollQueryTimer) {
      clearTimeout(this._scrollQueryTimer);
      this._scrollQueryTimer = null;
    }
    
    // 非拖拽状态直接重置
    if (!this.data.isDragging) {
      this.setData({
        touchStartIndex: -1
      });
      return;
    }
    
    // 拖拽完成，重置状态
    this.setData({
      isDragging: false,
      draggingIndex: -1,
      placeholderIndex: -1,
      touchStartIndex: -1,
      disableScroll: false      // 恢复滚动
    });
  },

  // 根据坐标计算目标索引位置
  _updatePlaceholderByPosition: function(pageX, pageY) {
    const {
      containerTop,
      containerLeft,
      itemWidth,
      itemHeight,
      gridColumns,
      shelfGoodsList,
      draggingIndex
    } = this.data;
    
    if (!itemWidth || !itemHeight) return;
    
    // 使用节流减少滚动位置查询频率
    if (!this._scrollQueryTimer) {
      this._scrollQueryTimer = setTimeout(() => {
        const query = wx.createSelectorQuery();
        query.selectViewport().scrollOffset();
        query.exec((res) => {
          const scrollTop = res && res[0] ? res[0].scrollTop : 0;
          this._currentScrollTop = scrollTop;
          this._scrollQueryTimer = null;
          this._calculateTargetIndexByPosition(pageX, pageY, scrollTop);
        });
      }, 50);
    } else {
      // 如果正在查询，使用上次的滚动位置
      this._calculateTargetIndexByPosition(pageX, pageY, this._currentScrollTop || 0);
    }
  },
  
  // 根据坐标和滚动位置计算目标索引
  _calculateTargetIndexByPosition: function(pageX, pageY, scrollTop) {
    const {
      containerTop,
      containerLeft,
      itemWidth,
      itemHeight,
      gridColumns,
      shelfGoodsList,
      draggingIndex
    } = this.data;
    
    // 计算相对于容器的坐标
    const localX = pageX - containerLeft;
    const localY = pageY - containerTop + scrollTop;
    
    if (localX < 0 || localY < 0) return;
    
    // 计算行列
    let col = Math.floor(localX / itemWidth);
    let row = Math.floor(localY / itemHeight);
    
    // 边界检查
    if (col < 0) col = 0;
    if (col >= gridColumns) col = gridColumns - 1;
    if (row < 0) row = 0;
    
    // 计算目标索引
    let targetIndex = row * gridColumns + col;
    
    if (targetIndex >= shelfGoodsList.length) {
      targetIndex = shelfGoodsList.length - 1;
    }
    
    // 如果目标位置和当前占位符位置相同，或者和拖拽索引相同，不处理
    if (targetIndex === this.data.placeholderIndex || targetIndex === draggingIndex) {
      return;
    }
    
    // 实时移动元素，让出位置
    this._moveItem(draggingIndex, targetIndex);
  },

  // 移动商品到新位置（实时重排）
  _moveItem: function(fromIndex, toIndex) {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    
    const list = this.data.shelfGoodsList.slice();
    const item = list.splice(fromIndex, 1)[0];
    list.splice(toIndex, 0, item);
    
    // 重新编号
    for (let i = 0; i < list.length; i++) {
      list[i].nxDgsgSort = i + 1;
    }
    
    this.setData({
      shelfGoodsList: list,
      draggingIndex: toIndex,
      placeholderIndex: toIndex,
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



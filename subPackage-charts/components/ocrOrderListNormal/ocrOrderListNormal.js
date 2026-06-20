// components/ocrOrderList/ocrOrderList.js
Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 订单列表
    list: {
      type: Array,
      value: []
    },
    // 当前朗读索引（用于高亮）
    activeIndex: {
      type: Number,
      value: -1
    },
    // 是否朗读模式
    isReadingMode: {
      type: Boolean,
      value: false
    },
    // 是否正在播放
    isPlaying: {
      type: Boolean,
      value: false
    },
    // 停止时的订单索引
    stoppedIndex: {
      type: Number,
      value: -1
    },
    // 当前编辑的订单索引
    orderArrIndex: {
      type: Number,
      value: -1
    },
    // 刚刚修改的订单索引（淡蓝色背景提醒）
    recentlyModifiedOrderIndex: {
      type: Number,
      value: -1
    },
    // 配送商商品搜索结果
    strArr: {
      type: Array,
      value: []
    },
    // 系统商品搜索结果
    nxArr: {
      type: Array,
      value: []
    },
    // 窗口宽度（用于计算样式）
    windowWidth: {
      type: Number,
      value: 750
    },
    // 滚动到指定订单项（用于 scroll-into-view）
    scrollIntoViewId: {
      type: String,
      value: ''
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    lastSearchValue: '', // 上次搜索的值，用于避免重复搜索
    hasConfirmed: false // 是否已按确认键
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached: function() {
      console.log('[ocrOrderList组件] ========== attached 生命周期 ==========');
      console.log('[ocrOrderList组件] 组件已挂载！');
      console.log('[ocrOrderList组件] list 长度:', this.properties.list.length);
      console.log('[ocrOrderList组件] activeIndex:', this.properties.activeIndex);
      console.log('[ocrOrderList组件] isReadingMode:', this.properties.isReadingMode);
      console.log('[ocrOrderList组件] ========================================');
    }
  },

  observers: {
    
    'list, activeIndex, isReadingMode': function(list, activeIndex, isReadingMode) {
      console.log('[ocrOrderList组件] 属性变化:', { 
        listLength: list.length, 
        activeIndex, 
        isReadingMode 
      });
    },
    
    // 监听 scrollIntoViewId 变化，当需要滚动时查询订单项位置
    'scrollIntoViewId': function(scrollIntoViewId) {
      if (!scrollIntoViewId) {
        return;
      }
      
      console.log('[ocrOrderList组件] scrollIntoViewId 变化:', scrollIntoViewId);
      
      // 延迟一下确保 DOM 已更新
      setTimeout(() => {
        // 在组件内部查询订单项位置
        const query = wx.createSelectorQuery().in(this);
        query.select(`#${scrollIntoViewId}`).boundingClientRect((rect) => {
          if (!rect) {
            console.warn('[ocrOrderList组件] 未找到订单项:', scrollIntoViewId);
            return;
          }
          
          console.log('[ocrOrderList组件] 订单项位置:', rect);
          
          // 触发事件，通知父组件需要滚动的位置
          this.triggerEvent('scrollToItem', {
            itemId: scrollIntoViewId,
            top: rect.top,
            height: rect.height,
            left: rect.left,
            width: rect.width
          });
        }).exec();
      }, 100);
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 滚动到指定订单项
     * @param {String} itemId 订单项ID，格式：order-item-0
     */
    _scrollToItem: function(itemId) {
      console.log('[ocrOrderList组件] 准备滚动到:', itemId);
      
      // 提取订单索引
      const match = itemId.match(/order-item-(\d+)/);
      if (!match) {
        console.warn('[ocrOrderList组件] 无效的 itemId:', itemId);
        return;
      }
      
      const orderIndex = parseInt(match[1]);
      console.log('[ocrOrderList组件] 订单索引:', orderIndex);
      
      // 使用 createSelectorQuery 查询订单项的位置
      const query = wx.createSelectorQuery().in(this);
      
      // 查询订单项的位置
      query.select(`#${itemId}`).boundingClientRect((rect) => {
        if (!rect) {
          console.warn('[ocrOrderList组件] 未找到订单项:', itemId);
          return;
        }
        
        console.log('[ocrOrderList组件] 订单项位置:', rect);
        
        // 触发事件，通知父组件需要滚动的位置
        // 父组件会查询 scroll-view 的位置，然后计算需要滚动的距离
        this.triggerEvent('scrollToItem', {
          itemId: itemId,
          orderIndex: orderIndex,
          top: rect.top,
          height: rect.height
        });
      }).exec();
    },

    /**
     * 编辑订单（数量、规格、备注）
     */
    onEditOrder: function(e) {
      const { type, index } = e.currentTarget.dataset;
      const value = e.detail.value;
      console.log('[ocrOrderList组件] 编辑订单:', { type, index, value });
      this.triggerEvent('edit', {
        index: index,
        type: type,
        value: value
      });
    },

    /**
     * 编辑订单名称（只更新名称，不触发搜索）
     */
    onEditOrderName: function(e) {
      const { index } = e.currentTarget.dataset;
      const value = e.detail.value;
      console.log('[ocrOrderList组件] 编辑订单名称:', { index, value });
      // 只更新商品名称，不触发搜索
      this.triggerEvent('editName', {
        index: index,
        value: value
      });
    },

    /**
     * 确认搜索（键盘确认按钮触发）
     */
    onConfirmSearch: function(e) {
      const { index } = e.currentTarget.dataset;
      const value = e.detail.value || this.properties.list[index]?.nxDoGoodsName || '';
      console.log('[ocrOrderList组件] 确认搜索:', { index, value });
      if (value && value.trim().length > 0) {
        this.setData({
          hasConfirmed: true,
          lastSearchValue: value.trim()
        });
        this.triggerEvent('confirmSearch', {
          index: index,
          value: value.trim()
        });
      }
    },

    /**
     * 失焦搜索（输入框失焦时触发，仅在未确认且值有变化时搜索）
     */
    onBlurSearch: function(e) {
      const { index } = e.currentTarget.dataset;
      const value = e.detail.value || this.properties.list[index]?.nxDoGoodsName || '';
      const trimmedValue = value.trim();
      console.log('[ocrOrderList组件] 失焦搜索:', { index, value, hasConfirmed: this.data.hasConfirmed, lastSearchValue: this.data.lastSearchValue });
      
      // 如果已经确认过，或者值与上次搜索相同，不重复搜索
      if (this.data.hasConfirmed && this.data.lastSearchValue === trimmedValue) {
        console.log('[ocrOrderList组件] 已确认过或值未变化，跳过搜索');
        this.setData({
          hasConfirmed: false // 重置确认状态
        });
        return;
      }
      
      if (trimmedValue.length > 0) {
        this.setData({
          lastSearchValue: trimmedValue,
          hasConfirmed: false
        });
        this.triggerEvent('confirmSearch', {
          index: index,
          value: trimmedValue
        });
      }
    },

    /**
     * 聚焦订单输入框
     */
    onFocusOrderIndex: function(e) {
      const { index, type } = e.currentTarget.dataset;
      console.log('[ocrOrderList组件] 聚焦订单:', { index, type });
      // 重置确认状态，允许用户重新搜索
      this.setData({
        hasConfirmed: false
      });
      this.triggerEvent('focus', {
        index: index,
        type: type
      });
    },

    /**
     * 显示商品列表
     */
    onShowGoodsList: function(e) {
      const { index } = e.currentTarget.dataset;
      console.log('[ocrOrderList组件] 显示商品列表:', { index });
      this.triggerEvent('showGoods', {
        index: index
      });
    },

    /**
     * 关闭商品列表
     */
    onCloseShowGoods: function(e) {
      const { index } = e.currentTarget.dataset;
      console.log('[ocrOrderList组件] 关闭商品列表:', { index });
      this.triggerEvent('closeGoods', {
        index: index
      });
    },

    /**r
     * 保存订单（选择商品）
     */
    onSaveOrder: function(e) {
      const { id, index, name, item } = e.currentTarget.dataset;
      console.log('[ocrOrderList组件] 保存订单:', { id, index, name });
      this.triggerEvent('saveOrder', {
        index: index,
        goodsId: id,
        name: name,
        item: item,
      });
    },

    /**
     * 下载商品
     */
    onDownloadGoods: function(e) {
      const { index, item } = e.currentTarget.dataset;
      console.log('[ocrOrderList组件] 下载商品:', { index, item });
      this.triggerEvent('downloadGoods', {
        index: index,
        goods: item
      });
    },

    /**
     * 显示操作菜单
     */
    onShowPasteOperation: function(e) {
      const { index } = e.currentTarget.dataset;
      console.log('[ocrOrderList组件] 显示操作菜单:', { index });
      this.triggerEvent('showOperation', {
        index: index
      });
    }
  }
})


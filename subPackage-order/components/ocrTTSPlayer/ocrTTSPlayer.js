// 强制立即执行，确保日志输出
// (function() {
//   console.log('[ocrTTSPlayer组件] ========== 组件文件开始加载 ==========');
//   console.log('[ocrTTSPlayer组件] 文件路径: components/ocrTTSPlayer/ocrTTSPlayer.js');
//   console.log('[ocrTTSPlayer组件] 当前时间:', new Date().toISOString());
// })();

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 是否正在播放
    isPlaying: {
      type: Boolean,
      value: false
    },
    // 是否正在加载
    isLoading: {
      type: Boolean,
      value: false
    },
    // 是否已暂停（stoppedIndex >= 0）
    isPaused: {
      type: Boolean,
      value: false
    },
    
    // 当前朗读的文本
    currentText: {
      type: String,
      value: ''
    },
    // 当前播放索引
    currentIndex: {
      type: Number,
      value: -1
    },
    // 总数量
    totalCount: {
      type: Number,
      value: 0
    },
    // 错误信息
    error: {
      type: String,
      value: ''
    },
    // 订单数量（用于禁用播放按钮）
    orderCount: {
      type: Number,
      value: 0
    },
    // 是否在朗读模式
    isReadingMode: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    buttonX: 0, // 按钮X坐标
    buttonY: 0, // 按钮Y坐标
    isDragging: false, // 是否正在拖拽
    isHidden: false, // 是否隐藏
    startX: 0, // 触摸开始X坐标
    startY: 0, // 触摸开始Y坐标
    initialX: 0, // 初始X坐标
    initialY: 0, // 初始Y坐标
    windowWidth: 375, // 屏幕宽度（rpx）
    windowHeight: 667, // 屏幕高度（rpx）
    buttonSize: 80, // 按钮大小（rpx）
    playButtonHidden: false // 启动按钮是否隐藏
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached: function() {
      console.log('[ocrTTSPlayer组件] ========== attached 生命周期 ==========');
      console.log('[ocrTTSPlayer组件] 组件已挂载！');
      console.log('[ocrTTSPlayer组件] isPlaying:', this.properties.isPlaying);
      console.log('[ocrTTSPlayer组件] isLoading:', this.properties.isLoading);
      console.log('[ocrTTSPlayer组件] isPaused:', this.properties.isPaused);
      console.log('[ocrTTSPlayer组件] ========================================');
      
      // 获取屏幕尺寸
      const app = getApp();
      const globalData = app.globalData;
      const windowWidth = globalData.windowWidth * globalData.rpxR;
      const windowHeight = globalData.windowHeight * globalData.rpxR;
      
      // 从本地存储恢复按钮位置
      const savedPosition = wx.getStorageSync('ttsPlayerButtonPosition');
      let buttonX = windowWidth - 100; // 默认右侧位置（距离右边100rpx）
      let buttonY = windowHeight - 200; // 默认底部位置（距离底部200rpx）
      let isHidden = false;
      
      if (savedPosition) {
        // 如果之前被隐藏了，重置为默认位置并显示
        if (savedPosition.isHidden) {
          buttonX = windowWidth - 100;
          buttonY = windowHeight - 200;
          isHidden = false;
          // 清除隐藏状态
          // wx.setStorageSync('ttsPlayerButtonPosition', {
          //   x: buttonX,
          //   y: buttonY,
          //   isHidden: false
          // });
        } else {
          // 如果之前没有隐藏，恢复之前的位置
          buttonX = savedPosition.x || buttonX;
          buttonY = savedPosition.y || buttonY;
          isHidden = false;
        }
      }
      
      // 从本地存储恢复启动按钮的隐藏状态
      const savedPlayButtonHidden = wx.getStorageSync('ttsPlayButtonHidden');
      const playButtonHidden = savedPlayButtonHidden === true;
      
      console.log('[ocrTTSPlayer组件] 初始化按钮位置:');
      console.log('[ocrTTSPlayer组件] windowWidth:', windowWidth, 'windowHeight:', windowHeight);
      console.log('[ocrTTSPlayer组件] buttonX:', buttonX, 'buttonY:', buttonY);
      console.log('[ocrTTSPlayer组件] isHidden:', isHidden);
      console.log('[ocrTTSPlayer组件] rpxRatio:', globalData.rpxR);
      
      this.setData({
        windowWidth: windowWidth,
        windowHeight: windowHeight,
        buttonX: buttonX,
        buttonY: buttonY,
        isHidden: isHidden,
        rpxRatio: globalData.rpxR,
        playButtonHidden: playButtonHidden
      });
      
      console.log('[ocrTTSPlayer组件] setData 完成后的数据:', this.data);
    }
  },

  observers: {
    'isPlaying, isLoading, isPaused': function(isPlaying, isLoading, isPaused) {
      console.log('[ocrTTSPlayer组件] 状态变化:', { isPlaying, isLoading, isPaused });
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 播放按钮点击
     */
    onPlay: function() {
      console.log('[ocrTTSPlayer组件] 点击播放按钮');
      this.triggerEvent('play');
    },

    /**
     * 暂停按钮点击
     */
    onPause: function() {
      console.log('[ocrTTSPlayer组件] 点击暂停按钮');
      this.triggerEvent('pause');
    },

    /**
     * 继续按钮点击
     */
    onContinue: function() {
      console.log('[ocrTTSPlayer组件] 点击继续按钮');
      this.triggerEvent('continue');
    },

    /**
     * 重头开始按钮点击
     */
    onRestart: function() {
      console.log('[ocrTTSPlayer组件] 点击重头开始按钮');
      this.triggerEvent('restart');
    },

    onColse: function(){
      this.triggerEvent('close');
    },

    /**
     * 触摸开始
     */
    onTouchStart: function(e) {
      console.log('[拖拽] ========== onTouchStart ==========');
      console.log('[拖拽] touches:', e.touches);
      const touch = e.touches[0];
      console.log('[拖拽] touch.clientX:', touch.clientX, 'touch.clientY:', touch.clientY);
      console.log('[拖拽] 当前按钮位置 buttonX:', this.data.buttonX, 'buttonY:', this.data.buttonY);
      
      this.setData({
        isDragging: false,
        startX: touch.clientX,
        startY: touch.clientY,
        initialX: this.data.buttonX,
        initialY: this.data.buttonY
      });
      
      console.log('[拖拽] 设置初始位置 initialX:', this.data.initialX, 'initialY:', this.data.initialY);
    },

    /**
     * 触摸移动
     */
    onTouchMove: function(e) {
      console.log('[拖拽] ========== onTouchMove ==========');
      const touch = e.touches[0];
      const deltaX = touch.clientX - this.data.startX;
      const deltaY = touch.clientY - this.data.startY;
      
      console.log('[拖拽] touch.clientX:', touch.clientX, 'touch.clientY:', touch.clientY);
      console.log('[拖拽] deltaX:', deltaX, 'deltaY:', deltaY);
      
      // 将px转换为rpx
      const rpxRatio = this.data.rpxRatio || (750 / wx.getSystemInfoSync().windowWidth);
      const deltaXRpx = deltaX * rpxRatio;
      const deltaYRpx = deltaY * rpxRatio;
      
      console.log('[拖拽] rpxRatio:', rpxRatio);
      console.log('[拖拽] deltaXRpx:', deltaXRpx, 'deltaYRpx:', deltaYRpx);
      
      // 如果移动距离超过10rpx，认为是拖拽
      const moveDistance = Math.sqrt(deltaXRpx * deltaXRpx + deltaYRpx * deltaYRpx);
      console.log('[拖拽] moveDistance:', moveDistance);
      console.log('[拖拽] isDragging:', this.data.isDragging);
      
      if (moveDistance > 10) {
        console.log('[拖拽] 设置 isDragging = true');
        this.setData({
          isDragging: true
        });
      }
      
      if (this.data.isDragging || moveDistance > 10) {
        // 计算新位置
        const newX = this.data.initialX + deltaXRpx;
        const newY = this.data.initialY + deltaYRpx;
        
        console.log('[拖拽] 计算新位置 newX:', newX, 'newY:', newY);
        
        // 检测是否超出屏幕
        const isOutOfScreen = this.checkIfOutOfScreen(newX, newY);
        console.log('[拖拽] isOutOfScreen:', isOutOfScreen);
        
        this.setData({
          buttonX: newX,
          buttonY: newY,
          isHidden: isOutOfScreen
        });
        
        console.log('[拖拽] setData 完成，新位置 buttonX:', newX, 'buttonY:', newY);
      }
    },

    /**
     * 触摸结束
     */
    onTouchEnd: function(e) {
      console.log('[拖拽] ========== onTouchEnd ==========');
      console.log('[拖拽] isDragging:', this.data.isDragging);
      console.log('[拖拽] 最终位置 buttonX:', this.data.buttonX, 'buttonY:', this.data.buttonY);
      console.log('[拖拽] isHidden:', this.data.isHidden);
      
      const wasDragging = this.data.isDragging;
      
      this.setData({
        isDragging: false
      });
      
      if (wasDragging) {
        // 保存位置到本地存储
        const position = {
          x: this.data.buttonX,
          y: this.data.buttonY,
          isHidden: this.data.isHidden
        };
        console.log('[拖拽] 保存位置到本地存储:', position);
        // wx.setStorageSync('ttsPlayerButtonPosition', position);
      } else {
        // 如果没有拖拽，触发点击事件
        console.log('[拖拽] 没有拖拽，触发点击事件');
        this.onPlay();
      }
    },

    /**
     * 检测按钮是否超出屏幕
     */
    checkIfOutOfScreen: function(x, y) {
      const buttonSize = this.data.buttonSize;
      const windowWidth = this.data.windowWidth;
      const windowHeight = this.data.windowHeight;
      
      // 检测是否完全超出屏幕边界
      const isOutLeft = x + buttonSize < 0;
      const isOutRight = x > windowWidth;
      const isOutTop = y + buttonSize < 0;
      const isOutBottom = y > windowHeight;
      
      return isOutLeft || isOutRight || isOutTop || isOutBottom;
    },

    /**
     * 启动按钮触摸开始
     */
    onPlayButtonTouchStart: function(e) {
      console.log('[启动按钮拖拽] ========== onPlayButtonTouchStart ==========');
      const touch = e.touches[0];
      console.log('[启动按钮拖拽] touch.clientX:', touch.clientX, 'touch.clientY:', touch.clientY);
      
      this.setData({
        isDragging: false,
        startX: touch.clientX,
        startY: touch.clientY,
        initialX: 0, // 启动按钮在控制栏中的相对位置
        initialY: 0
      });
    },

    /**
     * 启动按钮触摸移动
     */
    onPlayButtonTouchMove: function(e) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - this.data.startX;
      const deltaY = touch.clientY - this.data.startY;
      
      // 将px转换为rpx
      const rpxRatio = this.data.rpxRatio || (750 / wx.getSystemInfoSync().windowWidth);
      const deltaXRpx = deltaX * rpxRatio;
      const deltaYRpx = deltaY * rpxRatio;
      
      // 如果移动距离超过10rpx，认为是拖拽
      const moveDistance = Math.sqrt(deltaXRpx * deltaXRpx + deltaYRpx * deltaYRpx);
      
      if (moveDistance > 10) {
        this.setData({
          isDragging: true
        });
      }
      
      if (this.data.isDragging || moveDistance > 10) {
        // 获取按钮在屏幕中的位置
        const query = this.createSelectorQuery();
        query.select('.play-control-right').boundingClientRect((rect) => {
          if (rect) {
            const rpxRatio = this.data.rpxRatio || (750 / wx.getSystemInfoSync().windowWidth);
            const buttonX = rect.left * rpxRatio;
            const buttonY = rect.top * rpxRatio;
            const buttonWidth = rect.width * rpxRatio;
            const buttonHeight = rect.height * rpxRatio;
            
            // 计算拖拽后的新位置（按钮左上角）
            const newX = buttonX + deltaXRpx;
            const newY = buttonY + deltaYRpx;
            
            console.log('[启动按钮拖拽] 按钮位置 buttonX:', buttonX, 'buttonY:', buttonY);
            console.log('[启动按钮拖拽] 按钮尺寸 width:', buttonWidth, 'height:', buttonHeight);
            console.log('[启动按钮拖拽] 拖拽距离 deltaXRpx:', deltaXRpx, 'deltaYRpx:', deltaYRpx);
            console.log('[启动按钮拖拽] 新位置 newX:', newX, 'newY:', newY);
            console.log('[启动按钮拖拽] 屏幕尺寸 windowWidth:', this.data.windowWidth, 'windowHeight:', this.data.windowHeight);
            
            // 检测是否超出屏幕（按钮完全超出屏幕边界）
            const isOutLeft = newX + buttonWidth < 0;
            const isOutRight = newX > this.data.windowWidth;
            const isOutTop = newY + buttonHeight < 0;
            const isOutBottom = newY > this.data.windowHeight;
            
            // 或者检测拖拽距离：向右拖拽超过100rpx就隐藏
            const dragRight = deltaXRpx > 100;
            const dragDown = deltaYRpx > 100;
            const dragOut = dragRight || dragDown;
            
            const isOutOfScreen = isOutLeft || isOutRight || isOutTop || isOutBottom || dragOut;
            
            console.log('[启动按钮拖拽] 边界检测 isOutLeft:', isOutLeft, 'isOutRight:', isOutRight, 'isOutTop:', isOutTop, 'isOutBottom:', isOutBottom);
            console.log('[启动按钮拖拽] 拖拽检测 dragRight:', dragRight, 'dragDown:', dragDown, 'dragOut:', dragOut);
            console.log('[启动按钮拖拽] isOutOfScreen:', isOutOfScreen);
            
            if (isOutOfScreen) {
              console.log('[启动按钮拖拽] 设置 playButtonHidden = true');
              this.setData({
                playButtonHidden: true
              });
            }
          } else {
            console.log('[启动按钮拖拽] 未找到按钮元素');
          }
        }).exec();
      }
    },

    /**
     * 启动按钮触摸结束
     */
    onPlayButtonTouchEnd: function(e) {
      console.log('[启动按钮拖拽] ========== onPlayButtonTouchEnd ==========');
      console.log('[启动按钮拖拽] isDragging:', this.data.isDragging);
      console.log('[启动按钮拖拽] playButtonHidden:', this.data.playButtonHidden);
      
      const wasDragging = this.data.isDragging;
      
      this.setData({
        isDragging: false
      });
      
      if (wasDragging) {
        // 保存隐藏状态到本地存储
        console.log('[启动按钮拖拽] 保存隐藏状态:', this.data.playButtonHidden);
        wx.setStorageSync('ttsPlayButtonHidden', this.data.playButtonHidden);
      } else {
        // 如果没有拖拽，触发点击事件
        console.log('[启动按钮拖拽] 没有拖拽，触发点击事件');
        this.onPlay();
      }
    }
  }
})


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
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    
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
    }
  }
})


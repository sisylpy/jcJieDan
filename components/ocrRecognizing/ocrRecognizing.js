// 强制立即执行，确保日志输出
(function() {
  console.log('[ocrRecognizing组件] ========== 组件文件开始加载 ==========');
  console.log('[ocrRecognizing组件] 文件路径: components/ocrRecognizing/ocrRecognizing.js');
  console.log('[ocrRecognizing组件] 当前时间:', new Date().toISOString());
})();

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 识别进度（0-100）
    progress: {
      type: Number,
      value: 0
    },
    // 图片列表（用于显示识别状态）
    imageList: {
      type: Array,
      value: []
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
      console.log('[ocrRecognizing组件] ========== attached 生命周期 ==========');
      console.log('[ocrRecognizing组件] 组件已挂载！');
      console.log('[ocrRecognizing组件] progress:', this.properties.progress);
      console.log('[ocrRecognizing组件] imageList:', this.properties.imageList);
      console.log('[ocrRecognizing组件] ========================================');
    }
  },

  observers: {
    'progress': function(progress) {
      console.log('[ocrRecognizing组件] progress 变化:', progress);
    },
    'imageList': function(imageList) {
      console.log('[ocrRecognizing组件] imageList 变化:', imageList);
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    
  }
})


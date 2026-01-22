console.log('[testUpload组件] ========== 组件文件开始加载 ==========');

Component({
  /**
   * 组件的属性列表
   */
  properties: {
  },

  /**
   * 组件的初始数据
   */
  data: {
    currentTime: ''
  },

  /**
   * 组件生命周期
   */
  attached: function() {
    console.log('[testUpload组件] ========== attached 生命周期 ==========');
    const now = new Date();
    this.setData({
      currentTime: now.toLocaleTimeString()
    });
    console.log('[testUpload组件] 组件已附加到页面');
    console.log('[testUpload组件] ========================================');
  },

  /**
   * 组件的方法列表
   */
  methods: {
  }
})


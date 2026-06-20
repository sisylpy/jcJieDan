Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 图片URL列表
    imageUrls: {
      type: Array,
      value: []
    },
    // 当前显示的图片索引
    currentIndex: {
      type: Number,
      value: 0
    },
    // 是否显示预览
    show: {
      type: Boolean,
      value: false
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    currentImage: ''
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 阻止事件冒泡
     */
    stopPropagation: function() {
      // 空函数，用于阻止事件冒泡
    },

    /**
     * 阻止默认行为
     */
    preventDefault: function() {
      return false;
    },

    /**
     * 关闭预览
     */
    closePreview: function() {
      this.triggerEvent('close');
    },

  /**
   * 上一张图片
   */
  prevImage: function() {
    const currentIndex = this.properties.currentIndex;
    if (currentIndex > 0) {
      this.triggerEvent('change', {
        index: currentIndex - 1
      });
    }
  },

  /**
   * 下一张图片
   */
  nextImage: function() {
    const currentIndex = this.properties.currentIndex;
    const imageUrls = this.properties.imageUrls;
    if (currentIndex < imageUrls.length - 1) {
      this.triggerEvent('change', {
        index: currentIndex + 1
      });
    }
  },

    /**
     * 图片加载成功
     */
    onImageLoad: function(e) {
      console.log('[imagePreviewModal] 图片加载成功:', e.detail);
    },

    /**
     * 图片加载失败
     */
    onImageError: function(e) {
      console.error('[imagePreviewModal] 图片加载失败:', e.detail);
      console.error('[imagePreviewModal] 当前图片URL:', this.data.currentImage);
      wx.showToast({
        title: '图片加载失败',
        icon: 'none',
        duration: 2000
      });
    }
  },

  /**
   * 组件生命周期
   */
  observers: {
    'show, currentIndex, imageUrls': function(show, currentIndex, imageUrls) {
      console.log('[imagePreviewModal] observers 触发:', { show, currentIndex, imageUrls, imageUrlsLength: imageUrls ? imageUrls.length : 0 });
      if (show && imageUrls && imageUrls.length > 0) {
        // 确保索引有效
        const index = (currentIndex >= 0 && currentIndex < imageUrls.length) ? currentIndex : 0;
        const imageUrl = imageUrls[index];
        console.log('[imagePreviewModal] 设置图片:', { index, imageUrl });
        if (imageUrl) {
          this.setData({
            currentImage: imageUrl
          });
        }
      } else if (!show) {
        // 关闭预览时清空图片
        this.setData({
          currentImage: ''
        });
      }
    }
  },

  /**
   * 组件生命周期
   */
  attached: function() {
    console.log('[imagePreviewModal] 组件已挂载');
    // 初始化时也设置一次图片
    const { show, currentIndex, imageUrls } = this.properties;
    if (show && imageUrls && imageUrls.length > 0) {
      const index = (currentIndex >= 0 && currentIndex < imageUrls.length) ? currentIndex : 0;
      const imageUrl = imageUrls[index];
      if (imageUrl) {
        this.setData({
          currentImage: imageUrl
        });
      }
    }
  }
});

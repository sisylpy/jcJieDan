// 强制立即执行，确保日志输出
// (function() {
//   console.log('[ocrImagePreview组件] ========== 组件文件开始加载 ==========');
//   console.log('[ocrImagePreview组件] 文件路径: components/ocrImagePreview/ocrImagePreview.js');
//   console.log('[ocrImagePreview组件] 当前时间:', new Date().toISOString());
// })();

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 图片路径
    imagePath: {
      type: String,
      value: ''
    },
    // 图片索引（用于多图片场景）
    imageIndex: {
      type: Number,
      value: 0
    },
    // 初始变换状态（可选，如果不提供则自动计算）
    initialTransform: {
      type: Object,
      value: null
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    // 图片变换状态
    // 注意：由于 movable-area 使用了 -100vw/-100vh 偏移，
    // 屏幕左上角在 movable-area 坐标系中是 (windowWidth, windowHeight)
    // 所以默认值设置为一个较大的值，确保在可视区域内
    imageTransform: {
      scale: 1,
      x: 390, // 默认值：屏幕起点（假设 windowWidth = 390）
      y: 844, // 默认值：屏幕起点（假设 windowHeight = 844）
      width: 390,
      height: 844
    },
    // 标记是否已经初始化完成（用于防止 initialTransform 的 observer 覆盖用户操作）
    _isInitialized: false
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached: function() {
      // 如果有初始变换状态，使用它
      if (this.properties.initialTransform && typeof this.properties.initialTransform === 'object') {
        console.log('[ocrImagePreview组件] 使用提供的 initialTransform');
        this.setData({
          imageTransform: this.properties.initialTransform,
          _isInitialized: true // 标记已初始化
        });
      } else {
        // 没有 initialTransform 时，使用默认值
        // 注意：图片加载时会通过 initImageTransform 重新计算正确位置
        this.setData({
          _isInitialized: true // 标记已初始化
        });
      }
    }
  },
  
  // 兼容旧版本的 attached（如果 lifetimes 不支持）
  attached: function() {
    // 如果有初始变换状态，使用它
    if (this.properties.initialTransform && typeof this.properties.initialTransform === 'object') {
      this.setData({
        imageTransform: this.properties.initialTransform,
        _isInitialized: true // 标记已初始化
      });
    } else {
      // 没有 initialTransform 时，使用默认值
      // 注意：图片加载时会通过 initImageTransform 重新计算正确位置
      this.setData({
        _isInitialized: true // 标记已初始化
      });
    }
  },

  observers: {
    'imagePath': function(imagePath) {
      console.log('[ocrImagePreview组件] ========== imagePath 变化 ==========');
      console.log('[ocrImagePreview组件] imagePath:', imagePath);
      console.log('[ocrImagePreview组件] imagePath 类型:', typeof imagePath);
      console.log('[ocrImagePreview组件] imagePath 是否为空:', !imagePath);
      console.log('[ocrImagePreview组件] ====================================');
    },
    'initialTransform': function(initialTransform) {
      console.log('[ocrImagePreview组件] ========== initialTransform 变化 ==========');
      console.log('[ocrImagePreview组件] initialTransform:', initialTransform);
      console.log('[ocrImagePreview组件] initialTransform 类型:', typeof initialTransform);
      console.log('[ocrImagePreview组件] initialTransform 是否为对象:', typeof initialTransform === 'object');
      console.log('[ocrImagePreview组件] _isInitialized:', this.data._isInitialized);
      
      // ⚠️ 关键修复：只在组件未初始化时使用 initialTransform
      // 一旦组件初始化完成，用户的操作（缩放、拖动）不应该被 initialTransform 覆盖
      // 这样可以避免反馈循环：用户操作 → transformChange → 主页面更新 imageTransformList → initialTransform 变化 → 覆盖用户操作
      if (!this.data._isInitialized && initialTransform && typeof initialTransform === 'object') {
        console.log('[ocrImagePreview组件] 组件未初始化，使用 initialTransform');
        this.setData({
          imageTransform: initialTransform,
          _isInitialized: true
        });
      } else {
        console.log('[ocrImagePreview组件] 组件已初始化，忽略 initialTransform 变化（避免覆盖用户操作）');
      }
      console.log('[ocrImagePreview组件] ====================================');
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 触发 transformChange 事件（通知主页面更新 imageTransformList）
     * @param {Object} transform - 变换状态对象（可选，默认使用 this.data.imageTransform）
     */
    _triggerTransformChange: function(transform) {
      const imageTransform = transform || this.data.imageTransform;
      if (!imageTransform) {
        console.warn('[ocrImagePreview组件] imageTransform 不存在，跳过触发 transformChange 事件');
        return;
      }

      console.log('[ocrImagePreview组件] 触发 transformChange 事件:', {
        imageIndex: this.properties.imageIndex,
        transform: imageTransform
      });

      this.triggerEvent('transformChange', {
        imageIndex: this.properties.imageIndex,
        transform: { ...imageTransform } // 复制对象，避免引用问题
      });
    },

    /**
     * 初始化图片变换状态（图片加载时调用）
     */
    initImageTransform: function(e) {
      console.log('[ocrImagePreview组件] ========== initImageTransform 开始 ==========');
      const imgPath = this.properties.imagePath;
      console.log('[ocrImagePreview组件] 图片路径:', imgPath);
      console.log('[ocrImagePreview组件] 图片路径类型:', typeof imgPath);
      console.log('[ocrImagePreview组件] 图片路径是否为空:', !imgPath);
      
      if (!imgPath) {
        console.error('[ocrImagePreview组件] ❌ 图片路径不存在，无法初始化');
        return;
      }

      const { windowWidth, windowHeight } = wx.getWindowInfo();
      console.log('[ocrImagePreview组件] 窗口信息:', { windowWidth, windowHeight });
      
      // 关键：因为 movable-area 偏移了 -100vw/-100vh，
      // 屏幕的左上角在 movable-area 坐标系中对应的位置其实是 (windowWidth, windowHeight)
      const screenStartX = windowWidth; 
      const screenStartY = windowHeight;
      console.log('[ocrImagePreview组件] 屏幕起点坐标（movable-area坐标系）:', { screenStartX, screenStartY });

      // ⚠️ 关键修复：获取组件的实际显示区域高度（而不是整个窗口高度）
      // 使用 setTimeout 确保组件已完全渲染
      setTimeout(() => {
        const query = wx.createSelectorQuery().in(this);
        query.select('.image-preview-container').boundingClientRect((rect) => {
          if (!rect || !rect.width || !rect.height) {
            console.warn('[ocrImagePreview组件] 无法获取组件尺寸，使用窗口高度作为后备');
            this._initImageTransformWithSize(imgPath, windowWidth, windowHeight, screenStartX, screenStartY);
            return;
          }

          // 获取组件的实际显示区域尺寸（px）
          const containerWidth = rect.width;
          const containerHeight = rect.height;
          console.log('[ocrImagePreview组件] 组件实际显示区域尺寸:', { containerWidth, containerHeight });

          // 使用组件的实际显示区域高度来计算位置
          this._initImageTransformWithSize(imgPath, containerWidth, containerHeight, screenStartX, screenStartY);
        }).exec();
      }, 50); // 50ms 延迟确保组件已渲染
    },

    /**
     * 使用指定的容器尺寸初始化图片变换状态
     * @param {String} imgPath 图片路径
     * @param {Number} containerWidth 容器宽度（px）
     * @param {Number} containerHeight 容器高度（px）
     * @param {Number} screenStartX movable-area 坐标系中的屏幕起点 X
     * @param {Number} screenStartY movable-area 坐标系中的屏幕起点 Y
     */
    _initImageTransformWithSize: function(imgPath, containerWidth, containerHeight, screenStartX, screenStartY) {
      console.log('[ocrImagePreview组件] 开始调用 wx.getImageInfo...');
      wx.getImageInfo({
        src: imgPath,
        success: (img) => {
          console.log('[ocrImagePreview组件] ✅ getImageInfo 成功');
          console.log('[ocrImagePreview组件] 图片信息:', {
            width: img.width,
            height: img.height,
            type: img.type
          });
          
          // 1. 计算图片比例（适应容器 90% 宽度）
          const displayWidth = containerWidth * 0.9;
          const scale = displayWidth / img.width;
          const displayHeight = img.height * scale;

          // 2. 计算居中位置
          // 逻辑：屏幕起点 + (容器宽度 - 图片宽度)/2
          const initialX = screenStartX + (containerWidth - displayWidth) / 2;
          // 垂直居中：如果图片高度小于容器高度，确保图片在容器中央
          // 如果图片高度大于容器高度，则从顶部开始显示
          let initialY;
          if (displayHeight <= containerHeight) {
            // 图片可以完全显示，垂直居中
            initialY = screenStartY + (containerHeight - displayHeight) / 2;
          } else {
            // 图片高度超过容器，从顶部开始显示（screenStartY 就是容器顶部）
            initialY = screenStartY;
          }

          const imageTransform = {
            scale: 1,
            x: Math.round(initialX),
            y: Math.round(initialY),
            width: Math.round(displayWidth),
            height: Math.round(displayHeight)
          };

          console.log('[ocrImagePreview组件] ✅ 图片初始化完成，设置的尺寸和位置:', imageTransform);
          console.log('[ocrImagePreview组件] 计算过程:', {
            screenStartX,
            screenStartY,
            containerWidth,
            containerHeight,
            displayWidth,
            displayHeight,
            initialX,
            initialY
          });
          console.log('[ocrImagePreview组件] 准备 setData...');

          this.setData({ imageTransform: imageTransform }, () => {
            console.log('[ocrImagePreview组件] ✅ setData 完成');
            console.log('[ocrImagePreview组件] 当前 imageTransform:', this.data.imageTransform);
            console.log('[ocrImagePreview组件] ========== initImageTransform 结束 ==========');
            // 通知主页面图片加载完成，更新 imageTransformList
            this._triggerTransformChange(imageTransform);
          });
        },
        fail: (err) => {
          console.error('[ocrImagePreview组件] ❌ getImageInfo 失败:', err);
          console.error('[ocrImagePreview组件] 错误详情:', JSON.stringify(err));
          
          // 兜底：直接显示在容器可见起点
          const defaultWidth = containerWidth * 0.9;
          const defaultHeight = Math.round(containerHeight * 0.6);
          
          const imageTransform = { 
            scale: 1,
            x: screenStartX + 10, // 容器起点 + 10px 偏移
            y: screenStartY + 10,
            width: defaultWidth,
            height: defaultHeight
          };
          
          console.log('[ocrImagePreview组件] 使用默认值（容器起点）:', imageTransform);
          this.setData({ imageTransform: imageTransform }, () => {
            // 通知主页面图片加载完成（使用默认值），更新 imageTransformList
            this._triggerTransformChange(imageTransform);
          });
          console.log('[ocrImagePreview组件] ========== initImageTransform 结束（使用默认值） ==========');
        }
      });
    },

    /**
     * 拖动事件（只更新内存，不 setData）
     */
    onImageMove: function(e) {
      const { x, y, source } = e.detail;

      // 过滤掉非用户操作（如果是 setData 导致的变化，source 会是空字符串）
      if (source !== 'touch' && source !== 'touch-out-of-bounds') return;

      // 只更新内存中的 x 和 y，不要 setData！
      // 让 movable-view 自己处理视觉上的移动
      const imageTransform = this.data.imageTransform;
      imageTransform.x = x;
      imageTransform.y = y;
      
      // 注意：这里不调用 setData，避免打断拖拽体验
      // 但是，为了在拖动结束时通知主页面，我们需要使用节流机制
      // 由于 bindchange 在拖动过程中会频繁触发，我们使用一个定时器来延迟触发事件
      if (this._moveEndTimer) {
        clearTimeout(this._moveEndTimer);
      }
      this._moveEndTimer = setTimeout(() => {
        // 拖动结束后，通知主页面更新 imageTransformList
        this._triggerTransformChange();
        this._moveEndTimer = null;
      }, 300); // 300ms 内没有新的拖动事件，认为拖动结束
    },

    /**
     * 双指缩放（修正版：避免反馈循环）
     */
    onImageScale: function(e) {
      const { scale, x, y } = e.detail;
      
      // ✅ 关键原则：bindscale 事件中绝对不要 setData 更新 scale-value、x、y
      // movable-view 的原生缩放已经处理了中心点缩放，我们只需要记录状态
      // 如果在缩放过程中 setData，会导致数据反馈死循环，图片会一直放大停不下来
      
      // 仅记录当前的原生状态到临时变量（不更新 imageTransform）
      if (!this._tempScaleState) this._tempScaleState = {};
      this._tempScaleState = {
        scale: scale,
        x: x,
        y: y
      };

      // 只打印日志，不执行任何 setData
      console.log('[ocrImagePreview组件] 缩放中，当前Scale:', scale.toFixed(3), '位置:', { x: x.toFixed(1), y: y.toFixed(1) });
      
      // 注意：左侧的 Slider 在缩放过程中不会实时更新
      // 这是为了避免死循环所做的必要牺牲
      // Slider 会在 onImageScaleEnd 时更新到正确位置
    },

    /**
     * 缩放结束（保存状态）
     */
    onImageScaleEnd: function(e) {
      const { scale, x, y } = e.detail;

      console.log('[ocrImagePreview组件] ========== 缩放结束 ==========');
      console.log('[ocrImagePreview组件] movable-view返回的最终值:', { scale, x, y });

      // ✅ 这是唯一需要 setData 的地方
      // movable-view 在松手时会自动校正位置，我们只需要信任它返回的 x, y, scale
      
      const imageTransform = this.data.imageTransform || {};
      const clampedScale = Math.max(0.5, Math.min(5, scale));
      
      // 保存当前 width 和 height（如果存在）
      const currentWidth = imageTransform.width || 390;
      const currentHeight = imageTransform.height || 844;

      const newTransform = {
        scale: clampedScale,
        x: x,
        y: y,
        width: currentWidth, // 保持原始宽度
        height: currentHeight // 保持原始高度
      };

      console.log('[ocrImagePreview组件] 保存的最终状态:', newTransform);

      // 清理临时状态
      if (this._tempScaleState) {
        delete this._tempScaleState;
      }
      if (this._pendingScaleUpdates) {
        delete this._pendingScaleUpdates;
      }
      if (this._scaleUpdateTimer) {
        clearTimeout(this._scaleUpdateTimer);
        this._scaleUpdateTimer = null;
      }

      // ✅ 执行一次 setData，确保逻辑层数据与视图层同步
      // 此时 Slider 会更新到正确位置
      this.setData({ imageTransform: newTransform }, () => {
        console.log('[ocrImagePreview组件] setData 完成');
        console.log('[ocrImagePreview组件] ========== 缩放结束处理完成 ==========');
        // 通知主页面缩放结束，更新 imageTransformList
        this._triggerTransformChange(newTransform);
      });
    },

    /**
     * 工具栏放大
     */
    zoomInImage: function() {
      const imageTransform = this.data.imageTransform || { scale: 1 };
      const newScale = Math.min(imageTransform.scale + 0.1, 5);
      
      console.log('[ocrImagePreview组件] 工具栏放大，scale:', newScale);

      const newTransform = {
        ...imageTransform,
        scale: newScale
      };

      this.setData({
        'imageTransform.scale': newScale
      }, () => {
        // 通知主页面工具栏缩放完成，更新 imageTransformList
        this._triggerTransformChange(newTransform);
      });
    },

    /**
     * 工具栏缩小
     */
    zoomOutImage: function() {
      const imageTransform = this.data.imageTransform || { scale: 1 };
      const newScale = Math.max(imageTransform.scale - 0.1, 0.5);
      
      console.log('[ocrImagePreview组件] 工具栏缩小，scale:', newScale);

      const newTransform = {
        ...imageTransform,
        scale: newScale
      };

      this.setData({
        'imageTransform.scale': newScale
      }, () => {
        // 通知主页面工具栏缩放完成，更新 imageTransformList
        this._triggerTransformChange(newTransform);
      });
    },

    /**
     * 重置图片变换
     */
    resetImageTransform: function() {
      const imageTransform = this.data.imageTransform || {};
      const width = imageTransform.width || 390;
      const height = imageTransform.height || 844;
      const { windowWidth, windowHeight } = wx.getWindowInfo();
      const CANVAS_SCALE = 3;
      
      // 重置到中心位置
      const initialX = (windowWidth * CANVAS_SCALE) / 2 - width / 2;
      const initialY = (windowHeight * CANVAS_SCALE) / 2 - height / 2;

      const newTransform = {
        scale: 1,
        x: Math.round(initialX),
        y: Math.round(initialY),
        width: width,
        height: height
      };

      console.log('[ocrImagePreview组件] 重置图片变换，scale 重置为 1');

      // 清理临时状态
      if (this._tempScaleState) {
        delete this._tempScaleState;
      }

      this.setData({ imageTransform: newTransform }, () => {
        // 通知主页面重置完成，更新 imageTransformList
        this._triggerTransformChange(newTransform);
      });
    },

    /**
     * 滑块缩放
     */
    onSliderChange: function(e) {
      const value = e.detail.value;
      const scale = value / 100;
      const clampedScale = Math.max(0.5, Math.min(5, scale));
      
      console.log('[ocrImagePreview组件] 滑块缩放，scale:', clampedScale);

      const imageTransform = this.data.imageTransform || {};
      const newTransform = {
        ...imageTransform,
        scale: clampedScale
      };

      this.setData({
        'imageTransform.scale': clampedScale
      }, () => {
        // 通知主页面滑块缩放完成，更新 imageTransformList
        this._triggerTransformChange(newTransform);
      });
    },

    /**
     * 图片加载错误处理
     */
    onImageError: function(e) {
      console.error('[ocrImagePreview组件] ========== 图片加载错误 ==========');
      console.error('[ocrImagePreview组件] 错误事件:', e);
      console.error('[ocrImagePreview组件] 当前 imagePath:', this.properties.imagePath);
      console.error('[ocrImagePreview组件] 当前 imageTransform:', this.data.imageTransform);
      console.error('[ocrImagePreview组件] ====================================');
      wx.showToast({
        title: '图片加载失败',
        icon: 'none',
        duration: 2000
      });
    }
  }
})


// 强制立即执行，确保日志输出
// (function() {
//   console.log('[ocrUpload组件] ========== 组件文件开始加载 ==========');
//   console.log('[ocrUpload组件] 文件路径: components/ocrUpload/ocrUpload.js');
//   console.log('[ocrUpload组件] 当前时间:', new Date().toISOString());
// })();

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 图片列表
    imageList: {
      type: Array,
      value: []
    },
    // Excel 文件
    excelFile: {
      type: Object,
      value: null
    },
    // 最大图片数量
    maxImageCount: {
      type: Number,
      value: 1
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
  // attached: function() {
  //   console.log('[ocrUpload组件] ========== attached 生命周期 ==========');
  //   console.log('[ocrUpload组件] imageList:', this.properties.imageList);
  //   console.log('[ocrUpload组件] excelFile:', this.properties.excelFile);
  //   console.log('[ocrUpload组件] maxImageCount:', this.properties.maxImageCount);
  //   console.log('[ocrUpload组件] ========================================');
  // },

  // observers: {
  //   'imageList, excelFile': function(imageList, excelFile) {
  //     console.log('[ocrUpload组件] ========== observers 触发 ==========');
  //     console.log('[ocrUpload组件] imageList 变化:', imageList);
  //     console.log('[ocrUpload组件] excelFile 变化:', excelFile);
  //     console.log('[ocrUpload组件] ====================================');
  //   }
  // },

  /**
   * 组件的方法列表
   */
  methods: {
  /**
   * 更新图片状态（提取公共逻辑）
   * @param {String} persistPath - 持久化后的文件路径
   */
  _updateImageState: function(persistPath) {
    console.log('[ocrUpload组件] 更新图片状态，持久化路径:', persistPath);
    
    // 只取第一张图片，替换原有图片
    const newImage = {
      path: persistPath, // ✅ 使用持久化路径
      id: Date.now(),
      status: 'pending' // pending: 待识别, recognizing: 识别中, success: 识别成功, error: 识别失败
    };

    // 隐藏 loading（在成功时）
      wx.hideLoading();

    // 通知父组件图片变化
    this.triggerEvent('imageChange', {
      imageList: [newImage]
    });
  },

  // 选择图片（只允许选择1张）
  // ✅ 使用 wx.chooseMedia（更现代的 API，路径兼容性更好）
  chooseImages: function () {
    const that = this;
    
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'], // 使用压缩图
      sourceType: ['album', 'camera'],
      success: (res) => {
          // console.log('[ocrUpload组件] ========== chooseMedia success ==========');
          // console.log('[ocrUpload组件] tempFiles:', res.tempFiles);
          // console.log('[ocrUpload组件] tempFiles 长度:', res.tempFiles ? res.tempFiles.length : 0);
        
        if (!res.tempFiles || res.tempFiles.length === 0) {
          wx.showToast({
            title: '未选择图片',
            icon: 'none'
          });
          return;
        }

        const tempFilePath = res.tempFiles[0].tempFilePath;
          // console.log('[ocrUpload组件] 临时文件路径:', tempFilePath);
          // console.log('[ocrUpload组件] 路径类型:', typeof tempFilePath);
        
        wx.showLoading({
          title: '处理中...',
          mask: true
        });

        const fs = wx.getFileSystemManager();
        const fileName = `ocr_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`;
        const targetPath = `${wx.env.USER_DATA_PATH}/${fileName}`;
        
          console.log('[ocrUpload组件] 目标路径:', targetPath);
          console.log('[ocrUpload组件] USER_DATA_PATH:', wx.env.USER_DATA_PATH);

        // ✅ 优先使用 saveFile（更简单，兼容性更好）
        fs.saveFile({
          tempFilePath: tempFilePath,
          filePath: targetPath,
          success: (saveRes) => {
              console.log('[ocrUpload组件] saveFile 成功');
              console.log('[ocrUpload组件] savedFilePath:', saveRes.savedFilePath);
            // saveFile 返回的 savedFilePath 可能和传入的 filePath 不同，使用返回的路径
            that._updateImageState(saveRes.savedFilePath || targetPath);
          },
          fail: (saveErr) => {
              console.error('[ocrUpload组件] saveFile 失败:', saveErr);
              console.error('[ocrUpload组件] 错误详情:', JSON.stringify(saveErr));
            
            // 兜底：如果 saveFile 失败，尝试 copyFile
              console.log('[ocrUpload组件] 尝试使用 copyFile 作为兜底方案...');
            fs.copyFile({
              srcPath: tempFilePath,
              destPath: targetPath,
              success: () => {
                  console.log('[ocrUpload组件] copyFile 成功（兜底方案）');
                that._updateImageState(targetPath);
              },
              fail: (copyErr) => {
                console.error('[ocrUpload组件] copyFile 也失败:', copyErr);
                console.error('[ocrUpload组件] copyFile 错误详情:', JSON.stringify(copyErr));
                wx.hideLoading();
                wx.showToast({
                  title: '图片处理失败，请重试',
                  icon: 'none',
                  duration: 2000
                });
              }
            });
          }
        });
      },
      fail: (err) => {
        console.error('[ocrUpload组件] chooseMedia 失败:', err);
        wx.hideLoading();
        // 用户取消选择时不显示错误提示
        if (err.errMsg && !err.errMsg.includes('cancel')) {
        wx.showToast({
          title: '选择图片失败',
            icon: 'none',
            duration: 2000
        });
        }
      }
    });
  },

  // 删除图片
  deleteImage: function (e) {
    const index = e.currentTarget.dataset.index;
      const imageList = [...this.properties.imageList];
    imageList.splice(index, 1);
    
      // 通知父组件图片变化
      this.triggerEvent('imageChange', {
        imageList: imageList
    });
  },

  // 预览图片
  previewImage: function (e) {
    const index = e.currentTarget.dataset.index;
      const urls = this.properties.imageList.map(item => item.path);
    wx.previewImage({
      current: urls[index],
      urls: urls
    });
  },

  // 选择 Excel 文件
  chooseExcelFile: function () {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xls', 'xlsx'],
      success: (res) => {
        if (res.tempFiles.length === 0) {
          return;
        }
        
        const file = res.tempFiles[0];
        const fileSizeKB = Math.round(file.size / 1024);
        
        // 验证文件类型
        const fileName = file.name || '';
        const fileExt = fileName.split('.').pop()?.toLowerCase();
        if (fileExt !== 'xls' && fileExt !== 'xlsx') {
          wx.showToast({
            title: '请选择 Excel 文件（.xls 或 .xlsx）',
            icon: 'none',
            duration: 2000
          });
          return;
        }
        
          const excelFile = {
            name: fileName,
            path: file.path,
            size: fileSizeKB
          };
          
          // 通知父组件 Excel 文件变化
          this.triggerEvent('excelChange', {
            excelFile: excelFile
        });
      },
      fail: (err) => {
          console.error('[ocrUpload组件] 选择 Excel 文件失败:', err);
        if (err.errMsg && !err.errMsg.includes('cancel')) {
          wx.showToast({
            title: '选择文件失败',
            icon: 'none',
            duration: 2000
          });
        }
      }
    });
  },

  // 删除 Excel 文件
  deleteExcelFile: function () {
      // 通知父组件 Excel 文件变化
      this.triggerEvent('excelChange', {
      excelFile: null
    });
  },

  // 开始图片识别
  startOCRRecognition: function () {
    // ⚠️ 防止重复点击：如果按钮被快速点击多次，只处理第一次
    if (this._isRecognizing) {
      console.warn('[ocrUpload组件] ⚠️ 识别已在进行中，忽略重复点击');
      return;
    }

    if (this.properties.imageList.length === 0) {
      wx.showToast({
        title: '请先选择图片',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 设置识别中标志
    this._isRecognizing = true;

    // 通知父组件开始识别
    this.triggerEvent('startOCR', {
      imageList: this.properties.imageList
    });

    // 2秒后重置标志（防止按钮被禁用太久）
    setTimeout(() => {
      this._isRecognizing = false;
    }, 2000);
  },

  // 开始 Excel 识别
  startExcelRecognition: function () {
    if (!this.properties.excelFile) {
      wx.showToast({
        title: '请先选择 Excel 文件',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 通知父组件开始识别
    this.triggerEvent('startExcel', {
      excelFile: this.properties.excelFile
    });
  }
  }
})

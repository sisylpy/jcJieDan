import load from '../../../../lib/load';
import {
 
  
  recognizeOrderAsync,
  recognizeOrderFast,
  recognizeOrderFromExcel,
 
} from '../../../../lib/apiDepOrder';

import {
  getDepInfo
} from '../../../../lib/apiDistributer';

import apiUrl from '../../../../config.js';
const globalData = getApp().globalData;
Page({
  data: {
    windowWidth: 0,
    windowHeight: 0,
    statusBarHeight: 0,
    navBarHeight: 0,
   
    url: '',
    // 图片相关
    imageList: [], // 已选择的图片列表
    maxImageCount: 1, // 最多选择1张图片
    taskImagePath: '', // 任务图片路径（服务器存储的图片）
    // 图片缩放和位置相关（每张图片独立的状态）
    imageTransformList: [], // [{scale}] 每张图片的变换状态（只存 scale，x/y 由 movable-view 自己管理）
    // Excel 相关
    excelFile: null, // 选择的 Excel 文件 {name, path, size}
    sourceType: null, // 订单来源类型：'image' 图片识别，'excel' Excel 识别
   
    // 任务相关
    taskArr: [], // 任务列表
    taskId: null, // 当前任务ID

    // 用于从 ocrOrder 返回时强制重新挂载 ocrUpload，避免顶部多余图片（从相册/相机返回不重挂，否则选图无反应）
    ocrUploadKey: 1,
    returnFromOcrOrder: false,
    
    // 用户信息
    userInfo: null,
    depInfo: null,
    depId: null,
    depFatherId: null,
    depName: null,
    disId: null,
    userId: -1,
    
  },

  onLoad: function (options) {
    const windowWidth = globalData.windowWidth * globalData.rpxR;
    const windowHeight = globalData.windowHeight * globalData.rpxR;
    const statusBarHeight = globalData.statusBarHeight * globalData.rpxR;
    const navBarHeight = globalData.navBarHeight * globalData.rpxR;
  
    this.setData({
      windowWidth: windowWidth,
      windowHeight: windowHeight,
      statusBarHeight: statusBarHeight,
      navBarHeight: navBarHeight,
      url: apiUrl.server,
    });
    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo');
    const depInfo = wx.getStorageSync('depInfo') || wx.getStorageSync('depItem');
    if (userInfo) {
      this.setData({
        userInfo,
        disId: userInfo.nxDiuDistributerId || null,
        userId: userInfo.nxDepartmentUserId || -1,
      });
    }
    if (depInfo) {
      this.setData({
        depInfo,
        depId: depInfo.nxDepartmentId || depInfo.depId || null,
        depFatherId: depInfo.nxDepartmentFatherId || depInfo.depFatherId || null,
        depName: depInfo.nxDepartmentName || depInfo.depName || 'OCR识别下单',
      });
    }
    // 从 options 获取部门信息（如果从其他页面跳转过来）
    if (options.depId) {
      // ⚠️ 解码 depName（因为跳转时使用了 encodeURIComponent 编码）
      let depName = options.depName || 'OCR识别下单';
      try {
        // 如果 depName 是 URL 编码的，解码它
        depName = decodeURIComponent(depName);
      } catch (e) {
        // 如果解码失败，使用原始值
      }
      this.setData({
        depId: options.depId,
        depFatherId: options.depFatherId,
        depName: depName,
      });
    }
   
  },

  onShow: function () {
    console.log('[ocrUpload页] onShow');
    this.setData({
          returnFromOcrOrder: false,
          taskArr: [],
          imageList: [],
          excelFile: null,
          imageTransformList: [],
          sourceType: null,
          ocrUploadKey: 0
        });
  },


  /**
   * 处理图片变化事件（来自 ocrUpload 组件）
   * 注意：这个方法必须在主页面中，因为它是组件事件的处理函数
   * 组件通过 triggerEvent('imageChange') 触发事件，主页面通过 bind:imageChange 绑定处理
   */

  onImageChange: function (e) {
    const {
      imageList
    } = e.detail;
    // ✅ 选择图片时，清除 Excel（二选一）
    if (imageList.length > 0 && this.data.excelFile) {
      this.setData({
        excelFile: null
      });
    }
    // 更新图片列表
    this.setData({
      imageList: imageList
    });
    // 初始化图片变换状态列表（ocrImagePreview 组件会在图片加载时自动计算正确的位置）
    // 注意：imageTransformList 是主页面管理的，用于保存用户操作后的状态
    // 初始时不设置 x、y，让组件根据实际显示区域自动计算
    if (imageList.length > 0) {
      const imageTransformList = imageList.map(() => ({
        scale: 1,
        // x、y 不设置，让组件在图片加载时自动计算正确位置
        width: 0, // 图片加载时会重新计算
        height: 0 // 图片加载时会重新计算
      }));
      this.setData({
        imageTransformList: imageTransformList
      });
    } else {
      // 清空图片时，也清空变换状态
      this.setData({
        imageTransformList: []
      });
    }
  },

  /**
   * 处理图片变换事件（来自 ocrImagePreview 组件）
   * 当图片缩放、拖动完成后，更新 imageTransformList
   */

  onImageTransformChange: function (e) {
    const {
      imageIndex,
      transform
    } = e.detail;
    const imageTransformList = [...(this.data.imageTransformList || [])];
    // 确保数组长度足够
    while (imageTransformList.length <= imageIndex) {
      imageTransformList.push({
        scale: 1,
        width: 0,
        height: 0
      });
    }
    // 更新对应索引的变换状态
    imageTransformList[imageIndex] = {
      ...transform
    };
    this.setData({
      imageTransformList: imageTransformList
    });
    // 可选：立即保存到缓存（如果需要实时保存）
    // this._saveToStorage();
  },

  /**
   * 处理 Excel 文件变化事件（来自 ocrUpload 组件）
   */

  onExcelChange: function (e) {
    const {
      excelFile
    } = e.detail;
    // ✅ 选择 Excel 时，清除图片（二选一）
    if (excelFile && this.data.imageList.length > 0) {
      this.setData({
        imageList: [],
        imageTransformList: []
      });
    }
    this.setData({
      excelFile: excelFile
    });
  },

  /**
   * 处理开始图片识别事件（来自 ocrUpload 组件）
   */

  onStartOCR: function (e) {
    const {
      imageList
    } = e.detail;
    // ⚠️ 防止重复调用：如果已经在识别中，忽略新的请求
    if (this.data.recognizing || this.data.currentStep === 'recognizing') {
      return;
    }
    // 调用原有的识别方法
    this.startOCRRecognition();
  },

  /**
   * 处理开始快速识别事件（来自 ocrUpload 组件）
   */
  onStartOCRFast: function (e) {
    const {
      imageList
    } = e.detail;
    // ⚠️ 防止重复调用：如果已经在识别中，忽略新的请求
    if (this.data.recognizing || this.data.currentStep === 'recognizing') {
      return;
    }
    // 调用快速识别方法
    this.startOCRRecognitionFast();
  },

  /**
   * 处理开始 Excel 识别事件（来自 ocrUpload 组件）
   */

  onStartExcel: function (e) {
    const {
      excelFile
    } = e.detail;
    // 调用原有的识别方法
    this.startExcelRecognition();
  },
  // ==================== 三、OCR 识别相关 ====================

  /**
   * 开始 Excel 识别（改造为任务队列模式）
   */

  startExcelRecognition: async function () {
    if (!this.data.excelFile) {
      wx.showToast({
        title: '请先选择 Excel 文件',
        icon: 'none'
      });
      return;
    }
    // 创建任务对象
    const taskInfo = {
      depId: this.data.depId,
      depName: this.data.depName,
      depFatherId: this.data.depFatherId,
      type: 'excel',
      excelFile: {
        ...this.data.excelFile
      } // 复制 Excel 文件信息
    };
    // 添加到任务队列（会生成任务ID）
    const taskId = this._addTaskToQueue(taskInfo);
    // 简化版：添加任务到缓存（使用相同的任务ID）
    if (taskId) {
      this._simpleAddTaskWithId(this.data.depId, 'excel', taskId);
    }
    if (!taskId) {
      // 任务添加失败（已有相同客户的任务）
      return;
    }
    // 如果当前没有运行的任务，立即显示识别界面
    if (this.data.recognizeTaskRunning.length === 0) {
      this.setData({
        recognizing: true,
        currentStep: 'recognizing',
        recognizeProgress: 0
      });
    }
    wx.showToast({
      title: '任务已加入队列',
      icon: 'success',
      duration: 1500
    });
    // 立即返回，不等待结果
    // 任务会在后台异步执行
  },

  /**
   * 调用 Excel 识别 API
   */

  /**
   * 调用 Excel 识别 API
   * @param {String} filePath - Excel 文件路径
   * @param {Object} taskInfo - 可选的任务信息，包含 depId, depFatherId 等（用于执行 pending 任务时传递正确的部门信息）
   */

  callExcelRecognitionAPI: function (filePath, taskInfo = null) {
    // ⚠️ 重要：优先使用任务信息中的 depId 和 depFatherId，避免使用当前页面的 depId（可能是已完成任务的部门）
    const depId = taskInfo?.depId || this.data.depId || '';
    const depFatherId = taskInfo?.depFatherId || this.data.depFatherId || '';
    return recognizeOrderFromExcel({
      filePath: filePath,
      depId: depId, // ✅ 使用任务信息中的 depId
      disId: this.data.disId || '',
      depFatherId: depFatherId, // ✅ 使用任务信息中的 depFatherId
      userId: this.data.userId || ''
    }).then(res => {
      const data = res.result;
      if (data.code === 0) {
        // 注意：不在接口返回时删除任务，而是在任务完成时删除（避免 this.data.depId 可能不是任务所属部门的问题）
        // 检查是否已经保存了订单
        if (Array.isArray(data.data) && data.data.length > 0) {
          // 后台已经保存了订单
          return {
            savedOrders: data.data,
            isSaved: true
          };
        }
        // 检查是否返回了订单数组（可能在 data.items 或 data.data.items）
        // 注意：接口返回的就是订单格式，不需要解析
        const items = data.items || (data.data && data.data.items);
        if (items && items.length > 0) {
          return {
            items: items, // 订单数组（已经是订单格式）
            parsedResult: data.parsedResult || (data.data && data.data.parsedResult)
          };
        }
        // 其他情况
        return {
          items: [],
          savedOrders: []
        };
      } else {
        const errorMsg = data.msg || data.message || '识别失败';
        throw new Error(errorMsg);
      }
    }).catch(err => {
      // 处理网络错误
      if (err.errMsg && err.errMsg.includes('404')) {
        throw new Error('Excel 识别接口未实现（404）。\n请后端开发人员实现接口: POST /api/ocr/recognizeOrderFromExcel');
      } else {
        throw new Error('Excel 识别服务暂时不可用，请稍后重试: ' + (err.errMsg || err.message || '网络错误'));
      }
    });
  },

  /**
   * 开始批量 OCR 识别（改造为任务队列模式）
   */

  startOCRRecognition: async function () {
    // ⚠️ 防止重复调用：如果已经在识别中，忽略新的请求
    if (this.data.recognizing || this.data.currentStep === 'recognizing') {
      wx.showToast({
        title: '识别正在进行中，请稍候',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    if (this.data.imageList.length === 0) {
      wx.showToast({
        title: '请先选择图片',
        icon: 'none'
      });
      return;
    }
    
    // 只处理第一张图片
    const image = this.data.imageList[0];
    
    // 显示识别界面
    this.setData({
      recognizing: true,
      currentStep: 'recognizing',
      recognizeProgress: 0,
      ocrResults: []
    });
    
    load.showLoading('正在识别中...');
    
    try {
      // 将图片转换为 Base64
      const base64 = await this.imageToBase64(image.path);
      
      // 调用异步接口上传图片
      await this.callTencentOCR(base64, {
        depId: this.data.depId,
        depFatherId: this.data.depFatherId
      });
      
      // 上传成功，直接修改页面状态
      load.hideLoading();
      this.setData({
        recognizing: false,
        currentStep: 'upload',
        orderArr: [],
        saveCount: null,
        sourceType: 'image',
        imageList: this.data.imageList || []
      });
      
      wx.showToast({
        title: '上传成功',
        icon: 'success'
      });
      
    } catch (error) {
      load.hideLoading();
      this.setData({
        recognizing: false,
        currentStep: 'upload'
      });
      wx.showToast({
        title: error.message || '上传失败',
        icon: 'none',
        duration: 3000
      });
    }
  },

  /**
   * 快速识别订单
   */
  startOCRRecognitionFast: async function () {
    // ⚠️ 防止重复调用：如果已经在识别中，忽略新的请求
    if (this.data.recognizing || this.data.currentStep === 'recognizing') {
      wx.showToast({
        title: '识别正在进行中，请稍候',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    if (this.data.imageList.length === 0) {
      wx.showToast({
        title: '请先选择图片',
        icon: 'none'
      });
      return;
    }

    // 验证必要参数
    if (!this.data.depId || !this.data.disId || !this.data.depFatherId || !this.data.userId) {
      wx.showToast({
        title: '缺少必要参数，请重新登录',
        icon: 'none',
        duration: 3000
      });
      return;
    }

    load.showLoading('单列图片识别中...');
    
    try {
      // 只处理第一张图片
      const image = this.data.imageList[0];
      
      // 将图片转换为 Base64
      const imageBase64 = await this.imageToBase64(image.path);
      
      // 调用快速识别接口，包含图片数据
      const res = await recognizeOrderFast({
        ImageBase64: imageBase64,
        depId: this.data.depId,
        disId: this.data.disId,
        depFatherId: this.data.depFatherId,
        userId: this.data.userId
      });

      const data = res.result;
      if (data && data.code === 0) {
        load.hideLoading();
        console.log("fastrre", res)
        // 上传成功，刷新任务列表
        this.setData({
          currentStep: 'upload',
          imageList: [],
          imageTransformList: [],
          returnFromOcrOrder: true
        });
        wx.navigateTo({
          url: '../ocrOrder/ocrOrder?taskId=' + res.result.taskId,
        });
      
      } else {
        throw new Error(data?.msg || data?.message || '快速识别失败');
      }
    }
     catch (error) {
      load.hideLoading();
      wx.showToast({
        title: error.message || '快速识别失败',
        icon: 'none',
        duration: 3000
      });
    }
  },


  /**
   * 将图片转换为 Base64
   */

  imageToBase64: function (filePath) {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath: filePath,
        encoding: 'base64',
        success: (res) => {
          resolve(res.data);
        },
        fail: (err) => {
          reject(err);
        }
      });
    });
  },


  /**
   * 调用腾讯云 OCR API
   * 优先尝试调用后端 API，如果后端没有提供，则尝试直接调用腾讯云（需要实现签名）
   * @param {String} imageBase64 - 图片的 Base64 编码
   * @param {Object} taskInfo - 可选的任务信息，包含 depId, depFatherId 等（用于执行 pending 任务时传递正确的部门信息）
   */

  callTencentOCR: async function (imageBase64, taskInfo = null) {
    // ⚠️ 重要：优先使用任务信息中的 depId 和 depFatherId，避免使用当前页面的 depId（可能是已完成任务的部门）
    const depId = taskInfo?.depId || this.data.depId;
    const depFatherId = taskInfo?.depFatherId || this.data.depFatherId;
    // 调用异步接口上传图片
    return recognizeOrderAsync({
      ImageBase64: imageBase64,
      Action: 'GeneralAccurateOCR', // OCR 接口名称
      Version: '2018-11-19', // OCR 接口版本
      depId: depId,
      disId: this.data.disId,
      depFatherId: depFatherId,
      userId: -1
    }).then(res => {
      const data = res.result;
      if (data && data.code === 0) {
        // 上传成功，返回成功标识
       wx.navigateBack({delta: 3})
      
        return { success: true };
      } else {
        const errorMsg = data?.msg || data?.message || '上传失败';
        throw new Error(errorMsg);
      }
    }).catch(err => {
      // 处理网络错误
      if (err.errMsg && err.errMsg.includes('404')) {
        throw new Error('后端 OCR 接口未实现（404）。\n请后端开发人员实现接口: POST /api/ocr/recognizeOrderAsync');
      } else {
        throw new Error('OCR 服务暂时不可用，请稍后重试: ' + (err.errMsg || err.message || '网络错误'));
      }
    });
  },


  toBack(){
    wx.navigateBack({delta :1});
  }


});

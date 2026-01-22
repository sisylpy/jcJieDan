import load from '../../../../lib/load';
import TTSHelper from '../../../../lib/ttsHelper';
import {
  choiceGoodsForApply,
  updateOrder,
  deleteOrder,
  recognizeOrder,
  recognizeOrderFromExcel,
  deleteBatchOrders,
  correctOrders,
  textToSpeech,
} from '../../../../lib/apiDepOrder';
import {
  disSaveStandard,
  queryDisGoodsByQuickSearchWithDepId,
  disDeleteStandard,
} from '../../../../lib/apiDistributer';
import {
  downDisGoods,
  disGetGoods,
} from '../../../../lib/apiibook';
import apiUrl from '../../../../config.js';
const config = require('../../../../config.js');
const globalData = getApp().globalData;
Page({
  data: {
    windowWidth: 0,
    windowHeight: 0,
    statusBarHeight: 0,
    navBarHeight: 0,
    safeAreaBottom: 0, // 安全区域底部高度（rpx）
    scrollViewHeight: 0, // 滚动区域高度（rpx）- 非朗读模式
    scrollViewHeightReading: 0, // 滚动区域高度（rpx）- 朗读模式（订单列表50%）
    url: '',
    // 图片相关
    imageList: [], // 已选择的图片列表
    maxImageCount: 1, // 最多选择1张图片
    // 图片缩放和位置相关（每张图片独立的状态）
    imageTransformList: [], // [{scale}] 每张图片的变换状态（只存 scale，x/y 由 movable-view 自己管理）
    // Excel 相关
    excelFile: null, // 选择的 Excel 文件 {name, path, size}
    sourceType: null, // 订单来源类型：'image' 图片识别，'excel' Excel 识别
    // OCR 识别相关
    recognizing: false, // 是否正在识别
    recognizeProgress: 0, // 识别进度
    ocrResults: [], // OCR 识别结果 [{imageIndex, text, detections}]
    // 订单相关
    orderArr: [], // 解析后的订单列表
    currentStep: 'upload', // upload: 上传, recognizing: 识别中, confirm: 确认, success: 成功
    saveCount: null, // 已保存订单数量，null 表示未保存状态
    // 商品搜索相关
    strArr: [], // 配送商商品搜索结果
    nxArr: [], // 系统商品搜索结果
    orderArrIndex: -1, // 当前正在编辑的订单索引
    searchStr: '', // 搜索关键词
    // 操作菜单相关
    showOperationPaste: false, // 是否显示操作菜单
    orderPasteIndex: -1, // 当前操作的订单索引
    orderItem: null, // 当前操作的订单项
    findGoods: false, // 从添加临时商品页面返回后，是否需要更新订单
    // 用户信息
    userInfo: null,
    depInfo: null,
    depId: null,
    depFatherId: null,
    depName: null,
    disId: null,
    userId: null,
    // 缓存相关
    ocrOrderDepList: null, // OCR订单缓存列表（按部门）
    ocrOrderDepIndex: -1, // 当前部门的缓存索引
    // 任务队列相关
    recognizeTaskQueue: [], // 识别任务队列
    recognizeTaskRunning: [], // 正在运行的任务列表（最多2个）
    recognizeTaskMap: {}, // 任务映射表 {taskId: taskInfo}
    _taskCompleteLock: false, // 任务完成处理锁，防止并发竞争
    // 简化版任务缓存（最简单的实现）
    simpleTaskList: [], // 简单的任务列表 [{taskId, depId, depFatherId, type, status}]
    simpleMaxConcurrent: 2, // 最大并发数（同时最多2个任务）
    // 编辑订单弹窗相关
    show: false, // 是否显示编辑订单弹窗
    editApply: false, // 是否为编辑模式
    applyItem: null, // 当前编辑的订单项
    applyNumber: '', // 编辑的数量
    applyStandardName: '', // 编辑的规格
    applyRemark: '', // 编辑的备注
    itemDis: null, // 配送商商品信息
    item: null, // 部门商品信息
    printStandard: '', // 打印规格
    priceLevel: '', // 价格等级
    applyGoodsName: '', // 商品名称
    applyGoodsId: '', // 商品ID
    newStandardName: '', // 新规格名称
    // 警告弹窗相关
    showPopupWarn: false, // 是否显示警告弹窗
    popupType: '', // 弹窗类型
    warnContent: '', // 警告内容
    disStandardId: '', // 规格ID
    // 订单修正弹窗相关
    showCorrectionModal: false, // 是否显示修正弹窗
    correctionDefaultText: '', // 修正弹窗默认文本
    // TTS 朗读相关
    isTTSReading: false, // 是否正在朗读（用于控制布局）
    isTTSPlaying: false, // 是否正在播放（播放锁）
    isTTSLoading: false, // 是否正在加载音频
    ttsQueue: [], // TTS 播放队列（存储文本）
    ttsAudioCache: {}, // TTS 音频缓存（index -> audioUrl）
    currentTTSIndex: -1, // 当前播放的订单索引
    stoppedIndex: -1, // 停止时的订单索引（-1 表示未停止）
    stoppedOrderRef: null, // 停止时的订单引用
    ttsSessionId: '', // TTS 会话 ID
    ttsAudio: null, // 全局 audio 实例
    ttsError: '', // TTS 错误信息
    currentReadingText: '', // 当前朗读的文本内容
    scrollIntoViewId: '', // 当前要滚动到的订单项ID（用于scroll-into-view）
    _ttsRequestingIndex: -1, // 正在请求的音频索引（防止重复请求）
    scrollTop: 0, // scroll-view 的滚动位置（用于手动控制滚动，单位：px）
  },

  // 任务检查定时器ID
  taskCheckTimer: null,

  onLoad: function (options) {
    const windowWidth = globalData.windowWidth * globalData.rpxR;
    const windowHeight = globalData.windowHeight * globalData.rpxR;
    const statusBarHeight = globalData.statusBarHeight * globalData.rpxR;
    const navBarHeight = globalData.navBarHeight * globalData.rpxR;
    // 获取系统信息，用于计算安全区域
    const systemInfo = wx.getSystemInfoSync();
    const safeAreaBottom = systemInfo.safeArea ? (systemInfo.windowHeight - systemInfo.safeArea.bottom) : 0;
    const safeAreaBottomRpx = safeAreaBottom * globalData.rpxR;
    this.setData({
      windowWidth: windowWidth,
      windowHeight: windowHeight,
      statusBarHeight: statusBarHeight,
      navBarHeight: navBarHeight,
      safeAreaBottom: safeAreaBottomRpx, // 安全区域底部高度（rpx）
      url: apiUrl.server,
      scrollViewHeightReading: 300
    });
    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo');
    const depInfo = wx.getStorageSync('depInfo') || wx.getStorageSync('depItem');
    if (userInfo) {
      this.setData({
        userInfo,
        disId: userInfo.nxDiuDistributerId,
        userId: userInfo.nxDepartmentUserId || userInfo.nxDepartmentUserId,
      });
    }
    if (depInfo) {
      this.setData({
        depInfo,
        depId: depInfo.nxDepartmentId || depInfo.depId,
        depFatherId: depInfo.nxDepartmentFatherId || depInfo.depFatherId,
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
    // 加载缓存数据（先加载订单缓存）
    this._loadCache();
    // 加载简化版任务列表
    this._simpleLoadTasks();
    // 检查简化版任务缓存中是否有当前部门的任务（说明还在请求中）
    // 如果有任务，会设置 currentStep = 'recognizing'（覆盖缓存中的 currentStep）
    // 如果没有任务，保持缓存中的 currentStep（如果有订单则是 'confirm'，否则是 'upload'）
    this._checkSimpleTaskForCurrentDep();
    // 尝试执行简化版任务（如果有待执行的任务）
    this._simpleExecuteTasks();
    // 初始化 TTS 工具类
    this.ttsHelper = new TTSHelper({
      onPlayStart: (audioContext) => {
        // 播放开始回调
        this.setData({
          isTTSPlaying: true,
          ttsAudio: audioContext
        });
        // ⚠️ 预取逻辑：播放开始后，检查是否需要预取下一条
        const currentIndex = this.data.currentTTSIndex;
        if (currentIndex >= 0) {
          const orderArr = this.data.orderArr;
          const currentOrder = orderArr[currentIndex];
          const isStatusMinus2 = currentOrder && currentOrder.nxDoStatus == -2;
          // 如果当前订单状态不是-2，预取下一条
          if (!isStatusMinus2) {
            this._prefetchNextTTSIfNeeded(currentIndex);
          }
        }
      },
      onPlayEnd: () => {
        // 播放结束回调
        this.setData({
          ttsAudio: null
        });
        // 检查当前订单状态，决定是否继续播放
        const currentTTSIndex = this.data.currentTTSIndex;
        const orderArr = this.data.orderArr;
        const currentOrder = orderArr[currentTTSIndex];
        const isStatusMinus2 = currentOrder && currentOrder.nxDoStatus == -2;
        if (isStatusMinus2) {
          // 订单状态为-2，停止朗读并自动展开商品列表或聚焦输入框
          this.setData({
            stoppedIndex: currentTTSIndex,
            stoppedOrderRef: currentOrder,
            isTTSPlaying: false
          });
          // 延迟一下，确保UI更新完成
          setTimeout(() => {
            this._handleOrderStatusMinus2(currentTTSIndex, currentOrder);
          }, 300);
        } else {
          // 正常订单，继续播放下一首
          this.playNextInQueue();
        }
      },
      onError: (error) => {
        // 错误回调
        this.setData({
          ttsAudio: null,
          isTTSPlaying: false,
          ttsError: error.errMsg || '播放失败'
        });
        wx.showToast({
          title: error.errMsg || '播放失败',
          icon: 'none',
          duration: 2000
        });
      },
      onCanplay: (audioContext) => {
        // 音频可以播放回调
      }
    });
    // 如果处于识别状态，启动任务检查定时器
    if (this.data.currentStep === 'recognizing') {
      this._startTaskCheckTimer();
    }
  },

  onShow: function () {
    this._simpleExecuteTasks();
    // 如果处于识别状态，启动任务检查定时器
    if (this.data.currentStep === 'recognizing') {
      this._startTaskCheckTimer();
    }
    // 如果从添加临时商品页面返回，需要更新订单
    if (this.data.findGoods) {
      // 将 name 转换为 selectedGoodsName，以便 _choiceGoods 使用
      if (this.data.name && !this.data.selectedGoodsName) {
        this.setData({
          selectedGoodsName: this.data.name
        });
      }
      // 确保 orderArrIndex 有效
      if (this.data.orderArrIndex < 0) {
        this.setData({
          findGoods: false
        });
        return;
      }
      this._choiceGoods();
    }
    // 检查是否有保存的朗读状态，如果有则继续朗读
    var savedTTSState = wx.getStorageSync('ocrOrderTTSState');
    if (savedTTSState && savedTTSState.isTTSReading) {
      // 清除保存的状态
      wx.removeStorageSync('ocrOrderTTSState');
      // 延迟一下，确保页面完全显示后再继续朗读
      setTimeout(() => {
        // 检查订单数组是否有效
        if (this.data.orderArr && this.data.orderArr.length > 0) {
          // 恢复朗读状态
          var stoppedIndex = savedTTSState.stoppedIndex >= 0 ? savedTTSState.stoppedIndex : -1;
          // 如果停止索引有效，从该位置继续朗读
          if (stoppedIndex >= 0 && stoppedIndex < this.data.orderArr.length) {
            // 检查停止的订单状态是否为 -2
            if (this.data.orderArr[stoppedIndex] && this.data.orderArr[stoppedIndex].nxDoStatus == -2) {
              // 如果状态为 -2，从下一条开始读
              stoppedIndex = stoppedIndex + 1;
            }
            // 从指定位置开始朗读（无论是暂停还是播放中，都从停止位置继续）
            if (stoppedIndex < this.data.orderArr.length) {
              this.readOrderListFromIndex(stoppedIndex);
            } else {
              // 如果已经读完所有订单，不继续朗读
              wx.showToast({
                title: '订单已全部朗读完成',
                icon: 'none',
                duration: 2000
              });
            }
          } else {
            // 如果没有停止位置，检查是否有队列存在
            if (this.data.ttsQueue && this.data.ttsQueue.length > 0) {
              // 如果有队列，尝试继续播放（包括暂停状态）
              if (savedTTSState.isPaused) {
                // 如果是暂停状态，从停止位置继续
                this.continueReading();
              } else {
                // 如果不是暂停状态，也尝试继续播放
                this.continueReading();
              }
            } else {
              // 如果没有队列，从头开始朗读
              this.readOrderList();
            }
          }
        }
      }, 300);
    }
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
    // 创建任务对象
    // ✅ 图片路径已经是持久化的，不需要提前转换 Base64
    const taskInfo = {
      depId: this.data.depId,
      depName: this.data.depName,
      depFatherId: this.data.depFatherId,
      type: 'image',
      imageList: [...this.data.imageList] // 图片路径已经是持久化路径
    };
    // 添加到任务队列（会生成任务ID）
    const taskId = this._addTaskToQueue(taskInfo);
    // 简化版：添加任务到缓存（使用相同的任务ID）
    if (taskId) {
      this._simpleAddTaskWithId(this.data.depId, 'image', taskId);
    }
    if (!taskId) {
      // 任务添加失败（已有相同客户的任务）
      wx.showToast({
        title: '已有识别任务在进行中',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    // 如果当前没有运行的任务，立即显示识别界面
    if (this.data.recognizeTaskRunning.length === 0) {
      this.setData({
        recognizing: true,
        currentStep: 'recognizing',
        recognizeProgress: 0,
        ocrResults: []
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
    // 方案1: 优先调用后端 API（推荐）
    return recognizeOrder({
      ImageBase64: imageBase64,
      // 传递腾讯云配置给后端（如果后端需要）
      SecretId: config.tencentCloud?.secretId || '',
      SecretKey: config.tencentCloud?.secretKey || '',
      Action: 'GeneralAccurateOCR', // OCR 接口名称
      Version: '2018-11-19', // OCR 接口版本
      depId: depId, // ✅ 使用任务信息中的 depId
      disId: this.data.disId,
      depFatherId: depFatherId, // ✅ 使用任务信息中的 depFatherId
      userId: this.data.userId
    }).then(res => {
      const data = res.result;
      if (data && data.code === 0) {
        // 注意：不在接口返回时删除任务，而是在任务完成时删除（避免 this.data.depId 可能不是任务所属部门的问题）
        // 优先检查 data.data：如果是数组，说明后台已经保存了订单
        if (Array.isArray(data.data) && data.data.length > 0) {
          return {
            savedOrders: data.data,
            isSaved: true
          };
        }
        // 检查订单数组：可能在 data.items 或 data.data.items
        const items = data.items || data.data?.items;
        if (items && items.length > 0) {
          return {
            items: items,
            parsedResult: data.parsedResult || data.data?.parsedResult
          };
        }
      } else {
        // 如果后端接口返回错误
        const errorMsg = data?.msg || data?.message || '识别失败';
        // 检查不同类型的错误
        if (errorMsg.includes('资源包耗尽') || errorMsg.includes('ResourcePackageRunOut')) {
          throw new Error('OCR_RESOURCE_EXHAUSTED:' + errorMsg);
        } else if (errorMsg.includes('服务未开通') || errorMsg.includes('UnOpenError') || errorMsg.includes('FailedOperation.UnOpenError')) {
          throw new Error('OCR_SERVICE_NOT_OPENED:' + errorMsg);
        } else {
          throw new Error(errorMsg);
        }
      }
    }).catch(err => {
      // 处理网络错误
      if (err.errMsg && err.errMsg.includes('404')) {
        throw new Error('后端 OCR 接口未实现（404）。\n请后端开发人员实现接口: POST /api/ocr/recognize\n参考文档: docs/OCR_API_接口文档.md');
      } else {
        throw new Error('OCR 服务暂时不可用，请稍后重试: ' + (err.errMsg || err.message || '网络错误'));
      }
    });
  },

  /**
   * 编辑订单项（数量、规格、备注）
   */

  editOrder: function (e) {
    var type = e.currentTarget.dataset.type;
    var index = e.currentTarget.dataset.index;
    var data = "orderArr[" + index + "]." + (type === 'name' ? 'nxDoGoodsName' : type === 'quantity' ? 'nxDoQuantity' : type === 'standard' ? 'nxDoStandard' : 'nxDoRemark');
    if (e.detail.value.length > 0) {
      this.setData({
        [data]: e.detail.value
      })
    } else {
      this.setData({
        [data]: ""
      })
    }
    if (type === 'remark') {
      var remarkData = "orderArr[" + index + "].nxDoRemark";
      this.setData({
        [remarkData]: e.detail.value
      })
    }
    // }
  },

  /**
   * 显示商品列表（展开/收起）
   */

  showGoodsList(e) {
    var index = e.currentTarget.dataset.index;
    var agent = this.data.orderArr[index].nxDoIsAgent;
    var dataIsAgent = "orderArr[" + index + "].nxDoIsAgent";
    // 先找到所有 nxDoIsAgent === 2 的项，把它们都改为 -1（实现开关功能）
    var updateData = {};
    for (var i = 0; i < this.data.orderArr.length; i++) {
      if (this.data.orderArr[i].nxDoIsAgent === 2) {
        updateData["orderArr[" + i + "].nxDoIsAgent"] = -1;
      }
    }
    // 如果当前点击的项不是 2，就设置为 2（开关打开）
    if (agent !== 2) {
      updateData[dataIsAgent] = 2;
      updateData.orderArrIndex = index;
      this.setData(updateData);
    } else {
      // 如果当前点击的项已经是 2，在上面已经改为 -1 了，只需要设置 orderArrIndex 为 -1
      updateData.orderArrIndex = -1;
      this.setData(updateData);
    }
    this.setData({
      nxArr: [],
      strArr: []
    })
  },

  /**
   * 关闭商品列表
   */

  closeShowGoods(mockEvent) {
    var index = mockEvent;
    var dataIsAgent = "orderArr[" + index + "].nxDoIsAgent";
    this.setData({
      orderArrIndex: -1,
      [dataIsAgent]: -1,
      nxArr: []
    })
  },

  /**
   * 聚焦订单输入框（触发搜索）
   * @param {Object} e 事件对象，包含 currentTarget.dataset.index 和 currentTarget.dataset.type
   */

  focusOrderIndex(e) {
    // 兼容两种调用方式：直接传事件对象，或传 mockEvent
    const currentTarget = e.currentTarget || e;
    const dataset = currentTarget.dataset || {};
    var index = dataset.index;
    if (index === undefined) {
      return;
    }
    var dataIsAgent = "orderArr[" + index + "].nxDoIsAgent";
    this.setData({
      orderArrIndex: index,
      [dataIsAgent]: 2,
      nxArr: []
    });
    // 如果是聚焦商品名称输入框，触发自动搜索
    if (dataset.type == 'name') {
      this.autoSearchString();
    }
  },

  /**
   * 根据商品名称自动搜索商品（聚焦时触发）
   */

  autoSearchString: function () {
    var data = {
      disId: this.data.disId,
      searchStr: this.data.orderArr[this.data.orderArrIndex].nxDoGoodsName,
      depId: this.data.depId,
    }
    load.showLoading(("查找商品"))
    queryDisGoodsByQuickSearchWithDepId(data).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        this.setData({
          strArr: res.result.data.disArr,
          nxArr: res.result.data.nxArr,
        })
        // 搜索后立即保存到缓存
        this._saveToStorage();
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
        this.setData({
          nxArr: [],
          strArr: []
        })
      }
    })
  },
  // 编辑商品名称（触发搜索）

  editOrderName: function (e) {
    var index = e.currentTarget.dataset.index;
    this.setData({
      goodsName: e.detail.value,
    })
    if (e.detail.value.length > 0) {
      var newName = e.detail.value;
      var dataName = "orderArr[" + index + "].nxDoGoodsName";
      var dataNameOriginal = "orderArr[" + index + "].nxDoGoodsNameOriginal";
      // 确保 orderArrIndex 保持为当前索引，避免被重置为 -1
      this.setData({
        [dataName]: newName,
        [dataNameOriginal]: newName, // 同时更新原始商品名称
        orderArrIndex: index, // 保持当前编辑的订单索引
      })
      this.getSearchString(e);
    } else {
      this.setData({
        strArr: [],
        nxArr: [],
        orderArrIndex: -1,
      })
    }
    // this.getSearchString()
  },

  /**
   * 根据商品名称搜索商品（输入时触发）
   */

  getSearchString: function (e) {
    if (e.detail.value.length > 0) {
      var data = {
        disId: this.data.disId,
        searchStr: e.detail.value,
        depId: this.data.depId,
      }
      this.setData({
        searchStr: e.detail.value,
      })
      load.showLoading("搜索商品中")
      queryDisGoodsByQuickSearchWithDepId(data).then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          this.setData({
            strArr: res.result.data.disArr,
            nxArr: res.result.data.nxArr,
          })
          // 搜索后立即保存到缓存
          this._saveToStorage();
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
          this.setData({
            nxArr: [],
            strArr: []
          })
        }
      })
    }
  },

  /**
   * 关闭搜索结果
   */

  closeStr: function () {
    this.setData({
      strArr: [],
      nxArr: [],
      orderArrIndex: -1,
    })
  },

  /**
   * 选择商品（从搜索结果中选择）
   */

  saveOrder: function (e) {
    this.setData({
      orderArrIndex: e.currentTarget.dataset.index,
      goodsId: e.currentTarget.dataset.id,
      selectedGoodsName: e.currentTarget.dataset.name || '', // 保存选择的商品名称
    })
    this._choiceGoods();
  },

  /**
   * 保存订单（选择商品后）
   */

  _choiceGoods: function () {
    var index = this.data.orderArrIndex;
    if (index === undefined || index === null || index < 0) {
      // 清除 findGoods 标记
      this.setData({
        findGoods: false
      });
      return;
    }
    if (!this.data.orderArr || index >= this.data.orderArr.length) {
      // 清除 findGoods 标记
      this.setData({
        findGoods: false
      });
      return;
    }
    // 从 orderArr 中获取订单对象（确保获取最新的完整对象）
    var order = this.data.orderArr[index];
    if (!order) {
      // 清除 findGoods 标记
      this.setData({
        findGoods: false
      });
      return;
    }
    // 检查 goodsId 是否存在
    if (!this.data.goodsId) {
      // 清除 findGoods 标记
      this.setData({
        findGoods: false
      });
      wx.showToast({
        title: '商品ID不存在',
        icon: 'none'
      });
      return;
    }
    // 使用选择的商品名称（支持从添加临时商品页面返回时的 name 字段）
    const selectedGoodsName = this.data.selectedGoodsName || this.data.name || order.nxDoGoodsName || '';
    // 检查 order 对象是否包含必要字段
    const requiredFields = ['nxDoQuantity', 'nxDoStandard', 'nxDoStatus'];
    const missingFields = requiredFields.filter(field => order[field] === undefined && order[field] === null);
    if (missingFields.length > 0) {
    }
    // 确保传递完整的 order 对象，而不仅仅是修改几个字段
    // 注意：使用展开运算符确保保留所有原有字段
    const orderToSend = {
      ...order, // 保留原有的所有字段（包括 nxDoQuantity, nxDoStandard, nxDoRemark 等）
      nxDoGoodsName: selectedGoodsName, // 更新商品名称
      nxDoDisGoodsId: this.data.goodsId, // 更新商品ID
      // 注意：不修改 nxDoGoodsNameOriginal，保持原有值
    };
    // 验证订单数据的完整性
    // 1. 订单商品名称必须有值
    if (!orderToSend.nxDoGoodsName || orderToSend.nxDoGoodsName.trim() === '') {
      wx.showToast({
        title: '订单商品名称不能为空',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    // 2. 订货数量必须是数字
    if (orderToSend.nxDoQuantity === undefined || orderToSend.nxDoQuantity === null || orderToSend.nxDoQuantity === '') {
      wx.showToast({
        title: '订货数量不能为空',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    // 检查订货数量是否为有效数字
    const quantity = Number(orderToSend.nxDoQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      wx.showToast({
        title: '订货数量必须是大于0的数字',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    // 3. 订货单位必须有值
    if (!orderToSend.nxDoStandard || orderToSend.nxDoStandard.trim() === '') {
      wx.showToast({
        title: '订货单位不能为空',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    load.showLoading("保存订单中")
    choiceGoodsForApply(orderToSend).then(res => {
      if (res.result.code == 0) {
        load.hideLoading();
        // 获取更新前的原始订单对象，保留所有原有字段
        const currentOrderBeforeUpdate = this.data.orderArr[index];
        // 合并原有订单对象的所有字段 + 后端返回的字段 + 需要更新的字段
        // 这样可以确保不丢失任何原有字段（如 nxDoQuantity, nxDoStandard, nxDoRemark 等）
        const updatedOrder = {
          ...currentOrderBeforeUpdate, // 先保留原有的所有字段
          ...res.result.data, // 然后用后端返回的字段覆盖/更新
          nxDoGoodsName: selectedGoodsName, // 使用选择的商品名称
          // 注意：nxDoGoodsNameOriginal 保留原有值，不从后端覆盖
          nxDoGoodsNameOriginal: currentOrderBeforeUpdate?.nxDoGoodsNameOriginal || selectedGoodsName
        };
        var data = "orderArr[" + index + "]";
        this.setData({
          [data]: updatedOrder,
          strArr: [],
          nxArr: [],
          // 注意：先不重置 orderArrIndex，因为 _updateStorage 需要使用它
        })
        // 先更新缓存（需要使用 orderArrIndex）
        this._updateStorage(updatedOrder);
        // 更新缓存后再重置相关状态
        this.setData({
          orderArrIndex: -1,
          findGoods: false, // 清除 findGoods 标记
          name: '', // 清除 name
          selectedGoodsName: '', // 清除 selectedGoodsName
        })
        // ✅ 保存订单后，从当前订单开始继续朗读（如果之前在朗读模式）
        // 注意：如果之前没有在朗读模式，这里不会自动开始朗读
        // 用户需要手动点击播放按钮开始朗读
        if (this.data.isTTSReading || this.data.isTTSPlaying) {
          this.readOrderListFromIndex(index);
        } else {
        }
      } else {
        load.hideLoading();
        // 清除 findGoods 标记，避免重复尝试
        this.setData({
          findGoods: false,
          name: '',
          selectedGoodsName: '',
        });
        wx.showToast({
          title: res.result ? res.result.msg : '保存失败',
          icon: 'none'
        })
      }
    }).catch(err => {
      load.hideLoading();
      // 清除 findGoods 标记，避免重复尝试
      this.setData({
        findGoods: false,
        name: '',
        selectedGoodsName: '',
      });
      wx.showToast({
        title: '保存订单失败',
        icon: 'none'
      })
    })
  },

  /**
   * 下载商品（从系统商品下载到配送商商品）
   */

  downLoadGoodsNx: function (e) {
    var that = this;
    var orderIndex = e.currentTarget.dataset.index;
    var goods = e.currentTarget.dataset.item;
    this.setData({
      selectedGoodsName: goods.nxGoodsName,
    })
    var dg = {
      nxDgDistributerId: this.data.disId,
      nxDgNxGoodsId: goods.nxGoodsId,
      nxDgGoodsName: goods.nxGoodsName,
      nxDgGoodsDetail: goods.nxGoodsDetail,
      nxDgGoodsPlace: goods.nxGoodsPlace,
      nxDgGoodsBrand: goods.nxGoodsBrand,
      nxDgGoodsStandardname: goods.nxGoodsStandardname,
      nxDgGoodsStandardWeight: goods.nxGoodsStandardWeight,
      nxDgGoodsPinyin: goods.nxGoodsPinyin,
      nxDgGoodsPy: goods.nxGoodsPy,
      nxDgPullOff: 0,
      nxDgGoodsStatus: 0,
      nxDgPurchaseAuto: 1,
    };
    load.showLoading("保存商品")
    downDisGoods(dg).then(res => {
      if (res.result.code == 0) {
        load.hideLoading();
        that.setData({
          goodsId: res.result.data.nxDistributerGoodsId,
          orderArrIndex: orderIndex
        })
        that._choiceGoods();
      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    }).catch(err => {
      load.hideLoading();
      wx.showToast({
        title: '下载商品失败',
        icon: 'none'
      })
    })
  },

  /**
   * 删除订单项（从操作菜单调用）
   * 参考 orderPage 的 delApplyPaste
   */

  delOrder: function (e) {
    // 使用 orderPasteIndex（从操作菜单调用）
    var index = this.data.orderPasteIndex;
    if (index < 0 || index >= this.data.orderArr.length) {
      return;
    }
    var arr = this.data.orderArr;
    var orderItem = arr[index];
    if (!orderItem) {
      return;
    }
    // 关闭操作菜单
    this.setData({
      showOperationPaste: false
    });
    // 如果订单有 nxDepartmentOrdersId，说明已经保存到服务器，需要调用接口删除
    if (orderItem.nxDepartmentOrdersId) {
      var id = orderItem.nxDepartmentOrdersId;
      var that = this;
      load.showLoading("删除订单中");
      deleteOrder(id).then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          var filteredArr = that.data.orderArr.filter((_, idx) => idx !== index);
          that.setData({
            orderArr: filteredArr,
            orderArrIndex: -1, // 关闭搜索结果
            strArr: [],
            nxArr: [],
            orderItem: null,
          });
          // 更新缓存
          that._saveToStorage(filteredArr);
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: res.result.msg || '删除失败',
            icon: 'none'
          });
        }
      }).catch(error => {
        load.hideLoading();
        wx.showToast({
          title: '删除失败，请检查网络',
          icon: 'none'
        });
      });
      return;
    }
    // 如果订单没有 nxDepartmentOrdersId，说明只是草稿，直接从数组中删除
    arr.splice(index, 1);
    this.setData({
      orderArr: arr,
      orderArrIndex: -1, // 关闭搜索结果
      strArr: [],
      nxArr: [],
      orderItem: null,
    });
    // 更新缓存
    this._saveToStorage(arr);
    wx.showToast({
      title: '删除成功',
      icon: 'success'
    });
  },

  /**
   * 删除订单项（支持从其他地方调用，保留兼容）
   * 调用 delOrder
   */

  deleteOrder: function (e) {
    // 如果是从操作菜单调用，使用 orderPasteIndex
    // 如果是从其他地方调用，使用 dataset.index
    var index = this.data.orderPasteIndex >= 0 ? this.data.orderPasteIndex : (e && e.currentTarget ? e.currentTarget.dataset.index : -1);
    // 临时设置 orderPasteIndex，然后调用 delOrder
    this.setData({
      orderPasteIndex: index
    });
    // 调用统一的删除函数
    this.delOrder(e);
  },

  /**
   * 修改订单（已保存的订单）
   * 参考 paste.js 的 editApply，先获取配送商品信息
   */

  editOrderItem: function (e) {
    var index = this.data.orderPasteIndex;
    if (index < 0 || index >= this.data.orderArr.length) {
      return;
    }
    var arr = this.data.orderArr;
    var orderItem = arr[index];
    if (!orderItem) {
      return;
    }
    // 检查订单是否已保存
    if (!orderItem.nxDepartmentOrdersId) {
      wx.showToast({
        title: '订单未保存，无法修改',
        icon: 'none'
      });
      this.setData({
        showOperationPaste: false
      });
      return;
    }
    // 关闭操作菜单
    this.setData({
      showOperationPaste: false
    });
    // 参考 paste.js 的 editApply，先获取配送商品信息
    var applyItem = orderItem;
    // 检查所有可能的商品ID字段（参考 paste.js 的判断方式）
    var goodsId = applyItem.nxDoDisGoodsId;
    // 根据 nxDoDisGoodsId 先请求接口获取 nxDistributerGoodsEntity（参考 paste.js 的判断方式）
    if (goodsId) {
      load.showLoading('加载商品信息');
      var that = this;
      disGetGoods(goodsId).then(res => {
        load.hideLoading();
        if (res.result.code == 0 && res.result.data) {
          // 获取到商品信息后，设置到 itemDis
          that.setData({
            show: true,
            editApply: true,
            applyItem: applyItem,
            applyStandardName: applyItem.nxDoStandard || '',
            printStandard: applyItem.nxDoPrintStandard || applyItem.nxDoStandard || '',
            itemDis: res.result.data, // 使用接口返回的商品信息
            item: applyItem.nxDepartmentDisGoodsEntity || null,
            applyNumber: applyItem.nxDoQuantity || '',
            applyRemark: applyItem.nxDoRemark || '',
            priceLevel: applyItem.nxDoCostPriceLevel || '',
            applyGoodsName: applyItem.nxDoGoodsName || '',
            applyGoodsId: goodsId || '',
          });
        } else {
          // 接口返回失败，使用原有的 nxDistributerGoodsEntity（如果有）
          wx.showToast({
            title: res.result.msg || '获取商品信息失败',
            icon: 'none'
          });
          that.setData({
            show: true,
            editApply: true,
            applyItem: applyItem,
            applyStandardName: applyItem.nxDoStandard || '',
            printStandard: applyItem.nxDoPrintStandard || applyItem.nxDoStandard || '',
            itemDis: applyItem.nxDistributerGoodsEntity || null,
            item: applyItem.nxDepartmentDisGoodsEntity || null,
            applyNumber: applyItem.nxDoQuantity || '',
            applyRemark: applyItem.nxDoRemark || '',
            priceLevel: applyItem.nxDoCostPriceLevel || '',
            applyGoodsName: applyItem.nxDoGoodsName || '',
            applyGoodsId: goodsId || '',
          });
        }
      }).catch(err => {
        load.hideLoading();
        wx.showToast({
          title: '获取商品信息失败',
          icon: 'none'
        });
        // 失败时使用原有的 nxDistributerGoodsEntity（如果有）
        that.setData({
          show: true,
          editApply: true,
          applyItem: applyItem,
          applyStandardName: applyItem.nxDoStandard || '',
          printStandard: applyItem.nxDoPrintStandard || applyItem.nxDoStandard || '',
          itemDis: applyItem.nxDistributerGoodsEntity || null,
          item: applyItem.nxDepartmentDisGoodsEntity || null,
          applyNumber: applyItem.nxDoQuantity || '',
          applyRemark: applyItem.nxDoRemark || '',
          priceLevel: applyItem.nxDoCostPriceLevel || '',
          applyGoodsName: applyItem.nxDoGoodsName || '',
          applyGoodsId: goodsId || '',
        });
      });
    } else {
      // 没有商品ID，直接使用原有的 nxDistributerGoodsEntity
      this.setData({
        show: true,
        editApply: true,
        applyItem: applyItem,
        applyStandardName: applyItem.nxDoStandard || '',
        printStandard: applyItem.nxDoPrintStandard || applyItem.nxDoStandard || '',
        itemDis: applyItem.nxDistributerGoodsEntity || null,
        item: applyItem.nxDepartmentDisGoodsEntity || null,
        applyNumber: applyItem.nxDoQuantity || '',
        applyRemark: applyItem.nxDoRemark || '',
        priceLevel: applyItem.nxDoCostPriceLevel || '',
        applyGoodsName: applyItem.nxDoGoodsName || '',
        applyGoodsId: applyItem.nxDoDisGoodsId || '',
      });
    }
  },
  // ==================== 五、编辑订单弹窗相关（准备拆分到 ocrOrderList 组件）====================

  /**
   * 确认修改订单
   * 参考 orderPage 的 confirm 和 _updateDisOrder
   */

  confirm: function (e) {
    if (this.data.editApply) {
      this._updateDisOrder(e);
    }
    this.setData({
      show: false,
      editApply: false,
      applyItem: "",
      item: "",
      applyNumber: "",
      applyStandardName: "",
      printStandard: "",
    });
  },

  /**
   * 取消编辑
   */

  cancle: function () {
    this.setData({
      show: false,
      editApply: false,
      applyItem: "",
      item: "",
      applyNumber: "",
      applyStandardName: "",
      printStandard: "",
    });
  },

  /**
   * 删除申请（在编辑弹窗中）
   * 参考 orderPage 的 delApply
   */

  delApply: function () {
    var index = this.data.orderPasteIndex;
    var orderItem = this.data.orderArr[index];
    this.setData({
      warnContent: (orderItem.nxDoGoodsName || '') + "  " + (orderItem.nxDoQuantity || '') + (orderItem.nxDoStandard || ''),
      show: false,
      popupType: 'deleteOrder',
      showPopupWarn: true,
    });
  },

  /**
   * 删除规格
   * 参考 orderPage 的 delStandard
   */

  delStandard: function (e) {
    this.setData({
      warnContent: e.detail.standardName,
      show: false,
      popupType: 'deleteSpec',
      showPopupWarn: true,
      disStandardId: e.detail.id,
    });
  },

  /**
   * 确认规格
   * 参考 paste.js 的 confirmStandard
   */

  confirmStandard: function (e) {
    if (!this.data.itemDis || !this.data.itemDis.nxDistributerGoodsId) {
      wx.showToast({
        title: '商品信息错误',
        icon: 'none'
      });
      return;
    }
    var data = {
      nxDsDisGoodsId: this.data.itemDis.nxDistributerGoodsId,
      nxDsStandardName: e.detail.newStandardName,
    };
    load.showLoading('保存规格中');
    var that = this;
    disSaveStandard(data).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        var standardArr = this.data.itemDis.nxDistributerStandardEntities || [];
        standardArr.push(res.result.data);
        var standards = "itemDis.nxDistributerStandardEntities";
        this.setData({
          [standards]: standardArr,
          applyStandardName: res.result.data.nxDsStandardName,
        });
        wx.showToast({
          title: '添加规格成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: res.result.msg || '添加规格失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      load.hideLoading();
      wx.showToast({
        title: '添加规格失败',
        icon: 'none'
      });
    });
  },

  /**
   * 改变规格
   * 参考 orderPage 的 changeStandard
   */

  changeStandard: function (e) {
    this.setData({
      applyStandardName: e.detail.applyStandardName,
      priceLevel: e.detail.level,
    });
    if (this.data.itemDis) {
      var levelTwoStandard = this.data.itemDis.nxDgWillPriceTwoStandard;
      if (this.data.applyStandardName == levelTwoStandard) {
        this.setData({
          printStandard: levelTwoStandard
        });
      } else {
        this.setData({
          printStandard: this.data.itemDis.nxDgGoodsStandardname || ''
        });
      }
    }
  },

  /**
   * 确认警告
   * 参考 orderPage 的 confirmWarn
   */

  confirmWarn: function () {
    if (this.data.popupType == 'deleteSpec') {
      this.deleteStandardApi();
    } else if (this.data.popupType == 'deleteOrder') {
      this.delOrder(); // 调用删除订单函数
      this.setData({
        showPopupWarn: false,
        popupType: '',
      });
    }
  },

  /**
   * 关闭警告弹窗
   */

  closeWarn: function () {
    this.setData({
      showPopupWarn: false,
      popupType: '',
      warnContent: '',
    });
  },

  /**
   * 删除规格 API
   * 参考 orderPage 的 deleteStandardApi
   */

  deleteStandardApi: function () {
    if (!this.data.disStandardId) {
      wx.showToast({
        title: '规格ID错误',
        icon: 'none'
      });
      this.setData({
        popupType: "",
        showPopupWarn: false,
        disStandardId: "",
      });
      return;
    }
    load.showLoading('删除规格中');
    disDeleteStandard(this.data.disStandardId).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        // 更新 itemDis 为接口返回的最新数据
        this.setData({
          popupType: "",
          showPopupWarn: false,
          disStandardId: "",
          itemDis: res.result.data,
          item: res.result.data,
        });
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: res.result.msg || '删除失败',
          icon: 'none'
        });
        this.setData({
          popupType: "",
          showPopupWarn: false,
          disStandardId: "",
        });
      }
    }).catch(err => {
      load.hideLoading();
      wx.showToast({
        title: '删除失败，请检查网络',
        icon: 'none'
      });
      this.setData({
        popupType: "",
        showPopupWarn: false,
        disStandardId: "",
      });
    });
  },

  /**
   * 修改配送申请
   * 参考 orderPage 的 _updateDisOrder
   */

  _updateDisOrder: function (e) {
    var index = this.data.orderPasteIndex;
    var orderItem = this.data.orderArr[index];
    if (!orderItem || !orderItem.nxDepartmentOrdersId) {
      wx.showToast({
        title: '订单信息错误',
        icon: 'none'
      });
      return;
    }
    var dg = {
      id: orderItem.nxDepartmentOrdersId,
      weight: e.detail.applyNumber,
      standard: e.detail.applyStandardName,
      remark: e.detail.applyRemark,
      printStandard: this.data.printStandard,
      priceLevel: this.data.priceLevel
    };
    load.showLoading("修改订单中");
    var that = this;
    updateOrder(dg).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        // 更新本地订单数组
        var updatedOrder = {
          ...orderItem,
          ...res.result.data,
          // 保留原有的商品名称相关字段
          nxDoGoodsName: orderItem.nxDoGoodsName,
          nxDoGoodsNameOriginal: orderItem.nxDoGoodsNameOriginal || orderItem.nxDoGoodsName,
        };
        // 更新订单数组
        var updatedArr = [...this.data.orderArr];
        updatedArr[index] = updatedOrder;
        that.setData({
          orderArr: updatedArr,
        });
        // 更新缓存
        that._saveToStorage(updatedArr);
        wx.showToast({
          title: '修改成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: res.result.msg || '修改失败',
          icon: 'none'
        });
      }
    }).catch(error => {
      load.hideLoading();
      wx.showToast({
        title: '修改失败，请检查网络',
        icon: 'none'
      });
    });
  },

  /**
   * 返回上一页
   */

  toBack: function () {
    this.onUnload();
    wx.navigateBack();
  },

  /**
   * 显示操作菜单
   */

  showPasteOperation: function (e) {
    const index = e.currentTarget.dataset.index;
    this.setData({
      orderPasteIndex: index,
      showOperationPaste: true,
      orderItem: this.data.orderArr[index],
    })
  },

  /**
   * 添加临时商品
   */

  addDisAlias: function (e) {
    var index = this.data.orderPasteIndex;
    if (index < 0 || index >= this.data.orderArr.length) {
      return;
    }
    var order = this.data.orderArr[index];
    if (!order) {
      return;
    }
    var standard = order.itemUnit || '';
    var name = order.nxDoGoodsName || '';
    var standardWeight = order.standardWeight;
    var itemsPerCarton = order.itemsPerCarton;
    var cartonUnit = order.cartonUnit;
    // 先关闭操作菜单
    this.setData({
      showOperationPaste: false,
    });
    // 保存当前订单索引
    this.setData({
      orderArrIndex: index,
    });
    // 如果正在朗读或暂停，保存朗读状态以便返回后继续
    var isPaused = this.data.stoppedIndex >= 0 && !this.data.isTTSPlaying && this.data.isTTSReading;
    if (this.data.isTTSReading || this.data.isTTSPlaying || isPaused) {
      // 如果不是暂停状态，停止当前播放
      if (!isPaused && this.ttsHelper) {
        try {
          this.ttsHelper.stop();
        } catch (e) {
          console.error('[TTS] 停止播放失败:', e);
        }
      }
      // 保存朗读状态到 storage
      // 如果是暂停状态，优先使用 stoppedIndex；否则使用 currentTTSIndex
      var currentIndex = isPaused ? this.data.stoppedIndex : (this.data.currentTTSIndex >= 0 ? this.data.currentTTSIndex : this.data.stoppedIndex);
      wx.setStorageSync('ocrOrderTTSState', {
        isTTSReading: true,
        stoppedIndex: currentIndex >= 0 ? currentIndex : -1,
        currentTTSIndex: this.data.currentTTSIndex,
        ttsSessionId: this.data.ttsSessionId,
        isPaused: isPaused // 标记是否是暂停状态
      });
      // 更新本地状态
      this.setData({
        isTTSPlaying: false,
        stoppedIndex: currentIndex >= 0 ? currentIndex : -1
      });
    }
    // 跳转到添加临时商品页面（延迟一下确保菜单关闭动画完成）
    setTimeout(() => {
      wx.navigateTo({
        url: '../../../../subPackage/pages/goods/disAddGoodsLinshi/disAddGoodsLinshi?goodsName=' + name + '&from=paste' + '&standard=' + standard + '&standardWeight=' + standardWeight + '&cartonUnit=' + cartonUnit + '&itemsPerCarton=' + itemsPerCarton,
      });
    }, 100);
  },

  /**
   * 隐藏遮罩（关闭操作菜单）
   */

  hideMask: function () {
    this.setData({
      showOperationPaste: false
    })
  },

  /**
   * 添加备注
   */

  addRemark: function () {
    var index = this.data.orderPasteIndex;
    if (index < 0 || index >= this.data.orderArr.length) {
      return;
    }
    var data = "orderArr[" + index + "].nxDoAddRemark";
    this.setData({
      [data]: true,
      showOperationPaste: false
    })
  },

  /**
   * 从这里开始朗读
   */

  startReadingFromHere: function () {
    // 关闭操作菜单
    this.setData({
      showOperationPaste: false
    });
    // 获取当前订单索引
    var index = this.data.orderPasteIndex;
    if (index < 0 || index >= this.data.orderArr.length) {
      wx.showToast({
        title: '订单索引无效',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    // 从指定订单索引开始朗读
    this.readOrderListFromIndex(index);
  },

  /**
   * 在之前加新订单 - 跳转到 resGoodsList 页面
   */

  addNewPasteOrderBefore: function () {
    // 关闭操作菜单
    this.setData({
      showOperationPaste: false
    });
    // 获取当前订单索引，用于在返回时插入新订单
    var index = this.data.orderPasteIndex;
    // 保存当前订单索引到 storage，供返回时使用
    wx.setStorageSync('ocrOrderInsertIndex', index);
    // 设置标记，表示从 ocrOrder 跳转过来
    wx.setStorageSync('fromOcrOrder', '1');
    // 如果正在朗读或暂停，保存朗读状态以便返回后继续
    var isPaused = this.data.stoppedIndex >= 0 && !this.data.isTTSPlaying && this.data.isTTSReading;
    if (this.data.isTTSReading || this.data.isTTSPlaying || isPaused) {
      // 如果不是暂停状态，停止当前播放
      if (!isPaused && this.ttsHelper) {
        try {
          this.ttsHelper.stop();
        } catch (e) {
          console.error('[TTS] 停止播放失败:', e);
        }
      }
      // 保存朗读状态到 storage
      // 如果是暂停状态，优先使用 stoppedIndex；否则使用 currentTTSIndex
      var currentIndex = isPaused ? this.data.stoppedIndex : (this.data.currentTTSIndex >= 0 ? this.data.currentTTSIndex : this.data.stoppedIndex);
      wx.setStorageSync('ocrOrderTTSState', {
        isTTSReading: true,
        stoppedIndex: currentIndex >= 0 ? currentIndex : -1,
        currentTTSIndex: this.data.currentTTSIndex,
        ttsSessionId: this.data.ttsSessionId,
        isPaused: isPaused // 标记是否是暂停状态
      });
      // 更新本地状态
      this.setData({
        isTTSPlaying: false,
        stoppedIndex: currentIndex >= 0 ? currentIndex : -1
      });
    }
    // 获取 depSettleType
    var depSettleType = '1'; // 默认值
    if (this.data.depInfo && this.data.depInfo.nxDepartmentSettleType !== undefined) {
      depSettleType = this.data.depInfo.nxDepartmentSettleType;
    }
    // 跳转到 resGoodsList 页面，传递 fromOcrOrder 参数
    wx.navigateTo({
      url: '../resGoodsList/resGoodsList?depFatherId=' + (this.data.depFatherId || '') +
        '&depId=' + (this.data.depId || '') + '&depName=' + (this.data.depName || '') +
        '&gbDepFatherId=-1&resFatherId=-1&depSettleType=' + depSettleType +
        '&beforeId=-1&fromOcrOrder=1',
    });
  },
  // ==================== 七、缓存管理相关 ====================

  /**
   * 加载缓存数据
   */

  _loadCache: function () {
    var ocrOrderDepList = wx.getStorageSync("ocrOrderDepList");
    if (ocrOrderDepList && Array.isArray(ocrOrderDepList)) {
      this.setData({
        ocrOrderDepList: ocrOrderDepList,
      });
      for (var i = 0; i < ocrOrderDepList.length; i++) {
        var pDepId = ocrOrderDepList[i].depId;
        if (pDepId == this.data.depId) {
          // 从缓存恢复订单数据
          let orders = ocrOrderDepList[i].arr || [];
          // 确保每个订单都有原始商品名称字段（兼容旧数据）
          orders = orders.map((order) => {
            if (order && !order.nxDoGoodsNameOriginal) {
              return {
                ...order,
                nxDoGoodsNameOriginal: order.nxDoGoodsName || ''
              };
            }
            return order;
          });
          // 如果有缓存数据，直接使用缓存中的 saveCount（如果有的话）
          const saveCount = ocrOrderDepList[i].saveCount !== undefined ? ocrOrderDepList[i].saveCount : null;
          // 恢复搜索相关数据
          const searchData = ocrOrderDepList[i];
          // 检查是否有缓存数据（订单数组不为空）
          // 注意：如果有识别任务，currentStep 会在 _checkCurrentDepRecognizing 中设置，这里先不设置
          const newCurrentStep = orders.length > 0 ? 'confirm' : 'upload';
          // 初始化图片变换状态列表（只存 scale）
          const imageList = searchData.imageList || [];
          // 获取系统信息，初始化图片变换状态（包含默认尺寸）
          const {
            windowWidth,
            windowHeight
          } = wx.getWindowInfo();
          const CANVAS_SCALE = 3; // 画布是 300vw，所以缩放比例是 3
          // 默认图片尺寸
          const defaultWidth = windowWidth * 0.9;
          const defaultHeight = Math.round(windowHeight * 0.8);
          // 计算初始位置：让图片中心对齐画布中心
          const initialX = (windowWidth * CANVAS_SCALE) / 2 - defaultWidth / 2;
          const initialY = (windowHeight * CANVAS_SCALE) / 2 - defaultHeight / 2;
          const imageTransformList = imageList.map(() => ({
            scale: 1,
            // x: initialX,
            // y: initialY,
            width: defaultWidth,
            height: defaultHeight
          }));
          // 先检查是否有识别任务（需要在恢复任务队列之后才能检查）
          // currentStep 会在 _checkSimpleTaskForCurrentDep 中根据识别任务状态设置
          // 如果没有识别任务，使用默认值（有订单则是 'confirm'，否则是 'upload'）
          // 注意：如果后续检查到有任务，会被覆盖为 'recognizing'
          const defaultCurrentStep = orders.length > 0 ? 'confirm' : 'upload';
          this.setData({
            ocrOrderDepIndex: i,
            orderArr: orders,
            saveCount: saveCount,
            currentStep: defaultCurrentStep, // 设置默认值，如果有任务会被 _checkSimpleTaskForCurrentDep 覆盖
            // 恢复搜索相关数据
            strArr: searchData.strArr || [],
            nxArr: searchData.nxArr || [],
            // orderArrIndex: searchData.orderArrIndex !== undefined ? searchData.orderArrIndex : -1,
            searchStr: searchData.searchStr || "",
            // 恢复来源类型和相关文件信息
            sourceType: searchData.sourceType || null,
            excelFile: searchData.excelFile || null,
            imageList: imageList,
            imageTransformList: imageTransformList
          }, () => {
            // setData 完成后的回调
          });
          return; // 找到匹配的缓存，退出循环
        }
      }
    } else {
      this.setData({
        saveCount: null,
        ocrOrderDepList: null,
        ocrOrderDepIndex: -1,
      });
    }
  },

  /**
   * 统一的缓存同步函数 - 立即将订单数组同步到 Storage
   * 防止小程序异常退出时数据丢失
   * @param {Array} orders - 订单数组，如果不传则使用 this.data.orderArr
   */

  _saveToStorage: function (orders) {
    const orderArr = orders || this.data.orderArr;
    // 如果没有订单数据，跳过
    if (!orderArr || orderArr.length === 0) {
      return;
    }
    // 如果没有 ocrOrderDepList，初始化
    if (!this.data.ocrOrderDepList || !Array.isArray(this.data.ocrOrderDepList)) {
      this.setData({
        ocrOrderDepList: []
      });
    }
    // 如果没有 ocrOrderDepIndex 或小于 0，说明还没有保存过，需要初始化
    if (this.data.ocrOrderDepIndex === undefined || this.data.ocrOrderDepIndex === null || this.data.ocrOrderDepIndex < 0) {
      // 查找是否已经存在当前部门的缓存
      let existingIndex = -1;
      for (let i = 0; i < this.data.ocrOrderDepList.length; i++) {
        if (this.data.ocrOrderDepList[i].depId === this.data.depId) {
          existingIndex = i;
          break;
        }
      }
      if (existingIndex >= 0) {
        // 已存在，使用现有索引
        this.setData({
          ocrOrderDepIndex: existingIndex
        });
      } else {
        // 不存在，创建新的缓存项
        // 注意：这里设置 arr: [] 只是临时值，会在第2119行立即更新为实际的订单数据
        const newDepData = {
          depId: this.data.depId,
          depFatherId: this.data.depFatherId,
          depName: this.data.depName,
          arr: orderArr, // 直接使用订单数据，不创建空数组
          saveCount: null,
          strArr: [],
          nxArr: [],
          orderArrIndex: -1,
          searchStr: "",
          sourceType: this.data.sourceType || null, // 订单来源类型
          excelFile: this.data.excelFile || null, // Excel 文件信息
          imageList: this.data.imageList || [] // 图片列表
        };
        this.data.ocrOrderDepList.push(newDepData);
        this.setData({
          ocrOrderDepIndex: this.data.ocrOrderDepList.length - 1,
          ocrOrderDepList: this.data.ocrOrderDepList
        });
      }
    }
    try {
      // 更新内存中的数据
      this.data.ocrOrderDepList[this.data.ocrOrderDepIndex].depId = this.data.depId; // 确保 depId 正确
      this.data.ocrOrderDepList[this.data.ocrOrderDepIndex].depFatherId = this.data.depFatherId;
      this.data.ocrOrderDepList[this.data.ocrOrderDepIndex].depName = this.data.depName;
      this.data.ocrOrderDepList[this.data.ocrOrderDepIndex].arr = orderArr;
      // 同时保存搜索相关数据
      this.data.ocrOrderDepList[this.data.ocrOrderDepIndex].strArr = this.data.strArr || [];
      this.data.ocrOrderDepList[this.data.ocrOrderDepIndex].nxArr = this.data.nxArr || [];
      this.data.ocrOrderDepList[this.data.ocrOrderDepIndex].orderArrIndex = this.data.orderArrIndex !== undefined ? this.data.orderArrIndex : -1;
      this.data.ocrOrderDepList[this.data.ocrOrderDepIndex].searchStr = this.data.searchStr || "";
      this.data.ocrOrderDepList[this.data.ocrOrderDepIndex].saveCount = this.data.saveCount !== undefined ? this.data.saveCount : null;
      // 保存来源类型和相关文件信息
      this.data.ocrOrderDepList[this.data.ocrOrderDepIndex].sourceType = this.data.sourceType || null;
      this.data.ocrOrderDepList[this.data.ocrOrderDepIndex].excelFile = this.data.excelFile || null;
      this.data.ocrOrderDepList[this.data.ocrOrderDepIndex].imageList = this.data.imageList || [];
      // 立即同步到 Storage
      wx.setStorageSync('ocrOrderDepList', this.data.ocrOrderDepList);
    } catch (error) {
      if (error.message && error.message.includes('exceed storage item max length')) {
      }
    }
  },

  /**
   * 更新单个订单到缓存
   * @param {Object} order - 更新的订单对象
   */

  _updateStorage: function (order) {
    // 检查 orderArrIndex 是否有效
    if (this.data.orderArrIndex === undefined || this.data.orderArrIndex === null || this.data.orderArrIndex < 0) {
      return;
    }
    // 更新内存中的 orderArr（无论 ocrOrderDepIndex 是否有效，都要更新当前订单数组）
    // 使用合并方式，确保不丢失原有字段
    const currentOrder = this.data.orderArr[this.data.orderArrIndex];
    const mergedOrder = {
      ...currentOrder, // 先保留原有的所有字段
      ...order, // 然后用新字段覆盖
    };
    this.data.orderArr[this.data.orderArrIndex] = mergedOrder;
    var data = "orderArr[" + this.data.orderArrIndex + "]";
    this.setData({
      [data]: mergedOrder,
    });
    // 检查 ocrOrderDepIndex 是否有效
    if (this.data.ocrOrderDepIndex === undefined || this.data.ocrOrderDepIndex === null || this.data.ocrOrderDepIndex < 0) {
      // 即使 ocrOrderDepIndex 无效，也更新未保存订单状态
      this._updateHasUnsavedOrders();
      return;
    }
    // ocrOrderDepIndex 有效时，更新 ocrOrderDepList 和缓存
    var depData = "ocrOrderDepList[" + this.data.ocrOrderDepIndex + "].arr[" + this.data.orderArrIndex + "]";
    // 检查 ocrOrderDepList 是否存在且有效
    if (this.data.ocrOrderDepList && Array.isArray(this.data.ocrOrderDepList) && this.data.ocrOrderDepList[this.data.ocrOrderDepIndex]) {
      // 更新 ocrOrderDepList 中的数据（使用合并后的订单对象）
      this.data.ocrOrderDepList[this.data.ocrOrderDepIndex].arr[this.data.orderArrIndex] = mergedOrder;
      // 使用 setData 更新视图中的 ocrOrderDepList
      this.setData({
        [depData]: mergedOrder,
      });
      // 保存到缓存
      try {
        wx.setStorageSync('ocrOrderDepList', this.data.ocrOrderDepList);
      } catch (error) {
        if (error.message && error.message.includes('exceed storage item max length')) {
        }
      }
    } else {
    }
    // 更新未保存订单状态（单个订单更新后，需要重新检查整个数组）
    this._updateHasUnsavedOrders();
  },

  /**
   * 更新 hasUnsavedOrders 状态
   * 检查订单数组中是否有未保存的订单（status == -2）
   * @param {Array} orders - 订单数组，如果不传则使用 this.data.orderArr
   */

  _updateHasUnsavedOrders: function (orders) {
    const orderArr = orders || this.data.orderArr || [];
    const hasUnsavedOrders = orderArr.some(order => order && order.nxDoStatus === -2);
    // 注意：ocrOrder 不需要 hasUnsavedOrders 字段（因为 UI 中没有显示），这里只做检查
    return hasUnsavedOrders;
  },
  // ==================== 八、任务队列管理系统 ====================
  // ==================== 简化版任务缓存（最简单的实现）====================

  /**
   * 解码部门名称（如果它是 URL 编码的）
   * @param {String} depName - 部门名称（可能是 URL 编码的）
   * @returns {String} 解码后的部门名称
   */

  _decodeDepName: function (depName) {
    if (!depName) return depName;
    try {
      // 如果 depName 是 URL 编码的（包含 % 符号），解码它
      if (depName.includes('%')) {
        const decoded = decodeURIComponent(depName);
        // 检查是否包含中文字符，如果解码后包含中文，说明解码成功
        if (/[\u4e00-\u9fa5]/.test(decoded)) {
          return decoded;
        }
      }
      return depName; // 如果不是编码的或解码失败，返回原始值
    } catch (e) {
      // 如果解码失败，返回原始值
      return depName;
    }
  },

  /**
   * 简化版：添加任务到缓存（使用指定的任务ID）
   * @param {String} depId - 部门ID
   * @param {String} type - 任务类型：'image' 或 'excel'
   * @param {String} taskId - 任务ID（由 _addTaskToQueue 生成）
   */

  _simpleAddTaskWithId: function (depId, type, taskId) {
    // 使用最新的任务列表（避免 setData 异步导致的数据不一致）
    const currentTaskList = this.data.simpleTaskList || [];
    // 检查该部门是否已有任务
    const existingTask = currentTaskList.find(
      task => String(task.depId) === String(depId)
    );
    if (existingTask) {
      return; // 已存在，不重复添加
    }
    // 从复杂任务队列中获取任务信息（包含 imageList/excelFile）
    const complexTask = this.data.recognizeTaskMap[taskId] ||
      this.data.recognizeTaskQueue.find(t => t.taskId === taskId);
    // 创建简单任务对象（使用传入的任务ID）
    // ⚠️ 只存储执行必需的字段，不重复存储其他字段
    // ⚠️ 解码 depName（如果它是 URL 编码的）
    let depName = complexTask?.depName || this.data.depName;
    if (depName) {
      try {
        // 如果 depName 是 URL 编码的，解码它
        const decoded = decodeURIComponent(depName);
        // 检查是否包含中文字符，如果解码后包含中文，说明解码成功
        if (/[\u4e00-\u9fa5]/.test(decoded)) {
          depName = decoded;
        }
      } catch (e) {
        // 如果解码失败，使用原始值
      }
    }
    const task = {
      taskId: taskId,
      depId: depId,
      depFatherId: complexTask?.depFatherId || null, // 父部门ID
      type: type, // 'image' 或 'excel'
      status: 'pending', // 初始状态：pending（待执行）
      // 存储执行必需的信息
      imageList: complexTask?.imageList || null, // 图片任务需要
      excelFile: complexTask?.excelFile || null, // Excel任务需要
      depName: depName // 用于显示提示（已解码）
    };
    // 添加到任务列表
    const taskList = [...currentTaskList];
    taskList.push(task);
    // 同步更新 this.data（确保后续操作使用最新数据）
    this.data.simpleTaskList = taskList;
    this.setData({
      simpleTaskList: taskList
    });
    // 保存到本地存储
    this._simpleSaveTasks();
    // 尝试执行任务（并发控制）
    this._simpleExecuteTasks();
  },

  /**
   * 简化版：删除任务（接口成功时调用）
   * @param {String} taskId - 任务ID
   */

  _simpleRemoveTask: function (taskId) {
    // 从任务列表中移除
    const taskList = this.data.simpleTaskList.filter(task => task.taskId !== taskId);
    this.setData({
      simpleTaskList: taskList
    });
    // 保存到本地存储
    this._simpleSaveTasks();
  },

  /**
   * 简化版：根据部门ID删除该部门的所有任务（接口成功时调用）
   * @param {String} depId - 部门ID
   */

  _simpleRemoveTaskByDepId: function (depId) {
    if (!depId) {
      return;
    }
    // ⚠️ 重要：从本地存储读取最新的任务列表（而不是使用 this.data.simpleTaskList）
    // 因为可能有多个页面实例，每个页面的 this.data 是独立的
    let currentTaskList = [];
    try {
      currentTaskList = wx.getStorageSync('simpleTaskList') || [];
    } catch (error) {
      currentTaskList = this.data.simpleTaskList || [];
    }
    // 从任务列表中移除该部门的所有任务
    const taskList = currentTaskList.filter(task => {
      const match = String(task.depId) === String(depId);
      if (match) {
      }
      return !match;
    });
    const removedCount = currentTaskList.length - taskList.length;
    if (removedCount === 0) {
    }
    // 同步更新 this.data（确保当前页面使用最新数据）
    this.data.simpleTaskList = taskList;
    this.setData({
      simpleTaskList: taskList
    });
    // 保存到本地存储（使用过滤后的 taskList）
    if (taskList.length > 0) {
      wx.setStorageSync('simpleTaskList', taskList);
    } else {
      wx.removeStorageSync('simpleTaskList');
    }
  },

  /**
   * 简化版：保存任务列表到本地存储
   */

  _simpleSaveTasks: function () {
    try {
      const taskList = this.data.simpleTaskList || [];
      if (taskList.length > 0) {
        wx.setStorageSync('simpleTaskList', taskList);
      } else {
        wx.removeStorageSync('simpleTaskList');
      }
    } catch (error) {
    }
  },

  /**
   * 简化版：从本地存储加载任务列表
   */

  _simpleLoadTasks: function () {
    try {
      const taskList = wx.getStorageSync('simpleTaskList') || [];
      this.setData({
        simpleTaskList: taskList
      });
    } catch (error) {
      this.setData({
        simpleTaskList: []
      });
    }
  },

  /**
   * 简化版：检查任务缓存中是否有当前部门的任务
   * 如果有，说明还在请求中，设置 currentStep = 'recognizing'
   */

  _checkSimpleTaskForCurrentDep: function () {
    const currentDepId = this.data.depId;
    if (!currentDepId) {
      return;
    }
    const taskList = this.data.simpleTaskList || [];
    // 检查是否有当前部门的任务（使用字符串比较，避免类型不一致）
    const hasCurrentDepTask = taskList.some(task => String(task.depId) === String(currentDepId));
    if (hasCurrentDepTask) {
      this.setData({
        currentStep: 'recognizing',
        recognizing: true
      });
    } else {
    }
  },

  /**
   * 启动任务检查定时器（每10秒检查一次任务状态）
   */
  _startTaskCheckTimer: function () {
    // 如果定时器已存在，先清除
    this._stopTaskCheckTimer();
    // 启动定时器，每10秒检查一次
    this.taskCheckTimer = setInterval(() => {
      this._checkTaskAndLoadCache();
    }, 10000); // 10秒 = 10000毫秒
  },

  /**
   * 停止任务检查定时器
   */
  _stopTaskCheckTimer: function () {
    if (this.taskCheckTimer) {
      clearInterval(this.taskCheckTimer);
      this.taskCheckTimer = null;
    }
  },

  /**
   * 检查任务状态并加载缓存订单（定时器回调）
   */
  _checkTaskAndLoadCache: function () {
    const currentDepId = this.data.depId;
    if (!currentDepId) {
      return;
    }
    // 从本地存储读取最新任务列表
    let currentTaskList = [];
    try {
      currentTaskList = wx.getStorageSync('simpleTaskList') || [];
    } catch (error) {
      currentTaskList = this.data.simpleTaskList || [];
    }
    // 检查是否有当前部门的 pending 或 running 任务
    const hasActiveTask = currentTaskList.some(task => 
      String(task.depId) === String(currentDepId) && 
      (task.status === 'pending' || task.status === 'running')
    );
    // 如果没有活跃任务，说明任务已完成，订单应该在缓存中
    if (!hasActiveTask) {
      // 停止定时器
      this._stopTaskCheckTimer();
      // 从缓存加载订单数据
      this._loadCacheAndUpdateUI();
    }
  },

  /**
   * 从缓存加载订单并更新UI
   */
  _loadCacheAndUpdateUI: function () {
    const currentDepId = this.data.depId;
    if (!currentDepId) {
      return;
    }
    // 从缓存中读取订单数据
    var ocrOrderDepList = wx.getStorageSync("ocrOrderDepList");
    if (!ocrOrderDepList || !Array.isArray(ocrOrderDepList)) {
      // 没有缓存数据，返回上传页面
      this.setData({
        currentStep: 'upload',
        recognizing: false,
        orderArr: []
      });
      return;
    }
    // 查找当前部门的缓存数据
    var depData = null;
    var depIndex = -1;
    for (var i = 0; i < ocrOrderDepList.length; i++) {
      if (String(ocrOrderDepList[i].depId) === String(currentDepId)) {
        depData = ocrOrderDepList[i];
        depIndex = i;
        break;
      }
    }
    if (!depData || !depData.arr || depData.arr.length === 0) {
      // 没有订单数据，返回上传页面
      this.setData({
        currentStep: 'upload',
        recognizing: false,
        orderArr: []
      });
      return;
    }
    // 确保每个订单都有原始商品名称字段（兼容旧数据）
    let orders = depData.arr.map((order) => {
      if (order && !order.nxDoGoodsNameOriginal) {
        return {
          ...order,
          nxDoGoodsNameOriginal: order.nxDoGoodsName || ''
        };
      }
      return order;
    });
    // 恢复搜索相关数据
    const searchData = depData;
    // 初始化图片变换状态列表
    const imageList = searchData.imageList || [];
    const { windowWidth, windowHeight } = wx.getWindowInfo();
    const CANVAS_SCALE = 3;
    const defaultWidth = windowWidth * 0.9;
    const defaultHeight = Math.round(windowHeight * 0.8);
    const imageTransformList = imageList.map(() => ({
      scale: 1,
      width: defaultWidth,
      height: defaultHeight
    }));
    // 更新UI：显示订单确认页面
    this.setData({
      ocrOrderDepIndex: depIndex,
      orderArr: orders,
      saveCount: depData.saveCount !== undefined ? depData.saveCount : null,
      currentStep: 'confirm',
      recognizing: false,
      // 恢复搜索相关数据
      strArr: searchData.strArr || [],
      nxArr: searchData.nxArr || [],
      searchStr: searchData.searchStr || "",
      // 恢复来源类型和相关文件信息
      sourceType: searchData.sourceType || null,
      excelFile: searchData.excelFile || null,
      imageList: imageList,
      imageTransformList: imageTransformList
    }, () => {
      // 显示成功提示
      wx.showToast({
        title: '识别完成',
        icon: 'success',
        duration: 2000
      });
    });
  },

  /**
   * 简化版：执行任务（并发控制，最多2个同时执行）
   */

  _simpleExecuteTasks: function () {
    // 从本地存储读取最新任务列表
    let currentTaskList = [];
    try {
      currentTaskList = wx.getStorageSync('simpleTaskList') || [];
    } catch (error) {
      currentTaskList = this.data.simpleTaskList || [];
    }
    // 统计运行中的任务数量
    const runningTasks = currentTaskList.filter(t => t.status === 'running');
    const runningCount = runningTasks.length;
    // 如果已达到最大并发数，等待
    if (runningCount >= this.data.simpleMaxConcurrent) {
      return;
    }
    // 查找待执行的任务（status === 'pending'）
    const pendingTask = currentTaskList.find(t => t.status === 'pending');
    if (!pendingTask) {
      return;
    }
    // 更新任务状态为 running
    pendingTask.status = 'running';
    // 同步更新 this.data 和本地存储
    this.data.simpleTaskList = currentTaskList;
    this.setData({
      simpleTaskList: currentTaskList
    });
    this._simpleSaveTasks();
    // 执行任务（根据类型调用不同的识别方法）
    if (pendingTask.type === 'image') {
      this._simpleExecuteImageTask(pendingTask);
    } else if (pendingTask.type === 'excel') {
      this._simpleExecuteExcelTask(pendingTask);
    }
  },

  /**
   * 简化版：执行图片识别任务
   */

  _simpleExecuteImageTask: async function (task) {
    const taskId = task.taskId;
    try {
      let complexTask = null;
      // ⚠️ 优先级1：优先使用简化版任务中存储的信息
      if (task.imageList && task.imageList.length > 0) {
        complexTask = {
          taskId: task.taskId,
          depId: task.depId,
          depName: task.depName,
          depFatherId: task.depFatherId,
          type: 'image',
          imageList: task.imageList, // ✅ 直接使用简化版任务中的信息
          status: 'running'
        };
      }
      // ⚠️ 优先级2：从复杂任务队列中查找
      else {
        complexTask = this.data.recognizeTaskMap[taskId] ||
          this.data.recognizeTaskQueue.find(t => t.taskId === taskId);
        if (complexTask && complexTask.imageList && complexTask.imageList.length > 0) {
          // ⚠️ 重要：确保使用任务对象中的 depId 和 depFatherId（而不是复杂任务队列中可能过时的值）
          complexTask.depId = task.depId;
          complexTask.depFatherId = task.depFatherId || complexTask.depFatherId;
          complexTask.depName = task.depName || complexTask.depName;
        }
      }
      // ⚠️ 优先级3：从当前页面的 data 中获取（兜底方案）
      if (!complexTask || !complexTask.imageList || complexTask.imageList.length === 0) {
        // 检查当前页面是否有图片列表（且 depId 匹配）
        if (String(this.data.depId) === String(task.depId) &&
          this.data.imageList && this.data.imageList.length > 0) {
          // 创建临时任务对象
          complexTask = {
            taskId: taskId,
            depId: task.depId,
            depName: task.depName,
            depFatherId: task.depFatherId,
            type: 'image',
            imageList: [...this.data.imageList],
            status: 'running'
          };
        } else {
          throw new Error('任务信息不完整，无法执行（找不到图片列表）');
        }
      }
      // ⚠️ 重要：将任务添加到 recognizeTaskMap，确保 _executeImageRecognition 能正确检查任务状态
      if (!this.data.recognizeTaskMap[taskId]) {
        this.data.recognizeTaskMap[taskId] = complexTask;
      }
      // ⚠️ 关键：更新 recognizeTaskMap 中的任务状态为 running，确保 _executeImageRecognition 不会取消任务
      this.data.recognizeTaskMap[taskId].status = 'running';
      // 同时更新 recognizeTaskQueue 中的任务状态（如果存在）
      const queueTask = this.data.recognizeTaskQueue.find(t => t.taskId === taskId);
      if (queueTask) {
        queueTask.status = 'running';
      }
      // 如果当前客户匹配，显示识别界面
      if (String(this.data.depId) === String(task.depId)) {
        this.setData({
          recognizing: true,
          currentStep: 'recognizing',
          recognizeProgress: 0
        });
      }
      // 执行图片识别（调用原有的复杂任务执行方法）
      await this._executeImageRecognition(complexTask);
    } catch (error) {
      this._simpleOnTaskFailed(taskId, error);
    }
  },

  /**
   * 简化版：执行 Excel 识别任务
   */

  _simpleExecuteExcelTask: async function (task) {
    const taskId = task.taskId;
    try {
      let complexTask = null;
      // ⚠️ 优先级1：优先使用简化版任务中存储的信息
      if (task.excelFile) {
        complexTask = {
          taskId: task.taskId,
          depId: task.depId,
          depName: task.depName,
          depFatherId: task.depFatherId,
          type: 'excel',
          excelFile: task.excelFile, // ✅ 直接使用简化版任务中的信息
          status: 'running'
        };
      }
      // ⚠️ 优先级2：从复杂任务队列中查找
      else {
        complexTask = this.data.recognizeTaskMap[taskId] ||
          this.data.recognizeTaskQueue.find(t => t.taskId === taskId);
        if (complexTask && complexTask.excelFile) {
          // ⚠️ 重要：确保使用任务对象中的 depId 和 depFatherId（而不是复杂任务队列中可能过时的值）
          complexTask.depId = task.depId;
          complexTask.depFatherId = task.depFatherId || complexTask.depFatherId;
          complexTask.depName = task.depName || complexTask.depName;
        }
      }
      // ⚠️ 优先级3：从当前页面的 data 中获取（兜底方案）
      if (!complexTask || !complexTask.excelFile) {
        // 检查当前页面是否有 Excel 文件（且 depId 匹配）
        if (String(this.data.depId) === String(task.depId) && this.data.excelFile) {
          // 创建临时任务对象
          complexTask = {
            taskId: taskId,
            depId: task.depId,
            depName: task.depName,
            depFatherId: task.depFatherId,
            type: 'excel',
            excelFile: {
              ...this.data.excelFile
            },
            status: 'running'
          };
        } else {
          throw new Error('任务信息不完整，无法执行（找不到 Excel 文件）');
        }
      }
      // ⚠️ 重要：将任务添加到 recognizeTaskMap，确保 _executeExcelRecognition 能正确检查任务状态
      if (!this.data.recognizeTaskMap[taskId]) {
        this.data.recognizeTaskMap[taskId] = complexTask;
      }
      // 如果当前客户匹配，显示识别界面
      if (String(this.data.depId) === String(task.depId)) {
        this.setData({
          recognizing: true,
          currentStep: 'recognizing',
          recognizeProgress: 0
        });
      }
      // 执行 Excel 识别（调用原有的复杂任务执行方法）
      await this._executeExcelRecognition(complexTask);
    } catch (error) {
      this._simpleOnTaskFailed(taskId, error);
    }
  },

  /**
   * 简化版：任务完成处理
   * @param {String} taskId - 任务ID
   * @param {Object} result - 识别结果（可选，如果提供则调用完整处理逻辑）
   */

  _simpleOnTaskComplete: function (taskId, result) {
    // 从本地存储读取最新任务列表
    let currentTaskList = [];
    try {
      currentTaskList = wx.getStorageSync('simpleTaskList') || [];
    } catch (error) {
      currentTaskList = this.data.simpleTaskList || [];
    }
    // 更新任务状态为 completed
    const task = currentTaskList.find(t => t.taskId === taskId);
    if (task) {
      task.status = 'completed';
      // 同步更新 this.data 和本地存储
      this.data.simpleTaskList = currentTaskList;
      this.setData({
        simpleTaskList: currentTaskList
      });
      this._simpleSaveTasks();
      // ⚠️ 如果提供了识别结果，调用完整处理逻辑（保存订单、更新UI）
      if (result) {
        const taskInfo = {
          taskId: task.taskId,
          depId: task.depId,
          depName: task.depName,
          type: task.type,
          imageList: task.imageList || [],
          excelFile: task.excelFile || null
        };
        this._saveOrderAndUpdateUI(taskInfo, result);
      }
    }
    // 执行下一个任务
    this._simpleExecuteTasks();
  },

  /**
   * 保存订单并更新UI（从复杂版提取的独立方法）
   * @param {Object} taskInfo - 任务信息 {taskId, depId, depName, type, imageList, excelFile}
   * @param {Object} result - 识别结果 {type, savedOrders, items}
   */

  _saveOrderAndUpdateUI: function (taskInfo, result) {
    // ⚠️ 步骤1：保存订单数据到缓存
    this._saveTaskResultToStorage(taskInfo, result);
    // ⚠️ 步骤3：更新UI（如果当前客户匹配）
    // 准备订单数据（如果当前客户匹配）
    let orderUpdateData = {};
    // ⚠️ 使用字符串比较，避免类型不一致问题
    if (String(this.data.depId) === String(taskInfo.depId)) {
      const orders = result.type === 'saved' ? (result.savedOrders || []) : (result.items || []);
      const saveCount = result.type === 'saved' ? orders.length : null;
      // 清除任务检查定时器（任务已完成）
      this._stopTaskCheckTimer();
      orderUpdateData = {
        recognizing: false,
        currentStep: 'confirm',
        orderArr: orders,
        saveCount: saveCount,
        sourceType: taskInfo.type === 'image' ? 'image' : 'excel',
        excelFile: taskInfo.excelFile || null,
        imageList: taskInfo.imageList || []
      };
      // 更新UI
      this.setData(orderUpdateData, () => {
        // 显示成功提示
        wx.showToast({
          title: saveCount ? '识别并保存完成' : '识别完成',
          icon: 'success'
        });
      });
    } else {
      // 显示通知
      wx.showToast({
        title: `${taskInfo.depName}的识别已完成`,
        icon: 'success',
        duration: 2000
      });
    }
  },

  /**
   * 简化版：任务失败处理
   */

  _simpleOnTaskFailed: function (taskId, error) {
    // 从本地存储读取最新任务列表
    let currentTaskList = [];
    try {
      currentTaskList = wx.getStorageSync('simpleTaskList') || [];
    } catch (error) {
      currentTaskList = this.data.simpleTaskList || [];
    }
    // 移除失败的任务
    const taskList = currentTaskList.filter(t => t.taskId !== taskId);
    // 同步更新 this.data 和本地存储
    this.data.simpleTaskList = taskList;
    this.setData({
      simpleTaskList: taskList
    });
    this._simpleSaveTasks();
    // 执行下一个任务
    this._simpleExecuteTasks();
  },
  // ==================== 原有复杂任务队列管理系统 ====================

  /**
   * 添加任务到队列
   * @param {Object} taskInfo - 任务信息
   * @returns {String} taskId - 任务ID
   */

  _addTaskToQueue: function (taskInfo) {
    const taskId = `${Date.now()}_${taskInfo.depId}`;
    // 检查队列中是否已有相同客户的任务
    // ⚠️ 使用字符串比较，避免类型不一致问题
    const existingTask = this.data.recognizeTaskQueue.find(
      task => String(task.depId) === String(taskInfo.depId) &&
        (task.status === 'pending' || task.status === 'running')
    );
    if (existingTask) {
      wx.showModal({
        title: '提示',
        content: `客户"${taskInfo.depName}"已有识别任务在队列中，请等待完成后再试`,
        showCancel: false,
        confirmText: '知道了'
      });
      return null;
    }
    // 创建任务对象
    const task = {
      taskId: taskId,
      depId: taskInfo.depId,
      depName: taskInfo.depName,
      depFatherId: taskInfo.depFatherId,
      type: taskInfo.type, // 'image' | 'excel'
      status: 'pending',
      progress: 0,
      imageList: taskInfo.imageList || [], // 图片路径已经是持久化路径
      excelFile: taskInfo.excelFile || null,
      startTime: Date.now(),
      result: null,
      error: null
    };
    // 添加到队列
    const queue = [...this.data.recognizeTaskQueue];
    queue.push(task);
    this.setData({
      recognizeTaskQueue: queue
    });
    // 保存到任务映射表
    this.data.recognizeTaskMap[taskId] = task;
    // 保存到 Storage
    // this._saveTaskQueue();
    // ⚠️ 不再在这里执行任务，避免重复执行
    // 任务会通过 _simpleAddTaskWithId -> _simpleExecuteTasks 来执行
    // this._executeTasks();
    return taskId;
  },

  /**
   * 根据队列实时计算运行中任务列表（单一事实来源）
   * @returns {Array} 运行中任务的ID列表
   */

  _getRunningTaskIds: function () {
    return this.data.recognizeTaskQueue
      .filter(t => t.status === 'running')
      .map(t => t.taskId);
  },

  /**
   * 执行任务（简化版）
   */

  _executeTasks: function () {
    // 找到待执行的任务
    const pendingTask = this.data.recognizeTaskQueue.find(task => task.status === 'pending');
    if (!pendingTask) {
      return; // 没有待执行的任务
    }
    // 更新任务状态为运行中
    pendingTask.status = 'running';
    this.data.recognizeTaskMap[pendingTask.taskId] = pendingTask;
    // 更新页面状态
    this.setData({
      recognizeTaskQueue: this.data.recognizeTaskQueue,
      recognizeTaskRunning: [pendingTask.taskId]
    });
    // 调用识别方法
    if (pendingTask.type === 'image') {
      this._executeImageRecognition(pendingTask);
    } else if (pendingTask.type === 'excel') {
      this._executeExcelRecognition(pendingTask);
    }
  },

  /**
   * 任务完成处理
   * @param {String} taskId - 任务ID
   * @param {Object} result - 识别结果
   */

  _onTaskComplete: function (taskId, result) {
    // ⚠️ 并发锁：防止多个任务同时执行完成逻辑
    // if (this.data._taskCompleteLock) {
    //   
    //   // 延迟重试
    //   setTimeout(() => {r
    //     this._onTaskComplete(taskId, result);
    //   }, 100);
    //   return;
    // }
    // 加锁
    this.data._taskCompleteLock = true;
    try {
      // 先获取任务信息（在删除映射表之前）
      const task = this.data.recognizeTaskMap[taskId];
      if (!task) {
        // ⚠️ 即使任务不在映射表中，也要尝试从简化版任务列表中获取信息并处理
        const simpleTask = this.data.simpleTaskList.find(t => t.taskId === taskId);
        if (simpleTask && result) {
          const taskInfo = {
            taskId: simpleTask.taskId,
            depId: simpleTask.depId,
            depName: simpleTask.depName,
            type: simpleTask.type,
            imageList: simpleTask.imageList || [],
            excelFile: simpleTask.excelFile || null
          };
          // 删除简化版任务
          if (taskInfo.depId) {
            this._simpleRemoveTaskByDepId(taskInfo.depId);
          }
          // 调用完整处理逻辑
          this._saveOrderAndUpdateUI(taskInfo, result);
        }
        return;
      }
      // 简化版：接口成功，删除任务（使用任务的 depId，而不是 this.data.depId）
      if (task.depId) {
        this._simpleRemoveTaskByDepId(task.depId);
      }
      // 简化版：任务完成处理（传递识别结果，触发完整处理逻辑）
      this._simpleOnTaskComplete(taskId, result);
      // ⚠️ 关键修复：先更新任务状态，再同步更新 this.data 中的队列
      // 这样确保其他并发任务在获取快照时能看到最新的状态
      task.status = 'completed';
      task.progress = 100;
      task.result = result;
      // ⚠️ 关键修复：同步更新 this.data.recognizeTaskQueue 中对应任务的状态
      // 这样其他并发任务在获取快照时能看到最新的状态
      const queueIndex = this.data.recognizeTaskQueue.findIndex(t => t.taskId === taskId);
      if (queueIndex >= 0) {
        this.data.recognizeTaskQueue[queueIndex].status = 'completed';
        this.data.recognizeTaskQueue[queueIndex].progress = 100;
        this.data.recognizeTaskQueue[queueIndex].result = result;
      }
      // ⚠️ 关键修复：先删除映射表，再获取快照
      // 这样可以确保其他并发任务在获取快照时，能看到映射表已经被删除
      // 从任务映射表中移除（释放内存，防止 OOM）
      delete this.data.recognizeTaskMap[taskId];
      // ⚠️ 核心修复：避免依赖 this.data 进行过滤，使用函数式更新
      // ⚠️ 重要：先同步更新 this.data 和删除映射表，确保其他并发任务能看到最新状态
      // 然后再获取快照（此时状态已经更新，映射表已经删除）
      // ⚠️ 先获取当前队列的快照和映射表的快照，然后进行过滤
      const currentQueue = [...this.data.recognizeTaskQueue];
      const currentMap = {
        ...this.data.recognizeTaskMap
      };
      // ⚠️ 多重过滤：1. 移除当前任务 2. 容错：强制过滤掉所有 completed/failed 状态的任务
      // 3. ⚠️ 关键修复：过滤掉所有不在映射表中的任务（说明已被其他任务删除）
      // 4. ⚠️ 关键修复：检查映射表中的任务状态，如果状态是 completed/failed，也要移除
      const queue = currentQueue.filter(t => {
        // 移除当前任务
        if (t.taskId === taskId) {
          return false;
        }
        // ⚠️ 容错：如果因为异步原因导致任务状态更新了但没移除，强制将其剔除
        if (t.status === 'completed' || t.status === 'failed') {
          return false;
        }
        // ⚠️ 关键修复：如果任务不在映射表中，说明已被其他任务删除，强制移除
        if (!currentMap[t.taskId]) {
          return false;
        }
        // ⚠️ 关键修复：检查映射表中的任务状态，如果状态是 completed/failed，也要移除
        const mapTask = currentMap[t.taskId];
        if (mapTask && (mapTask.status === 'completed' || mapTask.status === 'failed')) {
          return false;
        }
        return true;
      });
      const removed = currentQueue.length - queue.length;
      if (removed > 0) {
      } else {
      }
      // ⚠️ 重要：先同步更新 this.data，确保后续操作使用最新数据
      this.data.recognizeTaskQueue = queue;
      // ⚠️ 核心改进：基于队列实时计算运行中任务列表（单一事实来源）
      // 不再手动维护 runningList，而是从 queue 中实时计算
      const runningList = queue
        .filter(t => t.status === 'running')
        .map(t => t.taskId);
      this.data.recognizeTaskRunning = runningList;
      // ⚠️ 映射表校验：在删除任务之前保存完整的任务信息，用于后续 UI 更新判断
      const taskInfo = {
        taskId: task.taskId,
        depId: task.depId,
        depName: task.depName,
        type: task.type,
        imageList: task.imageList,
        excelFile: task.excelFile
      };
      // ⚠️ 映射表已经在上面删除了，这里只需要记录过滤后的状态
      // 原子化 setData：在一个 setData 中同时更新两个关键数组
      // ⚠️ 强制状态联动：只要运行列表清空了，识别遮罩层必须关闭
      const newRecognizing = runningList.length > 0;
      // ⚠️ 简化逻辑：先保存订单，再合并更新UI和队列状态
      // 这样可以确保订单数据不会被后续的 setData 覆盖
      this._saveTaskResultToStorage(taskInfo, result);
      // ⚠️ 步骤3：合并更新UI和队列状态（避免 setData 互相覆盖）
      // 准备订单数据（如果当前客户匹配）
      let orderUpdateData = {};
      // ⚠️ 使用字符串比较，避免类型不一致问题
      if (String(this.data.depId) === String(taskInfo.depId)) {
        const orders = result.type === 'saved' ? (result.savedOrders || []) : (result.items || []);
        const saveCount = result.type === 'saved' ? orders.length : null;
        // 清除任务检查定时器（任务已完成）
        this._stopTaskCheckTimer();
        orderUpdateData = {
          recognizing: false,
          currentStep: 'confirm',
          orderArr: orders,
          saveCount: saveCount,
          sourceType: taskInfo.type === 'image' ? 'image' : 'excel',
          excelFile: taskInfo.excelFile || null,
          imageList: taskInfo.imageList || []
        };
      } else {
        // 显示通知
        wx.showToast({
          title: `${taskInfo.depName}的识别已完成`,
          icon: 'success',
          duration: 2000
        });
      }
      // 合并队列状态更新
      const mergedUpdateData = {
        ...orderUpdateData,
        recognizeTaskQueue: queue,
        recognizeTaskRunning: runningList,
        recognizing: newRecognizing // ⚠️ 如果订单数据已设置 recognizing: false，这里会被覆盖
      };
      // 如果订单数据中设置了 recognizing: false，优先使用订单数据的值
      if (orderUpdateData.recognizing === false) {
        mergedUpdateData.recognizing = false;
      }
      this.setData(mergedUpdateData, () => {
        // 验证数据是否正确设置
        if (this.data.depId === taskInfo.depId) {
          if (!this.data.orderArr || this.data.orderArr.length === 0) {
          } else {
          }
          if (this.data.currentStep !== 'confirm') {
          } else {
          }
          if (this.data.recognizing !== false) {
          } else {
          }
        }
        // 如果当前客户匹配，显示成功提示
        if (this.data.depId === taskInfo.depId && mergedUpdateData.orderArr) {
          wx.showToast({
            title: mergedUpdateData.saveCount ? '识别并保存完成' : '识别完成',
            icon: 'success'
          });
        }
      });
      // ⚠️ 重要：立即验证 setData 是否成功（不等待回调）
      // ⚠️ 移除：任务成功完成时不需要保存队列（订单数据已保存到 ocrOrderDepList）
      // 失败的任务也不需要保存（用户会重新选择图片）
      // 
      // this._saveTaskQueue();
      // 
      // 继续执行下一个任务
      this._executeTasks();
    } finally {
      // 释放锁
      this.data._taskCompleteLock = false;
    }
  },

  /**
   * 任务失败处理
   * @param {String} taskId - 任务ID
   * @param {Error} error - 错误信息
   */

  _onTaskFailed: function (taskId, error) {
    // ⚠️ 并发锁：防止多个任务同时执行失败逻辑
    if (this.data._taskCompleteLock) {
      // 延迟重试
      setTimeout(() => {
        this._onTaskFailed(taskId, error);
      }, 100);
      return;
    }
    // 加锁
    this.data._taskCompleteLock = true;
    try {
      const task = this.data.recognizeTaskMap[taskId];
      if (!task) {
        return;
      }
      // 简化版：任务失败处理
      this._simpleOnTaskFailed(taskId, error);
      // ⚠️ 关键修复：先更新任务状态，再同步更新 this.data 中的队列
      // 这样确保其他并发任务在获取快照时能看到最新的状态
      task.status = 'failed';
      task.error = error.message || '识别失败';
      // ⚠️ 关键修复：同步更新 this.data.recognizeTaskQueue 中对应任务的状态
      // 这样其他并发任务在获取快照时能看到最新的状态
      const queueIndex = this.data.recognizeTaskQueue.findIndex(t => t.taskId === taskId);
      if (queueIndex >= 0) {
        this.data.recognizeTaskQueue[queueIndex].status = 'failed';
        this.data.recognizeTaskQueue[queueIndex].error = error.message || '识别失败';
      }
      // ⚠️ 核心修复：避免依赖 this.data 进行过滤，使用函数式更新
      // ⚠️ 重要：先同步更新 this.data，确保其他并发任务能看到最新状态
      // 然后再获取快照（此时状态已经更新）
      // 注意：这里不删除映射表，因为其他任务需要用它来判断任务是否已被删除
      // ⚠️ 先获取当前队列的快照和映射表的快照，然后进行过滤
      const currentQueue = [...this.data.recognizeTaskQueue];
      const currentMap = {
        ...this.data.recognizeTaskMap
      };
      // ⚠️ 多重过滤：1. 移除当前任务 2. 容错：强制过滤掉所有 completed/failed 状态的任务
      // 3. ⚠️ 关键修复：过滤掉所有不在映射表中的任务（说明已被其他任务删除）
      const queue = currentQueue.filter(t => {
        // 移除当前任务
        if (t.taskId === taskId) {
          return false;
        }
        // ⚠️ 容错：如果因为异步原因导致任务状态更新了但没移除，强制将其剔除
        if (t.status === 'completed' || t.status === 'failed') {
          return false;
        }
        // ⚠️ 关键修复：如果任务不在映射表中，说明已被其他任务删除，强制移除
        if (!currentMap[t.taskId]) {
          return false;
        }
        return true;
      });
      const removed = currentQueue.length - queue.length;
      if (removed > 0) {
      } else {
      }
      // ⚠️ 映射表校验：在删除任务之前保存完整的任务信息，用于后续 UI 更新判断
      const taskInfo = {
        taskId: task.taskId,
        depId: task.depId,
        depName: task.depName,
        type: task.type,
        error: task.error
      };
      // 从任务映射表中移除（释放内存，防止 OOM）
      delete this.data.recognizeTaskMap[taskId];
      // ⚠️ 重要：先同步更新 this.data，确保后续操作使用最新数据
      this.data.recognizeTaskQueue = queue;
      // ⚠️ 核心改进：基于队列实时计算运行中任务列表（单一事实来源）
      const runningList = queue
        .filter(t => t.status === 'running')
        .map(t => t.taskId);
      this.data.recognizeTaskRunning = runningList;
      // 原子化 setData：在一个 setData 中同时更新两个关键数组
      // ⚠️ 强制状态联动：只要运行列表清空了，识别遮罩层必须关闭
      const newRecognizing = runningList.length > 0;
      this.setData({
        recognizeTaskQueue: queue,
        recognizeTaskRunning: runningList,
        recognizing: newRecognizing // ⚠️ 强制状态联动
      }, () => {
        // 闭包安全：在 setData 的回调中执行后续操作
        // ⚠️ 映射表校验：只有任务不在 map 中（已被删除），才更新 UI
        // 如果任务还在 map 中，说明可能已被其他任务覆盖，不更新 UI
        const taskStillInMap = this.data.recognizeTaskMap[taskId] !== undefined;
        if (!taskStillInMap) {
          // 如果当前客户是任务所属客户，显示错误提示
          if (this.data.depId === taskInfo.depId) {
            // 清除任务检查定时器（任务已失败）
            this._stopTaskCheckTimer();
            this.setData({
              recognizing: false,
              currentStep: 'upload'
            });
            load.hideLoading();
            wx.showToast({
              title: taskInfo.error,
              icon: 'none',
              duration: 3000
            });
          }
        } else {
        }
        // ⚠️ 移除：任务失败时不需要保存队列（用户会重新选择图片，重新操作）
        // this._saveTaskQueue();
        // 继续执行下一个任务（闭包安全：确保当前任务彻底清理干净了，才会去拉取下一个任务）
        this._executeTasks();
      });
    } finally {
      // 释放锁
      this.data._taskCompleteLock = false;
    }
  },

  /**
   * 更新任务进度
   * @param {String} taskId - 任务ID
   * @param {Number} progress - 进度 0-100
   */

  _updateTaskProgress: function (taskId, progress) {
    const task = this.data.recognizeTaskMap[taskId];
    if (!task) return;
    task.progress = Math.min(100, Math.max(0, progress));
    // 更新队列
    const queue = [...this.data.recognizeTaskQueue];
    const taskIndex = queue.findIndex(t => t.taskId === taskId);
    if (taskIndex >= 0) {
      queue[taskIndex] = task;
    }
    this.setData({
      recognizeTaskQueue: queue
    });
    // 如果当前客户是任务所属客户，更新界面
    // ⚠️ 使用字符串比较，避免类型不一致问题
    if (String(this.data.depId) === String(task.depId)) {
      this.setData({
        recognizeProgress: task.progress
      });
    }
  },

  /**
   * 执行图片识别任务（异步）
   * @param {Object} task - 任务对象
   */

  _executeImageRecognition: async function (task) {
    const taskId = task.taskId;
    try {
      // 如果当前客户是任务所属客户，显示加载提示
      // ⚠️ 使用字符串比较，避免类型不一致问题
      if (String(this.data.depId) === String(task.depId)) {
        load.showLoading('正在识别中...');
        this.setData({
          recognizing: true,
          currentStep: 'recognizing',
          recognizeProgress: 0,
          ocrResults: []
        });
      } else {
      }
      const totalImages = task.imageList.length;
      const ocrResults = [];
      for (let i = 0; i < totalImages; i++) {
        const image = task.imageList[i];
        // 检查任务是否被取消（通过检查任务状态）
        if (this.data.recognizeTaskMap[taskId]?.status !== 'running') {
          return;
        }
        try {
          // 将图片转换为 Base64
          const base64 = await this.imageToBase64(image.path);
          // 调用 OCR API（异步，不阻塞）
          // ⚠️ 重要：传递任务信息，确保使用正确的 depId 和 depFatherId（而不是当前页面的 depId）
          const startTime = Date.now();
          const ocrResult = await this.callTencentOCR(base64, {
            depId: task.depId,
            depFatherId: task.depFatherId
          });
          const endTime = Date.now();
          const duration = ((endTime - startTime) / 1000).toFixed(2);
          ocrResults.push({
            imageIndex: i,
            text: ocrResult.text,
            detections: ocrResult.detections,
            angle: ocrResult.angle,
            items: ocrResult.items,
            parsedResult: ocrResult.parsedResult,
            savedOrders: ocrResult.savedOrders,
            isSaved: ocrResult.isSaved
          });
          // 更新进度
          const progress = Math.round(((i + 1) / totalImages) * 100);
          this._updateTaskProgress(taskId, progress);
          // 如果后台已经保存了订单，直接完成
          if (ocrResult.isSaved && ocrResult.savedOrders && ocrResult.savedOrders.length > 0) {
            this._onTaskComplete(taskId, {
              type: 'saved',
              savedOrders: ocrResult.savedOrders
            });
            return;
          }
          // 如果返回了订单数组，直接完成
          // 注意：接口返回的就是订单格式，不需要解析
          if (ocrResult.items && ocrResult.items.length > 0) {
            this._onTaskComplete(taskId, {
              type: 'parsed',
              items: ocrResult.items, // 订单数组（已经是订单格式）
              parsedResult: ocrResult.parsedResult
            });
            return;
          }
          // 如果接口返回了，但是没有订单数据
        } catch (error) {
          // 继续处理下一张图片，不中断整个任务
        }
      }
      // 如果循环正常结束但没有返回订单，说明识别失败
      throw new Error('没有识别到任何内容');
    } catch (error) {
      this._onTaskFailed(taskId, error);
    }
  },

  /**
   * 执行 Excel 识别任务（异步）
   * @param {Object} task - 任务对象
   */

  _executeExcelRecognition: async function (task) {
    const taskId = task.taskId;
    try {
      // 如果当前客户是任务所属客户，显示加载提示
      // ⚠️ 使用字符串比较，避免类型不一致问题
      if (String(this.data.depId) === String(task.depId)) {
        load.showLoading('正在识别 Excel...');
        this.setData({
          recognizing: true,
          currentStep: 'recognizing',
          recognizeProgress: 0
        });
      }
      // 更新进度（Excel 识别无法获取真实进度，模拟进度）
      this._updateTaskProgress(taskId, 30);
      // 调用 Excel 识别接口（异步，不阻塞）
      // ⚠️ 重要：传递任务信息，确保使用正确的 depId 和 depFatherId（而不是当前页面的 depId）
      const result = await this.callExcelRecognitionAPI(task.excelFile.path, {
        depId: task.depId,
        depFatherId: task.depFatherId
      });
      this._updateTaskProgress(taskId, 100);
      // 完成任务
      this._onTaskComplete(taskId, result);
    } catch (error) {
      this._onTaskFailed(taskId, error);
    }
  },

  /**
   * 保存识别状态到 Storage（已废弃：识别状态保存在任务队列中，不需要单独保存）
   * @param {Object} task - 任务对象
   * @deprecated 识别状态保存在任务队列中，不需要单独保存到 ocrOrderDepList
   * 
   * ⚠️ 说明：
   * - 这个方法只保存"识别状态"（进度、状态等），不保存订单数据
   * - 订单数据会在任务完成后，通过 _saveTaskResultToStorage -> _saveToStorageForDep 保存到 ocrOrderDepList
   * - 识别状态保存在任务队列（ocrRecognizeTaskQueue）中，不需要单独保存
   */

  /**
   * 清除识别状态（已废弃：识别状态保存在任务队列中，任务完成后会自动清除）
   * @param {String} depId - 客户ID
   * @deprecated 识别状态保存在任务队列中，任务完成后会自动从队列中移除，不需要单独清除
   */

  /**
   * 清理已完成或失败的任务（兜底清理）
   * 在离开页面时调用，确保所有 completed 和 failed 任务都被清理
   */

  _cleanCompletedTasks: function () {
    try {
      const queue = [...this.data.recognizeTaskQueue];
      const map = {
        ...this.data.recognizeTaskMap
      };
      let cleanedCount = 0;
      const cleanedTaskIds = [];
      // 清理队列中所有 completed 或 failed 状态的任务
      const filteredQueue = queue.filter(task => {
        // 保留 pending 和 running 状态的任务
        if (task.status === 'pending' || task.status === 'running') {
          return true;
        }
        // 清理 completed 或 failed 状态的任务
        if (task.status === 'completed' || task.status === 'failed') {
          cleanedTaskIds.push(task.taskId);
          cleanedCount++;
          return false;
        }
        return true;
      });
      // 从 map 中移除已清理的任务
      cleanedTaskIds.forEach(taskId => {
        delete map[taskId];
      });
      // ⚠️ 重要：先同步更新 this.data
      this.data.recognizeTaskQueue = filteredQueue;
      // ⚠️ 核心改进：基于队列实时计算运行中任务列表（单一事实来源）
      const runningList = filteredQueue
        .filter(t => t.status === 'running')
        .map(t => t.taskId);
      if (cleanedCount > 0) {
        this.setData({
          recognizeTaskQueue: filteredQueue,
          recognizeTaskRunning: runningList,
          recognizeTaskMap: map
        });
      } else {
      }
      return cleanedCount;
    } catch (error) {
      return 0;
    }
  },

  /**
   * 保存任务队列到 Storage
   * ⚠️ 重要：使用实时计算的 running 列表，确保数据一致性
   */

  _saveTaskQueue: function () {
    try {
      // 基于队列实时计算运行中任务列表（单一事实来源）
      const runningList = this._getRunningTaskIds();
      const taskQueueData = {
        queue: this.data.recognizeTaskQueue,
        running: runningList, // 使用实时计算的列表，而不是 this.data.recognizeTaskRunning
        map: this.data.recognizeTaskMap
      };
      wx.setStorageSync('ocrRecognizeTaskQueue', taskQueueData);
    } catch (error) {
    }
  },

  /**
   * 恢复任务队列
   * 只恢复 pending 和 running 状态的任务，过滤掉 completed 和 failed 状态的任务
   */

  _restoreTaskQueue: function () {
    try {
      const taskQueueData = wx.getStorageSync('ocrRecognizeTaskQueue');
      if (taskQueueData) {
        const rawQueue = taskQueueData.queue || [];
        const rawRunning = taskQueueData.running || [];
        const rawMap = taskQueueData.map || {};
        // 过滤掉 completed 和 failed 状态的任务（只保留 pending 和 running）
        const validQueue = rawQueue.filter(task => {
          const isValid = task.status === 'pending' || task.status === 'running';
          if (!isValid) {
            // 从 map 中移除已完成或失败的任务
            delete rawMap[task.taskId];
          }
          return isValid;
        });
        // ⚠️ 核心改进：基于队列实时计算运行中任务列表（单一事实来源）
        // 不再使用 rawRunning，而是从 validQueue 中实时计算
        const validRunning = validQueue
          .filter(t => t.status === 'running')
          .map(t => t.taskId);
        // 清理 map，只保留 validQueue 中的任务
        const validMap = {};
        validQueue.forEach(task => {
          if (rawMap[task.taskId]) {
            validMap[task.taskId] = rawMap[task.taskId];
          }
        });
        const filteredCount = rawQueue.length - validQueue.length;
        if (filteredCount > 0) {
        }
        // ⚠️ 重要：先同步更新 this.data
        this.data.recognizeTaskQueue = validQueue;
        this.data.recognizeTaskRunning = validRunning;
        this.data.recognizeTaskMap = validMap;
        this.setData({
          recognizeTaskQueue: validQueue,
          recognizeTaskRunning: validRunning,
          recognizeTaskMap: validMap
        });
        // 检查是否有未完成的任务
        if (validQueue.length > 0) {
          const runningTasks = validQueue.filter(task => task.status === 'running');
          if (runningTasks.length > 0) {
          }
        } else {
        }
      } else {
      }
    } catch (error) {
    }
  },

  /**
   * 检查当前客户是否有正在进行的任务
   */

  _checkCurrentDepRecognizing: function () {
    const currentDepId = this.data.depId;
    if (!currentDepId) {
      return;
    }
    // 检查任务队列中是否有当前客户的任务
    // ⚠️ 关键修复：使用字符串比较，避免类型不一致问题
    const allTasksForDep = this.data.recognizeTaskQueue.filter(
      task => String(task.depId) === String(currentDepId)
    );
    // ⚠️ 关键修复：基于队列实时计算运行中任务列表，确保准确性
    // ⚠️ 使用字符串比较，避免类型不一致问题
    const actualRunningTasks = this.data.recognizeTaskQueue.filter(
      task => String(task.depId) === String(currentDepId) && task.status === 'running'
    );
    // 查找 pending 或 running 状态的任务
    // ⚠️ 使用字符串比较，避免类型不一致问题
    const currentTask = this.data.recognizeTaskQueue.find(
      task => String(task.depId) === String(currentDepId) &&
        (task.status === 'pending' || task.status === 'running')
    );
    if (currentTask) {
      // ⚠️ 重要：只有在确实有运行中任务时才设置 recognizing: true
      // 如果页面已经有订单数据（currentStep === 'confirm'），说明任务已完成，不应该覆盖
      if (this.data.currentStep === 'confirm' && this.data.orderArr && this.data.orderArr.length > 0) {
        return;
      }
      // 恢复识别状态
      this.setData({
        recognizing: true,
        currentStep: 'recognizing',
        recognizeProgress: currentTask.progress,
        imageList: currentTask.imageList || [],
        excelFile: currentTask.excelFile || null,
        sourceType: currentTask.type === 'image' ? 'image' : 'excel'
      }, () => {
      });
      if (currentTask.status === 'running') {
        load.showLoading('正在识别中...');
      }
    } else {
      // 如果没有找到 pending 或 running 的任务，检查是否有 failed 的任务
      const failedTask = allTasksForDep.find(task => task.status === 'failed');
      if (failedTask) {
        // 如果错误信息是"小程序关闭导致任务中断"，说明是正常的关闭
        // 这种情况下，我们可以恢复 UI 状态，但任务本身已经失败
        if (failedTask.error && failedTask.error.includes('小程序关闭导致任务中断')) {
          // 恢复 UI 状态，显示识别中界面
          this.setData({
            recognizing: true,
            currentStep: 'recognizing',
            recognizeProgress: failedTask.progress || 0,
            imageList: failedTask.imageList || [],
            excelFile: failedTask.excelFile || null,
            sourceType: failedTask.type === 'image' ? 'image' : 'excel'
          }, () => {
          });
          load.showLoading('正在识别中...');
          // 尝试重新执行任务（将状态改为 pending，然后执行）
          failedTask.status = 'pending';
          failedTask.error = null;
          // 更新队列
          const queue = [...this.data.recognizeTaskQueue];
          const taskIndex = queue.findIndex(t => t.taskId === failedTask.taskId);
          if (taskIndex >= 0) {
            queue[taskIndex] = failedTask;
            this.setData({
              recognizeTaskQueue: queue
            });
            // ⚠️ 移除：任务执行时会自动保存，这里不需要重复保存
            // this._saveTaskQueue();
            // 尝试执行任务
            setTimeout(() => {
              this._executeTasks();
            }, 500);
          }
        }
      } else {
      }
    }
  },

  /**
   * 保存任务结果到缓存
   * @param {Object} task - 任务对象
   * @param {Object} result - 识别结果
   */

  _saveTaskResultToStorage: function (task, result) {
    try {
      let orders = [];
      if (result.type === 'saved') {
        // 已保存的订单
        orders = result.savedOrders || [];
        this._saveToStorageForDep(task.depId, orders, result.savedOrders.length, task);
      } else if (result.type === 'parsed') {
        // 接口返回的就是订单格式，直接使用，不需要格式化
        orders = result.items || [];
        // 过滤掉无效订单（商品名称为空）
        orders = orders.filter(order =>
          order.nxDoGoodsName && order.nxDoGoodsName.trim()
        );
        this._saveToStorageForDep(task.depId, orders, null, task);
      }
    } catch (error) {
    }
  },

  /**
   * 为指定客户保存订单到缓存
   * @param {String} depId - 客户ID
   * @param {Array} orders - 订单数组
   * @param {Number} saveCount - 已保存订单数量
   * @param {Object} task - 任务对象（可选，包含 imageList、excelFile、sourceType 等信息）
   */

  _saveToStorageForDep: function (depId, orders, saveCount, task) {
    try {
      let ocrOrderDepList = wx.getStorageSync('ocrOrderDepList') || [];
      let depIndex = -1;
      for (let i = 0; i < ocrOrderDepList.length; i++) {
        if (ocrOrderDepList[i].depId === depId) {
          depIndex = i;
          break;
        }
      }
      if (depIndex < 0) {
        // 创建新的缓存项
        // ⚠️ 从 task 参数中获取 imageList、excelFile、sourceType 等信息
        ocrOrderDepList.push({
          depId: depId,
          depFatherId: task.depFatherId,
          depName: task.depName,
          arr: orders,
          saveCount: saveCount,
          strArr: [],
          nxArr: [],
          orderArrIndex: -1,
          searchStr: "",
          sourceType: task.type === 'image' ? 'image' : (task.type === 'excel' ? 'excel' : null),
          excelFile: task.excelFile || null,
          imageList: task.imageList || []
        });
      } else {
        // 更新现有缓存项
        ocrOrderDepList[depIndex].arr = orders;
        ocrOrderDepList[depIndex].saveCount = saveCount;
        // 如果提供了 task 参数，同时更新部门信息和文件信息
        if (task) {
          ocrOrderDepList[depIndex].depFatherId = task.depFatherId;
          ocrOrderDepList[depIndex].depName = task.depName;
          if (task.imageList && task.imageList.length > 0) {
            ocrOrderDepList[depIndex].imageList = task.imageList;
          }
          if (task.excelFile) {
            ocrOrderDepList[depIndex].excelFile = task.excelFile;
          }
          if (task.type) {
            ocrOrderDepList[depIndex].sourceType = task.type === 'image' ? 'image' : (task.type === 'excel' ? 'excel' : null);
          }
        }
      }
      wx.setStorageSync('ocrOrderDepList', ocrOrderDepList);
    } catch (error) {
    }
  },

  /**
   * 更新界面（任务完成时）
   * @param {Object} task - 任务对象
   * @param {Object} result - 识别结果
   */

  _updateUIForTaskComplete: function (task, result) {
    load.hideLoading();
    let orders = [];
    let saveCount = null;
    if (result.type === 'saved') {
      orders = result.savedOrders || [];
      saveCount = orders.length;
    } else if (result.type === 'parsed') {
      // 接口返回的就是订单格式，直接使用，不需要格式化
      orders = result.items || [];
      // 过滤掉无效订单（商品名称为空）
      orders = orders.filter(order =>
        order.nxDoGoodsName && order.nxDoGoodsName.trim()
      );
      saveCount = null;
    }
    this.setData({
      recognizing: false,
      currentStep: 'confirm',
      orderArr: orders,
      saveCount: saveCount,
      sourceType: task.type === 'image' ? 'image' : 'excel',
      excelFile: task.excelFile || null,
      imageList: task.imageList || []
    }, () => {
      // 验证数据是否正确设置
      if (!this.data.orderArr || this.data.orderArr.length === 0) {
      }
      if (this.data.currentStep !== 'confirm') {
      }
      this._logScrollHeight();
    });
    wx.showToast({
      title: saveCount ? '识别并保存完成' : '识别完成',
      icon: 'success'
    });
  },
  // ==================== 九、订单批量操作相关（准备拆分到 ocrOrderList 组件）====================

  /**
   * 重新上传（删除所有订单）
   */

  reuploadOrders: function () {
    // 检查是否有订单
    if (!this.data.orderArr || this.data.orderArr.length === 0) {
      wx.showToast({
        title: '没有可删除的订单',
        icon: 'none'
      });
      return;
    }
    // 收集所有有订单ID的订单
    const orderIds = [];
    this.data.orderArr.forEach(order => {
      if (order.nxDepartmentOrdersId) {
        orderIds.push(order.nxDepartmentOrdersId);
      }
    });
    if (orderIds.length === 0) {
      // 如果没有已保存的订单，直接清空列表
      this._clearAllOrders();
      return;
    }
    // 显示确认对话框
    wx.showModal({
      title: '确认删除',
      content: `确定要删除所有 ${orderIds.length} 个订单吗？删除后将返回上传页面。`,
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 用户确认删除
          this._deleteBatchOrders(orderIds);
        }
      }
    });
  },

  /**
   * 批量删除订单
   */

  _deleteBatchOrders: function (orderIds) {
    // 显示加载提示
    load.showLoading('正在删除订单...');
    // 调用批量删除接口
    deleteBatchOrders({
      orderIds: orderIds
    }).then(res => {
      load.hideLoading();
      // 处理响应数据：如果 res.result 是字符串，先解析
      let resultData = res.result;
      let responseCode;
      if (typeof res.result === 'string') {
        try {
          resultData = JSON.parse(res.result);
          responseCode = resultData?.code;
        } catch (e) {
          // JSON 解析失败，尝试用正则表达式提取 code 值
          const codeMatch = res.result.match(/"code"\s*:\s*(\d+)/);
          if (codeMatch) {
            responseCode = parseInt(codeMatch[1], 10);
            // 如果成功提取到 code，创建一个临时的 resultData 对象
            resultData = {
              code: responseCode
            };
          } else {
            resultData = null;
          }
        }
      } else {
        // res.result 已经是对象
        responseCode = resultData?.code;
      }
      // code 为 0 或 "0" 都视为成功
      if (resultData && (responseCode === 0 || responseCode == 0)) {
        // 删除成功
        wx.showToast({
          title: '删除成功',
          icon: 'success',
          duration: 2000
        });
        // 清空所有订单，返回上传页面
        this._clearAllOrders();
      } else {
        // 删除失败
        const errorMsg = resultData?.msg || '删除失败，请重试';
        wx.showModal({
          title: '删除失败',
          content: errorMsg,
          showCancel: false,
          confirmText: '确定'
        });
      }
    }).catch(err => {
      load.hideLoading();
      wx.showModal({
        title: '删除失败',
        content: '网络请求失败，请检查网络连接后重试',
        showCancel: false,
        confirmText: '确定'
      });
    });
  },

  /**
   * 清空所有订单，返回上传页面
   */

  _clearAllOrders: function () {
    // 清空当前部门的缓存数据
    var ocrOrderDepList = wx.getStorageSync('ocrOrderDepList');
    if (ocrOrderDepList && Array.isArray(ocrOrderDepList)) {
      // 从 ocrOrderDepList 中删除当前部门的数据
      var updatedOcrOrderDepList = ocrOrderDepList.filter(item => item.depId !== this.data.depId);
      if (updatedOcrOrderDepList.length === 0) {
        // 如果整个 ocrOrderDepList 都空了，删除整个缓存
        wx.removeStorageSync('ocrOrderDepList');
      } else {
        // 保存更新后的 ocrOrderDepList
        try {
          wx.setStorageSync('ocrOrderDepList', updatedOcrOrderDepList);
        } catch (error) {
        }
      }
    }
    // 重置所有状态，返回上传页面
    this.setData({
      orderArr: [], // 清空订单列表
      currentStep: 'upload', // 返回上传页面
      saveCount: null, // 重置保存计数
      ocrOrderDepList: null,
      ocrOrderDepIndex: -1,
      strArr: [], // 清空搜索结果
      nxArr: [],
      orderArrIndex: -1,
      searchStr: "", // 清空搜索关键词
      imageList: [], // 清空图片列表
      imageTransformList: [], // 清空图片变换状态列表
      excelFile: null, // 清空Excel文件
      sourceType: null, // 清空来源类型
      recognizing: false, // 重置识别状态
      recognizeProgress: 0, // 重置识别进度
      ocrResults: [], // 清空OCR结果
    });
  },
  // ==================== 十、订单修正相关（准备拆分到 ocrOrderList 组件）====================

  /**
   * 显示订单修正弹窗（调整订单内容）
   */

  showCorrectionModal: function () {
    // 检查是否有订单
    if (!this.data.orderArr || this.data.orderArr.length === 0) {
      wx.showToast({
        title: '没有可修正的订单',
        icon: 'none'
      });
      return;
    }
    // 根据 sourceType 获取对应的 prompt
    const depInfo = this.data.depInfo;
    let defaultText = '';
    if (this.data.sourceType === 'excel' && depInfo && depInfo.nxDepartmentOcrPromptExcel) {
      defaultText = depInfo.nxDepartmentOcrPromptExcel;
    } else if (this.data.sourceType === 'image' && depInfo && depInfo.nxDepartmentOcrPromptImage) {
      defaultText = depInfo.nxDepartmentOcrPromptImage;
    }
    // 显示修正弹窗
    this.setData({
      showCorrectionModal: true,
      correctionDefaultText: defaultText
    }, () => {
    });
  },

  /**
   * 关闭修正弹窗
   */

  onCorrectionModalCancel: function () {
    this.setData({
      showCorrectionModal: false
    });
  },

  /**
   * 确认修正订单
   */

  onCorrectionModalConfirm: function (e) {
    const correctionText = e.detail.correctionText;
    if (!correctionText || !correctionText.trim()) {
      wx.showToast({
        title: '请输入修改要求',
        icon: 'none'
      });
      return;
    }
    // 关闭弹窗
    this.setData({
      showCorrectionModal: false
    });
    // 调用修正接口
    this.correctOrders(correctionText);
  },

  /**
   * 调用修正接口
   */

  correctOrders: function (userInstructions) {
    // 显示加载提示
    load.showLoading('正在修正订单...');
    // 直接传递原始订单数据，不做任何过滤
    const requestData = {
      orderItems: this.data.orderArr, // 传递完整的原始订单数据
      userInstructions: userInstructions,
      depId: this.data.depId,
      disId: this.data.disId,
      depFatherId: this.data.depFatherId,
      userId: this.data.userId,
      inputType: this.data.sourceType || 'image' // image/excel/paste
    };
    // 调用修正接口
    correctOrders(requestData).then(res => {
      load.hideLoading();
      if (res.result && res.result.code === 0 && res.result.data) {
        // 修正成功
        this.handleCorrectionSuccess(res.result.data);
      } else {
        // 修正失败
        const errorMsg = res.result?.msg || '修正失败，请重试';
        wx.showModal({
          title: '修正失败',
          content: errorMsg,
          showCancel: false,
          confirmText: '确定'
        });
      }
    }).catch(err => {
      load.hideLoading();
      wx.showModal({
        title: '修正失败',
        content: '网络请求失败，请检查网络连接后重试',
        showCancel: false,
        confirmText: '确定'
      });
    });
  },

  /**
   * 处理修正成功后的数据
   */

  handleCorrectionSuccess: function (correctedData) {
    try {
      // 修正后的数据应该是一个订单数组
      let correctedOrders = [];
      if (Array.isArray(correctedData)) {
        correctedOrders = correctedData;
      } else if (correctedData.orderItems && Array.isArray(correctedData.orderItems)) {
        correctedOrders = correctedData.orderItems;
      } else {
        throw new Error('修正后的数据格式不正确');
      }
      if (correctedOrders.length === 0) {
        throw new Error('修正后的订单列表为空');
      }
      // 直接使用返回的数据，只保留原始订单ID（如果需要）
      const formattedOrders = correctedOrders.map((item, index) => {
        // 保留原始订单ID（如果存在）
        const originalOrder = this.data.orderArr[index];
        const orderId = originalOrder ? originalOrder.nxDepartmentOrdersId : null;
        // 直接使用返回的数据，保留所有字段（包括 standardWeight, itemUnit, itemsPerCarton, cartonUnit 等）
        return {
          ...item, // 保留返回数据的所有字段
          nxDepartmentOrdersId: orderId || item.nxDepartmentOrdersId, // 保留原始订单ID
          nxDoStatus: item.nxDoStatus !== undefined ? item.nxDoStatus : -2, // 如果没有状态，默认为草稿
        };
      });
      // 更新订单列表
      this.setData({
        orderArr: formattedOrders,
        saveCount: null, // 修正后的订单都是未保存的草稿
        strArr: [], // 清空搜索结果
        nxArr: [],
        orderArrIndex: -1
      });
      // 保存到缓存
      this._saveToStorage(formattedOrders);
      wx.showToast({
        title: '修正成功',
        icon: 'success',
        duration: 2000
      });
    } catch (error) {
      wx.showModal({
        title: '修正失败',
        content: error.message || '处理修正后的数据时发生错误',
        showCancel: false,
        confirmText: '确定'
      });
    }
  },
  // ==================== 十一、页面生命周期（续）====================

  /**
   * 页面卸载时的处理
   */

  onUnload: function () {
    // 清除任务检查定时器
    this._stopTaskCheckTimer();
    // 销毁 TTS 工具类
    if (this.ttsHelper) {
      this.ttsHelper.destroy();
      this.ttsHelper = null;
    }
    // 清理已完成或失败的任务（兜底清理）
    this._cleanCompletedTasks();
    // ⚠️ 移除：页面卸载时不需要保存队列（失败的任务不需要恢复，用户会重新选择图片）
    // this._saveTaskQueue();
    // 从缓存中读取最新的数据
    var ocrOrderDepList = wx.getStorageSync("ocrOrderDepList");
    if (!ocrOrderDepList || ocrOrderDepList.length === 0) {
      return;
    }
    // 找到当前 depId 对应的数据
    var currentDepData = null;
    for (var i = 0; i < ocrOrderDepList.length; i++) {
      if (ocrOrderDepList[i].depId == this.data.depId) {
        currentDepData = ocrOrderDepList[i];
        break;
      }
    }
    if (!currentDepData || !currentDepData.arr || currentDepData.arr.length === 0) {
      return;
    }
    // 检查是否有 status == -2 的订单（草稿订单）
    var hasDraftOrders = false;
    for (var i = 0; i < currentDepData.arr.length; i++) {
      if (currentDepData.arr[i].nxDoStatus == -2) {
        hasDraftOrders = true;
        break;
      }
    }
    // 如果所有订单都是 status == 0（已保存），则删除该部门的缓存
    if (!hasDraftOrders) {
      var arr = ocrOrderDepList.filter(item => item.depId != this.data.depId);
      if (arr.length == 0) {
        wx.removeStorageSync('ocrOrderDepList');
      } else {
        try {
          wx.setStorageSync('ocrOrderDepList', arr);
        } catch (error) {
        }
      }
    } else {
    }
  },
  // ==================== 十二、TTS 朗读相关（业务逻辑保留在主页面，UI 已拆分到 ocrTTSPlayer 组件）====================

  /**
   * 格式化订单内容为朗读文本
   * @param {Object} item 订单项
   * @param {Number} index 订单索引（从0开始）
   * @returns {String} 格式化后的文本
   */

  formatOrderText: function (item, index) {
    let text = `第${index + 1}条,`;
    // 商品名称
    const goodsName = item.nxDoGoodsName || '';
    text += goodsName;
    // 数量 + 规格
    const quantity = item.nxDoQuantity || '';
    const standard = item.nxDoStandard || '';
    if (quantity || standard) {
      text += quantity + standard;
    }
    text += '。';
    // 备注
    const remark = item.nxDoRemark;
    if (remark && remark !== 'null' && remark.trim().length > 0) {
      text += `备注${remark}。`;
    }
    // 状态提示
    if (item.nxDoStatus == -2) {
      text += '需要确认';
    }
    return text;
  },

  /**
   * 从指定订单索引开始朗读订单列表
   * @param {Number} startIndex 起始订单索引（从0开始）
   */

  readOrderListFromIndex: function (startIndex = 0) {
    const orderArr = this.data.orderArr;
    if (!orderArr || orderArr.length === 0) {
      wx.showToast({
        title: '没有订单可朗读',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    // 确保 startIndex 有效
    if (startIndex < 0 || startIndex >= orderArr.length) {
      startIndex = 0;
    }
    // 格式化所有订单为文本
    const orderItems = orderArr.map((item, index) => {
      // 处理备注内容
      let remark = '';
      if (item.nxDoRemark && item.nxDoRemark !== 'null' && item.nxDoRemark.trim().length > 0) {
        remark = item.nxDoRemark.trim();
      }
      // 如果状态为 -2，在备注中添加"请确认商品"
      if (item.nxDoStatus == -2) {
        if (remark) {
          remark = remark + '需要确定商品';
        } else {
          remark = '需要确定商品';
        }
      }
      return {
        index: index + 1, // 序号（从1开始）
        indexText: `第${index + 1}条,`, // 序号文本"第X条"
        name: item.nxDoGoodsName || '',
        qty: item.nxDoQuantity || '',
        unit: item.nxDoStandard || '',
        remark: remark
      };
    });
    // 初始化队列（存储格式化后的文本，从 startIndex 开始）
    const ttsQueue = orderArr.map((item, index) => {
      return this.formatOrderText(item, index);
    });
    // 生成会话ID
    const sessionId = `tts_${this.data.depId}_${Date.now()}`;
    // 设置状态：开始加载（触发布局切换）
    this.setData({
      isTTSReading: true,
      isTTSLoading: true,
      isTTSPlaying: false,
      ttsQueue: ttsQueue,
      currentTTSIndex: startIndex - 1, // 设置为 startIndex - 1，因为 playNextInQueue 会 +1
      stoppedIndex: -1,
      stoppedOrderRef: null,
      ttsSessionId: sessionId,
      ttsError: '',
      currentReadingText: '',
      ttsAudioCache: {}
    });
    // 请求从 startIndex 开始的音频（请求 startIndex 和 startIndex+1 两条）
    const requestLimit = Math.min(2, orderArr.length - startIndex);
    this._requestTTSBatch(startIndex, requestLimit, orderItems, sessionId, () => {
      // 请求成功后，立即播放 startIndex 对应的订单
      this.playNextInQueue();
    });
  },

  /**
   * 开始朗读订单列表（从头开始）
   */

  readOrderList: function () {
    const orderArr = this.data.orderArr;
    if (!orderArr || orderArr.length === 0) {
      wx.showToast({
        title: '没有订单可朗读',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    // 格式化所有订单为文本
    const orderItems = orderArr.map((item, index) => {
      // 处理备注内容
      let remark = '';
      if (item.nxDoRemark && item.nxDoRemark !== 'null' && item.nxDoRemark.trim().length > 0) {
        remark = item.nxDoRemark.trim();
      }
      // 如果状态为 -2，在备注中添加"请确认商品"
      if (item.nxDoStatus == -2) {
        if (remark) {
          remark = remark + '需要确定商品';
        } else {
          remark = '需要确定商品';
        }
      }
      return {
        index: index + 1, // 序号（从1开始）
        indexText: `第${index + 1}条,`, // 序号文本"第X条"
        name: item.nxDoGoodsName || '',
        qty: item.nxDoQuantity || '',
        unit: item.nxDoStandard || '',
        remark: remark
      };
    });
    // 初始化队列（存储格式化后的文本）
    const ttsQueue = orderArr.map((item, index) => {
      return this.formatOrderText(item, index);
    });
    // 生成会话ID
    const sessionId = `tts_${this.data.depId}_${Date.now()}`;
    // 设置状态：开始加载（触发布局切换）
    this.setData({
      isTTSReading: true,
      isTTSLoading: true,
      isTTSPlaying: false,
      ttsQueue: ttsQueue,
      currentTTSIndex: -1,
      stoppedIndex: -1,
      stoppedOrderRef: null,
      ttsSessionId: sessionId,
      ttsError: '',
      currentReadingText: '',
      ttsAudioCache: {}
    });
    // ⚠️ 改造：第一次请求只请求第1、2条（index=0, limit=2）
    // 立即播放第1条，缓存第1、2条
    this._requestTTSBatch(0, 2, orderItems, sessionId, () => {
      // 请求成功后，立即播放第一条
      this.playNextInQueue();
    });
  },

  /**
   * 请求批量 TTS（支持 startIndex 和 limit，兼容旧逻辑）
   * @param {Number} startIndex - 起始索引（从0开始）
   * @param {Number} limit - 请求数量
   * @param {Array} orderItems - 订单项数组（可选，如果不传则使用 this.data.orderArr）
   * @param {String} sessionId - 会话ID（可选，如果不传则使用 this.data.ttsSessionId）
   * @param {Function} onSuccess - 成功回调（可选）
   */

  _requestTTSBatch: function (startIndex, limit, orderItems, sessionId, onSuccess) {
    // 如果没有传入 orderItems，使用全部订单（兼容旧逻辑）
    const allOrderItems = orderItems || this.data.orderArr.map((item, index) => {
      let remark = '';
      if (item.nxDoRemark && item.nxDoRemark !== 'null' && item.nxDoRemark.trim().length > 0) {
        remark = item.nxDoRemark.trim();
      }
      if (item.nxDoStatus == -2) {
        if (remark) {
          remark = remark + '需要确定商品';
        } else {
          remark = '需要确定商品';
        }
      }
      return {
        index: index + 1,
        indexText: `第${index + 1}条,`,
        name: item.nxDoGoodsName || '',
        qty: item.nxDoQuantity || '',
        unit: item.nxDoStandard || '',
        remark: remark
      };
    });
    // 如果没有传入 sessionId，使用当前的（兼容旧逻辑）
    const currentSessionId = sessionId || this.data.ttsSessionId;
    // 截取需要请求的订单项
    const requestOrderItems = allOrderItems.slice(startIndex, startIndex + limit);
    // 显示加载提示（只在第一次请求时显示）
    if (startIndex === 0) {
      load.showLoading('正在合成语音...');
    }
    // 调用TTS API（兼容旧逻辑：如果没有 startIndex 和 limit，则使用全部订单）
    const requestData = {
      sessionId: currentSessionId,
      orderItems: requestOrderItems
    };
    // ⚠️ 如果传入了 startIndex 和 limit，添加到请求参数中（新逻辑）
    if (startIndex !== undefined && limit !== undefined) {
      requestData.startIndex = startIndex;
      requestData.limit = limit;
    }
    textToSpeech(requestData).then(res => {
      if (startIndex === 0) {
        load.hideLoading();
      }
      if (res.result && res.result.code === 0) {
        const audioList = res.result.data?.audioList || [];
        if (audioList.length === 0) {
          if (startIndex === 0) {
            this.setData({
              isTTSLoading: false,
              ttsError: '未返回音频数据'
            });
          }
          return;
        }
        // 更新音频缓存（合并到现有缓存中）
        const currentCache = this.data.ttsAudioCache || {};
        audioList.forEach(audio => {
          if (audio.audioUrl) {
            // ⚠️ 注意：后端返回的 audio.index 就是订单的原始数组索引（从0开始），直接使用
            const cacheIndex = audio.index;
            currentCache[cacheIndex] = audio.audioUrl;
            //  + '...' });
          }
        });
        // 更新状态（使用 setData 的回调确保数据已更新）
        this.setData({
          isTTSLoading: false,
          ttsAudioCache: currentCache
        }, () => {
          // .length);
          // 调用成功回调（在 setData 回调中调用，确保数据已更新）

          if (onSuccess && typeof onSuccess === 'function') {
            onSuccess();
          }
        });
      } else {
        const errorMsg = res.result?.msg || res.result?.error || '语音合成失败';
        if (startIndex === 0) {
          this.setData({
            isTTSLoading: false,
            isTTSReading: false,
            ttsError: errorMsg
          });
          wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 2000
          });
        }
      }
    }).catch(err => {
      if (startIndex === 0) {
        load.hideLoading();
      }
      if (startIndex === 0) {
        this.setData({
          isTTSLoading: false,
          isTTSReading: false,
          ttsError: '请求失败：' + (err.message || '未知错误')
        });
        wx.showToast({
          title: '请求失败',
          icon: 'none',
          duration: 2000
        });
      }
    });
  },

  /**
   * 判断指定订单是否是当前正在朗读的订单
   * @param {Number} orderIndex 订单索引
   * @returns {Boolean}
   */

  isCurrentReadingOrder: function (orderIndex) {
    return this.data.currentTTSIndex === orderIndex && this.data.isTTSPlaying;
  },

  /**
   * 判断指定订单是否是暂停的订单
   * @param {Number} orderIndex 订单索引
   * @returns {Boolean}
   */

  isPausedOrder: function (orderIndex) {
    return this.data.stoppedIndex === orderIndex && !this.data.isTTSPlaying;
  },

  /**
   * 预取下一条 TTS（如果需要）
   * @param {Number} currentIndex - 当前播放的订单索引
   */

  _prefetchNextTTSIfNeeded: function (currentIndex) {
    // ⚠️ 如果用户暂停了，不预取
    if (this.data.stoppedIndex >= 0) {
      return;
    }
    const nextIndex = currentIndex + 1;
    const ttsQueue = this.data.ttsQueue || [];
    // 检查是否还有下一条
    if (nextIndex >= ttsQueue.length) {
      return;
    }
    // 检查下一条是否已有缓存
    if (this.data.ttsAudioCache[nextIndex]) {
      return;
    }
    // 检查下一条订单状态，如果是-2，不预取
    const orderArr = this.data.orderArr;
    const nextOrder = orderArr[nextIndex];
    const isNextStatusMinus2 = nextOrder && nextOrder.nxDoStatus == -2;
    if (isNextStatusMinus2) {
      return;
    }
    // 检查是否正在请求中（避免重复请求）
    if (this.data._ttsRequestingIndex === nextIndex) {
      return;
    }
    // ⚠️ 双重检查：再次确认缓存中确实没有（防止并发请求）
    if (this.data.ttsAudioCache[nextIndex]) {
      return;
    }
    // 标记正在请求（立即设置，防止并发请求）
    this.setData({
      _ttsRequestingIndex: nextIndex
    });
    // 准备订单项
    const orderItems = this.data.orderArr.map((item, index) => {
      let remark = '';
      if (item.nxDoRemark && item.nxDoRemark !== 'null' && item.nxDoRemark.trim().length > 0) {
        remark = item.nxDoRemark.trim();
      }
      if (item.nxDoStatus == -2) {
        if (remark) {
          remark = remark + '需要确定商品';
        } else {
          remark = '需要确定商品';
        }
      }
      return {
        index: index + 1,
        indexText: `第${index + 1}条,`,
        name: item.nxDoGoodsName || '',
        qty: item.nxDoQuantity || '',
        unit: item.nxDoStandard || '',
        remark: remark
      };
    });
    // 请求单条音频（limit=1）
    this._requestTTSBatch(nextIndex, 1, orderItems, this.data.ttsSessionId, () => {
      // 请求成功后，清除请求标记
      this.setData({
        _ttsRequestingIndex: -1
      });
    });
  },

  /**
   * 滚动到指定订单项
   * @param {Number} orderIndex 订单索引
   */

  scrollToOrderItem: function (orderIndex) {
    // 设置 scrollIntoViewId，触发组件内部查询订单项位置
    // 组件会通过 scrollToItem 事件返回位置信息
    const itemId = `order-item-${orderIndex}`;
    this.setData({
      scrollIntoViewId: itemId
    });
  },

  /**
   * 处理组件内部传来的滚动事件（组件已查询到订单项位置）
   * @param {Object} e 事件对象，包含订单项位置信息
   */
  onScrollToItem: function (e) {
    const {
      itemId,
      top,
      height
    } = e.detail;
    const scrollViewId = 'order-list-scroll-view-reading';
    
    // 查询 scroll-view 的位置和当前滚动位置
    const query = wx.createSelectorQuery();
    query.select(`#${scrollViewId}`).boundingClientRect();
    query.select(`#${scrollViewId}`).scrollOffset();
    query.exec((res) => {
      const scrollViewRect = res[0];
      const scrollOffset = res[1];
      if (!scrollViewRect) {
        return;
      }
      
      // top 是订单项相对于页面的位置（组件内部查询得到）
      // scrollViewRect.top 是 scroll-view 相对于页面的位置
      // 计算订单项相对于 scroll-view 的偏移
      const itemOffsetTop = top - scrollViewRect.top;
      // 计算订单项在 scroll-view 内容中的位置
      // 订单项在内容中的位置 = 当前 scrollTop + 订单项相对于 scroll-view 的偏移
      const currentScrollTop = scrollOffset.scrollTop || 0;
      const itemContentTop = currentScrollTop + itemOffsetTop;
      
      // 设置 scroll-top，让订单项顶部对齐到 scroll-view 顶部
      this.setData({
        scrollTop: Math.max(0, itemContentTop)
      });
    });
  },


  /**
   * 播放队列中的下一个订单
   */

  playNextInQueue: function () {
    const ttsQueue = this.data.ttsQueue;
    const currentTTSIndex = this.data.currentTTSIndex;
    const nextIndex = currentTTSIndex + 1;
    // 检查是否播放完成
    if (nextIndex >= ttsQueue.length) {
      this.setData({
        isTTSPlaying: false,
        isTTSReading: false,
        currentReadingText: ''
      });
      wx.showToast({
        title: '朗读完成',
        icon: 'success',
        duration: 2000
      });
      return;
    }
    // 获取当前订单文本
    const orderText = ttsQueue[nextIndex];
    if (!orderText || !orderText.trim()) {
      // 跳过空文本，播放下一条
      this.setData({
        currentTTSIndex: nextIndex
      });
      this.playNextInQueue();
      return;
    }
    // ⚠️ 改造：检查音频缓存，如果没有则先请求再播放
    const audioUrl = this.data.ttsAudioCache[nextIndex];
    if (!audioUrl) {
      // 检查是否正在请求中（避免重复请求）
      if (this.data._ttsRequestingIndex === nextIndex) {
        return;
      }
      // 标记正在请求
      this.setData({
        _ttsRequestingIndex: nextIndex,
        isTTSLoading: true
      });
      // 请求单条音频（limit=1）
      const orderItems = this.data.orderArr.map((item, index) => {
        let remark = '';
        if (item.nxDoRemark && item.nxDoRemark !== 'null' && item.nxDoRemark.trim().length > 0) {
          remark = item.nxDoRemark.trim();
        }
        if (item.nxDoStatus == -2) {
          if (remark) {
            remark = remark + '需要确定商品';
          } else {
            remark = '需要确定商品';
          }
        }
        return {
          index: index + 1,
          indexText: `第${index + 1}条,`,
          name: item.nxDoGoodsName || '',
          qty: item.nxDoQuantity || '',
          unit: item.nxDoStandard || '',
          remark: remark
        };
      });
      // 请求单条音频
      this._requestTTSBatch(nextIndex, 1, orderItems, this.data.ttsSessionId, () => {
        // 请求成功后，清除请求标记
        this.setData({
          _ttsRequestingIndex: -1,
          isTTSLoading: false
        }, () => {
          // ⚠️ 在 setData 回调中调用，确保缓存数据已更新
          // 重新调用 playNextInQueue（此时缓存已存在）
          this.playNextInQueue();
        });
      });
      return;
    }
    // 更新当前索引和朗读文本
    const orderArr = this.data.orderArr;
    const currentOrder = orderArr[nextIndex];
    const isStatusMinus2 = currentOrder && currentOrder.nxDoStatus == -2;
    this.setData({
      currentTTSIndex: nextIndex,
      currentReadingText: orderText,
      isTTSPlaying: true
    });
    // 滚动到当前订单（延迟一下确保DOM更新）
    // 使用 wx.nextTick 确保 DOM 已更新，然后再延迟一点时间确保组件内部元素已渲染
    wx.nextTick(() => {
      setTimeout(() => {
        this.scrollToOrderItem(nextIndex);
      }, 200);
    });
    // ⚠️ 注意：预取逻辑在 onPlayStart 回调中执行，不在这里预取（避免重复请求）
    // 播放音频（使用 ttsHelper，播放完成会通过 ttsHelper 的 onPlayEnd 回调处理）
    // 注意：订单状态为-2的处理逻辑已在 ttsHelper 的 onPlayEnd 回调中处理
    this._playTTSAudioFromUrl(audioUrl, orderText);
  },

  /**
   * 处理订单状态为-2的情况（播放完成后）
   * @param {Number} orderIndex 订单索引
   * @param {Object} orderItem 订单项
   */

  _handleOrderStatusMinus2: function (orderIndex, orderItem) {
    console.log('[TTS] 处理订单状态为-2:', { orderIndex, orderItem });
    // 检查是否有推荐商品
    const hasRecommendGoods = orderItem &&
      orderItem.nxDistributerGoodsEntityList &&
      orderItem.nxDistributerGoodsEntityList.length > 0;
    console.log('[TTS] 是否有推荐商品:', hasRecommendGoods, orderItem?.nxDistributerGoodsEntityList?.length);
    if (hasRecommendGoods) {
      // 有推荐商品，自动打开推荐商品列表
      console.log('[TTS] 自动打开推荐商品列表，订单索引:', orderIndex);
      // 确保订单的 nxDoIsAgent 不是 2（如果已经是 2，showGoodsList 会关闭它）
      // 先关闭其他已打开的列表
      var updateData = {};
      for (var i = 0; i < this.data.orderArr.length; i++) {
        if (this.data.orderArr[i].nxDoIsAgent === 2) {
          updateData["orderArr[" + i + "].nxDoIsAgent"] = -1;
        }
      }
      // 设置当前订单的 nxDoIsAgent 为 2，并设置 orderArrIndex
      var dataIsAgent = "orderArr[" + orderIndex + "].nxDoIsAgent";
      updateData[dataIsAgent] = 2;
      updateData.orderArrIndex = orderIndex;
      // 清空搜索结果
      updateData.nxArr = [];
      updateData.strArr = [];
      this.setData(updateData);
      console.log('[TTS] 推荐商品列表已打开，orderArrIndex:', orderIndex, 'nxDoIsAgent:', 2);
    } else {
      // 没有推荐商品，聚焦到商品名称输入框
      console.log('[TTS] 没有推荐商品，聚焦到商品名称输入框');
      // 模拟事件对象（包含 detail 属性，避免报错）
      const mockEvent = {
        currentTarget: {
          dataset: {
            index: orderIndex,
            type: 'name'
          }
        },
        detail: {
          value: '' // 空值，因为这是聚焦事件，不是输入事件
        }
      };
      this.focusOrderIndex(mockEvent);
    }
  },

  /**
   * 暂停朗读
   */

  pauseReading: function () {
    // 停止音频播放
    if (this.data.ttsAudio) {
      this.data.ttsAudio.stop();
      this.data.ttsAudio.destroy();
      this.setData({
        ttsAudio: null
      });
    }
    // 记录停止位置
    const stoppedIndex = this.data.currentTTSIndex;
    const orderArr = this.data.orderArr;
    this.setData({
      isTTSPlaying: false,
      stoppedIndex: stoppedIndex,
      stoppedOrderRef: orderArr[stoppedIndex] || null
    });
    // 暂停时保持朗读模式布局（不恢复）
    wx.showToast({
      title: '已暂停',
      icon: 'success',
      duration: 1000
    });
  },

  /**
   * 继续朗读
   */

  continueReading: function () {
    const stoppedIndex = this.data.stoppedIndex;
    const orderArr = this.data.orderArr;
    // 检查停止的订单状态
    if (stoppedIndex >= 0 && orderArr[stoppedIndex] && orderArr[stoppedIndex].nxDoStatus == -2) {
      wx.showToast({
        title: '请先处理需要确定商品的订单',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    // 从停止的位置继续播放（重新播放当前订单）
    this.setData({
      stoppedIndex: -1,
      stoppedOrderRef: null
    });
    // 继续播放
    this.playNextInQueue();
  },

  /**
   * 重头开始朗读
   */

  restartReading: function () {
    // 停止当前播放（使用 ttsHelper）
    if (this.ttsHelper) {
      try {
        this.ttsHelper.stop();
      } catch (e) {
      }
    }
    // 重置所有状态（恢复布局）
    // ⚠️ 重要：清空音频缓存，确保重新请求接口
    this.setData({
      isTTSReading: false,
      isTTSPlaying: false,
      isTTSLoading: false,
      currentTTSIndex: -1,
      stoppedIndex: -1,
      orderArrIndex: -1,
      stoppedOrderRef: null,
      ttsAudio: null,
      currentReadingText: '',
      ttsError: '',
      ttsAudioCache: {}, // 清空音频缓存，确保重新请求接口
      ttsQueue: [], // 清空队列
      ttsSessionId: '' // 清空会话ID
    });
    // 重新开始朗读（会重新请求接口）
    this.readOrderList();
  },
  closeReading() {
    this.setData({
      isTTSReading: false,
      isTTSPlaying: false,
      isTTSLoading: false,
      currentTTSIndex: -1,
      stoppedIndex: -1,
      stoppedOrderRef: null,
      ttsAudio: null,
      currentReadingText: '',
      ttsError: ''
    });
  },

  /**
   * 播放TTS音频（从URL）- 使用 ttsHelper 工具类
   * @param {String} audioUrl 音频文件URL
   * @param {String} text 朗读文本（用于日志）
   */

  _playTTSAudioFromUrl: function (audioUrl, text) {
    if (!audioUrl) {
      wx.showToast({
        title: '音频URL为空',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    if (!this.ttsHelper) {
      wx.showToast({
        title: '音频播放器未初始化',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    // 使用 ttsHelper 播放音频
    // 播放完成会通过 ttsHelper 的 onPlayEnd 回调自动处理
    this.ttsHelper.playAudio(audioUrl, text);
  },
  // ========== ocrOrderList 组件事件处理方法 ==========

  /**
   * 处理订单编辑事件（来自 ocrOrderList 组件）
   */

  onOrderEdit: function (e) {
    const {
      index,
      type,
      value
    } = e.detail;
    // 创建模拟事件对象，调用原来的 editOrder 方法
    const mockEvent = {
      currentTarget: {
        dataset: {
          type: type,
          index: index
        }
      },
      detail: {
        value: value
      }
    };
    this.editOrder(mockEvent);
  },

  /**
   * 处理订单名称编辑事件（来自 ocrOrderList 组件）
   */

  onOrderEditName: function (e) {
    const {
      index,
      value
    } = e.detail;
    const mockEvent = {
      currentTarget: {
        dataset: {
          index: index
        }
      },
      detail: {
        value: value
      }
    };
    this.editOrderName(mockEvent);
  },

  /**
   * 处理订单聚焦事件（来自 ocrOrderList 组件）
   */

  onOrderFocus: function (e) {
    const {
      index,
      type
    } = e.detail;
    const mockEvent = {
      currentTarget: {
        dataset: {
          index: index,
          type: type
        }
      }
    };
    this.focusOrderIndex(mockEvent);
  },

  /**
   * 处理显示商品列表事件（来自 ocrOrderList 组件）
   */

  onOrderShowGoods: function (e) {
    const {
      index
    } = e.detail;
    const mockEvent = {
      currentTarget: {
        dataset: {
          index: index
        }
      }
    };
    this.showGoodsList(mockEvent);
  },

  /**
   * 处理关闭商品列表事件（来自 ocrOrderList 组件）
   */

  onOrderCloseGoods: function (e) {
    const {
      index
    } = e.detail;
    const mockEvent = {
      currentTarget: {
        dataset: {
          index: index
        }
      }
    };
    this.closeShowGoods(mockEvent);
  },

  /**
   * 处理保存订单事件（来自 ocrOrderList 组件）
   */

  onOrderSaveOrder: function (e) {
    const {
      index,
      goodsId,
      name
    } = e.detail;
    const mockEvent = {
      currentTarget: {
        dataset: {
          index: index,
          id: goodsId,
          name: name
        }
      }
    };
    this.saveOrder(mockEvent);
  },

  /**
   * 处理下载商品事件（来自 ocrOrderList 组件）
   */

  onOrderDownloadGoods: function (e) {
    const {
      index,
      goods
    } = e.detail;
    const mockEvent = {
      currentTarget: {
        dataset: {
          index: index,
          item: goods
        }
      }
    };
    this.downLoadGoodsNx(mockEvent);
  },

  /**
   * 处理显示操作菜单事件（来自 ocrOrderList 组件）
   */

  onOrderShowOperation: function (e) {
    const {
      index
    } = e.detail;
    const mockEvent = {
      currentTarget: {
        dataset: {
          index: index
        }
      }
    };
    this.showPasteOperation(mockEvent);
  },
});
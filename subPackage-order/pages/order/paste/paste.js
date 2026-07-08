import load from '../../../../lib/load';
import {
  pasteSearchGoods,
  choiceGoodsForApply,
  updateOrder,
  deleteOrder,
  addRecord,
  correctOrders,
  deleteBatchOrders,
  depGetTaskList,
} from '../../../../lib/apiDepOrder';

import { resolveNxDoCostPriceLevel } from '../../../../lib/retailPriceLevel';

import {
  disSaveStandard,
  queryDisGoodsByQuickSearchWithDepId,
  disDeleteStandard,
  getBrandForPrompts,
} from '../../../../lib/apiDistributer';

import {
  downDisGoods,
  disGetGoods,
} from '../../../lib/apiibook';

import { parseOrderFromText } from '../../../../lib/orderParser';
import { optimizeTextWithDeepSeek } from '../../../../lib/deepSeekHelper';

const plugin = requirePlugin("QCloudAIVoice");
const speechRecognizerManager = plugin.speechRecognizerManager();

// 从配置文件读取腾讯云配置
const config = require('../../../../config');
const TENCENT_CLOUD_SECRET_ID = config.tencentCloud?.secretId || '';
const TENCENT_CLOUD_SECRET_KEY = config.tencentCloud?.secretKey || '';
const TENCENT_CLOUD_APP_ID = config.tencentCloud?.appId || '1308821743';
const TENCENT_CLOUD_ENGINE_MODEL_TYPE = config.tencentCloud?.engineModelType || '16k_zh';
const TENCENT_CLOUD_VOICE_FORMAT = config.tencentCloud?.voiceFormat || 1;


Page({

  onShow() {
    if (this.data.addOrder) {
      var orderItem = this.data.orderItem;
      var orderArrIndex = this.data.orderArrIndex;
      var orderArr = this.data.orderArr;
      orderArr.splice(orderArrIndex, 0, orderItem);
      this.setData({
        orderArr: orderArr
      })
      // 更新未保存订单状态
      this._updateHasUnsavedOrders(orderArr);
     

    }

    if (this.data.findGoods) {
      this._choiceGoods();
    }

    // this._initTask();

  },



  data: {
    orderArr: [],
    show: false,
    showOperation: false,
    findGoods: false,
    addOrder: false,
    todayCount: null,
    goodsName: null,
    count: 0,
    duration: 0,
    timer: null,
    sentence: "",
    inputContent: "",
    originSentence: "",
    userId: null,
    bottomHeight: 180,
    showDeepSeekLoading: false,
    isAiOptimizing: false, // AI 正在优化标记
    aiRetryCount: 0,
    hasAiRecognized: false,
    temperature: 0.2, // 默认温度调整为 0.2
    strArr: [],
    nxArr: [],
    orderArrIndex: -1,
    searchStr: "",
    brandPrompts: [], // 品牌提示列表
    hasUnsavedOrders: false, // 是否有未保存的订单（用于控制保存按钮显示）
    hasCache: false, // 是否有当前部门的缓存数据（用于控制清除缓存按钮显示）
    scrollIntoViewId: '', // 滚动到指定订单项（验证失败时定位）
    invalidOrderIndex: -1, // 校验失败的订单索引
    invalidOrderField: '', // 校验失败的字段：name/quantity/standard
    highlightedContent: '', // 不合格内容红色标注的 HTML（用于 rich-text 展示）
    // 不合格文字前后提示图片路径（用于标记修改位置）
    pasteImageBefore: '/images/warn-3.png',
    pasteImageAfter: '/images/warn-3.png'

  },


  onLoad: function (options) {
    const globalData = getApp().globalData;
    const windowWidth = globalData.windowWidth * globalData.rpxR;
    
    // 计算商品名称、数量、规格的宽度
    const goodsNameWidth = Math.floor(windowWidth * 11 / 20); // 55%
    const quantityWidth = Math.floor(windowWidth * 3 / 20); // 15%
    const standardWidth = Math.floor(windowWidth * 3 / 20); // 15%
    const containerWidth = windowWidth - 120;
    
    this.setData({
      windowWidth: windowWidth,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      goodsNameWidth: goodsNameWidth,
      quantityWidth: quantityWidth,
      standardWidth: standardWidth,
      containerWidth: containerWidth,
      depFatherId: options.depFatherId,
      depId: options.depId,
      depName: options.depName,
      // 重置 AI 识别相关状态
      aiRetryCount: 0,
      hasAiRecognized: false,
      showDeepSeekLoading: false,
      originSentence: "",
    })

   
    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
        userId: userInfo.nxDistributerUserId,
        disId: userInfo.nxDiuDistributerId,
        disInfo: userInfo.nxDistributerEntity,
      })
    }

    var depInfo = wx.getStorageSync('depItem');
    if (depInfo) {
      this.setData({
        depInfo: depInfo,
      })
    }
   
   
    // 加载品牌提示数据
    this._loadBrandPrompts();

    // 检查隐私设置并处理隐私弹窗逻辑（仅在支持的环境中）
    try {
      if (wx.getPrivacySetting && typeof wx.getPrivacySetting === 'function') {
        wx.getPrivacySetting({
          success: res => {
            console.log("getPrivacySetting", res);
            if (res.needAuthorization) {
              // 需要弹出隐私协议
              wx.showModal({
                title: '隐私协议',
                content: '为了提供更好的服务，我们需要收集您的某些信息。请仔细阅读并同意我们的隐私协议。',
                showCancel: false,
                success: function (result) {
                  if (result.confirm) {
                    // 用户同意隐私协议，尝试调用需要授权的API
                    wx.authorize({
                      scope: 'scope.record', // 替换为你需要授权的API范围
                      success: function () {
                        // 授权成功，可以调用相关API了
                        console.log('授权成功');
                        // 调用相关API的代码...
                      },
                      fail: function () {
                        // 授权失败，处理错误
                        console.log('授权失败');
                      }
                    });
                  }
                }
              });
            } else {
              // 用户已经授权，可以直接调用相关API
              console.log('已经授权');
              // 调用相关API的代码...
            }
          },
          fail: err => {
            console.log('getPrivacySetting fail', err);
            // 如果API调用失败，继续执行后续逻辑
          }
        });
      } else {
        console.log('wx.getPrivacySetting API not available in current environment');
      }
    } catch (err) {
      console.log('wx.getPrivacySetting error caught:', err);
      // API不可用，继续执行后续逻辑
    }

    // 初始化语音识别回调
    speechRecognizerManager.OnRecognitionStart = (res) => {
      console.log('[录音回调] OnRecognitionStart - 开始识别', res)
      this.setData({
        recognitionStatus: '识别中...'
      })
      console.log('[录音回调] OnRecognitionStart - 已设置 recognitionStatus: 识别中...')
    }

    speechRecognizerManager.OnSentenceBegin = (res) => {
      console.log('[录音回调] OnSentenceBegin - 一句话开始', res)
    }

    speechRecognizerManager.OnRecognitionResultChange = (res) => {
      console.log('[录音回调] OnRecognitionResultChange - 识别变化时', res)
      if (res.result) {
        console.log('[录音回调] OnRecognitionResultChange - 更新 sentence:', res.result.voice_text_str)
        this.setData({
          sentence: res.result.voice_text_str,
        })
      }
    }

    speechRecognizerManager.OnSentenceEnd = (res) => {
      console.log('[录音回调] OnSentenceEnd - 一句话结束', res)
    }

    speechRecognizerManager.OnRecognitionComplete = async (res) => {
      console.log('[录音回调] OnRecognitionComplete - 识别结束', res)
      console.log('[录音回调] OnRecognitionComplete - 清除定时器')
      // 清除定时器
      if (this.data.timer) {
        clearInterval(this.data.timer);
        console.log('[录音回调] OnRecognitionComplete - 定时器已清除，timer ID:', this.data.timer);
      } else {
        console.log('[录音回调] OnRecognitionComplete - 警告：定时器不存在');
      }
      console.log('[录音回调] OnRecognitionComplete - 设置 isRecording: false, recognitionStatus: 识别完成')
      this.setData({
        recognitionStatus: '识别完成',
        isRecording: false,
        timer: null
      })

      try {
        // 获取识别到的文本
        const recognizedText = this.data.sentence;
        console.log('识别到的原始文本:', recognizedText);
        
        if (!recognizedText || recognizedText.trim() === '') {
          console.log('识别文本为空，跳过优化');
          return;
        }

        // 先显示原始识别结果，提升用户体验
        // 保存原始内容，用于"重新修改"功能
        this.setData({
          inputContent: recognizedText,
          sentence: recognizedText,
          originSentence: recognizedText, // 保存原始语音识别内容
          isAiOptimizing: true // 标记 AI 正在优化
        });

        // 显示 DeepSeek loading 动画
        this.setData({ showDeepSeekLoading: true });
        
        try {
          // 调用 DeepSeek API 优化文本，传入品牌列表
          const optimizedText = await optimizeTextWithDeepSeek(recognizedText, {
            brandList: this.data.brandPrompts || [],
            temperature: 0.2,
            logPrefix: '[paste]'
          });
          this.setData({ showDeepSeekLoading: false, isAiOptimizing: false });
        console.log('优化后的文本:', optimizedText);
        
          // 更新输入框内容（AI 优化后的结果）
        this.setData({
          inputContent: optimizedText,
          sentence: optimizedText
        });

          // 自动格式化内容（现在会解析 JSON）
        this.formatContent();
        } catch (error) {
          // 如果 AI 优化失败，保持原始文本
          this.setData({ 
            showDeepSeekLoading: false, 
            isAiOptimizing: false 
          });
          console.error('AI 优化失败，使用原始文本:', error);
          // formatContent 会处理原始文本的解析
          this.formatContent();
        }
      } catch (error) {
        // 隐藏 DeepSeek loading 动画（异常时也要隐藏）
        this.setData({ showDeepSeekLoading: false });
        console.error('处理语音识别结果时出错:', error);
        wx.showToast({
          title: '文本优化失败，使用原始文本',
          icon: 'none',
          duration: 2000
        });
      }
    }

    speechRecognizerManager.OnError = (res) => {
      console.log('[录音回调] OnError - 识别失败', res)
      const errorCode = res && res.code;
      const errorMessage = res && res.message;
      console.log('[录音回调] OnError - 错误码:', errorCode, '错误信息:', errorMessage)
      
      // 错误码 4008: 客户端超过15秒未发送音频数据（超时错误）
      // 这种情况通常是用户说话有停顿，不应该完全停止录音
      if (errorCode === 4008) {
        console.log('[录音回调] OnError - 识别超时（15秒无音频数据），但录音可能仍在继续');
        // 不设置 isRecording: false，因为识别服务可能会自动重启
        // 只更新状态提示，不显示错误提示
        this.setData({
          recognitionStatus: '请继续说话...'
        });
        console.log('[录音回调] OnError - 不停止录音，只更新状态提示');
        return;
      }
      
      // 错误码 6000: 网络连接错误（Connection refused）
      // 可能原因：1. 未在微信公众平台配置服务器域名 2. 开发者工具未开启"不校验合法域名" 3. 网络问题
      if (errorCode === 6000) {
        console.log('[录音回调] OnError - 识别服务连接失败（错误码6000）');
        console.log('[录音回调] OnError - 可能原因：1. 未配置服务器域名 2. 开发者工具设置 3. 网络问题');
        
        // 停止录音并提示用户
        if (this.data.timer) {
          clearInterval(this.data.timer);
          console.log('[录音回调] OnError - 定时器已清除，timer ID:', this.data.timer);
        }
        this.setData({
          recognitionStatus: '连接失败，请检查网络或配置',
          isRecording: false,
          timer: null
        });
        
        // 显示错误提示
        wx.showToast({
          title: '连接失败，请检查网络',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      
      // 其他错误：正常处理，停止录音
      console.log('[录音回调] OnError - 严重错误，停止录音')
      console.log('[录音回调] OnError - 清除定时器')
      // 清除定时器
      if (this.data.timer) {
        clearInterval(this.data.timer);
        console.log('[录音回调] OnError - 定时器已清除，timer ID:', this.data.timer);
      } else {
        console.log('[录音回调] OnError - 警告：定时器不存在');
      }
      console.log('[录音回调] OnError - 设置 isRecording: false, recognitionStatus: 识别失败')
      this.setData({
        recognitionStatus: '识别失败',
        isRecording: false,
        timer: null
      })
    }

    speechRecognizerManager.OnRecorderStop = (res) => {
      console.log('[录音回调] OnRecorderStop - 录音结束', res);
      console.log('[录音回调] OnRecorderStop - 当前状态 - isRecording:', this.data.isRecording, 'timer:', this.data.timer);
      console.log('[录音回调] OnRecorderStop - 清除定时器')
      // 清除定时器
      if (this.data.timer) {
        clearInterval(this.data.timer);
        console.log('[录音回调] OnRecorderStop - 定时器已清除，timer ID:', this.data.timer);
      } else {
        console.log('[录音回调] OnRecorderStop - 警告：定时器不存在');
      }
      console.log('[录音回调] OnRecorderStop - 当前 sentence:', this.data.sentence)
      // 如果 isRecording 还是 true，说明是自动结束的，需要设置为 false
      const needStopRecording = this.data.isRecording;
      if (needStopRecording) {
        console.log('[录音回调] OnRecorderStop - 检测到 isRecording 为 true，设置为 false');
      }
      this.setData({
        inputContent: this.data.sentence,
        timer: null,
        ...(needStopRecording ? { isRecording: false } : {}) // 只有在需要时才设置
      })
      console.log('[录音回调] OnRecorderStop - 已更新 inputContent:', this.data.sentence, 'isRecording:', needStopRecording ? false : this.data.isRecording)
    }

  },

  /**
   * 加载品牌提示数据
   */
  async _loadBrandPrompts() {
    try {
      const res = await getBrandForPrompts();
      console.log('[paste] getBrandForPrompts raw:', res);
      if (res && res.result && res.result.code === 0) {
        const brands = Array.isArray(res.result.data) ? res.result.data : [];
        this.setData({ brandPrompts: brands });
        console.log('[paste] 品牌提示数据加载成功，数量:', brands.length);
      } else {
        const msg = res && res.result && res.result.msg ? res.result.msg : '品牌数据加载失败';
        console.warn('[paste] 品牌数据加载失败:', msg);
        // 不显示错误提示，因为品牌提示是可选的
      }
    } catch (error) {
      console.error('[paste] 获取品牌提示失败:', error);
      // 不显示错误提示，因为品牌提示是可选的，不影响主要功能
    }
  },

  startRecord() {
    console.log('[录音] ========== 开始录音 ==========');
    const that = this
    // 先清除可能存在的旧定时器
    if (that.data.timer) {
      console.log('[录音] 0. 检测到旧定时器，先清除，timer ID:', that.data.timer);
      clearInterval(that.data.timer);
    }
    console.log('[录音] 1. 初始化 duration 为 0');
    this.setData({
      duration: 0,
      timer: null
    })
    const params = {
      secretkey: TENCENT_CLOUD_SECRET_KEY,
      secretid: TENCENT_CLOUD_SECRET_ID,
      appid: TENCENT_CLOUD_APP_ID,
      engine_model_type: TENCENT_CLOUD_ENGINE_MODEL_TYPE,
      voice_format: TENCENT_CLOUD_VOICE_FORMAT
    }
    console.log('[录音] 2. 设置录音参数:', params);

    console.log('[录音] 3. 设置 isRecording: true, recognitionStatus: 准备中...');
    this.setData({
      isRecording: true,
      // sentence: '',
      recognitionStatus: '准备中...',
      duration: 0
    })
    console.log('[录音] 4. 当前状态 - isRecording:', this.data.isRecording, 'duration:', this.data.duration);

    console.log('[录音] 5. 创建定时器，每秒递增 duration');
    that.data.timer = setInterval(() => {
      const currentDuration = that.data.duration + 1;
      console.log('[录音] 定时器执行 - duration 更新为:', currentDuration);
      that.setData({
        duration: currentDuration
      })
    }, 1000)
    console.log('[录音] 6. 定时器已创建，timer ID:', that.data.timer);

    console.log('[录音] 7. 调用 speechRecognizerManager.start()');
    speechRecognizerManager.start(params)
    console.log('[录音] ========== 开始录音流程完成 ==========');
  },

  stopRecord() {
    console.log('[停止录音] ========== 停止录音 ==========');
    const that = this
    console.log('[停止录音] 1. 当前状态 - isRecording:', that.data.isRecording, 'duration:', that.data.duration, 'timer:', that.data.timer);
    
    console.log('[停止录音] 2. 清除定时器');
    if (that.data.timer) {
      clearInterval(that.data.timer);
      console.log('[停止录音] 3. 定时器已清除，timer ID:', that.data.timer);
    } else {
      console.log('[停止录音] 3. 警告：定时器不存在或已被清除');
    }
    
    console.log('[停止录音] 4. 设置 isRecording: false, recording: false, timer: null');
    that.setData({
      isRecording: false,  // 修复：添加 isRecording: false，这是按钮状态的关键
      recording: false,
      timer: null
    })
    console.log('[停止录音] 5. 状态已更新 - isRecording:', that.data.isRecording, 'recording:', that.data.recording);
   
    // 如果时长为0，不保存录音
    if (that.data.duration === 0) {
      console.log('[停止录音] 6. 录音时长为0，不保存录音，直接返回');
      console.log('[停止录音] 7. 调用 speechRecognizerManager.stop()');
      speechRecognizerManager.stop();
      console.log('[停止录音] ========== 停止录音流程完成（时长为0） ==========');
      return;
    }
   
    console.log('[停止录音] 6. 准备保存录音，duration:', that.data.duration);
    var data = {
      nxNdplNxDisId: that.data.disId,
      nxNdplPaySubtotal: that.data.duration,
      nxNdplNxDepartmentFatherId: that.data.depFatherId,
      nxNdplNxDepartmentId: that.data.depId,
    }
    console.log('[停止录音] 7. 录音数据:', data);
    load.showLoading("保存录音")
    console.log('[停止录音] 8. 调用 addRecord API');
    addRecord(data).then(res => {
      console.log('[停止录音] 9. addRecord API 响应:', res);
      if (res.result.code == 0) {
        load.hideLoading();
        console.log('[停止录音] 10. 保存成功，重置 duration 为 0');
        that.setData({
          duration: 0,
        })
      } else {
        console.log('[停止录音] 10. 保存失败，错误码:', res.result.code, '错误信息:', res.result.msg);
      }
    }).catch(err => {
      console.error('[停止录音] 10. addRecord API 调用失败:', err);
      load.hideLoading();
    })
    
    console.log('[停止录音] 11. 调用 speechRecognizerManager.stop()');
    speechRecognizerManager.stop();
    console.log('[停止录音] ========== 停止录音流程完成 ==========');
  },


  clearSentence() {
    this.setData({
      sentence: "",
      inputContent: "",
      orderArr: [],
      orderArrFixed: [],
      highlightedContent: "",
      // 重置 AI 识别相关状态
      aiRetryCount: 0,
      hasAiRecognized: false,
      showDeepSeekLoading: false,
      originSentence: "",
      hasUnsavedOrders: false, // 清空订单后，没有未保存的订单
    })
  },

 
  onInput(e) {
    const text = e.detail.value;
    // 同时更新 sentence 和 inputContent，保持同步
    // 用户修改内容后清除红色标注，下次点击预览会重新计算
    this.setData({
      sentence: text,
      inputContent: text.trim() !== '' ? text : null,
      highlightedContent: '',
    });
  },

  


  againPaste() {
    // 使用原始语音识别内容，而不是 AI 优化后的内容
    const originalText = this.data.originSentence || this.data.sentence || this.data.inputContent;
    
    
    // 重置相关状态
    this.setData({
      orderArr: [],
      sentence: originalText,
      inputContent: originalText, // 同时更新 inputContent，保持同步
      highlightedContent: '',
      saveCount: null, // 重置保存计数
      pasteDepList: null, // 清空 pasteDepList
      pasteDepId: null,
      pasteDep: null,
      pasteDepIndex: -1,
      strArr: [], // 清空搜索结果
      nxArr: [], // 清空下载商品
      orderArrIndex: -1, // 重置订单索引
      searchStr: "", // 清空搜索关键词
      hasUnsavedOrders: false, // 重置未保存订单状态
    })
  }, 



  /**
   * 第一次 AI 识别
   */
  async aiRecogniseFirst() {
    // 优先使用 inputContent，因为用户修改输入框时更新的是 inputContent
    // 如果没有 inputContent，再使用 sentence
    const content = this.data.inputContent || this.data.sentence;
    
    if (!content || content.trim() === '') {
      wx.showToast({ title: '内容为空', icon: 'none' });
      return;
    }

    console.log('开始第一次 AI 识别，输入内容:', content);
    
    this.setData({ 
      showDeepSeekLoading: true,
      aiRetryCount: 0 // 重置尝试次数
    });
    
    try {
      const optimizedText = await optimizeTextWithDeepSeek(content, {
        brandList: this.data.brandPrompts || [],
        temperature: 0.2,
        logPrefix: '[paste]'
      });
      console.log('第一次 AI 识别完成，优化后内容:', optimizedText);
      
      this.setData({
        inputContent: optimizedText,
        sentence: optimizedText,
        originSentence: content, // 保存原始内容用于再次识别
        showDeepSeekLoading: false,
        hasAiRecognized: true
      });
      
      // 重新进行订单解析
      this.formatContent();
      
      wx.showToast({ 
        title: 'AI识别完成', 
        icon: 'success',
        duration: 1500
      });
      
    } catch (e) {
      console.error('第一次 AI 识别失败:', e);
      this.setData({ showDeepSeekLoading: false });
      wx.showToast({ title: 'AI识别失败', icon: 'none' });
    }
  },

  
  
  formatContent: function () {
    var content = this.data.inputContent;
    console.log('[formatContent] 开始处理内容:', content);
    
    if (!content || content.trim() === '') {
      console.log('[formatContent] 内容为空，跳过处理');
      this.setData({ highlightedContent: '' });
      return;
    }

    // 解析前先移除可能存在的修改标记（上次插入的）
    content = this._stripInvalidMarkers(content);

    // 清空订单数组
    this.orderArray = [];
    
    // 使用工具函数解析订单
    const result = parseOrderFromText(content, {
      depId: this.data.depId,
      depFatherId: this.data.depFatherId,
      disId: this.data.disId,
      userId: this.data.userId
    });
    
    if (result.orders && result.orders.length > 0) {
      // 若存在不合格片段：在原文插入【！】标记，回显到 textarea
      if (result.invalidSegments && result.invalidSegments.length > 0) {
        const contentForHighlight = result.contentForHighlight || content;
        const modifiedContent = this._insertInvalidMarkersInContent(contentForHighlight, result.invalidSegments);
        this.setData({
          orderArr: [],
          sentence: modifiedContent,
          inputContent: modifiedContent
        });
        wx.showToast({ title: '存在格式不合格项，【】标记处请修改', icon: 'none', duration: 2500 });
        return result;
      }
      // 无问题，正常生成订单
      this.setData({ 
        orderArr: result.orders,
        saveCount: null,
        highlightedContent: ''
      });
      this._updateHasUnsavedOrders(result.orders);
      this.setData({ formattedContent: result.formatted || '' });
      return result;
    } else {
      console.log('[formatContent] 未解析到有效订单');
      this.setData({ highlightedContent: '' });
      return { orders: [], formatted: '' };
    }
  },

  /** 解析前移除插入的标记（【 和 】） */
  _stripInvalidMarkers: function (content) {
    if (!content) return '';
    return String(content).replace(/【/g, '').replace(/】/g, '');
  },

  /**
   * 在原文中按不合格片段的起止位置插入纯文本标记，开始用【结束用】
   * @param {string} content - 与解析时一致的内容（contentForHighlight）
   * @param {Array} invalidSegments - [{ segmentText }]
   * @returns {string} 插入【】标记后的原文
   */
  _insertInvalidMarkersInContent: function (content, invalidSegments) {
    if (!content || !invalidSegments || invalidSegments.length === 0) return content;
    let result = '';
    let remaining = content;
    while (true) {
      let best = { pos: -1, seg: null };
      for (const seg of invalidSegments) {
        if (!seg.segmentText) continue;
        const idx = remaining.indexOf(seg.segmentText);
        if (idx >= 0 && (best.pos < 0 || idx < best.pos)) {
          best = { pos: idx, seg };
        }
      }
      if (best.pos < 0) break;
      result += remaining.slice(0, best.pos);
      result += '【' + best.seg.segmentText + '】';
      remaining = remaining.slice(best.pos + best.seg.segmentText.length);
    }
    result += remaining;
    return result;
  },

  /**
   * 根据 invalidSegments 在原始内容中把不合格片段用红色标注，生成 rich-text 可用的 HTML
   */
  _buildHighlightedContent: function (content, invalidSegments) {
    if (!content || !invalidSegments || invalidSegments.length === 0) return '';
    const escapeHtml = (s) => {
      if (s == null) return '';
      return String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    };
    let result = '';
    let remaining = content;
    let matchedCount = 0;
    while (true) {
      let best = { pos: -1, seg: null };
      for (const seg of invalidSegments) {
        if (!seg.segmentText) continue;
        const idx = remaining.indexOf(seg.segmentText);
        if (idx >= 0 && (best.pos < 0 || idx < best.pos)) {
          best = { pos: idx, seg };
        }
      }
      if (best.pos < 0) break;
      matchedCount++;
      result += escapeHtml(remaining.slice(0, best.pos)).replace(/\n/g, '<br/>');
      // 不合格文字前后插入提示图片，标记修改位置
      const imgBefore = this.data.pasteImageBefore ? `<img src="${this.data.pasteImageBefore}" style="vertical-align:middle;width:36rpx;height:36rpx;margin:0 4rpx"/>` : '';
      const imgAfter = this.data.pasteImageAfter ? `<img src="${this.data.pasteImageAfter}" style="vertical-align:middle;width:36rpx;height:36rpx;margin:0 4rpx"/>` : '';
      result += imgBefore + '<span style="color:red;font-weight:bold">' + escapeHtml(best.seg.segmentText) + '</span>' + imgAfter;
      remaining = remaining.slice(best.pos + best.seg.segmentText.length);
    }
    result += escapeHtml(remaining).replace(/\n/g, '<br/>');
    if (matchedCount === 0) {
      console.warn('[_buildHighlightedContent] 未匹配到任何片段', invalidSegments.map(s => s.segmentText));
      return '<div style="white-space:pre-wrap;word-break:break-all;font-size:28rpx;line-height:1.5">以下内容格式不合格：<span style="color:red">' + escapeHtml(invalidSegments.map(s => s.segmentText).join('、')) + '</span></div>';
    }
    return '<div style="white-space:pre-wrap;word-break:break-all;font-size:28rpx;line-height:1.5">' + result + '</div>';
  },


  // 注意：_formatOrderContent 方法已迁移到 lib/orderParser.js，请使用 parseOrderFromText 工具函数
  // 保留此方法仅用于向后兼容，建议使用工具函数
  _formatOrderContent: function (content) {
    console.log('[formatOrderContent] 入参 content:', content);
    // 改为 let，后面要对 orders 重新赋值
    let orders = [];
    // 1. 按行拆分
    let lines = content.split(/\r?\n/);
  
    // 过滤无效行
    console.log("linessss", lines);
    lines = lines.filter(line => {
      line = line.trim();
      if (!line) return false; // 跳过空行
      if (/^备注[:：]/.test(line)) return true;
  
      let orderRegex = /^\d+[、，\.．]\s*(.+?)[:：]\s*(.+)$/;
      if (orderRegex.test(line)) return true;
  
      let commaRegex = /^(.*?)\s*[\,，]\s*(.+)$/;
      if (commaRegex.test(line)) return true;
  
      let hasNumber = /[\d零一二两三四五六七八九十百千万半]/.test(line);
      return hasNumber;
    });
  
    // ============ A. 中文数字转阿拉伯数字 ============
    function chineseNumberToArabic(chineseNum) {
      const map = {
        '零': 0, '一': 1, '二': 2, '两': 2, '三': 3,
        '四': 4, '五': 5, '六': 6, '七': 7, '八': 8,
        '九': 9, '十': 10, '百': 100, '千': 1000,
        '万': 10000, '半': 0.5
      };
      let result = 0, temp = 0;
      for (let i = 0; i < chineseNum.length; i++) {
        const char = chineseNum[i];
        if (char === '半') {
          result += 0.5;
        } else if (map[char] >= 10) {
          if (temp === 0) temp = 1;
          result += temp * map[char];
          temp = 0;
        } else if (map[char] !== undefined) {
          temp = temp * 10 + map[char];
        }
      }
      result += temp;
      return result;
    }
  
    // ============ B. 从尾部解析「名称 + 括号备注 + 数量+单位」 ============
    function parseSegmentEndOfLine(segment) {
      segment = segment.trim().replace(/[,，、。.]+$/g, '');
  
      // 先移除说明文字，避免被当作备注
      segment = segment.replace(/（说明.+?）/g, '');
      
      const bracketRegex = /(?:（|\(|【)(.+?)(?:）|\)|】)/;
      let remarkText = '';
      const bracketMatch = segment.match(bracketRegex);
      if (bracketMatch) {
        remarkText = bracketMatch[1];
        segment = segment.replace(bracketRegex, '').trim();
      }
  
      const hasArabic = /[0-9]/.test(segment);
      let name = segment, qtyVal = '', qtyUnit = '', regex;
  
      if (hasArabic) {
        regex = /^(.*?)([\d\.]+)(\S*)$/;
      } else {
        regex = /^(.*?)([一二两三四五六七八九十百千万半]+)(\S*)$/;
      }
      const m = segment.match(regex);
      if (m) {
        let potentialName = m[1].trim().replace(/\s+/g, '');
        let potentialQty  = m[2].trim();
        let potentialUnit = m[3].trim();
        name = potentialName;
  
        console.log('[parseSegmentEndOfLine] 解析结果:', {
          segment,
          potentialName,
          potentialQty,
          potentialUnit
        });
  
        // 数量值
        if (/^[\d\.]+$/.test(potentialQty)) {
          qtyVal = potentialQty;
        } else {
          qtyVal = chineseNumberToArabic(potentialQty).toString();
        }
  
        // 单位列表
        const validUnits = ['斤','个','包','根','棵','条','盒','捆','袋','跟','块','瓶','罐','桶','箱','件'];
        let foundUnit = '';
        for (let u of validUnits) {
          if (potentialUnit.startsWith(u)) {
            foundUnit = u; break;
          }
        }
        if (foundUnit) {
          qtyUnit = foundUnit;
          const extra = potentialUnit.slice(foundUnit.length).trim();
          if (extra) remarkText = remarkText ? (remarkText + ' ' + extra) : extra;
        } else {
          qtyUnit = potentialUnit;
        }
        
        console.log('[parseSegmentEndOfLine] 最终结果:', {
          name,
          qtyVal,
          qtyUnit,
          remarkText
        });
      }
  
      return {
        nxDoGoodsName: name,
        nxDoGoodsOriginalName: name, // 保存原始商品名称
        nxDoQuantity:  qtyVal,
        nxDoStandard:  qtyUnit,
        nxDoRemark:    remarkText,
      };
    }
  
    // ============ C. 序号格式解析 ============
    function parseLineWithSerial(line) {
      const match = line.match(/^(\d+)[、，\.．]\s*(.+?)[:：]\s*(.+)$/);
      if (!match) return null;
  
      let namePart = match[2].trim().replace(/\s+/g, '');
      let qtyPart  = match[3].trim().replace(/[\.。]+$/g, '').trim();
  
      // 先移除说明文字，避免被当作备注
      namePart = namePart.replace(/（说明.+?）/g, '');
      qtyPart = qtyPart.replace(/（说明.+?）/g, '');
  
      let remarkText = '';
      const br = namePart.match(/(?:（|\(|【)(.+?)(?:）|\)|】)/);
      if (br) { remarkText = br[1]; namePart = namePart.replace(/(?:（|\(|【).+?(?:）|\)|】)/, '').trim(); }
  
      const qMatch = qtyPart.match(/^([\d一二三四五六七八九十百千万半\.]+)\s*(\S*)$/);
      let val = '', unit = '';
      if (qMatch) { val = qMatch[1]; unit = qMatch[2]; }
      if (/[零一二两三四五六七八九十百千万半]/.test(val)) {
        val = chineseNumberToArabic(val).toString();
      }
      if (unit === '两' || unit === '量') {
        let v = parseFloat(val) / 10; v = +v.toFixed(1);
        val = v.toString(); unit = '斤';
      }
  
      return {
        nxDoGoodsName: namePart,
        nxDoGoodsOriginalName: namePart, // 保存原始商品名称
        nxDoQuantity:  val,
        nxDoStandard:  unit,
        nxDoRemark:    remarkText
      };
    }
  
    // ============ D. 拆逗号分隔 ============
    function splitByCommaOutsideBrackets(str) {
      let res = [], depth = 0, cur = '';
      for (let c of str) {
        if ('（(【'.includes(c)) { depth++; cur += c; }
        else if ('）)】'.includes(c)) { depth = Math.max(0, depth - 1); cur += c; }
        else if ((c === ','||c==='，'||c==='、') && depth === 0) {
          if (cur.trim()) res.push(cur.trim());
          cur = '';
        } else cur += c;
      }
      if (cur.trim()) res.push(cur.trim());
      return res;
    }
  
    function parseLineWithComma(line) {
      console.log('[parseLineWithComma] 开始解析行:', line);
      
      // 先移除说明文字（格式：说明...），避免说明文字中的逗号影响分割
      // 说明文字格式：（说明...）或（说明...）
      let remarkText = '';
      const remarkMatch = line.match(/（说明(.+?)）/);
      if (remarkMatch) {
        remarkText = remarkMatch[1];
        line = line.replace(/（说明.+?）/g, '').trim();
        console.log('[parseLineWithComma] 移除说明文字后:', line, '说明内容:', remarkText);
      }
      
      // 先按逗号分割，处理逗号分隔的商品
      if (/[，,]/.test(line)) {
        let commaParts = line.split(/[，,]/);
        let arr = [];
        
        console.log('[parseLineWithComma] 按逗号分割后的部分:', commaParts);
        
        for (let i = 0; i < commaParts.length; i++) {
          let item = commaParts[i].trim();
          if (!item) continue;
          
                    console.log('[parseLineWithComma] 处理逗号分割部分:', item);
          
          // 检查是否包含多个商品（用空格分隔）
          if (/\s/.test(item) && item.length > 10) {
            console.log('[parseLineWithComma] 检测到可能包含多个商品，尝试进一步分割:', item);
            let subParts = item.split(/\s+/);
            let subArr = [];
            
            for (let j = 0; j < subParts.length; j++) {
              let subItem = subParts[j].trim();
              if (!subItem) continue;
              
              console.log('[parseLineWithComma] 处理子部分:', subItem);
              
              // 检查子部分是否包含数字
              const subItemHasNumber = /[\d一二两三四五六七八九十百千万半]/.test(subItem);
              
              // 如果子部分没有数字，且下一部分有数字+单位格式，优先组合处理
              if (!subItemHasNumber && j < subParts.length - 1) {
                let nextSubItem = subParts[j + 1].trim();
                const nextSubItemHasNumberUnit = /^[\d一二两三四五六七八九十百千万半\.]+[斤个包根棵条盒捆袋跟块瓶罐桶箱毫升升克千克公斤件]+/.test(nextSubItem);
                
                if (nextSubItem && nextSubItemHasNumberUnit) {
                  let combinedSub = subItem + nextSubItem;
                  console.log('[parseLineWithComma] 子部分无数字，优先组合:', combinedSub);
                  
                  // 使用从右往左匹配
                  const unitMatch = combinedSub.match(/([斤个包根棵条盒捆袋跟块瓶罐桶箱毫升升克千克公斤]+)$/);
                  if (unitMatch) {
                    const unit = unitMatch[1];
                    const beforeUnit = combinedSub.slice(0, -unit.length);
                    
                    const qtyMatch = beforeUnit.match(/([\d一二两三四五六七八九十百千万半\.]+)$/);
                    if (qtyMatch) {
                      const quantity = qtyMatch[1];
                      const goodsName = beforeUnit.slice(0, -quantity.length).trim();
                      
                      if (goodsName && /[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0) {
                        let qtyVal = quantity;
                        if (/[零一二两三四五六七八九十百千万半]/.test(quantity)) {
                          qtyVal = chineseNumberToArabic(quantity).toString();
                        }
                        
                        let subRemarkText = '';
                        const bracketRegex = /(?:（|\(|【)(.+?)(?:）|\)|】)/;
                        const bracketMatch = unit.match(bracketRegex);
                        if (bracketMatch) {
                          subRemarkText = bracketMatch[1];
                          unit = unit.replace(bracketRegex, '').trim();
                        }
                        
                        console.log('[parseLineWithComma] 子部分组合成功:', { goodsName, qtyVal, unit });
                        subArr.push({
                          nxDoGoodsName: goodsName,
                          nxDoGoodsOriginalName: goodsName, // 保存原始商品名称
                          nxDoQuantity: qtyVal,
                          nxDoStandard: unit,
                          nxDoRemark: subRemarkText || remarkText
                        });
                        j++; // 跳过下一个部分
                        continue;
                      }
                    }
                  }
                }
              }
              
              // 对子部分进行解析
              let subMm = subItem.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)(\S*)$/);
              if (subMm) {
                let subGoodsName = subMm[1].trim();
                let subQuantity = subMm[2].trim();
                let subUnit = subMm[3].trim().replace(/[。，,\.]+$/, ''); // 去掉末尾的标点符号
                
                console.log('[parseLineWithComma] 子部分匹配成功:', { subGoodsName, subQuantity, subUnit });
                
                // 验证：如果数量是单个中文字符，且商品名以中文结尾，可能是误匹配
                const isSingleChineseNumber = /^[一二两三四五六七八九十]$/.test(subQuantity);
                const subGoodsNameEndsWithChinese = /[\u4e00-\u9fa5]$/.test(subGoodsName);
                
                if (isSingleChineseNumber && subGoodsNameEndsWithChinese && j < subParts.length - 1) {
                  // 可能是误匹配，跳过这个子部分，让下一轮循环处理组合
                  console.log('[parseLineWithComma] 子部分可能是误匹配，跳过');
                  continue;
                }
                
                if (/[\u4e00-\u9fa5]/.test(subGoodsName) && subGoodsName.length > 0 && subGoodsName.length <= 10) {
                  let subQtyVal = subQuantity;
                  if (/[零一二两三四五六七八九十百千万半]/.test(subQuantity)) {
                    subQtyVal = chineseNumberToArabic(subQuantity).toString();
                  }
                  
                  console.log('[parseLineWithComma] 添加子商品:', { subGoodsName, subQtyVal, subUnit });
                  subArr.push({
                    nxDoGoodsName: subGoodsName,
                    nxDoGoodsOriginalName: subGoodsName, // 保存原始商品名称
                    nxDoQuantity: subQtyVal,
                    nxDoStandard: subUnit,
                    nxDoRemark: remarkText
                  });
                }
              } else {
                // 尝试使用 parseSegmentEndOfLine 解析子部分
                let subParsed = parseSegmentEndOfLine(subItem);
                if (subParsed && subParsed.nxDoQuantity) {
                  console.log('[parseLineWithComma] 子部分 parseSegmentEndOfLine 解析结果:', subParsed);
                  if (remarkText) {
                    subParsed.nxDoRemark = (subParsed.nxDoRemark || '') + ' ' + remarkText;
                  }
                  // 确保有原始商品名称字段
                  if (!subParsed.nxDoGoodsOriginalName) {
                    subParsed.nxDoGoodsOriginalName = subParsed.nxDoGoodsName || '';
                  }
                  subArr.push(subParsed);
                }
              }
            }
            
            if (subArr.length > 0) {
              console.log('[parseLineWithComma] 子部分解析成功，添加多个商品:', subArr);
              arr.push(...subArr);
              continue;
            }
          }
          
          // 1. 尝试匹配 "商品名+数字+单位" 格式
          let mm = item.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)(\S*)$/);
          console.log('[parseLineWithComma] 正则匹配结果:', mm);
          if (mm) {
            let goodsName = mm[1].trim();
            let quantity = mm[2].trim();
            let unit = mm[3].trim().replace(/[。，,\.]+$/, ''); // 去掉末尾的标点符号
            
            console.log('[parseLineWithComma] 匹配到格式1:', { goodsName, quantity, unit });
            
            // 验证商品名包含中文字符，并且商品名不能太长（避免匹配到多个商品）
            console.log('[parseLineWithComma] 验证商品名:', { goodsName, hasChinese: /[\u4e00-\u9fa5]/.test(goodsName), length: goodsName.length });
            if (/[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0 && goodsName.length <= 10) {
              let qtyVal = quantity;
              if (/[零一二两三四五六七八九十百千万半]/.test(quantity)) {
                qtyVal = chineseNumberToArabic(quantity).toString();
              }
              
              console.log('[parseLineWithComma] 添加商品:', { goodsName, qtyVal, unit });
              arr.push({
                nxDoGoodsName: goodsName,
                nxDoGoodsOriginalName: goodsName, // 保存原始商品名称
                nxDoQuantity: qtyVal,
                nxDoStandard: unit,
                nxDoRemark: ''
              });
              continue;
            } else {
              console.log('[parseLineWithComma] 商品名验证失败:', { goodsName, hasChinese: /[\u4e00-\u9fa5]/.test(goodsName), length: goodsName.length });
            }
          }
          
          // 2. 尝试使用 parseSegmentEndOfLine 解析
          let parsed = parseSegmentEndOfLine(item);
          if (parsed && parsed.nxDoQuantity) {
            console.log('[parseLineWithComma] parseSegmentEndOfLine 解析结果:', parsed);
            // 确保有原始商品名称字段
            if (!parsed.nxDoGoodsOriginalName) {
              parsed.nxDoGoodsOriginalName = parsed.nxDoGoodsName || '';
            }
            arr.push(parsed);
            continue;
          }
          
          // 3. 如果都失败了，尝试匹配纯数字格式
          mm = item.match(/^(.+?)(\d+)(.+)$/);
          if (mm) {
            let goodsName = mm[1].trim();
            if (/[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0) {
              console.log('[parseLineWithComma] 匹配到纯数字格式:', mm);
              arr.push({
                nxDoGoodsName: goodsName,
                nxDoGoodsOriginalName: goodsName, // 保存原始商品名称
                nxDoQuantity: mm[2].trim(),
                nxDoStandard: mm[3].trim(),
                nxDoRemark: ''
              });
              continue;
            }
          }
          
          // 4. 新增：尝试组合相邻部分
          if (i < commaParts.length - 1) {
            let nextItem = commaParts[i + 1].trim();
            if (nextItem) {
              let combined = item + nextItem;
              console.log('[parseLineWithComma] 尝试组合:', combined);
              
              // 尝试匹配组合后的格式
              mm = combined.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)(\S*)$/);
              if (mm) {
                let goodsName = mm[1].trim();
                let quantity = mm[2].trim();
                let unit = mm[3].trim().replace(/[。，,\.]+$/, '');
                
                console.log('[parseLineWithComma] 组合匹配成功:', { goodsName, quantity, unit });
                
                if (/[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0) {
                  let qtyVal = quantity;
                  if (/[零一二两三四五六七八九十百千万半]/.test(quantity)) {
                    qtyVal = chineseNumberToArabic(quantity).toString();
                  }
                  
                  console.log('[parseLineWithComma] 添加组合商品:', { goodsName, qtyVal, unit });
                  arr.push({
                    nxDoGoodsName: goodsName,
                    nxDoGoodsOriginalName: goodsName, // 保存原始商品名称
                    nxDoQuantity: qtyVal,
                    nxDoStandard: unit,
                    nxDoRemark: ''
                  });
                  i++; // 跳过下一个部分，因为已经组合处理了
                  continue;
                }
              }
            }
          }
          
          // 5. 新增：处理被分割的商品名（如"油 菜"）
          if (i < commaParts.length - 2) {
            let nextItem = commaParts[i + 1].trim();
            let nextNextItem = commaParts[i + 2].trim();
            
            // 检查当前项和下一项是否都是中文字符，且下一项的下一个项包含数字
            if (/^[\u4e00-\u9fa5]+$/.test(item) && 
                /^[\u4e00-\u9fa5]+$/.test(nextItem) && 
                /[\d一二两三四五六七八九十百千万半]/.test(nextNextItem)) {
              
              let combinedName = item + nextItem;
              let combined = combinedName + nextNextItem;
              console.log('[parseLineWithComma] 尝试组合商品名:', combined);
              
              // 尝试匹配组合后的格式
              mm = combined.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)(\S*)$/);
              if (mm) {
                let goodsName = mm[1].trim();
                let quantity = mm[2].trim();
                let unit = mm[3].trim().replace(/[。，,\.]+$/, '');
                
                console.log('[parseLineWithComma] 商品名组合匹配成功:', { goodsName, quantity, unit });
                
                if (/[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0) {
                  let qtyVal = quantity;
                  if (/[零一二两三四五六七八九十百千万半]/.test(quantity)) {
                    qtyVal = chineseNumberToArabic(quantity).toString();
                  }
                  
                  console.log('[parseLineWithComma] 添加组合商品名商品:', { goodsName, qtyVal, unit });
                  arr.push({
                    nxDoGoodsName: goodsName,
                    nxDoGoodsOriginalName: goodsName, // 保存原始商品名称
                    nxDoQuantity: qtyVal,
                    nxDoStandard: unit,
                    nxDoRemark: ''
                  });
                  i += 2; // 跳过两个部分，因为已经组合处理了
                  continue;
                }
              }
            }
          }
        }
        
        console.log('[parseLineWithComma] 逗号分割最终解析结果:', arr);
        if (arr.length) {
          return arr;
        }
      }

      // 如果没有逗号，尝试按空格分割
      if (/\s/.test(line)) {
        let spaceParts = line.split(/\s+/);
        let arr = [];
        
        console.log('[parseLineWithComma] 按空格分割后的部分:', spaceParts);
        
        for (let i = 0; i < spaceParts.length; i++) {
          let item = spaceParts[i].trim();
          if (!item) continue;
          
          console.log('[parseLineWithComma] 处理空格分割部分:', item);
          
          // 检查当前部分是否包含数字（用于判断是否需要与下一部分组合）
          const hasNumberInItem = /[\d一二两三四五六七八九十百千万半]/.test(item);
          
          // 优先处理：如果下一部分有明确的"数字+单位"格式，优先组合处理
          // 这样可以避免商品名中的数字（如"一品鲜"中的"一"）被误识别为数量
          if (i < spaceParts.length - 1) {
            let nextItem = spaceParts[i + 1].trim();
            // 检查下一部分是否是明确的"数字+单位"格式（如"1瓶"、"2斤"等）
            const nextItemHasNumberUnit = /^[\d一二两三四五六七八九十百千万半\.]+[斤个包根棵条盒捆袋跟块瓶罐桶箱毫升升克千克公斤件]+/.test(nextItem);
            
            if (nextItem && nextItemHasNumberUnit) {
              let combined = item + nextItem;
              console.log('[parseLineWithComma] 下一部分有数字+单位格式，优先组合:', combined);
              
              // 使用从右往左匹配：先匹配单位，再匹配数量，最后是商品名
              // 这样可以避免商品名中的数字被误识别
                  const unitMatch = combined.match(/([斤个包根棵条盒捆袋跟块瓶罐桶箱毫升升克千克公斤件]+)$/);
              if (unitMatch) {
                const unit = unitMatch[1];
                const beforeUnit = combined.slice(0, -unit.length);
                
                // 从右往左匹配数量（阿拉伯数字或中文数字）
                const qtyMatch = beforeUnit.match(/([\d一二两三四五六七八九十百千万半\.]+)$/);
                if (qtyMatch) {
                  const quantity = qtyMatch[1];
                  const goodsName = beforeUnit.slice(0, -quantity.length).trim();
                  
                  // 验证商品名不为空且包含中文字符
                  if (goodsName && /[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0) {
                    let qtyVal = quantity;
                    if (/[零一二两三四五六七八九十百千万半]/.test(quantity)) {
                      qtyVal = chineseNumberToArabic(quantity).toString();
                    }
                    
                    // 处理备注：从单位中提取括号内的备注
                    let remarkText = '';
                    const bracketRegex = /(?:（|\(|【)(.+?)(?:）|\)|】)/;
                    const bracketMatch = unit.match(bracketRegex);
                    if (bracketMatch) {
                      remarkText = bracketMatch[1];
                      unit = unit.replace(bracketRegex, '').trim();
                    }
                    
                    console.log('[parseLineWithComma] 从右往左匹配成功:', { goodsName, qtyVal, unit, remarkText });
                    arr.push({
                      nxDoGoodsName: goodsName,
                      nxDoGoodsOriginalName: goodsName, // 保存原始商品名称
                      nxDoQuantity: qtyVal,
                      nxDoStandard: unit,
                      nxDoRemark: remarkText
                    });
                    i++; // 跳过下一个部分，因为已经组合处理了
                    continue;
                  }
                }
              }
              
              // 如果从右往左匹配失败，尝试使用原来的正则匹配
              let mm = combined.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)([斤个包根棵条盒捆袋跟块瓶罐桶箱毫升升克千克公斤件]+)$/);
              if (mm) {
                let goodsName = mm[1].trim();
                let quantity = mm[2].trim();
                let unit = mm[3].trim();
                
                console.log('[parseLineWithComma] 组合匹配成功:', { goodsName, quantity, unit });
                
                // 验证：商品名应该包含当前部分的内容
                if (/[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0 && goodsName.includes(item)) {
                  let qtyVal = quantity;
                  if (/[零一二两三四五六七八九十百千万半]/.test(quantity)) {
                    qtyVal = chineseNumberToArabic(quantity).toString();
                  }
                  
                  // 处理备注：从单位中提取括号内的备注
                  let remarkText = '';
                  const bracketRegex = /(?:（|\(|【)(.+?)(?:）|\)|】)/;
                  const bracketMatch = unit.match(bracketRegex);
                  if (bracketMatch) {
                    remarkText = bracketMatch[1];
                    unit = unit.replace(bracketRegex, '').trim();
                  }
                  
                  console.log('[parseLineWithComma] 添加组合商品:', { goodsName, qtyVal, unit, remarkText });
                  arr.push({
                    nxDoGoodsName: goodsName,
                    nxDoGoodsOriginalName: goodsName, // 保存原始商品名称
                    nxDoQuantity: qtyVal,
                    nxDoStandard: unit,
                    nxDoRemark: remarkText
                  });
                  i++; // 跳过下一个部分，因为已经组合处理了
                  continue;
                }
              }
            }
          }
          
          // 1. 尝试匹配 "商品名+数字+单位" 格式
          let mm = item.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)(\S*)$/);
          console.log('[parseLineWithComma] 正则匹配结果:', mm);
          if (mm) {
            let goodsName = mm[1].trim();
            let quantity = mm[2].trim();
            let unit = mm[3].trim().replace(/[。，,\.]+$/, ''); // 去掉末尾的标点符号
            
            console.log('[parseLineWithComma] 匹配到格式1:', { goodsName, quantity, unit });
            
            // 验证：如果数量是单个中文字符（如"一"），且商品名以中文字符结尾，可能是误匹配
            // 例如："李锦记一品鲜" 中的 "一" 不应该被识别为数量
            const isSingleChineseNumber = /^[一二两三四五六七八九十]$/.test(quantity);
            const goodsNameEndsWithChinese = /[\u4e00-\u9fa5]$/.test(goodsName);
            
            if (isSingleChineseNumber && goodsNameEndsWithChinese && i < spaceParts.length - 1) {
              // 可能是误匹配，尝试与下一部分组合
              let nextItem = spaceParts[i + 1].trim();
              if (nextItem && /[\d一二两三四五六七八九十百千万半]/.test(nextItem)) {
                console.log('[parseLineWithComma] 检测到可能的误匹配，尝试组合下一部分');
                let combined = item + nextItem;
                
                // 使用从右往左匹配：先匹配单位，再匹配数量，最后是商品名
                  const unitMatch = combined.match(/([斤个包根棵条盒捆袋跟块瓶罐桶箱毫升升克千克公斤件]+)$/);
                if (unitMatch) {
                  const combinedUnit = unitMatch[1];
                  const beforeUnit = combined.slice(0, -combinedUnit.length);
                  
                  // 从右往左匹配数量
                  const qtyMatch = beforeUnit.match(/([\d一二两三四五六七八九十百千万半\.]+)$/);
                  if (qtyMatch) {
                    const combinedQuantity = qtyMatch[1];
                    const combinedGoodsName = beforeUnit.slice(0, -combinedQuantity.length).trim();
                    
                    // 验证组合后的商品名包含原始商品名，且数量不在商品名中
                    if (combinedGoodsName && /[\u4e00-\u9fa5]/.test(combinedGoodsName) && combinedGoodsName.includes(goodsName)) {
                      console.log('[parseLineWithComma] 组合后从右往左匹配成功，使用组合结果:', { combinedGoodsName, combinedQuantity, combinedUnit });
                      let qtyVal = combinedQuantity;
                      if (/[零一二两三四五六七八九十百千万半]/.test(combinedQuantity)) {
                        qtyVal = chineseNumberToArabic(combinedQuantity).toString();
                      }
                      
                      let remarkText = '';
                      const bracketRegex = /(?:（|\(|【)(.+?)(?:）|\)|】)/;
                      const bracketMatch = combinedUnit.match(bracketRegex);
                      if (bracketMatch) {
                        remarkText = bracketMatch[1];
                        combinedUnit = combinedUnit.replace(bracketRegex, '').trim();
                      }
                      
                      arr.push({
                        nxDoGoodsName: combinedGoodsName,
                        nxDoGoodsOriginalName: combinedGoodsName, // 保存原始商品名称
                        nxDoQuantity: qtyVal,
                        nxDoStandard: combinedUnit,
                        nxDoRemark: remarkText
                      });
                      i++; // 跳过下一个部分
                      continue;
                    }
                  }
                }
                
                // 如果从右往左匹配失败，尝试使用原来的正则匹配
                let combinedMm = combined.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)([斤个包根棵条盒捆袋跟块瓶罐桶箱毫升升克千克公斤]+)$/);
                if (combinedMm) {
                  let combinedGoodsName = combinedMm[1].trim();
                  let combinedQuantity = combinedMm[2].trim();
                  let combinedUnit = combinedMm[3].trim();
                  
                  // 验证组合后的商品名包含原始商品名
                  if (/[\u4e00-\u9fa5]/.test(combinedGoodsName) && combinedGoodsName.includes(goodsName)) {
                    console.log('[parseLineWithComma] 组合后匹配成功，使用组合结果:', { combinedGoodsName, combinedQuantity, combinedUnit });
                    let qtyVal = combinedQuantity;
                    if (/[零一二两三四五六七八九十百千万半]/.test(combinedQuantity)) {
                      qtyVal = chineseNumberToArabic(combinedQuantity).toString();
                    }
                    
                    let remarkText = '';
                    const bracketRegex = /(?:（|\(|【)(.+?)(?:）|\)|】)/;
                    const bracketMatch = combinedUnit.match(bracketRegex);
                    if (bracketMatch) {
                      remarkText = bracketMatch[1];
                      combinedUnit = combinedUnit.replace(bracketRegex, '').trim();
                    }
                    
                    arr.push({
                      nxDoGoodsName: combinedGoodsName,
                      nxDoGoodsOriginalName: combinedGoodsName, // 保存原始商品名称
                      nxDoQuantity: qtyVal,
                      nxDoStandard: combinedUnit,
                      nxDoRemark: remarkText
                    });
                    i++; // 跳过下一个部分
                    continue;
                  }
                }
              }
            }
            
            // 验证商品名包含中文字符，并且商品名不能太长（避免匹配到多个商品）
            console.log('[parseLineWithComma] 验证商品名:', { goodsName, hasChinese: /[\u4e00-\u9fa5]/.test(goodsName), length: goodsName.length });
            if (/[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0 && goodsName.length <= 10) {
              let qtyVal = quantity;
              if (/[零一二两三四五六七八九十百千万半]/.test(quantity)) {
                qtyVal = chineseNumberToArabic(quantity).toString();
              }
              
              console.log('[parseLineWithComma] 添加商品:', { goodsName, qtyVal, unit });
              arr.push({
                nxDoGoodsName: goodsName,
                nxDoGoodsOriginalName: goodsName, // 保存原始商品名称
                nxDoQuantity: qtyVal,
                nxDoStandard: unit,
                nxDoRemark: ''
              });
              continue;
            } else {
              console.log('[parseLineWithComma] 商品名验证失败:', { goodsName, hasChinese: /[\u4e00-\u9fa5]/.test(goodsName), length: goodsName.length });
            }
          }
          
          // 2. 尝试使用 parseSegmentEndOfLine 解析
          let parsed = parseSegmentEndOfLine(item);
          if (parsed && parsed.nxDoQuantity) {
            console.log('[parseLineWithComma] parseSegmentEndOfLine 解析结果:', parsed);
            // 确保有原始商品名称字段
            if (!parsed.nxDoGoodsOriginalName) {
              parsed.nxDoGoodsOriginalName = parsed.nxDoGoodsName || '';
            }
            arr.push(parsed);
            continue;
          }
          
          // 3. 如果都失败了，尝试匹配纯数字格式
          mm = item.match(/^(.+?)(\d+)(.+)$/);
          if (mm) {
            let goodsName = mm[1].trim();
            if (/[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0) {
              console.log('[parseLineWithComma] 匹配到纯数字格式:', mm);
              arr.push({
                nxDoGoodsName: goodsName,
                nxDoGoodsOriginalName: goodsName, // 保存原始商品名称
                nxDoQuantity: mm[2].trim(),
                nxDoStandard: mm[3].trim(),
                nxDoRemark: ''
              });
              continue;
            }
          }
          
          // 4. 新增：尝试组合相邻部分
          if (i < spaceParts.length - 1) {
            let nextItem = spaceParts[i + 1].trim();
            if (nextItem) {
              let combined = item + nextItem;
              console.log('[parseLineWithComma] 尝试组合:', combined);
              
              // 尝试匹配组合后的格式
              mm = combined.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)(\S*)$/);
              if (mm) {
                let goodsName = mm[1].trim();
                let quantity = mm[2].trim();
                let unit = mm[3].trim().replace(/[。，,\.]+$/, '');
                
                console.log('[parseLineWithComma] 组合匹配成功:', { goodsName, quantity, unit });
                
                if (/[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0) {
                  let qtyVal = quantity;
                  if (/[零一二两三四五六七八九十百千万半]/.test(quantity)) {
                    qtyVal = chineseNumberToArabic(quantity).toString();
                  }
                  
                  // 处理备注：从单位中提取括号内的备注
                  let remarkText = '';
                  const bracketRegex = /(?:（|\(|【)(.+?)(?:）|\)|】)/;
                  const bracketMatch = unit.match(bracketRegex);
                  if (bracketMatch) {
                    remarkText = bracketMatch[1];
                    unit = unit.replace(bracketRegex, '').trim();
                  }
                  
                  console.log('[parseLineWithComma] 添加组合商品:', { goodsName, qtyVal, unit, remarkText });
                  arr.push({
                    nxDoGoodsName: goodsName,
                    nxDoGoodsOriginalName: goodsName, // 保存原始商品名称
                    nxDoQuantity: qtyVal,
                    nxDoStandard: unit,
                    nxDoRemark: remarkText
                  });
                  i++; // 跳过下一个部分，因为已经组合处理了
                  continue;
                }
              }
            }
          }
          
          // 5. 新增：处理被分割的商品名（如"油 菜"）
          if (i < spaceParts.length - 2) {
            let nextItem = spaceParts[i + 1].trim();
            let nextNextItem = spaceParts[i + 2].trim();
            
            // 检查当前项和下一项是否都是中文字符，且下一项的下一个项包含数字
            if (/^[\u4e00-\u9fa5]+$/.test(item) && 
                /^[\u4e00-\u9fa5]+$/.test(nextItem) && 
                /[\d一二两三四五六七八九十百千万半]/.test(nextNextItem)) {
              
              let combinedName = item + nextItem;
              let combined = combinedName + nextNextItem;
              console.log('[parseLineWithComma] 尝试组合商品名:', combined);
              
              // 尝试匹配组合后的格式
              mm = combined.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)(\S*)$/);
              if (mm) {
                let goodsName = mm[1].trim();
                let quantity = mm[2].trim();
                let unit = mm[3].trim().replace(/[。，,\.]+$/, '');
                
                console.log('[parseLineWithComma] 商品名组合匹配成功:', { goodsName, quantity, unit });
                
                if (/[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0) {
                  let qtyVal = quantity;
                  if (/[零一二两三四五六七八九十百千万半]/.test(quantity)) {
                    qtyVal = chineseNumberToArabic(quantity).toString();
                  }
                  
                  // 处理备注：从单位中提取括号内的备注
                  let remarkText = '';
                  const bracketRegex = /(?:（|\(|【)(.+?)(?:）|\)|】)/;
                  const bracketMatch = unit.match(bracketRegex);
                  if (bracketMatch) {
                    remarkText = bracketMatch[1];
                    unit = unit.replace(bracketRegex, '').trim();
                  }
                  
                  console.log('[parseLineWithComma] 添加组合商品名商品:', { goodsName, qtyVal, unit, remarkText });
                  arr.push({
                    nxDoGoodsName: goodsName,
                    nxDoGoodsOriginalName: goodsName, // 保存原始商品名称
                    nxDoQuantity: qtyVal,
                    nxDoStandard: unit,
                    nxDoRemark: remarkText
                  });
                  i += 2; // 跳过两个部分，因为已经组合处理了
                  continue;
                }
              }
            }
          }
        }
        
        console.log('[parseLineWithComma] 空格分割最终解析结果:', arr);
        if (arr.length) {
          return arr;
        }
      }

      // 逗号分隔
      line = line.replace(/[\u3002]+/g, ',');
      let segs = splitByCommaOutsideBrackets(line), arr = [];
      segs.forEach(seg => {
        let result = parseSegmentEndOfLine(seg);
        if (result) arr.push(result);
      });
      return arr;
    }
  
    // ============ E. 逐行处理 ============
    lines.forEach(line => {
      line = line.trim();
      if (!line) return;
      
      if (/^备注[:：]/.test(line)) {
        if (orders.length) {
          let last = orders[orders.length - 1];
          last.nxDoRemark = (last.nxDoRemark || '') + ' ' + line.replace(/^备注[:：]/, '').trim();
        }
        return;
      }
  
      // 1) 序号格式
      let obj1 = parseLineWithSerial(line);
      if (obj1) {
        orders.push({
          ...obj1,
          nxDoAddRemark: !!obj1.nxDoRemark,
          nxDoStatus: -2,
          nxDoDepartmentId: this.data.depId,
          nxDoDepartmentFatherId: this.data.depFatherId,
          nxDoDisGoodsId: null,
          nxDoStandardWarn: 0,
          goodsNameWarn: 0,
          nxDoDistributerId: this.data.disId,
          nxDoPurchaseUserId: -1,
          nxDoOrderUserId: this.data.userId,
          nxDoIsAgent: -1,
          standardWeight: "",
          cartonUnit: "",
          itemUnit: "",
          itemsPerCarton: "",
        });
        return;
      }
  
      // 2) 冒号替换为空格
      if (/^(.*?)[:：](.+)$/.test(line)) {
        console.log('[formatOrderContent] 检测到冒号，替换为空格');
        line = line.replace(/^(.+?)[:：](.+)$/, '$1 $2');
        console.log('[formatOrderContent] 冒号替换后:', line);
      }
  
      // 3) 逗号分隔
      
      let arr2 = parseLineWithComma(line);
      if (arr2 && arr2.length) {
        arr2.forEach(i => {
          if (i && i.nxDoGoodsName) {
            // 如果 parseLineWithComma 返回的对象已经有 nxDoGoodsNameOriginal，使用它
            // 如果没有，使用 nxDoGoodsName（这种情况应该很少，因为 parseLineWithComma 应该已经设置了）
            const originalName = i.nxDoGoodsOriginalName || i.nxDoGoodsName;
            orders.push({
              ...i,
              nxDoGoodsOriginalName: originalName, // 使用解析时设置的原始名称，不修改
              nxDoAddRemark: !!i.nxDoRemark,
              nxDoStatus: -2,
              nxDoDepartmentId: this.data.depId,
              nxDoDepartmentFatherId: this.data.depFatherId,
              nxDoDisGoodsId: null,
              nxDoStandardWarn: 0,
              goodsNameWarn: 0,
              nxDoDistributerId: this.data.disId,
              nxDoPurchaseUserId: -1,
              nxDoOrderUserId: this.data.userId,
              nxDoIsAgent: -1,
              standardWeight: "",
              cartonUnit: "",
              itemUnit: "",
              itemsPerCarton: "",
            });
          }
        });
        return;
      }
  
      // 4) 空格分隔（兜底）
      let parts = line.split(/\s+/);
      parts.forEach(item => {
        let mm = item.match(/^(.+?)(\d+)(.+)$/);
        if (mm) {
          const goodsName = mm[1].trim();
          orders.push({
            nxDoGoodsName: goodsName,
            nxDoGoodsOriginalName: goodsName, // 保存原始商品名称
            nxDoQuantity:  mm[2].trim(),
            nxDoStandard:  mm[3].trim(),
            nxDoRemark:    '',
            nxDoAddRemark: false,
            nxDoStatus: -2,
            nxDoDepartmentId: this.data.depId,
            nxDoDepartmentFatherId: this.data.depFatherId,
            nxDoDisGoodsId: null,
            nxDoStandardWarn: 0,
            goodsNameWarn: 0,
            nxDoDistributerId: this.data.disId,
            nxDoPurchaseUserId: -1,
            nxDoOrderUserId: this.data.userId,
            nxDoIsAgent: -1,
            standardWeight: "",
            cartonUnit: "",
            itemUnit: "",
            itemsPerCarton: "",

          });
        }
      });
    });
  
    // ============ F. 初次写入 ============
    this.setData({ orderArr: orders });
    // 更新未保存订单状态
    this._updateHasUnsavedOrders(orders);
    
    // ============ F3. 最终新增 nxDoAddRemark 字段（保险） ============
    orders = orders.map(o => ({
      ...o,
      nxDoAddRemark: !!o.nxDoRemark
    }));
  
    // ============ G. 最终写入 ============
    // 新解析的订单都是未保存的草稿（status == -2），所以 saveCount 应该为 null（显示保存按钮）
    this.setData({ 
      orderArr: orders,
      saveCount: null // 确保保存按钮显示
    });
    // 更新未保存订单状态
    this._updateHasUnsavedOrders(orders);
   
  
    // ============ H. 可选：返回预览字符串 ============
    const formatted = orders.map(o => {
      let str = `${o.nxDoGoodsName}${o.nxDoQuantity}${o.nxDoStandard}`;
      if (o.nxDoRemark) str += `（${o.nxDoRemark}）`;
      return str;
    }).join('\n');
    return { orders, formatted };
  },


  //修改预览订单内容
  editOrder(e) {
    
    var type = e.currentTarget.dataset.type;
    var index = e.currentTarget.dataset.index;
    // 用户开始编辑时清除校验失败高亮
    if (this.data.invalidOrderIndex >= 0) {
      this.setData({ invalidOrderIndex: -1, invalidOrderField: '' });
    }
    if (e.detail.value.length > 0) {

      this.setData({
        orderArrIndex: index,

      })
      if (type == "name") {
        var data = "orderArr[" + index + "].nxDoGoodsName";
        this.setData({
          [data]: e.detail.value,
        })
      }
      if (type == "quantity") {
        console.log("quannaididi", e.detail.value);
        var data = "orderArr[" + index + "].nxDoQuantity";
        this.setData({
          [data]: e.detail.value,
        })
      }
      if (type == "standard") {
        var data = "orderArr[" + index + "].nxDoStandard";
        this.setData({
          [data]: e.detail.value,
        })
      }

    }
    if (type == "remark") {
      var data = "orderArr[" + index + "].nxDoRemark";
      if (e.detail.value.length > 0) {
        this.setData({
          [data]: e.detail.value,
        })
      }
       else {
        var dataAdd = "orderArr[" + index + "].nxDoAddRemark";
        this.setData({
          [data]: "",
          [dataAdd]: false
        })
      }

    }

  },



  //保存预览订单
  pasteSearchGoods() {
    const orderArr = this.data.orderArr || [];
    const result = this._validateOrdersForSave(orderArr);
    console.log('[pasteSearchGoods] 校验结果:', result);
    if (!result.valid) {
      console.log('[pasteSearchGoods] 校验失败，invalidIndex:', result.invalidIndex, 'msg:', result.msg);
      wx.showModal({
        title: '订单校验失败',
        content: result.msg,
        showCancel: false,
        confirmText: '知道了',
        success: (res) => {
          console.log('[pasteSearchGoods] 弹窗关闭 success', res);
          const idx = result.invalidIndex;
          const scrollId = `paste-order-item-${idx}`;
          console.log('[pasteSearchGoods] 准备 setData invalidOrderIndex=', idx, 'scrollIntoViewId=', scrollId);
          console.log('[pasteSearchGoods] 当前 orderArrIndex=', this.data.orderArrIndex, 'invalidOrderIndex=', this.data.invalidOrderIndex, 'saveCount=', this.data.saveCount);
          this.setData({
            orderArrIndex: idx,
            invalidOrderIndex: idx,
            invalidOrderField: result.invalidField || '',
            scrollIntoViewId: scrollId
          }, () => {
            console.log('[pasteSearchGoods] setData 完成，orderArrIndex=', this.data.orderArrIndex, 'invalidOrderIndex=', this.data.invalidOrderIndex);
            setTimeout(() => {
              this.setData({ scrollIntoViewId: '' });
              console.log('[pasteSearchGoods] 已清空 scrollIntoViewId，invalidOrderIndex=', this.data.invalidOrderIndex);
            }, 500);
          });
        }
      });
      return;
    }
    load.showLoading("识别商品中");
    const sentence = this.data.originSentence || this.data.sentence || '';
    pasteSearchGoods({
      orderList: orderArr,
      pasteText: sentence
    }).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        wx.redirectTo({
          url: '../ocrOrder/ocrOrder?taskId=' + res.result.taskId  + '&depFatherId=' + this.data.depFatherId + '&depId=' + this.data.depId + '&depName=' + this.data.depName,
        });
      } else {
        wx.showToast({
          title: res.result.msg || '保存失败',
          icon: 'none'
        });
      }
    }).catch(() => {
      load.hideLoading();
    });
  },

  /**
   * 校验订单列表（保存前）
   * @returns {{ valid: boolean, invalidIndex?: number, invalidField?: string, msg?: string }}
   */
  _validateOrdersForSave(orderArr) {
    if (!orderArr || orderArr.length === 0) {
      return { valid: false, invalidIndex: 0, invalidField: 'name', msg: '订单列表为空' };
    }
    for (let i = 0; i < orderArr.length; i++) {
      const order = orderArr[i];
      const rowNum = i + 1;
      if (!order) {
        return { valid: false, invalidIndex: i, invalidField: 'name', msg: `第${rowNum}条订单数据错误` };
      }
      if (!order.nxDoGoodsName || String(order.nxDoGoodsName).trim() === '') {
        return { valid: false, invalidIndex: i, invalidField: 'name', msg: `第${rowNum}条订单商品名称为空` };
      }
      const qty = order.nxDoQuantity;
      if (qty === undefined || qty === null || String(qty).trim() === '') {
        return { valid: false, invalidIndex: i, invalidField: 'quantity', msg: `第${rowNum}条订单数量为空` };
      }
      const qtyNum = Number(qty);
      if (Number.isNaN(qtyNum)) {
        return { valid: false, invalidIndex: i, invalidField: 'quantity', msg: `第${rowNum}条订单数量必须是数字` };
      }
      if (qtyNum <= 0) {
        return { valid: false, invalidIndex: i, invalidField: 'quantity', msg: `第${rowNum}条订单数量必须大于 0` };
      }
      if (!order.nxDoStandard || String(order.nxDoStandard).trim() === '') {
        return { valid: false, invalidIndex: i, invalidField: 'standard', msg: `第${rowNum}条订单规格为空` };
      }
      const spec = String(order.nxDoStandard).trim();
      const chineseOnly = /^[\u4e00-\u9fff]+$/;
      if (!chineseOnly.test(spec)) {
        return { valid: false, invalidIndex: i, invalidField: 'standard', msg: `第${rowNum}条订单规格必须为汉字` };
      }
      if (spec.length > 2) {
        return { valid: false, invalidIndex: i, invalidField: 'standard', msg: `第${rowNum}条订单规格汉字数量不能大于 2 个，当前为 ${spec.length} 个` };
      }
    }
    return { valid: true };
  },




  editOrderName(e) {
    var index = e.currentTarget.dataset.index;
    if (this.data.invalidOrderIndex >= 0) {
      this.setData({ invalidOrderIndex: -1, invalidOrderField: '' });
    }
    this.setData({
      orderArrIndex: index,
      goodsName: e.detail.value,
    })
    
    if (e.detail.value.length > 0) {
      var data = "orderArr[" + index + "].nxDoGoodsName";
      this.setData({
        [data]: e.detail.value,
      })
      console.log("调用 getSearchString 搜索商品...");
      this.getSearchString(e);
    } else {
      console.log("输入为空，不搜索");
    }
  },


  _checkOrderItemContent(order, i) {
    console.log("订单项 order:", order);
    console.log("订单索引 i:", i);
    
    if (!order) {
      console.error("❌ order 为 undefined 或 null");
      wx.showToast({
        title: '订单数据错误',
        icon: 'none'
      });
      return false;
    }
    
    var that = this;
    var name = order.nxDoGoodsName;
    var standard = order.nxDoStandard;
    var quantity = order.nxDoQuantity;
    var standarWarn = order.nxDoStandardWarn;
    
    console.log("订单内容检查:", {
      name: name,
      standard: standard,
      quantity: quantity,
      standarWarn: standarWarn,
      standardLength: standard ? standard.length : 'undefined'
    });
    if (standard.length > 2 && standarWarn == 0) {

      wx.showModal({
        title: '单位是否正确?',
        content: name + " " + quantity + " " + standard,
        showCancel: true, //是否显示取消按钮-----》false去掉取消按钮
        cancelText: "确定正确", //默认是"取消"
        cancelColor: 'black', //取消文字的颜色
        confirmText: "修改单位", //默认是"确定"
        confirmColor: '#147062', //确定文字的颜色
        success: function (res) {
          if (res.cancel) {
            //点击取消
            console.log("您点击了取消i", i)
            var data = "orderArr[" + i + "].nxDoStandardWarn";
            that.setData({
              [data]: 1
            })
            that._choiceGoods();
          } else if (res.confirm) {
            //点击确定
            console.log("您点击了确定")
          }
        }

      })
      canSave = false;
      return canSave;


    } else {
      if (name.length > 0 && standard.length > 0 && Number(quantity) > 0) {
        if (standarWarn > 0) {

          canSave = true;
        }
      } else {
        // i = arr.length - 1;
        // console.log("rong", i);
        wx.showModal({
          title: '订单是否缺少内容?',
          content: name + " " + quantity + " " + standard,
          showCancel: false,
          confirmText: "知道了", //默认是"确定"

        })
        canSave = false;
      }
    }
    console.log("rerereerrcanSave===================", canSave)
    return canSave;
  },


  saveOrder(e) {
    this.setData({
      orderArrIndex: e.currentTarget.dataset.index,
      goodsId: e.currentTarget.dataset.id,
    })

    this._choiceGoods();

  },

  
  closeStr(){
    this.setData({
      strArr: [],
      nxArr: [],
      orderArrIndex: -1,
    })
  },

  
  _choiceGoods() {
    console.log("========== _choiceGoods 开始 ==========");
    console.log("当前 orderArrIndex:", this.data.orderArrIndex);
    console.log("当前 orderArr 长度:", this.data.orderArr ? this.data.orderArr.length : 'undefined');
    console.log("当前 orderArr:", this.data.orderArr);
    console.log("当前 goodsId:", this.data.goodsId);
    
    var index = this.data.orderArrIndex;
    
    // 检查 orderArrIndex 是否有效
    if (index === undefined || index === null || index < 0) {
      console.error("❌ orderArrIndex 无效:", index);
      wx.showToast({
        title: '订单索引无效',
        icon: 'none'
      });
      return;
    }
    
    // 检查 orderArr 是否存在
    if (!this.data.orderArr) {
      console.error("❌ orderArr 不存在");
      wx.showToast({
        title: '订单列表不存在',
        icon: 'none'
      });
      return;
    }
    
    // 检查索引是否越界
    if (index >= this.data.orderArr.length) {
      console.error("❌ orderArrIndex 越界:", {
        index,
        orderArrLength: this.data.orderArr.length
      });
      wx.showToast({
        title: '订单索引越界',
        icon: 'none'
      });
      return;
    }
    
    var order = this.data.orderArr[index];
    console.log("获取到的订单项 order:", order);
    
    if (!order) {
      console.error("❌ 订单项不存在，index:", index);
      wx.showToast({
        title: '订单项不存在',
        icon: 'none'
      });
      return;
    }
    
    console.log("订单项详情:", {
      nxDoGoodsName: order.nxDoGoodsName,
      nxDoQuantity: order.nxDoQuantity,
      nxDoStandard: order.nxDoStandard,
      nxDoStatus: order.nxDoStatus,
      nxDoGoodsOriginalName: order.nxDoGoodsOriginalName
    });
    
    var canSave = this._checkOrderItemContent(order, index);
    console.log("检查结果 canSave:", canSave);
    
    if (canSave) {
      // 读取原始商品名称（不修改，只读取）
      // nxDoGoodsOriginalName 是解析订单后的用户录入的商品名称，不应该再改变
      const correctOriginalName = order.nxDoGoodsOriginalName || order.nxDoGoodsName || '';
      const currentName = order.nxDoGoodsName || '';
      
      console.log(`[_choiceGoods] 订单 ${index} 原始名称检查（只读，不修改）:`, {
        index: index,
        currentName: currentName,
        originalName: order.nxDoGoodsOriginalName,
        willUseOriginalName: correctOriginalName,
        orderId: order.nxDepartmentOrdersId,
        hasOriginal: !!order.nxDoGoodsOriginalName && order.nxDoGoodsOriginalName.trim() !== ''
      });
      
      // 如果原始名称不存在，记录警告但不修改（应该只在创建订单时设置）
      if (!order.nxDoGoodsOriginalName || order.nxDoGoodsOriginalName.trim() === '') {
        console.warn(`[_choiceGoods] 订单 ${index} 缺少原始商品名称，使用当前名称作为后备:`, {
          index: index,
          currentName: currentName,
          orderId: order.nxDepartmentOrdersId,
          note: '原始名称应该在创建订单时设置，这里只作为后备使用'
        });
      }
      
      // 使用原始商品名称（nxDoGoodsNameOriginal）来调用接口，如果不存在则使用当前名称
      console.log(`[_choiceGoods] 订单 ${index} 使用原始商品名称调用接口:`, correctOriginalName);
      order.nxDoGoodsName = correctOriginalName;
     
      order.nxDoDisGoodsId = this.data.goodsId;
      console.log("设置后的订单项 order:", order);
      console.log("准备调用 choiceGoodsForApply 接口");

      load.showLoading("保存订单中")
      choiceGoodsForApply(order).then(res => {
        console.log("========== choiceGoodsForApply 接口返回 ==========");
        console.log("接口返回 res:", res);
        console.log("res.result:", res.result);
        console.log("res.result.code:", res.result ? res.result.code : 'undefined');
        console.log("res.result.data:", res.result ? res.result.data : 'undefined');
        
        if (res.result.code == 0) {
          load.hideLoading();
          console.log("保存订单成功，返回数据:", res.result.data);
          
          // 保留原有的 nxDoGoodsNameOriginal（不修改，只保留）
          // nxDoGoodsOriginalName 是解析订单后的用户录入的商品名称，不应该再改变
          const currentOrderBeforeUpdate = this.data.orderArr[index];
          const preservedOriginalName = currentOrderBeforeUpdate?.nxDoGoodsOriginalName || correctOriginalName || '';
          
          console.log(`[choiceGoodsForApply返回] 订单 ${index} 保留原始名称（不修改）:`, {
            index: index,
            beforeUpdateOriginalName: currentOrderBeforeUpdate?.nxDoGoodsOriginalName,
            savedOriginalName: correctOriginalName,
            apiReturnedOriginalName: res.result.data.nxDoGoodsOriginalName,
            preservedOriginalName: preservedOriginalName,
            apiReturnedName: res.result.data.nxDoGoodsName,
            orderId: res.result.data.nxDepartmentOrdersId,
            note: '保留原有原始名称，不修改'
          });
          
          const updatedOrder = {
            ...res.result.data,
            // 保留原有的 nxDoGoodsNameOriginal，不修改
            nxDoGoodsOriginalName: preservedOriginalName
          };
          
          var data = "orderArr[" + index + "]";
          console.log(`[choiceGoodsForApply返回] 订单 ${index} 更新后的订单对象:`, {
            index: index,
            nxDoGoodsName: updatedOrder.nxDoGoodsName,
            nxDoGoodsOriginalName: updatedOrder.nxDoGoodsOriginalName,
            orderId: updatedOrder.nxDepartmentOrdersId
          });
          
          this.setData({
            [data]: updatedOrder,
            saveOrder: false,
            findGoods: false,
            strArr: [],
            nxArr: [],
            // 注意：先不重置 orderArrIndex，因为 _updateStorage 需要使用它
          })
          console.log("订单保存成功，已更新 orderArr[" + index + "]");
          // 先更新存储（需要使用 orderArrIndex）
          this._updateStorage(updatedOrder);
          // 更新存储后再重置 orderArrIndex
          this.setData({
            orderArrIndex: -1
          })
          console.log("已重置 orderArrIndex 为 -1");
        } else {
          console.error("❌ 保存订单失败:", res.result ? res.result.msg : '未知错误');
          load.hideLoading();
          wx.showToast({
            title: res.result ? res.result.msg : '保存失败',
            icon: 'none'
          })
        }
      })
      .catch(err => {
        console.error("❌ choiceGoodsForApply 接口调用异常:", err);
        load.hideLoading();
        wx.showToast({
          title: '保存订单失败',
          icon: 'none'
        })
      })
    }
    console.log("========== _choiceGoods 结束 ==========\n");
  },



  addDisAlias() {
    var standard = this.data.orderArr[this.data.orderArrIndex].nxDoStandard;
    var name = this.data.orderArr[this.data.orderArrIndex].nxDoGoodsName;
    wx.navigateTo({
      url: '../../../../subPackage/pages/goods/disAddGoodsLinshi/disAddGoodsLinshi?goodsName=' + name + '&from=paste' + '&standard=' + standard ,
    })
  },


  showPasteOperation(e) {
    this.setData({
      orderPasteIndex: e.currentTarget.dataset.index,
      showOperationPaste: true,
      orderItem: this.data.orderArr[e.currentTarget.dataset.index],
    })
  },


  addRemark() {
    var index = this.data.orderPasteIndex;
    var orderItem = this.data.orderItem;
    orderItem.nxDoRemark = "";
    var data = "orderArr[" + index + "]";
    console.log("rooeo", orderItem)
    this.setData({
      [data]: orderItem,
      showOperationPaste: false
    })

  },

  addNewPasteOrderBefore() {

    var index = this.data.orderPasteIndex;
    var arr = this.data.orderArr;
    var data = {
      nxDoRemark: -1,
      nxDoStatus: -2,
      nxDoIsAgent: -1,
      nxDoDepartmentId: this.data.depId,
      nxDoDepartmentFatherId: this.data.depFatherId,
      nxDoDisGoodsId: null,
      nxDoStandardWarn: 0,
      goodsNameWarn: 0,
      nxDoDistributerId: this.data.disId,
      nxDoPurchaseUserId: -1, 
      nxDoOrderUserId: this.data.userId,
      nxDoIsAgent: -1,
      standardWeight: "",
      cartonUnit: "",
      itemUnit: "",
      itemsPerCarton: "",
    }
    // 方法1
    const newArr1 = [...arr];
    newArr1.splice(index, 0, data);
    console.log(newArr1.length);
    this.setData({
      orderArr: newArr1,
      showOperationPaste: false,
    })
    // 更新未保存订单状态
    this._updateHasUnsavedOrders(newArr1);
   
  },


  //删除预览订单
  delOrder() {
    var index = this.data.orderPasteIndex;
    var arr = this.data.orderArr;
    var orderItem = arr[index];
    
    if (!orderItem) {
      console.error("要删除的订单不存在，index:", index);
      return;
    }
    
    console.log("========== delOrder 开始 ==========");
    console.log("订单索引:", index);
    console.log("订单信息:", orderItem);
    
    // 如果订单有 nxDepartmentOrdersId，说明已经保存到服务器，需要调用接口删除
    if (orderItem.nxDepartmentOrdersId) {
      console.log("订单已保存到服务器，调用 deleteOrder 接口删除");
      console.log("nxDepartmentOrdersId:", orderItem.nxDepartmentOrdersId);
      
      load.showLoading("删除订单中");
      var that = this;
      deleteOrder(orderItem.nxDepartmentOrdersId).then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          console.log("接口删除成功");
          // 从数组中删除
          var filteredArr = that.data.orderArr.filter((_, idx) => idx !== index);
          console.log("删除后的订单数量:", filteredArr.length);
          
          that.setData({
            orderArr: filteredArr,
            showOperationPaste: false,
          });
          // 更新未保存订单状态
          that._updateHasUnsavedOrders(filteredArr);
          // 立即同步到缓存
          that._saveToStorage(filteredArr);
          
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        } else {
          console.error("接口删除失败:", res.result.msg);
          wx.showToast({
            title: res.result.msg || '删除失败',
            icon: 'none'
          });
        }
      }).catch(error => {
        load.hideLoading();
        console.error("删除订单接口调用失败:", error);
        wx.showToast({
          title: '删除失败，请检查网络',
          icon: 'none'
        });
      });
      return;
    }
    
    // 如果订单没有 nxDepartmentOrdersId，说明只是草稿，直接从数组中删除
    console.log("订单是草稿，直接从数组中删除");
    arr.splice(index, 1);
    console.log("删除后的订单数量:", arr.length);
    console.log("========== delOrder 结束 ==========");
    this.setData({
      orderArr: arr,
      showOperationPaste: false,
    })
    // 更新未保存订单状态
    this._updateHasUnsavedOrders(arr);
    // 立即同步到缓存
    this._saveToStorage(arr);

  },



  showOperation(e) {
    this.setData({
      orderArrIndex: e.currentTarget.dataset.index,
      showOperation: true,
      applyItem: this.data.orderArr[e.currentTarget.dataset.index],
    })
  },

  hideMask() {
    this.setData({
      showOperation: false,
      showOperationPaste: false
    })
  },


  //根据修商品名称，搜索商品
  getSearchString(e) {
    console.log("========== getSearchString 开始 ==========");
    console.log("搜索输入值:", e.detail.value);
    
    if (e.detail.value.length > 0) {
      var data = {
        disId: this.data.disId,
        searchStr: e.detail.value,
        depId: this.data.depId,
      }
      this.setData({
        searchStr: e.detail.value,
      })
      console.log("搜索参数:", data);
      load.showLoading("搜索商品中")
      queryDisGoodsByQuickSearchWithDepId(data).then(res => {
        console.log("搜索结果返回:", res.result.data);
        load.hideLoading();
        if(res.result.code == 0){
            console.log("→ 设置 strArr，长度:", res.result.data.disArr.length);
            this.setData({
              strArr: res.result.data.disArr,
              nxArr: res.result.data.nxArr,
            })
          
          }else{
            wx.showToast({
              title: res.result.msg,
              icon: 'none'
            })
            this.setData({
              nxArr: [],
              disArr:  []
            })
          }

        })
     
    } 

  },


  /**
   * 下载收藏商品
   * @param {*} e 
   */
  downLoadGoods: function (e) {
    this.setData({
      item: e.currentTarget.dataset.item,
    })
    var dg = {
      nxDgDistributerId: this.data.disId,
      nxDgNxGoodsId: this.data.item.nxGoodsId,
      nxDgGoodsName: this.data.item.nxGoodsName,
      nxDgNxFatherId: this.data.fatherId,
      nxDgNxFatherImg: this.data.fatherImg,
      nxDgNxFatherName: this.data.fatherName,
      nxDgGoodsDetail: this.data.item.nxGoodsDetail,
      nxDgGoodsPlace: this.data.item.nxGoodsPlace,
      nxDgGoodsBrand: this.data.item.nxGoodsBrand,
      nxDgGoodsStandardname: this.data.item.nxGoodsStandardname,
      nxDgGoodsStandardWeight: this.data.item.nxGoodsStandardWeight,
      nxDgGoodsPinyin: this.data.item.nxGoodsPinyin,
      nxDgGoodsPy: this.data.item.nxGoodsPy,
      nxDgPullOff: 0,
      nxDgGoodsStatus: 0,
      nxDgNxGoodsFatherColor: this.data.color,
      nxStandardEntities: this.data.item.nxGoodsStandardEntities,
      nxAliasEntities: this.data.item.nxAliasEntities,
      nxDgPurchaseAuto: 1,
    };

    load.showLoading("保存商品")
    downDisGoods(dg)
      .then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          this.setData({
            showType: 0,
          })
          this._againSearchString();

        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
      })
  },

  downLoadGoodsNx: function (e) {
    console.log("========== downLoadGoodsNx 开始 ==========");
    console.log("事件对象 e:", e);
    console.log("e.currentTarget.dataset:", e.currentTarget.dataset);
    console.log("e.currentTarget.dataset.index:", e.currentTarget.dataset.index);
    console.log("e.currentTarget.dataset.item:", e.currentTarget.dataset.item);
    
    var that = this;
    var orderIndex = e.currentTarget.dataset.index;
    
    console.log("订单索引 orderIndex:", orderIndex);
    console.log("当前 orderArr 长度:", this.data.orderArr ? this.data.orderArr.length : 'undefined');
    
    if (orderIndex === undefined || orderIndex === null) {
      console.error("❌ orderIndex 为 undefined 或 null");
      wx.showToast({
        title: '订单索引错误',
        icon: 'none'
      });
      return;
    }
    
    if (!this.data.orderArr || orderIndex < 0 || orderIndex >= this.data.orderArr.length) {
      console.error("❌ orderArr 索引越界:", {
        orderIndex,
        orderArrLength: this.data.orderArr ? this.data.orderArr.length : 0
      });
      wx.showToast({
        title: '订单索引越界',
        icon: 'none'
      });
      return;
    }
    
    var item = e.currentTarget.dataset.item;
    if (!item) {
      console.error("❌ item 为 undefined");
      wx.showToast({
        title: '商品数据错误',
        icon: 'none'
      });
      return;
    }
    
    console.log("商品数据 item:", item);
    
    this.setData({
      item: item,
      orderArrIndex: orderIndex,
    })
    
    console.log("设置后 orderArrIndex:", this.data.orderArrIndex);
    var dg = {
      nxDgDistributerId: this.data.disId,
      nxDgNxGoodsId: this.data.item.nxGoodsId,
      nxDgGoodsName: this.data.item.nxGoodsName,
      nxDgNxFatherId: this.data.fatherId,
      nxDgNxFatherImg: this.data.fatherImg,
      nxDgNxFatherName: this.data.fatherName,
      nxDgGoodsDetail: this.data.item.nxGoodsDetail,
      nxDgGoodsPlace: this.data.item.nxGoodsPlace,
      nxDgGoodsBrand: this.data.item.nxGoodsBrand,
      nxDgGoodsStandardname: this.data.item.nxGoodsStandardname,
      nxDgGoodsStandardWeight: this.data.item.nxGoodsStandardWeight,
      nxDgGoodsPinyin: this.data.item.nxGoodsPinyin,
      nxDgGoodsPy: this.data.item.nxGoodsPy,
      nxDgPullOff: 0,
      nxDgGoodsStatus: 0,
      nxDgNxGoodsFatherColor: this.data.color,
      nxStandardEntities: this.data.item.nxGoodsStandardEntities,
      nxAliasEntities: this.data.item.nxAliasEntities,
      nxDgPurchaseAuto: 1,
    };

    load.showLoading("保存商品")
    downDisGoods(dg)
      .then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          console.log("========== downDisGoods 接口返回 ==========");
          console.log("接口返回 res:", res);
          console.log("当前 orderArrIndex:", that.data.orderArrIndex);
          console.log("返回的商品ID:", res.result.data.nxDistributerGoodsId);
          console.log("返回的商品名称:", res.result.data.nxDgGoodsName);
          
          that.setData({
            goodsId: res.result.data.nxDistributerGoodsId,
            name: res.result.data.nxDgGoodsName,
            // 修复：使用 that.data.orderArrIndex 而不是 this.data.orderArrIndex，如果为 undefined 则使用 orderIndex
            orderArrIndex: that.data.orderArrIndex !== undefined ? that.data.orderArrIndex : orderIndex
          })
          
          console.log("设置后 orderArrIndex:", that.data.orderArrIndex);
          console.log("准备调用 _choiceGoods");
          that._choiceGoods()

        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
      })
  },

  _againSearchString(e) {

    var data = {
      disId: this.data.disId,
      searchStr: this.data.searchStr,
      depId: this.data.depId,
    }

    queryDisGoodsByQuickSearchWithDepId(data).then(res => {
      console.log(res)
      if(res.result.code == 0){
        console.log("→ 设置 strArr，长度:", res.result.data.disArr.length);
        this.setData({
          strArr: res.result.data.disArr,
          nxArr: res.result.data.nxArr,
        })
      }else{
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
        this.setData({
          nxArr: [],
          disArr:  []
        })
      }
    })

  },



  confirm: function (e) {

    this._updateDisOrder(e);

    this.setData({
      showOrder: false,
      applyItem: "",
      item: "",
      applyNumber: "",
      applyStandardName: "",
      showMyIndependent: false,
    })
  },



  /**
   * 换订货单位
   * @param {}} e 
   */
  changeStandard: function (e) {
    this.setData({
      applyStandardName: e.detail.applyStandardName
    })
  },


  cancle() {
    console.log("cancle....")
    this.setData({
      item: "",
      applyStandardName: "",
      showOrder: false,
      applyItem: "",
      applyNumber: "",
      depStandardArr: [],

    })

    if (this.data.isSearching) {
      this.setData({
        isSearching: false,
        searchStr: ""
      })
    }
  },


  confirmStandard(e) {
    console.log(e);

    var data = {
      nxDsDisGoodsId: this.data.itemDis.nxDistributerGoodsId,
      nxDsStandardName: e.detail.newStandardName,
    }
    disSaveStandard(data).
    then(res => {
      if (res.result.code == 0) {
        console.log(res)
        var standardArr = this.data.itemDis.nxDistributerStandardEntities;
        standardArr.push(res.result.data);
        var standards = "itemDis.nxDistributerStandardEntities"
        this.setData({
          [standards]: standardArr,
          applyStandardName: res.result.data.nxDsStandardName,
        })

      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },




  /**
   * 修改配送商品申请
   */
  editApply() {
    var applyItem = this.data.applyItem;
    
    // 根据 nxDoDisGoodsId 先请求接口获取 nxDistributerGoodsEntity
    if (applyItem.nxDoDisGoodsId) {
      load.showLoading('加载商品信息');
      disGetGoods(applyItem.nxDoDisGoodsId).then(res => {
        load.hideLoading();
        if (res.result.code == 0 && res.result.data) {
          // 获取到商品信息后，设置到 itemDis
    this.setData({
      showOrder: true,
      editApply: true,
      applyStandardName: applyItem.nxDoStandard,
            itemDis: res.result.data, // 使用接口返回的商品信息
      item: this.data.applyItem.nxDepartmentDisGoodsEntity,
      applyNumber: applyItem.nxDoQuantity,
      applyRemark: applyItem.nxDoRemark,
            showOperation: false
          });
        } else {
          // 接口返回失败，使用原有的 nxDistributerGoodsEntity（如果有）
          wx.showToast({
            title: res.result.msg || '获取商品信息失败',
            icon: 'none'
          });
    this.setData({
            showOrder: true,
            editApply: true,
            applyStandardName: applyItem.nxDoStandard,
            itemDis: this.data.applyItem.nxDistributerGoodsEntity || null,
            item: this.data.applyItem.nxDepartmentDisGoodsEntity,
            applyNumber: applyItem.nxDoQuantity,
            applyRemark: applyItem.nxDoRemark,
      showOperation: false
          });
        }
      }).catch(err => {
        load.hideLoading();
        console.error('获取商品信息失败:', err);
        wx.showToast({
          title: '获取商品信息失败',
          icon: 'none'
        });
        // 失败时使用原有的 nxDistributerGoodsEntity（如果有）
        this.setData({
          showOrder: true,
          editApply: true,
          applyStandardName: applyItem.nxDoStandard,
          itemDis: this.data.applyItem.nxDistributerGoodsEntity || null,
          item: this.data.applyItem.nxDepartmentDisGoodsEntity,
          applyNumber: applyItem.nxDoQuantity,
          applyRemark: applyItem.nxDoRemark,
          showOperation: false
        });
      });
    } else {
      // 没有 nxDoDisGoodsId，直接使用原有的 nxDistributerGoodsEntity
      this.setData({
        showOrder: true,
        editApply: true,
        applyStandardName: applyItem.nxDoStandard,
        itemDis: this.data.applyItem.nxDistributerGoodsEntity,
        item: this.data.applyItem.nxDepartmentDisGoodsEntity,
        applyNumber: applyItem.nxDoQuantity,
        applyRemark: applyItem.nxDoRemark,
        showOperation: false
      });
    }
  },


  /**
   * 修改配送申请
   * @param {} e 
   */
  _updateDisOrder(e) {
    const std = e.detail.applyStandardName;
    const dis =
      (this.data.applyItem && this.data.applyItem.nxDistributerGoodsEntity) ||
      this.data.itemDis;
    const pl = resolveNxDoCostPriceLevel(dis, std);
    const baseStd = dis && dis.nxDgGoodsStandardname;
    const twoStd = dis && dis.nxDgWillPriceTwoStandard;
    const printStandard =
      pl === 2 && twoStd ? twoStd : baseStd || "";

    var dg = {
      id: this.data.applyItem.nxDepartmentOrdersId,
      weight: e.detail.applyNumber,
      standard: std,
      remark: e.detail.applyRemark,
      printStandard,
      priceLevel: pl,
    };
    updateOrder(dg).then(res => {
      load.showLoading("修改订单")
      if (res.result.code == 0) {
        load.hideLoading();
        var goodsName = this.data.orderArr[this.data.orderArrIndex].nxDoGoodsName;
        
        // 保留原有的 nxDoGoodsNameOriginal（不修改，只保留）
        // nxDoGoodsOriginalName 是解析订单后的用户录入的商品名称，不应该再改变
        const currentOrder = this.data.orderArr[this.data.orderArrIndex];
        const preservedOriginalName = currentOrder?.nxDoGoodsOriginalName || '';
        
        console.log(`[updateOrder返回] 订单 ${this.data.orderArrIndex} 保留原始名称（不修改）:`, {
          index: this.data.orderArrIndex,
          currentName: goodsName,
          beforeUpdateOriginalName: currentOrder?.nxDoGoodsOriginalName,
          apiReturnedOriginalName: res.result.data.nxDoGoodsOriginalName,
          preservedOriginalName: preservedOriginalName,
          apiReturnedName: res.result.data.nxDoGoodsName,
          orderId: res.result.data.nxDepartmentOrdersId,
          note: '保留原有原始名称，不修改'
        });
        
        const updatedOrder = {
          ...res.result.data,
          nxDoGoodsName: goodsName, // 保持当前的商品名称
          // 保留原有的 nxDoGoodsNameOriginal，不修改
          nxDoGoodsOriginalName: preservedOriginalName
        };
        
        console.log(`[updateOrder返回] 订单 ${this.data.orderArrIndex} 更新后的订单对象:`, {
          index: this.data.orderArrIndex,
          nxDoGoodsName: updatedOrder.nxDoGoodsName,
          nxDoGoodsOriginalName: updatedOrder.nxDoGoodsOriginalName,
          orderId: updatedOrder.nxDepartmentOrdersId
        });
        
        var data = "orderArr[" + this.data.orderArrIndex + "]";
        this.setData({
          [data]: updatedOrder,
        })
        // 更新未保存订单状态（单个订单更新后，需要重新检查整个数组）
        this._updateHasUnsavedOrders();
      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: "none"
        })
      }

    })
  },



  addNewOrderBefore(e) {
    this.hideMask();

    wx.navigateTo({

      url: '../resGoodsList/resGoodsList?depFatherId=' + this.data.depFatherId +
        '&depId=' + this.data.depId + '&depName=' + this.data.depName +
        '&gbDepFatherId=-1&depSettleType=' + this.data.depInfo.nxDepartmentSettleType +
        '&beforeId=' + this.data.applyItem.nxDepartmentOrdersId
    })


  },


  delStandard(e) {
    console.log(e);
    this.setData({
      standardName: e.detail.standardName,
      show: false,
      delStandardShow: true,
      applyItem: "",
      disStandardId: e.detail.id,
    })

  },


  deleteStandard() {
    disDeleteStandard(this.data.disStandardId).then(res => {
      if (res.result.code == 0) {
        this.setData({
          standardName: "",
          delStandardShow: false,
          disStandardId: "",
        })

      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },



  delApply() {

    var that = this;
    deleteOrder(this.data.applyItem.nxDepartmentOrdersId).then(res => {
      if (res.result.code == 0) {
        // var arr = this.data.orderArr.splice(this.data.orderArrIndex,1);
        var arr = that.data.orderArr;
        arr = arr.filter((_, index) => index !== that.data.orderArrIndex);
        that.setData({
          editApply: false,
          showOrder: false,
          applyItem: "",
          orderArr: arr,
        })
        // 更新未保存订单状态
        that._updateHasUnsavedOrders(arr);
        that.updateStorageDelete();

      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },

  /**
   * 更新 hasUnsavedOrders 状态
   * 检查订单数组中是否有未保存的订单（status == -2）
   * @param {Array} orders - 订单数组，如果不传则使用 this.data.orderArr
   */
  _updateHasUnsavedOrders(orders) {
    const orderArr = orders || this.data.orderArr || [];
    const hasUnsavedOrders = orderArr.some(order => order && order.nxDoStatus === -2);
    this.setData({ hasUnsavedOrders });
    return hasUnsavedOrders;
  },



  addRemark() {
    var index = this.data.orderPasteIndex;
   
    var data = "orderArr[" + index + "].nxDoAddRemark";
    this.setData({
      [data]: true,
      showOperationPaste: false
    })

  },


  toBack() {

    this.onUnload();
    wx.navigateBack({
      delta: 1
    })

  },


  
  onUnload() {
    console.log("========== onUnload 开始 ==========");
    // 清除录音定时器
    console.log("[onUnload] 清除录音定时器");
    if (this.data.timer) {
      clearInterval(this.data.timer);
      console.log("[onUnload] 定时器已清除，timer ID:", this.data.timer);
    } else {
      console.log("[onUnload] 定时器不存在或已被清除");
    }
    // 停止录音
    if (this.data.isRecording) {
      console.log("[onUnload] 检测到正在录音，停止录音");
      this.setData({
        isRecording: false,
        timer: null
      });
      try {
        speechRecognizerManager.stop();
        console.log("[onUnload] 已调用 speechRecognizerManager.stop()");
      } catch (e) {
        console.error("[onUnload] 停止录音失败:", e);
      }
    }
    console.log("当前 pasteDepId:", this.data.pasteDepId);
    console.log("当前 pasteDepIndex:", this.data.pasteDepIndex);
    
    
  },


  // ==================== 七、缓存管理相关 ====================


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
      orderIds: orderIds,
      taskId: this.data.taskId,
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
        wx.navigateBack({
          delta: 1
        })

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
    }, () => {});
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
        this.setData({
          orderAr: res.result.data,
        })
      
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


})
// components/ocrOrderList/ocrOrderList.js
import { parseOrderFromText } from '../../lib/orderParser';
import { correctOrder, deleteTaskOrder } from '../../lib/apiDepOrder';
import load from '../../lib/load';
import { optimizeTextWithDeepSeek, detectBusinessType } from '../../lib/deepSeekHelper';

const plugin = requirePlugin("QCloudAIVoice");
const speechRecognizerManager = plugin.speechRecognizerManager();

// 从配置文件读取腾讯云配置
const config = require('../../config');
const TENCENT_CLOUD_SECRET_ID = config.tencentCloud?.secretId || '';
const TENCENT_CLOUD_SECRET_KEY = config.tencentCloud?.secretKey || '';
const TENCENT_CLOUD_APP_ID = config.tencentCloud?.appId || '1308821743';
const TENCENT_CLOUD_ENGINE_MODEL_TYPE = config.tencentCloud?.engineModelType || '16k_zh';
const TENCENT_CLOUD_VOICE_FORMAT = config.tencentCloud?.voiceFormat || 1;

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 订单列表
    list: {
      type: Array,
      value: []
    },
    // 当前朗读索引（用于高亮）
    activeIndex: {
      type: Number,
      value: -1
    },
    // 是否朗读模式
    isReadingMode: {
      type: Boolean,
      value: false
    },
    // 是否正在播放
    isPlaying: {
      type: Boolean,
      value: false
    },
    // 停止时的订单索引
    stoppedIndex: {
      type: Number,
      value: -1
    },
    // 当前编辑的订单索引
    orderArrIndex: {
      type: Number,
      value: -1
    },
    // 刚刚修改的订单索引（淡蓝色背景提醒）
    recentlyModifiedOrderIndex: {
      type: Number,
      value: -1
    },
    // 配送商商品搜索结果
    strArr: {
      type: Array,
      value: []
    },
    // 系统商品搜索结果
    nxArr: {
      type: Array,
      value: []
    },
    // 窗口宽度（用于计算样式）
    windowWidth: {
      type: Number,
      value: 750
    },
    // 滚动到指定订单项（用于 scroll-into-view）
    scrollIntoViewId: {
      type: String,
      value: ''
    },
    // 部门ID（用于订单解析和接口调用）
    depId: {
      type: [String, Number],
      value: null
    },
    // 父部门ID
    depFatherId: {
      type: [String, Number],
      value: null
    },
    // 配送商ID
    disId: {
      type: [String, Number],
      value: null
    },
    // 用户ID
    userId: {
      type: [String, Number],
      value: null
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    hasConfirmed: false, // 是否已按确认键
    isRecording: false, // 是否正在录音
    recognitionText: '', // 识别到的文本（用于显示弹窗）
    showRecognitionModal: false, // 是否显示识别弹窗（点击录音按钮后立即显示）
    recordingOrderIndex: -1, // 正在录音的订单索引
    recordingOrderId: null, // 正在录音的订单ID
    timer: null, // 录音时长定时器
    deletingIndex: -1 // 正在删除的订单索引（用于动画效果）
  },

  /**
   * 组件生命周期
   */
  lifetimes: {
    attached: function() {
      console.log('[ocrOrderList组件] ========== attached 生命周期 ==========');
      console.log('[ocrOrderList组件] 组件已挂载！');
      console.log('[ocrOrderList组件] list 长度:', this.properties.list.length);
      console.log('[ocrOrderList组件] activeIndex:', this.properties.activeIndex);
      console.log('[ocrOrderList组件] isReadingMode:', this.properties.isReadingMode);
      console.log('[ocrOrderList组件] ========================================');
      
      // 初始化语音识别回调
      this._initSpeechRecognizer();
     
    },
    
    detached: function() {
      // 组件销毁时清理录音
      if (this.data.isRecording) {
        this._stopRecord();
      }
      if (this.data.timer) {
        clearInterval(this.data.timer);
      }
    }
  },

  observers: {
    
    'list, activeIndex, isReadingMode': function(list, activeIndex, isReadingMode) {
      console.log('[ocrOrderList组件] 属性变化:', { 
        listLength: list.length, 
        activeIndex, 
        isReadingMode 
      });
    },
    
    // 监听 scrollIntoViewId 变化，当需要滚动时查询订单项位置
    'scrollIntoViewId': function(scrollIntoViewId) {
      if (!scrollIntoViewId) {
        return;
      }
      
      console.log('[ocrOrderList组件] scrollIntoViewId 变化:', scrollIntoViewId);
      
      // 延迟一下确保 DOM 已更新
      setTimeout(() => {
        // 在组件内部查询订单项位置
        const query = wx.createSelectorQuery().in(this);
        query.select(`#${scrollIntoViewId}`).boundingClientRect((rect) => {
          if (!rect) {
            console.warn('[ocrOrderList组件] 未找到订单项:', scrollIntoViewId);
            return;
          }
          
          console.log('[ocrOrderList组件] 订单项位置:', rect);
          
          // 触发事件，通知父组件需要滚动的位置
          this.triggerEvent('scrollToItem', {
            itemId: scrollIntoViewId,
            top: rect.top,
            height: rect.height,
            left: rect.left,
            width: rect.width
          });
        }).exec();
      }, 100);
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    /**
     * 编辑订单（数量、规格、备注）
     */
    onEditOrder: function(e) {
      const { type, index } = e.currentTarget.dataset;
      const value = e.detail.value;
      console.log('[ocrOrderList组件] 编辑订单:', { type, index, value });
      this.triggerEvent('edit', {
        index: index,
        type: type,
        value: value
      });
    },

    /**
     * 编辑订单名称（只更新名称，不触发搜索）
     */
    onEditOrderName: function(e) {
      const { index } = e.currentTarget.dataset;
      const value = e.detail.value;
      console.log('[ocrOrderList组件] 编辑订单名称:', { index, value });
      // 只更新商品名称，不触发搜索
      this.triggerEvent('editName', {
        index: index,
        value: value
      });
    },

    /**
     * 确认搜索（键盘确认按钮触发）
     */
    onConfirmSearch: function(e) {
      const { index } = e.currentTarget.dataset;
      const value = e.detail.value || this.properties.list[index]?.nxDoGoodsName || '';
      console.log('[ocrOrderList组件] 确认搜索:', { index, value });
      if (value && value.trim().length > 0) {
        this.setData({
          hasConfirmed: true
        });
        this.triggerEvent('confirmSearch', {
          index: index,
          value: value.trim()
        });
      }
    },

    /**
     * 失焦（商品名称输入框失焦时触发，仅收起键盘）
     */
    onBlurSearch: function() {
      this.triggerEvent('blur', {});
    },

    /**
     * 输入框失焦（数量、规格等），通知页面收起键盘留白
     */
    onBlurOrderIndex: function() {
      console.log('[ocrOrderList] onBlurOrderIndex 触发 blur 事件');
      this.triggerEvent('blur', {});
    },

    /**
     * 聚焦订单输入框
     */
    onFocusOrderIndex: function(e) {
      const { index, type } = e.currentTarget.dataset;
      console.log('[ocrOrderList] 聚焦订单 index=', index, 'type=', type, ' -> 触发 focus 事件');
      // 重置确认状态，允许用户重新搜索
      this.setData({
        hasConfirmed: false
      });
      this.triggerEvent('focus', {
        index: index,
        type: type
      });
    },

    /**
     * 显示商品列表（数量或规格为空时仅弹窗提示，不展开）
     */
    onShowGoodsList: function(e) {
      const { index } = e.currentTarget.dataset;
      const list = this.properties.list || [];
      const item = list[index];
      if (item && (item.nxDoQuantity === '' || item.nxDoQuantity == null || item.nxDoStandard === '' || item.nxDoStandard == null)) {
        let msg = '';
        const qEmpty = !item.nxDoQuantity;
        const sEmpty = !item.nxDoStandard;
        if (qEmpty && sEmpty) {
          msg = '请先填写数量和规格';
        } else if (qEmpty) {
          msg = '请先填写数量';
        } else {
          msg = '请先填写规格';
        }
        wx.showToast({ title: msg, icon: 'none' });
        return;
      }
      console.log('[ocrOrderList组件] 显示商品列表:', { index });
      this.triggerEvent('showGoods', {
        index: index,
      });
    },

    /**
     * 关闭商品列表
     */
    onCloseShowGoods: function(e) {
      const { index } = e.currentTarget.dataset;
      console.log('[ocrOrderList组件] 关闭商品列表:', { index });
      this.triggerEvent('closeGoods', {
        index: index
      });
    },

    /**
     * 保存订单（选择商品）
     */
    onSaveOrder: function(e) {
      console.log("cococmcmdfe==" , e)
      const { id, index, name, item } = e.currentTarget.dataset;
      console.log('[ocrOrderList组件] 保存订单:', { id, index, name });
      this.triggerEvent('saveOrder', {
        index: index,
        goodsId: id,
        name: name,
        item: item,
      });
    },

    /**
     * 下载商品
     */
    onDownloadGoods: function(e) {
      const { index, item } = e.currentTarget.dataset;
      console.log('[ocrOrderList组件] 下载商品:', { index, item });
      this.triggerEvent('downloadGoods', {
        index: index,
        goods: item
      });
    },

    /**
     * 显示操作菜单
     */
    onShowPasteOperation: function(e) {
      const { index } = e.currentTarget.dataset;
      console.log('[ocrOrderList组件] 显示操作菜单:', { index });
      this.triggerEvent('showOperation', {
        index: index
      });
    },

    /**
     * 添加临时商品
     */
    onAddDisAlias: function(e) {
      const { index } = e.currentTarget.dataset;
      // 关闭识别弹窗（停止录音、重置状态）
      this._isReRecording = false;
      this._stopRecord();
      this.setData({
        showRecognitionModal: false,
        recognitionText: '',
        recordingOrderIndex: -1,
        recordingOrderId: null,
      });
      this.triggerEvent('recognitionModalChange', { show: false });
      this.triggerEvent('addDisAlias', { index });
    },

    /**
     * 初始化语音识别回调
     */
    _initSpeechRecognizer: function() {
      const that = this;
      
      speechRecognizerManager.OnRecognitionStart = () => {
        console.log('[ocrOrderList组件] 语音识别开始');
        that.setData({
          recognitionText: ''
        });
      };

      speechRecognizerManager.OnRecognitionResultChange = (res) => {
        console.log('[ocrOrderList组件] 语音识别结果变化:', res);
        if (res && res.result && res.result.voice_text_str !== undefined) {
          const liveText = res.result.voice_text_str;
          that.setData({
            recognitionText: liveText
          });
        }
      };

      speechRecognizerManager.OnRecognitionComplete = (res) => {
        console.log('[ocrOrderList组件] 语音识别完成:', res);
        const recognizedText = that.data.recognitionText;
        const isReRecording = that._isReRecording;
        if (isReRecording) that._isReRecording = false;
        console.log('[ocrOrderList组件] 识别到的文本:', recognizedText, 'isReRecording:', isReRecording);
        
        that.setData({
          isRecording: false
        });
        
        if (that.data.timer) {
          clearInterval(that.data.timer);
          that.setData({ timer: null });
        }
        
        if (isReRecording) {
          return; // 重新录入时忽略此次完成回调，等待 _startRecord 启动新录音
        }
        
        // 显示识别文本，等待用户确认
        if (recognizedText && recognizedText.trim()) {
          console.log('[ocrOrderList组件] 识别完成，等待用户确认');
        } else {
          wx.showToast({
            title: '未识别到内容',
            icon: 'none'
          });
          that.setData({
            showRecognitionModal: false,
            recognitionText: '',
            recordingOrderIndex: -1,
            recordingOrderId: null
          });
          that.triggerEvent('recognitionModalChange', { show: false });
        }
      };

      speechRecognizerManager.OnError = (res) => {
        console.error('[ocrOrderList组件] 语音识别错误:', res);
        that.setData({
          isRecording: false
        });
        
        if (that.data.timer) {
          clearInterval(that.data.timer);
          that.setData({ timer: null });
        }
        
        wx.showToast({
          title: '录音失败，请重试',
          icon: 'none'
        });
      };
    },

    /**
     * 单击开始录音（弹窗立即显示）
     */
    onTapRecord: function(e) {
      const { index, id } = e.currentTarget.dataset;
      console.log('[ocrOrderList组件] 单击开始录音:', { index, id });
      
      const orderItem = this.properties.list[index];
      if (!orderItem) {
        wx.showToast({
          title: '订单不存在',
          icon: 'none'
        });
        return;
      }
      
      // 立即显示弹窗并开始录音
      this.setData({ showRecognitionModal: true });
      this.triggerEvent('recognitionModalChange', { show: true });
      this._startRecord(index, id);
    },

    /**
     * 停止录音
     */
    onStopRecord: function() {
      if (this.data.isRecording) {
        this._stopRecord();
      }
    },

    /**
     * 重新录入：清空文字，重新开始录音
     */
    onReRecord: function() {
      const { recordingOrderIndex, recordingOrderId } = this.data;
      this._isReRecording = true;
      this._stopRecord();
      this.setData({
        recognitionText: ''
      });
      if (recordingOrderIndex >= 0) {
        const that = this;
        setTimeout(() => {
          that._startRecord(recordingOrderIndex, recordingOrderId);
        }, 400);
      }
    },

    /**
     * 开始录音
     */
    _startRecord: function(orderIndex, orderId) {
      const that = this;
      
      // 清除可能存在的旧定时器
      if (that.data.timer) {
        clearInterval(that.data.timer);
      }
      
      const params = {
        secretkey: TENCENT_CLOUD_SECRET_KEY,
        secretid: TENCENT_CLOUD_SECRET_ID,
        appid: TENCENT_CLOUD_APP_ID,
        engine_model_type: TENCENT_CLOUD_ENGINE_MODEL_TYPE,
        voice_format: TENCENT_CLOUD_VOICE_FORMAT
      };
      
      // 如果之前有识别文本且是同一个订单，不清除识别文本（允许用户再次确认）
      // 如果是不同的订单，清除之前的识别文本
      const shouldClearText = that.data.recordingOrderIndex !== orderIndex;
      
      this.setData({
        isRecording: true,
        recognitionText: '', // 清空弹窗显示的文本
        recordingOrderIndex: orderIndex,
        recordingOrderId: orderId,
        timer: null,
      });
      
      // 创建定时器（用于记录录音时长，如果需要显示时长可以在这里更新UI）
      let duration = 0;
      that.data.timer = setInterval(() => {
        duration++;
        // 可以在这里更新录音时长显示
        // 例如：that.setData({ recordingDuration: duration });
      }, 1000);
      
      wx.showToast({
        title: '开始录音',
        icon: 'none',
        duration: 1000
      });
      
      // 开始录音
      try {
        speechRecognizerManager.start(params);
      } catch (error) {
        console.error('[ocrOrderList组件] 启动录音失败:', error);
        this.setData({
          isRecording: false
        });
        if (that.data.timer) {
          clearInterval(that.data.timer);
          that.setData({ timer: null });
        }
        wx.showToast({
          title: '启动录音失败',
          icon: 'none'
        });
      }
    },

    /**
     * 停止录音
     */
    _stopRecord: function() {
      const that = this;
      
      if (that.data.timer) {
        clearInterval(that.data.timer);
        that.setData({ timer: null });
      }
      
      this.setData({
        isRecording: false
      });
      
      try {
        speechRecognizerManager.stop();
      } catch (error) {
        console.error('[ocrOrderList组件] 停止录音失败:', error);
      }
    },

    

    /**
     * 确认识别结果（使用 DeepSeek 优化后解析）
     */
    onAIParseRecognition: async function(e) {
      this._stopRecord();
      const recognitionText = this.data.recognitionText;
      const recordingOrderIndex = this.data.recordingOrderIndex;
      
      console.log('[ocrOrderList组件] 用户选择AI解析:', { recordingOrderIndex, recognitionText });
      
      if (!recognitionText || !recognitionText.trim()) {
        wx.showToast({
          title: '识别文本为空',
          icon: 'none'
        });
        return;
      }
      
      if (recordingOrderIndex < 0) {
        wx.showToast({
          title: '订单索引无效',
          icon: 'none'
        });
        return;
      }
      
      const that = this;
      const orderItem = that.properties.list[recordingOrderIndex];
      if (!orderItem) {
        wx.showToast({
          title: '订单不存在',
          icon: 'none'
        });
        return;
      }
      
      // 先判断业务类型，传入原订单信息
      wx.showLoading({ title: '识别中...', mask: true });
      try {
        // 准备原订单信息（只包含需要修改的4个字段）
        const originalOrder = {
          nxDoGoodsName: orderItem.nxDoGoodsName || '',
          nxDoQuantity: orderItem.nxDoQuantity || '',
          nxDoStandard: orderItem.nxDoStandard || '',
          nxDoRemark: orderItem.nxDoRemark || ''
        };
        
        const businessType = await detectBusinessType(recognitionText.trim(), {
          logPrefix: '[ocrOrderList组件]',
          originalOrder: originalOrder
        });
        
        // 根据业务类型执行不同操作
        if (businessType.action === 'delete') {
          wx.hideLoading();
          this._handleDeleteOrder();
          return;
        } else if (businessType.action === 'add') {
          wx.hideLoading();
          this._handleAddOrder();
          return;
        }
        
        // 修改订单：如果 DeepSeek 返回了修改后的订单，直接使用
        if (businessType.updatedOrder) {
          wx.hideLoading();
          
          // 检查必要字段是否完整
          const updatedOrderData = businessType.updatedOrder;
          const goodsName = updatedOrderData.nxDoGoodsName || '';
          const quantity = updatedOrderData.nxDoQuantity || '';
          const standard = updatedOrderData.nxDoStandard || '';
          const remark = updatedOrderData.nxDoRemark || '';
          // 检查是否缺少必要字段
          if (!goodsName || !quantity || !standard) {
            const missingFields = [];
            if (!goodsName) missingFields.push('商品名称');
            if (!quantity) missingFields.push('数量');
            if (!standard) missingFields.push('规格');
            
            const missingText = missingFields.join('、');
            const orderText = `商品名称：${goodsName || '(缺失)'}\n数量：${quantity || '(缺失)'}\n规格：${standard || '(缺失)'}`;
            
            wx.showModal({
              title: '订单缺少必要条件',
              content: `缺少字段：${missingText}\n\n当前订单内容：\n${orderText}\n\n请重新录入。`,
              showCancel: false,
              confirmText: '确定'
            });
            return;
          }
          
          // 使用 DeepSeek 返回的修改后订单
          const updatedOrder = {
            ...orderItem,
            nxDoGoodsName: goodsName,
            nxDoQuantity: quantity,
            nxDoStandard: standard,
            nxDoRemark: updatedOrderData.nxDoRemark !== undefined ? updatedOrderData.nxDoRemark : ""
          };
          
          console.log('[ocrOrderList组件] DeepSeek 返回的修改后订单:', updatedOrder);
          
          // 调用接口更新订单
          that._callCorrectOrderAPI(updatedOrder);
          return;
        }
        
        // 如果没有返回 updatedOrder，使用原来的解析流程（兼容旧逻辑）
        wx.showLoading({ title: 'AI优化解析中...', mask: true });
        const optimizedText = await optimizeTextWithDeepSeek(recognitionText.trim(), {
          brandList: [],
          temperature: 0.2,
          logPrefix: '[ocrOrderList组件]'
        });
        
        console.log('[ocrOrderList组件] DeepSeek 优化后的文本:', optimizedText);
        
        wx.hideLoading();
        
        // 使用优化后的文本解析订单
        const parseResult = parseOrderFromText(optimizedText, {
          depId: that.properties.depId,
          depFatherId: that.properties.depFatherId,
          disId: that.properties.disId,
          userId: that.properties.userId
        });
        
        console.log('[ocrOrderList组件] AI解析结果:', parseResult);
        
        if (!parseResult.orders || parseResult.orders.length === 0) {
          wx.showToast({
            title: 'AI解析失败，未解析到订单',
            icon: 'none'
          });
          return;
        }
        
        // 取第一个订单的3个字段
        const firstOrder = parseResult.orders[0];
        const updatedOrder = {
          ...orderItem,
          nxDoGoodsName: firstOrder.nxDoGoodsName || orderItem.nxDoGoodsName,
          nxDoStandard: firstOrder.nxDoStandard || orderItem.nxDoStandard,
          nxDoQuantity: firstOrder.nxDoQuantity || orderItem.nxDoQuantity
        };
        
        console.log('[ocrOrderList组件] AI解析后的订单:', updatedOrder);
        
        // 调用接口更新订单
        that._callCorrectOrderAPI(updatedOrder);
        
      } catch (error) {
        wx.hideLoading();
        console.error('[ocrOrderList组件] 处理失败:', error);
        wx.showModal({
          title: '处理失败',
          content: error.message || '操作失败，请重试',
          showCancel: false,
          confirmText: '确定'
        });
      }
    },

    /**
     * 阻止事件冒泡（点击弹窗内容区域不关闭弹窗）
     */
    stopPropagation: function(e) {
      // 阻止事件冒泡，防止点击内容区域时关闭弹窗
    },

    /**
     * 关闭弹窗：立即结束录音，不请求任何接口，只重置本地状态
     */
    onCancelRecognition: function(e) {
      this._isReRecording = false;
      this._stopRecord();
      this.setData({
        showRecognitionModal: false,
        recognitionText: '',
        recordingOrderIndex: -1,
        recordingOrderId: null,
      });
      this.triggerEvent('recognitionModalChange', { show: false });
    },

    /**
     * 调用 correctOrder 接口
     */
    _callCorrectOrderAPI: function(orderEntity) {
      const that = this;
      
      load.showLoading('正在更新订单...');
      
      correctOrder(orderEntity).then(res => {
        load.hideLoading();
        
        if (res.result && res.result.code === 0) {
          
          var order = res.result.data;
          console.log("ai解析更新订单结果", order)
        
          const orderIndex = that.data.recordingOrderIndex;
          
          if(order.nxDoStatus == '-2'){
            console.log("ai解析更新订单结果-2--2-2-2")
            order.nxDoIsAgent = '2'; // 设置为字符串 '2'，与 WXML 中的判断一致
          }
          // 通知父组件订单已更新
          that.triggerEvent('orderUpdated', {
            index: orderIndex,
            order: order
          });
          
          // 如果订单状态是-2，自动进入修改状态并显示推荐商品
          if(order.nxDoStatus == '-2'){
            // 延迟一下，确保父组件先处理完 orderUpdated 事件，更新订单数组
            setTimeout(() => {
              // 触发 focus 事件，进入修改状态（设置 orderArrIndex 和 nxDoIsAgent = 2，并清空搜索结果）
              // focusOrderIndex 已经设置了所有需要的状态，包括清空 strArr 和 nxArr
              that.triggerEvent('focus', {
                index: orderIndex,
                type: 'name'
              });
            }, 300);
          }
          
          // 重置状态
          that.setData({
            showRecognitionModal: false,
            recordingOrderIndex: -1,
            stoppedIndex: -1, //sisy
            recordingOrderId: null,
            recognitionText: ''
          });
          that.triggerEvent('recognitionModalChange', { show: false });
        } else {
          const errorMsg = res.result?.msg || '更新失败，请重试';
          wx.showModal({
            title: '更新失败',
            content: errorMsg,
            showCancel: false,
            confirmText: '确定'
          });
        }
      }).catch(err => {
        load.hideLoading();
        console.error('[ocrOrderList组件] 更新订单失败:', err);
        wx.showModal({
          title: '更新失败',
          content: '网络请求失败，请检查网络连接后重试',
          showCancel: false,
          confirmText: '确定'
        });
      });
    },

    /**
     * 处理删除订单
     */
    _handleDeleteOrder: async function() {
      const that = this;
      const orderId = this.data.recordingOrderId;
      const orderIndex = this.data.recordingOrderIndex;
      
      if (!orderId) {
        wx.showToast({ 
          title: '订单ID不存在', 
          icon: 'none' 
        });
        // 重置状态
        that.setData({
          recognitionText: '',
          recordingOrderIndex: -1,
          recordingOrderId: null
        });
        return;
      }
      
      load.showLoading('正在删除...');
      
      try {
        const res = await deleteTaskOrder(orderId);
        load.hideLoading();
        
        if (res.result && res.result.code === 0) {
          // 先标记为删除状态，触发动画
          that.setData({
            deletingIndex: orderIndex
          });
          
          // 等待动画播放完成（300ms）后再通知父组件删除
          setTimeout(() => {
            // 通知父组件订单已删除
            that.triggerEvent('orderDeleted', {
              index: orderIndex
            });
            
            // 重置状态
            that.setData({
              recognitionText: '',
              recordingOrderIndex: -1,
              recordingOrderId: null,
              deletingIndex: -1 // 清除删除标记
            });
            
            wx.showToast({ 
              title: '删除成功', 
              icon: 'success' 
            });
          }, 300); // 动画时长 300ms
        } else {
          const errorMsg = res.result?.msg || '删除失败';
          wx.showToast({ 
            title: errorMsg, 
            icon: 'none' 
          });
          // 重置状态
          that.setData({
            recognitionText: '',
            recordingOrderIndex: -1,
            recordingOrderId: null
          });
        }
      } catch (err) {
        load.hideLoading();
        console.error('[ocrOrderList组件] 删除订单失败:', err);
        wx.showToast({ 
          title: '删除失败，请重试', 
          icon: 'none' 
        });
        // 重置状态
        that.setData({
          recognitionText: '',
          recordingOrderIndex: -1,
          recordingOrderId: null
        });
      }
    },

    /**
     * 处理新增订单
     */
    _handleAddOrder: function() {
      const that = this;
      const orderIndex = this.data.recordingOrderIndex;
      
      // 通知父组件添加新订单
      that.triggerEvent('addOrderBefore', {
        index: orderIndex
      });
      
      // 重置状态
      that.setData({
        recognitionText: '',
        recordingOrderIndex: -1,
        recordingOrderId: null,
      });
    }
  }
})


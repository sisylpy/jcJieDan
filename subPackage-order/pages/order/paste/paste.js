import load from '../../../../lib/load';
import apiUrl from '../../../../config.js';

import {
  pasteSearchGoods,
  addRecord,
  recognizeOrderAsync,
  recognizeOrderFast,
} from '../../../../lib/apiDepOrder';

import { getBrandForPrompts, saveRetailDepartment } from '../../../../lib/apiDistributer';
import { parseOrderFromTextV2 } from '../../../../lib/orderParserV2';
import { optimizeTextWithDeepSeek } from '../../../../lib/deepSeekHelper';
import { getAsrCredentials } from '../../../../lib/miniProgramCloud';

const plugin = requirePlugin('QCloudAIVoice');
const speechRecognizerManager = plugin.speechRecognizerManager();
const config = require('../../../../config');
const TENCENT_CLOUD_ENGINE_MODEL_TYPE = config.tencentCloud?.engineModelType || '16k_zh';
const TENCENT_CLOUD_VOICE_FORMAT = config.tencentCloud?.voiceFormat || 1;
const INPUT_MIN_HEIGHT = 600;
const INPUT_MAX_HEIGHT = 920;
const INPUT_LINE_HEIGHT = 48;
const INPUT_CHARS_PER_LINE = 21;

/**
 * textarea 的 auto-height 会把短内容也压缩，所以按文本估算视觉行数：
 * 短内容保持现有高度，超过后逐步增长，达到上限后由输入框内部滚动。
 */
function estimateInputAreaHeight(content) {
  const text = String(content || '');
  if (!text) return INPUT_MIN_HEIGHT;
  const visualLineCount = text.split('\n').reduce((count, line) => {
    let width = 0;
    for (const char of line) {
      width += /[\x00-\xff]/.test(char) ? 0.55 : 1;
    }
    return count + Math.max(1, Math.ceil(width / INPUT_CHARS_PER_LINE));
  }, 0);
  const requiredHeight = visualLineCount * INPUT_LINE_HEIGHT + 28;
  if (requiredHeight <= INPUT_MIN_HEIGHT) return INPUT_MIN_HEIGHT;
  return Math.min(INPUT_MAX_HEIGHT, Math.ceil(requiredHeight / 24) * 24);
}

function safeDecode(value) {
  if (value == null) return '';
  try {
    return decodeURIComponent(value);
  } catch (error) {
    return String(value);
  }
}

Page({
  data: {
    orderArr: [],
    inputContent: '',
    inputAreaHeight: INPUT_MIN_HEIGHT,
    inputFocused: false,
    sourceText: '',
    originSentence: '',
    showInputPanel: true,
    isRecording: false,
    recognitionStatus: '',
    duration: 0,
    timer: null,
    saving: false,
    showDeepSeekLoading: false,
    isAiOptimizing: false,
    aiEnhanced: false,
    brandPrompts: [],
    departmentOptions: [],
    corrections: [],
    departmentSegments: [],
    unresolvedSegments: [],
    parseSummary: {
      totalCount: 0,
      validCount: 0,
      reviewCount: 0,
      correctionCount: 0,
      departmentCount: 0,
      headerCount: 0
    },
    showCorrectionDetails: false,
    invalidOrderIndex: -1,
    invalidOrderField: '',
    scrollIntoViewId: '',
    ocrImageList: [],
    ocrSubmitting: false,
    ocrResetKey: 0,
    inputPlaceholder: '直接粘贴清单，例如：\n凉菜\n湘君府小米泡辣1件\n佳汀香油1捅',
    exampleText: '凉菜\n湘君府小米泡辣1件\n王守义十三香1板\n佳汀香油1捅'
  },

  onLoad(options) {
    const globalData = getApp().globalData || {};
    const depInfo = wx.getStorageSync('depItem') || {};
    const depId = options.depId || depInfo.nxDepartmentId || '';
    const depFatherId = options.depFatherId || depInfo.nxDepartmentFatherId || depId;
    const depName = safeDecode(options.depName || options.name || depInfo.nxDepartmentAttrName || '餐厅订货');
    const departmentOptions = this._buildDepartmentOptions(depInfo, {
      depId,
      depFatherId,
      depName
    });
    const userInfo = wx.getStorageSync('userInfo') || {};
    const isRetail = options.isRetail === '1';
    const disId = isRetail && userInfo.nxDistributerEntity
      ? (userInfo.nxDistributerEntity.nxDistributerId || userInfo.nxDiuDistributerId)
      : userInfo.nxDiuDistributerId;

    this.setData({
      windowWidth: (globalData.windowWidth || 375) * (globalData.rpxR || 2),
      windowHeight: (globalData.windowHeight || 667) * (globalData.rpxR || 2),
      navBarHeight: (globalData.navBarHeight || 44) * (globalData.rpxR || 2),
      url: apiUrl.server,
      depInfo,
      depId,
      depFatherId,
      depName,
      depSettleType: options.depSettleType,
      departmentOptions,
      userInfo,
      userId: userInfo.nxDistributerUserId || -1,
      disId,
      isRetail
    });

    if (isRetail && disId) {
      saveRetailDepartment(disId).then(res => {
        if (!res || !res.result || res.result.code !== 0 || !res.result.data) return;
        const retailDepartment = res.result.data;
        const retailDepId = retailDepartment.nxDepartmentId;
        const retailFatherId = retailDepartment.nxDepartmentFatherId || retailDepId;
        const retailName = retailDepartment.nxDepartmentName || '零售订货';
        this.setData({
          depId: retailDepId,
          depFatherId: retailFatherId,
          depName: retailName,
          departmentOptions: [{ id: retailDepId, fatherId: retailFatherId, name: retailName }]
        });
      }).catch(error => console.warn('[pasteV2] 零售部门初始化失败:', error));
    }

    this._bindSpeechCallbacks();
    this._loadBrandPrompts();
  },

  onUnload() {
    if (this.data.timer) clearInterval(this.data.timer);
    if (this.data.isRecording) {
      try {
        speechRecognizerManager.stop();
      } catch (error) {
        console.warn('[pasteV2] 停止录音失败:', error);
      }
    }
  },

  _buildDepartmentOptions(depInfo, current) {
    const result = [];
    const seen = new Set();
    const add = (department, fallbackName) => {
      if (!department) return;
      const id = department.nxDepartmentId != null ? department.nxDepartmentId : department.id;
      const name = department.nxDepartmentName || department.nxDepartmentAttrName || department.name || fallbackName;
      if (id == null || !name || seen.has(String(id))) return;
      seen.add(String(id));
      result.push({
        id,
        fatherId: department.nxDepartmentFatherId != null
          ? department.nxDepartmentFatherId
          : (department.fatherId != null ? department.fatherId : current.depFatherId),
        name
      });
    };

    (depInfo.nxDepartmentEntities || []).forEach(department => add(department));
    add({ id: current.depId, fatherId: current.depFatherId, name: current.depName });
    return result;
  },

  _parserOptions() {
    return {
      depId: this.data.depId,
      depFatherId: this.data.depFatherId,
      depName: this.data.depName,
      disId: this.data.disId,
      userId: this.data.userId,
      departments: this.data.departmentOptions
    };
  },

  async _loadBrandPrompts() {
    try {
      const res = await getBrandForPrompts();
      if (res && res.result && res.result.code === 0) {
        this.setData({ brandPrompts: Array.isArray(res.result.data) ? res.result.data : [] });
      }
    } catch (error) {
      console.warn('[pasteV2] 品牌提示加载失败，不影响本地解析:', error);
    }
  },

  _bindSpeechCallbacks() {
    speechRecognizerManager.OnRecognitionStart = () => {
      this.setData({ recognitionStatus: '正在听，请说订单…' });
    };
    speechRecognizerManager.OnRecognitionResultChange = res => {
      if (res && res.result && res.result.voice_text_str) {
        const spokenText = String(res.result.voice_text_str).trim();
        const text = [this._recordingBaseText, spokenText].filter(Boolean).join('\n');
        this.setData({
          inputContent: text,
          inputAreaHeight: estimateInputAreaHeight(text),
          recognitionStatus: '正在识别…'
        });
      }
    };
    speechRecognizerManager.OnRecognitionComplete = () => {
      this._finishRecordingState('语音识别完成');
      const text = (this.data.inputContent || '').trim();
      if (text) {
        this.setData({ sourceText: text, originSentence: text });
        this._parseContent(text, false);
      }
    };
    speechRecognizerManager.OnRecorderStop = () => {
      this._finishRecordingState(this.data.inputContent ? '语音识别完成' : '录音已停止');
    };
    speechRecognizerManager.OnError = res => {
      if (res && res.code === 4008) {
        this.setData({ recognitionStatus: '请继续说话…' });
        return;
      }
      this._finishRecordingState('语音识别失败');
      wx.showToast({
        title: res && res.code === 6000 ? '语音服务连接失败' : '语音识别失败',
        icon: 'none'
      });
    };
  },

  _finishRecordingState(status) {
    if (this.data.timer) clearInterval(this.data.timer);
    this.setData({
      timer: null,
      isRecording: false,
      recognitionStatus: status
    });
  },

  _ensureRecordPermission() {
    if (!wx.authorize || typeof wx.authorize !== 'function') return Promise.resolve(true);
    return new Promise(resolve => {
      wx.authorize({
        scope: 'scope.record',
        success: () => resolve(true),
        fail: () => {
          if (!wx.showModal || typeof wx.showModal !== 'function') {
            resolve(false);
            return;
          }
          wx.showModal({
            title: '需要麦克风权限',
            content: '请在设置中允许使用麦克风后，再使用语音说单。',
            confirmText: '去设置',
            success: result => {
              if (!result.confirm || !wx.openSetting) {
                resolve(false);
                return;
              }
              wx.openSetting({
                success: setting => resolve(!!(setting.authSetting && setting.authSetting['scope.record'])),
                fail: () => resolve(false)
              });
            },
            fail: () => resolve(false)
          });
        }
      });
    });
  },

  async startRecord() {
    if (this.data.isRecording) return;
    const hasPermission = await this._ensureRecordPermission();
    if (!hasPermission) return;
    let credentials;
    try {
      credentials = await getAsrCredentials();
    } catch (error) {
      wx.showToast({ title: error.message || '语音服务初始化失败', icon: 'none' });
      return;
    }
    if (this.data.timer) clearInterval(this.data.timer);
    this._recordingBaseText = String(this.data.inputContent || '').trim();
    this.setData({
      isRecording: true,
      duration: 0,
      recognitionStatus: '准备录音…'
    });
    const timer = setInterval(() => {
      this.setData({ duration: this.data.duration + 1 });
    }, 1000);
    this.setData({ timer });
    speechRecognizerManager.start({
      secretkey: credentials.secretKey,
      secretid: credentials.secretId,
      token: credentials.token,
      appid: credentials.appId,
      engine_model_type: TENCENT_CLOUD_ENGINE_MODEL_TYPE,
      voice_format: TENCENT_CLOUD_VOICE_FORMAT
    });
  },

  stopRecord() {
    if (!this.data.isRecording) return;
    const duration = this.data.duration;
    this._finishRecordingState('正在完成识别…');
    try {
      speechRecognizerManager.stop();
    } catch (error) {
      console.warn('[pasteV2] 停止录音失败:', error);
    }
    if (duration > 0) {
      addRecord({
        nxNdplNxDisId: this.data.disId,
        nxNdplPaySubtotal: duration,
        nxNdplNxDepartmentFatherId: this.data.depFatherId,
        nxNdplNxDepartmentId: this.data.depId
      }).catch(error => console.warn('[pasteV2] 录音时长保存失败:', error));
    }
  },

  onInput(e) {
    const text = e.detail.value;
    const previousText = String(this.data.inputContent || '');
    const addedLength = text.length - previousText.length;
    const looksLikePaste = addedLength >= 12 || (addedLength >= 3 && text.includes('\n'));
    this.setData({
      inputContent: text,
      inputAreaHeight: estimateInputAreaHeight(text),
      sourceText: text,
      aiEnhanced: false
    });
    if (looksLikePaste) this._closeKeyboard();
  },

  onInputFocus() {
    this.setData({ inputFocused: true });
  },

  onInputBlur() {
    if (this.data.inputFocused) this.setData({ inputFocused: false });
  },

  finishInput() {
    this._closeKeyboard();
  },

  _closeKeyboard() {
    if (this.data.inputFocused) this.setData({ inputFocused: false });
    if (wx.hideKeyboard && typeof wx.hideKeyboard === 'function') {
      setTimeout(() => wx.hideKeyboard({}), 20);
    }
  },

  pasteFromClipboard() {
    if (this.data.isRecording) return;
    this._closeKeyboard();
    wx.getClipboardData({
      success: res => {
        const text = String(res.data || '').trim();
        if (!text) {
          wx.showToast({ title: '剪贴板为空', icon: 'none' });
          return;
        }
        this.setData({
          inputContent: text,
          inputAreaHeight: estimateInputAreaHeight(text),
          sourceText: text,
          originSentence: text,
          aiEnhanced: false
        }, () => this._parseContent(text, false));
      },
      fail: () => wx.showToast({ title: '读取剪贴板失败', icon: 'none' })
    });
  },

  useExample() {
    const text = this.data.exampleText;
    this.setData({
      inputContent: text,
      inputAreaHeight: estimateInputAreaHeight(text),
      sourceText: text,
      originSentence: text,
      aiEnhanced: false
    }, () => this._parseContent(text, false));
  },

  smartParse() {
    this._closeKeyboard();
    const text = String(this.data.inputContent || '').trim();
    if (!text) {
      wx.showToast({ title: '请先粘贴或输入订单', icon: 'none' });
      return;
    }
    if (!this.data.sourceText) this.setData({ sourceText: text, originSentence: text });
    this._parseContent(text, false);
  },

  _parseContent(text, aiEnhanced) {
    const result = parseOrderFromTextV2(text, this._parserOptions());
    if (!result.orders.length) {
      wx.showToast({ title: '没有找到可识别的商品', icon: 'none' });
      return result;
    }
    this.setData({
      orderArr: result.orders,
      corrections: result.corrections || [],
      departmentSegments: result.departmentSegments || [],
      unresolvedSegments: result.unresolvedSegments || [],
      parseSummary: result.summary,
      showInputPanel: false,
      showCorrectionDetails: (result.corrections || []).length > 0,
      invalidOrderIndex: -1,
      invalidOrderField: '',
      aiEnhanced: !!aiEnhanced
    });
    return result;
  },

  _buildAiPrompt() {
    const departmentNames = (this.data.departmentOptions || []).map(item => item.name).join('、') || '未提供';
    return `你是餐厅饭馆订货场景的高级订单解析助手。用户输入可能来自微信粘贴或语音识别，包含错别字、同音字、部门标题和不规则标点。

当前饭馆可用部门：${departmentNames}

处理要求：
1. “凉菜、面点、后厨”等如果与可用部门匹配，是部门标题，不是商品；标题后的商品继承该部门，直到出现下一个部门标题。
2. 智能修正常见计量单位错字，例如 捅/筒→桶、代/戴→袋、建→件、平→瓶、版→板。
3. 结合餐饮语境和品牌列表纠正商品名同音字，但不要凭空增加商品。
4. 保留用户的数量和备注。无法确定时保留原文，不要编造。
5. 仅输出纯 JSON 数组，不要 Markdown，不要解释。

JSON格式：
[{"departmentName":"部门名称","name":"商品名称","qty":"数量","unit":"单位","remark":"备注"}]`;
  },

  async aiEnhance() {
    if (this.data.isAiOptimizing) return;
    this._closeKeyboard();
    const source = String(this.data.sourceText || this.data.inputContent || '').trim();
    if (!source) {
      wx.showToast({ title: '请先输入订单内容', icon: 'none' });
      return;
    }
    this.setData({ showDeepSeekLoading: true, isAiOptimizing: true });
    try {
      const aiResponse = await optimizeTextWithDeepSeek(source, {
        systemPrompt: this._buildAiPrompt(),
        brandList: this.data.brandPrompts || [],
        temperature: 0.1,
        logPrefix: '[pasteV2]'
      });
      const optimizedText = typeof aiResponse === 'string' ? aiResponse.trim() : JSON.stringify(aiResponse || '');
      if (!optimizedText || optimizedText === '[]') {
        wx.showToast({ title: 'DeepSeek 未识别到商品', icon: 'none' });
        return;
      }
      const result = this._parseContent(optimizedText, true);
      if (result && result.orders.length) {
        wx.showToast({ title: 'DeepSeek 识别完成', icon: 'success' });
      } else {
        wx.showToast({ title: 'DeepSeek 结果需要重试', icon: 'none' });
      }
    } catch (error) {
      console.error('[pasteV2] AI精修失败:', error);
      wx.showModal({
        title: 'DeepSeek 暂时不可用',
        content: `${error && error.message ? error.message : '请检查网络后重试'}。原订单内容已保留。`,
        showCancel: false
      });
    } finally {
      this.setData({ showDeepSeekLoading: false, isAiOptimizing: false });
    }
  },

  editOriginal() {
    this.setData({
      showInputPanel: true,
      inputAreaHeight: estimateInputAreaHeight(this.data.inputContent || this.data.sourceText)
    });
  },

  clearAll() {
    if (this.data.isRecording) this.stopRecord();
    this.setData({
      orderArr: [],
      inputContent: '',
      inputAreaHeight: INPUT_MIN_HEIGHT,
      inputFocused: false,
      sourceText: '',
      originSentence: '',
      showInputPanel: true,
      corrections: [],
      departmentSegments: [],
      unresolvedSegments: [],
      showCorrectionDetails: false,
      aiEnhanced: false,
      isAiOptimizing: false,
      ocrSubmitting: false,
      parseSummary: {
        totalCount: 0,
        validCount: 0,
        reviewCount: 0,
        correctionCount: 0,
        departmentCount: 0,
        headerCount: 0
      }
    });
  },

  toggleCorrectionDetails() {
    this.setData({ showCorrectionDetails: !this.data.showCorrectionDetails });
  },

  editOrder(e) {
    const index = Number(e.currentTarget.dataset.index);
    const field = e.currentTarget.dataset.field;
    const value = e.detail.value;
    const keyMap = {
      name: 'nxDoGoodsName',
      quantity: 'nxDoQuantity',
      standard: 'nxDoStandard',
      remark: 'nxDoRemark'
    };
    const key = keyMap[field];
    if (!key || !this.data.orderArr[index]) return;
    const orderArr = this.data.orderArr.slice();
    orderArr[index] = { ...orderArr[index], [key]: value };
    if (field === 'remark') orderArr[index].nxDoAddRemark = !!value;
    this._refreshOrderState(orderArr[index]);
    this.setData({
      orderArr,
      invalidOrderIndex: -1,
      invalidOrderField: ''
    }, () => this._refreshSummary());
  },

  _refreshOrderState(order) {
    const name = String(order.nxDoGoodsName || '').trim();
    const quantity = Number(order.nxDoQuantity);
    const standard = String(order.nxDoStandard || '').trim();
    const valid = !!(name && quantity > 0 && standard && standard.length <= 4);
    order.nxDoIsValid = valid;
    order.v2NeedsReview = !valid;
    order.v2Warning = valid ? '' : '请补全商品名称、数量和单位';
    order.v2Confidence = valid ? (order.v2Confidence === 'low' ? 'medium' : order.v2Confidence) : 'low';
  },

  _refreshSummary() {
    const orderArr = this.data.orderArr || [];
    const reviewCount = orderArr.filter(order => order.v2NeedsReview).length;
    const departmentCount = new Set(orderArr.map(order => String(order.nxDoDepartmentId))).size;
    this.setData({
      'parseSummary.totalCount': orderArr.length,
      'parseSummary.validCount': orderArr.length - reviewCount,
      'parseSummary.reviewCount': reviewCount,
      'parseSummary.departmentCount': departmentCount
    });
  },

  changeOrderDepartment(e) {
    const orderIndex = Number(e.currentTarget.dataset.index);
    const departmentIndex = Number(e.detail.value);
    const department = this.data.departmentOptions[departmentIndex];
    if (!department || !this.data.orderArr[orderIndex]) return;
    const orderArr = this.data.orderArr.slice();
    orderArr[orderIndex] = {
      ...orderArr[orderIndex],
      nxDoDepartmentId: department.id,
      nxDoDepartmentFatherId: department.fatherId || this.data.depFatherId,
      v2DepartmentName: department.name
    };
    this.setData({ orderArr }, () => this._refreshSummary());
  },

  addRemark(e) {
    const index = Number(e.currentTarget.dataset.index);
    if (!this.data.orderArr[index]) return;
    const orderArr = this.data.orderArr.slice();
    orderArr[index] = { ...orderArr[index], nxDoAddRemark: true };
    this.setData({ orderArr });
  },

  insertOrderBefore(e) {
    const index = Number(e.currentTarget.dataset.index);
    const reference = this.data.orderArr[index] || {};
    const orderArr = this.data.orderArr.slice();
    orderArr.splice(index, 0, this._newEmptyOrder(reference));
    this.setData({ orderArr }, () => this._refreshSummary());
  },

  appendOrder() {
    const reference = this.data.orderArr[this.data.orderArr.length - 1] || {};
    const orderArr = this.data.orderArr.concat(this._newEmptyOrder(reference));
    this.setData({ orderArr }, () => this._refreshSummary());
  },

  _newEmptyOrder(reference) {
    const department = this.data.departmentOptions.find(item =>
      String(item.id) === String(reference.nxDoDepartmentId || this.data.depId)
    );
    return {
      nxDoGoodsName: '',
      nxDoGoodsOriginalName: '',
      nxDoQuantity: '',
      nxDoStandard: '',
      nxDoRemark: '',
      nxDoAddRemark: false,
      nxDoStatus: -2,
      nxDoDepartmentId: department ? department.id : this.data.depId,
      nxDoDepartmentFatherId: department ? department.fatherId : this.data.depFatherId,
      nxDoDisGoodsId: null,
      nxDoStandardWarn: 0,
      goodsNameWarn: 0,
      nxDoDistributerId: this.data.disId,
      nxDoPurchaseUserId: -1,
      nxDoOrderUserId: this.data.userId,
      nxDoIsAgent: -1,
      standardWeight: '',
      cartonUnit: '',
      itemUnit: '',
      itemsPerCarton: '',
      nxDoIsValid: false,
      v2DepartmentName: department ? department.name : this.data.depName,
      v2Confidence: 'low',
      v2NeedsReview: true,
      v2Warning: '请填写新订单',
      v2SourceText: '',
      v2CorrectionText: ''
    };
  },

  deleteOrder(e) {
    const index = Number(e.currentTarget.dataset.index);
    const orderArr = this.data.orderArr.filter((_, itemIndex) => itemIndex !== index);
    if (!orderArr.length) {
      this.clearAll();
      return;
    }
    this.setData({ orderArr }, () => this._refreshSummary());
  },

  _validateOrdersForSave() {
    const orders = this.data.orderArr || [];
    if (!orders.length) {
      return { valid: false, index: 0, field: 'name', message: '订单列表为空' };
    }
    for (let index = 0; index < orders.length; index += 1) {
      const order = orders[index];
      if (!String(order.nxDoGoodsName || '').trim()) {
        return { valid: false, index, field: 'name', message: `第${index + 1}条缺少商品名称` };
      }
      if (!(Number(order.nxDoQuantity) > 0)) {
        return { valid: false, index, field: 'quantity', message: `第${index + 1}条数量需要大于0` };
      }
      const standard = String(order.nxDoStandard || '').trim();
      if (!standard || standard.length > 4) {
        return { valid: false, index, field: 'standard', message: `第${index + 1}条单位不正确` };
      }
      if (order.nxDoDepartmentId == null || order.nxDoDepartmentId === '') {
        return { valid: false, index, field: 'department', message: `第${index + 1}条缺少部门` };
      }
    }
    return { valid: true };
  },

  _orderForApi(order) {
    const payload = { ...order };
    Object.keys(payload).forEach(key => {
      if (key.startsWith('v2') || key === 'nxDoIsValid') delete payload[key];
    });
    payload.nxDoGoodsOriginalName = payload.nxDoGoodsOriginalName || payload.nxDoGoodsName;
    payload.nxDoAddRemark = !!payload.nxDoRemark;
    return payload;
  },

  async saveOrders() {
    if (this.data.saving) return;
    const validation = this._validateOrdersForSave();
    if (!validation.valid) {
      const scrollId = `paste-v2-order-${validation.index}`;
      this.setData({
        invalidOrderIndex: validation.index,
        invalidOrderField: validation.field,
        scrollIntoViewId: scrollId
      });
      wx.showToast({ title: validation.message, icon: 'none', duration: 2200 });
      return;
    }

    const groups = new Map();
    this.data.orderArr.forEach(order => {
      const key = String(order.nxDoDepartmentId);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(this._orderForApi(order));
    });

    this.setData({ saving: true });
    load.showLoading(groups.size > 1 ? `正在生成${groups.size}个部门任务` : '正在识别商品');
    const results = [];
    try {
      for (const orderList of groups.values()) {
        const response = await pasteSearchGoods({
          orderList,
          pasteText: this.data.sourceText || this.data.inputContent || ''
        });
        if (!response || !response.result || response.result.code !== 0) {
          throw new Error(response && response.result && response.result.msg || '保存订单失败');
        }
        results.push(response.result);
      }
      load.hideLoading();
      this.setData({ saving: false });
      if (results.length === 1 && results[0].taskId) {
        wx.redirectTo({ url: `../ocrOrder/ocrOrder?taskId=${results[0].taskId}` });
        return;
      }
      wx.showModal({
        title: '订单已按部门生成',
        content: `已生成${results.length}个部门识别任务，请在订单页逐个复核。`,
        showCancel: false,
        success: () => wx.navigateBack({ delta: 1 })
      });
    } catch (error) {
      load.hideLoading();
      this.setData({ saving: false });
      const partial = results.length ? `，已有${results.length}个部门保存成功` : '';
      wx.showModal({
        title: '保存未完成',
        content: `${error.message || '请检查网络后重试'}${partial}`,
        showCancel: false
      });
    }
  },

  toBack() {
    wx.navigateBack({ delta: 1 });
  },

  recognizeOrder() {
    if (this.data.isRecording || this.data.ocrSubmitting) return;
    this._closeKeyboard();
    const ocr = this.selectComponent('#pasteV2OcrUpload');
    if (!ocr) {
      wx.showToast({ title: '图片组件未就绪，请重试', icon: 'none' });
      return;
    }
    ocr.chooseImages();
  },

  onOcrImageChange(e) {
    this.setData({ ocrImageList: e.detail && e.detail.imageList || [] });
  },

  _getOcrDepParams() {
    const depInfo = this.data.depInfo || {};
    const depId = this.data.depId || depInfo.nxDepartmentId || '';
    let depFatherId = this.data.depFatherId;
    if (depFatherId == null || depFatherId === '' || depFatherId === 'null') {
      depFatherId = depInfo.nxDepartmentFatherId || depId;
    }
    return {
      depId,
      depFatherId,
      disId: this.data.disId || '',
      userId: this.data.userId || -1
    };
  },

  _validateOcrParams(params) {
    if (params.depId && params.depFatherId && params.disId) return true;
    wx.showToast({ title: '部门信息不完整，请返回重进', icon: 'none', duration: 3000 });
    return false;
  },

  _getOcrImagePath(imageList) {
    const image = imageList && imageList[0] || {};
    return image.path || image.tempFilePath || '';
  },

  _resetOcrState() {
    this.setData({
      ocrImageList: [],
      ocrResetKey: Date.now()
    });
  },

  async onStartOCR(e) {
    const imageList = e.detail && e.detail.imageList || this.data.ocrImageList || [];
    if (!imageList.length) {
      wx.showToast({ title: '请先选择图片', icon: 'none' });
      return;
    }
    if (this.data.ocrSubmitting) return;
    const params = this._getOcrDepParams();
    if (!this._validateOcrParams(params)) return;
    const imagePath = this._getOcrImagePath(imageList);
    if (!imagePath) {
      wx.showToast({ title: '图片读取失败，请重新选择', icon: 'none' });
      return;
    }
    this.setData({ ocrSubmitting: true });
    load.showLoading('正在提交多列图片');
    try {
      const base64 = await this._ocrImageToBase64(imagePath);
      const res = await recognizeOrderAsync({
        ImageBase64: base64,
        Action: 'GeneralAccurateOCR',
        Version: '2018-11-19',
        depId: params.depId,
        disId: params.disId,
        depFatherId: params.depFatherId,
        userId: -1
      });
      const result = res && res.result;
      if (result && result.code === 0) {
        this._resetOcrState();
        wx.showToast({ title: '图片已加入识别队列', icon: 'success', duration: 1600 });
        wx.navigateBack({ delta: 1 });
      } else {
        throw new Error(result && (result.msg || result.message) || '图片上传失败');
      }
    } catch (error) {
      wx.showToast({ title: error.message || '多列图片识别失败', icon: 'none', duration: 3000 });
    } finally {
      load.hideLoading();
      this.setData({ ocrSubmitting: false });
    }
  },

  async onStartOCRFast(e) {
    const imageList = e.detail && e.detail.imageList || this.data.ocrImageList || [];
    if (!imageList.length) {
      wx.showToast({ title: '请先选择图片', icon: 'none' });
      return;
    }
    if (this.data.ocrSubmitting) return;
    const params = this._getOcrDepParams();
    if (!this._validateOcrParams(params)) return;
    const imagePath = this._getOcrImagePath(imageList);
    if (!imagePath) {
      wx.showToast({ title: '图片读取失败，请重新选择', icon: 'none' });
      return;
    }
    this.setData({ ocrSubmitting: true });
    load.showLoading('单列图片识别中');
    try {
      const base64 = await this._ocrImageToBase64(imagePath);
      const res = await recognizeOrderFast({
        ImageBase64: base64,
        depId: params.depId,
        disId: params.disId,
        depFatherId: params.depFatherId,
        userId: params.userId
      });
      const result = res && res.result;
      if (result && result.code === 0) {
        this._resetOcrState();
        if (result.taskId) {
          wx.redirectTo({ url: `../ocrOrder/ocrOrder?taskId=${result.taskId}` });
        } else {
          wx.showToast({ title: '图片识别完成', icon: 'success' });
          wx.navigateBack({ delta: 1 });
        }
      } else {
        throw new Error(result && (result.msg || result.message) || '快速识别失败');
      }
    } catch (error) {
      wx.showToast({ title: error.message || '快速识别失败', icon: 'none', duration: 3000 });
    } finally {
      load.hideLoading();
      this.setData({ ocrSubmitting: false });
    }
  },

  _ocrImageToBase64(filePath) {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath,
        encoding: 'base64',
        success: res => resolve(res.data),
        fail: reject
      });
    });
  }
});

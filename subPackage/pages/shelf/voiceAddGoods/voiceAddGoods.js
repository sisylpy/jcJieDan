import load from '../../../../lib/load';

import {
  pasteSearchGoodsForShelf,
  getBrandForPrompts
} from '../../../../lib/apiDistributer';

const plugin = requirePlugin('QCloudAIVoice');
const speechRecognizerManager = plugin.speechRecognizerManager();

// 从配置文件读取配置
const config = require('../../../../config');
const DEEPSEEK_API_KEY = config.deepSeek?.apiKey || '';
const DEEPSEEK_API_URL = config.deepSeek?.apiUrl || 'https://api.deepseek.com/v1/chat/completions';

// 从配置文件读取腾讯云配置
const TENCENT_CLOUD_SECRET_ID = config.tencentCloud?.secretId || '';
const TENCENT_CLOUD_SECRET_KEY = config.tencentCloud?.secretKey || '';
const TENCENT_CLOUD_APP_ID = config.tencentCloud?.appId || '1308821743';
const TENCENT_CLOUD_ENGINE_MODEL_TYPE = config.tencentCloud?.engineModelType || '16k_zh';
const TENCENT_CLOUD_VOICE_FORMAT = config.tencentCloud?.voiceFormat || 1;

const COMMON_UNIT_WORDS = ['瓶','桶','袋','斤','金','进','今','津','劲','盒','包','件','箱','克','毫升','升','千克','公斤','斤装','个'];

function normalizeJinUnit(text) {
  if (!text || typeof text !== 'string') return text;
  return text.replace(/[金進进今津劲]/g, '斤');
}

const DEEPSEEK_SYSTEM_PROMPT = `你是货架商品语音录入助手。用户的语音顺序通常为“商品名称、规格提示词（如规格斤/单位/箱）、规格重量（可省略）、品牌（可省略）”。他们有时会连续朗读成“千禾酱油桶2000毫升千禾”这样的写法，因此你需要根据位置判断：开头是商品名称，中间的单位（例如桶）表示规格提示词，接着是规格重量（例如2000毫升），末尾若存在品牌词（例如千禾）则视为品牌。请在整理文本时遵循以下要求：
1. 逐条语句独立输出，每行保持原有顺序。
2. 仅保留用户原本说出的信息，不要猜测或补充默认数量、单位、品牌，并且保持数字的原始格式，不要把“3000”改写为“三千”。
   - 如果原文没有数量，就不要加“1”或其他数字。
   - 如果原文只有“规格+单位”而没有数量，只保留“规格单位”提示词即可。
   - 如果用户只说了商品名称，也要单独成行，后面的字段留空。
3. 尽量纠正常见错别字和同音词（例如将“酱园”纠正为“酱油”），但不能新增原文没有的字段，也不能改变数字格式。
   - 常见的规格单位包括：${COMMON_UNIT_WORDS.join('、')} 等。如果听到拼音或同音词（如“平”“瓶”或“同”“桶”），请恢复成正确的单位字。
4. 品牌字段如果听到“没有”“无”等内容，可以省略；否则保留原文。
5. 输出格式示例：
   - 语音：“千禾酱油桶” → 输出：“千禾酱油:规格桶”
   - 语音：“千禾酱油桶 5000ml” → 输出：“千禾酱油:规格桶 5000ml”
   - 语音：“千禾酱油桶2000毫升千禾” → 输出：“千禾酱油:规格桶 2000毫升 品牌:千禾”
请严格按照用户原文保留或留空对应字段。`;

async function optimizeTextWithDeepSeek(text, temperature = 0.7, brandList = []) {
  try {
    const messages = [
      {
        role: 'system',
        content: DEEPSEEK_SYSTEM_PROMPT
      }
    ];

    if (Array.isArray(brandList) && brandList.length > 0) {
      const brandPrompt = `以下是当前配送商的常见品牌词列表：${brandList.join('、')}。
在识别品牌时，务必执行以下规则：
1. 将用户语音中的品牌词转换为拼音后，与列表中品牌的拼音比较，寻找读音或结构最接近的项。
2. 如果存在同音、近音或常见错别字（例如“翼克”“一克”“翼客”应识别为列表中的“宜客”），必须输出列表中的标准写法。
3. 当有多个候选时，选择距离最小（发音最接近或编辑距离最短）的品牌。
4. 只有在确认列表中没有合适的对应项时，才保留用户原始品牌词。`;
      console.log('[voiceAddGoods] DeepSeek brand prompt:', brandPrompt);
      messages.push({
        role: 'system',
        content: brandPrompt
      });
    }

    messages.push({ role: 'user', content: text });
    console.log('[voiceAddGoods] DeepSeek request messages:', messages);

    return new Promise((resolve, reject) => {
      wx.request({
        url: DEEPSEEK_API_URL,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${DEEPSEEK_API_KEY}`
        },
        data: {
          model: 'deepseek-chat',
          messages,
          temperature
        },
        success: (res) => {
          if (res.statusCode === 200 && res.data && res.data.choices && res.data.choices[0]) {
            resolve(res.data.choices[0].message.content);
          } else {
            reject(new Error('AI 响应格式不正确'));
          }
        },
        fail: (err) => {
          reject(new Error('AI 请求失败: ' + JSON.stringify(err)));
        }
      });
    });
  } catch (error) {
    console.error('DeepSeek 调用错误:', error);
    return text;
  }
}

function containsOriginalNumber(originalText, token) {
  if (!token) return false;
  if (originalText.includes(token)) return true;
  const map = { '零':0, '一':1, '二':2, '两':2, '三':3, '四':4, '五':5, '六':6, '七':7, '八':8, '九':9 };
  let numericString = '';
  for (const char of token) {
    if (/[0-9]/.test(char)) {
      numericString += char;
    } else if (map[char] !== undefined) {
      numericString += map[char];
    }
  }
  if (numericString.length > 0) {
    const normalized = originalText
      .replace(/[零一二两三四五六七八九十百千万半]+/g, (match) => {
        // 简单的中文数字转阿拉伯数字，用于匹配
        const unitMap = { '十': 10, '百': 100, '千': 1000, '万': 10000 };
        let total = 0;
        let current = 0;
        for (let i = 0; i < match.length; i++) {
          const char = match[i];
          if (map[char] !== undefined) {
            current = current * 10 + map[char];
          } else if (unitMap[char]) {
            if (current === 0) current = 1;
            total += current * unitMap[char];
            current = 0;
          }
        }
        total += current;
        if (match.includes('半')) {
          total += 0.5;
        }
        if (match === '十') total = 10;
        if (match === '半') total = 0.5;
        return total.toString();
      })
      .replace(/[^0-9\.]/g, '');
    if (normalized.includes(numericString)) {
      return true;
    }
  }
  return false;
}

function parseOptimizedLines(content, originalText = '') {
  if (!content) return [];

  const lines = content
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0);

  const result = [];
  const originalSource = originalText || '';

  lines.forEach(line => {
    console.log('[voiceAddGoods] 解析行原文:', line);
    // 将“品牌:”部分拆出来
    let brand = '';
    const brandMatch = line.match(/品牌[:：]\s*(.+)$/);
    if (brandMatch) {
      brand = brandMatch[1].trim();
      line = line.replace(/品牌[:：]\s*(.+)$/,'').trim();
      if (brand === '无' || brand === '没有' || brand === '空') {
        brand = '';
      }
    }

    // 先用冒号拆分商品名与后续字段
    const colonIdx = line.indexOf(':');
    let goodsName = '';
    let rest = '';
    if (colonIdx !== -1) {
      goodsName = line.slice(0, colonIdx).trim();
      rest = line.slice(colonIdx + 1).trim();
    } else {
      // 若没有冒号，则尝试以空格拆分，第一个词视作商品名
      const parts = line.split(/\s+/);
      goodsName = parts.shift();
      rest = parts.join(' ');
    }

    let standardName = '';
    let standardWeight = '';

    if (rest) {
      const tokens = rest.split(/[，,、;；\s]+/).filter(Boolean);
      console.log('[voiceAddGoods] rest tokens:', tokens);

      tokens.forEach((token, idx) => {
        const cleanToken = token.trim();
        if (!cleanToken) return;
        const normalizedToken = normalizeJinUnit(cleanToken);

        if (cleanToken.startsWith('规格')) {
          let candidate = cleanToken.replace(/^规格/, '').replace(/[0-9\.]/g, '').trim();
          if (!candidate && tokens[idx + 1]) {
            candidate = tokens[idx + 1].replace(/[0-9\.]/g, '').trim();
          }
          if (candidate) {
            standardName = candidate;
          }
          const weightCandidate = cleanToken.replace(/[\u4e00-\u9fa5]+/, '').trim();
          if (weightCandidate && !standardWeight) {
            standardWeight = weightCandidate;
          }
          return;
        }

        if (cleanToken === '单位') {
          if (tokens[idx + 1]) {
            const candidate = tokens[idx + 1].replace(/[0-9\.]/g, '').trim();
            if (candidate) {
              standardName = candidate;
            }
          }
          return;
        }

        const hasNumber = /[0-9零一二两三四五六七八九十百千万半]/.test(cleanToken);
        if (hasNumber && !standardWeight) {
          standardWeight = cleanToken;
          const unitMatch = cleanToken.match(/[\u4e00-\u9fa5]+$/);
          if (unitMatch && !standardName) {
            standardName = normalizeJinUnit(unitMatch[0]);
          }
          return;
        }

        if (!standardName && /^[\u4e00-\u9fa5]{1,4}$/.test(cleanToken)) {
          if ((normalizedToken === '斤' || normalizedToken === '件' || normalizedToken === '桶' || normalizedToken === '袋') && tokens[idx - 1]) {
            const prev = tokens[idx - 1].trim();
            if (/[0-9零一二两三四五六七八九十百千万半]/.test(prev)) {
              standardName = normalizedToken;
              standardWeight = `${prev}${normalizedToken}`;
              return;
            }
          }
          standardName = normalizedToken;
        }
      });

      if (standardName === '规格' || standardName === '单位') {
        standardName = '';
      }

      if (!standardWeight && standardName && tokens.length) {
        const prev = tokens[tokens.indexOf(standardName) - 1];
        if (prev && /[0-9零一二两三四五六七八九十百千万半]/.test(prev)) {
          standardWeight = `${prev.trim()}${standardName}`;
        }
      }

      if (standardWeight && standardName) {
        const normalizedStandardName = normalizeJinUnit(standardName);
        standardName = normalizedStandardName;
        standardWeight = normalizeJinUnit(standardWeight);
        const hasLatinUnit = /[a-zA-Z]/.test(standardWeight);
        const unitMatch = standardWeight.match(/[\u4e00-\u9fa5]+$/);
        const alreadyHasName = standardWeight.endsWith(standardName);
        const isCommonUnit = COMMON_UNIT_WORDS.includes(normalizedStandardName);
        if (!hasLatinUnit && !unitMatch && !alreadyHasName && !isCommonUnit) {
          standardWeight = `${standardWeight}${normalizedStandardName}`;
        }
      }
    }

    if (standardWeight) {
      standardWeight = normalizeJinUnit(standardWeight);
      const numericMatch = standardWeight.match(/[0-9零一二两三四五六七八九十百千万半]+/);
      if (numericMatch) {
        const token = numericMatch[0];
        if (!containsOriginalNumber(originalSource, token)) {
          console.log('[voiceAddGoods] 原文不包含数量标记，清空规格重量', token, originalSource);
          standardWeight = '';
        }
      }

      const packagingUnits = ['件', '箱'];
      if (packagingUnits.some(unit => standardWeight.includes(unit))) {
        console.log('[voiceAddGoods] 检测到包装单位数量，清空规格重量', standardWeight);
        standardWeight = '';
      }
    }

    result.push({
      nxDgGoodsName: goodsName,
      nxDgGoodsStandardname: normalizeJinUnit(standardName),
      nxDgGoodsStandardWeight: normalizeJinUnit(standardWeight),
      nxDgGoodsBrand: brand
    });
    console.log('[voiceAddGoods] 解析结果:', {
      nxDgGoodsName: goodsName,
      nxDgGoodsStandardname: standardName,
      nxDgGoodsStandardWeight: standardWeight,
      nxDgGoodsBrand: brand
    });
  });

  return result;
}

Page({
  data: {
    sentence: '',
    liveText: '',
    isRecording: false,
    recognitionStatus: '',
    duration: 0,
    timer: null,
    showDeepSeekLoading: false,
    goodsList: [],
    brandPrompts: [],
    saving: false,
    shelfId: null,
    shelfSort: 0,
    sort: 0,
    disId: null,
    navBarHeight: 0,
    windowHeight: 0,
    shelfName: '',
    savedItems: [],
  },

  onLoad(options) {
    const app = getApp();
    const globalData = app.globalData || {};

    const userInfo = wx.getStorageSync('userInfo');
    const disId = userInfo && userInfo.nxDistributerEntity
      ? userInfo.nxDistributerEntity.nxDistributerId
      : null;

    const navBarHeight = (globalData.navBarHeight || 0) * (globalData.rpxR || 1);
    const windowHeight = ((globalData.windowHeight || 0) - (globalData.navBarHeight || 0)) * (globalData.rpxR || 1);

    this.setData({
      disId,
      navBarHeight,
      windowHeight,
      shelfId: options && options.shelfId ? Number(options.shelfId) : null,
      shelfSort: options && options.shelfSort ? Number(options.shelfSort) : 0,
      sort: options && options.sort ? Number(options.sort) : 0,
      shelfName: options && options.name ? options.name : ''
    });

    this._initSpeechRecognizer();
    this._loadBrandPrompts();
  },

  onUnload() {
    if (this.data.timer) {
      clearInterval(this.data.timer);
    }
    if (this.data.isRecording) {
      speechRecognizerManager.stop();
    }
  },

  async _loadBrandPrompts() {
    load.showLoading('加载品牌数据');
    try {
      const res = await getBrandForPrompts();
      console.log('[voiceAddGoods] getBrandForPrompts raw:', res);
      if (res && res.result && res.result.code === 0) {
        const brands = Array.isArray(res.result.data) ? res.result.data : [];
        this.setData({ brandPrompts: brands });
        console.log('[voiceAddGoods] 品牌提示数据:', brands);
      } else {
        const msg = res && res.result && res.result.msg ? res.result.msg : '品牌数据加载失败';
        wx.showToast({
          title: msg,
          icon: 'none'
        });
      }
    } catch (error) {
      console.error('[voiceAddGoods] 获取品牌提示失败:', error);
      wx.showToast({
        title: '品牌数据请求异常',
        icon: 'none'
      });
    } finally {
      load.hideLoading();
    }
  },

  _initSpeechRecognizer() {
    speechRecognizerManager.OnRecognitionStart = () => {
      console.log('[voiceAddGoods] OnRecognitionStart');
      this.setData({
        recognitionStatus: '识别中...'
      });
    };

    speechRecognizerManager.OnSentenceBegin = (res) => {
      console.log('[voiceAddGoods] OnSentenceBegin', res);
    };

    speechRecognizerManager.OnRecognitionResultChange = (res) => {
      console.log('[voiceAddGoods] OnRecognitionResultChange', res);
      if (res && res.result && res.result.voice_text_str !== undefined) {
        const liveText = res.result.voice_text_str;
        this.setData({
          sentence: liveText,
          liveText
        });
      }
    };

    speechRecognizerManager.OnSentenceEnd = (res) => {
      console.log('[voiceAddGoods] OnSentenceEnd', res);
    };

    speechRecognizerManager.OnRecognitionComplete = (res) => {
      console.log('[voiceAddGoods] OnRecognitionComplete raw:', res);
      console.log('[voiceAddGoods] OnRecognitionComplete text:', this.data.sentence);
      this.setData({
        recognitionStatus: '识别完成',
        isRecording: false
      });
      if (this.data.timer) {
        clearInterval(this.data.timer);
        this.setData({ timer: null });
      }

      const recognizedText = this.data.sentence;
      console.log('[voiceAddGoods] Recognized text before parse:', recognizedText);
      if (!recognizedText || !recognizedText.trim()) {
        return;
      }
      this.setData({
        goodsList: []
      });
      wx.showToast({
        title: '识别完成，请点击“AI解析”',
        icon: 'none'
      });
    };

    speechRecognizerManager.OnError = (res) => {
      console.log('[voiceAddGoods] OnError', res);
      const errorCode = res && res.code;
      const errorMessage = res && res.message;
      
      // 错误码 4008: 客户端超过15秒未发送音频数据（超时错误）
      // 这种情况通常是用户说话有停顿，不应该完全停止录音
      if (errorCode === 4008) {
        console.log('[voiceAddGoods] 识别超时（15秒无音频数据），但录音可能仍在继续');
        // 不设置 isRecording: false，因为识别服务可能会自动重启
        // 只更新状态提示，不显示错误提示
        this.setData({
          recognitionStatus: '请继续说话...'
        });
        // 不显示错误提示，避免干扰用户
        return;
      }
      
      // 错误码 6000: 可能是网络错误或服务错误
      // 如果错误信息为空，可能是临时网络问题，不强制停止录音
      if (errorCode === 6000) {
        console.log('[voiceAddGoods] 识别服务错误（错误码6000），可能是网络问题');
        // 如果是临时错误，不立即停止录音，给用户提示即可
        // 确保 errorMessage 是字符串类型后再调用 trim
        const isEmptyMessage = !errorMessage || 
                               (typeof errorMessage === 'string' && errorMessage.trim() === '') ||
                               (typeof errorMessage !== 'string' && !errorMessage);
        if (isEmptyMessage) {
          // 错误信息为空，可能是临时网络问题，提示用户继续
          this.setData({
            recognitionStatus: '网络不稳定，请重试...'
          });
          // 不停止录音，允许用户继续
          return;
        }
      }
      
      // 其他错误：正常处理
      this.setData({
        recognitionStatus: '识别失败',
        isRecording: false
      });
      if (this.data.timer) {
        clearInterval(this.data.timer);
        this.setData({ timer: null });
      }
      
      // 根据错误码显示不同的错误提示
      // 确保 errorMessage 是字符串类型
      const safeErrorMessage = typeof errorMessage === 'string' ? errorMessage : '';
      let toastMessage = safeErrorMessage || '语音识别失败';
      if (errorCode === 6000 && !safeErrorMessage) {
        toastMessage = '网络不稳定，请检查网络后重试';
      }
      
      wx.showToast({
        title: toastMessage,
        icon: 'none',
        duration: 2000
      });
    };

    speechRecognizerManager.OnRecorderStop = () => {
      console.log('[voiceAddGoods] OnRecorderStop');
      // 只有在用户主动停止录音时才清空状态
      // 如果是超时导致的停止，不应该影响 isRecording 状态
      if (!this.data.isRecording) {
        // 如果已经设置为非录音状态，说明是主动停止
        this.setData({
          recognitionStatus: '',
          isRecording: false
        });
      } else {
        // 如果是被动停止（如超时），保持录音状态，等待自动重启
        this.setData({
          recognitionStatus: '等待中...'
        });
      }
      if (this.data.timer) {
        clearInterval(this.data.timer);
        this.setData({ timer: null });
      }
    };
  },

  toggleRecord() {
    if (this.data.isRecording) {
      this.stopRecord();
    } else {
      this.startRecord();
    }
  },

  startRecord() {
    if (!this.data.disId) {
      wx.showToast({
        title: '缺少配送商信息',
        icon: 'none'
      });
      return;
    }

    // 如果已经在录音中，先停止之前的录音
    if (this.data.isRecording) {
      console.log('[voiceAddGoods] 已在录音中，先停止之前的录音');
      this.stopRecord();
      // 等待一下再启动新的录音
      setTimeout(() => {
        this._doStartRecord();
      }, 300);
      return;
    }

    this._doStartRecord();
  },

  _doStartRecord() {
    const params = {
      secretkey: TENCENT_CLOUD_SECRET_KEY,
      secretid: TENCENT_CLOUD_SECRET_ID,
      appid: TENCENT_CLOUD_APP_ID,
      engine_model_type: TENCENT_CLOUD_ENGINE_MODEL_TYPE,
      voice_format: TENCENT_CLOUD_VOICE_FORMAT
    };

    this.setData({
      isRecording: true,
      recognitionStatus: '准备中...',
      duration: 0
    });

    const timer = setInterval(() => {
      this.setData({
        duration: this.data.duration + 1
      });
    }, 1000);

    this.setData({ timer });
    try {
      speechRecognizerManager.start(params);
    } catch (error) {
      console.log('startRecord error', error);
      this.setData({ isRecording: false });
      clearInterval(timer);
      wx.showToast({
        title: '启动录音失败',
        icon: 'none'
      });
    }
  },

  stopRecord() {
    if (this.data.timer) {
      clearInterval(this.data.timer);
      this.setData({ timer: null });
    }
    this.setData({ isRecording: false });
    try {
      speechRecognizerManager.stop();
    } catch (error) {
      console.log('stopRecord error', error);
    }
  },

  async aiRecognise() {
    const text = this.data.sentence || this.data.liveText;
    if (!text || !text.trim()) {
      wx.showToast({
        title: '请先录音或输入内容',
        icon: 'none'
      });
      return;
    }

    console.log('[voiceAddGoods] Manual parse trigger text:', text);
    await this._parseVoiceGoods(text);
  },

  async _parseVoiceGoods(text) {
    this.setData({ showDeepSeekLoading: true });

    try {
      console.log('[voiceAddGoods] _parseVoiceGoods input:', text);
      const optimizedText = await optimizeTextWithDeepSeek(text, 0.7, this.data.brandPrompts);
      console.log('[voiceAddGoods] Optimized text:', optimizedText);
      const goodsList = parseOptimizedLines(optimizedText, text)
        .filter(item => item.nxDgGoodsName && item.nxDgGoodsName.length > 0);
      console.log('[voiceAddGoods] Parsed goodsList:', goodsList);

      this.setData({
        goodsList,
        showDeepSeekLoading: false
      });

      if (goodsList.length === 0) {
        wx.showToast({
          title: '未识别到有效商品',
          icon: 'none'
        });
      } else {
        wx.showToast({
          title: '解析完成',
          icon: 'success'
        });
      }
    } catch (error) {
      console.error('解析语音失败', error);
      this.setData({ showDeepSeekLoading: false });
      wx.showToast({
        title: error && error.message ? error.message : '解析失败',
        icon: 'none'
      });
    }
  },

  updateGoodsField(e) {
    const { index, field } = e.currentTarget.dataset;
    const value = e.detail.value;
    const key = `goodsList[${index}].${field}`;
    this.setData({ [key]: value });
  },

  updateSavedField(e) {
    const { index, field } = e.currentTarget.dataset;
    const value = e.detail.value;
    const key = `savedItems[${index}].${field}`;
    this.setData({ [key]: value });
  },

  insertParsedItemBefore: function (e) {
    const index = Number(e.currentTarget.dataset.index);
    const list = [...this.data.goodsList];
    const template = {
      nxDgGoodsName: '',
      nxDgGoodsBrand: '',
      nxDgGoodsStandardname: '',
      nxDgGoodsStandardWeight: ''
    };
    list.splice(index, 0, template);
    this.setData({ goodsList: list });
  },

  removeParsedItem: function (e) {
    const index = Number(e.currentTarget.dataset.index);
    const list = [...this.data.goodsList];
    if (index < 0 || index >= list.length) {
      return;
    }
    list.splice(index, 1);
    this.setData({ goodsList: list });
  },

  onInput(e) {
    this.setData({
      sentence: e.detail.value
    });
  },

  clearSentence() {
    this.setData({
      sentence: '',
      liveText: '',
      goodsList: [],
      recognitionStatus: '',
      duration: 0,
      savedItems: [],
    });
  },

  async saveShelfGoods() {
    if (this.data.goodsList.length === 0) {
      wx.showToast({
        title: '没有可保存的商品',
        icon: 'none'
      });
      return;
    }

    if (!this.data.shelfId || !this.data.disId) {
      wx.showToast({
        title: '缺少货架或配送信息',
        icon: 'none'
      });
      return;
    }

    this.setData({ saving: true });
    load.showLoading('保存货架商品');

    try {
      const baseSort = Number(this.data.sort || 0);

      const goodsCount = this.data.goodsList.length;

      const items = this.data.goodsList.map((entity, index) => ({
        nxDgGoodsName: entity.nxDgGoodsName,
        nxDgGoodsBrand: entity.nxDgGoodsBrand,
        nxDgGoodsStandardname: entity.nxDgGoodsStandardname,
        nxDgGoodsStandardWeight: entity.nxDgGoodsStandardWeight,
        sort: baseSort + index + 1,
        shelfSort: this.data.shelfSort || 0
      }));
      console.log('[voiceAddGoods] Request payload:', {
        shelfId: this.data.shelfId,
        disId: this.data.disId,
        items
      });

      const addRes = await pasteSearchGoodsForShelf({
        shelfId: this.data.shelfId,
        disId: this.data.disId,
        items
      });
      console.log('[voiceAddGoods] Response:', addRes);
      if (!addRes || !addRes.result || addRes.result.code !== 0) {
        throw new Error(addRes && addRes.result ? addRes.result.msg : '上架失败');
      }

      const shelfItems = addRes.result.data || addRes.result.items || [];
      wx.showToast({
        title: addRes.result.msg || '保存成功',
        icon: 'success'
      });

      const pages = getCurrentPages();
      if (pages.length >= 2) {
        const prevPage = pages[pages.length - 2];
        if (prevPage && typeof prevPage.setData === 'function') {
          prevPage.setData({
            voiceShelfNewItems: shelfItems,
            voiceShelfAdded: true
          });
        }
      }

      this.setData({
        goodsList: [],
        sentence: '',
        liveText: '',
        sort: addRes.result.nextSort !== undefined ? addRes.result.nextSort : (baseSort + goodsCount),
        savedItems: shelfItems
      });
    } catch (error) {
      console.error('保存货架商品失败', error);
      wx.showToast({
        title: error && error.message ? error.message : '保存失败',
        icon: 'none'
      });
    } finally {
      load.hideLoading();
      this.setData({ saving: false });
    }
  },

  continueInput() {
    // 清空当前页面所有数据，但保留页面配置（shelfId、shelfSort、sort、disId等）
    // 停止录音（如果有）
    if (this.data.isRecording) {
      this.stopRecord();
    }
    
    this.setData({
      sentence: '',
      liveText: '',
      goodsList: [],
      savedItems: [],
      recognitionStatus: '',
      duration: 0,
      timer: null,
      isRecording: false,
      saving: false
    });
    
    wx.showToast({
      title: '已清空，可以继续录入',
      icon: 'success',
      duration: 1500
    });
  },

  goBack() {
    this.setData({ savedItems: [] });
    wx.navigateBack({ delta: 1 });
  }
});


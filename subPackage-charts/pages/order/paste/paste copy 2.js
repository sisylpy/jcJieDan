import load from '../../../../lib/load';
import {
  pasteSearchGoods,
  choiceGoodsForApply,
  updateOrder,
  deleteOrder,
  addRecord,
} from '../../../../lib/apiDepOrder';

import {
  disSaveStandard,
  queryDisGoodsByQuickSearchWithDepId,
  disDeleteStandard,
  getBrandForPrompts,
} from '../../../../lib/apiDistributer';

import {
  downDisGoods,
  disGetGoods,
} from '../../../../lib/apiibook';

const plugin = requirePlugin("QCloudAIVoice");
const speechRecognizerManager = plugin.speechRecognizerManager();

// 从配置文件读取 DeepSeek API 配置
const config = require('../../../../config');
const DEEPSEEK_API_KEY = config.deepSeek?.apiKey || '';
const DEEPSEEK_API_URL = config.deepSeek?.apiUrl || 'https://api.deepseek.com/v1/chat/completions';
const DEEPSEEK_MODEL = config.deepSeek?.model || 'deepseek-chat';

// 从配置文件读取腾讯云配置
const TENCENT_CLOUD_SECRET_ID = config.tencentCloud?.secretId || '';
const TENCENT_CLOUD_SECRET_KEY = config.tencentCloud?.secretKey || '';
const TENCENT_CLOUD_APP_ID = config.tencentCloud?.appId || '1308821743';
const TENCENT_CLOUD_ENGINE_MODEL_TYPE = config.tencentCloud?.engineModelType || '16k_zh';
const TENCENT_CLOUD_VOICE_FORMAT = config.tencentCloud?.voiceFormat || 1;



// 添加优化语音文本的函数
async function optimizeTextWithDeepSeek(text, temperature = 0.2, brandList = []) {
  try {
    console.log('开始调用 DeepSeek API，输入文本:', text, '温度:', temperature);
    
    return new Promise((resolve, reject) => {
      wx.request({
        url: DEEPSEEK_API_URL,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        data: {
          model: DEEPSEEK_MODEL,
          messages: (() => {
            const messages = [
            {
              role: "system",
                content: `你是一个专业的餐饮行业订单解析助手。请将用户输入的语音识别文本转换为标准化的订单 JSON 数据。

重要规则：
1. **输入来源**：内容来自腾讯语音识别，可能存在大量同音词错误，需要智能纠正为正确的商品名称。
2. **品牌识别优先级最高**：
   - 即使识别出的词在字面意思上是通顺的（如"冬菇"），如果它的发音与品牌库中的品牌（如"东古"）完全一致或极度相似，且上下文符合调料/商品场景，必须优先纠正为品牌名！
   - "一品鲜"、"酱油"、"陈醋"、"生抽"等词前面的通常是品牌名，需要特别注意识别。
3. **特殊商品名**：以下商品名称是完整的，不要拆分：
   - "去叶中葱"、"去叶大葱"、"去根胡萝卜"、"去皮土豆" 等
   - "西兰苔"、"板蓝根" 等
4. **语音识别错误纠正**：
   - "实质" → "10只"
   - "死机" → "4斤"
   - "无间" → "5斤"
   - "溜达" → "6大"
   - "9枝话梅" → "九制话梅"
   - "诸侯酱" → "柱侯酱"
   - "小米腊" → "小米辣"
   - "第儿" → "地儿"
5. **同音词归一**："1000元餐盒" → "1000圆餐盒"
6. **"各"字处理**："红黄彩椒各" 视为一个完整商品名

纠错示例（请严格参考）：
示例1：
输入："冬菇一品鲜"
输出：[{"name": "东古一品鲜", "qty": "1", "unit": "件", "remark": ""}]
(解释："冬菇"虽然是食材，但在此处是品牌"东古"的同音误识，必须纠正)

示例2：
输入："紫菱陈醋一件"
输出：[{"name": "紫林陈醋", "qty": "1", "unit": "件", "remark": ""}]
(解释："紫菱"是品牌"紫林"的同音误识，必须纠正)

示例3：
输入："安记茨粉"
输出：[{"name": "安琪茨粉", "qty": "1", "unit": "件", "remark": ""}]
(解释："安记"是品牌"安琪"的同音误识)

示例4：
输入："一克酱油"
输出：[{"name": "宜客酱油", "qty": "1", "unit": "件", "remark": ""}]
(解释："一克"是品牌"宜客"的同音误识)

示例4：
输入："酒庄蚝油"
输出：[{"name": "旧庄蚝油", "qty": "1", "unit": "件", "remark": ""}]
(解释："酒庄"是"旧庄"的同音误识)

输出要求：
- 必须输出一个标准的 JSON 数组，不要包含 Markdown 标记、代码块标记或其他文字说明
- 只输出纯 JSON 数组，格式如下：
[{"name": "商品名称", "qty": "数量", "unit": "单位", "remark": "备注"}]

字段说明：
- name: 商品名称（必填，字符串）
- qty: 数量（必填，字符串，如 "5"、"10"）
- unit: 单位（必填，字符串，如 "斤"、"个"、"包"、"根"、"棵"、"条"、"盒"、"捆"、"袋"、"瓶"、"罐"、"桶"、"箱"）
- remark: 备注（可选，字符串，如 "要新鲜的"、"小颗的"）

默认值：
- 如果数量后没有单位，默认使用 "斤"
- 如果没有备注，使用空字符串 ""

示例：
输入："西红柿5斤要新鲜的，土豆10袋"
输出：[{"name": "西红柿", "qty": "5", "unit": "斤", "remark": "要新鲜的"}, {"name": "土豆", "qty": "10", "unit": "袋", "remark": ""}]

输入："油菜小颗的两斤"
输出：[{"name": "油菜", "qty": "2", "unit": "斤", "remark": "小颗的"}]

输入："去叶中葱5斤"
输出：[{"name": "去叶中葱", "qty": "5", "unit": "斤", "remark": ""}]

输入："鸡蛋实质"
输出：[{"name": "鸡蛋", "qty": "10", "unit": "只", "remark": ""}]

请严格按照上述格式输出，只输出 JSON 数组，不要添加任何其他内容。`
              }
            ];

            // 如果有品牌列表，添加品牌识别提示
            if (Array.isArray(brandList) && brandList.length > 0) {
              // 高频品牌错误修正表（容易误识的品牌）
              const HIGH_PRIORITY_CORRECTIONS = [
                "东古(易误识为:冬菇、东顾、东谷)",
                "紫林(易误识为:紫菱、子林、紫灵)",
                "安琪(易误识为:安奇、按期、安记)",
                "宜客(易误识为:一克、翼克、翼客)",
                "李锦记(易误识为:李金记、李进记)",
                "海天(易误识为:海添、海田)",
                "千禾(易误识为:千和、前和)",
                "恒顺(易误识为:恒舜、横顺)"
              ];

              const brandPrompt = `以下是当前配送商的常见品牌词列表：${brandList.join('、')}。

在识别商品名称时，如果商品名称中包含品牌词，请遵循以下规则（优先级最高）：
1. **品牌识别优先级最高**：即使识别出的词在字面意思上是通顺的（如"冬菇"），如果它的发音与品牌库中的品牌（如"东古"）完全一致或极度相似，且上下文符合调料/商品场景，必须优先纠正为品牌名！
2. 将用户语音中的品牌词转换为拼音后，与列表中品牌的拼音比较，寻找读音或结构最接近的项。
3. 如果存在同音、近音或常见错别字，必须输出列表中的标准写法。
4. 当有多个候选时，选择距离最小（发音最接近或编辑距离最短）的品牌。
5. 只有在确认列表中没有合适的对应项时，才保留用户原始品牌词。
6. 品牌词应该包含在商品名称（name字段）中，而不是单独作为备注。

常见语音识别错误修正表（请严格参考）：
${HIGH_PRIORITY_CORRECTIONS.join('\n')}

特别注意：
- "一品鲜"、"酱油"、"陈醋"、"生抽"、"老抽"等词前面的通常是品牌名，需要特别注意识别。
- 即使"冬菇"、"紫菱"等词在字面意思上通顺，但在调料/商品场景下，如果发音与品牌列表中的品牌相似，必须优先纠正为品牌名。`;
              console.log('[paste] DeepSeek brand prompt:', brandPrompt);
              messages.push({
                role: 'system',
                content: brandPrompt
              });
            }

            messages.push({
              role: "user",
              content: text
            });

            return messages;
          })(),
          temperature: temperature
        },
        success: (res) => {
          console.log('API 响应成功:', res);
          // 检查 HTTP 状态码
          if (res.statusCode !== 200) {
            console.error('API 返回非 200 状态码:', res.statusCode, res.data);
            reject(new Error(`API 请求失败，状态码: ${res.statusCode}`));
            return;
          }
          // 检查响应数据结构
          if (!res.data || !res.data.choices || !res.data.choices[0]) {
            console.error('API 响应格式不正确:', res.data);
            reject(new Error('API 响应格式不正确'));
            return;
          }
          // 检查 API 是否返回错误信息
          if (res.data.error) {
            console.error('API 返回错误:', res.data.error);
            reject(new Error(res.data.error.message || 'API 返回错误'));
            return;
          }
            const optimizedText = res.data.choices[0].message.content;
            console.log('优化后的文本:', optimizedText);
            resolve(optimizedText);
        },
        fail: (err) => {
          console.error('API 请求失败:', err);
          reject(new Error('API 请求失败: ' + JSON.stringify(err)));
        }
      });
    });
  } catch (error) {
    console.error('DeepSeek API 调用错误:', error);
    console.error('错误详情:', {
      message: error.message,
      stack: error.stack,
      response: error.response
    });
    return text; // 如果 API 调用失败，返回原始文本
  }
}


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
      // 立即同步到缓存
      this._saveToStorage(orderArr);

    }

    if (this.data.findGoods) {
      this._choiceGoods();
    }

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
    
    var pasteDepList = wx.getStorageSync("pasteDepList");
    
    if (pasteDepList) {
      console.log("pasteDepList 长度:", pasteDepList.length);
      this.setData({
        pasteDepList: pasteDepList,
      })

      for (var i = 0; i < pasteDepList.length; i++) {
        var pDepId = pasteDepList[i].depId;
        console.log(`pasteDepList[${i}] depId:`, pDepId, "订单数量:", pasteDepList[i].arr ? pasteDepList[i].arr.length : 0);
        if (pDepId == this.data.depId) {
       
          // 从缓存恢复订单数据
          let orders = pasteDepList[i].arr || [];
          // 确保每个订单都有原始商品名称字段（兼容旧数据，只在不存在时设置一次）
          let missingOriginalCount = 0;
          let mismatchCount = 0;
          orders = orders.map((order, orderIdx) => {
            if (order && !order.nxDoGoodsNameOriginal) {
              // 只在旧数据缺少原始名称时设置一次，之后不再修改
              const originalName = order.nxDoGoodsName || '';
              missingOriginalCount++;
              // 只在开发环境或有问题时输出详细日志
              if (missingOriginalCount <= 3) {
                console.log(`[从缓存恢复] 订单 ${orderIdx} 缺少原始名称（旧数据兼容），设置一次:`, {
                  index: orderIdx,
                  currentName: order.nxDoGoodsName,
                  originalName: originalName,
                  orderId: order.nxDepartmentOrdersId
                });
              }
              return {
                ...order,
                nxDoGoodsNameOriginal: originalName // 如果没有原始名称，使用当前名称（仅兼容旧数据）
              };
            } else if (order) {
              // 检查原始名称是否匹配，只在有问题时输出日志
              if (order.nxDoGoodsName !== order.nxDoGoodsNameOriginal) {
                mismatchCount++;
                if (mismatchCount <= 3) {
                  console.warn(`[从缓存恢复] 订单 ${orderIdx} 原始名称不匹配:`, {
                    index: orderIdx,
                    currentName: order.nxDoGoodsName,
                    originalName: order.nxDoGoodsNameOriginal,
                    orderId: order.nxDepartmentOrdersId
                  });
                }
              }
            }
            return order;
          });
          
          // 批量输出统计信息，而不是逐个输出
          if (missingOriginalCount > 0 || mismatchCount > 0) {
            console.log(`[从缓存恢复] 订单统计: 总数=${orders.length}, 缺少原始名称=${missingOriginalCount}, 名称不匹配=${mismatchCount}`);
          }
          
          // 如果有缓存数据，直接使用缓存中的 saveCount（如果有的话）
          // 如果缓存中没有 saveCount，说明是旧数据或新解析的订单，设为 null
          const saveCount = pasteDepList[i].saveCount !== undefined ? pasteDepList[i].saveCount : null;
          
          // 恢复搜索相关数据
          const searchData = pasteDepList[i];
          // 检查是否有缓存数据（订单数组不为空）
          const hasCacheData = orders && orders.length > 0;
          this.setData({
            pasteDepId: pDepId,
            pasteDepIndex: i,
            pasteDep: pasteDepList[i],
            orderArr: orders,
            saveCount: saveCount,
            // 恢复搜索相关数据
            strArr: searchData.strArr || [],
            nxArr: searchData.nxArr || [],
            orderArrIndex: searchData.orderArrIndex !== undefined ? searchData.orderArrIndex : -1,
            searchStr: searchData.searchStr || "",
            hasCache: hasCacheData // 设置是否有缓存
          })
          // 更新未保存订单状态（使用统一函数）
          this._updateHasUnsavedOrders(orders);
          console.log("已设置 orderArr，长度:", pasteDepList[i].arr ? pasteDepList[i].arr.length : 0);
        }
      }
      
      // 如果没有找到匹配的 depId，或者找到了但没有订单数据，设置 hasCache 为 false
      if (!this.data.hasCache) {
        // 检查是否确实没有缓存数据
        let foundCache = false;
        for (var j = 0; j < pasteDepList.length; j++) {
          if (pasteDepList[j].depId == this.data.depId && pasteDepList[j].arr && pasteDepList[j].arr.length > 0) {
            foundCache = true;
            break;
          }
        }
        if (!foundCache) {
          this.setData({
            hasCache: false
          });
        }
      }
    } else {
      console.log("缓存中没有 pasteDepList");
      this.setData({
        saveCount: null,
        pasteDepList: null,
        pasteDepId: null,
        pasteDep: null,
        pasteDepIndex: -1,
        hasCache: false, // 没有缓存数据
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
          const optimizedText = await optimizeTextWithDeepSeek(recognizedText, 0.2, this.data.brandPrompts);
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
      orderArr: [],
      orderArrFixed: [],
      // 重置 AI 识别相关状态
      aiRetryCount: 0,
      hasAiRecognized: false,
      showDeepSeekLoading: false,
      originSentence: "",
      inputContent: "",
      hasUnsavedOrders: false, // 清空订单后，没有未保存的订单
    })
  },

 
  onInput(e) {
    const text = e.detail.value;
    // 同时更新 sentence 和 inputContent，保持同步
    // 这样无论哪个函数读取都能获取到最新的内容
    this.setData({
      sentence: text,
     inputContent: text.trim() !== '' ? text : null,
    });
  },
  

  againPaste() {
    // 使用原始语音识别内容，而不是 AI 优化后的内容
    const originalText = this.data.originSentence || this.data.sentence || this.data.inputContent;
    
    // 删除当前 depId 对应的缓存
    try {
    var depArr = wx.getStorageSync('pasteDepList');
    if (depArr && depArr.length > 0) {
      var arr = depArr.filter(item => item.depId !== this.data.depId);
      if (arr.length == 0) {
        // 如果过滤后没有数据了，删除整个缓存
        wx.removeStorageSync('pasteDepList');
      } else {
        // 保存更新后的缓存
        wx.setStorageSync('pasteDepList', arr);
      }
      }
    } catch (error) {
      console.error('[清空订单] 缓存操作失败:', error);
      // 即使缓存操作失败，也继续执行清空操作
    }
    
    // 重置相关状态
    this.setData({
      orderArr: [],
      sentence: originalText,
      inputContent: originalText, // 同时更新 inputContent，保持同步
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



  
  formatContent: function () {
    var content = this.data.inputContent;
    console.log('[formatContent] 开始处理内容:', content);
    
    if (!content || content.trim() === '') {
      console.log('[formatContent] 内容为空，跳过处理');
      return;
    }

    // 清空订单数组
    this.orderArray = [];
    
    // 优先尝试解析 JSON（AI 返回的格式）
    try {
      // 尝试提取 JSON（可能包含 markdown 代码块标记）
      let jsonStr = content.trim();
      
      // 移除可能的 markdown 代码块标记
      jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
      jsonStr = jsonStr.trim();
      
      // 尝试解析 JSON
      const ordersJson = JSON.parse(jsonStr);
      
      if (Array.isArray(ordersJson) && ordersJson.length > 0) {
        console.log('[formatContent] JSON 解析成功，订单数量:', ordersJson.length);
        
        // 转换为系统需要的格式
        const formattedOrders = ordersJson.map(item => {
          const originalName = item.name || '';
          return {
            nxDoGoodsName: originalName,
            nxDoGoodsNameOriginal: originalName, // 保存原始商品名称
          nxDoQuantity: item.qty || '',
          nxDoStandard: item.unit || '斤', // 默认单位
          nxDoRemark: item.remark || '',
          nxDoAddRemark: !!(item.remark && item.remark.trim()),
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
          };
        });
        
        // 过滤掉无效订单（商品名为空）
        const validOrders = formattedOrders.filter(order => 
          order.nxDoGoodsName && order.nxDoGoodsName.trim()
        );
        
        console.log('[formatContent] 有效订单数量:', validOrders.length);
        
        // 检查是否有未保存的订单（status == -2）
        const hasUnsavedOrders = validOrders.some(order => order.nxDoStatus === -2);
        
        // 更新订单数组并立即同步到缓存
        this.setData({ 
          orderArr: validOrders,
          saveCount: null // 新解析的订单都是未保存的草稿，所以 saveCount 为 null
        });
        // 更新未保存订单状态
        this._updateHasUnsavedOrders(validOrders);
        this._saveToStorage(validOrders);
        
        return { orders: validOrders, formatted: '' };
      } else {
        console.log('[formatContent] JSON 解析结果不是有效数组，使用正则解析作为兜底');
        throw new Error('JSON 不是有效数组');
      }
    } catch (jsonError) {
      console.log('[formatContent] JSON 解析失败，使用正则解析作为兜底:', jsonError.message);
      
      // JSON 解析失败，使用原来的正则解析作为兜底
    content = content
      .replace(/(\d)\s+/g, '$1') // 处理数字后的空格
      .replace(/[^\S\r\n]+/g, ' '); // 只替换水平空白，保留换行符

    const formatted = this._formatOrderContent(content);

    this.setData({
      formattedContent: formatted
    });

      return formatted;
    }
  },


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
        nxDoGoodsNameOriginal: name, // 保存原始商品名称
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
        nxDoGoodsNameOriginal: namePart, // 保存原始商品名称
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
                          nxDoGoodsNameOriginal: goodsName, // 保存原始商品名称
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
                    nxDoGoodsNameOriginal: subGoodsName, // 保存原始商品名称
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
                  if (!subParsed.nxDoGoodsNameOriginal) {
                    subParsed.nxDoGoodsNameOriginal = subParsed.nxDoGoodsName || '';
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
                nxDoGoodsNameOriginal: goodsName, // 保存原始商品名称
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
            if (!parsed.nxDoGoodsNameOriginal) {
              parsed.nxDoGoodsNameOriginal = parsed.nxDoGoodsName || '';
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
                nxDoGoodsNameOriginal: goodsName, // 保存原始商品名称
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
                    nxDoGoodsNameOriginal: goodsName, // 保存原始商品名称
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
                    nxDoGoodsNameOriginal: goodsName, // 保存原始商品名称
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
                      nxDoGoodsNameOriginal: goodsName, // 保存原始商品名称
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
                    nxDoGoodsNameOriginal: goodsName, // 保存原始商品名称
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
                        nxDoGoodsNameOriginal: combinedGoodsName, // 保存原始商品名称
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
                      nxDoGoodsNameOriginal: combinedGoodsName, // 保存原始商品名称
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
                nxDoGoodsNameOriginal: goodsName, // 保存原始商品名称
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
            if (!parsed.nxDoGoodsNameOriginal) {
              parsed.nxDoGoodsNameOriginal = parsed.nxDoGoodsName || '';
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
                nxDoGoodsNameOriginal: goodsName, // 保存原始商品名称
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
                    nxDoGoodsNameOriginal: goodsName, // 保存原始商品名称
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
                    nxDoGoodsNameOriginal: goodsName, // 保存原始商品名称
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
          rawText: line,
          nxDoOrderUserId: this.data.userId,
          nxDoIsAgent: -1,
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
            const originalName = i.nxDoGoodsNameOriginal || i.nxDoGoodsName;
            orders.push({
              ...i,
              nxDoGoodsNameOriginal: originalName, // 使用解析时设置的原始名称，不修改
              nxDoAddRemark: !!i.nxDoRemark,
              nxDoStatus: -2,
              nxDoDepartmentId: this.data.depId,
              nxDoDepartmentFatherId: this.data.depFatherId,
              nxDoDisGoodsId: null,
              nxDoStandardWarn: 0,
              goodsNameWarn: 0,
              nxDoDistributerId: this.data.disId,
              nxDoPurchaseUserId: -1,
              rawText: line,
              nxDoOrderUserId: this.data.userId,
              nxDoIsAgent: -1,
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
            nxDoGoodsNameOriginal: goodsName, // 保存原始商品名称
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
          });
        }
      });
    });
  
    // ============ F. 初次写入 ============
    this.setData({ orderArr: orders });
    // 更新未保存订单状态
    this._updateHasUnsavedOrders(orders);
    // 立即同步到缓存
    this._saveToStorage(orders);
  
    // ============ F2. 异常重解析（已移除 rawText 依赖）============
    // 注意：由于已移除 rawText 字段，异常重解析功能已禁用
    // 如果订单验证失败，将保持原样（不会重新解析）
    // orders.forEach((order, idx) => {
    //   const validName     = /[\u4e00-\u9fa5]/.test(order.nxDoGoodsName);
    //   const validQty      = Number(order.nxDoQuantity) > 0;
    //   const validStandard = /[\u4e00-\u9fa5]/.test(order.nxDoStandard);
    //   if (!validName || !validQty || !validStandard) {
    //     // 由于已移除 rawText，无法重新解析
    //     console.warn(`[订单验证失败] 订单 ${idx} 验证失败，但无法重新解析（rawText 已移除）`);
    //   }
    // });
  
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
    // 立即同步到缓存
    this._saveToStorage(orders);
  
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
    var canSave = this._checkOrderContent();
    if (canSave) {
      load.showLoading("识别商品中");
      pasteSearchGoods(this.data.orderArr).then(res => {
        if (res.result.code == 0) {
          console.log(res.result.data);
          var tempArr = res.result.data;
          
          // 保存原有的订单数据，用于保留 nxDoGoodsNameOriginal
          const originalOrderArr = this.data.orderArr || [];
          
          this.setData({
            // 不清空搜索结果，保存后仍然显示
            // strArr: [],
            saveCount: null,
          })
          var listArr = [];
          if (tempArr.length > 0) {
            var haveId = 0;
            for (var i = 0; i < tempArr.length; i++) {
              var id = tempArr[i].nxDoStatus;
              if (id !== -2) {
                haveId = Number(haveId) + Number(1);
              }
              var item = tempArr[i];
              item.nxDoStandardWarn = 0;
              
              // 保留原有的 nxDoGoodsNameOriginal（不修改，只保留）
              // nxDoGoodsNameOriginal 是解析订单后的用户录入的商品名称，不应该再改变
              const originalOrder = originalOrderArr[i];
              if (originalOrder && originalOrder.nxDoGoodsNameOriginal) {
                const preservedOriginalName = originalOrder.nxDoGoodsNameOriginal;
                console.log(`[pasteSearchGoods] 订单 ${i} 保留原始名称:`, {
                  index: i,
                  apiReturnedName: item.nxDoGoodsName,
                  preservedOriginalName: preservedOriginalName,
                  apiReturnedOriginalName: item.nxDoGoodsNameOriginal,
                  orderId: item.nxDepartmentOrdersId,
                  note: '保留原有原始名称，不修改'
                });
                item.nxDoGoodsNameOriginal = preservedOriginalName;
              } else if (originalOrder) {
                // 如果原有订单没有原始名称，使用当前名称作为后备（这种情况应该很少）
                const fallbackOriginalName = originalOrder.nxDoGoodsName || item.nxDoGoodsName || '';
                console.warn(`[pasteSearchGoods] 订单 ${i} 原有订单缺少原始名称，使用后备:`, {
                  index: i,
                  apiReturnedName: item.nxDoGoodsName,
                  fallbackOriginalName: fallbackOriginalName,
                  orderId: item.nxDepartmentOrdersId,
                  note: '原有订单缺少原始名称，使用后备值'
                });
                item.nxDoGoodsNameOriginal = fallbackOriginalName;
              } else {
                // 如果找不到原有订单，使用接口返回的原始名称或当前名称
                const fallbackOriginalName = item.nxDoGoodsNameOriginal || item.nxDoGoodsName || '';
                console.warn(`[pasteSearchGoods] 订单 ${i} 找不到原有订单，使用接口返回的值:`, {
                  index: i,
                  apiReturnedName: item.nxDoGoodsName,
                  fallbackOriginalName: fallbackOriginalName,
                  orderId: item.nxDepartmentOrdersId,
                  note: '找不到原有订单，使用接口返回的值'
                });
                item.nxDoGoodsNameOriginal = fallbackOriginalName;
              }
              
              listArr.push(item);
            }
            this.setData({
              todayCount: this.data.orderArr.length,
              saveCount: haveId,
              orderArr: listArr,
            })
            // 更新未保存订单状态
            this._updateHasUnsavedOrders(listArr);
          }
          var data = {
            depId: this.data.depId,
            depFatherId: this.data.depFatherId,
            depName: this.data.depName,
            arr: this.data.orderArr,
            saveCount: this.data.saveCount,
            // 保存搜索相关数据
            strArr: this.data.strArr || [],
            nxArr: this.data.nxArr || [],
            orderArrIndex: this.data.orderArrIndex !== undefined ? this.data.orderArrIndex : -1,
            searchStr: this.data.searchStr || ""
          }
          var pasteDepArr = this.data.pasteDepList;
          if (pasteDepArr !== null) {
            pasteDepArr.push(data);
            try {
            wx.setStorageSync("pasteDepList", pasteDepArr);
            } catch (error) {
              console.error('[保存订单] 缓存同步失败:', error);
              // 如果存储失败，仍然更新内存中的数据，只是不持久化
              if (error.message && error.message.includes('exceed storage item max length')) {
                wx.showToast({
                  title: '数据过大，缓存保存失败',
                  icon: 'none',
                  duration: 2000
                });
              }
            }

            this.setData({
              pasteDepList: pasteDepArr,
              pasteDepId: this.data.depId,
              pasteDepIndex: pasteDepArr.length - 1,
              pasteDep: data,
              orderArr: this.data.orderArr,
              saveCount: this.data.saveCount,
            })
          } else {
            var temp = [];
            temp.push(data);
            try {
            wx.setStorageSync("pasteDepList", temp);
            } catch (error) {
              console.error('[保存订单] 缓存同步失败:', error);
              // 如果存储失败，仍然更新内存中的数据，只是不持久化
              if (error.message && error.message.includes('exceed storage item max length')) {
                wx.showToast({
                  title: '数据过大，缓存保存失败',
                  icon: 'none',
                  duration: 2000
                });
              }
            }
            this.setData({
              pasteDepList: temp,
              pasteDepId: data.depId,
              pasteDepIndex: 0,
              pasteDep: data,
              orderArr: data.arr,
              saveCount: data.saveCount,
            })
          }
        }
        load.hideLoading();
        wx.showToast({
          title: res.msg,
          icon: 'none'
        })
      }).catch(error => {
        console.error('[保存订单] 处理失败:', error);
        load.hideLoading();
        wx.showToast({
          title: '保存失败，请重试',
          icon: 'none'
        });
      })
    }
  },


  _checkOrderContent() {
    var arr = this.data.orderArr;
    var canSave = true;
    var that = this;
    for (var i = 0; i < arr.length; i++) {
      var order = arr[i];
      var name = order.nxDoGoodsName;
      var standard = order.nxDoStandard;
      var quantity = order.nxDoQuantity;
      var standarWarn = order.nxDoStandardWarn;
      
      if (standard.length > 1 && standarWarn == 0) {
        canSave = false;
        wx.showModal({
          title: '检查 "单位"是否正确',
          content: standard,
          showCancel: true,
          cancelText: "确定正确",
          cancelColor: 'black',
          confirmText: "修改单位",
          confirmColor: '#147062',
          complete: function (res) {
            if (res.cancel) {
              var data = "orderArr[" + i + "].nxDoStandardWarn";
              that.setData({
                [data]: 1
              })
            }
            if (res.confirm) {
              that.setData({
                editApply: true,
                applyItem: order,
                showOrder: true,
                applyStandardName: order.nxDoStandard,
                itemDis: order.nxDistributerGoodsEntity,
                applyNumber: order.nxDoQuantity,
                applyRemark: order.nxDoRemark,
              })
            }
          }
        })
        break;
      } else {
        if (name.length > 0 && standard.length > 0 && quantity.length > 0 && Number(quantity) > 0) {
          if (standarWarn > 0) {
            canSave = true;
          }
        } else {
          wx.showModal({
            title: '订单是否缺少内容?',
            content: name + " " + quantity + " " + standard,
            showCancel: false,
            confirmText: "知道了",
          })
          canSave = false;
          break;
        }
      }
    }
    return canSave;
  },


  editOrderName(e) {
    var index = e.currentTarget.dataset.index;
    console.log("========== editOrderName 开始 ==========");
    console.log("订单索引 index:", index);
    console.log("输入值 e.detail.value:", e.detail.value);
    console.log("当前 orderArrIndex:", this.data.orderArrIndex);
    console.log("当前 strArr:", this.data.strArr);
    console.log("当前 strArr.length:", this.data.strArr ? this.data.strArr.length : 'undefined');
    console.log("当前 count:", this.data.count);
    console.log("当前 windowWidth:", this.data.windowWidth);
    console.log("搜索结果列表宽度 (windowWidth - 40):", this.data.windowWidth - 40);
    console.log("商品名称输入框宽度 ((windowWidth - 180) / 2):", (this.data.windowWidth - 180) / 2);
    // 计算下拉列表定位
    // 序号列宽度约60rpx，padding 20rpx，输入框左侧位置约80rpx
    // 下拉列表要从屏幕左侧20rpx开始，所以 left = 20 - 80 = -60rpx
    var inputLeftPosition = 60 + 20; // 序号列 + padding
    var dropdownLeftOffset = 20 - inputLeftPosition; // 屏幕左侧20rpx - 输入框左侧位置
    console.log("输入框左侧位置:", inputLeftPosition);
    console.log("下拉列表 left 偏移:", dropdownLeftOffset);
    console.log("下拉列表应该从屏幕左侧开始，距离左侧20rpx");
  
    this.setData({
      orderArrIndex: index,
      goodsName: e.detail.value,
    })
    
    console.log("设置后 orderArrIndex:", this.data.orderArrIndex);
    
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
    console.log("========== editOrderName 结束 ==========\n");
  },


  _checkOrderItemContent(order, i) {
    console.log("========== _checkOrderItemContent 开始 ==========");
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
    var canSave = true;
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

        // complete: (res) => {
        //   if (res.confirm) {
        //     var data = "orderArr[" + i + "].nxDoStandardWarn";
        //     this.setData({
        //       [data]: 1
        //     })
        //   }
        // }
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
      nxDoGoodsNameOriginal: order.nxDoGoodsNameOriginal
    });
    
    var canSave = this._checkOrderItemContent(order, index);
    console.log("检查结果 canSave:", canSave);
    
    if (canSave) {
      // 读取原始商品名称（不修改，只读取）
      // nxDoGoodsNameOriginal 是解析订单后的用户录入的商品名称，不应该再改变
      const correctOriginalName = order.nxDoGoodsNameOriginal || order.nxDoGoodsName || '';
      const currentName = order.nxDoGoodsName || '';
      
      console.log(`[_choiceGoods] 订单 ${index} 原始名称检查（只读，不修改）:`, {
        index: index,
        currentName: currentName,
        originalName: order.nxDoGoodsNameOriginal,
        willUseOriginalName: correctOriginalName,
        orderId: order.nxDepartmentOrdersId,
        hasOriginal: !!order.nxDoGoodsNameOriginal && order.nxDoGoodsNameOriginal.trim() !== ''
      });
      
      // 如果原始名称不存在，记录警告但不修改（应该只在创建订单时设置）
      if (!order.nxDoGoodsNameOriginal || order.nxDoGoodsNameOriginal.trim() === '') {
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
          // nxDoGoodsNameOriginal 是解析订单后的用户录入的商品名称，不应该再改变
          const currentOrderBeforeUpdate = this.data.orderArr[index];
          const preservedOriginalName = currentOrderBeforeUpdate?.nxDoGoodsNameOriginal || correctOriginalName || '';
          
          console.log(`[choiceGoodsForApply返回] 订单 ${index} 保留原始名称（不修改）:`, {
            index: index,
            beforeUpdateOriginalName: currentOrderBeforeUpdate?.nxDoGoodsNameOriginal,
            savedOriginalName: correctOriginalName,
            apiReturnedOriginalName: res.result.data.nxDoGoodsNameOriginal,
            preservedOriginalName: preservedOriginalName,
            apiReturnedName: res.result.data.nxDoGoodsName,
            orderId: res.result.data.nxDepartmentOrdersId,
            note: '保留原有原始名称，不修改'
          });
          
          const updatedOrder = {
            ...res.result.data,
            // 保留原有的 nxDoGoodsNameOriginal，不修改
            nxDoGoodsNameOriginal: preservedOriginalName
          };
          
          var data = "orderArr[" + index + "]";
          console.log(`[choiceGoodsForApply返回] 订单 ${index} 更新后的订单对象:`, {
            index: index,
            nxDoGoodsName: updatedOrder.nxDoGoodsName,
            nxDoGoodsNameOriginal: updatedOrder.nxDoGoodsNameOriginal,
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



  addDisAlias(e) {
    console.log(e);
    var standard = this.data.orderArr[e.currentTarget.dataset.index].nxDoStandard;
    var name = this.data.orderArr[e.currentTarget.dataset.index].nxDoGoodsName;
    this.setData({
      orderArrIndex: e.currentTarget.dataset.index,
    })
   
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
    // 立即同步到缓存
    this._saveToStorage(newArr1);
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
            // 搜索后立即保存到缓存
            this._saveToStorage();
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

    var dg = {
      id: this.data.applyItem.nxDepartmentOrdersId,
      weight: e.detail.applyNumber,
      standard: e.detail.applyStandardName,
      remark: e.detail.applyRemark,
    };
    updateOrder(dg).then(res => {
      load.showLoading("修改订单")
      if (res.result.code == 0) {
        load.hideLoading();
        var goodsName = this.data.orderArr[this.data.orderArrIndex].nxDoGoodsName;
        
        // 保留原有的 nxDoGoodsNameOriginal（不修改，只保留）
        // nxDoGoodsNameOriginal 是解析订单后的用户录入的商品名称，不应该再改变
        const currentOrder = this.data.orderArr[this.data.orderArrIndex];
        const preservedOriginalName = currentOrder?.nxDoGoodsNameOriginal || '';
        
        console.log(`[updateOrder返回] 订单 ${this.data.orderArrIndex} 保留原始名称（不修改）:`, {
          index: this.data.orderArrIndex,
          currentName: goodsName,
          beforeUpdateOriginalName: currentOrder?.nxDoGoodsNameOriginal,
          apiReturnedOriginalName: res.result.data.nxDoGoodsNameOriginal,
          preservedOriginalName: preservedOriginalName,
          apiReturnedName: res.result.data.nxDoGoodsName,
          orderId: res.result.data.nxDepartmentOrdersId,
          note: '保留原有原始名称，不修改'
        });
        
        const updatedOrder = {
          ...res.result.data,
          nxDoGoodsName: goodsName, // 保持当前的商品名称
          // 保留原有的 nxDoGoodsNameOriginal，不修改
          nxDoGoodsNameOriginal: preservedOriginalName
        };
        
        console.log(`[updateOrder返回] 订单 ${this.data.orderArrIndex} 更新后的订单对象:`, {
          index: this.data.orderArrIndex,
          nxDoGoodsName: updatedOrder.nxDoGoodsName,
          nxDoGoodsNameOriginal: updatedOrder.nxDoGoodsNameOriginal,
          orderId: updatedOrder.nxDepartmentOrdersId
        });
        
        var data = "orderArr[" + this.data.orderArrIndex + "]";
        this.setData({
          [data]: updatedOrder,
        })
        this._updateStorage(updatedOrder);
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
        '&gbDepFatherId=-1&resFatherId=-1&depSettleType=' + this.data.depInfo.nxDepartmentSettleType +
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

  /**
   * 统一的缓存同步函数 - 立即将订单数组同步到 Storage
   * 防止小程序异常退出时数据丢失
   * @param {Array} orders - 订单数组，如果不传则使用 this.data.orderArr
   */
  _saveToStorage(orders) {
    const orderArr = orders || this.data.orderArr;
    
    // 如果没有订单数据，跳过
    if (!orderArr || orderArr.length === 0) {
      console.log('[saveToStorage] 订单数组为空，跳过缓存同步');
      return;
    }
    
    // 如果没有 pasteDepList，初始化
    if (!this.data.pasteDepList || !Array.isArray(this.data.pasteDepList)) {
      console.log('[saveToStorage] pasteDepList 不存在，初始化缓存');
      this.setData({
        pasteDepList: []
      });
    }
    
    // 如果没有 pasteDepIndex 或小于 0，说明还没有保存过，需要初始化
    if (this.data.pasteDepIndex === undefined || this.data.pasteDepIndex === null || this.data.pasteDepIndex < 0) {
      console.log('[saveToStorage] 首次保存，初始化缓存数据');
      
      // 查找是否已经存在当前部门的缓存
      let existingIndex = -1;
      for (let i = 0; i < this.data.pasteDepList.length; i++) {
        if (this.data.pasteDepList[i].depId === this.data.depId) {
          existingIndex = i;
          break;
        }
      }
      
      if (existingIndex >= 0) {
        // 已存在，使用现有索引
        this.setData({
          pasteDepIndex: existingIndex
        });
      } else {
        // 不存在，创建新的缓存项
        const newDepData = {
          depId: this.data.depId,
          arr: [],
          saveCount: null,
          strArr: [],
          nxArr: [],
          orderArrIndex: -1,
          searchStr: ""
        };
        this.data.pasteDepList.push(newDepData);
        this.setData({
          pasteDepIndex: this.data.pasteDepList.length - 1,
          pasteDepList: this.data.pasteDepList
        });
      }
    }
    
    try {
      // 更新内存中的数据
      this.data.pasteDepList[this.data.pasteDepIndex].depId = this.data.depId; // 确保 depId 正确
      this.data.pasteDepList[this.data.pasteDepIndex].arr = orderArr;
      // 同时保存搜索相关数据
      this.data.pasteDepList[this.data.pasteDepIndex].strArr = this.data.strArr || [];
      this.data.pasteDepList[this.data.pasteDepIndex].nxArr = this.data.nxArr || [];
      this.data.pasteDepList[this.data.pasteDepIndex].orderArrIndex = this.data.orderArrIndex !== undefined ? this.data.orderArrIndex : -1;
      this.data.pasteDepList[this.data.pasteDepIndex].searchStr = this.data.searchStr || "";
      this.data.pasteDepList[this.data.pasteDepIndex].saveCount = this.data.saveCount !== undefined ? this.data.saveCount : null;
      
      // 立即同步到 Storage
      wx.setStorageSync('pasteDepList', this.data.pasteDepList);
      console.log('[saveToStorage] 已同步到缓存，订单数量:', orderArr.length);
      
      // 更新 hasCache 状态（有订单数据就有缓存）
      if (orderArr.length > 0) {
        this.setData({
          hasCache: true
        });
      }
    } catch (error) {
      console.error('[saveToStorage] 缓存同步失败:', error);
      if (error.message && error.message.includes('exceed storage item max length')) {
        console.warn('[saveToStorage] 数据过大，缓存保存失败，但内存数据已更新');
      }
    }
  },

  _updateStorage(order) {
    console.log("========== _updateStorage 开始 ==========");
    console.log("orderArrIndex:", this.data.orderArrIndex);
    console.log("pasteDepIndex:", this.data.pasteDepIndex);
    console.log("order:", order);
    
    // 检查 orderArrIndex 是否有效
    if (this.data.orderArrIndex === undefined || this.data.orderArrIndex === null || this.data.orderArrIndex < 0) {
      console.error("❌ orderArrIndex 无效，无法更新存储:", this.data.orderArrIndex);
      return;
    }
    
    // 记录更新前的原始名称
    const beforeOrder = this.data.orderArr[this.data.orderArrIndex];
    console.log(`[_updateStorage] 订单 ${this.data.orderArrIndex} 更新前原始名称检查:`, {
      index: this.data.orderArrIndex,
      beforeName: beforeOrder?.nxDoGoodsName,
      beforeOriginalName: beforeOrder?.nxDoGoodsNameOriginal,
      afterName: order.nxDoGoodsName,
      afterOriginalName: order.nxDoGoodsNameOriginal,
      orderId: order.nxDepartmentOrdersId,
      originalNameChanged: beforeOrder?.nxDoGoodsNameOriginal !== order.nxDoGoodsNameOriginal
    });
    
    // 更新内存中的 orderArr（无论 pasteDepIndex 是否有效，都要更新当前订单数组）
    this.data.orderArr[this.data.orderArrIndex] = order;
    var data = "orderArr[" + this.data.orderArrIndex + "]";
    this.setData({
      [data]: order,
    });
    console.log(`[_updateStorage] 已更新内存中的 orderArr[${this.data.orderArrIndex}]，原始名称:`, order.nxDoGoodsNameOriginal);
    
    // 检查 pasteDepIndex 是否有效
    if (this.data.pasteDepIndex === undefined || this.data.pasteDepIndex === null || this.data.pasteDepIndex < 0) {
      console.warn("⚠️ pasteDepIndex 无效，跳过缓存更新（订单尚未保存到部门列表）:", this.data.pasteDepIndex);
      // 即使 pasteDepIndex 无效，也更新未保存订单状态
      this._updateHasUnsavedOrders();
      console.log("========== _updateStorage 结束（仅更新内存，未更新缓存）==========\n");
      return;
    }
    
    // pasteDepIndex 有效时，更新 pasteDepList 和缓存
    var depData = "pasteDepList[" + this.data.pasteDepIndex + "].arr[" + this.data.orderArrIndex + "]";
    
    console.log("更新路径 data:", data);
    console.log("更新路径 depData:", depData);
    
    // 保存更新前的缓存内容
    var beforeStorage = wx.getStorageSync('pasteDepList');
    console.log("更新前的缓存内容:", beforeStorage);
    console.log("更新前的 orderArr[orderArrIndex]:", this.data.orderArr[this.data.orderArrIndex]);
    
    // 检查 pasteDepList 是否存在且有效
    if (this.data.pasteDepList && Array.isArray(this.data.pasteDepList) && this.data.pasteDepList[this.data.pasteDepIndex]) {
      const beforeCachedOrder = this.data.pasteDepList[this.data.pasteDepIndex].arr[this.data.orderArrIndex];
      console.log("更新前的 pasteDepList[pasteDepIndex].arr[orderArrIndex]:", beforeCachedOrder);
      console.log(`[_updateStorage] 订单 ${this.data.orderArrIndex} 缓存更新前原始名称检查:`, {
        index: this.data.orderArrIndex,
        beforeCachedName: beforeCachedOrder?.nxDoGoodsName,
        beforeCachedOriginalName: beforeCachedOrder?.nxDoGoodsNameOriginal,
        afterName: order.nxDoGoodsName,
        afterOriginalName: order.nxDoGoodsNameOriginal,
        orderId: order.nxDepartmentOrdersId,
        originalNameChanged: beforeCachedOrder?.nxDoGoodsNameOriginal !== order.nxDoGoodsNameOriginal
      });
      
      // 更新 pasteDepList 中的数据
    this.data.pasteDepList[this.data.pasteDepIndex].arr[this.data.orderArrIndex] = order;
      console.log(`[_updateStorage] 已更新缓存中的订单 ${this.data.orderArrIndex}，原始名称:`, order.nxDoGoodsNameOriginal);
    
      // 使用 setData 更新视图中的 pasteDepList
    this.setData({
      [depData]: order,
      });
    
    // 保存到缓存
      try {
    wx.setStorageSync('pasteDepList', this.data.pasteDepList);
    console.log("已保存到缓存");
      } catch (error) {
        console.error('[更新订单] 缓存同步失败:', error);
        if (error.message && error.message.includes('exceed storage item max length')) {
          console.warn('[更新订单] 数据过大，缓存保存失败，但内存数据已更新');
        }
      }
    
    // 验证缓存是否更新成功
    var afterStorage = wx.getStorageSync('pasteDepList');
    console.log("更新后的缓存内容:", afterStorage);
    console.log("更新后的 pasteDepList[pasteDepIndex].arr[orderArrIndex]:", this.data.pasteDepList[this.data.pasteDepIndex].arr[this.data.orderArrIndex]);
    } else {
      console.warn("⚠️ pasteDepList 不存在或无效，跳过缓存更新");
    }
    
    console.log("更新后的 orderArr[orderArrIndex]:", this.data.orderArr[this.data.orderArrIndex]);
    
    // 检查订单的 status
    if (order.nxDoStatus !== undefined) {
      console.log("订单 status:", order.nxDoStatus);
    }
    
    // 更新未保存订单状态（单个订单更新后，需要重新检查整个数组）
    this._updateHasUnsavedOrders();
    
    console.log("存储更新成功");
    console.log("========== _updateStorage 结束 ==========\n");
  },

  addRemark() {
    var index = this.data.orderPasteIndex;
   
    var data = "orderArr[" + index + "].nxDoAddRemark";
    this.setData({
      [data]: true,
      showOperationPaste: false
    })

  },


  updateStorageDelete() {
    console.log("updateStorageDelete");
    var arr = this.data.orderArr;
    if (arr.length > 0) {
      var data = "pasteDep.arr";
      var depData = "pasteDepList[" + this.data.pasteDepIndex + "].arr";
      this.setData({
        [data]: arr,
        [depData]: arr,
      })
      try {
      wx.setStorageSync('pasteDepList', this.data.pasteDepList);
      } catch (error) {
        console.error('[删除订单] 缓存同步失败:', error);
        if (error.message && error.message.includes('exceed storage item max length')) {
          console.warn('[删除订单] 数据过大，缓存保存失败，但内存数据已更新');
        }
      }
      if (arr.length == 0) {

      }
    } else {
      if (this.data.pasteDepList.length == 1) {
        try {
        wx.removeStorageSync('pasteDepList');
        } catch (error) {
          console.error('[删除订单] 删除缓存失败:', error);
        }
      } else {
        var depArr = this.data.pasteDepList.splice(this.data.pasteDepIndex, 1);
        try {
          wx.setStorageSync('pasteDepList', depArr);
        } catch (error) {
          console.error('[删除订单] 缓存同步失败:', error);
          if (error.message && error.message.includes('exceed storage item max length')) {
            console.warn('[删除订单] 数据过大，缓存保存失败，但内存数据已更新');
          }
        }
      }

    }


  },

  toBack() {

    this.onUnload();
    wx.navigateBack({
      delta: 1
    })

  },


  clearSave(){
    console.log("========== clearSave 开始 ==========");
    console.log("当前 depId:", this.data.depId);
    console.log("当前 orderArr 长度:", this.data.orderArr.length);
    
    // 1. 从缓存中找到这个部门的所有订单
    var pasteDepList = wx.getStorageSync('pasteDepList');
    console.log("从缓存读取的 pasteDepList:", pasteDepList);
    
    if (!pasteDepList || !Array.isArray(pasteDepList)) {
      console.log("缓存中没有 pasteDepList 或格式错误");
      console.log("========== clearSave 结束 ==========");
      return;
    }
    
    // 2. 找到当前部门的所有缓存订单
    var currentDepData = null;
    for (var i = 0; i < pasteDepList.length; i++) {
      if (pasteDepList[i].depId === this.data.depId) {
        currentDepData = pasteDepList[i];
        console.log("找到当前部门的缓存数据，索引:", i);
        break;
      }
    }
    
    if (!currentDepData || !currentDepData.arr || !Array.isArray(currentDepData.arr)) {
      console.log("当前部门没有缓存订单数据");
      console.log("========== clearSave 结束 ==========");
      return;
    }
    
    // 3. 直接从当前 orderArr 中删除所有状态为 -2 的订单
    var originalOrderArr = this.data.orderArr || [];
    console.log("删除前的 orderArr 长度:", originalOrderArr.length);
    console.log("删除前的 orderArr:", originalOrderArr);
    
    var filteredOrderArr = [];
    var deletedOrders = [];
    var ordersToDeleteFromServer = []; // 需要调用接口删除的订单
    
    for (var k = 0; k < originalOrderArr.length; k++) {
      var currentOrder = originalOrderArr[k];
      
      // 直接判断状态是否为 -2，不需要判断 orderId
      if (currentOrder.nxDoStatus === -2) {
        deletedOrders.push({
          index: k,
          nxDepartmentOrdersId: currentOrder.nxDepartmentOrdersId,
          goodsName: currentOrder.nxDoGoodsName
        });
        // 如果订单有 nxDepartmentOrdersId，需要调用接口删除
        if (currentOrder.nxDepartmentOrdersId) {
          ordersToDeleteFromServer.push({
            index: k,
            nxDepartmentOrdersId: currentOrder.nxDepartmentOrdersId,
            goodsName: currentOrder.nxDoGoodsName
          });
        }
        console.log(`删除订单 ${k} (状态为 -2):`, {
          nxDepartmentOrdersId: currentOrder.nxDepartmentOrdersId,
          goodsName: currentOrder.nxDoGoodsName,
          status: currentOrder.nxDoStatus
        });
      } else {
        filteredOrderArr.push(currentOrder);
      }
    }
    
    console.log("状态为 -2 的订单数量:", deletedOrders.length);
    console.log("需要调用接口删除的订单数量:", ordersToDeleteFromServer.length);
    
    // 5. 调用接口删除服务器上的订单
    if (ordersToDeleteFromServer.length > 0) {
      console.log("需要调用接口删除的订单数量:", ordersToDeleteFromServer.length);
      console.log("需要删除的订单列表:", ordersToDeleteFromServer);
      
      load.showLoading("删除订单中");
      var that = this;
      var deletePromises = ordersToDeleteFromServer.map(order => {
        console.log("调用 deleteOrder 接口，删除订单:", order.nxDepartmentOrdersId);
        return deleteOrder(order.nxDepartmentOrdersId);
      });
      
      Promise.all(deletePromises).then(results => {
        load.hideLoading();
        var allSuccess = true;
        var failedOrders = [];
        
        results.forEach((res, idx) => {
          if (res.result.code == 0) {
            console.log(`订单 ${ordersToDeleteFromServer[idx].nxDepartmentOrdersId} 删除成功`);
          } else {
            allSuccess = false;
            failedOrders.push(ordersToDeleteFromServer[idx]);
            console.error(`订单 ${ordersToDeleteFromServer[idx].nxDepartmentOrdersId} 删除失败:`, res.result.msg);
          }
        });
        
        if (allSuccess) {
          console.log("所有订单删除成功");
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
        } else {
          console.error("部分订单删除失败:", failedOrders);
          wx.showToast({
            title: `删除失败 ${failedOrders.length} 个订单`,
            icon: 'none'
          });
        }
        
        // 无论接口是否成功，都从 orderArr 中删除（因为缓存中已经标记为 -2）
        that._finishClearSave(filteredOrderArr, deletedOrders);
      }).catch(error => {
        load.hideLoading();
        console.error("删除订单接口调用失败:", error);
        wx.showToast({
          title: '删除失败，请检查网络',
          icon: 'none'
        });
        // 即使接口失败，也从 orderArr 中删除
        that._finishClearSave(filteredOrderArr, deletedOrders);
      });
    } else {
      // 如果没有需要调用接口删除的订单，直接更新 orderArr
      this._finishClearSave(filteredOrderArr, deletedOrders);
    }
  },
  
  /**
   * 完成 clearSave 的后续操作
   * @param {Array} filteredOrderArr - 过滤后的订单数组
   * @param {Array} deletedOrders - 已删除的订单列表
   */
  _finishClearSave(filteredOrderArr, deletedOrders) {
    console.log("删除的订单数量:", deletedOrders.length);
    console.log("删除的订单详情:", deletedOrders);
    console.log("删除后的 orderArr 长度:", filteredOrderArr.length);
    console.log("删除后的 orderArr:", filteredOrderArr);
    
    // 更新状态
    const newSaveCount = filteredOrderArr.length > 0 ? this.data.saveCount : null;
    
    const updateData = {
      orderArr: filteredOrderArr,
      saveCount: newSaveCount,
    };
    
    // 如果过滤后没有订单了，恢复输入框为用户原话
    if (filteredOrderArr.length === 0 && this.data.originSentence) {
      updateData.sentence = this.data.originSentence;
      updateData.inputContent = this.data.originSentence;
    }
    
    this.setData(updateData);
    
    // 更新未保存订单状态
    this._updateHasUnsavedOrders(filteredOrderArr);
    
    // 从缓存中删除状态为 -2 的订单（无论当前 orderArr 中是否有）
    console.log("开始清理缓存中状态为 -2 的订单");
    var pasteDepList = wx.getStorageSync('pasteDepList');
    if (pasteDepList && Array.isArray(pasteDepList)) {
      // 找到当前部门的缓存数据
      var currentDepIndex = -1;
      for (var i = 0; i < pasteDepList.length; i++) {
        if (pasteDepList[i].depId === this.data.depId) {
          currentDepIndex = i;
          break;
        }
      }
      
      if (currentDepIndex >= 0) {
        // 从缓存中删除状态为 -2 的订单
        var cachedOrders = pasteDepList[currentDepIndex].arr || [];
        var filteredCachedOrders = cachedOrders.filter(order => order.nxDoStatus !== -2);
        console.log("缓存中删除前的订单数量:", cachedOrders.length);
        console.log("缓存中删除后的订单数量:", filteredCachedOrders.length);
        
        pasteDepList[currentDepIndex].arr = filteredCachedOrders;
        pasteDepList[currentDepIndex].saveCount = filteredCachedOrders.length > 0 ? pasteDepList[currentDepIndex].saveCount : null;
        
        // 如果缓存中也没有订单了，删除这个部门的缓存数据
        if (filteredCachedOrders.length === 0) {
          console.log("缓存中也没有订单了，删除当前部门的缓存数据");
          pasteDepList.splice(currentDepIndex, 1);
          
          if (pasteDepList.length === 0) {
            // 如果整个 pasteDepList 都空了，删除整个缓存
            console.log("pasteDepList 为空，删除整个缓存");
            wx.removeStorageSync('pasteDepList');
            this.setData({
              pasteDepList: null,
              pasteDepIndex: -1,
              hasCache: false,
            });
          } else {
            // 保存更新后的 pasteDepList
            console.log("保存更新后的 pasteDepList，剩余部门数量:", pasteDepList.length);
            console.log("剩余部门的 depId 列表:", pasteDepList.map(dep => dep.depId));
            try {
              wx.setStorageSync('pasteDepList', pasteDepList);
              this.setData({
                pasteDepList: pasteDepList,
                pasteDepIndex: -1,
                hasCache: false,
              });
            } catch (error) {
              console.error('[删除订单] 缓存同步失败:', error);
              if (error.message && error.message.includes('exceed storage item max length')) {
                console.warn('[删除订单] 数据过大，缓存保存失败，但内存数据已更新');
              }
            }
          }
          
          // 重置相关状态
          this.setData({
            orderArr: [], // 确保 orderArr 被清空
            pasteDepId: null,
            pasteDep: null,
            saveCount: null, // 重置保存计数
            strArr: [], // 清空搜索结果
            nxArr: [], // 清空下载商品
            orderArrIndex: -1, // 重置订单索引
            searchStr: "", // 清空搜索关键词
            hasUnsavedOrders: false, // 重置未保存订单状态
          });
        } else {
          // 如果缓存中还有订单，更新缓存（使用过滤后的订单）
          console.log("缓存中还有订单，更新缓存");
          // 确保缓存中的订单与当前 orderArr 同步（使用 filteredOrderArr，因为它已经过滤了状态为 -2 的订单）
          pasteDepList[currentDepIndex].arr = filteredOrderArr;
          pasteDepList[currentDepIndex].saveCount = newSaveCount;
          
          try {
            wx.setStorageSync('pasteDepList', pasteDepList);
            this.setData({
              pasteDepList: pasteDepList,
              hasCache: true,
            });
          } catch (error) {
            console.error('[删除订单] 缓存同步失败:', error);
            if (error.message && error.message.includes('exceed storage item max length')) {
              console.warn('[删除订单] 数据过大，缓存保存失败，但内存数据已更新');
            }
          }
        }
      } else {
        // 如果缓存中没有当前部门的数据，直接更新缓存（使用过滤后的订单）
        console.log("缓存中没有当前部门的数据，直接更新缓存");
        this._saveToStorage(filteredOrderArr);
      }
    } else {
      // 如果缓存不存在，直接更新缓存（使用过滤后的订单）
      console.log("缓存不存在，直接更新缓存");
      this._saveToStorage(filteredOrderArr);
    }
    
    console.log("已更新 orderArr，新长度:", filteredOrderArr.length);
    console.log("已更新 saveCount:", newSaveCount);
    console.log("========== clearSave 结束 ==========");
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
    
    // 从缓存中读取最新的数据，而不是使用内存中的数据
    var pasteDepList = wx.getStorageSync("pasteDepList");
    console.log("从缓存读取的 pasteDepList:", pasteDepList);
    
    if (!pasteDepList || pasteDepList.length === 0) {
      console.log("缓存中没有 pasteDepList，无需处理");
      console.log("========== onUnload 结束 ==========");
      return;
    }
    
    // 找到当前 depId 对应的数据
    var currentDepData = null;
    var currentDepIndex = -1;
    for (var i = 0; i < pasteDepList.length; i++) {
      if (pasteDepList[i].depId === this.data.pasteDepId) {
        currentDepData = pasteDepList[i];
        currentDepIndex = i;
        break;
      }
    }
    
    if (!currentDepData || !currentDepData.arr || currentDepData.arr.length === 0) {
      console.log("缓存中没有找到当前 depId 的数据或订单列表为空");
      console.log("========== onUnload 结束 ==========");
      return;
    }
    
    console.log("找到当前 depId 的数据，订单数量:", currentDepData.arr.length);
    console.log("订单列表:", currentDepData.arr);
    
    // 检查缓存中的订单是否有 status == -2 的
    var temp = [];
    for (var i = 0; i < currentDepData.arr.length; i++) {
      var status = currentDepData.arr[i].nxDoStatus;
      console.log(`订单 ${i} status:`, status, "订单名称:", currentDepData.arr[i].nxDoGoodsName);
      if (status == -2) {
        temp.push(currentDepData.arr[i]);
      }
    }
    console.log("status == -2 的订单数量:", temp.length);
    console.log("status == -2 的订单列表:", temp);
    
    if (temp.length == 0) {
      console.log("没有 status == -2 的订单，准备删除缓存");
      
      var arr = pasteDepList.filter(item => item.depId !== this.data.pasteDepId);
      console.log("过滤后的 arr 长度:", arr.length);
      console.log("过滤后的 arr 内容:", arr);

      if (arr.length == 0) {
        console.log("arr 为空，删除整个 pasteDepList 缓存");
        wx.removeStorageSync('pasteDepList');
        console.log("已删除 pasteDepList 缓存");
        
        // 验证删除是否成功
        var verifyStorage = wx.getStorageSync('pasteDepList');
        console.log("验证：删除后的缓存内容:", verifyStorage);
      } else {
        console.log("保存更新后的 pasteDepList 到缓存");
        try {
        wx.setStorageSync('pasteDepList', arr);
        console.log("已保存到缓存，缓存内容:", arr);
        } catch (error) {
          console.error('[删除未保存订单] 缓存同步失败:', error);
          if (error.message && error.message.includes('exceed storage item max length')) {
            console.warn('[删除未保存订单] 数据过大，缓存保存失败，但内存数据已更新');
          }
        }
        
        // 验证保存是否成功
        var verifyStorage = wx.getStorageSync('pasteDepList');
        console.log("验证：保存后的缓存内容:", verifyStorage);
      }
    } else {
      console.log("存在 status == -2 的订单，保留缓存");
    }
    console.log("========== onUnload 结束 ==========");
    
    // 重置AI相关字段
    this.setData({
      aiRetryCount: 0,
      hasAiRecognized: false,
      showDeepSeekLoading: false
    });
  },

})
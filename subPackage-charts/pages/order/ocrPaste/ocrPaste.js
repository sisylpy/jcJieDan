import load from '../../../../lib/load';

import apiUrl from '../../../../config.js';
import TTSHelper from '../../../lib/ttsHelper';
import {
  choiceGoodsForApply,
  updateOrder,
  deleteTaskOrder,
  getTaskOrders,
  deleteBatchOrders,
  correctOrders,
  textToSpeech,
} from '../../../../lib/apiDepOrder';

import { resolveNxDoCostPriceLevel } from '../../../../lib/retailPriceLevel';

import {
  disSaveStandard,
  queryDisGoodsByQuickSearchWithDepId,
  disDeleteStandard,
} from '../../../../lib/apiDistributer';
import {
  downDisGoods,
  disGetGoods,
} from '../../../lib/apiibook';

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


    // 订单相关
    orderArr: [], // 解析后的订单列表

    // 商品搜索相关
    strArr: [], // 配送商商品搜索结果
    nxArr: [], // 系统商品搜索结果
    orderArrIndex: -1, // 当前正在编辑/操作的订单索引（用于商品搜索、编辑订单、操作菜单等）
    searchStr: '', // 搜索关键词
    _searchRequestId: 0, // 搜索请求序列号（用于防止竞态条件）
    _searchDebounceTimer: null, // 搜索防抖定时器
    // 操作菜单相关
    showOperationPaste: false, // 是否显示操作菜单
    playerHidden: false, // 播放器是否隐藏（操作菜单打开时隐藏）
    isStoppedByStatusMinus2: false, // 是否因为订单状态-2而停止
    orderItem: null, // 当前操作的订单项
    findGoods: false, // 从添加临时商品页面返回后，是否需要更新订单


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
    isCheckMode: true, // 是否在检查模式（显示图片+播放器，但不朗读）
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
    highlightedText: '', // 高亮后的文本（rich-text 格式）
    initialOrderGoodsNames: [], // 初始订单的商品名称列表（用于检测被删除的商品）
  },

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
      scrollViewHeightReading: 300,
      taskId: options.taskId,
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
            isTTSPlaying: false,
            isStoppedByStatusMinus2: true // 标记是因为订单状态-2而停止
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
        console.error('[ocrPaste] TTS播放错误:', error);
        
        const errorCode = error.errCode;
        const errorMsg = error.errMsg || '播放失败';
        // 使用 ttsHelper 传递的错误类型标识
        const is404Error = error.is404Error || errorCode === 10004 || 
                          errorMsg.includes('404') || 
                          errorMsg.includes('文件不存在');
        const isDecodeError = error.isDecodeError || 
                             errorMsg.includes('解码') || 
                             errorMsg.includes('decode');
        
        // 如果是 404 或解码错误，自动跳过当前音频，继续播放下一个
        if (is404Error || isDecodeError) {
          console.warn('[ocrPaste] 音频文件不存在或无法解码，跳过当前音频，继续播放下一个');
          
          // 清除当前音频缓存，避免重复尝试
          const currentIndex = this.data.currentTTSIndex;
          if (currentIndex >= 0) {
            const audioCache = { ...this.data.ttsAudioCache };
            delete audioCache[currentIndex];
            this.setData({
              ttsAudioCache: audioCache
            });
          }
          
          // 继续播放下一个
          this.setData({
            ttsAudio: null,
            isTTSPlaying: false,
            ttsError: ''
          });
          
          // 延迟一下再播放下一个，避免立即重试
          setTimeout(() => {
            this.playNextInQueue();
          }, 500);
        } else {
          // 其他错误，显示错误提示并停止播放
          this.setData({
            ttsAudio: null,
            isTTSPlaying: false,
            isTTSReading: false,
            ttsError: errorMsg
          });
          wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 2000
          });
        }
      },
      onCanplay: (audioContext) => {
        // 音频可以播放回调
      }
    });
    this._initTaskOrder();

  },

  onShow: function () {

    // this._initTaskOrder();
    // 如果从添加临时商品页面返回，需要更新订单
    console.log('[onShow] 检查 findGoods:', this.data.findGoods);
    console.log('[onShow] orderArrIndex:', this.data.orderArrIndex);
    console.log('[onShow] goodsId:', this.data.goodsId);
    console.log('[onShow] name:', this.data.name);
    console.log('[onShow] selectedGoodsName:', this.data.selectedGoodsName);
    
    if (this.data.findGoods) {
      console.log('[onShow] 进入 findGoods 分支，准备更新订单');
      // 如果 orderArrIndex 无效，尝试从 storage 恢复
      if (this.data.orderArrIndex < 0) {
        const savedIndex = wx.getStorageSync('ocrOrderAddGoodsIndex');
        console.log('[onShow] orderArrIndex 无效，尝试从 storage 恢复:', savedIndex);
        if (savedIndex !== undefined && savedIndex !== null && savedIndex >= 0) {
          this.setData({
            orderArrIndex: savedIndex
          });
          // 清除 storage
          wx.removeStorageSync('ocrOrderAddGoodsIndex');
        } else {
          console.log('[onShow] storage 中也没有有效的索引，清除 findGoods');
          this.setData({
            findGoods: false
          });
          return;
        }
      }
      // 将 name 转换为 selectedGoodsName，以便 _choiceGoods 使用
      if (this.data.name && !this.data.selectedGoodsName) {
        console.log('[onShow] 设置 selectedGoodsName:', this.data.name);
        this.setData({
          selectedGoodsName: this.data.name
        });
      }
      // 确保 orderArrIndex 有效
      if (this.data.orderArrIndex < 0) {
        console.log('[onShow] orderArrIndex 仍然无效，清除 findGoods');
        this.setData({
          findGoods: false
        });
        return;
      }
      // 保存订单索引和朗读状态，用于后续朗读
      const orderIndex = this.data.orderArrIndex;
      console.log('[onShow] 准备更新订单，索引:', orderIndex);
      // 检查是否在朗读模式（包括因为订单状态-2而停止的情况）
      var wasReading = this.data.isTTSReading || this.data.isTTSPlaying;
      var wasPaused = this.data.stoppedIndex >= 0 && !this.data.isTTSPlaying && this.data.isTTSReading;
      var wasStoppedByStatusMinus2 = this.data.isStoppedByStatusMinus2; // 是否因为订单状态-2而停止
      console.log('[onShow] wasReading:', wasReading, 'wasPaused:', wasPaused, 'wasStoppedByStatusMinus2:', wasStoppedByStatusMinus2);
      // 调用 _choiceGoods 保存订单，传入回调函数处理朗读
      console.log('[onShow] 调用 _choiceGoods，传入回调函数');
      // 如果之前在朗读模式（包括因为订单状态-2而停止），先清除保存的朗读状态，避免后面的逻辑冲突
      if (wasReading || wasPaused || wasStoppedByStatusMinus2) {
        wx.removeStorageSync('ocrOrderTTSState');
        console.log('[onShow] 清除保存的朗读状态，避免冲突');
      }
      // 创建回调函数
      const onSuccessCallback = () => {
        console.log('[onShow] _choiceGoods 回调执行');
        console.log('[onShow] 回调中检查状态 - wasReading:', wasReading, 'wasPaused:', wasPaused, 'wasStoppedByStatusMinus2:', wasStoppedByStatusMinus2);
        // 订单保存成功后的回调：如果之前在朗读模式（包括暂停状态和因为订单状态-2而停止），从添加临时商品的订单开始朗读
        // 注意：序号应该减1，即从当前订单的前一个订单开始朗读
        if (wasReading || wasPaused || wasStoppedByStatusMinus2) {
          console.log('[onShow] 满足朗读条件，检查订单状态');
          // 检查更新后的订单状态是否还是-2
          const updatedOrder = this.data.orderArr[orderIndex];
          const isStillStatusMinus2 = updatedOrder && updatedOrder.nxDoStatus == -2;
          console.log('[onShow] 更新后的订单状态:', updatedOrder?.nxDoStatus, 'isStillStatusMinus2:', isStillStatusMinus2);
          console.log('[onShow] 更新后的订单:', updatedOrder);
          
          if (!isStillStatusMinus2) {
            // 如果订单状态不再是-2，清除停止标记并继续朗读
            console.log('[onShow] 订单状态不再是-2，清除停止标记');
            this.setData({
              isStoppedByStatusMinus2: false,
              stoppedIndex: -1,
              stoppedOrderRef: null
            });
            const startIndex = Math.max(0, orderIndex); // 从当前订单开始朗读
            console.log('[onShow] 订单状态已更新，开始朗读，从索引:', startIndex);
            this.readOrderListFromIndex(startIndex);
          } else {
            console.log('[onShow] 订单状态仍为-2，不继续朗读');
          }
        } else {
          console.log('[onShow] 不满足朗读条件，不继续朗读');
        }
      };
      console.log('[onShow] 回调函数已创建:', typeof onSuccessCallback);
      this._choiceGoods(onSuccessCallback);
      // findGoods 分支已处理，直接返回，避免后面的 ocrOrderTTSState 检查
      return;
    }
    // 检查是否有保存的朗读状态，如果有则继续朗读（只有在非 findGoods 情况下才执行）
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
    
    // 页面显示时，如果有订单数据和任务数据，重新处理文本高亮
    if (this.data.orderArr && this.data.orderArr.length > 0 && this.data.task) {
      this._highlightTextWithStatusMinus2Orders(this.data.orderArr, this.data.task);
    }
  },


  _initTaskOrder() {
    // 检查 taskId 是否存在
    if (!this.data.taskId) {
      wx.showToast({
        title: '任务ID不存在',
        icon: 'none',
        duration: 3000
      });
      return;
    }

    load.showLoading('加载订单中...');
    getTaskOrders(this.data.taskId).then(res => {
      load.hideLoading();
      console.log((res))
      if (res.result.code === 0) {
        const orders = res.result.orders || res.result.data || [];
       

        // 保存初始订单的商品名称列表（用于检测被删除的商品）- 使用 nxDoGoodsOriginalName 字段
        const initialGoodsNames = [...new Set(
          orders
            .map(order => order.nxDoGoodsOriginalName || order.nxDoGoodsName)
            .filter(name => name && name.trim())
        )];

        // 显示确认状态，设置订单列表
        this.setData({
          orderArr: orders,
          task: res.result.task,
          totalOrders: res.result.totalOrders,
          initialOrderGoodsNames: initialGoodsNames, // 保存初始商品名称列表
          taskId: this.data.taskId, // 保存任务ID，用于删除订单时传递
         
        } );
        
        // 处理文本高亮（找出 nxDoStatus == -2 的订单对应的商品名称）
        this._highlightTextWithStatusMinus2Orders(orders, res.result.task);
      } 
     
    })
    
  },

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


  colseCheck(){
    this.setData({
      isCheckMode: false
    })

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
      this.setData(updateData, () => {
        // 展开商品列表后，滚动到该订单顶部（与朗读时保持一致的体验）
        const that = this;
        setTimeout(() => {
          that.scrollToOrderItem(index);
        }, 150); // 延迟等待 DOM 更新（商品列表展开）
      });
    } else {
      // 如果当前点击的项已经是 2，在上面已经改为 -1 了，关闭商品列表
      updateData.orderArrIndex = -1;
      // 关闭推荐商品或搜索商品时，用 nxDoGoodsNameOriginal 恢复 nxDoGoodsName
      const order = this.data.orderArr[index];
      const hadSearchOrRecommend = (this.data.strArr && this.data.strArr.length > 0) ||
        (this.data.nxArr && this.data.nxArr.length > 0) ||
        (order?.nxDistributerGoodsEntityList && order.nxDistributerGoodsEntityList.length > 0) ||
        (order?.nxGoodsEntities && order.nxGoodsEntities.length > 0);
      const userDidNotSelect = !order?.nxDoDisGoodsId;
      const originalName = order?.nxDoGoodsNameOriginal ?? order?.nxDoGoodsOriginalName;
      if (hadSearchOrRecommend && userDidNotSelect && originalName != null) {
        updateData["orderArr[" + index + "].nxDoGoodsName"] = originalName;
      }
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
    var index = mockEvent?.currentTarget?.dataset?.index ?? mockEvent;
    var dataIsAgent = "orderArr[" + index + "].nxDoIsAgent";
    const updateData = {
      orderArrIndex: -1,
      [dataIsAgent]: -1,
      nxArr: [],
      strArr: []
    };
    // 关闭推荐商品或搜索商品时，用 nxDoGoodsNameOriginal 恢复 nxDoGoodsName
    const order = this.data.orderArr[index];
    const hadSearchOrRecommend = (this.data.strArr && this.data.strArr.length > 0) ||
      (this.data.nxArr && this.data.nxArr.length > 0) ||
      (order?.nxDistributerGoodsEntityList && order.nxDistributerGoodsEntityList.length > 0) ||
      (order?.nxGoodsEntities && order.nxGoodsEntities.length > 0);
    const userDidNotSelect = !order?.nxDoDisGoodsId;
    const originalName = order?.nxDoGoodsNameOriginal ?? order?.nxDoGoodsOriginalName;
    if (hadSearchOrRecommend && userDidNotSelect && originalName != null) {
      updateData["orderArr[" + index + "].nxDoGoodsName"] = originalName;
    }
    this.setData(updateData);
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
      nxArr: [], // 清空系统商品搜索结果
      strArr: [] // 清空配送商商品搜索结果，确保推荐商品列表能显示
    });
    // 如果是聚焦商品名称输入框，触发自动搜索
    // if (dataset.type == 'name') {
    //   this.autoSearchString();
    // }
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
      console.log("搜索商品结果autoSearchString", res.result.data);
      if (res.result.code == 0) {
        this.setData({
          strArr: res.result.data.disArr,
          nxArr: res.result.data.nxArr,
        })

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
    var value = e.detail.value;
    // 只更新商品名称，不触发搜索
    if (value.length > 0) {
      var newName = value;
      var dataName = "orderArr[" + index + "].nxDoGoodsName";
    
      this.setData({
        [dataName]: newName,
        goodsName: newName,
      })
    } else {
      this.setData({
        strArr: [],
        nxArr: [],
        orderArrIndex: -1,
        goodsName: '',
      })
    }
  },

  /**
   * 确认搜索商品（键盘确认按钮或失焦时触发）
   */
  confirmSearchGoods: function (e) {
    var index = e.detail.index;
    var searchValue = e.detail.value;
    console.log('[ocrOrder] 确认搜索商品:', {
      index,
      searchValue
    });

    if (!searchValue || searchValue.trim().length === 0) {
      return;
    }

    // 先关闭其他已打开的列表
    var updateData = {};
    for (var i = 0; i < this.data.orderArr.length; i++) {
      if (this.data.orderArr[i].nxDoIsAgent === 2) {
        updateData["orderArr[" + i + "].nxDoIsAgent"] = -1;
      }
    }

    // 确保商品名称已更新，并设置当前订单为展开状态
    var dataName = "orderArr[" + index + "].nxDoGoodsName";
    var dataIsAgent = "orderArr[" + index + "].nxDoIsAgent";
    var dataGoodsList = "orderArr[" + index + "].nxDistributerGoodsEntityList";
    var dataNxGoodsEntities = "orderArr[" + index + "].nxGoodsEntities";
    
    // 记录更新前的推荐商品列表
    var beforeGoodsList = this.data.orderArr[index]?.nxDistributerGoodsEntityList;
    var beforeNxGoodsEntities = this.data.orderArr[index]?.nxGoodsEntities;
    console.log('[ocrOrder] 更新前的推荐商品列表:', {
      index,
      beforeGoodsListLength: beforeGoodsList?.length || 0,
      beforeGoodsList: beforeGoodsList,
      beforeNxGoodsEntitiesLength: beforeNxGoodsEntities?.length || 0,
      beforeNxGoodsEntities: beforeNxGoodsEntities
    });
    
    updateData[dataName] = searchValue;
    updateData[dataIsAgent] = 2; // 设置为展开状态，以便显示商品列表
    updateData[dataGoodsList] = []; // 搜索商品名称后，清空推荐商品列表
    updateData[dataNxGoodsEntities] = []; // 搜索商品名称后，清空 nxGoodsEntities
    updateData.orderArrIndex = index; // 设置当前编辑的订单索引

    console.log('[ocrOrder] 设置订单状态:', {
      index,
      nxDoIsAgent: 2,
      orderArrIndex: index,
      updateDataKeys: Object.keys(updateData),
      currentOrder: this.data.orderArr[index]
    });

    this.setData(updateData);
    
    // 验证设置是否成功
    console.log('[ocrOrder] 设置后的推荐商品列表:', {
      index,
      afterGoodsListLength: this.data.orderArr[index]?.nxDistributerGoodsEntityList?.length || 0,
      afterGoodsList: this.data.orderArr[index]?.nxDistributerGoodsEntityList,
      afterNxGoodsEntitiesLength: this.data.orderArr[index]?.nxGoodsEntities?.length || 0,
      afterNxGoodsEntities: this.data.orderArr[index]?.nxGoodsEntities
    });

    // 执行搜索
    this.getSearchStringByValue(searchValue);
  },

  /**
   * 根据商品名称搜索商品（根据传入的值搜索）
   */
  getSearchStringByValue: function (searchValue) {
    if (!searchValue || searchValue.trim().length === 0) {
      return;
    }

    var data = {
      disId: this.data.disId,
      searchStr: searchValue.trim(),
      depId: this.data.depId,
    }
    this.setData({
      searchStr: searchValue.trim(),
    })
    load.showLoading("搜索商品中")
    queryDisGoodsByQuickSearchWithDepId(data).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        const disArr = res.result.data.disArr || [];
        const nxArr = res.result.data.nxArr || [];
        const totalCount = disArr.length + nxArr.length;
        const currentOrderAfterSearch = this.data.orderArr[this.data.orderArrIndex];
        const orderIndex = this.data.orderArrIndex;
        console.log('[ocrOrder] 搜索结果:', {
          disArrCount: disArr.length,
          nxArrCount: nxArr.length,
          totalCount,
          orderArrIndex: orderIndex,
          currentOrder: currentOrderAfterSearch,
          recommendGoodsListLength: currentOrderAfterSearch?.nxDistributerGoodsEntityList?.length || 0,
          recommendGoodsList: currentOrderAfterSearch?.nxDistributerGoodsEntityList
        });

        // 搜索商品名称后，确保当前订单的推荐商品列表为空
        var updateDataAfterSearch = {
          strArr: disArr,
          nxArr: nxArr,
        };
        
        // 如果当前有正在编辑的订单，确保其推荐商品列表为空
        if (orderIndex >= 0 && orderIndex < this.data.orderArr.length) {
          var dataGoodsListAfterSearch = "orderArr[" + orderIndex + "].nxDistributerGoodsEntityList";
          var beforeSetEmpty = this.data.orderArr[orderIndex]?.nxDistributerGoodsEntityList?.length || 0;
          updateDataAfterSearch[dataGoodsListAfterSearch] = [];
          console.log('[ocrOrder] 搜索结果返回后，再次确保推荐商品列表为空:', {
            orderIndex,
            dataGoodsListKey: dataGoodsListAfterSearch,
            beforeSetEmptyLength: beforeSetEmpty,
            willSetToEmpty: true
          });
        }

        this.setData(updateDataAfterSearch);
        
        // 验证设置是否成功
        if (orderIndex >= 0 && orderIndex < this.data.orderArr.length) {
          setTimeout(() => {
            const afterSetEmpty = this.data.orderArr[orderIndex]?.nxDistributerGoodsEntityList?.length || 0;
            const afterNxGoodsEntitiesEmpty = this.data.orderArr[orderIndex]?.nxGoodsEntities?.length || 0;
            console.log('[ocrOrder] 搜索结果返回后，设置后的推荐商品列表长度:', {
              orderIndex,
              afterSetEmptyLength: afterSetEmpty,
              afterNxGoodsEntitiesLength: afterNxGoodsEntitiesEmpty,
              shouldBeEmpty: true
            });
          }, 100);
        }

        // 如果有搜索结果，关闭键盘
        if (totalCount > 0) {
          wx.hideKeyboard();
        } else {
          // 如果没有搜索结果，检查是否有推荐商品
          const currentOrder = this.data.orderArr[this.data.orderArrIndex];
          const hasRecommendGoods = currentOrder &&
            currentOrder.nxDistributerGoodsEntityList &&
            currentOrder.nxDistributerGoodsEntityList.length > 0;
          console.log('[ocrOrder] 无搜索结果，检查推荐商品:', {
            hasRecommendGoods,
            recommendCount: currentOrder?.nxDistributerGoodsEntityList?.length || 0,
            nxDoIsAgent: currentOrder?.nxDoIsAgent,
            orderArrIndex: this.data.orderArrIndex
          });

          // 如果没有搜索结果，提示用户并关闭键盘
          wx.showToast({
            title: '未找到相关商品',
            icon: 'none',
            duration: 2000
          });
          wx.hideKeyboard();
        }
      } else {
        wx.showToast({
          title: res.result.msg || '搜索失败',
          icon: 'none'
        })
        this.setData({
          nxArr: [],
          strArr: []
        })
        wx.hideKeyboard();
      }
    }).catch(err => {
      load.hideLoading();
      console.error('[ocrOrder] 搜索失败:', err);
      wx.showToast({
        title: '搜索失败，请重试',
        icon: 'none'
      })
      this.setData({
        nxArr: [],
        strArr: []
      })
      wx.hideKeyboard();
    })
  },

  /**
   * 根据商品名称搜索商品（输入时触发）- 保留兼容性
   */
  getSearchString: function (e) {
    if (e.detail && e.detail.value && e.detail.value.length > 0) {
      this.getSearchStringByValue(e.detail.value);
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
    const index = e.currentTarget.dataset.index;
    const goodsId = e.currentTarget.dataset.id;
    const selectedGoodsName = e.currentTarget.dataset.name || '';
    console.log('[saveOrder] 从搜索结果选择商品，索引:', index, 'goodsId:', goodsId);
    this.setData({
      orderArrIndex: index,
      goodsId: goodsId,
      selectedGoodsName: selectedGoodsName, // 保存选择的商品名称
    });
    // 检查是否在朗读模式（包括因为订单状态-2而停止），如果是，传入回调继续朗读
    const wasReading = this.data.isTTSReading || this.data.isTTSPlaying;
    const wasPaused = this.data.stoppedIndex >= 0 && !this.data.isTTSPlaying && this.data.isTTSReading;
    const wasStoppedByStatusMinus2 = this.data.isStoppedByStatusMinus2;
    console.log('[saveOrder] 朗读状态 - wasReading:', wasReading, 'wasPaused:', wasPaused, 'wasStoppedByStatusMinus2:', wasStoppedByStatusMinus2);
    
    if (wasReading || wasPaused || wasStoppedByStatusMinus2) {
      // 如果之前在朗读模式，传入回调继续朗读
      this._choiceGoods(() => {
        console.log('[saveOrder] _choiceGoods 回调执行');
        // 检查更新后的订单状态是否还是-2
        const updatedOrder = this.data.orderArr[index];
        const isStillStatusMinus2 = updatedOrder && updatedOrder.nxDoStatus == -2;
        console.log('[saveOrder] 更新后的订单状态:', updatedOrder?.nxDoStatus, 'isStillStatusMinus2:', isStillStatusMinus2);
        
        if (!isStillStatusMinus2) {
          // 如果订单状态不再是-2，清除停止标记并继续朗读
          this.setData({
            isStoppedByStatusMinus2: false,
            stoppedIndex: -1,
            stoppedOrderRef: null
          });
          const startIndex = Math.max(0, index); // 从当前订单开始朗读
          console.log('[saveOrder] 订单状态已更新，开始朗读，从索引:', startIndex);
          this.readOrderListFromIndex(startIndex);
        } else {
          console.log('[saveOrder] 订单状态仍为-2，不继续朗读');
        }
      });
    } else {
      // 非朗读模式，直接调用，不传入回调
      this._choiceGoods();
    }
  },

  /**
   * 保存订单（选择商品后）
   * @param {Function} onSuccess 订单保存成功后的回调函数
   */
  _choiceGoods: function (onSuccess) {
    console.log('[_choiceGoods] 开始执行');
    var index = this.data.orderArrIndex;
    console.log('[_choiceGoods] orderArrIndex:', index);
    console.log('[_choiceGoods] orderArr.length:', this.data.orderArr ? this.data.orderArr.length : 0);
    console.log('[_choiceGoods] goodsId:', this.data.goodsId);
    console.log('[_choiceGoods] selectedGoodsName:', this.data.selectedGoodsName);
    console.log('[_choiceGoods] name:', this.data.name);
    
    if (index === undefined || index === null || index < 0) {
      console.log('[_choiceGoods] orderArrIndex 无效，清除 findGoods');
      // 清除 findGoods 标记
      this.setData({
        findGoods: false
      });
      return;
    }
    if (!this.data.orderArr || index >= this.data.orderArr.length) {
      console.log('[_choiceGoods] orderArr 无效或索引超出范围，清除 findGoods');
      // 清除 findGoods 标记
      this.setData({
        findGoods: false
      });
      return;
    }
    // 从 orderArr 中获取订单对象（确保获取最新的完整对象）
    var order = this.data.orderArr[index];
    console.log('[_choiceGoods] 当前订单:', order);
    if (!order) {
      console.log('[_choiceGoods] 订单不存在，清除 findGoods');
      // 清除 findGoods 标记
      this.setData({
        findGoods: false
      });
      return;
    }
    // 检查 goodsId 是否存在
    if (!this.data.goodsId) {
      console.log('[_choiceGoods] goodsId 不存在，清除 findGoods');
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
    if (missingFields.length > 0) {}
    // 确保传递完整的 order 对象，而不仅仅是修改几个字段
    // 注意：使用展开运算符确保保留所有原有字段
    const orderToSend = {
      ...order, // 保留原有的所有字段（包括 nxDoQuantity, nxDoStandard, nxDoRemark 等）
      nxDoGoodsName: selectedGoodsName, // 更新商品名称
      nxDoDisGoodsId: this.data.goodsId, // 更新商品ID
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
    console.log('[_choiceGoods] 准备调用 API，orderToSend:', orderToSend);
    load.showLoading("保存订单中")
    choiceGoodsForApply(orderToSend).then(res => {
      console.log('[_choiceGoods] API 返回结果:', res);
      if (res.result.code == 0) {
        load.hideLoading();
        console.log('[_choiceGoods] API 调用成功');
        // 获取更新前的原始订单对象，保留所有原有字段
        const currentOrderBeforeUpdate = this.data.orderArr[index];
        console.log('[_choiceGoods] 更新前的订单:', currentOrderBeforeUpdate);
        console.log('[_choiceGoods] 更新前的商品名称:', currentOrderBeforeUpdate.nxDoGoodsName);
        console.log('[_choiceGoods] 更新前的商品ID:', currentOrderBeforeUpdate.nxDoDisGoodsId);
        console.log('[_choiceGoods] API 返回的数据:', res.result.data);
        console.log('[_choiceGoods] API 返回的商品名称:', res.result.data?.nxDoGoodsName);
        console.log('[_choiceGoods] API 返回的商品ID:', res.result.data?.nxDoDisGoodsId);
        console.log('[_choiceGoods] selectedGoodsName:', selectedGoodsName);
        // 合并原有订单对象的所有字段 + 后端返回的字段 + 需要更新的字段
        // 这样可以确保不丢失任何原有字段（如 nxDoQuantity, nxDoStandard, nxDoRemark 等）
        const updatedOrder = {
          ...currentOrderBeforeUpdate, // 先保留原有的所有字段
          ...res.result.data, // 然后用后端返回的字段覆盖/更新
          nxDoGoodsName: selectedGoodsName, // 使用选择的商品名称
         
        };
        console.log('[_choiceGoods] 更新后的订单:', updatedOrder);
        console.log('[_choiceGoods] 更新后的商品名称:', updatedOrder.nxDoGoodsName);
        console.log('[_choiceGoods] 更新后的商品ID:', updatedOrder.nxDoDisGoodsId);
        
        // 先更新 orderArr 数组，确保引用改变，触发组件重新渲染
        const orderArr = [...this.data.orderArr];
        orderArr[index] = updatedOrder;
        
        var data = "orderArr[" + index + "]";
        this.setData({
          orderArr: orderArr, // 更新整个数组，确保引用改变
          [data]: updatedOrder, // 同时更新具体项
          strArr: [],
          nxArr: [],
          // 注意：先不重置 orderArrIndex，因为 _updateStorage 需要使用它
        })
        console.log('[_choiceGoods] 订单已更新到页面，索引:', index);
        console.log('[_choiceGoods] 更新后的 orderArr[7]:', this.data.orderArr[index]);
        
        // 重新处理文本高亮（订单状态可能已改变）
        this._highlightTextWithStatusMinus2Orders(this.data.orderArr, this.data.task);
        // 先更新缓存（需要使用 orderArrIndex）
        // this._updateStorage(updatedOrder);
        // 更新缓存后再重置相关状态
        // 清除 storage 中的订单索引
        wx.removeStorageSync('ocrOrderAddGoodsIndex');
        this.setData({
          orderArrIndex: -1,
          findGoods: false, // 清除 findGoods 标记
          name: '', // 清除 name
          selectedGoodsName: '', // 清除 selectedGoodsName
        })
        console.log('[_choiceGoods] 状态已重置');
        // 如果传入了成功回调，调用它（用于处理朗读等后续逻辑）
        console.log('[_choiceGoods] 检查回调函数:', onSuccess, '类型:', typeof onSuccess);
        if (onSuccess && typeof onSuccess === 'function') {
          console.log('[_choiceGoods] 调用成功回调');
          try {
            onSuccess();
            console.log('[_choiceGoods] 成功回调执行完成');
          } catch (e) {
            console.error('[_choiceGoods] 成功回调执行出错:', e);
          }
        } else {
          console.log('[_choiceGoods] 没有成功回调或回调不是函数');
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
    // 使用 orderArrIndex（从操作菜单调用）
    var index = this.data.orderArrIndex;
    if (index < 0 || index >= this.data.orderArr.length) {
      return;
    }
    var arr = this.data.orderArr;
    var orderItem = arr[index];
    if (!orderItem) {
      return;
    }
    // 保存删除前的朗读状态，用于删除后继续朗读
    const wasReading = this.data.isTTSReading || this.data.isTTSPlaying;
    const wasPaused = this.data.stoppedIndex >= 0 && !this.data.isTTSPlaying && this.data.isTTSReading;
    const wasStoppedByStatusMinus2 = this.data.isStoppedByStatusMinus2;
    console.log('[delOrder] 删除订单，索引:', index, 'wasReading:', wasReading, 'wasPaused:', wasPaused, 'wasStoppedByStatusMinus2:', wasStoppedByStatusMinus2);
    
    // 关闭操作菜单
    this.setData({
      showOperationPaste: false,
      playerHidden: false // 关闭操作菜单时显示播放器
    });
    // 如果订单有 nxDepartmentOrdersId，说明已经保存到服务器，需要调用接口删除
    if (orderItem.nxDepartmentOrdersId) {
      var id = orderItem.nxDepartmentOrdersId;
      var that = this;
      load.showLoading("删除订单中");
      deleteTaskOrder(id).then(res => {
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
          
          // 重新处理文本高亮（订单已删除）
          that._highlightTextWithStatusMinus2Orders(that.data.orderArr, that.data.task);
          
          // 更新缓存
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
          // 如果之前在朗读模式，从删除的位置继续朗读
          if (wasReading || wasPaused || wasStoppedByStatusMinus2) {
            // 删除后，原来索引 index+1 的订单会变成索引 index
            // 如果删除的是最后一个订单，从最后一个订单开始（如果还有订单的话）
            const startIndex = Math.min(index, filteredArr.length - 1);
            if (startIndex >= 0 && filteredArr.length > 0) {
              console.log('[delOrder] 删除成功，继续朗读，从索引:', startIndex);
              // 清除停止标记
              that.setData({
                isStoppedByStatusMinus2: false,
                stoppedIndex: -1,
                stoppedOrderRef: null
              });
              that.readOrderListFromIndex(startIndex);
            } else {
              console.log('[delOrder] 删除后没有订单了，停止朗读');
              // 如果没有订单了，停止朗读
              that.setData({
                isTTSReading: false,
                isTTSPlaying: false,
                stoppedIndex: -1,
                stoppedOrderRef: null,
                isStoppedByStatusMinus2: false
              });
            }
          }
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
    
    // 重新处理文本高亮（订单已删除）
    this._highlightTextWithStatusMinus2Orders(this.data.orderArr, this.data.task);
    
    // 更新缓存
    wx.showToast({
      title: '删除成功',
      icon: 'success'
    });
    // 如果之前在朗读模式，从删除的位置继续朗读
    if (wasReading || wasPaused || wasStoppedByStatusMinus2) {
      // 删除后，原来索引 index+1 的订单会变成索引 index
      // 如果删除的是最后一个订单，从最后一个订单开始（如果还有订单的话）
      const startIndex = Math.min(index, arr.length - 1);
      if (startIndex >= 0 && arr.length > 0) {
        console.log('[delOrder] 删除成功，继续朗读，从索引:', startIndex);
        // 清除停止标记
        this.setData({
          isStoppedByStatusMinus2: false,
          stoppedIndex: -1,
          stoppedOrderRef: null
        });
        this.readOrderListFromIndex(startIndex);
      } else {
        console.log('[delOrder] 删除后没有订单了，停止朗读');
        // 如果没有订单了，停止朗读
        this.setData({
          isTTSReading: false,
          isTTSPlaying: false,
          stoppedIndex: -1,
          stoppedOrderRef: null,
          isStoppedByStatusMinus2: false
        });
      }
    }
  },

  /**
   * 删除订单项（支持从其他地方调用，保留兼容）
   * 调用 delOrder
   */

  deleteOrder: function (e) {
    // 如果是从操作菜单调用，使用 orderArrIndex
    // 如果是从其他地方调用，使用 dataset.index
    var index = this.data.orderArrIndex >= 0 ? this.data.orderArrIndex : (e && e.currentTarget ? e.currentTarget.dataset.index : -1);
    // 临时设置 orderArrIndex，然后调用 delOrder
    this.setData({
      orderArrIndex: index
    });
    // 调用统一的删除函数
    this.delOrder(e);
  },

  /**
   * 修改订单（已保存的订单）
   * 参考 paste.js 的 editApply，先获取配送商品信息
   */

  editOrderItem: function (e) {
    var index = this.data.orderArrIndex;
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
        showOperationPaste: false,
        playerHidden: false // 关闭操作菜单时显示播放器
      });
      return;
    }
    // 关闭操作菜单
    this.setData({
      showOperationPaste: false,
      playerHidden: false // 关闭操作菜单时显示播放器
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
    var index = this.data.orderArrIndex;
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
    var index = this.data.orderArrIndex;
    var orderItem = this.data.orderArr[index];
    if (!orderItem || !orderItem.nxDepartmentOrdersId) {
      wx.showToast({
        title: '订单信息错误',
        icon: 'none'
      });
      return;
    }
    const std = e.detail.applyStandardName;
    const dis = orderItem && orderItem.nxDistributerGoodsEntity;
    var dg = {
      id: orderItem.nxDepartmentOrdersId,
      weight: e.detail.applyNumber,
      standard: std,
      remark: e.detail.applyRemark,
      printStandard: this.data.printStandard,
      priceLevel: resolveNxDoCostPriceLevel(dis, std),
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
         
        };
        // 更新订单数组
        var updatedArr = [...this.data.orderArr];
        updatedArr[index] = updatedOrder;
        that.setData({
          orderArr: updatedArr,
        });
        // 更新缓存
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
    
    wx.navigateBack();
  },

  /**
   * 显示操作菜单
   */

  showPasteOperation: function (e) {
    const index = e.currentTarget.dataset.index;
    console.log('[showPasteOperation] 显示操作菜单，订单索引:', index, '订单列表长度:', this.data.orderArr.length);
    if (index < 0 || index >= this.data.orderArr.length) {
      console.error('[showPasteOperation] 无效的订单索引:', index);
      return;
    }
    this.setData({
      orderArrIndex: index,
      showOperationPaste: true,
      orderItem: this.data.orderArr[index],
      playerHidden: true, // 显示操作菜单时隐藏播放器
    })
  },

  /**
   * 添加临时商品
   */

  addDisAlias: function (e) {
    var index = this.data.orderArrIndex;
    if (index < 0 || index >= this.data.orderArr.length) {
      return;
    }
    var order = this.data.orderArr[index];
    if (!order) {
      return;
    }
    var standard = order.itemUnit || order.nxDoStandard;
    var name = order.nxDoGoodsName || '';
    var standardWeight = order.standardWeight;
    var itemsPerCarton = order.itemsPerCarton;
    var cartonUnit = order.cartonUnit;
    // 先关闭操作菜单
    this.setData({
      showOperationPaste: false,
      playerHidden: false // 关闭操作菜单时显示播放器
    });
    // 保存当前订单索引（用于返回时更新订单）
    // 同时保存到 storage，确保页面返回时仍然有效
    wx.setStorageSync('ocrOrderAddGoodsIndex', index);
    this.setData({
      orderArrIndex: index,
    });
    console.log('[addDisAlias] 保存订单索引到 storage:', index);
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
        isStoppedByStatusMinus2: false,
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
      showOperationPaste: false,
      playerHidden: false // 关闭操作菜单时显示播放器
    })
  },

  /**
   * 添加备注
   */

  addRemark: function () {
    var index = this.data.orderArrIndex;
    if (index < 0 || index >= this.data.orderArr.length) {
      return;
    }
    var data = "orderArr[" + index + "].nxDoAddRemark";
    this.setData({
      [data]: true,
      showOperationPaste: false,
      playerHidden: false // 关闭操作菜单时显示播放器
    })
  },

  /**
   * 从这里开始朗读
   */

  startReadingFromHere: function () {
    // 关闭操作菜单
    this.setData({
      showOperationPaste: false,
      playerHidden: false // 关闭操作菜单时显示播放器
    });
    // 获取当前订单索引
    var index = this.data.orderArrIndex;
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
    console.log("resbeieiror");
    // 获取当前订单索引，用于在返回时插入新订单
    var index = this.data.orderArrIndex;
    
    // 验证订单索引是否有效（非朗读模式下必须有效）
    if (index < 0 || index >= this.data.orderArr.length) {
      console.error('[addNewPasteOrderBefore] 无效的订单索引:', index);
      wx.showToast({
        title: '请先选择订单',
        icon: 'none',
        duration: 2000
      });
      // 关闭操作菜单
      this.setData({
        showOperationPaste: false,
        playerHidden: false
      });
      return;
    }
    
    this.setData({
      showOperationPaste: false,
      playerHidden: false // 关闭操作菜单时显示播放器
    });
    
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
        isStoppedByStatusMinus2: false,
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
    // 构建跳转 URL
    var url = '../resGoodsListTask/resGoodsListTask?depFatherId=' + (this.data.depFatherId || '') +
      '&depId=' + (this.data.depId || '') + '&depName=' + encodeURIComponent(this.data.depName || '') +
      '&gbDepFatherId=-1&resFatherId=-1&depSettleType=' + depSettleType +
      '&fromOcrOrder=1&taskId=' + (this.data.taskId || '') + '&beforeId=' + + this.data.orderArr[index].nxDepartmentOrdersId;
    console.log('[addNewPasteOrderBefore] 准备跳转，URL:', url);
    // 跳转到 resGoodsList 页面，传递 fromOcrOrder 参数
    wx.navigateTo({
      url: url,
      success: function(res) {
        console.log('[addNewPasteOrderBefore] 跳转成功:', res);
      },
      fail: function(err) {
        console.error('[addNewPasteOrderBefore] 跳转失败:', err);
        wx.showToast({
          title: '跳转失败，请重试',
          icon: 'none',
          duration: 2000
        });
      }
    });
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
        // this._clearAllOrders();
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
        } catch (error) {}
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
      
      // 重新处理文本高亮（订单已修正）
      if (this.data.task) {
        this._highlightTextWithStatusMinus2Orders(this.data.orderArr, this.data.task);
      }
      
      // 保存到缓存
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
      isCheckMode: false, // 进入朗读模式，关闭检查模式
      isTTSLoading: true,
      isTTSPlaying: false,
      ttsQueue: ttsQueue,
      currentTTSIndex: startIndex - 1, // 设置为 startIndex - 1，因为 playNextInQueue 会 +1
      stoppedIndex: -1,
      stoppedOrderRef: null,
      isStoppedByStatusMinus2: false,
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
      isCheckMode: false, // 进入朗读模式，关闭检查模式
      isTTSLoading: true,
      isTTSPlaying: false,
      ttsQueue: ttsQueue,
      currentTTSIndex: -1,
      stoppedIndex: -1,
      stoppedOrderRef: null,
      isStoppedByStatusMinus2: false,
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
    console.log('[TTS] 处理订单状态为-2:', {
      orderIndex,
      orderItem
    });
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
    const stoppedOrder = orderArr[stoppedIndex] || null;
    // 检查是否因为订单状态-2而停止
    const isStoppedByStatusMinus2 = stoppedOrder && stoppedOrder.nxDoStatus == -2;

    this.setData({
      isTTSPlaying: false,
      stoppedIndex: stoppedIndex,
      stoppedOrderRef: stoppedOrder,
      isStoppedByStatusMinus2: isStoppedByStatusMinus2
    }, () => {
      // 在 setData 回调中计算停止订单的位置
      // setTimeout(() => {
      //   this._calculateStoppedOrderPosition(stoppedIndex);
      // }, 100);
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
      stoppedOrderRef: null,
      isStoppedByStatusMinus2: false
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
      } catch (e) {}
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
      isStoppedByStatusMinus2: false,
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
      isCheckMode: false, // 同时关闭检查模式
      isTTSPlaying: false,
      isTTSLoading: false,
      currentTTSIndex: -1,
      stoppedIndex: -1,
      stoppedOrderRef: null,
      isStoppedByStatusMinus2: false,
      ttsAudio: null,
      currentReadingText: '',
      ttsError: ''
    });
  },

  /**
   * 进入检查模式（显示图片+播放器，但不开始朗读）
   */
  enterReadingMode() {
    this.setData({
      isCheckMode: true
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
    console.log('[onOrderShowOperation] 收到操作菜单事件，订单索引:', index);
    if (index === undefined || index === null) {
      console.error('[onOrderShowOperation] 订单索引无效:', index);
      return;
    }
    const mockEvent = {
      currentTarget: {
        dataset: {
          index: index
        }
      }
    };
    this.showPasteOperation(mockEvent);
  },

  /**
   * 处理订单更新事件（来自 ocrOrderList 组件）
   */
  onOrderUpdated: function (e) {
    const {
      index,
      order
    } = e.detail;
    console.log('[onOrderUpdated] 订单已更新:', { index, order });
    
    if (index >= 0 && index < this.data.orderArr.length) {
      // 更新订单数组
      const orderArr = [...this.data.orderArr];
      orderArr[index] = order || orderArr[index];
      this.setData({
        orderArr: orderArr
      });
    }
  },

  /**
   * 处理文本高亮：
   * 1. 找出 nxDoStatus == 0 的订单对应的商品名称，在 OCR 文本中用绿色标记
   * 2. 找出 nxDoStatus == -2 的订单对应的商品名称，在 OCR 文本中用蓝色标记
   * 3. 找出 OCR 文本中的商品名称，如果这些商品名称在订单列表中不存在（被删除了），用红色标记
   */
  _highlightTextWithStatusMinus2Orders: function(orders, task) {
    if (!task || !task.nxOcrTaskOcrText) {
      return;
    }

    const originalText = task.nxOcrTaskOcrText;
    
    // 获取所有订单的商品名称（去重）- 使用 nxDoGoodsOriginalName 字段
    const allOrderGoodsNames = [...new Set(
      orders
        .map(order => order.nxDoGoodsOriginalName || order.nxDoGoodsName)
        .filter(name => name && name.trim())
    )];

    // 找出所有 nxDoStatus == 0 的订单的商品名称（去重）- 使用 nxDoGoodsOriginalName 字段
    const statusZeroGoodsNames = [...new Set(
      orders
        .filter(order => order.nxDoStatus == 0)
        .map(order => order.nxDoGoodsOriginalName || order.nxDoGoodsName)
        .filter(name => name && name.trim())
    )];

    // 找出所有 nxDoStatus == -2 的订单的商品名称（去重）- 使用 nxDoGoodsOriginalName 字段
    const statusMinus2GoodsNames = [...new Set(
      orders
        .filter(order => order.nxDoStatus == -2)
        .map(order => order.nxDoGoodsOriginalName || order.nxDoGoodsName)
        .filter(name => name && name.trim())
    )];

    // 如果没有需要高亮的内容，清空高亮文本
    if (statusZeroGoodsNames.length === 0 && statusMinus2GoodsNames.length === 0 && allOrderGoodsNames.length === 0) {
      this.setData({
        highlightedText: ''
      });
      return;
    }

    // 从 OCR 文本中提取所有可能的商品名称（简单匹配，基于常见的中文商品名称模式）
    // 这里我们需要找出 OCR 文本中提到的商品名称
    // 由于 OCR 文本格式可能是 "冰糖老抽两个，黄豆酱油1个" 这样的格式
    // 我们需要提取出商品名称部分
    
    // 提取 OCR 文本中的所有商品名称（通过匹配订单列表中的商品名称）
    const ocrTextGoodsNames = [];
    allOrderGoodsNames.forEach(goodsName => {
      const regex = new RegExp(goodsName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      if (regex.test(originalText)) {
        ocrTextGoodsNames.push(goodsName);
      }
    });

    // 找出被删除的商品名称（在 OCR 文本中出现，但不在当前订单列表中）
    // 这里我们需要一个更智能的方法来提取 OCR 文本中的商品名称
    // 暂时使用订单列表中的商品名称来匹配，如果 OCR 文本中有但订单列表中没有，就是被删除的
    
    // 实际上，我们需要反向思考：
    // 1. 找出 OCR 文本中所有可能的商品名称片段
    // 2. 检查这些名称是否在当前订单列表中
    // 3. 如果不在，标记为红色（被删除）
    
    // 简化方案：使用订单列表中的商品名称来匹配 OCR 文本
    // 如果 OCR 文本中有某个商品名称，但当前订单列表中没有，则标记为红色
    
    // 收集所有需要高亮的匹配项
    const matches = [];
    
    // 1. 绿色高亮：状态为 0 的订单商品名称
    statusZeroGoodsNames.forEach(goodsName => {
      const regex = new RegExp(goodsName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      let match;
      while ((match = regex.exec(originalText)) !== null) {
        matches.push({
          start: match.index,
          end: match.index + match[0].length,
          text: match[0],
          color: 'green', // 绿色：状态为 0 的订单
          goodsName: goodsName
        });
      }
    });
    
    // 2. 蓝色高亮：状态为 -2 的订单商品名称
    statusMinus2GoodsNames.forEach(goodsName => {
      const regex = new RegExp(goodsName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      let match;
      while ((match = regex.exec(originalText)) !== null) {
        // 检查是否已经被绿色标记（状态为 0 的订单）
        // 如果已经被绿色标记，就不再用蓝色标记（绿色优先级更高）
        const isAlreadyGreen = matches.some(m => 
          m.color === 'green' && 
          match.index >= m.start && 
          match.index < m.end
        );
        
        if (!isAlreadyGreen) {
          matches.push({
            start: match.index,
            end: match.index + match[0].length,
            text: match[0],
            color: 'blue', // 蓝色：状态为 -2 的订单
            goodsName: goodsName
          });
        }
      }
    });

    // 2. 红色高亮：被删除的商品名称
    // 找出在初始订单列表中存在，但在当前订单列表中不存在的商品名称
    const initialGoodsNames = this.data.initialOrderGoodsNames || [];
    if (initialGoodsNames.length > 0) {
      const deletedGoodsNames = initialGoodsNames.filter(initialName => {
        // 检查是否在当前订单列表中存在（精确匹配或包含关系）
        return !allOrderGoodsNames.some(currentName => {
          // 精确匹配
          if (currentName === initialName) return true;
          // 包含关系（处理商品名称的变体）
          if (currentName.includes(initialName) || initialName.includes(currentName)) {
            return true;
          }
          return false;
        });
      });

      // 在 OCR 文本中标记被删除的商品名称为红色
      deletedGoodsNames.forEach(goodsName => {
        const regex = new RegExp(goodsName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
        let match;
        // 重置正则表达式的 lastIndex
        regex.lastIndex = 0;
        while ((match = regex.exec(originalText)) !== null) {
          // 检查这个位置是否已经被绿色或蓝色标记
          // 如果已经被标记，就不再用红色标记（绿色和蓝色优先级更高）
          const isAlreadyMarked = matches.some(m => 
            (m.color === 'green' || m.color === 'blue') && 
            match.index >= m.start && 
            match.index < m.end
          );
          
          if (!isAlreadyMarked) {
            matches.push({
              start: match.index,
              end: match.index + match[0].length,
              text: match[0],
              color: 'red', // 红色：被删除的商品
              goodsName: goodsName
            });
          }
        }
      });
    }
    
    // 按起始位置排序
    matches.sort((a, b) => a.start - b.start);

    // 合并重叠的匹配项（优先级：绿色 > 蓝色 > 红色）
    const mergedMatches = [];
    matches.forEach(match => {
      if (mergedMatches.length === 0) {
        mergedMatches.push(match);
      } else {
        const lastMatch = mergedMatches[mergedMatches.length - 1];
        if (match.start <= lastMatch.end) {
          // 重叠，根据优先级处理
          const colorPriority = { 'green': 3, 'blue': 2, 'red': 1 };
          const matchPriority = colorPriority[match.color] || 0;
          const lastPriority = colorPriority[lastMatch.color] || 0;
          
          if (matchPriority > lastPriority) {
            // 新匹配优先级更高，替换
            mergedMatches[mergedMatches.length - 1] = match;
          } else if (matchPriority === lastPriority) {
            // 优先级相同，合并
            lastMatch.end = Math.max(lastMatch.end, match.end);
            lastMatch.text = originalText.substring(lastMatch.start, lastMatch.end);
          } else {
            // 新匹配优先级更低，忽略
            // 不添加
          }
        } else {
          // 不重叠，添加新匹配
          mergedMatches.push(match);
        }
      }
    });

    // 如果没有匹配项，清空高亮文本
    if (mergedMatches.length === 0) {
      this.setData({
        highlightedText: ''
      });
      return;
    }

    // 构建高亮后的 HTML
    let highlightedHtml = '';
    let lastIndex = 0;
    
    mergedMatches.forEach(match => {
      // 添加匹配前的普通文本
      if (match.start > lastIndex) {
        highlightedHtml += this._escapeHtml(originalText.substring(lastIndex, match.start));
      }
      // 根据颜色添加高亮的文本
      const color = match.color === 'green' ? 'green' : (match.color === 'blue' ? 'blue' : 'red');
      highlightedHtml += `<span style="color: ${color}; font-weight: bold;">${this._escapeHtml(match.text)}</span>`;
      lastIndex = match.end;
    });

    // 添加剩余的文本
    if (lastIndex < originalText.length) {
      highlightedHtml += this._escapeHtml(originalText.substring(lastIndex));
    }

    // 更新数据
    this.setData({
      highlightedText: highlightedHtml || originalText
    });
  },

  /**
   * HTML 转义工具函数
   */
  _escapeHtml: function(text) {
    if (!text) return '';
    // 手动转义 HTML 特殊字符
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  },
});
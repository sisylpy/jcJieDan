import load from '../../../../lib/load';

import apiUrl from '../../../../config.js';
import TTSHelper from '../../../lib/ttsHelper';
import {
  choiceGoodsForApply,
  updateOrder,
  deleteTaskOrder,
  getTaskOrders,
  revertTaskOrder,
  textToSpeech,
  deleteTaskData,
  finishTask
} from '../../../../lib/apiDepOrder';

import { resolveNxDoCostPriceLevel } from '../../../../lib/retailPriceLevel';

import {
  disSaveStandard,
  queryDisGoodsByQuickSearchWithDepIdCollDis,
  disDeleteStandard,
} from '../../../../lib/apiDistributer';
import {
  downDisGoods,
  disGetGoods,
} from '../../../lib/apiibook';

const globalData = getApp().globalData;
Page({
  data: {
    // === 布局/尺寸 ===
    windowWidth: 0,
    windowHeight: 0,
    imagePreviewHeight: 0, // 图片区高度（px），由 topHeightPercent 计算
    topSectionHeightRpx: 0, // 文字区高度（rpx），由 topHeightPercent 计算
    contentHeightPx: 0, // 朗读模式内容区可用高度（px）= 窗口 - 导航栏
    topHeightPercent: 40, // 上半部分高度占比 30-70%，可拖动 resize-bar 调整，持久化
    isResizing: false,
    _resizeStartY: 0,
    _resizeStartTopPercent: 40,
    statusBarHeight: 0,
    navBarHeight: 0,
    safeAreaBottom: 0, // 安全区域底部高度（rpx）
    orderListScrollMaxHeightRpx: 0, // 朗读模式订单列表最大高度（rpx）= 可用高度 - 2 个订单行
    url: '',

    // === 订单列表 ===
    orderArr: [], // 解析后的订单列表
    currentPage: 1, // 当前页码
    totalPages: 1, // 总页数
    pageSize: 10, // 每页大小
    totalOrders: 0, // 订单总数
    isLoadingRemainingPages: false, // 非朗读模式下是否正在静默加载后续页（用于显示底部「加载中」）

    // === 当前操作订单（orderArrIndex 统一表示：①商品搜索 ②编辑弹窗 ③操作菜单 ④显示推荐商品 ⑤聚焦高亮 ⑥底部留白） ===
    orderArrIndex: -1,
    strArr: [], // 配送商商品搜索结果
    nxArr: [], // 系统商品搜索结果
    searchStr: '', // 搜索关键词

    // === 操作菜单 ===
    showOperationPaste: false, // 是否显示操作菜单
    isStoppedByStatusMinus2: false, // 是否因为订单状态-2而停止
    orderItem: null, // 当前操作的订单项
    findGoods: false, // 从添加临时商品页面返回后，是否需要更新订单

    // === 编辑订单弹窗 ===
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
    // === 弹窗 ===
    showPopupWarn: false, // 是否显示警告弹窗
    popupType: '', // 弹窗类型
    warnContent: '', // 警告内容
    disStandardId: '', // 规格ID
    showCorrectionModal: false, // 是否显示修正弹窗
    correctionDefaultText: '', // 修正弹窗默认文本

    // === TTS 朗读 ===
    isTTSReading: false, // 是否正在朗读（用于控制布局）
    isCheckMode: false, // 是否在检查模式（显示图片+播放器，但不朗读）
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
    _pendingFocusOrderIndex: -1, // 聚焦输入框时先滚动再设 orderArrIndex，避免 scroll-y 先被关导致滚不动
    _ttsRequestingIndex: -1, // 正在请求的音频索引（防止重复请求）
    scrollTop: 0, // scroll-view 的滚动位置（用于手动控制滚动，单位：px）

    // === 其他 UI ===
    recognitionModalOpen: false, // 识别弹窗是否打开（用于提高下半部分 z-index，使弹窗不被图片遮挡）
    recentlyModifiedOrderIndex: -1, // 刚刚修改的订单索引（淡蓝色背景提醒，2秒后自动清除）
    showPlayerMenu: false, // 是否显示播放器菜单（展开状态）
    imageTransformCache: null, // 图片变换状态缓存（ocrImagePreview 的 transformChange 回调）
    isOrderInputFocused: false, // 订单输入框是否聚焦（用于键盘弹起时底部留白）
    scrollLockedForGoods: false // 是否因显示推荐商品/搜索商品而锁定滚动（由 observer 计算）
  },

  // 搜索防抖定时器（不放在 data 中）
  searchDebounceTimer: null,
  // 当前搜索请求 ID，用于处理请求竞态
  searchRequestId: 0,

  observers: {
    'orderArrIndex, strArr, nxArr': function () {
      this._updateScrollLockForGoods();
    },
    'orderArr': function () {
      this._updateScrollLockForGoods();
    }
  },

  _updateScrollLockForGoods: function () {
    const { orderArrIndex, strArr, nxArr, orderArr } = this.data;
    let locked = false;
    if (orderArrIndex >= 0 && orderArr && orderArr.length > 0) {
      const item = orderArr[orderArrIndex];
      const hasSearch = (strArr && strArr.length > 0) || (nxArr && nxArr.length > 0);
      const hasRecommended = item && item.nxDoStatus != 0 && item.nxDoIsAgent == '2' &&
        item.nxDoQuantity && item.nxDoQuantity !== '' && item.nxDoStandard && item.nxDoStandard !== '' &&
        ((item.nxDistributerGoodsEntityList && item.nxDistributerGoodsEntityList.length > 0) ||
          (item.nxGoodsEntities && item.nxGoodsEntities.length > 0));
      locked = hasSearch || (hasRecommended && !hasSearch);
    }
    if (this.data.scrollLockedForGoods !== locked) {
      this.setData({ scrollLockedForGoods: locked });
    }
  },

  /** 根据 topHeightPercent 更新上半部分高度（图片 px、文字 rpx） */
  _updateTopSectionHeight: function () {
    const { topHeightPercent, contentHeightPx, windowHeight, navBarHeight } = this.data;
    const imagePreviewHeight = Math.round(contentHeightPx * topHeightPercent / 100);
    const topSectionHeightRpx = Math.round((windowHeight - navBarHeight) * topHeightPercent / 100);
    this.setData({ imagePreviewHeight, topSectionHeightRpx });
  },

  /** resize-bar 触摸开始 */
  onResizeTouchStart: function (e) {
    this._isResizing = true; // 同步标志，避免 setData 异步导致松手后 touchmove 仍执行
    this._resizeLastUpdateTime = 0; // 重置节流，确保首次 move 立即响应
    this.setData({
      isResizing: true,
      _resizeStartY: e.touches[0].pageY,
      _resizeStartTopPercent: this.data.topHeightPercent
    });
  },

  /** resize-bar 触摸移动：根据 deltaY 调整 topHeightPercent（30-70%），节流减少 setData 频率 */
  onResizeTouchMove: function (e) {
    if (!this._isResizing) return; // 用同步变量，松手后立即停止，不依赖 setData
    const contentHeightPx = this.data.contentHeightPx || 400;
    const deltaY = e.touches[0].pageY - this.data._resizeStartY;
    const percentDelta = (deltaY / contentHeightPx) * 100;
    let newPercent = this.data._resizeStartTopPercent + percentDelta;
    newPercent = Math.max(30, Math.min(70, newPercent));
    const now = Date.now();
    // 节流：约每 50ms 更新一次，避免 touchmove 高频触发导致卡顿
    if (now - this._resizeLastUpdateTime < 50) return;
    this._resizeLastUpdateTime = now;
    const imagePreviewHeight = Math.round(contentHeightPx * newPercent / 100);
    const topSectionHeightRpx = Math.round((this.data.windowHeight - this.data.navBarHeight) * newPercent / 100);
    this.setData({ topHeightPercent: newPercent, imagePreviewHeight, topSectionHeightRpx });
  },

  /** resize-bar 触摸结束：持久化比例 */
  onResizeTouchEnd: function () {
    this._isResizing = false; // 立即停止，防止后续 touchmove 继续执行
    this.setData({ isResizing: false });
    try {
      wx.setStorageSync('ocrOrderReadingTopHeightPercent', this.data.topHeightPercent);
    } catch (e) {}
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
    // 朗读模式内容区高度（px）
    const contentHeightPx = Math.round((systemInfo.windowHeight || 600) - navBarHeight / globalData.rpxR);
    // 从 storage 读取上次保存的上下比例（30-70%）
    let topHeightPercent = 40;
    try {
      const saved = wx.getStorageSync('ocrOrderReadingTopHeightPercent');
      if (typeof saved === 'number' && saved >= 30 && saved <= 70) {
        topHeightPercent = saved;
      }
    } catch (e) {}
    const imagePreviewHeight = Math.round(contentHeightPx * topHeightPercent / 100);
    const topSectionHeightRpx = Math.round((windowHeight - navBarHeight) * topHeightPercent / 100);
    const imagePreviewHeightRpx = imagePreviewHeight * globalData.rpxR;
    const orderRowHeightRpx = 120; // 单行订单约 120rpx，预留 2 行
    const orderListScrollMaxHeightRpx = Math.max(200, windowHeight - navBarHeight - imagePreviewHeightRpx - orderRowHeightRpx * 2);
    this.setData({
      windowWidth: windowWidth,
      windowHeight: windowHeight,
      imagePreviewHeight: imagePreviewHeight,
      topSectionHeightRpx: topSectionHeightRpx,
      contentHeightPx: contentHeightPx,
      topHeightPercent: topHeightPercent,
      statusBarHeight: statusBarHeight,
      navBarHeight: navBarHeight,
      safeAreaBottom: safeAreaBottomRpx, // 安全区域底部高度（rpx）
      url: apiUrl.server,
      orderListScrollMaxHeightRpx: orderListScrollMaxHeightRpx,
      taskId: options.taskId,
      depId: null,
      depFatherId: null,
      depName: options.depName
      });
    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo,
        disId: userInfo.nxDiuDistributerId,
        userId: userInfo.nxDepartmentUserId || userInfo.nxDepartmentUserId,
      });
    }
   
   
    this._initTaskOrder();

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
        // 错误回调：播放失败则停止朗读，不继续播放下一条；弹窗提示错误原因
        console.error('[ocrOrder] TTS播放错误:', error);
        const errorMsg = error.errMsg || '播放失败';
        this.setData({
          ttsAudio: null,
          isTTSPlaying: false,
          isTTSReading: false,
          ttsError: errorMsg
        });
        wx.showModal({
          title: '播放失败',
          content: errorMsg,
          showCancel: false,
          confirmText: '知道了'
        });
      },
      onCanplay: (audioContext) => {
        // 音频可以播放回调
      }
    });
   
  },

  onShow: function () {
   
    if (this.data.findGoods) {
      // onHide 会清空 isTTSReading 等，需从 storage 恢复朗读状态判断（添加临时商品前已保存）
      var savedTTSStateForFindGoods = wx.getStorageSync('ocrOrderTTSState');
      if (savedTTSStateForFindGoods && savedTTSStateForFindGoods.isTTSReading) {
        this.setData({
          isTTSReading: true,
          isCheckMode: false,
          stoppedIndex: savedTTSStateForFindGoods.stoppedIndex >= 0 ? savedTTSStateForFindGoods.stoppedIndex : -1,
          isStoppedByStatusMinus2: savedTTSStateForFindGoods.isStoppedByStatusMinus2 || false
        });
      }
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
          selectedGoodsName: this.data.name,
          
        });
      }
      // 确保 orderArrIndex 有效
      if (this.data.orderArrIndex < 0) {
        this.setData({
          findGoods: false
        });
        return;
      }
      // 保存订单索引和朗读状态，用于后续朗读
      const orderIndex = this.data.orderArrIndex;
      // 检查是否在朗读模式（包括因为订单状态-2而停止的情况）
      var wasReading = this.data.isTTSReading || this.data.isTTSPlaying;
      var wasPaused = this.data.stoppedIndex >= 0 && !this.data.isTTSPlaying && this.data.isTTSReading;
      var wasStoppedByStatusMinus2 = this.data.isStoppedByStatusMinus2; // 是否因为订单状态-2而停止
      // 如果之前在朗读模式（包括因为订单状态-2而停止），先清除保存的朗读状态，避免后面的逻辑冲突
      if (wasReading || wasPaused || wasStoppedByStatusMinus2) {
        wx.removeStorageSync('ocrOrderTTSState');
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
          if (!isStillStatusMinus2) {
            // 如果订单状态不再是-2，清除停止标记并继续朗读
            this.setData({
              isStoppedByStatusMinus2: false,
              stoppedIndex: -1,
              stoppedOrderRef: null
            });
            const startIndex = Math.max(0, orderIndex); // 从当前订单开始朗读
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
      // 清除 orderArrIndex，否则从「在之前加新订单」返回时，新订单刚好占据原 orderArrIndex 位置，
      // 会一直匹配 orderArrIndex == orderIndex，导致新订单持续显示 orderstop 淡蓝色底色
      this.setData({ orderArrIndex: -1 });
      
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
              stoppedIndex = stoppedIndex;
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
   * 页面隐藏时停止朗读（切换页面、跳转等）
   */
  onHide: function() {
    if (this.ttsHelper) {
      try {
        this.ttsHelper.stop();
      } catch (e) {
        console.warn('[ocrOrder] onHide 停止 TTS 失败:', e);
      }
    }
    this.setData({
      isTTSPlaying: false,
      isTTSReading: false,
      stoppedIndex: -1,
      stoppedOrderRef: null,
      isStoppedByStatusMinus2: false
    });
   
  },

  /**
   * 页面卸载时停止朗读并清理
   */
  onUnload: function() {
    if (this.ttsHelper) {
      try {
        this.ttsHelper.stop();
      } catch (e) {
        console.warn('[ocrOrder] onUnload 停止 TTS 失败:', e);
      }
    }
    
    wx.removeStorageSync('ocrOrderTTSState');
  },

  _initTaskOrder() {
    const that = this;
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
    // 先获取第一页
    getTaskOrders(that.data.taskId, {
      page: 1,
      limit: that.data.pageSize,
      processStatus: true
    }).then(res => {
      if (res.result.code != 0) {
        load.hideLoading();
        return;
      }
      console.log("re",res.result);
      const task = res.result.task;
      const totalOrders = res.result.totalOrders;
      const totalPages = res.result.page.totalPage;
      const pageSize = res.result.page.pageSize;
      let orderArr = res.result.page.list || [];
      const orderRowHeightRpx = 120;
      const readingListMaxRpx = task.nxOcrTaskType == 3
        ? Math.max(200, (that.data.windowHeight - that.data.navBarHeight) * 2 / 3 - orderRowHeightRpx * 2)
        : that.data.orderListScrollMaxHeightRpx;
      that.setData({
        orderArr: orderArr,
        task: task,
        depId: task.nxOcrTaskDepartmentId,
        depFatherId: task.nxOcrTaskDepartmentFatherId,
        depName: task.nxOcrTaskDepartmentName,
        totalOrders: totalOrders,
        currentPage: 1,
        totalPages: totalPages,
        pageSize: pageSize,
        orderListScrollMaxHeightRpx: readingListMaxRpx,
        isLoadingRemainingPages: totalPages > 1 // 有多页时首屏就显示「加载更多」，避免第二页返回太快看不到
      });
      load.hideLoading(); // 第一页加载完即关闭弹窗，用户可先查看
      if (totalPages <= 1) {
        return;
      }
      // 后台静默加载剩余页（不弹窗）
      const fetchRemainingPages = (page) => {
        if (page > totalPages) return Promise.resolve();
        return getTaskOrders(that.data.taskId, {
          page: page,
          limit: pageSize,
          processStatus: true
        }).then(res => {
          console.log("taksksktotalOrders", res.result)

          if (res.result.code == 0 && res.result.page.list && res.result.page.list.length > 0) {
            orderArr = [...orderArr, ...res.result.page.list];
            that.setData({
              orderArr: orderArr,
              currentPage: page
            });
          }
          return fetchRemainingPages(page + 1);
        }).catch(() => {});
      };
      return fetchRemainingPages(2).then(() => {
        that.setData({ isLoadingRemainingPages: false });
      }).catch(() => {
        that.setData({ isLoadingRemainingPages: false });
      });
    }).catch(() => {
      load.hideLoading();
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
      var updateData = { [remarkData]: e.detail.value };
      if (e.detail.value && e.detail.value.length > 0) {
        updateData["orderArr[" + index + "].nxDoAddRemark"] = false;
      }
      this.setData(updateData);
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
    // 先找到所有 nxDoIsAgent == '2' 的项，把它们都改为 -1（实现开关功能）
    // 使用 == 而不是 ===，兼容数字和字符串类型
    var updateData = {};
    for (var i = 0; i < this.data.orderArr.length; i++) {
      if (this.data.orderArr[i].nxDoIsAgent == '2' || this.data.orderArr[i].nxDoIsAgent === 2) {
        updateData["orderArr[" + i + "].nxDoIsAgent"] = -1;
      }
    }
    // 如果当前点击的项不是 '2'，就设置为 '2'（开关打开）
    if (agent != '2' && agent !== 2) {
      updateData[dataIsAgent] = '2'; // 设置为字符串 '2'，与 WXML 中的判断一致
      updateData.orderArrIndex = index;
      this.setData(updateData, () => {
        // 展开商品列表后，滚动到该订单顶部（朗读模式已有 scrollToOrderItem，这里补充显示商品时的滚动）
        const that = this;
        setTimeout(() => {
          that.scrollToOrderItem(index);
        }, 150); // 延迟等待 DOM 更新（商品列表展开）
      });
    } else {
      // 如果当前点击的项已经是 '2'，在上面已经改为 -1 了，关闭商品列表
      updateData.orderArrIndex = -1;
      updateData.isOrderInputFocused = false;
      // 朗读状态下关闭商品列表时，清除 isStoppedByStatusMinus2，使「继续朗读」按钮显示
      if (this.data.isTTSReading && this.data.isStoppedByStatusMinus2) {
        updateData.isStoppedByStatusMinus2 = false;
      }
      // 用户修改了名字、显示了搜索结果或推荐商品，但未选择商品就关闭时，恢复显示原文 nxDoGoodsNameOriginal
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
      isOrderInputFocused: false,
      [dataIsAgent]: -1,
      nxArr: [],
      strArr: []
    };
    // 用户修改了名字、显示了搜索结果或推荐商品，但未选择商品就关闭时，恢复显示原文 nxDoGoodsNameOriginal
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
    // 朗读模式下 scroll-y="{{orderArrIndex < 0}}"：若先设 orderArrIndex 会关掉滚动，scrollToOrderItem 不生效。
    // 先触发滚动（只设 scrollIntoViewId），等 onScrollToItem 里再设 orderArrIndex。
    this.setData({
      scrollIntoViewId: `order-item-${index}`,
      _pendingFocusOrderIndex: index
    }, () => {
      const that = this;
      // 若组件未触发 scrollToItem（如非朗读模式），延迟后仍要设 orderArrIndex
      setTimeout(() => {
        const pending = that.data._pendingFocusOrderIndex;
        if (pending >= 0) {
          const keyIsAgent = "orderArr[" + pending + "].nxDoIsAgent";
          that.setData({
            orderArrIndex: pending,
            [keyIsAgent]: '2',
            nxArr: [],
            strArr: [],
            _pendingFocusOrderIndex: -1
          });
        }
      }, 350);
    });
  },

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

    // 执行搜索（传入 index，避免 blur 先于 confirm 触发导致 orderArrIndex 被清 -1）
    this.getSearchStringByValue(searchValue, index);
  },

  /**
   * 根据商品名称搜索商品（根据传入的值搜索）
   * @param {String} searchValue 搜索关键词
   * @param {Number} orderIndex 订单索引（可选，用于搜索返回时恢复 orderArrIndex，解决 blur 先于 confirm 导致不显示结果）
   */
  getSearchStringByValue: function (searchValue, orderIndex) {
    if (!searchValue || searchValue.trim().length === 0) {
      return;
    }

    const requestId = ++this.searchRequestId;
    var data = {
      disId: this.data.disId,
      searchStr: searchValue.trim(),
      depId: this.data.depId,
    }
    this.setData({
      searchStr: searchValue.trim(),
    })
    load.showLoading("搜索商品中")
    queryDisGoodsByQuickSearchWithDepIdCollDis(data).then(res => {
      // 竞态处理：只处理最新请求的响应
      if (requestId !== this.searchRequestId) return;
      load.hideLoading();
      if (res.result.code == 0) {
        console.log("resssocr", res.result.data);
        const resultData = res.result.data || {};
        const disArr = resultData.disArr || [];
        const nxArr = resultData.nxArr || [];
        const totalCount = disArr.length + nxArr.length;
        
        // const disArr = res.result.data || [];
        // const totalCount = disArr.length ;
        // 使用传入的 orderIndex，避免 blur 先于 confirm 触发导致 this.data.orderArrIndex 已被清 -1
        const targetIndex = (orderIndex !== undefined && orderIndex >= 0) ? orderIndex : this.data.orderArrIndex;
        const currentOrderAfterSearch = this.data.orderArr[targetIndex];
        console.log('[ocrOrder] 搜索结果:', {
          disArrCount: disArr.length,
          nxArrCount: nxArr.length,
          totalCount,
          orderArrIndex: this.data.orderArrIndex,
          targetIndex,
          currentOrder: currentOrderAfterSearch,
          recommendGoodsListLength: currentOrderAfterSearch?.nxDistributerGoodsEntityList?.length || 0,
          recommendGoodsList: currentOrderAfterSearch?.nxDistributerGoodsEntityList
        });

        // 只更新搜索结果 strArr/nxArr，不清空订单自带的推荐商品（nxDistributerGoodsEntityList、nxGoodsEntities）
        // 展示逻辑：strArr/nxArr 有值时显示搜索结果；无值时显示订单推荐商品
        // 恢复 orderArrIndex，解决 blur 先于 confirm 导致不显示结果的问题
        var updateDataAfterSearch = {
          strArr: disArr,
          nxArr: nxArr,
        };
        if (targetIndex >= 0) {
          updateDataAfterSearch.orderArrIndex = targetIndex;
          updateDataAfterSearch["orderArr[" + targetIndex + "].nxDoIsAgent"] = '2'; // 确保展开商品列表
        }

        this.setData(updateDataAfterSearch);

        // 如果有搜索结果，关闭键盘并收起底部留白
        if (totalCount > 0) {
          wx.hideKeyboard();
          this.setData({ isOrderInputFocused: false });
        } else {
          // 如果没有搜索结果，检查是否有推荐商品
          // const currentOrder = this.data.orderArr[targetIndex];
          // const hasRecommendGoods = currentOrder &&
          //   currentOrder.nxDistributerGoodsEntityList &&
          //   currentOrder.nxDistributerGoodsEntityList.length > 0;
          // console.log('[ocrOrder] 无搜索结果，检查推荐商品:', {
          //   hasRecommendGoods,
          //   recommendCount: currentOrder?.nxDistributerGoodsEntityList?.length || 0,
          //   nxDoIsAgent: currentOrder?.nxDoIsAgent,
          //   targetIndex
          // });

          // // 如果没有搜索结果，提示用户并关闭键盘
          // wx.showToast({
          //   title: '未找到相关商品',
          //   icon: 'none',
          //   duration: 2000
          // });
          // wx.hideKeyboard();
          // this.setData({ isOrderInputFocused: false });
        }
      } else {
        if (requestId !== this.searchRequestId) return;
        wx.showToast({
          title: res.result.msg || '搜索失败',
          icon: 'none'
        })
        this.setData({
          nxArr: [],
          strArr: [],
          isOrderInputFocused: false
        })
        wx.hideKeyboard();
      }
    })
    .catch(err => {
      if (requestId !== this.searchRequestId) return;
      load.hideLoading();
      console.error('[ocrOrder] 搜索失败:', err);
      wx.showToast({
        title: '搜索失败，请重试',
        icon: 'none'
      })
      this.setData({
        nxArr: [],
        strArr: [],
        isOrderInputFocused: false
      })
      wx.hideKeyboard();
    })
  },

  /**
   * 根据商品名称搜索商品（输入时触发）- 0.5 秒防抖
   */
  getSearchString: function (e) {
    const value = (e.detail && e.detail.value) ? e.detail.value.trim() : '';
    this.setData({ searchStr: e.detail ? e.detail.value : '' });

    // 清空输入时立即清除结果，不等待防抖
    if (value.length === 0) {
      if (this.searchDebounceTimer) {
        clearTimeout(this.searchDebounceTimer);
        this.searchDebounceTimer = null;
      }
      this.setData({
        strArr: [],
        nxArr: [],
        searchStr: '',
      });
      return;
    }

    // 清除之前的防抖定时器
    if (this.searchDebounceTimer) {
      clearTimeout(this.searchDebounceTimer);
    }

    // 0.5 秒防抖
    this.searchDebounceTimer = setTimeout(() => {
      this.searchDebounceTimer = null;
      this.getSearchStringByValue(value, this.data.orderArrIndex);
    }, 500);
  },

  /**
   * 关闭搜索结果
   */

  closeStr: function () {
    this.setData({
      strArr: [],
      nxArr: [],
      orderArrIndex: -1,
      isOrderInputFocused: false,
    })
  },

  /**
   * 选择商品（从搜索结果中选择）
   */

  saveOrder: function (e) {
    const index = e.currentTarget.dataset.index;
    const goodsId = e.currentTarget.dataset.id;
    const selectedGoodsName = e.currentTarget.dataset.name || '';
    const item = e.currentTarget.dataset.item;
    console.log('[saveOrder] 从搜索结果选择商品，索引:', index, 'goodsId:', goodsId, 'ssee',e);
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

        // 更新 orderArr 和 task 统计，使页面显示正确
        const updatedArr = [...this.data.orderArr];
        updatedArr[index] = updatedOrder;
        const task = this.data.task || {};
        const updateData = {
          orderArr: updatedArr,
          orderArrIndex: -1,
          isOrderInputFocused: false,
          findGoods: false,
          name: '',
          selectedGoodsName: '',
          recentlyModifiedOrderIndex: index
        };
        // 若接口返回 task 则用接口数据，否则本地递增完成数、递减未完成数（仅当订单从待匹配变为已匹配时）
        const wasPending = currentOrderBeforeUpdate && (currentOrderBeforeUpdate.nxDoStatus == 0 || currentOrderBeforeUpdate.nxDoStatus == -2);
        const isNowCompleted = updatedOrder && updatedOrder.nxDoStatus != 0 && updatedOrder.nxDoStatus != -2;
        console.log('[_choiceGoods] 任务更新条件:', {
          wasPending,
          isNowCompleted,
          before_nxDoStatus: currentOrderBeforeUpdate?.nxDoStatus,
          after_nxDoStatus: updatedOrder?.nxDoStatus,
          taskHasCounts: task.nxOcrTaskCompletedOrders !== undefined || task.nxOcrTaskPendingOrders !== undefined,
          resHasTask: !!res.result.task
        });
        if (res.result.task) {
          updateData.task = res.result.task;
          console.log('[_choiceGoods] 使用接口返回的 task:', res.result.task);
        } else if (wasPending && isNowCompleted && (task.nxOcrTaskCompletedOrders !== undefined || task.nxOcrTaskPendingOrders !== undefined)) {
          const newPending = Math.max(0, (task.nxOcrTaskPendingOrders || 0) - 1);
          updateData.task = {
            ...task,
            nxOcrTaskCompletedOrders: (task.nxOcrTaskCompletedOrders || 0) + 1,
            nxOcrTaskPendingOrders: newPending,
            nxOcrTaskStatus: newPending === 0 ? 2 : (task.nxOcrTaskStatus || 1)
          };
          console.log('[_choiceGoods] 本地更新 task:', {
            newPending,
            nxOcrTaskCompletedOrders: updateData.task.nxOcrTaskCompletedOrders,
            nxOcrTaskPendingOrders: updateData.task.nxOcrTaskPendingOrders,
            nxOcrTaskStatus: updateData.task.nxOcrTaskStatus
          });
        } else {
          console.log('[_choiceGoods] 未更新 task，原因: wasPending=', wasPending, 'isNowCompleted=', isNowCompleted);
        }
        const finalTask = updateData.task || task;
        const shouldShowModal = finalTask.nxOcrTaskStatus == 2 || (finalTask.nxOcrTaskPendingOrders === 0 && (finalTask.nxOcrTaskTotalOrders || 0) > 0);
        console.log('[_choiceGoods] 弹窗判断:', {
          finalTask: { nxOcrTaskStatus: finalTask.nxOcrTaskStatus, nxOcrTaskPendingOrders: finalTask.nxOcrTaskPendingOrders, nxOcrTaskTotalOrders: finalTask.nxOcrTaskTotalOrders },
          shouldShowModal
        });
      
        // 状态 2：弹窗；点击「检查」关闭，点击「完成」调用 finishTask 并返回上一页
        //“任务订单已全部完成， 检查， 完成” ，如果点击 “检查”则关闭弹窗，
        //如果点击“完成”
        // [已屏蔽] 不再弹出任务完成弹窗
        if (false && shouldShowModal) {
          console.log('[_choiceGoods] 显示任务完成弹窗');
          wx.showModal({
            title: '任务订单已全部完成',
            content: '任务订单已全部完成，请检查',
            confirmText: '完成',
            cancelText: '检查',
            success: (res) => {
              if (res.confirm) {
                const taskId = finalTask.nxOcrTaskId || this.data.task?.nxOcrTaskId;
                if (taskId) {
                  load.showLoading('完成中');
                  finishTask(taskId).then((result) => {
                    load.hideLoading();
                    if (result.result && result.result.code == 0) {
                      wx.navigateBack();
                    } else {
                      wx.showToast({
                        title: (result.result && result.result.msg) || '完成失败',
                        icon: 'none'
                      });
                    }
                  }).catch(() => {
                    load.hideLoading();
                  });
                } else {
                  wx.showToast({ title: '任务ID不存在', icon: 'none' });
                }
              }
            }
          });
        } else {
          console.log('[_choiceGoods] 不显示弹窗');
        }

        
      
        wx.removeStorageSync('ocrOrderAddGoodsIndex');
        this.setData(updateData, () => {
          // setData 是异步的，必须在回调中执行 onSuccess，确保 this.data.orderArr 已更新
          // 否则 saveOrder 回调里读取的订单仍是旧数据（-2），导致不继续朗读
          const that = this;
          setTimeout(() => {
            if (that.data.recentlyModifiedOrderIndex === index) {
              that.setData({ recentlyModifiedOrderIndex: -1 });
            }
          }, 2000);
          console.log('[_choiceGoods] 状态已重置');
          if (onSuccess && typeof onSuccess === 'function') {
            console.log('[_choiceGoods] 调用成功回调（setData 完成后）');
            try {
              onSuccess();
              console.log('[_choiceGoods] 成功回调执行完成');
            } catch (e) {
              console.error('[_choiceGoods] 成功回调执行出错:', e);
            }
          } else {
            console.log('[_choiceGoods] 没有成功回调或回调不是函数');
          }
        });
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


  finishTask(){
    var that  = this;
    wx.showModal({
      title: '任务订单已全部完成',
      content: '任务订单已全部完成，请检查',
      confirmText: '完成',
      cancelText: '检查',
      success: (res) => {
        if (res.confirm) {

          console.log("tasss", that.data.task)
          const taskId = that.data.task.nxOcrTaskId ;
          
          if (taskId) {
            load.showLoading('完成中');
            finishTask(taskId).then((result) => {
              load.hideLoading();
              if (result.result && result.result.code == 0) {
                wx.navigateBack();
              } else {
                wx.showToast({
                  title: (result.result && result.result.msg) || '完成失败',
                  icon: 'none'
                });
              }
            }).catch(() => {
              load.hideLoading();
            });
          } else {
            wx.showToast({ title: '任务ID不存在', icon: 'none' });
          }
        }
      }
    });
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
        });
        // 朗读模式下（含因-2停止）需传入回调，修改完成后继续朗读
        const wasReading = that.data.isTTSReading || that.data.isTTSPlaying;
        const wasPaused = that.data.stoppedIndex >= 0 && !that.data.isTTSPlaying && that.data.isTTSReading;
        const wasStoppedByStatusMinus2 = that.data.isStoppedByStatusMinus2;
        const onSuccess = (wasReading || wasPaused || wasStoppedByStatusMinus2) ? () => {
          const updatedOrder = that.data.orderArr[orderIndex];
          const isStillStatusMinus2 = updatedOrder && updatedOrder.nxDoStatus == -2;
          if (!isStillStatusMinus2) {
            that.setData({ isStoppedByStatusMinus2: false, stoppedIndex: -1, stoppedOrderRef: null });
            that.readOrderListFromIndex(Math.max(0, orderIndex));
          }
        } : undefined;
        that._choiceGoods(onSuccess);
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
   * 重新识别：将已保存订单（status=0）恢复到待识别状态（status=-2），用原始解析数据覆盖，需重新选择商品
   */
  revertOrder() {
    const index = this.data.orderArrIndex;
    const arr = this.data.orderArr;
    const orderItem = arr[index];
    if (!orderItem || !orderItem.nxDepartmentOrdersId) {
      wx.showToast({ title: '订单未保存，无法重新识别', icon: 'none' });
      return;
    }
    const id = orderItem.nxDepartmentOrdersId;
    const that = this;
    this.setData({ showOperationPaste: false });
    load.showLoading('重新识别中');
    revertTaskOrder(id).then(res => {
      load.hideLoading();
      if (res.result && res.result.code == 0) {
       
        const updatedOrder = res.result.data;
        console.log("fanhuiupdatedOrder", updatedOrder);
        if (!updatedOrder) {
          wx.showToast({ title: '接口返回数据异常', icon: 'none' });
          return;
        }
        const newArr = arr.slice();
        newArr[index] = { ...orderItem, ...updatedOrder };
        const task = that.data.task || {};
        const wasCompleted = orderItem.nxDoStatus == 0;
        const taskToSet = {
          ...task,
          nxOcrTaskCompletedOrders: wasCompleted ? Math.max(0, (task.nxOcrTaskCompletedOrders || 0) - 1) : (task.nxOcrTaskCompletedOrders || 0),
          nxOcrTaskPendingOrders: wasCompleted ? (task.nxOcrTaskPendingOrders || 0) + 1 : (task.nxOcrTaskPendingOrders || 0)
        };
        that.setData({
          orderArr: newArr,
          orderArrIndex: -1,
          orderItem: null,
          task: taskToSet
        });
        wx.showToast({ title: '已恢复为待识别，请重新选择商品', icon: 'success' });
        // 若之前因 status=-2 停止朗读，可从此订单继续
        if (that.data.isStoppedByStatusMinus2 && that.data.stoppedIndex === index) {
          that.setData({ isStoppedByStatusMinus2: false, stoppedIndex: -1, stoppedOrderRef: null });
          that.readOrderListFromIndex(index);
        }
      } else {
        wx.showToast({ title: res.result?.msg || '重新识别失败', icon: 'none' });
      }
    }).catch(() => {
      load.hideLoading();
      wx.showToast({ title: '请检查网络', icon: 'none' });
    });
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
      showOperationPaste: false
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
          var newTotalOrders = Math.max(0, (that.data.totalOrders || 0) - 1);
          var pageSize = that.data.pageSize || 10;
          let taskToSet = res.result.task;
          if (!taskToSet) {
            const task = that.data.task || {};
            const wasCompleted = orderItem && orderItem.nxDoStatus != 0 && orderItem.nxDoStatus != -2;
            taskToSet = {
              ...task,
              nxOcrTaskTotalOrders: Math.max(0, (task.nxOcrTaskTotalOrders || 0) - 1),
              nxOcrTaskCompletedOrders: wasCompleted ? Math.max(0, (task.nxOcrTaskCompletedOrders || 0) - 1) : (task.nxOcrTaskCompletedOrders || 0),
              nxOcrTaskPendingOrders: !wasCompleted ? Math.max(0, (task.nxOcrTaskPendingOrders || 0) - 1) : (task.nxOcrTaskPendingOrders || 0)
            };
            const newPending = taskToSet.nxOcrTaskPendingOrders;
            taskToSet.nxOcrTaskStatus = newPending === 0 && (taskToSet.nxOcrTaskTotalOrders || 0) > 0 ? 2 : (task.nxOcrTaskStatus || 1);
          }
          that.setData({
            task: taskToSet,
            orderArr: filteredArr,
            orderArrIndex: -1, // 关闭搜索结果
            strArr: [],
            nxArr: [],
            orderItem: null,
            totalOrders: newTotalOrders,
            totalPages: Math.max(1, Math.ceil(newTotalOrders / pageSize)),
          });
          // 更新缓存
          wx.showToast({
            title: '删除成功',
            icon: 'success'
          });
          // 删除后判断任务状态：若全部完成则弹窗
          const finalTask = taskToSet;
          const shouldShowModal = finalTask && (finalTask.nxOcrTaskStatus == 2 || (finalTask.nxOcrTaskPendingOrders === 0 && (finalTask.nxOcrTaskTotalOrders || 0) > 0));
          if (shouldShowModal) {
            wx.showModal({
              title: '任务订单已全部完成',
              content: '任务订单已全部完成，请检查',
              confirmText: '完成',
              cancelText: '检查',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  const taskId = finalTask.nxOcrTaskId || that.data.task?.nxOcrTaskId;
                  if (taskId) {
                    load.showLoading('完成中');
                    finishTask(taskId).then((result) => {
                      load.hideLoading();
                      if (result.result && result.result.code == 0) {
                        wx.navigateBack();
                      } else {
                        wx.showToast({
                          title: (result.result && result.result.msg) || '完成失败',
                          icon: 'none'
                        });
                      }
                    }).catch(() => {
                      load.hideLoading();
                    });
                  } else {
                    wx.showToast({ title: '任务ID不存在', icon: 'none' });
                  }
                }
              }
            });
          }
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
    var newTotalOrders = Math.max(0, (this.data.totalOrders || 0) - 1);
    var pageSize = this.data.pageSize || 10;
    this.setData({
      orderArr: arr,
      orderArrIndex: -1, // 关闭搜索结果
      strArr: [],
      nxArr: [],
      orderItem: null,
      totalOrders: newTotalOrders,
      totalPages: Math.max(1, Math.ceil(newTotalOrders / pageSize)),
    });
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
      })
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


  closeCheck(){
    this.setData({
      isCheckMode: false
    })

  },

  /**
   * 返回上一页
   */

  toBack: function () {
    if (this.data.isCheckMode) {
      this.setData({ isCheckMode: false });
    } else if (this.data.isTTSReading) {
      // 停止 TTS 播放，否则 onPlayEnd 等回调可能干扰状态
      if (this.ttsHelper) {
        try { this.ttsHelper.stop(); } catch (e) {}
      }
      if (this.data.ttsAudio) {
        this.data.ttsAudio.stop();
        this.data.ttsAudio.destroy();
      }
      try { wx.removeStorageSync('ocrOrderTTSState'); } catch (e) {}
      this.setData({
        isCheckMode: false,
        isTTSReading: false,
        isTTSPlaying: false,
        isTTSLoading: false,
        stoppedIndex: -1,
        isStoppedByStatusMinus2: false,
        ttsAudio: null,
        currentTTSIndex: -1,
        stoppedOrderRef: null,
        currentReadingText: '',
        ttsError: '',
        ttsAudioCache: {},
        ttsQueue: [],
        ttsSessionId: '',
        showPlayerMenu: false
      });
    } else {
      wx.navigateBack();
    }
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
    // 取消前面选择的订单：收起其他订单的推荐/搜索列表，清空搜索结果
    var updateData = {
      orderArrIndex: index,
      showOperationPaste: true,
      orderItem: this.data.orderArr[index],
      strArr: [],
      nxArr: []
    };
    for (var i = 0; i < this.data.orderArr.length; i++) {
      if (this.data.orderArr[i].nxDoIsAgent === 2 || this.data.orderArr[i].nxDoIsAgent === '2') {
        updateData['orderArr[' + i + '].nxDoIsAgent'] = -1;
      }
    }
    this.setData(updateData);
  },

  /**
   * 处理添加临时商品事件（来自 ocrOrderList 组件）
   */
  onRecognitionModalChange: function(e) {
    const { show } = e.detail;
    this.setData({ recognitionModalOpen: !!show });
  },

  onOrderAddDisAlias: function(e) {
    const { index } = e.detail;
    this.setData({ orderArrIndex: index }, () => {
      this.addDisAlias();
    });
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
      showOperationPaste: false
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
        isStoppedByStatusMinus2: this.data.isStoppedByStatusMinus2 || false,
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
    const updateData = {
      showOperationPaste: false,
      orderArrIndex: -1 // 清除聚焦状态，避免关闭菜单后订单仍显示 orderstop
    };
    // 朗读状态下关闭操作菜单时，清除 isStoppedByStatusMinus2，使「继续朗读」按钮显示
    if (this.data.isTTSReading && this.data.isStoppedByStatusMinus2) {
      updateData.isStoppedByStatusMinus2 = false;
    }
    this.setData(updateData);
  },

  /**
   * 添加备注：关闭菜单，显示备注输入框，滚动到该订单
   */
  addRemark: function () {
    var index = this.data.orderArrIndex;
    if (index < 0 || index >= this.data.orderArr.length) {
      return;
    }
    var data = "orderArr[" + index + "].nxDoAddRemark";
    this.setData({
      [data]: true,
      showOperationPaste: false
    }, () => {
      this.scrollToOrderItem(index);
    });
  },

  /**
   * 清除备注：将该订单的 nxDoRemark 设为空字符串
   */
  clearRemark: function () {
    var index = this.data.orderArrIndex;
    if (index < 0 || index >= this.data.orderArr.length) {
      return;
    }
    this.setData({
      showOperationPaste: false,
      ["orderArr[" + index + "].nxDoRemark"]: '',
      ["orderArr[" + index + "].nxDoAddRemark"]: false
    });
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
   * @param {Number} overrideIndex 可选的订单索引（语音录入添加时传入，避免 setData 异步导致读取到旧值）
   */
  addNewPasteOrderBefore: function (overrideIndex) {
    // 关闭操作菜单
    console.log("resbeieiror");
    // 获取当前订单索引，用于在返回时插入新订单（优先使用传入的 overrideIndex，如语音添加时）
    var index = overrideIndex !== undefined && overrideIndex !== null && overrideIndex >= 0
      ? overrideIndex
      : this.data.orderArrIndex;
    
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
        showOperationPaste: false
      });
      return;
    }
    
    this.setData({
      showOperationPaste: false,
      orderArrIndex: -1 // 清除聚焦状态，避免返回后新订单占据该索引时一直显示 orderstop 淡蓝底色
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
    var url = '../resGoodsListTask/resGoodsListTask?depFatherId=' + this.data.depFatherId +
      '&depId=' + this.data.depId + '&depName=' + this.data.depName +
      '&gbDepFatherId=-1&depSettleType=' + depSettleType +
      '&fromOcrOrder=1&taskId=' + this.data.taskId  + '&beforeId=' + + this.data.orderArr[index].nxDepartmentOrdersId;
    console.log('[addNewPasteOrderBefore] 准备跳转，URL:', url);

    wx.navigateTo({
      url: url,
    })
     
  },

  
  // ==================== 七、缓存管理相关 ====================


  /**
   * 重新上传（删除所有订单）
   */

  reuploadOrders: function () {
    
   
    // 显示确认对话框
    wx.showModal({
      title: '确认删除',
      content: `确定要删除所有个订单吗？删除后将返回上传页面。`,
      confirmText: '确定',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 用户确认删除
          this._deleteBatchOrders();
        }
      }
    });
  },

  /**
   * 批量删除订单
   */

  _deleteBatchOrders: function () {
    // 显示加载提示
    load.showLoading('正在删除订单...');
    deleteTaskData(this.data.taskId).then(res  =>{
      if(res.result.code == 0){
        wx.navigateBack({delta: 1})
      }
    })
  },

  // ==================== 十一、页面生命周期（续）====================

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
      ttsAudioCache: {},
      orderArrIndex: -1 // 开始/继续朗读时清除聚焦状态
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
            const msg = '未返回音频数据';
            this.setData({
              isTTSLoading: false,
              isTTSReading: false,
              ttsError: msg
            });
            wx.showModal({
              title: '播放失败',
              content: msg,
              showCancel: false,
              confirmText: '知道了'
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
          wx.showModal({
            title: '播放失败',
            content: errorMsg,
            showCancel: false,
            confirmText: '知道了'
          });
        }
      }
    }).catch(err => {
      if (startIndex === 0) {
        load.hideLoading();
      }
      if (startIndex === 0) {
        const msg = '请求失败：' + (err.message || '未知错误');
        this.setData({
          isTTSLoading: false,
          isTTSReading: false,
          ttsError: msg
        });
        wx.showModal({
          title: '播放失败',
          content: msg,
          showCancel: false,
          confirmText: '知道了'
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
    // 设置 scrollIntoViewId，触发组件内部查询订单项位置，滚动到顶部
    // 先清空再设置，确保 observer 能触发（值相同时可能不触发）
    const itemId = `order-item-${orderIndex}`;
    this.setData({
      scrollIntoViewId: ''
    }, () => {
      this.setData({ scrollIntoViewId: itemId });
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
    const scrollViewId = (this.data.isTTSReading || this.data.isCheckMode) ? 'order-list-scroll-view-reading' : 'order-list-scroll-view-normal';

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

      const pendingIndex = this.data._pendingFocusOrderIndex;
      const updateData = {
        scrollTop: Math.max(0, itemContentTop)
      };
      // 聚焦输入框时先滚再设 orderArrIndex，这里补设并清空 pending
      if (pendingIndex >= 0) {
        const dataIsAgent = "orderArr[" + pendingIndex + "].nxDoIsAgent";
        updateData.orderArrIndex = pendingIndex;
        updateData[dataIsAgent] = '2';
        updateData.nxArr = [];
        updateData.strArr = [];
        updateData._pendingFocusOrderIndex = -1;
      }
      this.setData(updateData);
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
      isTTSPlaying: true,
      orderArrIndex: -1 // 继续朗读时清除聚焦状态，避免之前操作的订单仍显示 orderstop
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
      isTTSPlaying: false,
      isTTSLoading: false,
      currentTTSIndex: -1,
      stoppedIndex: -1,
      stoppedOrderRef: null,
      isStoppedByStatusMinus2: false,
      ttsAudio: null,
      currentReadingText: '',
      ttsError: '',
      isCheckMode: true,
      showPlayerMenu: false // 关闭菜单
    });
  },

  /**
   * 切换播放器菜单展开/收起
   */
  togglePlayerMenu: function() {
    this.setData({
      showPlayerMenu: !this.data.showPlayerMenu
    });
  },

  /**
   * 菜单：删除订单
   */
  onMenuDelete: function() {
    this.setData({
      showPlayerMenu: false
    });
    this.reuploadOrders();
  },

  /**
   * 菜单：关闭检查模式
   */
  onMenuCloseCheck: function() {
    this.setData({
      showPlayerMenu: false
    });
    this.closeCheck();
  },

  onCheckColse(){
    console.log("docod")
    this.setData({
      isCheckMode: false,
      isTTSReading: false,
      isTTSPlaying: false,
      isTTSLoading: false,
      stoppedIndex: -1,
    })

  },


onMenuOpenCheck: function() {
    this.setData({
      isCheckMode: true
    });
    // this.closeCheck();
  },
  
  /**
   * 菜单：开始朗读
   */
  onMenuStartReading: function() {
    this.setData({
      showPlayerMenu: false,
      orderArrIndex: -1,
      
    });
    this.readOrderList();
  },

  /**
   * 进入检查模式（显示图片+播放器，但不开始朗读）
   */
  coloseReadingMode() {
    this.setData({
      isCheckMode: true,
      stoppedIndex: -1,

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
   * 处理图片变换事件（来自 ocrImagePreview 组件）
   */
  onImageTransformChange: function (e) {
    const { imageIndex, transform } = e.detail;
    this.setData({ imageTransformCache: { imageIndex, transform } });
  },

  /**
   * 处理订单聚焦事件（来自 ocrOrderList 组件）
   */

  onOrderFocus: function (e) {
    const {
      index,
      type
    } = e.detail;
    console.log('[ocrOrder] 订单输入框聚焦 index=', index, 'type=', type, ' -> isOrderInputFocused=true');
    this.setData({ isOrderInputFocused: true });
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
          index: index,
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
      name,
      item,
    } = e.detail;
    const mockEvent = {
      currentTarget: {
        dataset: {
          index: index,
          id: goodsId,
          name: name,
          item,
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
   * 当朗读模式下通过语音录入修改订单成功后，需要继续朗读
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

      // 如果订单状态是-2，确保 nxDoIsAgent 是字符串 '2'（与 WXML 判断一致）
      if (orderArr[index].nxDoStatus == '-2') {
        orderArr[index].nxDoIsAgent = '2';
      }

      this.setData({
        orderArr: orderArr,
        recentlyModifiedOrderIndex: index // 语音录入修改成功后显示蓝色字体提醒
      }, () => {
        // 2秒后清除蓝色高亮
        const that = this;
        setTimeout(() => {
          if (that.data.recentlyModifiedOrderIndex === index) {
            that.setData({ recentlyModifiedOrderIndex: -1 });
          }
        }, 2000);
        // 朗读模式下语音录入修改订单成功后，继续朗读
        const wasReading = this.data.isTTSReading || this.data.isTTSPlaying;
        const wasPaused = this.data.stoppedIndex >= 0 && !this.data.isTTSPlaying && this.data.isTTSReading;
        const updatedOrder = orderArr[index];
        const isStatusMinus2 = updatedOrder && (updatedOrder.nxDoStatus == -2 || updatedOrder.nxDoStatus == '-2');

        if ((wasReading || wasPaused) && !isStatusMinus2) {
          // 订单状态不是-2，从修改的订单开始重新朗读（内容已变更）
          console.log('[onOrderUpdated] 朗读模式下订单已更新，继续朗读，从索引:', index);
          this.readOrderListFromIndex(index);
        } else if (wasReading || wasPaused) {
          // 订单状态为-2，会触发 focus 进入修改状态，不继续朗读
          console.log('[onOrderUpdated] 订单状态为-2，不继续朗读');
        }
      });
    }
  },

  /**
   * 处理订单删除事件（来自 ocrOrderList 组件，如语音录入删除）
   * 朗读模式下语音删除订单成功后，需要继续朗读
   */
  onOrderDeleted: function(e) {
    const { index } = e.detail;
    console.log('[onOrderDeleted] 订单已删除:', { index });

    if (index >= 0 && index < this.data.orderArr.length) {
      const wasReading = this.data.isTTSReading || this.data.isTTSPlaying;
      const wasPaused = this.data.stoppedIndex >= 0 && !this.data.isTTSPlaying && this.data.isTTSReading;
      const wasStoppedByStatusMinus2 = this.data.isStoppedByStatusMinus2;

      // 从订单数组中删除
      const orderArr = [...this.data.orderArr];
      orderArr.splice(index, 1);
      this.setData({
        orderArr: orderArr,
        orderArrIndex: -1,
        strArr: [],
        nxArr: [],
        orderItem: null
      }, () => {
        const filteredArr = this.data.orderArr;
        if ((wasReading || wasPaused || wasStoppedByStatusMinus2) && filteredArr.length > 0) {
          const startIndex = Math.min(index, filteredArr.length - 1);
          if (startIndex >= 0) {
            console.log('[onOrderDeleted] 朗读模式下订单已删除，继续朗读，从索引:', startIndex);
            this.setData({
              isStoppedByStatusMinus2: false,
              stoppedIndex: -1,
              stoppedOrderRef: null
            });
            this.readOrderListFromIndex(startIndex);
          }
        } else if ((wasReading || wasPaused || wasStoppedByStatusMinus2) && filteredArr.length === 0) {
          console.log('[onOrderDeleted] 删除后没有订单了，停止朗读');
          this.setData({
            isTTSReading: false,
            isTTSPlaying: false,
            stoppedIndex: -1,
            stoppedOrderRef: null,
            isStoppedByStatusMinus2: false
          });
        }
      });
    }
  },

  /**
   * 处理添加订单事件
   */
  onAddOrderBefore: function(e) {
    const { index } = e.detail;
    console.log('[onAddOrderBefore] 添加订单:', { index });
    
    // 设置当前订单索引
    this.setData({ 
      orderArrIndex: index >= 0 ? index : 0,
    });
    
    // 调用添加订单方法，传入 index 避免 setData 异步导致读取到旧值
    this.addNewPasteOrderBefore(index >= 0 ? index : 0);
  },


  /**
   * 长按复制文本内容
   */
  onLongPressCopyText: function(e) {
    const text = this.data.task?.nxOcrTaskOcrText || '';
    if (!text || text.trim() === '') {
      wx.showToast({
        title: '没有可复制的内容',
        icon: 'none',
        duration: 1500
      });
      return;
    }
    
    wx.setClipboardData({
      data: text,
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success',
          duration: 1500
        });
      },
      fail: () => {
        wx.showToast({
          title: '复制失败',
          icon: 'none',
          duration: 1500
        });
      }
    });
  },


});
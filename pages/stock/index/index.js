var load = require('../../../lib/load.js');
var platformDisplay = require('../../../utils/platformOrderDisplay.js');

import apiUrl from '../../../config.js'

import {
   // swiper 1
   disGetTypePrepareOutCata,
   disGetTypePrepareOutDepCata,
   disGetTypePrepareOutPage,
   disGetTypePrepareOutByDep,
   disGetTypePrepareOutByCollDis,
   savePlanPurchaseOrderBundle,
} from '../../../lib/apiDepOrder'

const viewBarHeight = 50;



Component({

  data:{
 
    currentPage: 1,
    limit: 15,
    totalPage: 0,
    totalCount: 0,
    hasMore: true,  // 是否还有更多数据
    isLoading: false, // 是否正在加载
    scrollTimer: null, // 滚动防抖定时器
    choiceStockArr: [], // 选中的出库商品数组
    isAllDepartmentSelected: false, // 部门模式下是否全选
    
    // 显示模式：'category' 按类别，'department' 按客户（从缓存读取）
    viewMode: wx.getStorageSync('stockViewMode') || 'category',
    
    // 按客户模式相关数据
    depArr: [], // 部门列表（按客户模式）
    offArr: [], // 协作商家列表
    selectedDepId: null, // 选中的部门ID
    selectedCollDisId: null, // 选中的协作商家ID
    isCollDisMode: false, // 当前是否为协作商家模式
    selDepName: '', // 选中的部门/协作商家名称
    
    // 打印机相关
    printOk: false, // 打印机连接状态
    paperSize: wx.getStorageSync('paperSize') || 1, // 1-小横，2-中竖，3-大竖，4-大横
    refresherTriggered: false,
},

  pageLifetimes: {

    show() {
      //tabBar
      if (typeof this.getTabBar === 'function' &&
        this.getTabBar()) {
        var tabBarComp = this.getTabBar()
        if (typeof tabBarComp.refreshTabs === 'function') {
          tabBarComp.refreshTabs()
        }
        tabBarComp.setData({
          selected: 1
        })
      }

      // 检查是否从打印页面返回
      var fromPrintPage = wx.getStorageSync('fromPrintPage');
      var printSuccess = wx.getStorageSync('printSuccess');
      
      if (fromPrintPage) {
        // 清除 fromPrintPage 标识
        wx.removeStorageSync('fromPrintPage');
        
        // 只更新必要的UI数据
        const app = getApp();
        const globalData = app.globalData;
        const navBarHeight = globalData.navBarHeight;
        const screenHeight = globalData.screenHeight;
        const screenWidth = globalData.screenWidth;
        const rpxRatio = 750 / screenWidth;
        const navBarHeightRpx = navBarHeight * rpxRatio;
        const tabBarHeightRpx = 100;
        const viewBarHeightRpx = viewBarHeight * rpxRatio;
        const contentHeight = (screenHeight - navBarHeight ) * rpxRatio;
        
      // 获取显示模式（从缓存读取，如果没有则使用默认值）
      const viewMode = wx.getStorageSync('stockViewMode') || 'category';
      // 左侧菜单宽度统一为 120rpx
      const leftMenuWidth = 120;

        this.setData({ 
          contentHeight: contentHeight,
          navBarHeight: navBarHeightRpx,
          tabBarHeight: tabBarHeightRpx,
          leftMenuWidth: leftMenuWidth,
          viewBarHeight: viewBarHeightRpx,
          windowWidth: globalData.windowWidth * globalData.rpxR,
          windowHeight: globalData.windowHeight * globalData.rpxR,
          statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
          url: apiUrl.server,
        });
        
        // 检查标签打印机缓存设置
        this.checkLabelPrinterCache();
        
        // 读取缓存的标签尺寸
        var cachedPaperSize = wx.getStorageSync('paperSize');
        if (cachedPaperSize) {
          this.setData({
            paperSize: cachedPaperSize
          });
        }
        
        // 如果打印成功，清空选择数组和所有选择状态
        if (printSuccess) {
          wx.removeStorageSync('printSuccess');
          console.log('✅ 打印成功，清空选择数组和所有选择状态');
          
          // 清空选择数组
          this.setData({
            choiceStockArr: [] // 清空选择数组
          });
          
          // 清空商品数据中的所有选择状态（isSelected 和 purSelected）
          var goodsArr = this.data.goodsArr;
          var updateData = {};
          if (goodsArr && goodsArr.length > 0) {
            for (var i = 0; i < goodsArr.length; i++) {
              // 清空商品级别的选择状态
              if (goodsArr[i].isSelected) {
                updateData[`goodsArr[${i}].isSelected`] = false;
                goodsArr[i].isSelected = false;
              }
              
              // 清空订单级别的选择状态
              if (goodsArr[i].nxDepartmentOrdersEntities && goodsArr[i].nxDepartmentOrdersEntities.length > 0) {
                for (var j = 0; j < goodsArr[i].nxDepartmentOrdersEntities.length; j++) {
                  if (goodsArr[i].nxDepartmentOrdersEntities[j].purSelected) {
                    updateData[`goodsArr[${i}].nxDepartmentOrdersEntities[${j}].purSelected`] = false;
                    goodsArr[i].nxDepartmentOrdersEntities[j].purSelected = false;
                  }
                }
              }
            }
            
            // 批量更新选择状态
            if (Object.keys(updateData).length > 0) {
              this.setData(updateData);
            }
            
            // 更新整个 goodsArr（确保数据同步）
            this.setData({
              goodsArr: goodsArr
            });
            
            console.log('✅ 已清空所有商品和订单的选择状态');
          }
        } else {
          console.log('📋 从打印页面返回（未成功），保留选择数组，不刷新接口');
        }
        
        return; // 直接返回，不执行后续的刷新逻辑
      }

      const app = getApp();
      const globalData = app.globalData;
      const navBarHeight = globalData.navBarHeight;
      const screenHeight = globalData.screenHeight;
      const screenWidth = globalData.screenWidth;
      const rpxRatio = 750 / screenWidth;
      const navBarHeightRpx = navBarHeight * rpxRatio;
      const tabBarHeightRpx = 100;

      const viewBarHeightRpx = viewBarHeight * rpxRatio;
      const contentHeight = (screenHeight - navBarHeight ) * rpxRatio;

      // 获取显示模式（从缓存读取，如果没有则使用默认值）
      const viewMode = wx.getStorageSync('stockViewMode') || 'category';
      // 左侧菜单宽度统一为 120rpx
      const leftMenuWidth = 120;

      this.setData({ 
        contentHeight: contentHeight,
        navBarHeight: navBarHeightRpx,
        tabBarHeight: tabBarHeightRpx,
        leftMenuWidth: leftMenuWidth,
        viewBarHeight: viewBarHeightRpx,
      });
      this.animation = wx.createAnimation({ duration: 300, timingFunction: 'ease' })

      this.setData({
        windowWidth: globalData.windowWidth * globalData.rpxR,
        windowHeight: globalData.windowHeight * globalData.rpxR,
        statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
        url: apiUrl.server,
        scrollViewTop: 0,
        selectedSub: 0, // 选中的分类
        toView: 'position0', // 滚动视图跳转的位置
        scrollTopLeft: 0, //  左边滚动位置随着右边分类而滚动
        
        // 重置分页相关数据
        currentPage: 1,
        totalPage: 0,
        totalCount: 0,
        hasMore: true,
        isLoading: false,
        goodsArr: [],
        goodsCataArr: [],
        categoryPositions: [],
        scrollTimer: null,
        isLoadingMoreForCategory: false,
        choiceStockArr: [], // 重置选中的出库商品数组
        
        // 重置显示模式相关数据（从缓存读取，如果没有则使用默认值）
        viewMode: viewMode,
        depArr: [],
        selectedDepId: null,
        selDepName: '',
        
        // 检查标签打印机缓存设置
        hasLabelPrinter: false, // 是否有标签打印机设置
     
      })
      
      // 检查标签打印机缓存设置
      this.checkLabelPrinterCache();
      
      // 读取缓存的标签尺寸
      var cachedPaperSize = wx.getStorageSync('paperSize');
      if (cachedPaperSize) {
        this.setData({
          paperSize: cachedPaperSize
        });
      }

      var value = wx.getStorageSync('userInfo');
      if (value) {
        this.setData({
          userInfo: value,
          disId: value.nxDistributerEntity.nxDistributerId,
        })
        var disValue = wx.getStorageSync('disInfo');
        if (disValue) {
          this.setData({
            disInfo: disValue,
          })
        }
      }

      this._initData();

    

    
    },
  },


  methods: {

    _processGoodsList(list) {
      return platformDisplay.processGoodsList(list || []);
    },

    _processGoodsItem(goods) {
      return platformDisplay.processGoodsItem(goods);
    },

    // 检查标签打印机缓存设置
    checkLabelPrinterCache() {
      try {
        const cachedDeviceInfo = wx.getStorageSync('bleDeviceInfo');
        if (cachedDeviceInfo && cachedDeviceInfo.deviceId) {
          console.log('✅ 检测到标签打印机缓存设置');
          this.setData({
            hasLabelPrinter: true
          });
        } else {
          console.log('❌ 未检测到标签打印机缓存设置');
          this.setData({
            hasLabelPrinter: false
          });
        }
      } catch (e) {
        console.error('检查标签打印机缓存失败:', e);
        this.setData({
          hasLabelPrinter: false
        });
      }
      // 同时检查打印机连接状态
      this.checkPrinterStatus();
    },
    
    // 检查打印机连接状态
    checkPrinterStatus() {
      var cachedDeviceInfo = wx.getStorageSync('bleDeviceInfo');
      
      if (cachedDeviceInfo && cachedDeviceInfo.deviceId && cachedDeviceInfo.isConnected) {
        this.setData({
          printOk: true
        });
      } else {
        this.setData({
          printOk: false
        });
      }
    },
    
    // 设置打印机开关
    setPrint() {
      // 跳转到标签打印机连接页面
      wx.navigateTo({
        url: '../../../subPackage/pages/management/labelPrinter/labelPrinter',
      });
    },
    
    // 设置标签尺寸
    setPaperSize() {
      var that = this;
      wx.showActionSheet({
        itemList: ['4*3cm（横）', '4*6cm（竖）', '5*8cm（竖）', '5*8cm（横）'],
        success: function(res) {
          var selectedSize = res.tapIndex + 1;
          that.setData({
            paperSize: selectedSize
          });
          wx.setStorageSync('paperSize', selectedSize);
          wx.showToast({
            title: '标签尺寸已设置',
            icon: 'success'
          });
        }
      });
    },

    showCarStock() {
      this.setData({
        showOperationCarStock: true,
      })
    },

  // 清除所有选择（内部方法，不显示确认对话框）
  _clearSelectedData() {
    var that = this;
    // 清空选择数组
    var updates = {};
    
    // 重置所有商品的选中状态
    if (that.data.goodsArr && that.data.goodsArr.length > 0) {
      that.data.goodsArr.forEach(function(goods, goodsIndex) {
        var goodsDataKey = `goodsArr[${goodsIndex}].isSelected`;
        updates[goodsDataKey] = false;
        
        // 重置所有订单的选中状态
        if (goods.nxDepartmentOrdersEntities && goods.nxDepartmentOrdersEntities.length > 0) {
          goods.nxDepartmentOrdersEntities.forEach(function(order, orderIndex) {
            var orderDataKey = `goodsArr[${goodsIndex}].nxDepartmentOrdersEntities[${orderIndex}].purSelected`;
            updates[orderDataKey] = false;
          });
        }
      });
    }
    
    // 更新数据
    that.setData({
      ...updates,
      choiceStockArr: [],
      isAllDepartmentSelected: false
    });
    
    console.log('✅ 已清除所有选择数据');
  },

  // 清除所有选择
  clearAllSelected() {
    this._clearSelectedData();
    // wx.showToast({
    //   title: '已清除',
    //   icon: 'success'
    // });
  },

  closeStockCar() {
    this.setData({
      showOperationCarStock: false
    })
  },


  deleteSelectStockGoods(e) {
    var selArr = this.data.choiceStockArr;
    var item = this.data.choiceStockArr[e.currentTarget.dataset.index];
    var index = item.goodsIndex;
    var goodsData = "goodsArr[" + index + "].isSelected";
    this.setData({
      [goodsData]: false
    })
    var arr = this.data.goodsArr[index].nxDepartmentOrdersEntities;
    for (var i = 0; i < arr.length; i++) {
      var orderChoicedData = "goodsArr[" + index + "].nxDepartmentOrdersEntities[" + i + "].purSelected";
      this.setData({
        [orderChoicedData]: false
      })
    }
    var purId = e.currentTarget.dataset.id;
    var choiceStockArr = selArr.filter(item => item.nxGoodsId !== purId);
    this.setData({
      choiceStockArr: choiceStockArr,
    })
    if (this.data.choiceStockArr.length == 0) {
      
      this.setData({
        showOperationCarStock: false,
      })
    }
  },


    // 切换显示模式（按类别/按客户）
    changeShwoType() {
      const newMode = this.data.viewMode === 'category' ? 'department' : 'category';
      console.log('切换显示模式:', newMode);
      
      // 保存显示模式到本地存储
      wx.setStorageSync('stockViewMode', newMode);
      
      // 左侧菜单宽度统一为 120rpx
      const leftMenuWidth = 120;
      
      // 重置选中状态
                this.setData({
        viewMode: newMode,
        leftMenuWidth: leftMenuWidth,
        choiceStockArr: [],
        goodsArr: [],
        goodsCataArr: [],
        depArr: [],
        selectedDepId: null,
        selDepName: '',
        selectedSub: 0,
        toView: 'position0',
        scrollTopLeft: 0,
        categoryPositions: [],
        currentPage: 1,
        totalPage: 0,
        totalCount: 0,
        hasMore: true,
        isLoading: false,
      }, () => {
        // 重新初始化数据
        this._initData();
      });
    },

    // 滚动到底部加载更多数据
    onReachBottom() {
      // 按客户模式下，商品是一次性加载的，不需要分页加载
      if (this.data.viewMode === 'department') {
        console.log('按客户模式，不触发加载更多');
        return;
      }
      
      console.log('\n========== 滚动到底部触发加载更多 ==========');
      console.log('📊 hasMore:', this.data.hasMore);
      console.log('📊 isLoading:', this.data.isLoading);
      console.log('📊 currentPage:', this.data.currentPage);
      console.log('📊 totalPage:', this.data.totalPage);
      console.log('📊 goodsArr.length:', this.data.goodsArr.length);
      
      if (this.data.hasMore && !this.data.isLoading) {
        console.log('✅ 条件满足，开始加载更多数据');
        this.loadMoreData();
      } else {
        if (!this.data.hasMore) {
          console.log('❌ hasMore 为 false，不加载更多');
      }
        if (this.data.isLoading) {
          console.log('❌ 正在加载中，跳过本次请求');
        }
      }
      console.log('==========================================\n');
    },

    // 滚动事件处理（参考 resGoodsLess 的方法）
    scrollTo(e) {
      const scrollTop = e.detail.scrollTop;
      console.log('=== 滚动事件开始 ===');
      console.log('右侧滚动事件 - scrollTop:', scrollTop);
      console.log('📄 分页信息 - currentPage:', this.data.currentPage, '/ totalPage:', this.data.totalPage, '/ hasMore:', this.data.hasMore);
      
      // 防抖处理，避免频繁更新
      if (this.data.scrollTimer) {
        clearTimeout(this.data.scrollTimer);
      }
      
      this.data.scrollTimer = setTimeout(() => {
        this.updateLeftMenuByScroll(scrollTop);
      }, 50);
    },


    // 计算分类位置（参考 resGoodsLess 的方法）
    calculateCategoryPositions() {
      const query = wx.createSelectorQuery();
      query.selectAll('.goods-category-title').boundingClientRect();
      query.select('.goods-list').boundingClientRect();
      query.exec((res) => {
        if (res[0] && res[1]) {
          const listRect = res[1];
          // 先计算所有原始 top
          let rawPositions = res[0].map(item => ({
            id: item.id.replace('category', ''),
            top: item.top - listRect.top
          }));
          // 取第一个的 top 作为基准
          const baseTop = rawPositions.length > 0 ? rawPositions[0].top : 0;
          // 重新计算所有 top，让第一个为 0
          let positions = rawPositions.map((item, idx) => ({
            id: item.id,
            top: item.top - baseTop
          }));
          // 按 top 从小到大排序
          positions.sort((a, b) => a.top - b.top);
          this.setData({
            categoryPositions: positions
          });
          console.log('分类位置计算完成:', positions);
        }
      });
    },

    // 根据滚动位置更新左侧菜单（参考 resGoodsLess 的方法）
    updateLeftMenuByScroll(scrollTop) {
      console.log('=== updateLeftMenuByScroll 开始 ===');
      console.log('scrollTop:', scrollTop);
      console.log('categoryPositions:', this.data.categoryPositions);
      console.log('viewMode:', this.data.viewMode);
      console.log('📄 分页信息 - currentPage:', this.data.currentPage, '/ totalPage:', this.data.totalPage, '/ hasMore:', this.data.hasMore, '/ goodsArr.length:', this.data.goodsArr.length);
      
      // 按客户模式下，左侧菜单是部门列表，不需要根据分类滚动更新
      if (this.data.viewMode === 'department') {
        console.log('按客户模式，不更新左侧菜单（左侧是部门列表）');
        return;
      }
      
      if (!this.data.categoryPositions || this.data.categoryPositions.length === 0) {
        console.log('❌ categoryPositions为空，无法更新左侧菜单');
        return;
      }

      // 从后往前查找，找到第一个 scrollTop >= top 的分类
      let activeId = '';
      for (let i = this.data.categoryPositions.length - 1; i >= 0; i--) {
        if (scrollTop >= this.data.categoryPositions[i].top) {
          activeId = this.data.categoryPositions[i].id;
          break;
        }
      }
      
      // 边界兜底：如果没找到，默认第一个
      if (!activeId && this.data.categoryPositions.length > 0) {
        activeId = this.data.categoryPositions[0].id;
      }
      
      console.log('🎯 找到活跃分类ID:', activeId);
      
      // 根据分类ID找到对应的左侧菜单索引
      if (activeId) {
        console.log(`🔍 查找分类ID ${activeId} 对应的左侧菜单索引`);
        console.log(`📊 goodsCataArr:`, this.data.goodsCataArr.map(item => ({
          id: item.nxDistributerFatherGoodsId,
          name: item.nxDfgFatherGoodsName
        })));
        
        const categoryIndex = this.data.goodsCataArr.findIndex(
          item => String(item.nxDistributerFatherGoodsId) === String(activeId)
        );
        
        console.log(`🎯 找到的分类索引: ${categoryIndex}`);
        console.log(`📊 当前selectedSub: ${this.data.selectedSub}`);
        
        if (categoryIndex !== -1) {
          if (categoryIndex !== this.data.selectedSub) {
            console.log(`🔄 更新左侧菜单选中状态: ${categoryIndex}`);
            this.setData({
              selectedSub: categoryIndex
            });
          }
          
          // 无论选中状态是否变化，都要滚动左侧菜单到正确位置
          console.log(`📏 准备滚动左侧菜单到索引: ${categoryIndex}`);
          this.scrollLeftMenuToIndex(categoryIndex);
          
          // 检查是否需要加载更多数据以支持当前分类
          this.checkAndLoadMoreForCategory(categoryIndex);
        } else {
          console.log('❌ 未找到对应的分类索引');
          console.log(`📊 原因: categoryIndex=${categoryIndex}, selectedSub=${this.data.selectedSub}`);
        }
      }
      
      console.log('=== updateLeftMenuByScroll 结束 ===\n');
    },

    // 滚动左侧菜单到指定索引
    scrollLeftMenuToIndex(index) {
      console.log(`\n=== 开始左侧菜单滚动 ===`);
      console.log(`🎯 目标索引: ${index}`);
      console.log(`📊 当前selectedSub: ${this.data.selectedSub}`);
      console.log('📄 分页信息 - currentPage:', this.data.currentPage, '/ totalPage:', this.data.totalPage, '/ hasMore:', this.data.hasMore, '/ goodsArr.length:', this.data.goodsArr.length);
      
      // 获取左侧菜单容器和菜单项的高度
      const query = wx.createSelectorQuery();
      query.select('.left-menu').boundingClientRect();
      query.selectAll('.left-item').boundingClientRect();
      query.exec((res) => {
        console.log(`📏 查询结果:`, res);
        
        if (res[0] && res[1] && res[1].length > 0) {
          const containerHeight = res[0].height; // 容器高度（px）
          const actualItemHeight = res[1][0].height; // 实际菜单项高度（px）
          const itemHeight = 100; // 左侧菜单项的高度（rpx）
          const rpxRatio = wx.getSystemInfoSync().windowWidth / 750; // rpx转px的比例
          const itemHeightPx = itemHeight * rpxRatio; // 菜单项高度（px）
          
          console.log(`📏 容器信息:`, {
            containerHeight: containerHeight,
            actualItemHeight: actualItemHeight,
            itemHeight: itemHeight,
            rpxRatio: rpxRatio,
            itemHeightPx: itemHeightPx
          });
          
          // 使用实际测量的菜单项高度
          const finalItemHeight = actualItemHeight;
          
          console.log(`📊 计算参数:`, {
            containerHeight: containerHeight,
            itemHeight: itemHeight,
            rpxRatio: rpxRatio,
            itemHeightPx: itemHeightPx,
            finalItemHeight: finalItemHeight
          });
          
          // 计算目标滚动位置，让选中的分类保持在屏幕中间
          const targetScrollTop = (index * finalItemHeight) - (containerHeight / 2) + (finalItemHeight / 2);
          
          console.log(`📊 目标滚动位置计算:`, {
            index: index,
            finalItemHeight: finalItemHeight,
            containerHeight: containerHeight,
            itemPosition: index * finalItemHeight,
            centerOffset: containerHeight / 2,
            itemCenterOffset: finalItemHeight / 2,
            targetScrollTop: targetScrollTop
          });
          
          // 计算最大可滚动距离
          const totalItems = this.data.goodsCataArr.length;
          const totalHeight = totalItems * finalItemHeight;
          const maxScrollTop = Math.max(0, totalHeight - containerHeight);
          
          console.log(`📊 高度计算:`, {
            totalItems: totalItems,
            finalItemHeight: finalItemHeight,
            totalHeight: totalHeight,
            containerHeight: containerHeight,
            maxScrollTop: maxScrollTop
          });
          
          // 确保滚动位置在合理范围内
          const finalScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop));
          
          console.log(`📊 滚动范围计算:`, {
            totalItems: totalItems,
            maxScrollTop: maxScrollTop,
            targetScrollTop: targetScrollTop,
            finalScrollTop: finalScrollTop
          });
          
          console.log(`📏 左侧菜单滚动计算:`, {
            index: index,
            containerHeight: containerHeight,
            finalItemHeight: finalItemHeight,
            targetScrollTop: targetScrollTop,
            finalScrollTop: finalScrollTop
          });
          
          console.log(`🔄 设置scrollTopLeft: ${finalScrollTop}`);
          this.setData({
            scrollTopLeft: finalScrollTop
          });
          
          // 验证设置是否成功
          setTimeout(() => {
            console.log(`📊 验证scrollTopLeft设置: ${this.data.scrollTopLeft}`);
          }, 100);
          
          console.log(`✅ 左侧菜单滚动设置完成`);
        } else {
          console.log(`❌ 未找到左侧菜单容器`);
        }
      });
    },

    // 左侧菜单点击跳转到对应位置
    toScrollView(e) {
      const dataset = e.currentTarget.dataset;
      const index = dataset.index;
      const isColl = dataset.isColl;
      const collDisId = dataset.collDisId;
      const depId = dataset.depId;
      console.log('\n=== 左侧菜单点击事件 ===');
      console.log('🎯 点击的索引:', index);
      console.log('📊 显示模式:', this.data.viewMode);
      console.log('📊 是否协作商家:', isColl);
      
      if (this.data.viewMode === 'department') {
        // 切换时清空选择数组
        this.setData({
          choiceStockArr: [],
          isAllDepartmentSelected: false
        });
        
        if (isColl && collDisId) {
          // 协作商家：调用 disGetTypePrepareOutByCollDis 接口
          console.log('🎯 目标协作商家ID:', collDisId);
          this._loadCollDisGoods(collDisId);
        } else if (depId !== undefined && depId !== null) {
          // 普通部门：调用 disGetTypePrepareOutByDep 接口
          const dep = this.data.depArr.find(d => d.depId === depId);
          const depIndex = dep ? this.data.depArr.indexOf(dep) : index;
          console.log('🎯 目标部门:', dep?.depAttrName);
          console.log('🎯 目标部门ID:', depId);
          this._loadDepartmentGoods(depId, depIndex);
        } else {
          console.log('❌ 无效的点击数据');
        }
      } else {
        // 按类别模式：原有逻辑
      console.log('📊 分类数组长度:', this.data.goodsCataArr.length);
      
      if (this.data.goodsCataArr[index]) {
        const categoryId = this.data.goodsCataArr[index].nxDistributerFatherGoodsId;
        const categoryName = this.data.goodsCataArr[index].nxDfgFatherGoodsName;
        const fullTargetId = `category${categoryId}`;
        
        console.log('🎯 目标分类:', categoryName);
        console.log('🎯 目标分类ID:', categoryId);
        console.log('🎯 目标跳转ID:', fullTargetId);
        console.log('📊 当前商品总数:', this.data.goodsArr.length);
        
        // 先设置选中状态
        console.log('🔄 设置左侧菜单选中状态:', index);
        this.setData({
          selectedSub: index
        });
        
        // 检查当前页面是否有该分类的商品
        const hasCategoryGoods = this.data.goodsArr.some(goods => 
            goods.nxDgDfgGoodsGreatGrandId === categoryId
        );
        
        console.log(`🔍 检查当前页面是否有目标分类商品: ${hasCategoryGoods ? '✅ 有' : '❌ 没有'}`);
        
        if (hasCategoryGoods) {
          // 如果当前页面有该分类的商品，直接跳转
          console.log('✅ 当前页面有目标分类商品，直接跳转');
          console.log(`🎯 设置toView: ${fullTargetId}`);
          
          this.setData({
            toView: fullTargetId
          });
          
          console.log('✅ 跳转设置完成');
        } else {
          // 如果当前页面没有该分类的商品，递归加载直到找到
          console.log('❌ 当前页面没有目标分类商品，开始递归加载');
          // 显示加载蒙版
          load.showLoading('正在加载商品');
          this.loadGoodsUntilCategory(categoryId, fullTargetId);
        }
      } else {
        console.log('❌ goodsCataArr索引不存在:', index);
        }
      }
    },
    
    // 检查并加载更多数据以支持当前分类
    checkAndLoadMoreForCategory(categoryIndex) {
      if (!this.data.goodsCataArr[categoryIndex]) {
        console.log('分类索引无效:', categoryIndex);
        return;
      }
      
      const categoryId = this.data.goodsCataArr[categoryIndex].nxDistributerFatherGoodsId;
      const categoryName = this.data.goodsCataArr[categoryIndex].nxDfgFatherGoodsName;
      
      // 检查当前页面是否有该分类的商品
      const hasCategoryGoods = this.data.goodsArr.some(goods => 
        goods.nxDgDfgGoodsGreatGrandId === categoryId
      );
      
      if (!hasCategoryGoods) {
        console.log(`🔄 滚动到分类"${categoryName}"，但当前页面没有该分类商品，尝试加载更多数据`);
        
        // 避免重复加载
        if (this.data.isLoadingMoreForCategory) {
          console.log('正在为分类加载数据，跳过');
          return;
        }
        
        this.setData({
          isLoadingMoreForCategory: true
        });
        
        // 尝试加载更多数据
        this.loadMoreDataForCategory(categoryId, categoryName);
      } else {
        console.log(`✅ 分类"${categoryName}"在当前页面有商品，无需加载更多数据`);
      }
    },
    
    // 为指定分类加载更多数据
    loadMoreDataForCategory(categoryId, categoryName, maxAttempts = 3) {
      console.log(`\n=== 开始为分类加载更多数据 ===`);
      console.log(`🎯 目标分类: ${categoryName} (ID: ${categoryId})`);
      console.log(`📊 最大尝试次数: ${maxAttempts}`);
      console.log(`📊 当前商品总数: ${this.data.goodsArr.length}`);
      
      let attempts = 0;
      
      const loadNextPage = () => {
        attempts++;
        console.log(`\n--- 第${attempts}次尝试 ---`);
        
        if (attempts > maxAttempts) {
          console.log('❌ 达到最大尝试次数，停止加载');
          this.setData({
            isLoadingMoreForCategory: false
          });
          return;
        }
        
        if (this.data.currentPage >= this.data.totalPage) {
          console.log('❌ 已加载所有数据，仍未找到该分类');
          this.setData({
            isLoadingMoreForCategory: false
          });
          return;
        }
        
        console.log(`🔄 尝试加载第${this.data.currentPage + 1}页数据，寻找分类"${categoryName}"`);
        console.log(`📊 当前页码: ${this.data.currentPage}, 总页数: ${this.data.totalPage}`);
        
        // 加载下一页数据
        this.setData({
          currentPage: this.data.currentPage + 1
        });
        
        const data = {
          disId: this.data.disId,
          page: this.data.currentPage,
          limit: this.data.limit,
        };
        
        console.log(`📤 请求参数:`, data);
        
        disGetTypePrepareOutPage(data).then(res => {
          console.log(`📥 API响应:`, res.result);
          
          // 检查数据大小和结构
          if (res.result?.page?.list) {
            const dataStr = JSON.stringify(res.result.page.list);
            const dataSizeKB = (dataStr.length * 2 / 1024).toFixed(2);
            console.log('📊 分类加载更多 - 商品列表数据大小:', dataSizeKB, 'KB');
            if (res.result.page.list.length > 0) {
              const firstItem = res.result.page.list[0];
              console.log('第一个商品数据结构检查:');
              console.log('- 包含 isSelected:', !!firstItem.isSelected);
              console.log('- 包含 nxDepartmentOrdersEntities:', !!firstItem.nxDepartmentOrdersEntities);
              console.log('- 包含 nxDgDfgGoodsGreatGrandId:', !!firstItem.nxDgDfgGoodsGreatGrandId);
            }
          }
          
          if (res.result.code == 0) {
            const processedList = this._processGoodsList(res.result.page.list);
            
            // 去重逻辑
            const existingIds = new Set(this.data.goodsArr.map(item => item.nxDistributerGoodsId));
            const newItems = processedList.filter(item => !existingIds.has(item.nxDistributerGoodsId));
            const newGoodsArr = this.data.goodsArr.concat(newItems);
            
            console.log(`📦 现有商品数量: ${this.data.goodsArr.length}`);
            console.log(`📦 新加载商品数量: ${res.result.page.list.length}`);
            console.log(`📦 去重后新增数量: ${newItems.length}`);
            console.log(`📦 合并后商品总数: ${newGoodsArr.length}`);
            
            this.setData({
              goodsArr: newGoodsArr,
              totalPage: res.result.page.totalPage,
              totalCount: res.result.page.totalCount,
              hasMore: this.data.currentPage < res.result.page.totalPage
            }, () => {
              // 检查新加载的数据中是否有目标分类
              const hasCategoryGoods = this.data.goodsArr.some(goods => 
                goods.nxDgDfgGoodsGreatGrandId === categoryId
              );
              
              console.log(`🔍 检查是否找到目标分类${categoryId}: ${hasCategoryGoods ? '✅ 找到' : '❌ 未找到'}`);
              
              if (hasCategoryGoods) {
                console.log(`✅ 找到分类"${categoryName}"的商品，加载完成`);
                this.setData({
                  isLoadingMoreForCategory: false
                });
                
                // 重新获取位置信息
                setTimeout(() => {
                  console.log('🔄 重新获取位置信息');
                  this.calculateCategoryPositions();
                }, 300);
              } else {
                // 继续加载下一页
                console.log('❌ 未找到目标分类，继续加载下一页');
                setTimeout(() => {
                  loadNextPage();
                }, 500);
              }
            });
          } else {
            console.log('❌ 加载数据失败:', res.result.msg);
            this.setData({
              isLoadingMoreForCategory: false
            });
          }
        }).catch(err => {
          console.error('❌ 加载数据失败:', err);
          this.setData({
            isLoadingMoreForCategory: false
          });
        });
      };
      
      loadNextPage();
    },
    
    // 递归加载数据直到找到指定分类
    loadGoodsUntilCategory(categoryId, targetId, page = 1, maxAttempts = 10) {
      console.log(`\n=== 开始递归加载分类商品 ===`);
      console.log(`🎯 目标分类ID: ${categoryId}`);
      console.log(`🎯 目标跳转ID: ${targetId}`);
      console.log(`📄 当前页码: ${page}`);
      console.log(`📊 最大尝试次数: ${maxAttempts}`);
      console.log(`📊 当前商品总数: ${this.data.goodsArr.length}`);
      
      if (this.data.isLoading) {
        console.log('⚠️ 正在加载中，跳过请求');
        return;
      }
      
      if (page > maxAttempts) {
        console.log('❌ 达到最大尝试次数，停止加载');
        // 隐藏加载蒙版
        load.hideLoading();
        wx.showToast({
          title: '该分类商品在其他页面',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      
      if (page > this.data.totalPage) {
        console.log('❌ 已加载所有数据，仍未找到该分类');
        // 隐藏加载蒙版
        load.hideLoading();
        wx.showToast({
          title: '该分类商品在其他页面',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      
      console.log(`🔄 尝试加载第${page}页数据，寻找分类${categoryId}`);
      console.log(`📊 当前总页数: ${this.data.totalPage}`);
      
      this.setData({
        isLoading: true
      });
      
      const data = {
        disId: this.data.disId,
        page: page,
        limit: this.data.limit,
      };
      
      console.log(`📤 请求参数:`, data);
      disGetTypePrepareOutPage(data).then(res => {
        this.setData({
          isLoading: false
        });
        
        console.log(`📥 API响应:`, res.result);
        
        // 检查数据大小和结构
        if (res.result?.page?.list) {
          const dataStr = JSON.stringify(res.result.page.list);
          const dataSizeKB = (dataStr.length * 2 / 1024).toFixed(2);
          console.log('📊 递归加载 - 商品列表数据大小:', dataSizeKB, 'KB');
          if (res.result.page.list.length > 0) {
            const firstItem = res.result.page.list[0];
            console.log('第一个商品数据结构检查:');
            console.log('- 包含 isSelected:', !!firstItem.isSelected);
            console.log('- 包含 nxDepartmentOrdersEntities:', !!firstItem.nxDepartmentOrdersEntities);
            console.log('- 包含 nxDgDfgGoodsGreatGrandId:', !!firstItem.nxDgDfgGoodsGreatGrandId);
            if (firstItem.nxDepartmentOrdersEntities && firstItem.nxDepartmentOrdersEntities.length > 0) {
              const firstOrder = firstItem.nxDepartmentOrdersEntities[0];
              console.log('- 第一个订单包含 purSelected:', !!firstOrder.purSelected);
              console.log('- 第一个订单包含扁平化字段 (nxDepartmentAttrName):', !!firstOrder.nxDepartmentAttrName);
              console.log('- 第一个订单包含嵌套对象 (nxDepartmentEntity):', !!firstOrder.nxDepartmentEntity);
            }
          }
        }
        
        if (res.result.code == 0) {
          const processedList = this._processGoodsList(res.result.page.list);
          
          // 去重逻辑
          const existingIds = new Set(this.data.goodsArr.map(item => item.nxDistributerGoodsId));
          const newItems = processedList.filter(item => !existingIds.has(item.nxDistributerGoodsId));
          const newGoodsArr = this.data.goodsArr.concat(newItems);
          
          console.log(`📦 现有商品数量: ${this.data.goodsArr.length}`);
          console.log(`📦 新加载商品数量: ${res.result.page.list.length}`);
          console.log(`📦 去重后新增数量: ${newItems.length}`);
          console.log(`📦 合并后商品总数: ${newGoodsArr.length}`);
          
          this.setData({
            goodsArr: newGoodsArr,
            totalPage: res.result.page.totalPage,
            totalCount: res.result.page.totalCount,
            hasMore: page < res.result.page.totalPage
          }, () => {
            // 检查新加载的数据中是否有目标分类
            const hasCategoryGoods = this.data.goodsArr.some(goods => 
              goods.nxDgDfgGoodsGreatGrandId === categoryId
            );
            
            console.log(`🔍 检查是否找到目标分类${categoryId}: ${hasCategoryGoods ? '✅ 找到' : '❌ 未找到'}`);
            
            if (hasCategoryGoods) {
              console.log('✅ 找到目标分类商品，设置跳转目标');
              console.log(`🎯 设置toView: ${targetId}`);
              
              // 隐藏加载蒙版
              load.hideLoading();
              
              this.setData({
                toView: targetId
              });
              
                              // 重新获取位置信息
                setTimeout(() => {
                  console.log('🔄 重新获取位置信息');
                  this.calculateCategoryPositions();
                }, 300);
            } else {
              // 继续加载下一页
              console.log('❌ 未找到目标分类，继续加载下一页');
              console.log(`🔄 准备加载第${page + 1}页...`);
              
              setTimeout(() => {
                this.loadGoodsUntilCategory(categoryId, targetId, page + 1, maxAttempts);
              }, 500);
            }
          });
        } else {
          console.log('❌ 加载数据失败:', res.result.msg);
          // 隐藏加载蒙版
          load.hideLoading();
          wx.showToast({
            title: '加载数据失败',
            icon: 'none',
            duration: 2000
          });
        }
      }).catch(err => {
        console.error('❌ 加载数据失败:', err);
        this.setData({
          isLoading: false
        });
        // 隐藏加载蒙版
        load.hideLoading();
        wx.showToast({
          title: '加载数据失败',
          icon: 'none',
          duration: 2000
        });
      });
    },

    // 加载更多数据
    loadMoreData() {
      console.log('\n========== loadMoreData 开始 ==========');
      console.log('📊 当前页码:', this.data.currentPage);
      console.log('📊 总页数:', this.data.totalPage);
      
      if (this.data.currentPage >= this.data.totalPage) {
        console.log('❌ 已到最后一页，不加载更多');
        this.setData({
          hasMore: false
        });
        return;
      }

      var nextPage = this.data.currentPage + 1;
      console.log('📊 准备加载第', nextPage, '页');

      this.setData({
        currentPage: nextPage
      }, () => {
        // setData 回调中确保页码已更新
        console.log('✅ 页码已更新为:', this.data.currentPage);
      this._getPageData(true);
      });
    },

    // 下拉刷新
    onPullDownRefresh() {
      this._refreshStockData({ fromPullDown: true })
    },

    onScrollRefresh() {
      this._refreshStockData({ fromRefresher: true })
    },

    _getRefreshResetData(extra) {
      return Object.assign({
        currentPage: 1,
        totalPage: 0,
        totalCount: 0,
        hasMore: true,
        isLoading: false,
        goodsArr: [],
        goodsCataArr: [],
        depArr: [],
        selectedDepId: null,
        selDepName: '',
        selectedSub: 0,
        toView: 'position0',
        scrollTopLeft: 0,
        categoryPositions: [],
        scrollTimer: null,
        isLoadingMoreForCategory: false,
        choiceStockArr: [],
        isAllDepartmentSelected: false
      }, extra || {})
    },

    _refreshStockData(options) {
      var that = this
      options = options || {}
      this.setData(this._getRefreshResetData({
        refresherTriggered: !!options.fromRefresher
      }))
      var result = this._initData()
      var finish = function () {
        if (options.fromPullDown) {
          wx.stopPullDownRefresh()
        }
        if (options.fromRefresher) {
          that.setData({ refresherTriggered: false })
        }
      }
      if (result && typeof result.finally === 'function') {
        result.finally(finish)
      } else {
        finish()
      }
    },

    hideButton() {
      
      this.animation.translateY(100).step();
      this.setData({
        buttonAnimation: this.animation.export(),
      });
    },



    // swiper-item-1 茭白，红尖椒，荷兰豆 
    _initData() {
      load.showLoading("获取数据中");
      var data = {
        disId: this.data.disId,
        purType: -1
      }
      
      // 根据显示模式调用不同接口
      if (this.data.viewMode === 'category') {
        // 按类别模式：获取商品分类列表
        return disGetTypePrepareOutCata(data)
          .then(res => {
            console.log(res.result.data);
            if (res.result.code == 0) {
              load.hideLoading();
              console.log("分类数据:", res.result.data.arr);
              
              // ========== 打印左侧分类ID（用于发给后台） ==========
              console.log('\n========== 左侧分类列表ID（nxDistributerFatherGoodsId） ==========');
              if (res.result.data.arr && res.result.data.arr.length > 0) {
                res.result.data.arr.forEach((category, index) => {
                  console.log(`左侧分类[${index}]: ${category.nxDfgFatherGoodsName} - ID: ${category.nxDistributerFatherGoodsId}`);
                });
                console.log('左侧分类总数:', res.result.data.arr.length);
              } else {
                console.log('左侧分类列表为空');
              }
              console.log('==========================================\n');
              
              this.setData({
                goodsCataArr: res.result.data.arr,
                choiceStockArr: [],
                currentPage: 1, // 重置页码
                hasMore: true, // 重置加载更多状态
                isLoading: false, // 重置加载状态
                selectedSub: 0, // 重置选中状态
                toView: 'position0', // 重置滚动位置
                scrollTopLeft: 0, // 重置左侧滚动位置
                categoryPositions: [], // 重置分类位置
                goodsArr: [], // 重置商品数组
              })
               
             this.getTabBar().setData({
              stockCount: res.result.data.stockCount,
              puringCount: res.result.data.puringCount,
              collCount: res.result.data.collCount,
            })

              if (res.result.data.arr.length > 0) {
                // 先加载数据，然后在数据加载完成后获取位置信息
                return this._getPageData();
              }

            } else {
              load.hideLoading();
              this.setData({
                goodsCataArr: [],
              })
              wx.showToast({
                title: res.result.msg,
                icon: "none"
              })
            }

          }).catch(err => {
            console.error('_initData 请求失败:', err);
            load.hideLoading();
            wx.showToast({
              title: '获取数据失败',
              icon: 'none'
            });
          })
      } else {
        // 按客户模式：获取部门列表
        return disGetTypePrepareOutDepCata(data)
          .then(res => {
            console.log('按客户模式 - 部门列表:', res.result.data);
            if (res.result.code == 0) {
              load.hideLoading();
              this.setData({
                depArr: res.result.data.arr || [],
                platformDepArr: res.result.data.platformDep || [],
                ownDepArr: res.result.data.ownDep || [],
                offArr: res.result.data.offArr || [],
              })
             
              this.getTabBar().setData({
                stockCount: res.result.data.stockCount,
                unPurCount: res.result.data.unPurCount,
                puringCount: res.result.data.puringCount,
              })
             
              // 优先加载协作商家，否则加载部门
              if (res.result.data.offArr && res.result.data.offArr.length > 0) {
                return this._loadCollDisGoods(res.result.data.offArr[0].nxDistributerId);
              }
              if (res.result.data.arr && res.result.data.arr.length > 0) {
                return this._loadDepartmentGoods(res.result.data.arr[0].depId, 0);
              }
              
              return Promise.resolve();

            } else {
              load.hideLoading();
              wx.showToast({
                title: res.result.msg,
                icon: "none"
              })
              return Promise.reject(new Error(res.result.msg));
            }

          }).catch(err => {
            console.error('_initData 请求失败:', err);
            load.hideLoading();
            wx.showToast({
              title: '获取数据失败',
              icon: 'none'
            });
            return Promise.reject(err);
          })
      }
    },

    // 刷新数据并保持当前选择
    _refreshDataWithSelection() {
      var that = this;
      
      // 保存当前选择状态
      var currentSelectedSub = this.data.selectedSub;
      var currentSelectedDepId = this.data.selectedDepId;
      var currentSelectedCollDisId = this.data.selectedCollDisId;
      var currentIsCollDisMode = this.data.isCollDisMode;
      var viewMode = this.data.viewMode;
      
      console.log('🔄 开始刷新数据，当前选择状态:', {
        viewMode: viewMode,
        selectedSub: currentSelectedSub,
        selectedDepId: currentSelectedDepId,
        selectedCollDisId: currentSelectedCollDisId,
        isCollDisMode: currentIsCollDisMode
      });
      
      // 调用 _initData 刷新左侧列表
      this._initData().then(() => {
        // 延迟一下，确保数据已经设置完成
        setTimeout(() => {
          that._restoreSelection(currentSelectedSub, currentSelectedDepId, currentSelectedCollDisId, currentIsCollDisMode, viewMode);
        }, 100);
      }).catch(err => {
        console.error('刷新数据失败:', err);
        wx.showToast({
          title: '刷新数据失败',
          icon: 'none'
        });
      });
    },
    
    // 恢复选择状态
    _restoreSelection(currentSelectedSub, currentSelectedDepId, currentSelectedCollDisId, currentIsCollDisMode, viewMode) {
      var that = this;
      
      if (viewMode === 'category') {
        // 类别模式：检查保存的索引是否还存在
        if (this.data.goodsCataArr && this.data.goodsCataArr.length > 0) {
          var targetIndex = currentSelectedSub;
          
          // 如果保存的索引超出范围，则选择第一个
          if (targetIndex >= this.data.goodsCataArr.length || targetIndex < 0) {
            targetIndex = 0;
            console.log('⚠️ 原选择索引超出范围，选择第一个分类');
          }
          
          // 获取目标分类ID，用于滚动定位
          var targetCategoryId = this.data.goodsCataArr[targetIndex].nxDistributerFatherGoodsId;
          var fullTargetId = `category${targetCategoryId}`;
          
          // 如果目标索引和当前索引不同，需要切换
          if (targetIndex !== this.data.selectedSub) {
            console.log('✅ 切换到之前选择的分类，索引:', targetIndex, '分类ID:', targetCategoryId);
            
            // 重置分页状态
            this.setData({
              currentPage: 1,
              hasMore: true,
              isLoading: false,
              selectedSub: targetIndex
            });
            
            // 加载该分类的商品数据
            this._getPageData();
            
            // 延迟执行滚动，等待数据加载完成
            setTimeout(() => {
              that._scrollToCategory(fullTargetId, targetIndex);
            }, 800);
          } else {
            console.log('✅ 当前已是目标分类，重新加载数据并滚动');
            // 即使索引相同，也重新加载一下数据，确保数据是最新的
            this.setData({
              currentPage: 1,
              hasMore: true,
              isLoading: false
            });
            this._getPageData();
            
            // 延迟执行滚动，等待数据加载完成
            setTimeout(() => {
              that._scrollToCategory(fullTargetId, targetIndex);
            }, 800);
          }
        }
      } else {
        // 客户模式：协作商家 或 部门
        if (currentIsCollDisMode && currentSelectedCollDisId && this.data.offArr && this.data.offArr.length > 0) {
          // 协作商家模式：查找保存的协作商家ID是否还存在
          var foundColl = this.data.offArr.find(d => d.nxDistributerId == currentSelectedCollDisId);
          var targetCollDisId = foundColl ? foundColl.nxDistributerId : this.data.offArr[0].nxDistributerId;
          if (!foundColl) {
            console.log('⚠️ 原选择协作商家不存在，选择第一个');
          }
          if (targetCollDisId != this.data.selectedCollDisId) {
            console.log('✅ 切换到之前选择的协作商家，ID:', targetCollDisId);
            this._loadCollDisGoods(targetCollDisId);
          } else {
            console.log('✅ 当前已是目标协作商家，重新加载数据');
            this._loadCollDisGoods(targetCollDisId);
          }
        } else if (this.data.depArr && this.data.depArr.length > 0) {
          // 部门模式
          var targetDepId = currentSelectedDepId;
          var targetDepIndex = -1;
          
          for (var i = 0; i < this.data.depArr.length; i++) {
            if (this.data.depArr[i].depId === targetDepId) {
              targetDepIndex = i;
              break;
            }
          }
          
          if (targetDepIndex === -1) {
            targetDepIndex = 0;
            targetDepId = this.data.depArr[0].depId;
            console.log('⚠️ 原选择部门不存在，选择第一个部门');
          }
          
          if (targetDepId !== this.data.selectedDepId) {
            console.log('✅ 切换到之前选择的部门，部门ID:', targetDepId, '索引:', targetDepIndex);
            this._loadDepartmentGoods(targetDepId, targetDepIndex);
          } else {
            console.log('✅ 当前已是目标部门，重新加载数据');
            this._loadDepartmentGoods(targetDepId, targetDepIndex);
          }
        } else if (this.data.offArr && this.data.offArr.length > 0) {
          // 只有协作商家，没有部门
          var targetCollDisId = this.data.offArr[0].nxDistributerId;
          this._loadCollDisGoods(targetCollDisId);
        }
      }
    },
    
    // 滚动到指定分类位置
    _scrollToCategory(targetId, categoryIndex) {
      var that = this;
      
      console.log('🔄 准备滚动到分类位置:', targetId, '索引:', categoryIndex);
      
      // 先计算分类位置
      setTimeout(() => {
        that.calculateCategoryPositions();
        
        // 再延迟一下，确保位置计算完成
        setTimeout(() => {
          // 检查当前页面是否有该分类的商品
          const hasCategoryGoods = that.data.goodsArr.some(goods => {
            const categoryId = that.data.goodsCataArr[categoryIndex]?.nxDistributerFatherGoodsId;
            return goods.nxDgDfgGoodsGreatGrandId === categoryId;
          });
          
          if (hasCategoryGoods) {
            // 如果当前页面有该分类的商品，直接滚动
            console.log('✅ 当前页面有目标分类商品，滚动到位置:', targetId);
            that.setData({
              toView: targetId
            });
            
            // 确保左侧菜单也滚动到正确位置
            if (categoryIndex > 0) {
              that.scrollLeftMenuToIndex(categoryIndex);
            }
          } else {
            // 如果当前页面没有该分类的商品，需要加载更多
            console.log('⚠️ 当前页面没有目标分类商品，需要加载更多');
            const categoryId = that.data.goodsCataArr[categoryIndex]?.nxDistributerFatherGoodsId;
            if (categoryId) {
              that.loadGoodsUntilCategory(categoryId, targetId);
            }
          }
        }, 200);
      }, 300);
    },

    _getPageData(isLoadMore = false){
      var data = {
      disId: this.data.disId,
      page: this.data.currentPage,
      limit: this.data.limit,
      }
      console.log('\n========== 获取页面数据 ==========');
      console.log("📤 请求参数:", data);
      console.log('📄 当前分页状态 - currentPage:', this.data.currentPage, '/ totalPage:', this.data.totalPage, '/ hasMore:', this.data.hasMore, '/ isLoading:', this.data.isLoading);
      console.log('📦 当前商品数量:', this.data.goodsArr.length);
      console.log('📊 isLoadMore:', isLoadMore);
      
      // 如果是加载更多，显示加载状态
      if (isLoadMore) {
        this.setData({
          isLoading: true
        });
      }
      
      disGetTypePrepareOutPage(data).then(res =>{
          if(res.result.code == 0){
            console.log("📥 API返回数据:", res.result.page);
            console.log("📦 商品列表长度:", res.result.page.list?.length);
            console.log('📄 返回的分页信息 - totalPage:', res.result.page.totalPage, '/ totalCount:', res.result.page.totalCount);
            
            // 检查数据大小
            if (res.result.page.list) {
              const dataStr = JSON.stringify(res.result.page.list);
              const dataSizeKB = (dataStr.length * 2 / 1024).toFixed(2);
              console.log('📊 商品列表数据大小:', dataSizeKB, 'KB');
            }
            
            // 验证数据结构
            if (res.result.page.list && res.result.page.list.length > 0) {
              const firstItem = res.result.page.list[0];
              console.log("第一个商品数据结构:", firstItem);
              console.log("第一个商品分类ID (nxDgDfgGoodsGrandId):", firstItem.nxDgDfgGoodsGrandId);
              console.log("第一个商品曾祖父ID (nxDgDfgGoodsGreatGrandId):", firstItem.nxDgDfgGoodsGreatGrandId);
              console.log("第一个商品是否包含 isSelected:", !!firstItem.isSelected);
              console.log("第一个商品是否包含 nxDepartmentOrdersEntities:", !!firstItem.nxDepartmentOrdersEntities);
              
              // ========== 打印右侧商品曾祖父ID并检查排序问题（用于发给后台） ==========
              console.log('\n========== 右侧商品曾祖父ID（nxDgDfgGoodsGreatGrandId）排序检查 ==========');
              console.log('当前页码:', this.data.currentPage);
              console.log('商品总数:', res.result.page.list.length);
              
              // 打印所有商品的曾祖父ID
              const greatGrandIdList = res.result.page.list.map((goods, index) => ({
                index: index,
                goodsId: goods.nxDistributerGoodsId,
                goodsName: goods.nxDgGoodsName,
                greatGrandId: goods.nxDgDfgGoodsGreatGrandId,
                grandId: goods.nxDgDfgGoodsGrandId
              }));
              
              console.log('商品曾祖父ID列表:');
              greatGrandIdList.forEach(item => {
                console.log(`  [${item.index}] ${item.goodsName} - 曾祖父ID: ${item.greatGrandId}, 祖父ID: ${item.grandId}`);
              });
              
              // 检查排序问题：统计每个曾祖父ID的连续出现情况
              console.log('\n排序检查结果:');
              let currentGreatGrandId = null;
              let currentGroupStart = 0;
              let groupCount = 0;
              const groups = [];
              
              greatGrandIdList.forEach((item, index) => {
                if (item.greatGrandId !== currentGreatGrandId) {
                  // 如果切换了曾祖父ID，记录上一个分组
                  if (currentGreatGrandId !== null) {
                    groups.push({
                      greatGrandId: currentGreatGrandId,
                      startIndex: currentGroupStart,
                      endIndex: index - 1,
                      count: index - currentGroupStart
                    });
                  }
                  // 开始新分组
                  currentGreatGrandId = item.greatGrandId;
                  currentGroupStart = index;
                  groupCount++;
                }
              });
              
              // 记录最后一个分组
              if (currentGreatGrandId !== null) {
                groups.push({
                  greatGrandId: currentGreatGrandId,
                  startIndex: currentGroupStart,
                  endIndex: greatGrandIdList.length - 1,
                  count: greatGrandIdList.length - currentGroupStart
                });
              }
              
              console.log(`曾祖父ID分组数: ${groupCount}`);
              groups.forEach((group, idx) => {
                console.log(`  分组[${idx}]: 曾祖父ID=${group.greatGrandId}, 位置[${group.startIndex}-${group.endIndex}], 商品数=${group.count}`);
              });
              
              // 检查是否有排序问题：同一个曾祖父ID是否分散在多处
              const greatGrandIdMap = new Map();
              greatGrandIdList.forEach((item, index) => {
                if (!greatGrandIdMap.has(item.greatGrandId)) {
                  greatGrandIdMap.set(item.greatGrandId, []);
                }
                greatGrandIdMap.get(item.greatGrandId).push(index);
              });
              
              console.log('\n曾祖父ID分布情况:');
              let hasSortingIssue = false;
              greatGrandIdMap.forEach((indices, greatGrandId) => {
                if (indices.length > 1) {
                  // 检查这些索引是否连续
                  const isContinuous = indices.every((idx, i) => {
                    return i === 0 || idx === indices[i - 1] + 1;
                  });
                  
                  if (!isContinuous) {
                    hasSortingIssue = true;
                    console.log(`  ❌ 曾祖父ID ${greatGrandId} 的商品分散在多个位置: [${indices.join(', ')}]`);
                  } else {
                    console.log(`  ✅ 曾祖父ID ${greatGrandId} 的商品连续分布在位置: [${indices[0]}-${indices[indices.length - 1]}]`);
                  }
                } else {
                  console.log(`  ✅ 曾祖父ID ${greatGrandId} 的商品只有1个，位置: [${indices[0]}]`);
                }
              });
              
              if (hasSortingIssue) {
                console.log('\n⚠️ 发现问题：右侧商品列表没有按曾祖父ID（nxDgDfgGoodsGreatGrandId）排序！');
                console.log('   相同曾祖父ID的商品应该连续排列在一起，但现在分散在多个位置。');
                console.log('   请检查后台接口 disGetTypePrepareOutPage 的排序逻辑。');
              } else {
                console.log('\n✅ 排序正常：所有相同曾祖父ID的商品都连续排列在一起。');
              }
              
              // 对比左侧分类ID和右侧曾祖父ID
              console.log('\n左侧分类ID vs 右侧曾祖父ID对比:');
              const leftIds = this.data.goodsCataArr.map(cat => cat.nxDistributerFatherGoodsId);
              const rightIds = [...new Set(greatGrandIdList.map(item => item.greatGrandId))];
              console.log('左侧分类ID列表:', leftIds);
              console.log('右侧曾祖父ID列表（去重）:', rightIds);
              
              const missingInRight = leftIds.filter(id => !rightIds.includes(id));
              const missingInLeft = rightIds.filter(id => !leftIds.includes(id));
              
              if (missingInRight.length > 0) {
                console.log(`⚠️ 左侧有但右侧没有的ID: [${missingInRight.join(', ')}]`);
              }
              if (missingInLeft.length > 0) {
                console.log(`⚠️ 右侧有但左侧没有的ID: [${missingInLeft.join(', ')}]`);
              }
              if (missingInRight.length === 0 && missingInLeft.length === 0) {
                console.log('✅ 左侧分类ID和右侧曾祖父ID完全匹配');
              }
              
              console.log('==========================================\n');
              
              // 检查订单数据结构
              if (firstItem.nxDepartmentOrdersEntities && firstItem.nxDepartmentOrdersEntities.length > 0) {
                const firstOrder = firstItem.nxDepartmentOrdersEntities[0];
                console.log("第一个订单数据结构:", firstOrder);
                console.log("第一个订单是否包含 purSelected:", !!firstOrder.purSelected);
                console.log("第一个订单是否包含 nxDoGbDepartmentId:", !!firstOrder.nxDoGbDepartmentId);
                console.log("第一个订单是否包含 nxDepartmentAttrName:", !!firstOrder.nxDepartmentAttrName);
                console.log("第一个订单是否包含 gbDepartmentName:", !!firstOrder.gbDepartmentName);
                console.log("第一个订单是否包含 nxRestrauntAttrName:", !!firstOrder.nxRestrauntAttrName);
                console.log("第一个订单是否包含嵌套对象 (gbDepartmentEntity):", !!firstOrder.gbDepartmentEntity);
                console.log("第一个订单是否包含嵌套对象 (nxDepartmentEntity):", !!firstOrder.nxDepartmentEntity);
              }
              
              console.log("goodsCataArr:", this.data.goodsCataArr);
              console.log("goodsCataArr第一个分类ID (nxDistributerFatherGoodsId):", this.data.goodsCataArr[0]?.nxDistributerFatherGoodsId);
            }
            
            if (isLoadMore) {
              // 加载更多数据，追加到现有数据并去重
              const existingIds = new Set(this.data.goodsArr.map(item => item.nxDistributerGoodsId));
              // 确保新加载的数据中每个订单都有 purSelected 字段
              const processedNewItems = this._processGoodsList(res.result.page.list);
              const newItems = processedNewItems.filter(item => !existingIds.has(item.nxDistributerGoodsId));
              const newGoodsArr = this.data.goodsArr.concat(newItems);
              
              console.log(`📊 现有商品数量: ${this.data.goodsArr.length}`);
              console.log(`📊 新加载商品数量: ${res.result.page.list.length}`);
              console.log(`📊 去重后新增数量: ${newItems.length}`);
              console.log(`📊 合并后商品总数: ${newGoodsArr.length}`);
              
              // ========== 检查合并后的排序问题 ==========
              if (newGoodsArr.length > 0) {
                console.log('\n========== 合并后商品曾祖父ID排序检查（加载更多） ==========');
                const mergedGreatGrandIdList = newGoodsArr.map((goods, index) => ({
                  index: index,
                  goodsId: goods.nxDistributerGoodsId,
                  goodsName: goods.nxDgGoodsName,
                  greatGrandId: goods.nxDgDfgGoodsGreatGrandId
                }));
                
                // 检查合并后是否有排序问题
                const mergedGreatGrandIdMap = new Map();
                mergedGreatGrandIdList.forEach((item, index) => {
                  if (!mergedGreatGrandIdMap.has(item.greatGrandId)) {
                    mergedGreatGrandIdMap.set(item.greatGrandId, []);
                  }
                  mergedGreatGrandIdMap.get(item.greatGrandId).push(index);
                });
                
                let hasMergedSortingIssue = false;
                mergedGreatGrandIdMap.forEach((indices, greatGrandId) => {
                  if (indices.length > 1) {
                    const isContinuous = indices.every((idx, i) => {
                      return i === 0 || idx === indices[i - 1] + 1;
                    });
                    if (!isContinuous) {
                      hasMergedSortingIssue = true;
                      console.log(`  ❌ 合并后曾祖父ID ${greatGrandId} 的商品分散在多个位置: [${indices.join(', ')}]`);
                    }
                  }
                });
                
                if (hasMergedSortingIssue) {
                  console.log('⚠️ 合并后发现排序问题：相同曾祖父ID的商品分散在多个位置');
                } else {
                  console.log('✅ 合并后排序正常');
                }
                console.log('==========================================\n');
              }
              
              console.log('\n========== 加载更多数据完成 ==========');
              console.log('📊 当前页码:', this.data.currentPage);
              console.log('📊 总页数:', res.result.page.totalPage);
              console.log('📊 新增商品数:', newItems.length);
              console.log('📊 合并后商品总数:', newGoodsArr.length);
              
              var hasMore = this.data.currentPage < res.result.page.totalPage;
              console.log('📊 hasMore 计算结果:', hasMore, '(当前页', this.data.currentPage, '< 总页数', res.result.page.totalPage, ')');
              
              this.setData({
                goodsArr: newGoodsArr,
                totalPage: res.result.page.totalPage,
                totalCount: res.result.page.totalCount,
                isLoading: false,
                hasMore: hasMore
              }, () => {
                // 加载更多数据后，重新获取位置信息
                console.log('✅ 加载更多数据完成，重新获取位置信息');
                console.log('==========================================\n');
                setTimeout(() => {
                  this.calculateCategoryPositions();
                }, 300);
              });
            } else {
              // 首次加载或刷新
              // 确保每个订单都有 purSelected 字段（如果接口没有返回，则初始化为 false）
              const goodsList = this._processGoodsList(res.result.page.list);
              
              this.setData({
                goodsArr: goodsList,
                totalPage: res.result.page.totalPage,
                totalCount: res.result.page.totalCount,
                hasMore: this.data.currentPage < res.result.page.totalPage
              }, () => {
                // 数据设置完成后，获取位置信息
                console.log('数据加载完成，开始获取位置信息');
                setTimeout(() => {
                  this.calculateCategoryPositions();
                  // 确保左侧菜单滚动到正确位置
                  if (this.data.selectedSub > 0) {
                    this.scrollLeftMenuToIndex(this.data.selectedSub);
                  }
                }, 300); // 延迟300ms确保DOM完全渲染完成
              });
            }
       
        } else {
          this.setData({
            isLoading: false
          });
        }
      
      }).catch(err => {
        console.error('获取数据失败:', err);
        this.setData({
          isLoading: false
        });
      })  
    },

     // 1，选择出库商品
     choiceStock(e) {
      console.log('\n=== choiceStock 开始 ===');
      var goodsIndex = e.currentTarget.dataset.goodsindex;
      console.log('🎯 商品索引:', goodsIndex);
      console.log('📊 商品对象:', this.data.goodsArr[goodsIndex]);
      
      var sel = this.data.goodsArr[goodsIndex].isSelected;
      console.log('📊 当前选中状态:', sel);
      console.log('📊 商品订单数量:', this.data.goodsArr[goodsIndex]?.nxDepartmentOrdersEntities?.length || 0);
      
      // 检查订单的 purSelected 状态
      if (this.data.goodsArr[goodsIndex]?.nxDepartmentOrdersEntities) {
        const orders = this.data.goodsArr[goodsIndex].nxDepartmentOrdersEntities;
        console.log('📊 订单 purSelected 状态:', orders.map((order, idx) => ({
          index: idx,
          orderId: order.nxDepartmentOrdersId,
          purSelected: order.purSelected,
          purSelectedType: typeof order.purSelected
        })));
        // 协作订单调试：选择商品时打印每个订单的协作相关字段
        orders.forEach((order, idx) => {
          var collabId = order.nxDoRequestDisId;
          var isCollab = collabId !== undefined && collabId !== null && collabId !== -1 && String(collabId) !== '-1';
          var fatherCode = order.fatherDepartmentOrderCode || (order.nxDepartmentEntity && order.nxDepartmentEntity.fatherDepartmentEntity ? order.nxDepartmentEntity.fatherDepartmentEntity.nxDepartmentOrderCode : null);
          var deptCode = order.nxDepartmentOrderCode || (order.nxDepartmentEntity ? order.nxDepartmentEntity.nxDepartmentOrderCode : null);
          var printName = '';
          if (isCollab) {
            printName = '[' + (order.nxDoRequestDistributerName || '') + ']';
            if (fatherCode) {
              printName += fatherCode;
            }
          } else {
            if (order.gbDepartmentName || order.fatherGbDepartmentName) {
              printName = (order.fatherGbDepartmentName ? order.fatherGbDepartmentName + '.' : '') + (order.gbDepartmentName || '');
            } else if (order.nxRestrauntAttrName) {
              printName = order.nxRestrauntAttrName;
            } else if (order.nxDepartmentAttrName) {
              printName = (order.nxDoDepartmentFatherId !== order.nxDoDepartmentId && order.fatherDepartmentAttrName ? order.fatherDepartmentAttrName + '.' : '') + (order.nxDepartmentAttrName || '');
            }
          }
          console.log('🖨️ 订单[' + idx + '] 协作调试:', {
            nxDepartmentOrdersId: order.nxDepartmentOrdersId,
            nxDoRequestDisId: collabId,
            nxDoRequestDistributerName: order.nxDoRequestDistributerName,
            isCollaborative: isCollab,
            fatherDepartmentOrderCode: fatherCode,
            nxDepartmentOrderCode: deptCode,
            printName: printName
          });
          console.log('🖨️ 订单[' + idx + '] 打印名称:', printName);
        });
      }
      
      var selData = "goodsArr[" + goodsIndex + "].isSelected";
      if (sel) {
        console.log('🔄 取消选择商品');
        // 取消选择商品时，自动将所有订单的 purSelected 设置为 false
        const orders = this.data.goodsArr[goodsIndex]?.nxDepartmentOrdersEntities || [];
        const orderUpdates = {};
        orders.forEach((order, orderIndex) => {
          const orderDataKey = `goodsArr[${goodsIndex}].nxDepartmentOrdersEntities[${orderIndex}].purSelected`;
          orderUpdates[orderDataKey] = false;
        });
        console.log('📊 准备取消的订单数量:', orders.length);
        
        this.setData({
          [selData]: false,
          ...orderUpdates
        });
        this._updateStockOrdersChoiceArr(false, goodsIndex);
      } else {
        console.log('✅ 选择商品');
        // 选择商品时，自动将所有订单的 purSelected 设置为 true
        const orders = this.data.goodsArr[goodsIndex]?.nxDepartmentOrdersEntities || [];
        const orderUpdates = {};
        orders.forEach((order, orderIndex) => {
          const orderDataKey = `goodsArr[${goodsIndex}].nxDepartmentOrdersEntities[${orderIndex}].purSelected`;
          orderUpdates[orderDataKey] = true;
        });
        console.log('📊 准备设置的订单数量:', orders.length);
        console.log('📊 订单更新对象:', Object.keys(orderUpdates));
        
        this.setData({
          [selData]: true,
          ...orderUpdates
        }, () => {
          console.log('📊 选择商品后，订单 purSelected 状态:', 
            this.data.goodsArr[goodsIndex]?.nxDepartmentOrdersEntities?.map((order, idx) => ({
              index: idx,
              orderId: order.nxDepartmentOrdersId,
              purSelected: order.purSelected
            }))
          );
        });
        this._updateStockOrdersChoiceArr(true, goodsIndex);
      }
      console.log('=== choiceStock 结束 ===\n');
      
      // 如果是部门模式，更新全选状态
      if (this.data.viewMode === 'department') {
        this._checkAllDepartmentSelected();
      }
    },

    // 检查部门模式下是否全选
    _checkAllDepartmentSelected() {
      if (this.data.viewMode !== 'department' || !this.data.goodsArr || this.data.goodsArr.length === 0) {
        this.setData({
          isAllDepartmentSelected: false
        });
        return;
      }
      
      // 检查所有商品是否都已选中
      var allSelected = this.data.goodsArr.every(function(goods) {
        return goods.isSelected === true;
      });
      
      this.setData({
        isAllDepartmentSelected: allSelected
      });
    },

    // 部门模式下全选/取消全选
    selectAllDepartmentGoods() {
      if (this.data.viewMode !== 'department' || !this.data.goodsArr || this.data.goodsArr.length === 0) {
        return;
      }
      
      var isAllSelected = this.data.isAllDepartmentSelected;
      var updates = {};
      var that = this;
      
      // 如果是全选操作，先清空 choiceStockArr，避免累计
      if (!isAllSelected) {
        // 全选：先清空 choiceStockArr，然后重新添加所有商品
        this.setData({
          choiceStockArr: []
        });
      }
      
      // 遍历所有商品
      this.data.goodsArr.forEach(function(goods, goodsIndex) {
        var goodsDataKey = `goodsArr[${goodsIndex}].isSelected`;
        updates[goodsDataKey] = !isAllSelected;
        
        // 如果商品有订单，也要更新订单的选中状态
        if (goods.nxDepartmentOrdersEntities && goods.nxDepartmentOrdersEntities.length > 0) {
          goods.nxDepartmentOrdersEntities.forEach(function(order, orderIndex) {
            var orderDataKey = `goodsArr[${goodsIndex}].nxDepartmentOrdersEntities[${orderIndex}].purSelected`;
            updates[orderDataKey] = !isAllSelected;
          });
        }
      });
      
      // 更新数据
      this.setData(updates, () => {
        // 更新 choiceStockArr
        if (!isAllSelected) {
          // 全选：重新添加所有商品到 choiceStockArr
          this.data.goodsArr.forEach((goods, goodsIndex) => {
            this._updateStockOrdersChoiceArr(true, goodsIndex);
          });
        } else {
          // 取消全选：从 choiceStockArr 移除所有商品
          // 由于已经清空了 choiceStockArr，这里只需要确保所有商品都从数组中移除
          var goodsIds = this.data.goodsArr.map(goods => goods.nxDistributerGoodsId);
          var newArr = (this.data.choiceStockArr || []).filter(item => !goodsIds.includes(item.nxGoodsId));
          this.setData({
            choiceStockArr: newArr
          });
        }
        
        // 更新全选状态
        this.setData({
          isAllDepartmentSelected: !isAllSelected
        });
      });
    },

    _updateStockOrdersChoiceArr(what, index) {
      console.log('\n=== _updateStockOrdersChoiceArr 开始 ===');
      console.log("📊 参数 - what:", what, "index:", index);
      var oldArr = this.data.choiceStockArr || [];
      console.log("📊 当前 choiceStockArr 长度:", oldArr.length);

      if (what) {
        var goodsId = this.data.goodsArr[index].nxDistributerGoodsId;
        console.log("📊 商品ID:", goodsId);
        console.log("📊 商品订单数量:", this.data.goodsArr[index]?.nxDepartmentOrdersEntities?.length || 0);
        
        // 检查订单的 purSelected 状态
        if (this.data.goodsArr[index]?.nxDepartmentOrdersEntities) {
          const orders = this.data.goodsArr[index].nxDepartmentOrdersEntities;
          console.log("📊 订单 purSelected 状态（选择商品前）:", orders.map((order, idx) => ({
            index: idx,
            orderId: order.nxDepartmentOrdersId,
            purSelected: order.purSelected,
            purSelectedType: typeof order.purSelected
          })));
        }
        
        // 创建商品对象的副本，只包含必要字段，避免循环引用
        var goodsItem = this.data.goodsArr[index];
        var goodsCopy = {
          nxDistributerGoodsId: goodsItem.nxDistributerGoodsId,
          nxDgGoodsName: goodsItem.nxDgGoodsName,
          nxDgDfgGoodsFatherId: goodsItem.nxDgDfgGoodsFatherId,
          nxDgDfgGoodsGrandId: goodsItem.nxDgDfgGoodsGrandId,
          nxDgBuyingPriceOne: goodsItem.nxDgBuyingPriceOne,
          nxDgGoodsStandardname: goodsItem.nxDgGoodsStandardname,
          nxDepartmentOrdersEntities: goodsItem.nxDepartmentOrdersEntities ? goodsItem.nxDepartmentOrdersEntities.map(function(order) {
            // 只复制订单的必要字段
            return {
              nxDepartmentOrdersId: order.nxDepartmentOrdersId,
              purSelected: order.purSelected,
              nxDoQuantity: order.nxDoQuantity,
              nxDoWeight: order.nxDoWeight,
              nxDoStandard: order.nxDoStandard,
              nxDoRemark: order.nxDoRemark,
              nxDoGbDepartmentId: order.nxDoGbDepartmentId,
              gbDepartmentName: order.gbDepartmentName,
              fatherGbDepartmentName: order.fatherGbDepartmentName,
              nxDepartmentAttrName: order.nxDepartmentAttrName,
              fatherDepartmentAttrName: order.fatherDepartmentAttrName,
              nxRestrauntAttrName: order.nxRestrauntAttrName
            };
          }) : []
        };
        
        var newItem = {
          goodsIndex: index,
          nxGoodsId: goodsId,
          item: goodsCopy
        };
        
        // 创建新数组，避免直接修改原数组，并确保所有对象都是新创建的
        var newArr = [];
        for (var i = 0; i < oldArr.length; i++) {
          var oldItem = oldArr[i];
          var oldGoods = oldItem.item;
          // 重新创建商品对象，确保没有循环引用
          var recreatedGoods = {
            nxDistributerGoodsId: oldGoods.nxDistributerGoodsId,
            nxDgGoodsName: oldGoods.nxDgGoodsName,
            nxDgDfgGoodsFatherId: oldGoods.nxDgDfgGoodsFatherId,
            nxDgDfgGoodsGrandId: oldGoods.nxDgDfgGoodsGrandId,
            nxDgBuyingPriceOne: oldGoods.nxDgBuyingPriceOne,
            nxDgGoodsStandardname: oldGoods.nxDgGoodsStandardname,
            nxDepartmentOrdersEntities: oldGoods.nxDepartmentOrdersEntities ? oldGoods.nxDepartmentOrdersEntities.map(function(order) {
              return {
                nxDepartmentOrdersId: order.nxDepartmentOrdersId,
                purSelected: order.purSelected,
                nxDoQuantity: order.nxDoQuantity,
                nxDoWeight: order.nxDoWeight,
                nxDoStandard: order.nxDoStandard,
                nxDoRemark: order.nxDoRemark,
                nxDoGbDepartmentId: order.nxDoGbDepartmentId,
                gbDepartmentName: order.gbDepartmentName,
                fatherGbDepartmentName: order.fatherGbDepartmentName,
                nxDepartmentAttrName: order.nxDepartmentAttrName,
                fatherDepartmentAttrName: order.fatherDepartmentAttrName,
                nxRestrauntAttrName: order.nxRestrauntAttrName
              };
            }) : []
          };
          newArr.push({
            goodsIndex: oldItem.goodsIndex,
            nxGoodsId: oldItem.nxGoodsId,
            item: recreatedGoods
          });
        }
        newArr.push(newItem);
        
        console.log("✅ 添加商品到 choiceStockArr");
        this.setData({
          choiceStockArr: newArr,
        }, () => {
          // 如果是部门模式，更新全选状态
          if (this.data.viewMode === 'department') {
            this._checkAllDepartmentSelected();
          }
          // 检查选择后的状态
          if (this.data.goodsArr[index]?.nxDepartmentOrdersEntities) {
            const orders = this.data.goodsArr[index].nxDepartmentOrdersEntities;
            console.log("📊 订单 purSelected 状态（选择商品后）:", orders.map((order, idx) => ({
              index: idx,
              orderId: order.nxDepartmentOrdersId,
              purSelected: order.purSelected,
              purSelectedType: typeof order.purSelected
            })));
          }
        });
      } else {
        var nxGoodsId = this.data.goodsArr[index].nxDistributerGoodsId;
        console.log("📊 移除商品ID:", nxGoodsId);
        // 创建新数组，避免直接修改原数组
        var newArr = oldArr.filter(item => item.nxGoodsId !== nxGoodsId);
        console.log("✅ 从 choiceStockArr 移除商品");
        this.setData({
          choiceStockArr: newArr,
        })
      }
      if ((this.data.choiceStockArr || []).length > 0) {
        console.log("wllwwlarrrr")
        this.showButton()
      } else {
        this.hideButton();
      }
    },

    showButton() {
    
      this.animation.translateY(0).step();
      this.setData({
        buttonAnimation: this.animation.export(),
      });
    },

    // 2，选择出库商品中的订单
    choiceOrders(e) {
      console.log('\n=== choiceOrders 开始 ===');
      var goodsIndex = e.currentTarget.dataset.goodsindex;
      var orderIndex = e.currentTarget.dataset.orderindex;
      console.log('🎯 商品索引:', goodsIndex);
      console.log('🎯 订单索引:', orderIndex);
      
      var choice = this.data.goodsArr[goodsIndex].isSelected;
      console.log('📊 商品是否已选中 (isSelected):', choice);
      console.log('📊 商品对象:', this.data.goodsArr[goodsIndex]);
      
      if(choice){
        console.log('✅ 商品已选中，可以操作订单');
        var order = this.data.goodsArr[goodsIndex].nxDepartmentOrdersEntities[orderIndex];
        console.log('📊 订单对象:', order);
        console.log('📊 订单ID:', order?.nxDepartmentOrdersId);
        // 协作订单调试：选择订单时立即打印
        var collabId = order?.nxDoRequestDisId;
        var collabName = order?.nxDoRequestDistributerName;
        var isCollaborative = collabId !== undefined && collabId !== null && collabId !== -1 && String(collabId) !== '-1';
        console.log('🖨️ 选择订单-协作调试:', {
          nxDepartmentOrdersId: order?.nxDepartmentOrdersId,
          nxDoRequestDisId: collabId,
          nxDoRequestDisId_type: typeof collabId,
          nxDoRequestDistributerName: collabName,
          isCollaborative: isCollaborative,
          fatherDepartmentOrderCode: order?.fatherDepartmentOrderCode,
          nxDepartmentOrderCode: order?.nxDepartmentOrderCode,
          hasNxDepartmentEntity: !!(order && order.nxDepartmentEntity)
        });
        
        var orderChoice = order?.purSelected;
        console.log('📊 订单当前 purSelected 值:', orderChoice);
        console.log('📊 订单 purSelected 类型:', typeof orderChoice);
        console.log('📊 订单 purSelected 是否为 undefined:', orderChoice === undefined);
        console.log('📊 订单 purSelected 是否为 null:', orderChoice === null);
        
        var goodsId = this.data.goodsArr[goodsIndex].nxDistributerGoodsId;
        var data = "goodsArr[" + goodsIndex + "].nxDepartmentOrdersEntities[" + orderIndex + "].purSelected";
        console.log('📊 setData 路径:', data);
        
        if (orderChoice) {
          console.log('🔄 取消选择订单');
          this.setData({
            [data]: false
          }, () => {
            console.log('📊 取消选择后，订单 purSelected 值:', this.data.goodsArr[goodsIndex].nxDepartmentOrdersEntities[orderIndex].purSelected);
          });
          this._updateChoiceArr(goodsId, goodsIndex);
        } else {
          console.log('✅ 选择订单');
          this.setData({
            [data]: true
          }, () => {
            console.log('📊 选择后，订单 purSelected 值:', this.data.goodsArr[goodsIndex].nxDepartmentOrdersEntities[orderIndex].purSelected);
          });
          this._updateChoiceArr(goodsId, goodsIndex);
        }
      } else {
        console.log('❌ 商品未选中，无法操作订单');
      }
      console.log('=== choiceOrders 结束 ===\n');
    },

    _updateChoiceArr(id, goodsIndex) {
      var orderArr = this.data.goodsArr[goodsIndex].nxDepartmentOrdersEntities;
      var orderSelCount = 0;
      for (var i = 0; i < orderArr.length; i++) {
        var sel = orderArr[i].purSelected;
        console.log("reeww", i, 'sel=====', sel, "-=--------", orderSelCount);
        if (sel) {
          orderSelCount = Number(orderSelCount) + Number(1);
        }
      }
      console.log("resussososodltlltltltlt ======", orderSelCount);
      var selGoodsData = "goodsArr[" + goodsIndex + "].isSelected";
      if (orderSelCount == 0) {
        this.setData({
          [selGoodsData]: false
        })
        //order
        var orderArr = this.data.goodsArr[goodsIndex].nxDepartmentOrdersEntities;
        var orderSelCount = 0;
        for (var i = 0; i < orderArr.length; i++) {
          var data = "goodsArr[" + goodsIndex + "].nxDepartmentOrdersEntities[" + i + "].purSelected";
          this.setData({
            [data]: true,
          })
        }

        //choice
        var selArr = this.data.choiceStockArr;
        selArr.splice(selArr.findIndex(item => item.nxGoodsId === id), 1);
        this.setData({
          choiceStockArr: selArr,
        })
     
      } else {
        var selArr = this.data.choiceStockArr;
        const item = selArr.find(element => element.nxGoodsId === id);
        console.log("Aaaa")
        item.nxDepartmentOrdersEntities = orderArr;
      }

    },

    // 加载指定部门的商品数据（按客户模式）
    _loadDepartmentGoods(depId, depIndex) {
      load.showLoading("获取商品中");
      const data = {
        disId: this.data.disId,
        depId: depId,
      };
      
      return disGetTypePrepareOutByDep(data)
        .then(res => {
          load.hideLoading();
          console.log('部门商品数据:', res.result);
          console.log('部门商品数据 data:', res.result?.data);
          
          if (!res.result) {
            console.error('接口返回数据格式错误:', res);
            wx.showToast({
              title: '接口返回数据格式错误',
              icon: 'none'
            });
            return;
          }
          
          if (res.result.code == 0) {
            // 新接口直接返回商品数组
            let goodsList = res.result.data || [];
            console.log('返回商品数组长度:', goodsList.length);
            
            // 确保每个订单都有 purSelected 字段（如果接口没有返回，则初始化为 false）
            goodsList = this._processGoodsList(goodsList);
            
            // 检查数据大小和结构
            if (goodsList.length > 0) {
              const dataStr = JSON.stringify(goodsList);
              const dataSizeKB = (dataStr.length * 2 / 1024).toFixed(2);
              console.log('📊 部门商品数据大小:', dataSizeKB, 'KB');
              
              const firstItem = goodsList[0];
              console.log('第一个商品数据结构:', firstItem);
              console.log('第一个商品是否包含 isSelected:', !!firstItem.isSelected);
              console.log('第一个商品是否包含 nxDepartmentOrdersEntities:', !!firstItem.nxDepartmentOrdersEntities);
              console.log('第一个商品是否包含 nxDgDfgGoodsGreatGrandId:', !!firstItem.nxDgDfgGoodsGreatGrandId);
              
              // 检查订单数据结构
              if (firstItem.nxDepartmentOrdersEntities && firstItem.nxDepartmentOrdersEntities.length > 0) {
                const firstOrder = firstItem.nxDepartmentOrdersEntities[0];
                console.log('第一个订单数据结构:', firstOrder);
                console.log('第一个订单是否包含 purSelected:', !!firstOrder.purSelected);
                console.log('第一个订单是否包含扁平化字段 (nxDepartmentAttrName):', !!firstOrder.nxDepartmentAttrName);
                console.log('第一个订单是否包含嵌套对象 (nxDepartmentEntity):', !!firstOrder.nxDepartmentEntity);
              }
            }
            
            // 根据商品数据生成分类信息（用于锚点）- 使用曾祖父ID
            const categoryMap = new Map();
            goodsList.forEach(goods => {
              const categoryId = goods.nxDgDfgGoodsGreatGrandId; // 使用曾祖父ID
              if (categoryId && !categoryMap.has(categoryId)) {
                categoryMap.set(categoryId, {
                  nxDistributerFatherGoodsId: categoryId,
                  nxDfgFatherGoodsName: goods.nxDgNxGreatGrandName || goods.nxDgNxGrandName || '未分类',
                  nxDfgFatherGoodsSort: goods.nxDgDfgGoodsGreatGrandSort || goods.nxDgGoodsSort || 0,
                  newOrderCount: 0 // 需要统计该分类下的订单数量
                });
              }
              // 统计订单数量
              if (categoryId && goods.nxDepartmentOrdersEntities) {
                const category = categoryMap.get(categoryId);
                if (category) {
                  category.newOrderCount = (category.newOrderCount || 0) + (goods.nxDepartmentOrdersEntities.length || 0);
                }
              }
            });
            
            const categoryArr = Array.from(categoryMap.values());
            // 按排序字段排序
            categoryArr.sort((a, b) => (a.nxDfgFatherGoodsSort || 0) - (b.nxDfgFatherGoodsSort || 0));
            
            console.log('处理后的商品数组长度:', goodsList.length);
            console.log('分类数组长度:', categoryArr.length);
            
            // 获取部门名称
            var depName = '';
            if (this.data.depArr && this.data.depArr[depIndex]) {
              depName = this.data.depArr[depIndex].depAttrName || '';
            }
            
            this.setData({
              selectedDepId: depId,
              selectedCollDisId: null,
              isCollDisMode: false,
              isAllDepartmentSelected: false, // 重置全选状态
              selectedSub: depIndex,
              selDepName: depName, // 设置选中的部门名称
              goodsArr: goodsList,
              goodsCataArr: categoryArr, // 保存分类信息用于锚点
            }, () => {
              // 重新获取位置信息
              setTimeout(() => {
                this.calculateCategoryPositions();
              }, 300);
            });
          } else {
            wx.showToast({
              title: res.result.msg || '获取商品数据失败',
              icon: 'none'
            });
          }
        })
        .catch(err => {
          console.error('_loadDepartmentGoods 请求失败:', err);
          load.hideLoading();
          let errorMsg = '获取商品数据失败';
          if (err.message && err.message.includes('404')) {
            errorMsg = '接口不存在，请检查接口是否已实现';
          }
          wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 3000
          });
        });
    },

    // 加载协作商家的商品数据（按客户模式 - 协作商家）
    _loadCollDisGoods(collDisId) {
      load.showLoading("获取商品中");
      const data = {
        disId: this.data.disId,
        collDisId: collDisId,
      };
      
      return disGetTypePrepareOutByCollDis(data)
        .then(res => {
          load.hideLoading();
          console.log('协作商家商品数据:', res.result);
          
          if (!res.result) {
            console.error('接口返回数据格式错误:', res);
            wx.showToast({
              title: '接口返回数据格式错误',
              icon: 'none'
            });
            return;
          }
          
          if (res.result.code == 0) {
            let goodsList = res.result.data || [];
            console.log('协作商家返回商品数组长度:', goodsList.length);
            
            // 确保每个订单都有 purSelected 字段
            goodsList = goodsList.map(goods => {
              if (goods.nxDepartmentOrdersEntities && Array.isArray(goods.nxDepartmentOrdersEntities)) {
                goods.nxDepartmentOrdersEntities = goods.nxDepartmentOrdersEntities.map(order => {
                  if (order.purSelected === undefined || order.purSelected === null) {
                    order.purSelected = false;
                  }
                  return order;
                });
              }
              if (goods.isSelected === undefined || goods.isSelected === null) {
                goods.isSelected = false;
              }
              return goods;
            });
            
            // 根据商品数据生成分类信息（用于锚点）
            const categoryMap = new Map();
            goodsList.forEach(goods => {
              const categoryId = goods.nxDgDfgGoodsGreatGrandId;
              if (categoryId && !categoryMap.has(categoryId)) {
                categoryMap.set(categoryId, {
                  nxDistributerFatherGoodsId: categoryId,
                  nxDfgFatherGoodsName: goods.nxDgNxGreatGrandName || goods.nxDgNxGrandName || '未分类',
                  nxDfgFatherGoodsSort: goods.nxDgDfgGoodsGreatGrandSort || goods.nxDgGoodsSort || 0,
                  newOrderCount: 0
                });
              }
              if (categoryId && goods.nxDepartmentOrdersEntities) {
                const category = categoryMap.get(categoryId);
                if (category) {
                  category.newOrderCount = (category.newOrderCount || 0) + (goods.nxDepartmentOrdersEntities.length || 0);
                }
              }
            });
            
            const categoryArr = Array.from(categoryMap.values());
            categoryArr.sort((a, b) => (a.nxDfgFatherGoodsSort || 0) - (b.nxDfgFatherGoodsSort || 0));
            
            // 获取协作商家名称
            const collDis = this.data.offArr.find(d => d.nxDistributerId == collDisId);
            const collName = collDis ? (collDis.nxDistributerShowName || collDis.nxDistributerName || '') : '';
            
            this.setData({
              selectedDepId: null,
              selectedCollDisId: collDisId,
              isCollDisMode: true,
              isAllDepartmentSelected: false,
              selDepName: collName,
              goodsArr: goodsList,
              goodsCataArr: categoryArr,
            }, () => {
              setTimeout(() => {
                this.calculateCategoryPositions();
              }, 300);
            });
          } else {
            wx.showToast({
              title: res.result.msg || '获取商品数据失败',
              icon: 'none'
            });
          }
        })
        .catch(err => {
          console.error('_loadCollDisGoods 请求失败:', err);
          load.hideLoading();
          let errorMsg = '获取商品数据失败';
          if (err.message && err.message.includes('404')) {
            errorMsg = '接口不存在，请检查接口是否已实现';
          }
          wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 3000
          });
        });
    },

    // 3，保存出库商品订单为采购订单
    savePlanPurchase(e) {
      var type = e.currentTarget.dataset.type;
      var that = this;
      
      // 先收集选中的商品名称（从 goodsArr 中获取）
      var goodsNames = [];
      
      // 遍历 goodsArr，找出有选中订单的商品
      for (var i = 0; i < this.data.goodsArr.length; i++) {
        var goods = this.data.goodsArr[i];
        if (goods.nxDepartmentOrdersEntities && goods.nxDepartmentOrdersEntities.length > 0) {
          // 检查是否有选中的订单
          var hasSelected = false;
          for (var j = 0; j < goods.nxDepartmentOrdersEntities.length; j++) {
            if (goods.nxDepartmentOrdersEntities[j].purSelected) {
              hasSelected = true;
              break;
            }
          }
          
          if (hasSelected && goods.nxDgGoodsName) {
            goodsNames.push(goods.nxDgGoodsName);
          }
        }
      }
      
      // 如果没有选中的订单，直接返回
      if (goodsNames.length === 0) {
        wx.showToast({
          title: '请先选择要采购的商品',
          icon: 'none'
        });
        return;
      }
      
      // 构建提示内容
      var content = '';
      if (goodsNames.length === 1) {
        content = '"' + goodsNames[0] + '"的订单将在"未采购"中。';
      } else if (goodsNames.length <= 3) {
        content = '"' + goodsNames.join('"、"') + '"的订单将在"未采购"中。';
      } else {
        content = '"' + goodsNames.slice(0, 3).join('"、"') + '"等' + goodsNames.length + '个商品的订单将在"未采购"中。';
      }
      
      wx.showModal({
        title: '提示',
        content: content,
        confirmText: '确定',
        cancelText: '取消',
        success: function(res) {
          if (res.confirm) {
            // 用户确认后，执行保存操作
            var list = that._getPurGoodsList(type);
            that.setData({
        list: list
            });
      load.showLoading("保存数据中");
      savePlanPurchaseOrderBundle(list).then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          
          // 显示成功提示
          wx.showToast({
            title: '保存成功',
            icon: 'success',
            duration: 1500
          });
          
          // 刷新页面数据，保持当前选择
          that._refreshDataWithSelection();
                
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
            });
          }
        }
      });
    },
    // 3.1
    _getPurGoodsList(type) {
   
      var list = [];
      var priceLeve = "0";

      var arr = this.data.choiceStockArr;
      console.log('📊 choiceStockArr 长度:', arr.length);
      
      if (arr.length > 0) {
        for (var i = 0; i < arr.length; i++) {
          var choiceItem = arr[i];
          var goodsIndex = choiceItem.goodsIndex;
          
          // 从 goodsArr 中获取最新的商品数据
          if (!this.data.goodsArr[goodsIndex]) {
            console.log('⚠️ 商品索引不存在:', goodsIndex);
            continue;
          }
          
          var goods = this.data.goodsArr[goodsIndex];
          var goodsId = goods.nxDistributerGoodsId;
          var fatherGoodsId = goods.nxDgDfgGoodsFatherId;
          var grandGoodsId = goods.nxDgDfgGoodsGrandId;
          var costPrice = goods.nxDgBuyingPriceOne;
          var defaultStandard = goods.nxDgGoodsStandardname || '';
          
          // 按 nxDoStandard 分组收集选中的订单
          // key: 规格名, value: { orders: [订单副本数组], totalQuantity: 数量合计 }
          var standardGroupMap = {};
          
          if (goods.nxDepartmentOrdersEntities && goods.nxDepartmentOrdersEntities.length > 0) {
            for (var j = 0; j < goods.nxDepartmentOrdersEntities.length; j++) {
              var order = goods.nxDepartmentOrdersEntities[j];
              // 只处理 purSelected 为 true 的订单
              if (order.purSelected) {
                // 订单规格：如果为空则用商品默认规格
                var orderStandard = order.nxDoStandard || defaultStandard;
                
                if (!standardGroupMap[orderStandard]) {
                  standardGroupMap[orderStandard] = {
                    orders: [],
                    totalQuantity: 0
                  };
                }
                
                // 创建订单副本
                var orderCopy = {
                  nxDepartmentOrdersId: order.nxDepartmentOrdersId,
                  purSelected: order.purSelected,
                  nxDoQuantity: order.nxDoQuantity,
                  nxDoWeight: order.nxDoWeight,
                  nxDoStandard: order.nxDoStandard,
                  nxDoRemark: order.nxDoRemark,
                  nxDoGbDepartmentId: order.nxDoGbDepartmentId,
                  gbDepartmentName: order.gbDepartmentName,
                  fatherGbDepartmentName: order.fatherGbDepartmentName,
                  nxDepartmentAttrName: order.nxDepartmentAttrName,
                  fatherDepartmentAttrName: order.fatherDepartmentAttrName,
                  nxRestrauntAttrName: order.nxRestrauntAttrName
                };
                
                // 设置成本价格相关字段
                orderCopy.nxDoCostPrice = costPrice;
                orderCopy.nxDoCostPriceLevel = 0;
                orderCopy.nxDoCostPriceUpdate = this.data.upTime;
                
                standardGroupMap[orderStandard].orders.push(orderCopy);
                standardGroupMap[orderStandard].totalQuantity += Number(order.nxDoQuantity) || 0;
              }
            }
          }

          // 每个规格组生成一个采购商品
          var standardKeys = Object.keys(standardGroupMap);
          for (var s = 0; s < standardKeys.length; s++) {
            var standardName = standardKeys[s];
            var group = standardGroupMap[standardName];
            
            if (group.orders.length > 0) {
              var purGoods = {
                nxDpgDisGoodsId: goodsId,
                nxDpgDisGoodsFatherId: fatherGoodsId,
                nxDpgDisGoodsGrandId: grandGoodsId,
                nxDpgDistributerId: this.data.disId,
                nxDepartmentOrdersEntities: group.orders,
                nxDpgQuantity: group.totalQuantity,
                nxDpgApplyDate: this.data.arriveDate,
                nxDpgPurUserId: this.data.userInfo.nxDistributerUserId,
                nxDpgCostLevel: priceLeve,
                nxDpgExpectPrice: costPrice,
                nxDpgStandard: standardName,
              };
              list.push(purGoods);
              
              console.log(`📊 商品 ${goods.nxDgGoodsName} 规格"${standardName}" → ${group.orders.length} 个订单，数量合计 ${group.totalQuantity}`);
            }
          }
        }
      }
      
      console.log('📊 最终采购商品数量:', list.length);
      console.log('📊 采购商品详情:', list.map(function(item) {
        return {
          goodsId: item.nxDpgDisGoodsId,
          standard: item.nxDpgStandard,
          quantity: item.nxDpgQuantity,
          orderCount: item.nxDepartmentOrdersEntities.length
        };
      }));
      
      return list;

    },



     // 打印出库单
     toPrint() {
      // 检查是否有选中的商品
      const selectedArr = this.data.choiceStockArr;
      if (!selectedArr || selectedArr.length === 0) {
        wx.showToast({
          title: '请先选择要打印的商品',
          icon: 'none'
        });
        return;
      }
      
      // 从 goodsArr 实时读取最新的 purSelected 状态，只保存选中的订单
      var sortedPrintArr = [];
      for (var i = 0; i < selectedArr.length; i++) {
        var choiceItem = selectedArr[i];
        var goodsIndex = choiceItem.goodsIndex;
        
        // 从 goodsArr 中获取最新的商品数据
        if (this.data.goodsArr[goodsIndex]) {
          var goods = this.data.goodsArr[goodsIndex];
          
          // 只收集 purSelected 为 true 的订单
          var selectedOrders = [];
          if (goods.nxDepartmentOrdersEntities && goods.nxDepartmentOrdersEntities.length > 0) {
            for (var j = 0; j < goods.nxDepartmentOrdersEntities.length; j++) {
              var order = goods.nxDepartmentOrdersEntities[j];
              if (order.purSelected) {
                // 创建订单副本，避免修改原数据
                var orderCopy = {
                  nxDepartmentOrdersId: order.nxDepartmentOrdersId,
                  purSelected: order.purSelected,
                  nxDoQuantity: order.nxDoQuantity,
                  nxDoWeight: order.nxDoWeight,
                  nxDoStandard: order.nxDoStandard,
                  nxDoRemark: order.nxDoRemark,
                  nxDoDepartmentId: order.nxDoDepartmentId,
                  nxDoDepartmentFatherId: order.nxDoDepartmentFatherId,
                  nxDoGbDepartmentId: order.nxDoGbDepartmentId,
                  gbDepartmentName: order.gbDepartmentName,
                  fatherGbDepartmentName: order.fatherGbDepartmentName,
                  nxDepartmentAttrName: order.nxDepartmentAttrName,
                  fatherDepartmentAttrName: order.fatherDepartmentAttrName,
                  nxRestrauntAttrName: order.nxRestrauntAttrName,
                  // 保留嵌套对象（打印页面可能需要）
                  gbDepartmentEntity: order.gbDepartmentEntity,
                  nxDepartmentEntity: order.nxDepartmentEntity,
                };
                // 协作订单：传递协作商名称和部门编码，用于打印标签
                // 调试日志：打印订单的协作相关字段
                var collabId = order.nxDoRequestDisId;
                var collabName = order.nxDoRequestDistributerName;
                var isCollaborative = collabId !== undefined && collabId !== null && collabId !== -1 && String(collabId) !== '-1';
                console.log('🖨️ 打印订单调试:', {
                  nxDepartmentOrdersId: order.nxDepartmentOrdersId,
                  nxDoRequestDisId: collabId,
                  nxDoRequestDisId_type: typeof collabId,
                  nxDoRequestDistributerName: collabName,
                  isCollaborative: isCollaborative,
                  fatherDepartmentOrderCode: order.fatherDepartmentOrderCode,
                  nxDepartmentOrderCode: order.nxDepartmentOrderCode,
                  hasNxDepartmentEntity: !!order.nxDepartmentEntity
                });
                if (isCollaborative) {
                  orderCopy.nxDoRequestDisId = collabId;
                  orderCopy.nxDoRequestDistributerName = collabName;
                  orderCopy.fatherDepartmentOrderCode = order.fatherDepartmentOrderCode || (order.nxDepartmentEntity && order.nxDepartmentEntity.fatherDepartmentEntity ? order.nxDepartmentEntity.fatherDepartmentEntity.nxDepartmentOrderCode : null);
                  orderCopy.nxDepartmentOrderCode = order.nxDepartmentOrderCode || (order.nxDepartmentEntity ? order.nxDepartmentEntity.nxDepartmentOrderCode : null);
                  console.log('🖨️ 协作订单已标记:', { orderCopy: orderCopy });
                }
                selectedOrders.push(orderCopy);
              }
            }
          }
          
          // 如果有选中的订单，才添加到打印列表
          if (selectedOrders.length > 0) {
            // 创建商品副本，只包含选中的订单
            var goodsCopy = {
              nxDistributerGoodsId: goods.nxDistributerGoodsId,
              nxDgGoodsName: goods.nxDgGoodsName,
              nxDgDfgGoodsFatherId: goods.nxDgDfgGoodsFatherId,
              nxDgDfgGoodsGrandId: goods.nxDgDfgGoodsGrandId,
              nxDgBuyingPriceOne: goods.nxDgBuyingPriceOne,
              nxDgGoodsStandardname: goods.nxDgGoodsStandardname,
              nxDgGoodsBrand: goods.nxDgGoodsBrand,
              nxDgGoodsStandardWeight: goods.nxDgGoodsStandardWeight,
              nxDgGoodsPlace: goods.nxDgGoodsPlace,
              nxDgGoodsDetail: goods.nxDgGoodsDetail,
              nxDepartmentOrdersEntities: selectedOrders,
              isSelected: goods.isSelected
            };
            
            sortedPrintArr.push({
              goodsIndex: goodsIndex,
              nxGoodsId: goods.nxDistributerGoodsId,
              item: goodsCopy
            });
          }
        }
      }
      
      // 按照页面数据顺序排序
      sortedPrintArr.sort((a, b) => {
        return a.goodsIndex - b.goodsIndex;
      });
      
      if (sortedPrintArr.length === 0) {
        wx.showToast({
          title: '请先选择要打印的订单',
          icon: 'none'
        });
        return;
      }
      
      console.log('📊 准备打印的商品数量:', sortedPrintArr.length);
      console.log('📊 选中的订单详情:', sortedPrintArr.map(item => ({
        goodsName: item.item.nxDgGoodsName,
        orderCount: item.item.nxDepartmentOrdersEntities.length
      })));
      
      // 设置打印标识和商品数据
      wx.setStorageSync('toPrintWx', true);
      wx.setStorageSync('selArr', sortedPrintArr);
      // 设置标识，表示跳转到打印页面（返回时不要刷新）
      wx.setStorageSync('fromPrintPage', true);
      
      // 传递页面类型和显示模式，用于区分4种打印情况
      // pageType: 'stock' 出库页面, 'purchase' 采购页面
      // viewMode: 'category' 按商品显示, 'department' 按部门显示
      wx.setStorageSync('printPageType', 'stock');
      wx.setStorageSync('printViewMode', this.data.viewMode);
      
      // 出库页面总是使用 nxDepartmentOrdersEntities 字段（不使用 orders 字段）
      // 所以 useSimpleFields 应该为 false
      wx.setStorageSync('printUseSimpleFields', false);
      
      // 如果是按部门显示，获取部门名称并传递
      if (this.data.viewMode === 'department' && this.data.depArr && this.data.selectedSub !== undefined && this.data.depArr[this.data.selectedSub]) {
        var customerName = this.data.depArr[this.data.selectedSub].depAttrName || '';
        if (customerName) {
          wx.setStorageSync('printCustomerName', customerName);
          console.log('✓ 传递客户名称到打印页面:', customerName);
        } else {
          wx.setStorageSync('printCustomerName', '');
        }
      } else {
        wx.setStorageSync('printCustomerName', '');
      }
      
      // 兼容旧参数（保留一段时间，确保旧代码能正常工作）
      wx.setStorageSync('stockPrintViewMode', this.data.viewMode);
      wx.setStorageSync('useSimpleFields', this.data.viewMode === 'category');
      if (this.data.viewMode === 'department' && customerName) {
        wx.setStorageSync('stockCustomerName', customerName);
      }
      
      this.setData({
        selectedArr: [],
        selectedPrintArr: [],
      });
      
      // 跳转到打印页面
      wx.navigateTo({
        url: '../../../subPackage/pages/prepare/printWeightOrders/printWeightOrders',
      });
    },

    // 跳转到打印机设置页面
    toPrinterSet() {
      wx.showModal({
        title: '提示',
        content: '未设置标签打印机，请先设置打印机',
        confirmText: '去设置',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            wx.navigateTo({
              url: '../../../subPackage/pages/management/labelPrinter/labelPrinter',
            });
          }
        }
      });
    },

    // 打印标签
    toPrintSize(e) {
      var type = e.currentTarget.dataset.type;
      console.log('toPrintSize 被调用，type:', type);
      
      // 检查是否有选中的商品
      const selectedArr = this.data.choiceStockArr;
      if (!selectedArr || selectedArr.length === 0) {
        wx.showToast({
          title: '请先选择要打印的商品',
          icon: 'none'
        });
        return;
      }
      
      // 收集所有选中商品的订单（purSelected 为 true 的订单）
      // 注意：需要从 goodsArr 中实时读取最新的 purSelected 状态，而不是从 choiceStockArr 中读取
      var orderArray = [];
      for (var i = 0; i < selectedArr.length; i++) {
        var choiceItem = selectedArr[i];
        var goodsIndex = choiceItem.goodsIndex;
        
        // 从 goodsArr 中获取最新的商品数据
        if (this.data.goodsArr[goodsIndex] && this.data.goodsArr[goodsIndex].nxDepartmentOrdersEntities) {
          var goods = this.data.goodsArr[goodsIndex];
          var orders = goods.nxDepartmentOrdersEntities;
          
          for (var j = 0; j < orders.length; j++) {
            var order = orders[j];
            // 只收集 purSelected 为 true 的订单
            if (order.purSelected) {
              // 创建订单副本，避免修改原数据
              var orderCopy = {
                nxDepartmentOrdersId: order.nxDepartmentOrdersId,
                purSelected: order.purSelected,
                nxDoQuantity: order.nxDoQuantity,
                nxDoWeight: order.nxDoWeight,
                nxDoStandard: order.nxDoStandard,
                nxDoRemark: order.nxDoRemark,
                nxDoDepartmentId: order.nxDoDepartmentId,
                nxDoDepartmentFatherId: order.nxDoDepartmentFatherId,
                nxDoGbDepartmentId: order.nxDoGbDepartmentId,
                gbDepartmentName: order.gbDepartmentName,
                fatherGbDepartmentName: order.fatherGbDepartmentName,
                nxDepartmentAttrName: order.nxDepartmentAttrName,
                fatherDepartmentAttrName: order.fatherDepartmentAttrName,
                nxRestrauntAttrName: order.nxRestrauntAttrName
              };
              // 协作订单：传递协作商名称和部门编码，用于标签打印
              var collabId = order.nxDoRequestDisId;
              var isCollab = collabId !== undefined && collabId !== null && collabId !== -1 && String(collabId) !== '-1';
              if (isCollab) {
                orderCopy.nxDoRequestDisId = collabId;
                orderCopy.nxDoRequestDistributerName = order.nxDoRequestDistributerName;
                orderCopy.fatherDepartmentOrderCode = order.fatherDepartmentOrderCode || (order.nxDepartmentEntity && order.nxDepartmentEntity.fatherDepartmentEntity ? order.nxDepartmentEntity.fatherDepartmentEntity.nxDepartmentOrderCode : null);
              }
              
              // 将商品信息附加到订单对象中，方便打印时获取商品名称
              orderCopy._goodsItem = {
                nxDistributerGoodsId: goods.nxDistributerGoodsId,
                nxDgGoodsName: goods.nxDgGoodsName,
                nxDgDfgGoodsFatherId: goods.nxDgDfgGoodsFatherId,
                nxDgDfgGoodsGrandId: goods.nxDgDfgGoodsGrandId,
                nxDgBuyingPriceOne: goods.nxDgBuyingPriceOne,
                nxDgGoodsStandardname: goods.nxDgGoodsStandardname
              };
              
              orderArray.push(orderCopy);
            }
          }
        }
      }
      
      console.log('📊 收集到的订单数量:', orderArray.length);
      console.log('📊 订单详情:', orderArray.map(order => ({
        orderId: order.nxDepartmentOrdersId,
        purSelected: order.purSelected,
        goodsName: order._goodsItem?.nxDgGoodsName
      })));
      
      if (orderArray.length === 0) {
        wx.showToast({
          title: '请先选择要打印的订单',
          icon: 'none'
        });
        return;
      }
      
      console.log('收集到', orderArray.length, '个订单，开始打印标签');
      this.printLabels(orderArray);
    },

    // 打印标签（参考 cankao/goods/goods.js 的 printCustomers 方法）
    printLabels(orderArray) {
      console.log('=== printLabels 开始 ===');
      console.log('📊 订单数量:', orderArray.length);
      var that = this;
      
      // 从 bleDeviceInfo 缓存读取标签打印机信息，存储到页面级变量（不写入全局）
      console.log('📊 从 bleDeviceInfo 缓存读取标签打印机信息');
        let cachedDeviceInfo = wx.getStorageSync('bleDeviceInfo');
        console.log('📊 缓存中的 bleDeviceInfo 原始值:', cachedDeviceInfo);
        console.log('📊 缓存中的 bleDeviceInfo 类型:', typeof cachedDeviceInfo);
        
        // 处理各种无效情况
        if (!cachedDeviceInfo || cachedDeviceInfo === '' || cachedDeviceInfo === 'null' || cachedDeviceInfo === 'undefined') {
          console.log('❌ 缓存为空或无效字符串');
          cachedDeviceInfo = null;
        } else if (typeof cachedDeviceInfo === 'string') {
          // 如果缓存中是字符串，尝试解析为对象
          try {
            console.log('📊 检测到字符串类型，尝试解析 JSON');
            if (cachedDeviceInfo.trim().length === 0) {
              console.log('❌ 字符串为空');
              cachedDeviceInfo = null;
            } else if (cachedDeviceInfo.trim().startsWith('{') || cachedDeviceInfo.trim().startsWith('[')) {
              cachedDeviceInfo = JSON.parse(cachedDeviceInfo);
              console.log('✅ JSON 解析成功');
            } else {
              console.log('❌ 字符串不是有效的 JSON 格式');
              cachedDeviceInfo = null;
            }
          } catch (e) {
            console.log('❌ JSON 解析失败:', e.message);
            try {
              wx.removeStorageSync('bleDeviceInfo');
              console.log('✅ 已清理无效缓存');
            } catch (removeErr) {
              console.log('⚠️ 清理缓存失败:', removeErr);
            }
            cachedDeviceInfo = null;
          }
        }
        
      // 验证对象结构并存储到页面级变量
      var labelPrinterInfo = null;
        if (cachedDeviceInfo && typeof cachedDeviceInfo === 'object' && !Array.isArray(cachedDeviceInfo)) {
          const deviceId = cachedDeviceInfo.deviceId;
          console.log('📊 cachedDeviceInfo.deviceId:', deviceId);
          
          if (deviceId && typeof deviceId === 'string' && deviceId.length > 0) {
          console.log('✅ 从缓存恢复标签打印机信息');
          // 存储到页面级变量，不写入 app.globalData.BLEInformation
          labelPrinterInfo = {
              deviceId: deviceId,
              writeServiceId: cachedDeviceInfo.writeServiceId || '',
              writeCharaterId: cachedDeviceInfo.writeCharaterId || cachedDeviceInfo.writeCharacterId || '',
              notifyServiceId: cachedDeviceInfo.notifyServiceId || '',
              notifyCharaterId: cachedDeviceInfo.notifyCharaterId || cachedDeviceInfo.notifyCharacterId || '',
              isConnected: cachedDeviceInfo.isConnected || false,
              platform: cachedDeviceInfo.platform || ''
            };
          // 保存到页面级变量
          that.labelPrinterInfo = labelPrinterInfo;
          console.log('✅ 已保存标签打印机信息到页面级变量 labelPrinterInfo');
          console.log('📊 deviceId:', labelPrinterInfo.deviceId);
          console.log('📊 writeServiceId:', labelPrinterInfo.writeServiceId);
          console.log('📊 writeCharaterId:', labelPrinterInfo.writeCharaterId);
          } else {
            console.log('❌ deviceId 无效');
          }
        } else {
          console.log('❌ cachedDeviceInfo 不是有效对象');
      }
      
      // 如果没有打印机，提示用户
      if (!labelPrinterInfo || !labelPrinterInfo.deviceId) {
        console.log('❌ 未设置标签打印机，显示提示弹窗');
        wx.showModal({
          title: '提示',
          content: '未设置标签打印机，请先设置打印机',
          confirmText: '去设置',
          success: function(res) {
            if (res.confirm) {
              wx.navigateTo({
                url: '../../../subPackage/pages/management/labelPrinter/labelPrinter',
              });
            }
          }
        });
        return;
      }
      
      console.log('✅ 标签打印机信息检查通过，deviceId:', labelPrinterInfo.deviceId);
      
      console.log('=== 打印流程开始 ===');
      console.log('📊 准备连接标签打印机，deviceId:', labelPrinterInfo.deviceId);
      wx.showLoading({
        title: '连接打印机...',
      });
      
      wx.openBluetoothAdapter({
        success: function(res) {
          console.log('✅ 蓝牙适配器初始化成功');
          setTimeout(() => {
            console.log('📊 准备创建蓝牙连接，deviceId:', labelPrinterInfo.deviceId);
            wx.createBLEConnection({
              deviceId: labelPrinterInfo.deviceId,
              success: function(res) {
                console.log('✅ 蓝牙连接成功');
                that.discoverAndCacheWritableChar(orderArray);
              },
              fail: function(err) {
                console.log('❌ 蓝牙连接失败');
                console.log('📊 错误信息:', err);
                console.log('📊 错误代码:', err.errCode);
                console.log('📊 错误消息:', err.errMsg);
                
                // 如果是已连接错误，直接使用现有连接
                if (err.errCode === 1509007 || err.errMsg.indexOf('already connect') !== -1) {
                  console.log('✅ 设备已连接，直接使用现有连接');
                  labelPrinterInfo.isConnected = true;
                  that.labelPrinterInfo = labelPrinterInfo;
                  that.discoverAndCacheWritableChar(orderArray);
                } else {
                  console.error('❌ 蓝牙连接失败:', err);
                  wx.hideLoading();
                  wx.showModal({
                    title: '提示',
                    content: '标签打印机连接失败，请重新设置打印机',
                    confirmText: '去设置',
                    success: function(res) {
                      if (res.confirm) {
                        wx.navigateTo({
                          url: '../../../subPackage/pages/management/labelPrinter/labelPrinter',
                        });
                      }
                    }
                  });
                }
              }
            });
          }, 500);
        },
        fail: function(err) {
          console.error('❌ 蓝牙适配器初始化失败:', err);
          console.log('📊 错误信息:', err);
          wx.hideLoading();
          wx.showToast({
            title: '请打开蓝牙',
            icon: 'none'
          });
        }
      });
    },

    // 发现并缓存可写特征值
    discoverAndCacheWritableChar(orderArray) {
      console.log('=== discoverAndCacheWritableChar 开始 ===');
      var that = this;
      
      // 使用页面级变量 labelPrinterInfo，不读取 app.globalData.BLEInformation
      var labelPrinterInfo = that.labelPrinterInfo;
      if (!labelPrinterInfo || !labelPrinterInfo.deviceId) {
        console.error('❌ labelPrinterInfo 不存在或无效');
        wx.hideLoading();
        wx.showToast({
          title: '标签打印机信息缺失',
          icon: 'none'
        });
        return;
      }
      
      console.log('📊 使用页面级变量 labelPrinterInfo，deviceId:', labelPrinterInfo.deviceId);
      
      wx.getBLEDeviceServices({
        deviceId: labelPrinterInfo.deviceId,
        success: function(res) {
          console.log('✅ 获取服务列表成功');
          console.log('📊 服务数量:', res.services ? res.services.length : 0);
          var services = res.services || [];
          var targetServices = services.filter(function(s) {
            return /fff0/i.test(s.uuid) || /ffe0/i.test(s.uuid) || /180f/i.test(s.uuid) || /fff2/i.test(s.uuid);
          });
          console.log('📊 目标服务数量:', targetServices.length);
          
          var service = targetServices[0] || services[0];
          if (!service) {
            console.log('❌ 未发现可用服务');
            wx.hideLoading();
            wx.showToast({
              title: '未发现可用服务',
              icon: 'none'
            });
            return;
          }
          console.log('✅ 选择服务:', service.uuid);
          
          wx.getBLEDeviceCharacteristics({
            deviceId: labelPrinterInfo.deviceId,
            serviceId: service.uuid,
            success: function(chrRes) {
              console.log('✅ 获取特征列表成功');
              console.log('📊 特征数量:', chrRes.characteristics ? chrRes.characteristics.length : 0);
              var chs = chrRes.characteristics || [];
              
              var writable = null;
              for (var i = 0; i < chs.length; i++) {
                if (chs[i].properties.writeNoResponse) {
                  writable = chs[i];
                  console.log('✅ 找到 writeNoResponse 特征:', writable.uuid);
                  break;
                }
              }
              
              if (!writable) {
                for (var i = 0; i < chs.length; i++) {
                  if (chs[i].properties.write) {
                    writable = chs[i];
                    console.log('✅ 找到 write 特征:', writable.uuid);
                    break;
                  }
                }
              }
              
              if (!writable) {
                console.log('❌ 未发现可写特征');
                wx.hideLoading();
                wx.showToast({
                  title: '未发现可写特征',
                  icon: 'none'
                });
                return;
              }
              
              // 更新页面级变量 labelPrinterInfo
              labelPrinterInfo.writeServiceId = service.uuid;
              labelPrinterInfo.writeCharaterId = writable.uuid;
              labelPrinterInfo.isConnected = true;
              that.labelPrinterInfo = labelPrinterInfo;
              
              // 更新 bleDeviceInfo 缓存
              const deviceInfoToStore = {
                deviceId: labelPrinterInfo.deviceId,
                writeServiceId: labelPrinterInfo.writeServiceId,
                writeCharaterId: labelPrinterInfo.writeCharaterId,
                notifyServiceId: labelPrinterInfo.notifyServiceId || '',
                notifyCharaterId: labelPrinterInfo.notifyCharaterId || '',
                isConnected: true,
                platform: labelPrinterInfo.platform || ''
              };
              wx.setStorageSync('bleDeviceInfo', deviceInfoToStore);
              console.log('✅ 已更新标签打印机 bleDeviceInfo 缓存:', deviceInfoToStore);
              
              console.log('✅ 特征发现完成');
              console.log('📊 writeServiceId:', labelPrinterInfo.writeServiceId);
              console.log('📊 writeCharaterId:', labelPrinterInfo.writeCharaterId);
              wx.hideLoading();
              that.doPrintLabels(orderArray);
            },
            fail: function(err) {
              console.error('❌ 获取特征列表失败:', err);
              wx.hideLoading();
              wx.showToast({
                title: '获取特征失败',
                icon: 'none'
              });
            }
          });
        },
        fail: function(err) {
          console.error('❌ 获取服务列表失败:', err);
          wx.hideLoading();
          wx.showToast({
            title: '获取服务失败',
            icon: 'none'
          });
        }
      });
    },

    // 执行打印标签
    doPrintLabels(orderArray) {
      console.log('=== doPrintLabels 开始执行（使用 labelPrinter.js） ===');
      console.log('📊 订单数量:', orderArray.length);
      var that = this;
      
      // 使用页面级变量 labelPrinterInfo，不读取 app.globalData.BLEInformation
      var labelPrinterInfo = that.labelPrinterInfo;
      if (!labelPrinterInfo || !labelPrinterInfo.deviceId || !labelPrinterInfo.writeServiceId || !labelPrinterInfo.writeCharaterId) {
        console.log('❌ 标签打印机信息不完整');
        wx.showToast({
          title: '打印机信息缺失',
          icon: 'none'
        });
        return;
      }

      // 使用 labelPrinter.js 工具类
      const labelPrinter = require('../../../utils/labelPrinter.js');
      var cachedPaperSize = wx.getStorageSync('paperSize') || 1;
      
      console.log('📊 准备为', orderArray.length, '个订单打印标签，标签尺寸ID:', cachedPaperSize);
      
      // 为每个订单打印一个独立的标签
      var printLabelsSequentially = function(orderIndex) {
        if (orderIndex >= orderArray.length) {
          // 所有订单打印完成
          console.log('✅ 所有订单标签打印完成');
          wx.showToast({
            title: '打印完成',
            icon: 'success'
          });
          // 清除选择数据
          that._clearSelectedData();
          
          // 打印完成后断开蓝牙连接，释放打印机资源供其他用户使用
          console.log('📴 准备在500ms后断开标签打印机连接，释放资源供其他用户使用');
          setTimeout(function() {
            console.log('📴 开始断开标签打印机连接...');
            that._closeLabelPrinterConnection();
          }, 500); // 延迟500ms后断开连接，确保打印机有时间处理数据
          
          return;
        }
        
        var order = orderArray[orderIndex];
        var goodsItem = order._goodsItem || {};
        var printerInstance = labelPrinter.create(cachedPaperSize);
        var customerNameForPrint = printerInstance.extractCustomerName(order);
        
        console.log('📊 打印订单', orderIndex + 1, '/', orderArray.length);
        console.log('📊 订单信息:', {
          customerName: customerNameForPrint,
          goodsName: goodsItem.nxDgGoodsName,
          quantity: order.nxDoQuantity,
          standard: order.nxDoStandard,
          remark: order.nxDoRemark
        });
        
        // 使用 labelPrinter.js 为当前订单生成打印数据
        // 每个订单单独生成一个标签
        var printData = labelPrinter.quickPrint([order], {
          paperSizeId: cachedPaperSize,
          goodsItem: goodsItem,
          printRemark: cachedPaperSize === 3 || cachedPaperSize === 4
        });
        
        if (!printData || printData.length === 0) {
          console.log('⚠️ 订单', orderIndex + 1, '打印数据生成失败，跳过');
          // 继续打印下一个订单
          setTimeout(function() {
            printLabelsSequentially(orderIndex + 1);
          }, 100);
          return;
        }
        
        console.log('📊 订单', orderIndex + 1, '打印数据长度:', printData.length);
        
        // 发送当前订单的打印数据
        that.reliableSendPrintData(printData).then(function() {
          console.log('✅ 订单', orderIndex + 1, '打印完成');
          // 延迟后打印下一个订单
          setTimeout(function() {
            printLabelsSequentially(orderIndex + 1);
          }, 500); // 每个标签之间延迟500ms
        }).catch(function(err) {
          console.error('❌ 订单', orderIndex + 1, '打印失败:', err);
          // 即使失败也继续打印下一个
          setTimeout(function() {
            printLabelsSequentially(orderIndex + 1);
          }, 500);
        });
      };
      
      // 开始打印第一个订单
      printLabelsSequentially(0);
    },

    // 延迟函数
    delay(ms) {
      return new Promise(function(resolve) {
        setTimeout(resolve, ms);
      });
    },

    // 可靠的发送打印数据
    reliableSendPrintData(buff) {
      var that = this;
      var app = getApp();
      var oneTimeData = 20;
      var totalChunks = Math.ceil(buff.length / oneTimeData);
      
      return new Promise(function(resolve, reject) {
        var sendChunks = async function() {
          try {
            for (var i = 0; i < totalChunks; i++) {
              var chunkStart = i * oneTimeData;
              var chunkEnd = Math.min(chunkStart + oneTimeData, buff.length);
              var chunkSize = chunkEnd - chunkStart;
              
              if (chunkSize === 0) continue;
              
              var buf = new ArrayBuffer(chunkSize);
              var dataView = new DataView(buf);
              
              for (var j = 0; j < chunkSize; j++) {
                dataView.setUint8(j, buff[chunkStart + j]);
              }
              
              await that.sendSingleChunk(buf);
              
              if (i < totalChunks - 1) {
                await that.delay(15);
              }
            }
            
            console.log('数据发送完成');
            resolve();
          } catch (error) {
            console.error('发送打印数据失败:', error);
            reject(error);
          }
        };
        
        sendChunks();
      });
    },

    // 发送单个数据块
    sendSingleChunk(buf) {
      var that = this;
      // 使用页面级变量 labelPrinterInfo，不读取 app.globalData.BLEInformation
      var labelPrinterInfo = that.labelPrinterInfo;
      if (!labelPrinterInfo || !labelPrinterInfo.deviceId || !labelPrinterInfo.writeServiceId || !labelPrinterInfo.writeCharaterId) {
        return Promise.reject(new Error('标签打印机信息不完整'));
      }
      
      return new Promise(function(resolve, reject) {
        wx.writeBLECharacteristicValue({
          deviceId: labelPrinterInfo.deviceId,
          serviceId: labelPrinterInfo.writeServiceId,
          characteristicId: labelPrinterInfo.writeCharaterId,
          value: buf,
          success: function(res) {
            resolve(res);
          },
          fail: function(err) {
            reject(err);
          }
        });
      });
    },
   
    onNavButtonTap() {
      wx.navigateTo({
        url: '../../../subPackage/pages/management/homePage/homePage',
      })
     },

    // 关闭标签打印机蓝牙连接
    _closeLabelPrinterConnection() {
      var that = this;
      // 使用页面级变量 labelPrinterInfo
      var labelPrinterInfo = that.labelPrinterInfo;
      if (labelPrinterInfo && labelPrinterInfo.deviceId) {
        console.log('📴 准备断开标签打印机连接，deviceId:', labelPrinterInfo.deviceId);
        wx.closeBLEConnection({
          deviceId: labelPrinterInfo.deviceId,
          success: function(res) {
            console.log('✅ 标签打印机连接已断开');
            // 清除页面级变量中的连接状态
            if (that.labelPrinterInfo) {
              that.labelPrinterInfo.isConnected = false;
            }
          },
          fail: function(err) {
            console.log('⚠️ 断开标签打印机连接失败:', err);
            // 即使断开失败，也清除连接状态标记
            if (that.labelPrinterInfo) {
              that.labelPrinterInfo.isConnected = false;
            }
          }
        });
      } else {
        console.log('⚠️ 标签打印机信息不存在，无需断开连接');
      }
    },




toMyShelf(e){
  wx.navigateTo({
    url: '/subPackage/pages/shelf/index/index',
  })
},



    // methods
  },






})

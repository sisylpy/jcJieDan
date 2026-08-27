var load = require('../../../lib/load.js');
var tabBar = require('../../../lib/routeDispatchTabBar.js');

const tabBarHeight = 50; // 根据实际情况调整
const viewBarHeight = 50;

import apiUrl from '../../../config.js'

import {
 
  disGetTypePrepareOutCata,
  disGetTypePreparePurGoodsPage,

  disGetTypePrepareOutDepCata,
  disGetTypePrepareOutDepGoodsPage,
  saveDisPurGoodsBatch,
  saveDisPurGoodsBatchByDep,
  deletePlanPurchase,
  disGetPurchasingBatch,
  deleteDisPurBatchItem,
  updatePasteBatch,
  deleteDisBatch,
  disGetOfferDis,
  disFinishPurchaseBatch
} from '../../../lib/apiDepOrder'

Component({


  data:{
 
    currentPage: 1,
    limit: 20,
    totalPage: 0,
    totalCount: 0,
    hasMore: true,  // 是否还有更多数据
    isLoading: false, // 是否正在加载
    selectedArr: [], // 选中的商品数组
    selectedPrintArr: [], // 选中的打印数组
    isAllDepartmentSelected: false, // 部门模式下是否全选
    
    // 下拉刷新相关数据
    refresherTriggered: false, 
    
    // 显示模式：'category' 按类别，'department' 按客户（从缓存读取）
    viewMode: wx.getStorageSync('purchaseViewMode') || 'category',
    
    // 按客户模式相关数据
    depArr: [], // 部门列表（按客户模式）
    selectedDepId: null, // 选中的部门ID
    
    // 左右联动相关数据
    categoryPositions: [], // 存储分类位置信息
    categoryPositionsRetryCount: 0, // 位置计算重试次数
    scrollTimer: null, // 滚动防抖定时器
    isLoadingMoreForCategory: false, // 是否为分类加载更多数据
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
          selected: tabBar.getTabIndex('pages/purchase/index/index')
        })
      }

      const app = getApp();
      const globalData = app.globalData;
      const navBarHeight = globalData.navBarHeight;
      const screenHeight = globalData.screenHeight;
      const screenWidth = globalData.screenWidth;
      const rpxRatio = 750 / screenWidth;
      const navBarHeightRpx = navBarHeight * rpxRatio;
      const viewBarHeightRpx = viewBarHeight * rpxRatio;
      const tabBarHeightRpx = 100;
  
      // const contentHeight = (screenHeight - navBarHeight - tabBarHeight) * rpxRatio;
      // const tabBarHeightRpx = 100;
  
      const contentHeight = (screenHeight - navBarHeight - tabBarHeight - viewBarHeight) * rpxRatio;
      this.setData({ 
        contentHeight: contentHeight,
        navBarHeight: navBarHeightRpx,
        tabBarHeight: tabBarHeightRpx,
        viewBarHeight: viewBarHeightRpx,
        leftMenuWidth: 120, // 左侧菜单宽度，单位 rpx
      });

      this.setData({
        windowWidth: globalData.windowWidth * globalData.rpxR,
        windowHeight: globalData.windowHeight * globalData.rpxR,
        statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
        url: apiUrl.server,
        scrollViewTop: 0,


        tabs_wx:[  
          { name: "未采购", amount: "" },
        { name: "采购中", amount: "" }
      ],
        innerCurrent: 0,

        
        // 重置分页相关数据
        currentPage: 1,
        totalPage: 0,
        totalCount: 0,
        hasMore: true,
        isLoading: false,
        purGoodsArr: [],
        purCataArr: [],
        selectedSubWx: 0,
        toViewWx: '',
        scrollTopLeftWx: 0,
        categoryPositions: [],
        scrollTimer: null,
        isLoadingMoreForCategory: false,
        
        // 重置下拉刷新状态
        refresherTriggered: false,
        
        // 重置显示模式相关数据（从缓存读取，如果没有则使用默认值）
        viewMode: wx.getStorageSync('purchaseViewMode') || 'category',
        depArr: [],
        selectedDepId: null,
        
        innerCurrent: 0,

      })

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
            disType: disValue.nxDistributerType,
          })
        }
      }
      this.animation = wx.createAnimation({ duration: 300, timingFunction: 'ease' })


      this._initData();
    },

   

  },


  methods: {

    // 切换显示模式（按类别/按客户）
    changeShwoType() {
      const newMode = this.data.viewMode === 'category' ? 'department' : 'category';
      console.log('切换显示模式:', newMode);
      
      // 保存显示模式到本地存储
      wx.setStorageSync('purchaseViewMode', newMode);
      
      // 重置选中状态
      this.setData({
        viewMode: newMode,
        selectedArr: [],
        selectedPrintArr: [],
        purGoodsArr: [],
        purCataArr: [],
        depArr: [],
        selectedDepId: null,
        selectedSubWx: 0,
        toViewWx: '',
        scrollTopLeftWx: 0,
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

    showCar() {
      this.setData({
        showOperationCar: true,
      })
    },

    // 清除所有选中的商品（清空 selectedArr 并清除页面商品的选中状态）
    clearSelectedGoods() {
      console.log('========== clearSelectedGoods 开始 ==========');
      console.log('当前选中的商品数量:', this.data.selectedArr.length);

      var updates = {};
      var that = this;
      
      // 把页面的选择商品的状态也清除
      this.data.purGoodsArr.forEach(function(goods, goodsIndex) {
        var goodsDataKey = `purGoodsArr[${goodsIndex}].isSelected`;
        updates[goodsDataKey] = false;
        
        // 同时更新商品的 categoryIsAllSelected 状态
        updates[`purGoodsArr[${goodsIndex}].categoryIsAllSelected`] = false;
        
        // 如果商品有订单，也要取消订单的选中状态
        if (goods.orders && goods.orders.length > 0) {
          goods.orders.forEach(function(order, orderIndex) {
            var orderDataKey = `purGoodsArr[${goodsIndex}].orders[${orderIndex}].hasChoice`;
            updates[orderDataKey] = false;
          });
        }
      });
      
      // 清空 selectedArr 并关闭弹窗
      updates.selectedArr = [];
      updates.showOperationCar = false;
      
      // 更新部门模式的全选状态
      if (this.data.viewMode === 'department') {
        updates.isAllDepartmentSelected = false;
      }
      
      // 更新所有类别的全选状态为 false
      if (this.data.viewMode === 'category' && this.data.purCataArr) {
        this.data.purCataArr.forEach((category, categoryIndex) => {
          updates[`purCataArr[${categoryIndex}].isAllSelected`] = false;
        });
      }
      
      this.setData(updates, () => {
        wx.showToast({
          title: '已清除',
          icon: 'success'
        });
        
        console.log('✅ 清除完成，selectedArr 已清空，页面商品选中状态已清除');
        console.log('更新后的 selectedArr 长度:', this.data.selectedArr.length);
        console.log('========== clearSelectedGoods 结束 ==========');
      });
    },
    
    closeCar() {
      this.setData({
        showOperationCar: false

      })
    },




    // 计算分类位置（参考 resGoodsLess 的方法）
    calculateCategoryPositions() {
      console.log('========== calculateCategoryPositions 开始 ==========');
      console.log('viewMode:', this.data.viewMode);
      console.log('purGoodsArr 长度:', this.data.purGoodsArr?.length);
      
      // 只在类别模式下计算
      if (this.data.viewMode !== 'category') {
        console.log('不是类别模式，跳过位置计算');
        return;
      }
      
      // 先通过商品数据收集所有分类ID
      if (!this.data.purGoodsArr || this.data.purGoodsArr.length === 0) {
        console.log('⚠️ 商品数组为空，无法计算位置');
        return;
      }
      
      // 收集所有唯一的分类ID
      const categoryIds = [];
      this.data.purGoodsArr.forEach((goods) => {
        const categoryId = goods.nxDgDfgGoodsGreatGrandId;
        if (categoryId && !categoryIds.includes(categoryId)) {
          categoryIds.push(categoryId);
        }
      });
      
      console.log('找到的分类ID:', categoryIds);
      
      if (categoryIds.length === 0) {
        console.log('⚠️ 没有找到分类ID');
        return;
      }
      
      // 使用查询获取每个分类元素的位置
      const query = wx.createSelectorQuery();
      categoryIds.forEach((categoryId) => {
        // 查询每个分类的父元素（包含 id="categoryXXX"）
        query.select(`#category${categoryId}`).boundingClientRect();
      });
      query.select('.right-content').boundingClientRect();
      
      query.exec((res) => {
        console.log('查询结果:', res);
        console.log('查询结果长度:', res.length);
        console.log('分类元素数量:', res.length - 1);
        
        const listRect = res[res.length - 1]; // 最后一个结果是容器
        const categoryRects = res.slice(0, -1); // 前面的结果是分类元素
        
        if (!listRect) {
          console.log('⚠️ 未找到右侧内容容器');
          const retryCount = this.data.categoryPositionsRetryCount || 0;
          if (retryCount < 3) {
            this.setData({
              categoryPositionsRetryCount: retryCount + 1
            });
            setTimeout(() => {
              this.calculateCategoryPositions();
            }, 500);
          } else {
            console.log('❌ 已达到最大重试次数(3次)，停止重试');
            this.setData({
              categoryPositionsRetryCount: 0
            });
          }
          return;
        }
        
        console.log('listRect:', listRect);
        console.log('categoryRects:', categoryRects);
        
        const positions = [];
        categoryIds.forEach((categoryId, index) => {
          const rect = categoryRects[index];
          if (rect && rect.top !== undefined) {
            positions.push({
              id: String(categoryId),
              top: rect.top - listRect.top
            });
          } else {
            console.log(`⚠️ 分类 ${categoryId} 的位置信息无效:`, rect);
          }
        });
        
        console.log('原始 positions:', positions);
        
        if (positions.length === 0) {
          console.log('⚠️ 无法获取分类位置，尝试重试');
          const retryCount = this.data.categoryPositionsRetryCount || 0;
          if (retryCount < 3) {
            this.setData({
              categoryPositionsRetryCount: retryCount + 1
            });
            setTimeout(() => {
              this.calculateCategoryPositions();
            }, 500);
          } else {
            console.log('❌ 已达到最大重试次数(3次)，停止重试');
            this.setData({
              categoryPositionsRetryCount: 0
            });
          }
          return;
        }
        
        // 取第一个的 top 作为基准
        const baseTop = positions.length > 0 ? positions[0].top : 0;
        // 重新计算所有 top，让第一个为 0
        let finalPositions = positions.map((item) => ({
          id: item.id,
          top: item.top - baseTop
        }));
        // 按 top 从小到大排序
        finalPositions.sort((a, b) => a.top - b.top);
        
        console.log('计算后的 positions:', finalPositions);
        
        // 成功找到元素，重置重试次数
        this.setData({
          categoryPositions: finalPositions,
          categoryPositionsRetryCount: 0
        });
        
        console.log('✅ 分类位置计算完成，共', finalPositions.length, '个分类');
        console.log('========== calculateCategoryPositions 结束 ==========');
      });
    },
    
    // 通过商品数据计算分类位置（备用方案，已废弃，保留以防需要）
    _calculatePositionsFromGoodsData() {
      console.log('========== _calculatePositionsFromGoodsData 开始 ==========');
      
      if (!this.data.purGoodsArr || this.data.purGoodsArr.length === 0) {
        console.log('商品数组为空，无法计算位置');
        return;
      }
      
      // 收集所有唯一的分类ID
      const categoryIds = [];
      const categoryMap = new Map();
      
      this.data.purGoodsArr.forEach((goods, goodsIndex) => {
        const categoryId = goods.nxDgDfgGoodsGreatGrandId;
        if (categoryId && !categoryMap.has(categoryId)) {
          categoryMap.set(categoryId, {
            id: String(categoryId),
            firstIndex: goodsIndex
          });
          categoryIds.push(categoryId);
        }
      });
      
      console.log('找到的分类ID:', categoryIds);
      console.log('分类映射:', Array.from(categoryMap.entries()));
      
      if (categoryIds.length === 0) {
        console.log('⚠️ 没有找到分类ID');
        return;
      }
      
      // 使用查询获取每个分类第一个商品的位置
      const query = wx.createSelectorQuery();
      categoryIds.forEach((categoryId, index) => {
        const firstIndex = categoryMap.get(categoryId).firstIndex;
        // 查询分类标题的父元素（包含 id="categoryXXX"）
        query.select(`#category${categoryId}`).boundingClientRect();
      });
      query.select('.right-content').boundingClientRect();
      
      query.exec((res) => {
        console.log('查询结果:', res);
        const listRect = res[res.length - 1]; // 最后一个结果是容器
        const categoryRects = res.slice(0, -1); // 前面的结果是分类元素
        
        console.log('listRect:', listRect);
        console.log('categoryRects:', categoryRects);
        
        if (!listRect) {
          console.log('⚠️ 未找到右侧内容容器');
          return;
        }
        
        const positions = [];
        categoryIds.forEach((categoryId, index) => {
          const rect = categoryRects[index];
          if (rect && rect.top !== undefined) {
            positions.push({
              id: String(categoryId),
              top: rect.top - listRect.top
            });
          }
        });
        
        if (positions.length === 0) {
          console.log('⚠️ 无法获取分类位置');
          return;
        }
        
        // 取第一个的 top 作为基准
        const baseTop = positions.length > 0 ? positions[0].top : 0;
        // 重新计算所有 top，让第一个为 0
        let finalPositions = positions.map((item) => ({
          id: item.id,
          top: item.top - baseTop
        }));
        // 按 top 从小到大排序
        finalPositions.sort((a, b) => a.top - b.top);
        
        console.log('计算后的 positions:', finalPositions);
        
        this.setData({
          categoryPositions: finalPositions
        });
        
        console.log('✅ 通过商品数据计算分类位置完成，共', finalPositions.length, '个分类');
        console.log('========== _calculatePositionsFromGoodsData 结束 ==========');
      });
    },
    
    // 从元素获取分类ID（辅助函数）
    _getCategoryIdFromElement(index) {
      // 通过商品数据查找对应的分类ID
      if (!this.data.purGoodsArr || this.data.purGoodsArr.length === 0) {
        return null;
      }
      
      // 找到第 index 个分类的第一个商品
      const categoryIds = [];
      this.data.purGoodsArr.forEach((goods) => {
        const categoryId = goods.nxDgDfgGoodsGreatGrandId;
        if (categoryId && !categoryIds.includes(categoryId)) {
          categoryIds.push(categoryId);
        }
      });
      
      return categoryIds[index] ? String(categoryIds[index]) : null;
    },

    // 滚动事件处理（参考 resGoodsLess 的方法）
    scrollToWx(e) {
      const scrollTop = e.detail.scrollTop;
      console.log('=== 滚动事件开始 ===');
      console.log('右侧滚动事件 - scrollTop:', scrollTop);
      
      // 防抖处理，避免频繁更新
      if (this.data.scrollTimer) {
        clearTimeout(this.data.scrollTimer);
      }
      
      this.data.scrollTimer = setTimeout(() => {
        this.updateLeftMenuByScroll(scrollTop);
      }, 50);
    },

    // 根据滚动位置更新左侧菜单（参考 resGoodsLess 的方法）
    updateLeftMenuByScroll(scrollTop) {
      console.log('=== updateLeftMenuByScroll 开始 ===');
      console.log('scrollTop:', scrollTop);
      console.log('categoryPositions:', this.data.categoryPositions);
      console.log('viewMode:', this.data.viewMode);
      
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
        console.log(`📊 purCataArr:`, this.data.purCataArr.map(item => ({
          id: item.nxDistributerFatherGoodsId,
          name: item.nxDfgFatherGoodsName
        })));
        
        const categoryIndex = this.data.purCataArr.findIndex(
          item => String(item.nxDistributerFatherGoodsId) === String(activeId)
        );
        
        console.log(`🎯 找到的分类索引: ${categoryIndex}`);
        console.log(`📊 当前selectedSubWx: ${this.data.selectedSubWx}`);
        
        if (categoryIndex !== -1 && categoryIndex !== this.data.selectedSubWx) {
          console.log(`🔄 更新左侧菜单选中状态: ${categoryIndex}`);
          this.setData({
            selectedSubWx: categoryIndex
          });
          
          // 滚动左侧菜单，让选中的分类保持在屏幕中间
          console.log(`📏 准备滚动左侧菜单到索引: ${categoryIndex}`);
          this.scrollLeftMenuToIndex(categoryIndex);
          
          // 检查是否需要加载更多数据以支持当前分类
          this.checkAndLoadMoreForCategory(categoryIndex);
        } else {
          console.log('✅ 选中状态未变化，无需更新');
          console.log(`📊 原因: categoryIndex=${categoryIndex}, selectedSubWx=${this.data.selectedSubWx}`);
        }
      }
      
      console.log('=== updateLeftMenuByScroll 结束 ===\n');
    },

    // 滚动左侧菜单到指定索引
    scrollLeftMenuToIndex(index) {
      console.log(`\n=== 开始左侧菜单滚动 ===`);
      console.log(`🎯 目标索引: ${index}`);
      console.log(`📊 当前selectedSubWx: ${this.data.selectedSubWx}`);
      
      // 获取左侧菜单容器的高度
      const query = wx.createSelectorQuery();
      query.select('.left-menu').boundingClientRect();
      query.exec((res) => {
        console.log(`📏 查询结果:`, res);
        
        if (res[0]) {
          const containerHeight = res[0].height;
          const itemHeight = 80; // 左侧菜单项的高度（rpx）
          const rpxRatio = wx.getSystemInfoSync().windowWidth / 750; // rpx转px的比例
          const itemHeightPx = itemHeight * rpxRatio;
          
          console.log(`📊 计算参数:`, {
            containerHeight: containerHeight,
            itemHeight: itemHeight,
            rpxRatio: rpxRatio,
            itemHeightPx: itemHeightPx
          });
          
          // 计算目标滚动位置，让选中的分类保持在屏幕中间
          const targetScrollTop = (index * itemHeightPx) - (containerHeight / 2) + (itemHeightPx / 2);
          
          // 计算最大可滚动距离
          const totalItems = this.data.purCataArr.length;
          const maxScrollTop = Math.max(0, (totalItems * itemHeightPx) - containerHeight);
          
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
            itemHeightPx: itemHeightPx,
            targetScrollTop: targetScrollTop,
            finalScrollTop: finalScrollTop
          });
          
          console.log(`🔄 设置scrollTopLeftWx: ${finalScrollTop}`);
          this.setData({
            scrollTopLeftWx: finalScrollTop
          });
          
          // 验证设置是否成功
          setTimeout(() => {
            console.log(`📊 验证scrollTopLeftWx设置: ${this.data.scrollTopLeftWx}`);
          }, 100);
          
          console.log(`✅ 左侧菜单滚动设置完成`);
        } else {
          console.log(`❌ 未找到左侧菜单容器`);
        }
      });
    },

    // 检查并加载更多数据以支持当前分类
    checkAndLoadMoreForCategory(categoryIndex) {
      if (!this.data.purCataArr[categoryIndex]) {
        console.log('分类索引无效:', categoryIndex);
        return;
      }
      
      const categoryId = this.data.purCataArr[categoryIndex].nxDistributerFatherGoodsId;
      const categoryName = this.data.purCataArr[categoryIndex].nxDfgFatherGoodsName;
      
      // 检查当前页面是否有该分类的商品
      const hasCategoryGoods = this.data.purGoodsArr.some(goods => 
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
    // 左侧菜单点击跳转到对应位置
    toScrollViewWx(e) {
      const index = e.currentTarget.dataset.index;
      console.log('\n=== 左侧菜单点击事件 ===');
      console.log('🎯 点击的索引:', index);
      console.log('📊 显示模式:', this.data.viewMode);
      
      if (this.data.viewMode === 'department') {
        // 按客户模式：点击部门
        if (this.data.depArr[index]) {
          const dep = this.data.depArr[index];
          console.log('🎯 目标部门:', dep.nxDepartmentOrderCode);
          console.log('🎯 目标部门ID:', dep.depId);
          
          // 切换部门时，清空选择数组
          this.setData({
            selectedArr: [],
            isAllDepartmentSelected: false
          });
          
          // 加载该部门的商品
          this._loadDepartmentGoods(dep.depId, index);
        } else {
          console.log('❌ depArr索引不存在:', index);
        }
      } else {
        // 按类别模式：原有逻辑
        console.log('📊 分类数组长度:', this.data.purCataArr.length);
        
        if (this.data.purCataArr[index]) {
          const category = this.data.purCataArr[index];
          const categoryId = category.nxDistributerFatherGoodsId;
          const categoryName = category.nxDfgFatherGoodsName;
          const fullTargetId = `category${categoryId}`;
          
          console.log('🎯 目标分类:', categoryName);
          console.log('🎯 目标分类ID:', categoryId);
          console.log('🎯 目标分类完整信息:', category);
          console.log('🎯 目标跳转ID:', fullTargetId);
          console.log('📊 当前商品总数:', this.data.purGoodsArr.length);
          
          // 先设置选中状态
          console.log('🔄 设置左侧菜单选中状态:', index);
          this.setData({
            selectedSubWx: index
          });
          
          // 检查当前页面是否有该分类的商品
          // 先打印一些调试信息
          if (this.data.purGoodsArr.length > 0) {
            const sampleGoods = this.data.purGoodsArr.slice(0, 5);
            console.log('📊 前5个商品的 nxDgDfgGoodsGreatGrandId:', sampleGoods.map(g => ({
              name: g.nxDgGoodsName,
              greatGrandId: g.nxDgDfgGoodsGreatGrandId,
              grandId: g.nxDgDfgGoodsGrandId
            })));
          }
          
          const hasCategoryGoods = this.data.purGoodsArr.some(goods => 
            goods.nxDgDfgGoodsGreatGrandId === categoryId
          );
          
          console.log(`🔍 检查当前页面是否有目标分类商品: ${hasCategoryGoods ? '✅ 有' : '❌ 没有'}`);
          console.log(`🔍 目标分类ID: ${categoryId}, 商品中的 nxDgDfgGoodsGreatGrandId 值:`, 
            [...new Set(this.data.purGoodsArr.map(g => g.nxDgDfgGoodsGreatGrandId))].slice(0, 10));
          
          if (hasCategoryGoods) {
            // 如果当前页面有该分类的商品，直接跳转
            console.log('✅ 当前页面有目标分类商品，直接跳转');
            console.log(`🎯 设置toViewWx: ${fullTargetId}`);
            
            this.setData({
              toViewWx: fullTargetId
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
          console.log('❌ purCataArr索引不存在:', index);
        }
      }
    },

    // 递归加载数据直到找到指定分类
    loadGoodsUntilCategory(categoryId, targetId, page = 1, maxAttempts = 10) {
      console.log(`\n=== 开始递归加载分类商品 ===`);
      console.log(`🎯 目标分类ID: ${categoryId}`);
      console.log(`🎯 目标跳转ID: ${targetId}`);
      console.log(`📄 当前页码: ${page}`);
      console.log(`📊 最大尝试次数: ${maxAttempts}`);
      console.log(`📊 当前商品总数: ${this.data.purGoodsArr.length}`);
      
      if (this.data.isLoading) {
        console.log('⚠️ 正在加载中，跳过请求');
        return;
      }
      
      // 如果总页数已知且当前页超过总页数，则停止
      if (this.data.totalPage > 0 && page > this.data.totalPage) {
        console.log('❌ 已加载所有数据，仍未找到该分类');
        // 隐藏加载蒙版
        load.hideLoading();
        wx.showToast({
          title: '该分类暂无商品',
          icon: 'none',
          duration: 2000
        });
        return;
      }
      
      // 如果达到最大尝试次数，增加限制继续尝试（防止无限循环，但允许更多尝试）
      if (page > maxAttempts) {
        console.log(`⚠️ 已达到初始最大尝试次数(${maxAttempts})，但继续尝试加载第${page}页`);
        // 继续加载，但增加最大尝试次数
        maxAttempts = maxAttempts + 10;
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
      
      return disGetTypePreparePurGoodsPage(data).then(res => {
        this.setData({
          isLoading: false
        });
        
        console.log(`📥 API响应:`, res.result);
        
        // 检查数据大小和结构
        if (res.result?.page?.list) {
          const dataStr = JSON.stringify(res.result.page.list);
          const dataSizeKB = this._calculateDataSize(dataStr);
          console.log('📊 递归加载 - 商品列表数据大小:', dataSizeKB, 'KB');
          if (res.result.page.list.length > 0) {
            const firstItem = res.result.page.list[0];
            console.log('第一个商品数据结构检查:');
            console.log('- 包含 nxDistributerGoodsEntity:', !!firstItem.nxDistributerGoodsEntity);
            console.log('- 包含 orders:', !!firstItem.orders);
            console.log('- 包含 nxDepartmentOrdersEntities:', !!firstItem.nxDepartmentOrdersEntities);
            console.log('- 直接包含 nxDgGoodsName:', !!firstItem.nxDgGoodsName);
          }
        }
        
        if (res.result.code == 0) {
          // 转换数据（如果接口返回的是旧结构）
          const convertedList = this._convertToSimpleStructure(res.result.page.list);
          
          // 去重逻辑
          const existingIds = new Set(this.data.purGoodsArr.map(item => item.nxDistributerPurchaseGoodsId));
          const newItems = convertedList.filter(item => !existingIds.has(item.nxDistributerPurchaseGoodsId));
          const newPurGoodsArr = this.data.purGoodsArr.concat(newItems);
          
          console.log(`📦 现有商品数量: ${this.data.purGoodsArr.length}`);
          console.log(`📦 新加载商品数量: ${convertedList.length}`);
          console.log(`📦 去重后新增数量: ${newItems.length}`);
          console.log(`📦 合并后商品总数: ${newPurGoodsArr.length}`);
          
          // 先检查新合并的数组中是否有目标分类的商品（使用新数组，不依赖setData回调）
          const hasCategoryGoods = newPurGoodsArr.some(goods => 
            goods.nxDgDfgGoodsGreatGrandId === categoryId
          );
          
          console.log(`🔍 检查是否找到目标分类${categoryId}: ${hasCategoryGoods ? '✅ 找到' : '❌ 未找到'}`);
          if (!hasCategoryGoods && newPurGoodsArr.length > 0) {
            const uniqueGreatGrandIds = [...new Set(newPurGoodsArr.map(g => g.nxDgDfgGoodsGreatGrandId))];
            console.log(`📊 当前商品中的 nxDgDfgGoodsGreatGrandId 值列表:`, uniqueGreatGrandIds);
            console.log(`📊 目标分类ID ${categoryId} 是否在列表中:`, uniqueGreatGrandIds.includes(categoryId));
          }
          
          this.setData({
            purGoodsArr: newPurGoodsArr,
            currentPage: res.result.page.currPage,
            totalPage: res.result.page.totalPage,
            totalCount: res.result.page.totalCount,
            pageSize: res.result.page.pageSize,
            hasMore: res.result.page.currPage < res.result.page.totalPage
          }, () => {
            if (hasCategoryGoods) {
              console.log('✅ 找到目标分类商品，设置跳转目标');
              console.log(`🎯 设置toViewWx: ${targetId}`);
              
              // 隐藏加载蒙版
              load.hideLoading();
              
              this.setData({
                toViewWx: targetId
              });
              
              // 重新获取位置信息
              setTimeout(() => {
                console.log('🔄 重新获取位置信息');
                this.calculateCategoryPositions();
              }, 300);
            } else {
              // 检查是否还有更多数据可以加载
              const hasMoreData = res.result.page.currPage < res.result.page.totalPage;
              
              if (hasMoreData) {
                // 继续加载下一页
                console.log('❌ 未找到目标分类，继续加载下一页');
                console.log('🔄 准备加载第' + (page + 1) + '页...');
                setTimeout(() => {
                  this.loadGoodsUntilCategory(categoryId, targetId, page + 1, maxAttempts);
                }, 500);
              } else {
                // 已加载所有数据，仍未找到
                console.log('❌ 已加载所有数据，仍未找到该分类');
                // 隐藏加载蒙版
                load.hideLoading();
                wx.showToast({
                  title: '该分类暂无商品',
                  icon: 'none',
                  duration: 2000
                });
              }
            }
          });
          return res; // 返回结果
        } else {
          console.log('❌ 加载数据失败:', res.result.msg);
          // 隐藏加载蒙版
          load.hideLoading();
          return res; // 返回结果
        }
      }).catch(err => {
        console.error('❌ 加载数据失败:', err);
        this.setData({
          isLoading: false
        });
        // 隐藏加载蒙版
        load.hideLoading();
        throw err; // 重新抛出错误
      });
    },

    // 触底加载更多数据
    onReachBottom() {
      // 按客户模式下，商品是一次性加载的，不需要分页加载
      if (this.data.viewMode === 'department') {
        console.log('按客户模式，不触发加载更多');
        return;
      }
      
      console.log('\n=== 触底加载更多数据 ===');
      console.log('📊 当前状态:', {
        isLoading: this.data.isLoading,
        hasMore: this.data.hasMore,
        currentPage: this.data.currentPage,
        totalPage: this.data.totalPage,
        purGoodsArrLength: this.data.purGoodsArr.length
      });
      
      // 如果正在加载或没有更多数据，则跳过
      if (this.data.isLoading || !this.data.hasMore) {
        console.log('❌ 跳过加载:', {
          isLoading: this.data.isLoading,
          hasMore: this.data.hasMore
        });
        return;
      }
      
      // 如果当前页已经是最后一页，则跳过
      if (this.data.currentPage >= this.data.totalPage) {
        console.log('❌ 已经是最后一页:', {
          currentPage: this.data.currentPage,
          totalPage: this.data.totalPage
        });
        this.setData({
          hasMore: false
        });
        return;
      }
      
      console.log('🔄 开始加载下一页数据');
      this.setData({
        isLoading: true
      });
      
      const nextPage = this.data.currentPage + 1;
      const data = {
        disId: this.data.disId,
        page: nextPage,
        limit: this.data.limit,
      };
      
      console.log('📤 请求参数:', data);
      
      disGetTypePreparePurGoodsPage(data).then(res => {
        console.log('📥 API响应:', res.result);
        
        // 检查数据大小
        if (res.result?.page?.list) {
          const dataStr = JSON.stringify(res.result.page.list);
          const dataSizeKB = this._calculateDataSize(dataStr);
          console.log('📊 加载更多 - 商品列表数据大小:', dataSizeKB, 'KB');
          if (res.result.page.list.length > 0) {
            console.log('第一个商品数据结构:', res.result.page.list[0]);
            console.log('第一个商品是否包含 nxDistributerGoodsEntity:', !!res.result.page.list[0].nxDistributerGoodsEntity);
            console.log('第一个商品是否包含 orders:', !!res.result.page.list[0].orders);
            console.log('第一个商品是否包含 nxDepartmentOrdersEntities:', !!res.result.page.list[0].nxDepartmentOrdersEntities);
          }
        }
        
        if (res.result.code == 0) {
          // 转换数据（如果接口返回的是旧结构）
          const convertedList = this._convertToSimpleStructure(res.result.page.list);
          
          // 去重逻辑
          const existingIds = new Set(this.data.purGoodsArr.map(item => item.nxDistributerPurchaseGoodsId));
          const newItems = convertedList.filter(item => !existingIds.has(item.nxDistributerPurchaseGoodsId));
          const newPurGoodsArr = this.data.purGoodsArr.concat(newItems);
          
          console.log('📦 数据统计:', {
            现有商品数量: this.data.purGoodsArr.length,
            新加载商品数量: convertedList.length,
            去重后新增数量: newItems.length,
            合并后商品总数: newPurGoodsArr.length
          });
          
          this.setData({
            purGoodsArr: newPurGoodsArr,
            currentPage: res.result.page.currPage,
            totalPage: res.result.page.totalPage,
            totalCount: res.result.page.totalCount,
            pageSize: res.result.page.pageSize,
            hasMore: res.result.page.currPage < res.result.page.totalPage,
            isLoading: false
          }, () => {
            console.log('✅ 数据加载完成，重新获取位置信息');
            // 重新获取位置信息
            setTimeout(() => {
              this.calculateCategoryPositions();
            }, 300);
          });
        } else {
          console.log('❌ 加载数据失败:', res.result.msg);
          this.setData({
            isLoading: false
          });
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          });
        }
      }).catch(err => {
        console.error('❌ 加载数据失败:', err);
        this.setData({
          isLoading: false
        });
        wx.showToast({
          title: '加载失败',
          icon: 'none'
        });
      });
    },

    loadMoreDataForCategory(categoryId, categoryName, maxAttempts = 3) {
      console.log(`\n=== 开始为分类加载更多数据 ===`);
      console.log(`🎯 目标分类: ${categoryName} (ID: ${categoryId})`);
      console.log(`📊 最大尝试次数: ${maxAttempts}`);
      console.log(`📊 当前商品总数: ${this.data.purGoodsArr.length}`);
      
      let attemptCount = 0;
      
      const loadNextPage = () => {
        attemptCount++;
        console.log(`🔄 尝试加载第${attemptCount}次数据，寻找分类${categoryId}`);
        
        if (attemptCount > maxAttempts) {
          console.log('❌ 达到最大尝试次数，停止加载');
          this.setData({
            isLoadingMoreForCategory: false
          });
          return;
        }
        
        // 加载下一页数据
        const nextPage = this.data.currentPage + attemptCount;
        const data = {
          disId: this.data.disId,
          page: nextPage,
          limit: this.data.limit,
        };
        
        console.log(`📤 请求参数:`, data);
        
        disGetTypePreparePurGoodsPage(data).then(res => {
          console.log(`📥 API响应:`, res.result);
          
          // 检查数据大小和结构
          if (res.result?.page?.list) {
            const dataStr = JSON.stringify(res.result.page.list);
            const dataSizeKB = this._calculateDataSize(dataStr);
            console.log('📊 分类加载更多 - 商品列表数据大小:', dataSizeKB, 'KB');
            if (res.result.page.list.length > 0) {
              const firstItem = res.result.page.list[0];
              console.log('第一个商品数据结构检查:');
              console.log('- 包含 nxDistributerGoodsEntity:', !!firstItem.nxDistributerGoodsEntity);
              console.log('- 包含 orders:', !!firstItem.orders);
              console.log('- 包含 nxDepartmentOrdersEntities:', !!firstItem.nxDepartmentOrdersEntities);
              console.log('- 直接包含 nxDgGoodsName:', !!firstItem.nxDgGoodsName);
            }
          }
          
          if (res.result.code == 0) {
            // 去重逻辑
            const existingIds = new Set(this.data.purGoodsArr.map(item => item.nxDistributerPurchaseGoodsId));
            const newItems = res.result.page.list.filter(item => !existingIds.has(item.nxDistributerPurchaseGoodsId));
            const newPurGoodsArr = this.data.purGoodsArr.concat(newItems);
            
            console.log(`📦 现有商品数量: ${this.data.purGoodsArr.length}`);
            console.log(`📦 新加载商品数量: ${res.result.page.list.length}`);
            console.log(`📦 去重后新增数量: ${newItems.length}`);
            console.log(`📦 合并后商品总数: ${newPurGoodsArr.length}`);
            
            this.setData({
              purGoodsArr: newPurGoodsArr,
              currentPage: res.result.page.currPage,
              totalPage: res.result.page.totalPage,
              totalCount: res.result.page.totalCount,
              pageSize: res.result.page.pageSize,
              hasMore: res.result.page.currPage < res.result.page.totalPage,
              isLoadingMoreForCategory: false
            }, () => {
              // 检查是否找到了目标分类的商品
              const hasCategoryGoods = this.data.purGoodsArr.some(goods => 
                goods.nxDgDfgGoodsGreatGrandId === categoryId
              );
              
              console.log(`🔍 检查是否找到目标分类${categoryId}: ${hasCategoryGoods ? '✅ 找到' : '❌ 未找到'}`);
              
              if (hasCategoryGoods) {
                console.log('✅ 找到目标分类商品，停止加载');
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

    // Event handler for inner swiper change
    onInnerSwiperChange(e) {
      this.setData({
        innerCurrent: e.detail.current,
      });
      var that = this;
      that.setData({
        innerCurrent: e.detail.current,
        // 重置分页相关数据
        currentPage: 1,
        totalPage: 0,
        totalCount: 0,
        hasMore: true,
        isLoading: false,
        purGoodsArr: [],
        purCataArr: [],
        selectedSubWx: 0,
        toViewWx: '',
        scrollTopLeftWx: 0,
        categoryPositions: [],
        scrollTimer: null,
        isLoadingMoreForCategory: false,
        
        // 重置下拉刷新状态
        refresherTriggered: false,
        

      });
    
      if (that.data.innerCurrent == 0) {
        this._initData();
      }
      if (that.data.innerCurrent == 1) {
        // TODO: 实现采购单相关功能
      }
    },


    _initData() {
      load.showLoading("获取数据中");
      var data = {
        disId: this.data.disId,
        purType: 1
      }
      
      // 根据显示模式调用不同接口
      if (this.data.viewMode === 'category') {
        // 按类别模式：获取商品分类列表
        disGetTypePrepareOutCata(data)
          .then(res => {
            console.log('分类接口返回:', res.result.data);
            console.log('分类数组长度:', res.result.data?.arr?.length);
            
            // 打印分类数组的详细信息
            if (res.result.data?.arr && res.result.data.arr.length > 0) {
              console.log('📊 分类数组详细信息:');
              res.result.data.arr.forEach((cat, idx) => {
                console.log(`  分类${idx}:`, {
                  nxDistributerFatherGoodsId: cat.nxDistributerFatherGoodsId,
                  nxDfgFatherGoodsName: cat.nxDfgFatherGoodsName,
                  newOrderCount: cat.newOrderCount,
                  // 打印所有可能的ID字段
                  allKeys: Object.keys(cat).filter(key => key.includes('Id') || key.includes('ID')),
                  fullObject: cat
                });
              });
            }
            
            // 检查分类数据大小
            if (res.result.data?.arr) {
              const dataStr = JSON.stringify(res.result.data.arr);
              const dataSizeKB = this._calculateDataSize(dataStr);
              console.log('📊 分类数据大小:', dataSizeKB, 'KB');
            }
            
            if (res.result.code == 0) {
              load.hideLoading();
              this.setData({
                purCataArr: res.result.data.arr,
              })
             
              this.getTabBar().setData({
                stockCount: res.result.data.stockCount,
                puringCount: res.result.data.puringCount,
                collCount: res.result.data.collCount,
              })

              this.setData({
                'tabs_wx[0].amount': res.result.data.unPurCount,
                'tabs_wx[1].amount': res.result.data.havePurCount,
              })
             
              return this._getPageData();

            } else {
              load.hideLoading();
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
        disGetTypePrepareOutDepCata(data)
          .then(res => {
            console.log('按客户模式 - 部门列表:', res.result.data);
            if (res.result.code == 0) {
              load.hideLoading();
              this.setData({
                depArr: res.result.data.arr,
              })
             
              this.getTabBar().setData({
                stockCount: res.result.data.stockCount,
                puringCount: res.result.data.puringCount,
                collCount: res.result.data.collCount,
              })
              this.setData({
                'tabs_wx[0].amount': res.result.data.unPurCount,
                'tabs_wx[1].amount': res.result.data.havePurCount,
              })
              // 如果有部门，默认选中第一个
              if (res.result.data.arr.length > 0) {
                return this._loadDepartmentGoods(res.result.data.arr[0].depId, 0);
              }

            } else {
              load.hideLoading();
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
      }
    },
    
    // 加载指定部门的商品数据（按客户模式）
    _loadDepartmentGoods(depId, depIndex) {
      load.showLoading("获取商品中");
      const data = {
        disId: this.data.disId,
        depId: depId,
        purType: 1
      };
      
      return disGetTypePrepareOutDepGoodsPage(data)
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
            const dataArr = res.result.data.arr || [];
            console.log('返回数据数组长度:', dataArr.length);
            if (dataArr.length > 0) {
              console.log('第一个元素结构:', dataArr[0]);
              console.log('第一个元素的所有字段:', Object.keys(dataArr[0]));
            }
            
            // 根据实际返回的数据结构处理
            // 从日志看，返回的是分类数组，每个分类对象包含：
            // - nxDistributerFatherGoodsId: 分类ID
            // - nxDfgFatherGoodsName: 分类名称
            // - nxDistributerPurchaseGoodsEntities: 采购商品实体数组（应该是这个）
            // - nxDistributerGoodsEntities: 商品实体数组
            let purGoodsArr = [];
            let categoryArr = [];
            
            if (dataArr.length > 0) {
              // 检查第一个元素的结构
              const firstItem = dataArr[0];
              console.log('检查商品数组字段:');
              console.log('nxDistributerPurchaseGoodsEntities:', firstItem.nxDistributerPurchaseGoodsEntities);
              console.log('nxDistributerGoodsEntities:', firstItem.nxDistributerGoodsEntities);
              
              // 遍历分类数组，提取每个分类下的商品
              dataArr.forEach(category => {
                // 保存分类信息
                categoryArr.push({
                  nxDistributerFatherGoodsId: category.nxDistributerFatherGoodsId,
                  nxDfgFatherGoodsName: category.nxDfgFatherGoodsName,
                  nxDfgFatherGoodsSort: category.nxDfgFatherGoodsSort,
                  newOrderCount: category.newOrderCount || 0,
                  isAllSelected: false // 初始化全选状态为 false
                });
                
                // 提取商品：使用 nxDistributerPurchaseGoodsEntities
                if (category.nxDistributerPurchaseGoodsEntities && 
                    Array.isArray(category.nxDistributerPurchaseGoodsEntities) && 
                    category.nxDistributerPurchaseGoodsEntities.length > 0) {
                  // 转换商品数据（如果接口返回的是旧结构）
                  const convertedGoods = this._convertToSimpleStructure(category.nxDistributerPurchaseGoodsEntities);
                  purGoodsArr = purGoodsArr.concat(convertedGoods);
                }
              });
            }
            
            console.log('处理后的商品数组长度:', purGoodsArr.length);
            console.log('分类数组长度:', categoryArr.length);
            
            // 检查商品数据结构
            if (purGoodsArr.length > 0) {
              console.log('第一个商品数据结构:', purGoodsArr[0]);
              console.log('第一个商品是否包含 orders:', !!purGoodsArr[0].orders);
              console.log('第一个商品是否包含 nxDepartmentOrdersEntities:', !!purGoodsArr[0].nxDepartmentOrdersEntities);
              console.log('第一个商品直接包含 nxDgGoodsName:', !!purGoodsArr[0].nxDgGoodsName);
            }
            
            this.setData({
              selectedDepId: depId,
              selectedSubWx: depIndex,
              purGoodsArr: purGoodsArr,
              purCataArr: categoryArr, // 保存分类信息用于锚点
              isAllDepartmentSelected: false, // 重置全选状态
            }, () => {
              // 初始化类别的全选状态
              if (this.data.viewMode === 'category') {
                this._initCategorySelectStates();
              }
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

    // 计算数据大小（KB）- 微信小程序不支持 Blob，使用字符串长度估算
    _calculateDataSize(data) {
      const dataStr = typeof data === 'string' ? data : JSON.stringify(data);
      // 使用字符串长度估算：JSON 字符串中中文字符会被转义为 \uXXXX，约 6 字节，英文字符 1 字节
      // 这里用平均 3 字节估算（考虑到 JSON 格式字符、转义等）
      const sizeBytes = dataStr.length * 2; // 保守估算，每个字符平均 2 字节
      return (sizeBytes / 1024).toFixed(2);
    },

    // 数据转换函数：将旧结构转换为新结构（如果接口返回的是旧结构）
    _convertToSimpleStructure(goodsList) {
      if (!goodsList || !Array.isArray(goodsList)) {
        return goodsList;
      }
      
      // 检查第一个商品是否包含旧结构
      const firstItem = goodsList[0];
      if (!firstItem) {
        return goodsList;
      }
      
      // 如果已经是新结构（直接包含 nxDgGoodsName），直接返回，但需要添加uniqueKey
      if (firstItem.nxDgGoodsName && !firstItem.nxDistributerGoodsEntity) {
        console.log('✅ 数据已经是简化版结构，添加uniqueKey...');
        return goodsList.map((item, goodsIndex) => {
          const goodsId = item.nxDistributerPurchaseGoodsId || goodsIndex;
          const orders = item.orders || [];
          if (orders.length > 0) {
            const updatedOrders = orders.map((order, orderIndex) => {
              const orderId = order.nxDepartmentOrdersId || orderIndex;
              return Object.assign({}, order, {
                uniqueKey: goodsId + '-' + orderId + '-' + orderIndex
              });
            });
            return Object.assign({}, item, { orders: updatedOrders });
          }
          return item;
        });
      }
      
      // 如果是旧结构（包含 nxDistributerGoodsEntity），进行转换
      if (firstItem.nxDistributerGoodsEntity) {
        console.log('🔄 检测到旧数据结构，开始转换为简化版...');
        return goodsList.map((item, goodsIndex) => {
          const goodsEntity = item.nxDistributerGoodsEntity || {};
          const orders = item.nxDepartmentOrdersEntities || [];
          const goodsId = item.nxDistributerPurchaseGoodsId || goodsIndex;
          
          // 转换订单数据
          const convertedOrders = orders.map((order, orderIndex) => {
            const orderId = order.nxDepartmentOrdersId || orderIndex;
            const convertedOrder = {
              nxDepartmentOrdersId: order.nxDepartmentOrdersId,
              nxDoDepDisGoodsId: order.nxDoDepDisGoodsId,
              customerStandardText: order.customerStandardText,
              nxDoQuantity: order.nxDoQuantity,
              nxDoStandard: order.nxDoStandard,
              nxDoWeight: order.nxDoWeight,
              nxDoRemark: order.nxDoRemark,
              nxDoPrintStandard: order.nxDoPrintStandard,
              nxDoDsStandardScale: order.nxDoDsStandardScale,
              hasChoice: order.hasChoice || false,
              uniqueKey: goodsId + '-' + orderId + '-' + orderIndex, // 添加唯一key
            };
            
            // 协作订单：保留协作商名称和部门编码
            const collabId = order.nxDoRequestDisId;
            const isCollaborative = collabId !== undefined && collabId !== null && collabId !== -1 && String(collabId) !== '-1';
            if (isCollaborative) {
              convertedOrder.nxDoRequestDisId = collabId;
              convertedOrder.nxDoRequestDistributerName = order.nxDoRequestDistributerName;
              convertedOrder.fatherDepartmentOrderCode = order.fatherDepartmentOrderCode || (order.nxDepartmentEntity && order.nxDepartmentEntity.fatherDepartmentEntity ? order.nxDepartmentEntity.fatherDepartmentEntity.nxDepartmentOrderCode : null);
            }
            // 扁平化部门信息
            else if (order.nxDepartmentEntity) {
              const dep = order.nxDepartmentEntity;
              convertedOrder.depName = dep.fatherDepartmentEntity 
                ? `${dep.fatherDepartmentEntity.nxDepartmentOrderCode}.${dep.nxDepartmentOrderCode}`
                : dep.nxDepartmentOrderCode;
              convertedOrder.nxDepartmentAttrName = dep.nxDepartmentAttrName;
              convertedOrder.nxDepartmentOrderCode = dep.nxDepartmentOrderCode;
              if (dep.fatherDepartmentEntity) {
                convertedOrder.fatherDepartmentOrderCode = dep.fatherDepartmentEntity.nxDepartmentOrderCode;
              }
            }
            
            // 扁平化GB部门信息
            if (order.gbDepartmentEntity) {
              const gbDep = order.gbDepartmentEntity;
              convertedOrder.gbDepName = gbDep.fatherGbDepartmentEntity
                ? `${gbDep.fatherGbDepartmentEntity.gbDepartmentName}.${gbDep.gbDepartmentName}`
                : gbDep.gbDepartmentName;
            }
           
            
            return convertedOrder;
          });
          
          // 返回简化版结构
          return {
            nxDistributerPurchaseGoodsId: item.nxDistributerPurchaseGoodsId,
            nxDpgDisGoodsId: item.nxDpgDisGoodsId,
            nxDpgQuantity: item.nxDpgQuantity,
            nxDpgStandard: item.nxDpgStandard,
            nxDpgStatus: item.nxDpgStatus,
            nxDpgOrdersAmount: item.nxDpgOrdersAmount,
            nxDistributerGoodsId: goodsEntity.nxDistributerGoodsId,
            nxDgGoodsName: goodsEntity.nxDgGoodsName,
            nxDgGoodsStandardname: goodsEntity.nxDgGoodsStandardname,
            nxDgGoodsStandardWeight: goodsEntity.nxDgGoodsStandardWeight,
            nxDgCartonUnit: goodsEntity.nxDgCartonUnit,
            nxDgGoodsBrand: goodsEntity.nxDgGoodsBrand,
            nxDgDfgGoodsGrandId: goodsEntity.nxDgDfgGoodsGrandId,
            nxDgDfgGoodsGreatGrandId: goodsEntity.nxDgDfgGoodsGreatGrandId,
            nxDgPurchaseAuto: goodsEntity.nxDgPurchaseAuto,
            isSelected: item.isSelected || false,
            categoryIsAllSelected: false, // 类别全选状态，用于在商品列表中显示
            orders: convertedOrders, // 使用 orders 而不是 nxDepartmentOrdersEntities
          };
        });
      }
      
      return goodsList;
    },

    _getPageData(){
      var data = {
        disId: this.data.disId,
        page: this.data.currentPage,
        limit: this.data.limit,
      }
      console.log("data",data);
      return disGetTypePreparePurGoodsPage(data).then(res =>{
          if(res.result.code == 0){
            console.log('API返回结果:', res.result);
            console.log('商品列表长度:', res.result.page?.list?.length);
            
            // 检查数据大小（转换前）
            const originalDataStr = JSON.stringify(res.result.page.list);
            const originalDataSizeKB = this._calculateDataSize(originalDataStr);
            console.log('📊 原始商品列表数据大小:', originalDataSizeKB, 'KB');
            
            // 如果数据量过大，打印第一个商品的结构用于调试
            if (res.result.page.list && res.result.page.list.length > 0) {
              const firstItem = res.result.page.list[0];
              console.log('第一个商品数据结构:', firstItem);
              console.log('第一个商品是否包含 nxDistributerGoodsEntity:', !!firstItem.nxDistributerGoodsEntity);
              console.log('第一个商品是否包含 orders:', !!firstItem.orders);
              console.log('第一个商品是否包含 nxDepartmentOrdersEntities:', !!firstItem.nxDepartmentOrdersEntities);
              console.log('第一个商品直接包含 nxDgGoodsName:', !!firstItem.nxDgGoodsName);
              // 打印所有可能的分类ID字段
              console.log('第一个商品的分类相关ID字段:', {
                nxDgDfgGoodsGrandId: firstItem.nxDgDfgGoodsGrandId,
                nxDgDfgGoodsGreatGrandId: firstItem.nxDgDfgGoodsGreatGrandId,
                allIdKeys: Object.keys(firstItem).filter(key => key.includes('Id') || key.includes('ID') || key.includes('Grand'))
              });
            }
            
            // 转换数据（如果接口返回的是旧结构）
            const convertedList = this._convertToSimpleStructure(res.result.page.list);
            
            // 检查转换后的数据大小
            const convertedDataStr = JSON.stringify(convertedList);
            const convertedDataSizeKB = this._calculateDataSize(convertedDataStr);
            console.log('📊 转换后商品列表数据大小:', convertedDataSizeKB, 'KB');
            console.log('📊 数据减少:', (parseFloat(originalDataSizeKB) - parseFloat(convertedDataSizeKB)).toFixed(2), 'KB');
            
            this.setData({
              purGoodsArr: convertedList,
              currentPage: res.result.page.currPage,
              totalPage: res.result.page.totalPage,
              totalCount: res.result.page.totalCount,
              pageSize: res.result.page.pageSize,
              hasMore: res.result.page.currPage < res.result.page.totalPage,
              isLoading: false
            }, () => {
              // 数据设置完成后，获取位置信息
              console.log('数据加载完成，开始获取位置信息');
              console.log('分页信息:', {
                currPage: res.result.page.currPage,
                totalPage: res.result.page.totalPage,
                totalCount: res.result.page.totalCount,
                pageSize: res.result.page.pageSize,
                hasMore: res.result.page.currPage < res.result.page.totalPage
              });
              setTimeout(() => {
                this.calculateCategoryPositions();
              }, 300); // 延迟300ms确保DOM完全渲染完成
            })
            return res; // 返回结果
          } else {
            console.log('获取数据失败:', res.result.msg);
            wx.showToast({
              title: res.result.msg,
              icon: 'none'
            });
            return res; // 返回结果
          }
      }).catch(err => {
        console.error('_getPageData 请求失败:', err);
        wx.showToast({
          title: '获取数据失败',
          icon: 'none'
        });
        throw err; // 重新抛出错误
      });
    },

    


  // 删除采购订单
  deletePlanPurchseOrders(e) {
    var item = e.currentTarget.dataset.item;
    var goodsIndex = e.currentTarget.dataset.index;
    console.log("[deletePlanPurchseOrders] 开始删除采购订单，item:", item);
    load.showLoading("删除进货商品")
    console.log(e.currentTarget.dataset.item);
    deletePlanPurchase(e.currentTarget.dataset.item.nxDistributerPurchaseGoodsId).then(res => {
      console.log("[deletePlanPurchseOrders] 接口返回数据:", res.result);
      load.hideLoading();
      if (res.result.code == 0) {
        // 删除成功后，从数组中移除该商品
        var purGoodsArr = this.data.purGoodsArr;
        var purId = item.nxDistributerPurchaseGoodsId;
        
        // 从商品数组中移除
        var newPurGoodsArr = purGoodsArr.filter((goods, index) => {
          // 如果是要删除的商品，则过滤掉
          if (goods.nxDistributerPurchaseGoodsId === purId) {
            console.log(`[deletePlanPurchseOrders] 移除商品索引 ${index}:`, goods);
            return false;
          }
          return true;
        });
        
        // 从选中数组中移除
        var selectedArr = this.data.selectedArr || [];
        var newSelectedArr = selectedArr.filter(selectedItem => selectedItem.purGoodsId !== purId);
        
        var selectedPrintArr = this.data.selectedPrintArr || [];
        var newSelectedPrintArr = selectedPrintArr.filter(printItem => printItem.nxDistributerPurchaseGoodsId !== purId);
        
        // 更新数据
        this.setData({
          purGoodsArr: newPurGoodsArr,
          selectedArr: newSelectedArr,
          selectedPrintArr: newSelectedPrintArr
        }, () => {
          console.log(`[deletePlanPurchseOrders] 删除完成，剩余商品数量: ${newPurGoodsArr.length}`);
          console.log(`[deletePlanPurchseOrders] 剩余选中商品数量: ${newSelectedArr.length}`);
          
          // 如果删除后没有选中的商品，隐藏按钮
          if (newSelectedPrintArr.length === 0) {
            this.hideButton();
          }
          
          // 重新计算分类位置
          setTimeout(() => {
            this.calculateCategoryPositions();
          }, 300);
          
          wx.showToast({
            title: '删除成功',
            icon: 'success',
            duration: 1500
          });
        });

      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    }).catch(err => {
      console.error("[deletePlanPurchseOrders] 删除失败:", err);
      load.hideLoading();
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    })
  },

  
    // 1，选择未采购商品
    selectItem(e) {
      console.log("=== selectItem 开始 ===");
      console.log("事件对象:", e);
      var index = e.currentTarget.dataset.index;
      console.log("点击的商品索引:", index);
      console.log("purGoodsArr长度:", this.data.purGoodsArr?.length);
      console.log("purGoodsArr:", this.data.purGoodsArr);
      
      // 安全检查：确保数组索引有效且对象存在
      if (!this.data.purGoodsArr || !this.data.purGoodsArr[index]) {
        console.error('selectItem: 商品不存在，index:', index, 'purGoodsArr长度:', this.data.purGoodsArr?.length);
        console.error('purGoodsArr内容:', this.data.purGoodsArr);
        return;
      }
      
      console.log("商品对象:", this.data.purGoodsArr[index]);
      var itemSelected = this.data.purGoodsArr[index].isSelected;
      console.log("当前选中状态:", itemSelected);
      var selectedData = "purGoodsArr[" + index + "].isSelected";
      if (itemSelected) {
        this.setData({
          [selectedData]: false,
        })

        var arr = this.data.purGoodsArr[index].orders;
        if (arr && Array.isArray(arr)) {
          for (var i = 0; i < arr.length; i++) {
            var orderChoicedData = "purGoodsArr[" + index + "].orders[" + i + "].hasChoice";
            this.setData({
              [orderChoicedData]: false
            })
          }
        }

        this._getSelectedArr(false, index);
        
        // 更新类别的全选状态
        if (this.data.viewMode === 'category' && this.data.purGoodsArr[index].nxDgDfgGoodsGreatGrandId) {
          this._updateCategorySelectState(this.data.purGoodsArr[index].nxDgDfgGoodsGreatGrandId);
        }

      } else {
        var userData = "purGoodsArr[" + index + "].nxDpbPurUserId";
        this.setData({
          [selectedData]: true,
          [userData]: this.data.userInfo.nxDistributerUserId,
        })

        var arr = this.data.purGoodsArr[index].orders;
        if (arr && Array.isArray(arr)) {
          for (var i = 0; i < arr.length; i++) {
            var orderChoicedData = "purGoodsArr[" + index + "].orders[" + i + "].hasChoice";
            this.setData({
              [orderChoicedData]: true
            })
          }
        }
        this._getSelectedArr(true, index);
        
        // 更新类别的全选状态
        if (this.data.viewMode === 'category' && this.data.purGoodsArr[index].nxDgDfgGoodsGreatGrandId) {
          this._updateCategorySelectState(this.data.purGoodsArr[index].nxDgDfgGoodsGreatGrandId);
        }

      }
      
      // 如果是部门模式，更新全选状态
      if (this.data.viewMode === 'department') {
        setTimeout(() => {
          this._checkAllDepartmentSelected();
        }, 100);
      }

    },

    // 检查部门模式下是否全选
    _checkAllDepartmentSelected() {
      if (this.data.viewMode !== 'department' || !this.data.purGoodsArr || this.data.purGoodsArr.length === 0) {
        this.setData({
          isAllDepartmentSelected: false
        });
        return;
      }
      
      // 检查所有商品是否都已选中
      var allSelected = this.data.purGoodsArr.every(function(goods) {
        return goods.isSelected === true;
      });
      
      this.setData({
        isAllDepartmentSelected: allSelected
      });
    },

    // 部门模式下全选/取消全选
    // 阻止事件冒泡
    stopPropagation() {
      console.log('stopPropagation 被调用');
      // 空函数，用于阻止事件冒泡
    },
    
    // 选择类别下的所有商品
    selectAllCategoryGoods(e) {
      console.log('========== selectAllCategoryGoods 开始 ==========');
      
      if (this.data.viewMode !== 'category') {
        console.log('❌ 不是类别模式，当前模式:', this.data.viewMode);
        return;
      }
      
      const categoryId = e.currentTarget.dataset.categoryId;
      if (!categoryId) {
        console.error('❌ 类别ID不存在', { categoryId, dataset: e.currentTarget.dataset });
        return;
      }
      
      // 先检查该类别的商品是否已全部加载
      const categoryGoods = this.data.purGoodsArr.filter(goods => 
        String(goods.nxDgDfgGoodsGreatGrandId) === String(categoryId)
      );
      
      console.log('该类别下的商品数量:', categoryGoods.length);
      console.log('当前页:', this.data.currentPage, '总页数:', this.data.totalPage);
      
      // 检查是否还有更多页需要加载
      const hasMorePages = this.data.totalPage > 0 && this.data.currentPage < this.data.totalPage;
      
      if (hasMorePages) {
        console.log('⚠️ 该类别还有更多页商品未加载，先加载完所有商品再执行全选');
        load.showLoading('正在加载该类别所有商品...');
        // 先加载完该类别的所有商品，然后再执行全选
        this.loadAllCategoryGoods(categoryId).then(() => {
          load.hideLoading();
          // 加载完成后执行全选
          this._doSelectAllCategoryGoods(categoryId);
        }).catch(err => {
          console.error('加载类别商品失败:', err);
          load.hideLoading();
          wx.showToast({
            title: '加载商品失败',
            icon: 'none'
          });
        });
      } else {
        // 已加载完所有商品，直接执行全选
        this._doSelectAllCategoryGoods(categoryId);
      }
    },

    // 加载某个类别的所有商品（只加载包含该类别的页）
    loadAllCategoryGoods(categoryId, startPage = null) {
      console.log(`\n=== 开始加载类别 ${categoryId} 的所有商品 ===`);
      
      // 如果未指定起始页，从当前页的下ー页开始
      if (startPage === null) {
        startPage = this.data.currentPage + 1;
      }
      
      console.log(`📄 起始页码: ${startPage}`);
      console.log(`📊 当前商品总数: ${this.data.purGoodsArr.length}`);
      
      // 保存加载前的状态
      const originalCurrentPage = this.data.currentPage;
      const originalHasMore = this.data.hasMore;
      let hasLoadedCategoryGoods = false; // 是否已经加载到该类别的商品
      
      return new Promise((resolve, reject) => {
        if (this.data.isLoading) {
          console.log('⚠️ 正在加载中，等待完成');
          setTimeout(() => {
            this.loadAllCategoryGoods(categoryId, startPage).then(resolve).catch(reject);
          }, 500);
          return;
        }
        
        // 如果已经加载完所有页，直接返回
        if (this.data.totalPage > 0 && startPage > this.data.totalPage) {
          console.log('✅ 已加载完所有页');
          resolve();
          return;
        }
        
        this.setData({
          isLoading: true
        });
        
        const data = {
          disId: this.data.disId,
          page: startPage,
          limit: this.data.limit,
        };
        
        console.log(`📤 请求第${startPage}页数据`);
        
        disGetTypePreparePurGoodsPage(data).then(res => {
          this.setData({
            isLoading: false
          });
          
          if (res.result.code == 0) {
            const convertedList = this._convertToSimpleStructure(res.result.page.list);
            
            // 去重逻辑
            const existingIds = new Set(this.data.purGoodsArr.map(item => item.nxDistributerPurchaseGoodsId));
            const newItems = convertedList.filter(item => !existingIds.has(item.nxDistributerPurchaseGoodsId));
            const newPurGoodsArr = this.data.purGoodsArr.concat(newItems);
            
            // 检查新加载的数据中是否包含目标类别的商品
            const hasCategoryInNewData = newItems.some(item => 
              String(item.nxDgDfgGoodsGreatGrandId) === String(categoryId)
            );
            
            if (hasCategoryInNewData) {
              hasLoadedCategoryGoods = true;
            }
            
            console.log(`📦 现有商品数量: ${this.data.purGoodsArr.length}`);
            console.log(`📦 新加载商品数量: ${convertedList.length}`);
            console.log(`📦 去重后新增数量: ${newItems.length}`);
            console.log(`📦 合并后商品总数: ${newPurGoodsArr.length}`);
            console.log(`📦 新数据中包含目标类别: ${hasCategoryInNewData}`);
            
            // 检查是否还有更多页
            const hasMorePages = res.result.page.currPage < res.result.page.totalPage;
            
            // 更新数据，保持 hasMore 状态正确
            this.setData({
              purGoodsArr: newPurGoodsArr,
              currentPage: res.result.page.currPage,
              totalPage: res.result.page.totalPage,
              totalCount: res.result.page.totalCount,
              pageSize: res.result.page.pageSize,
              hasMore: hasMorePages // 根据实际的总页数设置
            }, () => {
              // 如果新加载的数据中包含目标类别的商品，继续检查是否还有更多该类别的商品
              if (hasCategoryInNewData && hasMorePages) {
                // 继续加载下一页，可能还有该类别的商品
                console.log(`🔄 继续加载第${res.result.page.currPage + 1}页（寻找类别商品）...`);
                setTimeout(() => {
                  this.loadAllCategoryGoods(categoryId, res.result.page.currPage + 1)
                    .then(resolve)
                    .catch(reject);
                }, 300);
              } else if (!hasCategoryInNewData && hasMorePages) {
                // 当前页没有该类别的商品，但还有更多页，继续加载（因为可能后面的页会有）
                console.log(`🔄 当前页无该类别商品，继续加载第${res.result.page.currPage + 1}页...`);
                setTimeout(() => {
                  this.loadAllCategoryGoods(categoryId, res.result.page.currPage + 1)
                    .then(resolve)
                    .catch(reject);
                }, 300);
              } else {
                // 没有更多页了，或者已经找到该类别的所有商品
                console.log('✅ 已加载完该类别的所有商品');
                resolve();
              }
            });
          } else {
            console.log('❌ 加载数据失败:', res.result.msg);
            reject(new Error(res.result.msg));
          }
        }).catch(err => {
          console.error('❌ 加载数据失败:', err);
          this.setData({
            isLoading: false
          });
          reject(err);
        });
      });
    },

    // 执行类别全选/取消全选的实际逻辑
    _doSelectAllCategoryGoods(categoryId) {
      console.log('========== _doSelectAllCategoryGoods 开始 ==========');
      
      // 找到该类别下的所有商品
      const categoryGoods = this.data.purGoodsArr.filter(goods => 
        String(goods.nxDgDfgGoodsGreatGrandId) === String(categoryId)
      );
      
      console.log('该类别下的商品数量:', categoryGoods.length);
      
      if (categoryGoods.length === 0) {
        console.log('❌ 该类别下没有商品');
        return;
      }
      
      // 检查该类别是否已全选
      const isAllSelected = categoryGoods.every(goods => goods.isSelected === true);
      const newSelectedState = !isAllSelected;
      
      console.log('当前全选状态:', isAllSelected);
      console.log('新的选中状态:', newSelectedState);
      
      var updates = {};
      var that = this;
      
      // 更新该类别下所有商品的选中状态
      this.data.purGoodsArr.forEach(function(goods, goodsIndex) {
        if (String(goods.nxDgDfgGoodsGreatGrandId) === String(categoryId)) {
          var goodsDataKey = `purGoodsArr[${goodsIndex}].isSelected`;
          updates[goodsDataKey] = newSelectedState;
          
          // 同时更新商品的 categoryIsAllSelected 状态（用于显示）
          updates[`purGoodsArr[${goodsIndex}].categoryIsAllSelected`] = newSelectedState;
          
          // 如果商品有订单，也要更新订单的选中状态
          if (goods.orders && goods.orders.length > 0) {
            goods.orders.forEach(function(order, orderIndex) {
              var orderDataKey = `purGoodsArr[${goodsIndex}].orders[${orderIndex}].hasChoice`;
              updates[orderDataKey] = newSelectedState;
            });
          }
          
          // 更新用户ID（如果选中）
          if (newSelectedState) {
            var userDataKey = `purGoodsArr[${goodsIndex}].nxDpbPurUserId`;
            updates[userDataKey] = that.data.userInfo.nxDistributerUserId;
          }
          
          // 更新 selectedArr
          that._getSelectedArr(newSelectedState, goodsIndex);
        }
      });
      
      console.log('准备更新的数据键数量:', Object.keys(updates).length);
      
      // 找到对应的类别索引并更新类别全选状态
      const categoryIndex = this.data.purCataArr.findIndex(cat => 
        String(cat.nxDistributerFatherGoodsId) === String(categoryId)
      );
      
      if (categoryIndex !== -1) {
        updates[`purCataArr[${categoryIndex}].isAllSelected`] = newSelectedState;
      }
      
      this.setData(updates, () => {
        console.log('✅ setData 完成');
        console.log(`${newSelectedState ? '全选' : '取消全选'}类别 ${categoryId} 下的 ${categoryGoods.length} 个商品`);
      });
      
      console.log('========== _doSelectAllCategoryGoods 结束 ==========');
    },
    
    // 更新类别的全选状态（当商品选中状态改变时调用）
    _updateCategorySelectState(categoryId) {
      if (!categoryId || this.data.viewMode !== 'category') {
        return;
      }
      
      // 找到该类别下的所有商品
      const categoryGoods = this.data.purGoodsArr.filter(goods => 
        String(goods.nxDgDfgGoodsGreatGrandId) === String(categoryId)
      );
      
      if (categoryGoods.length === 0) {
        return;
      }
      
      // 检查该类别是否已全选
      const isAllSelected = categoryGoods.every(goods => goods.isSelected === true);
      
      // 找到对应的类别索引
      const categoryIndex = this.data.purCataArr.findIndex(cat => 
        String(cat.nxDistributerFatherGoodsId) === String(categoryId)
      );
      
      var updates = {};
      
      if (categoryIndex !== -1) {
        updates[`purCataArr[${categoryIndex}].isAllSelected`] = isAllSelected;
      }
      
      // 更新该类别下所有商品的 categoryIsAllSelected 状态（用于在商品列表中显示）
      this.data.purGoodsArr.forEach((goods, goodsIndex) => {
        if (String(goods.nxDgDfgGoodsGreatGrandId) === String(categoryId)) {
          updates[`purGoodsArr[${goodsIndex}].categoryIsAllSelected`] = isAllSelected;
        }
      });
      
      if (Object.keys(updates).length > 0) {
        this.setData(updates);
      }
    },
    
    // 初始化所有类别的全选状态（在数据加载完成后调用）
    _initCategorySelectStates() {
      if (this.data.viewMode !== 'category' || !this.data.purCataArr || this.data.purCataArr.length === 0) {
        return;
      }
      
      var updates = {};
      this.data.purCataArr.forEach((category, categoryIndex) => {
        const categoryId = category.nxDistributerFatherGoodsId;
        const categoryGoods = this.data.purGoodsArr.filter(goods => 
          String(goods.nxDgDfgGoodsGreatGrandId) === String(categoryId)
        );
        
        if (categoryGoods.length > 0) {
          const isAllSelected = categoryGoods.every(goods => goods.isSelected === true);
          updates[`purCataArr[${categoryIndex}].isAllSelected`] = isAllSelected;
          
          // 同时更新该类别下所有商品的 categoryIsAllSelected 状态
          this.data.purGoodsArr.forEach((goods, goodsIndex) => {
            if (String(goods.nxDgDfgGoodsGreatGrandId) === String(categoryId)) {
              updates[`purGoodsArr[${goodsIndex}].categoryIsAllSelected`] = isAllSelected;
            }
          });
        } else {
          updates[`purCataArr[${categoryIndex}].isAllSelected`] = false;
        }
      });
      
      if (Object.keys(updates).length > 0) {
        this.setData(updates);
      }
    },
    
    selectAllDepartmentGoods() {
      if (this.data.viewMode !== 'department' || !this.data.purGoodsArr || this.data.purGoodsArr.length === 0) {
        return;
      }
      
      var isAllSelected = this.data.isAllDepartmentSelected;
      var updates = {};
      var that = this;
      
      // 如果是全选操作，先清空 selectedArr，避免累计
      if (!isAllSelected) {
        // 全选：先清空 selectedArr，然后重新添加所有商品
        this.setData({
          selectedArr: []
        });
      }
      
      // 遍历所有商品
      this.data.purGoodsArr.forEach(function(goods, goodsIndex) {
        var goodsDataKey = `purGoodsArr[${goodsIndex}].isSelected`;
        updates[goodsDataKey] = !isAllSelected;
        
        // 如果商品有订单，也要更新订单的选中状态
        if (goods.orders && goods.orders.length > 0) {
          goods.orders.forEach(function(order, orderIndex) {
            var orderDataKey = `purGoodsArr[${goodsIndex}].orders[${orderIndex}].hasChoice`;
            updates[orderDataKey] = !isAllSelected;
          });
        }
        
        // 更新用户ID（如果选中）
        if (!isAllSelected) {
          var userDataKey = `purGoodsArr[${goodsIndex}].nxDpbPurUserId`;
          updates[userDataKey] = that.data.userInfo.nxDistributerUserId;
        }
      });
      
      // 更新数据
      this.setData(updates, () => {
        // 更新 selectedArr
        if (!isAllSelected) {
          // 全选：重新添加所有商品到 selectedArr
          this.data.purGoodsArr.forEach((goods, goodsIndex) => {
            this._getSelectedArr(true, goodsIndex);
          });
        } else {
          // 取消全选：从 selectedArr 移除所有商品
          var goodsIds = this.data.purGoodsArr.map(goods => goods.nxDistributerPurchaseGoodsId);
          var newArr = (this.data.selectedArr || []).filter(item => !goodsIds.includes(item.purGoodsId));
          this.setData({
            selectedArr: newArr
          });
        }
        
        // 更新全选状态
        this.setData({
          isAllDepartmentSelected: !isAllSelected
        });
      });
    },

    _getSelectedArr(what, index) {
      console.log("=== _getSelectedArr 开始 ===");
      console.log("参数 - what:", what, "index:", index);
      var arr = this.data.selectedArr || [];
      var arrPrint = this.data.selectedPrintArr || [];
      var purGoodsArr = this.data.purGoodsArr;
      console.log("当前selectedArr长度:", arr.length);
      console.log("当前selectedPrintArr长度:", arrPrint.length);
      console.log("purGoodsArr长度:", purGoodsArr?.length);
      
      // 安全检查：确保数组索引有效且对象存在
      if (!purGoodsArr || !purGoodsArr[index]) {
        console.error('_getSelectedArr: 商品不存在，index:', index, 'purGoodsArr长度:', purGoodsArr?.length);
        console.error('purGoodsArr内容:', purGoodsArr);
        return;
      }
      
      console.log("商品对象:", purGoodsArr[index]);
      
      if (what) {
        var purId = purGoodsArr[index].nxDistributerPurchaseGoodsId;
        console.log("添加商品，purId:", purId);
        var item = {
          goodsIndex: index,
          purGoodsId: purId,
          item: purGoodsArr[index]
        }
        arr.push(item);
        arrPrint.push(purGoodsArr[index]);

        this.setData({
          selectedArr: arr,
          selectedPrintArr: arrPrint
        })
        console.log("添加后selectedArr长度:", arr.length);
        console.log("添加后selectedPrintArr长度:", arrPrint.length);
      } else {
        var purId = purGoodsArr[index].nxDistributerPurchaseGoodsId;
        console.log("移除商品，purId:", purId);
        var choiceStockArr = arr.filter(item => item.purGoodsId !== purId);
        var choicePrintArr = arrPrint.filter(item => item.nxDistributerPurchaseGoodsId !== purId);
        console.log("移除后selectedArr长度:", choiceStockArr.length);
        console.log("移除后selectedPrintArr长度:", choicePrintArr.length);
        this.setData({
          selectedArr: choiceStockArr,
          selectedPrintArr: choicePrintArr
        })
      }

      if (this.data.selectedPrintArr.length > 0) {
        console.log("显示按钮，selectedPrintArr长度:", this.data.selectedPrintArr.length);
        this.showButton()
      } else {
        console.log("隐藏按钮");
        this.hideButton();
      }
      console.log("=== _getSelectedArr 结束 ===");

    },


    showButton() {
      // this.getTabBar().setData({
      //   showTabBar: false
      // })
      this.animation.translateY(0).step();
      this.setData({
        buttonAnimation: this.animation.export(),
      });
    },

    //复制粘贴
    toPaste(e) {
      // 按照页面数据顺序排序选中的商品
      var sortedPrintArr = this.data.selectedPrintArr.sort((a, b) => {
        // 找到商品在purGoodsArr中的索引
        var indexA = this.data.purGoodsArr.findIndex(item => item.nxDistributerPurchaseGoodsId === a.nxDistributerPurchaseGoodsId);
        var indexB = this.data.purGoodsArr.findIndex(item => item.nxDistributerPurchaseGoodsId === b.nxDistributerPurchaseGoodsId);
        return indexA - indexB; // 按照页面顺序排序
      });
      
      // 确保数据使用精简字段格式（数据已经是简化版，但确保字段名正确）
      // 如果数据中还有旧的嵌套字段，需要转换为精简格式
      var simplifiedArr = sortedPrintArr.map(item => {
        // 如果数据已经是简化格式（有 orders 字段），直接返回
        if (item.orders !== undefined) {
          return item;
        }
        // 如果还是旧格式（有 nxDepartmentOrdersEntities），转换为新格式
        if (item.nxDepartmentOrdersEntities !== undefined) {
          var simplified = Object.assign({}, item);
          simplified.orders = item.nxDepartmentOrdersEntities;
          delete simplified.nxDepartmentOrdersEntities;
          // 如果还有嵌套的 nxDistributerGoodsEntity，需要扁平化
          if (item.nxDistributerGoodsEntity) {
            var goodsEntity = item.nxDistributerGoodsEntity;
            simplified.nxDgGoodsName = goodsEntity.nxDgGoodsName;
            simplified.nxDgGoodsStandardname = goodsEntity.nxDgGoodsStandardname;
            simplified.nxDgGoodsStandardWeight = goodsEntity.nxDgGoodsStandardWeight;
            simplified.nxDgCartonUnit = goodsEntity.nxDgCartonUnit;
            simplified.nxDgGoodsBrand = goodsEntity.nxDgGoodsBrand;
            simplified.nxDgDfgGoodsGrandId = goodsEntity.nxDgDfgGoodsGrandId;
            simplified.nxDgPurchaseAuto = goodsEntity.nxDgPurchaseAuto;
            delete simplified.nxDistributerGoodsEntity;
          }
          return simplified;
        }
        return item;
      });
      
      wx.setStorageSync('toOrderWx', true);
      wx.setStorageSync('selArr', simplifiedArr);
      
      // 传递统一参数（新参数）
      wx.setStorageSync('printPageType', 'purchase');
      wx.setStorageSync('printViewMode', this.data.viewMode);
      wx.setStorageSync('printUseSimpleFields', this.data.viewMode === 'category');
      
      // 传递显示模式和部门ID信息，供 orderList 页面使用
      if (this.data.viewMode === 'department' && this.data.selectedDepId) {
        // 新参数
        var selectedDep = this.data.depArr.find(dep => dep.depId === this.data.selectedDepId);
        if (selectedDep) {
          wx.setStorageSync('printCustomerName', selectedDep.nxDepartmentOrderCode || selectedDep.depOrderCode || '');
          wx.setStorageSync('purchaseSelectedDepName', selectedDep.nxDepartmentOrderCode || selectedDep.depOrderCode || '');
        }
        // 兼容旧参数
        wx.setStorageSync('purchaseViewMode', 'department');
        wx.setStorageSync('purchaseSelectedDepId', this.data.selectedDepId);
      } else {
        // 新参数
        wx.setStorageSync('printCustomerName', '');
        // 兼容旧参数
        wx.setStorageSync('purchaseViewMode', 'category');
        wx.removeStorageSync('purchaseSelectedDepId');
        wx.removeStorageSync('purchaseSelectedDepName');
      }
      
      this.setData({
        selectedArr: [],
        selectedPrintArr: [],
      })
      wx.navigateTo({
        url: '../../../subPackage/pages/prepare/orderList/orderList',
      })
    },
   
    _getSelectedArrPurData(){
      var arr = this.data.selectedArr || [];
      var temp = [];
      for(var i = 0; i < arr.length; i++){
         temp.push(arr[i].item);
      }
      return temp;
    },



    // saveBatchOrder(e) {
    //   var arr = this._getSelectedArrPurData();
    //   var batch = {
    //     nxDpbDistributerId: this.data.disId,
    //     nxDPGEntities: arr,
    //     nxDPBPurUserId: this.data.userInfo.nxDistributerUserId,
    //     nxDpbPurchaseType: 3,
    //   }
      
    //   // 如果是按客户模式，添加部门ID
    //   if (this.data.viewMode === 'department' && this.data.selectedDepId) {
    //     batch.nxDpbNxDepartmentFatherId = this.data.selectedDepId;
    //   }
      
    //   wx.setStorageSync('batch', batch); 
    //   wx.navigateTo({
    //     url: '/subPackage/pages/offerNx/offerNxDisOrder/offerNxDisOrder?disId=' + this.data.disId,
    //   }) 
    
    // },

  

    saveBatchOrder(e) {
      var arr = this._getSelectedArrPurData();
      var batch = {
        nxDpbDistributerId: this.data.disId,
        nxDPGEntities: arr,
        nxDpbPurUserId: this.data.userInfo.nxDistributerUserId,
        nxDpbPurchaseType: 3,
      }
      
      // 如果是按客户模式，添加部门ID
      if (this.data.viewMode === 'department' && this.data.selectedDepId) {
        batch.nxDpbNxDepartmentFatherId = this.data.selectedDepId;
      }
      
      wx.setStorageSync('toOrderWx', true);
      load.showLoading("保存订货");
      
      // 根据显示模式选择不同的接口
      const saveApi = this.data.viewMode === 'department' ? saveDisPurGoodsBatchByDep : saveDisPurGoodsBatch;
      
      saveApi(batch).then(res => {
        load.hideLoading();
        var that = this;
        if (res.result.code == 0) {
          that.setData({
            selectedArr: []
          })

          wx.navigateToMiniProgram({
            appId: 'wx1ea78d3f33234284',
            path: '/pkgPurchase/pages/txs/prepareBatch/prepareBatch?batchId=' + encodeURIComponent(res.result.data) +
              '&retName=' + encodeURIComponent((that.data.disInfo && that.data.disInfo.nxDistributerName) || '') +
              '&disId=' + encodeURIComponent(that.data.disId) +
              '&purUserId=' + encodeURIComponent(that.data.userInfo.nxDistributerUserId) +
              '&fromBuyer=1&fromBoss=1&sourceEnv=boss',
            envVersion: 'trial',
            success(res) {
              
            },
            fail(err) {
              console.error('打开精彩订货失败，采购批次已保留:', err);
              wx.showToast({
                title: '批次已保存，请稍后重试分享',
                icon: 'none'
              });
            },
          })


          } else {
            wx.showToast({
              title: res.result.msg,
              icon: 'none'
            })
          }
        })
    },

    // 点击批次中的供货方入口，打开精彩订货批次详情。
    toShareBatch(e) {
      var id = e.currentTarget.dataset.id;
      var retName = (this.data.disInfo && this.data.disInfo.nxDistributerName) || '';
      var purUserId = this.data.userInfo && this.data.userInfo.nxDistributerUserId;
      console.log("toShareBatch batchId=" + id + "&retName=" + retName + "&disId=" + this.data.disId + "&purUserId=" + purUserId + "&fromBuyer=1&fromBoss=1")
      wx.navigateToMiniProgram({
        appId: 'wx1ea78d3f33234284',
        path: '/pkgPurchase/pages/txs/disOrderBatch/disOrderBatch?batchId=' + encodeURIComponent(id) +
          '&retName=' + encodeURIComponent(retName) +
          '&disId=' + encodeURIComponent(this.data.disId) +
          '&purUserId=' + encodeURIComponent(purUserId) +
          '&fromBuyer=1&fromBoss=1&sourceEnv=boss',
        envVersion: 'trial',
        success(res) {

        },
        fail(err) {
          console.error('打开精彩订货批次详情失败:', err);
          wx.showToast({
            title: '暂时无法打开精彩订货',
            icon: 'none'
          });
        },
      })
    },

    // 供货商已经回复数量和价格后，由老板确认本次订货完成。
    showFinish(e) {
      var batch = e.currentTarget.dataset.item;
      if (!batch || batch.nxDpbStatus != 1) {
        wx.showToast({ title: '订单状态已变化，请刷新', icon: 'none' });
        return;
      }
      wx.showModal({
        title: '确认收货',
        content: '确认供货商填写的数量、单价和总额无误，并完成本次订货吗？',
        confirmText: '确认完成',
        success: (modalRes) => {
          if (!modalRes.confirm) return;
          load.showLoading('确认订货');
          disFinishPurchaseBatch(batch).then(res => {
            load.hideLoading();
            if (res.result.code == 0) {
              wx.showToast({ title: '订货已完成', icon: 'success' });
              this._getPurchasingBatch();
            } else {
              wx.showToast({ title: res.result.msg || '确认失败', icon: 'none' });
              this._getPurchasingBatch();
            }
          }).catch(err => {
            load.hideLoading();
            console.error('确认订货失败:', err);
          });
        }
      });
    },




    /**
     * showOperationCar
     */
    deleteOrderGoods(e) {
      var selArr = this.data.selectedArr;
      var selPrintArr = this.data.selectedPrintArr;
      var item = this.data.selectedArr[e.currentTarget.dataset.index];
      var index = item.goodsIndex;
      var goodsData = "purGoodsArr[" + index + "].isSelected";
      this.setData({
        [goodsData]: false
      })
      var arr = this.data.purGoodsArr[index].orders;
      if (arr && Array.isArray(arr)) {
        for (var i = 0; i < arr.length; i++) {
          var orderChoicedData = "purGoodsArr[" + index + "].orders[" + i + "].hasChoice";
          this.setData({
            [orderChoicedData]: false
          })
        }
      }
      var purId = e.currentTarget.dataset.id;
      var choiceStockArr = selArr.filter(item => item.purGoodsId !== purId);
      var choicePrintArr = selPrintArr.filter(item => item.nxDistributerPurchaseGoodsId !== purId);
      this.setData({
        selectedArr: choiceStockArr,
        selectedPrintArr: choicePrintArr
      })
      if (choiceStockArr.length == 0) {
      
        this.setData({
          showOperationCar: false,
        })
      }
    },

    hideButton() {
      this.animation.translateY(100).step();
      this.setData({
        buttonAnimation: this.animation.export(),
      });
    },

    onPullDownRefresh() {
      this.setData({
        selectedArr: [],
        selectedPrintArr: [],
        isAllDepartmentSelected: false,
        currentPage: 1,
        totalPage: 0,
        totalCount: 0,
        hasMore: true,
        isLoading: false,
        purGoodsArr: [],
        purCataArr: [],
        depArr: [],
        selectedDepId: null,
        selectedSubWx: 0,
        toViewWx: '',
        scrollTopLeftWx: 0,
        categoryPositions: [],
        scrollTimer: null,
        isLoadingMoreForCategory: false,
        refresherTriggered: false
      })
      this._initData()
      wx.stopPullDownRefresh()
    },

    onRefresh() {
      this.setData({
        refresherTriggered: true
      });
      
      // 清空选择的数据
      this.setData({
        selectedArr: [],
        selectedPrintArr: [],
        isAllDepartmentSelected: false,
      });
      
      // 重置分页数据
      this.setData({
        currentPage: 1,
        totalPage: 0,
        totalCount: 0,
        hasMore: true,
        isLoading: false,
        purGoodsArr: [],
        purCataArr: [],
        depArr: [],
        selectedDepId: null,
        selectedSubWx: 0,
        toViewWx: '',
        scrollTopLeftWx: 0,
        categoryPositions: [],
        scrollTimer: null,
        isLoadingMoreForCategory: false,
      });
      
      // 重新初始化数据
      this._initData();
      
      // 延迟关闭刷新状态
      setTimeout(() => {
        this.setData({
          refresherTriggered: false
        });
      }, 1000);
      
      // 重新获取数据
      this._initData();
      
      // 延迟关闭刷新状态
      setTimeout(() => {
        this.setData({
          refresherTriggered: false
        });
        console.log('=== 第一个swiper-item下拉刷新完成 ===');
      }, 1000);
    },

    

     // 打印采购单
     toPrint() {
       // 检查是否有选中的商品
       const selectedArr = this.data.selectedArr;
       if (!selectedArr || selectedArr.length === 0) {
         wx.showToast({
           title: '请先选择要打印的商品',
           icon: 'none'
         });
         return;
       }
       
       // 按照页面数据顺序排序选中的商品
       var sortedPrintArr = this.data.selectedPrintArr.sort((a, b) => {
         // 找到商品在purGoodsArr中的索引
         var indexA = this.data.purGoodsArr.findIndex(item => item.nxDistributerPurchaseGoodsId === a.nxDistributerPurchaseGoodsId);
         var indexB = this.data.purGoodsArr.findIndex(item => item.nxDistributerPurchaseGoodsId === b.nxDistributerPurchaseGoodsId);
         return indexA - indexB; // 按照页面顺序排序
       });
       
       // 设置打印标识和商品数据
       wx.setStorageSync('toPrintWx', true);
       wx.setStorageSync('selArr', sortedPrintArr);
       
       // 传递页面类型和显示模式，用于区分4种打印情况
       // pageType: 'stock' 出库页面, 'purchase' 采购页面
       // viewMode: 'category' 按商品显示, 'department' 按部门显示
       wx.setStorageSync('printPageType', 'purchase');
       wx.setStorageSync('printViewMode', this.data.viewMode);
       
       // 如果是按部门显示，传递部门信息
       if (this.data.viewMode === 'department' && this.data.selectedDepId) {
         var selectedDep = this.data.depArr.find(dep => dep.depId === this.data.selectedDepId);
         if (selectedDep) {
           wx.setStorageSync('printCustomerName', selectedDep.nxDepartmentOrderCode || selectedDep.depOrderCode || '');
         }
       }
       
       // 按商品显示时使用新精简字段，按部门显示时使用完整字段
       wx.setStorageSync('printUseSimpleFields', this.data.viewMode === 'category');
       
       this.setData({
         selectedArr: [],
         selectedPrintArr: [],
         hasMore: true,
       })
       
       // 跳转到orderList页面
       wx.navigateTo({
         url: '../../../subPackage/pages/prepare/orderList/orderList',
       })
     },
    
    onNavButtonTap() {
      this.setData({
        selectedArr: [],
        selectedPrintArr: [],
      })
      wx.navigateTo({
        url: '../../../subPackage/pages/management/homePage/homePage',
      })
     },




  // 2，选择出库商品中的订单
  choiceOrders(e) {
    console.log('\n=== choiceOrders 开始 ===');
    var fatherIndex = e.currentTarget.dataset.fatherindex;
    var goodsIndex = e.currentTarget.dataset.index;
    var orderIndex = e.currentTarget.dataset.orderindex;
    console.log('🎯 商品索引:', goodsIndex);
    console.log('🎯 订单索引:', orderIndex);
    
    var choice = this.data.purGoodsArr[fatherIndex].orders[orderIndex].hasChoice;
    console.log('📊 商品是否已选中 (hasChoice):', choice);
    
    if(choice){
      console.log('✅ 商品已选中，可以操作订单');
      var order = this.data.goodsArr[goodsIndex].nxDepartmentOrdersEntities[orderIndex];
      console.log('📊 订单对象:', order);
      console.log('📊 订单ID:', order?.nxDepartmentOrdersId);
      
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



  onTab1ClickSub: function (e) {
    var that = this;
    if (this.data.innerCurrent === e.currentTarget.dataset.current) {
      return false;
    } else {
      that.setData({
        innerCurrent: e.currentTarget.dataset.current,
        currentTabOrder: e.currentTarget.dataset.current
      })
    }
  },




  // Event handler for inner swiper change
  onInnerSwiperChange(e) {
    this.setData({
      innerCurrent: e.detail.current,
    });
    var that = this;
    that.setData({
      innerCurrent: e.detail.current,    
      // 重置下拉刷新状态
      refresherTriggered1: false,
      refresherTriggered2: false,

    });
  
    if (that.data.innerCurrent == 0) {
      this._initData();
    }else{
     
      this._getPurchasingBatch()
    }
   
   
    
  },


  _getPurchasingBatch() {
    load.showLoading("获取进货商铺");
    var data = {
      disId: this.data.disId,
      type: 1
    }
     var that = this;
    disGetPurchasingBatch(data)
      .then(res => {
        load.hideLoading();
        console.log(res.result.data)
        if (res.result.code == 0) {
          // 为每个批次添加展开状态字段
          this.setData({
            batchArr: res.result.data.arr,
          })
          
          that.getTabBar().setData({
            stockCount: res.result.data.stockCount,
            puringCount: res.result.data.puringCount,
            collCount: res.result.data.collCount,
          })
          this.setData({
            'tabs_wx[0].amount': res.result.data.unPurCount,
            'tabs_wx[1].amount': res.result.data.havePurCount,
          })
         
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          });
        }
      })
  },


  cancelDisBatchItem(e) {
    // 显示删除确认弹窗
    const goodsId = e.currentTarget.dataset.id;
    const goodsName = e.currentTarget.dataset.name || '该商品';
    this.setData({
      showDeleteConfirmModal: true,
      deleteGoodsId: goodsId,
      deleteGoodsName: goodsName
    });
  },

    // 确认删除商品
    confirmDeleteBatchItem() {
      if (!this.data.deleteGoodsId) {
        return;
      }
      
      load.showLoading("删除中");
      deleteDisPurBatchItem(this.data.deleteGoodsId)
        .then(res => {
          load.hideLoading();
          if (res.result.code == 0) {
            // 关闭确认弹窗
            this.setData({
              showDeleteConfirmModal: false,
              deleteGoodsId: null,
              deleteGoodsName: ''
            });
            
            // 重新加载数据
            this._getPurchasingBatch();
          } else {
            wx.showToast({
              title: res.result.msg || '删除失败',
              icon: 'none'
            });
          }
        })
        
    },

    // 取消删除
    cancelDeleteBatchItem() {
      this.setData({
        showDeleteConfirmModal: false,
        deleteGoodsId: null,
        deleteGoodsName: ''
      });
    },
     



    // 再次复制功能
    pasteAgain(e) {
      const batch = e.currentTarget.dataset.batch;
      console.log('再次复制批次:', batch);
      
      if (batch && batch.nxDpbPasteContent) {
        // 复制到剪贴板
        wx.setClipboardData({
          data: batch.nxDpbPasteContent,
          success(res) {
            wx.showToast({
              title: '复制成功',
              icon: 'success',
              duration: 2000
            });
          },
          fail(err) {
            console.error('复制失败:', err);
            wx.showToast({
              title: '复制失败，请重试',
              icon: 'none',
              duration: 2000
            });
          }
        });
      } else {
        wx.showToast({
          title: '没有可复制的内容',
          icon: 'none',
          duration: 2000
        });
      }
    },


          updatePasteBatchContent(e){
       // 获取批次ID和索引
       const batchId = e.currentTarget.dataset.batchId;
       const batchIndex = e.currentTarget.dataset.batchIndex;
       if (!batchId) {
         wx.showToast({
           title: '批次ID不存在',
           icon: 'none'
         });
         return;
       }
       
       // 从batchArr中获取批次数据
       const batchArr = this.data.batchArr;
       if (!batchArr || batchIndex >= batchArr.length) {
         wx.showToast({
           title: '批次数据不存在',
           icon: 'none'
         });
         return;
       }
       
       const batch = batchArr[batchIndex];
       
       if (!batch || batch.nxDistributerPurchaseBatchId != batchId) {
         wx.showToast({
           title: '批次数据不匹配',
           icon: 'none'
         });
         return;
       }
       
       // 从缓存读取 onlyGoodsNameAndTotal 设置
       var onlyGoodsNameAndTotal = wx.getStorageSync('onlyGoodsNameAndTotal');
       if (onlyGoodsNameAndTotal === undefined || onlyGoodsNameAndTotal === null || onlyGoodsNameAndTotal === '') {
         onlyGoodsNameAndTotal = false;
       }
       
       // 生成复制内容
       let content = this._generatePasteContentFromBatch(batch, onlyGoodsNameAndTotal);
       
       // 显示确认弹窗
       this.setData({
         showConfirmModal: true,
         pasteContent: content,
         tempBatch: batch, // 临时保存批次数据
         onlyGoodsNameAndTotal: onlyGoodsNameAndTotal
       });
     },

     // 切换是否只复制商品名称和采购总数
     changeShowOrder(e) {
       const value = e.detail.value;
       this.setData({
         onlyGoodsNameAndTotal: value
       });
       // 保存到缓存
       wx.setStorageSync('onlyGoodsNameAndTotal', value);
       // 重新生成预览内容
       if (this.data.tempBatch) {
         let content = this._generatePasteContentFromBatch(this.data.tempBatch, value);
         this.setData({
           pasteContent: content
         });
       }
     },

     // 关闭确认弹窗
     closeConfirmModal() {
       this.setData({
         showConfirmModal: false,
         pasteContent: '',
         tempBatch: null
       });
     },

     // 阻止事件冒泡
     stopPropagation() {
       // 空函数，用于阻止事件冒泡
     },

     // 阻止滚动穿透
     preventScroll() {
       // 空函数，用于阻止滚动穿透
       return false;
     },

     // 确认更新复制内容
     confirmUpdatePasteContent() {
       const batch = this.data.tempBatch;
       const pasteContent = this.data.pasteContent; // 保存复制内容
       console.log('确认更新时的批次数据:', batch);
       console.log('准备复制的原始内容:', pasteContent);
       
       if (!batch) {
         wx.showToast({
           title: '批次数据不存在',
           icon: 'none'
         });
         return;
       }
       
       // 尝试不同的批次ID字段
       let batchId = batch.nxDistributerPurchaseBatchId || batch.id || batch.batchId;
       console.log('使用的批次ID:', batchId);
       
       if (!batchId) {
         wx.showToast({
           title: '批次ID不存在',
           icon: 'none'
         });
         return;
       }
       
       var data = {
         content: pasteContent,
         batchId: batchId
       }
       
       console.log('发送的数据:', data);
       load.showLoading("更新中");
       updatePasteBatch(data).then(res =>{
         load.hideLoading();
         if(res.result.code == 0){
           this.setData({
             showConfirmModal: false,
             pasteContent: '',
             tempBatch: null
           });
           
           // 复制内容到剪贴板
           console.log('准备复制的内容:', pasteContent);
           console.log('内容长度:', pasteContent ? pasteContent.length : 0);
           
           wx.setClipboardData({
             data: pasteContent,
             success: () => {
               console.log('复制成功');
               wx.showToast({
                 title: '更新成功，已复制到剪贴板',
                 icon: 'success',
                 duration: 2000
               });
             },
             fail: (err) => {
               console.log('复制失败:', err);
               wx.showToast({
                 title: '更新成功，复制失败',
                 icon: 'none',
                 duration: 2000
               });
             }
           });
           
           this._getPasteBatch();
         } else {
           wx.showToast({
             title: res.result.msg,
             icon: 'none'
           });
         }
       }).catch(err => {
         load.hideLoading();
         console.error('更新失败:', err);
         wx.showToast({
           title: '更新失败，请重试',
           icon: 'none'
         });
       })
     },

     // 生成复制内容的方法
     _generatePasteContent() {
       let content = "";
       const batch = this.data.batch;
       
       if (batch && batch.nxDPGEntities && batch.nxDPGEntities.length > 0) {
         for (let i = 0; i < batch.nxDPGEntities.length; i++) {
           const item = batch.nxDPGEntities[i];
           if (item.nxDpgQuantity && item.nxDpgQuantity > 0) {
             const goodsName = item.nxDistributerGoodsEntity.nxDgGoodsName;
             const quantity = item.nxDpgQuantity;
             const standard = item.nxDpgStandard || item.nxDistributerGoodsEntity.nxDgGoodsStandardname;
             content += `${i + 1}, ${goodsName} ${quantity}${standard}\n`;
           }
         }
       }
       
       console.log('生成的复制内容:', content);
       return content;
     },

     // 从批次数据生成复制内容的方法
     _generatePasteContentFromBatch(batch, onlyGoodsNameAndTotal = false) {
       let content = "";
       
       // 如果有部门名称，在复制内容前面加上部门名称
       if (batch && batch.nxDpbNxDepartmentName) {
         content += `${batch.nxDpbNxDepartmentName}\n`;
       }
       
       if (batch && batch.nxDPGEntities && batch.nxDPGEntities.length > 0) {
         for (let i = 0; i < batch.nxDPGEntities.length; i++) {
           const item = batch.nxDPGEntities[i];
           const goodsName = item.nxDistributerGoodsEntity && item.nxDistributerGoodsEntity.nxDgGoodsName;
           if (!goodsName) {
             continue;
           }
           
           // 获取订单列表
           const orders = item.nxDistributerGoodsEntity && item.nxDistributerGoodsEntity.nxDepartmentOrdersEntities;
           
           // 如果没有订单，跳过
           if (!orders || orders.length === 0) {
             continue;
           }
           
           // 使用采购数量（如果有），否则不显示总数量
           const quantity = item.nxDpgQuantity;
           const goodsStandard = item.nxDpgStandard || (item.nxDistributerGoodsEntity && item.nxDistributerGoodsEntity.nxDgGoodsStandardname) || '';
           
           // 如果只显示商品名称和总数，且有采购数量，则输出
           if (onlyGoodsNameAndTotal) {
             if (quantity && quantity !== null && quantity !== undefined && quantity !== '') {
               content += `${i + 1}, ${goodsName} ${quantity}${goodsStandard || ''}\n`;
             } else {
               // 没有采购数量，只显示商品名称
               content += `${i + 1}, ${goodsName}\n`;
             }
           } else {
             // 显示商品和订单详情
             // 如果有采购数量，先输出商品信息
             if (quantity && quantity !== null && quantity !== undefined && quantity !== '') {
               content += `${i + 1}, ${goodsName} ${quantity}${goodsStandard || ''}\n`;
             } else {
               // 没有采购数量，只输出商品名称
               content += `${i + 1}, ${goodsName}\n`;
             }
             
            // 输出订单详情
            for (let j = 0; j < orders.length; j++) {
              const order = orders[j];
              // 获取部门名称
              let depName = '';
              // 协作订单：优先使用 [协作商名称]fatherDepartmentOrderCode（不含空格）
              const collabId = order.nxDoRequestDisId;
              const isCollaborative = collabId !== undefined && collabId !== null && collabId !== -1 && String(collabId) !== '-1';
              if (isCollaborative) {
                depName = '[' + (order.nxDoRequestDistributerName || '') + ']';
                const fatherCode = order.fatherDepartmentOrderCode || (order.nxDepartmentEntity && order.nxDepartmentEntity.fatherDepartmentEntity ? order.nxDepartmentEntity.fatherDepartmentEntity.nxDepartmentOrderCode : null);
                if (fatherCode) {
                  depName += fatherCode;
                }
              } else if (order.gbDepartmentEntity) {
                 if (order.gbDepartmentEntity.fatherGbDepartmentEntity) {
                   depName = `${order.gbDepartmentEntity.fatherGbDepartmentEntity.gbDepartmentName}.${order.gbDepartmentEntity.gbDepartmentName}`;
                 } else {
                   depName = order.gbDepartmentEntity.gbDepartmentName;
                 }
               } else if (order.nxDepartmentEntity) {
                 if (order.nxDepartmentEntity.fatherDepartmentEntity) {
                   depName = `${order.nxDepartmentEntity.fatherDepartmentEntity.nxDepartmentAttrName}.${order.nxDepartmentEntity.nxDepartmentName}`;
                 } else {
                   depName = order.nxDepartmentEntity.nxDepartmentName;
                 }
               }
               
               const orderQuantity = order.nxDoQuantity || '';
               const orderStandard = order.nxDoStandard || '';
               const orderRemark = order.nxDoRemark && order.nxDoRemark !== 'null' && order.nxDoRemark.length > 0 ? order.nxDoRemark : '';
               
               // 输出订单信息：部门名称 数量规格 (备注)
               let orderLine = `   ${depName} ${orderQuantity}${orderStandard}`;
               if (orderRemark) {
                 orderLine += ` (${orderRemark})`;
               }
               content += orderLine + '\n';
             }
           }
         }
       }
       
       return content;
     },
     




    // methods
  },







})

var load = require('../../../lib/load.js');

const tabBarHeight = 50; // 根据实际情况调整
const viewBarHeight = 50;

import apiUrl from '../../../config.js'

import {
 
  disGetTypePrepareOutCata,
  disGetTypePrepareOutDepCata,
  disGetTypePrepareOutDepGoodsPage,
  disGetTypePreparePurGoodsPage,
  saveDisPurGoodsBatch,
  saveDisPurGoodsBatchByDep,
  deletePlanPurchase,
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
    scrollTimer: null, // 滚动防抖定时器
    isLoadingMoreForCategory: false, // 是否为分类加载更多数据
},


  pageLifetimes: {

    show() {
      //tabBar
      if (typeof this.getTabBar === 'function' &&
        this.getTabBar()) {
        this.getTabBar().setData({
          selected: 2
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
  
      const contentHeight = (screenHeight - navBarHeight - tabBarHeight) * rpxRatio;

      this.setData({ 
        contentHeight: contentHeight,
        navBarHeight: navBarHeightRpx,
        tabBarHeight: tabBarHeightRpx,
        viewBarHeight: viewBarHeightRpx,
        leftMenuWidth: 150, // 左侧菜单宽度，单位 rpx
      });

      this.setData({
        windowWidth: globalData.windowWidth * globalData.rpxR,
        windowHeight: globalData.windowHeight * globalData.rpxR,
        statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
        url: apiUrl.server,
        scrollViewTop: 0,
        
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

    closeCar() {
      this.setData({
        showOperationCar: false

      })
    },




    // 计算分类位置（参考 resGoodsLess 的方法）
    calculateCategoryPositions() {
      const query = wx.createSelectorQuery();
      query.selectAll('.goods-category-title').boundingClientRect();
      query.select('.right-content').boundingClientRect();
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
          console.log('🎯 目标部门:', dep.depAttrName);
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
          return res; // 返回结果
        }
      }).catch(err => {
        console.error('❌ 加载数据失败:', err);
        this.setData({
          isLoading: false
        });
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
                unPurCount: res.result.data.unPurCount,
                puringCount: res.result.data.puringCount,
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
                unPurCount: res.result.data.unPurCount,
                puringCount: res.result.data.puringCount,
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
                  newOrderCount: category.newOrderCount || 0
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
      
      // 如果已经是新结构（直接包含 nxDgGoodsName），直接返回
      if (firstItem.nxDgGoodsName && !firstItem.nxDistributerGoodsEntity) {
        console.log('✅ 数据已经是简化版结构，无需转换');
        return goodsList;
      }
      
      // 如果是旧结构（包含 nxDistributerGoodsEntity），进行转换
      if (firstItem.nxDistributerGoodsEntity) {
        console.log('🔄 检测到旧数据结构，开始转换为简化版...');
        return goodsList.map(item => {
          const goodsEntity = item.nxDistributerGoodsEntity || {};
          const orders = item.nxDepartmentOrdersEntities || [];
          
          // 转换订单数据
          const convertedOrders = orders.map(order => {
            const convertedOrder = {
              nxDepartmentOrdersId: order.nxDepartmentOrdersId,
              nxDoQuantity: order.nxDoQuantity,
              nxDoStandard: order.nxDoStandard,
              nxDoWeight: order.nxDoWeight,
              nxDoRemark: order.nxDoRemark,
              nxDoPrintStandard: order.nxDoPrintStandard,
              nxDoDsStandardScale: order.nxDoDsStandardScale,
              hasChoice: order.hasChoice || false,
            };
            
            // 扁平化部门信息
            if (order.nxDepartmentEntity) {
              const dep = order.nxDepartmentEntity;
              convertedOrder.depName = dep.fatherDepartmentEntity 
                ? `${dep.fatherDepartmentEntity.nxDepartmentName}.${dep.nxDepartmentName}`
                : dep.nxDepartmentName;
              convertedOrder.nxDepartmentAttrName = dep.nxDepartmentAttrName;
              convertedOrder.nxDepartmentOrderCode = dep.nxDepartmentOrderCode;
              if (dep.fatherDepartmentEntity) {
                convertedOrder.fatherDepartmentAttrName = dep.fatherDepartmentEntity.nxDepartmentAttrName;
              }
            }
            
            // 扁平化GB部门信息
            if (order.gbDepartmentEntity) {
              const gbDep = order.gbDepartmentEntity;
              convertedOrder.gbDepName = gbDep.fatherGbDepartmentEntity
                ? `${gbDep.fatherGbDepartmentEntity.gbDepartmentName}.${gbDep.gbDepartmentName}`
                : gbDep.gbDepartmentName;
            }
            
            // 扁平化餐厅信息
            if (order.nxRestrauntEntity) {
              convertedOrder.restrauntName = order.nxRestrauntEntity.nxRestrauntAttrName;
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
    deletePlanPurchase(e.currentTarget.dataset.item).then(res => {
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
      // 传递显示模式和部门ID信息，供 orderList 页面使用
      if (this.data.viewMode === 'department' && this.data.selectedDepId) {
        wx.setStorageSync('purchaseViewMode', 'department');
        wx.setStorageSync('purchaseSelectedDepId', this.data.selectedDepId);
        // 保存部门名称，用于复制内容
        var selectedDep = this.data.depArr.find(dep => dep.depId === this.data.selectedDepId);
        if (selectedDep) {
          wx.setStorageSync('purchaseSelectedDepName', selectedDep.depAttrName || selectedDep.depOrderCode || '');
        }
      } else {
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

    saveBatchOrder(e) {
      var arr = this._getSelectedArrPurData();
      var batch = {
        nxDpbDistributerId: this.data.disId,
        nxDPGEntities: arr,
        nxDPBPurUserId: this.data.userInfo.nxDistributerUserId,
        nxDpbPurchaseType: 2,
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
          console.log("batchId=" + res.result.data + "&retName=" + that.data.disInfo.nxDistributerName + "&disId=" + that.data.disId + "&purUserId=" + that.data.userInfo.nxDistributerUserId + '&fromBuyer=1')
          wx.navigateToMiniProgram({
            appId: 'wx1ea78d3f33234284',
            path: 'pages/txs/prepareBatch/prepareBatch?batchId=' + res.result.data + '&retName=' + that.data.disInfo.nxDistributerName + '&disId=' + that.data.disId + '&purUserId=' + that.data.userInfo.nxDistributerUserId + '&fromBuyer=1',
            envVersion: 'trial', //release  develop  trial
            success(res) {
              
            },
            fail() {
              wx.showToast({
                title: '跳转失败',
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

    onRefresh() {
      this.setData({
        refresherTriggered: true
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
       this.setData({
         selectedArr: [],
         selectedPrintArr: [],
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
     

    // methods
  },






})
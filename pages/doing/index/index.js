var load = require('../../../lib/load.js');
var tabBar = require('../../../lib/routeDispatchTabBar.js');
let scrollDdirection = 0; // 用来计算滚动的方向

const tabBarHeight = 50; // 根据实际情况调整
const viewBarHeight = 50;

import apiUrl from '../../../config.js'

import {
  disGetCollReplyOutPage,
  disGetCollNxPrepareOutCata,
  disGetTypePrepareOutDepCata,
  disGetCollPrepareOutPage,

  disGetTypePrepareOutByDep,
} from '../../../lib/apiDepOrder'

Component({


  data:{
 
   
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
          selected: tabBar.getTabIndex('pages/doing/index/index')
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
  
      const contentHeight = (screenHeight - navBarHeight - tabBarHeight - viewBarHeight) * rpxRatio;
      const viewMode = wx.getStorageSync('collViewMode') || 'category';

      this.setData({ 
        contentHeight: contentHeight,
        navBarHeight: navBarHeightRpx,
        tabBarHeight: tabBarHeightRpx,
        viewBarHeight: viewBarHeightRpx,
        leftMenuWidth: 150, // 左侧菜单宽度，单位 rpx
        windowWidth: globalData.windowWidth * globalData.rpxR,
        windowHeight: globalData.windowHeight * globalData.rpxR,
        statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
        url: apiUrl.server,
        viewMode: viewMode,
        tabs_wx:[
          { name: "未出货", amount: "" },
          { name: "已出货", amount: "" }
        ],
        innerCurrent: 0,
        currentPage: 1,
        limit: 15,
        totalPage: 0,
        totalCount: 0,
        hasMore: true,  // 是否还有更多数据
        isLoading: false, // 是否正在加载
        scrollTimer: null, // 滚动防抖定时器
        choiceStockArr: [], // 选中的出库商品数组
      });

     
      

      var value = wx.getStorageSync('userInfo');
      if (value) {
        this.setData({
          userInfo: value,
          disId: value.nxDistributerEntity.nxDistributerId,
          deviceId: value.nxDiuPrintDeviceId
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

    // swiper-item-1 茭白，红尖椒，荷兰豆 
    _initData() {
      load.showLoading("获取数据中");
      var data = {
        orderDisId: this.data.disId,
        
      }
      
      // 根据显示模式调用不同接口
      if (this.data.viewMode === 'category') {
        // 按类别模式：获取商品分类列表
        return disGetCollNxPrepareOutCata(data)
          .then(res => {
            console.log(res.result.data);
            if (res.result.code == 0) {
              load.hideLoading();
              console.log("分类数据aaa:", res.result.data);
               
              this.getTabBar().setData({
                stockCount: res.result.data.stockCount,
                collCount: res.result.data.collCount,
                puringCount: res.result.data.puringCount,
              })

              this.setData({
                'tabs_wx[0].amount': res.result.data.unPickCount,
                'tabs_wx[1].amount': res.result.data.havePickCount,
              })
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
      
      disGetCollPrepareOutPage(data).then(res =>{
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
                console.log('   请检查后台接口 disGetCollPrepareOutPage 的排序逻辑。');
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
                console.log("第一个订单是否包含 nxDoNxCommRestrauntId:", !!firstOrder.nxDoNxCommRestrauntId);
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
              const processedNewItems = res.result.page.list.map(goods => {
                if (goods.nxDepartmentOrdersEntities && Array.isArray(goods.nxDepartmentOrdersEntities)) {
                  goods.nxDepartmentOrdersEntities = goods.nxDepartmentOrdersEntities.map(order => {
                    if (order.purSelected === undefined || order.purSelected === null) {
                      order.purSelected = false;
                    }
                    return order;
                  });
                }
                // 确保商品有 isSelected 字段
                if (goods.isSelected === undefined || goods.isSelected === null) {
                  goods.isSelected = false;
                }
                return goods;
              });
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
              const goodsList = res.result.page.list.map(goods => {
                if (goods.nxDepartmentOrdersEntities && Array.isArray(goods.nxDepartmentOrdersEntities)) {
                  goods.nxDepartmentOrdersEntities = goods.nxDepartmentOrdersEntities.map(order => {
                    if (order.purSelected === undefined || order.purSelected === null) {
                      order.purSelected = false;
                    }
                    return order;
                  });
                }
                // 确保商品有 isSelected 字段
                if (goods.isSelected === undefined || goods.isSelected === null) {
                  goods.isSelected = false;
                }
                return goods;
              });
              
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
            choiceStockArr: [],
            isAllDepartmentSelected: false
          });
          
          // 加载该部门的商品
          this._loadDepartmentGoods(dep.depId, index);
        } else {
          console.log('❌ depArr索引不存在:', index);
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
        
        disGetCollPrepareOutPage(data).then(res => {
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
            // 确保每个订单都有 purSelected 字段（如果接口没有返回，则初始化为 false）
            const processedList = res.result.page.list.map(goods => {
              if (goods.nxDepartmentOrdersEntities && Array.isArray(goods.nxDepartmentOrdersEntities)) {
                goods.nxDepartmentOrdersEntities = goods.nxDepartmentOrdersEntities.map(order => {
                  if (order.purSelected === undefined || order.purSelected === null) {
                    order.purSelected = false;
                  }
                  return order;
                });
              }
              // 确保商品有 isSelected 字段
              if (goods.isSelected === undefined || goods.isSelected === null) {
                goods.isSelected = false;
              }
              return goods;
            });
            
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
      disGetCollPrepareOutPage(data).then(res => {
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
          // 确保每个订单都有 purSelected 字段（如果接口没有返回，则初始化为 false）
          const processedList = res.result.page.list.map(goods => {
            if (goods.nxDepartmentOrdersEntities && Array.isArray(goods.nxDepartmentOrdersEntities)) {
              goods.nxDepartmentOrdersEntities = goods.nxDepartmentOrdersEntities.map(order => {
                if (order.purSelected === undefined || order.purSelected === null) {
                  order.purSelected = false;
                }
                return order;
              });
            }
            // 确保商品有 isSelected 字段
            if (goods.isSelected === undefined || goods.isSelected === null) {
              goods.isSelected = false;
            }
            return goods;
          });
          
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
            choiceStockArr: [],
            isAllDepartmentSelected: false
          });
          
          // 加载该部门的商品
          this._loadDepartmentGoods(dep.depId, index);
        } else {
          console.log('❌ depArr索引不存在:', index);
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
        
        disGetCollPrepareOutPage(data).then(res => {
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
            // 确保每个订单都有 purSelected 字段（如果接口没有返回，则初始化为 false）
            const processedList = res.result.page.list.map(goods => {
              if (goods.nxDepartmentOrdersEntities && Array.isArray(goods.nxDepartmentOrdersEntities)) {
                goods.nxDepartmentOrdersEntities = goods.nxDepartmentOrdersEntities.map(order => {
                  if (order.purSelected === undefined || order.purSelected === null) {
                    order.purSelected = false;
                  }
                  return order;
                });
              }
              // 确保商品有 isSelected 字段
              if (goods.isSelected === undefined || goods.isSelected === null) {
                goods.isSelected = false;
              }
              return goods;
            });
            
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
      disGetCollPrepareOutPage(data).then(res => {
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
          // 确保每个订单都有 purSelected 字段（如果接口没有返回，则初始化为 false）
          const processedList = res.result.page.list.map(goods => {
            if (goods.nxDepartmentOrdersEntities && Array.isArray(goods.nxDepartmentOrdersEntities)) {
              goods.nxDepartmentOrdersEntities = goods.nxDepartmentOrdersEntities.map(order => {
                if (order.purSelected === undefined || order.purSelected === null) {
                  order.purSelected = false;
                }
                return order;
              });
            }
            // 确保商品有 isSelected 字段
            if (goods.isSelected === undefined || goods.isSelected === null) {
              goods.isSelected = false;
            }
            return goods;
          });
          
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
      console.log('下拉刷新');
      
      // 重置分页数据，并清空选择数组
      this.setData({
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
        choiceStockArr: [], // 清空选择数组
        isAllDepartmentSelected: false, // 重置全选状态
      });
      
      // 重新初始化数据
      this._initData();
      
      // 停止下拉刷新动画
      wx.stopPullDownRefresh();
    },


   
    onTab1ClickSub: function (e) {
      console.log("onInnerSwiperChange")

      var that = this;
      if (this.data.innerCurrent === e.currentTarget.dataset.current) {
        return false;
      } else {
        that.setData({
          innerCurrent: e.currentTarget.dataset.current,
        })
      }
      console.log("onInnerSwiperChange", this.data.innerCurrent)

    },

    // Event handler for inner swiper change
    onInnerSwiperChange(e) {
      console.log("onInnerSwiperChange")
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
         this._initData()
      }else{
        this._getReplyOrder();
      }
     
      
    },


    _getReplyOrder(){
      const data = {
        disId: this.data.disId,
        page: this.data.currentPage,
        limit: this.data.limit,
      };
      
      console.log(`📤 请求参数:`, data);
      load.showLoading("获取已出货商品");
      disGetCollReplyOutPage(data).then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          console.log("rees", res.result);
          this.setData({
            list: res.result.page.list,
          })
          
      }
    })
    }

    // methods
  },






})
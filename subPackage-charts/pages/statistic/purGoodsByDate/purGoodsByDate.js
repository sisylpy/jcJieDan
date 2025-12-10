var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
var dateUtils = require('../../../../utils/dateUtil');

import apiUrl from '../../../../config.js'

import {
  disGetPurchaseStatistics,
  disGetPurchaseGoodsList
} from '../../../../lib/apiDepOrder.js'


Page({


  onShow() {
    // 计算页面高度
    let windowInfo = wx.getWindowInfo();
    let globalData = getApp().globalData;
    const totalHeight = windowInfo.windowHeight * globalData.rpxR;
    const navBarHeight = globalData.navBarHeight * globalData.rpxR;
    const topAreaHeight = 100; // 200rpx为顶部区域、搜索区域、筛选区域和间距的预估高度
    const scrollViewHeight = totalHeight - navBarHeight - topAreaHeight;
    
    // 初始化滚动状态
    this.setData({
      isScrolled: false,
      scrollTop: 0,
      scrollViewHeight: scrollViewHeight
    });

    if (this.data.update) {
      // 重置分页状态和清空列表
      this.setData({
        currentPage: 1,
        totalPage: 0,
        totalCount: 0,
        arr: [],
        update: false, // 重置 update 标志，避免重复刷新
      });
      
      // 使用新的日期重新获取数据
      this._getPurUserStatistics();
    }

  },

  onHide() {
    // 页面隐藏时保存滚动状态到本地存储
  },

  /**
   * 页面的初始数据
   */
  data: {

    type: "goods",
    totalPage: 0,
    totalCount: 0,
    limit: 10,
    currentPage: 1,
    update: false,
    hanzi: '',
    // 滚动状态管理
    isScrolled: false,
    scrollTop: 0,
    scrollThreshold: 200, // 滚动阈值，超过200rpx时触发收缩
  
    purchaseType: -1, // NX系统：-1=全部, 0=自采, 1=订货
    arr: [], // 商品列表
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      greatId: options.id || -1,
      disId: options.disId,
      value: options.value,
      purTotal: options.purTotal,
      startDate: options.startDate,
      stopDate: options.stopDate,
      hanzi: options.hanzi,
      dateType: options.dateType,
      name: options.name,

    })
    this._getPurUserStatistics();
  },



  // 获取统计信息 - NX系统
  _getPurUserStatistics() {
    var data = {
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      disId: this.data.disId,
      greatId: this.data.greatId
    };

    // 调用 NX 统计接口
    console.log('获取统计信息，参数:', data);
    disGetPurchaseStatistics(data)
      .then(res => {
        if (res.result.code == 0) {
          console.log('统计接口返回数据:', res.result.data);
          const result = res.result.data;
          this.setData({
            value: result.allDouble || 0,
            dinghuo: result.dinghuo || 0,
            dinghuoCount: result.dinghuoCount || 0,
            zicai: result.zicai || 0,
            zicaiCount: result.zicaiCount || 0,
            ruku: result.ruku || 0,
            rukuCount: result.rukuCount || 0,
          });

          // 获取统计信息成功后，再获取商品列表
          this._getGoodsList();
        } else {
          this.setData({
            arr: []
          })
          load.hideLoading();
          wx.showToast({
            title: res.result.msg || '获取统计信息失败',
            icon: 'none'
          });
        }
      })
    

  },

  // 获取商品列表 - NX系统
  _getGoodsList() {
    // 设置加载状态
    this.setData({
      isLoading: true
    });

    var data = {
      disId: this.data.disId,
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      page: this.data.currentPage,
      limit: this.data.limit,
      greatId: this.data.greatId
    };

    console.log('获取商品列表，参数:', data);
    load.showLoading("获取数据中");
    disGetPurchaseGoodsList(data)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {

          const result = res.result.data;
          console.log("商品列表返回数据:", result);

          // NX系统数据结构调整
          const goodsList = (result.goodsList || []).map(goods => ({
            ...goods,
            showPurchaseList: false, // 每个商品独立的采购批次显示状态
            nxDistributerGoodsEntity: goods.nxDistributerGoodsEntity || {},
            nxDistributerPurchaseGoodsEntities: (goods.nxDistributerPurchaseGoodsEntities || []).map(pur => ({
              ...pur,
              expanded: false
            }))
          }));

          // 如果是第一页，直接替换数据；否则追加数据
          if (this.data.currentPage === 1) {
            this.setData({
              arr: goodsList,
              totalCount: result.totalCount || 0,
              totalPage: result.totalPages || 0
            });
          } else {
            this.setData({
              arr: [...this.data.arr, ...goodsList],
              totalCount: result.totalCount || 0,
              totalPage: result.totalPages || 0
            });
          }

          // 设置加载状态为false
          this.setData({
            isLoading: false
          });
        } else {
          wx.showToast({
            title: res.result.msg || '获取商品列表失败',
            icon: 'none'
          });

          // 请求失败时也要设置加载状态为false
          this.setData({
            isLoading: false
          });
        }
      })
     

  },

  // 上拉加载更多
  onReachBottom() {
    // 防止重复请求
    if (this.data.isLoading || this.data.arr.length >= this.data.totalCount) return;

    // 检查是否还有更多页
    if (this.data.currentPage <= this.data.totalPage) { // 改为 <=
      this.setData({
        currentPage: this.data.currentPage + 1
      });
      this._getGoodsList();
    } else {
      // 已经到最后一页，显示提示
      wx.showToast({
        title: '已加载全部数据',
        icon: 'none'
      });
    }
  },







  toDetail(e) {
    const type = e.currentTarget.dataset.type;
    console.log("hanzi",this.data.hanzi);
    if (type === '0') {
      // 自采 - 跳转到采购详情页面
      wx.navigateTo({
        url: '../purchaseDeatil/purchaseDeatil?startDate=' + this.data.startDate + '&stopDate=' + 
        this.data.stopDate + '&type=0&hanzi=' + this.data.hanzi + '&disId=' + this.data.disId,
      })
    } else if (type === '1') {
      // 订货 - 跳转到订货详情页面
      wx.navigateTo({
        url: '../purchaseDeatil/purchaseDeatil?startDate=' + this.data.startDate + '&stopDate=' + 
        this.data.stopDate + '&type=1&hanzi=' + this.data.hanzi  + '&disId=' + this.data.disId,
      })
    }
  },



  toDatePageSearch() {
    this.setData({
      update: true,
      totalPage: 0,
    totalCount: 0,
    limit: 10,
    currentPage: 1,
    })
    wx.navigateTo({
      url: '/subPackage-charts/pages/sel/searchDate/searchDate?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType + '&hanzi=' + this.data.hanzi, 
    })
  },



  // 

  toFenxi(e) {
    var id = e.currentTarget.dataset.id;
    var goods = e.currentTarget.dataset.goods;

    wx.setStorageSync('disGoods', goods);
    
    // NX系统使用不同的商品ID字段
    const goodsId = goods.nxDistributerGoodsId || id;
    wx.navigateTo({
      url: '../../../../../subPackage-goods/pages/goods/goodsFenxiPurchase/goodsFenxiPurchase?disGoodsId=' + goodsId
    })
  },

  showDetail(e) {
    console.log('=== showDetail 方法被调用 ===');
    console.log('事件对象:', e);
    console.log('currentTarget:', e.currentTarget);
    console.log('dataset:', e.currentTarget.dataset);
    
    const goodsIndex = e.currentTarget.dataset.goodsIndex;
    const purIndex = e.currentTarget.dataset.purIndex;
    
    console.log('goodsIndex:', goodsIndex);
    console.log('purIndex:', purIndex);
    console.log('当前 arr 长度:', this.data.arr.length);

    // 创建新的数组，避免直接修改原数据
    const newArr = [...this.data.arr];

    console.log('newArr[goodsIndex]:', newArr[goodsIndex]);
    console.log('newArr[goodsIndex].nxDistributerPurchaseGoodsEntities:', newArr[goodsIndex]?.nxDistributerPurchaseGoodsEntities);
    console.log('newArr[goodsIndex].nxDistributerPurchaseGoodsEntities 长度:', newArr[goodsIndex]?.nxDistributerPurchaseGoodsEntities?.length);
    console.log('newArr[goodsIndex].nxDistributerPurchaseGoodsEntities[purIndex]:', newArr[goodsIndex]?.nxDistributerPurchaseGoodsEntities?.[purIndex]);

    // NX系统：使用 nxDistributerPurchaseGoodsEntities 字段
    if (newArr[goodsIndex] && newArr[goodsIndex].nxDistributerPurchaseGoodsEntities && newArr[goodsIndex].nxDistributerPurchaseGoodsEntities[purIndex]) {
      const oldExpanded = newArr[goodsIndex].nxDistributerPurchaseGoodsEntities[purIndex].expanded;
      console.log('当前 expanded 状态:', oldExpanded);
      
      // 切换指定采购记录的展开状态
      newArr[goodsIndex].nxDistributerPurchaseGoodsEntities[purIndex].expanded = !oldExpanded;
      
      console.log('切换后 expanded 状态:', newArr[goodsIndex].nxDistributerPurchaseGoodsEntities[purIndex].expanded);

      // 更新数据
      this.setData({
        arr: newArr
      });
      
      console.log('setData 完成');
    } else {
      console.error('数据不存在或索引无效');
      console.error('goodsIndex 有效:', !!newArr[goodsIndex]);
      console.error('nxDistributerPurchaseGoodsEntities 存在:', !!newArr[goodsIndex]?.nxDistributerPurchaseGoodsEntities);
      console.error('purIndex 有效:', !!newArr[goodsIndex]?.nxDistributerPurchaseGoodsEntities?.[purIndex]);
    }
    
    console.log('=== showDetail 方法执行完毕 ===');
  },

  // 控制采购批次列表的显示/隐藏
  showList(e) {
    console.log('=== showList 方法被调用 ===');
    console.log('事件对象:', e);
    console.log('currentTarget:', e.currentTarget);
    console.log('dataset:', e.currentTarget.dataset);
    
    const goodsIndex = e.currentTarget.dataset.index;
    console.log('goodsIndex:', goodsIndex);
    console.log('当前 arr 长度:', this.data.arr.length);
    
    // 创建新的数组，避免直接修改原数据
    const newArr = [...this.data.arr];
    
    console.log('newArr[goodsIndex]:', newArr[goodsIndex]);
    console.log('当前 showPurchaseList 状态:', newArr[goodsIndex]?.showPurchaseList);
    console.log('nxDistributerPurchaseGoodsEntities 是否存在:', !!newArr[goodsIndex]?.nxDistributerPurchaseGoodsEntities);
    console.log('nxDistributerPurchaseGoodsEntities 长度:', newArr[goodsIndex]?.nxDistributerPurchaseGoodsEntities?.length);
    console.log('nxDistributerPurchaseGoodsEntities 内容:', newArr[goodsIndex]?.nxDistributerPurchaseGoodsEntities);
    
    // 切换指定商品的采购批次显示状态
    if (newArr[goodsIndex]) {
      newArr[goodsIndex].showPurchaseList = !newArr[goodsIndex].showPurchaseList;
      console.log('切换后 showPurchaseList 状态:', newArr[goodsIndex].showPurchaseList);
      
      // 更新数据
      this.setData({
        arr: newArr
      }, () => {
        console.log('setData 回调执行');
        console.log('更新后的 arr[goodsIndex].showPurchaseList:', this.data.arr[goodsIndex]?.showPurchaseList);
        console.log('更新后的 arr[goodsIndex].nxDistributerPurchaseGoodsEntities:', this.data.arr[goodsIndex]?.nxDistributerPurchaseGoodsEntities);
      });
      
      console.log('setData 调用完成');
    } else {
      console.error('商品索引无效，goodsIndex:', goodsIndex);
    }
    
    console.log('=== showList 方法执行完毕 ===');
  },

  // 滚动时检测并关闭超出屏幕的展开内容
  checkAndCloseOverflowOnScroll() {
    console.log('=== checkAndCloseOverflowOnScroll 开始执行 ===');
    
    // 检查所有展开的商品
    const newArr = [...this.data.arr];
    const expandedGoods = newArr.filter((goods, index) => goods.showPurchaseList);
    
    console.log('当前数据数组长度:', newArr.length);
    console.log('展开的商品数量:', expandedGoods.length);
    console.log('展开的商品索引:', expandedGoods.map((goods, index) => {
      const actualIndex = newArr.findIndex(item => item === goods);
      return actualIndex;
    }));
    
    if (expandedGoods.length === 0) {
      console.log('没有展开的商品，直接返回');
      return;
    }
    
    expandedGoods.forEach((goods, goodsIndex) => {
      const actualIndex = newArr.findIndex(item => item === goods);
      console.log(`处理商品 ${actualIndex}，showPurchaseList:`, goods.showPurchaseList);
      
      if (goods.showPurchaseList) {
        // 使用setTimeout确保DOM已更新
        setTimeout(() => {
          console.log(`开始查询商品 ${actualIndex} 的位置信息`);
          
          const query = wx.createSelectorQuery();
          query.select(`#goods-container-${actualIndex}`).boundingClientRect();
          query.selectViewport().scrollOffset();
          
          query.exec((res) => {
            console.log(`商品 ${actualIndex} 查询结果:`, res);
            
            if (res[0] && res[1]) {
              const containerRect = res[0];
              const scrollInfo = res[1];
              
              // 计算容器是否在可视区域内
              const containerTop = containerRect.top;
              const containerBottom = containerRect.bottom;
              const viewportHeight = wx.getWindowInfo().windowHeight;
              
              console.log(`商品 ${actualIndex} 位置信息:`);
              console.log('- containerTop:', containerTop);
              console.log('- containerBottom:', containerBottom);
              console.log('- viewportHeight:', viewportHeight);
              console.log('- scrollTop:', scrollInfo.scrollTop);
              
              // 修复判断逻辑：如果容器顶部超出屏幕上方或底部超出屏幕下方，则关闭
              const isTopOut = containerTop < 0;  // 顶部超出屏幕上方
              const isBottomOut = containerBottom > viewportHeight;  // 底部超出屏幕下方
              
              console.log(`商品 ${actualIndex} 超出判断:`);
              console.log('- isTopOut:', isTopOut);
              console.log('- isBottomOut:', isBottomOut);
              
              if (isTopOut || isBottomOut) {
                console.log(`滚动检测：商品 ${actualIndex} 超出屏幕，自动关闭`);
                
                const newArr = [...this.data.arr];
                newArr[actualIndex].showPurchaseList = false;
                
                this.setData({
                  arr: newArr
                });
                
                console.log(`商品 ${actualIndex} 已关闭展开状态`);
              } else {
                console.log(`商品 ${actualIndex} 仍在可视区域内，保持展开状态`);
              }
            } else {
              console.log(`商品 ${actualIndex} 查询失败，res[0]:`, res[0], 'res[1]:', res[1]);
            }
          });
        }, 100);
      } else {
        console.log(`商品 ${actualIndex} 未展开，跳过处理`);
      }
    });
    
    console.log('=== checkAndCloseOverflowOnScroll 执行完毕 ===');
  },


  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },


  // NX系统暂不支持筛选功能

  // 滚动监听事件
  onScroll(event) {
    const scrollTop = event.detail.scrollTop;
    const threshold = this.data.scrollThreshold;
    const isScrolled = scrollTop > threshold;
    
    console.log('=== 滚动事件触发 ===');
    console.log('scrollTop:', scrollTop);
    console.log('threshold:', threshold);
    console.log('isScrolled:', isScrolled);
    console.log('当前 isScrolled 状态:', this.data.isScrolled);
    
    // 清除之前的防抖定时器
    if (this.scrollDebounceTimer) {
      console.log('清除之前的防抖定时器');
      clearTimeout(this.scrollDebounceTimer);
    }
    
    // 设置防抖延迟，避免频繁处理
    this.scrollDebounceTimer = setTimeout(() => {
      console.log('防抖定时器执行，更新状态并调用检测方法');
      
      // 只有当状态改变时才更新setData，避免频繁setData
      if (isScrolled !== this.data.isScrolled) {
        console.log('滚动状态发生变化，更新状态');
        this.setData({
          isScrolled: isScrolled,
          scrollTop: scrollTop
        });
      } else {
        console.log('滚动状态未变化，只更新scrollTop');
        this.setData({
          scrollTop: scrollTop
        });
      }

      // 每次滚动都检测并关闭超出屏幕的展开内容
      this.checkAndCloseOverflowOnScroll();
    }, 50); // 50ms防抖延迟
  },

  // 标签页点击事件
  onTab1Click(event) {
    const type = event.currentTarget.dataset.type;
    console.log('=== 按钮点击事件 ===');
    console.log('点击类型:', type);
    console.log('事件目标:', event.currentTarget);

    // 根据按钮类型执行相应操作
    if (type === '0') {
      // 自采按钮
      this.toDetail({ currentTarget: { dataset: { type: '0' } } });
    } else if (type === '1') {
      // 订货按钮
      this.toDetail({ currentTarget: { dataset: { type: '1' } } });
    } else if (type === '2') {
      // 库存按钮
      this.toStockPage();
    }
  },


  
  toStockPage(e) {
      
    wx.navigateTo({
      url: '../stockPurGoods/stockPurGoods?startDate=' + this.data.startDate + '&stopDate=' + 
      this.data.stopDate + '&dateType=' + this.data.dateType + '&searchDepIds=-1&disId=' + this.data.disId + '&hanzi=' + this.data.hanzi  + '&id=' + this.data.greatId + '&name=' + this.data.name

    })
  },



  toCost(e) {
    var item  = e.currentTarget.dataset.item;
    var stockId = e.currentTarget.dataset.id;
    wx.setStorageSync('disGoods', item);
   
    // NX系统使用不同的商品ID字段
    const goodsId = item.nxDistributerGoodsId || item.id;
    wx.navigateTo({
      url: '../../../../../subPackage-goods/pages/goods/stockGoodsList/stockGoodsList?disGoodsId=' + goodsId + '&stockId=' + stockId,
    })

  },


  onUnload() {
    // 清除缓存
    wx.removeStorageSync('purGoodsByDate_scrollState');
  }

})
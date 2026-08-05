import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil');



import {
 
  getDisGoodsCataWithCount,
  getDisGoodsByGreatGrandIdWithCount,
  getDisGoodsByGrandId,
  disUpdateBuyingPrice,
} from '../../../../lib/apiDistributer'


const tabBarHeight = 50; // 根据实际情况调整
const viewBarHeight = 60;

Page({

  data:{
 
    notUpdate: false,
    goodsType: 99,
    hasCartonUnit: null, // 外包装查询条件：1-有外包装，0-无外包装，null-不筛选
    hasPerCarton: null, // 外包装数量查询条件：1-有外包装数量，0-无外包装数量，null-不筛选
    hasTraceReport: null, // 溯源查询条件：1-有溯源，0-无溯源，null-不筛选
    showFilterMenu: false, // 显示统一筛选菜单
    fixedContentHeight: 0, // 固定内容高度（分类标签栏）
    scrollContentHeight: 0, // 滚动区域高度
    upTime: dateUtils.getDateTimeString(),
    url: apiUrl.server,
    leftMenuWidth: 120, // 左侧菜单宽度，单位 rpx
    totalPage: 0,
    totalCount: 0,
    limit: 15,
    currentPage: 1,
    toTop: 0,
    leftIndex: 0,
    searchFather: false,
    topHeight: 0,
    searchId: "",
    disId: "",

    // 图片预览
    showImagePreview: false,
    previewImageUrls: [],
    previewCurrentIndex: 0,
  },


  onShow() {
    const app = getApp();
    const globalData = app.globalData;
    
    //tabBar
    if (typeof this.getTabBar === 'function' &&
      this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      })
    }

    // 设置页面尺寸
    const navBarHeight = globalData.navBarHeight;
    const screenHeight = globalData.screenHeight;
    const screenWidth = globalData.screenWidth;
    const rpxRatio = 750 / screenWidth;
    const navBarHeightRpx = navBarHeight * rpxRatio;
    const viewBarHeightRpx = viewBarHeight * rpxRatio;
    // 注意：此页面没有底部导航栏，所以不需要减去 tabBarHeight
    const contentHeight = (screenHeight - navBarHeight - viewBarHeight) * rpxRatio;
    
    console.log('📏 页面高度计算:');
    console.log('  - screenHeight:', screenHeight, 'px');
    console.log('  - navBarHeight:', navBarHeight, 'px');
    console.log('  - viewBarHeight:', viewBarHeight, 'px');
    console.log('  - rpxRatio:', rpxRatio);
    console.log('  - contentHeight:', contentHeight, 'rpx (已减去 navBar + viewBar)');
    console.log('  - windowHeight:', globalData.windowHeight * globalData.rpxR, 'rpx');
    
    this.setData({
      rpxRatio: rpxRatio,
      contentHeight: contentHeight,
      navBarHeight: navBarHeightRpx,
      viewBarHeight: viewBarHeightRpx,
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      url: apiUrl.server,
    })
    
    // 检查是否需要刷新商品列表（从商品详情/编辑页面返回时）
    var goodsNeedRefresh = wx.getStorageSync('goodsNeedRefresh');
    if (goodsNeedRefresh) {
      // 清除标识
      wx.removeStorageSync('goodsNeedRefresh');
      // 刷新商品列表
      if (this.data.disId) {
        // 保存当前的左侧分类ID，以便刷新后恢复
        var savedLeftGreatId = this.data.leftGreatId;
        var savedLeftIndex = this.data.leftIndex;
        
        console.log('🔄 刷新商品列表，保留左侧分类选择');
        console.log('  - savedLeftGreatId:', savedLeftGreatId);
        console.log('  - savedLeftIndex:', savedLeftIndex);
        
        // 重置分页
        this.setData({
          currentPage: 1,
          totalPage: 0,
          totalCount: 0
        });
        
        // 如果有保存的分类ID，刷新后恢复；否则重新加载分类列表
        if (savedLeftGreatId) {
          // 直接刷新当前分类的商品列表，不重新加载分类列表
          this._refreshCurrentCategory(savedLeftGreatId);
        } else {
          // 没有保存的分类ID，重新加载分类列表
          this._getCataGoods();
        }
      }
    }
  },

  onLoad() {
    // 页面尺寸设置已在 onShow() 中处理
  
      var value = wx.getStorageSync('userInfo');
      if (value) {
        this.setData({
          disId: value.nxDistributerEntity.nxDistributerId,
          userInfo: value,
          disInfo: value.nxDistributerEntity
        })
      
      }

      var notUpdate = wx.getStorageSync('notUpdate');
      if(!notUpdate){
        this.setData({
          totalPage: 0,
        totalCount: 0,
        limit: 15,
        currentPage: 1,
        toTop: 0,
        leftIndex: 0,
        searchFather: false,
        topHeight: 0,
        searchId: "",
        })
      }
      //  else {
  
      //   this._login();
  
      // }
    // }
    
    // 确保在设置完 disId 后再获取数据
    if (this.data.disId) {
      this._getCataGoods();
    } else {
      // 如果没有 disId，等待一下再尝试
      setTimeout(() => {
        if (this.data.disId) {
          this._getCataGoods();
        }
      }, 100);
    }

  },


  _getCataGoods() {
    var that = this;
    
    // 检查 disId 是否存在
    if (!this.data.disId) {
      load.hideLoading();
      return;
    }
    
    load.showLoading("获取数据中");
    console.log("🔍 _getCataGoods - this.data.hasCartonUnit:", this.data.hasCartonUnit);
    console.log("🔍 _getCataGoods - this.data.hasPerCarton:", this.data.hasPerCarton);
    var data = {
      disId: this.data.disId,
      goodsType: this.data.goodsType
    }
    // 添加外包装查询条件（只有当值不为 null 且不为 undefined 时才添加）
    if (this.data.hasCartonUnit != null && this.data.hasCartonUnit !== undefined) {
      data.hasCartonUnit = this.data.hasCartonUnit;
      console.log("🔍 _getCataGoods - 添加 hasCartonUnit:", this.data.hasCartonUnit);
    }
     // 添加外包装查询条件（只有当值不为 null 且不为 undefined 时才添加）
     if (this.data.hasPerCarton != null && this.data.hasPerCarton !== undefined) {
      data.hasPerCarton = this.data.hasPerCarton;
      console.log("🔍 _getCataGoods - 添加 hasPerCarton:", this.data.hasPerCarton);
    }
    console.log("🔍 _getCataGoods - 最终 data 对象:", data);

    getDisGoodsCataWithCount(data).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        console.log("gungunn:", res.result.data.list);
        this.setData({
          grandList: res.result.data.list,
          linshiCount: res.result.data.lishiCount,
          priceCount: res.result.data.priceCount,
          buyPriceCount: res.result.data.buyPriceCount,
         
        })
        if(res.result.data.list && res.result.data.list.length > 0){
          this.setData({
            fatherArr: res.result.data.list[0].fatherGoodsEntities,
            leftGreatId: res.result.data.list[0].nxDistributerFatherGoodsId,
            greatName: res.result.data.list[0].nxDfgFatherGoodsName,
          })
          that._getFatherGoods();
          
          // 等待 DOM 更新后计算固定内容高度
          wx.nextTick(() => {
            that.updateFixedContentHeight();
          });
        }else{
          this.setData({
            fatherArr: [],
            goodsList:[],
          })
        }
       
        
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },

  changeGreatGrand(e) {
    console.log(e);
    this.setData({
      leftGreatId: e.currentTarget.dataset.id,
      leftIndex: e.currentTarget.dataset.index,
      currentPage: 1,
      searchFather: false,
      searchId: '',
      greatName: e.currentTarget.dataset.name,
      fatherArr: this.data.grandList[e.currentTarget.dataset.index].fatherGoodsEntities,
    })

    this._getFatherGoods();
    
    // 等待 DOM 更新后重新计算固定内容高度
    var that = this;
    wx.nextTick(() => {
      that.updateFixedContentHeight();
    });

  },

  _getFatherGoods() {
     var that  = this;
     
     // 检查必要参数是否存在
     if (!this.data.disId || !this.data.leftGreatId) {
       load.hideLoading();
       return;
     }
     
    console.log("🔍 _getFatherGoods - 开始");
    console.log("🔍 _getFatherGoods - this.data.hasCartonUnit:", this.data.hasCartonUnit);
    console.log("🔍 _getFatherGoods - this.data.hasPerCarton:", this.data.hasPerCarton);
    console.log("🔍 _getFatherGoods - this.data.hasTraceReport:", this.data.hasTraceReport);
    
    var data = {
      disId: this.data.disId,
      depId: this.data.depFatherId,
      fatherId: this.data.leftGreatId,
      limit: this.data.limit,
      page: this.data.currentPage,
      goodsType: this.data.goodsType
    }
    // 添加外包装查询条件（只有当值不为 null 且不为 undefined 时才添加）
    if (this.data.hasCartonUnit != null && this.data.hasCartonUnit !== undefined) {
      data.hasCartonUnit = this.data.hasCartonUnit;
      console.log("🔍 _getFatherGoods - 添加 hasCartonUnit:", this.data.hasCartonUnit);
    }
    // 添加外包装查询条件（只有当值不为 null 且不为 undefined 时才添加）
    if (this.data.hasPerCarton != null && this.data.hasPerCarton !== undefined) {
      data.hasPerCarton = this.data.hasPerCarton;
      console.log("🔍 _getFatherGoods - 添加 hasPerCarton:", this.data.hasPerCarton);
    }
    // 添加溯源查询条件（只有当值不为 null 且不为 undefined 时才添加）
    if (this.data.hasTraceReport != null && this.data.hasTraceReport !== undefined) {
      data.hasTraceReport = this.data.hasTraceReport;
      console.log("🔍 _getFatherGoods - 添加 hasTraceReport:", this.data.hasTraceReport);
    }
    console.log("🔍 _getFatherGoods - 最终 data 对象:", data);
    load.showLoading("获取商品中");
    getDisGoodsByGreatGrandIdWithCount(data).then(res => {
      load.hideLoading();
      console.log("商品 API 响应:", res);
      if (res.result.code == 0) {
        console.log("商品 API 成功，数据:", res.result.page);
        console.log("商品列表长度:", res.result.page.is.list ? res.result.page.is.list.length : 0);
        this.setData({
          goodsList: res.result.page.is.list,
          currentPage: this.data.currentPage + 1,
          totalPage: res.result.page.is.totalPage,
          totalCount: res.result.page.is.totalCount,
        })
        console.log("商品数据设置完成，商品数量:", this.data.goodsList.length);
        // that.getTabBar().setData({
        //   stockCount: res.result.page.stockCount,
        //   purCount: res.result.page.purCount,
        //   })

        wx.nextTick(() => {
          this.updateFixedContentHeight();
        });

      } else {
        console.log("商品 API 失败:", res.result.msg);
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    }).catch(err => {
      console.log("商品 API 请求异常:", err);
      load.hideLoading();
    })
  },

  // 刷新当前分类的商品列表（保留左侧分类选择）
  _refreshCurrentCategory(leftGreatId) {
    var that = this;
    console.log('🔄 刷新当前分类的商品列表，leftGreatId:', leftGreatId);
    
    // 检查分类列表是否存在
    if (!this.data.grandList || this.data.grandList.length === 0) {
      // 如果分类列表不存在，先加载分类列表
      console.log('📋 分类列表不存在，先加载分类列表');
      this._getCataGoodsWithRestore(leftGreatId);
      return;
    }
    
    // 查找对应的分类索引
    var targetIndex = -1;
    var targetCategory = null;
    for (var i = 0; i < this.data.grandList.length; i++) {
      if (this.data.grandList[i].nxDistributerFatherGoodsId === leftGreatId) {
        targetIndex = i;
        targetCategory = this.data.grandList[i];
        break;
      }
    }
    
    if (targetIndex >= 0 && targetCategory) {
      // 找到了对应的分类，恢复选择
      console.log('✅ 找到对应的分类，索引:', targetIndex);
      this.setData({
        leftGreatId: leftGreatId,
        leftIndex: targetIndex,
        greatName: targetCategory.nxDfgFatherGoodsName,
        fatherArr: targetCategory.fatherGoodsEntities,
        currentPage: 1,
      });
      // 刷新商品列表
      this._getFatherGoods();
    } else {
      // 没找到对应的分类，重新加载分类列表
      console.log('⚠️ 未找到对应的分类，重新加载分类列表');
      this._getCataGoodsWithRestore(leftGreatId);
    }
  },

  // 加载分类列表并恢复之前的选择
  _getCataGoodsWithRestore(savedLeftGreatId) {
    var that = this;
    
    // 检查 disId 是否存在
    if (!this.data.disId) {
      load.hideLoading();
      return;
    }
    
    load.showLoading("获取数据中");
    console.log("🔍 _getCataGoodsWithRestore - 开始");
    console.log("🔍 _getCataGoodsWithRestore - this.data.hasCartonUnit:", this.data.hasCartonUnit);
    console.log("🔍 _getCataGoodsWithRestore - this.data.hasPerCarton:", this.data.hasPerCarton);
    console.log("🔍 _getCataGoodsWithRestore - this.data.hasTraceReport:", this.data.hasTraceReport);
    
    var data = {
      disId: this.data.disId,
      goodsType: this.data.goodsType
    }
    // 添加外包装查询条件（只有当值不为 null 且不为 undefined 时才添加）
    if (this.data.hasCartonUnit != null && this.data.hasCartonUnit !== undefined) {
      data.hasCartonUnit = this.data.hasCartonUnit;
      console.log("🔍 _getCataGoodsWithRestore - 添加 hasCartonUnit:", this.data.hasCartonUnit);
    }
     // 添加外包装数量查询条件（只有当值不为 null 且不为 undefined 时才添加）
     if (this.data.hasPerCarton != null && this.data.hasPerCarton !== undefined) {
      data.hasPerCarton = this.data.hasPerCarton;
      console.log("🔍 _getCataGoodsWithRestore - 添加 hasPerCarton:", this.data.hasPerCarton);
    }
    // 添加溯源查询条件（只有当值不为 null 且不为 undefined 时才添加）
    if (this.data.hasTraceReport != null && this.data.hasTraceReport !== undefined) {
      data.hasTraceReport = this.data.hasTraceReport;
      console.log("🔍 _getCataGoodsWithRestore - 添加 hasTraceReport:", this.data.hasTraceReport);
    }
    console.log("🔍 _getCataGoodsWithRestore - 最终 data 对象:", data);
    getDisGoodsCataWithCount(data).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        console.log("catalist", res.result.data);

        this.setData({
          grandList: res.result.data.list,
          linshiCount: res.result.data.lishiCount,
          priceCount: res.result.data.priceCount,
          buyPriceCount: res.result.data.buyPriceCount,
        })
        
        if(res.result.data.list && res.result.data.list.length > 0){
          // 尝试恢复之前选择的分类
          var targetIndex = -1;
          var targetCategory = null;
          for (var i = 0; i < res.result.data.list.length; i++) {
            if (res.result.data.list[i].nxDistributerFatherGoodsId === savedLeftGreatId) {
              targetIndex = i;
              targetCategory = res.result.data.list[i];
              break;
            }
          }
          
          if (targetIndex >= 0 && targetCategory) {
            // 找到了之前选择的分类，恢复它
            console.log('✅ 恢复之前选择的分类，索引:', targetIndex);
            this.setData({
              fatherArr: targetCategory.fatherGoodsEntities,
              leftGreatId: targetCategory.nxDistributerFatherGoodsId,
              leftIndex: targetIndex,
              greatName: targetCategory.nxDfgFatherGoodsName,
            });
          } else {
            // 没找到，使用第一个分类
            console.log('⚠️ 未找到之前选择的分类，使用第一个分类');
            this.setData({
              fatherArr: res.result.data.list[0].fatherGoodsEntities,
              leftGreatId: res.result.data.list[0].nxDistributerFatherGoodsId,
              leftIndex: 0,
              greatName: res.result.data.list[0].nxDfgFatherGoodsName,
            });
          }
          
          that._getFatherGoods();
          
          // 等待 DOM 更新后计算固定内容高度
          wx.nextTick(() => {
            that.updateFixedContentHeight();
          });
        }else{
          this.setData({
            fatherArr: [],
            goodsList:[],
          })
        }
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    }).catch(err => {
      load.hideLoading();
    })
  },

  updateFixedContentHeight() {
    const query = wx.createSelectorQuery();
    query.select('#miltest').boundingClientRect((rect) => {
      if (!rect) {
        console.log('⚠️ 未找到 #miltest 元素');
        return;
      }
      
      const fixedContentHeightPx = rect.height; // 单位 px
      const fixedContentHeightRpx = fixedContentHeightPx * this.data.rpxRatio;

      console.log('📏 固定内容高度计算:');
      console.log('  - fixedContentHeightPx:', fixedContentHeightPx, 'px');
      console.log('  - rpxRatio:', this.data.rpxRatio);
      console.log('  - fixedContentHeightRpx:', fixedContentHeightRpx, 'rpx');

      // 重新计算滚动区域高度
      const scrollContentHeight = this.data.contentHeight - fixedContentHeightRpx;
      
      console.log('📏 滚动区域高度计算:');
      console.log('  - contentHeight:', this.data.contentHeight, 'rpx');
      console.log('  - fixedContentHeightRpx:', fixedContentHeightRpx, 'rpx');
      console.log('  - scrollContentHeight:', scrollContentHeight, 'rpx');

      // 更新 fixedContentHeight 和 scrollContentHeight
      this.setData({
        fixedContentHeight: fixedContentHeightRpx,
        scrollContentHeight: scrollContentHeight,
      });
    }).exec();
  },

  
  _getTopFatherGoods(e) {
    // 先设置一个非0值，再设置为0，确保scroll-view能触发滚动
    this.setData({
      toTop: 1
    }, () => {
      // 下一帧设置为0，滚动到顶部
      setTimeout(() => {
        this.setData({
          toTop: 0
        });
      }, 50);
    });
      
    wx.navigateTo({
      url: '../goodsTypeList/goodsTypeList?fatherId=' + e.currentTarget.dataset.id 
       + '&goodsType=' + this.data.goodsType + '&name=' + e.currentTarget.dataset.name
       + '&hasCartonUnit=' + (this.data.hasCartonUnit !== null && this.data.hasCartonUnit !== undefined ? this.data.hasCartonUnit : 'null')
       + '&hasPerCarton=' + (this.data.hasPerCarton !== null && this.data.hasPerCarton !== undefined ? this.data.hasPerCarton : 'null')
       + '&hasTraceReport=' + (this.data.hasTraceReport !== null && this.data.hasTraceReport !== undefined ? this.data.hasTraceReport : 'null'),
    })

    // if(this.data.searchFather){
    //   this.setData({
    //     searchFather: false,
    //     searchId: '',
    //   })
    //   this._getFatherGoods();
    // }else{
    //   console.log(e);
    //   this.setData({
    //     searchFather: true,
    //     searchId: e.currentTarget.dataset.id,
    //   })
    //   var data = {
    //     fatherId: e.currentTarget.dataset.id,
    //   }
    //   load.showLoading("获取商品中");
    //   getDisGoodsByGrandId(data).then(res => {
    //     load.hideLoading();
    //     if (res.result.code == 0) {
    //       this.setData({
    //         goodsList: res.result.data,
    //         toTop: 0,
    //         currentPage: 1,
  
    //       })
    //     }
    //   })
    // }
   
  },

  onScrollToLower: function () {
    var that  = this;
    // 防止重复请求
    if (this.data.isLoading || this.data.goodsList.length >= this.data.totalCount) return;

    this.setData({
      isLoading: true
    });

    const {
      currentPage,
      totalPage,
      searchFather,
      leftGreatId,
      goodsType,
      hasCartonUnit,
      hasPerCarton,
      depFatherId,
      disId,
      limit
    } = this.data;

    // 确保非搜索模式，并且当前页数未超过总页数
    if (!searchFather && currentPage <= totalPage) {
      const data = {
        limit: limit,
        page: currentPage,
        fatherId: leftGreatId,
        goodsType: goodsType,
        disId: disId,
      };
      // 添加外包装查询条件（只有当值不为 null 且不为 undefined 时才添加）
      if (hasCartonUnit != null && hasCartonUnit !== undefined) {
        data.hasCartonUnit = hasCartonUnit;
      }
      // 添加外包装数量查询条件（只有当值不为 null 且不为 undefined 时才添加）
      if (hasPerCarton != null && hasPerCarton !== undefined) {
        data.hasPerCarton = hasPerCarton;
      }
      // 添加溯源查询条件（只有当值不为 null 且不为 undefined 时才添加）
      if (this.data.hasTraceReport != null && this.data.hasTraceReport !== undefined) {
        data.hasTraceReport = this.data.hasTraceReport;
      }
      getDisGoodsByGreatGrandIdWithCount(data)
        .then((res) => {
          if (res.result.code == 0) {
            const newItems = res.result.page.is.list || [];
            const updatedGoodsList = [...this.data.goodsList, ...newItems];
            // 更新当前页和商品列表
            this.setData({
              goodsList: updatedGoodsList,
              currentPage: currentPage + 1,
              totalPage: res.result.page.is.totalPage,
              totalCount: res.result.page.is.totalCount,
              isLoading: false,
            });
            // 如果已达到 totalCount，停止加载
            if (updatedGoodsList.length >= this.data.totalCount) {
              this.setData({
                isLoading: false
              });
            }

          } else {
            wx.showToast({
              title: '获取商品失败',
              icon: 'none'
            });
            this.setData({
              isLoading: false
            });
          }
        })
        .catch((err) => {
          console.log(err);
          wx.showToast({
            title: '加载错误，请稍后再试',
            icon: 'none'
          });
          this.setData({
            isLoading: false
          });
        });
    } else {
      this.setData({
        isLoading: false
      });
    }
  },

  // 打开统一筛选菜单
  openFilterMenu(e) {
    this.setData({
      showFilterMenu: true,
    })
    this.chooseSezi();
  },

  // 关闭统一筛选菜单
  hideFilterMenu() {
    this.hideModal();
    this.setData({
      showFilterMenu: false,
    })
  },

  chooseSezi: function (e) {
    // 用that取代this，防止不必要的情况发生
    var that = this;
    // 创建一个动画实例
    var animation = wx.createAnimation({
      // 动画持续时间
      duration: 100,
      // 定义动画效果，当前是匀速
      timingFunction: 'linear'
    })
    // 将该变量赋值给当前动画
    that.animation = animation
    // 先在y轴偏移，然后用step()完成一个动画
    animation.translateY(200).step()
    // 用setData改变当前动画（不在这里设置 chooseSize，由调用方决定）
    that.setData({
      // 通过export()方法导出数据
      animationData: animation.export()
    })
    // 设置setTimeout来改变y轴偏移量，实现有感觉的滑动
    setTimeout(function () {
      animation.translateY(0).step()
      that.setData({
        animationData: animation.export()
      })
    }, 20)
  },

  hideModal: function (e) {
    var that = this;
    var animation = wx.createAnimation({
      duration: 1000,
      timingFunction: 'linear'
    })
    that.animation = animation
    animation.translateY(200).step()
    that.setData({
      animationData: animation.export()

    })
    setTimeout(function () {
      animation.translateY(0).step()
      that.setData({
        animationData: animation.export()
      })
    }, 200)
  },

  hideMask() {
    // this.getTabBar().setData({
    //   showTabBar: true
    // })
    this.hideFilterMenu();
  },

  // 选择商品类型（统一筛选菜单）
  selectGoodsType(e) {
    var goodsType = e.currentTarget.dataset.type;
    // 保存当前的左侧分类ID，以便刷新后恢复选择
    var savedLeftGreatId = this.data.leftGreatId;
    
    this.setData({
      goodsType: goodsType,
      currentPage: 1,
    })
    
    // 立即刷新列表
    this._getCataGoodsWithRestore(savedLeftGreatId);
  },

  // 选择外包装（统一筛选菜单）
  selectPerCarton(e) {
    var hasPerCarton = e.currentTarget.dataset.type;
    console.log("🔍 selectPerCarton - 原始值:", hasPerCarton);
    // 处理字符串 "null" 转换为 null
    if (hasPerCarton === 'null') {
      hasPerCarton = null;
    } else {
      hasPerCarton = parseInt(hasPerCarton);
    }
    console.log("🔍 selectPerCarton - 转换后值:", hasPerCarton);
    console.log("🔍 selectPerCarton - 当前 data.hasCartonUnit:", this.data.hasCartonUnit);
    console.log("🔍 selectPerCarton - 当前 data.hasPerCarton:", this.data.hasPerCarton);
    
    // 保存当前的左侧分类ID，以便刷新后恢复选择
    var savedLeftGreatId = this.data.leftGreatId;
    
    this.setData({
      hasPerCarton: hasPerCarton,
      currentPage: 1,
    }, () => {
      console.log("🔍 selectPerCarton - setData 后 data.hasPerCarton:", this.data.hasPerCarton);
      console.log("🔍 selectPerCarton - setData 后 data.hasCartonUnit:", this.data.hasCartonUnit);
    })
    
    // 立即刷新列表
    this._getCataGoodsWithRestore(savedLeftGreatId);
  },


  // 选择外包装（统一筛选菜单）
  selectCartonUnit(e) {
    console.log("🔍 selectCartonUnit - 被调用");
    var hasCartonUnit = e.currentTarget.dataset.type;
    console.log("🔍 selectCartonUnit - 原始值:", hasCartonUnit);
    // 处理字符串 "null" 转换为 null
    if (hasCartonUnit === 'null') {
      hasCartonUnit = null;
    } else {
      hasCartonUnit = parseInt(hasCartonUnit);
    }
    console.log("🔍 selectCartonUnit - 转换后值:", hasCartonUnit);
    console.log("🔍 selectCartonUnit - 当前 data.hasCartonUnit:", this.data.hasCartonUnit);
    console.log("🔍 selectCartonUnit - 当前 data.hasPerCarton:", this.data.hasPerCarton);
    
    // 保存当前的左侧分类ID，以便刷新后恢复选择
    var savedLeftGreatId = this.data.leftGreatId;
    
    this.setData({
      hasCartonUnit: hasCartonUnit,
      currentPage: 1,
    }, () => {
      console.log("🔍 selectCartonUnit - setData 后 data.hasCartonUnit:", this.data.hasCartonUnit);
      console.log("🔍 selectCartonUnit - setData 后 data.hasPerCarton:", this.data.hasPerCarton);
    })
    
    // 立即刷新列表
    this._getCataGoodsWithRestore(savedLeftGreatId);
  },

  // 选择溯源（统一筛选菜单）
  selectTraceReport(e) {
    var hasTraceReport = e.currentTarget.dataset.type;
    // 处理字符串 "null" 转换为 null
    if (hasTraceReport === 'null') {
      hasTraceReport = null;
    } else {
      hasTraceReport = parseInt(hasTraceReport);
    }
    
    // 保存当前的左侧分类ID，以便刷新后恢复选择
    var savedLeftGreatId = this.data.leftGreatId;
    
    this.setData({
      hasTraceReport: hasTraceReport,
      currentPage: 1,
    })
    
    // 立即刷新列表
    this._getCataGoodsWithRestore(savedLeftGreatId);
  },


  /**
   * 修改售价
   * @param {修改商品 id} e 
   */
  // showIsPurchaseSupplier(e) {
  //   var item = e.currentTarget.dataset.item;
  //   this.getTabBar().setData({
  //     showTabBar: false
  //   })
  //  this.setData({
  //   goodsIndex: e.currentTarget.dataset.index,
      
  //   showIsPurchaseSupplier: true,
  //   level: e.currentTarget.dataset.level,
  //   item: item,
  //  })

  // },

  
 showIsPurchase(e) {
  var item = e.currentTarget.dataset.item;
  // 统一弹窗：同时显示基本单位与外包装两档
  this.setData({
    goodsIndex: e.currentTarget.dataset.index,
    showIsPurchase: true,
    item: item
  })

},

  /**
   * 修改售价接口
   */
  confirm(e) {
    var item = e.detail.item;
    console.log(item);
    disUpdateBuyingPrice(item)
      .then(res => {
        if (res.result.code == 0) {
          // this.getTabBar().setData({
          //   showTabBar: true
          // })
          var data = "goodsList[" + this.data.goodsIndex + "]";
            this.setData({
              [data]: item,
              item: item,
            })
        }
      })
  },

  cancleIsPurchase(){
    // this.getTabBar().setData({
    //   showTabBar: true
    // })
  },


  toEditHome() {
    if (this.data.userInfo.nxDiuAdmin == 0) {
      wx.setStorageSync('notUpdate', true);
      wx.navigateTo({
        url: '/subPackage/pages/mangement/homePage/homePage',
      })
    }
  },
  
  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },


  /**
   * 打开修改商品页面
   * @param {*} e 
   */
  toGoodsDetailPage(e) {
    wx.setStorageSync('notUpdate', true);
    wx.setStorageSync('disGoods', e.currentTarget.dataset.item);
    wx.navigateTo({
      url: '../disGoodsPage/disGoodsPage?disGoodsId=' + e.currentTarget.dataset.id + '&goodsName=' + e.currentTarget.dataset.name + '&color=' + e.currentTarget.dataset.color + '&editIndex=' + e.currentTarget.dataset.index
      +'&from=index',
    })

  },




  /**
   * 预览图片
   */
  previewImage(e) {
    const item = e.currentTarget.dataset.item;
    console.log('[previewImage] item:', item);
    const urls = [];
    if (item.nxDgGoodsFileLarge && item.nxDgGoodsFileLarge !== 'null') {
      urls.push(this.data.url + item.nxDgGoodsFileLarge);
    } else if (item.nxDgGoodsFile && item.nxDgGoodsFile !== 'null' && item.nxDgGoodsFile !== 'goodsImage/logo.jpg') {
      urls.push(this.data.url + item.nxDgGoodsFile);
    }
    console.log('[previewImage] urls:', urls);
    if (urls.length > 0) {
      this.setData({
        showImagePreview: true,
        previewImageUrls: urls,
        previewCurrentIndex: 0
      });
      console.log('[previewImage] setData done, showImagePreview:', this.data.showImagePreview);
    }
  },

  /**
   * 关闭预览
   */
  onPreviewClose() {
    this.setData({
      showImagePreview: false
    });
  },

  /**
   * 打开修改图片页面
   */
  toEditGoodsImage(e) {
    wx.setStorageSync('notUpdate', true);
    wx.setStorageSync('editNxGoods', e.currentTarget.dataset.item);
    wx.setStorageSync('brotherGoods', e.currentTarget.dataset.goods);
    wx.navigateTo({
      url: '../nxPicture/nxPicture?editIndex=' +  e.currentTarget.dataset.index,
    })
  },



  beginSearch(){
    wx.setStorageSync('notUpdate', true);
    wx.navigateTo({
      url: '../searchGoods/searchGoods',
    })
  },
  
  toLinshiGoods() {
    wx.setStorageSync('notUpdate', true);
    wx.navigateTo({
      url: '../linshiGoodsDis/linshiGoodsDis?disId=' + this.data.disId,
    })
  },


  toUpdatePriceGoods(e) {
    wx.setStorageSync('notUpdate', true);
    wx.navigateTo({
      url: '../updatePriceGoods/updatePriceGoods?type=' + e.currentTarget.dataset.type,
    })
  },



  toSetGoods(e){
    wx.setStorageSync('goodsSetType', "autoPurchase");
    wx.navigateTo({
      url: '../greatGrandGoods/greatGrandGoods?disId=' + this.data.disId
      + "&supplierId=" + this.data.supplierId + '&type=add',
    })
  },



})

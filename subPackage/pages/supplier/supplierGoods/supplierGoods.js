import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');
let heightArrDis = [0];
import {
  supplierGetDisGoodsCata,
  supplierGetGoodsListByFatherId,
  disUpdateBuyingPrice,
  cancelSupplierGoods,
} from '../../../../lib/apiDistributer'

const tabBarHeight = 50; // 根据实际情况调整
const viewBarHeight = 60;

Page({

  onShow(){
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
    
      // contentHeight: 0,
      // navBarHeight: 0,
      // tabBarHeight: 0,
      rpxRatio: rpxRatio,
      contentHeight: contentHeight,
      navBarHeight: navBarHeightRpx,
      tabBarHeight: tabBarHeightRpx,
      viewBarHeight: viewBarHeightRpx,
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      leftMenuWidth: 160, // 左侧菜单宽度，单位 rpx

      
     

    });
   
  },



  onLoad(options) {

    this.setData({
      
      url: apiUrl.server,
      totalPage: 0,
      totalCount: 0,
      limit: 15,
      currentPage: 1,
      toTop: 0,
      leftIndex: 0,
      supplierId: options.supplierId,
      disId: options.disId,
      ids: [], // 初始化选中的商品ID数组
      selectedGoods: [], // 初始化选中的商品数组
      allSelected: false // 全选状态
     
    })

    var value = wx.getStorageSync('disInfo');
    if (value) {
      this.setData({
        disId: value.nxDistributerId,
        disInfo: value
      })
    }
    this._getCataGoods();
  
  },

  _getCataGoods() {
    var that = this;
    load.showLoading("获取数据中");
    var data ={
      disId: this.data.disId,
      supplierId: this.data.supplierId
    }
    supplierGetDisGoodsCata(data).then(res => {
      if (res.result.code == 0) {
        load.hideLoading();
        this.setData({
          grandList: res.result.data,
          leftGreatId: res.result.data[0].nxDistributerFatherGoodsId,
          greatName: res.result.data[0].nxDfgFatherGoodsName,
        })
        that._getFatherGoods();
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
      greatName: e.currentTarget.dataset.name,

    })

    this._getFatherGoods();

  },




  _getFatherGoods() {

    var data = {
      supplierId: this.data.supplierId,
      fatherId: this.data.leftGreatId,
      limit: this.data.limit,
      page: this.data.currentPage,
    }
    supplierGetGoodsListByFatherId(data).then(res => {
      if (res.result.code == 0) {
        console.log(res.result.page)
        
        // 为每个商品添加选中状态
        const goodsList = res.result.page.list.map(item => ({
          ...item,
          selected: false // 默认未选中
        }));
        
        this.setData({
          goodsList: goodsList,
          totalPage: res.result.page.totalPage,
          totalCount: res.result.page.totalCount,
          // 重置选中状态
          ids: [],
          selectedGoods: [],
          allSelected: false
        })

      }
    })
  },


  onScrollToLower: function () {

    let {
      currentPage,
      totalPage,
      isLoading
    } = this.data



    if (currentPage == totalPage) {
      console.log("coming??");
      return;
    } else {

      var data = {
        limit: this.data.limit,
        page: this.data.currentPage + 1,
        supplierId: this.data.supplierId,
        fatherId: this.data.leftGreatId,
      }
      supplierGetGoodsListByFatherId(data)
        .then((res) => {
          if (res.result.code == 0) {
            load.hideLoading();
            console.log(res.result.page)
            var arr = res.result.page.list;
            if (arr.length > 0) {
              // 为新加载的商品添加选中状态
              const newGoodsList = arr.map(item => ({
                ...item,
                selected: false // 默认未选中
              }));
              
              var currentPage = this.data.currentPage; // 获取当前页码
              currentPage += 1; // 加载当前页面的下一页数据
              var now = this.data.goodsList;
              var newdata = now.concat(newGoodsList);
              this.setData({
                goodsList: newdata,
                currentPage,
                isLoading: false,
                totalPage: res.result.page.totalPage,
                totalCount: res.result.page.totalCount,
              })
            }
          } else {
            wx.showToast({
              title: '获取商品失败',
              icon: 'none'
            })
          }
        })
    }

  },
  


  // 确认删除按钮点击事件
  choiceGoods(){

    // 检查是否有选中的商品
    if (!this.data.ids || this.data.ids.length === 0) {
      wx.showToast({
        title: '请先选择要删除的商品',
        icon: 'none',
        duration: 2000
      });
      return;
    }

    // 显示确认对话框
    wx.showModal({
      title: '确认删除',
      content: `确定要删除选中的${this.data.ids.length}个商品吗？`,
      confirmText: '确定删除',
      cancelText: '取消',
      confirmColor: '#ff4444',
      success: (res) => {
        if (res.confirm) {
          // 用户确认删除
          this._executeCancelSupplierGoods();
        }
      }
    });
  },

  // 执行删除供货商品
  _executeCancelSupplierGoods() {
    // 显示加载提示
    load.showLoading('正在删除商品...');
    
    // 添加调试日志
    console.log('准备删除的商品ID:', this.data.ids);
    console.log('选中的商品数量:', this.data.ids.length);
    
    // 将数组转换为逗号分隔的字符串
    const idsString = this.data.ids.join(',');
    console.log('转换后的ids字符串:', idsString);
    
    // 验证字符串格式
    if (!idsString || idsString.trim() === '') {
      wx.showToast({
        title: '没有选中的商品',
        icon: 'none',
        duration: 2000
      });
      return;
    }
    
    cancelSupplierGoods({
      ids: idsString
    })
      .then(res => {
        load.hideLoading();
        
        if (res.result.code == 0) {
          // 删除成功
          wx.showToast({
            title: '删除成功',
            icon: 'success',
            duration: 1500
          });
          
          // 重置页面数据
          this.setData({
            currentPage: 1,
            ids: [], // 清空选中的商品
            selectedGoods: [], // 清空选中的商品数组
            allSelected: false // 重置全选状态
          });
          
          // 刷新商品列表
          this._getFatherGoods();
        } else {
          // 删除失败
          wx.showToast({
            title: res.result.msg || '删除失败',
            icon: 'none',
            duration: 2000
          });
        }
      })
      .catch(error => {
        load.hideLoading();
        console.error('删除供货商品失败:', error);
        
        wx.showToast({
          title: '网络错误，删除失败',
          icon: 'none',
          duration: 2000
        });
      });
  },

  // 选择商品
  selectGoods(e) {
    // 阻止事件冒泡 - 微信小程序中使用 catchtap 而不是 stopPropagation
    const goodsId = e.currentTarget.dataset.id;
    const goodsItem = e.currentTarget.dataset.item;
    const goodsIndex = e.currentTarget.dataset.index;
    
    console.log('选择商品事件:', {
      goodsId: goodsId,
      goodsIdType: typeof goodsId,
      goodsIndex: goodsIndex,
      goodsItem: goodsItem
    });
    
    // 获取当前商品列表
    const goodsList = this.data.goodsList;
    const currentGoods = goodsList[goodsIndex];
    
    // 切换选中状态
    const isSelected = !currentGoods.selected;
    
    // 更新商品列表中的选中状态
    goodsList[goodsIndex].selected = isSelected;
    
    // 更新选中的商品ID数组
    let ids = this.data.ids || [];
    let selectedGoods = this.data.selectedGoods || [];
    
    if (isSelected) {
      // 添加到选中列表
      if (!ids.includes(goodsId)) {
        ids.push(goodsId);
        selectedGoods.push(goodsItem);
      }
    } else {
      // 从选中列表中移除
      ids = ids.filter(id => id !== goodsId);
      selectedGoods = selectedGoods.filter(item => item.nxDistributerGoodsId !== goodsId);
    }
    
    // 检查是否全选
    const allSelected = goodsList.length > 0 && goodsList.every(item => item.selected);
    
    // 更新页面数据
    this.setData({
      goodsList: goodsList,
      ids: ids,
      selectedGoods: selectedGoods,
      allSelected: allSelected
    });
    
    console.log('当前选中的商品:', selectedGoods);
    console.log('当前选中的商品ID:', ids);
  },

  // 全选/取消全选
  selectAllGoods() {
    const goodsList = this.data.goodsList;
    const allSelected = goodsList.every(item => item.selected);
    
    // 切换全选状态
    const newSelectedState = !allSelected;
    
    // 更新所有商品的选中状态
    goodsList.forEach(item => {
      item.selected = newSelectedState;
    });
    
    // 更新选中的商品ID数组
    let ids = [];
    let selectedGoods = [];
    
    if (newSelectedState) {
      // 全选
      ids = goodsList.map(item => item.nxDistributerGoodsId);
      selectedGoods = goodsList;
    }
    
    // 更新页面数据
    this.setData({
      goodsList: goodsList,
      ids: ids,
      selectedGoods: selectedGoods,
      allSelected: newSelectedState
    });
    
    wx.showToast({
      title: newSelectedState ? '已全选' : '已取消全选',
      icon: 'none',
      duration: 1000
    });
  },

  // 查看商品详情
  toEditGoodsImage(e) {
    const goods = e.currentTarget.dataset.goods;
    const item = e.currentTarget.dataset.item;
    const index = e.currentTarget.dataset.index;
    
    console.log('查看商品详情:', goods);
    
    // 这里可以跳转到商品详情页面
    wx.showModal({
      title: '商品详情',
      content: `商品名称: ${goods.nxDgGoodsName}\n商品品牌: ${goods.nxDgGoodsBrand || '无'}\n商品规格: ${goods.nxDgGoodsStandardname}`,
      showCancel: false,
      confirmText: '确定'
    });
  },

  toBack() {
    wx.navigateBack({
      delta: 1
    })
  },







})
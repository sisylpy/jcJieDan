var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config.js'
import {
  queryUnInventoriedShelfGoods
} from '../../../../lib/apiDistributer.js'

const app = getApp()

Page({
  data: {
    navBarHeight: 0,
    windowHeight: 0,
    windowWidth: 0,
    shelfId: '',
    shelfName: '',
    disId: '',
    userId: '',
    
    // 周期选择
    periodTypes: [
      { label: '日盘库', value: 1 },
      { label: '周盘库', value: 2 },
      { label: '月盘库', value: 3 }
    ],
    periodIndex: 1, // 默认选择周盘库
    inventoryType: 2, // 1=日，2=周，3=月
    
    // 日期选择
    inventoryDate: '',
    
    // 周选择（当前年第几周）
    weekOptions: [],
    weekIndex: 0,
    inventoryWeek: '',
    
    // 月选择
    monthOptions: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'],
    monthIndex: 0,
    inventoryMonth: '',
    
    // 商品列表
    shelfGoodsList: [],
    totalCount: 0,
    totalPage: 0,
    currentPage: 1,
    limit: 500, // 一次性加载所有未盘库商品
    
    // 弹窗
    showInventoryModal: false,
    selectedShelfGoods: null,
    selectedTotalRestWeight: 0
  },

  onLoad(options) {
    const globalData = app.globalData;
    
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      shelfId: options.shelfId || '',
      shelfName: decodeURIComponent(options.shelfName || '货架'),
      url: apiUrl.server
    });

    // 获取用户信息
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        disId: userInfo.nxDistributerEntity.nxDistributerId,
        userId: userInfo.nxDistributerUserId
      });
    }

    // 初始化周期选择
    this.initPeriod();
    
    // 加载数据
    this.loadInventoryGoods();
  },

  // 初始化周期选择
  initPeriod() {
    const now = new Date();
    
    // 初始化日期（今天）
    const today = now.getFullYear() + '-' + 
                  String(now.getMonth() + 1).padStart(2, '0') + '-' + 
                  String(now.getDate()).padStart(2, '0');
    this.setData({ inventoryDate: today });
    
    // 初始化周数（当前年第几周）
    const weekOptions = [];
    const currentWeek = this.getWeekNumber(now);
    for (let i = 1; i <= 53; i++) {
      weekOptions.push(`第${i}周`);
    }
    this.setData({ 
      weekOptions,
      weekIndex: currentWeek - 1,
      inventoryWeek: String(currentWeek)
    });
    
    // 初始化月份（当前月）
    const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
    this.setData({ 
      monthIndex: now.getMonth(),
      inventoryMonth: currentMonth
    });
  },

  // 获取当前是第几周
  getWeekNumber(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
  },

  // 周期类型改变
  onPeriodChange(e) {
    const index = parseInt(e.detail.value);
    const periodType = this.data.periodTypes[index];
    this.setData({
      periodIndex: index,
      inventoryType: periodType.value
    });
    this.loadInventoryGoods();
  },

  // 日期改变
  onDateChange(e) {
    this.setData({
      inventoryDate: e.detail.value
    });
    this.loadInventoryGoods();
  },

  // 周数改变
  onWeekChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      weekIndex: index,
      inventoryWeek: String(index + 1)
    });
    this.loadInventoryGoods();
  },

  // 月份改变
  onMonthChange(e) {
    const index = parseInt(e.detail.value);
    this.setData({
      monthIndex: index,
      inventoryMonth: this.data.monthOptions[index]
    });
    this.loadInventoryGoods();
  },

  // 加载未盘库商品
  loadInventoryGoods() {
    if (!this.data.shelfId) {
      wx.showToast({
        title: '货架ID不能为空',
        icon: 'none'
      });
      return;
    }

    // 验证周期参数，确保类型正确
    let params = {
      shelfId: parseInt(this.data.shelfId),
      inventoryType: parseInt(this.data.inventoryType), // 确保是整数
      page: 1,
      limit: parseInt(this.data.limit || 500)
    };

    if (this.data.inventoryType === 1) {
      if (!this.data.inventoryDate) {
        wx.showToast({
          title: '请选择盘库日期',
          icon: 'none'
        });
        return;
      }
      params.inventoryDate = this.data.inventoryDate;
    } else if (this.data.inventoryType === 2) {
      if (!this.data.inventoryWeek) {
        wx.showToast({
          title: '请选择盘库周数',
          icon: 'none'
        });
        return;
      }
      params.inventoryWeek = this.data.inventoryWeek;
    } else if (this.data.inventoryType === 3) {
      if (!this.data.inventoryMonth) {
        wx.showToast({
          title: '请选择盘库月份',
          icon: 'none'
        });
        return;
      }
      params.inventoryMonth = this.data.inventoryMonth;
    }

    load.showLoading('加载中...');
    queryUnInventoriedShelfGoods(params)
      .then(res => {
        load.hideLoading();
        if (res.result.code === 0) {
          const pageData = res.result.page || {};
          this.setData({
            shelfGoodsList: pageData.list || [],
            totalCount: pageData.totalCount || 0,
            totalPage: pageData.totalPage || 0,
            currentPage: pageData.currPage || 1
          });
        } else {
          wx.showToast({
            title: res.result.msg || '加载失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        load.hideLoading();
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        });
      });
  },

  // 计算商品总剩余数量
  getTotalRestWeight(item) {
    const stockList = item.nxDisGoodsShelfStockEntities || [];
    let total = 0;
    stockList.forEach(stock => {
      const weight = Number(stock.nxDgssRestWeight || 0);
      if (!isNaN(weight)) {
        total += weight;
      }
    });
    return total.toFixed(3).replace(/\.?0+$/, '');
  },

  // 点击商品
  onGoodsClick(e) {
    const item = e.currentTarget.dataset.item;
    const totalRestWeight = parseFloat(this.getTotalRestWeight(item));
    
    this.setData({
      selectedShelfGoods: item,
      selectedTotalRestWeight: totalRestWeight,
      showInventoryModal: true
    });
  },

  // 关闭盘库弹窗
  closeInventoryModal() {
    this.setData({
      showInventoryModal: false,
      selectedShelfGoods: null,
      selectedTotalRestWeight: 0
    });
  },

  // 盘库成功回调
  onInventorySuccess() {
    // 刷新列表
    this.loadInventoryGoods();
  },

  toBack() {
    wx.navigateBack({
      delta: 1
    });
  }
});


var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
var dateUtils = require('../../../../utils/dateUtil');
import * as echarts from '../../../ec-canvas/echarts';

import apiUrl from '../../../../config.js'

import {
  getNxPurGoodsStatisticsForDis,
} from '../../../../lib/apiDepOrder.js'

Page({

  onShow(){
    if(this.data.update){
      this._getSupplierStatistics();
    }
  },

  data: {
    ecDaily: {
      lazyLoad: false // 每日进货总额图表不使用延迟加载
    },
    ecPurUser: {
      lazyLoad: false // 采购员图表不使用延迟加载
    },
    ecSupplier: {
      lazyLoad: false // 供货商图表不使用延迟加载
    },
    ecCategory: {
      lazyLoad: false // 商品大类图表不使用延迟加载
    },
    categoryChartData: [], // 商品大类图表数据
    showAllGoods: false, // 是否显示所有商品（采购次数）
    showAllSubtotalGoods: false, // 是否显示所有采购金额商品
    showAllPriceGoods: false, // 是否显示所有单价波动商品
    topTimesGoods: [],
    topSubtotalGoods: [],
    topGoodsPrice: [],
    purUserData: [],
    supplierData: [],
  },

  onLoad: function (options) {
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      supplierIds: -1,
      purUserIds: -1,
      disId: options.disId,
    })
    var myDate = wx.getStorageSync('myDate');
      if(myDate){
        console.log("reeee", myDate)
          // 如果是自定义日期，传递具体的开始和结束日期
       var dateRange;
       if (myDate.name === 'custom' ) {
         dateRange = dateUtils.getDateRange(myDate.name, myDate.startDate, myDate.stopDate);
       } else {
         dateRange = dateUtils.getDateRange(myDate.name);
       }
       this.setData({
         startDate: dateRange.startDate,
         stopDate: dateRange.stopDate,
         dateType: myDate.dateType,
         hanzi: myDate.hanzi || dateRange.name,
       })
  
      }else{
        this.setData({
          dateType: 'month',
          startDate: dateUtils.getFirstDateInMonth(),
          stopDate: dateUtils.getArriveDate(0),
          hanzi:  "本月",
        })
      }

  
    this._getSupplierStatistics();
  },




  // 获取供货商统计信息
  _getSupplierStatistics() {
    var data = {
      purUserIds: this.data.purUserIds,
      supplierIds: this.data.supplierIds,
      disId: this.data.disId,
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      greatId: -1,
    };
    load.showLoading("获取数据中");
    getNxPurGoodsStatisticsForDis(data)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          console.log("========== nx 项目采购分析数据结构 ==========");
          console.log("返回数据的所有字段:", Object.keys(res.result.data));
          console.log("完整响应数据:", res.result.data);
          console.log("purTotal:", res.result.data.purTotal);
          console.log("purUserData:", res.result.data.purUserData);
          console.log("supplierData:", res.result.data.supplierData);
          console.log("topTimesGoods:", res.result.data.topTimesGoods, "长度:", res.result.data.topTimesGoods?.length || 0);
          if (res.result.data.topTimesGoods && res.result.data.topTimesGoods.length > 0) {
            const timesItem = res.result.data.topTimesGoods[0];
            console.log("topTimesGoods[0] 详细数据:", timesItem);
            console.log("采购次数字段 - nxDgQuantityDays:", timesItem.nxDgQuantityDays);
            console.log("商品名称:", timesItem.nxDgGoodsName);
            console.log("商品ID:", timesItem.nxDistributerGoodsId);
            console.log("图片字段 - nxDgNxFatherImg:", timesItem.nxDgNxFatherImg);
          }
          console.log("topSubtotalGoods:", res.result.data.topSubtotalGoods, "长度:", res.result.data.topSubtotalGoods?.length || 0);
          if (res.result.data.topSubtotalGoods && res.result.data.topSubtotalGoods.length > 0) {
            const subtotalItem = res.result.data.topSubtotalGoods[0];
            console.log("topSubtotalGoods[0] 详细数据:", subtotalItem);
            console.log("采购金额字段 - goodsPurTotalSubtotal:", subtotalItem.goodsPurTotalSubtotal);
            console.log("商品名称:", subtotalItem.nxDgGoodsName);
            console.log("商品ID:", subtotalItem.nxDistributerGoodsId);
          }
          console.log("topGoodsPrice:", res.result.data.topGoodsPrice, "长度:", res.result.data.topGoodsPrice?.length || 0);
          if (res.result.data.topGoodsPrice && res.result.data.topGoodsPrice.length > 0) {
            const priceItem = res.result.data.topGoodsPrice[0];
            console.log("topGoodsPrice[0] 详细数据:", priceItem);
            console.log("最低价字段 - nxDgGoodsLowestPrice:", priceItem.nxDgGoodsLowestPrice);
            console.log("最高价字段 - nxDgGoodsHighestPrice:", priceItem.nxDgGoodsHighestPrice);
            console.log("波动率字段 - goodsPriceFluctuation:", priceItem.goodsPriceFluctuation);
            console.log("差价字段 - goodsPriceDiff:", priceItem.goodsPriceDiff);
            console.log("单位字段 - nxDgGoodsStandardname:", priceItem.nxDgGoodsStandardname);
          }
          console.log("purUserData:", res.result.data.purUserData);
          if (res.result.data.purUserData && res.result.data.purUserData.length > 0) {
            console.log("purUserData[0]:", res.result.data.purUserData[0]);
            console.log("purUserData[0] 所有字段:", Object.keys(res.result.data.purUserData[0]));
          }
          console.log("supplierData:", res.result.data.supplierData);
          if (res.result.data.supplierData && res.result.data.supplierData.length > 0) {
            console.log("supplierData[0]:", res.result.data.supplierData[0]);
            console.log("supplierData[0] 所有字段:", Object.keys(res.result.data.supplierData[0]));
          }
          console.log("topSubtotalGoodsSubtotal:", res.result.data.topSubtotalGoodsSubtotal);
          console.log("topSubtotalGoodsPercent:", res.result.data.topSubtotalGoodsPercent);
          console.log("=============================================");
          
          // 确保所有字段都有默认值，处理可能缺失的字段
          const data = res.result.data || {};
          this.setData({
            supplierItem: data,
            purTotal: data.purTotal || "0",
            purUserData: Array.isArray(data.purUserData) ? data.purUserData : [],
            supplierData: Array.isArray(data.supplierData) ? data.supplierData : [],
            topTimesGoods: Array.isArray(data.topTimesGoods) ? data.topTimesGoods : [],
            topSubtotalGoods: Array.isArray(data.topSubtotalGoods) ? data.topSubtotalGoods : [],
            topSubtotalGoodsSubtotal: data.topSubtotalGoodsSubtotal || "0",
            topSubtotalGoodsPercent: data.topSubtotalGoodsPercent || "0",
            topGoodsPrice: Array.isArray(data.topGoodsPrice) ? data.topGoodsPrice : [],
            arr: data.arr || [],
            mapEveryDay: data, // 用于判断是否有数据
          }, () => {
            this.init_purUser_chart();
            this.init_supplier_chart();
          });
        } else {
          this.setData({
            mapEveryDay: null
          })
          load.hideLoading();
          load.showToast(res.result.msg || '获取统计信息失败');
        }
      })
      .catch(err => {
        load.hideLoading();
        load.showToast('网络请求失败');
        console.error('统计信息接口失败:', err);
      });
  },


  // 初始化采购员采购总额图表
  init_purUser_chart: function () {
    var that = this;
    
    that.purUserEchartsComponent = that.selectComponent('#purUserChart');    
    if (!that.purUserEchartsComponent) {
      return;
    }
    
    that.purUserEchartsComponent.init((canvas, width, height) => {
      const Chart = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: globalData.rpxR
      });
      
      const option = that.getPurUserChartOption();
      Chart.setOption(option);
      
      return Chart;
    });
  },

  // 初始化供货商采购总额图表
  init_supplier_chart: function () {
    var that = this;
    
    that.supplierEchartsComponent = that.selectComponent('#supplierChart');    
    if (!that.supplierEchartsComponent) {
      return;
    }
    
    that.supplierEchartsComponent.init((canvas, width, height) => {
      const Chart = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: globalData.rpxR
      });
      
      const option = that.getSupplierChartOption();
      Chart.setOption(option);
      
      return Chart;
    });
  },


  // 获取采购员采购总额图表配置
  getPurUserChartOption() {
    const purUserData = this.data.purUserData || [];
    
    if (!purUserData || purUserData.length === 0) {
      return {
        title: { text: '暂无采购员数据', left: 'center', top: 'center' }
      };
    }
    
    // 提取采购员名称和采购总额
    const names = purUserData.map(item => item.name || item.purUserName || '未知采购员');
    const amounts = purUserData.map(item => parseFloat(item.totalAmount || item.purTotalAmount) || 0);
    
    return {
      tooltip: {
        show: false
      },
      grid: {
        left: '2%',
        right: '2%',
        bottom: '0',
        top: '20%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: names,
        axisLine: {
          lineStyle: {
            color: '#999'
          }
        },
        axisLabel: {
          color: '#666',
          fontSize: 12,
          rotate: 45,
          formatter: function(value, index) {
            const amount = amounts[index];
            return value + '\n' + amount + '元';
          },
          lineHeight: 16
        },
        splitLine: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        name: '金额(元)',
        position: 'right',
        nameTextStyle: {
          color: '#666',
          fontSize: 12
        },
        axisLine: {
          lineStyle: {
            color: '#999'
          }
        },
        axisLabel: {
          color: '#666',
          fontSize: 12
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#f0f0f0',
            type: 'dashed'
          }
        }
      },
      series: [
        {
          name: '采购总额',
          type: 'bar',
          data: amounts,
          itemStyle: {
            color: '#66bb6a',
            borderRadius: [4, 4, 0, 0]
          },
          emphasis: {
            itemStyle: {
              color: '#4caf50'
            }
          },
          barWidth: amounts.length === 1 ? '30%' : (amounts.length <= 3 ? '50%' : '60%')
        }
      ]
    };
  },

  // 获取供货商采购总额图表配置
  getSupplierChartOption() {
    const supplierData = this.data.supplierData || [];
    
    if (!supplierData || supplierData.length === 0) {
      return {
        title: { text: '暂无供货商数据', left: 'center', top: 'center' }
      };
    }
    
    // 获取供货商名称和采购总额
    const names = supplierData.map(item => item.name || item.supplierName || '未知供货商');
    const amounts = supplierData.map(item => parseFloat(item.totalAmount || item.supplierTotalAmount) || 0);
    
    return {
      tooltip: {
        show: false
      },
      grid: {
        left: '2%',
        right: '2%',
        bottom: '0',
        top: '20%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: names,
        axisLine: {
          lineStyle: {
            color: '#999'
          }
        },
        axisLabel: {
          color: '#666',
          fontSize: 12,
          rotate: 45,
          formatter: function(value, index) {
            const amount = amounts[index];
            return value + '\n' + amount + '元';
          },
          lineHeight: 16
        },
        splitLine: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        name: '金额(元)',
        position: 'right',
        nameTextStyle: {
          color: '#666',
          fontSize: 12
        },
        axisLine: {
          lineStyle: {
            color: '#999'
          }
        },
        axisLabel: {
          color: '#666',
          fontSize: 12
        },
        splitLine: {
          show: true,
          lineStyle: {
            color: '#f0f0f0',
            type: 'dashed'
          }
        }
      },
      series: [
        {
          name: '采购总额',
          type: 'bar',
          data: amounts,
          itemStyle: {
            color: '#ffa726',
            borderRadius: [4, 4, 0, 0]
          },
          emphasis: {
            itemStyle: {
              color: '#ff9800'
            }
          },
          barWidth: amounts.length === 1 ? '30%' : (amounts.length <= 3 ? '50%' : '60%')
        }
      ]
    };
  },

  toDatePageSearch() {
    this.setData({
      update: true,
    })
    wx.navigateTo({
      url: '../../sel/searchDate/searchDate?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType,
    })
  },

  showSearch() {
    this.setData({
      showSearch: true,
    })
  },

  searchData(e) {
    this.setData({
      showSearch: false,
      type: e.currentTarget.dataset.type,
      typeString: e.currentTarget.dataset.string,
      currentPage: 1,
      dailyChartDrawn: false
    });
    this._getInitData();
  },

  // 获取初始数据
  _getInitData() {
    this.setData({
      dailyChartDrawn: false
    });
    this._getSupplierStatistics();
  },


  toGoodsPage(e){

    var id = e.currentTarget.dataset.id;
    wx.setStorageSync('disGoods', e.currentTarget.dataset.goods);

    wx.navigateTo({
      url: '../goodsFenxiPurchase/goodsFenxiPurchase?disGoodsId=' + id ,
    })

  },

  // 切换商品列表展开/收起
  toggleGoodsList() {
    this.setData({
      showAllGoods: !this.data.showAllGoods
    });
  },

  // 切换采购金额商品列表展开/收起
  toggleSubtotalGoodsList() {
    this.setData({
      showAllSubtotalGoods: !this.data.showAllSubtotalGoods
    });
  },

  // 切换单价波动商品列表展开/收起
  togglePriceGoodsList() {
    this.setData({
      showAllPriceGoods: !this.data.showAllPriceGoods
    });
  },  



  toPurchaser(){
    wx.navigateTo({
      url: '../staff/staff',
    })
  },

  toSupplier(){
    wx.navigateTo({
      url: '../../../../subPackage-supplier/pages/supplier/index/index',
    })
  },

  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },
  
})
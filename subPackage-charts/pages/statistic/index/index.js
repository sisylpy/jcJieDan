const globalData = getApp().globalData;

import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil')
import * as echarts from '../../../ec-canvas/echarts';

import {

  disGetPurchaseDate

} from '../../../../lib/apiDepOrder'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    ecDaily: {
      lazyLoad: false // 每日进货总额图表不使用延迟加载
    },
    sliderOffset: 0,
    sliderOffsets: [],
    sliderLeft: 0,
    tab1Index: 0,
    itemIndex: 0,
    tabs: ["1", "2"],

    itemIndexDep: 0,
    tab1IndexDep: 0,
    update: false,
    arr: [], // 统计数据数组
    allTotal: 0,
    costTotal: 0,
    costTotalPer: 0,
    costPerDay: 0,
    zicaiTotal: 0,
    dinghuoTotal: 0,
    purchasePerDay: 0,
    windowWidth: 0,
    windowHeight: 0,

  },

  onShow() {
 
    if(this.data.update){
      var myDate = wx.getStorageSync('myDate');
      if (myDate) {
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
          update: false
        })
      } 
  
      this._initListData();
    }
 
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
      disId: options.disId
    
    })

    var myDate = wx.getStorageSync('myDate');
    if(myDate){
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


   
    this._initListData();
  },




  // 1 swiper 

  _initListData() {
    load.showLoading("获取数据中")
   
    var costData = {
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      disId: this.data.disId,
    }

    disGetPurchaseDate(costData).then(res => {
     console.log("res.reus", res.result.data)
      if (res.result.code == 0) {
        load.hideLoading();
      
        // 字段映射：GB → NX
        console.log("统计接口返回的数据:", res.result.data);
        console.log("第一条数据:", res.result.data.arr[0]);
        
        this.setData({
          allTotal: res.result.data.allTotal,
          costTotal: res.result.data.costTotal,
          costTotalPer: res.result.data.costTotal, // NX没有本期支出，用总支出代替
          costPerDay: res.result.data.costPerDay,
          // NX字段
          zicaiTotal: res.result.data.zicaiTotal,
          dinghuoTotal: res.result.data.dinghuoTotal,
          purchasePerDay: res.result.data.purchasePerDay,
          // GB字段（兼容）
          purchaseTotal: res.result.data.zicaiTotal,
          orderTotal: res.result.data.dinghuoTotal,
          arr: res.result.data.arr,
        }, () => {
          // setData 完成后再初始化图表，确保数据已更新
          console.log('setData 完成，开始初始化图表');
          console.log('当前 arr 数据:', this.data.arr);
          // 延迟一下确保 DOM 更新完成
          setTimeout(() => {
            this.init_combined_chart();
          }, 100);
        });
      }else{
        this.setData({
          arr: []
        })
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }

    })


  },

  // 初始化合并图表（采购+成本）
  init_combined_chart: function () {
    var that = this;

    console.log('=== 初始化图表 ===');
    console.log('arr数据:', that.data.arr);
    console.log('arr长度:', that.data.arr ? that.data.arr.length : 0);

    that.dailyEchartsComponent = that.selectComponent('#dailyChart');
    if (!that.dailyEchartsComponent) {
      console.error('未找到图表组件 dailyChart');
      return;
    }
    
    console.log('找到图表组件，开始初始化');
    
    that.dailyEchartsComponent.init((canvas, width, height) => {
      console.log('图表组件 init 回调执行');
      console.log('canvas尺寸:', { width, height });
      
      const Chart = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: globalData.rpxR
      });
      
      const option = that.getCombinedChartOption();
      console.log('图表配置 option:', option);

      Chart.setOption(option);

      that.setData({
        dailyChartDrawn: true
      });
      
      console.log('图表设置完成');
      return Chart;
    });
  },

  // 获取合并图表配置（采购+成本）
  getCombinedChartOption() {
    const purchaseArr = this.data.arr || [];
    const costDayData = this.data.costDayData || {};
    
    console.log('=== 图表配置 ===');
    console.log('purchaseArr:', purchaseArr);
    console.log('purchaseArr.length:', purchaseArr.length);
    
    if (!purchaseArr || purchaseArr.length === 0) {
      console.log('图表数据为空，返回暂无数据配置');
      return {
        title: {
          text: '暂无数据',
          left: 'center',
          top: 'center'
        }
      };
    }

    // 处理采购数据 - NX系统：purTotal = zicai + dinghuo
    const purchaseDates = purchaseArr.map(item => {
      if (!item.day) {
        console.warn('数据项缺少 day 字段:', item);
        return '';
      }
      const dayParts = item.day.split('-');
      return dayParts.length >= 3 ? dayParts[2] : item.day;
    });
    
    const purchaseAmounts = purchaseArr.map(item => {
      const zicai = parseFloat(item.zicai) || 0;
      const dinghuo = parseFloat(item.dinghuo) || 0;
      const directStock = parseFloat(item.directStock) || 0; // 直接入库
      const total = zicai + dinghuo + directStock;
      console.log('采购数据项:', { day: item.day, zicai, dinghuo, directStock, total });
      return total.toFixed(2);
    });

    // 处理成本数据 - 从arr数组中获取costTotal
    const costAmounts = purchaseArr.map(item => {
      const cost = parseFloat(item.costTotal) || 0;
      console.log('成本数据项:', { day: item.day, costTotal: item.costTotal, cost });
      return cost;
    });
    
    console.log('处理后的数据:');
    console.log('purchaseDates:', purchaseDates);
    console.log('purchaseAmounts:', purchaseAmounts);
    console.log('costAmounts:', costAmounts);

    return {
      // 禁用所有交互功能
      animation: false,
      tooltip: {
        show: false // 禁用提示框
      },

      // legend: {
      //   data: ['采购金额', '成本金额'],
      //   top: 10,
      //   textStyle: {
      //     fontSize: 12
      //   }
      // },

      grid: {
        left: '3%',
        right: '3%',
        bottom: '8%',
        top: '15%',
        containLabel: true
      },
      xAxis: {
        type: 'category',
        data: purchaseDates,
        axisLine: {
          lineStyle: {
            color: '#999'
          }
        },
        axisLabel: {
          color: '#666',
          fontSize: 12,
          rotate: 45
        },
        splitLine: {
          show: false
        }
      },
      yAxis: {
        type: 'value',
        name: '金额(元)',
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
      series: [{
          name: '采购金额',
          type: 'bar',
          data: purchaseAmounts,
          itemStyle: {
            color: '#007aff',
            borderRadius: [4, 4, 0, 0]
          },
          // 禁用交互
          silent: true,
          emphasis: {
            disabled: true // 禁用高亮效果
          },
          barWidth: '30%'
        },
        {
          name: '成本金额',
          type: 'bar',
          data: costAmounts,
          itemStyle: {
            color: '#05c0a7',
            borderRadius: [4, 4, 0, 0]
          },
          // 禁用交互
          silent: true,
          emphasis: {
            disabled: true // 禁用高亮效果
          },
          barWidth: '30%'
        }
      ]
    };
  },

 
  // 获取中文星期几
  getChineseWeekDay(dateString) {
    try {
      var date = new Date(dateString);
      var dayOfWeek = date.getDay();
      var weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
      return weekDays[dayOfWeek];
    } catch (error) {
      console.error('获取星期几失败:', error);
      return '未知';
    }
  },

  toDatePage() {
    console.log("dddfd")
    this.setData({
      update: true
    })
    wx.navigateTo({
      url: '/subPackage-charts/pages/sel/date/date?startDate=' + this.data.startDate +
        '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType,
    })
  },




  toPurGoodsFenxi(e) {
    var item = e.currentTarget.dataset.item;
    var day = item.day;
    // NX系统：purTotal = zicai + dinghuo
    var zicai = parseFloat(item.zicai) || 0;
    var dinghuo = parseFloat(item.dinghuo) || 0;
    var purTotal = (zicai + dinghuo).toFixed(2);    
    // 使用公共方法获取中文星期几
    var week = this.getChineseWeekDay(day);

    wx.navigateTo({
      url: '../purGoodsByDate/purGoodsByDate?startDate=' + day  + '&stopDate=' + day + '&disId=' +
        this.data.disId  + '&hanzi=' + week + '&dateType=customer&value=' + purTotal + '&purTotal=' + this.data.allTotal + '&id=-1'
    })
  },


  toFenxiDate(e) {
    var index = e.currentTarget.dataset.index;
    var purchaseDate = this.data.arr[index].day;
    var costValue = this.data.arr[index].costTotal;
    // 使用公共方法获取中文星期几
    var week = this.getChineseWeekDay(purchaseDate);
    
    const url = '../costGoodsByDate/costGoodsByDate?disId=' + this.data.disId + '&startDate=' + purchaseDate + '&stopDate=' + purchaseDate + '&dateType=customer&fenxiType=costEcharts&searchDepId=-1&value=' + costValue + '&allCostTotal=' + this.data.costTotal + '&id=-1&type=sales&hanzi=' + week ;
    wx.navigateTo({
      url: url,

    })
  },




  // NX系统暂不支持采购员/供应商筛选功能



  // NX系统暂不支持筛选功能


  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },





})
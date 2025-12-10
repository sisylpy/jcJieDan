var load = require('../../../../lib/load.js');

let windowWidth = 0;
let itemWidth = 0;

import {
  getDate
} from '../../../../lib/apiDepOrder.js'


Page({

  /**
   * 页面的初始数据
   */
  data: {
    tabs: [
      "日期",
      "星期",
      "月份",
      "自定义"
    ],


    sliderOffset: 0,
    sliderOffsets: [],
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const app = getApp();
    const globalData = app.globalData;

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      startDate: options.startDate,
      stopDate: options.stopDate,
      dateType: options.dateType,

    })
    var datetype = this.data.dateType;
    if (datetype != null) {

      if (datetype == 'day') {
        this.setData({
          tab1Index: 0,
          itemIndex: 0,
        })
      }
      if (datetype == 'week') {
        this.setData({
          tab1Index: 1,
          itemIndex: 1,
        })
      }
      if (datetype == 'month') {
        this.setData({
          tab1Index: 2,
          itemIndex: 2,
        })
      }
    } if (datetype == 'selfDate')  {
      this.setData({
        tab1Index: 3,
        itemIndex: 3,

      })
    }



    this._initData();
    this.clueOffset();

  },

  _initData() {
    getDate().then(res => {
      if (res.result.code == 0) {
        console.log(res.result.data)
        this.setData({
          dayMap: res.result.data.day || {},
          weekMap: res.result.data.week || {},
          monthArr: res.result.data.month || {},
        })
      }
    }).catch(err => {
      console.error('获取日期数据失败:', err);
      // 设置默认值，避免后续访问 null 属性
      this.setData({
        dayMap: {},
        weekMap: {},
        monthArr: {},
      })
    })
  },

  selectDay(e) {
  
    var pages = getCurrentPages();
    
    // 确保有上一个页面
    if (pages.length < 2) {
      console.error('没有上一个页面');
      return;
    }
  
    var prevPage = pages[pages.length - 2]; //上一个页面
    
    // 确保 prevPage 存在且有 setData 方法
    if (!prevPage || typeof prevPage.setData !== 'function') {
      console.error('上一个页面不存在或无效');
      return;
    }
    
    // 获取日期数据，确保不为 null 或 undefined
    var dateType = e.currentTarget.dataset.type || '';
    var startDate = e.currentTarget.dataset.startdate || '';
    var stopDate = e.currentTarget.dataset.stopdate || '';
    
    // 验证日期数据
    if (!startDate || !stopDate) {
      console.error('日期数据无效:', { startDate, stopDate, dateType });
      wx.showToast({
        title: '日期数据无效',
        icon: 'none'
      });
      return;
    }
    
    //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
    try {
      prevPage.setData({
        update: true,
        updateMyDate: false,
        dateType: dateType,
        startDate: startDate,
        stopDate: stopDate,
      })
    } catch (err) {
      console.error('调用 prevPage.setData 时出错:', err);
      wx.showToast({
        title: '设置日期失败',
        icon: 'none'
      });
      return;
    }
    
    console.log("selectDayselectDay")
    var myDate = {
      startDate: startDate,
      stopDate: stopDate,
      dateType: dateType
    }
    wx.setStorageSync('myDate', myDate)
    wx.navigateBack({
      delta: 1,
    })
  },

  _countCompareData(e) {
    var startData = e.currentTarget.dataset.startdate;
    var newDate = new Date(startData);
    newDate.setTime(newDate.getTime() - 24 * 60 * 60 * 1000);
    var weeks = new Array("星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六");
    var day = newDate.getDay();
    var week = "";
    if (day == 7) {
      week = "星期日"
    } else {
      week = weeks[day];
    }

    var year = newDate.getFullYear()
    var date = newDate.getDate();
    var month = newDate.getMonth() + 1;
    if (date < 10) {
      date = '0' + date;
    }
    if (month < 10) {
      month = '0' + month;
    }
    var s3 = year + "-" + month + "-" + date
    var lastWeek = new Date(startData);
    lastWeek.setTime(newDate.getTime() - 24 * 60 * 60 * 1000 * 6);

    var weeks = new Array("星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六");
    var day = lastWeek.getDay();
    var weekLast = "";
    if (day == 7) {
      weekLast = "星期日"
    } else {
      weekLast = weeks[day];
    }

    var year = lastWeek.getFullYear()
    var date = lastWeek.getDate();
    var month = lastWeek.getMonth() + 1;
    if (date < 10) {
      date = '0' + date;
    }
    if (month < 10) {
      month = '0' + month;
    }
    var s3lastWeekDate = year + "-" + month + "-" + date
    this.setData({
      lastDate: s3,
      lastWeek: week,
      lastWeekSameDate: s3lastWeekDate,
      lastWeekSameDay: weekLast
    })

  },


  _countComareDataWeek(e) {
    var startData = e.currentTarget.dataset.startdate;
    var stopDate = e.currentTarget.dataset.stopdate;
    var newDate = new Date(startData);
    newDate.setTime(newDate.getTime() - 24 * 60 * 60 * 1000);

    var weeks = new Array("星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六");
    var day = newDate.getDay();
    var week = "";
    if (day == 7) {
      week = "星期日"
    } else {
      week = weeks[day];
    }

    var year = newDate.getFullYear()
    var date = newDate.getDate();
    var month = newDate.getMonth() + 1;
    if (date < 10) {
      date = '0' + date;
    }
    if (month < 10) {
      month = '0' + month;
    }
    var s3 = year + "-" + month + "-" + date
    var lastWeek = new Date(startData);
    lastWeek.setTime(newDate.getTime() - 24 * 60 * 60 * 1000 * 6);

    var weeks = new Array("星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六");
    var day = lastWeek.getDay();
    var weekLast = "";
    if (day == 7) {
      weekLast = "星期日"
    } else {
      weekLast = weeks[day];
    }

    var year = lastWeek.getFullYear()
    var date = lastWeek.getDate();
    var month = lastWeek.getMonth() + 1;
    if (date < 10) {
      date = '0' + date;
    }
    if (month < 10) {
      month = '0' + month;
    }
    var s3lastWeekDate = year + "-" + month + "-" + date
    this.setData({
      lastDate: s3,
      lastWeek: week,
      lastWeekSameDate: s3lastWeekDate,
      lastWeekSameDay: weekLast
    })
  },



  _countComareDataMonth(e) {
    var startData = e.currentTarget.dataset.startdate;
    var stopDate = e.currentTarget.dataset.stopdate;
    var newDate = new Date(startData);
    newDate.setTime(newDate.getTime() - 24 * 60 * 60 * 1000);

    var weeks = new Array("星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六");
    var day = newDate.getDay();
    var week = "";
    if (day == 7) {
      week = "星期日"
    } else {
      week = weeks[day];
    }

    var year = newDate.getFullYear()
    var date = newDate.getDate();
    var month = newDate.getMonth() + 1;
    if (date < 10) {
      date = '0' + date;
    }
    if (month < 10) {
      month = '0' + month;
    }
    var s3 = year + "-" + month + "-" + date
    var lastWeek = new Date(startData);
    lastWeek.setTime(newDate.getTime() - 24 * 60 * 60 * 1000 * 6);

    var weeks = new Array("星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六");
    var day = lastWeek.getDay();
    var weekLast = "";
    if (day == 7) {
      weekLast = "星期日"
    } else {
      weekLast = weeks[day];
    }

    var year = lastWeek.getFullYear()
    var date = lastWeek.getDate();
    var month = lastWeek.getMonth() + 1;
    if (date < 10) {
      date = '0' + date;
    }
    if (month < 10) {
      month = '0' + month;
    }
    var s3lastWeekDate = year + "-" + month + "-" + date
    this.setData({
      lastDate: s3,
      lastWeek: week,
      lastWeekSameDate: s3lastWeekDate,
      lastWeekSameDay: weekLast
    })
  },


  /**
   * 计算偏移量
   */
  clueOffset() {
    var that = this;

    wx.getSystemInfo({
      success: function (res) {
        itemWidth = Math.ceil(res.windowWidth / that.data.tabs.length);
        let tempArr = [];
        for (let i in that.data.tabs) {
          tempArr.push(itemWidth * i);
        }
        // tab 样式初始化
        var index = that.data.tab1Index || 0; // 如果 tab1Index 未定义，默认为 0
        windowWidth = res.windowWidth;
        that.setData({
          sliderOffsets: tempArr,
          sliderOffset: tempArr[index] || 0, // 如果索引超出范围，默认为 0
          sliderLeft: 0,

        });
      }
    });
  },

  /**
   * tabItme点击
   */
  onTab1Click(event) {
    let index = event.currentTarget.dataset.index;
    // 确保 sliderOffsets 存在且 index 有效
    if (this.data.sliderOffsets && this.data.sliderOffsets.length > index) {
      this.setData({
        sliderOffset: this.data.sliderOffsets[index] || 0,
        tab1Index: index,
        itemIndex: index,
        inventoryType: index + 1,
      })
    }
  },


  /**
   * 动画结束时会触发 animationfinish 事件
   */
  animationfinish(event) {
    console.log("findiis")
    const current = event.detail.current || 0;
    // 确保 sliderOffsets 存在且 current 有效
    if (this.data.sliderOffsets && this.data.sliderOffsets.length > current) {
      this.setData({
        sliderOffset: this.data.sliderOffsets[current] || 0,
        tab1Index: current,
        itemIndex: current,
      })
    }
  },


  bindChange(e) {
    this.setData({
      startDate: e.detail.value
    })
  },

  bindChangeStop(e) {
    this.setData({
      stopDate: e.detail.value
    })
  },


  selectSelfDate() {
    console.log("selldatae");
    var myDate = {
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      dateType: "selfDate"
    }
 
    wx.setStorageSync('myDate', myDate)
    let pages = getCurrentPages();
    let prevPage = pages[pages.length - 2];
    prevPage.setData({
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      dateType: "selfDate",
      update: true,
    })
    wx.navigateBack({
      delta: 1,
    })
  },




  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },

})
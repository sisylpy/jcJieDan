var load = require('../../../lib/load.js');
const globalData = getApp().globalData;

let windowWidth = 0;
let itemWidth = 0;

import {
  getDate
} from '../../../lib/apiDepOrder.js'


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
    } if (datetype == 'customer')  {
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
          dayMap: res.result.data.day,
          weekMap: res.result.data.week,
          monthArr: res.result.data.month,
        })
      }
    })
  },

  selectDay(e) {
  
    var pages = getCurrentPages();
  
    var prevPage = pages[pages.length - 2]; //上一个页面
    //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
    prevPage.setData({
      dateType: e.currentTarget.dataset.type,
      startDate: e.currentTarget.dataset.startdate,
      stopDate: e.currentTarget.dataset.stopdate,
      hanzi: e.currentTarget.dataset.hanzi,
      update:true,
    })
   
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
        var index = that.data.tab1Index;
        windowWidth = res.windowWidth;
        that.setData({
          sliderOffsets: tempArr,
          sliderOffset: tempArr[index],
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
    this.setData({
      sliderOffset: this.data.sliderOffsets[index],
      tab1Index: index,
      itemIndex: index,
      inventoryType: index + 1,
    })
  },


  /**
   * 动画结束时会触发 animationfinish 事件
   */
  animationfinish(event) {
    console.log("findiis")
    this.setData({
      sliderOffset: this.data.sliderOffsets[event.detail.current],
      tab1Index: event.detail.current,
      itemIndex: event.detail.current,
    })
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
      dateType: "customer",
      name: "custom"
    }
 
    wx.setStorageSync('myDate', myDate)
    let pages = getCurrentPages();
    let prevPage = pages[pages.length - 2];
    prevPage.setData({
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      dateType: "customer",
      update: true,
    })
    
    // 给所有前面的页面都设置 update: true
    // 确保至少有3个页面（当前页面、上一个页面、再前面的页面）
    if (pages.length >= 3) {
      for (let i = 0; i < pages.length - 2; i++) {
        pages[i].setData({
          update: true
        });
      }
    }
    
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
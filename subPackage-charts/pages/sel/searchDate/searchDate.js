var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;

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
    console.log('=== searchDate onLoad 页面加载 ===');
    console.log('接收到的参数:', options);
    console.log('startDate:', options.startDate);
    console.log('stopDate:', options.stopDate);
    console.log('dateType:', options.dateType);
    
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      startDate: options.startDate,
      stopDate: options.stopDate,
      dateType: options.dateType,

    });
    
    var datetype = this.data.dateType;
    console.log('解析后的 dateType:', datetype);
    
    if (datetype != null) {
      if (datetype == 'day') {
        console.log('设置为日期标签页 (索引 0)');
        this.setData({
          tab1Index: 0,
          itemIndex: 0,
        });
      }
      if (datetype == 'week') {
        console.log('设置为星期标签页 (索引 1)');
        this.setData({
          tab1Index: 1,
          itemIndex: 1,
        });
      }
      if (datetype == 'month') {
        console.log('设置为月份标签页 (索引 2)');
        this.setData({
          tab1Index: 2,
          itemIndex: 2,
        });
      }
    } 
    if (datetype == 'customer')  {
      console.log('设置为自定义标签页 (索引 3)');
      this.setData({
        tab1Index: 3,
        itemIndex: 3,
      });
    }

    console.log('初始化数据...');
    this._initData();
    this.clueOffset();
    console.log('=== searchDate onLoad 结束 ===');
  },

  _initData() {
    console.log('=== searchDate _initData 开始获取日期数据 ===');
    getDate().then(res => {
      if (res.result.code == 0) {
        console.log('获取到的日期数据:', res.result.data);
        console.log('dayMap:', res.result.data.day);
        console.log('dayMap.today:', res.result.data.day ? res.result.data.day.today : '不存在');
        if (res.result.data.day && res.result.data.day.today) {
          console.log('today 详细信息:', {
            todayStartDate: res.result.data.day.today.todayStartDate,
            todayStopDate: res.result.data.day.today.todayStopDate,
            todayString: res.result.data.day.today.todayString,
            todayWeek: res.result.data.day.today.todayWeek
          });
        }
        this.setData({
          dayMap: res.result.data.day,
          weekMap: res.result.data.week,
          monthArr: res.result.data.month,
        });
        console.log('日期数据已设置到 data');
        console.log('=== searchDate _initData 结束 ===');
      } else {
        console.error('获取日期数据失败，code:', res.result.code);
      }
    }).catch(err => {
      console.error('获取日期数据异常:', err);
    });
  },

  selectDay(e) {
    console.log('=== searchDate selectDay 开始 ===');
    console.log('完整事件对象:', e);
    console.log('e.currentTarget:', e.currentTarget);
    console.log('e.currentTarget.dataset:', e.currentTarget.dataset);
    console.log('所有 dataset 属性:', Object.keys(e.currentTarget.dataset || {}));
    
    var pages = getCurrentPages();
    var prevPage = pages[pages.length - 2]; //上一个页面
    
    // 获取选择的日期信息
    var dateType = e.currentTarget.dataset.type;
    var dateName = e.currentTarget.dataset.name || '';
    var hanzi = e.currentTarget.dataset.hanzi || '';
    var startDate = e.currentTarget.dataset.startdate;
    var stopDate = e.currentTarget.dataset.stopdate;
    
    console.log('提取的日期信息:', {
      dateType: dateType,
      dateName: dateName,
      hanzi: hanzi,
      startDate: startDate,
      stopDate: stopDate
    });
    
    // 验证关键字段
    if (!dateName) {
      console.error('⚠️ 警告: dateName 为空！');
      console.error('dataset.name 值:', e.currentTarget.dataset.name);
    }
    if (!dateType) {
      console.error('⚠️ 警告: dateType 为空！');
    }
    
    // searchDate 页面是临时查询，不缓存到 storage，只通过页面传递数据
    console.log('准备传递的日期数据:', {
      dateType: dateType,
      startDate: startDate,
      stopDate: stopDate,
      hanzi: hanzi
    });
    
    //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
    // 使用回调确保数据设置完成后再返回
    prevPage.setData({
      dateType: dateType,
      startDate: startDate,
      stopDate: stopDate,
      hanzi: hanzi,
      update: true,
    }, () => {
      console.log('已设置 prevPage 数据:', {
        dateType: dateType,
        startDate: startDate,
        stopDate: stopDate,
        hanzi: hanzi,
        update: true
      });
      console.log('验证 prevPage 数据:', {
        dateType: prevPage.data.dateType,
        startDate: prevPage.data.startDate,
        stopDate: prevPage.data.stopDate,
        hanzi: prevPage.data.hanzi,
        update: prevPage.data.update
      });
      console.log('=== searchDate selectDay 结束 ===');
      
      // 确保数据设置完成后再返回
      wx.navigateBack({
        delta: 1,
      });
    });
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
    console.log('=== searchDate onTab1Click 标签页点击 ===');
    let index = event.currentTarget.dataset.index;
    console.log('点击的标签索引:', index);
    console.log('标签名称:', this.data.tabs[index]);
    console.log('当前 tab1Index:', this.data.tab1Index);
    console.log('新的 tab1Index:', index);
    this.setData({
      sliderOffset: this.data.sliderOffsets[index],
      tab1Index: index,
      itemIndex: index,
      inventoryType: index + 1,
    });
    console.log('标签页切换完成');
    console.log('=== searchDate onTab1Click 结束 ===');
  },


  /**
   * 动画结束时会触发 animationfinish 事件
   */
  animationfinish(event) {
    console.log('=== searchDate animationfinish 滑动动画结束 ===');
    console.log('当前滑动到的索引:', event.detail.current);
    console.log('之前的 tab1Index:', this.data.tab1Index);
    this.setData({
      sliderOffset: this.data.sliderOffsets[event.detail.current],
      tab1Index: event.detail.current,
      itemIndex: event.detail.current,
    });
    console.log('新的 tab1Index:', event.detail.current);
    console.log('=== searchDate animationfinish 结束 ===');
  },


  bindChange(e) {
    console.log('=== searchDate bindChange 开始日期选择器变化 ===');
    console.log('选择的开始日期:', e.detail.value);
    console.log('之前的开始日期:', this.data.startDate);
    this.setData({
      startDate: e.detail.value
    });
    console.log('开始日期已更新为:', e.detail.value);
    console.log('=== searchDate bindChange 结束 ===');
  },

  bindChangeStop(e) {
    console.log('=== searchDate bindChangeStop 结束日期选择器变化 ===');
    console.log('选择的结束日期:', e.detail.value);
    console.log('之前的结束日期:', this.data.stopDate);
    this.setData({
      stopDate: e.detail.value
    });
    console.log('结束日期已更新为:', e.detail.value);
    console.log('=== searchDate bindChangeStop 结束 ===');
  },


  selectSelfDate() {
    console.log('=== searchDate selectSelfDate 自定义日期查询 ===');
    console.log('当前选择的开始日期:', this.data.startDate);
    console.log('当前选择的结束日期:', this.data.stopDate);
    
    // searchDate 页面是临时查询，不缓存到 storage，只通过页面传递数据
    console.log('准备传递的日期数据:', {
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      dateType: "customer"
    });
    
    let pages = getCurrentPages();
    let prevPage = pages[pages.length - 2];
    console.log('上一个页面:', prevPage);
    
    // 使用回调确保数据设置完成后再返回
    prevPage.setData({
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      dateType: "customer",
      hanzi: "自定义",
      update: true,
    }, () => {
      console.log('已设置 prevPage 数据:', {
        startDate: this.data.startDate,
        stopDate: this.data.stopDate,
        dateType: "customer",
        update: true
      });
      console.log('验证 prevPage 数据:', {
        startDate: prevPage.data.startDate,
        stopDate: prevPage.data.stopDate,
        dateType: prevPage.data.dateType,
        update: prevPage.data.update
      });
      
      // 给所有前面的页面都设置 update: true
      // 确保至少有3个页面（当前页面、上一个页面、再前面的页面）
      if (pages.length >= 3) {
        console.log('页面栈长度:', pages.length, '，为前面的页面设置 update: true');
        for (let i = 0; i < pages.length - 2; i++) {
          pages[i].setData({
            update: true
          });
          console.log(`已为页面[${i}]设置 update: true`);
        }
      }
      
      console.log('准备返回上一页');
      console.log('=== searchDate selectSelfDate 结束 ===');
      
      // 确保数据设置完成后再返回
      wx.navigateBack({
        delta: 1,
      });
    });
  },




  toBack() {
    console.log('=== searchDate toBack 返回按钮点击 ===');
    console.log('准备返回上一页');
    console.log('=== searchDate toBack 结束 ===');
    wx.navigateBack({
      delta: 1,
    });
  },

})
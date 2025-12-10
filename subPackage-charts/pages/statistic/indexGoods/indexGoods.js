const globalData = getApp().globalData;
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil')
import apiUrl from '../../../../config.js'


import {

  disGetPurchaseCata
} from '../../../../lib/apiDepOrder'



Page({

  /**
   * 页面的初始数据
   */
  data: {
   
    ecCategory: {
      lazyLoad: false // 每日进货总额图表不使用延迟加载
    },
    searchDepId: -1, 
    purUserId: -1,
    supplierId: -1,
    update: false,
  
  },

  onShow() {

    if(this.data.update){
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
         update: false
       })
    }   
    
    this._initCostCataData();
   
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

    var value = wx.getStorageSync('userInfo');
    if (value) {
      this.setData({
        userInfo: value,

      })
    }
    var disInfo = wx.getStorageSync('disInfo');
    console.log(disInfo);
    if (disInfo) {
      this.setData({
        disInfo: disInfo,
        disId: disInfo.nxDistributerId,
      })
    }
    
    this._initCostCataData();

  },





  _initCostCataData() {
    
    var data = {
      startDate: this.data.startDate,
      stopDate: this.data.stopDate,
      disId: this.data.disId,
      supplierId: this.data.supplierId,
      purUserId: this.data.purUserId,
    }
    load.showLoading("获取数据")
    disGetPurchaseCata(data).then(res => {
      if (res.result.code == 0) {
        load.hideLoading();
        console.log("res.rusls" , res.result.data);
        // 使用API返回的数据
        const arr = res.result.data.arr;
        
        arr.forEach(item => {
          const greatPercent = item.dailyData?.greatPercent || 0;
          const costPercent = item.dailyData?.costPercent || 0;
          
          // 计算采购环形图的CSS值（蓝色）
          item.conicGradient = `conic-gradient(#007aff ${greatPercent}%, #e0e0e0 ${greatPercent}%)`;
          
          // 计算支出环形图的CSS值（红色）
          item.costConicGradient = `conic-gradient(#05c0a7 ${costPercent}%, #e0e0e0 ${costPercent}%)`;
          
          // 调试日志
          console.log(`商品类别: ${item.gbDfgFatherGoodsName}`);
          console.log(`采购百分比: ${greatPercent}%`);
          console.log(`支出百分比: ${costPercent}%`);
          console.log(`采购CSS值: ${item.conicGradient}`);
          console.log(`支出CSS值: ${item.costConicGradient}`);
          console.log('---');
        });
        
        this.setData({
          outArr: arr,
          purUserList: res.result.data.purUserList,
          supplierList: res.result.data.supplierList,
        })
        

      } else {
        load.hideLoading();
      
        this.setData({
          outArr: [],
          total: 0,
        })
      }
    })
  },

  toPurGoodsByGreatId(e){
   var item = e.currentTarget.dataset.item;
    wx.navigateTo({
      url: '../purGoodsByDate/purGoodsByDate?id=' + e.currentTarget.dataset.id + '&disId='
       + this.data.disId + '&name=' + e.currentTarget.dataset.name+ '&startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&hanzi=' + this.data.hanzi + '&dateType=' + this.data.dateType +'&value=' + item.greatPurTotal + '&purTotal=' + item.purTotal ,
    })
  },


  toCostGoodByGreatId(e){
    console.log("toCostGoodByGreatId",e);
    var item = e.currentTarget.dataset.item;
    wx.navigateTo({
      url: '../costGoodsByDate/costGoodsByDate?id=' + e.currentTarget.dataset.id +
      '&disId=' + this.data.disId + '&type=sales&name=' + e.currentTarget.dataset.name + '&startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&hanzi=' + this.data.hanzi +  '&dateType=' + this.data.dateType + '&fenxiType=costEcharts&searchDepId=' + this.data.searchDepId + '&allCostTotal=' + item.costAllTotal
      +'&value=' + item.costTotal,
    })

  },

//

  toDatePage() {
    this.setData({
      update: true,
    })
    wx.navigateTo({
      url: '../../sel/date/date?startDate=' + this.data.startDate +
        '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType,
    })
  },


  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },


  



})
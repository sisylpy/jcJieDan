var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
import apiUrl from '../../../../config.js'
var dateUtils = require('../../../../utils/dateUtil');


import {
  depGetGoodsStockListAll,
  disGetDayStockBySearchDay,
  changeDepStockToAnotherDep
} from '../../../../lib/apiDistributerGb.js'

import {
  saveDepWasteGoodsStock,
  saveDepReturnGoodsStock
} from '../../../../lib/apiDepOrder'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    nowTime: "",
    searchDepId: -1,
    openin: false,
    openone: false,
    opentwo: false,
    openthree: false,
    openfour: false,
    openall: true,
    // 展开状态控制
    expandedRows: {}, // 控制展开状态的对象
    currentExpandedItem: null // 当前展开的商品标识

  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {

    var userInfo = wx.getStorageSync('userInfo');
    if(userInfo){
      this.setData({
        userInfo: userInfo
      })
    }

    var disInfo = wx.getStorageSync('disInfo');
    if(disInfo){
      this.setData({
        disInfo: disInfo
      })
    }
  
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      startDate: options.startDate,
      stopDate: options.stopDate,
      searchDate: options.stopDate,
      nowTime: dateUtils.getNowTime(),
      disId: options.disId,

    })

    // 计算当天距离searchDate的天数
    var searchDate = options.stopDate;
    var today = new Date();
    var targetDate = new Date(searchDate);
    
    // 计算天数差
    var timeDiff = targetDate.getTime() - today.getTime();
    var daysDiff = Math.ceil(timeDiff / (1000 * 3600 * 24));
    
    // 调试日志
    console.log("=== 天数计算调试 ===");
    console.log("searchDate:", searchDate);
    console.log("today:", today.toDateString());
    console.log("targetDate:", targetDate.toDateString());
    console.log("timeDiff:", timeDiff);
    console.log("daysDiff:", daysDiff);
    console.log("Math.abs(daysDiff):", Math.abs(daysDiff));
    
    var howManyDays = "";
    // 直接显示计算出的天数
    if (daysDiff === 0) {
      howManyDays = "今天";
    } else if (daysDiff === -1) {
      howManyDays = "昨天";
    } else if (daysDiff === -2) {
      howManyDays = "前天";
    }
    else {
      howManyDays = Math.abs(daysDiff) + "天前";
    }
    
    console.log("howManyDays:", howManyDays);
    console.log("==================");
    
    // 更新页面数据
    this.setData({
      howManyDays: howManyDays,
      searchDate: searchDate
    });


  
  
    this._getInitData();
   
  },

  
  open(e){
    var which  = e.currentTarget.dataset.type;
    console.log(which);
    console.log(this.data[which]);
     console.log('"'+ which + '"');
    
    // 如果 openall 为 true，需要根据对应时间段的数据来决定是否允许切换
    if(this.data.openall){
      // 获取对应时间段的数据字段名
      var dataField = '';
      if(which === 'openin') dataField = 'in';
      else if(which === 'openone') dataField = 'one';
      else if(which === 'opentwo') dataField = 'two';
      else if(which === 'openthree') dataField = 'three';
      else if(which === 'openfour') dataField = 'exceedThree';
      
      // 如果数据不存在或者 total 为 0，不允许打开
      if(!this.data[dataField] || this.data[dataField].total === 0){
        console.log("数据不存在或total为0，不允许切换");
        return;
      }
    }
    
    // 直接切换对应时间段的状态
    var currentValue = this.data[which];
    if(currentValue === true){
      console.log("this.set==false")
      this.setData({
        [which]: false
      })
    }else{
      console.log("this.set==true")
      this.setData({
        [which]: true
      })
    }
  },


  

  _getInitData() {
    var data = {      
      disId: this.data.disId,
      searchDepId: this.data.searchDepId,
      searchDate: this.data.searchDate,
    }
    load.showLoading("获取数据中aaa");
    disGetDayStockBySearchDay(data)
      .then(res => {
        load.hideLoading();
        console.log("API返回数据:", res.result.data)
        if (res.result.code == 0) {
          // 设置数据
          this.setData({
            in: res.result.data.in,
            one: res.result.data.one,
            two: res.result.data.two,
            three: res.result.data.three,
            exceedThree: res.result.data.exceedThree,
            total: res.result.data.total
          })
          
          // 如果 openall 为 true，根据数据自动设置各时间段的打开状态
          if(this.data.openall) {
            console.log("openall为true，开始设置各时间段状态");
            var updateData = {};
            
            // 检查每个时间段的数据，如果有数据且total>0，则设置为打开
            if(res.result.data.in && res.result.data.in.total > 0) {
              console.log("今天有数据，设置为打开");
              updateData.openin = true;
            }
            if(res.result.data.one && res.result.data.one.total > 0) {
              console.log("1天有数据，设置为打开");
              updateData.openone = true;
            }
            if(res.result.data.two && res.result.data.two.total > 0) {
              console.log("2天有数据，设置为打开");
              updateData.opentwo = true;
            }
            if(res.result.data.three && res.result.data.three.total > 0) {
              console.log("3天有数据，设置为打开");
              updateData.openthree = true;
            }
            if(res.result.data.exceedThree && res.result.data.exceedThree.total > 0) {
              console.log("3天以上有数据，设置为打开");
              updateData.openfour = true;
            }
            
            console.log("要更新的状态:", updateData);
            if(Object.keys(updateData).length > 0) {
              this.setData(updateData);
            }
          }


        }
      })
  },
  
  delSearch(){
    wx.removeStorageSync('selDepList');;
    this.setData({
      searchDepIds: -1,
      searchDepName : ""
    })
    this._getInitData();

  },



  showStock(e){
  //   console.log(e.currentTarget.dataset.item);
   var item  =  e.currentTarget.dataset.item;
   item.gbDistributerGoodsEntity = this.data.disGoods;
   var depList = this.data.disInfo.mendianDepartmentList[0].gbDepartmentEntityList;
   if((depList.length > 1)){
      this.setData({
        showType: 6,
        
      })
   }
  // else{
  //   this.setData({
  //     showType: 1
  //   })
  //  }
  //   this.setData({
  //     showStock: true,
  //     item: e.currentTarget.dataset.item,
  //     consultItem: JSON.parse(JSON.stringify(item)),
  //     depGoods: e.currentTarget.dataset.goods,
  //     depList: depList
    
  //   })

  var item = e.currentTarget.dataset.item;
    console.log("sotscckcckkkkckc" ,item.gbDgsWasteFullTime )
    if (item.gbDgsWasteFullTime !== null && item.gbDgsWasteFullTime !== '') {
      var endTime = item.gbDgsWasteFullTime;
      var startTime = this.data.nowTime;
      var endTimeFormat = endTime.replace(/-/g, '/') //所有的- 都替换成/
      var endTimeDown = Date.parse(new Date(endTimeFormat));
      var startTimeFormat = startTime.replace(/-/g, '/') //所有的- 都替换成/
      var startTimeDown = Date.parse(new Date(startTimeFormat));
      var thisResult = Number(endTimeDown) - Number(startTimeDown);
      thisResult = Math.floor(thisResult / 1000 / 60 / 60);
      
      if (thisResult < 0) { // 超过废弃时间
        var restWeight = item.gbDgsRestWeight;
        item.gbDgsMyWasteWeight = restWeight;
        item.gbDgsMyProduceWeight = "0";
        this.setData({
          canWaste: true,
          canSure: true,
          showType: 4,
        })
      } else {
        item.gbDgsMyProduceWeight = item.gbDgsRestWeight;
        this.setData({
          canWaste: false,
          resultTime: thisResult,
          canSure: true,
          showType: 1
        })
      }
    } else {
      item.gbDgsMyProduceWeight = item.gbDgsRestWeight;
      this.setData({
       
        canWaste: false,
        canSure: true,
        showType: 1
      })
    }

    console.log("item.gbDgsRestWeight" + item.gbDgsRestWeight);
    this.setData({
      showStock: true,
      item: item,
      consultItem: JSON.parse(JSON.stringify(item)),
      depGoods: e.currentTarget.dataset.goods,
      depList: depList
    })

    if((depList.length > 1)){
      this.setData({
        showType: 6
      })
   }
  },
  
  hideMask(){
    this.setData({
      showOperation: false,
      item: "",
    })
  },



  confirmStock(e) {
    var item = e.detail.item;
    var showType = e.detail.showType;
    console.log("showtypeoeoe", showType);
    if (this.data.transfer !== '1') {
      item.gbDgsReduceWeightUserId = this.data.userInfo.gbDepartmentUserId;
    }
    if (showType == 1) {
      load.showLoading("保存数据中")
      console.log(item);
      saveDepProduceGoodsStock(item)
        .then(res => {
          load.hideLoading();
          if (res.result.code == 0) {
           this._getInitData();
          }
        })
    } else if (showType == 2) {
      load.showLoading("保存数据中");
      this.setData({
        src: e.detail.src,
        reason: e.detail.reason,
      })

      saveDepLossGoodsStock(item)
        .then(res => {
          load.hideLoading();
          console.log(res.result.data);
          console.log("---==========")
          if (res.result.code == 0) {
            
            this._getInitData();


            var that = this;
            var src = that.data.src;
            var reason = that.data.reason;
            var id = res.result.data.gbDepartmentGoodsStockReduceId;
            console.log(src + reason + id);
            reduceAttachmentSaveWithFile(src, reason, id).then((res) => {
              console.log(res);
              if (res.result == '{"code":0}') {
              
               
              } else {
                load.hideLoading();
                wx.showToast({
                  title: res.result.msg,
                  icon: 'none'
                })
              }

            })
         
          }
        })
    } else if (showType == 3) {
      if (this.data.transfer !== '1') {
        item.gbDgsReturnUserId = this.data.userInfo.gbDepartmentUserId;
      }
      console.log(item);
      load.showLoading("保存数据中")
      saveDepReturnGoodsStock(item)
        .then(res => {
          load.hideLoading();
          console.log(res.result.data);
          if (res.result.code == 0) {
            this._getInitData();
          }else{
            wx.showToast({
              title: res.result.msg,
              icon: 'none'
            })
          }
        })
    } else if (showType == 4) {
      load.showLoading("保存数据中");

      console.log(item);
      saveDepWasteGoodsStock(item)
        .then(res => {
          load.hideLoading();
          if (res.result.code == 0) {
            this._getInitData();
          }
        })

    }else if(showType == 5){
      this.confirmStar(e);
    }else if(showType == 6){
      var data  = {
        stockId: this.data.item.gbDepartmentGoodsStockId,
        toDepId: e.detail.targetDepId,
      }

      changeDepStockToAnotherDep(data).then(res =>{
        if(res.result.code == 0){
          this._getInitData();
        }
      })




    }
  },




  // 展开/收起库存批次详情
  showOne(e) {
    const { dayIndex, itemIndex, reduceIndex } = e.currentTarget.dataset;
    // 防护措施：如果 reduceIndex 是 undefined，使用 0
    const safeReduceIndex = reduceIndex !== undefined ? reduceIndex : 0;
    const currentKey = `${dayIndex}_${itemIndex}_${safeReduceIndex}`;
    
    console.log('=== showOne 点击事件 ===');
    console.log('点击参数:', { dayIndex, itemIndex, reduceIndex, safeReduceIndex, currentKey });
    console.log('当前展开状态:', this.data.expandedRows);
    console.log('当前展开项目:', this.data.currentExpandedItem);
    
    // 如果点击的是当前已展开的项目，则收起
    if (this.data.expandedRows[currentKey]) {
      console.log('🔄 收起已展开的项目:', currentKey);
      this.setData({
        [`expandedRows.${currentKey}`]: false,
        currentExpandedItem: null
      });
      console.log('✅ 收起完成，当前状态:', this.data.expandedRows);
    } else {
      console.log('🔄 收起其他项目，展开当前项目:', currentKey);
      // 先收起所有其他展开的项目，只展开当前点击的
      const newExpandedRows = {};
      newExpandedRows[currentKey] = 'stock';
      
      this.setData({
        expandedRows: newExpandedRows,
        currentExpandedItem: currentKey
      });
      console.log('✅ 展开完成，新状态:', this.data.expandedRows);
      console.log('✅ 当前展开项目:', this.data.currentExpandedItem);
    }
  },

  // 展开/收起采购批次详情
  showTwo(e) {
    const { dayIndex, itemIndex, reduceIndex } = e.currentTarget.dataset;
    // 防护措施：如果 reduceIndex 是 undefined，使用 0
    const safeReduceIndex = reduceIndex !== undefined ? reduceIndex : 0;
    const currentKey = `${dayIndex}_${itemIndex}_${safeReduceIndex}`;
    
    console.log('=== showTwo 点击事件 ===');
    console.log('点击参数:', { dayIndex, itemIndex, reduceIndex, safeReduceIndex, currentKey });
    console.log('当前展开状态:', this.data.expandedRows);
    console.log('当前展开项目:', this.data.currentExpandedItem);
    
    // 如果当前已经是purchase状态，则收起
    if (this.data.expandedRows[currentKey] === 'purchase') {
      console.log('🔄 收起采购详情:', currentKey);
      this.setData({
        [`expandedRows.${currentKey}`]: false,
        currentExpandedItem: null
      });
      console.log('✅ 收起完成，当前状态:', this.data.expandedRows);
    } else {
      console.log('🔄 收起其他项目，展开采购详情:', currentKey);
      // 先收起所有其他展开的项目，只展开当前点击的
      const newExpandedRows = {};
      newExpandedRows[currentKey] = 'purchase';
      
      this.setData({
        expandedRows: newExpandedRows,
        currentExpandedItem: currentKey
      });
      console.log('✅ 展开完成，新状态:', this.data.expandedRows);
      console.log('✅ 当前展开项目:', this.data.currentExpandedItem);
    }
  },

  toFenxi(e) {
    console.log("eee",e);
    var item = e.currentTarget.dataset.item;
    var purId = e.currentTarget.dataset.purid;
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
      }else{
        this.setData({
          dateType: 'month',
          startDate: dateUtils.getFirstDateInMonth(),
          stopDate: dateUtils.getArriveDate(0),
          hanzi: "本月",
        })

      } 
      
    wx.setStorageSync('disGoods', item);
    wx.navigateTo({
     
      url: '../../../../subPackage-goods/pages/goods/goodsFenxiPurchase/goodsFenxiPurchase?disGoodsId=' + id, 

    })
  },
  
  toCost(e) {
    var item = e.currentTarget.dataset.item;
    wx.setStorageSync('disGoods', e.currentTarget.dataset.item);
   
    wx.navigateTo({
      url: '../../goods/stockGoodsList/stockGoodsList?disGoodsId=' + item.gbDistributerGoodsId,
    })
  },

  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },

})
var load = require('../../../../lib/load.js');
const globalData = getApp().globalData;
import apiUrl from '../../../../config.js'
var dateUtils = require('../../../../utils/dateUtil');


import {
  disGetDayStockByGreatId,
  
} from '../../../../lib/apiDistributerGb.js'

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
    openall: false,
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
  
    // 计算当前天数的展开状态
    const getCurrentOpenState = () => {
      const dateDuring = options.dateDuring;
      if (dateDuring == '0') return 'openin';
      if (dateDuring == '1') return 'openone';
      if (dateDuring == '2') return 'opentwo';
      if (dateDuring == '3') return 'openthree';
      if (dateDuring == '4') return 'openfour';
      return 'openin'; // 默认值
    };

    // 计算当前天数的展开状态值
    const getCurrentOpenValue = () => {
      const dateDuring = options.dateDuring;
      if (dateDuring == '0') return this.data.openin;
      if (dateDuring == '1') return this.data.openone;
      if (dateDuring == '2') return this.data.opentwo;
      if (dateDuring == '3') return this.data.openthree;
      if (dateDuring == '4') return this.data.openfour;
      return false; // 默认值
    };

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      greatId: options.greatId,
      dateDuring: options.dateDuring,
      nowTime: dateUtils.getNowTime(),
      disId: options.disId,
      fatherName: options.fatherName,
      fatherTotal: options.fatherTotal,
      currentOpenState: getCurrentOpenState()
    })

    this._getInitData();
   
  },

  open(e){
    console.log('📅 === open 点击事件开始 ===');
    console.log('📱 事件对象:', e);
    console.log('📊 事件目标数据:', e.currentTarget.dataset);
    console.log('🎯 事件目标元素:', e.currentTarget);
    console.log('📝 事件类型:', e.type);
    console.log('🔍 事件来源:', e.target);
    
    var which  = e.currentTarget.dataset.type;
    console.log('📋 解析后的参数:');
    console.log('  - which:', which);
    console.log('  - 当前状态:', this.data[which]);
    
    console.log('📈 当前时间段状态:');
    console.log('  - openin:', this.data.openin);
    console.log('  - openone:', this.data.openone);
    console.log('  - opentwo:', this.data.opentwo);
    console.log('  - openthree:', this.data.openthree);
    console.log('  - openfour:', this.data.openfour);
    console.log('  - openall:', this.data.openall);
    
    // 如果 openall 为 true，需要根据对应时间段的数据来决定是否允许切换
    if(this.data.openall){
      console.log('🔄 openall 为 true，检查数据有效性');
      // 获取对应时间段的数据字段名
      var dataField = '';
      if(which === 'openin') dataField = 'in';
      else if(which === 'openone') dataField = 'one';
      else if(which === 'opentwo') dataField = 'two';
      else if(which === 'openthree') dataField = 'three';
      else if(which === 'openfour') dataField = 'exceedThree';
      
      console.log('📊 数据字段名:', dataField);
      console.log('📊 数据内容:', this.data[dataField]);
      
      // 如果数据不存在或者 total 为 0，不允许打开
      if(!this.data[dataField] || this.data[dataField].total === 0){
        console.log('❌ 数据不存在或total为0，不允许切换');
        console.log('🏁 === open 点击事件结束（被阻止）===');
        return;
      }
      console.log('✅ 数据有效，允许切换');
    }
    
    // 直接切换对应时间段的状态
    var currentValue = this.data[which];
    console.log('🔄 执行切换操作:');
    console.log('  - 当前值:', currentValue);
    console.log('  - 目标值:', !currentValue);
    
    if(currentValue === true){
      console.log('📉 收起时间段:', which);
      this.setData({
        [which]: false,
        currentOpen: false
      })
      console.log('✅ 收起完成');
    }else{
      console.log('📈 展开时间段:', which);
      this.setData({
        [which]: true,
        currentOpen: true
      })
      console.log('✅ 展开完成');
    }
    
    console.log('📈 切换后的状态:');
    console.log('  - ' + which + ':', this.data[which]);
    console.log('🏁 === open 点击事件结束 ===');
  },


  _getInitData() {
    var data = {      
      disId: this.data.disId,
      searchDepId: this.data.searchDepId,
      greatId: this.data.greatId,
      dateDuring: this.data.dateDuring
    }
    load.showLoading("获取数据中");
    disGetDayStockByGreatId(data)
      .then(res => {
        load.hideLoading();
        console.log("API返回数据:", res.result.data)
        if (res.result.code == 0) {
          if(this.data.dateDuring == 99){
             // 设置数据 - 显示所有天的库存
          this.setData({
            in: res.result.data.in,
            one: res.result.data.one,
            two: res.result.data.two,
            three: res.result.data.three,
            exceedThree: res.result.data.exceedThree,
          })
            }else{
              // 根据 dateDuring 参数设置对应的数据和展开状态
              var targetData = { oneDay: res.result.data.oneDay };
              var targetOpenState = {};
              
              if(this.data.dateDuring == '0'){
                // 今天
                targetOpenState = { openin: true };
              }else if(this.data.dateDuring == '1'){
                // 1天
                targetOpenState = { openone: true };
              }else if(this.data.dateDuring == '2'){
                // 2天
                targetOpenState = { opentwo: true };
              }else if(this.data.dateDuring == '3'){
                // 3天
                targetOpenState = { openthree: true };
              }else if(this.data.dateDuring == '4'){
                // 3天以上
                targetOpenState = { openfour: true };
              }
              
              // 添加统一的展开状态变量，简化 WXML 中的条件判断
              const currentOpen = this.data.dateDuring == '0' ? true : 
                                 this.data.dateDuring == '1' ? true : 
                                 this.data.dateDuring == '2' ? true : 
                                 this.data.dateDuring == '3' ? true : 
                                 this.data.dateDuring == '4' ? true : false;

              this.setData({
                ...targetData,
                ...targetOpenState,
                currentOpen: currentOpen
              });
            }
             
        }
      })
  },
  

  // 展开/收起库存批次详情
  showOne(e) {
    // 在微信小程序中，catchtap 本身就阻止了事件冒泡，不需要额外调用 stopPropagation
    
    console.log('🔍 === showOne 点击事件开始 ===');
    console.log('📱 事件对象:', e);
    console.log('📊 事件目标数据:', e.currentTarget.dataset);
    console.log('🎯 事件目标元素:', e.currentTarget);
    console.log('📝 事件类型:', e.type);
    
    // 适配新的数据结构
    const { index, itemIndex, dayIndex, batchIndex } = e.currentTarget.dataset;
    
    // 构建展开状态的唯一标识
    // 使用 dayIndex_itemIndex_batchIndex 作为key，包含批次信息
    const currentKey = `${dayIndex}_${itemIndex}_${batchIndex}`;
    
    console.log('📋 解析后的参数:');
    console.log('  - index:', index);
    console.log('  - itemIndex:', itemIndex);
    console.log('  - dayIndex:', dayIndex);
    console.log('  - batchIndex:', batchIndex);
    console.log('  - currentKey:', currentKey);
    
    console.log('📈 当前数据状态:');
    console.log('  - expandedRows:', this.data.expandedRows);
    console.log('  - currentExpandedItem:', this.data.currentExpandedItem);
    console.log('  - 当前点击项的展开状态:', this.data.expandedRows[currentKey]);
    
    // 如果点击的是当前已展开的项目，则收起
    if (this.data.expandedRows[currentKey]) {
      console.log('🔄 执行收起操作，目标:', currentKey);
      console.log('📉 收起前的状态:', JSON.stringify(this.data.expandedRows));
      
      this.setData({
        [`expandedRows.${currentKey}`]: false,
        currentExpandedItem: null
      });
      
      console.log('✅ 收起操作完成');
      console.log('📉 收起后的状态:', JSON.stringify(this.data.expandedRows));
      console.log('📉 收起后的 currentExpandedItem:', this.data.currentExpandedItem);
    } else {
      console.log('🔄 执行展开操作，目标:', currentKey);
      console.log('📈 展开前的状态:', JSON.stringify(this.data.expandedRows));
      
      // 保留其他已展开的项目，只展开当前点击的
      this.setData({
        [`expandedRows.${currentKey}`]: 'stock',
        currentExpandedItem: currentKey
      });
      
      console.log('✅ 展开操作完成');
      console.log('📈 展开后的状态:', JSON.stringify(this.data.expandedRows));
      console.log('📈 展开后的 currentExpandedItem:', this.data.currentExpandedItem);
    }
    
    console.log('🏁 === showOne 点击事件结束 ===');
  },

  // 获取当前天数的展开状态
  getCurrentOpenState() {
    const dateDuring = this.data.dateDuring;
    if (dateDuring == '0') return this.data.openin;
    if (dateDuring == '1') return this.data.openone;
    if (dateDuring == '2') return this.data.opentwo;
    if (dateDuring == '3') return this.data.openthree;
    if (dateDuring == '4') return this.data.openfour;
    return false;
  },

  // 单个天数库存批次点击事件
  showOneDayStock(e) {
    console.log('🔍 === showOneDayStock 点击事件开始 ===');
    console.log('📱 事件对象:', e);
    console.log('📊 事件目标数据:', e.currentTarget.dataset);
    
    // 获取点击的库存批次数据
    const { itemIndex, dayIndex, batchIndex } = e.currentTarget.dataset;
    
    // 构建展开状态的唯一标识
    const currentKey = `${dayIndex}_${itemIndex}_${batchIndex}`;
    
    console.log('📋 解析后的参数:');
    console.log('  - itemIndex:', itemIndex);
    console.log('  - dayIndex:', dayIndex);
    console.log('  - batchIndex:', batchIndex);
    console.log('  - currentKey:', currentKey);
    
    // 如果点击的是当前已展开的项目，则收起
    if (this.data.expandedRows[currentKey]) {
      console.log('🔄 执行收起操作，目标:', currentKey);
      
      this.setData({
        [`expandedRows.${currentKey}`]: false,
        currentExpandedItem: null
      });
      
      console.log('✅ 收起操作完成');
    } else {
      console.log('🔄 执行展开操作，目标:', currentKey);
      
      // 展开当前点击的库存批次
      this.setData({
        [`expandedRows.${currentKey}`]: 'stock',
        currentExpandedItem: currentKey
      });
      
      console.log('✅ 展开操作完成');
    }
    
    console.log('🏁 === showOneDayStock 点击事件结束 ===');
  },

  toFenxi(e) {
    var item = e.currentTarget.dataset.item;
    var purId = e.currentTarget.dataset.purid;

    wx.setStorageSync('disGoods', item);
    wx.navigateTo({
      url: '../../../../subPackage-goods/pages/goods/goodsFenxiPurchase/goodsFenxiPurchase?disGoodsId=' + item.gbDistributerGoodsId  + '&purGoodsId=' + purId, 

    })
    
  },
  
  toCost(e) {
    var item  = e.currentTarget.dataset.item;
    var stockId = e.currentTarget.dataset.id;
    wx.setStorageSync('disGoods', e.currentTarget.dataset.item);
   
    wx.navigateTo({
      url: '../../../../subPackage-goods/pages/goods/stockGoodsList/stockGoodsList?disGoodsId=' + item.gbDistributerGoodsId + '&stockId=' + stockId,
    })

  },


  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },

})
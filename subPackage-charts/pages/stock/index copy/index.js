const globalData = getApp().globalData;
var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config.js'

import {
  getMendianStockTypePeriod,
  
} from '../../../lib/apiDistributerGb.js'


Page({

  onShow() {

    // 推荐直接用新API
 let windowInfo = wx.getWindowInfo();
 let globalData = getApp().globalData;
 this.setData({
   windowWidth: windowInfo.windowWidth * globalData.rpxR,
   windowHeight: windowInfo.windowHeight * globalData.rpxR,
   navBarHeight: globalData.navBarHeight * globalData.rpxR,
 });

},

  data: {
    searchDepIds: -1,
    searchDepId: -1,
    tab1Index: 0,
    itemIndex: 0,
    days: "全部",
   
   
    
  },

  onLoad: function (options) {
    
    this.setData({
    
      url: apiUrl.server,
    })

    var value = wx.getStorageSync('disInfo');
    if (value) {
      this.setData({
        disInfo: value,
        disId: value.gbDistributerId,
        
      })
    
      console.log("init---------2222222")
      this._getInitData();

    }


  },
  


   
    _getInitData() {
     
      load.showLoading("获取数据中")
      var data = {
        disId: this.data.disId,
        searchDepIds: this.data.searchDepIds,
        searchDepId: this.data.searchDepId,
        whichDay: this.data.itemIndex
      }
      getMendianStockTypePeriod(data)
        .then(res => {
          load.hideLoading();
          console.log("abc")
          console.log(res.result.data)
          if (res.result.code == 0) {
            if (res.result.data.total.restTotal > 0) {
              // 为每个商品添加环形图渐变色
              const processedData = this._addConicGradients(res.result.data);
              
              this.setData({
                total: res.result.data.total.restTotal,
                totalArr: processedData.arr,
                exceedThreeTotal: res.result.data.exceed.exceedThreeTotal,
                threeTotal: res.result.data.three.threeTotal,
                twoTotal: res.result.data.two.twoTotal,
                oneTotal: res.result.data.one.oneTotal,
                zeroTotal: res.result.data.in.zeroTotal,
                arr: processedData,

              })
             

            } else {
              this.setData({
                total: "0.0",
                totalArr: [],
                arr: [],
                exceedThreeTotal: "0.0",
                threeTotal: "0.0",
                twoTotal: "0.0",
                oneTotal: "0.0",
                zeroTotal: "0.0",
              })
            }
          } else {
            this.setData({
              totalArr: "0.0",
              arr: [],
              exceedThreeArr: [],
              exceedThreeTotal: "0.0",
              threeArr: [],
              threeTotal: "0.0",
              twoArr: [],
              twoTotal: "0.0",
              oneArr: [],
              oneTotal: "0.0",
              zeroArr: [],
              zeroTotal: "0.0",
            })
          }
        })
    },


    toStockPage(e) {
      console.log('点击库存项展开:', e.currentTarget.dataset);
      
      var days = e.currentTarget.dataset.days;
      var dateDuring = e.currentTarget.dataset.dateduring;
      var goodsIndex = e.currentTarget.dataset.index; // 商品序号
       var id = "";
      
      // 根据当前选择的部门确定搜索ID
       if(this.data.itemIndexDep == 0){
         id = this.data.searchDepIds;
      } else {
         id = this.data.searchDepId;
       }
      
      // 构建跳转参数
      var params = {
        greatId: e.currentTarget.dataset.id,
        fatherName: e.currentTarget.dataset.name,
        days: days,
        color: e.currentTarget.dataset.color,
        fatherTotal: e.currentTarget.dataset.total,
        dateDuring: dateDuring,
        searchDepIds: id,
        disId: this.data.disId,
        goodsIndex: goodsIndex // 添加商品序号参数
      };
      
      console.log('跳转参数:', params);
      
      wx.navigateTo({
        url: '../stockList/stockList?greatId=' + params.greatId + 
             '&fatherName=' + params.fatherName + 
             '&days=' + encodeURIComponent(params.days) + 
             '&color=' + encodeURIComponent(params.color) + 
             '&fatherTotal=' + params.fatherTotal + 
             '&dateDuring=' + params.dateDuring + 
             '&searchDepIds=' + params.searchDepIds + 
             '&disId=' + params.disId +
             '&goodsIndex=' + params.goodsIndex
      });
    },

    /**
     * tabItme点击
     */
    onTab1Click(event) {
      let index = event.currentTarget.dataset.index;
      console.log(event.currentTarget.dataset)
      this.setData({
        tab1Index: index,
        itemIndex: index,
        days: event.currentTarget.dataset.days,
        depTotal: event.currentTarget.dataset.total,

      })

    },


    animationfinishDep(event) {
      console.log("amddddep")
      this.setData({
        tab1IndexDep: event.detail.current,
        itemIndexDep: event.detail.current,
       
      })
      if (this.data.tab1IndexDep == 0) {
        this.setData({
          searchDepId: -1,
        }) 
      } else {
        this.setData({
          searchDepId: this.data.resultDepList[event.detail.current - 1].gbDepartmentId,
        })
      }

      this._getInitData();

    },


    animationfinish(event) {
      console.log("findiis----zero");
      console.log(event)
      this.setData({
        tab1Index: event.detail.current,
        itemIndex: event.detail.current,
      })

      if (event.detail.current == 0) {
        this.setData({
          leftWidth: 0,
        })
      }
      if (event.detail.current == 1) {
        this.setData({
          leftWidth: 50,
        })
      }
      if (event.detail.current == 2) {
        this.setData({
          // leftWidth: 50,
        })
      }

      if (event.detail.current == 3) {
        this.setData({
          leftWidth: 100,
        })
      }
      if (event.detail.current == 4) {
        this.setData({
          leftWidth: 220,
        })
      }
      if (event.detail.current == 5 || event.detail.current == 5) {
        this.setData({
          leftWidth: 250,
        })
      }
      this._getInitData();
    },

    

    // 为商品数据添加环形图颜色（简化版本，使用后台计算的百分比）
    _addConicGradients(data) {
      console.log('🔧 开始处理环形图数据:', data);
      
      // 使用统一的颜色
      const baseColor = '#4CAF50';
      
      // 处理各个时间段的数据
      const processArray = (arr) => {
        if (!arr || !Array.isArray(arr)) return arr;
        console.log('📊 处理数组数据:', arr);
        
        return arr.map((item, index) => {
          // 直接使用后台返回的百分比
          const percentage = parseFloat(item.fatherStockTotalPercent) || 0;
          const degree = (percentage / 100) * 360;
          const gradient = `conic-gradient(${baseColor} 0deg ${degree}deg, #f0f0f0 ${degree}deg 360deg)`;
          
          console.log(`🎯 商品 ${item.gbDfgFatherGoodsName} 添加环形图:`, {
            originalPercent: item.fatherStockTotalPercent,
            percentage,
            degree,
            gradient,
            stockTotalString: item.fatherStockTotalString
          });
          
          return {
            ...item,
            stockConicGradient: gradient
          };
        });
      };
      
      const result = {
        ...data,
        arr: processArray(data.arr),
        in: { ...data.in, arr: processArray(data.in.arr) },
        one: { ...data.one, arr: processArray(data.one.arr) },
        two: { ...data.two, arr: processArray(data.two.arr) },
        three: { ...data.three, arr: processArray(data.three.arr) },
        exceed: { ...data.exceed, arr: processArray(data.exceed.arr) }
      };
      
      console.log('✅ 环形图数据处理完成:', result);
      return result;
    },
    


    toFilter() {
      wx.removeStorageSync('tab1IndexDep');
      wx.navigateTo({
        url: '../../sel/filterStockDepartment/filterStockDepartment',
      })
    },



    toBack(){
      wx.navigateBack({delta: 1});
    },





})
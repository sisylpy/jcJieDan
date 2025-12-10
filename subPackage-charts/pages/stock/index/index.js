const globalData = getApp().globalData;
var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config.js'

import {
  getMendianStockTypePeriod,

} from '../../../../lib/apiDistributerGb.js'


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
    dateString: "",
  },

  onLoad: function (options) {

    this.setData({

      url: apiUrl.server,
    })

    var value = wx.getStorageSync('disInfo');
    if (value) {
      this.setData({
        disInfo: value,
        disId: value.nxDistributerId || value.nxDistributerEntity?.nxDistributerId,
        type: value.nxDistributerStockCycle || value.nxDistributerEntity?.nxDistributerStockCycle,
      })

      console.log("init---------2222222")
      this._getInitData();

    }


  },




  _getInitData() {

    var whichDay = "";
    if (this.data.itemIndex == 0) {
      whichDay = 99;
    } else {
      whichDay = Number(this.data.itemIndex) - 1;
    }
    load.showLoading("获取数据中")
    var data = {
      disId: this.data.disId,
      searchDepIds: this.data.searchDepIds,
      searchDepId: this.data.searchDepId,
      whichDay: whichDay,
      type: this.data.type,

    }
    console.log("doososs", data);
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
              total: res.result.data.total,
              totalArr: processedData.arr,
              three: res.result.data.three,
              two: res.result.data.two,
              one: res.result.data.one,
              in: res.result.data.in,
              arr: processedData,

            })


            if (this.data.tab1Index == 0) {
              this.setData({
                dateString: this.data.total.dateString
              })
            } else if (this.data.tab1Index == 1) {
              this.setData({
                dateString: this.data.in.dateString
              })
            } else if (this.data.tab1Index == 2) {
              this.setData({
                dateString: this.data.one.dateString
              })
            } else if (this.data.tab1Index == 3) {
              this.setData({
                dateString: this.data.two.dateString
              })
            } else if (this.data.tab1Index == 4) {
              this.setData({
                dateString: this.data.three.dateString
              })
            }
            console.log("chckckckdkdkkdatesYr", this.data.dateString);

          } else {
            this.setData({
              total: "0.0",
              totalArr: [],
              arr: [],
              three: "",
              two: "",
              one: "",
              zero: "",
            })
          }
        } else {
          this.setData({
            total: "0.0",
            totalArr: [],
            arr: [],
            three: "",
            two: "",
            one: "",
            zero: "",
          })
        }
      })
  },


  toStockPage(e) {
    console.log('点击库存项展开:', e.currentTarget.dataset);


    var dateDuring = e.currentTarget.dataset.dateduring;
    var whichDay = "";
    if (this.data.itemIndex == 0) {
      whichDay = 99;
    } else {
      whichDay = Number(this.data.itemIndex) - 1;
    }
    var goodsIndex = e.currentTarget.dataset.index; // 商品序号

    var id = "";

    // 根据当前选择的部门确定搜索ID
    if (this.data.itemIndexDep == 0) {
      id = this.data.searchDepIds;
    } else {
      id = this.data.searchDepId;
    }

    // 构建跳转参数
    var params = {
      greatId: e.currentTarget.dataset.id,
      fatherName: e.currentTarget.dataset.name,
      color: e.currentTarget.dataset.color,
      fatherTotal: e.currentTarget.dataset.total,
      searchDepIds: id,
      disId: this.data.disId,
      type: this.data.type,
      goodsIndex: goodsIndex // 添加商品序号参数
    };

    console.log('跳转参数:', params);

    wx.navigateTo({
      url: '../stockList/stockList?greatId=' + params.greatId +
        '&fatherName=' + params.fatherName +
        '&dateString=' + this.data.dateString +
        '&color=' + encodeURIComponent(params.color) +
        '&fatherTotal=' + params.fatherTotal +
        '&whichDay=' + whichDay +
        '&searchDepIds=' + params.searchDepIds +
        '&disId=' + params.disId +
        '&type=' + params.type +
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
        searchDepId: this.data.resultDepList[event.detail.current - 1].nxDepartmentId,
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
    this._getInitData();
  },



  // 为商品数据添加环形图颜色（简化版本，使用后台计算的百分比）
  _addConicGradients(data) {
    // console.log('🔧 开始处理环形图数据:', data);

    // 使用统一的颜色
    const baseColor = '#4CAF50';

    // 处理各个时间段的数据
    const processArray = (arr) => {
      if (!arr || !Array.isArray(arr)) return arr;
      // console.log('📊 处理数组数据:', arr);

      return arr.map((item, index) => {
        // 直接使用后台返回的百分比（NX项目可能没有此字段，需要根据实际返回调整）
        const percentage = parseFloat(item.fatherStockTotalPercent) || 0;
        const degree = (percentage / 100) * 360;
        const gradient = `conic-gradient(${baseColor} 0deg ${degree}deg, #f0f0f0 ${degree}deg 360deg)`;

        // console.log(`🎯 商品 ${item.nxDfgFatherGoodsName || item.gbDfgFatherGoodsName} 添加环形图:`, {
        //   originalPercent: item.fatherStockTotalPercent,
        //   percentage,
        //   degree,
        //   gradient,
        //   stockTotalString: item.fatherStockTotalString
        // });

        return {
          ...item,
          stockConicGradient: gradient
        };
      });
    };

    const result = {
      ...data,
      arr: processArray(data.arr),
      in: {
        ...data.in,
        arr: processArray(data.in.arr)
      },
      one: {
        ...data.one,
        arr: processArray(data.one.arr)
      },
      two: {
        ...data.two,
        arr: processArray(data.two.arr)
      },
      three: {
        ...data.three,
        arr: processArray(data.three.arr)
      },
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



  toBack() {
    wx.navigateBack({
      delta: 1
    });
  },

  // 图片加载错误处理
  onImageError(e) {
    console.log('图片加载失败:', e);
    // 可以设置默认图片或隐藏图片
    // 这里不做处理，让图片显示为空
  },





})
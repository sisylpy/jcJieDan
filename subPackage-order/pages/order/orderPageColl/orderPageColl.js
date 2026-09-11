var load = require('../../../../lib/load.js');
var esc = require("../../../../utils/GPutils/esc.js");
var dateUtils = require('../../../../utils/dateUtil');

import apiUrl from '../../../../config.js'

import {
 
  getCollectionDisOrders,

  phoneGetToFillDepOrdersWithKg,
  phoneGetToFillDepOrdersWithJin,
  
  giveOrderWeightListForStockAndFinish,
  giveOrderWeightListForStockShelfGoods,
  cancelOutOrder,

} from '../../../../lib/apiDepOrder'

Page({


  onShow() {

    let windowInfo = wx.getWindowInfo();
    let globalData = getApp().globalData;
    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
    });



    this._initData();

   

    // 2，打印初始化参数
    var list = []
    var numList = []
    var j = 0
    for (var i = 20; i < 200; i += 10) {
      list[j] = i;
      j++
    }
    for (var i = 1; i < 10; i++) {
      numList[i - 1] = i
    }
    this.setData({
      buffSize: list,
      oneTimeData: list[0],
      printNum: numList,
      printerNum: numList[0],
      looptime: 0,
      currentTime: 1,
      lastData: 0,
      returnResult: "",
      buffIndex: 0,
      printNumIndex: 0,
      currentPrint: 1,
      isReceiptSend: false,
      isLabelSend: false,
      printTimes: 0,
      canConnect: false,
      printOk: false,
      openType: "",
      saveDepCount: 0,
      depCount: 0,
      // 打印规格修改 tip
      showPrintTip: false,
      currentEditOrderIndex: null,
      editPrintStandard: '',
      currentEditOrder: null,
    })
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const globalData = getApp().globalData;

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      collDisId: options.collDisId,
      nxDisId: options.nxDisId,
      name: options.name,
      todayDate: dateUtils.getWhichFullDate(0),
      chooseSize: false,
      animationData: {},
      orderBy: "time",
      toType: "time",
      url: apiUrl.server,
      imgUrl: 'userImage/say.png',
      isKgMode: false, // 默认显示斤，false=斤，true=公斤
    })

    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
        disId: userInfo.nxDiuDistributerId,
        deviceId: userInfo.nxDiuPrintDeviceId,
        disInfo: userInfo.nxDistributerEntity,
      })
    }
  
  },




  _initData() {

    var data = {
      disId: this.data.nxDisId,
      collDisId: this.data.collDisId,
    }
    load.showLoading("获取数据中");
    // 始终使用原始接口获取数据
    getCollectionDisOrders(data)
      .then(res => {
        load.hideLoading();
        console.log("printdata", res.result.data);
        if (res.result.code == 0) {
          var page = this;
          var orders = (res.result.data.arr || []).map(function (order) {
            return page._decorateCustomerStandards(order);
          });
          this.setData({
            total: res.result.data.total,
            finishCount: res.result.data.finishCount,
            totalCount: res.result.data.totalCount,
            hasPriceCount: res.result.data.hasPriceCount,
            hasWeightCount: res.result.data.hasWeightCount,
            applyArr: orders,
          })
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })
        }

      })
  },

  _decorateCustomerStandards(order) {
    if (!order) return order;
    var relation = order.nxDepartmentDisGoodsEntity || {};
    var dimensionLabels = {
      SIZE: '大小',
      COLOR: '颜色',
      FRESHNESS: '新鲜度',
      ROOT: '根部',
      PACKAGING: '包装',
      SUBSTITUTE: '替代',
      OTHER: '其他'
    };
    var displayItems = (relation.nxDepartmentDisGoodsStandardItems || [])
      .filter(function (item) {
        return item && (!item.nxDdgsiStatus || item.nxDdgsiStatus === 'ACTIVE')
          && String(item.nxDdgsiRequirementText || '').trim();
      })
      .map(function (item) {
        var importance = Number(item.nxDdgsiImportanceLevel || 1);
        importance = isNaN(importance) ? 1 : Math.max(1, Math.min(5, Math.round(importance)));
        var code = item.nxDdgsiDimensionCode || 'OTHER';
        return {
          id: item.nxDdgsiId,
          label: (code === 'OTHER' && item.nxDdgsiDimensionName)
            ? item.nxDdgsiDimensionName
            : (dimensionLabels[code] || item.nxDdgsiDimensionName || '其他'),
          text: String(item.nxDdgsiRequirementText || '').trim(),
          importanceStars: [1, 2, 3, 4, 5].slice(0, importance)
        };
      });

    var knownTexts = {};
    displayItems.forEach(function (item) { knownTexts[item.text] = true; });
    [
      { label: '分拣', text: relation.nxDdgPickDetail },
      { label: '商品', text: relation.nxDdgDepGoodsDetail },
      { label: '备注', text: relation.nxDdgOrderRemark }
    ].forEach(function (legacy) {
      var text = String(legacy.text || '').trim();
      if (text && text !== 'null' && !knownTexts[text]) {
        displayItems.push({
          id: 'legacy-' + legacy.label,
          label: legacy.label,
          text: text,
          importanceStars: [1, 2, 3]
        });
        knownTexts[text] = true;
      }
    });

    order._customerStandardItems = displayItems;
    order._hasCustomerStandards = displayItems.length > 0;
    return order;
  },

  toChangeKg() {
    // 切换显示模式
    var newMode = !this.data.isKgMode;
    this.setData({
      isKgMode: newMode
    });
    
    var data = {
      depFatherId: this.data.depFatherId,
      gbDepFatherId: this.data.gbDepFatherId,
      disId: this.data.nxDisId
    }
    load.showLoading("转换中");
    // 根据切换后的模式选择接口
    // newMode = true: 斤转公斤，调用 phoneGetToFillDepOrdersWithKg
    // newMode = false: 公斤转斤，调用 phoneGetToFillDepOrdersWithJin
    var apiCall = newMode ? phoneGetToFillDepOrdersWithKg(data) : phoneGetToFillDepOrdersWithJin(data);
    apiCall
      .then(res => {
        load.hideLoading();
        console.log("printdata", newMode ? "斤转公斤" : "公斤转斤", res.result.data);
        if (res.result.code == 0) {

          this.setData({
            tradeNo: res.result.data.tradeNo,
            total: res.result.data.total,
            totalHanzi: res.result.data.totalHanzi,
            finishCount: res.result.data.finishCount,
            totalCount: res.result.data.totalCount,
            hasPriceCount: res.result.data.hasPriceCount,
            hasWeightCount: res.result.data.hasWeightCount,
          })
          if (this.data.depHasSubs > 0) {
            this.setData({
              depArr: res.result.data.arr,

            })
          } else {
            this.setData({
              applyArr: res.result.data.arr,
            })
          }

          wx.showToast({
            title: newMode ? '已转换为公斤' : '已转换为斤',
            icon: 'success'
          })

        } else {

          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })
        }

      })
  },


  delStandard(e) {
    this.setData({
      warnContent: e.detail.standardName,
      show: false,
      popupType: 'deleteSpec',
      showPopupWarn: true,
      disStandardId: e.detail.id,
    })
  },


  toDriver() {
    this.setData({
      editDriverShow: true,
      popupType: "road",
      depItem: this.data.depInfo

    })
  },




  hideOperation() {
    this.setData({
      showOperation: false
    })
  },


  // /////
  chooseSezi: function (e) {
    // 用that取代this，防止不必要的情况发生
    var that = this;
    // 创建一个动画实例
    var animation = wx.createAnimation({
      // 动画持续时间
      duration: 100,
      // 定义动画效果，当前是匀速
      timingFunction: 'linear'
    })
    // 将该变量赋值给当前动画
    that.animation = animation
    // 先在y轴偏移，然后用step()完成一个动画
    animation.translateY(200).step()
    // 用setData改变当前动画
    that.setData({
      // 通过export()方法导出数据
      animationData: animation.export(),
      // 改变view里面的Wx：if
      chooseSize: true
    })
    // 设置setTimeout来改变y轴偏移量，实现有感觉的滑动
    setTimeout(function () {
      animation.translateY(0).step()
      that.setData({
        animationData: animation.export()
      })
    }, 20)
  },


  hideModal: function (e) {
    var that = this;
    var animation = wx.createAnimation({
      duration: 1000,
      timingFunction: 'linear'
    })
    that.animation = animation
    animation.translateY(200).step()
    that.setData({
      animationData: animation.export()
    })

    setTimeout(function () {
      animation.translateY(0).step()
      that.setData({
        animationData: animation.export(),
        chooseSize: false
      })
    }, 200)
  },

  openOperation(e) {
    console.log(e);
    var goodsId = e.currentTarget.dataset.id;
    var name = e.currentTarget.dataset.name;
    var color = e.currentTarget.dataset.color;
    this.setData({
      showOperationGoods: true,
      goodsId: goodsId,
      goodsName: name,
      disGoods: e.currentTarget.dataset.goods,
      color: color,
      applyItem: e.currentTarget.dataset.order,
      isSearching: false,
      depId: e.currentTarget.dataset.depid,
      subName: e.currentTarget.dataset.subname,
    })
    this.chooseSezi();
  },



  cancleOutOrder(e) {
    var item = this.data.applyItem;
    cancelOutOrder(item).then(res => {
      if (res.result.code == 0) {
        this.setData({
          showOperationGoods: false
        })
        this.hideModal()
        this._initData()
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },


  cancle() {
    console.log("cancle....")
    this.setData({
      applyItem: "",
      applyStandardName: "",
      pirntStandard: "",
      showAdd: false,
      applyItem: "",
      applyNumber: "",
      depStandardArr: [],

    })

    if (this.data.isSearching) {
      this.setData({
        isSearching: false,
        searchStr: ""
      })
    }
  },



  toInputNumber() {
    wx.navigateTo({
      url: '../writePriceColl/writePriceColl?requestDisId=' + this.data.collDisId + '&disId=' + this.data.nxDisId + '&name=' + this.data.name,
    })
  },





  showIsOut(e) {
    var temp = [];
    var apply = this.data.applyItem;
    apply.hasChoice = true;
    temp.push(apply);
    var itemDis = this.data.disGoods;
    itemDis.nxDepartmentOrdersEntities = temp;
    this.setData({
      item: itemDis,
      showDisOutGoods: true,
      showOperationGoods: false,
    })

  },



  confirmStock(e) {
    var arrNeed = e.detail.item.nxDepartmentOrdersEntities;
    var arr = [];
    if (arrNeed.length > 0) {
      for (var i = 0; i < arrNeed.length; i++) {
        var weightValue = arrNeed[i].nxDoWeight;
        var choice = arrNeed[i].hasChoice;
        if (weightValue !== null && weightValue > 0 && choice) {
          arr.push(arrNeed[i]);
        }
      }
    }

    if (arr.length > 0) {
      load.showLoading("保存数据中");
      if(this.data.disInfo.nxDistributerBusinessTypeId > 2){
        giveOrderWeightListForStockShelfGoods(arr).then(res => {
          load.hideLoading();
          if (res.result.code == 0) {
            this._initData();
          } else {
            wx.showToast({
              title: res.result.msg || '保存失败',
              icon: 'none'
            })
          }
        })
      }else{
        giveOrderWeightListForStockAndFinish(arr).then(res => {
          load.hideLoading();
          if (res.result.code == 0) {
            this._initData();
          } else {
            wx.showToast({
              title: 'res.result.msg',
              icon: 'none'
            })
          }
        })
      }
      
    }
  },


  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },

  // 显示打印规格修改 tip
  showPrintStandardTip(e) {
    console.log("========== showPrintStandardTip 开始 ==========");
    console.log("点击事件:", e);
    console.log("dataset:", e.currentTarget.dataset);
    
    const order = e.currentTarget.dataset.order;
    const index = e.currentTarget.dataset.index;
    
    console.log("订单信息:", order);
    console.log("订单索引:", index, "类型:", typeof index);
    console.log("当前 showPrintTip:", this.data.showPrintTip);
    console.log("当前 currentEditOrderIndex:", this.data.currentEditOrderIndex, "类型:", typeof this.data.currentEditOrderIndex);
    
    // 确保 index 是数字类型，与 applyIndex 匹配（wx:for-index 返回的是数字）
    const indexNum = Number(index);
    
    this.setData({
      showPrintTip: true,
      currentEditOrderIndex: indexNum,
      editPrintStandard: order.nxDoPrintStandard || '',
      currentEditOrder: order
    }, () => {
      // setData 回调，确保数据已更新
      console.log("setData 回调 - showPrintTip:", this.data.showPrintTip);
      console.log("setData 回调 - currentEditOrderIndex:", this.data.currentEditOrderIndex, "类型:", typeof this.data.currentEditOrderIndex);
      console.log("setData 回调 - editPrintStandard:", this.data.editPrintStandard);
      
      // 检查 applyArr 中对应索引的订单
      if (this.data.applyArr && this.data.applyArr[indexNum]) {
        console.log("对应索引的订单:", this.data.applyArr[indexNum]);
      }
      
      // 检查条件是否满足
      console.log("检查渲染条件:");
      console.log("  showPrintTip:", this.data.showPrintTip);
      console.log("  currentEditOrderIndex:", this.data.currentEditOrderIndex);
      console.log("  需要匹配的 applyIndex 应该是:", indexNum);
      console.log("  条件结果:", this.data.showPrintTip && this.data.currentEditOrderIndex == indexNum);
    });
    
    console.log("设置后 showPrintTip:", this.data.showPrintTip);
    console.log("设置后 currentEditOrderIndex:", this.data.currentEditOrderIndex, "类型:", typeof this.data.currentEditOrderIndex);
    console.log("设置后 editPrintStandard:", this.data.editPrintStandard);
    console.log("========== showPrintStandardTip 结束 ==========");
  },


  // 取消修改打印规格
  cancelEditPrintStandard() {
    this.setData({
      showPrintTip: false,
      currentEditOrderIndex: null,
      editPrintStandard: '',
      currentEditOrder: null
    });
  },

  // 确认修改打印规格（组件回调）
  onPrintStandardConfirm(e) {
    // 组件已经处理了接口调用，这里只需要刷新数据和重置状态
    this.setData({
      showPrintTip: false,
      currentEditOrderIndex: null,
      editPrintStandard: '',
      currentEditOrder: null
    });
    // 刷新数据
    this._initData();
  },

  toDgGoods(e) {
    var goodsId = this.data.goodsId;
    var name = this.data.goodsName;
    var color = this.data.color;
    var type = e.currentTarget.dataset.type;

    wx.navigateTo({
      url: '../../../../subPackage/pages/goods/disGoodsPage/disGoodsPage?disGoodsId=' + goodsId +
        '&type=' + type + '&color=' + color + '&goodsName=' + name,
    })
  },

  
  toSaveNxDisBill(){
    wx.navigateTo({
      url: '/subPackage/pages/customer/issuePageColl/issuePageColl?coolNxDisId=' + this.data.collDisId
       + '&disId=' + this.data.nxDisId + '&name=' + this.data.name,
    })
  },

  hideMaskGoods(){
    this.setData({
      showOperationGoods: false
    })
    this.hideModal()

  },

})

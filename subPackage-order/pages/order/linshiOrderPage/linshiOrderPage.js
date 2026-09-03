var load = require('../../../../lib/load.js');
var esc = require("../../../../utils/GPutils/esc.js");
var dateUtils = require('../../../../utils/dateUtil');
import apiUrl from '../../../../config.js'

import {
  disGetLinshiOrders,
  saveAccountBillPhoneFeiE,
  saveAccountBillPhone,
  saveAccountBillPhoneSub,
  receiveReturnApplyNx,
  giveOrderWeightListForStockAndFinish,
  cancelOutOrder,
  deliveryOrder,
  cancleDeliveryOrder,
  updateDepPickName,
  confirmDepApplyGoods
} from '../../../../lib/apiDepOrder'

import {
  disSaveStandard,
  disDeleteStandard,

} from '../../../../lib/apiDistributer'


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
      depFatherId: options.depFatherId,
      gbDepFatherId: options.gbDepFatherId,
      nxDisId: options.nxDisId,
      gbDisId: options.gbDisId,
      comId: options.comId,
      depHasSubs: options.depHasSubs,
      name: options.name,
      todayDate: dateUtils.getWhichFullDate(0),
      chooseSize: false,
      animationData: {},
      orderBy: "time",
      toType: "time",
      url: apiUrl.server,
      imgUrl: 'userImage/say.png',
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


    load.showLoading("获取数据中");
    disGetLinshiOrders(this.data.disId)
      .then(res => {
        load.hideLoading();
        console.log("printdata", res.result.data);
        if (res.result.code == 0) {

          // 计算全局序号
          const globalOrderIndex = this._calculateGlobalOrderIndex(res.result.data);

          this.setData({
            depArr: res.result.data,
            globalOrderIndex: globalOrderIndex
          })
         

        } else {

          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })
        }

      })


  },

  // 计算全局序号
  _calculateGlobalOrderIndex(depArr) {
    const globalOrderIndex = [];
    let globalIndex = 1;

    for (let depIndex = 0; depIndex < depArr.length; depIndex++) {
      const dep = depArr[depIndex];
      globalOrderIndex[depIndex] = [];

      for (let subDepIndex = 0; subDepIndex < dep.nxDepartmentEntities.length; subDepIndex++) {
        const subDep = dep.nxDepartmentEntities[subDepIndex];
        globalOrderIndex[depIndex][subDepIndex] = [];

        for (let orderIndex = 0; orderIndex < subDep.nxDepartmentOrdersEntities.length; orderIndex++) {
          globalOrderIndex[depIndex][subDepIndex][orderIndex] = globalIndex++;
        }
      }
    }

    return globalOrderIndex;
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

  toAiHelp(e){
    wx.setStorageSync('linshiOrder', this.data.applyItem);
    wx.navigateTo({
      url: '../../../../subPackage/pages/order/aiHelpGoods/aiHelpGoods',
    })
  },



  toDriver() {
    this.setData({
      editDriverShow: true,
      popupType: "road",
      depItem: this.data.depInfo

    })
  },







  toOpenOrder() {
    var appId = this.data.disInfo.nxDistributerAppId;
    console.log('depFatherId=' + this.data.depFatherId + '&disId=' + this.data.disId);
    if (this.data.userInfo.nxDiuWxOpenId == 'oX2485BL9V-FjEa7bKOkFJcqxD0E') {
      wx.navigateToMiniProgram({
        appId: appId,
        path: '/pages/ai/customer/chefOrder/chefOrder?depFatherId=' + this.data.depFatherId + '&disId=' + this.data.disId + '&entry=boss',
        envVersion: util.getCurrentEnvVersion(), // 动态获取环境版本
        success(res) {
          // that.setData({
          //   toOpenMini: false
          // })
        }
      })
    } else {
      wx.navigateToMiniProgram({
        appId: appId,
        path: '/pages/ai/customer/chefOrder/chefOrder?depFatherId=' + this.data.depFatherId + '&disId=' + this.data.disId + '&entry=boss',
        envVersion: util.getCurrentEnvVersion(), // 动态获取环境版本
        success(res) {
          // that.setData({
          //   toOpenMini: false
          // })
        }
      })
    }

  },



  confirmRouteName(e) {
    var depItem = e.detail.depItem;
    console.log(depItem);
    var data = {
      depId: depItem.nxDepartmentId,
      pickName: depItem.nxDepartmentPickName
    }
    updateDepPickName(data).then(res => {
      if (res.result.code == 0) {
        // this.setData({
        //   editDriverShow: false,
        //   popupType: "",
        // })
        // wx.showToast({
        //   title: 'ok',
        //   icon: 'none'
        // })
        var pages = getCurrentPages();

        var prevPage = pages[pages.length - 2]; //上一个页面
        //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
        prevPage.setData({
          update: true,
        })
        wx.navigateBack({
          delta: 1
        })
      }
    })
  },

  closeRouteName() {
    this.setData({
      editDriverShow: false,
      popupType: "",
    })
  },


  delApply() {

    this.setData({
      warnContent: this.data.goodsName + "  " + this.data.applyItem.nxDoQuantity + this.data.applyItem.nxDoStandard,
      deleteShow: true,
      show: false,
      popupType: 'deleteOrder',
      showPopupWarn: true,
      showOperationGoods: false,
      showOperationLinshi: false
    })

    this.setData({
      showOperationGoods: false,
      showOperationLinshi: false
    })
    this.hideModal();

  },


  confirmWarn() {
    if (this.data.popupType == 'deleteSpec') {
      this.deleteStandardApi()
    } else {
      // 删除申请功能已移除
      wx.showToast({
        title: '删除功能暂不可用',
        icon: 'none'
      })
    }
  },

  deleteStandardApi() {
    var that = this;
    disDeleteStandard(this.data.disStandardId).then(res => {
      if (res.result.code == 0) {
        this.setData({
          popupType: "",
          showPopupWarn: false,
          disStandardId: "",
        })

        that.setData({
          itemDis: res.result.data,
          item: res.result.data,
          editApply: true,
          show: true,

        })
        // this._initData();
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },




  closeWarn() {
    this.setData({

      warnContent: "",
      show: false,
      popupType: '',
      showPopupWarn: false,
    })
  },


  toCheck() {
    if (this.data.orderBy == 'time') {
      this.setData({
        orderBy: "goodsType"
      })
    } else {
      this.setData({
        orderBy: "time"
      })
    }
    this._initData();
  },


  // new
  toOrder(e) {
    if (this.data.depInfo.nxDepartmentEntities.length > 0) {
      this.setData({
        showChoice: true,
        toType: "order"
      })
    } else {
      this.setData({
        showOperation: true,
      })
    }
  },


  selectDepartment(e) {
    console.log(e.currentTarget.dataset.item);
    var dep = e.currentTarget.dataset.item;
    var depFatherId = dep.nxDepartmentId;
    if (dep.nxDepartmentFatherId > 0) {
      depFatherId = dep.nxDepartmentFatherId;
    }
    var depId = dep.nxDepartmentId;
    var depName = this.data.depInfo.nxDepartmentAttrName + "-" + dep.nxDepartmentName;
    this.setData({
      dep: dep,
      depFatherId: depFatherId,
      depId: depId,
      depName: depName,
    })
    if (this.data.openType == 'paste') {
      wx.navigateTo({
        url: '../paste/paste?depFatherId=' + this.data.depFatherId +
          '&depId=' + this.data.depId + '&depName=' + depName +
          '&gbDepFatherId=-1&depSettleType=' + this.data.depSettleType,
      })
    } else if (this.data.openType == 'voice') {
      wx.navigateTo({
        url: '../../../../subPackage/pages/voice/voice?depFatherId=' + this.data.depFatherId +
          '&depId=' + this.data.depId + '&depName=' + depName +
          '&gbDepFatherId=-1&depSettleType=' + this.data.depSettleType,
      })
    } else {
      wx.navigateTo({
        url: '../resGoodsList/resGoodsList?depFatherId=' + this.data.depFatherId +
          '&depId=' + this.data.depId + '&depName=' + depName +
          '&gbDepFatherId=-1&depSettleType=' + this.data.depSettleType +
          '&beforeId=-1',
      })
    }
  },


  toResGoods(e) {
    var subName = this.data.subName;
    var depName = this.data.depName;
    if (subName.length > 0) {
      depName = depName + "-" + subName;
    }
    this.setData({
      showOperationGoods: false
    })

    wx.navigateTo({
      url: '../resGoodsList/resGoodsList?depFatherId=' + this.data.depFatherId +
        '&depId=' + this.data.depId + '&depName=' + depName +
        '&gbDepFatherId=-1&depSettleType=' + this.data.depSettleType +
        '&beforeId=' + e.currentTarget.dataset.id,
    })
  },


  hideOperation() {
    this.setData({
      showOperation: false
    })
  },


  toAddOrder(e) {

    console.log(e.currentTarget.dataset.type)
    var type = e.currentTarget.dataset.type;
    if (this.data.depInfo.nxDepartmentEntities.length > 0) {
      this.setData({
        showChoice: true,
        openType: type,
      })
    } else {

      if (type == 'paste') {
        wx.navigateTo({
          url: '../paste/paste?depFatherId=' + this.data.depFatherId +
            '&depId=' + this.data.depId + '&depName=' + this.data.depName +
            '&gbDepFatherId=-1&depSettleType=' + this.data.depSettleType,
        })

      } else if (type == 'voice') {
        wx.navigateTo({
          url: '../../../../subPackage/pages/voice/voice?depFatherId=' + this.data.depFatherId +
            '&depId=' + this.data.depId + '&depName=' + this.data.depName +
            '&gbDepFatherId=-1&depSettleType=' + this.data.depSettleType,
        })
      } else {
        wx.navigateTo({
          url: '../resGoodsList/resGoodsList?depFatherId=' + this.data.depFatherId +
            '&depId=' + this.data.depId + '&depName=' + this.data.depName +
            '&gbDepFatherId=-1&depSettleType=' + this.data.depSettleType +
            '&beforeId=-1',
        })
      }
    }
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


  openOperationLinshi(e) {
    console.log(e);
    this.setData({
      dep: e.currentTarget.dataset.dep,
      depId: e.currentTarget.dataset.depid,
      showOperationLinshi: true,
      applyItem: e.currentTarget.dataset.item,
      goodsName: e.currentTarget.dataset.name
    })
    this.chooseSezi();
  },



  editDepApplyGoods() {
    this.setData({
      showOperationLinshi: false
    })
     wx.setStorageSync('applyItem', this.data.applyItem);
    wx.navigateTo({
      url: '../../../../subPackage/pages/order/editDepApplyGoods/editDepApplyGoods?name=' + this.data.applyItem.nxDoGoodsName,
    })

  },

  confirmDepApplyGoods() {
    var id = this.data.applyItem.nxDepartmentOrdersId;

    confirmDepApplyGoods(id).then(res => {
      if (res.result.code == 0) {
        this.setData({
          showOperationLinshi: false,
         applyItem: ""
        })
        this._initData();

      }
    })

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


  changeStandard: function (e) {
    this.setData({
      applyStandardName: e.detail.applyStandardName,
      priceLevel: e.detail.level,
    })
    var levelTwoStandard = this.data.applyItem.nxDistributerGoodsEntity.nxDgWillPriceTwoStandard;
    if (this.data.applyStandardName == levelTwoStandard) {
      this.setData({
        printStandard: levelTwoStandard
      })
    } else {
      this.setData({
        printStandard: this.data.applyItem.nxDistributerGoodsEntity.nxDgGoodsStandardname
      })
    }
    console.log("thisdaprinfir", this.data.printStandard)
  },

  hideMaskGoods() {
    this.hideModal();
    this.setData({
      showOperationGoods: false,
    })
  },

  hideChoiceMask() {
    this.setData({
      showChoice: false,
    })
  },

  hideMaskLinshi() {
    this.setData({
      showOperationLinshi: false
    })
  },





  toOpenPrint() {

    if (this.data.finishCount == this.data.totalCount) {
      var nxDisId = this.data.nxDisId;
      var gbDisId = this.data.gbDisId;
      var comId = this.data.comId;
      var gbDepId = this.data.gbDepFatherId;
      var depId = this.data.depFatherId;
      var depName = this.data.name;
      console.log('depFatherId=' + depId + '&depName=' + depName +
        '&gbDepFatherId=' + gbDepId +  '&nxDisId=' + nxDisId + '&gbDisId=' + gbDisId + '&comId=' + comId + '&nxDisPurUserId=' + this.data.userInfo.nxDistributerUserId + '&admin=1&commPurUserId=-1&gbDepUserId=-1')
      

      load.showLoading("保存订单中");
      var bill = {
        nxDbTradeNo: this.data.tradeNo,
        nxDbDepId: this.data.depFatherId,
        nxDbDepFatherId: this.data.depFatherId,
        nxDbTotal: this.data.total,
        nxDbIssueUserId: this.data.userInfo.nxDistributerUserId,
        nxOrderIds: this.data.ids,
        nxDbPrintTimes: 0,
        nxDbGbDisId: this.data.gbDisId,
        nxDbDisId: this.data.nxDisId,
        nxDbGbDepId: this.data.gbDepFatherId,
        nxDbNxCommunityId: this.data.comId,
      }

      console.log(bill);
      saveAccountBillPhoneFeiE(bill)
        .then(res => {
          if (res.result.code == 0) {
            load.hideLoading();
            wx.showToast({
              title: '订单保存成功',
              icon: 'none'
            })
            wx.navigateBack({
              delta: 1
            })
          } else {
            load.hideLoading();
            wx.showToast({
              title: res.result.msg,
              icon: 'none'
            })
          }
        })
    }
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




  /**
   * 修改配送商品申请
   */
  toEditApply() {
    if (this.data.applyItem.nxDoPurchaseStatus < 3) {
      var applyItem = this.data.applyItem;
      if (this.data.depInfo.nxDepartmentSettleType == 0) {
        this.setData({
          showCash: true,
          applySubtotal: applyItem.nxDoSubtotal,
        })
      } else if (this.data.depInfo.nxDepartmentSettleType == 1) {
        this.setData({
          show: true
        })
      }

      this.setData({
        applyStandardName: applyItem.nxDoStandard,
        printStandard: applyItem.nxDoPrintStandard,
        itemDis: this.data.applyItem.nxDistributerGoodsEntity,
        item: this.data.applyItem.nxDepartmentDisGoodsEntity,
        editApply: true,
        applyNumber: applyItem.nxDoQuantity,
        applyRemark: applyItem.nxDoRemark,
        priceLevel: applyItem.nxDoCostPriceLevel
      })
    } else {
      wx.showToast({
        title: '请供货商修改订单状态',
        icon: 'none'
      })

    }
    this.hideModal();
    this.setData({
      showOperationGoods: false
    })
  },

  confirmStandard(e) {
    var data = {
      nxDsDisGoodsId: this.data.itemDis.nxDistributerGoodsId,
      nxDsStandardName: e.detail.newStandardName,
    }
    disSaveStandard(data).
    then(res => {
      if (res.result.code == 0) {
        console.log(res)
        var standardArr = this.data.itemDis.nxDistributerStandardEntities;
        standardArr.push(res.result.data);
        var standards = "itemDis.nxDistributerStandardEntities"
        this.setData({
          [standards]: standardArr,
          applyStandardName: res.result.data.nxDsStandardName,
        })
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },


  confirmCash: function (e) {
    if (this.data.editApply) {
      // 更新订单功能已移除
      wx.showToast({
        title: '修改功能暂不可用',
        icon: 'none'
      })
    }
    this.setData({
      show: false,
      editApply: false,
      applyItem: "",
      item: "",
      applyNumber: "",
      applyStandardName: "",
      printStandard: "",
    })
  },

  confirm: function (e) {
    if (this.data.editApply) {
      // 更新订单功能已移除
      wx.showToast({
        title: '修改功能暂不可用',
        icon: 'none'
      })
    }

    this.setData({
      show: false,
      editApply: false,
      applyItem: "",
      item: "",
      applyNumber: "",
      applyStandardName: "",
      printStandard: "",
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


  haveReceive(e) {
    var status = e.currentTarget.dataset.status;
    var index = e.currentTarget.dataset.index;
    console.log(e.currentTarget.dataset);
    var item = this.data.applyArr[index];
    item.gbDoStatus = status;
    receiveReturnApplyNx(item).then(res => {
      load.showLoading("修改订单")
      if (res.result.code == 0) {
        load.hideLoading();
        this._initData();

      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: "none"
        })
      }
    })
  },

  printPick() {
    console.log("printPickprintPick");
    wx.navigateTo({
      url: '../orderPrint/orderPrint?gbDepFatherId=' + this.data.gbDepFatherId + '&depFatherId=' + this.data.depFatherId + '&name=' + this.data.name + '&hasSubAmount=' + this.data.depInfo.nxDepartmentSubAmount,
    })

  },


  toInputNumber() {

    wx.navigateTo({
      url: '../writePrice/writePrice?depFatherId=' + this.data.depFatherId +
        '&name=' + this.data.name + '&gbDepFatherId=-1' +
        '&depHasSubs=' + this.data.depHasSubs,
    })
  },

  toWeightPage() {
    wx.navigateTo({
      url: '../writeWeight/writeWeight?depFatherId=' + this.data.depFatherId +
        '&name=' + this.data.name + '&depHasSubs=' +
        this.data.depHasSubs + '&gbDepFatherId=-1',
    })
  },



  toPrintOrder() {

    if (this.data.finishCount == this.data.totalCount) {
      if (this.data.userInfo.nxDiuPrintDeviceId == -1) {
        wx.navigateTo({
          url: '../pSearchPrinter/pSearchPrinter',
        })
      } else {
        this.setData({
          deviceId: this.data.userInfo.nxDiuPrintDeviceId
        })

        if (!this.data.printOk) {
          console.log("startSearchstartSearchstartSearch")

          this.startSearch();
        } else {
          console.log("receiptTestreceiptTest")
          this.receiptTest();
        }
      }
    } else {
      wx.showToast({
        title: '有未完成订单,不能打印结账单!',
        icon: 'none'
      })
    }
  },


  //1
  startSearch: function () {
    console.log("startSearchstartSearch")
    if (this.data.deviceId !== "-1") {
      var that = this
      wx.openBluetoothAdapter({
        success: function (res) {
          wx.getBluetoothAdapterState({
            success: function (res) {
              console.log('openBluetoothAdapter success', res)
              if (res.available) {
                if (res.discovering) {
                  wx.stopBluetoothDevicesDiscovery({
                    success: function (res) {
                      console.log(res)
                    }
                  })
                } else {
                  // that.startBluetoothDevicesDiscovery()
                  that.getBluetoothDevices()
                }
                // that.checkPemission()
              } else {
                wx.showModal({
                  title: '提示',
                  content: '本机蓝牙不可用',
                  showCancel: false
                })
              }
            },
          })
        },
        fail: function (e) {
          console.log(e)
          if (e.errCode === 10001) {
            wx.onBluetoothAdapterStateChange(function (res) {
              console.log('onBluetoothAdapterStateChange', res)
              if (res.available) {
                this.startBluetoothDevicesDiscovery()
              }
            })
          }

          wx.showModal({
            title: '提示',
            content: '蓝牙初始化失败，请到设置打开蓝牙',
            showCancel: false
          })
        }
      })
    } else {
      wx.navigateTo({
        url: '../pSearchPrinter/pSearchPrinter',
      })
    }
  },

  getBluetoothDevices: function () { //获取蓝牙设备信息
    var that = this
    this.setData({
      isScanning: true
    })
    wx.startBluetoothDevicesDiscovery({
      success: function (res) {
        console.log(res)
        setTimeout(function () {
          wx.getBluetoothDevices({
            success: function (res) {
              var devices = []
              var num = 0
              for (var i = 0; i < res.devices.length; ++i) {
                if (res.devices[i].name != "未知设备") {
                  devices[num] = res.devices[i]
                  num++
                }
              }
              that.setData({
                list: devices,
                isScanning: false
              })
              load.hideLoading()
              wx.stopBluetoothDevicesDiscovery({
                success: function (res) {
                  console.log("停止搜索蓝牙")
                }
              })
            },
          })
        }, 5000)
        that._connn();
      },
    })
  },


  _connn() {
    var that = this;
    wx.stopBluetoothDevicesDiscovery({
      success: function (res) {
        console.log(res)
      },
    })
    this.setData({
      serviceId: 0,
      writeCharacter: false,
      readCharacter: false,
      notifyCharacter: false
    })
    wx.showLoading({
      title: '正在连接',
    })
    wx.createBLEConnection({
      deviceId: this.data.deviceId,
      success: function (res) {
        console.log(res)
        that.getSeviceId()
      },
      fail: function (e) {
        // wx.showModal({
        //   title: '提示',
        //   content: '连接失败',
        //   showCancel: false
        // })
        if (e.errno !== 1509007) {
          wx.navigateTo({
            url: '../pSearchPrinter/pSearchPrinter',
          })
        }

        console.log(e)
        // wx.hideLoading()
      },
      complete: function (e) {
        console.log(e)
        that.getSeviceId()

      }
    })
  },


  getSeviceId: function () {
    var that = this

    wx.getBLEDeviceServices({
      deviceId: this.data.deviceId,
      success: function (res) {
        that.setData({
          services: res.services
        })
        that.getCharacteristics()
      },
      fail: function (e) {
        console.log(e)
        wx.navigateTo({
          url: '../pSearchPrinter/pSearchPrinter',
        })
      },
      complete: function (e) {
        // console.log(e)
      }
    })
  },

  getCharacteristics: function () {
    var that = this
    var list = this.data.services
    var num = this.data.serviceId
    var write = this.data.writeCharacter
    var read = this.data.readCharacter
    var notify = this.data.notifyCharacter
    wx.getBLEDeviceCharacteristics({
      deviceId: this.data.deviceId,
      serviceId: list[num].uuid,
      success: function (res) {
        console.log(res)
        for (var i = 0; i < res.characteristics.length; ++i) {
          var properties = res.characteristics[i].properties
          var item = res.characteristics[i].uuid
          if (!notify) {
            if (properties.notify) {
              that.data.notifyCharaterId = item
              that.data.notifyServiceId = list[num].uuid
              notify = true
            }
          }
          if (!write) {
            if (properties.write) {
              that.data.writeCharaterId = item
              that.data.writeServiceId = list[num].uuid
              write = true
            }
          }
          if (!read) {
            if (properties.read) {
              that.data.readCharaterId = item
              that.data.readServiceId = list[num].uuid
              read = true
            }
          }
        }
        if (!write || !notify || !read) {
          num++
          that.setData({
            writeCharacter: write,
            readCharacter: read,
            notifyCharacter: notify,
            serviceId: num
          })
          if (num == list.length) {
            wx.showModal({
              title: '提示',
              content: '找不到该读写的特征值',
              showCancel: false
            })
          } else {
            that.getCharacteristics()
          }
        } else {
          wx.showToast({
            title: '连接成功',
          })
          that.setData({
            printOk: true
          })
          // that.receiptTest();
        }
      },
      fail: function (e) {
        console.log(e)
      },
      complete: function (e) {
        console.log("write:" + that.data.writeCharaterId)
        console.log("read:" + that.data.readCharaterId)
        console.log("notify:" + that.data.notifyCharaterId)
      }
    })
  },

  receiptTest: function () { //票据测试

    wx.showToast({
      title: '准备数据',
    })
    var that = this;

    var command = esc.jpPrinter.createNew();
    command.init()
    console.log("printitititiititiiti")
    command.setPrintAndFeedRow(5);
    command.setSelectJustification(1) //居中
    command.setCharacterSize(17); //设置倍高倍宽
    command.setText(that.data.name);
    command.setPrint(); //打印并换行
    command.setPrint(); //打印并换行
    command.setSelectJustification(0) //设置居左 
    command.setCharacterSize(0);
    command.setText("日期: " + that.data.todayDate);
    command.setPrint(); //打印并换行
    command.setPrint();
    command.setSelectJustification(0) //设置居左
    command.setText("   商品")
    command.setAbsolutePrintPosition(228)
    command.setText("数量")
    command.setAbsolutePrintPosition(324)
    command.setText("单价")
    command.setAbsolutePrintPosition(420)
    command.setText("小计")
    command.setPrint();
    command.setText("===============================================")
    command.setPrint();
    console.log("==================ok next");
    // if(this.data.depHasSubs > 0){
    //   that._printSubDepOrderTime(command);
    // }else{
    //   that._printOrderTime(command);
    // }

    that._printOrderTime(command);

    command.setSelectJustification(0) //设置居左  
    command.setText("“" + that.data.disInfo.nxDistributerName + "”" + "为您提供最优的产品！");
    command.setPrint();
    command.setText("有任何问题联系电话:" + that.data.disInfo.nxDistributerPhone);
    command.setPrint();
    command.setPrintAndFeedRow(5);

    that.prepareSend(command.getData()) //准备发送数据
  },

  _printOrderTime(command) {

    // 
    if (this.data.depHasSubs == 0) {
      var ordersArr = this.data.applyArr;
      console.log("orderArr.lenng", ordersArr.length, "this.data.depHasSubs=", this.data.depHasSubs);

      for (var j = 0; j < ordersArr.length; j++) {
        var brand = ordersArr[j].nxDistributerGoodsEntity.nxDgGoodsBrand;
        var standardName = ordersArr[j].nxDistributerGoodsEntity.nxDgGoodsStandardname;
        var goodsName = ordersArr[j].nxDistributerGoodsEntity.nxDgGoodsName;
        var weight = ordersArr[j].nxDoWeight;
        var price = ordersArr[j].nxDoPrice;
        var subtotal = ordersArr[j].nxDoSubtotal;
        command.setText(j + 1 + ", ")
        if (brand !== null && brand.length > 0) {
          command.setText(brand + "-");
        }
        command.setText(goodsName);
        console.log("orderArr.goodsName", goodsName);
        command.setAbsolutePrintPosition(228)
        command.setText(weight + standardName);

        command.setAbsolutePrintPosition(324)
        command.setText(price);
        command.setAbsolutePrintPosition(420)
        command.setText(subtotal);
        command.setPrint();
        var orderRemark = ordersArr[j].nxDoRemark;
        if (orderRemark !== "null" && orderRemark.length > 0) {
          command.setText("   备注:" + orderRemark + "");
          command.setPrint();
        }
        console.log("orkdieriiririr" + subtotal);
        command.setText("-----------------------------------------------")
        command.setPrint();

        //
      }
    } else {
      console.log("this.data.depHasSubsthis.data.depHasSubs")
      console.log("this.data.depHasSubsthis.data.depHasSubs", this.data.depArr.length);
      for (var i = 0; i < this.data.depArr.length; i++) {
        var depName = this.data.depArr[i].depName;
        console.log("depName", depName);
        command.setText("#" + depName);
        command.setPrint();

        var ordersArr = this.data.depArr[i].depOrders;
        console.log("depName-ordersArr", ordersArr.length);
        for (var j = 0; j < ordersArr.length; j++) {
          var brand = ordersArr[j].nxDistributerGoodsEntity.nxDgGoodsBrand;
          var standardName = ordersArr[j].nxDistributerGoodsEntity.nxDgGoodsStandardname;
          var goodsName = ordersArr[j].nxDistributerGoodsEntity.nxDgGoodsName;
          var weight = ordersArr[j].nxDoWeight;
          var price = ordersArr[j].nxDoPrice;
          var subtotal = ordersArr[j].nxDoSubtotal;
          command.setText(j + 1 + ", ")
          if (brand !== null && brand.length > 0) {
            command.setText(brand + "-");
          }
          command.setText(goodsName);
          console.log("orderArr.goodsName", goodsName);
          command.setAbsolutePrintPosition(228)
          command.setText(weight + standardName);

          command.setAbsolutePrintPosition(324)
          command.setText(price);
          command.setAbsolutePrintPosition(420)
          command.setText(subtotal);
          command.setPrint();
          var orderRemark = ordersArr[j].nxDoRemark;
          if (orderRemark !== "null" && orderRemark.length > 0) {
            command.setText("   备注:" + orderRemark + "");
            command.setPrint();
          }
          console.log("orkdieriiririr" + subtotal);
          command.setText("-----------------------------------------------")
          command.setPrint();

          //
        }

      }

    }

    command.setSelectJustification(2);
    command.setCharacterSize(1);
    command.setText("总计:" + this.data.total + "元");
    command.setPrint();
    command.setText("================================================")
    command.setPrint();
  },

  prepareSend: function (buff) { //准备发送，根据每次发送字节数来处理分包数量

    var that = this
    var time = that.data.oneTimeData;

    var looptime = parseInt(buff.length / time);
    var lastData = parseInt(buff.length % time);
    that.setData({
      looptime: looptime + 1,
      lastData: lastData,
      currentTime: 1,
    })
    that.Send(buff)
  },




  Send: function (buff) { //分包发送
    var that = this
    var currentTime = that.data.currentTime
    var loopTime = that.data.looptime
    var lastData = that.data.lastData
    var onTimeData = that.data.oneTimeData
    var printNum = that.data.printerNum
    var currentPrint = that.data.currentPrint
    var buf
    var dataView
    if (currentTime < loopTime) {
      buf = new ArrayBuffer(onTimeData)
      dataView = new DataView(buf)
      for (var i = 0; i < onTimeData; ++i) {
        dataView.setUint8(i, buff[(currentTime - 1) * onTimeData + i])
      }
    } else {
      buf = new ArrayBuffer(lastData)
      dataView = new DataView(buf)
      for (var i = 0; i < lastData; ++i) {
        dataView.setUint8(i, buff[(currentTime - 1) * onTimeData + i])
      }
    }
    console.log("第" + currentTime + "次发送数据大小为：" + buf.byteLength)
    if (buf.byteLength > 0) {
      wx.writeBLECharacteristicValue({
        deviceId: this.data.deviceId,
        serviceId: this.data.writeServiceId,
        characteristicId: this.data.writeCharaterId,
        value: buf,
        success: function (res) {
          var times = that.data.printTimes;
          that.setData({
            showOperation: false,
            printTimes: times + 1,
          })

          if (currentTime == loopTime) {
            //最后一次，保存订单

            console.log("buf.ytlentntnntnt>>>>>>>>>>>0");
            that.setData({
              printTimes: 0
            })
            that.confirmSaveBill()

          }
        },
        fail: function (e) {
          wx.showToast({
            title: '打印第' + currentPrint + '张失败',
            icon: 'none',
          })
        },
        complete: function () {
          currentTime++
          if (currentTime <= loopTime) {
            that.setData({
              currentTime: currentTime
            })
            that.Send(buff)
          } else {
            if (currentPrint == printNum) {
              that.setData({
                looptime: 0,
                lastData: 0,
                currentTime: 1,
                isReceiptSend: false,
                currentPrint: 1
              })

            } else {
              currentPrint++
              that.setData({
                currentPrint: currentPrint,
                currentTime: 1,
              })
              that.Send(buff)
            }
          }
        }
      })
    } else {
      that.setData({
        printTimes: 0
      })
      console.log("buf.ytlentntnntnt ====0");
      that.confirmSaveBill();
    }

  },

  finishDelivery() {
    var id = this.data.applyItem.nxDepartmentOrdersId;
    deliveryOrder(id).then(res => {
      if (res.result.code == 0) {
        this.setData({
          showOperationGoods: false
        })
        this._initData();
      }
    })

  },


  cancleDeliveryOrder() {
    var id = this.data.applyItem.nxDepartmentOrdersId;
    cancleDeliveryOrder(id).then(res => {
      if (res.result.code == 0) {
        this.setData({
          showOperationGoods: false
        })
        this._initData();
      }
    })


  },

  saveBill() {


    if (this.data.finishCount == this.data.totalCount) {
      if (this.data.depHasSubs > 0) {
        this.setData({
          showPopupSaveSub: true,
          popupType: "saveBillSubTishi"
        })
      } else {
        this.setData({
          showPopupSave: true,
          warnContent: "确定不需要打印配送单吗？",
          popupType: "saveBillTishi"
        })
      }
    } else {
      wx.showToast({
        title: '有未完成订单',
        icon: 'none'
      })
    }

  },

  closeSaveBillSub(e) {
    this.setData({
      showPopupSaveSub: false
    })
  },


  confirmSaveBillSub(e) {
    console.log("confirmSaveBillSub", e);
    var saveType = e.detail.saveType;

    if (saveType == 0) {
      console.log("00");
      this.confirmSaveBill();

    } else {

      this.saveBillSub();

    }
  },


  saveBillSub() {
    load.showLoading("保存订单中");
    var data = {
      disId: this.data.disId,
      depFatherId: this.data.depFatherId
    }
    saveAccountBillPhoneSub(data)
      .then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          wx.navigateBack({
            delta: 1
          })
        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
      })
  },

  closeSaveBill() {
    console.log("closeSaveBillcloseSaveBill")
    this.setData({
      showPopupSave: false,
    })
  },

  confirmSaveBill() {
    load.showLoading("保存订单中");
    var bill = {
      nxDbTradeNo: this.data.tradeNo,
      nxDbDepId: this.data.depFatherId,
      nxDbDepFatherId: this.data.depFatherId,
      nxDbTotal: this.data.total,
      nxDbIssueUserId: this.data.userInfo.nxDistributerUserId,
      nxOrderIds: this.data.ids,
      nxDbPrintTimes: 0,
      nxDbGbDisId: this.data.gbDisId,
      nxDbDisId: this.data.nxDisId,
      nxDbGbDepId: this.data.gbDepFatherId,
      nxDbNxCommunityId: this.data.comId,
    }

    console.log(bill);
    saveAccountBillPhone(bill)
      .then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          wx.showToast({
            title: '订单保存成功',
            icon: 'none'
          })
          wx.navigateBack({
            delta: 1
          })
        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
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
  },


  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  }




})

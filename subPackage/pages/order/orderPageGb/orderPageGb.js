var app = getApp()
var load = require('../../../../lib/load.js');
var esc = require("../../../../utils/GPutils/esc.js");
var dateUtils = require('../../../../utils/dateUtil');

import {
  getOrderPageGb,
  phoneGetToFillDepOrders,
  getOrderPageSearch,
  cancleGbOrderSx,
  getGbPurGoods,
  saveAccountBillPhoneSubGb,
  saveAccountBillPhoneGb,
  saveAccountBillPhoneGbAndPrint
} from '../../../../lib/apiDepOrder'

import {
  disInitOrderStatus,
  disSaveStandard,
  receiveReturnApplyNx,
  nxDisSavePurGoodsPriceSx,
} from '../../../../lib/apiDistributer'
import util from '../../../../utils/util';


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
    })
  },
  

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    var todayDate = dateUtils.getWhichFullDate(0);
     var thisTime = new Date().getHours();
    this.setData({
      toDepId: options.toDepId,
      depFatherId: options.depFatherId,
      gbDepFatherId: options.gbDepFatherId,
      resFatherId: options.resFatherId,
      nxDisId: options.nxDisId,
      gbDisId: options.gbDisId,
      comId: options.comId,
      depHasSubs: options.depHasSubs,
      settleTimes: options.settleTimes,
      name: options.name,
      todayDate: todayDate,
      thisTime: thisTime,
      depHasSubs: 0,
      chooseSize: false,
      animationData: {},
      orderBy: "time",
      tradeNo: util.getBillTradeNo(1),
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
    var depInfo = wx.getStorageSync('depItem');
    this.setData({
      depInfo: depInfo
    })

     this._initData();
  },


  _initData() {
  
    var data = {
      depFatherId: this.data.depFatherId,
      gbDepFatherId: this.data.gbDepFatherId,
      resFatherId: this.data.resFatherId,
      disId: this.data.nxDisId
    }
    phoneGetToFillDepOrders(data)
      .then(res => {
        console.log("printdata", res.result.data);
        if (res.result.code == 0) {
          load.hideLoading();
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

        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })
        }

      })


  },


  _initData1() {
    var data = {
      depFatherId: this.data.depFatherId,
      gbDepFatherId: this.data.gbDepFatherId,
      resFatherId:  this.data.resFatherId,
      orderBy: this.data.orderBy,
    }
    load.showLoading("获取订单中")
    getOrderPageGb(data)
      .then(res => {
        if (res.result.code == 0) {
          console.log(res.result.data);
          load.hideLoading();
          if (this.data.depHasSubs == 0) {
            this.setData({
              applyArr: res.result.data.arr,
              total: res.result.data.total,
              profit: res.result.data.profit,
              scale: res.result.data.scale,
              priceCount: res.result.data.priceCount,
            })
           
            if(this.data.orderBy == 'orderPrice'){
              this.setData({
                stockArr: res.result.data.mapP.stock,
                zicaiArr: res.result.data.mapP.zicai,
                wxArr: res.result.data.mapP.wx,
              })
            }
            var that = this;
            var query = wx.createSelectorQuery();
            //选择id
            query.select('#miltest').boundingClientRect()
            query.exec(function (res) {
              //res就是 所有标签为miltest的元素的信息 的数组
              //取高度
              that.setData({
                maskHeight: res[0].height * globalData.rpxR
              })
            })
          }
          if (this.data.depHasSubs > 0) {
            this.setData({
              depArr: res.result.data,
            })
          }
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
        load.hideLoading();
      })
  },

 
  toWeightPage() {
    wx.navigateTo({
      url: '../writeWeightGb/writeWeightGb?gbDepFatherId=' + this.data.gbDepFatherId,
    })
  },

  toInputNumber() {
    wx.navigateTo({
      url: '../writePriceGb/writePriceGb?gbDepFatherId=' + this.data.gbDepFatherId +
        '&name=' + this.data.name + '&depFatherId=-1&resFatherId=-1' +
        '&depHasSubs=' + this.data.depHasSubs,
    })
  },


  toSearch() {
    this.setData({
      isSearching: true,
    })
  },

  getSearchString(e) {
    this.setData({
      searchStr: e.detail.value,
    })
    var data = {
      depFatherId: this.data.depFatherId,
      gbDepFatherId: this.data.gbDepFatherId,
      resFatherId: this.data.resFatherId,
      searchStr: this.data.searchStr
    }
    load.showLoading("获取订单中")
    getOrderPageSearch(data)
      .then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          this.setData({
            searchArr: res.result.data,
          })
        } else {
          this.setData({
            searchArr: []
          })
        }
      })

  },


  stopSearch() {
    this.setData({
      isSearching: false,
      searchStr: "",
      searchArr: [],
    })
    this._initData();

  },



  toOrder(e) {
    wx.navigateTo({
      url: '../resGoodsList/resGoodsList?depFatherId=' + this.data.depFatherId +
        '&depId=' + this.data.depFatherId + '&depName=' + this.data.name +
        '&gbDepFatherId=' + this.data.gbDepFatherId + '&resFatherId=' + this.data.resFatherId + '&depType=' +this.data.depInfo.nxDepartmentType,
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
      color: color,
      applyItem: e.currentTarget.dataset.order,
      isSearching: false
    })
    this.chooseSezi();
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
      applyStandardName: e.detail.applyStandardName
    })
  },

  hideMaskGoods() {
    this.hideModal();
    this.setData({
      showOperationGoods: false,
    })
  },





  toInputOrder(e) {
    var id = e.currentTarget.dataset.id;
    getGbPurGoods(id).then(res =>{
      if(res.result.code == 0){
            var item  = res.result.data;
        this.setData({
          showOperationGoods: false,
          show: true,
          item: item,
          windowHeight: this.data.windowHeight,
        })
    
      }
    })
    
  },
 
  _againSearch() {

    var data = {
      depFatherId: this.data.depFatherId,
      gbDepFatherId: this.data.gbDepFatherId,
      resFatherId: this.data.resFatherId,
      searchStr: this.data.searchStr
    }
    load.showLoading("查询订单")
    getOrderPageSearch(data)
      .then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          this.setData({
            searchArr: res.result.data,
          })
        } else {
          this.setData({
            searchArr: []
          })
        }
      })

  },

  /**
   * 子部门选择
   * @param {}} e 
   */
  selectDepartment(e) {
    var index = e.currentTarget.dataset.index;
    var dep = this.data.subArr[index]

    this.setData({
      depFatherId: dep.nxDepartmentFatherId,
      depId: dep.nxDepartmentId,
      showChoice: false,
      // subDepName: dep.nxDepartmentName,
    })


    wx.navigateTo({
      url: '../resGoodsList/resGoodsList?disId=' + this.data.disId + '&depFatherId=' + this.data.depFatherId + '&depId=' + this.data.depId + '&depName=' + e.currentTarget.dataset.name + '&depType=' +this.data.depInfo.nxDepartmentType,
    })

  },


  
  toOpenPrint() {

    var canPrint = this._checkCanPrint();
    if (canPrint) {

      if(this.data.depInfo.gbDepartmentSubAmount == 1){
        var nxDisId = this.data.nxDisId;
        var gbDisId = this.data.gbDisId;
        var comId = this.data.comId;
        var gbDepFatherId = this.data.gbDepFatherId;
        var gbDepId = this.data.depInfo.gbSubDepartments[0].gbDepartmentId;
        var resId = this.data.resFatherId;
       
        var depName = this.data.name;
        console.log('toDepId=' + this.data.toDepId   + '&depName=' + depName + '&gbDepFatherId=' + gbDepFatherId +'&gbDepId=' + gbDepId + '&resFatherId=' + resId + '&nxDisId=' + nxDisId + '&gbDisId=' + gbDisId + '&comId=' + comId + '&nxDisPurUserId=' + this.data.userInfo.nxDistributerUserId + '&admin=1&commPurUserId=-1&gbDepUserId=-1&issueOrderType=5')
    
          wx.navigateToMiniProgram({
          appId: 'wx2dccb807db0ea0d7',
          path: 'pages/issuePageGbSx/issuePageGbSx?toDepId=' + this.data.toDepId  + '&depName=' + depName + '&gbDepFatherId=' + gbDepFatherId +'&gbDepId=' + gbDepId + '&resFatherId=' + resId + '&nxDisId=' + nxDisId + '&gbDisId=' + gbDisId + '&comId=' + comId + '&nxDisPurUserId=' + this.data.userInfo.nxDistributerUserId + '&admin=1&commPurUserId=-1&gbDepUserId=-1&issueOrderType=5',
          envVersion: 'trial', //release  develop  trial
        })
  
      }
     
    } else {
      wx.showToast({
        title: '有未完成订单',
        icon: 'none'
      })
    }
  },

  toOpenPrint1() {

    var canPrint = this._checkCanPrint();
    if (canPrint) {

      if(this.data.depInfo.gbDepartmentSubAmount == 1){
        var nxDisId = this.data.nxDisId;
        var gbDisId = this.data.gbDisId;
        var comId = this.data.comId;
        var gbDepFatherId = this.data.gbDepFatherId;
        var gbDepId = this.data.depInfo.gbSubDepartments[0].gbDepartmentId;
        var resId = this.data.resFatherId;
       
        var depName = this.data.name;
        console.log('toDepId=' + this.data.toDepId   + '&depName=' + depName + '&gbDepFatherId=' + gbDepFatherId +'&gbDepId=' + gbDepId + '&resFatherId=' + resId + '&nxDisId=' + nxDisId + '&gbDisId=' + gbDisId + '&comId=' + comId + '&nxDisPurUserId=' + this.data.userInfo.nxDistributerUserId + '&admin=1&commPurUserId=-1&gbDepUserId=-1&issueOrderType=5')
    
          wx.navigateToMiniProgram({
          appId: 'wx2dccb807db0ea0d7',
          path: 'pages/issuePageGbSx/issuePageGbSx?toDepId=' + this.data.toDepId  + '&depName=' + depName + '&gbDepFatherId=' + gbDepFatherId +'&gbDepId=' + gbDepId + '&resFatherId=' + resId + '&nxDisId=' + nxDisId + '&gbDisId=' + gbDisId + '&comId=' + comId + '&nxDisPurUserId=' + this.data.userInfo.nxDistributerUserId + '&admin=1&commPurUserId=-1&gbDepUserId=-1&issueOrderType=5',
          envVersion: 'trial', //release  develop  trial
        })
  
      }
     
    } else {
      wx.showToast({
        title: '有未完成订单',
        icon: 'none'
      })
    }
  },


  _checkCanPrint() {
    var arr = this.data.applyArr;
    if (arr.length > 0) {
      var count = 0;
      for (var i = 0; i < arr.length; i++) {
        var subtotal = arr[i].nxDoSubtotal;
        var status = arr[i].nxDoStatus;
        console.log(i  ,"====", subtotal ,"-------", status)
        if (subtotal !== null && subtotal) {
          count = count + 1;
        }
      }
      if (count == arr.length) {
        return true;
      } else {
        return false;
      }
    }
  },



  /**
   * 修改配送商品申请
   */
  editApply() {


    if (this.data.applyItem.nxDoDepartmentId !== -1) {
      var applyItem = this.data.applyItem;

      this.setData({
        show: true,
        applyStandardName: applyItem.nxDoStandard,
        itemDis: this.data.applyItem.nxDistributerGoodsEntity,
        item: this.data.applyItem.nxDepartmentDisGoodsEntity,
        editApply: true,
        applyNumber: applyItem.nxDoQuantity,
        applyRemark: applyItem.nxDoRemark,
      })
    } else {
      wx.showToast({
        title: '不能修改客户订单',
        icon: 'none'
      })

    }
    this.setData({
      showOperationGoods: false
    })
    this.hideModal();


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
        })

      }
    })
  },

  confirm(e) {
    console.log(e);
    var item = e.detail.item;
    item.gbDpgPurchaseDepartmentId = this.data.toDepId
      nxDisSavePurGoodsPriceSx(item).then(res => {
        if (res.result.code == 0) {
          this.setData({
            show: false,
            item: "",
          })
          this._initData();
        }
      })
  },




  deleteOrderPurchase(e) {

    if (this.data.applyItem.nxDoPurchaseGoodsId == null) {
      wx.showModal({
        title: '提示',
        content: '还没有进货',
        showCancel: false
      })
    } else {
      disInitOrderStatus(this.data.applyItem).then(res => {
        if (res.result.code == 0) {
          this.setData({
            showOperationGoods: false
          })
          this._initData()
        } else {
          this.setData({
            showOperationGoods: false
          })
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
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
        // this.setData({
        //   showOperation: false,
        // })
        // this._initData();
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



  saveBill() {
   
    if (this.data.finishCount  == this.data.totalCount) {
      this.setData({
        showPopupSave: true,
        warnContent: "确定不需要打印配送单吗？",
        popupType: "saveBillTishi"
      })
    }else{
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
    var data ={
      disId: this.data.disId,
      depFatherId: this.data.gbDepFatherId
    }
    saveAccountBillPhoneSubGb(data)
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


  _saveBillAndPrint(){
    load.showLoading("保存订单中");
    var bill = {
      nxDbTradeNo: this.data.tradeNo,
      nxDbDepId: this.data.depFatherId,
      nxDbDepFatherId: this.data.depFatherId,
      nxDbTotal: this.data.total,
      nxDbIssueUserId: this.data.userInfo.nxDistributerUserId,
      nxDbPrintTimes: 0,
      nxDbGbDisId: this.data.gbDisId,
      nxDbDisId: this.data.nxDisId,
      nxDbGbDepId: this.data.depInfo.gbDepartmentId,
      nxDbGbDepFatherId: this.data.depInfo.gbDepartmentFatherId,
      nxDbNxCommunityId: this.data.comId,
      nxDbNxRestrauntId: this.data.resFatherId
    }
    
    saveAccountBillPhoneGbAndPrint(bill)
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


  confirmSaveBill() {
    load.showLoading("保存订单中");
    var bill = {
      nxDbTradeNo: this.data.tradeNo,
      nxDbDepId: this.data.depFatherId,
      nxDbDepFatherId: this.data.depFatherId,
      nxDbTotal: this.data.total,
      nxDbIssueUserId: this.data.userInfo.nxDistributerUserId,
      nxDbPrintTimes: 0,
      nxDbGbDisId: this.data.gbDisId,
      nxDbDisId: this.data.nxDisId,
      nxDbGbDepId: this.data.gbDepFatherId,
      nxDbGbDepFatherId: this.data.gbDepFatherId,
      nxDbNxCommunityId: this.data.comId,
      nxDbNxRestrauntId: this.data.resFatherId
    }

    console.log(bill);
    saveAccountBillPhoneGb(bill)
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

  cancleGbOrderSx(e){
    console.log(e);
    var id = e.currentTarget.dataset.id;
    cancleGbOrderSx(id).then(res =>{
      if(res.result.code == 0){
        this.setData({
          showOperationGoods:false,
          applyItem: ""
        })
           this._initData();
      
      }
    })
  },



  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },


  

  toPrintOrder() {
   
    if (this.data.finishCount == this.data.totalCount) {
      this._saveBillAndPrint();
    } else {
      wx.showToast({
        title: '有未完成订单,不能打印结账单!',
        icon: 'none'
      })
    }
  },

  toPrintOrder1() {
   
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
        }else{
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

  queryStatus: function () { //查询打印机状态
    var that = this
    var buf;
    var dateView;
    /*
    n = 1：传送打印机状态
    n = 2：传送脱机状态
    n = 3：传送错误状态
    n = 4：传送纸传感器状态
    */
    buf = new ArrayBuffer(3)
    dateView = new DataView(buf)
    dateView.setUint8(0, 16)
    dateView.setUint8(1, 4)
    dateView.setUint8(2, 2)
    wx.writeBLECharacteristicValue({
      deviceId: this.data.deviceId,
      serviceId: this.data.writeServiceId,
      characteristicId: this.data.writeCharaterId,
      value: buf,
      success: function (res) {
        console.log("发送成功")
        that.setData({
          isQuery: true
        })
      },
      fail: function (e) {
        wx.showToast({
          title: '发送失败',
          icon: 'none',
        })
        console.log(e)
        return;
      },
      complete: function () {

      }
    })

    wx.notifyBLECharacteristicValueChange({
      deviceId: this.data.deviceId,
      serviceId: this.data.notifyServiceId,
      characteristicId: this.data.notifyCharaterId,
      state: true,
      success: function (res) {
        wx.onBLECharacteristicValueChange(function (r) {
          console.log(`characteristic ${r.characteristicId} has changed, now is ${r}`)
          var result = ab2hex(r.value)
          console.log("返回" + result)
          var tip = ''
          if (result == 12) { //正常
            tip = "正常"
          } else if (result == 32) { //缺纸
            tip = "缺纸"
          } else if (result == 36) { //开盖、缺纸
            tip = "开盖、缺纸"
          } else if (result == 16) {
            tip = "开盖"
          } else if (result == 40) { //其他错误
            tip = "其他错误"
          } else { //未处理错误
            tip = "未知错误"
          }
          wx.showModal({
            title: '打印机状态',
            content: tip,
            showCancel: false
          })
        })
      },
      fail: function (e) {
        wx.showModal({
          title: '打印机状态',
          content: '获取失败',
          showCancel: false
        })
        console.log(e)
      },
      complete: function (e) {
        that.setData({
          isQuery: false
        })
        console.log("执行完成")
      }
    })
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





})
var app = getApp()
var load = require('../../../../lib/load.js');
var esc = require("../../../../utils/GPutils/esc.js");
var dateUtils = require('../../../../utils/dateUtil');

import {

  getGbPurGoods,
  cancleGbOrder,
  phoneGetToFillDepOrdersGb,
  nxDisGetGbBatchOrders,
  receiveReturnApplyNx,
  saveAccountBillPhoneGb,
  saveAccountBillPhoneSubGb,
  nxDisPrintGbPurBatch
} from '../../../../lib/apiDepOrder'

import {
  nxDisSavePurGoodsPrice,
} from '../../../../lib/apiDistributer'


Page({

  onShow() {

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
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      batchId: options.batchId,
      img: 'userImage/index_share.png',
    })

   var supplier = wx.getStorageSync('supplierItem');
   if(supplier){
     this.setData({
       supplier: supplier,
       name: supplier.nxJrdhsSupplierName
     })
   }
   var batchItem = wx.getStorageSync('batchItem');
   if(batchItem){
     this.setData({
      batchItem: batchItem,
     })
   }
   
  },

//

_initData() {
  
  nxDisGetGbBatchOrders(this.data.batchId)
    .then(res => {
      console.log("printdata", res.result.data);
      if (res.result.code == 0) {
        load.hideLoading();
        this.setData({
          applyArr: res.result.data.arr,
        })
       this._countCanSave();

      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: "none"
        })
      }

    })

},


_countCanSave(){
  var arr  = this.data.applyArr;
  var finishCount = 0;
  if(arr.length > 0){
    for(var i = 0 ; i < arr.length; i++){
      var status = arr[i].nxDoPurchaseStatus;
      if(status == 4){
        finishCount = finishCount + 1;
      }
    }
  }

  if(finishCount == arr.length){
    this.setData({
      canSave: true,
    })
  }else{
    this.setData({
      canSave: false
    })
  }
},


  _initData1() {
  

    var data = {
      depFatherId: this.data.depFatherId,
      gbDepFatherId: this.data.gbDepFatherId,
      resFatherId: this.data.resFatherId,
      disId: this.data.nxDisId
    }
    phoneGetToFillDepOrdersGb(data)
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

  hideMaskGoods() {
    this.hideModal();
    this.setData({
      showOperationGoods: false,
    })
  },



  toPurGoods(e) {
    var id = e.currentTarget.dataset.id;
    var disId = e.currentTarget.dataset.disid;
    var name = e.currentTarget.dataset.name;
    console.log(e);
    wx.navigateTo({
      url: '../purGoods/purGoods?id=' + this.data.batchId,
    })



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


  confirm(e) {
    console.log(e);
    var item = e.detail.item;
    item.gbDpgPurchaseDepartmentId = this.data.toDepId
      nxDisSavePurGoodsPrice(item).then(res => {
        if (res.result.code == 0) {
          this.setData({
            show: false,
            item: "",
          })
          this._initData();
        }
      })
  },




  printPick(){
    wx.navigateTo({
      url: '../orderPrint/orderPrint?gbDepFatherId=' + this.data.gbDepFatherId
       + '&depFatherId=' + this.data.depFatherId + '&resFatherId=' + this.data.resFatherId + '&name=' + this.data.name  ,
    })
    
  },



  toWeightPage() {
    wx.navigateTo({
      url: '../writeWeightGb/writeWeightGb?batchId=' + this.data.batchId,
    })
  },


  toInputNumber() {
    wx.navigateTo({
      url: '../writePriceGb/writePriceGb?gbDepFatherId=' + this.data.gbDepFatherId +
        '&name=' + this.data.name + '&depFatherId=-1&resFatherId=-1' +
        '&depHasSubs=' + this.data.depHasSubs,
    })
  },



  toInputOrder(e) {
    console.log(e);
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

  cancleGbOrder(e){
    console.log(e);
    var id = e.currentTarget.dataset.id;
    cancleGbOrder(id).then(res =>{
      if(res.result.code == 0){
        this.setData({
          showOperationGoods:false,
          applyItem: ""
        })
           this._initData();
      
      }
    })
  },

  // /// #elif 



  saveBill() {
   console.log("hwhww",this.data.batchItem.gbDpbStatus)
    if (this.data.batchItem.gbDpbStatus == 1) {
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

  confirmSaveBill() {
    load.showLoading("保存订单中");
    // var bill = {
    //   nxDbTradeNo: this.data.tradeNo,
    //   nxDbDepId: this.data.depFatherId,
    //   nxDbDepFatherId: this.data.depFatherId,
    //   nxDbTotal: this.data.total,
    //   nxDbIssueUserId: this.data.userInfo.nxDistributerUserId,
    //   nxDbPrintTimes: 0,
    //   nxDbGbDisId: this.data.gbDisId,
    //   nxDbDisId: this.data.nxDisId,
    //   nxDbGbDepId: this.data.gbDepFatherId,
    //   nxDbGbDepFatherId: this.data.gbDepFatherId,
    //   nxDbNxCommunityId: this.data.comId,
    //   nxDbNxRestrauntId: this.data.resFatherId
    // }

    // console.log(bill);
    nxDisPrintGbPurBatch(this.data.batchId)
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

  confirmSaveBill1() {
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


  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },



 

})
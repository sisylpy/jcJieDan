


import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');


import {
  
  sellerAndBuyerGetAccountBillsGb,
  finishBill,
  changePrintName,
} from '../../../../lib/apiDepOrder'

import {
  deleteBillGb,
  deleteBillAgainGb,
  updateGbDisAttrName
} from '../../../../lib/apiDistributer'

Page({

  onShow(){
    this._getAccountBills();
  
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const app = getApp();
    const globalData = app.globalData;

    var value = wx.getStorageSync('userInfo');
      if (value) {
        this.setData({
          disId: value.nxDistributerEntity.nxDistributerId,
          userInfo: value, 
        })
      }

      var nxDisBusiness = wx.getStorageSync('nxDisBusiness');
      if(nxDisBusiness){
        this.setData({
          nxDisBusiness: nxDisBusiness,
          gbDisInfo: nxDisBusiness.gbDistributerEntity
        })
      }
      
      
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      url: apiUrl.server,
      hide: false,
      scrollTop: 0 ,
      gbDisId: options.gbDisId, 
      nxCommId: "-1",
    })
    
  },




 _getAccountBills(){
  var data = {
    disId : this.data.disId,
    gbDisId : this.data.gbDisId,
    nxCommId: this.data.nxCommId
   }
   load.showLoading("获取账单")
   sellerAndBuyerGetAccountBillsGb(data).then(res => {
     console.log(res.result.data);
    load.hideLoading()
    if(res.result.code == 0){
      var total = 0;
      for(var i = 0; i < res.result.data.arr.length; i++){
        total = total + res.result.data.arr[i].arr.length;
      }
      this.setData({
        accountBillArr: res.result.data.arr,
        totalSettle: res.result.data.total,
        totalArr: total
      })
    }else{
      wx.showToast({
        title:  res.result.msg,
        icon: "none"
      })
    }
  })
 },



openSalesBill(e){
   wx.navigateTo({
     url: '../cashPage/cashPage?billId=' + e.currentTarget.dataset.id
     + '&depFatherId=' + this.data.depInfo.nxDepartmentId +'&depHasSubs='
     + this.data.depInfo.nxDepartmentSubAmount + '&depName=' + this.data.depInfo.nxDepartmentName,
   })
},

openAccountBill(){
  this.setData({
    showOperation:false
  })
  var dep = this.data.dep;
  var depHasSubs = dep.gbDepartmentSubAmount;
  console.log(dep);
  wx.navigateTo({
    url: '../issuePageGb/issuePageGb?billId=' + this.data.id+'&depHasSubs=' + depHasSubs  + '&depFatherId=' + dep.gbDepartmentFatherId + '&depName=' + dep.gbDepartmentName,
  })

},


  /**
   * 关闭操作面板
   */
  hideMask() {
    this.setData({
      showOperation: false,
    
    })
    
  },

  toStars(){
    console.log("a")
    wx.navigateTo({
      url: '../jrdhGoodsStars/jrdhGoodsStars?id=' + this.data.disId +'&from=navigate' ,
    })
  },


openAccountBillRes(e){
  wx.navigateTo({
    url: '../issuePageGb/issuePageGb?billId=' + e.currentTarget.dataset.id+'&depHasSubs=0' + '&depFatherId=-1' ,
  })
},

openAccountReturnBill(e){
  this.setData({
    selAmount: 0,
    selectArr: [],
    total: 0,
  })

  wx.navigateTo({
    url: '../issueReturnPage/issueReturnPage?billId=' + e.currentTarget.dataset.id
    + '&depName=' + e.currentTarget.dataset.item.gbDepartmentName + '&depFatherId='
    + e.currentTarget.dataset.item.gbDepartmentId ,
  })
},

toSettleBills(e){
  wx.navigateTo({
    url: '../settleAccountGb/settleAccountGb?gbDisId=' + this.data.gbDisId,
  })
},



  /**
   * 打开操作面板
   * @param {}} e 
   */
  openOperation(e) {
    console.log(e);
    this.setData({
      showOperation: true,
      billItem: e.currentTarget.dataset.item,
      id: e.currentTarget.dataset.id,
      dep: e.currentTarget.dataset.dep,
    })

    this.chooseSezi();

  },


  //  //////////////
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





  openDetail(){
   
    wx.navigateTo({
      url: '../customerDetailGb/customerDetailGb?gbDisId=' + this.data.gbDisId ,
    })
  },

  closeEditGroupInfo(){
    this.setData({
      editArrShow: false,
    })
  },


  radioChangePrint(e){
    var value = e.detail.value;
    var depData = "gbDisInfo.gbDistributerEntity.gbDistributerPrintName";
    if(value == 0){
      this.setData({
        [depData] : "ApplyPanel"
      })
    }
    if(value == 1){
      this.setData({
        [depData] : "ApplyFiftyPanel"
      })
    }
    if(value == 2){
      this.setData({
        [depData] : "ApplyHalfWholePanel"
      })
    }
    if(value == 3){
      this.setData({
        [depData] : "ApplyHalfPanel"
      })
    }
    if(value == 4){
      this.setData({
        [depData] : "BlueToothPrint"
      })
    }
  },

  updateDepInfo() {
    changePrintName(this.data.gbDisInfo.gbDistributerEntity).then(res => {
        if (res.result.code == 0) {
          wx.showToast({
            title: '修改成功',
          })
          var data = "gbDisInfo.gbDistributerEntity";
          this.setData({
            [data]: res.result.data,
            editArrShow: false,
            showOperation: false,
          }) 
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
      })  
  },

  deleteBill(){
    load.showLoading("删除订单");
    var that =  this;
    deleteBillGb(this.data.id).then(res =>{
      if(res.result.code == 0){
        load.hideLoading();
        this._getAccountBills()
      }else{
        wx.showModal({
          title: '重要提示!',
          content: res.result.msg,
          complete: (res) => {
            if (res.cancel) {
              
            }
        
            if (res.confirm) {
              that.sureDelBill();
            }
          }
        })
        
      }
    })
  },

  
sureDelBill(){
  load.showLoading("删除订单");
  deleteBillAgainGb(this.data.id).then(res =>{
    if(res.result.code == 0){
      load.hideLoading();
      this._getAccountBills()
    }else{

      wx.showToast({
        title: res.result.msg,
        icon: 'none'
      })
    }
  })
},


getDisPickName(e){
  var depInfoDepAttrName = "gbDisInfo.gbDistributerEntity.gbDistributerPickName";
  this.setData({
    [depInfoDepAttrName]: e.detail.value
  })

},  

updateDisName(){

  updateGbDisAttrName(this.data.gbDisInfo.gbDistributerEntity).then(res =>{
    if(res.result.code == 0){
      var data = "gbDisInfo.gbDistributerEntity"
      this.setData({
        [data]: res.result.data,
        editArrShow: false

      })
    }
  })



},


toBack(){
  wx.navigateBack({
    delta: 1,
  })
},







})
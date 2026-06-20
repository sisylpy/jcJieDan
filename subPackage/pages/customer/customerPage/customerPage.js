

import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');

import {
  sellerAndBuyerGetSalesBills, 
  sellerAndBuyerGetAccountBills,
  getDepInfo,
  deleteBill,
  deleteBillAgain,
  deleteBillReturn,
  downloadBillExcel
} from '../../../../lib/apiDistributer'


Page({

  onShow(){
    if(this.data.settleType == 0){
      console.log(this.data.settleType)
      this._getSalesBills();
    }

    if(this.data.settleType == 1){
      this._getAccountBills();
    }
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
      getDepInfo(options.depId)
      .then(res =>{
        if(res.result.code == 0){
          this.setData({
            depInfo: res.result.data,
            settleType : res.result.data.nxDepartmentSettleType,
            depHasSubs: res.result.data.nxDepartmentSubAmount
          })
          wx.setStorageSync('depInfo', res.result.data);
          if(this.data.settleType == 0){
            console.log(this.data.settleType)
            this._getSalesBills();
          }
      
          if(this.data.settleType == 1){
            this._getAccountBills();
          }
      
        }
      })
      

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      rpxR: globalData.rpxR,
      url: apiUrl.server,
      hide: false,
      scrollTop: 0    
    })
   
  },




 _getSalesBills(){
   var data = {
    disId : this.data.disId,
    depFatherId : this.data.depInfo.nxDepartmentId,
   }
   load.showLoading("获取订单中")
   sellerAndBuyerGetSalesBills(data).then(res => {
     load.hideLoading();
    if(res.result.code == 0){
      var total = 0;
      this.setData({
        billArr: res.result.data,
        totalArr: total
      })
      var that = this;
        var query = wx.createSelectorQuery();
        //选择id
        query.select('#mjltest').boundingClientRect()
        query.exec(function (res) {
          that.setData({
            maskHeight:  res[0].height * that.data.rpxR + 50
          })
        })
    }else{
      wx.showToast({
        title: res.result.msg,
        icon: 'none'
      })
    }
  })
 },

 _getAccountBills(){
  var data = {
    disId : this.data.disId,
    depFatherId : this.data.depInfo.nxDepartmentId,
   }
   load.showLoading("获取账单")
   sellerAndBuyerGetAccountBills(data).then(res => {
    load.hideLoading()
    console.log("res", res.result.data);
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
      var that = this;
      var query = wx.createSelectorQuery();
      //选择id
      query.select('#mjltest').boundingClientRect()
      query.exec(function (res) {
        that.setData({
          maskHeight:  res[0].height * that.data.rpxR + 50
        })
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

openAccountBill(e){
  this.setData({
    selAmount: 0,
    selectArr: [],
    total: 0,
  })
  wx.navigateTo({
    url: '../issuePage/issuePage?billId=' + this.data.id
    + '&depName=' + this.data.depInfo.nxDepartmentName + '&depFatherId='
    + this.data.depInfo.nxDepartmentId + '&depHasSubs=' + this.data.depHasSubs,
  })
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


  /**
   * 
   * @param {*} e 
   */
  // onPageScroll: function (e) { // 页面滚动监听
  //   console.log(e)
  //   this.setData({
  //     scrollViewTop: e.scrollTop,
  //   })


  //   var _this = this;
  //   if (e.scrollTop <= 0) {
  //     e.scrollTop = 0;
  //   } else if (e.scrollTop > wx.getSystemInfoSync().windowHeight) {
  //     e.scrollTop = wx.getSystemInfoSync().windowHeight;
  //   }

  //   if (e.scrollTop > this.data.scrollTop || e.scrollTop == wx.getSystemInfoSync().windowHeight) {
  //     this.setData({
  //       hide: true
  //     })
  //   } else {
  //     this.setData({
  //       hide: false
  //     })
  //   }
  //   setTimeout(function () {
  //     _this.setData({
  //       scrollTop: e.scrollTop
  //     })
  //   }, 0)

  // },

  /**
   * 打开操作面板
   * @param {}} e 
   */
  openOperation(e) {
    this.setData({
      showOperation: true,
      id: e.currentTarget.dataset.id,
      billItem: e.currentTarget.dataset.item,
     
    })
    this.chooseSezi();

  },

  /**
   * 关闭操作面板
   */
  hideMask() {
    this.setData({
      showOperation: false,
     
      
    })
    this.hideModal();

  },


openAccountReturnBill(e){
 
  wx.navigateTo({
    url: '../issueReturnPage/issueReturnPage?billId=' + this.data.id
    + '&depName=' + this.data.depInfo.nxDepartmentName + '&depFatherId='
    + this.data.depInfo.nxDepartmentId ,
  })
},

toSettleBills(e){
  wx.navigateTo({
    url: '../settleAccount/settleAccount?depId=' + this.data.depInfo.nxDepartmentId,
  })
},

openDetail(){
  wx.navigateTo({
    url: '../customerDetail/customerDetail',
  })
},

  /**
   * 下载账单Excel（需后端实现 download/downloadBillExcelNx 接口，并在响应头返回文件名）
   */
  downloadBillExcel() {
    const billId = this.data.id;
    if (!billId) {
      wx.showToast({ title: '账单信息异常', icon: 'none' });
      return;
    }
    this.hideMask();
    load.showLoading('生成Excel中...');
    downloadBillExcel(billId)
      .then(({ arrayBuffer, fileName }) => {
        const fs = wx.getFileSystemManager();
        const savePath = `${wx.env.USER_DATA_PATH}/${fileName}`;
        fs.writeFile({
          filePath: savePath,
          data: arrayBuffer,
          encoding: 'binary',
          success: () => {
            load.hideLoading();
            wx.openDocument({
              filePath: savePath,
              fileType: 'xlsx',
              showMenu: true,
              success: () => {},
              fail: (err) => {
                console.error('打开文档失败:', err);
                wx.showModal({
                  title: '提示',
                  content: '文件已保存，请使用办公软件打开',
                  showCancel: false
                });
              }
            });
          },
          fail: (err) => {
            load.hideLoading();
            console.error('保存失败:', err);
            wx.showToast({ title: '保存失败', icon: 'none' });
          }
        });
      })
      .catch((err) => {
        load.hideLoading();
        wx.showToast({
          title: err.message || '下载失败',
          icon: 'none'
        });
      });
  },

toOpenPrint() {
    
  wx.navigateToMiniProgram({
    appId: 'wx2dccb807db0ea0d7',
    path: 'pages/issuePageTwo/issuePageTwo?billId=' + this.data.billId +'&depFatherId=' + this.data.depFatherId + '&depHasSubs=' + this.data.depHasSubs + '&depName=' + this.data.depName +'&userId=' + this.data.userInfo.nxDistributerUserId,
    envVersion: 'trial', //release  develop  trial
  })
},


deleteBill(){
  load.showLoading("删除订单");
  var that = this;
  deleteBill(this.data.id).then(res =>{
    if(res.result.code == 0){
      load.hideLoading();
      if(this.data.settleType == 0){
        this._getSalesBills()
      }
      if(this.data.settleType == 1){
        this._getAccountBills()
      }
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

deleteReturnBill(){

  deleteBillReturn(this.data.id).then(res =>{
    if(res.result.code == 0){
      load.hideLoading();
      if(this.data.settleType == 0){
        this._getSalesBills()
      }
      if(this.data.settleType == 1){
        this._getAccountBills()
      }
    }else{
     wx.showToast({
       title: res.result.msg,
       icon: 'none'
     })
     
      
    }
  })

},

sureDelBill(){
  load.showLoading("删除订单");
  deleteBillAgain(this.data.id).then(res =>{
    if(res.result.code == 0){
      load.hideLoading();
      if(this.data.settleType == 0){
        this._getSalesBills()
      }
      if(this.data.settleType == 1){
        this._getAccountBills()
      }
    }else{

      wx.showToast({
        title: res.result.msg,
        icon: 'none'
      })
    }
  })
},

toBack(){
  wx.navigateBack({
    delta: 1,
  })
},

onUnload() {
  wx.removeStorageSync('depInfo');
},







})
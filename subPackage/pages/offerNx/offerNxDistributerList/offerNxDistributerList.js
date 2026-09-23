var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config.js'
var dateUtils = require('../../../../utils/dateUtil');


import {
  nxDisGetAllOfferNxDis,
  deleteNxDisSuppler,
  unblockPartner,
  blockPartner,
  removePartner,
  setHideMyCatalogFromPartner,
  unsetHideMyCatalogFromPartner
} from '../../../../lib/apiDistributer'


Page({

  /**
   * 页面的初始数据
   */
  data: {
    buyer: false,
    seller: false,
    scrollViewHeight: 800,
  },

  onShow(){

   
    const app = getApp();
    const globalData = app.globalData;
    const sysInfo = wx.getSystemInfoSync();
    const windowHeightRpx = (globalData.windowHeight || sysInfo.windowHeight) * (globalData.rpxR || 750 / sysInfo.windowWidth);
    const navBarHeightRpx = (globalData.navBarHeight || 44) * (globalData.rpxR || 750 / sysInfo.windowWidth);
    const scrollViewHeight = Math.max(400, windowHeightRpx - navBarHeightRpx - 100);
    this.setData({ scrollViewHeight });

    // 从 searchDate 返回时 update 为 true，新日期已通过 prevPage.setData 设置，不要用 storage 覆盖
    if (!this.data.update) {
      var myDate = wx.getStorageSync('myDate');
      if(myDate){
        console.log("reeee", myDate)
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
       })
  
      }else{
        this.setData({
          dateType: 'month',
          startDate: dateUtils.getFirstDateInMonth(),
          stopDate: dateUtils.getArriveDate(0),
          hanzi:  "本月",
        })
      }
    } else {
      // 从 searchDate 返回，新日期已设置，清除 update 并刷新接口
      this.setData({ update: false }, () => {
        this._initData();
      });
      return;
    }

    this._initData();
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const app = getApp();
    const globalData = app.globalData;
    const sysInfo = wx.getSystemInfoSync();
    const windowHeightRpx = (globalData.windowHeight || sysInfo.windowHeight) * (globalData.rpxR || 750 / sysInfo.windowWidth);
    const navBarHeightRpx = (globalData.navBarHeight || 44) * (globalData.rpxR || 750 / sysInfo.windowWidth);
    const topBarHeight = 100;
    const scrollViewHeight = Math.max(400, windowHeightRpx - navBarHeightRpx - topBarHeight);

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: windowHeightRpx,
      navBarHeight: navBarHeightRpx,
      scrollViewHeight: scrollViewHeight,
      disId: options.disId,
      userId: options.userId,
      url: apiUrl.server,
      imgUrl: "userImage/hezuo.png"
    })

 var myDate = wx.getStorageSync('myDate');
    if(myDate){
      // 如果是自定义日期，传递具体的开始和结束日期
      var dateRange;
      if (myDate.name === 'custom') {
        dateRange = dateUtils.getDateRange(myDate.name, myDate.startDate, myDate.stopDate);
      } else {
        dateRange = dateUtils.getDateRange(myDate.name);
      }
    
      this.setData({
        startDate: dateRange.startDate,
        stopDate: dateRange.stopDate,
        dateType: myDate.dateType,
        hanzi: myDate.hanzi || dateRange.name,
      })
    }else{
      this.setData({
        dateType: 'month',
        startDate: dateUtils.getFirstDateInMonth(),
        stopDate: dateUtils.getArriveDate(0),
        hanzi:  "本月",
      })
    }
    var disInfo = wx.getStorageSync('disInfo');
    if(disInfo){
      this.setData({
        disInfo: disInfo
      })
    }
   
  },


  _initData(){
    var data ={
      nxDisId: this.data.disId,
      userId: 0,
      startDate: this.data.startDate,
      stopDate: this.data.stopDate
    }
    nxDisGetAllOfferNxDis(data).then(res =>{
      if(res.result.code == 0){
        console.log(res.result.data)
        this.setData({
          supplierArr: res.result.data
        })
      }
    })
  },

  
  /**
   * 邀请采购员
   * @param {*} options 
   */
  onShareAppMessage: function (options) {
    let inviteType = 1;
    if (options.from === 'button' && options.target && options.target.dataset) {
      inviteType = parseInt(options.target.dataset.inviteType, 10) || 1;
    }
    const disName = encodeURIComponent((this.data.disInfo && this.data.disInfo.nxDistributerName) || '');
    return {
      title: inviteType === 1 ? '邀请协作配送商给我供货' : '邀请协作配送商采购我的商品',
      path: '/subPackage/pages/offerNx/inviteOfferDis/inviteOfferDis?disId=' + this.data.disId + '&disName=' + disName + '&inviteType=' + inviteType,
      imageUrl: this.data.url + this.data.imgUrl,
    }
  },


  toSupplierDetail(e) {
    console.log("ee",e);
    wx.setStorageSync('collItem', e.currentTarget.dataset.item);
    const item = e.currentTarget.dataset.item;
    const url = '../nxDisBills/nxDisBills?requestDisId=' + item.nxDistributerId
      + '&value=' + e.currentTarget.dataset.value + '&type=' + e.currentTarget.dataset.type
      + '&startDate=' + (this.data.startDate || '') + '&stopDate=' + (this.data.stopDate || '') + '&dateType=' + (this.data.dateType || 'month')
      + '&hanzi=' + encodeURIComponent(this.data.hanzi || '');
    wx.navigateTo({ url });
  },
 
  openOperation(e) {   
    this.setData({
      showOperation: true,
      supplierItem: e.currentTarget.dataset.item,
    })
    this.chooseSezi();

  },


  hideMask() {
   
    this.setData({
      showOperation: false,
    })
  },

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
  
  
  buyerCheckUnPay(e){
    console.log("buyercheneem")
    wx.setStorageSync('supplierItem', this.data.supplierItem);
    wx.navigateTo({
      url: '../buyerCheckUnPay/buyerCheckUnPay?disId=' + this.data.disId ,
    })
  },

  toSupplierGoods(){
  var supplierId = this.data.supplierItem.nxJrdhSupplierId;
   wx.setStorageSync('supplierItem', this.data.supplierItem);
  wx.navigateTo({
    url: '../goodsIndex/goodsIndex?disId=' + this.data.disId + '&supplierId='
    +  supplierId,
  })
  },


  edit(e){
    wx.setStorageSync('supplierItem', this.data.supplierItem);
    wx.navigateTo({
      url: '../addSupplier/addSupplier?type=edit'
    })
  },

  deleteSuppler(){
    this.setData({
      deleteShow: true,
    })

  },
  deleteNo(){
    this.setData({
      deleteShow: false,
      supplierItem: "",
    })
  },

  deleteYes(){

    deleteNxDisSuppler(this.data.supplierItem.nxJrdhSupplierId)
    .then(res =>{
      if(res.result.code == 0){
        this.setData({
          deleteShow: false,
          supplierItem: "",
        })
        this._initData()
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

  toggleBlockPartner() {
    const supplier = this.data.supplierItem;
    if (!supplier) return;
    const isBlocked = supplier.itemData && supplier.itemData.blockedByMe;
    const title = isBlocked ? '恢复协作' : '暂停协作';
    const content = isBlocked ? '恢复后，将重新显示对方商品。' : '暂停协作后，将不显示对方商品。';
    wx.showModal({
      title,
      content,
      success: (res) => {
        if (res.confirm) {
          load.showLoading();
          const api = isBlocked ? unblockPartner : blockPartner;
          api({
            blockerDisId: this.data.disId,
            blockedDisId: supplier.nxDistributerId,
          }).then(res => {
            load.hideLoading();
            if (res.result.code === 0) {
              wx.showToast({ title: '操作成功' });
              this.hideMask();
              this._initData();
            } else {
              wx.showToast({ title: res.result.msg || '操作失败', icon: 'none' });
            }
          }).catch(() => {
            load.hideLoading();
          });
        }
      },
    });
  },

  toggleHideMyCatalog() {
    const supplier = this.data.supplierItem;
    if (!supplier) return;
    const isHidden = supplier.itemData && supplier.itemData.blockedMe;
    const api = isHidden ? unsetHideMyCatalogFromPartner : setHideMyCatalogFromPartner;
    const action = isHidden ? '给他看我的商品' : '不给他看我的商品';
    load.showLoading();
    api({
      myDisId: this.data.disId,
      partnerDisId: supplier.nxDistributerId,
    }).then(res => {
      load.hideLoading();
      if (res.result.code === 0) {
        wx.showToast({ title: '操作成功' });
        this.hideMask();
        this._initData();
      } else {
        wx.showToast({ title: res.result.msg || '操作失败', icon: 'none' });
      }
    }).catch(() => {
      load.hideLoading();
    });
  },

  removePartnerConfirm() {
    const supplier = this.data.supplierItem;
    if (!supplier) return;
    wx.showModal({
      title: '解除协作',
      content: '解除后，双方将无法互相采购/供货，确定要解除吗？',
      success: (res) => {
        if (res.confirm) {
          load.showLoading();
          removePartner({
            myDisId: this.data.disId,
            partnerDisId: supplier.nxDistributerId,
          }).then(res => {
            load.hideLoading();
            if (res.result.code === 0) {
              wx.showToast({ title: '已解除协作' });
              this.hideMask();
              this._initData();
            } else {
              wx.showToast({ title: res.result.msg || '操作失败', icon: 'none' });
            }
          }).catch(() => {
            load.hideLoading();
          });
        }
      },
    });
  },


  toDatePageSearch() {
    console.log("toDatePageSearchtoDatePageSearch")
    this.setData({
      update: true,
    })
   

    wx.navigateTo({
      url: '/subPackage-charts/pages/sel/searchDate/searchDate?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType,
    })
  },

  
})

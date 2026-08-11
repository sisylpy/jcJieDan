
import apiUrl from '../../../../config.js'

var load = require('../../../../lib/load.js');

import {
  disGetAllCustomer,
  disGetAllGbDistributer,
  changeBusinessStatus,
  delteNxAndGbBusiness,
  updateNxDep,
  disGetLabels
} from '../../../../lib/apiDistributer.js'

Page({
 
  /**
   * 页面的初始数据
   */
  data: {
    showInvite: true,
    labelList: [],          // 配送商全部标签
    selectedLabelId: null, // 当前选中的标签ID，null表示全部
  },


  onShow(){
    this._initGbDistributer();
    this._initNxDepartment();
    this._getDistributerLabels();
  },

  
  onLoad: function (options) {
    const app = getApp();
    const globalData = app.globalData;

   
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      rpxRcale: globalData.rpxR,
      url: apiUrl.server,
      hide: false,
      scrollTop: 0
    })

    var value = wx.getStorageSync('userInfo');
    if (value) {

      this.setData({
        disId: value.nxDistributerEntity.nxDistributerId,
        userInfo: value,
        disInfo: value.nxDistributerEntity
      })

    }
   
  },



  _initNxDepartment(){
    disGetAllCustomer(this.data.disId).then(res => {
      load.showLoading("获取客户")
      if (res.result.code == 0) {
        load.hideLoading();
        console.log(res.result.data);
        this.setData({
          myCustomerArrOne: res.result.data.settleTypeOne,
          myCustomerArrTwo: res.result.data.settleTypeTwo,
        })
      }else{ 
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },

    _initGbDistributer(){
  
      disGetAllGbDistributer(this.data.disId).then(res =>{
        if(res.result.code == 0){
          console.log(res.result.data)
          this.setData({
            yifaArr: res.result.data.yishangArr,
            shixianArr: res.result.data.shixianArr,
          })
        }
      })
    },


    

    toCustomerPage(e) {
      var depInfoItem  = e.currentTarget.dataset.item;
      wx.setStorageSync('depInfo', depInfoItem);
      wx.navigateTo({
        url: '../customerPage/customerPage?depId=' + depInfoItem.nxDepartmentId,
      })
    },


    

    addNewCustomer(e) {
      wx.navigateTo({
        url: '../addCustomer/addCustomer?disId=' + this.data.disId,
      })
    },

    addLiancaiCustomer() {
      wx.navigateTo({
        url: '../addNewGbDistributer/addNewGbDistributer',
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
   * 打开操作面板
   * @param {}} e 
   */
  openOperation(e) {
    this.setData({
      showOperation: true,
      type: e.currentTarget.dataset.type,
      item: e.currentTarget.dataset.item,
     
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


toConectRestraunt() {
  var disName = this.data.disInfo ? this.data.disInfo.nxDistributerName : '';
  wx.navigateToMiniProgram({
    appId: 'wx58ba279bc3d04c4a',
    path: 'subPackage-jrdh/pages/fromJingjing/fromJingjing?nxDisId=' + this.data.disId +
      '&nxDisName=' + encodeURIComponent(disName),
    envVersion: 'trial', //release  develop  trial
  })
},


    changeStatus(e){
      var data ={
        status: e.currentTarget.dataset.status,
        id: e.currentTarget.dataset.id,
      }
      load.showLoading("加为配送商")
      changeBusinessStatus(data).then(res =>{
        if(res.result.code ==0){
          load.hideLoading();
          this._initGbDistributer();
        }
      })
    },


    delteBusiness(e){
      delteNxAndGbBusiness(e.currentTarget.dataset.id).then(res =>{
        if(res.result.code == 0){
          wx.showToast({
            title: '已删除',
          })
         this._initGbDistributer()
        }
      })
    },
    
   

  kaitong(){
    wx.navigateTo({
      url: '../kaitong/kaitong',
    })
  },


  toYifaPage(e){
    var nxDisBusiness  = e.currentTarget.dataset.item;
    wx.setStorageSync('nxDisBusiness', nxDisBusiness);
    if (nxDisBusiness.nxDgdFromNxDepId && nxDisBusiness.nxDgdFromNxDepId > 0) {
      wx.navigateTo({
        url: '../customerPage/customerPage?depId=' + nxDisBusiness.nxDgdFromNxDepId,
      })
      return;
    }
    wx.navigateTo({
      url: '../customerPageGb/customerPageGb?gbDisId=' + nxDisBusiness.nxDgdGbDistributerId,
    })
   
  },

  toInviteGb(){
    wx.navigateTo({
      url: '../inviteGbPage/inviteGbPage',
    })
  },

  toCashInvite(){
    wx.navigateTo({
      url: '../invitePageCash/invitePageCash',
    })
  },

  toNxcommPage(e){
    var gbDisInfo  = e.currentTarget.dataset.item;
    wx.setStorageSync('nxDisBusiness', gbDisInfo);
    wx.navigateTo({
      url: '../customerPageGb/customerPageGb?gbDisId=' + gbDisInfo.nxDgdGbDistributerId +'&nxCommId=-1' ,
    })
  },


  requestSubscribeMessage() {
    wx.requestSubscribeMessage({
      tmplIds: ['y2MrVCbjYHT83yRA7AY2Wy1G8nCUcQBrIrPg5M2v-VE','-1rsXSIB6mfB81RjNaxPTvt5j3KmvrYDI6K5ER3SqnQ'],
      success: (res) => {
        if (res['y2MrVCbjYHT83yRA7AY2Wy1G8nCUcQBrIrPg5M2v-VE','-1rsXSIB6mfB81RjNaxPTvt5j3KmvrYDI6K5ER3SqnQ'] === 'accept') {
          console.log("用户同意订阅AAA");
          this.showSucessModal();
        } else {
          console.log("用户拒绝订阅");
          // 可选：提示用户去设置页重新开启
          this.showGuideModal();
        }
      },
      fail: (err) => {
        console.error("订阅失败:", err);
      }
    });
  },

  showSucessModal(){
    console.log("sucecee")
    
    wx.showModal({
      title: '完成订阅提示',
      content: '您已订阅成功，无需重复订阅',
      confirmText: '好的',
      showCancel: false,
      success: (res) => {
        if (res.confirm) {
          // wx.navigateTo({ url: '/pages/settings/index' });
          // wx.openSetting(); // 打开微信设置页

        }
      },
      fail: (err) => {
        console.error("订阅失败:", err);
      }
    });
  },
  
  showGuideModal() {
    wx.showModal({
      title: '订阅提示',
      content: '开启通知后，您将及时收到订单状态提醒。您可以在“个人中心-消息设置”中重新开启。',
      confirmText: '去设置',
      success: (res) => {
        if (res.confirm) {
          // wx.navigateTo({ url: '/pages/settings/index' });
          wx.openSetting(); // 打开微信设置页

        }
      }
    });
  },


  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  },

  


  toPasteInviteUrl(e) {
    var disId = encodeURIComponent(this.data.disId); // 编码参数
    var disName = encodeURIComponent(this.data.disInfo.nxDistributerName); // 编码参数
    var url = `weixin://dl/business/?appid=wx159c5a46d80e4500&path=pages/inviteTroNx/inviteTroNx&query=${encodeURIComponent(`disId=${disId}&disName=${disName}`)}&env_version=release`;

    wx.setClipboardData({
        data: url,
        success() {  
          wx.showToast({
            title: '复制成功，粘贴发送客户下单注册邀请.',
            icon: 'none',
            duration: 4000
          });
        },
        fail() {
            wx.showToast({
                title: '复制失败，请重试',
                icon: 'error',
                duration: 2000
            });
        }
    });
},


openDep(e){
  var item = e.currentTarget.dataset.item;
  item.nxDepartmentWorkingStatus = 0;
  updateNxDep(item).then(res =>{
    if(res.result.code == 0){
      this._initNxDepartment();
    }
  })
},



toOpenPrint() {
  console.log('disId=' + this.data.disId + '&disName=' + this.data.disInfo.nxDistributerName +  '&from=nx')
  wx.navigateToMiniProgram({
    appId: 'wx159c5a46d80e4500',
    path: 'pages/inviteTroNx/inviteTroNx?disId=' + this.data.disId + '&disName=' + this.data.disInfo.nxDistributerName +  '&from=nx',
    envVersion: 'trial', //release  develop  trial
  })
},

// 获取配送商标签列表
_getDistributerLabels() {
  const { disId } = this.data;
  if (!disId) return;
  
  disGetLabels(disId).then(res => {
    if (res.result.code == 0) {
      this.setData({
        labelList: res.result.data || []
      });
    }
  });
},

// 按标签筛选客户
filterByLabel(e) {
  const labelId = e.currentTarget.dataset.id;
  const { selectedLabelId } = this.data;
  
  // 点击已选中的标签则取消筛选
  if (selectedLabelId === labelId) {
    this.setData({ selectedLabelId: null });
    this._initNxDepartment();
  } else {
    this.setData({ selectedLabelId: labelId });
    this._filterCustomerByLabel(labelId);
  }
},

// 根据标签筛选客户
_filterCustomerByLabel(labelId) {
  load.showLoading('筛选中...');
  
  disGetAllCustomer(this.data.disId, labelId).then(res => {
    load.hideLoading();
    if (res.result.code == 0) {
      this.setData({
        myCustomerArrOne: res.result.data.settleTypeOne,
        myCustomerArrTwo: res.result.data.settleTypeTwo,
      });
    } else {
      wx.showToast({
        title: res.result.msg || '筛选失败',
        icon: 'none'
      });
    }
  });
},



})

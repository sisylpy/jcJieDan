var app = getApp();
var load = require('../../../../lib/load.js');
import download from "../../../utils/download.js"

import apiUrl from '../../../../config.js'

import{
  aaa
}from '../../../lib/apiibook'
import {getDisUserInfo} from '../../../../lib/apiDistributer'

Page({

  onShow(){
    console.log('[homePage] onShow')
    var userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.nxDistributerUserId) {
      return
    }
    getDisUserInfo(userInfo.nxDistributerUserId)
    .then(res =>{
      if(res.result.code == 0){
        const img = res.result.data.nxDistributerEntity.nxDistributerImg || '';
        const isPlaceholderStoreImg = img.indexOf('uploadImage/r.jpg') >= 0;
        this.setData({
          userInfo: res.result.data,
          disInfo: Object.assign({}, res.result.data.nxDistributerEntity, {
            machinePayList: (res.result.data.nxDistributerEntity && res.result.data.nxDistributerEntity.machinePayList)
              ? res.result.data.nxDistributerEntity.machinePayList
              : []
          }),
          disId: res.result.data.nxDistributerEntity.nxDistributerId,
          isPlaceholderStoreImg: isPlaceholderStoreImg,
          canViewSalesAnalysis: Number(res.result.data.nxDiuAdmin) === 0
        })
        wx.setStorageSync('disInfo', res.result.data.nxDistributerEntity);
        wx.setStorageSync('userInfo', res.result.data);
      }
    })
  },

  /**
   * 页面的初始数据
   */
  data: {
    showOperation: false,
    toOpenMini: false,
    isTishi: false,
    toSharePurchase: false,
    editUser: false,
    yuyin: 0,
    isPlaceholderStoreImg: false,
    canViewSalesAnalysis: false,
    userInfo: {
      nxDistributerEntity: {
        nxDistributerName: '',
        nxDistributerShowName: '',
        nxDistributerMarketName: '',
        nxDistributerAddress: '',
        nxDistributerImg: ''
      },
      nxDiuWxNickName: '',
      nxDiuWxAvartraUrl: '',
      nxDiuUrlChange: 0,
      nxDiuPrintDeviceId: -1
    },
    disInfo: {
      nxDistributerBusinessTypeId: 0,
      nxDistributerBuyQuantity: 0,
      machinePayList: [],
      sysCityMarketEntity: {
        sysCmSelfPrintEnabled: 0
      }
    },
    disId: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    console.log('[homePage] onLoad', options)
    const globalData = app.globalData;
    var cachedUser = wx.getStorageSync('userInfo') || {}
    var cachedDis = wx.getStorageSync('disInfo') || cachedUser.nxDistributerEntity || {}
    
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      sysDeviceId: globalData.sysDeviceId,
      url: apiUrl.server,
      userInfo: Object.assign({}, this.data.userInfo, cachedUser),
      canViewSalesAnalysis: Number(cachedUser.nxDiuAdmin) === 0,
      disInfo: Object.assign({}, this.data.disInfo, cachedDis, {
        machinePayList: (cachedDis && cachedDis.machinePayList) ? cachedDis.machinePayList : []
      })
    })
   
    

     // xiazai
     var numValue = wx.getStorageSync('num');
     if (numValue) {
       this.setData({
         yuyin: numValue.length,
       })
     }
  },

  removeYuyin(){
    wx.removeStorageSync('num');
    this.setData({
      yuyin: 0,
    })
   
  },

  downLoadYuyin(){
    if(this.data.yuyin !== 17){
      this._downLoadFile();
    }else{
      var that  = this;

      wx.showModal({
        title: '提示',
        content: '语音文件需要下载吗？',
        success: function (res) {
          // res: {errMsg: "showModal: ok", cancel: false, confirm: true}
          if (res.confirm) {
            that._downLoadFile();
          }
        }
      })
    }
    

  },

  aaa(){
    console.log("aaa")
    aaa().then(res =>{
      if(res.result.code == 0){
        console.log("ok")
      }
    })
  },

  _downLoadFile(){
    var that = this;
      load.showLoading("下载文件中")
      download.downloadSaveFiles({
        // urls: [url1, url2],
        success: function (res) {
          console.log(res)
          wx.showToast({
            title: '下载语音成功',
          })
          load.hideLoading();
          wx.setStorage({
            data: res,
            key: 'num',
          })
          that.setData({
            yuyin: res.length
          })
          
        },
        fail: function (e) {
          load.hideLoading();
          console.info("下载失败");
        }
      })

  },


  toPayPageList(e){
    wx.navigateTo({
      url: '../payList/payList?type=' + e.currentTarget.dataset.type,
    })
  },

  toPayPage(e){
    const marketInfo = this.data.disInfo && this.data.disInfo.sysCityMarketEntity;
    if(!marketInfo || marketInfo.sysCmSelfPrintEnabled == 0){
      wx.navigateTo({
        url: '../payPage/payPage?type=' + e.currentTarget.dataset.type,
      })
    }else{
      wx.navigateTo({
        url: '../payPageMarket/payPageMarket?type=' + e.currentTarget.dataset.type,
      })
    }
   
   },
 

  toSupplierList(){
    wx.navigateTo({
      url: '../../../../subPackage-supplier/pages/supplier/index/index?disId=' + this.data.disInfo.nxDistributerId 
            +'&userId=' + this.data.userInfo.nxDistributerUserId,
    })
  },

  navigateRouteDispatch: function (pagePath, label) {
    label = label || pagePath
    var url = '/subPackage-routeDispatch/pages/routeDispatch/' + pagePath
    console.log('[homePage] navigateRouteDispatch START', {
      label: label,
      pagePath: pagePath,
      url: url
    })
    wx.navigateTo({
      url: url,
      success: function (res) {
        console.log('[homePage] navigateTo SUCCESS', label, url, res)
      },
      fail: function (err) {
        console.error('[homePage] navigateTo FAIL', label, url, err)
        wx.showModal({
          title: label + ' 跳转失败',
          content: (err && err.errMsg) ? err.errMsg : JSON.stringify(err || {}),
          showCancel: false
        })
      }
    })
  },

  onRouteMenuTap: function (e) {
    var dataset = (e && e.currentTarget && e.currentTarget.dataset) || {}
    var label = dataset.label || '未知菜单'
    var pagePath = dataset.page || ''
    console.log('[homePage] onRouteMenuTap', {
      label: label,
      pagePath: pagePath,
      event: e
    })
    if (!pagePath) {
      console.error('[homePage] onRouteMenuTap missing pagePath', dataset)
      wx.showToast({
        title: '缺少页面路径',
        icon: 'none'
      })
      return
    }
    this.navigateRouteDispatch(pagePath, label)
  },

  toRouteDispatchDuty() {
    wx.showToast({
      title: '请在账户管理中设置司机可派状态',
      icon: 'none'
    })
  },

  toCustomer(){
    wx.navigateTo({
      url: '../../customer/index/index',
    })
  },


  
  requestSubscribeMessageSimple() {
    const tmplIds = [
      'y2MrVCbjYHT83yRA7AY2Wy1G8nCUcQBrIrPg5M2v-VE',
    ];
  
    wx.requestSubscribeMessage({
      tmplIds,
      success: (res) => {
        console.log("订阅结果:", JSON.stringify(res, null, 2));
  
        // 统计 accept / reject
        const accepted = [];
        const rejected = [];
        tmplIds.forEach(id => {
          if (res[id] === 'accept') {
            accepted.push(id);
          } else {
            rejected.push(id);
          }
        });
  
        if (accepted.length === tmplIds.length) {
          // 全部同意：轻提示
          wx.showToast({
            title: '订阅全部成功',
            icon: 'success'
          });
        } else if (accepted.length === 0) {
          // 全部拒绝：直接跳转设置
          this.guideToSettings();
        } else {
          // 部分同意：告诉用户哪些成功哪些失败
          wx.showModal({
            title: '订阅情况',
            content:
              `已订阅：\n${accepted.join('、')}\n\n` +
              `未订阅：\n${rejected.join('、')}`,
            confirmText: '去设置',
            showCancel: false,
            success: () => {
              this.guideToSettings();
            }
          });
        }
      },
      fail: (err) => {
        console.error("订阅失败:", err);
        if (err.errCode === 20004) {
          wx.showToast({
            title: '您已关闭订阅权限，请手动开启',
            icon: 'none'
          });
        }
      }
    });
  },


  requestSubscribeMessage() {
    const tmplIds = [
      '4IotlkPhRCenTt-34pE41bJfKoSxQrzzj0cIYhR8YbI',
      '-1rsXSIB6mfB81RjNaxPTvt5j3KmvrYDI6K5ER3SqnQ',
      'n42fBcXAZM1ol0OXB0TbDNDTK1hFISOUFmg0Fj9-4Vc'
    ];
  
    wx.requestSubscribeMessage({
      tmplIds,
      success: (res) => {
        console.log("订阅结果:", JSON.stringify(res, null, 2));
  
        // 统计 accept / reject
        const accepted = [];
        const rejected = [];
        tmplIds.forEach(id => {
          if (res[id] === 'accept') {
            accepted.push(id);
          } else {
            rejected.push(id);
          }
        });
  
        if (accepted.length === tmplIds.length) {
          // 全部同意：轻提示
          wx.showToast({
            title: '订阅全部成功',
            icon: 'success'
          });
        } else if (accepted.length === 0) {
          // 全部拒绝：直接跳转设置
          this.guideToSettings();
        } else {
          // 部分同意：告诉用户哪些成功哪些失败
          wx.showModal({
            title: '订阅情况',
            content:
              `已订阅：\n${accepted.join('、')}\n\n` +
              `未订阅：\n${rejected.join('、')}`,
            confirmText: '去设置',
            showCancel: false,
            success: () => {
              this.guideToSettings();
            }
          });
        }
      },
      fail: (err) => {
        console.error("订阅失败:", err);
        if (err.errCode === 20004) {
          wx.showToast({
            title: '您已关闭订阅权限，请手动开启',
            icon: 'none'
          });
        }
      }
    });
  },
  
  // ———— 辅助方法 ————
  
  /**
   * 打开微信设置页，并在用户返回后刷新订阅状态
   */
  guideToSettings() {
    wx.openSetting({
      success: (res) => {
        console.log('打开设置页结果:', res);
        // 拉取最新的订阅授权状态
        wx.getSetting({
          withSubscriptions: true,
          success: (s) => {
            const map = s.subscriptionsSetting.itemSettings || {};
            console.log('刷新后的订阅状态:', map);
            // 你可以在这里： 
            // 1) 更新页面数据，让用户看到最新的 on/off 状态
            // 2) 根据业务再做其他处理
          },
          fail: (e) => {
            console.error('刷新订阅状态失败:', e);
          }
        });
      },
      fail: (err) => {
        console.error('打开设置页失败:', err);
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





  toPrinterSetting() {
    wx.navigateTo({
      url: '/subPackage-printer/pages/management/printerSetting/printerSetting',
    })
  },

  toPurchase(e) {
    console.log("nxDisId=" + this.data.disId + '&nxDisPurUserId=' + this.data.userInfo.nxDistributerUserId + '&from=nx');
    wx.navigateToMiniProgram({
      appId: 'wx1ea78d3f33234284',
      path: 'pages/jinriListWithLogin/jinriListWithLogin?nxDisId=' + this.data.disId + '&nxDisPurUserId=' + this.data.userInfo.nxDistributerUserId + '&from=nx',
      envVersion: 'trial', //release  develop  trial
      success(res) {

      },
      fail() {

      },
    })
  },

  
  toStaff(){
    wx.navigateTo({
      url: '../staff/staff?disId=' + this.data.userInfo.nxDiuDistributerId,
    })
  },


  editHome(){
    wx.navigateTo({
      url: '../homeEdit/homeEdit',
    })

  },


  toGoods(){
    wx.navigateTo({
      url: '/subPackage/pages/goods/goods/goods',
    })
    
  },

  toSharePurchase(){
    this.setData({
      toSharePurchase:  true
    })

  },
  
  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  },

  toNxDisList(){

    wx.navigateTo({
      url: '../../offerNx/offerNxDistributerList/offerNxDistributerList?disId=' + this.data.disId,
    })
  },

  toDeliveryStrategy(){
    wx.navigateTo({
      url: '../deliveryStrategy/deliveryStrategy?disId=' + this.data.disId,
    })
  },

  toDispatchPerformance(){
    wx.navigateTo({
      url: '../dispatchPerformance/dispatchPerformance'
    })
  },

  toCoupon(){
    wx.navigateTo({
      url: '/subPackage-coupon/pages/management/distributerCoupon/distributerCoupon?disId=' + this.data.disId,
    })
  },

  toCompensationCoupon(){
    wx.navigateTo({
      url: '/subPackage-coupon/pages/management/compensationCoupon/compensationCoupon?disId=' + this.data.disId,
    })
  },

  toAfterSales(){
    wx.navigateTo({
      url: '/subPackage-charts/pages/afterSales/index/index',
    })
  },

  toAnnouncementBoard(){
    wx.navigateTo({
      url: '../../announcement/index/index',
    })
  },

  toStock(){
    wx.navigateTo({
      url: '/subPackage-charts/pages/stock/index/index',
    })
  },
  





toMyPurchase(){
  wx.navigateTo({
    url: '/subPackage-charts/pages/statistic/index/index?disId=' + this.data.disId,
  })

},



  
toPurGoodsFenxi(){
  wx.navigateTo({
    url: '../../../../subPackage-charts/pages/mangement/purGoodsFenxi/purGoodsFenxi?disId=' + this.data.disId,
  })
},

toCostGoodsFenxi(){
  wx.navigateTo({
    url: '../../../../subPackage-charts/pages/mangement/costGoodsFenxi/costGoodsFenxi?disId=' + this.data.disId,
  })
},

toSalesAnalysis(){
  if (!this.data.canViewSalesAnalysis) {
    wx.showToast({ title: '只有老板账号可以查看', icon: 'none' })
    return
  }
  wx.navigateTo({
    url: '/subPackage-charts/pages/salesAnalysis/index/index',
  })
},

toPurchasePerformance(){
  wx.navigateTo({
    url: '/subPackage-purchase-management/pages/purchasePerformance/purchasePerformance',
  })
},

toPurchaseManagement(){
  wx.navigateTo({
    url: '/subPackage/pages/management/purchaseManagement/index/index',
  })
},


toShelf(){
  wx.navigateTo({ url: '/subPackage/pages/shelf/index/index' })
},

toRetailer(){
  wx.navigateTo({
    url: '/subPackage-charts/pages/statistic/indexRetail/indexRetail?disId=' + this.data.disId,
  })
},

logoutOwner(){
  wx.showModal({
    title: '退出登录',
    content: '退出后本机登录凭证会立即失效，需要重新微信登录。',
    confirmText: '退出',
    confirmColor: '#d94841',
    success: (result) => {
      if (!result.confirm) return
      load.showLoading('正在退出')
      app.ownerLogout().then(() => {
        load.hideLoading()
        wx.reLaunch({ url: '/subPackage-auth/pages/login/login' })
      })
    }
  })
},











})

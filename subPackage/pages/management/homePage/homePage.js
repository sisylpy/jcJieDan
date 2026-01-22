var app = getApp();
var load = require('../../../../lib/load.js');
import download from "../../../../utils/download.js"

import apiUrl from '../../../../config.js'

import{
  aaa
}from '../../../../lib/apiibook'
import {getDisUserInfo} from '../../../../lib/apiDistributer'

Page({

  onShow(){
    
    var userInfo = wx.getStorageSync('userInfo');

    getDisUserInfo(userInfo.nxDistributerUserId)
    .then(res =>{
      if(res.result.code == 0){
        this.setData({
          userInfo: res.result.data,
          disInfo: res.result.data.nxDistributerEntity,
          disId: res.result.data.nxDistributerEntity.nxDistributerId
          
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
    editUser:  false,
    yuyin: 0,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const globalData = app.globalData;
    
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      sysDeviceId: globalData.sysDeviceId,
      url: apiUrl.server,
      

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
    if(this.data.disInfo.sysCityMarketEntity.sysCmSelfPrintEnabled == 0){
      wx.navigateTo({
        url: '../payList/payList?type=' + e.currentTarget.dataset.type,
      })
    }else{
      wx.navigateTo({
        url: '../payList/payList?type=' + e.currentTarget.dataset.type,
      })
    }
 
  },

  toPayPage(e){
    console.log("aaa")
    if(this.data.disInfo.sysCityMarketEntity.sysCmSelfPrintEnabled == 0){
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
      url: '../../../../subPackage-charts/pages/supplier/index/index?disId=' + this.data.disInfo.nxDistributerId 
            +'&userId=' + this.data.userInfo.nxDistributerUserId,
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
      url: '../../../../pages/goods/goods',
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

    



  toStock(){
    wx.navigateTo({
      url: '/subPackage-charts/pages/stock/index/index',
    })
  },
  

toMyShelf(e){
  console.log('shelelele' + this.data.disInfo.nxDistributerType)
  if(this.data.disInfo.nxDistributerType == 2){
    wx.navigateTo({
      url: '../../shelf/indexSuyuan/indexSuyuan',
    })
  }else{
    wx.navigateTo({
      url: '../../shelf/index/index',
    })
  }
  
},



toPurchaseGoods(){
  wx.navigateTo({
    url: '/subPackage-charts/pages/statistic/indexGoods/indexGoods',
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













})
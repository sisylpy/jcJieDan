var load = require('../../../lib/load.js');

import apiUrl from '../../../config.js'
var util = require('../../../utils/util.js');

const tabBarHeight = 50; // 根据实际情况调整
const viewBarHeight = 60;

import {
  testDada,
  disGetTodayOrderCustomer,
} from '../../../lib/apiDepOrder.js'

import {
  disLogin
} from '../../../lib/apiDistributer'

// 新增企业微信API导入
import {
  wxworkLogin
} from '../../../lib/apiWxwork'

Page({
  data: {
    firstLoading: true,
    onPurchaseRefresh: false,
    update: false
  },

  onLoad() {
    console.log('首页 onLoad 开始执行');

    const app = getApp();
    const globalData = app.globalData;

    // 检测企业微信环境
    const device = wx.getDeviceInfo();
    const isWxWork = device.environment === 'wxwork';
    console.log('当前环境:', isWxWork ? '企业微信' : '普通微信');
  },

  onShow() {
    const app = getApp();
    const globalData = app.globalData;

    //tabBar
    if (typeof this.getTabBar === 'function' &&
      this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      })
    }

    var value = wx.getStorageSync('userInfo');
    if (value) {
      this.setData({
        userInfo: value,
        disId: value.nxDistributerEntity.nxDistributerId,
        disInfo: value.nxDistributerEntity,
      })
      this._getTodayCustomer();
    } else {
      this._login();
    }

    // 直接使用 app.js 中已经计算好的值
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      navBarHeightRpx: globalData.navBarHeight * globalData.rpxR,
      tabBarHeight: 100,
      viewBarHeight: 60 * globalData.rpxR,
      contentHeight: (globalData.screenHeight - globalData.navBarHeight - 100 - 60) * globalData.rpxR,
      leftMenuWidth: 150,
      url: apiUrl.server,
    });
  },



  _login() {
    var that = this;
    const app = getApp();
    const globalData = app.globalData;

    console.log('🔍 登录检查 - globalData.environment:', globalData.environment);
    console.log('🔍 登录检查 - 是否为 wxwork:', globalData.environment === 'wxwork');

    // 检查是否为企业微信环境
    if (globalData.environment === 'wxwork') {
      console.log('✅ 企业微信环境，执行企业微信登录');
      // 企业微信登录
      wx.showLoading({
        title: '企业微信登录中...'
      });

      wx.qy.login({
        suiteId: 'ww2cddb5d2d7b3ee5d',
        success: (resQy) => {
          if (resQy.code) {
            var disUser = {
              nxDiuCode: resQy.code,
            }
            wxworkLogin(disUser)
              .then(res => {
                wx.hideLoading();
                if (res.result.code !== -1) {
                  console.log(res.result)
                  if (res.result.data.userInfo.nxDiuAdmin == 0) {
                    //缓存用户信息
                    wx.setStorageSync('userInfo', res.result.data.userInfo);
                    wx.setStorageSync('disInfo', res.result.data.disInfo);
                    wx.setStorageSync('loginType', 'wxwork'); // 存储登录类型
                    that.setData({
                      userInfo: res.result.data.userInfo,
                      disInfo: res.result.data.disInfo,
                      disId: res.result.data.disInfo.nxDistributerId,
                    })
                    that._getTodayCustomer();
                  } else if (res.result.data.userInfo.nxDiuAdmin == 3) {
                    wx.redirectTo({
                      url: '../../../subPackage/pages/downLoadApp/downLoadApp',
                    })
                  }
                } else {
                  console.log("企业微信登录失败")
                  wx.showToast({
                    title: '企业微信登录失败，请重试',
                    icon: 'none'
                  })
                  wx.navigateTo({
                    url: '../../inviteCode/inviteCode',
                  })
                }
              })
              .catch((error) => {
                wx.hideLoading();
                wx.showToast({
                  title: '网络连接失败',
                  icon: 'none'
                })
                wx.navigateTo({
                  url: '../../inviteCode/inviteCode',
                })
              })
          }
        },
        fail: (res) => {
          wx.hideLoading();
          wx.showToast({
            title: '企业微信登录失败',
            icon: 'none'
          })
          wx.navigateTo({
            url: '../../inviteCode/inviteCode',
          })
        }
      })
    } else {
      console.log('⚠️ 普通微信环境，执行普通微信登录');
      // 普通微信登录
      wx.login({
        success(res) {
          console.log(res);
          if (res.code) {
            var disUser = {
              nxDiuCode: res.code,
            }
            disLogin(disUser)
              .then(res => {
                if (res.result.code !== -1) {
                  console.log(res.result)
                  if (res.result.data.userInfo.nxDiuAdmin == 0) {
                    //缓存用户信息
                    wx.setStorageSync('userInfo', res.result.data.userInfo);
                    wx.setStorageSync('disInfo', res.result.data.disInfo);
                    wx.setStorageSync('loginType', 'normal'); // 存储登录类型
                    that.setData({
                      userInfo: res.result.data.userInfo,
                      disInfo: res.result.data.disInfo,
                      disId: res.result.data.disInfo.nxDistributerId,
                    })
                    that._getTodayCustomer();
                  } else if (res.result.data.userInfo.nxDiuAdmin == 3) {
                    wx.redirectTo({
                      url: '../../../subPackage/pages/downLoadApp/downLoadApp',
                    })
                  }

                } else {
                  console.log("登录失败")
                  wx.navigateTo({
                    url: '../../inviteCode/inviteCode',
                  })
                }
              })
          }
        }
      })
    }
    //login finish
  },

  /**
   * 获取客户订单
   */
  _getTodayCustomer() {
    var that = this;
    load.showLoading("获取今日订单");
    disGetTodayOrderCustomer(this.data.disId).then(res => {
      load.hideLoading();
      console.log(res.result.data)
      if (res.result.code == 0) {
        this.setData({
          nxDepArr: res.result.data.deps.nxDep,
          // gbDisArr: res.result.data.deps.gbDisArr,subPackage/pages/management/payList/payList
          gbDisArrApp: res.result.data.deps.gbDisArrApp,
          unPayCount: res.result.data.unPayCount,
          disInfo: res.result.data.disInfo,
          returnList: res.result.data.returnList,
          // unPayGbBills: res.result.data.unPayGbBills,
          unDoTotal: res.result.data.unDoTotal,
          linshiTotal: res.result.data.linshiTotal,
        })
        this.setData({
          firstLoading: false,
          update: false,
        })
        wx.setStorageSync('disInfo', res.result.data.disInfo);
        if (res.result.data.disInfo.nxDistributerBuyQuantity < 1) {

          console.log("aaa")
          if (this.data.disInfo.sysCityMarketEntity.sysCmSelfPrintEnabled == 0) {
            wx.navigateTo({
              url: '/subPackage/pages/management/payPage/payPage?type=0',
            })
          } else {
            wx.navigateTo({
              url: '/subPackage/pages/management/payPageMarket/payPageMarket?type=0',
            })
          }

        }

        that.getTabBar().setData({
          stockCount: res.result.data.stockCount,
          unPurCount: res.result.data.unPurCount,
          puringCount: res.result.data.puringCount,
        })
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },

  openAccountBill(e) {
    console.log(e);
    wx.setStorageSync('dep', e.currentTarget.dataset.dep);
    var dep = e.currentTarget.dataset.dep;
    var depHasSubs = e.currentTarget.dataset.dep.gbDepartmentSubAmount;
    wx.navigateTo({
      url: '../../../subPackage/pages/customer/issuePageGbReturn/issuePageGbReturn?billId=' + e.currentTarget.dataset.id + '&depHasSubs=' + depHasSubs + '&depFatherId=' + dep.gbDepartmentFatherId + '&depName=' + dep.gbDepartmentName,
    })
  },

  toPurGoods(e) {
    var id = e.currentTarget.dataset.id;
    var disId = e.currentTarget.dataset.disid;
    var name = e.currentTarget.dataset.name;
    console.log(e);
    wx.navigateTo({
      url: '../../../subPackage/pages/order/purGoods/purGoods?id=' + id + '&name=' + name + '&disId=' + disId,
    })
  },

  toDepOrders(e) {
    wx.setStorageSync('depItem', e.currentTarget.dataset.item);
    var nxDisId = this.data.disId;
    var depId = e.currentTarget.dataset.id;
    var gbDisId = e.currentTarget.dataset.gbdisid;
    var gbDepId = e.currentTarget.dataset.gbid;
    var resId = e.currentTarget.dataset.resid;
    var comId = e.currentTarget.dataset.comid;
    var name = e.currentTarget.dataset.name;
    var depHasSubs = e.currentTarget.dataset.depsub;

    wx.navigateTo({
      url: '../orderPage/orderPage?depFatherId=' + depId +
        '&name=' + name + '&gbDepFatherId=' + gbDepId + '&resFatherId=' + resId + '&nxDisId=' + nxDisId + '&gbDisId=' + gbDisId + '&comId=' + comId +
        '&depHasSubs=' + depHasSubs,
    })
  },

  toPurOrders(e) {
    wx.setStorageSync('batchItem', e.currentTarget.dataset.batch);
    wx.setStorageSync('supplierItem', e.currentTarget.dataset.supplier);
    wx.navigateTo({
      url: '../orderPageGb/orderPageGb?batchId=' + e.currentTarget.dataset.id,
    })
  },

  toLinshiOrderPage() {
    console.log("toLinshiOrderPage")
    wx.navigateTo({
      url: '../linshiOrderPage/linshiOrderPage',
    })

  },

  toLinshiGoods() {
    wx.setStorageSync('notUpdate', true);
    wx.navigateTo({
      url: '../../../subPackage/pages/goods/linshiGoodsDis/linshiGoodsDis?disId=' + this.data.disId,
    })
  },



  toDepOrdersGb(e) {
    console.log(e);
    wx.setStorageSync('depItem', e.currentTarget.dataset.item);
    var nxDisId = this.data.disId;
    var depId = e.currentTarget.dataset.id;
    var gbDisId = e.currentTarget.dataset.gbdisid;
    var gbDepId = e.currentTarget.dataset.gbid;
    var resId = e.currentTarget.dataset.resid;
    var comId = e.currentTarget.dataset.comid;
    var name = e.currentTarget.dataset.name;
    var settleTimes = e.currentTarget.dataset.time;
    wx.navigateTo({
      url: '../../../subPackage/pages/order/orderPageGb/orderPageGb?depFatherId=' + depId +
        '&name=' + name + '&gbDepFatherId=' + gbDepId + '&resFatherId=' + resId + '&nxDisId=' + nxDisId + '&gbDisId=' + gbDisId + '&comId=' + comId + '&settleTimes=' + settleTimes + '&toDepId=' + e.currentTarget.dataset.todepid,
    })
  },

  addDepOrder() {
    wx.navigateTo({
      url: '../depList/depList?disId=' + this.data.disId,
    })
  },

  handleContact(e) {
    console.log(e.detail.path)
    console.log(e.detail.query)
  },

  // 跳转客服
  toCustomerServicePages: function () {
    console.log("kefu")
    try {
      wx.openCustomerServiceChat({
        extInfo: {
          url: 'https://work.weixin.qq.com/kfid/kfc3c56c3671c6c3e27' //客服ID
        },
        corpId: 'ww9778dea409045fe6', //企业微信ID
        success(res) {}
      })
    } catch (error) {
      showToast("请更新至微信最新版本")
    }
  },

  addSearchOrder() {
    wx.navigateTo({
      url: '../searchOrder/searchOrder',
    })
  },

  toUnPay() {
    wx.navigateTo({
      url: '../../../subPackage/pages/customer/unPayBills/unPayBills',
    })
  },

  toUnPayGb() {
    wx.navigateTo({
      url: '../../../subPackage/pages/customer/unPayBillsGb/unPayBillsGb',
    })
  },

  toEditHome() {
    if (this.data.userInfo.nxDiuAdmin == 0 || this.data.userInfo.nxDiuAdmin == -1) {
      wx.navigateTo({
        url: '../../../subPackage/pages/mangement/homePage/homePage',
      })
    }
  },

  onNavButtonTap() {
    if (this.data.userInfo.nxDiuAdmin == 0) {
      wx.navigateTo({
        url: '../../../subPackage/pages/management/homePage/homePage',
      })
    } else {
      wx.showModal({
        title: '没有权限',
        content: '请首位注册的用户进入"账号管理",为您开通管理员权限',
        showCancel: false,
        complete: (res) => {
          if (res.confirm) {}
        }
      })
    }
  },

  toPayPage() {
    wx.navigateTo({
      url: '../../../subPackage/pages/management/payPage/payPage?type=0',
    })
  },

})
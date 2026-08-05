var load = require('../../../lib/load.js');
var platformDisplay = require('../../../utils/platformOrderDisplay.js');

import apiUrl from '../../../config.js'


import {
  disGetTodayOrderCustomer,
  getPlatformCustomersToday,
} from '../../../lib/apiDepOrder.js'

import {
  disLogin,
  getDepInfo
} from '../../../lib/apiDistributer'

// 新增企业微信API导入
import {
  wxworkLogin
} from '../../../lib/apiWxwork'

Page({
  data: {
    firstLoading: true,
    onPurchaseRefresh: false,
    update: false,
    customerSections: [],
    useGroupedCustomers: false,
    platformCustomers: [],
    platformUnDoTotal: 0,
  },

 
  onShow() {
    const app = getApp();
    const globalData = app.globalData;

    //tabBar
    if (typeof this.getTabBar === 'function' &&
      this.getTabBar()) {
      var tabBarComp = this.getTabBar()
      if (typeof tabBarComp.refreshTabs === 'function') {
        tabBarComp.refreshTabs()
      }
      tabBarComp.setData({
        selected: 0
      })
    }

  

    this._login();

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

  onHide() {
    this._clearTaskPollTimer();
  },

  onPullDownRefresh() {
    var disId = this.data.disId
    if (!disId) {
      var disInfo = wx.getStorageSync('disInfo') || {}
      disId = disInfo.nxDistributerId
    }
    if (!disId) {
      wx.stopPullDownRefresh()
      return
    }
    var promise = this._getTodayCustomer(disId)
    if (promise && typeof promise.finally === 'function') {
      promise.finally(function () {
        wx.stopPullDownRefresh()
      })
    } else {
      wx.stopPullDownRefresh()
    }
  },

  onUnload() {
    this._clearTaskPollTimer();
   
  },

  /**
   * 静默登录失败时必须先清掉本地缓存的 userInfo，否则会与 inviteCode 页逻辑冲突：
   * inviteCode 发现 userInfo 存在会 switchTab 回订单页，订单页再次登录失败又打开 inviteCode，形成死循环。
   */
  _clearSessionAndGoInviteCode() {
    try {
      wx.removeStorageSync('userInfo');
      wx.removeStorageSync('disInfo');
      wx.removeStorageSync('loginType');
    } catch (e) {
      console.warn('_clearSessionAndGoInviteCode', e);
    }
    wx.navigateTo({
      url: '../../inviteCode/inviteCode',
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
                    return that._getTodayCustomer(res.result.data.disInfo.nxDistributerId);
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
                  that._clearSessionAndGoInviteCode();
                }
              })
              .catch((error) => {
                wx.hideLoading();
                wx.showToast({
                  title: '网络连接失败',
                  icon: 'none'
                })
                that._clearSessionAndGoInviteCode();
              })
          }
        },
        fail: (res) => {
          wx.hideLoading();
          wx.showToast({
            title: '企业微信登录失败',
            icon: 'none'
          })
          that._clearSessionAndGoInviteCode();
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
                    return that._getTodayCustomer(res.result.data.disInfo.nxDistributerId);
                  } else if (res.result.data.userInfo.nxDiuAdmin == 3) {
                    wx.redirectTo({
                      url: '../../../subPackage/pages/downLoadApp/downLoadApp',
                    })
                  }

                } else {
                  console.log("登录失败a")
                  that._clearSessionAndGoInviteCode();
                }
              })
              .catch((err) => {
                console.error('disLogin fail', err)
                that._clearSessionAndGoInviteCode();
              })
          }
        },
        fail(err) {
          console.error('wx.login fail', err)
          wx.showToast({
            title: '微信登录失败',
            icon: 'none'
          })
        }
      })
    }
    
  },

  /**
   * 清除 taskArr 轮询定时器（离开页面时调用，避免与 orderPage 定时器冲突）
   */
  _clearTaskPollTimer() {
    if (this._taskPollTimer) {
      clearInterval(this._taskPollTimer);
      this._taskPollTimer = null;
    }
    this._clearTaskPollFollowUpTimer();
  },

  _clearTaskPollFollowUpTimer() {
    if (this._taskPollFollowUpTimer) {
      clearTimeout(this._taskPollFollowUpTimer);
      this._taskPollFollowUpTimer = null;
    }
  },

  /** OCR 任务均已非进行中时，后端订单列表可能晚 ~1s 才一致，再静默拉一次全量今日订单 */
  _scheduleOcrCompleteFollowUpRefresh() {
    this._clearTaskPollFollowUpTimer();
    this._taskPollFollowUpTimer = setTimeout(() => {
      this._taskPollFollowUpTimer = null;
      console.log('[taskPoll] OCR 已完成，延迟 1s 再拉一次今日订单（补全）');
      this._getTodayCustomer(undefined, { silent: true });
    }, 1000);
  },

  /**
   * 启动 taskArr 轮询：存在 nxOcrTaskStatus==0 的任务时每 10 秒请求一次，直到无进行中 OCR 任务
   */
  _startTaskPollTimer() {
    this._clearTaskPollTimer();
    console.log('[taskPoll] 启动定时器，存在进行中 OCR 任务，每 10 秒轮询');
    this._taskPollTimer = setInterval(() => {
      disGetTodayOrderCustomer(this.data.disId).then(res => {
        console.log('[index][taskPoll] disGetTodayOrderCustomer 返回:', res.result);
        if (res.result.code == 0 && res.result.data) {
          const taskArr = Array.isArray(res.result.data.taskArr) ? res.result.data.taskArr : [];
          this.setData({
            taskArr,
            unSettleTotal: res.result.data.unSettleTotal,
            unDoTotal: res.result.data.unDoTotal,
            linshiTotal: res.result.data.linshiTotal,
          });
          const hasPendingOcr = taskArr.some(t => t.nxOcrTaskStatus == 0);
          if (!hasPendingOcr) {
            this._clearTaskPollTimer();
            this._scheduleOcrCompleteFollowUpRefresh();
          }
        }
      });
    }, 10000);
  },

  /**
   * 获取客户订单
   * @param {string} [disIdFromLogin] 登录返回的 disId，避免 setData 异步导致 this.data.disId 未更新
   * @param {{ silent?: boolean }} [options] silent 为 true 时不展示 loading（用于 OCR 完成后的补拉）
   */
  _getTodayCustomer(disIdFromLogin, options) {
    var that = this;
    const silent = options && options.silent === true;
    const disId = disIdFromLogin !== undefined ? disIdFromLogin : this.data.disId;
    if (!disId) {
      console.warn('[taskPoll] disId 为空，无法请求');
      return Promise.resolve();
    }
    if (!silent) {
      load.showLoading("获取今日订单");
    }
    console.log('[index] 请求今日客户 disId:', disId);
    return Promise.all([
      disGetTodayOrderCustomer(disId),
      getPlatformCustomersToday(disId),
    ]).then(([res, platformRes]) => {
      if (!silent) {
        load.hideLoading();
      }
      console.log('[index] disGetTodayOrderCustomer 完整返回:', res.result);
      console.log('[index] getPlatformCustomersToday 完整返回:', platformRes.result);
      if (res.result.code == 0) {
        const taskArr = Array.isArray(res.result.data.taskArr) ? res.result.data.taskArr : [];
        const deps = res.result.data.deps || {};
        console.log('[index] deps.nxDep 数量:', (deps.nxDep || []).length, deps.nxDep);
        console.log('[index] deps.ownDep 数量:', (deps.ownDep || []).length, deps.ownDep);
        console.log('[index] deps.platformDep 数量:', (deps.platformDep || []).length, deps.platformDep);
        console.log('[index] deps.gbDisArrApp 数量:', (deps.gbDisArrApp || []).length, deps.gbDisArrApp);
        console.log('[index] taskArr 数量:', taskArr.length, taskArr);
        console.log('[index] returnList:', res.result.data.returnList);
        console.log('[index] requestArr:', res.result.data.requestArr);
        console.log('[index] unDoTotal:', res.result.data.unDoTotal);
        const customerGroups = platformDisplay.buildCustomerGroups(
          [],
          deps.ownDep,
          deps.nxDep
        );
        var platformCustomers = [];
        var platformUnDoTotal = 0;
        if (platformRes.result.code == 0 && platformRes.result.data) {
          platformCustomers = platformDisplay.withCustomerRowKeys(
            platformRes.result.data.customers || []
          );
          platformUnDoTotal = platformRes.result.data.unDoTotal || 0;
          console.log('[index] platformCustomers 数量:', platformCustomers.length, platformCustomers);
          console.log('[index] platformUnDoTotal:', platformUnDoTotal);
          console.log('[index] platform customerCount:', platformRes.result.data.customerCount);
        } else {
          console.warn('[index] getPlatformCustomersToday 失败或非0:', platformRes.result);
        }
        console.log('[index] customerSections:', customerGroups.sections);
        console.log('[index] useGroupedCustomers:', customerGroups.useGrouped);
        this.setData({
          nxDepArr: deps.nxDep || [],
          customerSections: customerGroups.sections,
          useGroupedCustomers: customerGroups.useGrouped,
          platformCustomers: platformCustomers,
          platformUnDoTotal: platformUnDoTotal,
          gbDisArrApp: res.result.data.deps.gbDisArrApp,
          unSettleTotal: res.result.data.unSettleTotal,
          disInfo: res.result.data.disInfo,
          returnList: res.result.data.returnList,
          taskArr,
          unDoTotal: res.result.data.unDoTotal,
          linshiTotal: res.result.data.linshiTotal,
          requestArr: res.result.data.requestArr,
        })
        
  
        this.setData({
          firstLoading: false,
          update: false,
        })
        const hasPendingOcr = taskArr.some(t => t.nxOcrTaskStatus == 0);
        if (hasPendingOcr) {
          console.log('[taskPoll] 存在 nxOcrTaskStatus==0 的任务，启动轮询');
          this._startTaskPollTimer();
        }
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
          puringCount: res.result.data.puringCount,
          collCount: res.result.data.collCount,
        })
      } else {
        console.warn('[index] disGetTodayOrderCustomer 失败:', res.result);
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    }).catch((err) => {
      console.error('[index] 获取今日客户请求异常:', err);
      if (!silent) {
        load.hideLoading();
        wx.showToast({
          title: '获取订单失败',
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
      url: '/subPackage-order/pages/order/orderPage/orderPage?depFatherId=' + depId +
        '&name=' + name + '&gbDepFatherId=' + gbDepId +  '&nxDisId=' + nxDisId + '&gbDisId=' + gbDisId + '&comId=' + comId +
        '&depHasSubs=' + depHasSubs,
    })
  },

  /** 平台客户：使用 routeDepFatherId / routeGbDepFatherId，勿用 dep.nxDepartmentId 作 depFatherId */
  toPlatformDepOrders(e) {
    var item = e.currentTarget.dataset.item;
    if (!item) return;
    var route = platformDisplay.resolvePlatformOrderRouteParams(item);
    var name = platformDisplay.resolvePlatformDisplayName(item);
    var depHasSubs = item.dep && item.dep.nxDepartmentSubAmount;
    wx.setStorageSync('depItem', item.dep || {});
    console.log('[index] toPlatformDepOrders', {
      customerSource: item.customerSource,
      routeDepFatherId: item.routeDepFatherId,
      routeGbDepFatherId: item.routeGbDepFatherId,
      depFatherId: route.depFatherId,
      gbDepFatherId: route.gbDepFatherId,
      name: name,
    });
    wx.navigateTo({
      url: '/subPackage-order/pages/order/orderPage/orderPage?depFatherId=' + route.depFatherId +
        '&name=' + encodeURIComponent(name) +
        '&gbDepFatherId=' + route.gbDepFatherId + '&nxDisId=' + this.data.disId +
        '&gbDisId=-1&comId=-1&depHasSubs=' + (depHasSubs != null ? depHasSubs : 0),
    });
  },


  toDepOrdersRetail(e) {
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
      url: '/subPackage-order/pages/order/orderPageRetail/orderPageRetail?depFatherId=' + depId +
        '&name=' + name + '&gbDepFatherId=' + gbDepId  + '&nxDisId=' + nxDisId + '&gbDisId=' + gbDisId + '&comId=' + comId +
        '&depHasSubs=' + depHasSubs,
    })
  },


  toPurOrders(e) {
    wx.setStorageSync('batchItem', e.currentTarget.dataset.batch);
    wx.setStorageSync('supplierItem', e.currentTarget.dataset.supplier);
    wx.navigateTo({
      url: '/subPackage-order/pages/order/orderPageGb/orderPageGb?batchId=' + e.currentTarget.dataset.id,
    })
  },

  toLinshiOrderPage() {
    console.log("toLinshiOrderPage")
    wx.navigateTo({
      url: '/subPackage-order/pages/order/linshiOrderPage/linshiOrderPage',
    })

  },

  toLinshiGoods() {
    wx.setStorageSync('notUpdate', true);
    wx.navigateTo({
      url: '../../../subPackage/pages/goods/linshiGoodsDis/linshiGoodsDis?disId=' + this.data.disId,
    })
  },

  toUnSettleBills(){
    wx.navigateTo({
      url:'/subPackage/pages/bill/unSettleBills/unSettleBills?disId=' + this.data.disId,
    })
  },
  /**
   * 预览任务图片
   */
  previewTaskImage: function(e) {
    const imageUrl = e.currentTarget.dataset.image;
    if (!imageUrl) {
      return;
    }
    
    // 获取所有任务的图片URL（用于预览时的左右滑动）
    const imageUrls = this.data.taskArr
      .filter(task => task.nxOcrTaskImagePath && task.nxOcrTaskStatus != 0)
      .map(task => this.data.url + task.nxOcrTaskImagePath);
    
    if (imageUrls.length === 0) {
      return;
    }
    
    // 找到当前图片的索引
    const currentIndex = imageUrls.indexOf(imageUrl);
    
    // 使用自定义预览组件
    this.setData({
      previewImageUrls: imageUrls,
      previewCurrentIndex: currentIndex >= 0 ? currentIndex : 0,
      showImagePreview: true
    });
  },

  /**
   * 关闭图片预览
   */
  onCloseImagePreview: function() {
    this.setData({
      showImagePreview: false
    });
  },

  /**
   * 切换预览图片
   */
  onPreviewImageChange: function(e) {
    const index = e.detail.index;
    this.setData({
      previewCurrentIndex: index
    });
  },

  toOcrDep(e){

   var item = e.currentTarget.dataset.item;
   if(item.nxOcrTaskStatus == 0){
    wx.showToast({
      title: '订单解析中，请稍等',
      icon: 'none'
    })
   }else{
    getDepInfo(item.nxOcrTaskDepartmentFatherId).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {   
        wx.setStorageSync('depInfo', res.result.data);
        wx.navigateTo({
          url: '/subPackage-order/pages/order/ocrOrder/ocrOrder?taskId=' + item.nxOcrTaskId +
          '&depId=' + item.nxOcrTaskDepartmentId + '&depFatherId=' + item.nxOcrTaskDepartmentFatherId + '&depName=' + item.nxOcrTaskDepartmentName,
        })
        
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
   }
  
  
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
      url: '/subPackage-order/pages/order/orderPageGb/orderPageGb?depFatherId=' + depId +
        '&name=' + name + '&gbDepFatherId=' + gbDepId + '&nxDisId=' + nxDisId + '&gbDisId=' + gbDisId + '&comId=' + comId + '&settleTimes=' + settleTimes + '&toDepId=' + e.currentTarget.dataset.todepid,
    })
    console.log("")
  },

  addDepOrder() {
    wx.navigateTo({
      url: '/subPackage-order/pages/order/depList/depList?disId=' + this.data.disId,
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
      url: '/subPackage-order/pages/order/searchOrder/searchOrder',
    })
  },

  toUnPay() {
    wx.navigateTo({
      url: '../../../subPackage/pages/bill/unSettleBills/unSettleBills?disId=' + this.data.disId,
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

  toNxDisOrders(e){
    wx.navigateTo({
      url: '/subPackage-order/pages/order/orderPageColl/orderPageColl?collDisId=' + 
        e.currentTarget.dataset.id + '&nxDisId=' + this.data.disId + '&name=' + e.currentTarget.dataset.name,
    })
  },

  

})
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
    update: false,
    simpleTaskList: [], // 缓存任务列表
    cacheTaskTimer: null, // 缓存任务定时器
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

  /**
   * 加载缓存任务列表
   */
  _loadCacheTasks: function() {

    var taskList = wx.getStorageSync('simpleTaskList');
    console.log("taskListtaskList111", taskList)
     if(taskList && taskList.length > 0){
      console.log("abck")
      this.setData({
        simpleTaskList: taskList,
      });
      if (this.data.nxDepArr.length > 0) {
        console.log("taskListtaskListnbxddododod");

        this._updateDepWithCacheTasks();
      }
      // 如果有缓存任务，启动定时器
      this._startCacheTaskTimer();
     }else{
      this.setData({
        simpleTaskList: []
      })
      // 如果没有缓存任务，清除定时器
      this._clearCacheTaskTimer();
     }
         
  },

  /**
   * 启动缓存任务定时器
   */
  _startCacheTaskTimer: function() {
    // 如果已有定时器，先清除
    this._clearCacheTaskTimer();
    
    // 启动定时器，每20秒获取一次缓存任务
    const timer = setInterval(() => {
      const taskList = wx.getStorageSync('simpleTaskList');
      console.log("定时器检查缓存任务", taskList);
      
      if (taskList && taskList.length > 0) {
        // 更新任务列表
        this.setData({
          simpleTaskList: taskList,
        });
        
        // 有缓存任务时，获取今日订货接口
        if (this.data.disId) {
          this._getTodayCustomer();
        }
      } else {
        // 任务为空，清除定时器和任务列表
        console.log("缓存任务已清空，停止定时器");
        this.setData({
          simpleTaskList: []
        });
        this._clearCacheTaskTimer();
      }
    }, 10000); // 10秒
    
    this.setData({
      cacheTaskTimer: timer
    });
  },

  /**
   * 清除缓存任务定时器
   */
  _clearCacheTaskTimer: function() {
    if (this.data.cacheTaskTimer) {
      clearInterval(this.data.cacheTaskTimer);
      this.setData({
        cacheTaskTimer: null
      });
      console.log("缓存任务定时器已清除");
    }
  },

  /**
   * 更新部门数据，标记哪些部门有缓存任务
   */
  _updateDepWithCacheTasks: function() {
    console.log('[订单首页] ========== _updateDepWithCacheTasks 开始 ==========');
    
    const nxDepArr = this.data.nxDepArr || [];
    const simpleTaskList = this.data.simpleTaskList || [];
    
    console.log('[订单首页] 部门数据数量:', nxDepArr.length);
    console.log('[订单首页] 缓存任务数量:', simpleTaskList.length);
    console.log('[订单首页] 缓存任务列表:', simpleTaskList.map(t => ({ taskId: t.taskId, depId: t.depId, depFatherId: t.depFatherId })));
    
    // 为每个部门标记是否有缓存任务（使用 depFatherId 匹配）
    const updatedNxDepArr = nxDepArr.map((depItem, index) => {
      const depId = depItem.dep?.nxDepartmentId;
      // 注意：部门数据中可能没有 nxDepartmentFatherId，需要从其他地方获取
      // 如果部门数据中没有，则使用 depId 作为 depFatherId（因为可能是父部门）
      const depFatherId = depItem.dep?.nxDepartmentFatherId || depId;
      
      console.log(`[订单首页] 处理部门 ${index + 1}/${nxDepArr.length}:`, {
        depId: depId,
        depFatherId: depFatherId,
        depName: depItem.dep?.nxDepartmentAttrName
      });
      
      // 查找是否有匹配的缓存任务（使用 depId 或 depFatherId 匹配）
      const hasCacheTask = simpleTaskList.some(task => {
        // 优先使用 depId 匹配，如果匹配不上，再使用 depFatherId 匹配
        const matchByDepId = String(task.depId) === String(depId);
        const matchByDepFatherId = depFatherId && String(task.depFatherId) === String(depFatherId);
        
        if (matchByDepId || matchByDepFatherId) {
          console.log(`[订单首页] ✅ 部门 ${depItem.dep?.nxDepartmentAttrName} 匹配到缓存任务:`, {
            taskId: task.taskId,
            taskDepId: task.depId,
            taskDepFatherId: task.depFatherId,
            matchByDepId: matchByDepId,
            matchByDepFatherId: matchByDepFatherId
          });
        }
        
        return matchByDepId || matchByDepFatherId;
      });
      
      if (hasCacheTask) {
        console.log(`[订单首页] ✅ 部门 ${depItem.dep?.nxDepartmentAttrName} 有缓存任务`);
      } else {
        console.log(`[订单首页] ❌ 部门 ${depItem.dep?.nxDepartmentAttrName} 没有缓存任务`);
      }
      
      return {
        ...depItem,
        hasCacheTask: hasCacheTask
      };
    });
    
    const hasCacheTaskCount = updatedNxDepArr.filter(item => item.hasCacheTask).length;
    console.log(`[订单首页] 更新完成，有缓存任务的部门数量: ${hasCacheTaskCount}/${nxDepArr.length}`);
    console.log('[订单首页] ========== _updateDepWithCacheTasks 结束 ==========');
    
    this.setData({
      nxDepArr: updatedNxDepArr
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
                    that._loadCacheTasks();
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
                    that._loadCacheTasks();
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
        
        // 更新部门数据，标记哪些部门有缓存任务
        if (this.data.simpleTaskList && this.data.simpleTaskList.length > 0 && res.result.data.deps.nxDep.length > 0) {
          this._updateDepWithCacheTasks();
        }
        
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
      url: '/subPackage-charts/pages/order/orderPage/orderPage?depFatherId=' + depId +
        '&name=' + name + '&gbDepFatherId=' + gbDepId + '&resFatherId=' + resId + '&nxDisId=' + nxDisId + '&gbDisId=' + gbDisId + '&comId=' + comId +
        '&depHasSubs=' + depHasSubs,
    })
  },

  toPurOrders(e) {
    wx.setStorageSync('batchItem', e.currentTarget.dataset.batch);
    wx.setStorageSync('supplierItem', e.currentTarget.dataset.supplier);
    wx.navigateTo({
      url: '/subPackage-charts/pages/order/subPackage-charts/pages/order/orderPageGb/orderPageGb?batchId=' + e.currentTarget.dataset.id,
    })
  },

  toLinshiOrderPage() {
    console.log("toLinshiOrderPage")
    wx.navigateTo({
      url: '/subPackage-charts/pages/order/linshiOrderPage/linshiOrderPage',
    })

  },

  toLinshiGoods() {
    wx.setStorageSync('notUpdate', true);
    wx.navigateTo({
      url: '../../../subPackage/pages/goods/linshiGoodsDis/linshiGoodsDis?disId=' + this.data.disId,
    })
  },

  toOcrDep(e){
   var item = e.currentTarget.dataset.item;
    wx.navigateTo({
      url: '/subPackage-charts/pages/order/ocrOrder/ocrOrder?depFatherId=' + item.depFatherId +
      '&depId=' + item.depFatherId.depId + '&depName=' + item.depFatherId,
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
      url: '/subPackage-charts/pages/order/depList/depList?disId=' + this.data.disId,
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
      url: '/subPackage-charts/pages/order/searchOrder/searchOrder',
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

  /**
   * 页面卸载时清除定时器
   */
  onUnload: function() {
    this._clearCacheTaskTimer();
  },

})
var app = getApp();
var load = require('../../../../lib/load.js');
var commercialEntitlement = require('../../../../utils/commercialEntitlement.js');
var managementHomeAccess = require('../../../../utils/managementHomeAccess.js');
var operatingCapability = require('../../../../utils/operatingCapability.js');
import download from "../../../utils/download.js"

import apiUrl from '../../../../config.js'

import{
  aaa
}from '../../../lib/apiibook'
import {getDisUserInfo, getPurchaseManagementOverview} from '../../../../lib/apiDistributer'

function normalizeCommercialUsage(value) {
  const usage = value || {}
  const granted = Number(usage.grantedQuantity || 0)
  const consumed = Number(usage.consumedQuantity || 0)
  const available = Number(usage.availableQuantity || 0)
  return {
    meterCode: usage.meterCode || 'ORDER_LINE',
    grantedQuantity: granted,
    consumedQuantity: consumed,
    availableQuantity: available,
    expiredQuantity: Number(usage.expiredQuantity || 0),
    version: Number(usage.version || 0)
  }
}

Page({

  onShow(){
    console.log('[homePage] onShow')
    var userInfo = wx.getStorageSync('userInfo');
    if (!userInfo || !userInfo.nxDistributerUserId) {
      return
    }
    const entitlementTask = this.refreshCommercialEntitlement().catch(error => {
      console.warn('[homePage] commercial entitlement refresh unavailable', error)
      return commercialEntitlement.snapshot()
    })
    const usageTask = this.refreshCommercialUsage().catch(error => {
      console.warn('[homePage] commercial usage refresh unavailable', error)
      return normalizeCommercialUsage(wx.getStorageSync('commercialUsage'))
    })
    Promise.all([getDisUserInfo(userInfo.nxDistributerUserId), entitlementTask, usageTask])
    .then(results =>{
      const res = results[0]
      const snapshot = results[1]
      const commercialUsage = normalizeCommercialUsage(results[2])
      if(res.result.code == 0){
        const img = res.result.data.nxDistributerEntity.nxDistributerImg || '';
        const isPlaceholderStoreImg = img.indexOf('uploadImage/r.jpg') >= 0;
        const disInfo = Object.assign({}, res.result.data.nxDistributerEntity, {
          machinePayList: (res.result.data.nxDistributerEntity && res.result.data.nxDistributerEntity.machinePayList)
            ? res.result.data.nxDistributerEntity.machinePayList
            : []
        })
        const access = managementHomeAccess.build(snapshot, res.result.data, disInfo,
          wx.getStorageSync('operatingCapability') || null)
        this.setData(Object.assign({
          userInfo: res.result.data,
          disInfo,
          disId: res.result.data.nxDistributerEntity.nxDistributerId,
          isPlaceholderStoreImg,
          commercialUsage,
          usageQuotaLow: commercialUsage.availableQuantity <= 10
        }, access), () => {
          if (this.data.canViewPurchaseManagement) this.loadPurchasePendingCount()
          else this.setData({ purchasePendingCount: 0 })
        })
        wx.setStorageSync('disInfo', res.result.data.nxDistributerEntity);
        wx.setStorageSync('userInfo', res.result.data);
      }
    })
    .catch(error => console.warn('[homePage] home access refresh failed', error))
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
    accessLoaded: false,
    commercialPlanName: '正在读取套餐',
    commercialStatusName: '',
    entitlementVersion: 0,
    commercialUsage: normalizeCommercialUsage(null),
    usageQuotaLow: false,
    purchasePendingCount: 0,
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
      nxDistributerOperatingModeCode: 'SMALL_WHOLESALE',
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
    
    const access = managementHomeAccess.build(
      commercialEntitlement.snapshot(), cachedUser, cachedDis,
      wx.getStorageSync('operatingCapability') || null)
    this.setData(Object.assign({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      sysDeviceId: globalData.sysDeviceId,
      url: apiUrl.server,
      userInfo: Object.assign({}, this.data.userInfo, cachedUser),
      disInfo: Object.assign({}, this.data.disInfo, cachedDis, {
        machinePayList: (cachedDis && cachedDis.machinePayList) ? cachedDis.machinePayList : []
      }),
      commercialUsage: normalizeCommercialUsage(wx.getStorageSync('commercialUsage')),
      usageQuotaLow: normalizeCommercialUsage(
        wx.getStorageSync('commercialUsage')).availableQuantity <= 10
    }, access))
   
    

     // xiazai
     var numValue = wx.getStorageSync('num');
     if (numValue) {
       this.setData({
         yuyin: numValue.length,
       })
     }
  },

  refreshCommercialEntitlement(){
    return new Promise((resolve, reject) => {
      app.ownerRequest({
        url: apiUrl.apiUrl + 'commercial-entitlements/me',
        method: 'GET',
        success: res => {
          const body = res.data || {}
          if (body.code !== 0 || !body.data) {
            reject(new Error(body.msg || '商业权益读取失败'))
            return
          }
          wx.setStorageSync('commercialEntitlement', body.data)
          resolve(body.data)
        },
        fail: reject
      })
    })
  },

  refreshCommercialUsage(){
    return new Promise((resolve, reject) => {
      app.ownerRequest({
        url: apiUrl.apiUrl + 'commercial-usage/me',
        method: 'GET',
        success: res => {
          const body = res.data || {}
          if (body.code !== 0 || !body.data) {
            reject(new Error(body.msg || '订单额度读取失败'))
            return
          }
          const usage = normalizeCommercialUsage(body.data)
          wx.setStorageSync('commercialUsage', usage)
          resolve(usage)
        },
        fail: reject
      })
    })
  },

  toUsageCenter(){
    wx.navigateTo({
      url: '/subPackage/pages/management/usageCenter/usageCenter'
    })
  },

  toUsagePurchase(){
    if (!this.requireOwner('充值订单额度')) return
    wx.navigateTo({
      url: '/subPackage/pages/management/payPage/payPage'
    })
  },

  loadPurchasePendingCount(){
    if (!this.data.canViewPurchaseManagement) return
    getPurchaseManagementOverview({ range: 'TODAY' }).then(res => {
      const body = res.result || {}
      if (body.code !== 0) return
      const tasks = (body.data && body.data.currentTasks) || {}
      this.setData({ purchasePendingCount: Number(tasks.currentExceptionCount || 0) })
    }).catch(error => {
      console.warn('[homePage] purchase pending count unavailable', error)
    })
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
    wx.showModal({
      title: '旧积分购买已停用',
      content: '当前商业客户由管理员配置套餐与订单商品行额度。',
      showCancel: false
    })
  },

  toPayPage(e){
    this.toPayPageList(e)
   },
 

  toSupplierList(){
    if (!this.requireHomeFeature('BASIC_SUPPLIER_MANAGEMENT', '基础供应商管理')) return
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
    if (!this.requireHomeFeature('CUSTOMER_MASTER', '客户管理')) return
    wx.navigateTo({
      url: '/subPackage/pages/customer/index/index',
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
    if (!this.requireHomeFeature('CUSTOMER_DOCUMENT', '客户交易单据打印')) return
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
    if (!this.requireOwner('账号管理')) return
    wx.navigateTo({
      url: '/subPackage/pages/management/staff/staff?disId=' + this.data.userInfo.nxDiuDistributerId,
    })
  },


  editHome(){
    if (!this.requireOwner('修改店铺')) return
    wx.navigateTo({
      url: '/subPackage/pages/management/homeEdit/homeEdit',
    })

  },


  toGoods(){
    if (!this.requireHomeFeature('GOODS_MASTER', '商品管理')) return
    wx.navigateTo({
      url: '/subPackage-goods/pages/goods/goods/goods',
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
    if (!this.requirePartnerCollaboration('协作配送商')) return

    wx.navigateTo({
      url: '/subPackage/pages/offerNx/offerNxDistributerList/offerNxDistributerList?disId=' + this.data.disId,
    })
  },

  toDeliveryStrategy(){
    if (!this.requireHomeFeature('ADVANCED_DISPATCH', '配送设置')) return
    wx.navigateTo({
      url: '/subPackage/pages/management/deliveryStrategy/deliveryStrategy?disId=' + this.data.disId,
    })
  },

  toDispatchPerformance(){
    if (!this.requireHomeFeature('ADVANCED_DISPATCH', '派单管理')) return
    wx.navigateTo({
      url: '/subPackage/pages/management/dispatchPerformance/dispatchPerformance'
    })
  },

  toCoupon(){
    if (!this.unavailableCommercialFeature('普通优惠券')) return
    wx.navigateTo({
      url: '/subPackage-coupon/pages/management/distributerCoupon/distributerCoupon?disId=' + this.data.disId,
    })
  },

  toCompensationCoupon(){
    if (!this.requireHomeFeature('AFTER_SALES', '售后补偿')) return
    wx.navigateTo({
      url: '/subPackage-coupon/pages/management/compensationCoupon/compensationCoupon?disId=' + this.data.disId,
    })
  },

  toAfterSales(){
    if (!this.requireHomeFeature('AFTER_SALES', '售后处理')) return
    wx.navigateTo({
      url: '/subPackage-charts/pages/afterSales/index/index',
    })
  },

  toAnnouncementBoard(){
    if (!this.unavailableCommercialFeature('公司公告牌')) return
    wx.navigateTo({
      url: '/subPackage/pages/announcement/index/index',
    })
  },

  toStock(){
    if (!this.requireHomeFeature('INVENTORY_BATCH', '库存查询')) return
    wx.navigateTo({
      url: '/subPackage-charts/pages/stock/index/index',
    })
  },
  





toMyPurchase(){
  if (!this.requireHomeFeature('OWNER_DASHBOARD', '经营看板')) return
  wx.navigateTo({
    url: '/subPackage-charts/pages/statistic/index/index?disId=' + this.data.disId,
  })

},



  
toPurGoodsFenxi(){
  if (!this.requireHomeFeature('PURCHASE_ANALYTICS', '采购统计')) return
  wx.navigateTo({
    url: '../../../../subPackage-charts/pages/mangement/purGoodsFenxi/purGoodsFenxi?disId=' + this.data.disId,
  })
},

toCostGoodsFenxi(){
  if (!this.requireHomeFeature('INVENTORY_ANALYTICS', '库存分析')) return
  wx.navigateTo({
    url: '../../../../subPackage-charts/pages/mangement/costGoodsFenxi/costGoodsFenxi?disId=' + this.data.disId,
  })
},

toSalesAnalysis(){
  if (!this.requireOwner('销售分析')) return
  if (!this.requireHomeFeature('SALES_ACTIVITY_ANALYTICS', '销售分析')) return
  wx.navigateTo({
    url: '/subPackage-charts/pages/salesAnalysis/index/index',
  })
},

toPurchaseCollaboration(){
  if (!this.requireHomeFeature('SUPPLIER_COLLABORATION', '采购协同')) return
  wx.navigateTo({
    url: '/subPackage/pages/management/purchaseManagement/purchaseCollaboration/purchaseCollaboration',
  })
},

toPurchaserDetail(){
  if (!this.requireHomeFeature('PURCHASER_MANAGEMENT', '采购员管理')) return
  wx.navigateTo({
    url: '/subPackage/pages/management/purchaseManagement/purchaserDetail/purchaserDetail',
  })
},

toFinanceOverview(){
  if (!this.requireHomeFeature('FINANCIAL_ANALYTICS', '资金总览')) return
  wx.navigateTo({
    url: '/subPackage/pages/management/purchaseManagement/financeOverview/financeOverview',
  })
},

toReimbursementList(){
  if (!this.requireHomeFeature('PURCHASE_FINANCE', '采购员报销')) return
  wx.navigateTo({
    url: '/subPackage/pages/management/purchaseManagement/reimbursementList/reimbursementList',
  })
},

toSettlementList(){
  if (!this.requireHomeFeature('PURCHASE_FINANCE', '供应商结账')) return
  wx.navigateTo({
    url: '/subPackage/pages/management/purchaseManagement/settlementList/settlementList',
  })
},

toPaymentList(){
  if (!this.requireHomeFeature('PURCHASE_FINANCE', '付款记录')) return
  wx.navigateTo({
    url: '/subPackage/pages/management/purchaseManagement/paymentList/paymentList',
  })
},

toCustomerOrderAnomalies(){
  if (!this.requireHomeFeature('ORDER_QUERY', '订货异常')) return
  wx.navigateTo({
    url: '/subPackage/pages/management/customerOrderAnomalies/customerOrderAnomalies',
  })
},

toSmartReplenishment(){
  if (!this.requireOwner('智能备货')) return
  if (!this.requireHomeFeature('SMART_REPLENISHMENT', '智能备货')) return
  wx.navigateTo({
    url: '/subPackage-charts/pages/smartReplenishment/index/index',
  })
},

toPurchaseManagement(){
  if (!this.requireHomeFeature('PURCHASE_CORE', '采购总览')) return
  wx.navigateTo({
    url: '/subPackage/pages/management/purchaseManagement/index/index',
  })
},


toShelf(){
  if (!this.requireHomeFeature('SHELF_MANAGEMENT', '货架管理')) return
  wx.navigateTo({ url: '/subPackage/pages/shelf/index/index' })
},

requireHomeFeature(featureCode, featureName){
    // 专业采购能力必须与入口显示使用同一判断口径：按 effectiveFeatures（经营模式∩套餐），
    // 不能只看套餐 entitledFeatures，否则模式 2/3 仍可进入并触发 403。
    // 仅对专业采购能力生效，库存/货架/出库/成本等既有入口保持原判定不受影响。
    var professionalPurchaseFeatures = ['PURCHASE_CORE', 'PURCHASE_MANAGEMENT',
      'SUPPLIER_COLLABORATION', 'PURCHASER_MANAGEMENT', 'PURCHASE_ANALYTICS'];
    if (professionalPurchaseFeatures.indexOf(featureCode) >= 0) {
      var capability = wx.getStorageSync('operatingCapability') || null;
      var effective = capability && Array.isArray(capability.effectiveFeatures)
        ? capability.effectiveFeatures : null;
      if (effective) {
        if (effective.indexOf(featureCode) >= 0) return true;
        wx.showModal({
          title: '暂未开通',
          content: '“' + featureName + '”不在当前经营模式与商业套餐的有效授权范围内。',
          showCancel: false
        });
        return false;
      }
    }
    return commercialEntitlement.requireFeature(featureCode, featureName)
  },

requirePartnerCollaboration(featureName){
    // 与 offerNx 入口页及服务端同一口径：经营模式 ∩ 套餐的有效能力，
    // 不附加货架履约流程限制。
    var disInfo = this.data.disInfo || wx.getStorageSync('disInfo') || {}
    var capability = wx.getStorageSync('operatingCapability') || null
    if (operatingCapability.canUsePartnerCollaboration(disInfo, capability)) return true
    wx.showModal({
      title: '暂未开通',
      content: '“' + featureName + '”不在当前经营模式与商业套餐的有效授权范围内。',
      showCancel: false
    });
    return false
  },

requireOwner(featureName){
  if (Number(this.data.userInfo && this.data.userInfo.nxDiuAdmin) === 0) return true
  wx.showModal({
    title: '仅限老板账号',
    content: '“' + featureName + '”仅允许配送商老板操作。',
    showCancel: false
  })
  return false
},

unavailableCommercialFeature(featureName){
  wx.showModal({
    title: '当前套餐未包含',
    content: '“' + featureName + '”尚未纳入当前三档商业套餐。',
    showCancel: false
  })
  return false
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

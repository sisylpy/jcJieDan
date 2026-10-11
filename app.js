
import { ownerRequest, ownerUploadFile, ownerDownloadFile, ownerLogout, clearOwnerLoginState, hasUsableOwnerToken } from './lib/ownerRequest.js'
import apiUrl from './config.js'

console.log('=== 准备注册 App ===');

App({
    ownerRequest: ownerRequest,
    ownerUploadFile: ownerUploadFile,
    ownerDownloadFile: ownerDownloadFile,
    ownerLogout: ownerLogout,
    clearOwnerLoginState: clearOwnerLoginState,
    hasUsableOwnerToken: hasUsableOwnerToken,
    // 启动时刷新经营能力快照。后端调整能力后配送商的经营模式码可能不变，
    // 若继续沿用本地陈旧快照，effectiveFeatures 会残留旧值，
    // 导致“备货”Tab 等按有效权限判定的入口误显示。每次启动以服务端为准刷新。
    refreshOperatingCapabilitySnapshot: function () {
      if (typeof hasUsableOwnerToken === 'function' && !hasUsableOwnerToken()) return;
      const app = this;
      this.ownerRequest({
        url: apiUrl.apiUrl + 'commercial-entitlements/me',
        method: 'GET',
        success: function (res) {
          const body = (res && res.data) || {};
          if (body.code !== 0) return;
          if (body.data) wx.setStorageSync('commercialEntitlement', body.data);
          if (!body.operatingCapability) return;
          wx.setStorageSync('operatingCapability', body.operatingCapability);
          const pages = getCurrentPages();
          const current = pages[pages.length - 1];
          if (current && typeof current.getTabBar === 'function') {
            const tabBar = current.getTabBar();
            if (tabBar && typeof tabBar.refreshTabs === 'function') {
              tabBar.refreshTabs();
            }
          }
          // 货架等页面在 onShow 时读取的是刷新前的旧快照，且其自身只在“经营模式码不一致”
          // 时才刷新；后端新增能力授权时模式码不变，必须在这里主动通知当前页面重算标志，
          // 否则入口会一直停留在刷新前的旧值，只能靠清缓存才能看到。
          if (current && typeof current._syncShelfCapabilities === 'function') {
            current._syncShelfCapabilities('app-launch-capability-refreshed', false);
          }
        },
        fail: function () {
          // 刷新失败时保留原快照，不阻断启动。
        }
      });
      return app;
    },
    onLaunch: function(options) {
      this.refreshOperatingCapabilitySnapshot();
      const windowInfo = wx.getWindowInfo();
      const device = wx.getDeviceInfo();
      console.log(device, "device");
      
      const isIOS = device.system.indexOf('iOS') > -1;
      const navBarContentHeight = isIOS ? 44 : 48;
      const statusBarHeight = windowInfo.statusBarHeight;
      const menuButtonInfo = wx.getMenuButtonBoundingClientRect();
      console.log(menuButtonInfo);
      const navBarHeight = menuButtonInfo.bottom + menuButtonInfo.top - statusBarHeight;
      
      var deviceId = "";
      if (device.platform == 'ios') {
        deviceId = "F37B31B6-B177-A674-D73A-88C25DB7F9A9";
      } else if (device.platform == 'android') {
        deviceId = "DC:1D:30:8F:9A:60";
      }
      
      // 检测企业微信环境
      const environment = device.environment || 'normal';
      console.log('当前运行环境:', environment === 'wxwork' ? '企业微信' : '普通微信');
      
      // 存储到 globalData
      this.globalData = {
        windowWidth: windowInfo.windowWidth,
        windowHeight: windowInfo.windowHeight,
        screenHeight: windowInfo.screenHeight,
        screenWidth: windowInfo.screenWidth,
        statusBarHeight: windowInfo.statusBarHeight,
        rpxR: 750 / windowInfo.windowWidth,
        statusBarHeight: statusBarHeight,
        navBarContentHeight: navBarContentHeight,
        navBarHeight: navBarHeight,
        userInfo: null,
        menuButtonInfo: menuButtonInfo,
        sysDeviceId: deviceId,
        environment: environment, // 添加环境信息
      };
    
      // 企业微信环境特殊处理
      if (environment === 'wxwork') {
        console.log('企业微信环境，准备特殊处理');
        // 延迟执行，确保环境完全初始化
        setTimeout(() => {
          try {
            // 检查当前页面路径
            const pages = getCurrentPages();
            console.log('当前页面栈:', pages.length, pages.map(p => p.route));
            
            // 如果没有页面，强制跳转到首页
            if (pages.length === 0) {
              wx.switchTab({
                url: '/pages/order/index/index',
                fail: (err) => {
                  console.error('企业微信环境跳转失败:', err);
                  // 如果 switchTab 失败，尝试使用 navigateTo
                  wx.navigateTo({
                    url: '/pages/order/index/index',
                    fail: (err2) => {
                      console.error('企业微信环境 navigateTo 也失败:', err2);
                    }
                  });
                }
              });
            }
          } catch (error) {
            console.error('企业微信环境处理异常:', error);
          }
        }, 1000);
      }
  
      // 新增：小程序新版本检测与提示
      if (wx.canIUse('getUpdateManager')) {
        const updateManager = wx.getUpdateManager();
        updateManager.onCheckForUpdate(function (res) {
          // 请求完新版本信息的回调
          // res.hasUpdate
        });
        updateManager.onUpdateReady(function () {
          wx.showModal({
            title: '更新提示',
            content: '新版本已经准备好，是否重启应用？',
            success: function (res) {
              if (res.confirm) {
                // 新的版本已经下载好，调用 applyUpdate 应用新版本并重启
                updateManager.applyUpdate();
              }
            }
          });
        });
        updateManager.onUpdateFailed(function () {
          // 新的版本下载失败
          wx.showModal({
            title: '更新提示',
            content: '新版本下载失败，请检查网络设置',
            showCancel: false
          });
        });
      }
    console.log('=== App.onLaunch 执行完成 ===');
  },

  getPlatform: function () { //获取客户端平台
    return this.globalData["platform"]
  },

  BLEInformation: {
    platform: "",
    deviceId: null,
    writeCharaterId: "",
    writeServiceId: "",
    notifyCharaterId: "",
    notifyServiceId: "",
    readCharaterId: "",
    readServiceId: "",
  },

  // globalData 已在 onLaunch 中动态设置
});

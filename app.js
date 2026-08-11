
import { ownerRequest, ownerUploadFile, ownerDownloadFile, ownerLogout, clearOwnerLoginState, hasUsableOwnerToken } from './lib/ownerRequest.js'

console.log('=== 准备注册 App ===');

App({
    ownerRequest: ownerRequest,
    ownerUploadFile: ownerUploadFile,
    ownerDownloadFile: ownerDownloadFile,
    ownerLogout: ownerLogout,
    clearOwnerLoginState: clearOwnerLoginState,
    hasUsableOwnerToken: hasUsableOwnerToken,
    onLaunch: function(options) {
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

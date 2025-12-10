
Page({
  data: {
    websiteUrl: 'https://grainservice.club/',
    windowWidth: 0,
    windowHeight: 0,
    statusBarHeight: 0,
  },

  onLoad: function (options) {
    const app = getApp();
    const globalData = app.globalData;

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
    });
  },

  // 访问网站
  visitWebsite() {
    const url = this.data.websiteUrl;
    
    // 尝试多种方式打开网站
    wx.showActionSheet({
      itemList: ['在微信中打开', '复制链接到剪贴板', '取消'],
      success: (res) => {
        if (res.tapIndex === 0) {
          // 尝试在微信内置浏览器中打开
          this.openInWechat(url);
        } else if (res.tapIndex === 1) {
          // 复制链接
          this.copyWebsite();
        }
      }
    });
  },

  // 在微信中打开网站
  openInWechat(url) {
    // 方法1：尝试使用webview
    wx.navigateTo({
      url: `/pages/webview/webview?url=${encodeURIComponent(url)}`,
      success: () => {
        console.log('成功跳转到webview页面');
      },
      fail: (err) => {
        console.log('webview跳转失败，尝试其他方式', err);
        // 方法2：尝试使用微信内置浏览器
        this.tryOpenInBrowser(url);
      }
    });
  },

  // 尝试在浏览器中打开
  tryOpenInBrowser(url) {
    // 提供详细的说明和解决方案
    wx.showModal({
      title: '打开网站',
      content: `由于微信小程序安全限制，无法直接打开外部网站。\n\n解决方案：\n1. 复制链接后在浏览器中打开\n2. 联系管理员配置域名白名单\n\n网站地址：${url}`,
      confirmText: '复制链接',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          this.copyWebsite();
        }
      }
    });
  },

  // 复制网站链接
  copyWebsite() {
    const url = this.data.websiteUrl;
    
    wx.setClipboardData({
      data: url,
      success: () => {
        wx.showToast({
          title: '链接已复制',
          icon: 'success',
          duration: 2000
        });
        
        // 显示成功提示后，提供详细的操作指导
        setTimeout(() => {
          wx.showModal({
            title: '链接已复制到剪贴板',
            content: '操作步骤：\n1. 打开手机浏览器\n2. 在地址栏粘贴链接\n3. 访问京采接单官方网站',
            confirmText: '知道了',
            cancelText: '再次复制',
            success: (res) => {
              if (res.cancel) {
                this.copyWebsite();
              }
            }
          });
        }, 2000);
      },
      fail: () => {
        wx.showToast({
          title: '复制失败',
          icon: 'error',
          duration: 2000
        });
      }
    });
  },

  // 返回上一页
  goBack() {
    wx.navigateBack({
      delta: 1
    });
  },

  // 分享功能
  onShareAppMessage() {
    return {
      title: '京采接单 - 专业配送服务',
      path: '/subPackage/pages/downLoadApp/downLoadApp',
      imageUrl: '/images/logo.jpg'
    };
  },

  // 分享到朋友圈
  onShareTimeline() {
    return {
      title: '京采接单 - 专业配送服务',
      imageUrl: '/images/logo.jpg'
    };
  }
});
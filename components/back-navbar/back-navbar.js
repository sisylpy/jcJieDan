
Component({
  properties: {
    title: {
      type: String,
      value: '页面标题'
    },
    avatar: {
      type: String,
      value: '/images/avatar.png'
    },
    buttonText: {
      type: String,
      value: '按钮'
    }
  },
  data: {
    statusBarHeight: 20,
    navBarContentHeight: 44,
    navBarHeight: 64,
    menuButtonInfo: null,
    navBarContentHeight: 44,
    leftWidth: 0,
    rightWidth: 0,

  },
  lifetimes: {
    attached() {
      const app = getApp();
      const globalData = app.globalData;
      
      var windowWidth = globalData.windowWidth;
      var statusBarHeight = globalData.statusBarHeight;
      var menuButtonInfo = globalData.menuButtonInfo;
      const rpxRatio = 750 / windowWidth;
      
      // 转换为 rpx 单位
      const navBarHeight = globalData.navBarHeight * rpxRatio;
      const statusBarHeightRpx = statusBarHeight * rpxRatio;
      const navBarContentHeight = globalData.navBarContentHeight * rpxRatio;
      
      const rightWidth = (windowWidth - menuButtonInfo.left) * rpxRatio; // 右侧宽度
      const leftWidth = rightWidth; // 左侧宽度与右侧相同

      this.setData({
        statusBarHeight: statusBarHeightRpx,
        navBarContentHeight: navBarContentHeight,
        navBarHeight: navBarHeight,
        menuButtonInfo: globalData.menuButtonInfo,
        leftWidth: leftWidth,
        rightWidth: rightWidth,
      });
    }
  },

  methods: {
    navbuttontap() {
      this.triggerEvent('navbuttontap');
    }
  }
});


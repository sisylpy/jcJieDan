
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
      
      console.log('🔍 custom-navbar.js - 组件初始化:');
      console.log('  - 从 globalData 获取的 navBarHeight:', globalData.navBarHeight);
      console.log('  - 从 globalData 获取的 statusBarHeight:', globalData.statusBarHeight);
      console.log('  - 从 globalData 获取的 navBarContentHeight:', globalData.navBarContentHeight);
      
      // console.log("jssssss" , globalData)
       var windowWidth = globalData.windowWidth;
       var statusBarHeight = globalData.statusBarHeight;
       var menuButtonInfo = globalData.menuButtonInfo;
       const rpxRatio = 750 / windowWidth;
       
      // 直接使用 globalData 中已经计算好的值，转换为 rpx 单位
      const navBarHeight = globalData.navBarHeight * rpxRatio;
      const statusBarHeightRpx = statusBarHeight * rpxRatio;
      const navBarContentHeight = globalData.navBarContentHeight * rpxRatio;
       
       const rightWidth = (windowWidth - menuButtonInfo.left) * rpxRatio; // 右侧宽度
       const leftWidth = rightWidth; // 左侧宽度与右侧相同

      this.setData({
        statusBarHeight: statusBarHeightRpx, // 使用转换后的 rpx 值
        navBarContentHeight: navBarContentHeight, // 使用转换后的 rpx 值
        navBarHeight: navBarHeight, // 使用转换后的 rpx 值
        menuButtonInfo: globalData.menuButtonInfo,
        leftWidth: leftWidth,
        rightWidth: rightWidth

      });
      
      console.log('🔍 custom-navbar.js - setData 完成:');
      console.log('  - this.data.navBarHeight (rpx):', navBarHeight);
      console.log('  - this.data.statusBarHeight (rpx):', statusBarHeightRpx);
      console.log('  - this.data.navBarContentHeight (rpx):', navBarContentHeight);
      console.log('  - rpxRatio:', rpxRatio);
      console.log('  - leftWidth:', leftWidth);
      console.log('  - rightWidth:', rightWidth);
      console.log('  - menuButtonInfo.left:', menuButtonInfo.left);
      console.log('  - windowWidth:', windowWidth);

    }
  },
  methods: {
    navbuttontap() {
      this.triggerEvent('navbuttontap');
    }
  }
});


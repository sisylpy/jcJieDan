

Page({

  /**
   * 页面的初始数据
   */
  data: {
    addmissage: '选的位置',
    // markers	 Array	标记点
    latitude: "",
    longitude: "",
    scale: 14,
    markers: [],
    address: "",
    name: "",
    //controls控件 是左下角圆圈小图标,用户无论放大多少,点这里可以立刻回到当前定位(控件（更新一下,即将废弃，建议使用 cover-view 代替）)
    controls: [{
      id: 1,
      iconPath: '../../images/location.png',
      position: {
        left: 15,
        top: 260 - 50,
        width: 40,
        height: 40
      },
      clickable: true
    }],
    distanceArr: []
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const app = getApp();
    const globalData = app.globalData;

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
    
    })

    // 不再自动调用 wx.getLocation（该接口审核不通过）
    // 如需获取位置，由用户主动通过 wx.chooseLocation 选择
  },


 //controls控件的点击事件
 bindcontroltap(e) {
  var that = this;
  if (e.controlId == 1) {
    that.setData({
      latitude: that.data.latitude,
      longitude: that.data.longitude,
      scale: 14,
    })
  }
 },

//导航：打开地图选位置
onGuideTap: function (event) {
  var that = this;
  wx.chooseLocation({
    latitude: that.data.latitude,
    longitude: that.data.longitude,
    success: function (res) {
      that.setData({
        latitude: res.latitude,
        longitude: res.longitude,
        address: res.address || '',
        name: res.name || '',
        addmissage: res.name || res.address || '已选位置'
      })
    }
  })
},

toBack(){
  wx.navigateBack({delta: 1});
},


})
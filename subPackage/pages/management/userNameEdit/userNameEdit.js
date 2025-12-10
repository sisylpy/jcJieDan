
var load = require('../../../../lib/load.js');

import apiUrl from '../../../../config.js'
import {
  updatePassword,
  disGetWebUser
} from '../../../../lib/apiDistributer'


Page({

  /**
   * 页面的初始数据
   */
  data: {
    confirmPassword: "",
    password: "",
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
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      url: apiUrl.server,

    })

    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
        userId: userInfo.nxDistributerUserId,
        disId: userInfo.nxDistributerEntity.nxDistributerId,
        src: apiUrl.server +  userInfo.nxDistributerEntity.nxDistributerImg
        
      })
      disGetWebUser(this.data.disId).then(res =>{
        if(res.result.code == 0){
          this.setData({
            sysUser: res.result.data,
          })
        }
      })
    }
  },

  
  onPasswordInput(e) {
    this.setData({ password: e.detail.value });
  },

  // 处理确认密码输入
  onConfirmPasswordInput(e) {
    this.setData({ confirmPassword: e.detail.value });
  },


  updateUserInfo() {
    const { password, newPassword } = this.data;

    // 简单的前端验证
    if (!password || !newPassword) {
      wx.showToast({
        title: '用户名和密码不能为空',
        icon: 'none'
      });
      return;
    }
    if (password !== confirmPassword) {
      wx.showToast({
        title: '两次输入的密码不一致',
        icon: 'none'
      });
      return;
    }

    var data = {
      disId: this.data.disId,
      newPassword: this.data.newPassword
    }
    updatePassword(data).then(res =>{
      if(res.result.code == 0){
        wx.navigateBack({detail: 1})
      }
    })


  },

  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  },


  















})
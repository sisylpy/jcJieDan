var load = require('../../lib/load.js');
const app = getApp();

import {
  getInviteCode
} from '../../lib/apiDistributer'

Page({
  data: {
    inviteCode: '',
    isVerifying: false,
  },

  onLoad: function (options) {
    const globalData = getApp().globalData;
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
    })

    // 检查是否已经登录
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      // 已经登录，直接跳转到订单页面
      wx.switchTab({
        url: '../order/index/index'
      })
      return;
    }

    // 检查是否已经验证过邀请码
    const verifiedInviteCode = wx.getStorageSync('verifiedInviteCode');
    if (verifiedInviteCode) {
      // 已经验证过，直接跳转到登录页面
      this.navigateToLogin();
    }
  },

  // 输入邀请码
  onInviteCodeInput: function (e) {
    this.setData({
      inviteCode: e.detail.value.trim()
    })
  },

  // 验证邀请码
  verifyInviteCode: function () {
    const inviteCode = this.data.inviteCode;
    
    if (!inviteCode || inviteCode.trim().length === 0) {
      wx.showToast({
        title: '请输入邀请码',
        icon: 'none'
      })
      return;
    }

    if (this.data.isVerifying) {
      return;
    }

    this.setData({
      isVerifying: true
    })

    load.showLoading('验证中...');

    getInviteCode(inviteCode)
      .then((res) => {
        load.hideLoading();
        this.setData({
          isVerifying: false
        })

        console.log('邀请码验证结果:', res);
        
        if (res.result && res.result.code === 0) {
          // 验证成功，保存邀请码到本地存储
          wx.setStorageSync('verifiedInviteCode', inviteCode);
          wx.showToast({
            title: '验证成功',
            icon: 'success',
            duration: 1500
          })
          
          // 延迟跳转到登录页面
          setTimeout(() => {
            this.navigateToLogin();
          }, 1500);
        } else {
          // 验证失败
          const errorMsg = res.result?.msg || res.result?.message || '邀请码无效或已过期';
          wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 2000
          })
        }
      })
      .catch((error) => {
        load.hideLoading();
        this.setData({
          isVerifying: false
        })
        console.error('验证邀请码失败:', error);
        wx.showToast({
          title: '网络错误，请重试',
          icon: 'none'
        })
      })
  },

  // 跳转到登录页面
  navigateToLogin: function () {
    wx.redirectTo({
      url: '../login/login'
    })
  },

  // 返回按钮
  toBack: function () {
    wx.navigateBack({
      delta: 1
    })
  }
})


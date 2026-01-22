var utils = require('../../utils/util')

import {
  printDisLogin
} from '../../lib/apiDistributer'


Page({


  /**
   * 页面的初始数据
   */
  data: {
    isLogin: -1

  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const globalData = getApp().globalData;
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
    })
  
    if (options.q) {
      //获取二维码的携带的链接信息
      let qrUrl = decodeURIComponent(options.q)
      var that = this;
      that.setData({
        //获取链接中的参数信息
        sessionId: utils.getQueryString(qrUrl, 'scene'),
      })
      that._login();
    }
    
  },


  _login() {
   
    var sessionId = this.data.sessionId
    // 首次登录
    wx.login({
      success(res) {
        if (res.code) {
          var data ={
            code : res.code,
            sessionId: sessionId
          }
        
          printDisLogin(data)
            .then(res => {
              if (res.result.code == 0) {
                wx.reLaunch({
                  url: '../order/index/index',
                })
                
               
              } else {
              
                wx.redirectTo({
                  url: '../inviteCode/inviteCode',
                })
               
              }
            })
        }
      }
    })
    //login finish
  },




})
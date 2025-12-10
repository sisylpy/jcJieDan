var load = require('../../../lib/load.js');
var utils = require('../../../utils/util')
const app = getApp();

import {
  disUserSaveWithFile,
  disLogin,
} from '../../../lib/apiDistributer'

Page({

  data: {
    phone: "", // 手机号码
    phoneValid: false, // 手机号码是否有效
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const globalData = app.globalData;

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      nickName: "",
      phone: "",
      phoneValid: false,
      disId: options.disId,
      disName: options.disName,
      admin: options.admin,
    })

    this._aaa();
  },



  _aaa() {
    wx.login({
      success: (res) => {
        console.log(res);
        this.setData({
          code: res.code
        })
      },

      fail: (res => {
        wx.showToast({
          title: '请重新操作',
          icon: 'none'
        })
      })
    })
  },





  onChooseAvatar(e) {
    console.log(e);
    var that = this;
    var src = [];
    src.push(e.detail.avatarUrl)
    var filePathList = src;
    var userName = this.data.nickName;
    var phone = this.data.phone;
    var disId = this.data.disId;
    var code = this.data.code;
    var admin = this.data.admin;
    load.showLoading("保存修改内容");
    console.log(userName, phone, code, disId, filePathList)
    disUserSaveWithFile(filePathList, userName, code, disId, admin, phone).then((res) => {
      console.log(res);
      if (res.result == '{"code":0}') {
        if(that.data.admin == 0){
          that._login();
        }else{
          wx.redirectTo({
            url: '../downLoadApp/downLoadApp',
          })

        }
    

      } else {
        load.hideLoading();
        wx.showToast({
          title: "请直接登陆",
          icon: 'none'
        })
      }
    })
  },


  getNickName(e) {
    this.setData({
      nickName: e.detail.value
    })
  },

  // 获取手机号码
  getPhone(e) {
    const phone = e.detail.value;
    console.log("getPhonegetPhone", phone);
    
    // 只更新手机号码，不进行验证
    this.setData({
      phone: phone,
      phoneValid: false // 重置验证状态
    });
  },

  // 手机号码验证（失去焦点时调用）
  validatePhone(e) {
    const phone = e.detail.value;
    console.log("validatePhone", phone);
    
    if (phone.length > 0) {
      // 手机号码验证正则表达式
      var myreg = /^[1][3,4,5,7,8,9][0-9]{9}$/;

      if (!(myreg.test(phone))) {
        wx.showModal({
          title: '手机号码不正确',
          showCancel: false,
          confirmText: "知道了",
        });
        this.setData({
          phoneValid: false
        });
      } else {
        this.setData({
          phoneValid: true
        });
      }
    } else {
      this.setData({
        phoneValid: false
      });
    }
  },


  tishi() {
    if (!this.data.nickName || this.data.nickName.length === 0) {
      wx.showToast({
        title: '请输入用户名',
        icon: 'none'
      });
    } else if (!this.data.phone || this.data.phone.length === 0) {
      wx.showToast({
        title: '请输入手机号码',
        icon: 'none'
      });
    } else if (!this.data.phoneValid) {
      wx.showToast({
        title: '请输入正确的手机号码',
        icon: 'none'
      });
    } else {
      wx.showToast({
        title: '注册信息不完整',
        icon: 'none'
      });
    }
  },

  _login() {
    var that = this;
    wx.login({
      success: (res) => {
        load.hideLoading();

        var disUser = {
          nxDiuCode: res.code,
        }
        disLogin(disUser)
          .then((res) => {
            console.log(res);
            if (res.result.code !== -1) { //登陆成功
           
              if (res.result.data.userInfo.nxDiuAdmin == 0) {
                wx.setStorageSync('userInfo', res.result.data.userInfo);
              wx.setStorageSync('disInfo', res.result.data.disInfo)
              wx.switchTab({
                url: '/pages/order/index/index',
              })
              }else if (res.result.data.userInfo.nxDiuAdmin == 3) {
                wx.redirectTo({
                  url: '../downLoadApp/downLoadApp',
                })

              }

            } else { // 登陆失败
              wx.showModal({
                title: res.result.msg,
                content: "请注册",
                showCancel: false,
                confirmText: "知道了",
              })

            }
          })
      },
      
      fail: (res => {
        load.hideLoading();
        wx.showModal({
          title: res.result.msg,
          showCancel: false,
          confirmText: "知道了",
        })
      })
    })


  },








})
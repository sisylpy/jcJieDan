var load = require('../../../lib/load.js');
const app = getApp();

import {
  disUserSaveWithFile,
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
      inviteCode: options.inviteCode,
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
    var src = [];
    src.push(e.detail.avatarUrl)
    var filePathList = src;
    var userName = this.data.nickName;
    var phone = this.data.phone;
    var code = this.data.code;
    load.showLoading("保存修改内容");
    disUserSaveWithFile(filePathList, userName, code, this.data.inviteCode, phone).then((res) => {
      var result = res.result;
      try { result = typeof result === 'string' ? JSON.parse(result) : result } catch (e) {}
      if (result && result.code == 0) {
        load.hideLoading();
        wx.showModal({
          title: '注册成功',
          content: '你已注册为录单员，请返回老板确认。',
          showCancel: false,
          success: function () { wx.navigateBack({ delta: 1 }) }
        })
      } else {
        load.hideLoading();
        wx.showToast({
          title: (result && result.msg) || "注册失败，请让老板重新邀请",
          icon: 'none'
        })
      }
    }).catch(function () {
      load.hideLoading();
      wx.showToast({ title: '注册失败，请检查网络', icon: 'none' })
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
    if (!this.data.inviteCode) {
      wx.showToast({
        title: '邀请已失效，请让老板重新邀请',
        icon: 'none'
      });
    } else if (!this.data.nickName || this.data.nickName.length === 0) {
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
})

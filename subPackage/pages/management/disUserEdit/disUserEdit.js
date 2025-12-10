var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config.js'


import {
  updateDisUserWithFile,
  updateDisUser,
  disLogin
} from '../../../../lib/apiDistributer'

Page({

  /**
   * 页面的初始数据
   */
  data: {

    canSave: false,
    imgChanged: false,
  

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

    var userInfo = wx.getStorageSync('editUserItem');
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
        userName: userInfo.nxDiuWxNickName,
        phone: userInfo.nxDiuWxPhone,
        deviceId: userInfo.nxDiuPrintDeviceId,
      })
      if (userInfo.nxDiuUrlChange == 1) {
        this.setData({
          src: apiUrl.server + userInfo.nxDiuWxAvartraUrl
        })
      } else {
        this.setData({
          src: userInfo.nxDiuWxAvartraUrl,

        })
      }
    }

  },


  //选择图片
  choiceImg: function (e) {
    var _this = this;

    wx.chooseImage({
      count: 1, // 最多可以选择的图片张数，默认9
      sizeType: ['original', 'compressed'], // original 原图，compressed 压缩图，默认二者都有
      sourceType: ['album', 'camera'], // album 从相册选图，camera 使用相机，默认二者都有
      success: function (res) {
        _this.setData({
          src: res.tempFilePaths,
          // isSelectImg: true,
          imgChanged: true,
          canSave: true

        })
        console.log("savefileleel");
        var filePathList = _this.data.src;
        var userName = _this.data.userName;
        var userId = _this.data.userInfo.nxDistributerUserId;
        load.showLoading("保存修改内容")
        updateDisUserWithFile(filePathList, userName, userId).then(res => {
          if(res.result == '{"code":0}'){ 
            load.hideLoading();
            _this._login();
          }else{
            wx.showToast({
              title: '修改失败',
              icon: 'none'
            })
          }   
        })
        // _this._checkSave();
      },
      fail: function () {
        // fail
      },
      complete: function () {
        // complete
      }
    })

  },


  /**
   * 获取用户名
   * @param {*} e 
   */
  getUserName(e) {
    if(e.detail.value !== this.data.userInfo.nxDiuWxNickName){
      this.setData({
        userName: e.detail.value,
        canSave: true,
      })
    }
   

  },

  getPhone(e){
    if(e.detail.value){
      this.setData({
        phone: e.detail.value,
        canSave: true,
      })
    }
  },

  delPrint(){

    this.setData({
      deviceId:  "-1",
      canSave: true,
    })
 
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

  /**
   * 修改显示周期
   * @param {}} e 
   */
  radioChange: function (e) {
    this.setData({
      weeks:e.detail.value,
      canSave: true,
    })
  },

/**
 * 保存修改内容
 */
  save() {

    var that = this;
    //如果修改了图片
    if (this.data.imgChanged) {
      var filePathList = this.data.src;
      var userName = this.data.userName;
      var userId = this.data.userInfo.nxDistributerUserId;

      load.showLoading("保存修改内容")
      updateDisUserWithFile(filePathList, userName, userId).then(res => {
        if(res.result == '{"code":0}'){ 
          load.hideLoading();
           that._login();
        }else{
          wx.showToast({
            title: '修改失败',
            icon: 'none'
          })
        }   
      })
    } else {
      //没有修改图片
      var userName = this.data.userName;
      var userId = this.data.userInfo.nxDistributerUserId;
      var data = {
        userName: userName,
        userId: userId,
        phone: this.data.phone,
        deviceId: this.data.deviceId,
      }
      load.showLoading("保存修改内容");
      updateDisUser(data).then(res => {
        if (res.result.code == 0) {
        load.hideLoading();
        
        let pages = getCurrentPages();
        let prevPage = pages[pages.length - 4];
        prevPage.setData({
          userInfo: res.result.data
        })
        wx.setStorageSync('userInfo', res.result.data);
        wx.navigateBack({
          delta: 1,
        })
      }else{
        load.hideLoading();
        wx.showToast({
          title: '获取信息失败',
          icon: 'none'
        })
      }
      })
    }
  },
  _login() {
    var that = this;
    // 首次登录
    wx.login({
      success(res) {
        console.log(res);
        if (res.code) {
          var disUser = {
            nxDiuCode: res.code,
          }
          disLogin(disUser)
            .then(res => {
              if (res.result.code !== -1) {
                console.log(res.result)
                //缓存用户信息
                
                wx.setStorageSync('userInfo', res.result.data.userInfo);
                wx.setStorageSync('disInfo', res.result.data.disInfo);
                let pages = getCurrentPages();
                let prevPage = pages[pages.length - 4];
                console.log("updateususuisdifnifididifaiiifad")
                prevPage.setData({
                  userInfo: res.result.data,
                  userInfo: res.result.data.userInfo,
                  disInfo: res.result.data.disInfo,
                  disId: res.result.data.disInfo.nxDistributerId,
                })      
                // wx.navigateBack({
                //   delta: 1,
                // })
              }
              
            })
        }
      }
    })
    //login finish
  },

  onUnload(){
    wx.removeStorageSync('editUserItem')
  },


  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  }
  

   






})
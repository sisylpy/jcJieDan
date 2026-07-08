var load = require('../../../lib/load.js');
const app = getApp();

import {
  disLogin,
} from '../../../lib/apiDistributer'

// 新增企业微信API导入
import {
  wxworkLogin,
  wxworkRegister
} from '../../../lib/apiWxwork'

Page({

  data: {
    canLogin: false,
    accept: false,
    address: null,
    disName: null,
    userName: null,
    phone: null,
    showSelect: false,
    
    longitude: 0,
    latitude: 0,
    marketId: -1,
   
  },

  onLoad: function (options) {
    const globalData = app.globalData;

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
       environment: globalData.environment,
    })

    this._aaa();


    if(options.cityId == null){
      this.setData({
        cityId: -1, 
        maId: -1,
      })
    }else{
      this.setData({
        cityId: options.cityId, 
        maId: options.maId,
      })
    }

    var data = {
      cityId: this.data.cityId,
      maId:  this.data.maId,
    }
    jjshGetMarket(data).then(res =>{
      if(res.result.code ==0 ){
        this.setData({
          itemsMarket: res.result.data,
        })
      }
    })
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


  _login() {

    wx.login({
      success: (res) => {
        load.hideLoading();
        var disUser = {
          nxDiuCode: res.code,
        }
        disLogin(disUser)
          .then((res) => {
            if (res.result.code !== -1) { //登陆成功
              wx.setStorageSync('userInfo', res.result.data.userInfo);
              wx.setStorageSync('disInfo', res.result.data.disInfo)
              wx.redirectTo({
                url: '../../../subPackage/pages/management/payList/payList',
              })
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
        wx.showToast({
          title: res,
          icon: 'none',
          duration: 10000,
        })
      })
    })
  },


  _register(e) {
    if (this.data.canLogin && this.data.name.length > 0) {
      wx.getUserProfile({
        desc: '用于完善会员资料', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
        success: resUser => {
          wx.login({
            success: (res) => {
              load.showLoading("注册新用户")
              var serviceArr = [{
                  nxDsCityId: 1,
                  nxDsCityName: "北京市"
                },
                {
                  nxDsCityId: 6,
                  nxDsCityName: "河北省 三河市"
                }
              ];
              var dep = {
                nxDistributerName: this.data.name,
                nxDistributerAddress: this.data.address,
                nxDistributerMarketName: this.data.marketName,
                nxDistributerImg: "uploadImage/r.jpg",
                nxDistributerLan: this.data.latitude,
                nxDistributerLun: this.data.longitude,
                nxDistributerPhone: this.data.phone,
                nxDistributerBusinessTypeId: this.data.marketId,
                nxDistributerType: this.data.type,
                nxDistributerServiceCityEntities: serviceArr,
                nxDistributerUserEntity: {
                  nxDiuWxNickName: resUser.userInfo.nickName,
                  nxDiuWxAvartraUrl: resUser.userInfo.avatarUrl,
                  nxDiuCode: res.code,
                  nxDiuAdmin: 0,
                  nxDiuPrintDeviceId: -1,
                  nxDiuPrintBillDeviceId: -1,
                }
              }
              console.log(dep);
              disAndUserSave(dep)
                .then((res) => {                
                  if (res.result.code !== -1) { //注册成功
                    load.hideLoading()
                    console.log(res.result.data);
                    wx.setStorageSync('userInfo', res.result.data.userInfo);
                    wx.setStorageSync('disInfo', res.result.data.disInfo)
                    app.globalData.userInfo = res.result.data.userInfo;
                    wx.switchTab({
                      url: '../order/index/index',
                    })
                  } else { //注册失败
                   
                    wx.showToast({
                      title: res.result.msg,
                      icon: 'none'
                    })
                    load.hideLoading();
                  }
                })
            },
            fail: (res => {
              load.hideLoading();
              wx.showToast({
                title: res,
                icon: 'none'
              })
            })
          })
        },
        fail: res => {
          wx.showToast({
            title: "请检查网络",
            icon: 'none'
          })
          setTimeout(() => {
            load.showLoading("注册用户并设置商品，需要2分钟时间。");
            //  this._login();
           }, 2000);
        }
      })
    } else {
      wx.showToast({
        title: '请填写完整注册项',
        icon: 'none'
      })
    }
  },

  _registerWork(e) {
    console.log("wxqyeredg")
    if (this.data.canLogin && this.data.name.length > 0) {
      wx.getUserProfile({
        desc: '用于完善会员资料', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
        success: resUser => {
          console.log(resUser)
          wx.qy.login({
            suiteId: 'ww2cddb5d2d7b3ee5d',
            success: (resQy) => {
              console.log(resQy);
              if(resQy.code){
                load.showLoading("注册新用户")
                var serviceArr = [{
                    nxDsCityId: 1,
                    nxDsCityName: "北京市"
                  },
                  {
                    nxDsCityId: 6,
                    nxDsCityName: "河北省 三河市"
                  }
                ];

                var dep = {
                  nxDistributerName: this.data.name,
                  nxDistributerAddress: this.data.address,
                  nxDistributerMarketName: this.data.marketName,
                  nxDistributerImg: "uploadImage/r.jpg",
                  nxDistributerLan: this.data.latitude,
                  nxDistributerLun: this.data.longitude,
                  nxDistributerPhone: this.data.phone,
                  nxDistributerBusinessTypeId: this.data.marketId,
                  nxDistributerType: this.data.type,
                  isSelected: this.data.down,
                  nxDistributerServiceCityEntities: serviceArr,
                  qyNxDisCorpEntity: {
                    // qyNxDisCorpName: 
                  },
                  nxDistributerUserEntity: {
                    nxDiuWxNickName: resUser.userInfo.nickName,
                    nxDiuWxAvartraUrl: resUser.userInfo.avatarUrl,
                    nxDiuCode: resQy.code,
                    nxDiuAdmin: 0,
                    nxDiuPrintDeviceId: -1,
                    nxDiuPrintBillDeviceId: -1,
                  }
                }
                wxworkRegister(dep)
                  .then((res) => {
                    wx.hideLoading()
                    if (res.result.code !== -1) { //注册成功
                      wx.setStorageSync('userInfo', res.result.data.userInfo);
                      wx.setStorageSync('disInfo', res.result.data.disInfo);
                      wx.setStorageSync('loginType', 'wxwork'); // 存储登录类型
                      app.globalData.userInfo = res.result.data.userInfo;
                      wx.switchTab({
                        url: '../order/index/index',
                      })
                    } else { //注册失败
                      wx.showToast({
                        title: res.result.msg || '企业微信注册失败',
                        icon: 'none'
                      })
                      load.hideLoading();
                    }
                  })
                  .catch((error) => {
                    wx.hideLoading();
                    wx.showToast({
                      title: '注册失败，请重试',
                      icon: 'none'
                    })
                  })
              }
            },
            fail: (res => {
              load.hideLoading();
              wx.showToast({
                title: res,
                icon: 'none'
              })
              
            })
          })
        },
        fail: res => {
          setTimeout(() => {
            load.showLoading("注册用户并设置商品，需要2分钟时间。");
            //  this._login();
           }, 2000);
          // wx.showToast({
          //   title: "请检查网络",
          //   icon: 'none'
          // })

        }
      })
    } else {
      wx.showToast({
        title: '请填写完整注册项',
        icon: 'none'
      })
    }


  },

  _loginWork() {

    wx.qy.login({
      suiteId: 'ww2cddb5d2d7b3ee5d', 
      success: (resQy) => {
        if(resQy.code){
          load.hideLoading();
          var disUser = {
            nxDiuCode: resQy.code,
          }
          wxworkLogin(disUser)
            .then((res) => {
              wx.hideLoading();
              if (res.result.code !== -1) { //登陆成功
                wx.setStorageSync('userInfo', res.result.data.userInfo);
                wx.setStorageSync('disInfo', res.result.data.disInfo);
                wx.setStorageSync('loginType', 'wxwork'); // 存储登录类型
                app.globalData.userInfo = res.result.data.userInfo;
                wx.switchTab({
                  url: '../order/index/index',
                })
              } else { // 登陆失败
                wx.showModal({
                  title: '企业微信登录失败',
                  content: res.result.msg || "请检查企业微信权限或联系管理员",
                  showCancel: false,
                  confirmText: "知道了",
                })
              }
            })
            .catch((error) => {
              wx.hideLoading();
              wx.showToast({
                title: '网络连接失败',
                icon: 'none'
              })
            })

        }
       
      },
      fail: (res => {
        load.hideLoading();
        wx.showToast({
          title: res,
          icon: 'none',
          duration: 10000,
        })
      })
    })
  },
  
  toMap(e) {
    console.log(e);
    var _this = this;
    wx.chooseLocation({
      success: function (res) {
        console.log('chooseLocation', res);
        _this.setData({
          latitude: res.latitude,
          longitude: res.longitude,
        })
        _this._canLogin()

      },
    })
  },





})
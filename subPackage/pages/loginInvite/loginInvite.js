var load = require('../../../lib/load.js');
const app = getApp();

import {
  jjshUserSaveWithFileByGbInvite,
  disLogin,
  jjshGetMarket
} from '../../../lib/apiDistributer'

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
    gbDisId: -1,

  },

  onLoad: function (options) {
    const globalData = app.globalData;

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      environment: globalData.environment,
      gbDisId: options.gbDisId,
      gbDisName: options.disName,
    })
    this._login();
    this._aaa();


    if (options.cityId == null) {
      this.setData({
        cityId: -1,
        maId: -1,
      })
    } else {
      this.setData({
        cityId: options.cityId,
        maId: options.maId,
      })
    }

    var data = {
      cityId: this.data.cityId,
      maId: this.data.maId,
    }
    jjshGetMarket(data).then(res => {
      if (res.result.code == 0) {
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


  radioChangeMarket: function (e) {

    var value = e.detail.value;
    this.setData({
      marketId: this.data.itemsMarket[value].sysCityMarketId,
      selected: true,
      marketName: this.data.itemsMarket[value].sysCmMarketName,
      showMarket: false
    })
    this._canLogin();
  },


  getName: function (e) {
    console.log("getNamegetNamegetName")
    if (e.detail.value.length > 0) {
      this.setData({
        disName: e.detail.value,
      })

    } else {
      this.setData({
        disName: null,
      })
    }
    this._canLogin();
  },


  getUserName(e) {
    if (e.detail.value.length > 0) {
      this.setData({
        userName: e.detail.value,
      })
    } else {
      this.setData({
        userName: null,
      })
    }
    this._canLogin();

  },

  getAddress(e) {
    console.log("getAddressgetAddress")
    if (e.detail.value.length > 0) {
      this.setData({
        address: e.detail.value,
      })
    } else {
      this.setData({
        address: null,
      })
    }
    this._canLogin();

  },
  //


  getPhone(e) {
    console.log("getPhonegetPhone")
    const phone = e.detail.value;
    // 只更新手机号码，不进行验证
    this.setData({
      phone: phone,
    });
  },

  // 手机号码验证（失去焦点时调用）
  validatePhone(e) {
    console.log("validatePhone")
    const phone = e.detail.value;
    if (phone.length > 0) {
      var myreg = /^[1][3,4,5,7,8,9][0-9]{9}$/;

      if (!(myreg.test(phone))) {
        wx.showModal({
          title: '手机号码不正确',
          showCancel: false,
          confirmText: "知道了",
        });
      } else {
        // 手机号码正确，检查是否可以登录
        this._canLogin();
      }
    } else {
      this.setData({
        phone: null,
      });
    }
  },


  _canLogin() {
    console.log("_canLogin_canLogin----")
    // 检查手机号码格式是否正确
    let phoneValid = false;
    if (this.data.phone) {
      var myreg = /^[1][3,4,5,7,8,9][0-9]{9}$/;
      phoneValid = myreg.test(this.data.phone);
    }
    
    if (this.data.disName !== null && this.data.userName !== null && this.data.marketId !== -1 && this.data.address !== null && this.data.phone !== null && phoneValid) {
      this.setData({
        canLogin: true,
      })
    } else {
      this.setData({
        canLogin: false,
      })
    }
  },

  tishi() {
    wx.showToast({
      title: '注册信息不完整',
      icon: 'none'
    })
  },

  //微信授权点击“允许”
  getUserInfo: function (e) {

    if (e.currentTarget.dataset.type == "register") {
      if (this.data.environment == 'wxwork') {
        this._registerWork(e);
      } else {
        this._register(e);
      }
    }
    if (e.currentTarget.dataset.type == "login") {
      if (this.data.environment == 'wxwork') {
        this._loginWork(e);
      } else {
        this._login(e);
      }
    }
  },
  onGetUserProfile(e) {
    wx.getUserProfile({
      desc: '用于完善用户资料', // 声明用途
      success: (res) => {
        console.log('用户信息：', res.userInfo);
        this.setData({
          userInfo: res.userInfo
        });
      },
      fail: (err) => {
        console.log('用户拒绝授权', err);
      }
    });
  },
  onChooseAvatar(e) {
    console.log(e);
    var that = this;
    var src = [];
    src.push(e.detail.avatarUrl)
    var filePathList = src;
    var disName = this.data.disName;
    var userName = this.data.userName;
    var address = this.data.address;
    var marketId = this.data.marketId;
    var phone = this.data.phone;
    var code = this.data.code;
    var gbDisId = this.data.gbDisId;
    load.showLoading("保存修改内容");
    console.log(filePathList, marketId, disName, userName, phone, address, code)
    jjshUserSaveWithFileByGbInvite(filePathList, code, marketId, disName, userName, address, phone, gbDisId).then((res) => {
      load.hideLoading();
      const jsonObject = JSON.parse(res.result);
      console.log(jsonObject);
      if (jsonObject.code == 0) {
        wx.setStorageSync('disInfo', jsonObject.data.disInfo);
        wx.setStorageSync('userInfo', jsonObject.data.userInfo);
        wx.switchTab({
          url: '../order/index/index',
        })

      } else {
        load.hideLoading();
        wx.showToast({
          title: "请直接登陆",
          icon: 'none'
        })
      }

    })


  },



  showSelect() {
    this.setData({
      showSelect: true
    })
  },
  closeType(e) {
    console.log(e)
    this.setData({
      showSelect: false
    })

  },


  //


  showMarket() {
    this.setData({
      showMarket: true
    })
  },

  closeMarket(e) {
    console.log(e)
    this.setData({
      showMarket: false
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
                url: '../../../subPackage/pages/customer/gbAndBusiness/gbAndBusiness?gbDisId=' + this.data.gbDisId,
              })
            } else { // 登陆失败
              // wx.showModal({
              //   title: res.result.msg,
              //   content: "请注册",
              //   showCancel: false,
              //   confirmText: "知道了",
              // })

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
                  roleEntities: [{
                    nxDurRoleId: 0
                  }]
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

  




})
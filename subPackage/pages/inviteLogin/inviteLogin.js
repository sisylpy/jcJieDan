var load = require('../../../lib/load.js');
const app = getApp();
import apiUrl from '../../../config.js'

import {
  jjshUserSaveWithFileInvite,
  disLogin,
  jjshGetMarket
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
    inviter: false,
    userDisId: "",
    inviterDisName: ""
   
  },

  onLoad: function (options) {
    const globalData = app.globalData;

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      disId: options.disId,
      inviterDisName: options.disName
    })

    this._login();
    

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

    }else{
      this.setData({
        disName: null,
      })
    }
    this._canLogin();
  },

  
  getUserName(e){
    if (e.detail.value.length > 0) {
      this.setData({
        userName: e.detail.value,
      })
    }else{
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
    }else{
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
      if(this.data.environment == 'wxwork'){
        this._registerWork(e);
      }else{
        this._register(e);
      }
    }
    if (e.currentTarget.dataset.type == "login") {
      if(this.data.environment == 'wxwork'){
        this._loginWork(e);
      }else{
      this._login(e);
      }
    }
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
    var disId = this.data.disId;
   
    load.showLoading("保存修改内容");
    console.log(filePathList, marketId,disName,userName, phone,address, code)
    jjshUserSaveWithFileInvite(filePathList,code, marketId,disName,userName, address,phone,disId).then((res) => {
      load.hideLoading();
    
      const jsonObject = JSON.parse(res.result);
      console.log(jsonObject);
      if (jsonObject.code == 0) {
        wx.setStorageSync('disInfo',jsonObject.data.disInfo);
        wx.setStorageSync('userInfo',jsonObject.data.userInfo);
        wx.switchTab({
          url: '../order/index/index',
        })

      }  else {
        load.hideLoading();
        wx.showToast({
          title: "请直接登陆",
          icon: 'none'
        })
      }

    })


  },


  /**
   * 邀请采购员
   * @param {*} options 
   */
  onShareAppMessage: function (options) {
    return {
      title: "注册管理员", // 默认是小程序的名称(可以写slogan等)
      path: '/pages/inviteLogin/inviteLogin?disId=' + this.data.disId,
      imageUrl: '',
    }
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
      success: (resUser) => {
        load.hideLoading();
        var disUser = {
          nxDiuCode: resUser.code,
        }
        console.log("resUser", resUser.code);
        disLogin(disUser)
          .then((res) => {
            console.log(res.result.data)
            if (res.result.code == 0) { //登陆成功
              wx.setStorageSync('disInfo',res.result.data.disInfo);
              wx.setStorageSync('userInfo',res.result.data.userInfo);
              wx.switchTab({
                url: '../order/index/index',
              })
             
            } else { // 登陆失败
             this.setData({
               inviter: false
             })
             this._aaa();
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
                    roleEntities: [{
                      nxDurRoleId: 0
                    }]
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


  toIndex(){
    if(this.data.inviter){
      wx.switchTab({
        url: '../order/index/index',
      })
    }
  },



})
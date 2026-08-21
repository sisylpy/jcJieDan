var load = require('../../lib/load.js');
const app = getApp();

import {
  jjshUserSaveWithFile,
  disAndUserSave,
  disLogin,
  jjshGetMarket
} from '../../lib/apiDistributer'

// 新增企业微信API导入
import {
  wxworkLogin,
  wxworkRegister
} from '../../lib/apiWxwork'
import { describeOwnerRequestError } from '../../lib/ownerRequest'

Page({

  data: {
    canLogin: false,
    accept: false,
    agreeProtocol: false,  // 是否同意用户协议和隐私政策（符合平台规范3.4）
    address: null,
    disName: null,
    userName: null,
    phone: null,
    showSelect: false,
    showPrivacy: false,  // 隐私授权弹窗
    downloadAllGoods: false, // 是否下载全部商品
    
    longitude: 0,
    latitude: 0,
    marketId: 0,
    marketName: '不在市场',
    selected: true,
    itemsMarket: [{
      sysCityMarketId: 0,
      sysCmMarketName: '不在市场'
    }],
   
  },

  onLoad: function (options) {
    const globalData = getApp().globalData;
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      environment: globalData.environment,
    })
    
    console.log("登录页面 onLoad - environment:", this.data.environment);
    console.log("登录页面 onLoad - canLogin:", this.data.canLogin);

    // 现有 Boss 用户（老板或文员）先用微信身份换取会话；邀请码只保护新用户注册。
    this._login();

    // 检查隐私授权状态（符合微信平台规范3.4）
    this._checkPrivacyAuth();

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
    jjshGetMarket(data).then(res => {
      if (res.result.code == 0) {
        const markets = Array.isArray(res.result.data) ? res.result.data : [];
        this.setData({
          itemsMarket: [{
            sysCityMarketId: 0,
            sysCmMarketName: '不在市场'
          }].concat(markets.filter(item => item.sysCityMarketId !== 0)),
        })
      }
    }).catch(error => {
      // 市场接口不可用时仍可按默认的“不在市场”完成注册。
      console.warn('获取市场列表失败，使用默认选项“不在市场”', error);
    })
  },

  _requireInviteForRegistration() {
    if (wx.getStorageSync('verifiedInviteCode')) return true;
    wx.redirectTo({
      url: '../inviteCode/inviteCode'
    });
    return false;
  },




  _checkPrivacyAuth() {
    if (!wx.getPrivacySetting) return;
    wx.getPrivacySetting({
      success: (res) => {
        if (res.needAuthorization) {
          this.setData({ showPrivacy: true });
        }
      },
      fail: () => {},
      complete: () => {}
    });
  },

  handleAgreePrivacy() {
    this.setData({ showPrivacy: false });
  },

  handleOpenPrivacyContract() {
    wx.openPrivacyContract({
      success: () => {},
      fail: () => {},
      complete: () => {}
    });
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
    if (e.detail.value.length > 0) {
      var myreg = /^[1][3,4,5,7,8,9][0-9]{9}$/;

      if (!(myreg.test(e.detail.value))) {
        wx.showModal({
          title: '手机号码不正确',
          showCancel: false,
          confirmText: "知道了",
        })
      } else {
        this.setData({
          phone: e.detail.value,
        })
        this._canLogin(e);
      }
    } else {
      this.setData({
        phone: null,
      })
    }
  },

  // 切换是否下载全部商品
  toggleDownloadAllGoods(e) {
    this.setData({
      downloadAllGoods: e.detail.value
    })
  },


  _canLogin() {
    console.log("_canLogin 检查条件:", {
      disName: this.data.disName,
      userName: this.data.userName,
      marketId: this.data.marketId,
      address: this.data.address,
      phone: this.data.phone
    });
    
    const basicOk = this.data.disName !== null && this.data.userName !== null && this.data.marketId !== -1 && this.data.address !== null && this.data.phone !== null;
    const canLogin = basicOk && this.data.agreeProtocol;
    if (basicOk && this.data.agreeProtocol) {
      console.log("✅ 所有条件满足，canLogin = true");
      console.log("当前 environment:", this.data.environment);
      console.log("应该显示的按钮:", this.data.environment === 'wxwork' ? '企业微信注册按钮' : '普通注册按钮');
      this.setData({
        canLogin: true,
      })
    } else {
      console.log("❌ 条件不满足，canLogin = false");
      this.setData({
        canLogin: false,
      })
    }
  },

  onAgreeProtocolChange(e) {
    this.setData({
      agreeProtocol: e.detail.value.length > 0
    });
    this._canLogin();
  },

  toUserAgreement() {
    wx.navigateTo({
      url: '/subPackage/pages/agreement/userAgreement/userAgreement'
    });
  },

  toPrivacyPolicy() {
    wx.navigateTo({
      url: '/subPackage/pages/agreement/privacyPolicy/privacyPolicy'
    });
  },

  tishi() {
    console.log("tishi 被点击，当前数据:", this.data);
    
    if (!this.data.agreeProtocol) {
      wx.showToast({
        title: '请先阅读并同意《用户服务协议》和《隐私政策》',
        icon: 'none',
        duration: 3000
      });
      return;
    }
    
    // 检查缺少哪些信息
    const missing = [];
    if (this.data.marketId === -1) missing.push('批发市场');
    if (!this.data.address) missing.push('商铺地址');
    if (!this.data.disName) missing.push('批发商名称');
    if (!this.data.phone) missing.push('联系手机');
    if (!this.data.userName) missing.push('联系人');
    
    const message = missing.length > 0 
      ? `请填写: ${missing.join('、')}` 
      : '请确定填写完整信息';
    
    wx.showToast({
      title: message,
      icon: 'none',
      duration: 3000
    })
  },

  //微信授权点击“允许”
  getUserInfo: function (e) {

    if (e.currentTarget.dataset.type == "register") {
      if (!this._requireInviteForRegistration()) return;
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
    if (!this._requireInviteForRegistration()) return;
    console.log("✅ onChooseAvatar 被触发", e);
    const { avatarUrl } = e.detail;
    
    // 开发者工具兼容处理
    if (!avatarUrl) {
      console.warn("⚠️ avatarUrl 为空，使用默认头像");
      this._registerWithDefaultAvatar();
      return;
    }
    
    this.setData({ avatarUrl });
    console.log("头像URL:", avatarUrl);
    
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

    load.showLoading("保存修改内容");
    console.log(filePathList, marketId,disName,userName, phone,address, code)
    jjshUserSaveWithFile(filePathList,code, marketId,disName,userName, address,phone, this.data.downloadAllGoods).then((res) => {
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

  // 使用默认头像注册（用于开发工具兼容）
  _registerWithDefaultAvatar() {
    if (!this._requireInviteForRegistration()) return;
    console.log("📝 使用默认头像注册");
    
    // 使用本地默认头像路径
    var filePathList = ['uploadImage/r.jpg']; // 默认头像
    var disName = this.data.disName;
    var userName = this.data.userName;
    var address = this.data.address;
    var marketId = this.data.marketId;
    var phone = this.data.phone;
    var code = this.data.code;

    load.showLoading("保存修改内容");
    console.log(filePathList, marketId, disName, userName, phone, address, code);
    
    jjshUserSaveWithFile(filePathList, code, marketId, disName, userName, address, phone, this.data.downloadAllGoods).then((res) => {
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
    console.log("登录页面 _login - environment:", this.data.environment);
    load.showLoading("登录中");
    
    try {
      // 检查是否为企业微信环境
      if (this.data.environment === 'wxwork') {
      console.log("✅ 登录页面 - 企业微信环境，执行企业微信登录");
      wx.qy.login({
        suiteId: 'ww2cddb5d2d7b3ee5d',
        success: (resQy) => {
          if (resQy.code) {
            var disUser = {
              nxDiuCode: resQy.code,
            }
            wxworkLogin(disUser)
              .then(res => {
                load.hideLoading();
                if (res.result && res.result.code === 0
                    && res.result.data && res.result.data.userInfo) {
                  if (this._canLoginBoss(res.result.data.userInfo)) {
                    //缓存用户信息
                    wx.setStorageSync('userInfo', res.result.data.userInfo);
                    wx.setStorageSync('disInfo', res.result.data.disInfo);
                    wx.setStorageSync('loginType', 'wxwork'); // 存储登录类型
                    wx.switchTab({
                      url: '../order/index/index',
                    })
                  } else {
                    wx.showToast({
                      title: '当前账号不能登录 Boss 端',
                      icon: 'none'
                    })
                  }
                } else {
                  if (!this._requireInviteForRegistration()) return;
                  wx.showToast({
                    title: (res.result && res.result.msg) || '企业微信身份未绑定 Boss 账号',
                    icon: 'none'
                  })
                }
              })
              .catch((error) => {
                load.hideLoading();
                wx.showToast({
                  title: describeOwnerRequestError(error, '企业微信登录失败'),
                  icon: 'none'
                })
              })
          }
        },
        fail: (res) => {
          load.hideLoading();
          wx.showToast({
            title: '企业微信登录失败',
            icon: 'none'
          })
        }
      })
    } else {
      console.log("⚠️ 登录页面 - 普通微信环境，执行普通微信登录");
      wx.login({
      success: (res) => {
        var disUser = {
          nxDiuCode: res.code,
        }
        disLogin(disUser)
          .then((res) => {
            load.hideLoading();
            if (res.result && res.result.code === 0
                && res.result.data && res.result.data.userInfo) { // 登陆成功
              if (this._canLoginBoss(res.result.data.userInfo)) {
                wx.setStorageSync('userInfo', res.result.data.userInfo);
                wx.setStorageSync('disInfo', res.result.data.disInfo)
                wx.switchTab({
                  url: '../order/index/index',
                })
              } else {
                wx.showToast({
                  title: '当前账号不能登录 Boss 端',
                  icon: 'none'
                })
              }
            } else { // 登陆失败
              if (!this._requireInviteForRegistration()) return;
              wx.showToast({
                title: (res.result && res.result.msg) || '微信身份未绑定 Boss 账号',
                icon: 'none'
              })
              this._aaa();
            }
          })
          .catch((error) => {
            load.hideLoading();
            wx.showToast({
              title: describeOwnerRequestError(error, 'Boss 端登录失败'),
              icon: 'none',
              duration: 3500
            })
          })
      },
      fail: (res => {
        load.hideLoading();
        wx.showToast({
          title: (res && res.errMsg) || '微信登录失败，请重新操作',
          icon: 'none',
          duration: 3500,
        })
      })
    })
    } // 关闭 else 分支
    } catch (error) {
      console.error("登录过程中发生错误:", error);
      load.hideLoading();
      wx.showToast({
        title: '登录失败，请重试',
        icon: 'none'
      })
    }
  },

  _canLoginBoss(userInfo) {
    var role = Number(userInfo && userInfo.nxDiuAdmin)
    return role === 0 || role === 1
  },


  _register(e) {
    if (!this._requireInviteForRegistration()) return;
    if (this.data.canLogin && this.data.disName && this.data.disName.length > 0) {
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
                nxDistributerName: this.data.disName,
                nxDistributerAddress: this.data.address,
                nxDistributerMarketName: this.data.marketName,
                nxDistributerImg: "uploadImage/r.jpg",
                nxDistributerLan: this.data.latitude,
                nxDistributerLun: this.data.longitude,
                nxDistributerPhone: this.data.phone,
                nxDistributerSysMarketId: this.data.marketId,
                nxDistributerType: this.data.type,
                downloadAllGoods: this.data.downloadAllGoods,
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
    if (!this._requireInviteForRegistration()) return;
    console.log("✅ _registerWork 被调用");
    console.log("当前数据:", {
      canLogin: this.data.canLogin,
      disName: this.data.disName,
      userName: this.data.userName,
      phone: this.data.phone,
      address: this.data.address,
      marketId: this.data.marketId
    });
    
    if (this.data.canLogin && this.data.disName && this.data.disName.length > 0) {
      wx.getUserProfile({
        desc: '用于完善会员资料', // 声明获取用户个人信息后的用途，后续会展示在弹窗中，请谨慎填写
        success: resUser => {
          console.log(resUser)
          wx.qy.login({
            suiteId: 'ww2cddb5d2d7b3ee5d',
            success: (resQy) => {
              console.log("wx.qy.login 成功:", resQy);
              console.log("corpid:", resQy.corpid);
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
                  nxDistributerName: this.data.disName,
                  nxDistributerAddress: this.data.address,
                  nxDistributerMarketName: this.data.marketName,
                  nxDistributerImg: "uploadImage/r.jpg",
                  nxDistributerLan: this.data.latitude,
                  nxDistributerLun: this.data.longitude,
                  nxDistributerPhone: this.data.phone,
                  nxDistributerSysMarketId: this.data.marketId,
                  nxDistributerType: this.data.type,
                  downloadAllGoods: this.data.downloadAllGoods,
                  nxDistributerServiceCityEntities: serviceArr,
                  qyNxDisCorpEntity: {
                    qyNxDisQyCorpId: resQy.corpid || 'ww9778dea409045fe6',  // 企业 ID
                    qyNxDisQyCorpName: '企业名称',  // 企业名称（可以从企业微信 API 获取）
                    qyNxDisSuiteId: 'ww2cddb5d2d7b3ee5d'  // 第三方应用 Suite ID
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
    wx.showLoading({
      title: '企业微信登录中...'
    });
    
    wx.qy.login({
      suiteId: 'ww2cddb5d2d7b3ee5d', 
      success: (resQy) => {
        if(resQy.code){
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
                if (!this._requireInviteForRegistration()) return;
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
        wx.hideLoading();
        wx.showToast({
          title: '企业微信登录失败',
          icon: 'none'
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

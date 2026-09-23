var load = require('../../../../lib/load.js');
import { disLogin, saveBusiness } from '../../../../lib/apiDistributer';
import apiUrl from '../../../../config.js'

Page({
  data: {
    addFinished: false,
    supplierName: '',
    editName: '',
    isInviter: false,
    isInvitee: false,
    pageTitle: '邀请协作配送商',
    inviteTitle: '',
  },

  onLoad: function (options) {
    const globalData = getApp().globalData;
    const disId = options.disId;
    const disName = decodeURIComponent(options.disName || '');
    const inviteType = parseInt(options.inviteType, 10) || 1;
    const now = new Date();
    const inviteTime = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      disId,
      disName,
      inviteType,
      inviteTime,
    });

    this._login();
  },

  _login() {
    const that = this;
    wx.login({
      success(res) {
        if (res.code) {
          const disUser = { nxDiuCode: res.code };
          disLogin(disUser)
            .then(res => {
              if (res.result.code !== -1) {
                const myDisId = res.result.data.disInfo.nxDistributerId;
                const urlDisId = that.data.disId;

                if (String(myDisId) === String(urlDisId)) {
                  // 邀请方：当前用户就是分享链接的人
                  that.setData({
                    userInfo: res.result.data.userInfo,
                    disInfo: res.result.data.disInfo,
                    disId: myDisId,
                    isInviter: true,
                    isInvitee: false,
                    pageTitle: '邀请协作配送商',
                  });
                } else {
                  // 被邀请方：当前用户是打开链接的人
                  that.setData({
                    userInfo: res.result.data.userInfo,
                    disInfo: res.result.data.disInfo,
                    offerDisId: myDisId,
                    isInviter: false,
                    isInvitee: true,
                    pageTitle: '协作配送商邀请',
                    inviteTitle: that.data.disName + ' 邀请您',
                  });
                }
              } else {
                // 登录失败说明不是用户，跳转到邀请注册页，并带上邀请方信息
                const disName = encodeURIComponent(that.data.disName || '');
                wx.navigateTo({
                  url: '../../inviteLogin/inviteLogin?disId=' + that.data.disId + '&disName=' + disName + '&inviteType=' + (that.data.inviteType || 1) + '&fromInviteOfferDis=1',
                });
              }
            });
        }
      },
    });
  },

  toBack() {
    wx.switchTab({
      url: '/pages/order/index/index',
    });
  },

  saveOfferNxDis() {
    const { disId, offerDisId, inviteType } = this.data;
    if (!offerDisId || !disId) {
      wx.showToast({ title: '参数异常', icon: 'none' });
      return;
    }

    const body = {
      nxDistributerId1: parseInt(disId, 10),
      nxDistributerId2: parseInt(offerDisId, 10),
      inviteType: inviteType || 1,
      inviterNxDistributerId: parseInt(disId, 10),
    };

    load.showLoading('保存');
    saveBusiness(body)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          // const pages = getCurrentPages();
          // const prevPage = pages[pages.length - 2];
          // if (prevPage && prevPage.setData) {
          //   prevPage.setData({ update: true });
          // }
          wx.showToast({ title: '协作建立成功' });
          // wx.navigateBack({ delta: 1 });
          wx.switchTab({
            url: '/pages/order/index/index',
          });
        } else {
          wx.showToast({ title: res.result.msg || '操作失败', icon: 'none' });
        }
      })
      
  },
});

var load = require('../../../../lib/load.js');

var app = getApp()
var dateUtils = require('../../../../utils/dateUtil');
import apiUrl from '../../../../config.js'


import {
  deleteDisUser,
  deleteJrdhUser,
  getDisUserInfo,
  updateDisUserAdmin
} from '../../../../lib/apiDistributer'


import {
  
  getDisUsers,

  
} from '../../../../lib/apiDistributer.js'

Page({



  onShow: function () {

    if(this.data.toSharePurchase){
      this.setData({
        isTishi: true
      })
    }
    if(this.data.editUser){
      getDisUserInfo(this.data.userId)
      .then(res =>{
        if(res.result.code == 0){
          wx.setStorageSync('userInfo', res.result.data)
          this._initData()
        }
      })
    }
  },


  /**
   * 页面的初始数据
   */
  data: {
    items: [
      { name: '0', value: '管理员', checked: 'true'},
      { name: '1', value: '拣货员',},
      { name: '2', value: '采购员' },
      { name: '5', value: '司机' },
    ],
    admin: 0,
    showOperation: false,

  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const globalData = app.globalData;

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,     
      rpxRcale: globalData.rpxR,
      url: apiUrl.server,
      disId: options.disId
    })
    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
        userId: userInfo.nxDistributerUserId,
        disInfo: userInfo.nxDistributerEntity
        
      })
    }

    this._initData();
  },


 // 初始化数据
 _initData() {

  getDisUsers(this.data.disId).then(res =>{
    if(res.result.code == 0){
      console.log(res);
      this.setData({
        zeroUserArr: res.result.data.zero,
        oneUserArr: res.result.data.one,
        twoUserArr: res.result.data.two,
        threeUserArr: res.result.data.three,

        editUser: false
      })

       
    }else{
      wx.showToast({
        title: '获取用户失败',
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
    console.log( options);
    return {
      title: "注册管理员", // 默认是小程序的名称(可以写slogan等)
      path: '/subPackage/pages/inviteAdmin/inviteAdmin?disId=' + this.data.userInfo.nxDiuDistributerId + '&admin=' + options.target.dataset.admin + '&disName=' + this.data.disInfo.nxDistributerName,
      imageUrl: '',
    }
  },


changeAdmin(e){
  var item  = e.currentTarget.dataset.item;
  if(item.nxDiuAdmin == 1){
    item.nxDiuAdmin = 0;
  }else{
    item.nxDiuAdmin = 1;
  }

  updateDisUserAdmin(item).then(res =>{
    if(res.result.code == 0){
      this._initData();
    }else{
      wx.showToast({
        title: res.result.msg,
        icon: 'none'
      })
    }
  })
},

openOperation(e){
  this.setData({
    showOperation: true,
    type: e.currentTarget.dataset.type,
    selectUserId: e.currentTarget.dataset.id,
    editUserItem: e.currentTarget.dataset.item,

  })
},



  /**
   * 删除用户
   */
  delUser() {
    load.showLoading("删除用户")
    if(this.data.type == 'dis'){
      deleteDisUser(this.data.selectUserId).then(res => {
        if (res.result.code !== -1) {
          load.hideLoading();
          this._initData();
        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
          })
        }
      })
    }
    if(this.data.type == 'jrdh'){
      deleteJrdhUser(this.data.selectUserId).then(res => {
        if (res.result.code !== -1) {
          load.hideLoading();
          this._initData();
        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
      })
    }
   
  },


 
  editUser(e){
    this.setData({
      editUser: true
    })
    wx.setStorageSync('editUserItem', this.data.editUserItem);
    wx.navigateTo({
      url: '../disUserEdit/disUserEdit',
    })
  },



  /**
   * 关闭蒙版
   */
  hideMask() {
    this.setData({
      showOperation: false,
      
    })
  },
  

  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  },

  



toOpenOrder() {
    
 
  wx.navigateToMiniProgram({
    appId: "wxe7ab0f97ea2c6417",
    path: '/pages/inviteAdmin/inviteAdmin?disId=' + this.data.disId + '&disName=' + this.data.disInfo,
    envVersion: 'trial', //release develop trial
    success(res) {
     
    }
  })
},




})
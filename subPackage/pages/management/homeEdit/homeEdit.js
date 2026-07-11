
var load = require('../../../../lib/load.js');

import apiUrl from '../../../../config.js'
import {
  updateDisInfoWithFile,
  updateDisInfo
} from '../../../../lib/apiDistributer'


Page({

  /**
   * 页面的初始数据
   */
  data: {
    canSave: false,
    imgChanged: false,
    isPlaceholderStoreImg: false,
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

    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      const img = userInfo.nxDistributerEntity.nxDistributerImg || '';
      const isPlaceholderStoreImg = img.indexOf('uploadImage/r.jpg') >= 0;
      this.setData({
        userInfo: userInfo,
        userId: userInfo.nxDistributerUserId,
        disInfo: userInfo.nxDistributerEntity,
        src: apiUrl.server +  userInfo.nxDistributerEntity.nxDistributerImg,
        isPlaceholderStoreImg: isPlaceholderStoreImg
      })
    }
  },

  
  getName(e){
    var name = e.detail.value;
    var data = "disInfo.nxDistributerName"
    this.setData({
     [data] : name,
     canSave: true
    })
  },

  getPhone(e){
    var phone = e.detail.value;
    var data = "disInfo.nxDistributerPhone"
    this.setData({
     [data] : phone,
     canSave: true
    })
  },
  getShowName(e){
    var showName = e.detail.value;
    var data = "disInfo.nxDistributerShowName"
    this.setData({
     [data] : showName,
     canSave: true
    })
  },
  getAddress(e){
    var address = e.detail.value;
    var data = "disInfo.nxDistributerAddress"
    this.setData({
     [data] : address,
     canSave: true

    })
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
          imgChanged: true,
          canSave: true
        })
        var name = _this.data.disInfo.nxDistributerName;
        var address = _this.data.disInfo.nxDistributerAddress;
        var id = _this.data.disInfo.nxDistributerId;
        load.showLoading("保存中");
        updateDisInfoWithFile(res.tempFilePaths, name, address, id).then(res => {
          if(res.result == '{"code":0}'){ 
            load.hideLoading();
            var pages = getCurrentPages();
            var prevPage = pages[pages.length - 2];
            prevPage.setData({ editUser: true });
            wx.navigateBack({ delta: 1 });
          }else{
            load.hideLoading();
            wx.showToast({
              title: '修改失败',
              icon: 'none'
            })
          }   
        })
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
 * 保存修改内容
 */
save() {
  var name = this.data.disInfo.nxDistributerName;
  var address = this.data.disInfo.nxDistributerAddress;
  var id = this.data.disInfo.nxDistributerId;
  //如果修改了图片
  if (this.data.imgChanged) {
    var filePathList = this.data.src;
    
    load.showLoading("保存修改内容")
    updateDisInfoWithFile(filePathList, name, address, id).then(res => {
      if(res.result == '{"code":0}'){ 
        load.hideLoading();
       
        wx.navigateBack({
          delta: 1
        })
      }else{
        wx.showToast({
          title: '修改失败',
          icon: 'none'
        })
      }   
    })
  } else {
    //没有修改图片
    // var userName = this.data.userName;
    // var userId = this.data.userInfo.nxDistributerUserId;
   
    load.showLoading("保存修改内容");
    updateDisInfo(this.data.disInfo).then(res => {
      if (res.result.code == 0) {
      load.hideLoading();
      wx.navigateBack({
        delta: 1
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
  var pages = getCurrentPages();
  var prevPage = pages[pages.length - 2]; //上一个页面
  //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
  prevPage.setData({
    editUser: true
  })
},


chooseLocation: function() {
  const that = this;
  const disInfo = that.data.disInfo || {};
  const lan = disInfo.nxDistributerLan;
  const lun = disInfo.nxDistributerLun;
  const params = {};
  if (lan !== null && lan !== undefined && lan !== '' && lun !== null && lun !== undefined && lun !== '') {
    params.latitude = Number(lan);
    params.longitude = Number(lun);
  }
  wx.chooseLocation({
    ...params,
    success: function(res) {
        console.log(res);
        var disInfo = that.data.disInfo;
        disInfo.nxDistributerLan = res.latitude;
        disInfo.nxDistributerLun = res.longitude;
        disInfo.orderPayList = null;
        disInfo.sysBusinessTypeEntity = null;
      updateDisInfo(disInfo).then(res =>{
        if(res.result.code == 0){
          that.setData({
            disInfo: disInfo
          })
        }
      })
    },
    fail: function(err) {
      if (err.errMsg === 'chooseLocation:fail auth deny') {
        wx.showModal({
          title: '提示',
          content: '需要获取您的地理位置，请前往设置打开权限',
          showCancel: false,
          success(res) {
            if (res.confirm) {
              wx.openSetting();
            }
          }
        });
      } else {
        console.error('调用失败：', err);
      }
    }
  });
},



  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  },


  















})
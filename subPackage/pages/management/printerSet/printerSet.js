
var load = require('../../../../lib/load.js');

import apiUrl from '../../../../config.js'
import {
  updatePassword,
  disGetWebUser
} from '../../../../lib/apiDistributer'


Page({

  /**
   * 页面的初始数据
   */
  data: {
    confirmPassword: "",
    password: "",
    printOk: false,
    paperSize: 1, // 默认小尺寸：4*3cm
    disInfo: null
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

  

    // 检查打印机连接状态
    this.checkPrinterStatus();
    
    // 读取缓存的标签尺寸
    var cachedPaperSize = wx.getStorageSync('paperSize');
    if (cachedPaperSize) {
      this.setData({
        paperSize: cachedPaperSize
      });
    }
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    // 每次显示页面时检查打印机状态
    this.checkPrinterStatus();
    
    // 更新分销商信息（可能在其他页面被修改）
    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.nxDistributerEntity) {
      this.setData({
        disInfo: userInfo.nxDistributerEntity
      });
    }
  },

  toPrint(){

    console.log("toPrint")
    wx.navigateTo({
      url: '/subPackage-charts/pages/order/pSearchPrinter/pSearchPrinter',
    })
  },

  
  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  },

  // 检查打印机连接状态
  checkPrinterStatus() {
    var app = getApp();
    var cachedDeviceInfo = wx.getStorageSync('bleDeviceInfo');
    
    if (cachedDeviceInfo && cachedDeviceInfo.deviceId && cachedDeviceInfo.isConnected) {
      this.setData({
        printOk: true
      });
    } else {
      this.setData({
        printOk: false
      });
    }
  },

  // 设置打印机开关
  setPrint() {
    // 跳转到标签打印机连接页面
    wx.navigateTo({
      url: '../labelPrinter/labelPrinter',
    });
  },

  // 设置标签尺寸
  setPaperSize() {
    var that = this;
    wx.showActionSheet({
      itemList: ['4*3cm（横）', '4*6cm（竖）', '5*8cm（竖）'],
      success: function(res) {
        var selectedSize = res.tapIndex + 1; // 0,1,2 转为 1,2,3
        that.setData({
          paperSize: selectedSize
        });
        wx.setStorageSync('paperSize', selectedSize);
        wx.showToast({
          title: '标签尺寸已设置',
          icon: 'success'
        });
      }
    });
  },

  















})
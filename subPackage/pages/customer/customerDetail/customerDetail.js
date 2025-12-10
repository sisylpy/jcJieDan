import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil.js');

let windowWidth = 0;
let itemWidth = 0;

import {
  
  updateDepGoodsSellingPrice,
  deleteDepGoods,
  getDepUsersByFatherId,
  disGetDepGoods,
  getDepInfo,
  deleteGroupDep,
  delHisotory,
  deleteDepUser,

  updateDepUserAdmin,
  updateGroupName

}
from '../../../../lib/apiDistributer'



Page({

  

  onShow() {
    const app = getApp();
    const globalData = app.globalData;
    
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
    })

    if(this.data.update){
      this._getDepInfo();
    }
    
  },


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    var value = wx.getStorageSync('userInfo');
    if (value) {
      this.setData({
        disId: value.nxDistributerEntity.nxDistributerId,
        userInfo: value,
      })
      var depInfoValue = wx.getStorageSync('depInfo');

      if (depInfoValue.nxDepartmentSubAmount > 0) {
        this.setData({
          subArr: depInfoValue.nxDepartmentEntities,
        })
      } else {
        //没有下级部门
        // 如果是群用户登陆
        this.setData({
          depId: depInfoValue.nxDepartmentId,
          depFatherId: depInfoValue.nxDepartmentFatherId,
          groupName: depInfoValue.nxDepartmentName,
          depType: depInfoValue.nxDepartmentType
        })
        wx.setStorageSync('depFatherId', depInfoValue.nxDepartmentFatherId)
        wx.setStorageSync('depInfo', depInfoValue);
      }
      this.setData({
        depInfo: depInfoValue,
        depFatherId: depInfoValue.nxDepartmentId,
        settleType: depInfoValue.nxDepartmentSettleType,
        editDepName: depInfoValue.nxDepartmentName,
        editDepAttrName: depInfoValue.nxDepartmentAttrName,
        editDepOrderCode: depInfoValue.nxDepartmentOrderCode,
        editPickName:  depInfoValue.nxDepartmentPickName,
        editRecord : depInfoValue.nxDepartmentRecordMinutes,
        // 初始化配送设置相关数据
        earliestDeliveryTime: depInfoValue.nxDepartmentEarliestDeliveryTime || '',
        latestDeliveryTime: depInfoValue.nxDepartmentLatestDeliveryTime || '',
        deliveryNotes: depInfoValue.nxDepartmentDeliveryNotes || '',
        deliveryAddress: depInfoValue.nxDepartmentAddress || '',
        priorityIndex: depInfoValue.nxDepartmentDeliveryPriority || 2,
        allowEarlyDelivery: depInfoValue.nxDepartmentAllowEarlyDelivery !== 0,
        selectedLatitude: depInfoValue.nxDepartmentLat || '',
        selectedLongitude: depInfoValue.nxDepartmentLng || '',
        unloadDuration: depInfoValue.nxDepartmentUnloadDuration || 30, // 默认30分钟卸货时间
        // 格式化时间显示
        formattedEarliestTime: this.formatSecondsToTime(depInfoValue.nxDepartmentEarliestDeliveryTime) || '',
        formattedLatestTime: this.formatSecondsToTime(depInfoValue.nxDepartmentLatestDeliveryTime) || '',
      })
    }

    var disInfo = wx.getStorageSync('disInfo');
 if(disInfo){
   this.setData({
     disInfo: disInfo
   })
 }

   

   

  },

 

  /**
   * 计算偏移量
   */
  clueOffset() {
    var that = this;
    wx.getSystemInfo({
      success: function (res) {
        itemWidth = Math.ceil(res.windowWidth / that.data.tabs.length);
        let tempArr = [];
        for (let i in that.data.tabs) {
          console.log(i)
          tempArr.push(itemWidth * i);
        }
        // tab 样式初始化
        windowWidth = res.windowWidth;
        that.setData({
          sliderLeft: (res.windowWidth / that.data.tabs.length - 50) / 2,
          sliderOffsets: tempArr,
          sliderOffset: 0,
          sliderLeft: 0,
        });
      }
    });
  },


  editGroupInfo(e) {
    this.setData({
      showOperation: true,
      editArrShow: true,
    })
  },


  closeEditGroupInfo() {
    this.setData({
      editArrShow: false,
      showOperation: false
    })
  },


  getDepName(e) {
    var depInfoDepName = "depInfo.nxDepartmentName";
    this.setData({
      editDepName: e.detail.value,
      [depInfoDepName]: e.detail.value
    })
  },

  getDepAttrName(e) {
    var depInfoDepAttrName = "depInfo.nxDepartmentAttrName";
    this.setData({
      editDepAttrName: e.detail.value,
      [depInfoDepAttrName]: e.detail.value
    })
  },

  getDepOrderCode(e) {
    var depInfoDepOrderCode = "depInfo.nxDepartmentOrderCode";
    this.setData({
      editDepOrderCode: e.detail.value,
      [depInfoDepOrderCode]: e.detail.value
    })
  },
  getDepPickName(e) {
    var depInfoDepPickName = "depInfo.nxDepartmentPickName";
    this.setData({
      editDepPickName: e.detail.value,
      [depInfoDepPickName]: e.detail.value
    })
  },

  getDepRecord(e) {
    var depInfoDepPickName = "depInfo.nxDepartmentRecordMinutes";
    this.setData({
      editRecord: e.detail.value,
      [depInfoDepPickName]: e.detail.value
    })
  },
  radioChange(e){
    console.log(e);
    var depData = "depInfo.nxDepartmentSettleType"
    this.setData({
      [depData] : e.detail.value
    })
    
  },

  radioChangeFixed(e){
    console.log(e);
    var value = e.detail.value;
    var depData = "depInfo.nxDepartmentType";
    if(value == 0){
      this.setData({
        [depData] : "unFixed"
      })
    }
    if(value == 1){
      this.setData({
        [depData] : "fixed"
      })
    }
  },

  radioChangePrint(e){
    var value = e.detail.value;
    var depData = "depInfo.nxDepartmentPrintName";
    if(value == 0){
      this.setData({
        [depData] : "ApplyPanel"
      })
    }
    if(value == 1){
      this.setData({
        [depData] : "ApplyFiftyPanel"
      })
    }
    if(value == 2){
      this.setData({
        [depData] : "ApplyHalfWholePanel"
      })
    }
    if(value == 3){
      this.setData({
        [depData] : "ApplyHalfPanel"
      })
    }
    if(value == 4){
      this.setData({
        [depData] : "BlueToothPrint"
      })
    }
    if(value == 5){
      this.setData({
        [depData] : "feiEPrint"
      })
    } if(value == 6){
      this.setData({
        [depData] : "ApplyThirtyPanel"
      })
    }
    if(value == 7){
      this.setData({
        [depData] : "ApplyThirtyWholePanel"
      })
    }
  },

  updateDepInfo() {
      updateGroupName(this.data.depInfo).then(res => {
        if (res.result.code == 0) {
          wx.showToast({
            title: '修改成功',
          })
          this.setData({
            editArrShow: false,
            showOperation: false,
          }) 
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
      })  
  },


  toDepGoods(){
    wx.navigateTo({
      url: '../customerGoods/customerGoods',
    })
  },

  toCustomerUser(){
    wx.navigateTo({
      url: '../customerUsers/customerUsers',
    })
  },
  
  toOpenOrder() {
    
    console.log("depId=" + this.data.depFatherId + '&disId=' + this.data.disId + '&subAmount=' + this.data.depInfo.nxDepartmentSubAmount + '&depName=' + this.data.depInfo.nxDepartmentAttrName +'&disName=' + this.data.userInfo.nxDistributerEntity.nxDistributerName + '&from=0');

    var appId = this.data.depInfo.nxDepartmentAppId;
    wx.navigateToMiniProgram({
      appId: appId,
      path: '/pages/inviteAndOrder/inviteAndOrder?depId=' + this.data.depFatherId + '&disId=' + this.data.disId + '&subAmount=' + this.data.depInfo.nxDepartmentSubAmount + '&depName=' + this.data.depInfo.nxDepartmentAttrName +'&disName=' + this.data.userInfo.nxDistributerEntity.nxDistributerName + '&from=0',
      envVersion: 'trial', //release develop trial
      success(res) {
        // that.setData({
        //   toOpenMini: false
        // })
      }
    })
  },
  
  trunasferDep(){
    
    if(this.data.depInfo.nxDepartmentEntities.length > 0){
      this.setData({
        showChoice: true,
      })
    }else{
      var depName = this.data.depInfo.nxDepartmentName;
      wx.navigateTo({
        url: '../choiceDep/choiceDep?depName=' + depName,
      })
    }
   


  },

  selectDepartment(e) {
    this.setData({
      showChoice: false,
    })
    console.log(e.currentTarget.dataset.item);
    var dep = e.currentTarget.dataset.item;
    wx.setStorageSync('depInfo', dep);
    var depName = this.data.depInfo.nxDepartmentName + "." +  dep.nxDepartmentName
    wx.navigateTo({
      url: '../choiceDep/choiceDep?depName=' + depName,
    })
  },


  changeAppId(){
    var disAppId = this.data.disInfo.nxDistributerAppId;
    if(disAppId == 'wx159c5a46d80e4500'){
      wx.showToast({
        title: '没有定制App',
        icon: 'none'
      })
      var dep = this.data.depInfo;
      var depAppIdData = "depInfo.nxDepartmentAppId";
      this.setData({
        [depAppIdData]: "wx159c5a46d80e4500" ,
      })

    }else{
      var dep = this.data.depInfo;
      var depAppId = this.data.depInfo.nxDepartmentAppId;
      if(depAppId !== disAppId){
      
        dep.nxDepartmentAppId = disAppId;
      }else{
        dep.nxDepartmentAppId = "wx159c5a46d80e4500";
      }
      this.setData({
        depInfo: dep,
      })
    }
    
  },

  switchChange(e) {
    console.log(e)
    var index = e.currentTarget.dataset.index;
    var user = this.data.userArr[index];
    var admin = this.data.userArr[index].nxDuAdmin;
    if (admin == 0) {
      user.nxDuAdmin = 1;
    } else {
      user.nxDuAdmin = 0;
    }
    updateDepUserAdmin(user)
      .then(res => {
        if (res.result.code == 0) {
          this._getGroupUsers();
        }
      })
  },


  deleteDep(){
    var that = this;
    wx.showModal({
      title: "删除后数据不可恢复",
      content: "此操作将删除客户的全部记录.",
      confirmText: "确定删除",
      success: function (res) {
        if (res.cancel) {
          //点击取消           
        } else if (res.confirm) {
           that._delDep();

        }
      }
    })
  },

  _delDep(){
    load.showLoading("删除客户")
    deleteGroupDep(this.data.depInfo).then(res =>{
      if(res.result.code == 0){
        load.hideLoading();
        wx.navigateBack({
          delta: 2,
        })
      }else{
        wx.showToast({
          title: res.result.msg,
        })
      }
    })
  },



 //

 toMap1(){
    wx.navigateTo({
      url: '../deliveryAddress/deliveryAddress',
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
      // _this._canLogin()

    },
  })
},



  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },





  selDepartment(e){
    var item = e.currentTarget.dataset.depgoods;
     var disGoods = e.currentTarget.dataset.goods;
    this.setData({
      depGoodsId: item.nxDepartmentDisGoodsId,
      showOperationPrice: true,
      disGoods: disGoods,
      sellingPrice: item.nxDdgOrderPrice,
    })
  },

  inputSellingPrice(e){
    console.log(e.detail.value)
    this.setData({
      sellingPrice: e.detail.value,
    })

  },

  _updateDepGoods(){
    var data = {
      depGoodsId: this.data.depGoodsId,
      sellingPrice: this.data.sellingPrice
    }
    updateDepGoodsSellingPrice(data).then(res =>{
      if(res.result.code == 0){
        this.setData({
          showOperationPrice: false,
          depGoodsId: "",
          sellingPrice: ""
        })
        this._getResGoodsWithOrders();
        this._openIndex();

      }
    })

  },


  showSubDeps(){
    wx.setStorageSync('depInfo', this.data.depInfo);
    wx.navigateTo({
      url: '../editCustomer/editCustomer',
    })
  },

  onUnload(){
    // wx.removeStorageSync('depInfo');
  },

  // 配送设置相关方法
  
  // 显示配送设置弹窗
  showLocationTimeModal() {
    const depInfo = this.data.depInfo;
    
    // 如果有已保存的时间数据，转换为时间选择器格式
    let earliestTime = '';
    let latestTime = '';
    
    if (depInfo.nxDepartmentEarliestDeliveryTime) {
      // 如果是数字格式（秒数），转换为时间选择器格式
      if (typeof depInfo.nxDepartmentEarliestDeliveryTime === 'number') {
        earliestTime = this.formatSecondsToTime(depInfo.nxDepartmentEarliestDeliveryTime);
      } else if (typeof depInfo.nxDepartmentEarliestDeliveryTime === 'string') {
        earliestTime = depInfo.nxDepartmentEarliestDeliveryTime;
      }
    }
    
    if (depInfo.nxDepartmentLatestDeliveryTime) {
      // 如果是数字格式（秒数），转换为时间选择器格式
      if (typeof depInfo.nxDepartmentLatestDeliveryTime === 'number') {
        latestTime = this.formatSecondsToTime(depInfo.nxDepartmentLatestDeliveryTime);
      } else if (typeof depInfo.nxDepartmentLatestDeliveryTime === 'string') {
        latestTime = depInfo.nxDepartmentLatestDeliveryTime;
      }
    }
    
    this.setData({
      showLocationTimeModal: true,
      earliestDeliveryTime: earliestTime,
      latestDeliveryTime: latestTime
    });
    // 初始化保存按钮状态
    this.updateSaveButtonState();
  },

  // 隐藏配送设置弹窗
  hideLocationTimeModal() {
    this.setData({
      showLocationTimeModal: false
    });
  },

  // 选择地理位置
  chooseLocation() {
    const that = this;
    wx.chooseLocation({
      success: function (res) {
        console.log('选择位置成功', res);
        that.setData({
          selectedLatitude: res.latitude,
          selectedLongitude: res.longitude,
          'depInfo.nxDepartmentLat': res.latitude.toString(),
          'depInfo.nxDepartmentLng': res.longitude.toString(),
          // 自动设置地址信息
          'depInfo.nxDepartmentAddress': res.address || res.name || '',
          deliveryAddress: res.address || res.name || ''
        });
        wx.showToast({
          title: '位置和地址设置成功',
          icon: 'success'
        });
        // 更新保存按钮状态
        that.updateSaveButtonState();
      },
      fail: function (err) {
        console.log('选择位置失败', err);
        if (err.errMsg.indexOf('auth deny') !== -1) {
          wx.showModal({
            title: '提示',
            content: '需要获取您的地理位置，请在设置中开启定位权限',
            showCancel: false
          });
        }
      }
    });
  },

  // 最早配送时间选择
  onEarliestTimeChange(e) {
    const time = e.detail.value;
    this.setData({
      earliestDeliveryTime: time,
      'depInfo.nxDepartmentEarliestDeliveryTime': time
    });
    // 更新保存按钮状态
    this.updateSaveButtonState();
  },

  // 最晚配送时间选择
  onLatestTimeChange(e) {
    const time = e.detail.value;
    this.setData({
      latestDeliveryTime: time,
      'depInfo.nxDepartmentLatestDeliveryTime': time
    });
    // 更新保存按钮状态
    this.updateSaveButtonState();
  },

  // 配送备注输入
  onDeliveryNotesInput(e) {
    const notes = e.detail.value;
    this.setData({
      deliveryNotes: notes,
      'depInfo.nxDepartmentDeliveryNotes': notes
    });
  },

  // 详细地址输入
  onDeliveryAddressInput(e) {
    const address = e.detail.value;
    this.setData({
      deliveryAddress: address,
      'depInfo.nxDepartmentAddress': address
    });
  },

  // 配送优先级选择
  onPriorityChange(e) {
    const index = e.detail.value;
    this.setData({
      priorityIndex: index,
      'depInfo.nxDepartmentDeliveryPriority': parseInt(index) + 1
    });
  },

  // 是否允许提前配送
  onEarlyDeliveryChange(e) {
    const allow = e.detail.value;
    this.setData({
      allowEarlyDelivery: allow,
      'depInfo.nxDepartmentAllowEarlyDelivery': allow ? 1 : 0
    });
  },

  // 卸货时间输入处理
  onUnloadDurationInput(e) {
    const value = parseInt(e.detail.value) || 0;
    this.setData({
      unloadDuration: value,
      'depInfo.nxDepartmentUnloadDuration': value
    });
    this.updateSaveButtonState();
  },

  // 更新配送设置信息
  updateLocationTimeInfo() {
    const depInfo = this.data.depInfo;
    
    // 验证必填项
    if (!depInfo.nxDepartmentEarliestDeliveryTime || !depInfo.nxDepartmentLatestDeliveryTime) {
      wx.showToast({
        title: '请设置配送时间',
        icon: 'none'
      });
      return;
    }
    
    // 验证地理位置
    if (!depInfo.nxDepartmentLat || !depInfo.nxDepartmentLng) {
      wx.showToast({
        title: '请设置地理位置',
        icon: 'none'
      });
      return;
    }
    
    // 验证时间设置
    const earliest = depInfo.nxDepartmentEarliestDeliveryTime;
    const latest = depInfo.nxDepartmentLatestDeliveryTime;
    
    if (earliest >= latest) {
      wx.showToast({
        title: '最晚时间不能早于最早时间',
        icon: 'none'
      });
      return;
    }

    // 显示加载提示
    wx.showLoading({
      title: '保存中...',
      mask: true
    });

    // 处理时间格式，转换为后端期望的格式
    const processedDepInfo = { ...depInfo };
    
    // 添加卸货时间
    processedDepInfo.nxDepartmentUnloadDuration = this.data.unloadDuration || 30;
    
    // 转换为秒数格式（推荐用于路线计算）
    if (processedDepInfo.nxDepartmentEarliestDeliveryTime) {
      const earliestTime = processedDepInfo.nxDepartmentEarliestDeliveryTime;
      
      // 检查是否是字符串格式（HH:mm）
      if (typeof earliestTime === 'string' && earliestTime.includes(':')) {
        const [hours, minutes] = earliestTime.split(':');
        processedDepInfo.nxDepartmentEarliestDeliveryTime = parseInt(hours) * 3600 + parseInt(minutes) * 60;
      }
      // 如果已经是数字（秒数），则不需要转换
      else if (typeof earliestTime === 'number') {
        // 已经是秒数格式，不需要转换
      }
      // 其他情况，尝试转换为秒数
      else {
        console.warn('未知的时间格式:', earliestTime);
      }
    }
    
    if (processedDepInfo.nxDepartmentLatestDeliveryTime) {
      const latestTime = processedDepInfo.nxDepartmentLatestDeliveryTime;
      
      // 检查是否是字符串格式（HH:mm）
      if (typeof latestTime === 'string' && latestTime.includes(':')) {
        const [hours, minutes] = latestTime.split(':');
        processedDepInfo.nxDepartmentLatestDeliveryTime = parseInt(hours) * 3600 + parseInt(minutes) * 60;
      }
      // 如果已经是数字（秒数），则不需要转换
      else if (typeof latestTime === 'number') {
        // 已经是秒数格式，不需要转换
      }
      // 其他情况，尝试转换为秒数
      else {
        console.warn('未知的时间格式:', latestTime);
      }
    }

    // 调试：打印发送的数据
    console.log('发送到后端的数据:', processedDepInfo);
    console.log('配送时间字段:', {
      earliest: processedDepInfo.nxDepartmentEarliestDeliveryTime,
      latest: processedDepInfo.nxDepartmentLatestDeliveryTime
    });
    console.log("ifo", processedDepInfo)
    // 调用API更新信息
    updateGroupName(processedDepInfo).then(res => {
      wx.hideLoading();
      
      if (res.result.code == 0) {
        wx.showToast({
          title: '配送设置更新成功',
          icon: 'success',
          duration: 2000
        });
        
        // 关闭弹窗
        this.setData({
          showLocationTimeModal: false
        });
        
        // 更新本地存储（保持原始格式）
        wx.setStorageSync('depInfo', depInfo);
        
        // 刷新页面数据
        this._getDepInfo();
        // 更新格式化时间显示
        this.updateFormattedTimeDisplay();
      } else {
        wx.showToast({
          title: res.result.msg || '更新失败',
          icon: 'none',
          duration: 2000
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('更新配送设置失败', err);
      wx.showToast({
        title: '网络错误，请重试',
        icon: 'none',
        duration: 2000
      });
    });
  },

  // 配送路线计算工具方法
  
  // 将秒数转换为可读时间格式
  formatSecondsToTime(seconds) {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  },

  // 将时间格式转换为秒数
  formatTimeToSeconds(timeStr) {
    if (!timeStr) return null;
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 3600 + minutes * 60;
  },

  // 检查当前时间是否在配送时间窗口内
  isInDeliveryTimeWindow(earliestSeconds, latestSeconds, currentTimeSeconds = null) {
    if (!earliestSeconds || !latestSeconds) return false;
    
    if (!currentTimeSeconds) {
      const now = new Date();
      currentTimeSeconds = now.getHours() * 3600 + now.getMinutes() * 60;
    }
    
    return currentTimeSeconds >= earliestSeconds && currentTimeSeconds <= latestSeconds;
  },

  // 计算配送时间窗口大小（秒）
  getDeliveryTimeWindow(earliestSeconds, latestSeconds) {
    if (!earliestSeconds || !latestSeconds) return 0;
    return latestSeconds - earliestSeconds;
  },

  // 获取当前时间的秒数
  getCurrentTimeSeconds() {
    const now = new Date();
    return now.getHours() * 3600 + now.getMinutes() * 60;
  },

  // 显示配送地址信息
  showDeliveryAddressInfo() {
    const depInfo = this.data.depInfo;
    const address = depInfo.nxDepartmentAddress;
    const lat = depInfo.nxDepartmentLat;
    const lng = depInfo.nxDepartmentLng;
    
    if (!address) {
      wx.showToast({
        title: '请先设置配送地址',
        icon: 'none'
      });
      return;
    }

    let content = `详细地址: ${address}`;
    if (lat && lng) {
      content += `\n\n坐标信息:\n纬度: ${lat}\n经度: ${lng}`;
    }
    
    wx.showModal({
      title: '配送地址信息',
      content: content,
      showCancel: false
    });
  },

  // 显示配送时间信息
  showDeliveryTimeInfo() {
    const depInfo = this.data.depInfo;
    const earliest = depInfo.nxDepartmentEarliestDeliveryTime;
    const latest = depInfo.nxDepartmentLatestDeliveryTime;
    
    if (!earliest || !latest) {
      wx.showToast({
        title: '请先设置配送时间',
        icon: 'none'
      });
      return;
    }

    const earliestTime = this.formatSecondsToTime(earliest);
    const latestTime = this.formatSecondsToTime(latest);
    const timeWindow = this.getDeliveryTimeWindow(earliest, latest);
    const timeWindowHours = Math.floor(timeWindow / 3600);
    const timeWindowMinutes = Math.floor((timeWindow % 3600) / 60);
    
    const currentTime = this.getCurrentTimeSeconds();
    const isInWindow = this.isInDeliveryTimeWindow(earliest, latest, currentTime);
    
    wx.showModal({
      title: '配送时间信息',
      content: `最早时间: ${earliestTime}\n最晚时间: ${latestTime}\n时间窗口: ${timeWindowHours}小时${timeWindowMinutes}分钟\n当前状态: ${isInWindow ? '在配送时间窗口内' : '不在配送时间窗口内'}`,
      showCancel: false
    });
  },

  // 检查配送设置是否完整
  checkDeliverySettingsComplete() {
    const depInfo = this.data.depInfo;
    const hasLocation = depInfo.nxDepartmentLat && depInfo.nxDepartmentLng;
    const hasTime = depInfo.nxDepartmentEarliestDeliveryTime && depInfo.nxDepartmentLatestDeliveryTime;
    
    return {
      hasLocation,
      hasTime,
      isComplete: hasLocation && hasTime
    };
  },

  // 更新保存按钮状态
  updateSaveButtonState() {
    const status = this.checkDeliverySettingsComplete();
    this.setData({
      canSave: status.isComplete
    });
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空方法，用于阻止事件冒泡
  },

  // 更新格式化时间显示
  updateFormattedTimeDisplay() {
    const depInfo = this.data.depInfo;
    this.setData({
      formattedEarliestTime: this.formatSecondsToTime(depInfo.nxDepartmentEarliestDeliveryTime) || '',
      formattedLatestTime: this.formatSecondsToTime(depInfo.nxDepartmentLatestDeliveryTime) || ''
    });
  },

  // 获取客户信息
  _getDepInfo() {
    getDepInfo(this.data.depFatherId).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        this.setData({
          depInfo: res.result.data,
        });
        // 更新格式化时间显示
        this.updateFormattedTimeDisplay();
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        });
      }
    });
  }




})
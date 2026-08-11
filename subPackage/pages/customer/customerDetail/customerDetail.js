import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil.js');

let windowWidth = 0;
let itemWidth = 0;

import {
  
  updateDepGoodsSellingPrice,
  getDepInfo,
  deleteGroupDep,

  updateDepUserAdmin,
  updateGroupName,
  updateDeliverySettings,

  // 标签相关API
  disGetLabelData,
  disSyncDepartmentLabels,
  deleteDepartmentLabel,
  saveLabel,
  updateLabel,
  deleteLabel,
  disGetLabels
}
from '../../../../lib/apiDistributer'



Page({

  data: {
    showLocationTimeModal: false,
    canSave: false,
    savingDeliverySettings: false,
    isChoosingLocation: false,
    priorityOptions: ['最低', '较低', '普通', '较高', '最高'],
    priorityIndex: 2,
    allowEarlyDelivery: true
  },

  onShow() {
    const app = getApp();
    const globalData = app.globalData;

    console.log('[customerDetail][delivery][onShow]', {
      depId: this.data.depFatherId,
      showLocationTimeModal: !!this.data.showLocationTimeModal,
      isChoosingLocation: !!this.data.isChoosingLocation,
      selectedLatitude: this.data.selectedLatitude || '',
      selectedLongitude: this.data.selectedLongitude || ''
    });
    
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
    })

    // 从地图选择器返回时 onShow 会再次触发。此时不能用服务端旧数据覆盖尚未保存的坐标。
    if (this.data.showLocationTimeModal || this.data.isChoosingLocation) {
      console.log('[customerDetail][delivery][onShow] skip getDepInfo: delivery form is editing');
      return;
    }

    this._getDepInfo('onShow');
    
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
        earliestDeliveryTime: this.normalizeDeliveryTime(depInfoValue.nxDepartmentEarliestDeliveryTime),
        latestDeliveryTime: this.normalizeDeliveryTime(depInfoValue.nxDepartmentLatestDeliveryTime),
        deliveryNotes: depInfoValue.nxDepartmentDispatchRemark || '',
        deliveryAddress: depInfoValue.nxDepartmentAddress || '',
        priorityIndex: this.getDeliveryPriorityIndex(depInfoValue.nxDepartmentDispatchPriorityWeight),
        allowEarlyDelivery: depInfoValue.nxDepartmentAllowEarlyDelivery !== 0,
        selectedLatitude: depInfoValue.nxDepartmentLat || '',
        selectedLongitude: depInfoValue.nxDepartmentLng || '',
        unloadDuration: depInfoValue.nxDepartmentUnloadDuration || 30, // 默认30分钟卸货时间
        // 格式化时间显示
        formattedEarliestTime: this.normalizeDeliveryTime(depInfoValue.nxDepartmentEarliestDeliveryTime),
        formattedLatestTime: this.normalizeDeliveryTime(depInfoValue.nxDepartmentLatestDeliveryTime),
      })

      }

    var disInfo = wx.getStorageSync('disInfo');
 if(disInfo){
   this.setData({
     disInfo: disInfo
   })
 }

   

   

  },

  onHide() {
    console.log('[customerDetail][delivery][onHide]', {
      showLocationTimeModal: !!this.data.showLocationTimeModal,
      isChoosingLocation: !!this.data.isChoosingLocation
    });
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

  normalizeDeliveryTime(value) {
    if (value === null || value === undefined || value === '') return '';

    if (typeof value === 'string' && /^\d{1,2}:\d{2}$/.test(value)) {
      const parts = value.split(':');
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      }
      return '';
    }

    const seconds = Number(value);
    if (!isNaN(seconds) && seconds >= 0 && seconds < 24 * 3600) {
      return this.formatSecondsToTime(seconds);
    }
    return '';
  },

  getDeliveryPriorityIndex(value) {
    const priority = parseInt(value, 10);
    return priority >= 1 && priority <= 5 ? priority - 1 : 2;
  },

  isValidDeliveryLocation(latitude, longitude) {
    if (latitude === '' || latitude === null || latitude === undefined ||
        longitude === '' || longitude === null || longitude === undefined) {
      return false;
    }
    const lat = Number(latitude);
    const lng = Number(longitude);
    return !isNaN(lat) && !isNaN(lng) &&
      lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  },

  // 显示配送设置弹窗
  showLocationTimeModal() {
    const depInfo = this.data.depInfo || {};

    console.log('[customerDetail][delivery][modal] open', {
      depId: depInfo.nxDepartmentId,
      latitude: depInfo.nxDepartmentLat || '',
      longitude: depInfo.nxDepartmentLng || ''
    });

    this.setData({
      showLocationTimeModal: true,
      selectedLatitude: depInfo.nxDepartmentLat || '',
      selectedLongitude: depInfo.nxDepartmentLng || '',
      deliveryAddress: depInfo.nxDepartmentAddress || '',
      earliestDeliveryTime: this.normalizeDeliveryTime(depInfo.nxDepartmentEarliestDeliveryTime),
      latestDeliveryTime: this.normalizeDeliveryTime(depInfo.nxDepartmentLatestDeliveryTime),
      unloadDuration: depInfo.nxDepartmentUnloadDuration || 30,
      deliveryNotes: depInfo.nxDepartmentDispatchRemark || '',
      priorityIndex: this.getDeliveryPriorityIndex(depInfo.nxDepartmentDispatchPriorityWeight),
      allowEarlyDelivery: depInfo.nxDepartmentAllowEarlyDelivery !== 0
    }, () => {
      this.updateSaveButtonState();
      console.log('[customerDetail][delivery][modal] form initialized', {
        selectedLatitude: this.data.selectedLatitude || '',
        selectedLongitude: this.data.selectedLongitude || '',
        canSave: !!this.data.canSave
      });
    });
  },

  // 隐藏配送设置弹窗
  hideLocationTimeModal() {
    console.log('[customerDetail][delivery][modal] cancel', {
      formLatitude: this.data.selectedLatitude || '',
      formLongitude: this.data.selectedLongitude || '',
      savedLatitude: this.data.depInfo && this.data.depInfo.nxDepartmentLat || '',
      savedLongitude: this.data.depInfo && this.data.depInfo.nxDepartmentLng || ''
    });
    this.setData({
      showLocationTimeModal: false,
      isChoosingLocation: false
    });
  },

  // 选择地理位置
  chooseLocation() {
    console.log('[customerDetail][delivery][chooseLocation] open map', {
      currentLatitude: this.data.selectedLatitude || '',
      currentLongitude: this.data.selectedLongitude || ''
    });
    this.setData({ isChoosingLocation: true });

    wx.chooseLocation({
      success: (res) => {
        console.log('[customerDetail][delivery][chooseLocation] map success', {
          latitude: res.latitude,
          longitude: res.longitude,
          hasAddress: !!(res.address || res.name)
        });

        if (!this.isValidDeliveryLocation(res.latitude, res.longitude)) {
          this.setData({ isChoosingLocation: false });
          console.warn('[customerDetail][delivery][chooseLocation] invalid coordinate', {
            latitude: res.latitude,
            longitude: res.longitude
          });
          wx.showToast({
            title: '位置坐标无效，请重新选择',
            icon: 'none'
          });
          return;
        }

        const latitude = String(res.latitude);
        const longitude = String(res.longitude);
        const address = (res.address || res.name || '').trim();
        this.setData({
          isChoosingLocation: false,
          selectedLatitude: latitude,
          selectedLongitude: longitude,
          deliveryAddress: address
        }, () => {
          this.updateSaveButtonState();
          console.log('[customerDetail][delivery][chooseLocation] form updated', {
            selectedLatitude: this.data.selectedLatitude || '',
            selectedLongitude: this.data.selectedLongitude || '',
            canSave: !!this.data.canSave
          });
        });
        wx.showToast({
          title: '位置和地址设置成功',
          icon: 'success'
        });
      },
      fail: (err) => {
        const message = err && err.errMsg ? err.errMsg : '';
        this.setData({ isChoosingLocation: false });
        console.warn('[customerDetail][delivery][chooseLocation] map fail', message);
        if (message.indexOf('auth deny') !== -1 || message.indexOf('authorize:fail') !== -1) {
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
      earliestDeliveryTime: time
    }, () => this.updateSaveButtonState());
  },

  // 最晚配送时间选择
  onLatestTimeChange(e) {
    const time = e.detail.value;
    this.setData({
      latestDeliveryTime: time
    }, () => this.updateSaveButtonState());
  },

  // 配送备注输入
  onDeliveryNotesInput(e) {
    const notes = e.detail.value;
    this.setData({
      deliveryNotes: notes
    });
  },

  // 详细地址输入
  onDeliveryAddressInput(e) {
    const address = e.detail.value;
    this.setData({
      deliveryAddress: address
    });
  },

  // 配送优先级选择
  onPriorityChange(e) {
    const index = e.detail.value;
    this.setData({
      priorityIndex: parseInt(index, 10)
    });
  },

  // 是否允许提前配送
  onEarlyDeliveryChange(e) {
    const allow = e.detail.value;
    this.setData({
      allowEarlyDelivery: allow
    });
  },

  // 卸货时间输入处理
  onUnloadDurationInput(e) {
    const value = parseInt(e.detail.value) || 0;
    this.setData({
      unloadDuration: value
    }, () => this.updateSaveButtonState());
  },

  // 新服务未部署时兼容旧版 updateGroupName，至少保证核心配送字段可以保存。
  _submitDeliverySettings(payload, depInfo) {
    if (this._useLegacyDeliverySettings) {
      console.log('[customerDetail][delivery][save] skip unavailable primary endpoint, use legacy directly');
      return this._submitLegacyDeliverySettings(payload, depInfo);
    }

    return updateDeliverySettings(payload).then(res => {
      console.log('[customerDetail][delivery][save] primary endpoint result', {
        statusCode: res && res.statusCode,
        code: res && res.result && res.result.code
      });

      if (!res || res.statusCode !== 404) {
        return res;
      }

      console.warn('[customerDetail][delivery][save] updateDeliverySettings is 404, fallback to updateGroupName');
      this._useLegacyDeliverySettings = true;
      return this._submitLegacyDeliverySettings(payload, depInfo);
    });
  },

  _submitLegacyDeliverySettings(payload, depInfo) {
    if (!depInfo.nxDepartmentName) {
      return Promise.resolve({
        result: { code: -1, msg: '客户名称缺失，无法使用旧接口保存' },
        statusCode: 404,
        legacyFallback: true
      });
    }

    // 旧接口会计算名称拼音并访问子部门集合，因此必须提供名称和空数组；
    // 不传新字段，避免旧服务实体无法识别造成反序列化失败。
    const legacyPayload = {
      nxDepartmentId: payload.nxDepartmentId,
      nxDepartmentName: depInfo.nxDepartmentName,
      nxDepartmentLat: payload.nxDepartmentLat,
      nxDepartmentLng: payload.nxDepartmentLng,
      nxDepartmentAddress: payload.nxDepartmentAddress,
      nxDepartmentEarliestDeliveryTime: payload.nxDepartmentEarliestDeliveryTime,
      nxDepartmentLatestDeliveryTime: payload.nxDepartmentLatestDeliveryTime,
      nxDepartmentUnloadDuration: payload.nxDepartmentUnloadDuration,
      nxDepartmentEntities: []
    };

    console.log('[customerDetail][delivery][save] legacy request', {
      depId: legacyPayload.nxDepartmentId,
      latitude: legacyPayload.nxDepartmentLat,
      longitude: legacyPayload.nxDepartmentLng,
      hasAddress: !!legacyPayload.nxDepartmentAddress,
      earliestSeconds: legacyPayload.nxDepartmentEarliestDeliveryTime,
      latestSeconds: legacyPayload.nxDepartmentLatestDeliveryTime,
      unloadDuration: legacyPayload.nxDepartmentUnloadDuration
    });

    return updateGroupName(legacyPayload).then(legacyRes => {
      const legacyResult = legacyRes && legacyRes.result || {};
      console.log('[customerDetail][delivery][save] legacy response', {
        code: legacyResult.code,
        message: legacyResult.msg || ''
      });
      if (legacyResult.code != 0) {
        return {
          result: Object.assign({ code: -1, msg: '旧服务接口保存失败' }, legacyResult),
          statusCode: 404,
          legacyFallback: true
        };
      }

      // 旧接口不返回更新后的客户数据，再查一次并核对坐标是否真正落库。
      return getDepInfo(payload.nxDepartmentId).then(verifyRes => {
        const verifyResult = verifyRes && verifyRes.result || {};
        const savedDepInfo = verifyResult.data || {};
        const coordinateMatches = String(savedDepInfo.nxDepartmentLat || '') === String(payload.nxDepartmentLat) &&
          String(savedDepInfo.nxDepartmentLng || '') === String(payload.nxDepartmentLng);

        console.log('[customerDetail][delivery][save] legacy verify', {
          code: verifyResult.code,
          savedLatitude: savedDepInfo.nxDepartmentLat || '',
          savedLongitude: savedDepInfo.nxDepartmentLng || '',
          coordinateMatches
        });

        if (verifyResult.code != 0 || !coordinateMatches) {
          return {
            result: { code: -1, msg: '保存后坐标校验失败，请重试' },
            statusCode: 404,
            legacyFallback: true
          };
        }
        return {
          result: verifyResult,
          statusCode: 200,
          legacyFallback: true
        };
      });
    });
  },

  // 更新配送设置信息
  updateLocationTimeInfo() {
    if (this.data.savingDeliverySettings) {
      console.log('[customerDetail][delivery][save] ignored duplicate tap');
      return;
    }

    const depInfo = this.data.depInfo || {};
    const latitude = this.data.selectedLatitude;
    const longitude = this.data.selectedLongitude;
    const earliestTime = this.data.earliestDeliveryTime;
    const latestTime = this.data.latestDeliveryTime;

    console.log('[customerDetail][delivery][save] validate form', {
      depId: depInfo.nxDepartmentId,
      latitude: latitude || '',
      longitude: longitude || '',
      earliestTime: earliestTime || '',
      latestTime: latestTime || '',
      unloadDuration: this.data.unloadDuration,
      priorityIndex: this.data.priorityIndex,
      allowEarlyDelivery: !!this.data.allowEarlyDelivery
    });

    if (!depInfo.nxDepartmentId) {
      wx.showToast({ title: '客户信息无效，请刷新后重试', icon: 'none' });
      return;
    }

    if (!this.isValidDeliveryLocation(latitude, longitude)) {
      wx.showToast({
        title: '请设置地理位置',
        icon: 'none'
      });
      return;
    }
    
    const hasEarliestTime = !!earliestTime;
    const hasLatestTime = !!latestTime;
    if (hasEarliestTime !== hasLatestTime) {
      wx.showToast({
        title: '请同时设置最早和最晚时间',
        icon: 'none'
      });
      return;
    }

    const earliestSeconds = hasEarliestTime ? this.formatTimeToSeconds(earliestTime) : null;
    const latestSeconds = hasLatestTime ? this.formatTimeToSeconds(latestTime) : null;
    if (hasEarliestTime && (earliestSeconds === null || latestSeconds === null)) {
      wx.showToast({ title: '配送时间格式不正确', icon: 'none' });
      return;
    }
    if (hasEarliestTime && earliestSeconds >= latestSeconds) {
      wx.showToast({
        title: '最晚时间必须晚于最早时间',
        icon: 'none'
      });
      return;
    }

    const unloadDuration = parseInt(this.data.unloadDuration, 10);
    if (isNaN(unloadDuration) || unloadDuration < 1 || unloadDuration > 1440) {
      wx.showToast({
        title: '卸货时间请输入1至1440分钟',
        icon: 'none'
      });
      return;
    }

    const payload = {
      nxDepartmentId: depInfo.nxDepartmentId,
      nxDepartmentLat: String(latitude),
      nxDepartmentLng: String(longitude),
      nxDepartmentAddress: (this.data.deliveryAddress || '').trim(),
      nxDepartmentEarliestDeliveryTime: earliestSeconds,
      nxDepartmentLatestDeliveryTime: latestSeconds,
      nxDepartmentUnloadDuration: unloadDuration,
      nxDepartmentDispatchPriorityWeight: parseInt(this.data.priorityIndex, 10) + 1,
      nxDepartmentDispatchRemark: (this.data.deliveryNotes || '').trim(),
      nxDepartmentAllowEarlyDelivery: this.data.allowEarlyDelivery ? 1 : 0
    };

    console.log('[customerDetail][delivery][save] request', {
      depId: payload.nxDepartmentId,
      latitude: payload.nxDepartmentLat,
      longitude: payload.nxDepartmentLng,
      hasAddress: !!payload.nxDepartmentAddress,
      earliestSeconds: payload.nxDepartmentEarliestDeliveryTime,
      latestSeconds: payload.nxDepartmentLatestDeliveryTime,
      unloadDuration: payload.nxDepartmentUnloadDuration,
      priorityWeight: payload.nxDepartmentDispatchPriorityWeight,
      allowEarlyDelivery: payload.nxDepartmentAllowEarlyDelivery
    });

    this.setData({ savingDeliverySettings: true });
    wx.showLoading({
      title: '保存中...',
      mask: true
    });

    this._submitDeliverySettings(payload, depInfo).then(res => {
      wx.hideLoading();

      console.log('[customerDetail][delivery][save] response', {
        statusCode: res && res.statusCode,
        legacyFallback: !!(res && res.legacyFallback),
        code: res && res.result && res.result.code,
        message: res && res.result && res.result.msg || '',
        savedLatitude: res && res.result && res.result.data && res.result.data.nxDepartmentLat || '',
        savedLongitude: res && res.result && res.result.data && res.result.data.nxDepartmentLng || ''
      });

      const result = res && res.result || {};
      if (result.code == 0) {
        const savedDepInfo = result.data || Object.assign({}, depInfo, payload);
        const savedEarliestTime = this.normalizeDeliveryTime(savedDepInfo.nxDepartmentEarliestDeliveryTime);
        const savedLatestTime = this.normalizeDeliveryTime(savedDepInfo.nxDepartmentLatestDeliveryTime);

        wx.setStorageSync('depInfo', savedDepInfo);
        this.setData({
          depInfo: savedDepInfo,
          showLocationTimeModal: false,
          savingDeliverySettings: false,
          selectedLatitude: savedDepInfo.nxDepartmentLat || '',
          selectedLongitude: savedDepInfo.nxDepartmentLng || '',
          deliveryAddress: savedDepInfo.nxDepartmentAddress || '',
          earliestDeliveryTime: savedEarliestTime,
          latestDeliveryTime: savedLatestTime,
          formattedEarliestTime: savedEarliestTime,
          formattedLatestTime: savedLatestTime,
          unloadDuration: savedDepInfo.nxDepartmentUnloadDuration || 30,
          deliveryNotes: savedDepInfo.nxDepartmentDispatchRemark || '',
          priorityIndex: this.getDeliveryPriorityIndex(savedDepInfo.nxDepartmentDispatchPriorityWeight),
          allowEarlyDelivery: savedDepInfo.nxDepartmentAllowEarlyDelivery !== 0
        });
        wx.showToast({
          title: res.legacyFallback ? '位置设置已保存' : '配送设置更新成功',
          icon: 'success',
          duration: 2000
        });
      } else {
        this.setData({ savingDeliverySettings: false });
        wx.showToast({
          title: result.msg || '更新失败',
          icon: 'none',
          duration: 2000
        });
      }
    }).catch(err => {
      wx.hideLoading();
      this.setData({ savingDeliverySettings: false });
      console.error('[customerDetail][delivery][save] request failed', err);
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
    if (seconds === null || seconds === undefined || seconds === '') return '';
    const value = Number(seconds);
    if (isNaN(value) || value < 0 || value >= 24 * 3600) return '';
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  },

  // 将时间格式转换为秒数
  formatTimeToSeconds(timeStr) {
    if (!timeStr) return null;
    const parts = timeStr.split(':').map(Number);
    if (parts.length !== 2 || isNaN(parts[0]) || isNaN(parts[1]) ||
        parts[0] < 0 || parts[0] > 23 || parts[1] < 0 || parts[1] > 59) {
      return null;
    }
    const hours = parts[0];
    const minutes = parts[1];
    return hours * 3600 + minutes * 60;
  },

  // 检查当前时间是否在配送时间窗口内
  isInDeliveryTimeWindow(earliestSeconds, latestSeconds, currentTimeSeconds = null) {
    if (earliestSeconds === null || earliestSeconds === undefined ||
        latestSeconds === null || latestSeconds === undefined) return false;
    
    if (!currentTimeSeconds) {
      const now = new Date();
      currentTimeSeconds = now.getHours() * 3600 + now.getMinutes() * 60;
    }
    
    return currentTimeSeconds >= earliestSeconds && currentTimeSeconds <= latestSeconds;
  },

  // 计算配送时间窗口大小（秒）
  getDeliveryTimeWindow(earliestSeconds, latestSeconds) {
    if (earliestSeconds === null || earliestSeconds === undefined ||
        latestSeconds === null || latestSeconds === undefined) return 0;
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
    
    if (earliest === null || earliest === undefined || latest === null || latest === undefined) {
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
    const hasLocation = this.isValidDeliveryLocation(
      this.data.selectedLatitude,
      this.data.selectedLongitude
    );
    const earliestTime = this.data.earliestDeliveryTime;
    const latestTime = this.data.latestDeliveryTime;
    const hasEarliestTime = !!earliestTime;
    const hasLatestTime = !!latestTime;
    const hasTime = hasEarliestTime && hasLatestTime;
    const earliestSeconds = hasTime ? this.formatTimeToSeconds(earliestTime) : null;
    const latestSeconds = hasTime ? this.formatTimeToSeconds(latestTime) : null;
    const timeIsValid = (!hasEarliestTime && !hasLatestTime) ||
      (hasTime && earliestSeconds !== null && latestSeconds !== null && earliestSeconds < latestSeconds);
    const unloadDuration = parseInt(this.data.unloadDuration, 10);
    const unloadIsValid = !isNaN(unloadDuration) && unloadDuration >= 1 && unloadDuration <= 1440;

    return {
      hasLocation,
      hasTime,
      isComplete: hasLocation && timeIsValid && unloadIsValid
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
      formattedEarliestTime: this.normalizeDeliveryTime(depInfo.nxDepartmentEarliestDeliveryTime),
      formattedLatestTime: this.normalizeDeliveryTime(depInfo.nxDepartmentLatestDeliveryTime)
    });
  },

  // 获取客户信息
  _getDepInfo(source = 'unknown') {
    const depId = this.data.depFatherId;
    if (!depId) {
      console.warn('[customerDetail][delivery][getDepInfo] skipped: missing depId', { source });
      return Promise.resolve(null);
    }

    if (this._depInfoRequestPromise) {
      console.log('[customerDetail][delivery][getDepInfo] reuse pending request', {
        source,
        depId
      });
      return this._depInfoRequestPromise;
    }

    const requestId = (this._depInfoRequestId || 0) + 1;
    this._depInfoRequestId = requestId;
    console.log('[customerDetail][delivery][getDepInfo] request start', {
      requestId,
      source,
      depId
    });

    const request = getDepInfo(depId).then(res => {
      load.hideLoading();
      console.log('[customerDetail][delivery][getDepInfo] response', {
        requestId,
        source,
        code: res && res.result && res.result.code,
        latitude: res && res.result && res.result.data && res.result.data.nxDepartmentLat || '',
        longitude: res && res.result && res.result.data && res.result.data.nxDepartmentLng || '',
        showLocationTimeModal: !!this.data.showLocationTimeModal,
        isChoosingLocation: !!this.data.isChoosingLocation
      });

      if (res.result.code == 0) {
        const depInfo = res.result.data || {};

        // 用户已经打开配送弹窗或正在从地图返回时，忽略这次旧响应，避免覆盖未保存表单。
        if (this.data.showLocationTimeModal || this.data.isChoosingLocation) {
          console.warn('[customerDetail][delivery][getDepInfo] response ignored: delivery form is editing', {
            requestId,
            responseLatitude: depInfo.nxDepartmentLat || '',
            responseLongitude: depInfo.nxDepartmentLng || '',
            formLatitude: this.data.selectedLatitude || '',
            formLongitude: this.data.selectedLongitude || ''
          });
          return depInfo;
        }

        const earliestTime = this.normalizeDeliveryTime(depInfo.nxDepartmentEarliestDeliveryTime);
        const latestTime = this.normalizeDeliveryTime(depInfo.nxDepartmentLatestDeliveryTime);
        this.setData({
          depInfo: depInfo,
          selectedLatitude: depInfo.nxDepartmentLat || '',
          selectedLongitude: depInfo.nxDepartmentLng || '',
          deliveryAddress: depInfo.nxDepartmentAddress || '',
          earliestDeliveryTime: earliestTime,
          latestDeliveryTime: latestTime,
          formattedEarliestTime: earliestTime,
          formattedLatestTime: latestTime,
          unloadDuration: depInfo.nxDepartmentUnloadDuration || 30,
          deliveryNotes: depInfo.nxDepartmentDispatchRemark || '',
          priorityIndex: this.getDeliveryPriorityIndex(depInfo.nxDepartmentDispatchPriorityWeight),
          allowEarlyDelivery: depInfo.nxDepartmentAllowEarlyDelivery !== 0
        }, () => {
          console.log('[customerDetail][delivery][getDepInfo] page data applied', {
            requestId,
            latitude: this.data.selectedLatitude || '',
            longitude: this.data.selectedLongitude || ''
          });
        });
        wx.setStorageSync('depInfo', depInfo);
        // 获取客户标签
        this._getDepLabels('getDepInfo:' + source);
        return depInfo;
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        });
        return null;
      }
    }).catch(err => {
      console.error('[customerDetail][delivery][getDepInfo] request failed', {
        requestId,
        source,
        error: err
      });
      return null;
    });

    this._depInfoRequestPromise = request;
    request.then(() => {
      if (this._depInfoRequestPromise === request) {
        this._depInfoRequestPromise = null;
      }
    });
    return request;
  },

  // ============ 标签管理相关方法 ============

  // ============ 获取客户标签 ============
  
  // 获取客户已选标签并显示在页面上
  _getDepLabels(source = 'unknown') {
    const { disId, depFatherId } = this.data;

    console.log('[customerDetail][labels] request start', {
      source,
      disId,
      depFatherId
    });
    
    disGetLabelData({ disId, depFatherId }).then(res => {
      console.log('[customerDetail][labels] response', {
        source,
        code: res && res.result && res.result.code
      });
      if (res.result.code == 0) {
        const labelList = res.result.labelList || [];
        const selectedLabelIds = res.result.selectedLabelIds || [];
        
        // 获取已选标签详情
        const selectedLabels = labelList.filter(label => 
          selectedLabelIds.includes(label.nxDistributerLabelId)
        );
        
        // 将标签添加到 depInfo 中用于页面显示
        this.setData({
          'depInfo.selectedLabels': selectedLabels
        });
        
        console.log('[customerDetail][labels] page data applied', {
          source,
          selectedCount: selectedLabels.length
        });
      }
    }).catch(err => {
      console.error('[customerDetail][labels] request failed', {
        source,
        error: err
      });
    });
  },

  // 显示标签编辑弹窗
  showLabelModal() {
    const { disId, depFatherId } = this.data;
    
    load.showLoading('加载中...');
    
    disGetLabelData({ disId, depFatherId }).then(res => {
      load.hideLoading();
      console.log('标签数据响应:', res);
      
      const result = res.result;
      if (result.code == 0) {
        // API直接返回数据结构，不是嵌套在data里
        const labelList = result.labelList || [];
        const selectedLabelIds = result.selectedLabelIds || [];
        
        // 处理标签列表，添加选中状态
        const processedLabels = labelList.map(label => ({
          ...label,
          selected: selectedLabelIds.includes(label.nxDistributerLabelId)
        }));
        
        // 获取已选标签
        const selectedLabels = processedLabels.filter(l => l.selected);
        
        this.setData({
          showLabelModal: true,
          labelList: processedLabels,
          selectedLabelIds: selectedLabelIds || [],
          selectedLabels: selectedLabels,
          newLabelName: ''
        });
      } else {
        wx.showToast({
          title: result.msg || '获取标签失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      load.hideLoading();
      console.error('获取标签失败', err);
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    });
  },

  // 隐藏标签弹窗
  hideLabelModal() {
    this.setData({
      showLabelModal: false
    });
  },

  // 切换标签选中状态
  toggleLabel(e) {
    const labelId = e.currentTarget.dataset.id;
    const { labelList, selectedLabelIds } = this.data;
    
    let newSelectedIds = [...selectedLabelIds];
    let newSelectedLabels = [...this.data.selectedLabels];
    
    if (newSelectedIds.includes(labelId)) {
      // 取消选中
      newSelectedIds = newSelectedIds.filter(id => id !== labelId);
      newSelectedLabels = newSelectedLabels.filter(l => l.nxDistributerLabelId !== labelId);
    } else {
      // 选中
      newSelectedIds.push(labelId);
      const label = labelList.find(l => l.nxDistributerLabelId === labelId);
      if (label) {
        newSelectedLabels.push(label);
      }
    }
    
    // 更新标签列表中的选中状态
    const newLabelList = labelList.map(label => ({
      ...label,
      selected: newSelectedIds.includes(label.nxDistributerLabelId)
    }));
    
    this.setData({
      labelList: newLabelList,
      selectedLabelIds: newSelectedIds,
      selectedLabels: newSelectedLabels
    });
  },

  // 获取新增标签名称
  getNewLabelName(e) {
    this.setData({
      newLabelName: e.detail.value
    });
  },

  // 添加新标签
  addNewLabel() {
    const { newLabelName, disId, labelList } = this.data;
    
    if (!newLabelName || newLabelName.trim() === '') {
      wx.showToast({
        title: '请输入标签名称',
        icon: 'none'
      });
      return;
    }
    
    load.showLoading('添加中...');
    
    saveLabel({
      nxDlDistributerId: disId,
      nxDlName: newLabelName.trim(),
      nxDlSort: 0,
      nxDlStatus: 1
    }).then(res => {
      load.hideLoading();
      console.log('新增标签响应:', res);
      if (res.result.code == 0) {
        // 返回数据可能是 res.result 或 res.result.data
        const newLabel = res.result.data || res.result;
        
        // 添加到标签列表
        const newLabelList = [...labelList, { ...newLabel, selected: false }];
        
        this.setData({
          labelList: newLabelList,
          newLabelName: ''
        });
        
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: res.result.msg || '添加失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      load.hideLoading();
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    });
  },

  // 删除配送商标签（左边列表）- 影响所有使用该标签的客户
  deleteDistributerLabel(e) {
    const labelId = e.currentTarget.dataset.id;
    const label = e.currentTarget.dataset.label;
    
    wx.showModal({
      title: '确认删除配送商标签',
      content: `删除"${label.nxDlName}"后，所有使用该标签的客户都会失去这个标签，是否继续？`,
      success: (res) => {
        if (res.confirm) {
          this._doDeleteDistributerLabel(labelId);
        }
      }
    });
  },

  _doDeleteDistributerLabel(labelId) {
    load.showLoading('删除中...');
    
    deleteLabel(labelId).then(res => {
      load.hideLoading();
      
      if (res.result.code == 0) {
        const { labelList, selectedLabelIds } = this.data;
        
        // 从列表中移除
        const newLabelList = labelList.filter(l => l.nxDistributerLabelId !== labelId);
        const newSelectedIds = selectedLabelIds.filter(id => id !== labelId);
        const newSelectedLabels = this.data.selectedLabels.filter(l => l.nxDistributerLabelId !== labelId);
        
        this.setData({
          labelList: newLabelList,
          selectedLabelIds: newSelectedIds,
          selectedLabels: newSelectedLabels
        });
        
        wx.showToast({
          title: '删除成功',
          icon: 'success'
        });
      } else {
        wx.showToast({
          title: res.result.msg || '删除失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      load.hideLoading();
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    });
  },

  // 保存客户标签
  saveCustomerLabels() {
    const { depFatherId, disId, selectedLabelIds } = this.data;
    
    load.showLoading('保存中...');
    
    disSyncDepartmentLabels({
      depFatherId,
      disId,
      labelIds: selectedLabelIds
    }).then(res => {
      load.hideLoading();
      
      if (res.result.code == 0) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
        
        this.setData({
          showLabelModal: false,
          update: true  // 标记需要刷新
        });
        
        // 刷新客户信息
        this._getDepInfo('saveCustomerLabels');
      } else {
        wx.showToast({
          title: res.result.msg || '保存失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      load.hideLoading();
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    });
  },

  // 移除客户的标签（右边列表）- 只影响当前客户
  removeSelectedLabel(e) {
    const labelId = e.currentTarget.dataset.id;
    const { depId, labelList, selectedLabelIds, selectedLabels } = this.data;
    
    const newSelectedIds = selectedLabelIds.filter(id => id !== labelId);
    const newSelectedLabels = selectedLabels.filter(l => l.nxDistributerLabelId !== labelId);
    
    // 更新标签列表中的选中状态
    const newLabelList = labelList.map(label => ({
      ...label,
      selected: newSelectedIds.includes(label.nxDistributerLabelId)
    }));
    
    // 先更新本地状态
    this.setData({
      labelList: newLabelList,
      selectedLabelIds: newSelectedIds,
      selectedLabels: newSelectedLabels
    });
    
    // 调用API删除部门标签关系
    deleteDepartmentLabel(depId, labelId).then(res => {
      if (res.result.code == 0) {
        wx.showToast({ title: '已移除', icon: 'success' });
      } else {
        // 失败则恢复原状态
        this.setData({
          labelList,
          selectedLabelIds,
          selectedLabels
        });
        wx.showToast({ title: '移除失败', icon: 'none' });
      }
    });
  }



})

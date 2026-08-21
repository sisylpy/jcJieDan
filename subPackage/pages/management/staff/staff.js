var load = require('../../../../lib/load.js');

var app = getApp()
var dateUtils = require('../../../../utils/dateUtil');
import apiUrl from '../../../../config.js'


import {
  deleteDisUser,
  deleteWeightUser,
  deleteJrdhUser,
  getDisUserInfo,
  updateDisUserAdmin,
  updateSalesDefaultClerk,
  createStaffInvite
} from '../../../../lib/apiDistributer'


import {
  getDisUsers,
} from '../../../../lib/apiDistributer.js'

import {
  getAvailableDrivers,
  driverCheckIn,
  driverCheckOut
} from '../../../../lib/apiRouteDispatch.js'

Page({



  onShow: function () {

    if (this.data.refreshStaffOnShow) {
      this.setData({ refreshStaffOnShow: false })
      this._initData()
    }

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
    admin: 0,
    showOperation: false,
    dutySubmitting: false,

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
  var that = this
  getDisUsers(this.data.disId).then(res =>{
    if(res.result.code == 0){
      var drivers = res.result.data.driver || []
      var combinedStaff = []
        .concat(res.result.data.admins || [])
        .concat(res.result.data.clerks || [])
        .concat(res.result.data.sales || [])
      var clerks = res.result.data.clerks || []
      var defaultClerkOptions = [{
        nxDistributerUserId: null,
        nxDiuWxNickName: '每次新增客户时选择'
      }].concat(clerks)
      var staffUsers = combinedStaff.map(function (user) {
        var isSales = user.nxDiuAdmin == 3
        var availableRoleNames = isSales ? ['业务员'] : ['老板', '录单员']
        var availableRoleValues = isSales ? [3] : [0, 1]
        var roleIndex = availableRoleValues.indexOf(user.nxDiuAdmin)
        var defaultClerkIndex = isSales ? defaultClerkOptions.findIndex(function (clerk) {
          return clerk.nxDistributerUserId == user.nxDiuDefaultClerkUserId
        }) : 0
        return Object.assign({}, user, {
          roleIndex: roleIndex < 0 ? 1 : roleIndex,
          roleLabel: roleIndex < 0 ? '其他' : availableRoleNames[roleIndex],
          availableRoleNames: availableRoleNames,
          availableRoleValues: availableRoleValues,
          roleLocked: isSales,
          defaultClerkOptions: defaultClerkOptions,
          defaultClerkIndex: defaultClerkIndex < 0 ? 0 : defaultClerkIndex
        })
      })
      that.setData({
        zeroUserArr: staffUsers,
        oneUserArr: res.result.data.one,
        driverUserArr: drivers,
        editUser: false
      })
      that._prepareClerkInvite()
      that._loadDriverDutyState(drivers)
    }else{
      wx.showToast({
        title: '获取用户失败',
        icon: 'none'
      })
    }
  })
},

changeSalesDefaultClerk(e) {
  var salesUser = e.currentTarget.dataset.item
  var index = Number(e.detail.value)
  var option = salesUser.defaultClerkOptions[index]
  updateSalesDefaultClerk(
    salesUser.nxDistributerUserId,
    option ? option.nxDistributerUserId : null
  ).then(res => {
    if (res.result && res.result.code == 0) {
      wx.showToast({ title: '默认录单员已保存', icon: 'success' })
      this._initData()
    } else {
      wx.showToast({ title: (res.result && res.result.msg) || '保存失败', icon: 'none' })
    }
  }).catch(() => wx.showToast({ title: '保存失败，请检查网络', icon: 'none' }))
},

_loadDriverDutyState(driverUserArr) {
  var that = this
  var disId = this.data.disId
  if (!disId || !driverUserArr || driverUserArr.length === 0) {
    return
  }
  getAvailableDrivers({
    disId: disId
  }).then(function (res) {
    if (!res.result || res.result.code !== 0) {
      return
    }
    var cards = (res.result.data && res.result.data.driverCards) || []
    that.setData({
      driverUserArr: mergeDriverDutyState(driverUserArr, cards)
    })
  })
},

onDriverDutyChange(e) {
  var index = e.currentTarget.dataset.index
  var wantOn = e.detail.value
  var driver = (this.data.driverUserArr || [])[index]
  var switchKey = 'driverUserArr[' + index + '].dutySwitchOn'
  if (this.data.dutySubmitting || !driver || !driver.nxDistributerUserId) {
    this.setData({ [switchKey]: !wantOn })
    return
  }
  if (wantOn === false && driver.dutyToggleDisabled) {
    wx.showToast({
      title: driver.toggleDisabledReason || '当前不可关闭',
      icon: 'none'
    })
    this.setData({ [switchKey]: true })
    return
  }
  var driverName = driver.nxDiuWxNickName || '该司机'
  var modal = wantOn
    ? {
        title: '开启可派',
        content: '开启后，「' + driverName + '」会持续保持可派，直到手动关闭。确认开启？',
        duty: 'on'
      }
    : {
        title: '关闭可派',
        content: '关闭后，系统不会给「' + driverName + '」派单，确认关闭？',
        duty: 'off'
      }
  var that = this
  wx.showModal({
    title: modal.title,
    content: modal.content,
    success: function (res) {
      if (res.confirm) {
        that.submitDriverDuty(modal.duty, driver.nxDistributerUserId)
      } else {
        that.setData({ [switchKey]: !wantOn })
      }
    }
  })
},

submitDriverDuty(action, driverUserId) {
  var that = this
  var apiFn = action === 'on' ? driverCheckIn : driverCheckOut
  this.setData({ dutySubmitting: true })
  load.showLoading(action === 'on' ? '开启中' : '关闭中')
  apiFn({
    disId: this.data.disId,
    driverUserId: driverUserId,
    operatorUserId: this.data.userId
  }).then(function (res) {
    load.hideLoading()
    that.setData({ dutySubmitting: false })
    if (res.result.code !== 0) {
      wx.showToast({ title: res.result.msg || '操作失败', icon: 'none' })
      that._initData()
      return
    }
    wx.showToast({
      title: action === 'on' ? '已开启可派' : '已关闭可派',
      icon: 'success'
    })
    that._initData()
  }).catch(function (error) {
    load.hideLoading()
    that.setData({ dutySubmitting: false })
    wx.showToast({
      title: (error && error.message) || '操作失败，请检查登录状态',
      icon: 'none',
      duration: 3000
    })
    that._initData()
  })
},


  /**
   * 邀请采购员
   * @param {*} options 
   */
  onShareAppMessage: function (options) {
    var inviteCode = this.data.clerkInviteCode || ''
    var disName = (this.data.disInfo && this.data.disInfo.nxDistributerName) || ''
    var path = '/subPackage/pages/inviteAdmin/inviteAdmin?inviteCode=' + encodeURIComponent(inviteCode)
      + '&disName=' + encodeURIComponent(disName)
    setTimeout(() => {
      this.setData({ clerkInviteCode: null })
      this._prepareClerkInvite()
    }, 1000)
    return {
      title: "邀请你注册录单员",
      path: path,
      imageUrl: '',
    }
  },

_prepareClerkInvite() {
  if (this.data.clerkInviteLoading || this.data.clerkInviteCode) return
  this.setData({ clerkInviteLoading: true })
  createStaffInvite(1).then(res => {
    var invite = res.result && res.result.data
    this.setData({
      clerkInviteLoading: false,
      clerkInviteCode: invite && invite.inviteCode
    })
  }).catch(() => {
    this.setData({ clerkInviteLoading: false })
  })
},

changeUserRole(e){
  var index = Number(e.detail.value)
  var original = e.currentTarget.dataset.item
  var item = {
    nxDistributerUserId: original.nxDistributerUserId,
    nxDiuDistributerId: original.nxDiuDistributerId,
    nxDiuAdmin: original.availableRoleValues[index]
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

toOpenSalesInvite() {
  if (this.data.salesInviteLoading) return
  this.setData({ salesInviteLoading: true })
  createStaffInvite(3).then(res => {
    this.setData({ salesInviteLoading: false })
    if (!res.result || res.result.code != 0 || !res.result.data) {
      wx.showToast({ title: (res.result && res.result.msg) || '邀请创建失败', icon: 'none' })
      return
    }
    var inviteCode = res.result.data.inviteCode
    var disName = (this.data.disInfo && this.data.disInfo.nxDistributerName) || ''
    var path = '/pages/salesRegister/salesRegister?inviteCode=' + encodeURIComponent(inviteCode)
      + '&disName=' + encodeURIComponent(disName)
    this.setData({ refreshStaffOnShow: true })
    wx.navigateToMiniProgram({
      appId: 'wx159c5a46d80e4500',
      path: path,
      envVersion: 'trial',
      fail: function () {
        wx.showToast({ title: '无法打开业务员注册页', icon: 'none' })
      }
    })
  }).catch(() => {
    this.setData({ salesInviteLoading: false })
    wx.showToast({ title: '邀请创建失败', icon: 'none' })
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

openOperationWeight(e){
  this.setData({
    showOperationWeight: true,
    selectUserIdWeight: e.currentTarget.dataset.id,
    editUserItemWeight: e.currentTarget.dataset.item,

  })
},



  /**
   * 删除用户
   */
  delUser() {
    load.showLoading("删除用户")
    if(this.data.type == 'dis'){
      deleteDisUser(this.data.selectUserId).then(res => {
        if (res.result.code == 0) {
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


  delUserWeight(){
    load.showLoading("删除用户")
      deleteWeightUser(this.data.selectUserIdWeight).then(res => {
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


  editUserWeight(){

    this.setData({
      editUserWeight: true,
      showOperationWeight:false
    })
    wx.setStorageSync('editUserItemWeight', this.data.editUserItemWeight);
    wx.navigateTo({
      url: '../disUserEditWeight/disUserEditWeight',
    })

  },

  /**
   * 关闭蒙版
   */
  hideMask() {
    this.setData({
      showOperation: false,
      showOperationWeight: false
      
    })
  },
  

  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  },

  



toOpenOrder() {
    
  console.log('disId=' + this.data.disId + '&disName=' + this.data.disInfo.nxDistributerName
  +'&userId=-1&userType=1');
  wx.navigateToMiniProgram({
    appId: "wxe7ab0f97ea2c6417",
    path: '/pages/inviteAdmin/inviteAdmin?disId=' + this.data.disId + '&disName=' + this.data.disInfo.nxDistributerName
    +'&userId=-1&userType=1&supplierId=-1',
    envVersion: 'trial', //release develop trial
    success(res) {
     
    }
  })
},

toOpenDriver() {
  var disId = this.data.disId
  var disName = (this.data.disInfo && this.data.disInfo.nxDistributerName) ? this.data.disInfo.nxDistributerName : ''
  var appId = 'wx2dccb807db0ea0d7'
  var path = '/pages/inviteAdmin/inviteAdmin?tenant=nx&disId=' + disId + '&disName=' + encodeURIComponent(disName)
  var envVersion = 'trial'

  console.log('========== 司机邀请注册 ==========')
  console.log('[staff] appId:', appId)
  console.log('[staff] envVersion:', envVersion)
  console.log('[staff] path:', path)
  console.log('[staff] 完整 query: tenant=nx&disId=' + disId + '&disName=' + disName)
  console.log('[staff] 司机端编译模式入口（复制此行）:')
  console.log(path)
  console.log('==================================')

  wx.navigateToMiniProgram({
    appId: appId,
    path: path,
    envVersion: envVersion,
    success(res) {
      console.log('[staff] navigateToMiniProgram success', res)
    },
    fail(err) {
      console.error('[staff] navigateToMiniProgram fail', err)
    }
  })
},

})

function mergeDriverDutyState(driverUserArr, driverCards) {
  var cardById = {}
  ;(driverCards || []).forEach(function (card) {
    if (card && card.driverUserId != null) {
      cardById[card.driverUserId] = card
    }
  })
  return (driverUserArr || []).map(function (user) {
    var card = cardById[user.nxDistributerUserId]
    var onDuty = card && card.dutyStatus !== 'OFF_DUTY'
    return Object.assign({}, user, {
      dutySwitchOn: onDuty,
      dutyStatusLabel: card && card.dutyStatusLabel ? card.dutyStatusLabel : (onDuty ? '可派' : '不可派'),
      dutyToggleDisabled: onDuty && card && card.canToggleDuty === false,
      toggleDisabledReason: card ? card.toggleDisabledReason : null
    })
  })
}

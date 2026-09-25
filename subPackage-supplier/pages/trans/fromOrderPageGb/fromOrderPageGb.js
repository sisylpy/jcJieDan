var app = getApp()
var load = require('../../../../lib/load.js');

import {
  disLogin,
  getJczbBatchForNx,
  nxDisImportJczbBatch
} from '../../../../lib/apiDistributer'


Page({

  data: {
    name: '转订单',
    batch: { gbDPGEntities: [] },
    batchStatus: null,
    pageLoading: true,
    pageError: '',
    isSaving: false,
    isNavigatingHome: false,
  },

  onShow(){
    this._login();
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const globalData = app.globalData;

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      batchId: options.batchId,
      expectedNxDisId: Number(options.nxDisId || 0)
    })

  },

  _login() {
    var that = this;
    this.setData({ pageLoading: true, pageError: '' });
    // 首次登录
    wx.login({
      success(res) {
        console.log('[精彩账本转配送] wx.login:', res);
        if (res.code) {
          var disUser = {
            nxDiuCode: res.code,
          }
          disLogin(disUser)
            .then(res => {
              console.log('[精彩账本转配送] disLogin:', res.result);
              if (res.result && res.result.code === 0 && res.result.data
                  && res.result.data.disInfo) {
                //缓存用户信息
                wx.setStorageSync('userInfo', res.result.data.userInfo);
                wx.setStorageSync('disInfo', res.result.data.disInfo);
                that.setData({
                  userInfo: res.result.data.userInfo,
                  disInfo: res.result.data.disInfo,
                  disId: res.result.data.disInfo.nxDistributerId,
                })
                if (that.data.expectedNxDisId > 0 &&
                    Number(res.result.data.disInfo.nxDistributerId) !== that.data.expectedNxDisId) {
                  that.setData({
                    identityMismatch: true,
                    pageLoading: false,
                    pageError: '当前配送商账号与本单登记的配送商不一致',
                  })
                  wx.showModal({
                    title: '配送商账号不一致',
                    content: '这张订货单登记给了其他配送商，请使用登记时的老板微信打开。',
                    showCancel: false,
                  })
                  return
                }
                that._getInitData();
              } else {
                that.setData({
                  pageLoading: false,
                  pageError: (res.result && res.result.msg) || '当前微信尚未登录配送商账号',
                })
                wx.navigateTo({
                  url: '/subPackage-auth/pages/inviteCode/inviteCode',
                })
              }
            })
            .catch(error => {
              console.error('[精彩账本转配送] disLogin 失败:', error);
              that.setData({ pageLoading: false, pageError: '配送商登录失败，请重试' });
            })
        } else {
          that.setData({ pageLoading: false, pageError: '微信登录失败，请重试' });
        }
      },
      fail(error) {
        console.error('[精彩账本转配送] wx.login 失败:', error);
        that.setData({ pageLoading: false, pageError: '微信登录失败，请重试' });
      }
    })
    //login finish
  },


  _getInitData() {
    var requestData = {
      batchId: this.data.batchId,
      nxDisId: this.data.disId,
    };
    console.log('[精彩账本转配送] getJczbBatchForNx 请求:', requestData);
    this.setData({ pageLoading: true, pageError: '' });
    load.showLoading("获取订货商品")
    getJczbBatchForNx(requestData)
      .then(res => {
        load.hideLoading();
        console.log('[精彩账本转配送] getJczbBatchForNx 返回:', res.result);
        if (res.result && res.result.code == 0 && res.result.data) {
          const batch = res.result.data
          ;(batch.gbDPGEntities || []).forEach(item => {
            // 配送服务不保存精彩账本商品对象，只透传页面需要的展示字段。
            if (!item.gbDistributerGoodsEntity) {
              item.gbDistributerGoodsEntity = {
                gbDgGoodsName: item.gbDistributerGoodsName || '',
                gbDgGoodsPy: item.gbDgGoodsPy || '',
                gbDgGoodsStandardname: item.gbDgGoodsStandardname || item.gbDpgStandard || '',
                gbDgGoodsStandardWeight: item.gbDgGoodsStandardWeight || '',
                gbDgGoodsBrand: item.gbDgGoodsBrand || '',
                gbDgGoodsDetail: '',
              }
            }
            item.gbDistributerGoodsEntity.gbDgGoodsName =
              item.gbDistributerGoodsEntity.gbDgGoodsName || item.gbDistributerGoodsName || '';
            item.gbDistributerGoodsEntity.gbDgGoodsStandardname =
              item.gbDistributerGoodsEntity.gbDgGoodsStandardname || item.gbDgGoodsStandardname || item.gbDpgStandard || '';
            item.gbDistributerGoodsEntity.gbDgGoodsDetail =
              item.gbDistributerGoodsEntity.gbDgGoodsDetail || '';
            item.gbDepartmentOrdersEntities = item.gbDepartmentOrdersEntities || [];
          })
          this.setData({
            batch,
            batchStatus: batch.gbDpbStatus,
            pageLoading: false,
            pageError: '',
          })
          // 自动转单或此前已手动转单时，旧分享链接仍可能落到本页。
          // 此时不要再次展示“转订单”，直接回到精彩接单主页。
          if (this._isBatchTransferred(batch)) {
            this._goOrderHome()
          }
        } else {
          var message = (res.result && res.result.msg) || '获取订货单失败';
          this.setData({
            pageLoading: false,
            pageError: message,
          })
          wx.showToast({
            title: message,
            icon: 'none'
          })
        }
      })
      .catch(error => {
        load.hideLoading()
        console.error('[精彩账本转配送] getJczbBatchForNx 失败:', error);
        this.setData({ pageLoading: false, pageError: '无法连接配送服务，请重试' })
        wx.showToast({ title: '无法连接配送服务', icon: 'none' })
      })
  },

  _isBatchTransferred(batch) {
    const goodsList = batch && batch.gbDPGEntities ? batch.gbDPGEntities : []
    let orderCount = 0
    for (const goods of goodsList) {
      const orders = goods && goods.gbDepartmentOrdersEntities
        ? goods.gbDepartmentOrdersEntities
        : []
      for (const order of orders) {
        orderCount += 1
        const linkedOrderId = Number(order && order.gbDoNxDepartmentOrderId || 0)
        const linkedDisId = Number(order && order.gbDoNxDistributerId || 0)
        if (linkedOrderId <= 0) return false
        if (linkedDisId > 0 && this.data.disId > 0 && linkedDisId !== Number(this.data.disId)) {
          return false
        }
      }
    }
    return orderCount > 0
  },

  _goOrderHome() {
    if (this.data.isNavigatingHome) return
    this.setData({ isNavigatingHome: true, isSaving: false })
    wx.switchTab({
      url: '/pages/order/index/index',
      fail: () => {
        wx.reLaunch({
          url: '/pages/order/index/index',
          complete: () => this.setData({ isNavigatingHome: false })
        })
      }
    })
  },

  _verifyTransferThenOpenHome(failureMessage) {
    const requestData = {
      batchId: this.data.batchId,
      nxDisId: this.data.disId,
    }
    load.showLoading('确认转单结果')
    return getJczbBatchForNx(requestData)
      .then(res => {
        load.hideLoading()
        const result = res && res.result ? res.result : {}
        const batch = result.code == 0 ? result.data : null
        if (batch && this._isBatchTransferred(batch)) {
          this._goOrderHome()
          return true
        }
        this.setData({ isSaving: false })
        wx.showToast({ title: failureMessage || result.msg || '转单失败', icon: 'none' })
        return false
      })
      .catch(error => {
        load.hideLoading()
        console.error('[精彩账本转配送] 确认转单结果失败:', error)
        this.setData({ isSaving: false })
        wx.showToast({ title: failureMessage || '无法确认转单结果，请稍后重试', icon: 'none' })
        return false
      })
  },

  retryLoad() {
    if (this.data.disId) {
      this._getInitData();
    } else {
      this._login();
    }
  },


  saveOrder(){
    if (this.data.identityMismatch) {
      wx.showToast({ title: '配送商账号不一致', icon: 'none' })
      return
    }
    if (this.data.isSaving) {
      return
    }
    this.setData({ isSaving: true })
    var data = {
      batchId: this.data.batchId,
      nxDisId: this.data.disId
    }
    console.log('[精彩账本转配送] nxDisImportJczbBatch 请求:', data);
    load.showLoading("转到订单")
    nxDisImportJczbBatch(data).then(res =>{
      load.hideLoading();
      console.log('[精彩账本转配送] nxDisImportJczbBatch 返回:', res.result);
      const result = res && res.result ? res.result : {}
      if(Number(result.code) === 0){
        // 包括首次创建、重复点击的 ALREADY_LINKED 以及回写稍有延迟的情况，
        // 配送订单已经可处理，都直接进入精彩接单主页。
        this._goOrderHome()
      } else {
        // 网络/跨服务回写可能发生“配送订单已落库但响应失败”。
        // 先读取精彩账本关联确认，避免把实际成功误报成失败。
        this._verifyTransferThenOpenHome(result.msg || '转单失败')
      }
    }).catch(error => {
      load.hideLoading()
      console.error('[精彩账本转配送] nxDisImportJczbBatch 失败:', error);
      this._verifyTransferThenOpenHome('无法连接配送服务')
    })
  },

  toBack() {
    this._goOrderHome()
  },



 

})

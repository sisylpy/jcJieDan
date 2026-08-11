var load = require('../../../../lib/load.js')
import {
  getDistributerCompensationCouponList,
  updateDistributerCompensationCouponStatus
} from '../../../../lib/apiDistributer'

var app = getApp()
var COMP_TYPE_TEXT = {
  quality: '商品质量',
  delivery_delay: '配送延迟',
  out_of_stock: '缺货',
  service_complaint: '服务投诉',
  other: '其他'
}

Page({
  data: {
    navBarHeight: 0,
    disId: null,
    operatorUserId: null,
    list: [],
    showDisabled: false,
    loading: false
  },

  onLoad(options) {
    var user = wx.getStorageSync('userInfo') || {}
    var dis = user.nxDistributerEntity || {}
    this.setData({
      navBarHeight: (app.globalData.navBarHeight || 0) * (app.globalData.rpxR || 1),
      disId: Number(options.disId || dis.nxDistributerId),
      operatorUserId: user.nxDistributerUserId
    })
  },

  onShow() { this.fetchList() },
  onPullDownRefresh() { this.fetchList(true) },

  fetchList(fromPullDown) {
    if (!this.data.disId || !this.data.operatorUserId) return
    this.setData({ loading: true })
    if (!fromPullDown) load.showLoading('加载补偿券')
    var status = this.data.showDisabled ? 0 : 1
    getDistributerCompensationCouponList(this.data.disId, this.data.operatorUserId, status)
      .then((res) => {
        if (!res.result || res.result.code !== 0) throw new Error((res.result && res.result.msg) || '加载失败')
        this.setData({
          list: (res.result.data || []).map(function (item) {
            return Object.assign({}, item, {
              amountText: '¥' + (item.nxDcPrice || '0'),
              compTypeText: COMP_TYPE_TEXT[item.nxDcCompType] || '其他',
              validityText: '发放后' + (item.nxDcValidityDays || 7) + '天有效',
              enabled: Number(item.nxDcStatus) === 1
            })
          })
        })
      }).catch((error) => wx.showToast({ title: error.message || '加载失败', icon: 'none' }))
      .finally(() => {
        load.hideLoading()
        this.setData({ loading: false })
        if (fromPullDown) wx.stopPullDownRefresh()
      })
  },

  toggleDisabled(e) {
    this.setData({ showDisabled: e.detail.value }, () => this.fetchList())
  },

  toAdd() {
    wx.navigateTo({
      url: './compensationCouponEdit?disId=' + this.data.disId
    })
  },

  toEdit(e) {
    wx.navigateTo({
      url: './compensationCouponEdit?disId=' + this.data.disId + '&id=' + e.currentTarget.dataset.id
    })
  },

  changeStatus(e) {
    var item = e.currentTarget.dataset.item
    var nextStatus = Number(item.nxDcStatus) === 1 ? 0 : 1
    wx.showModal({
      title: nextStatus === 1 ? '启用补偿券' : '停用补偿券',
      content: nextStatus === 1 ? '启用后可在售后处理中发放。' : '停用后不能再用于新的售后补偿。',
      success: (result) => {
        if (!result.confirm) return
        updateDistributerCompensationCouponStatus({
          nxDistributerCouponId: item.nxDistributerCouponId,
          nxDcDistributerId: this.data.disId,
          operatorUserId: this.data.operatorUserId,
          nxDcStatus: nextStatus
        }).then((res) => {
          if (!res.result || res.result.code !== 0) throw new Error((res.result && res.result.msg) || '更新失败')
          wx.showToast({ title: nextStatus === 1 ? '已启用' : '已停用', icon: 'success' })
          this.fetchList()
        }).catch((error) => wx.showToast({ title: error.message || '更新失败', icon: 'none' }))
      }
    })
  },

  toBack() { wx.navigateBack({ delta: 1 }) }
})

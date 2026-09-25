var load = require('../../../../lib/load.js')
import {
  getDistributerCompensationCouponList,
  saveDistributerCompensationCoupon,
  updateDistributerCompensationCoupon
} from '../../../../lib/apiDistributer'

var app = getApp()
var COMP_TYPES = [
  { code: 'quality', label: '商品质量' },
  { code: 'delivery_delay', label: '配送延迟' },
  { code: 'out_of_stock', label: '缺货' },
  { code: 'service_complaint', label: '服务投诉' },
  { code: 'other', label: '其他' }
]

Page({
  data: {
    navBarHeight: 0,
    disId: null,
    operatorUserId: null,
    couponId: null,
    isEdit: false,
    compTypes: COMP_TYPES,
    compTypeIndex: 0,
    saving: false,
    form: {
      name: '',
      amount: '',
      validDays: 7,
      words: '',
      status: 1
    }
  },

  onLoad(options) {
    var user = wx.getStorageSync('userInfo') || {}
    var dis = user.nxDistributerEntity || {}
    var couponId = options.id ? Number(options.id) : null
    this.setData({
      navBarHeight: (app.globalData.navBarHeight || 0) * (app.globalData.rpxR || 1),
      disId: Number(options.disId || dis.nxDistributerId),
      operatorUserId: user.nxDistributerUserId,
      couponId: couponId,
      isEdit: !!couponId
    })
    if (couponId) this.loadCoupon()
  },

  loadCoupon() {
    load.showLoading('加载中')
    getDistributerCompensationCouponList(this.data.disId, this.data.operatorUserId)
      .then((res) => {
        if (!res.result || res.result.code !== 0) throw new Error((res.result && res.result.msg) || '加载失败')
        var item = (res.result.data || []).filter((row) => Number(row.nxDistributerCouponId) === this.data.couponId)[0]
        if (!item) throw new Error('补偿券不存在')
        var index = COMP_TYPES.findIndex(function (type) { return type.code === item.nxDcCompType })
        this.setData({
          compTypeIndex: index >= 0 ? index : 0,
          form: {
            name: item.nxDistributerCouponName || '',
            amount: item.nxDcPrice || '',
            validDays: item.nxDcValidityDays || 7,
            words: item.nxDcWords || '',
            status: Number(item.nxDcStatus) === 1 ? 1 : 0
          }
        })
      }).catch((error) => wx.showToast({ title: error.message || '加载失败', icon: 'none' }))
      .finally(() => load.hideLoading())
  },

  inputName(e) { this.setData({ 'form.name': e.detail.value }) },
  inputAmount(e) { this.setData({ 'form.amount': e.detail.value }) },
  inputDays(e) { this.setData({ 'form.validDays': e.detail.value }) },
  inputWords(e) { this.setData({ 'form.words': e.detail.value }) },
  changeCompType(e) { this.setData({ compTypeIndex: Number(e.detail.value) }) },

  save() {
    if (this.data.saving) return
    var form = this.data.form
    if (!String(form.name || '').trim()) return wx.showToast({ title: '请填写补偿券名称', icon: 'none' })
    if (!(Number(form.amount) > 0)) return wx.showToast({ title: '请填写补偿金额', icon: 'none' })
    var days = Number(form.validDays)
    if (!Number.isInteger(days) || days < 1 || days > 365) return wx.showToast({ title: '有效天数应为1到365天', icon: 'none' })
    var request = {
      nxDistributerCouponId: this.data.couponId,
      nxDcDistributerId: this.data.disId,
      operatorUserId: this.data.operatorUserId,
      nxDistributerCouponName: String(form.name).trim(),
      nxDcPrice: String(form.amount),
      nxDcCompType: COMP_TYPES[this.data.compTypeIndex].code,
      nxDcValidityDays: days,
      nxDcWords: String(form.words || '').trim(),
      nxDcStatus: form.status
    }
    this.setData({ saving: true })
    load.showLoading('保存中')
    var job = this.data.isEdit ? updateDistributerCompensationCoupon(request) : saveDistributerCompensationCoupon(request)
    job.then((res) => {
      if (!res.result || res.result.code !== 0) throw new Error((res.result && res.result.msg) || '保存失败')
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(function () { wx.navigateBack({ delta: 1 }) }, 500)
    }).catch((error) => wx.showToast({ title: error.message || '保存失败', icon: 'none' }))
      .finally(() => { load.hideLoading(); this.setData({ saving: false }) })
  },

  toBack() { wx.navigateBack({ delta: 1 }) }
})

var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config.js'
import {
  saveDistributerCoupon,
  updateDistributerCoupon,
  getDistributerCouponList,
  deleteDistributerCoupon,
  updateDistributerCouponStatus
} from '../../../../lib/apiDistributer'

var app = getApp();

const COUPON_TYPES = [0, 1];
const COUPON_TYPE_TEXTS = ['固定减', '折扣券'];
const DELIVERY_MODES = ['ALL', 'DELIVERY', 'SELF_PICKUP'];
const DELIVERY_MODE_TEXTS = ['全部', '配送', '自提'];
const SETTLEMENT_TYPES = ['ALL', 'CASH', 'ACCOUNT'];
const SETTLEMENT_TEXTS = ['全部', '现金客户', '记账客户'];

Page({
  data: {
    navBarHeight: 0,
    disId: null,
    list: [],
    editing: false,
    typeTexts: COUPON_TYPE_TEXTS,
    deliveryModeTexts: DELIVERY_MODE_TEXTS,
    settlementTexts: SETTLEMENT_TEXTS,
    typeIndex: 0,
    deliveryModeIndex: 0,
    settlementIndex: 0,
    formData: {
      nxDistributerCouponId: null,
      nxDcDistributerId: null,
      nxDistributerCouponName: '',
      nxDcType: 0,
      nxDcSubtotalPrice: '',
      nxDcPrice: '',
      nxDcPricePercent: '',
      applyDeliveryMode: 'ALL',
      applySettlementType: 'ALL',
      nxDcStatus: 1
    }
  },

  onLoad(options) {
    const globalData = app.globalData;
    this.setData({
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      disId: options.disId ? Number(options.disId) : null
    });
    this.fetchList();
  },

  toBack() {
    wx.navigateBack({ delta: 1 });
  },

  fetchList() {
    if (!this.data.disId) return;
    load.showLoading('加载中');
    getDistributerCouponList(this.data.disId)
      .then(res => {
        load.hideLoading();
        if (res.result.code === 0) {
          const rows = res.result.data || [];
          const list = rows.map(item => this.decorate(item));
          this.setData({ list });
        } else {
          wx.showToast({ title: res.result.msg || '加载失败', icon: 'none' });
        }
      })
      .catch(() => { load.hideLoading(); });
  },

  decorate(item) {
    const typeText = COUPON_TYPE_TEXTS[COUPON_TYPES.indexOf(item.nxDcType)] || '未知';
    let descText = '';
    if (item.nxDcType === 1) {
      descText = '满' + (item.nxDcSubtotalPrice || '0') + '  ' + (item.nxDcPricePercent || '0') + '%折';
    } else {
      descText = '满' + (item.nxDcSubtotalPrice || '0') + ' 减' + (item.nxDcPrice || '0');
    }
    return Object.assign({}, item, {
      typeText,
      descText,
      statusText: item.nxDcStatus === 1 ? '启用' : '停用',
      applyDeliveryModeText: DELIVERY_MODE_TEXTS[DELIVERY_MODES.indexOf(item.applyDeliveryMode)] || item.applyDeliveryMode,
      applySettlementTypeText: SETTLEMENT_TEXTS[SETTLEMENT_TYPES.indexOf(item.applySettlementType)] || item.applySettlementType
    });
  },

  toAdd() {
    this.setData({
      editing: true,
      typeIndex: 0,
      deliveryModeIndex: 0,
      settlementIndex: 0,
      formData: {
        nxDistributerCouponId: null,
        nxDcDistributerId: this.data.disId,
        nxDistributerCouponName: '',
        nxDcType: 0,
        nxDcSubtotalPrice: '',
        nxDcPrice: '',
        nxDcPricePercent: '',
        applyDeliveryMode: 'ALL',
        applySettlementType: 'ALL',
        nxDcStatus: 1
      }
    });
  },

  toEdit(e) {
    const id = Number(e.currentTarget.dataset.id);
    const item = this.data.list.find(r => r.nxDistributerCouponId === id);
    if (!item) return;
    this.setData({
      editing: true,
      typeIndex: Math.max(0, COUPON_TYPES.indexOf(item.nxDcType)),
      deliveryModeIndex: Math.max(0, DELIVERY_MODES.indexOf(item.applyDeliveryMode)),
      settlementIndex: Math.max(0, SETTLEMENT_TYPES.indexOf(item.applySettlementType)),
      formData: {
        nxDistributerCouponId: item.nxDistributerCouponId,
        nxDcDistributerId: item.nxDcDistributerId || this.data.disId,
        nxDistributerCouponName: item.nxDistributerCouponName,
        nxDcType: item.nxDcType,
        nxDcSubtotalPrice: item.nxDcSubtotalPrice,
        nxDcPrice: item.nxDcPrice,
        nxDcPricePercent: item.nxDcPricePercent,
        applyDeliveryMode: item.applyDeliveryMode,
        applySettlementType: item.applySettlementType,
        nxDcStatus: item.nxDcStatus === 1 ? 1 : 0
      }
    });
  },

  cancelEdit() {
    this.setData({ editing: false });
  },

  bindName(e) { this.setData({ 'formData.nxDistributerCouponName': e.detail.value }); },
  bindTypeChange(e) {
    const i = Number(e.detail.value);
    this.setData({ typeIndex: i, 'formData.nxDcType': COUPON_TYPES[i] });
  },
  bindSubtotal(e) { this.setData({ 'formData.nxDcSubtotalPrice': e.detail.value }); },
  bindPrice(e) { this.setData({ 'formData.nxDcPrice': e.detail.value }); },
  bindPercent(e) { this.setData({ 'formData.nxDcPricePercent': e.detail.value }); },
  bindDeliveryModeChange(e) {
    const i = Number(e.detail.value);
    this.setData({ deliveryModeIndex: i, 'formData.applyDeliveryMode': DELIVERY_MODES[i] });
  },
  bindSettlementChange(e) {
    const i = Number(e.detail.value);
    this.setData({ settlementIndex: i, 'formData.applySettlementType': SETTLEMENT_TYPES[i] });
  },

  save() {
    const f = this.data.formData;
    if (!f.nxDistributerCouponName) { wx.showToast({ title: '请填写优惠券名称', icon: 'none' }); return; }
    if (!f.nxDcSubtotalPrice && f.nxDcSubtotalPrice !== 0) { wx.showToast({ title: '请填写门槛金额', icon: 'none' }); return; }
    if (f.nxDcType === 0 && (!f.nxDcPrice && f.nxDcPrice !== 0)) { wx.showToast({ title: '请填写优惠金额', icon: 'none' }); return; }
    if (f.nxDcType === 1 && (!f.nxDcPricePercent && f.nxDcPricePercent !== 0)) { wx.showToast({ title: '请填写折扣率', icon: 'none' }); return; }
    load.showLoading('保存中');
    const api = f.nxDistributerCouponId ? updateDistributerCoupon : saveDistributerCoupon;
    api(f)
      .then(res => {
        load.hideLoading();
        if (res.result.code === 0) {
          wx.showToast({ title: '已保存', icon: 'success' });
          this.setData({ editing: false });
          this.fetchList();
        } else {
          wx.showToast({ title: res.result.msg || '保存失败', icon: 'none' });
        }
      })
      .catch(() => { load.hideLoading(); });
  },

  bindStatusChange(e) {
    const id = Number(e.currentTarget.dataset.id);
    const status = e.detail.value ? 1 : 0;
    load.showLoading('更新中');
    updateDistributerCouponStatus({ id, status })
      .then(res => {
        load.hideLoading();
        if (res.result.code !== 0) {
          wx.showToast({ title: res.result.msg || '更新失败', icon: 'none' });
        }
        this.fetchList();
      })
      .catch(() => { load.hideLoading(); });
  },

  deleteItem(e) {
    const id = Number(e.currentTarget.dataset.id);
    wx.showModal({
      title: '删除优惠券',
      content: '确定删除该优惠券？',
      success: (r) => {
        if (r.confirm) {
          load.showLoading('删除中');
          deleteDistributerCoupon(id)
            .then(res => {
              load.hideLoading();
              if (res.result.code === 0) {
                wx.showToast({ title: '已删除', icon: 'success' });
                this.fetchList();
              } else {
                wx.showToast({ title: res.result.msg || '删除失败', icon: 'none' });
              }
            })
            .catch(() => { load.hideLoading(); });
        }
      }
    });
  }
})

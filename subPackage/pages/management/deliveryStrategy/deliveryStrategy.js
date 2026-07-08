var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config.js'
import {
  saveDeliveryFeeRule,
  updateDeliveryFeeRule,
  getDeliveryFeeRuleList,
  deleteDeliveryFeeRule
} from '../../../../lib/apiDistributer'

var app = getApp();

const FEE_MODES = ['FREE', 'FIXED_AMOUNT', 'DISTANCE_ONLY'];
const FEE_MODE_TEXTS = ['免费', '固定金额', '按距离'];
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
    feeModes: FEE_MODES,
    feeModeTexts: FEE_MODE_TEXTS,
    deliveryModes: DELIVERY_MODES,
    deliveryModeTexts: DELIVERY_MODE_TEXTS,
    settlementTypes: SETTLEMENT_TYPES,
    settlementTexts: SETTLEMENT_TEXTS,
    feeModeIndex: 1,
    deliveryModeIndex: 0,
    settlementIndex: 0,
    formData: {
      nxDistributerDeliveryFeeRuleId: null,
      distributerId: null,
      feeMode: 'FIXED_AMOUNT',
      baseDistanceKm: '',
      startFeeAmount: '',
      pricePerKm: '',
      applyDeliveryMode: 'ALL',
      applySettlementType: 'ALL',
      ruleStatus: 'ENABLED'
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
    getDeliveryFeeRuleList(this.data.disId)
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
    return Object.assign({}, item, {
      feeModeText: this.feeModeText(item.feeMode),
      applyDeliveryModeText: this.deliveryModeText(item.applyDeliveryMode),
      applySettlementTypeText: this.settlementText(item.applySettlementType)
    });
  },

  feeModeText(v) { return FEE_MODE_TEXTS[FEE_MODES.indexOf(v)] || v; },
  deliveryModeText(v) { return DELIVERY_MODE_TEXTS[DELIVERY_MODES.indexOf(v)] || v; },
  settlementText(v) { return SETTLEMENT_TEXTS[SETTLEMENT_TYPES.indexOf(v)] || v; },

  toAdd() {
    this.setData({
      editing: true,
      feeModeIndex: 1,
      deliveryModeIndex: 0,
      settlementIndex: 0,
      formData: {
        nxDistributerDeliveryFeeRuleId: null,
        distributerId: this.data.disId,
        feeMode: 'FIXED_AMOUNT',
        baseDistanceKm: '',
        startFeeAmount: '',
        pricePerKm: '',
        applyDeliveryMode: 'ALL',
        applySettlementType: 'ALL',
        ruleStatus: 'ENABLED'
      }
    });
  },

  toEdit(e) {
    const id = Number(e.currentTarget.dataset.id);
    const item = this.data.list.find(r => r.nxDistributerDeliveryFeeRuleId === id);
    if (!item) return;
    this.setData({
      editing: true,
      feeModeIndex: Math.max(0, FEE_MODES.indexOf(item.feeMode)),
      deliveryModeIndex: Math.max(0, DELIVERY_MODES.indexOf(item.applyDeliveryMode)),
      settlementIndex: Math.max(0, SETTLEMENT_TYPES.indexOf(item.applySettlementType)),
      formData: {
        nxDistributerDeliveryFeeRuleId: item.nxDistributerDeliveryFeeRuleId,
        distributerId: item.distributerId || this.data.disId,
        feeMode: item.feeMode,
        baseDistanceKm: item.baseDistanceKm,
        startFeeAmount: item.startFeeAmount,
        pricePerKm: item.pricePerKm,
        applyDeliveryMode: item.applyDeliveryMode,
        applySettlementType: item.applySettlementType,
        ruleStatus: item.ruleStatus || 'ENABLED'
      }
    });
  },

  cancelEdit() {
    this.setData({ editing: false });
  },

  bindFeeModeChange(e) {
    const i = Number(e.detail.value);
    this.setData({ feeModeIndex: i, 'formData.feeMode': FEE_MODES[i] });
  },
  bindDeliveryModeChange(e) {
    const i = Number(e.detail.value);
    this.setData({ deliveryModeIndex: i, 'formData.applyDeliveryMode': DELIVERY_MODES[i] });
  },
  bindSettlementChange(e) {
    const i = Number(e.detail.value);
    this.setData({ settlementIndex: i, 'formData.applySettlementType': SETTLEMENT_TYPES[i] });
  },
  bindBaseDistance(e) { this.setData({ 'formData.baseDistanceKm': e.detail.value }); },
  bindStartFee(e) { this.setData({ 'formData.startFeeAmount': e.detail.value }); },
  bindPricePerKm(e) { this.setData({ 'formData.pricePerKm': e.detail.value }); },
  bindStatusChange(e) {
    this.setData({ 'formData.ruleStatus': e.detail.value ? 'ENABLED' : 'DISABLED' });
  },

  save() {
    const f = this.data.formData;
    if (f.feeMode !== 'FREE') {
      if (!f.baseDistanceKm && f.baseDistanceKm !== 0) { wx.showToast({ title: '请填写基础距离', icon: 'none' }); return; }
      if (!f.startFeeAmount && f.startFeeAmount !== 0) { wx.showToast({ title: '请填写起步费', icon: 'none' }); return; }
      if (!f.pricePerKm && f.pricePerKm !== 0) { wx.showToast({ title: '请填写每公里费用', icon: 'none' }); return; }
    }
    load.showLoading('保存中');
    const api = f.nxDistributerDeliveryFeeRuleId ? updateDeliveryFeeRule : saveDeliveryFeeRule;
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

  deleteItem(e) {
    const id = Number(e.currentTarget.dataset.id);
    wx.showModal({
      title: '删除配送策略',
      content: '确定删除该配送策略？',
      success: (r) => {
        if (r.confirm) {
          load.showLoading('删除中');
          deleteDeliveryFeeRule(id)
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

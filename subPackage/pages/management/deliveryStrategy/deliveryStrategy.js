var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config.js'
import {
  saveDeliveryFeeRule,
  updateDeliveryFeeRule,
  getDeliveryFeeRuleList,
  deleteDeliveryFeeRule
} from '../../../../lib/apiDistributer'

var app = getApp();

const FEE_MODES = ['DISTANCE_ONLY', 'WEIGHT_DISTANCE', 'WEIGHT_ONLY', 'FIXED_AMOUNT', 'FREE'];
const FEE_MODE_TEXTS = ['纯距离', '重量+距离', '纯重量', '固定运费', '免费'];
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
    feeModeIndex: 0,
    deliveryModeIndex: 0,
    settlementIndex: 0,
    formData: {
      nxDistributerDeliveryFeeRuleId: null,
      distributerId: null,
      feeMode: 'DISTANCE_ONLY',
      baseDistanceKm: '',
      baseChargeKm: '',
      startFeeAmount: '',
      pricePerKm: '',
      pricePerJinPerKm: '',
      applyDeliveryMode: 'ALL',
      applySettlementType: 'ALL',
      ruleStatus: 'ENABLED',
      remark: ''
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
      applySettlementTypeText: this.settlementText(item.applySettlementType),
      ruleSummary: this.ruleSummary(item),
      feeAmountText: this.feeAmountText(item),
      ruleStatusText: item.ruleStatus === 'ENABLED' ? '启用' : '停用',
      modeBadgeText: this.modeBadgeText(item.feeMode)
    });
  },

  ruleSummary(item) {
    if (item.feeMode === 'FREE') return '免运费';
    if (item.feeMode === 'FIXED_AMOUNT') return '固定 ¥' + (item.startFeeAmount || '0');
    if (item.feeMode === 'WEIGHT_ONLY') {
      return '起步' + (item.baseDistanceKm || '0') + '斤 ¥' + (item.startFeeAmount || '0')
        + ' 超出¥' + (item.pricePerJinPerKm || '0') + '/斤';
    }
    if (item.feeMode === 'WEIGHT_DISTANCE') {
      return '起步' + (item.baseDistanceKm || '0') + 'km ¥' + (item.startFeeAmount || '0')
        + ' 最低' + (item.baseChargeKm || '1') + 'km ¥' + (item.pricePerJinPerKm || '0') + '/斤/km';
    }
    return '起步' + (item.baseDistanceKm || '0') + 'km ¥' + (item.startFeeAmount || '0')
      + ' 超出¥' + (item.pricePerKm || '0') + '/km';
  },

  feeAmountText(item) {
    if (item.feeMode === 'FREE') return '免费';
    return '¥' + (item.startFeeAmount || '0');
  },

  modeBadgeText(mode) {
    if (mode === 'FREE') return '免';
    if (mode === 'FIXED_AMOUNT') return '固';
    if (mode === 'WEIGHT_ONLY') return '重';
    if (mode === 'WEIGHT_DISTANCE') return '重距';
    return '距';
  },

  feeModeText(v) { return FEE_MODE_TEXTS[FEE_MODES.indexOf(v)] || v; },
  deliveryModeText(v) { return DELIVERY_MODE_TEXTS[DELIVERY_MODES.indexOf(v)] || v; },
  settlementText(v) { return SETTLEMENT_TEXTS[SETTLEMENT_TYPES.indexOf(v)] || v; },

  toAdd() {
    this.setData({
      editing: true,
      feeModeIndex: 0,
      deliveryModeIndex: 0,
      settlementIndex: 0,
      formData: {
        nxDistributerDeliveryFeeRuleId: null,
        distributerId: this.data.disId,
        feeMode: 'DISTANCE_ONLY',
        baseDistanceKm: '',
        baseChargeKm: '1',
        startFeeAmount: '',
        pricePerKm: '',
        pricePerJinPerKm: '',
        applyDeliveryMode: 'ALL',
        applySettlementType: 'ALL',
        ruleStatus: 'ENABLED',
        remark: ''
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
        baseChargeKm: item.baseChargeKm,
        startFeeAmount: item.startFeeAmount,
        pricePerKm: item.pricePerKm,
        pricePerJinPerKm: item.pricePerJinPerKm,
        applyDeliveryMode: item.applyDeliveryMode,
        applySettlementType: item.applySettlementType,
        ruleStatus: item.ruleStatus || 'ENABLED',
        remark: item.remark || ''
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
  bindBaseCharge(e) { this.setData({ 'formData.baseChargeKm': e.detail.value }); },
  bindStartFee(e) { this.setData({ 'formData.startFeeAmount': e.detail.value }); },
  bindPricePerKm(e) { this.setData({ 'formData.pricePerKm': e.detail.value }); },
  bindPricePerJinPerKm(e) { this.setData({ 'formData.pricePerJinPerKm': e.detail.value }); },
  bindRemark(e) { this.setData({ 'formData.remark': e.detail.value }); },
  bindStatusChange(e) {
    this.setData({ 'formData.ruleStatus': e.detail.value ? 'ENABLED' : 'DISABLED' });
  },

  save() {
    const f = this.data.formData;
    if (f.feeMode === 'FREE') {
      // no extra fields
    } else if (f.feeMode === 'FIXED_AMOUNT') {
      if (!f.startFeeAmount && f.startFeeAmount !== 0) { wx.showToast({ title: '请填写固定运费', icon: 'none' }); return; }
    } else if (f.feeMode === 'WEIGHT_ONLY') {
      if (!f.startFeeAmount && f.startFeeAmount !== 0) { wx.showToast({ title: '请填写起步价', icon: 'none' }); return; }
      if (!f.baseDistanceKm && f.baseDistanceKm !== 0) { wx.showToast({ title: '请填写起步重量', icon: 'none' }); return; }
      if (!f.pricePerJinPerKm && f.pricePerJinPerKm !== 0) { wx.showToast({ title: '请填写超出每斤加收', icon: 'none' }); return; }
    } else if (f.feeMode === 'WEIGHT_DISTANCE') {
      if (!f.startFeeAmount && f.startFeeAmount !== 0) { wx.showToast({ title: '请填写起步价', icon: 'none' }); return; }
      if (!f.baseDistanceKm && f.baseDistanceKm !== 0) { wx.showToast({ title: '请填写起步里程', icon: 'none' }); return; }
      if (!f.baseChargeKm && f.baseChargeKm !== 0) { wx.showToast({ title: '请填写最低计费公里', icon: 'none' }); return; }
      if (!f.pricePerJinPerKm && f.pricePerJinPerKm !== 0) { wx.showToast({ title: '请填写每斤每公里价', icon: 'none' }); return; }
    } else {
      if (!f.startFeeAmount && f.startFeeAmount !== 0) { wx.showToast({ title: '请填写起步价', icon: 'none' }); return; }
      if (!f.baseDistanceKm && f.baseDistanceKm !== 0) { wx.showToast({ title: '请填写起步里程', icon: 'none' }); return; }
      if (!f.pricePerKm && f.pricePerKm !== 0) { wx.showToast({ title: '请填写超出每公里加收', icon: 'none' }); return; }
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

var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config.js'
import {
  getDistributerCouponList,
  deleteDistributerCoupon,
  updateDistributerCouponStatus
} from '../../../../lib/apiDistributer'

var app = getApp();

const COUPON_TYPES = [0, 1];
const COUPON_TYPE_TEXTS = ['满减券', '折扣券'];
const DELIVERY_MODES = ['ALL', 'DELIVERY', 'SELF_PICKUP'];
const DELIVERY_MODE_TEXTS = ['全部', '配送', '自提'];
const SETTLEMENT_TYPES = ['ALL', 'CASH', 'ACCOUNT'];
const SETTLEMENT_TEXTS = ['全部', '现金客户', '记账客户'];
const AUDIENCE_TYPES = ['SHOP_CUSTOMER', 'JCZB_RESTAURANT', 'ALL'];
const AUDIENCE_TEXTS = ['商城客户', '精彩账本饭店', '全部客户'];
const SCOPE_TYPES = ['ALL', 'CATEGORY', 'GOODS'];
const SCOPE_TYPE_TEXTS = ['全店通用', '指定分类', '指定商品'];

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

function formatDate(date) {
  return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
}

function toDotDate(dateText) {
  return dateText ? String(dateText).replace(/-/g, '.') : '';
}

Page({
  data: {
    navBarHeight: 0,
    disId: null,
    list: [],
    today: formatDate(new Date()),
    showPreview: false,
    previewCoupon: null
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

  toAdd() {
    wx.navigateTo({
      url: '/subPackage-coupon/pages/management/distributerCoupon/couponEdit?disId=' + this.data.disId
    });
  },

  toEdit(e) {
    const id = Number(e.currentTarget.dataset.id);
    wx.navigateTo({
      url: '/subPackage-coupon/pages/management/distributerCoupon/couponEdit?disId=' + this.data.disId + '&id=' + id
    });
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
    const amountText = this.buildAmountText(item);
    const thresholdText = '满' + (item.nxDcSubtotalPrice || '0') + '元可用';
    let descText = '';
    if (item.descText) {
      descText = item.descText;
    } else if (item.nxDcType === 1) {
      const percent = item.nxDcPricePercent || '0';
      const percentNum = Number(percent);
      const percentLabel = (!isNaN(percentNum) && percentNum > 10)
        ? (percentNum / 10) + '折'
        : percent + '折';
      descText = '满' + (item.nxDcSubtotalPrice || '0') + ' 享' + percentLabel;
    } else {
      descText = '满' + (item.nxDcSubtotalPrice || '0') + ' 减' + (item.nxDcPrice || '0') + '元';
    }
    const scopeType = item.scopeType || (item.nxDcPriceGreatGrandId && item.nxDcPriceGreatGrandId !== '-1' ? 'CATEGORY' : 'ALL');
    const scopeTypeText = item.scopeLabel || SCOPE_TYPE_TEXTS[SCOPE_TYPES.indexOf(scopeType)] || '全店通用';
    const validPeriodText = this.buildValidPeriodText(item.nxDcStartDate, item.nxDcStopDate);
    return Object.assign({}, item, {
      typeText,
      amountText,
      thresholdText,
      descText,
      scopeTypeText,
      validPeriodText,
      statusText: item.nxDcStatus === 1 ? '启用' : '停用',
      applyDeliveryModeText: DELIVERY_MODE_TEXTS[DELIVERY_MODES.indexOf(item.applyDeliveryMode)] || item.applyDeliveryMode,
      applySettlementTypeText: SETTLEMENT_TEXTS[SETTLEMENT_TYPES.indexOf(item.applySettlementType)] || item.applySettlementType,
      audienceTypeText: AUDIENCE_TEXTS[AUDIENCE_TYPES.indexOf(item.audienceType)] || '商城客户'
    });
  },

  buildAmountText(item) {
    if (!item) return '¥0';
    if (item.nxDcType === 1) {
      const percent = item.nxDcPricePercent || '0';
      const n = Number(percent);
      if (!isNaN(n) && n > 10) return (n / 10) + '折';
      return percent + '折';
    }
    return '¥' + (item.nxDcPrice || '0');
  },

  buildValidPeriodText(startDate, stopDate) {
    if (!startDate && !stopDate) return '长期有效';
    if (!startDate) return '有效期至 ' + stopDate;
    if (!stopDate) return startDate + ' 起可用';
    return toDotDate(startDate) + '—' + toDotDate(stopDate);
  },

  buildPreviewCoupon(source) {
    const item = Object.assign({}, source || this.data.formData);
    const decorated = this.decorate(item);
    return Object.assign({}, decorated, {
      previewName: item.nxDistributerCouponName || '优惠券名称',
      previewAmountText: decorated.amountText,
      previewThresholdText: decorated.thresholdText,
      previewValidText: decorated.validPeriodText,
      previewScopeText: decorated.scopeTypeText || '全店通用',
      previewDescText: decorated.descText
    });
  },

  previewListItem(e) {
    const id = Number(e.currentTarget.dataset.id);
    const item = this.data.list.find(r => r.nxDistributerCouponId === id);
    if (!item) return;
    this.setData({
      previewCoupon: this.buildPreviewCoupon(item),
      showPreview: true
    });
  },

  closePreview() {
    this.setData({ showPreview: false });
  },

  noop() {},

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

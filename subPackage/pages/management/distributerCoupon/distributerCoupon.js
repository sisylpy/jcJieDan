var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config.js'
import {
  saveDistributerCoupon,
  updateDistributerCoupon,
  getDistributerCouponList,
  deleteDistributerCoupon,
  updateDistributerCouponStatus,
  getDisGoodsCataWithCount,
  queryDisGoodsByQuickSearchCollDis
} from '../../../../lib/apiDistributer'

var app = getApp();

const COUPON_TYPES = [0, 1];
const COUPON_TYPE_TEXTS = ['满减券', '折扣券'];
const DELIVERY_MODES = ['ALL', 'DELIVERY', 'SELF_PICKUP'];
const DELIVERY_MODE_TEXTS = ['全部', '配送', '自提'];
const SETTLEMENT_TYPES = ['ALL', 'CASH', 'ACCOUNT'];
const SETTLEMENT_TEXTS = ['全部', '现金客户', '记账客户'];
const SCOPE_TYPES = ['ALL', 'CATEGORY', 'GOODS'];
const SCOPE_TYPE_TEXTS = ['全店通用', '指定分类', '指定商品'];

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

function formatDate(date) {
  return date.getFullYear() + '-' + pad2(date.getMonth() + 1) + '-' + pad2(date.getDate());
}

function addDays(date, days) {
  const d = new Date(date.getTime());
  d.setDate(d.getDate() + days);
  return d;
}

function toDotDate(dateText) {
  return dateText ? String(dateText).replace(/-/g, '.') : '';
}

function parseScopeRefIds(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(Number).filter(function (n) { return !isNaN(n); });
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.map(Number).filter(function (n) { return !isNaN(n); }) : [];
  } catch (e) {
    return [];
  }
}

function flattenDisCategories(list) {
  const rows = [];
  const push = function (node) {
    if (!node || !node.nxDistributerFatherGoodsId) return;
    rows.push({
      id: node.nxDistributerFatherGoodsId,
      name: node.nxDfgFatherGoodsName || ('分类#' + node.nxDistributerFatherGoodsId)
    });
  };
  (list || []).forEach(function (greatGrand) {
    push(greatGrand);
    (greatGrand.fatherGoodsEntities || []).forEach(function (grand) {
      push(grand);
      (grand.fatherGoodsEntities || []).forEach(push);
    });
  });
  return rows.filter(function (x, idx, arr) {
    return arr.findIndex(function (y) { return y.id === x.id; }) === idx;
  });
}

function markSelectedOptions(options, selectedIds) {
  selectedIds = (selectedIds || []).map(Number);
  return (options || []).map(function (item) {
    return Object.assign({}, item, {
      selected: selectedIds.indexOf(Number(item.id)) >= 0
    });
  });
}

Page({
  data: {
    navBarHeight: 0,
    disId: null,
    list: [],
    editing: false,
    typeTexts: COUPON_TYPE_TEXTS,
    scopeTypeTexts: SCOPE_TYPE_TEXTS,
    deliveryModeTexts: DELIVERY_MODE_TEXTS,
    settlementTexts: SETTLEMENT_TEXTS,
    typeIndex: 0,
    scopeTypeIndex: 0,
    deliveryModeIndex: 0,
    settlementIndex: 0,
    scopeOptions: [],
    selectedScopeIds: [],
    selectedScopeItems: [],
    goodsSearchStr: '',
    goodsSearchResults: [],
    today: formatDate(new Date()),
    showPreview: false,
    previewCoupon: null,
    formData: {
      nxDistributerCouponId: null,
      nxDcDistributerId: null,
      nxDistributerCouponName: '',
      nxDcType: 0,
      nxDcSubtotalPrice: '',
      nxDcPrice: '',
      nxDcPricePercent: '',
      scopeType: 'ALL',
      scopeRefIds: null,
      applyDeliveryMode: 'ALL',
      applySettlementType: 'ALL',
      nxDcStartDate: '',
      nxDcStopDate: '',
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
    this.loadScopeCategories();
  },

  toBack() {
    wx.navigateBack({ delta: 1 });
  },

  loadScopeCategories() {
    if (!this.data.disId) return;
    getDisGoodsCataWithCount({ disId: this.data.disId, goodsType: 99 })
      .then(res => {
        if (res.result.code !== 0) return;
        const list = (res.result.data && res.result.data.list) || [];
        this._scopeCata = list;
        if (this.data.formData.scopeType === 'CATEGORY') {
          this.setData({ scopeOptions: markSelectedOptions(flattenDisCategories(list), this.data.selectedScopeIds) });
        }
      })
      .catch(function () {});
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
      applySettlementTypeText: SETTLEMENT_TEXTS[SETTLEMENT_TYPES.indexOf(item.applySettlementType)] || item.applySettlementType
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

  resetScopeSelection() {
    this.setData({
      selectedScopeIds: [],
      selectedScopeItems: [],
      goodsSearchStr: '',
      goodsSearchResults: []
    });
  },

  toAdd() {
    this.resetScopeSelection();
    const today = formatDate(new Date());
    const stopDate = formatDate(addDays(new Date(), 7));
    this.setData({
      editing: true,
      typeIndex: 0,
      scopeTypeIndex: 0,
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
        scopeType: 'ALL',
        scopeRefIds: null,
        applyDeliveryMode: 'ALL',
        applySettlementType: 'ALL',
        nxDcStartDate: today,
        nxDcStopDate: stopDate,
        nxDcStatus: 1
      }
    });
  },

  toEdit(e) {
    const id = Number(e.currentTarget.dataset.id);
    const item = this.data.list.find(r => r.nxDistributerCouponId === id);
    if (!item) return;
    const scopeType = item.scopeType || (item.nxDcPriceGreatGrandId && item.nxDcPriceGreatGrandId !== '-1' ? 'CATEGORY' : 'ALL');
    const selectedScopeIds = parseScopeRefIds(item.scopeRefIds);
    if (!selectedScopeIds.length && item.nxDcPriceGreatGrandId && item.nxDcPriceGreatGrandId !== '-1') {
      selectedScopeIds.push(Number(item.nxDcPriceGreatGrandId));
    }
    this.setData({
      editing: true,
      typeIndex: Math.max(0, COUPON_TYPES.indexOf(item.nxDcType)),
      scopeTypeIndex: Math.max(0, SCOPE_TYPES.indexOf(scopeType)),
      deliveryModeIndex: Math.max(0, DELIVERY_MODES.indexOf(item.applyDeliveryMode)),
      settlementIndex: Math.max(0, SETTLEMENT_TYPES.indexOf(item.applySettlementType)),
      selectedScopeIds: selectedScopeIds,
      selectedScopeItems: selectedScopeIds.map(function (sid, idx) {
        var name = item.scopeNames && item.scopeNames[idx] ? item.scopeNames[idx] : ((scopeType === 'CATEGORY' ? '分类#' : '商品#') + sid);
        return { id: sid, name: name };
      }),
      goodsSearchStr: '',
      goodsSearchResults: [],
      formData: {
        nxDistributerCouponId: item.nxDistributerCouponId,
        nxDcDistributerId: item.nxDcDistributerId || this.data.disId,
        nxDistributerCouponName: item.nxDistributerCouponName,
        nxDcType: item.nxDcType,
        nxDcSubtotalPrice: item.nxDcSubtotalPrice,
        nxDcPrice: item.nxDcPrice,
        nxDcPricePercent: item.nxDcPricePercent,
        scopeType: scopeType,
        scopeRefIds: item.scopeRefIds,
        applyDeliveryMode: item.applyDeliveryMode,
        applySettlementType: item.applySettlementType,
        nxDcStartDate: item.nxDcStartDate || '',
        nxDcStopDate: item.nxDcStopDate || '',
        nxDcStatus: item.nxDcStatus === 1 ? 1 : 0
      }
    }, () => {
      if (scopeType === 'CATEGORY') {
        this.setData({ scopeOptions: markSelectedOptions(flattenDisCategories(this._scopeCata || []), this.data.selectedScopeIds) });
        this.syncCategoryScopeItems();
      }
      if (scopeType === 'GOODS') {
        this.syncGoodsScopeItems();
      }
    });
  },

  syncCategoryScopeItems() {
    const map = {};
    (this.data.scopeOptions || []).forEach(function (o) { map[o.id] = o; });
    const items = (this.data.selectedScopeIds || []).map(function (id) {
      return map[id] || { id: id, name: '分类#' + id };
    });
    this.setData({
      selectedScopeItems: items,
      scopeOptions: markSelectedOptions(this.data.scopeOptions, this.data.selectedScopeIds)
    });
  },

  syncGoodsScopeItems() {
    const items = (this.data.selectedScopeIds || []).map(function (id) {
      const found = (this.data.selectedScopeItems || []).find(function (x) { return x.id === id; });
      return found || { id: id, name: '商品#' + id };
    }.bind(this));
    this.setData({ selectedScopeItems: items });
  },

  cancelEdit() {
    this.setData({ editing: false });
  },

  bindName(e) { this.setData({ 'formData.nxDistributerCouponName': e.detail.value }); },
  bindTypeChange(e) {
    const i = Number(e.detail.value);
    this.setData({ typeIndex: i, 'formData.nxDcType': COUPON_TYPES[i] });
  },
  bindScopeTypeChange(e) {
    const i = Number(e.detail.value);
    const scopeType = SCOPE_TYPES[i];
    this.resetScopeSelection();
    this.setData({
      scopeTypeIndex: i,
      'formData.scopeType': scopeType,
      'formData.scopeRefIds': null
    });
    if (scopeType === 'CATEGORY') {
      this.setData({ scopeOptions: markSelectedOptions(flattenDisCategories(this._scopeCata || []), []) });
    }
  },
  bindSubtotal(e) { this.setData({ 'formData.nxDcSubtotalPrice': e.detail.value }); },
  bindPrice(e) { this.setData({ 'formData.nxDcPrice': e.detail.value }); },
  bindPercent(e) { this.setData({ 'formData.nxDcPricePercent': e.detail.value }); },
  bindStartDate(e) { this.setData({ 'formData.nxDcStartDate': e.detail.value }); },
  bindStopDate(e) { this.setData({ 'formData.nxDcStopDate': e.detail.value }); },
  bindDeliveryModeChange(e) {
    const i = Number(e.detail.value);
    this.setData({ deliveryModeIndex: i, 'formData.applyDeliveryMode': DELIVERY_MODES[i] });
  },
  bindSettlementChange(e) {
    const i = Number(e.detail.value);
    this.setData({ settlementIndex: i, 'formData.applySettlementType': SETTLEMENT_TYPES[i] });
  },

  toggleScopeId(e) {
    const id = Number(e.currentTarget.dataset.id);
    const name = e.currentTarget.dataset.name || ('#' + id);
    let ids = (this.data.selectedScopeIds || []).slice();
    let items = (this.data.selectedScopeItems || []).slice();
    const idx = ids.indexOf(id);
    if (idx >= 0) {
      ids.splice(idx, 1);
      items = items.filter(function (x) { return x.id !== id; });
    } else {
      ids.push(id);
      items.push({ id: id, name: name });
    }
    this.setData({
      selectedScopeIds: ids,
      selectedScopeItems: items,
      scopeOptions: markSelectedOptions(this.data.scopeOptions, ids),
      'formData.scopeRefIds': ids.length ? JSON.stringify(ids) : null
    });
  },

  bindGoodsSearchInput(e) {
    this.setData({ goodsSearchStr: e.detail.value });
  },

  searchGoods() {
    const keyword = (this.data.goodsSearchStr || '').trim();
    if (!keyword) {
      wx.showToast({ title: '请输入商品名称', icon: 'none' });
      return;
    }
    load.showLoading('搜索中');
    queryDisGoodsByQuickSearchCollDis({ searchStr: keyword, disId: this.data.disId })
      .then(res => {
        load.hideLoading();
        if (res.result.code !== 0) {
          wx.showToast({ title: res.result.msg || '搜索失败', icon: 'none' });
          return;
        }
        const disArr = (res.result.data && res.result.data.disArr) || [];
        const results = disArr.map(function (g) {
          return {
            id: g.nxDistributerGoodsId,
            name: g.nxDgGoodsName || ('商品#' + g.nxDistributerGoodsId),
            standard: g.nxDgGoodsStandardname || '',
            selected: (this.data.selectedScopeIds || []).map(Number).indexOf(Number(g.nxDistributerGoodsId)) >= 0
          };
        }.bind(this)).filter(function (x) { return x.id; });
        this.setData({ goodsSearchResults: results });
      })
      .catch(function () { load.hideLoading(); });
  },

  toggleGoodsResult(e) {
    const id = Number(e.currentTarget.dataset.id);
    const name = e.currentTarget.dataset.name || ('商品#' + id);
    let ids = (this.data.selectedScopeIds || []).slice();
    let items = (this.data.selectedScopeItems || []).slice();
    const idx = ids.indexOf(id);
    if (idx >= 0) {
      ids.splice(idx, 1);
      items = items.filter(function (x) { return x.id !== id; });
    } else {
      ids.push(id);
      items.push({ id: id, name: name });
    }
    this.setData({
      selectedScopeIds: ids,
      selectedScopeItems: items,
      goodsSearchResults: markSelectedOptions(this.data.goodsSearchResults, ids),
      'formData.scopeRefIds': ids.length ? JSON.stringify(ids) : null
    });
  },

  previewCurrentForm() {
    this.setData({
      previewCoupon: this.buildPreviewCoupon(this.data.formData),
      showPreview: true
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

  save() {
    const f = Object.assign({}, this.data.formData);
    if (!f.nxDistributerCouponName) { wx.showToast({ title: '请填写优惠券名称', icon: 'none' }); return; }
    if (!f.nxDcSubtotalPrice && f.nxDcSubtotalPrice !== 0) { wx.showToast({ title: '请填写门槛金额', icon: 'none' }); return; }
    if (f.nxDcType === 0 && (!f.nxDcPrice && f.nxDcPrice !== 0)) { wx.showToast({ title: '请填写满减金额', icon: 'none' }); return; }
    if (f.nxDcType === 1 && (!f.nxDcPricePercent && f.nxDcPricePercent !== 0)) { wx.showToast({ title: '请填写折扣率', icon: 'none' }); return; }
    if (f.scopeType !== 'ALL' && !(this.data.selectedScopeIds && this.data.selectedScopeIds.length)) {
      wx.showToast({ title: f.scopeType === 'GOODS' ? '请选择适用商品' : '请选择适用分类', icon: 'none' });
      return;
    }
    if (f.nxDcStartDate && f.nxDcStopDate && f.nxDcStartDate > f.nxDcStopDate) {
      wx.showToast({ title: '开始日期不能晚于截止日期', icon: 'none' });
      return;
    }
    if (f.scopeType === 'ALL') {
      f.scopeRefIds = null;
    } else {
      f.scopeRefIds = JSON.stringify(this.data.selectedScopeIds);
    }
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

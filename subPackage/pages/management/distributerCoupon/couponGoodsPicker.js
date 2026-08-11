var load = require('../../../../lib/load.js');
import { queryDisGoodsAndNxGoodsByQuickSearch } from '../../../../lib/apiDistributer'

var app = getApp();

function markSelected(results, selectedIds) {
  selectedIds = (selectedIds || []).map(Number);
  return (results || []).map(function (g) {
    return Object.assign({}, g, {
      selected: selectedIds.indexOf(Number(g.id)) >= 0
    });
  });
}

Page({
  data: {
    navBarHeight: 0,
    disId: null,
    channel: null,
    searchStr: '',
    results: [],
    selectedIds: [],
    selectedItems: [],
    empty: false
  },

  onLoad(options) {
    const globalData = app.globalData;
    this.setData({
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      disId: options.disId ? Number(options.disId) : null
    });
    let channel = null;
    try {
      if (typeof wx.getOpenerEventChannel === 'function') {
        channel = wx.getOpenerEventChannel();
      }
    } catch (e) {}
    if (!channel) {
      const pages = getCurrentPages();
      const prev = pages[pages.length - 2];
      if (prev && typeof prev.getOpenerEventChannel === 'function') {
        channel = prev.getOpenerEventChannel();
      }
    }
    if (channel && typeof channel.on === 'function') {
      this._channel = channel;
      channel.on('initSelected', (data) => {
        const ids = (data.selectedIds || []).slice();
        const items = (data.selectedItems || []).slice();
        this.setData({ selectedIds: ids, selectedItems: items });
      });
    }
  },

  toBack() {
    wx.navigateBack({ delta: 1 });
  },

  bindSearchInput(e) {
    this.setData({ searchStr: e.detail.value });
  },

  search() {
    const keyword = (this.data.searchStr || '').trim();
    if (!keyword) {
      wx.showToast({ title: '请输入商品名称', icon: 'none' });
      return;
    }
    load.showLoading('搜索中');
    queryDisGoodsAndNxGoodsByQuickSearch({ searchStr: keyword, disId: this.data.disId })
      .then(res => {
        load.hideLoading();
        if (res.result.code !== 0) {
          wx.showToast({ title: res.result.msg || '搜索失败', icon: 'none' });
          return;
        }
        const disArr = (res.result.data && res.result.data.disArr) || [];
        const nxArr = (res.result.data && res.result.data.nxArr) || [];
        const allList = disArr.concat(nxArr);
        const results = allList
          .filter(function (g) { return g.nxDistributerGoodsId; })
          .map(function (g) {
            const standardname = (g.nxDgGoodsStandardname && g.nxDgGoodsStandardname !== 'null') ? g.nxDgGoodsStandardname : '';
            const weight = (g.nxDgGoodsStandardWeight && g.nxDgGoodsStandardWeight !== 'null') ? g.nxDgGoodsStandardWeight : '';
            const cartonUnit = (g.nxDgCartonUnit && g.nxDgCartonUnit !== 'null') ? g.nxDgCartonUnit : '';
            const itemsPerCarton = (g.nxDgItemsPerCarton && g.nxDgItemsPerCarton !== 'null') ? g.nxDgItemsPerCarton : '';
            const price = (g.nxDgWillPriceOne && g.nxDgWillPriceOne !== 'null') ? g.nxDgWillPriceOne : '';
            const priceTwo = (g.nxDgWillPriceTwo && g.nxDgWillPriceTwo !== 'null') ? g.nxDgWillPriceTwo : '';
            const priceTwoStandard = (g.nxDgWillPriceTwoStandard && g.nxDgWillPriceTwoStandard !== 'null') ? g.nxDgWillPriceTwoStandard : '';
            return {
              id: g.nxDistributerGoodsId,
              name: g.nxDgGoodsName || ('商品#' + g.nxDistributerGoodsId),
              brand: (g.nxDgGoodsBrand && g.nxDgGoodsBrand !== 'null') ? g.nxDgGoodsBrand : '',
              place: (g.nxDgGoodsPlace && g.nxDgGoodsPlace !== 'null') ? g.nxDgGoodsPlace : '',
              detail: (g.nxDgGoodsDetail && g.nxDgGoodsDetail !== 'null') ? g.nxDgGoodsDetail : '',
              weight: weight,
              standardname: standardname,
              cartonUnit: cartonUnit,
              itemsPerCarton: itemsPerCarton,
              price: price,
              priceTwo: priceTwo,
              priceTwoStandard: priceTwoStandard
            };
          });
        this.setData({
          results: markSelected(results, this.data.selectedIds),
          empty: results.length === 0
        });
      })
      .catch(function () { load.hideLoading(); });
  },

  toggleResult(e) {
    const id = Number(e.currentTarget.dataset.id);
    const name = e.currentTarget.dataset.name || ('商品#' + id);
    let ids = (this.data.selectedIds || []).slice();
    let items = (this.data.selectedItems || []).slice();
    const idx = ids.indexOf(id);
    if (idx >= 0) {
      ids.splice(idx, 1);
      items = items.filter(function (x) { return x.id !== id; });
    } else {
      ids.push(id);
      items.push({ id: id, name: name });
    }
    this.setData({
      selectedIds: ids,
      selectedItems: items,
      results: markSelected(this.data.results, ids)
    });
  },

  done() {
    const channel = this._channel;
    if (channel && typeof channel.emit === 'function') {
      channel.emit('onSelected', {
        selectedIds: this.data.selectedIds,
        selectedItems: this.data.selectedItems
      });
    }
    wx.navigateBack({ delta: 1 });
  }
})

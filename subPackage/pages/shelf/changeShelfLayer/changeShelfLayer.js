var load = require('../../../../lib/load.js');
var app = getApp();

import { getShelfGoods } from '../../../../lib/apiDistributer';

const PAGE_LIMIT = 30;
const SHELF_GOODS_TYPE = '99';

Page({
  data: {
    disId: '',
    shelfId: '',
    shelfName: '',
    navBarHeight: 0,
    scrollH: 600,
    url: '',
    adjustShelfGoods: null,
    shelfGoodsList: [],
    currentPage: 1,
    totalPage: 1,
    listLoading: false,
    listLoadingMore: false,
  },

  onLoad(options) {
    const globalData = app.globalData;
    const shelfId = options.shelfId != null ? String(options.shelfId) : '';
    const disId = options.disId != null ? String(options.disId) : '';
    let shelfName = '';
    if (options.shelfName) {
      try {
        shelfName = decodeURIComponent(options.shelfName);
      } catch (e) {
        shelfName = options.shelfName;
      }
    }

    const navH = globalData.navBarHeight * globalData.rpxR;
    const winH = globalData.windowHeight * globalData.rpxR;

    this._eventChannel = this.getOpenerEventChannel && this.getOpenerEventChannel();
    if (this._eventChannel && typeof this._eventChannel.on === 'function') {
      this._eventChannel.on('initAdjustGoods', (data) => {
        if (!data) {
          return;
        }
        var patch = { url: data.url || '' };
        if (data.shelfGoods && data.shelfGoods.nxDistributerGoodsEntity) {
          var sg = data.shelfGoods;
          patch.adjustShelfGoods = Object.assign({}, sg, {
            sameShelfGoods: Array.isArray(sg.sameShelfGoods) ? sg.sameShelfGoods : [],
          });
        }
        this.setData(patch);
      });
    }

    this.setData({
      navBarHeight: navH,
      scrollH: Math.max(400, winH - navH),
      shelfId,
      disId,
      shelfName,
    });

    if (!shelfId) {
      wx.showToast({ title: '缺少货架参数', icon: 'none' });
      return;
    }

    this._loadPage(1, false);
  },

  _loadPage(page, append) {
    if (this.data.listLoading || this.data.listLoadingMore) {
      return;
    }
    const isFirst = page === 1 && !append;
    if (isFirst) {
      this.setData({ listLoading: true });
    } else {
      this.setData({ listLoadingMore: true });
    }

    getShelfGoods({
      shelfId: this.data.shelfId,
      page,
      limit: PAGE_LIMIT,
      shelfGoodsType: SHELF_GOODS_TYPE,
    })
      .then((res) => {
        if (res.result.code !== 0) {
          wx.showToast({
            title: res.result.msg || '加载失败',
            icon: 'none',
          });
          return;
        }
        const pageData = res.result.page || {};
        const list = (pageData.list || []).map((row) =>
          Object.assign({}, row, {
            sameShelfGoods: Array.isArray(row.sameShelfGoods) ? row.sameShelfGoods : [],
          })
        );
        const totalPage = Math.max(1, Number(pageData.totalPage) || 1);
        const currPage = pageData.currPage != null ? Number(pageData.currPage) : page;
        const merged = append ? (this.data.shelfGoodsList || []).concat(list) : list;
        this.setData({
          shelfGoodsList: merged,
          currentPage: currPage,
          totalPage,
        });
      })
      .catch(() => {
        wx.showToast({ title: '网络错误', icon: 'none' });
      })
      .then(() => {
        this.setData({
          listLoading: false,
          listLoadingMore: false,
        });
      });
  },

  onScrollToLower() {
    if (this.data.currentPage >= this.data.totalPage) {
      return;
    }
    if (this.data.listLoading || this.data.listLoadingMore) {
      return;
    }
    this._loadPage(this.data.currentPage + 1, true);
  },

  onPickAnchor(e) {
    const index = Number(e.currentTarget.dataset.index);
    const list = this.data.shelfGoodsList || [];
    const item = list[index];
    if (!item) {
      return;
    }

    var shelfGoodsId = this.data.adjustShelfGoods.nxDistributerGoodsShelfGoodsId;
    var itemShelfGoodsId = item.nxDistributerGoodsShelfGoodsId;
    if(shelfGoodsId == itemShelfGoodsId){
      wx.showToast({
        title: '移动位置没有变化',
        icon :'none'
      })
      return;
    }
    
    const clickedSort = item.nxDgsgSort != null ? Number(item.nxDgsgSort) : 0;
    const nxDgsgSort = clickedSort + 1;
    const nxDgsgShelfLayer =
      item.nxDgsgShelfLayer != null && item.nxDgsgShelfLayer !== ''
        ? Number(item.nxDgsgShelfLayer)
        : 0;
    const nxDgsgShelfLayerLast =
      item.nxDgsgShelfLayerLast != null && item.nxDgsgShelfLayerLast !== ''
        ? Number(item.nxDgsgShelfLayerLast)
        : 0;

    const goodsName =
      item.nxDistributerGoodsEntity && item.nxDistributerGoodsEntity.nxDgGoodsName
        ? item.nxDistributerGoodsEntity.nxDgGoodsName
        : '';

    const payload = {
      shelfId: Number(this.data.shelfId),
      shelfName: this.data.shelfName || '',
      nxDgsgSort,
      nxDgsgShelfLayer,
      nxDgsgShelfLayerLast,
      goodsName,
    };

    if (this._eventChannel && typeof this._eventChannel.emit === 'function') {
      this._eventChannel.emit('shelfAnchorPicked', payload);
    }
    wx.navigateBack({ delta: 1 });
  },

  toBack() {
    wx.navigateBack({ delta: 1 });
  },
});

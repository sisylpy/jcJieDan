var load = require('../../../../lib/load.js');
var app = getApp()

import apiUrl from '../../../../config.js'
import {
  disGetShelfList,
  addShelfGoods,
  updateShelfGoods
} from '../../../../lib/apiDistributer'

Page({

  data: {
    isAddMode: false,
    selectedShelfId: null,
    selectedShelfName: '',
    sort: 0,
    anchorPicked: false,
    anchorNxDgsgSort: null,
    anchorNxDgsgShelfLayer: null,
    anchorNxDgsgShelfLayerLast: null,
    anchorGoodsName: '',
    /** 仅下一页选择参照商品返回后为 true，才可保存 */
    canSave: false,
  },

  onLoad: function (options) {
    const globalData = app.globalData;


    this.setData({
     windowWidth: globalData.windowWidth * globalData.rpxR,
        windowHeight: globalData.windowHeight * globalData.rpxR,
        navBarHeight: globalData.navBarHeight * globalData.rpxR,
        disId: options.disId

    })

    var shelf = wx.getStorageSync('shelfItem');
    var disGoods = wx.getStorageSync('goodsItem');
    var shelfGoods = wx.getStorageSync('shelfGoods');

    var isAddMode = !shelfGoods && disGoods;

    if(disGoods){
      this.setData({
        disGoods: disGoods
      })
    }
    if(shelfGoods){
      this.setData({
        shelfGoods: shelfGoods
      })
    }

    if (isAddMode) {
      this.setData({
        shelf: null,
        selectedShelfId: null,
        selectedShelfName: '',
        anchorPicked: false,
        canSave: false,
      });
      wx.removeStorageSync('shelfItem');
    } else if (shelfGoods) {
      var currentShelfId = shelfGoods.nxDgsgShelfId;
      this.setData({
        selectedShelfId: currentShelfId,
        anchorPicked: false,
        canSave: false,
        anchorNxDgsgSort: null,
        anchorNxDgsgShelfLayer: null,
        anchorNxDgsgShelfLayerLast: null,
        anchorGoodsName: '',
      });

      if (shelf && shelf.nxDistributerGoodsShelfId === currentShelfId) {
        this.setData({
          shelf: shelf,
          selectedShelfName: shelf.nxDistributerGoodsShelfName || '',
        });
      } else {
        this.setData({
          currentShelfId: currentShelfId
        });
      }
    }

    this.setData({
      isAddMode: isAddMode
    });

    if (isAddMode) {
      this.setData({
        sort: 0
      });
    }

    this._initData();
  },

  _initData(){
    disGetShelfList(this.data.disId)
    .then(res =>{
      if(res.result.code == 0){
        var shelfArr = res.result.data.shelfArr || [];
        this.setData({
          shelfArr: shelfArr
        });

        if (this.data.isAddMode) {
          return;
        }

        var currentShelfId = null;
        if (this.data.shelfGoods && this.data.shelfGoods.nxDgsgShelfId) {
          currentShelfId = this.data.shelfGoods.nxDgsgShelfId;
        } else if (this.data.currentShelfId) {
          currentShelfId = this.data.currentShelfId;
        } else if (this.data.shelf) {
          currentShelfId = this.data.shelf.nxDistributerGoodsShelfId;
        }

        if (currentShelfId) {
          var foundShelf = shelfArr.find(item =>
            item.nxDistributerGoodsShelfId === currentShelfId
          );
          if (foundShelf) {
            this.setData({
              shelf: foundShelf,
              selectedShelfName: foundShelf.nxDistributerGoodsShelfName || this.data.selectedShelfName,
            });
          }
        }
      }
    })
  },

  openShelfLayer(e) {
    var shelfId = e.currentTarget.dataset.id;
    var shelfName = e.currentTarget.dataset.name || '';
    if (!shelfId) {
      return;
    }
    var url =
      '../changeShelfLayer/changeShelfLayer?disId=' +
      encodeURIComponent(this.data.disId) +
      '&shelfId=' +
      encodeURIComponent(shelfId) +
      '&shelfName=' +
      encodeURIComponent(shelfName);

    var self = this;
    wx.navigateTo({
      url: url,
      success(res) {
        if (!res.eventChannel || typeof res.eventChannel.emit !== 'function') {
          return;
        }
        var payload = {
          url: apiUrl.server,
          shelfGoods: null,
        };
        if (self.data.isAddMode && self.data.disGoods) {
          var dg = self.data.disGoods;
          payload.shelfGoods = {
            nxDistributerGoodsEntity: dg,
            sameShelfGoods: Array.isArray(dg.sameShelfGoods) ? dg.sameShelfGoods : [],
            nxDisGoodsShelfStockEntities: Array.isArray(dg.nxDisGoodsShelfStockEntities)
              ? dg.nxDisGoodsShelfStockEntities
              : null,
          };
        } else if (!self.data.isAddMode && self.data.shelfGoods) {
          var sg = self.data.shelfGoods;
          payload.shelfGoods = Object.assign({}, sg, {
            sameShelfGoods: Array.isArray(sg.sameShelfGoods) ? sg.sameShelfGoods : [],
          });
        }
        res.eventChannel.emit('initAdjustGoods', payload);
      },
      events: {
        shelfAnchorPicked: (data) => {
          if (!data) {
            return;
          }
          var sid = data.shelfId;
          var found = (this.data.shelfArr || []).find(
            (s) => s.nxDistributerGoodsShelfId == sid
          );
          this.setData({
            selectedShelfId: sid,
            selectedShelfName: data.shelfName || (found && found.nxDistributerGoodsShelfName) || '',
            shelf: found || {
              nxDistributerGoodsShelfId: sid,
              nxDistributerGoodsShelfName: data.shelfName || shelfName,
            },
            anchorNxDgsgSort: data.nxDgsgSort != null ? Number(data.nxDgsgSort) : 0,
            anchorNxDgsgShelfLayer:
              data.nxDgsgShelfLayer != null && data.nxDgsgShelfLayer !== ''
                ? Number(data.nxDgsgShelfLayer)
                : 0,
            anchorNxDgsgShelfLayerLast:
              data.nxDgsgShelfLayerLast != null && data.nxDgsgShelfLayerLast !== ''
                ? Number(data.nxDgsgShelfLayerLast)
                : 0,
            anchorGoodsName: data.goodsName || '',
            anchorPicked: true,
            canSave: true,
          });
        },
      },
    });
  },

  onSaveTap() {
    if (!this.data.canSave) {
      wx.showToast({
        title: '请先进入货架并选择参照商品',
        icon: 'none',
      });
      return;
    }
    this.save();
  },

  save(){
    this._addShelfGoods();
  },

  _addShelfGoods() {
    var targetShelfId = this.data.selectedShelfId;

    if (!targetShelfId && !this.data.isAddMode && this.data.shelfGoods) {
      targetShelfId = this.data.shelfGoods.nxDgsgShelfId;
    }

    if (!targetShelfId) {
      wx.showToast({
        title: '请点击货架选择位置',
        icon: 'none'
      });
      return;
    }

    if (!this.data.anchorPicked) {
      wx.showToast({
        title: '请选择参照货架商品',
        icon: 'none'
      });
      return;
    }

    var goodsEntity = null;
    if (this.data.isAddMode) {
      goodsEntity = this.data.disGoods;
    } else if (this.data.shelfGoods && this.data.shelfGoods.nxDistributerGoodsEntity) {
      goodsEntity = this.data.shelfGoods.nxDistributerGoodsEntity;
    }

    if (!goodsEntity) {
      wx.showToast({
        title: '商品信息不存在',
        icon: 'none'
      });
      return;
    }

    var shelfItem = this.data.shelfArr.find(item =>
      item.nxDistributerGoodsShelfId == targetShelfId
    );

    if (!shelfItem) {
      wx.showToast({
        title: '货架信息不存在',
        icon: 'none'
      });
      return;
    }

    var shelfGoodsItem = {
      nxDgsgDisGoodsId: goodsEntity.nxDistributerGoodsId,
      nxDgsgShelfId: Number(targetShelfId),
      nxDistributerGoodsEntity: goodsEntity,
      nxDgsgSort: Number(this.data.anchorNxDgsgSort),
      nxDgsgShelfSort: shelfItem.nxDistributerGoodsShelfSort || 0,
      nxDgsgShelfLayer: Number(this.data.anchorNxDgsgShelfLayer),
      nxDgsgShelfLayerLast: Number(this.data.anchorNxDgsgShelfLayerLast),
    };

    load.showLoading(this.data.isAddMode ? '添加货架商品' : '更新货架商品');

    if (this.data.isAddMode) {
      var temp = [];
      temp.push(shelfGoodsItem);

      addShelfGoods(temp).then(res => {
        load.hideLoading();
        if(res.result.code == 0){
          var pages = getCurrentPages();
          var prevPage = pages[pages.length - 2];
          if (prevPage && typeof prevPage.setData === 'function') {
            prevPage.setData({
              update: true
            });
          }
          wx.showToast({
            title: '添加成功',
            icon: 'success'
          });
          wx.navigateBack({delta: 1});
        } else {
          wx.showToast({
            title: res.result.msg || '添加失败',
            icon: 'none'
          });
        }
      }).catch(err => {
        load.hideLoading();
        wx.showToast({
          title: '添加失败，请重试',
          icon: 'none'
        });
      });
    } else {
      if (!this.data.shelfGoods || !this.data.shelfGoods.nxDistributerGoodsShelfGoodsId) {
        load.hideLoading();
        wx.showToast({
          title: '货架商品ID不存在，无法更新',
          icon: 'none'
        });
        return;
      }

      shelfGoodsItem.nxDistributerGoodsShelfGoodsId = this.data.shelfGoods.nxDistributerGoodsShelfGoodsId;

      updateShelfGoods(shelfGoodsItem).then(res => {
        load.hideLoading();
        if(res.result.code == 0){
          var pages = getCurrentPages();
          var prevPage = pages[pages.length - 2];
          if (prevPage && typeof prevPage.setData === 'function') {
            prevPage.setData({
              update: true
            });
          }
          wx.showToast({
            title: '更新成功',
            icon: 'success'
          });
          wx.navigateBack({delta: 1});
        } else {
          wx.showToast({
            title: res.result.msg || '更新失败',
            icon: 'none'
          });
        }
      }).catch(err => {
        load.hideLoading();
        wx.showToast({
          title: '更新失败，请重试',
          icon: 'none'
        });
      });
    }
  },

  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },


})

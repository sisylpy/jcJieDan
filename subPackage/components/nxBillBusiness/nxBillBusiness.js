const globalData = getApp().globalData;
var load = require('../../../lib/load.js');

import apiUrl from '../../../config.js'
import {
  disGetConfirmBills,
} from '../../../lib/apiDistributer'

import {
  finishPayPurchaseBatchGb
} from '../../../lib/apiDepOrder'


Component({

  options: {
    addGlobalClass: true
  },

  properties: {
    disId: { type: Number, value: 0 },
    active: { type: Boolean, value: true },
  },

  data: {
    selAmount: 0,
    total: 0,
    selectArr: [],
    isAllSelected: false,
    selectedCount: 0,
    arr: [],
    isTishi: false,
    windowWidth: 0,
    windowHeight: 0,
    navBarHeight: 0,
    url: '',
  },

  lifetimes: {
    attached() {
      const g = getApp().globalData;
      this.setData({
        windowWidth: g.windowWidth * g.rpxR,
        windowHeight: g.windowHeight * g.rpxR,
        navBarHeight: g.navBarHeight * g.rpxR,
        url: apiUrl.server,
      });
      this._initData();
    }
  },

  pageLifetimes: {
    show() {
      if (this.data.active) this._initData();
    }
  },

  observers: {
    'active': function (active) {
      if (active) this._initData();
    }
  },

  methods: {

    _resolveDisId() {
      if (this.data.disId) return this.data.disId;
      const value = wx.getStorageSync('userInfo');
      return value && value.nxDistributerEntity ? value.nxDistributerEntity.nxDistributerId : 0;
    },

    _initData() {
      const disId = this._resolveDisId();
      if (!disId) return;
      load.showLoading("获取账单");
      disGetConfirmBills(disId).then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          const arr = res.result.data.map(item => ({
            ...item,
            isSelect: false
          }));
          this.setData({
            arr: arr,
            selectArr: [],
            isAllSelected: false,
            selectedCount: 0
          })
        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
          this.setData({
            arr: []
          })
        }
      })
    },

    selectBill(e) {
      var index = e.currentTarget.dataset.index;
      var isSelect = e.detail.value;
      var arr = this.data.arr;
      var item = arr[index];
      var selectArr = this.data.selectArr;

      arr[index].isSelect = isSelect;

      if (isSelect) {
        selectArr.push(item);
      } else {
        var selectId = item.gbDistributerPurchaseBatchId;
        selectArr.splice(selectArr.findIndex(item => item.gbDistributerPurchaseBatchId === selectId), 1);
      }

      const selectedCount = selectArr.length;
      const isAllSelected = selectedCount === arr.length;

      this.setData({
        arr: arr,
        selectArr: selectArr,
        selectedCount: selectedCount,
        isAllSelected: isAllSelected
      });

      this._countTotal();
    },

    _countTotal() {
      var selectArr = this.data.selectArr;
      var temp = 0;
      for (var i = 0; i < selectArr.length; i++) {
        var itemTotal = Number(selectArr[i].gbDpbSubtotal);

        if (selectArr[i].gbDpbPurchaseType == 9) {
          temp = temp - itemTotal;
        } else {
          temp = temp + itemTotal;
        }
      }
      this.setData({
        total: temp.toFixed(1),
        selAmount: selectArr.length
      })
    },

    selectAllBills(e) {
      const isAllSelected = e.detail.value;
      const arr = this.data.arr;
      const selectArr = [];

      arr.forEach(item => {
        item.isSelect = isAllSelected;
        if (isAllSelected) {
          selectArr.push(item);
        }
      });

      this.setData({
        arr: arr,
        selectArr: selectArr,
        isAllSelected: isAllSelected,
        selectedCount: isAllSelected ? arr.length : 0
      });

      this._countTotal();
    },

    clearAllSelection() {
      const arr = this.data.arr;

      arr.forEach(item => {
        item.isSelect = false;
      });

      this.setData({
        arr: arr,
        selectArr: [],
        isAllSelected: false,
        selectedCount: 0
      });

      this._countTotal();
    },

    settleBills() {
      this.setData({
        isTishi: true,
      })
    },

    cancleSettle() {
      this.setData({
        isTishi: false,
        selAmount: 0,
      })
      this._initData();
    },

    settleAccount() {
      load.showLoading("结算订单");

      const selectArr = this.data.selectArr;
      if (selectArr.length === 0) {
        wx.showToast({
          title: '请选择要结算的订单',
          icon: 'none'
        });
        return;
      }

      const params = {
        ids: selectArr.map(item => item.gbDistributerPurchaseBatchId).join(','),
        gbDisId: this.data.gbDisId || this.data.disInfo?.gbDistributerId,
        total: this.data.total,
        supplierId: this.data.supplierId,
        userId: this.data.jrdhUserInfo.nxJrdhUserId
      };

      finishPayPurchaseBatchGb(params).then(res => {
        load.hideLoading();
        this.setData({
          isTishi: false,
          selAmount: 0,
          total: ""
        })
        if (res.result.code == 0) {
          wx.showToast({
            title: '结算成功',
            icon: 'success'
          });
          this._initData();
        } else {
          wx.showToast({
            title: res.result.msg || '结算失败',
            icon: 'none'
          });
        }
      }).catch(err => {
        load.hideLoading();
        wx.showToast({
          title: '结算失败，请重试',
          icon: 'none'
        });
        console.error('结算失败:', err);
      });
    },

    toDetail(e) {
      var nxDisBill = e.currentTarget.dataset.item;
      wx.setStorageSync('batchItem', nxDisBill);

      wx.navigateTo({
        url: '/subPackage/pages/offerNx/nxDisBillDetail/nxDisBillDetail?billId=' + e.currentTarget.dataset.id
          + '&requestDisId=' + nxDisBill.nxDbdOrderDisId + '&total=' + e.currentTarget.dataset.value,
      })
    },

    closeMask() {
      this.setData({ isTishi: false });
    },

  }
})

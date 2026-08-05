import apiUrl from '../../../config.js'
var load = require('../../../lib/load.js');

import {
  disGetUnPayAccountBills,
  settleDepBills,
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
    isTishi: false,
    accountBillArr: [],
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
      this._loadData();
    }
  },

  pageLifetimes: {
    show() {
      if (this.data.active) this._loadData();
    }
  },

  observers: {
    'active': function (active) {
      if (active) this._loadData();
    }
  },

  methods: {
    _resolveDisId() {
      if (this.data.disId) return this.data.disId;
      const value = wx.getStorageSync('userInfo');
      return value && value.nxDistributerEntity ? value.nxDistributerEntity.nxDistributerId : 0;
    },

    _loadData() {
      const disId = this._resolveDisId();
      if (!disId) return;
      load.showLoading("获取未结账账单");
      disGetUnPayAccountBills(disId).then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          this.setData({ accountBillArr: res.result.data });
        } else {
          this.setData({ accountBillArr: [] });
        }
      })
    },

    selectBill(e) {
      var index = e.currentTarget.dataset.index;
      var isSelect = e.detail.value;
      var itemBill = this.data.accountBillArr[index];
      var selectArr = this.data.selectArr;

      if (isSelect) {
        selectArr.push(itemBill);
      } else {
        selectArr.splice(selectArr.findIndex(item => item.nxDepartmentBillId === itemBill.nxDepartmentBillId), 1);
      }
      this.setData({ selectArr: selectArr });
      this._countTotal();
    },

    _countTotal() {
      var selectArr = this.data.selectArr;
      var temp = 0;
      for (var i = 0; i < selectArr.length; i++) {
        temp = temp + Number(selectArr[i].nxDbTotal);
      }
      this.setData({
        total: temp.toFixed(1),
        selAmount: selectArr.length
      })
    },

    settleBills() {
      this.setData({ isTishi: true });
    },

    cancleSettle() {
      this.setData({ isTishi: false, selAmount: 0, total: 0, selectArr: [] });
      this._loadData();
    },

    settleAccount() {
      settleDepBills(this.data.selectArr).then(res => {
        this.setData({ isTishi: false, selAmount: 0 });
        if (res.result.code == 0) {
          wx.showToast({ title: '结账成功' });
          this._loadData();
        }
      })
    },

    openAccountBill(e) {
      var depInfo = e.currentTarget.dataset.item.nxDepartmentEntity;
      wx.navigateTo({
        url: '/subPackage/pages/customer/issuePage/issuePage?billId=' + e.currentTarget.dataset.item.nxDepartmentBillId
          + '&depName=' + depInfo.nxDepartmentName + '&depFatherId='
          + depInfo.nxDepartmentId + '&depHasSubs=' + depInfo.nxDepartmentSubAmount,
      })
    },
  }
})

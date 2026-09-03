
import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');

import {
  disGetUnSettleAccountBills,
  settleDepBills,
} from '../../../../lib/apiDepOrder'

//
Page({

  /**
   * 页面的初始数据
   */
  data: {
    selAmount: 0,
    total: 0,
    selectArr: [],
    isTishi: false,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const app = getApp();
    const globalData = app.globalData;

    var value = wx.getStorageSync('userInfo');
    if (value) {

      this.setData({
        disId: value.nxDistributerEntity.nxDistributerId,
        userInfo: value,
      })

      // wx.setNavigationBarTitle({
      //   "title": value.depName,
      // })

    }
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      url: apiUrl.server,
      depFatherId: options.depId,
    })
    this._getAccountBills();
  },


  _getAccountBills() {
    load.showLoading("获取未结账账单")
    disGetUnSettleAccountBills(this.data.depFatherId).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        var accountBillArr = (res.result.data || []).map(function (month) {
          return Object.assign({}, month, {
            arr: (month.arr || []).map(function (bill) {
              return Object.assign({}, bill, { isSelect: false })
            })
          })
        })
        this.setData({
          accountBillArr: accountBillArr,
          selectArr: [],
          selAmount: 0,
          total: 0,
        })
      }else{
        this.setData({
          accountBillArr: []
        })
      }
    })
  },

  choiceMonth(e){
    var index = e.currentTarget.dataset.index;
    var monthChoice = this.data.accountBillArr[index].choice;

    if(monthChoice){
      var billArr = this.data.accountBillArr[index].arr;
      for(var i = 0; i < billArr.length; i++){
        



 
      }
    }


  },

  selectBill(e) {
    var index = e.currentTarget.dataset.index;
    var monthIndex = e.currentTarget.dataset.monthindex;
    var isSelect = e.detail.value;
    var accountBillArr = this.data.accountBillArr || [];
    var itemBill = accountBillArr[monthIndex].arr[index];
    var linkedIds = {};
    linkedIds[itemBill.nxDepartmentBillId] = true;

    // 已出账退货必须与原销售账单成组结算，避免老板漏选负数冲减单而多收款。
    if (itemBill.nxDbBillType === 'RETURN_CREDIT' && itemBill.nxDbOriginalBillId) {
      linkedIds[itemBill.nxDbOriginalBillId] = true;
    } else {
      accountBillArr.forEach(function (month) {
        (month.arr || []).forEach(function (bill) {
          if (bill.nxDbBillType === 'RETURN_CREDIT' &&
            Number(bill.nxDbOriginalBillId) === Number(itemBill.nxDepartmentBillId)) {
            linkedIds[bill.nxDepartmentBillId] = true;
          }
        })
      })
    }

    var selectArr = [];
    accountBillArr = accountBillArr.map(function (month) {
      var rows = (month.arr || []).map(function (bill) {
        var selected = linkedIds[bill.nxDepartmentBillId] ? !!isSelect : !!bill.isSelect;
        var row = Object.assign({}, bill, { isSelect: selected });
        if (selected) selectArr.push(row);
        return row;
      })
      return Object.assign({}, month, { arr: rows })
    })
    this.setData({ accountBillArr: accountBillArr, selectArr: selectArr })
    this._countTotal();
  },

  _countTotal() {
    var selectArr = this.data.selectArr;
    var temp = 0;
    for (var i = 0; i < selectArr.length; i++) {
      var itemTotal = this._getBillPayAmount(selectArr[i]);
      temp = temp + itemTotal;
    }
    this.setData({
      total: temp.toFixed(1),
      selAmount: selectArr.length
    })
  },

  _getBillPayAmount(bill) {
    var payAmount = bill.nxDbPayAmount;
    if (payAmount === null || payAmount === undefined || payAmount === '') {
      payAmount = bill.nxDbTotal;
    }
    var amount = Number(payAmount);
    return isNaN(amount) ? 0 : amount;
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
      total: 0,
      selectArr: []
    })
    this._getAccountBills();
  },

  settleAccount() {
    settleDepBills(this.data.selectArr).then(res => {
      this.setData({
        isTishi: false,
        selAmount: 0,
      })
      if (res.result.code == 0) {
        console.log(res);
        wx.showToast({
          title: '结账成功',
        })
        this._getAccountBills();
      }
    })
  },

  showOrHide(e) {
    console.log(e);
    var greatIndex = e.currentTarget.dataset.greatindex;
    var grandIndex = e.currentTarget.dataset.grandindex;
    for (var i = 0; i < this.data.depGoodsArr.length; i++) {

      for (var j = 0; j < this.data.depGoodsArr[i].fatherGoodsEntities.length; j++) {
        var itemShow = "depGoodsArr[" + i + "].fatherGoodsEntities[" + j + "].isShow";

        if (i != greatIndex || j != grandIndex) {
          this.setData({
            [itemShow]: false
          })
        }
      }
    }

    var show = this.data.depGoodsArr[greatIndex].fatherGoodsEntities[grandIndex].isShow;
    var itemShow = "depGoodsArr[" + greatIndex + "].fatherGoodsEntities[" + grandIndex + "].isShow";
    this.setData({
      [itemShow]: !show
    })
  },

  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  }






})

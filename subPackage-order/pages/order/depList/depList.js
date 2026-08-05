
var load = require('../../../../lib/load.js');

import {
  disGetAllCustomer,
  disGetLabels
} from '../../../../lib/apiDistributer.js'


Page({

  onShow(){

    this._initData();
    this._getDistributerLabels();

  },

  onLoad: function (options) {
    const globalData = getApp().globalData;
    // 调用方（order/index）通过 ?disId= 传入的是配送商实体 id，标签挂在该实体上，必须优先使用
    const passedDisId = options && options.disId != null && String(options.disId).trim() !== ''
      ? String(options.disId)
      : null;
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      rpxR: globalData.rpxR,
      labelList: [],          // 配送商全部标签
      selectedLabelId: null,  // 当前选中的标签ID，null表示全部
    })
    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      // 标签查询使用实体 id：优先用 URL 传入的 disId，否则用 userInfo 中的实体 id
      var labelDisId = passedDisId
        || (userInfo.nxDistributerEntity && userInfo.nxDistributerEntity.nxDistributerId != null
          ? userInfo.nxDistributerEntity.nxDistributerId
          : userInfo.nxDiuDistributerId);
      this.setData({
        userInfo: userInfo,
        disId: passedDisId || userInfo.nxDiuDistributerId,
        labelDisId: labelDisId,
        deviceId: userInfo.nxDiuPrintDeviceId,
        disInfo: userInfo.nxDistributerEntity,
      })
    }
    this._initData();
  
  },


  _filterCustomers() {
    const keyword = (this.data.customerFilterKeyword || '').trim().toLowerCase();
    const filterFn = (item) => !keyword || (item.nxDepartmentAttrName || '').toLowerCase().includes(keyword);
    this.setData({
      filteredCustomerArrOne: (this.data.myCustomerArrOne || []).filter(filterFn),
      filteredCustomerArrTwo: (this.data.myCustomerArrTwo || []).filter(filterFn),
    });
  },

  onCustomerFilterInput(e) {
    this.setData({
      customerFilterKeyword: e.detail.value
    }, () => this._filterCustomers());
  },

  // 获取配送商标签列表
  _getDistributerLabels() {
    const { labelDisId } = this.data;
    if (!labelDisId) return;

    disGetLabels(labelDisId).then(res => {
      if (res.result.code == 0) {
        this.setData({
          labelList: res.result.data || []
        });
      }
    });
  },

  // 按标签筛选客户
  filterByLabel(e) {
    const labelId = e.currentTarget.dataset.id;
    const { selectedLabelId } = this.data;

    // 点击已选中的标签则取消筛选
    if (selectedLabelId === labelId) {
      this.setData({ selectedLabelId: null });
      this._initData();
    } else {
      this.setData({ selectedLabelId: labelId });
      this._filterCustomerByLabel(labelId);
    }
  },

  // 根据标签筛选客户
  _filterCustomerByLabel(labelId) {
    load.showLoading('筛选中...');

    disGetAllCustomer(this.data.labelDisId, labelId).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        const arrOne = res.result.data.settleTypeOne || [];
        const arrTwo = res.result.data.settleTypeTwo || [];
        this.setData({
          myCustomerArrOne: arrOne,
          myCustomerArrTwo: arrTwo,
          myCustomerArrThree: res.result.data.settleTypeThree || [],
        }, () => this._filterCustomers());
      } else {
        wx.showToast({
          title: res.result.msg || '筛选失败',
          icon: 'none'
        });
      }
    });
  },

  _initData() {
    disGetAllCustomer(this.data.disId).then(res => {
      load.showLoading("获取客户")
      if (res.result.code == 0) {
        load.hideLoading();
        const arrOne = res.result.data.settleTypeOne || [];
        const arrTwo = res.result.data.settleTypeTwo || [];
        this.setData({
          myCustomerArrOne: arrOne,
          myCustomerArrTwo: arrTwo,
          myCustomerArrThree: res.result.data.settleTypeThree || [],
        }, () => this._filterCustomers());
        var that = this;
        var query = wx.createSelectorQuery();
        //选择id
        query.select('#mjltest').boundingClientRect()
        query.exec(function (res) {
          that.setData({
            maskHeight: res[0].height * that.data.rpxR + 50
          })
        })
      }else{ 
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },




  toDepOrders(e) {
    wx.setStorageSync('depItem', e.currentTarget.dataset.item);
    var nxDisId = this.data.disId;
    var depId = e.currentTarget.dataset.id;
    var gbDisId = e.currentTarget.dataset.gbdisid;
    var gbDepId = e.currentTarget.dataset.gbid;
    var resId = e.currentTarget.dataset.resid;
    var comId = e.currentTarget.dataset.comid;
    var name = e.currentTarget.dataset.name;
    var depHasSubs = e.currentTarget.dataset.depsub;

    wx.navigateTo({
      url: '../orderPage/orderPage?depFatherId=' + depId +
        '&name=' + name + '&gbDepFatherId=' + gbDepId  + '&nxDisId=' + nxDisId + '&gbDisId=' + gbDisId + '&comId=' + comId +
        '&depHasSubs=' + depHasSubs,
    })
  },


  addNewCustomer(e) {
    wx.navigateTo({
      url: '../../../../subPackage/pages/customer/addCustomer/addCustomer?disId=' + this.data.disId,
    })
  },


  toRetailGoods(){
    wx.navigateTo({
      url: '/subPackage-order/pages/order/paste/paste?isRetail=1',
    })

  },



  toBack() {
    wx.navigateBack({
      delta: 2,
    })
  },






})
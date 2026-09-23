

var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil');
import apiUrl from '../../../../config.js';

var app = getApp()

import {
  getNxDisBillDetail,
  changeDisBillStatus
} from '../../../../lib/apiDistributer'


Page({

  /**
   * 页面的初始数据
   */
  data: {
  
   billStatus : 1,

  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const globalData = app.globalData;

    var value = wx.getStorageSync('userInfo');
    var disId = null;
    if (value) {
      disId = value.nxDistributerEntity.nxDistributerId;
      this.setData({
        disId: disId,
        userInfo: value,
        userId: value.nxDistributerUserId,
      })
    }

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      billId: options.billId,
      requestDisId: options.requestDisId,
      total: options.total,
      url: apiUrl.server,
    })
    var batchItem = wx.getStorageSync('batchItem');
    if(batchItem){
      var name = (disId != null && batchItem.nxDbdOrderDisId == disId) ? '进货单' : '销售单';
      this.setData({
        batchItem: batchItem,
        billStatus: batchItem.nxDbdStatus === 2 ? 2 : 1,
        name: name
      })
    }
  

    var collItem = wx.getStorageSync('collItem');
    if(collItem){
      this.setData({
        collItem: collItem
      })
    }
   
    this._initData();

  },
  _initData(){
   
    var data = {
      billId: this.data.billId,
      requestDisId: this.data.requestDisId,
    }
    getNxDisBillDetail(data).then(res =>{
      console.log(res)
      if(res.result.code == 0){
          this.setData({ 
            applyArr: this._decoratePurchaseOrderSources(res.result.data),
          })         
     
      }

    })
  },

  _decoratePurchaseOrderSources(goodsList){
    return (goodsList || []).map(goods => {
      const orders = (goods.nxDepartmentOrdersEntities || []).map(order => {
        const mainOrderId = this._positiveOrderId(order.nxDoCollaborationMainOrderId)
        const collaborationOrderId = this._positiveOrderId(order.nxDepartmentOrdersId)
        const sourceOrderId = mainOrderId || collaborationOrderId

        return Object.assign({}, order, {
          hasOrderPurchaseSource: sourceOrderId !== null,
          purchaseSourceOrderId: sourceOrderId,
          purchaseSourceOrderLabel: mainOrderId ? '关联采购订单' : '关联协作订单',
          purchaseCustomerName: sourceOrderId ? this._formatPurchaseCustomer(order) : ''
        })
      })

      return Object.assign({}, goods, {
        nxDepartmentOrdersEntities: orders
      })
    })
  },

  _positiveOrderId(value){
    if(value === undefined || value === null || value === ''){
      return null
    }
    const orderId = Number(value)
    return Number.isFinite(orderId) && orderId > 0 ? orderId : null
  },

  _formatPurchaseCustomer(order){
    const department = order && order.nxDepartmentEntity
    if(!department){
      return ''
    }

    const departmentName = department.nxDepartmentName
      || department.nxDepartmentAttrName
      || department.nxDepartmentOrderCode
      || ''
    const father = department.fatherDepartmentEntity
    if(!father){
      return departmentName
    }

    const fatherName = father.nxDepartmentAttrName
      || father.nxDepartmentName
      || father.nxDepartmentOrderCode
      || ''
    if(!fatherName || fatherName === departmentName || father.nxDepartmentId === department.nxDepartmentId){
      return departmentName || fatherName
    }
    return departmentName ? fatherName + ' · ' + departmentName : fatherName
  },

  changeStatus(){
   if(this.data.billStatus == 1){
    this.setData({
      billStatus: 2
    })
   }else{
    this.setData({
      billStatus: 1
    })
   }
  },
  
  confirmBill(){

    var data = {
      billId: this.data.billId,
      status: this.data.billStatus,
    }
    changeDisBillStatus(data).then(res =>{
      if(res.result.code  == 0){
        wx.navigateBack({delta: 1})
      }
    })

  },

  finishBill(){

    var data = {
      billId: this.data.billId,
      status: 3,
    }
    changeDisBillStatus(data).then(res =>{
      if(res.result.code  == 0){
        wx.navigateBack({delta: 1})
      }
    })

  },


  changeBill(e){

    var data = {
      billId: this.data.billId,
      status: e.currentTarget.dataset.status,
    }
    changeDisBillStatus(data).then(res =>{
      if(res.result.code  == 0){
        wx.navigateBack({delta: 1})
      }
    })
  },


 toBack(){
  wx.navigateBack({
    delta: 1,
  })
 },

})



var load = require('../../../../lib/load.js');

var app = getApp()

import {
 
  getBillApplys,
  updateOrderReturn,
  updateBillOrders,
} from '../../../../lib/apiDepOrder'
import { getDispatchDeliveryToday } from '../../../../lib/apiRouteDispatch'


Page({


  onShow(){

    this._getAccountBillApplys();
  },
  /**
   * 页面的初始数据
   */
  data: {
  
    hide: false,
    scrollTop: 0,
    scrollViewTop: 0,

  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const globalData = app.globalData;


  

    //login页面存储的信息
    var value = wx.getStorageSync('userInfo');
    if (value) {
      this.setData({
        disId: value.nxDistributerEntity.nxDistributerId,
        userInfo: value,
        userId: value.nxDistributerUserId,

      })
    }
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      billId: options.billId,
      depName: options.depName,
      depFatherId: options.depFatherId,
      depHasSubs: options.depHasSubs
    })


  },

  _getAccountBillApplys(){
    var data = {
      billId: this.data.billId,
      depFatherId: this.data.depFatherId
    }
    load.showLoading("获取数据中.")
    getBillApplys(data).then(res =>{
      load.hideLoading();
      if(res.result.code == 0){
          var bill = res.result.data.bill;
          var applyArr = res.result.data.arr || [];
          this._decorateAfterSalesOrders(bill, applyArr);
          this.setData({
            applyArr: applyArr,
            bill: bill,
            returnCount: res.result.data.returnNumber,
            toReturnSubtotal: res.result.data.toReturnSubtotal,
            haveReturnSubtotal: res.result.data.haveReturnSubtotal,
          })
          this._refreshAfterSalesContexts(bill, applyArr);
      }

    })
  },

  _decorateAfterSalesOrders(bill, applyArr) {
    var cache = wx.getStorageSync('afterSalesDeliveryOrderContext') || {};
    var decorate = function (order) {
      if (!order || !order.nxDepartmentOrdersId) return;
      var context = cache[String(order.nxDepartmentOrdersId)];
      order.afterSalesEntryVisible = !!order.nxDoDepDisGoodsId;
      order.afterSalesContext = context && context.delivered ? context : null;
    };
    ;((bill && bill.nxDepartmentOrdersEntities) || []).forEach(decorate);
    ;(applyArr || []).forEach(function (row) {
      if (row && Array.isArray(row.depOrders)) row.depOrders.forEach(decorate);
      else decorate(row);
    });
  },

  _resolveBillRouteDate(bill) {
    bill = bill || {};
    var candidates = [bill.nxDbDate, bill.nxDbDay, bill.nxDbTime];
    for (var i = 0; i < candidates.length; i++) {
      var match = String(candidates[i] || '').match(/(20\d{2})[-\/]?(\d{2})[-\/]?(\d{2})/);
      if (match) return match[1] + '-' + match[2] + '-' + match[3];
    }
    var now = new Date();
    return now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0') + '-' + String(now.getDate()).padStart(2, '0');
  },

  _cacheAfterSalesContexts(pageViewModel) {
    if (!pageViewModel || !Array.isArray(pageViewModel.sections)) return;
    var cache = wx.getStorageSync('afterSalesDeliveryOrderContext') || {};
    var now = Date.now();
    pageViewModel.sections.forEach(function (section) {
      ;(section.cards || []).forEach(function (card) {
        ;(card.timeline || []).forEach(function (node) {
          var taskId = node.deliveryStopId || node.taskId;
          var orderIds = node.liveOrderIds || [];
          if (!taskId || !Array.isArray(orderIds)) return;
          var status = String(node.taskStatus || node.status || '').toUpperCase();
          var delivered = node.stopDone === true || status === 'DELIVERED' || node.statusLabel === '已送达';
          orderIds.forEach(function (orderId) {
            if (!orderId) return;
            cache[String(orderId)] = {
              deliveryStopId: taskId,
              routeDate: pageViewModel.routeDate || '',
              customerName: node.customerName || '',
              driverUserId: card.driverUserId || node.driverUserId || null,
              delivered: delivered,
              cachedAt: now
            };
          });
        });
      });
    });
    wx.setStorageSync('afterSalesDeliveryOrderContext', cache);
  },

  _refreshAfterSalesContexts(bill, applyArr) {
    if (this._afterSalesContextPromise) return this._afterSalesContextPromise;
    this._afterSalesContextPromise = getDispatchDeliveryToday({
      disId: this.data.disId,
      routeDate: this._resolveBillRouteDate(bill)
    }).then((res) => {
      if (!res.result || res.result.code !== 0) return false;
      this._cacheAfterSalesContexts(res.result.data && res.result.data.pageViewModel);
      this._decorateAfterSalesOrders(bill, applyArr);
      this.setData({ bill: bill, applyArr: applyArr });
      return true;
    }).catch(function () { return false; }).finally(() => { this._afterSalesContextPromise = null; });
    return this._afterSalesContextPromise;
  },

  _allBillOrders() {
    var all = [];
    ;((this.data.bill && this.data.bill.nxDepartmentOrdersEntities) || []).forEach(function (item) { all.push(item); });
    ;(this.data.applyArr || []).forEach(function (row) {
      if (row && Array.isArray(row.depOrders)) row.depOrders.forEach(function (item) { all.push(item); });
      else if (row && row.nxDepartmentOrdersId) all.push(row);
    });
    return all;
  },

  _findBillOrder(orderId) {
    return this._allBillOrders().filter(function (item) {
      return String(item.nxDepartmentOrdersId) === String(orderId);
    })[0];
  },

  toCreateAfterSales(e) {
    var orderId = e.currentTarget.dataset.orderId;
    var selected = this._findBillOrder(orderId);
    if (!selected || !selected.nxDoDepDisGoodsId) {
      wx.showToast({ title: '原订单缺少客户商品关系ID', icon: 'none' });
      return;
    }
    if (!selected.afterSalesContext || !selected.afterSalesContext.deliveryStopId) {
      wx.showLoading({ title: '匹配配送任务' });
      this._refreshAfterSalesContexts(this.data.bill, this.data.applyArr).then(() => {
        wx.hideLoading();
        var refreshed = this._findBillOrder(orderId);
        if (!refreshed || !refreshed.afterSalesContext || !refreshed.afterSalesContext.deliveryStopId) {
          wx.showToast({ title: '未找到对应的已送达配送任务', icon: 'none', duration: 2500 });
          return;
        }
        this._openAfterSalesCreate(refreshed);
      });
      return;
    }
    this._openAfterSalesCreate(selected);
  },

  _openAfterSalesCreate(selected) {
    var taskId = selected.afterSalesContext.deliveryStopId;
    var candidates = this._allBillOrders().filter(function (item) {
      return item && item.nxDoDepDisGoodsId && item.afterSalesContext &&
        String(item.afterSalesContext.deliveryStopId) === String(taskId);
    }).map(function (item) {
      var goods = item.nxDistributerGoodsEntity || {};
      return {
        historyOrderId: item.nxDepartmentOrdersId,
        departmentDisGoodsId: item.nxDoDepDisGoodsId,
        disGoodsId: item.nxDoDisGoodsId,
        goodsName: item.nxDoGoodsName || goods.nxDgGoodsName || '商品',
        quantity: item.nxDoWeight || item.nxDoQuantity || '',
        standard: item.nxDoPrintStandard || item.nxDoStandard || '',
        selected: String(item.nxDepartmentOrdersId) === String(selected.nxDepartmentOrdersId)
      };
    });
    wx.setStorageSync('afterSalesCreateDraft', {
      originalShipmentTaskId: taskId,
      routeDate: selected.afterSalesContext.routeDate || '',
      customerName: selected.afterSalesContext.customerName || this.data.depName || '',
      orders: candidates,
      createdAt: Date.now()
    });
    wx.navigateTo({ url: '../../afterSales/create/create' });
  },

  //  //////////////
  chooseSezi: function (e) {
    // 用that取代this，防止不必要的情况发生
    var that = this;
    // 创建一个动画实例
    var animation = wx.createAnimation({
      // 动画持续时间
      duration: 100,
      // 定义动画效果，当前是匀速
      timingFunction: 'linear'
    })
    // 将该变量赋值给当前动画
    that.animation = animation
    // 先在y轴偏移，然后用step()完成一个动画
    animation.translateY(200).step()
    // 用setData改变当前动画
    that.setData({
      // 通过export()方法导出数据
      animationData: animation.export(),
      // 改变view里面的Wx：if
      chooseSize: true
    })
    // 设置setTimeout来改变y轴偏移量，实现有感觉的滑动
    setTimeout(function () {
      animation.translateY(0).step()
      that.setData({
        animationData: animation.export()
      })
    }, 20)
  },


  hideModal: function (e) {
    var that = this;
    var animation = wx.createAnimation({
      duration: 1000,
      timingFunction: 'linear'
    })
    that.animation = animation
    animation.translateY(200).step()
    that.setData({
      animationData: animation.export()

    })
   
  },


  /**
   * 打开操作面板
   * @param {}} e 
   */
  openOperation(e) {
    this.setData({
      showOperation: true,
      item: e.currentTarget.dataset.item,
      itemDis: e.currentTarget.dataset.item.nxDistributerGoodsEntity,
      index: e.currentTarget.dataset.index,
      depIndex : e.currentTarget.dataset.depindex,
     
    })
    this.chooseSezi();

  },

  /**
   * 关闭操作面板
   */
  hideMask() {
    this.setData({
      showOperation: false,
    })
    this.hideModal();

  },


  editBill(e){
    console.log(e);
    this.setData({
      showOperation: false,
      show: true,
      applyNumber: this.data.item.nxDoWeight,
      applyPrice: this.data.item.nxDoPrice,
      applySubtotal: this.data.item.nxDoSubtotal
      
    })
   


  },

  addReturn(e){
    if(this.data.item.nxDoReturnStatus == null || this.data.item.nxDoReturnStatus == 0){
      this.setData({
        showOperation: false,
        showReturn: true, 
       
      })
      if( this.data.item.nxDoReturnStatus == 0){
        this.setData({
          applyNumber: this.data.item.nxDoReturnWeight
        })

      }
     
    }else{
      wx.showToast({
        title: '不能重复退货',
        icon: 'none'
      })

    }
   
  },

  /**
   * 修改配送申请
   * @param {} e 
   */
  confirm(e) {
    var total = 0;

    // 判断使用哪个数据源：bill.nxDepartmentOrdersEntities 或 applyArr
    var useBillOrders = this.data.bill && this.data.bill.nxDbDepId == this.data.bill.nxDbDepFatherId;
    
    if(useBillOrders){
      // 使用 bill.nxDepartmentOrdersEntities
      var index = this.data.index;
      var orders = this.data.bill.nxDepartmentOrdersEntities;
      
      // 先更新内存中的数据数组，再计算总和
      orders[index].nxDoWeight = e.detail.applyNumber;
      orders[index].nxDoPrice = e.detail.applyPrice;
      orders[index].nxDoSubtotal = e.detail.applySubtotal;
      
      // 计算总和
      for(var i = 0; i < orders.length; i++){
        var sub = orders[i].nxDoSubtotal;
        console.log(i + "==" + sub);
        total = Number(total) + Number(sub || 0);
      }
      
      var orderItemWeight = "bill.nxDepartmentOrdersEntities[" + index + "].nxDoWeight";
      var orderItemPrice = "bill.nxDepartmentOrdersEntities[" + index + "].nxDoPrice";
      var orderItemSubtotal = "bill.nxDepartmentOrdersEntities[" + index + "].nxDoSubtotal";
      this.setData({    
        [orderItemWeight]: e.detail.applyNumber,
        [orderItemPrice]: e.detail.applyPrice,
        [orderItemSubtotal]: e.detail.applySubtotal,
        billSubtotal: total.toFixed(1),
        ["bill.nxDbTotal"]: total.toFixed(1)
      })
    } else if(this.data.depHasSubs == 0){
      var index = this.data.index;
      // 先更新内存中的数据数组，再计算总和
      var arr  = this.data.applyArr;
      arr[index].nxDoWeight = e.detail.applyNumber;
      arr[index].nxDoPrice = e.detail.applyPrice;
      arr[index].nxDoSubtotal = e.detail.applySubtotal;
      
      // 计算总和
      for(var i = 0; i < arr.length; i++){
        var sub = arr[i].nxDoSubtotal;
        console.log(i + "==" + sub);
        total = Number(total) + Number(sub || 0);
      }
      
      var orderItemWeight = "applyArr[" + index + "].nxDoWeight";
      var orderItemPrice = "applyArr[" + index + "].nxDoPrice";
      var orderItemSubtotal = "applyArr[" + index + "].nxDoSubtotal";
      this.setData({    
        [orderItemWeight]: e.detail.applyNumber,
        [orderItemPrice]: e.detail.applyPrice,
        [orderItemSubtotal]: e.detail.applySubtotal,
        billSubtotal: total.toFixed(1),
        ["bill.nxDbTotal"]: total.toFixed(1)
      })
    }else{
      var depIndex = this.data.depIndex;
      var index = this.data.index;
      // 先更新内存中的数据数组，再计算总和
      var depArr = this.data.applyArr;
      depArr[depIndex].depOrders[index].nxDoWeight = e.detail.applyNumber;
      depArr[depIndex].depOrders[index].nxDoPrice = e.detail.applyPrice;
      depArr[depIndex].depOrders[index].nxDoSubtotal = e.detail.applySubtotal;
      
      // 计算总和
      for(var i = 0; i < depArr.length; i++){
        var orderArr =  depArr[i].depOrders;
        for(var j = 0;  j < orderArr.length; j ++){
           var sub = orderArr[j].nxDoSubtotal;
           total = Number(total) + Number(sub || 0);
        }
      }

      var orderItemWeight = "applyArr[" + depIndex + "].depOrders[" + index + "].nxDoWeight";
      var orderItemPrice = "applyArr[" + depIndex + "].depOrders[" + index + "].nxDoPrice";
      var orderItemSubtotal = "applyArr[" + depIndex + "].depOrders[" + index + "].nxDoSubtotal";
      this.setData({
        [orderItemWeight]: e.detail.applyNumber,
        [orderItemPrice]: e.detail.applyPrice,
        [orderItemSubtotal]: e.detail.applySubtotal,
        billSubtotal: total.toFixed(1),
        ["bill.nxDbTotal"]: total.toFixed(1)
      })
    }

    var data = {
      billId: this.data.billId,
      orderId: this.data.item.nxDepartmentOrdersId,
      billSubtotal: total.toFixed(1),
      orderPrice: e.detail.applyPrice,
      orderWeight: e.detail.applyNumber,
      orderSubtotal: e.detail.applySubtotal,
    };

    console.log(data);

    updateBillOrders(data).then(res => {
      load.showLoading("修改订单")
        if (res.result.code == 0) {
          load.hideLoading();
          this._getAccountBillApplys();

        }else{
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })
        }
      
    })
  },

  

  toReturnPage(){
    console.log(this.data.billId)
    wx.navigateTo({
      url: '../returnPage/returnPage?billId=' + this.data.billId
      + '&depName=' + this.data.depName + '&depFatherId=' + this.data.depFatherId 
      +'&disId=' + this.data.disId,  
    })
  },

  
  /**
   * 修改配送申请
   * @param {} e 
   */
  confirmReturn(e) {
  
    var dg = {
      nxDepartmentOrdersId: this.data.item.nxDepartmentOrdersId,
      nxDoReturnWeight: e.detail.applyNumber,
      nxDoReturnSubtotal: (Number(e.detail.applyNumber) * Number(this.data.item.nxDoPrice)).toFixed(1),
      nxDoReturnStatus: 0,
      
    };
    
    var dg = {
      id: this.data.item.nxDepartmentOrdersId,
      weight: e.detail.applyNumber,
      subtotal:(Number(e.detail.applyNumber) * Number(this.data.item.nxDoPrice)).toFixed(1),
      
    };
    console.log("dat", dg);

    updateOrderReturn(dg).then(res => {
      load.showLoading("添加退货商品")
        if (res.result.code == 0) {
          load.hideLoading();
          this._getAccountBillApplys();
          
        }else{
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })
        }
      
    })
  },


  saveReturnBill(){

  },
 toBack(){
   console.log("backk")
  wx.navigateBack({
    delta: 1,
  })
 },

})

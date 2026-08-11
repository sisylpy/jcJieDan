
var load = require('../../../../lib/load.js');

import {
  getBillApplys,
  settleDepBills
} from '../../../../lib/apiDepOrder'


Page({

  /**
   * 页面的初始数据
   */
  data: {
   
    

      
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const app = getApp();
    const globalData = app.globalData;

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight  * globalData.rpxR,
      billId: options.billId,
      depFatherId: options.depFatherId,
      depHasSubs: options.depHasSubs,
      depName: options.depName

    })

    this._getAccountBillApplys();

   
  },

  _getAccountBillApplys(){
    var data = {
      billId: this.data.billId,
      depFatherId: this.data.depFatherId
    }
    getBillApplys(data).then(res =>{
      console.log(res)
      if(res.result.code == 0){
          var bill = res.result.data.bill;
          this.setData({
            applyArr: res.result.data.arr,
            bill: bill,
          })         
        
      }

    })
  },


  settleAccount() {
    var arr = [];
    arr.push(this.data.bill);
    settleDepBills(arr).then(res => {
     
      if (res.result.code == 0) {
        console.log(res);
        wx.showModal({
          title: '结账成功',
          content: '订单状态已改变',
          complete: (res) => {       
            if (res.confirm) {
              wx.navigateBack({delta: 1});
            }
          }
        })
       
      }
    })
  },


  
  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  }




})

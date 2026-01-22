// pages/order/addPickFirstStep/addPickFirstStep.js
var load = require('../../../../lib/load.js');

var app = getApp()
import { 
  getCommunityRoleUsers,
  deliveryRestraunts
  
} from '../../../../lib/apiDistributer'
  

Page({

  /**
   * 页面的初始数据
   */
  data: {
    selectedStores: 0,
    purchaseUserId: ''
  },


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const globalData = app.globalData;


    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      comId: options.comId
    })

    var value = wx.getStorageSync('resArr');
    this.setData({
      resArr: value
    })

    this._getDeliveryUserData();
  }, 
  
  _getDeliveryUserData: function () {
    load.showLoading("获取数据中")
    var data = {
      comId: this.data.comId,
      roleId: 5,
    }
    getCommunityRoleUsers(data)
      .then(res => {
        if (res) {

          load.hideLoading();
          console.log(res.result.data)

          this.setData({
            purchaseUserArr: res.result.data
          })
        }
      })
  },

  radioChange:function(e){
    console.log(e);
    this.setData({
      purchaseUserId: e.detail.value,
    })
  },


 saveBuyTypePurchaseBatch:function(){
     var arr = this.data.resArr;
  if(arr.length > 0 && this.data.purchaseUserId){ 
    var temp = [];
    for(var i = 0; i < arr.length; i++){
      var item = {
        nxRestrauntId: arr[i],
        nxRestrauntWorkingStatus: 2,
        nxRestrauntDriverId: this.data.purchaseUserId
      }
      temp.push(item);
    }
    

    deliveryRestraunts(temp).then(res => {
      if(res.result.code == 0) {

        var pages = getCurrentPages();
          var prevPage = pages[pages.length - 2];//上一个页面
      //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
      prevPage.setData({
        update: true,
      })

        wx.navigateBack({
          delta: 1,
        })
        console.log(res);
       
      
      }
    })

  }
  


  


}







})
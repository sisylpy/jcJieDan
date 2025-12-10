
import apiUrl from '../../../../config.js'

var app = getApp();
import{
  queryDisInfoBusiness,
  gbDisSaveBusiness
} from '../../../../lib/apiDistributer'

Page({


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const globalData = app.globalData;

    //login页面存储的信息
  
   
    var disInfoValue = wx.getStorageSync('disInfo');
    if (disInfoValue) {
      this.setData({
        disInfo: disInfoValue
      })
    }
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      screenWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      rpxR: globalData.rpxR,
      url: apiUrl.server,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      gbDisId: options.gbDisId,

    })
    var data = {
      gbDisId: this.data.gbDisId,
      nxDisId: this.data.disInfo.nxDistributerId,
    }
    queryDisInfoBusiness(data).then(res =>{
      if(res.result.code == 0){
        console.log("res.result.code.data ", res.result.code)

        if(res.result.data === "ok"){
          console.log("res.result.code.data0000 ",res.result.data)
            this.setData({
              haveBusiness: true,
            })
        }else{
          console.log("res.result.code.data11111 ",res.result.data)

          this.setData({
            gbDisInfo: res.result.data,
            haveBusiness:false
          })
        }
       
      }
    })

    var disInfo = wx.getStorageSync('disInfo');
    if(disInfo){
      this.setData({
        disInfo: disInfo
      })
    }
  
  },


  saveBusiness(){

    var data = {
      gbDisId: this.data.gbDisId,
      nxDisId: this.data.disInfo.nxDistributerId,
    }
    gbDisSaveBusiness(data).then(res =>{
      if(res.result.code == 0){
        wx.switchTab({
          url: '../../../../pages/order/index/index',
        })
      }
    })

  },

  toIndex(){
    wx.switchTab({
      url: '../../../../pages/order/index/index',
    })
  },

  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },

})
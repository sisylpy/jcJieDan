import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil.js');

let windowWidth = 0;
let itemWidth = 0;

import {
  
  updateDepGoodsSellingPrice,
  deleteDepGoods,
  getDepUsersByFatherId,
  disGetGbDisGoods,
  getDepInfo,
  deleteGroupDep,
  delHisotory,
  deleteDepUser,

  updateDepUserAdmin,
  updateGroupName

}
from '../../../../lib/apiDistributer'



Page({

  /**
   * 页面的初始数据
   */
  data: {
    showChoice: false,
    openIndex: -1,
    depGoods: null,

  },

  onShow() {
   
    
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
     
    }

    var disInfo = wx.getStorageSync('disInfo');
 if(disInfo){
   this.setData({
     disInfo: disInfo
   })
 }

    var tadayDate = dateUtils.getWhichFullDate(0);
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      tadayDate: tadayDate,
      gbDisId: options.gbDisId,
      nxDisId: options.nxDisId,
    })

    this._getResGoodsWithOrders();
   

  },

 
  toPdf(){
    wx.navigateTo({
      url: '../customerPdf/customerPdf',
    })
  },
  



  // /////
  _getResGoodsWithOrders() {
  
    load.showLoading("获取数据");
    var data = {
      disId: this.data.disId,
      gbDisId: this.data.gbDisId
    }
    disGetGbDisGoods(data)
    .then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          this.setData({
            depGoodsArr: res.result.data,
          })
          // that._openIndex();
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
          this.setData({
            depGoodsArr: []
          })
        }
      
    })

    
  },




  /**
   * 点击弹窗的“关闭”按钮
   */
  cancle() {
    this.setData({
      show: false,
      editApply: false,
      applyItem: "",
      item: "",
      applyNumber: "",
      applyStandardName: "",
      depStandardArr: [],

    })

  },

  // swiper 1
  //0 
  openFather(e) {
    var fatherIndex = e.currentTarget.dataset.fatherindex;
    var data = "depGoodsArr[" + fatherIndex + "].isSelected";
    var isSel = this.data.depGoodsArr[fatherIndex].isSelected;
    console.log("fatheridiid" , e);
    if(this.data.openIndex == fatherIndex){
      this.setData({
        [data]: false,
        openIndex: -1,
      })
    }else{
      if(this.data.openIndex > -1){
        var dataLast = "depGoodsArr[" + this.data.openIndex + "].isSelected";

        this.setData({
          [dataLast]: false,
          [data]: true,
          openIndex: fatherIndex
        })
      }else{
        this.setData({
          [data]: true,
          openIndex: fatherIndex
        })
        
      }
     
    }

  },


  delHistory(e){
   
    wx.showModal({
      title: '删除重复数据',
      content: e.currentTarget.dataset.item.nxDgGoodsName,
      complete: (res) => {
        if (res.cancel) {

          
        }
    
        if (res.confirm) {
          load.showLoading("删除数据")
          delHisotory(e.currentTarget.dataset.id).then(res => {
            if (res.result.code == 0) {
              load.hideLoading();
               this._getDepApplys();
            }
          })
        }
      }
    })
   

  },
  //


  editGroupInfo(e) {
    this.setData({
      showOperation: true,
      editArrShow: true,
    })
  },


  closeEditGroupInfo() {
    this.setData({
      editArrShow: false,
      showOperation: false
    })
  },

  applyGoods(e) {
    var item = e.currentTarget.dataset.item;
    this.setData({
      itemDis: item,
      show: true,
    })
    if (item.departmentDisGoodsEntity !== null) {
      var depGoodsStand = item.departmentDisGoodsEntity.nxDdgOrderStandard;
      if (depGoodsStand !== null) {
        this.setData({
          applyStandardName: item.departmentDisGoodsEntity.nxDdgOrderStandard,
          // applyNumber: item.departmentDisGoodsEntity.nxDdgOrderQuantity,
          applyRemark: item.departmentDisGoodsEntity.nxDdgOrderRemark,
        })
      } else {
        this.setData({
          applyStandardName: item.nxDgGoodsStandardname,
        })
      }
    } else {
      this.setData({
        applyStandardName: item.nxDgGoodsStandardname,
      })
    }
  },



  _openIndex(){
    if(this.data.openIndex !== -1){
      var data = "depGoodsArr[" + this.data.openIndex + "].isSelected";    
          this.setData({
            [data]: true,
          })
    }

  },


  getDepName(e) {
    var depInfoDepName = "depInfo.nxDepartmentName";
    this.setData({
      editDepName: e.detail.value,
      [depInfoDepName]: e.detail.value
    })
  },

  getDepAttrName(e) {
    var depInfoDepAttrName = "depInfo.nxDepartmentAttrName";
    this.setData({
      editDepAttrName: e.detail.value,
      [depInfoDepAttrName]: e.detail.value
    })
  },


  updateDepInfo() {
      updateGroupName(this.data.depInfo).then(res => {
        if (res.result.code == 0) {
          wx.showToast({
            title: '修改成功',
          })
          this.setData({
            editArrShow: false,
            showOperation: false,
          }) 
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
      })  
  },


  
  toOpenOrder() {
    
    console.log("depId=" + this.data.depFatherId + '&disId=' + this.data.disId + '&subAmount=' + this.data.depInfo.nxDepartmentSubAmount + '&depName=' + this.data.depInfo.nxDepartmentAttrName +'&disName=' + this.data.userInfo.nxDistributerEntity.nxDistributerName + '&from=0');

    var appId = this.data.depInfo.nxDepartmentAppId;
    wx.navigateToMiniProgram({
      appId: appId,
      path: '/pages/inviteAndOrder/inviteAndOrder?depId=' + this.data.depFatherId + '&disId=' + this.data.disId + '&subAmount=' + this.data.depInfo.nxDepartmentSubAmount + '&depName=' + this.data.depInfo.nxDepartmentAttrName +'&disName=' + this.data.userInfo.nxDistributerEntity.nxDistributerName + '&from=0',
      envVersion: 'trial', //release develop trial
      success(res) {
        // that.setData({
        //   toOpenMini: false
        // })
      }
    })
  },
  


  switchChange(e) {
    console.log(e)
    var index = e.currentTarget.dataset.index;
    var user = this.data.userArr[index];
    var admin = this.data.userArr[index].nxDuAdmin;
    if (admin == 0) {
      user.nxDuAdmin = 1;
    } else {
      user.nxDuAdmin = 0;
    }
    updateDepUserAdmin(user)
      .then(res => {
        if (res.result.code == 0) {
          this._getGroupUsers();
        }
      })
  },


  deleteDep(){
    var that = this;
    wx.showModal({
      title: "删除后数据不可恢复",
      content: "此操作将删除客户的全部记录.",
      confirmText: "确定删除",
      success: function (res) {
        if (res.cancel) {
          //点击取消           
        } else if (res.confirm) {
           that._delDep();

        }
      }
    })
  },

  _delDep(){
    load.showLoading("删除客户")
    deleteGroupDep(this.data.depInfo).then(res =>{
      if(res.result.code == 0){
        load.hideLoading();
        wx.navigateBack({
          delta: 2,
        })
      }else{
        wx.showToast({
          title: res.result.msg,
        })
      }
    })
  },


  deleteDepGoods(e){
    deleteDepGoods(e.currentTarget.dataset.id).then(
      res =>{
        if(res.result.code == 0){
          this._getResGoodsWithOrders();
        }
      }
    )
  },


 showUser(e){
  this.setData({
    showOperationUser: true,
    userId: e.currentTarget.dataset.id,

  })
 },
 

 //

 toMap1(){
    wx.navigateTo({
      url: '../deliveryAddress/deliveryAddress',
    })
 },

 toMap(e) {
  console.log(e);
  var _this = this;
  wx.chooseLocation({
    success: function (res) {
      console.log('chooseLocation', res);
      _this.setData({
        latitude: res.latitude,
        longitude: res.longitude,
      })
      // _this._canLogin()

    },
  })
},



 delUser(){
   console.log("delUserdelUserdelUser")
  deleteDepUser(this.data.userId).then(res =>{
    if(res.result.code == 0){
      this._getGroupUsers();
    }else{
      wx.showToast({
        title:  res.result.msg,
        icon: 'none'
      })
    }
  })
 },

 hideMaskUser(){
   this.setData({
     showOperationUser : false,
     userId: "",
   })
 },

  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },



  hideMask(){
    this.setData({
      showOperationPrice: false,
      disGoods: "",
      sellingPrice: "",
      pickDetail: "",
    })
  },

  selDepartment(e){
    console.log(e);
    var item = e.currentTarget.dataset.depgoods;
     var disGoods = e.currentTarget.dataset.goods;
    this.setData({
      fatherIndex: e.currentTarget.dataset.fatherindex,
      index: e.currentTarget.dataset.index,
      depGoodsId: item.nxDepartmentDisGoodsId,
      showOperationPrice: true,
      disGoods: disGoods,
      sellingPrice: item.nxDdgOrderPrice,
      pickDetail: item.nxDdgPickDetail,
    })
  },

  inputSellingPrice(e){
    console.log(e.detail.value)
    this.setData({
      sellingPrice: e.detail.value,
    })

  },

  inputPickDetail(e){
    console.log(e.detail.value)
    this.setData({
      pickDetail: e.detail.value,
    })

  },

  _updateDepGoods(){
    var data = {
      depGoodsId: this.data.depGoodsId,
      sellingPrice: this.data.sellingPrice,
      pickDetail: this.data.pickDetail,
    }
    updateDepGoodsSellingPrice(data).then(res =>{
      if(res.result.code == 0){
        var data  = "depGoodsArr[" + this.data.fatherIndex +"].nxDepartmentDisGoodsEntities[" + this.data.index +"]";
        this.setData({
          [data]: res.result.data,
          showOperationPrice: false,
          depGoodsId: "",
          sellingPrice: ""
        })
        
        // this._getResGoodsWithOrders();
        // this._openIndex();

      }
    })

  },


  showSubDeps(){
    wx.navigateTo({
      url: '../editCustomer/editCustomer',
    })
  },




})
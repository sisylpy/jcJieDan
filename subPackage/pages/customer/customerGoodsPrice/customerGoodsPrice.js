import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil.js');

let windowWidth = 0;
let itemWidth = 0;

import {
  
  disGetDepGoodsHistoryPrice

}
from '../../../../lib/apiDistributer'



Page({

  /**
   * 页面的初始数据
   */
  data: {
    showChoice: false,
   
    itemDis: null,
    maskHeight: 0,
    openIndex: -1,
    applyArr: [],
    applyHeight: "",
    depGoods: null,
    showOperationPrice:false

  },

  onShow() {
   
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
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      depFatherId: options.depFatherId,
      goodsId: options.goodsId,
    })

    this._initData();

    var disGoods = wx.getStorageSync('disGoods');
    if(disGoods){
      this.setData(({
        disGoods: disGoods
      }))
    }
   

  },

 


  // /////
  _initData() {
    load.showLoading("获取数据");
    var data = {
      depFatherId: this.data.depFatherId,
      goodsId: this.data.goodsId,
    }
    disGetDepGoodsHistoryPrice(data)
    .then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          this.setData({
            depGoodsArr: res.result.data,
          })
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



  // swiper 1
  //0 
  openFather(e) {
    var fatherIndex = e.currentTarget.dataset.fatherindex;
    var data = "depGoodsArr[" + fatherIndex + "].isSelected";
    var isSel = this.data.depGoodsArr[fatherIndex].isSelected;
    var id = e.currentTarget.id; // 分类标题的 id

    if (this.data.openIndex == fatherIndex) {
      this.setData({
        [data]: false,
        openIndex: -1,
      });
    } else {
      if (this.data.openIndex > -1) {
        var dataLast = "depGoodsArr[" + this.data.openIndex + "].isSelected";
        this.setData({
          [dataLast]: false,
          [data]: true,
          openIndex: fatherIndex
        }, () => {
          // 展开后自动滚动到该分类标题下方
          setTimeout(() => {
            wx.createSelectorQuery().select('#' + id).boundingClientRect(rect => {
              if (rect) {
                // 这里的 94 是你的导航栏高度（单位 px），可根据实际调整
                wx.pageScrollTo({
                  scrollTop: rect.top + wx.getSystemInfoSync().windowScrollY - 94,
                  duration: 300
                });
              }
            }).exec();
          }, 100);
        });
      } else {
        this.setData({
          [data]: true,
          openIndex: fatherIndex
        }, () => {
          setTimeout(() => {
            wx.createSelectorQuery().select('#' + id).boundingClientRect(rect => {
              if (rect) {
                wx.pageScrollTo({
                  scrollTop: rect.top + wx.getSystemInfoSync().windowScrollY - 94,
                  duration: 300
                });
              }
            }).exec();
          }, 100);
        });
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


  _openIndex(){
    if(this.data.openIndex !== -1){
      var data = "depGoodsArr[" + this.data.openIndex + "].isSelected";    
          this.setData({
            [data]: true,
          })
    }

  },


  hideMask(){
    this.setData({
      showOperationPrice: false
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


  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },





  selDepartment(e){
    var item = e.currentTarget.dataset.depgoods;
     var disGoods = e.currentTarget.dataset.goods;
    this.setData({
      depGoodsId: item.nxDepartmentDisGoodsId,
      showOperationPrice: true,
      disGoods: disGoods,
      item: item,
      sellingPrice: item.nxDdgOrderPrice,
      orderName: item.nxDdgOrderGoodsName,
      pickDetail: item.nxDdgPickDetail
    })
  },

  inputSellingPrice(e){
    console.log(e.detail.value)
    this.setData({
      sellingPrice: e.detail.value,
    })

  },

  inputOrderName(e){
    console.log(e.detail.value)
    this.setData({
      orderName: e.detail.value,
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
      orderName: this.data.orderName,

    }
    updateDepGoodsSellingPrice(data).then(res =>{
      if(res.result.code == 0){
        this.setData({
          showOperationPrice: false,
          depGoodsId: "",
          sellingPrice: ""
        })
        this._getResGoodsWithOrders();
        this._openIndex();

      }
    })

  },



})
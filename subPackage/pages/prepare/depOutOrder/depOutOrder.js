var app = getApp()
var load = require('../../../../lib/load.js');

let windowWidth = 0;
let itemWidth = 0;
import{
  getHaveOutCataGoods,
  getHaveNotOutCataGoods,
  saveToFillWeightAndPrice,
  cancelOutOrder,
  cancleGbOrderSx
} from '../../../../lib/apiDepOrder'

Page({

  
  data: {
    sliderOffset: 0,
    sliderOffsets: [],
    sliderLeft: 0,

    swipeIndex: 0,
    currentTab: 0,

    itemCurrent0: 0,
    itemIndex0: 0,
    tabs: [
      
      {
        name: "未拣货",
        amount: "",
        amountOk: "",
      }, {
        name: "已拣货",
        amount: "",
        amountOk: "",
      }
    ],
  },

  onLoad: function (options) {
    const globalData = app.globalData;

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      depFatherId: options.depFatherId,
      gbDepFatherId: options.gbDepFatherId,
      nxDisId: options.nxDisId,
      gbDisId: options.gbDisId,
      comId: options.comId,
      depHasSubs: options.depHasSubs,
      goodsType: options.goodsType,
      depName: options.depName
    })
    
    var value = wx.getStorageSync('userInfo');
    console.log(value);
    if (value) {
      this.setData({
        userInfo: value,
        disId: value.nxDistributerEntity.nxDistributerId,

      })
    }

    this.clueOffset();
    this._initDataNot();

  },

  _initData() {
    var data = {
      depFatherId: this.data.depFatherId,
      gbDepFatherId: this.data.gbDepFatherId,
      goodsType: this.data.goodsType,

    }
    load.showLoading("获取订单中")
    getHaveOutCataGoods(data)
      .then(res => {
        if (res.result.code == 0) {
          console.log(res.result.data);
          load.hideLoading();
            this.setData({
              cataArr: res.result.data,
            })           
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
        load.hideLoading();
      })
  },

  _initDataNot() {
    var data = {
      depFatherId: this.data.depFatherId,
      gbDepFatherId: this.data.gbDepFatherId,
      goodsType: this.data.goodsType,
      
    }
    load.showLoading("获取订单中1")
    getHaveNotOutCataGoods(data)
      .then(res => {
        if (res.result.code == 0) {
          console.log(res.result.data);
          load.hideLoading();
            this.setData({
              cataArr: res.result.data,
            })           
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
        load.hideLoading();
      })
  },


  onTab1Click(event) {

    console.log("onTab1Click");
    var that = this;
    if (this.data.swipeIndex === event.currentTarget.dataset.current) {
      return false;
    } else {
      that.setData({
        currentTab: event.currentTarget.dataset.current,
        swipeIndex: event.currentTarget.dataset.current, //sisy
        sliderOffset: this.data.sliderOffsets[event.currentTarget.dataset.current],
      })
     
    }
  },


  /**
   * 计算偏移量
   */
  clueOffset() {
    var that = this;
    wx.getSystemInfo({
      success: function (res) {
        itemWidth = Math.ceil(res.windowWidth / that.data.tabs.length);
        let tempArr = [];
        for (let i in that.data.tabs) {
          console.log(i)
          tempArr.push(itemWidth * i);
        }
        // tab 样式初始化
        windowWidth = res.windowWidth;
        that.setData({
          sliderLeft: (res.windowWidth / that.data.tabs.length - 50) / 2,
          sliderOffsets: tempArr,
          sliderOffset: 0,
          sliderLeft: 0,
        });
      }
    });
  },


  bindChange: function (e) {
    console.log('debugbindcange')
    var that = this;
    that.setData({
      swipeIndex: e.detail.current,
      sliderOffset: this.data.sliderOffsets[e.detail.current],
     
    });
   
    if (that.data.swipeIndex == 0) {
      this._initDataNot();
    }
    if (that.data.swipeIndex == 1) {
      
      this._initData();
    }
   
  },



  toInputOrder(e) {
    
    
    var item = e.currentTarget.dataset.item;
       item.nxDistributerGoodsEntity = e.currentTarget.dataset.goods;
      this.setData({
        showInputOrder: true,
        item: item,
        windowHeight: this.data.windowHeight,
      })
    
  },
 



  confirm(e) {
    var item = e.detail.item;
    console.log(item);
    saveToFillWeightAndPrice(item).then(res => {
      if (res.result.code == 0) {
        this.setData({
          showInputOrder: false,
          item: "",
        })
        if(this.data.currentTab == 0){
          this._initDataNot();
        }else{
          this._initData();
        }
       
      }
    })
  },

  

  cancleOutOrder(e) {
    var item = e.currentTarget.dataset.item;
    cancelOutOrder(item).then(res => {
      if (res.result.code == 0) { 
        this._initData()
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },


  
  cancleGbOrderSx(e){
    console.log(e);
    var id = e.currentTarget.dataset.id;
    cancleGbOrderSx(id).then(res =>{
      if(res.result.code == 0){
       
           this._initData();
      
      }
    })
  },




  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },

  









})
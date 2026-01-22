var app = getApp()
var load = require('../../../../lib/load.js');

import apiUrl from '../../../../config.js'
import {
  
  disGetPayListDetail,
  
} from '../../../../lib/apiDistributer'


let itemWidth = 0;
let windowWidth = 0;
Page({

  onShow(){
    const app = getApp();
    const globalData = app.globalData;

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      screenWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      rpxR: globalData.rpxR,
      url: apiUrl.server,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
    
    })

  },

  /**
   * 页面的初始数据
   */
  data: {
    totalPage: 0,
    totalCount: 0,
    limit: 10,
    currentPage: 1,
    sliderOffset: 0,
    sliderOffsets: [],
    sliderLeft: 0,
    tabs: [
      
      {
        name: "保存",
      }, {
        name: "打印",
      },{
        name: "语音",
      },{
        name: "商品",
      },
    ],
    currentTab: 0,
    selIndex: 0,
    payDetailArr: [],  // 初始化数据列表
    isLoading: false,  // 初始化加载状态

  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {

    var disInfoValue = wx.getStorageSync('disInfo');
    if (disInfoValue) {
      this.setData({
        disInfo: disInfoValue,
        disId: disInfoValue.nxDistributerId,
        
      })
    }

  
   
    this._initData();
    this.clueOffset();
  
  },


  _initData(){
   
   load.showLoading("获取数据中");
   var data = {
    limit: this.data.limit,
    page: this.data.currentPage,
    disId: this.data.disId,
    type: this.data.currentTab,
   }
   disGetPayListDetail(data).then(res =>{
      load.hideLoading();
      if(res.result.code ==0){
        console.log(res.result)
        this.setData({
          payDetailArr: res.result.page.list,
          currentPage: this.data.currentPage + 1,
          totalPage: res.result.page.totalPage,
          totalCount: res.result.page.totalCount, 
          isLoading: false,
        })
      
      }

    })
  },



  /**
   * 计算偏移量
   */
  clueOffset() {
  
    itemWidth = Math.ceil(this.data.windowWidth / this.data.tabs.length);
    console.log("thiswiek", this.data.windowWidth, "itemw", itemWidth);
    let tempArr = [];
    for (let i in this.data.tabs) {
      tempArr.push(itemWidth * i);
    }
    // tab 样式初始化
    this.setData({
      sliderOffsets: tempArr,
      sliderLeft: (this.data.windowWidth / 8),
    });

  },

  /**
   * tabItme点击
   */
  onTab1Click(event) {
    console.log("onTab1Click");
    
    // 重置所有分页相关数据
    this.setData({
      currentTab: event.currentTarget.dataset.current,
      selIndex: 0,
      totalPage: 0,
      totalCount: 0,
      currentPage: 1,
      payDetailArr: [],  // 清空旧数据
      isLoading: false
    })

    // 加载新tab的数据
    this._initData();
   
  },

  bindChange: function (e) {
    console.log(e);
    
    // 重置所有分页相关数据
    this.setData({
      currentTab: e.detail.current,
      sliderOffset: this.data.sliderOffsets[e.detail.current],
      type: e.detail.current,
      selIndex: 0,
      totalPage: 0,
      totalCount: 0,
      currentPage: 1,
      payDetailArr: [],  // 清空旧数据
      isLoading: false
    })

    // 加载新tab的数据
    this._initData()
 
},


  onScrollToLower: function () {
    var that  = this;
    // 防止重复请求
    if (this.data.isLoading || this.data.payDetailArr.length >= this.data.totalCount) return;

    this.setData({
      isLoading: true
    });

    const {
      currentPage,
      totalPage,
      disId,
      currentTab,
      limit
    } = this.data;

    // 确保非搜索模式，并且当前页数未超过总页数
    if ( currentPage <= totalPage) {
      const data = {
        limit: limit,
        page: currentPage,
        disId: disId,
        type: currentTab,
      };
      load.showLoading("获取数据中");
      disGetPayListDetail(data)
        .then((res) => {
          load.hideLoading();
          if (res.result.code == 0) {
            const newItems = res.result.page.list || [];
            const updatedGoodsList = [...this.data.payDetailArr, ...newItems];

            // 更新当前页和商品列表
            this.setData({
              payDetailArr: updatedGoodsList,
              currentPage: currentPage + 1,
              totalPage: res.result.page.totalPage,
              totalCount: res.result.page.totalCount,
              isLoading: false,
            });
           

            // 如果已达到 totalCount，停止加载
            if (updatedGoodsList.length >= this.data.totalCount) {
              this.setData({
                isLoading: false
              });
            }
            
          } else {
            wx.showToast({
              title: '获取商品失败',
              icon: 'none'
            });
            this.setData({
              isLoading: false
            });
          }
        })
        .catch((err) => {
          console.log(err);
          wx.showToast({
            title: '加载错误，请稍后再试',
            icon: 'none'
          });
          this.setData({
            isLoading: false
          });
        });
    } else {
      this.setData({
        isLoading: false
      });
    }
  },


  toBack(){
    wx.navigateBack({
      delta: 1
    })
  },


})
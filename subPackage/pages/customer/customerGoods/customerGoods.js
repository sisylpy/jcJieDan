import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil.js');

let windowWidth = 0;
let itemWidth = 0;

import {
  deleteDepGoods,
  getDepUsersByFatherId,
  disGetDepGoods,
  getDepInfo,
  delHisotory,

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
    searchKeyword: '',
    filteredDepGoodsArr: [],
    originalDepGoodsArr: [],
    selectedCategoryId: null,
    selectedCategoryGoods: [],
    scrollIntoView: ''

  },

  onShow() {
    if(this.data.update){
      this._getDepInfo();
    }
    
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
      var depInfoValue = wx.getStorageSync('depInfo');

      if (depInfoValue.nxDepartmentSubAmount > 0) {
        this.setData({
          subArr: depInfoValue.nxDepartmentEntities,
        })
      } else {
        //没有下级部门
        // 如果是群用户登陆
        this.setData({
          depId: depInfoValue.nxDepartmentId,
          depFatherId: depInfoValue.nxDepartmentFatherId,
          groupName: depInfoValue.nxDepartmentName,
          depType: depInfoValue.nxDepartmentType
        })
        wx.setStorageSync('depFatherId', depInfoValue.nxDepartmentFatherId)
        wx.setStorageSync('depInfo', depInfoValue);
      }
      this.setData({
        depInfo: depInfoValue,
        depFatherId: depInfoValue.nxDepartmentId,
        settleType: depInfoValue.nxDepartmentSettleType,
        editDepName: depInfoValue.nxDepartmentName,
        editDepAttrName: depInfoValue.nxDepartmentAttrName
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
      tadayDate: tadayDate
    })

    this._getResGoodsWithOrders();
   

  },

 
  toPdf(){
    wx.navigateTo({
      url: '../customerPdf/customerPdf',
    })
  },
  
  _getDepInfo() {
    getDepInfo(this.data.depFatherId).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        this.setData({
          depInfo: res.result.data,
        })
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },



  // /////
  _getResGoodsWithOrders() {
    var that = this;
    load.showLoading("获取数据");
    disGetDepGoods(this.data.depFatherId)
    .then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          this.setData({
            depGoodsArr: res.result.data,
            originalDepGoodsArr: res.result.data,
            filteredDepGoodsArr: res.result.data,
          })
          // 如果有搜索关键词，进行过滤
          if (this.data.searchKeyword) {
            this._filterGoods(this.data.searchKeyword);
          } else {
            // 默认选中第一个分类
            if (res.result.data && res.result.data.length > 0) {
              const firstCategory = res.result.data[0];
              this._selectCategory(firstCategory, 0);
            }
          }
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
          this.setData({
            depGoodsArr: [],
            originalDepGoodsArr: [],
            filteredDepGoodsArr: []
          })
        }
      
    })

    
  },



  // 选择分类（左右分栏模式）
  selectCategory(e) {
    const fatherIndex = e.currentTarget.dataset.fatherindex;
    const categoryId = e.currentTarget.dataset.id;
    const filteredArr = this.data.filteredDepGoodsArr || [];
    
    if (filteredArr.length <= fatherIndex) {
      return;
    }
    
    const selectedCategory = filteredArr[fatherIndex];
    this._selectCategory(selectedCategory, fatherIndex);
  },

  // 选中分类的内部方法
  _selectCategory(category, index) {
    const categoryId = category.nxDistributerFatherGoodsId;
    const scrollId = `category-${categoryId}`;
    
    this.setData({
      selectedCategoryId: categoryId,
      scrollIntoView: scrollId
    });
    
    // 滚动完成后清空scrollIntoView，以便下次可以再次滚动
    setTimeout(() => {
      this.setData({
        scrollIntoView: ''
      });
    }, 500);
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
      var data = "filteredDepGoodsArr[" + this.data.openIndex + "].isSelected";    
          this.setData({
            [data]: true,
          })
    }

  },


  deleteDepGoods(e){
    console.log(("deleteDepGoodsdeleteDepGoods"))
    deleteDepGoods(e.currentTarget.dataset.id).then(
      res =>{
        if(res.result.code == 0){
          this._getResGoodsWithOrders();
        }else{
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })

        }
      }
    )
  },


  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },





  toCustomerGoodsStandard(e) {
    const data = e.currentTarget.dataset || {};
    const departmentDisGoodsId = Number(data.id);
    if (!departmentDisGoodsId) {
      wx.showToast({
        title: '缺少客户商品关系ID',
        icon: 'none'
      });
      return;
    }

    const query = [
      'departmentDisGoodsId=' + departmentDisGoodsId,
      'goodsName=' + encodeURIComponent(data.goodsname || data.customername || ''),
      'customerGoodsName=' + encodeURIComponent(data.customername || ''),
      'departmentName=' + encodeURIComponent(data.departmentname || this.data.editDepAttrName || '')
    ].join('&');

    wx.navigateTo({
      url: '../customerGoodsStandard/customerGoodsStandard?' + query
    });
  },

  // 搜索输入处理
  onSearchInput(e) {
    const keyword = e.detail.value;
    this.setData({
      searchKeyword: keyword
    });
    this._filterGoods(keyword);
  },

  // 搜索确认
  onSearchConfirm(e) {
    const keyword = e.detail.value;
    this.setData({
      searchKeyword: keyword
    });
    this._filterGoods(keyword);
  },

  // 清除搜索
  clearSearch() {
    this.setData({
      searchKeyword: ''
    });
    this._filterGoods('');
  },

  // 过滤商品
  _filterGoods(keyword) {
    if (!keyword || keyword.trim() === '') {
      // 没有搜索关键词，显示所有数据
      const originalArr = this.data.originalDepGoodsArr || this.data.depGoodsArr || [];
      // 恢复原始数据，移除 filteredGoods 属性
      const restoredArr = originalArr.map(father => {
        const { filteredGoods, ...rest } = father;
        return rest;
      });
      this.setData({
        filteredDepGoodsArr: restoredArr
      });
      // 默认选中第一个分类并滚动
      if (restoredArr.length > 0) {
        this._selectCategory(restoredArr[0], 0);
      }
      return;
    }

    const keywordLower = keyword.toLowerCase().trim();
    const originalArr = this.data.originalDepGoodsArr || this.data.depGoodsArr || [];
    const filteredArr = [];

    originalArr.forEach((father, index) => {
      if (!father.nxDepartmentDisGoodsEntities || father.nxDepartmentDisGoodsEntities.length === 0) {
        return;
      }

      // 过滤商品
      const filteredGoods = father.nxDepartmentDisGoodsEntities.filter(depGoods => {
        // 搜索商品名称（配送商商品名称）
        const goodsName = depGoods.nxDistributerGoodsEntity?.nxDgGoodsName || '';
        // 搜索订货商品名称
        const orderGoodsName = depGoods.nxDdgOrderGoodsName || '';
        // 搜索分类名称
        const categoryName = father.nxDfgFatherGoodsName || '';

        return goodsName.toLowerCase().includes(keywordLower) ||
               orderGoodsName.toLowerCase().includes(keywordLower) ||
               categoryName.toLowerCase().includes(keywordLower);
      });

      // 如果有匹配的商品，则添加到结果中
      if (filteredGoods.length > 0) {
        filteredArr.push({
          ...father,
          filteredGoods: filteredGoods
        });
      }
    });

    this.setData({
      filteredDepGoodsArr: filteredArr
    });
    
    // 搜索后自动选中第一个匹配的分类并滚动
    if (filteredArr.length > 0) {
      this._selectCategory(filteredArr[0], 0);
    } else {
      this.setData({
        selectedCategoryId: null,
        selectedCategoryGoods: [],
        scrollIntoView: ''
      });
    }
  },



})

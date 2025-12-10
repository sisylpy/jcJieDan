import apiUrl from '../../../../config.js'

var load = require('../../../../lib/load.js');

import {
  disGetAllCustomer,
  changeDeps
} from '../../../../lib/apiDistributer.js'

Page({
 

  onShow(){
    const app = getApp();
    const globalData = app.globalData;
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      rpxRcale: globalData.rpxR,
     
    })
  },
  onLoad: function (options) {
    const app = getApp();
    const globalData = app.globalData;
   
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight  * globalData.rpxR,
      rpxRcale: globalData.rpxR,
      depName: options.depName,
      url: apiUrl.server,
      hide: false,
      showChoice: false
    })

    var depInfo = wx.getStorageSync('depInfo');
    if (depInfo) {

      this.setData({
        depInfo: depInfo,
        disId: depInfo.nxDepartmentDisId
      })

    }

    this._initNxDepartment();
   
  },



  _initNxDepartment(){
    load.showLoading("获取数据");
    disGetAllCustomer(this.data.disId).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        console.log(res.result.data);
        this.setData({
          myCustomerArrOne: res.result.data.settleTypeOne,
          myCustomerArrTwo: res.result.data.settleTypeTwo,
        })
      }else{ 
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },


  changeOldDepToNewDep() {
    const selectedDept = this.getSelectedDepartment();
    if (!selectedDept) {
      wx.showToast({
        title: '请先选择部门',
        icon: 'none'
      });
      return;
    }

    const data = {
      oldDepId: this.data.depInfo.nxDepartmentId,
      newDepId: selectedDept.depId,
    };
    load.showLoading("跳转部门中")
    changeDeps(data).then(res => {
      if (res.result.code == 0) {
        wx.navigateBack({delta: 1});

        // 可以在这里添加其他成功后的逻辑
      } else {
        wx.showToast({
          title: res.result.msg || '部门切换失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    });
  },


  // 选择主部门
  choiceDep(e) {
    const index = e.currentTarget.dataset.index;
    const isSelected = this.data.myCustomerArrTwo[index].isSelected;
    
    if (!isSelected) {
      // 选中当前部门，取消其他所有选中状态
      const updatedArr = this.data.myCustomerArrTwo.map((item, i) => ({
        ...item,
        isSelected: i === index,
        // 如果有子部门，也要取消子部门的选中状态
        nxDepartmentEntities: item.nxDepartmentEntities ? 
          item.nxDepartmentEntities.map(sub => ({ ...sub, isSelected: false })) : 
          item.nxDepartmentEntities
      }));
      
      this.setData({
        myCustomerArrTwo: updatedArr,
        showChoice: true,
        selDepId: this.data.myCustomerArrTwo[index].nxDepartmentId,
        selDepName: this.data.myCustomerArrTwo[index].nxDepartmentName
      });
    } else {
      // 取消选中
      const updatedArr = this.data.myCustomerArrTwo.map(item => ({
        ...item,
        isSelected: false,
        nxDepartmentEntities: item.nxDepartmentEntities ? 
          item.nxDepartmentEntities.map(sub => ({ ...sub, isSelected: false })) : 
          item.nxDepartmentEntities
      }));
      
      this.setData({
        myCustomerArrTwo: updatedArr,
        showChoice: false,
        selDepId: null,
        selDepName: null
      });
    }
  },

  // 选择子部门
  choiceDepSub(e) {
    const index = e.currentTarget.dataset.index;
    const subIndex = e.currentTarget.dataset.subindex;
    const isSelected = this.data.myCustomerArrTwo[index].nxDepartmentEntities[subIndex].isSelected;
    
    if (!isSelected) {
      // 选中当前子部门，取消其他所有选中状态
      const updatedArr = this.data.myCustomerArrTwo.map((item, i) => {
        if (i === index) {
          // 当前主部门
          return {
            ...item,
            isSelected: false, // 主部门不选中
            nxDepartmentEntities: item.nxDepartmentEntities.map((sub, j) => ({
              ...sub,
              isSelected: j === subIndex
            }))
          };
        } else {
          // 其他主部门及其子部门都取消选中
          return {
            ...item,
            isSelected: false,
            nxDepartmentEntities: item.nxDepartmentEntities ? 
              item.nxDepartmentEntities.map(sub => ({ ...sub, isSelected: false })) : 
              item.nxDepartmentEntities
          };
        }
      });
      
      const selectedSub = this.data.myCustomerArrTwo[index].nxDepartmentEntities[subIndex];
      
      this.setData({
        myCustomerArrTwo: updatedArr,
        showChoice: true,
        selDepId: selectedSub.nxDepartmentId,
        selDepName: `${this.data.myCustomerArrTwo[index].nxDepartmentName}.${selectedSub.nxDepartmentName}`
      });
    } else {
      // 取消选中
      const updatedArr = this.data.myCustomerArrTwo.map(item => ({
        ...item,
        isSelected: false,
        nxDepartmentEntities: item.nxDepartmentEntities ? 
          item.nxDepartmentEntities.map(sub => ({ ...sub, isSelected: false })) : 
          item.nxDepartmentEntities
      }));
      
      this.setData({
        myCustomerArrTwo: updatedArr,
        showChoice: false,
        selDepId: null,
        selDepName: null
      });
    }
  },

  // 获取当前选中的部门信息
  getSelectedDepartment() {
    const { myCustomerArrTwo } = this.data;
    
    for (let i = 0; i < myCustomerArrTwo.length; i++) {
      const item = myCustomerArrTwo[i];
      
      // 检查主部门是否选中
      if (item.isSelected) {
        return {
          type: 'main',
          index: i,
          department: item,
          depId: item.nxDepartmentId,
          depName: item.nxDepartmentName
        };
      }
      
      // 检查子部门是否选中
      if (item.nxDepartmentEntities) {
        for (let j = 0; j < item.nxDepartmentEntities.length; j++) {
          const sub = item.nxDepartmentEntities[j];
          if (sub.isSelected) {
            return {
              type: 'sub',
              mainIndex: i,
              subIndex: j,
              mainDepartment: item,
              subDepartment: sub,
              depId: sub.nxDepartmentId,
              depName: `${item.nxDepartmentName}.${sub.nxDepartmentName}`
            };
          }
        }
      }
    }
    
    return null; // 没有选中任何部门
  },

  // 检查是否有选中的部门
  hasSelectedDepartment() {
    return this.getSelectedDepartment() !== null;
  },


  toBack(){
    wx.navigateBack({delta : 1});
  },

  onUnload(){
    wx.removeStorageSync('depInfo');
  }


})
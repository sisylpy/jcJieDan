var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config.js'

import {
  getDisUsers,
  setShelfUser
} from '../../../../lib/apiDistributer.js'

Page({

  data: {
    navBarHeight: 0,
    shelfId: '',
    shelfName: '',
    staffList: [],
    allStaffList: [],
    searchKeyword: '',
    selectedStaffName: '',
    disId: ''
  },

  onLoad(options) {
    const app = getApp();
    const globalData = app.globalData;
    const navBarHeight = globalData.navBarHeight;
    const screenWidth = globalData.screenWidth;
    const rpxRatio = 750 / screenWidth;
    const navBarHeightRpx = navBarHeight * rpxRatio;

    this.setData({
      navBarHeight: navBarHeightRpx,
      shelfId: options.shelfId || '',
      shelfName: decodeURIComponent(options.shelfName || '货架'),
      url: apiUrl.server,
    });

    // 获取用户信息
    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        disId: userInfo.nxDistributerEntity.nxDistributerId,
        userInfo: userInfo
      });
      this.getStaffData();
    }
  },

  // 获取员工数据
  getStaffData() {
    load.showLoading("获取员工数据");
    getDisUsers(this.data.disId)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          // 合并所有类型的用户，并标记角色
          const zeroUsers = (res.result.data.zero || []).map(user => ({...user, roleType: 'zero', roleName: '京采接单用户'}));
          const oneUsers = (res.result.data.one || []).map(user => ({...user, roleType: 'one', roleName: '京采称重用户'}));
          const twoUsers = (res.result.data.two || []).map(user => ({...user, roleType: 'two', roleName: '其他用户'}));
          const threeUsers = (res.result.data.three || []).map(user => ({...user, roleType: 'three', roleName: '其他用户'}));
          
          const allUsers = [...zeroUsers, ...oneUsers, ...twoUsers, ...threeUsers];
          
          // 为每个员工添加选中状态
          const processedList = allUsers.map(staff => ({
            ...staff,
            selected: false
          }));
          this.setData({
            staffList: processedList,
            allStaffList: processedList
          });
        } else {
          wx.showToast({
            title: res.result.msg || '获取员工数据失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        load.hideLoading();
        wx.showToast({
          title: '网络错误，请稍后重试',
          icon: 'none'
        });
      });
  },

  // 搜索输入
  onSearchInput(e) {
    const keyword = e.detail.value.trim();
    this.setData({
      searchKeyword: keyword
    });

    if (keyword === '') {
      this.setData({
        staffList: this.data.allStaffList
      });
    } else {
      const filteredList = this.data.allStaffList.filter(staff => {
        return staff.nxDiuWxNickName.indexOf(keyword) !== -1 ||
               (staff.nxDiuWxPhone && staff.nxDiuWxPhone.indexOf(keyword) !== -1);
      });
      this.setData({
        staffList: filteredList
      });
    }
  },

  // 切换员工选中状态（单选）
  toggleStaff(e) {
    const staff = e.currentTarget.dataset.staff;
    const staffList = this.data.staffList;
    const allStaffList = this.data.allStaffList;

    // 先取消所有选中状态
    staffList.forEach(s => s.selected = false);
    allStaffList.forEach(s => s.selected = false);

    // 更新当前选中的员工
    const index = staffList.findIndex(s => s.nxDistributerUserId === staff.nxDistributerUserId);
    if (index !== -1) {
      staffList[index].selected = true;
    }

    // 同步更新完整列表
    const allIndex = allStaffList.findIndex(s => s.nxDistributerUserId === staff.nxDistributerUserId);
    if (allIndex !== -1) {
      allStaffList[allIndex].selected = true;
    }

    this.setData({
      staffList: staffList,
      allStaffList: allStaffList,
      selectedStaffName: staff.nxDiuWxNickName
    });
  },

  // 取消选择
  cancelSelection() {
    wx.navigateBack({
      delta: 1
    });
  },

  // 确认选择
  confirmSelection() {
    const selectedStaff = this.data.allStaffList.filter(s => s.selected);
    
    if (selectedStaff.length === 0) {
      wx.showToast({
        title: '请选择一位员工',
        icon: 'none'
      });
      return;
    }
    
    load.showLoading("保存中");
    setShelfUser({
      shelfId: this.data.shelfId,
      userId: selectedStaff[0].nxDistributerUserId
    })
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          wx.showToast({
            title: '设置成功',
            icon: 'success'
          });
          setTimeout(() => {
            wx.navigateBack({
              delta: 1
            });
          }, 1500);
        } else {
          wx.showToast({
            title: res.result.msg || '设置失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        load.hideLoading();
        wx.showToast({
          title: '网络错误，请稍后重试',
          icon: 'none'
        });
      });
  },

  // 返回
  toBack() {
    wx.navigateBack({
      delta: 1
    });
  }

});


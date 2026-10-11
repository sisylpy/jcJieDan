var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config.js'
var operatingCapability = require('../../../../utils/operatingCapability.js')

import {
  getShelfWeighterCandidates,
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
    const disInfo = wx.getStorageSync('disInfo') || {};
    const capability = wx.getStorageSync('operatingCapability') || null;
    if (!operatingCapability.canManageShelfResponsibility(disInfo, capability)) {
      wx.showToast({ title: '当前经营模式或套餐未开通货架责任人', icon: 'none' });
      setTimeout(() => wx.navigateBack({ delta: 1 }), 300);
      return;
    }
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
    getShelfWeighterCandidates()
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          // 新接口直接返回 nx_weight_user 数组，不再返回旧的 zero/one/two/three 分组。
          const candidates = Array.isArray(res.result.data) ? res.result.data : [];
          const processedList = candidates.map(staff => ({
            ...staff,
            roleName: '京采称重用户',
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
        const name = staff.nxWuWxNickName || '';
        const phone = staff.nxWuWxPhone || staff.nxWuLoginPhone || '';
        return name.indexOf(keyword) !== -1 || phone.indexOf(keyword) !== -1;
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
    const index = staffList.findIndex(s => s.nxWeightUserId === staff.nxWeightUserId);
    if (index !== -1) {
      staffList[index].selected = true;
    }

    // 同步更新完整列表
    const allIndex = allStaffList.findIndex(s => s.nxWeightUserId === staff.nxWeightUserId);
    if (allIndex !== -1) {
      allStaffList[allIndex].selected = true;
    }

    this.setData({
      staffList: staffList,
      allStaffList: allStaffList,
      selectedStaffName: staff.nxWuWxNickName || '未命名称重员'
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
      userId: selectedStaff[0].nxWeightUserId
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

var load = require('../../../lib/load.js');

import apiUrl from '../../../config.js'

const tabBarHeight = 50; // 根据实际情况调整
const viewBarHeight = 60;

import {
  
  disGetCustomerDistanceMatrix,
  disGetDriversOptimalRoute,
  
} from '../../../lib/apiDepOrder.js'

import {
  assignOrdersToDrivers
} from '../../../utils/smartOrderAssigner.js'

Page({
  data: {
    firstLoading: true,
    onPurchaseRefresh: false,
    update: false,
    fromLat: '',
    fromLng: '',
    // 智能排单参数配置
    showSmartOrderConfig: true,
    smartOrderConfig: {
      driverCount: 2,
      timeWindowTolerance: 15, // 15分钟
      maxTrips: 1,
      priorityWeight: 20,
      startTime: 8, // 出发时间（小时），默认8点
      maxWorkHours: 8, // 最大工作时长（小时），默认8小时
      customerServiceTime: 30 // 每个客户服务时间（分钟），默认30分钟
    }
  },

  onShow() {
    //tabBar
    if (typeof this.getTabBar === 'function' &&
      this.getTabBar()) {
      this.getTabBar().setData({
        selected: 3
      })
    }

    var value = wx.getStorageSync('userInfo');
    if (value) {
      this.setData({
        userInfo: value,
        disId: value.nxDistributerEntity.nxDistributerId,
        disInfo: value.nxDistributerEntity,
      })
      
      // 检查是否已经有设置的坐标，如果没有才自动获取位置
      if (!this.data.fromLat || !this.data.fromLng) {
        this.getCurrentLocation();
      } else {
        this._getTodayCustomer();
      }
    } 

    const app = getApp();
    const globalData = app.globalData;
    const navBarHeight = globalData.navBarHeight;
    const screenHeight = globalData.screenHeight;
    const screenWidth = globalData.screenWidth;
    const rpxRatio = 750 / screenWidth;
    const navBarHeightRpx = navBarHeight * rpxRatio;
    const viewBarHeightRpx = viewBarHeight * rpxRatio;
    const tabBarHeightRpx = 100;
    const contentHeight = (screenHeight - navBarHeight - tabBarHeight - viewBarHeight) * rpxRatio;
    this.setData({
      contentHeight: contentHeight,
      navBarHeight: navBarHeightRpx,
      tabBarHeight: tabBarHeightRpx,
      viewBarHeight: viewBarHeightRpx,
    });
    
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
    });

    // 检查司机人数缓存
    this.checkDriverCountCache();
  },

  /**
   * 获取当前位置
   */
  getCurrentLocation() {
    const that = this;
    wx.getLocation({
      type: 'gcj02', // 使用国测局坐标系
      success: function(res) {
        console.log('获取当前位置成功:', res);
        that.setData({
          fromLat: res.latitude,
          fromLng: res.longitude,
          fromAddress: res.address || ''
        });
        console.log('设置起始位置:', {
          fromLat: res.latitude,
          fromLng: res.longitude
        });
        
        wx.showToast({
          title: '位置获取成功',
          icon: 'success'
        });
        
        // 获取到位置后，刷新客户数据
        that._getTodayCustomer();
      },
      fail: function(err) {
        console.log('获取位置失败:', err);
        // 如果获取位置失败，提示用户手动设置
        wx.showModal({
          title: '位置获取失败',
          content: '无法获取您的位置，请手动设置出发坐标或检查定位权限',
          confirmText: '手动设置',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              that.setStartLocation();
            }
          }
        });
      }
    });
  },

  /**
   * 获取客户订单
   */
  _getTodayCustomer() {
    var that = this;
    
    // 检查是否设置了出发坐标
    if (!this.data.fromLat || !this.data.fromLng) {
      wx.showModal({
        title: '请设置出发坐标',
        content: '为了获得准确的路线规划，请先设置您的出发位置',
        confirmText: '设置坐标',
        cancelText: '稍后设置',
        success: (res) => {
          if (res.confirm) {
            this.setStartLocation();
          }
        }
      });
      return;
    }
    
    load.showLoading("获取今日订单");
    var data = {
      disId: this.data.disId,
      fromLat: this.data.fromLat,
      fromLng: this.data.fromLng
    }
    
    console.log('接口调用参数:', data);
    
   
    load.showLoading("正在加载客户数据")
    disGetCustomerDistanceMatrix(data).then(res => {
      load.hideLoading();
      
      if (res.result.code == 0) {
        
        this.setData({
          nxDepArr: res.result.data,
        })
        console.log("接口返回结果", res.result.data);
        console.log("客户数量:", res.result.data.length);
        
        // 自动触发智能排单优化
        console.log('自动触发智能排单优化...');
        // 使用 await 等待异步函数完成
        this.smartOrderOptimizationWithConfig(res.result.data).catch(error => {
          console.error('智能排单优化失败:', error);
          wx.showToast({
            title: '智能排单优化失败',
            icon: 'none'
          });
        });
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    }).catch(error => {
      console.error('获取客户数据失败:', error);
      wx.showToast({
        title: '获取客户数据失败',
        icon: 'none'
      });
    })
  },

  // 已废弃：配送路线分析函数（现在使用smartOrderOptimization）
  /*
  analyzeDeliveryRoute(customers) {
    console.log('=== 配送路线分析 ===');
    
    if (!customers || customers.length === 0) {
      console.log('没有客户数据，无法分析路线');
      return;
    }

    // 转换数据结构以适配路线规划工具
    const convertedCustomers = customers.map(item => {
      const dep = item.dep || item; // 适配不同的数据结构
      return {
        name: dep.nxDepartmentName || '未知客户',
        lat: dep.nxDepartmentLat,
        lng: dep.nxDepartmentLng,
        address: dep.nxDepartmentAddress || '',
        earliestTime: dep.nxDepartmentEarliestDeliveryTime,
        latestTime: dep.nxDepartmentLatestDeliveryTime,
        orderCount: item.nxDepartmentOrderTotal || 0,
        pendingCount: item.unDo || 0,
        distance: dep.distance || null,
        duration: dep.duration || null
      };
    });

    console.log('转换后的客户数据:', convertedCustomers);

    // 使用路线规划工具生成报告
    const report = generateRouteReport(convertedCustomers);
    
    // 由于 generateRouteReport 现在返回字符串，直接打印报告
    console.log('=== 路线规划报告 ===');
    console.log(report);
    
    // 如果需要更详细的分析，可以使用 analyzeCustomers 函数
    const analysis = analyzeCustomers(convertedCustomers);
    console.log('=== 客户分析 ===');
    console.log(`总客户数: ${analysis.totalCustomers}`);
    console.log(`有效客户数: ${analysis.validCustomers}`);
    
    if (analysis.customers.length > 0) {
      console.log('=== 客户详细信息 ===');
      analysis.customers.forEach((customer, index) => {
        console.log(`客户 ${index + 1}: ${customer.name}`);
        console.log(`  位置: (${customer.lat}, ${customer.lng})`);
        console.log(`  时间窗口: ${customer.earliestTimeStr} - ${customer.latestTimeStr}`);
        console.log(`  地址: ${customer.address || '未设置'}`);
        console.log(`  订单数: ${customer.orderCount}, 待处理: ${customer.pendingCount}`);
        console.log(`  时间窗口大小: ${Math.floor(customer.timeWindow / 3600)}小时${Math.floor((customer.timeWindow % 3600) / 60)}分钟`);
        if (customer.distance) {
          console.log(`  距离: ${(customer.distance / 1000).toFixed(1)}km`);
        }
        if (customer.duration) {
          console.log(`  时间: ${Math.floor(customer.duration/60)} 分钟`);
        }
        console.log('---');
      });
    }
  },
  */

  // 格式化秒数为时间
  formatSecondsToTime(seconds) {
    if (!seconds) return '';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  },

  // 时间格式化函数（分钟转时间字符串）
  formatTime(minutes) {
    if (!minutes && minutes !== 0) return '--:--';
    
    // 检查是否是异常大的数值
    if (minutes > 1440) {
      console.warn(`时间数值异常: ${minutes}分钟，超过24小时`);
      return '--:--';
    }
    
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  },

  // 动态计算司机出发时间
  calculateDriverStartTime(customers) {
    if (!customers || customers.length === 0) {
      // 如果没有客户，使用配置的默认出发时间
      return this.data.smartOrderConfig.startTime * 60;
    }

    // 找到第一个客户（按路线顺序）
    const firstCustomer = customers[0];
    
    // 第一个客户的最早送达时间（分钟）
    const earliestDeliveryTime = Math.floor(firstCustomer.earliestTime / 60);
    
    // 从出发地到第一个客户的路程时间（分钟）
    const travelTimeToFirst = firstCustomer.durationMinutes || 0;
    
    // 计算出发时间：最早送达时间 - 路程时间
    let calculatedStartTime = earliestDeliveryTime - travelTimeToFirst;
    
    // 配置的最早出发时间（分钟）
    const minStartTime = this.data.smartOrderConfig.startTime * 60;
    
    // 如果计算出的出发时间早于最早出发时间，但有合理的理由（比如客户要求很早送达），则允许更早出发
    if (calculatedStartTime < minStartTime) {
      // 检查客户的最早送达时间是否确实很早
      const customerEarliestTime = Math.floor(firstCustomer.earliestTime / 60);
      const timeDifference = minStartTime - calculatedStartTime;
      
      // 如果客户要求的最早送达时间比配置的最早出发时间还早，或者时间差在合理范围内（比如2小时内），则允许更早出发
      if (customerEarliestTime < minStartTime || timeDifference <= 120) {
        console.log(`客户${firstCustomer.name}要求最早送达时间${this.formatTime(customerEarliestTime)}，允许提前出发${this.formatTime(calculatedStartTime)}`);
        // 使用计算出的出发时间，但确保不早于凌晨5点
        calculatedStartTime = Math.max(calculatedStartTime, 5 * 60); // 最早5:00出发
      } else {
        console.log(`计算出的出发时间${this.formatTime(calculatedStartTime)}早于最早出发时间${this.formatTime(minStartTime)}，使用最早出发时间`);
        calculatedStartTime = minStartTime;
      }
    } else if (calculatedStartTime === minStartTime) {
      // 如果计算出的出发时间正好等于最早出发时间，检查是否需要更早出发以满足客户需求
      const customerEarliestTime = Math.floor(firstCustomer.earliestTime / 60);
      const travelTimeToFirst = firstCustomer.durationMinutes || 0;
      
      // 如果客户要求的最早送达时间比当前计算时间更早，则允许提前出发
      if (customerEarliestTime < (calculatedStartTime + travelTimeToFirst)) {
        const earlierStartTime = Math.max(customerEarliestTime - travelTimeToFirst, 5 * 60);
        console.log(`客户${firstCustomer.name}要求更早送达，调整出发时间从${this.formatTime(calculatedStartTime)}到${this.formatTime(earlierStartTime)}`);
        calculatedStartTime = earlierStartTime;
      }
    }
    
    // 确保出发时间不晚于配置的最晚出发时间（默认18:00）
    const maxStartTime = 18 * 60; // 18:00
    if (calculatedStartTime > maxStartTime) {
      console.log(`计算出的出发时间${this.formatTime(calculatedStartTime)}晚于最晚出发时间${this.formatTime(maxStartTime)}，使用最晚出发时间`);
      calculatedStartTime = maxStartTime;
    }
    
    console.log(`动态计算出发时间: 第一个客户${firstCustomer.name}最早送达${this.formatTime(earliestDeliveryTime)}，路程时间${travelTimeToFirst}分钟，计算出发时间${this.formatTime(calculatedStartTime)}`);
    
    return calculatedStartTime;
  },

  // 为多司机场景计算每个司机的出发时间
  calculateMultiDriverStartTimes(driverAssignments) {
    const startTimes = [];
    let previousDriverEndTime = this.data.smartOrderConfig.startTime * 60; // 第一个司机的最早可能出发时间
    
    driverAssignments.forEach((driver, index) => {
      if (driver.customers.length === 0) {
        // 如果没有客户，使用前一个司机的结束时间
        startTimes.push(previousDriverEndTime);
        return;
      }
      
      // 为当前司机动态计算出发时间
      const calculatedStartTime = this.calculateDriverStartTime(driver.customers);
      
      // 确保不早于前一个司机的结束时间，但允许基于客户需求提前出发
      let actualStartTime;
      if (index === 0) {
        // 第一个司机：使用动态计算的出发时间
        actualStartTime = calculatedStartTime;
      } else {
        // 后续司机：确保不早于前一个司机的结束时间
        actualStartTime = Math.max(calculatedStartTime, previousDriverEndTime);
      }
      
      startTimes.push(actualStartTime);
      
      // 估算当前司机的结束时间（用于下一个司机的计算）
      const estimatedEndTime = actualStartTime + (driver.customers.length * this.data.smartOrderConfig.customerServiceTime);
      previousDriverEndTime = estimatedEndTime;
      
      console.log(`司机${driver.driverId}: 计算出发时间${this.formatTime(calculatedStartTime)}，实际出发时间${this.formatTime(actualStartTime)}，估算结束时间${this.formatTime(estimatedEndTime)}`);
    });
    
    return startTimes;
  },

  // 清理异常时间数据
  cleanTimeData(earliest, latest) {
    // 如果时间数据异常，使用默认值
    if (!earliest || !latest || earliest < 0 || latest < 0) {
      return { earliest: 8 * 60, latest: 18 * 60 }; // 默认8:00-18:00
    }
    
    // 检查时间是否在合理范围内（秒数应该在0-86400范围内，即0-24小时）
    if (earliest < 0 || earliest > 86400 || latest < 0 || latest > 86400) {
      console.warn('时间数据超出合理范围，使用默认值');
      return { earliest: 8 * 60, latest: 18 * 60 }; // 默认8:00-18:00
    }
    
    // 确保最晚时间不早于最早时间
    if (latest <= earliest) {
      console.warn('最晚时间早于最早时间，调整时间窗口');
      return { earliest: earliest, latest: earliest + 3600 }; // 1小时窗口
    }
    
    return { earliest: earliest, latest: latest };
  },

  // 智能排单优化
  async smartOrderOptimization(customers, driverCount = 2) {
    console.log('=== 开始智能排单优化 ===');
    console.log('司机数量:', driverCount);
    
    if (!customers || customers.length === 0) {
      console.log('没有客户数据，无法进行智能排单');
      return;
    }

    // 转换数据结构
    const convertedCustomers = customers.map(item => {
      const dep = item.dep || item;
      
      // 调试原始数据
      console.log(`原始数据 - ${dep.nxDepartmentName}:`, {
        distance: dep.distance,
        duration: dep.duration,
        earliest: dep.nxDepartmentEarliestDeliveryTime,
        latest: dep.nxDepartmentLatestDeliveryTime,
        unload: dep.nxDepartmentUnloadDuration
      });
      
      // 清理时间数据
      const cleanedTime = this.cleanTimeData(
        dep.nxDepartmentEarliestDeliveryTime, 
        dep.nxDepartmentLatestDeliveryTime
      );
      
      return {
        name: dep.nxDepartmentName || '未知客户',
        lat: dep.nxDepartmentLat,
        lng: dep.nxDepartmentLng,
        address: dep.nxDepartmentAddress || '',
        nxDepartmentId: dep.nxDepartmentId, // 添加客户ID
        earliestTime: cleanedTime.earliest, // 已经是秒
        latestTime: cleanedTime.latest, // 已经是秒
        unloadDuration: dep.nxDepartmentUnloadDuration || this.data.smartOrderConfig.customerServiceTime, // 卸货时间（分钟）
        orderCount: item.totalCount || 0,
        pendingCount: item.unDo || 0,
        distance: dep.distance || null,
        duration: dep.duration || null,
        priority: dep.nxDepartmentDeliveryPriority || 1 // 优先级
      };
    });

    console.log('转换后的客户数据:', convertedCustomers);
    console.log('客户时间信息:');
    convertedCustomers.forEach((customer, index) => {
      console.log(`  ${index + 1}. ${customer.name}: ${customer.address || '未设置地址'}`);
      console.log(`     时间窗口: ${Math.floor(customer.earliestTime/60)}分钟 - ${Math.floor(customer.latestTime/60)}分钟 (${this.formatTime(Math.floor(customer.earliestTime/60))} - ${this.formatTime(Math.floor(customer.latestTime/60))})`);
      console.log(`     卸货时间: ${customer.unloadDuration}分钟`);
    });

    // 检查是否设置了出发坐标
    if (!this.data.fromLat || !this.data.fromLng) {
      console.log('未设置出发坐标，无法进行智能排单');
      wx.showToast({
        title: '请先设置出发坐标',
        icon: 'none'
      });
      return;
    }

    // 执行简化的智能排单（只负责"谁送谁"）
    const driverAssignments = assignOrdersToDrivers(
      convertedCustomers, 
      driverCount, 
      15 * 60 // 15分钟宽容度（秒）
    );
    
    console.log('司机分配结果:', driverAssignments);
    
    // 构建调用后台API的数据格式
    const apiRequestData = {
      driverRoutes: driverAssignments.map(driverAssignment => ({
        driverId: Number(driverAssignment.driverId),
        fromLat: String(this.data.fromLat || '0'),
        fromLng: String(this.data.fromLng || '0'),
        customers: driverAssignment.customers.map(customer => ({
          lat: String(customer.lat || '0'),
          lng: String(customer.lng || '0'),
          customerId: Number(customer.nxDepartmentId || Math.floor(Math.random() * 1000)),
          name: String(customer.name || ''),
          address: String(customer.address || ''),
          earliestTime: String(customer.earliestTime || '0'),
          latestTime: String(customer.latestTime || '0'),
          unloadDuration: String(customer.unloadDuration || String(this.data.smartOrderConfig.customerServiceTime)),
          orderCount: String(customer.orderCount || '0'),
          pendingCount: String(customer.pendingCount || '0'),
          priority: String(customer.priority || '1')
        }))
      }))
    };
    
    console.log('准备发送给后台的数据:', JSON.stringify(apiRequestData, null, 2));
    
    // 验证数据类型
    console.log('数据类型验证:');
    apiRequestData.driverRoutes.forEach((route, routeIndex) => {
      console.log(`司机${route.driverId}:`);
      console.log(`  fromLat: ${typeof route.fromLat} = ${route.fromLat}`);
      console.log(`  fromLng: ${typeof route.fromLng} = ${route.fromLng}`);
      route.customers.forEach((customer, customerIndex) => {
        console.log(`  客户${customerIndex + 1}:`);
        console.log(`    lat: ${typeof customer.lat} = ${customer.lat}`);
        console.log(`    lng: ${typeof customer.lng} = ${customer.lng}`);
        console.log(`    customerId: ${typeof customer.customerId} = ${customer.customerId}`);
        console.log(`    earliestTime: ${typeof customer.earliestTime} = ${customer.earliestTime}`);
        console.log(`    latestTime: ${typeof customer.latestTime} = ${customer.latestTime}`);
        console.log(`    unloadDuration: ${typeof customer.unloadDuration} = ${customer.unloadDuration}`);
        console.log(`    orderCount: ${typeof customer.orderCount} = ${customer.orderCount}`);
        console.log(`    pendingCount: ${typeof customer.pendingCount} = ${customer.pendingCount}`);
        console.log(`    priority: ${typeof customer.priority} = ${customer.priority}`);
      });
    });
    
    // 调用后台API获取最优路线
    load.showLoading("正在计算最优路线");
    
    try {
      console.log('开始调用后台API...');
      console.log('API请求数据:', JSON.stringify(apiRequestData, null, 2));
      
      const response = await disGetDriversOptimalRoute(apiRequestData);
      console.log('后台返回的最优路线:', JSON.stringify(response, null, 2));
      
      if (response.result && response.result.code === 0) {
        // 处理后台返回的最优路线数据
        const optimizedResults = response.result.data || [];
        
        console.log('后台返回的优化结果:', optimizedResults);
        
        // 转换结果格式以适配页面显示
        const formattedResult = {
          drivers: optimizedResults.map(driver => {
            // 从原始分配数据中找到对应的客户信息
            const originalDriverData = driverAssignments.find(d => d.driverId === driver.driverId);
            const originalCustomers = originalDriverData ? originalDriverData.customers : [];
            
            // 根据后台返回的排序重新组织客户数据
            const sortedCustomers = driver.sortedCustomers ? driver.sortedCustomers.map((sortedCustomer, index) => {
              // 找到对应的原始客户数据
              const originalCustomer = originalCustomers.find(c => c.nxDepartmentId === sortedCustomer.nxDepartmentId);
              
              if (originalCustomer) {
                return {
                  ...originalCustomer,
                  order: index + 1,
                  // 使用后台返回的距离和时长信息
                  distance: parseInt(sortedCustomer.distance) || 0,
                  duration: parseInt(sortedCustomer.duration) || 0,
                  // 基础信息
                  earliestTimeStr: this.formatTime(Math.floor(originalCustomer.earliestTime / 60)),
                  latestTimeStr: this.formatTime(Math.floor(originalCustomer.latestTime / 60)),
                  distanceKm: sortedCustomer.distance ? (parseInt(sortedCustomer.distance) / 1000).toFixed(1) : '0.0',
                  durationMinutes: parseInt(sortedCustomer.duration) || 0,
                  unloadMinutes: originalCustomer.unloadDuration || this.data.smartOrderConfig.customerServiceTime,
                  // 添加调试信息
                  debugInfo: `距离:${sortedCustomer.distance}米, 时长:${sortedCustomer.duration}分钟, 卸货:${originalCustomer.unloadDuration || this.data.smartOrderConfig.customerServiceTime}分钟`
                };
              }
              return null;
            }).filter(c => c !== null) : [];
            
            // 计算时间安排（在数组构建完成后）
            const driverStartTime = this.calculateDriverStartTime(sortedCustomers); // 动态计算司机出发时间
            let currentTime = driverStartTime;
            
            const customersWithTime = sortedCustomers.map((customer, index) => {
              const travelDuration = customer.durationMinutes || 0; // 行驶时长（分钟）
              const unloadDuration = customer.unloadMinutes || this.data.smartOrderConfig.customerServiceTime; // 卸货时长（分钟）
              
              const departureTime = currentTime; // 出发时间
              const arrivalTime = departureTime + travelDuration; // 到达时间
              const serviceStartTime = arrivalTime; // 开始服务时间
              const departureFromCustomer = serviceStartTime + unloadDuration; // 离开客户时间
              
              // 更新下一个客户的出发时间
              currentTime = departureFromCustomer;
              
              return {
                ...customer,
                // 时间安排（分钟）
                departureTime: departureTime,
                arrivalTime: arrivalTime,
                serviceStartTime: serviceStartTime,
                departureFromCustomer: departureFromCustomer,
                // 格式化显示信息
                departureTimeStr: this.formatTime(departureTime),
                arrivalTimeStr: this.formatTime(arrivalTime),
                serviceStartStr: this.formatTime(serviceStartTime),
                departureFromCustomerStr: this.formatTime(departureFromCustomer),
                // 添加时间调试信息
                timeDebug: `出发:${this.formatTime(departureTime)}, 到达:${this.formatTime(arrivalTime)}, 卸货:${this.formatTime(serviceStartTime)}, 离开:${this.formatTime(departureFromCustomer)}`
              };
            });
            
            return {
              id: driver.driverId,
              driverName: `司机${driver.driverId}`,
              customerCount: customersWithTime.length,
              startTime: this.formatTime(driverStartTime), // 动态出发时间
              endTime: this.formatTime(currentTime), // 计算结束时间
              totalDistance: customersWithTime.reduce((sum, c) => sum + (c.distance || 0), 0),
              totalDuration: customersWithTime.reduce((sum, c) => sum + (c.durationMinutes || 0), 0),
              route: customersWithTime
            };
          }),
          report: {
            summary: {
              totalCustomers: convertedCustomers.length,
              allocatedCustomers: convertedCustomers.length,
              unallocatedCustomers: 0,
              totalDistance: optimizedResults.reduce((sum, d) => {
                const driverData = driverAssignments.find(dd => dd.driverId === d.driverId);
                const customers = driverData ? driverData.customers : [];
                return sum + customers.reduce((cSum, c) => cSum + (c.distance || 0), 0);
              }, 0) / 1000,
              totalDuration: optimizedResults.reduce((sum, d) => {
                const driverData = driverAssignments.find(dd => dd.driverId === d.driverId);
                const customers = driverData ? driverData.customers : [];
                return sum + customers.reduce((cSum, c) => cSum + (c.duration || 0), 0);
              }, 0) / 60
            },
            recommendations: []
          }
        };
        
        // 保存结果到页面数据
        this.setData({
          smartOrderResult: formattedResult
        });
        
        console.log('设置到页面的数据:', formattedResult);
        console.log('司机数量:', formattedResult.drivers.length);
        formattedResult.drivers.forEach((driver, index) => {
          console.log(`司机${index + 1}:`, {
            driverName: driver.driverName,
            customerCount: driver.customerCount,
            routeLength: driver.route.length,
            totalDistance: driver.totalDistance,
            totalDuration: driver.totalDuration
          });
        });
        
        load.hideLoading();
        console.log('最终优化结果:', formattedResult);
      } else {
        throw new Error(response.result?.msg || '路线优化失败');
      }
    } catch (error) {
      console.error('调用路线优化API失败:', error);
      load.hideLoading();
      
      // 如果API调用失败，使用本地分配结果作为备选方案
      console.log('使用本地分配结果作为备选方案');
      const fallbackResults = driverAssignments.map(driverAssignment => ({
        driverId: driverAssignment.driverId,
        customers: driverAssignment.customers,
        totalDistance: driverAssignment.customers.reduce((sum, c) => sum + (c.distance || 0), 0),
        totalDuration: driverAssignment.customers.reduce((sum, c) => sum + (c.duration || 0), 0),
        optimizedOrder: driverAssignment.customers.map((c, index) => ({
          ...c,
          order: index + 1,
          distanceKm: ((c.distance || 0) / 1000).toFixed(1),
                          durationMinutes: parseInt(c.duration) || 0
        }))
      }));
      
      // 转换备选结果格式
      // 为每个司机动态计算出发时间
      const driverStartTimes = this.calculateMultiDriverStartTimes(fallbackResults);
      
      const fallbackFormattedResult = {
        drivers: fallbackResults.map((driver, driverIndex) => {
          // 当前司机的出发时间
          const driverStartTime = driverStartTimes[driverIndex];
          console.log(`备选方案司机${driver.driverId}出发时间: ${this.formatTime(driverStartTime)} (${driverStartTime}分钟)`);
          
          // 计算司机的结束时间
          let driverEndTime = driverStartTime;
          if (driver.customers.length > 0) {
            // 简单估算：每个客户卸货时间
            driverEndTime = driverStartTime + (driver.customers.length * this.data.smartOrderConfig.customerServiceTime);
          }
          
          console.log(`备选方案司机${driver.driverId}结束时间: ${this.formatTime(driverEndTime)} (${driverEndTime}分钟)`);
          
          return {
            id: driver.driverId,
            name: `司机${driver.driverId}`,
            customerCount: driver.customers.length,
            startTime: this.formatTime(driverStartTime), // 动态出发时间
            endTime: this.formatTime(driverEndTime), // 计算结束时间
            totalDistance: driver.totalDistance / 1000,
            totalDuration: parseInt(driver.totalDuration) || 0,
            route: driver.optimizedOrder.map(stop => ({
              ...stop,
              arrivalTimeStr: '待计算',
              serviceStartStr: '待计算',
              departureTimeStr: '待计算',
              earliestTimeStr: this.formatTime(Math.floor(stop.earliestTime / 60)),
              latestTimeStr: this.formatTime(Math.floor(stop.latestTime / 60)),
              distanceKm: stop.distanceKm,
              durationMinutes: stop.durationMinutes,
              unloadMinutes: stop.unloadDuration,
              order: stop.order
            }))
          };
        }),
        report: {
          summary: {
            totalCustomers: convertedCustomers.length,
            allocatedCustomers: convertedCustomers.length,
            unallocatedCustomers: 0,
            totalDistance: fallbackResults.reduce((sum, d) => sum + d.totalDistance, 0) / 1000,
            totalDuration: fallbackResults.reduce((sum, d) => sum + d.totalDuration, 0) / 60
          },
          recommendations: []
        }
      };
      
      this.setData({
        smartOrderResult: fallbackFormattedResult
      });
    }
  },

  // 使用配置参数的智能排单优化
  async smartOrderOptimizationWithConfig(customers) {
    console.log('=== 开始配置化智能排单优化 ===');
    console.log('配置参数:', this.data.smartOrderConfig);
    
    if (!customers || customers.length === 0) {
      console.log('没有客户数据，无法进行智能排单');
      return;
    }

    // 转换数据结构，包含优先级计算
    const convertedCustomers = customers.map(item => {
      const dep = item.dep || item;
      
      // 系统自动计算优先级
      let systemPriority = 1;
      
      // 根据订单数量调整优先级
      const orderCount = item.totalCount || 0;
      if (orderCount > 10) systemPriority += 2;
      else if (orderCount > 5) systemPriority += 1;
      
      // 根据时间窗口紧迫度调整优先级
      const timeWindow = Math.floor((dep.nxDepartmentLatestDeliveryTime - dep.nxDepartmentEarliestDeliveryTime) / 60);
      if (timeWindow < 60) systemPriority += 2; // 1小时内
      else if (timeWindow < 120) systemPriority += 1; // 2小时内
      
      // 根据卸货时间调整优先级
              const unloadTime = dep.nxDepartmentUnloadDuration || this.data.smartOrderConfig.customerServiceTime;
      if (unloadTime > 45) systemPriority += 1; // 卸货时间长，优先级高
      
      // 清理时间数据
      const cleanedTime = this.cleanTimeData(
        dep.nxDepartmentEarliestDeliveryTime, 
        dep.nxDepartmentLatestDeliveryTime
      );
      
      return {
        name: dep.nxDepartmentName || '未知客户',
        lat: dep.nxDepartmentLat,
        lng: dep.nxDepartmentLng,
        address: dep.nxDepartmentAddress || '',
        nxDepartmentId: dep.nxDepartmentId, // 添加客户ID
        earliestTime: cleanedTime.earliest, // 已经是秒
        latestTime: cleanedTime.latest, // 已经是秒
        unloadDuration: dep.nxDepartmentUnloadDuration || this.data.smartOrderConfig.customerServiceTime, // 卸货时间（分钟）
        orderCount: item.totalCount || 0,
        pendingCount: item.unDo || 0,
        distance: dep.distance || null,
        duration: dep.duration || null,
        priority: systemPriority // 使用系统计算的优先级
      };
    });

    console.log('转换后的客户数据:', convertedCustomers);
    console.log('客户优先级信息:');
    convertedCustomers.forEach((customer, index) => {
      console.log(`  ${index + 1}. ${customer.name}: 优先级${customer.priority}`);
    });

    // 检查是否设置了出发坐标
    if (!this.data.fromLat || !this.data.fromLng) {
      console.log('未设置出发坐标，无法进行智能排单');
      wx.showToast({
        title: '请先设置出发坐标',
        icon: 'none'
      });
      return;
    }
    
    // 使用配置的参数
    const config = this.data.smartOrderConfig;
    
    // 执行简化的智能排单（只负责"谁送谁"）
    const driverAssignments = assignOrdersToDrivers(
      convertedCustomers, 
      config.driverCount,
      config.timeWindowTolerance * 60, // 转换为秒
      {
        startLocation: { 
          lat: this.data.fromLat, 
          lng: this.data.fromLng,
          address: this.data.fromAddress || ''
        },
        maxWorkHours: config.maxWorkHours,
        logLevel: 'INFO',
        priorityWeight: config.priorityWeight,
        maxTrips: config.maxTrips
      }
    );
    
    console.log('司机分配结果:', driverAssignments);
    
    // 构建调用后台API的数据格式
    const apiRequestData = {
      driverRoutes: driverAssignments.map(driverAssignment => ({
        driverId: Number(driverAssignment.driverId),
        fromLat: String(this.data.fromLat || '0'),
        fromLng: String(this.data.fromLng || '0'),
        customers: driverAssignment.customers.map(customer => ({
          lat: String(customer.lat || '0'),
          lng: String(customer.lng || '0'),
          customerId: Number(customer.nxDepartmentId || Math.floor(Math.random() * 1000)),
          name: String(customer.name || ''),
          address: String(customer.address || ''),
          earliestTime: String(customer.earliestTime || '0'),
          latestTime: String(customer.latestTime || '0'),
          unloadDuration: String(customer.unloadDuration || String(this.data.smartOrderConfig.customerServiceTime)),
          orderCount: String(customer.orderCount || '0'),
          pendingCount: String(customer.pendingCount || '0'),
          priority: String(customer.priority || '1')
        }))
      }))
    };
    
    console.log('准备发送给后台的数据:', JSON.stringify(apiRequestData, null, 2));
    
    // 调用后台API获取最优路线
    load.showLoading("正在计算最优路线");
    
    try {
      console.log('开始调用后台API...');
      console.log('API请求数据:', JSON.stringify(apiRequestData, null, 2));
      
      const response = await disGetDriversOptimalRoute(apiRequestData);
      console.log('后台返回的最优路线:', JSON.stringify(response, null, 2));
      
      if (response.result && response.result.code === 0) {
        // 处理后台返回的最优路线数据
        const optimizedResults = response.result.data || [];
        
        console.log('后台返回的优化结果:', optimizedResults);
        
        // 转换结果格式以适配页面显示
        console.log('=== 开始处理后台返回的优化结果 ===');
        
        // 为每个司机动态计算出发时间
        const driverStartTimes = this.calculateMultiDriverStartTimes(driverAssignments);
        
        // 初始化前一个司机的结束时间
        let previousDriverEndTime = this.data.smartOrderConfig.startTime * 60;
        
        const formattedResults = optimizedResults.map((driverRoute, driverIndex) => {
          console.log('处理司机路线:', driverRoute);
          
          // 从原始分配数据中找到对应的客户信息
          const originalDriverData = driverAssignments.find(d => d.driverId === driverRoute.driverId);
          const originalCustomers = originalDriverData ? originalDriverData.customers : [];
          
          console.log('原始客户数据:', originalCustomers);
          console.log('后台排序客户:', driverRoute.sortedCustomers);
          
          // 调试：查看后台返回的原始duration数据
          console.log('后台返回的原始duration数据:');
          driverRoute.sortedCustomers.forEach((customer, idx) => {
            console.log(`  客户${idx + 1}: duration=${customer.duration}, distance=${customer.distance}`);
          });
          
          // 当前司机的出发时间
          const driverStartTime = driverStartTimes[driverIndex];
          console.log(`司机${driverRoute.driverId}出发时间: ${this.formatTime(driverStartTime)} (${driverStartTime}分钟)`);
          
          // 根据后台返回的排序重新组织客户数据
          const sortedCustomers = driverRoute.sortedCustomers ? driverRoute.sortedCustomers.map((sortedCustomer, index) => {
            // 找到对应的原始客户数据
            const originalCustomer = originalCustomers.find(c => c.nxDepartmentId === sortedCustomer.nxDepartmentId);
            
            console.log(`客户${index + 1}匹配:`, {
              sortedCustomerId: sortedCustomer.nxDepartmentId,
              originalCustomer: originalCustomer ? originalCustomer.name : '未找到'
            });
            
            if (originalCustomer) {
              // 计算时间安排
              let currentTime = driverStartTime;
              
              // 计算到当前客户的时间
              for (let i = 0; i < index; i++) {
                const prevCustomer = driverRoute.sortedCustomers[i];
                const prevOriginalCustomer = originalCustomers.find(c => c.nxDepartmentId === prevCustomer.nxDepartmentId);
                if (prevOriginalCustomer) {
                  // 后台返回的duration可能是秒或分钟，需要检查
                  let travelDuration;
                  if (prevCustomer.duration && prevCustomer.duration > 100) {
                    // 如果duration大于100，可能是秒，需要转换为分钟
                    travelDuration = Math.floor(prevCustomer.duration / 60);
                  } else {
                    // 否则认为是分钟
                    travelDuration = parseInt(prevCustomer.duration) || 0;
                  }
                  const unloadDuration = prevOriginalCustomer.unloadDuration || this.data.smartOrderConfig.customerServiceTime; // 卸货时长（分钟）
                  currentTime += travelDuration + unloadDuration;
                  
                  console.log(`计算到客户${prevOriginalCustomer.name}的累计时间:`, {
                    originalDuration: prevCustomer.duration,
                    travelDuration: travelDuration,
                    unloadDuration: unloadDuration,
                    currentTime: currentTime
                  });
                }
              }
              
              // 后台返回的duration可能是秒或分钟，需要检查
              let travelDuration;
              if (sortedCustomer.duration && sortedCustomer.duration > 100) {
                // 如果duration大于100，可能是秒，需要转换为分钟
                travelDuration = Math.floor(sortedCustomer.duration / 60);
              } else {
                // 否则认为是分钟
                travelDuration = parseInt(sortedCustomer.duration) || 0;
              }
              const unloadDuration = originalCustomer.unloadDuration || this.data.smartOrderConfig.customerServiceTime; // 卸货时长（分钟）
              
              const departureTime = currentTime; // 出发时间
              const arrivalTime = departureTime + travelDuration; // 到达时间
              const serviceStartTime = arrivalTime; // 开始服务时间
              const departureFromCustomer = serviceStartTime + unloadDuration; // 离开客户时间
              
              console.log(`客户${originalCustomer.name}时间计算详情:`, {
                originalDuration: sortedCustomer.duration,
                travelDuration: travelDuration,
                departureTime: departureTime,
                arrivalTime: arrivalTime,
                serviceStartTime: serviceStartTime,
                departureFromCustomer: departureFromCustomer
              });
              
              console.log(`客户${originalCustomer.name}时间计算:`, {
                departureTime: `${departureTime}分钟 (${this.formatTime(departureTime)})`,
                arrivalTime: `${arrivalTime}分钟 (${this.formatTime(arrivalTime)})`,
                serviceStartTime: `${serviceStartTime}分钟 (${this.formatTime(serviceStartTime)})`,
                departureFromCustomer: `${departureFromCustomer}分钟 (${this.formatTime(departureFromCustomer)})`
              });
              
              return {
                ...originalCustomer,
                order: index + 1,
                // 使用后台返回的距离和时长信息
                distance: parseInt(sortedCustomer.distance) || 0,
                duration: parseInt(sortedCustomer.duration) || 0,
                // 基础信息
                earliestTimeStr: this.formatTime(Math.floor(originalCustomer.earliestTime / 60)),
                latestTimeStr: this.formatTime(Math.floor(originalCustomer.latestTime / 60)),
                distanceKm: sortedCustomer.distance ? (parseInt(sortedCustomer.distance) / 1000).toFixed(1) : '0.0',
                durationMinutes: travelDuration,
                unloadMinutes: originalCustomer.unloadDuration || this.data.smartOrderConfig.customerServiceTime,
                // 详细时间安排
                departureTimeStr: this.formatTime(departureTime),
                arrivalTimeStr: this.formatTime(arrivalTime),
                serviceStartStr: this.formatTime(serviceStartTime),
                departureFromCustomerStr: this.formatTime(departureFromCustomer),
                // 添加调试信息
                debugInfo: `距离:${sortedCustomer.distance}米, 时长:${sortedCustomer.duration}分钟, 卸货:${originalCustomer.unloadDuration || this.data.smartOrderConfig.customerServiceTime}分钟`
              };
            }
            return null;
          }).filter(c => c !== null) : [];
          
          console.log('排序后的客户数据:', sortedCustomers);
          
          // 计算司机的结束时间（最后一个客户离开的时间）
          let driverEndTime = driverStartTime;
          if (sortedCustomers.length > 0) {
            const lastCustomer = sortedCustomers[sortedCustomers.length - 1];
            driverEndTime = lastCustomer.departureFromCustomer || driverStartTime;
          }
          
          // 更新下一个司机的出发时间
          previousDriverEndTime = driverEndTime;
          console.log(`司机${driverRoute.driverId}结束时间: ${this.formatTime(driverEndTime)} (${driverEndTime}分钟)`);
          
          return {
            id: driverRoute.driverId,
            driverName: `司机${driverRoute.driverId}`,
            customerCount: sortedCustomers.length,
            startTime: this.formatTime(driverStartTime),
            endTime: this.formatTime(driverEndTime),
            totalDistance: sortedCustomers.reduce((sum, c) => sum + (c.distance || 0), 0),
            totalDuration: sortedCustomers.reduce((sum, c) => sum + (c.durationMinutes || 0), 0),
            route: sortedCustomers
          };
        });
        
        // 保存优化结果到页面数据
        this.setData({
          optimizedResults: formattedResults,
          smartOrderResult: {
            drivers: formattedResults,
            report: {
              summary: {
                totalCustomers: convertedCustomers.length,
                allocatedCustomers: driverAssignments.reduce((sum, d) => sum + d.customers.length, 0),
                totalDistance: driverAssignments.reduce((sum, d) => sum + d.customers.reduce((s, c) => s + (c.distance || 0), 0), 0)
              },
              recommendations: []
            },
            unassignedCustomers: []
          }
        });
        
        load.hideLoading();
        
        console.log('格式化后的优化结果:', formattedResults);
        
      } else {
        console.error('后台API返回错误:', response);
        load.hideLoading();
        wx.showToast({
          title: '路线优化失败',
          icon: 'none',
          duration: 2000
        });
        
        // 如果后台API失败，使用本地分配结果
        console.log('=== 开始本地分配结果时间计算 ===');
        console.log('driverAssignments:', driverAssignments);
        
        // 为每个司机动态计算出发时间
        const driverStartTimes = this.calculateMultiDriverStartTimes(driverAssignments);
        
        // 初始化前一个司机的结束时间
        let previousDriverEndTime = this.data.smartOrderConfig.startTime * 60;
        
        this.setData({
          smartOrderResult: {
            drivers: driverAssignments.map((driver, driverIndex) => {
              console.log(`=== 处理司机${driver.driverId} ===`);
              console.log('司机客户数据:', driver.customers);
              
              // 当前司机的出发时间
              const driverStartTime = driverStartTimes[driverIndex];
              console.log(`司机${driver.driverId}出发时间: ${this.formatTime(driverStartTime)} (${driverStartTime}分钟)`);
              
              let currentTime = driverStartTime;
              
              const customersWithTime = driver.customers.map((customer, index) => {
                // 后台返回的duration可能是秒或分钟，需要检查
                let travelDuration;
                if (customer.duration && customer.duration > 100) {
                  // 如果duration大于100，可能是秒，需要转换为分钟
                  travelDuration = Math.floor(customer.duration / 60);
                } else {
                  // 否则认为是分钟
                  travelDuration = parseInt(customer.duration) || 0;
                }
                const unloadDuration = customer.unloadDuration || this.data.smartOrderConfig.customerServiceTime; // 卸货时长（分钟）
                
                const departureTime = currentTime; // 出发时间
                const arrivalTime = departureTime + travelDuration; // 到达时间
                const serviceStartTime = arrivalTime; // 开始服务时间
                const departureFromCustomer = serviceStartTime + unloadDuration; // 离开客户时间
                
                // 更新下一个客户的出发时间
                currentTime = departureFromCustomer;
                
                return {
                  ...customer,
                  index: index + 1,
                  name: customer.name,
                  address: customer.address,
                  earliestTimeStr: this.formatSecondsToTime(customer.earliestTime),
                  latestTimeStr: this.formatSecondsToTime(customer.latestTime),
                  unloadMinutes: customer.unloadDuration,
                  distanceKm: ((customer.distance || 0) / 1000).toFixed(1),
                  durationMinutes: travelDuration,
                  // 详细时间安排
                  departureTimeStr: this.formatTime(departureTime),
                  arrivalTimeStr: this.formatTime(arrivalTime),
                  serviceStartStr: this.formatTime(serviceStartTime),
                  departureFromCustomerStr: this.formatTime(departureFromCustomer),
                  // 时间调试信息
                  timeDebug: `出发:${this.formatTime(departureTime)}, 到达:${this.formatTime(arrivalTime)}, 卸货:${this.formatTime(serviceStartTime)}, 离开:${this.formatTime(departureFromCustomer)}`
                };
              });
              
              // 更新下一个司机的出发时间
              previousDriverEndTime = currentTime;
              console.log(`司机${driver.driverId}结束时间: ${this.formatTime(currentTime)} (${currentTime}分钟)`);
              
              return {
                driverId: driver.driverId,
                driverName: `司机${driver.driverId}`,
                startTime: this.formatTime(driverStartTime), // 动态出发时间
                endTime: this.formatTime(currentTime), // 计算结束时间
                route: customersWithTime,
                totalDistance: driver.customers.reduce((sum, c) => sum + (c.distance || 0), 0),
                totalDuration: driver.customers.reduce((sum, c) => sum + (c.duration || 0), 0),
                customerCount: driver.customers.length
              };
            }),
            report: {
              summary: {
                totalCustomers: convertedCustomers.length,
                allocatedCustomers: driverAssignments.reduce((sum, d) => sum + d.customers.length, 0),
                totalDistance: driverAssignments.reduce((sum, d) => sum + d.customers.reduce((s, c) => s + (c.distance || 0), 0), 0)
              },
              recommendations: []
            },
            unassignedCustomers: []
          }
        });
      }
      
    } catch (error) {
      console.error('调用后台API失败:', error);
      load.hideLoading();
      wx.showToast({
        title: '网络错误，使用本地结果',
        icon: 'none',
        duration: 2000
      });
      
      // 如果API调用失败，使用本地分配结果
      console.log('=== 开始Catch块本地分配结果时间计算 ===');
      console.log('driverAssignments:', driverAssignments);
      
      // 为每个司机动态计算出发时间
      const driverStartTimes = this.calculateMultiDriverStartTimes(driverAssignments);
      
      // 初始化前一个司机的结束时间
      let previousDriverEndTime = this.data.smartOrderConfig.startTime * 60;
      
      this.setData({
        smartOrderResult: {
          drivers: driverAssignments.map((driver, driverIndex) => {
            console.log(`=== 处理司机${driver.driverId} (Catch块) ===`);
            console.log('司机客户数据:', driver.customers);
            
            // 当前司机的出发时间
            const driverStartTime = driverStartTimes[driverIndex];
            console.log(`司机${driver.driverId}出发时间: ${this.formatTime(driverStartTime)} (${driverStartTime}分钟)`);
            
            let currentTime = driverStartTime;
            
            const customersWithTime = driver.customers.map((customer, index) => {
              // 后台返回的duration可能是秒或分钟，需要检查
              let travelDuration;
              if (customer.duration && customer.duration > 100) {
                // 如果duration大于100，可能是秒，需要转换为分钟
                travelDuration = Math.floor(customer.duration / 60);
              } else {
                // 否则认为是分钟
                travelDuration = parseInt(customer.duration) || 0;
              }
                              const unloadDuration = customer.unloadDuration || this.data.smartOrderConfig.customerServiceTime; // 卸货时长（分钟）
              
              const departureTime = currentTime; // 出发时间
              const arrivalTime = departureTime + travelDuration; // 到达时间
              const serviceStartTime = arrivalTime; // 开始服务时间
              const departureFromCustomer = serviceStartTime + unloadDuration; // 离开客户时间
              
              // 更新下一个客户的出发时间
              currentTime = departureFromCustomer;
              
              console.log(`=== 客户${index + 1}时间计算调试(Catch块) ===`);
              console.log(`客户名称: ${customer.name}`);
              console.log(`行驶时长: ${travelDuration}分钟 (原始duration: ${customer.duration})`);
              console.log(`卸货时长: ${unloadDuration}分钟`);
              console.log(`出发时间: ${departureTime}分钟 (${this.formatTime(departureTime)})`);
              console.log(`到达时间: ${arrivalTime}分钟 (${this.formatTime(arrivalTime)})`);
              console.log(`开始服务: ${serviceStartTime}分钟 (${this.formatTime(serviceStartTime)})`);
              console.log(`离开客户: ${departureFromCustomer}分钟 (${this.formatTime(departureFromCustomer)})`);
              console.log(`下一个客户出发时间: ${currentTime}分钟 (${this.formatTime(currentTime)})`);
              console.log('=== 时间计算调试结束(Catch块) ===');
              
              console.log(`=== 客户${index + 1}时间计算调试 ===`);
              console.log(`客户名称: ${customer.name}`);
              console.log(`行驶时长: ${travelDuration}分钟 (原始duration: ${customer.duration})`);
              console.log(`卸货时长: ${unloadDuration}分钟`);
              console.log(`出发时间: ${departureTime}分钟 (${this.formatTime(departureTime)})`);
              console.log(`到达时间: ${arrivalTime}分钟 (${this.formatTime(arrivalTime)})`);
              console.log(`开始服务: ${serviceStartTime}分钟 (${this.formatTime(serviceStartTime)})`);
              console.log(`离开客户: ${departureFromCustomer}分钟 (${this.formatTime(departureFromCustomer)})`);
              console.log(`下一个客户出发时间: ${currentTime}分钟 (${this.formatTime(currentTime)})`);
              console.log('=== 时间计算调试结束 ===');
              
              return {
                ...customer,
                index: index + 1,
                name: customer.name,
                address: customer.address,
                earliestTimeStr: this.formatSecondsToTime(customer.earliestTime),
                latestTimeStr: this.formatSecondsToTime(customer.latestTime),
                unloadMinutes: customer.unloadDuration,
                distanceKm: ((customer.distance || 0) / 1000).toFixed(1),
                durationMinutes: travelDuration,
                // 详细时间安排
                departureTimeStr: this.formatTime(departureTime),
                arrivalTimeStr: this.formatTime(arrivalTime),
                serviceStartStr: this.formatTime(serviceStartTime),
                departureFromCustomerStr: this.formatTime(departureFromCustomer),
                // 时间调试信息
                timeDebug: `出发:${this.formatTime(departureTime)}, 到达:${this.formatTime(arrivalTime)}, 卸货:${this.formatTime(serviceStartTime)}, 离开:${this.formatTime(departureFromCustomer)}`
              };
                          });
              
              // 更新下一个司机的出发时间
              previousDriverEndTime = currentTime;
              console.log(`司机${driver.driverId}结束时间: ${this.formatTime(currentTime)} (${currentTime}分钟)`);
              
              return {
                driverId: driver.driverId,
                driverName: `司机${driver.driverId}`,
                startTime: this.formatTime(driverStartTime), // 动态出发时间
                endTime: this.formatTime(currentTime), // 计算结束时间
                route: customersWithTime,
                totalDistance: driver.customers.reduce((sum, c) => sum + (c.distance || 0), 0),
                totalDuration: driver.customers.reduce((sum, c) => sum + (c.duration || 0), 0),
                customerCount: driver.customers.length
              };
          }),
          report: {
            summary: {
              totalCustomers: convertedCustomers.length,
              allocatedCustomers: driverAssignments.reduce((sum, d) => sum + d.customers.length, 0),
              totalDistance: driverAssignments.reduce((sum, d) => sum + d.customers.reduce((s, c) => s + (c.distance || 0), 0), 0)
            },
            recommendations: []
          },
          unassignedCustomers: []
        }
      });
      
      console.log('=== 本地分配结果时间计算完成 ===');
      console.log('最终设置的smartOrderResult:', this.data.smartOrderResult);
    }
  },

  // 已废弃：多司机路线优化函数（现在使用smartOrderOptimization）
  /*
  optimizeMultiDriverRoutes(customers, driverCount = 2) {
    console.log('=== 开始多司机路线优化 ===');
    
    if (!customers || customers.length === 0) {
      console.log('没有客户数据，无法进行多司机优化');
      return;
    }

    // 转换数据结构
    const convertedCustomers = customers.map(item => {
      const dep = item.dep || item;
      return {
        name: dep.nxDepartmentName || '未知客户',
        lat: dep.nxDepartmentLat,
        lng: dep.nxDepartmentLng,
        address: dep.nxDepartmentAddress || '',
        earliestTime: dep.nxDepartmentEarliestDeliveryTime,
        latestTime: dep.nxDepartmentLatestDeliveryTime,
        unloadDuration: dep.nxDepartmentUnloadDuration || this.data.smartOrderConfig.customerServiceTime, // 卸货时间（分钟）
        orderCount: item.totalCount || 0,
        pendingCount: item.unDo || 0,
        distance: dep.distance || null,
        duration: dep.duration || null
      };
    });

    console.log('转换后的客户数据:', convertedCustomers);
    console.log('客户地址信息:');
    convertedCustomers.forEach((customer, index) => {
      console.log(`  ${index + 1}. ${customer.name}: ${customer.address || '未设置地址'}`);
    });

    // 检查是否设置了出发坐标
    if (!this.data.fromLat || !this.data.fromLng) {
      console.log('未设置出发坐标，无法进行路线优化');
      wx.showToast({
        title: '请先设置出发坐标',
        icon: 'none'
      });
      return;
    }
    
    // 配置选项
    const options = {
      startLocation: { 
        lat: this.data.fromLat, 
        lng: this.data.fromLng,
        address: this.data.fromAddress || ''
      }, // 使用设置的坐标
      driverStartTimes: [], // 让系统根据客户时间窗口动态计算出发时间
      maxWorkHours: this.data.smartOrderConfig.maxWorkHours, // 最大工作时长
      customerServiceTime: this.data.smartOrderConfig.customerServiceTime * 60, // 每个客户服务时间（秒）
      balanceWorkload: true // 平衡工作量
    };

    // 执行多司机路线优化
    const result = optimizeMultiDriverRoute(convertedCustomers, driverCount, options);
    
    // 格式化并打印报告
    formatMultiDriverReport(result);
    
    // 格式化结果以适配页面显示
    const formattedResult = {
      drivers: result.drivers.map(driver => ({
        ...driver,
        route: driver.route.map(stop => ({
          ...stop,
          distance: ((stop.distance || 0) / 1000).toFixed(1), // 转换为公里
          duration: Math.floor((stop.duration || 0) / 60), // 转换为分钟
          customer: {
            ...stop.customer,
            earliestTimeStr: this.formatSecondsToTime(stop.customer.earliestTime),
            latestTimeStr: this.formatSecondsToTime(stop.customer.latestTime),
            unloadDurationStr: `${stop.customer.unloadDuration || this.data.smartOrderConfig.customerServiceTime}分钟`
          }
        }))
      })),
      unallocatedCustomers: result.unallocatedCustomers,
      report: result.report
    };
    
    // 保存结果到页面数据
    this.setData({
      multiDriverResult: formattedResult
    });
    
    // 显示成功提示
    wx.showToast({
      title: '路线规划完成',
      icon: 'success',
      duration: 2000
    });
  },
  */

  // 设置出发坐标
  setStartLocation() {
    wx.showActionSheet({
      itemList: ['使用当前位置', '手动输入坐标', '选择地图位置'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.getCurrentLocation();
            break;
          case 1:
            this.showCoordinateInput();
            break;
          case 2:
            this.chooseLocationFromMap();
            break;
        }
      }
    });
  }, 

  // 显示坐标输入框
  showCoordinateInput() {
    wx.showModal({
      title: '输入出发坐标',
      content: '请输入出发位置的经纬度坐标',
      editable: true,
      placeholderText: '格式: 纬度,经度 (如: 39.98246,117.07822)',
      success: (res) => {
        if (res.confirm && res.content) {
          const coords = res.content.split(',');
          if (coords.length === 2) {
            const lat = parseFloat(coords[0].trim());
            const lng = parseFloat(coords[1].trim());
            if (!isNaN(lat) && !isNaN(lng)) {
                      this.setData({
          fromLat: lat,
          fromLng: lng,
          fromAddress: ''
        });
              wx.showToast({
                title: '坐标设置成功',
                icon: 'success'
              });
              
              // 设置坐标成功后，刷新客户数据
              this._getTodayCustomer();
            } else {
              wx.showToast({
                title: '坐标格式错误',
                icon: 'none'
              });
            }
          } else {
            wx.showToast({
              title: '坐标格式错误',
              icon: 'none'
            });
          }
        }
      }
    });
  },

  // 从地图选择位置
  chooseLocationFromMap() {
    wx.chooseLocation({
      success: (res) => {
        this.setData({
          fromLat: res.latitude,
          fromLng: res.longitude,
          fromAddress: res.address || res.name || ''
        });
        wx.showToast({
          title: '位置设置成功',
          icon: 'success'
        });
        
        // 设置位置成功后，刷新客户数据
        this._getTodayCustomer();
      },
      fail: (err) => {
        console.log('选择位置失败:', err);
        wx.showToast({
          title: '选择位置失败',
          icon: 'none'
        });
      }
    });
  },

  // 手动触发路线优化
  // 显示智能排单参数配置
  showSmartOrderConfig() {
    this.setData({
      showSmartOrderConfig: true
    });
  },

  // 隐藏智能排单参数配置（已禁用，参数面板保持显示）
  hideSmartOrderConfig() {
    // 参数面板保持显示，不隐藏
    console.log('参数面板保持显示状态');
  },

  // 司机人数输入处理
  onDriverCountInput(e) {
    const inputValue = e.detail.value;
    let value;
    
    if (inputValue === '' || inputValue === null || inputValue === undefined) {
      // 如果输入框为空，保持当前值不变
      return;
    }
    
    value = parseInt(inputValue);
    if (isNaN(value)) {
      // 如果解析失败，保持当前值不变
      return;
    }
    
    // 只限制最小值为1，允许任意正整数
    const validValue = Math.max(1, value);
    this.setData({
      'smartOrderConfig.driverCount': validValue
    });
  },

  // 超窗宽容度输入处理
  onTimeWindowToleranceInput(e) {
    const inputValue = e.detail.value;
    let value;
    
    if (inputValue === '' || inputValue === null || inputValue === undefined) {
      return;
    }
    
    value = parseInt(inputValue);
    if (isNaN(value)) {
      return;
    }
    
    const validValue = Math.max(0, Math.min(60, value));
    this.setData({
      'smartOrderConfig.timeWindowTolerance': validValue
    });
  },

  // 最大趟数输入处理
  onMaxTripsInput(e) {
    const inputValue = e.detail.value;
    let value;
    
    if (inputValue === '' || inputValue === null || inputValue === undefined) {
      return;
    }
    
    value = parseInt(inputValue);
    if (isNaN(value)) {
      return;
    }
    
    const validValue = Math.max(1, Math.min(3, value));
    this.setData({
      'smartOrderConfig.maxTrips': validValue
    });
  },

  // 优先级权重输入处理
  onPriorityWeightInput(e) {
    const inputValue = e.detail.value;
    let value;
    
    if (inputValue === '' || inputValue === null || inputValue === undefined) {
      return;
    }
    
    value = parseInt(inputValue);
    if (isNaN(value)) {
      return;
    }
    
    const validValue = Math.max(0, Math.min(100, value));
    this.setData({
      'smartOrderConfig.priorityWeight': validValue
    });
  },

  // 出发时间输入处理
  onStartTimeInput(e) {
    const inputValue = e.detail.value;
    let value;
    
    if (inputValue === '' || inputValue === null || inputValue === undefined) {
      return;
    }
    
    value = parseInt(inputValue);
    if (isNaN(value)) {
      return;
    }
    
    // 限制在0-23小时范围内
    const validValue = Math.max(0, Math.min(23, value));
    this.setData({
      'smartOrderConfig.startTime': validValue
    });
  },

  // 最大工作时长输入处理
  onMaxWorkHoursInput(e) {
    const inputValue = e.detail.value;
    let value;
    
    if (inputValue === '' || inputValue === null || inputValue === undefined) {
      return;
    }
    
    value = parseInt(inputValue);
    if (isNaN(value)) {
      return;
    }
    
    // 限制在1-24小时范围内
    const validValue = Math.max(1, Math.min(24, value));
    this.setData({
      'smartOrderConfig.maxWorkHours': validValue
    });
  },

  // 客户服务时间输入处理
  onCustomerServiceTimeInput(e) {
    const inputValue = e.detail.value;
    let value;
    
    if (inputValue === '' || inputValue === null || inputValue === undefined) {
      return;
    }
    
    value = parseInt(inputValue);
    if (isNaN(value)) {
      return;
    }
    
    // 限制在5-120分钟范围内
    const validValue = Math.max(5, Math.min(120, value));
    this.setData({
      'smartOrderConfig.customerServiceTime': validValue
    });
  },

  // 应用智能排单配置
  applySmartOrderConfig() {
    if (!this.data.nxDepArr || this.data.nxDepArr.length === 0) {
      wx.showToast({
        title: '没有客户数据',
        icon: 'none'
      });
      return;
    }


    // 配置界面保持显示（不隐藏）
    console.log('配置界面保持显示状态');

    // 使用配置的参数执行智能排单
    this.smartOrderOptimizationWithConfig(this.data.nxDepArr).catch(error => {
      console.error('应用智能排单配置失败:', error);
      wx.showToast({
        title: '应用配置失败',
        icon: 'none'
      });
    });

  },

  // 检查司机人数缓存
  checkDriverCountCache() {
    const cachedDriverCount = wx.getStorageSync('driverCount');
    console.log('检查司机人数缓存:', cachedDriverCount);
    
    if (cachedDriverCount && cachedDriverCount > 0) {
      // 有缓存，使用缓存的司机人数
      this.setData({
        cachedDriverCount: cachedDriverCount
      });
      console.log('使用缓存的司机人数:', cachedDriverCount);
    } else {
      // 没有缓存，自动弹出设置页面
      console.log('没有司机人数缓存，自动弹出设置页面');
      this.showDriverCountModal();
    }
  },

  // 显示司机人数设置弹窗
  showDriverCountModal() {
    wx.showModal({
      title: '设置司机人数',
      content: '',
      editable: true,
      placeholderText: '请输入司机人数',
      success: (res) => {
        if (res.confirm) {
          const driverCount = parseInt(res.content) || 1;
          const validDriverCount = Math.max(1, Math.min(5, driverCount));
          
          // 保存到缓存
          wx.setStorageSync('driverCount', validDriverCount);
          console.log('司机人数已保存到缓存:', validDriverCount);
          
          this.setData({
            cachedDriverCount: validDriverCount
          });
          
          wx.showToast({
            title: '司机人数已设置',
            icon: 'success',
            duration: 1500
          });
          
          // 设置完成后自动执行路线优化
          setTimeout(() => {
            this.executeRouteOptimization(validDriverCount);
          }, 1500);
        }
      }
    });
  },

  // 重置司机人数
  resetDriverCount() {
    wx.showModal({
      title: '重置司机人数',
      content: '确定要重置司机人数设置吗？',
      success: (res) => {
        if (res.confirm) {
          // 清除缓存
          wx.removeStorageSync('driverCount');
          
          this.setData({
            cachedDriverCount: null
          });
          
          wx.showToast({
            title: '司机人数已重置',
            icon: 'success',
            duration: 1500
          });
          
          // 重新弹出设置页面
          setTimeout(() => {
            this.showDriverCountModal();
          }, 1500);
        }
      }
    });
  },

  // 执行路线优化
  executeRouteOptimization(driverCount) {
    console.log('执行路线优化，司机人数:', driverCount);
    if (!this.data.nxDepArr || this.data.nxDepArr.length === 0) {
      wx.showToast({
        title: '没有客户数据',
        icon: 'none'
      });
      return;
    }

    wx.showLoading({
      title: '正在规划路线...'
    });

    // 执行智能排单
    this.smartOrderOptimization(this.data.nxDepArr, driverCount).catch(error => {
      console.error('执行路线优化失败:', error);
      wx.hideLoading();
      wx.showToast({
        title: '路线优化失败',
        icon: 'none'
      });
    });

  },


  onNavButtonTap() {
    wx.navigateTo({
      url: '../../../subPackage/pages/management/homePage/homePage',
    });
  },

  // 修改路线优化触发方法
  triggerRouteOptimization() {
    console.log('触发路线优化，客户数据:', this.data.nxDepArr);
    if (!this.data.nxDepArr || this.data.nxDepArr.length === 0) {
      wx.showToast({
        title: '没有客户数据',
        icon: 'none'
      });
      return;
    }

    // 检查是否有缓存的司机人数
    const cachedDriverCount = this.data.cachedDriverCount || wx.getStorageSync('driverCount');
    
    if (cachedDriverCount && cachedDriverCount > 0) {
      // 使用缓存的司机人数
      this.executeRouteOptimization(cachedDriverCount);
    } else {
      // 没有缓存，弹出设置页面
      this.showDriverCountModal();
    }
  }
})
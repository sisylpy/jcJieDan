const globalData = getApp().globalData;
var load = require('../../../lib/load.js');

import apiUrl from '../../../config.js'

const tabBarHeight = 50; // 根据实际情况调整
const viewBarHeight = 60;

import {
  stockerGetWaitStockGoodsDeps,
} from '../../../lib/apiDistributer.js'

import {
  disLoginKf
} from '../../../lib/apiDistributer'

Page({
  data: {
    firstLoading: true,
    onPurchaseRefresh: false,
    update: false,
    changeIds: false,
    printOk: false,
    paperSize: 1 // 默认小尺寸：4*3cm
  },

  onShow() {
    //tabBar
    if (typeof this.getTabBar === 'function' &&
      this.getTabBar()) {
      this.getTabBar().setData({
        selected: 0
      })
    }

    var value = wx.getStorageSync('userInfo');
    if (value) {
      var disInfo = value.nxDistributerEntity;
      this.setData({
        userInfo: value,
        disId: value.nxDistributerEntity.nxDistributerId,
        disInfo: disInfo,
        disBusinessType: value.nxDistributerBusinessTypeId 
      })

      // 立即存储 disInfo 到缓存，确保 tabBar 能获取到
      if (disInfo) {
        wx.setStorageSync('disInfo', disInfo);
      }

      // 主动更新 tabBar 列表（确保程序刚打开时也能正确显示）
      if (typeof this.getTabBar === 'function' && this.getTabBar()) {
        if (typeof this.getTabBar().updateTabBarList === 'function') {
          this.getTabBar().updateTabBarList();
        }
      }

      this._getTodayCustomer();
     
    } else {
      this._login();
    }
    
    // 检查是否有缓存的打印机设备ID，如果有则自动连接
    this.checkAndConnectPrinter();
    
    // 读取缓存的标签尺寸
    var cachedPaperSize = wx.getStorageSync('paperSize');
    if (cachedPaperSize) {
      this.setData({
        paperSize: cachedPaperSize
      });
    }

    const app = getApp();
    const navBarHeight = app.globalData.navBarHeight;
    const screenHeight = app.globalData.screenHeight;
    const screenWidth = app.globalData.screenWidth;
    const rpxRatio = 750 / screenWidth;
    const navBarHeightRpx = navBarHeight * rpxRatio;
    const viewBarHeightRpx = viewBarHeight * rpxRatio;
    const tabBarHeightRpx = 100;
    const contentHeight = (screenHeight - navBarHeight - tabBarHeight - viewBarHeight) * rpxRatio;
    console.log("godosoososso", globalData);
    this.setData({
      contentHeight: contentHeight,
      navBarHeight: navBarHeightRpx,
      tabBarHeight: tabBarHeightRpx,
      viewBarHeight: viewBarHeightRpx,
      leftMenuWidth: 150, // 左侧菜单宽度，单位 rpx
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server, // 设置服务器地址，用于图片路径拼接（合并到一次 setData）
    })
  },

  // 页面级别的下拉刷新处理函数
  onPullDownRefresh() {
    this.onPurchaseRefresh();
  },

  // Purchase页面刷新
  onPurchaseRefresh() {
    console.log("onPurchaseRefreshonPurchaseRefresh")
    load.showLoading("获取今日订单");
    var that = this;
    disGetTodayOrderCustomer(this.data.disId).then(res => {
      load.hideLoading();
      console.log(res.result.data)
      if (res.result.code == 0) {
        this.setData({
          nxDepArr: res.result.data.deps.nxDep,
          gbDisArr: res.result.data.deps.gbDisArr,
          gbDisArrApp: res.result.data.deps.gbDisArrApp,
          unPayCount: res.result.data.unPayCount,
          disInfo: res.result.data.disInfo,
          returnList: res.result.data.returnList,
          unPayGbBills: res.result.data.unPayGbBills,
          firstLoading: false
        })
        wx.stopPullDownRefresh()
        wx.setStorageSync('disInfo', res.result.data.disInfo);
        wx.setStorageSync('numberBooks', res.result.data.books)
        if (res.result.data.disInfo.nxDistributerBuyQuantity < 1) {
          wx.navigateTo({
            url: '../../../subPackage/pages/management/payPage/payPage?type=0',
          })
        }

        // 更新 tabBar 数据
        if (that.getTabBar()) {
        that.getTabBar().setData({
          stockCount: res.result.data.stockCount,
          stockCountOk: res.result.data.stockCountOk,
          wxCount: res.result.data.wxCount,
          wxCountOk: res.result.data.wxCountOk,
          prepareCount: res.result.data.preOrders,
          buyOrders: res.result.data.buyOrders,
          buyOrdersOk: res.result.data.buyOrdersOk,
          });
          
          // 更新 tabBar 列表（disInfo 可能已更新）
          if (typeof that.getTabBar().updateTabBarList === 'function') {
            that.getTabBar().updateTabBarList();
          }
        }
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
        wx.stopPullDownRefresh()
      }
    })
  },


  _login() {
    var that = this;
    wx.login({
      success: (res) => {
        load.hideLoading();

        var disUser = {
          nxDiuCode: res.code,
        }
        load.showLoading("登录中")
        disLoginKf(disUser)
          .then((res) => {
            load.hideLoading();
            console.log(res.result.data);
            if (res.result.code !== -1) { //登陆成功
              this.setData({
                userInfo: res.result.data.userInfo,
                disInfo: res.result.data.disInfo,
                disId: res.result.data.disInfo.nxDistributerId,
              })

              wx.setStorageSync('userInfo', res.result.data.userInfo);
              wx.setStorageSync('disInfo', res.result.data.disInfo);
             
              that._getTodayCustomer()
           
            } else {

               // 登陆失败
              // wx.showModal({
              //   title: res.result.msg,
              //   content: "请注册",
              //   showCancel: false,
              //   confirmText: "知道了",
              // })
              wx.redirectTo({
                url: '../../inviteAdmin/inviteAdmin',
              })

            }
          })
      },
      
      fail: (res => {
        load.hideLoading();
        wx.showModal({
          title: res.result.msg,
          showCancel: false,
          confirmText: "知道了",
        })
      })
    })


  },


  /**
   * 获取客户订单
   */
  _getTodayCustomer() {
    var data = {
      disId: this.data.disId,
    }
    load.showLoading("获取数据中");
    stockerGetWaitStockGoodsDeps(data).then(res => {
      load.hideLoading();
      console.log(res.result.data)
      if (res.result.code == 0) {
        this.setData({
          nxDepArr: res.result.data.nxDep,
          gbDepArr: res.result.data.gbDep
        })
        
        // 检查是否有部门被选中
        var hasSelectedDep = this._checkHasSelectedDep();
        this.setData({
          changeIds: hasSelectedDep
        })
        
        this.getTabBar().setData({
          stockCount: res.result.data.depOrdersWait,
          
        })
      
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },

  
  toStock(){
    this.setData({
      changeIds: false
    })

  
      var nxLeg = this.data.nxDepArr.length;
      var nxIds = [];
      var nxDepName = [];
      if (nxLeg > 0) {
        var nxDepArr = this.data.nxDepArr;
        var nxUn = 0;
        for (var i = 0; i < nxDepArr.length; i++) {
          if (nxDepArr[i].isSelected) {
            nxIds.push(nxDepArr[i].nxDepartmentId);
            nxDepName.push(nxDepArr[i].nxDepartmentName);
          }else{
            nxUn = Number(nxUn) + Number(1);
          }
        }
      }

      var gbLeg = this.data.gbDepArr.length;
      var gbIds = [];
      var gbDepName = [];
      if (gbLeg > 0) {
        var gbDepArr = this.data.gbDepArr;
        var gbUn = 0 ;
        for (var i = 0; i < gbDepArr.length; i++) {
          if (gbDepArr[i].isSelected) {
            gbIds.push(gbDepArr[i].gbDepartmentId);
            gbDepName.push(gbDepArr[i].gbDepartmentName);
          }else{
            gbUn = Number(gbUn) + Number(1);
          }
        }
      }

    console.log("ddd")
    console.log("gbun===", gbUn + "gblend====", gbLeg , "nxun====", nxUn, "nxlieng===", nxLeg);
    if(gbUn !== gbLeg || nxUn !== nxLeg){
      var idsChangeStock = {
        haveIds: true,
        outNxDepIds: nxIds,
        outNxDepNames: nxDepName,
        outGbDepIds: gbIds,
        outGbDepNamews: gbDepName,
      }
      wx.setStorageSync('idsChangeStock', idsChangeStock);
    }
    
    if(this.data.disInfo.nxDistributerBusinessTypeId < 2){
      wx.navigateTo({
        url: '../../stock/index/index',
      })
    }else{
      wx.navigateTo({
        url: '../../stock/indexShelf/indexShelf',
      })
    }
   

  },  

  toWaitDep(e) {
    this.setData({
      changeIds: false
    })
    wx.navigateTo({
      url: '../../../subPackage/pages/prepare/orderDepList/orderDepList?disId=' + this.data.disId ,
    })
  },


  _updateGbDep(res){
    var idsChangeStock = wx.getStorageSync('idsChangeStock');
    var depTempArr = [];
    var outGbDepIds = idsChangeStock.outGbDepIds;
    if(outGbDepIds.length > 0){
      for(var i = 0; i < outGbDepIds.length;i++){
        var id = outGbDepIds[i];
        var depArr = res.result.data.gbDep;
        if(depArr.length > 0){
          for(var j = 0; j < depArr.length; j++){
            var item  = depArr[j];
            var depId = item.gbDepartmentId;
            if(id == depId){
               item.isSelected = true;
            }
            depTempArr.push(depArr[i]);
          }
        }
        this.setData({
          gbDepArr: depTempArr
        })
      }
    }else{
      var depArr = res.result.data.gbDep;
      var depTempArrNx = [];
      if(depArr.length > 0){
        for(var j = 0; j < depArr.length; j++){
          var item  = depArr[j];
           item.isSelected = false;
           depTempArrNx.push(item);
        }
      }
      this.setData({
        gbDepArr: depTempArrNx
      })
    }

    // 检查是否有部门被选中
    var hasSelectedDep = this._checkHasSelectedDep();
    this.setData({
      changeIds: hasSelectedDep
    })
  },

  _updateNxDep(res){
    var idsChangeStock = wx.getStorageSync('idsChangeStock');
    var depTempArr = [];
    var outNxDepIds = idsChangeStock.outNxDepIds;
    console.log(idsChangeStock.outNxDepIds);
    if(outNxDepIds.length > 0){
        var depArr = res.result.data.nxDep;
        if(depArr.length > 0){
          for(var j = 0; j < depArr.length; j++){
            var item  = depArr[j];
            var depId = item.nxDepartmentId;
            for(var i = 0; i < outNxDepIds.length;i++){
              var id = outNxDepIds[i];
              if(id == depId){
                item.isSelected = true;
             }
            }
            depTempArr.push(item);
          }
        }
      
      this.setData({
        nxDepArr: depTempArr
      })
    }else{
      var depArr = res.result.data.nxDep;
      var depTempArrNx = [];
      if(depArr.length > 0){
        for(var j = 0; j < depArr.length; j++){
          var item  = depArr[j];
           item.isSelected = false;
           depTempArrNx.push(item);
        }
      }
      this.setData({
        nxDepArr: depTempArrNx
      })
    
    }

    // 检查是否有部门被选中
    var hasSelectedDep = this._checkHasSelectedDep();
    this.setData({
      changeIds: hasSelectedDep
    })

  },


  choiceDep(e) {
    var index = e.currentTarget.dataset.index;
    var type = e.currentTarget.dataset.type;
    if (type == 'nx') {
      var depData = "nxDepArr[" + index + "].isSelected";
      var sel = this.data.nxDepArr[index].isSelected;
      if (sel) {
        this.setData({
          [depData]: false
        })
      } else {
        this.setData({
          [depData]: true
        })
      }
    }

    if (type == 'gb') {
      var depData = "gbDepArr[" + index + "].isSelected";
      var sel = this.data.gbDepArr[index].isSelected;
      if (sel) {
        this.setData({
          [depData]: false
        })
      } else {
        this.setData({
          [depData]: true
        })
      }
    }

    // 检查是否有部门被选中
    var hasSelectedDep = this._checkHasSelectedDep();
    this.setData({
      changeIds: hasSelectedDep
    })
  },

  // 检查是否有部门被选中的辅助方法
  _checkHasSelectedDep() {
    var nxDepArr = this.data.nxDepArr || [];
    var gbDepArr = this.data.gbDepArr || [];
    
    // 检查nx部门是否有选中的
    for (var i = 0; i < nxDepArr.length; i++) {
      if (nxDepArr[i].isSelected) {
        return true;
      }
    }
    
    // 检查gb部门是否有选中的
    for (var i = 0; i < gbDepArr.length; i++) {
      if (gbDepArr[i].isSelected) {
        return true;
      }
    }
    
    return false;
  },

  // 已拣货客户详细
  toCarDep(e) {
    console.log("toCarDeptoCarDep");
    if(e.currentTarget.dataset.type == 'nx'){
      var depId = e.currentTarget.dataset.id;
      var name = e.currentTarget.dataset.name;
      wx.navigateTo({
        url: '../depOutOrder/depOutOrder?depFatherId=' + depId
         + '&gbDepFatherId=-1&resFatherId=-1' + '&depName=' + name,
      }) 
    }else{
      var depId = e.currentTarget.dataset.id;
      var name = e.currentTarget.dataset.name;
      wx.navigateTo({
        url: '../depOutOrder/depOutOrder?depFatherId==1&gbDepFatherId='+ depId + '&resFatherId=-1'+'&depName=' + name,
      }) 
    }
      
  },


  onNavButtonTap(){
    wx.navigateTo({
      url: '../../disUserEdit/disUserEdit',
    })

    
  },

  // 检查并连接打印机
  checkAndConnectPrinter() {
    var that = this;
    var app = getApp();
    
    // 先检查缓存中是否有设备信息
    var cachedDeviceInfo = wx.getStorageSync('bleDeviceInfo');
    
    // 如果没有缓存，设置为未连接
    if (!cachedDeviceInfo || !cachedDeviceInfo.deviceId) {
      that.setData({
        printOk: false
      });
      return;
    }
    
    // 恢复全局数据
    app.globalData.BLEInformation = cachedDeviceInfo;
    
    // 如果已经连接且是同一个设备，直接返回
    if (app.globalData.BLEInformation.isConnected && 
        app.globalData.BLEInformation.deviceId === cachedDeviceInfo.deviceId) {
      console.log('打印机已连接');
      that.setData({
        printOk: true
      });
      return;
    }
    
    // 尝试连接打印机
    wx.openBluetoothAdapter({
      success: function(res) {
        console.log('蓝牙适配器初始化成功');
        setTimeout(() => {
          wx.createBLEConnection({
            deviceId: cachedDeviceInfo.deviceId,
            success: function(res) {
              console.log('打印机连接成功');
              app.globalData.BLEInformation.isConnected = true;
              that.setData({
                printOk: true
              });
            },
            fail: function(err) {
              // 如果是已连接错误，认为连接成功
              if (err.errCode === 1509007 || err.errMsg.indexOf('already connect') !== -1) {
                console.log('打印机已连接（之前已连接）');
                app.globalData.BLEInformation.isConnected = true;
                that.setData({
                  printOk: true
                });
              } else {
                console.log('打印机连接失败，需要重新设置', err);
                that.setData({
                  printOk: false
                });
              }
            }
          });
        }, 500);
      },
      fail: function(err) {
        console.log('蓝牙适配器初始化失败');
        that.setData({
          printOk: false
        });
      }
    });
  },
  
  // 设置打印机
  setPrint() {
    console.log('=== setPrint 方法被调用 ===');
    var that = this;
    var app = getApp();
    
    console.log('当前 printOk 状态:', this.data.printOk);
    console.log('BLE 信息:', app.globalData.BLEInformation);
    console.log('设备ID:', app.globalData.BLEInformation && app.globalData.BLEInformation.deviceId);
    
    // 检查是否已连接
    if (this.data.printOk && app.globalData.BLEInformation && app.globalData.BLEInformation.deviceId) {
      console.log('打印机已连接，显示测试打印对话框');
      // 已连接，执行测试打印
      wx.showModal({
        title: '提示',
        content: '打印机已连接，是否测试打印？',
        success: function(res) {
          console.log('用户选择:', res.confirm ? '确认' : '取消');
          if (res.confirm) {
            console.log('用户确认，调用 testPrint');
            that.testPrint();
          }
        }
      });
    } else {
      console.log('打印机未连接，跳转到设置页面');
      // 未连接，跳转到连接页面
      wx.navigateTo({
        url: '../../printer/printer',
      });
    }
  },
  
  // 发现并缓存可写特征
  discoverAndCacheWritableChar(deviceId) {
    var that = this;
    return new Promise(function(resolve, reject) {
      console.log('开始发现服务和特征...');
      
      wx.getBLEDeviceServices({
        deviceId: deviceId,
        success: function(res) {
          console.log('获取服务列表成功:', res);
          var services = res.services || [];
          
          // 优先找含 FFF0、FFF2、180F 的服务
          var targetServices = services.filter(function(s) {
            return /fff0/i.test(s.uuid) || /ffe0/i.test(s.uuid) || /180f/i.test(s.uuid) || /fff2/i.test(s.uuid);
          });
          
          var service = targetServices[0] || services[0];
          
          if (!service) {
            reject(new Error('未发现可用服务'));
            return;
          }
          
          console.log('选择服务:', service.uuid);
          
          wx.getBLEDeviceCharacteristics({
            deviceId: deviceId,
            serviceId: service.uuid,
            success: function(chrRes) {
              console.log('获取特征列表成功:', chrRes);
              var chs = chrRes.characteristics || [];
              
              // 优先选择 writeNoResponse，其次 write
              var writable = null;
              for (var i = 0; i < chs.length; i++) {
                if (chs[i].properties.writeNoResponse) {
                  writable = chs[i];
                  console.log('找到 writeNoResponse 特征:', writable.uuid);
                  break;
                }
              }
              
              if (!writable) {
                for (var i = 0; i < chs.length; i++) {
                  if (chs[i].properties.write) {
                    writable = chs[i];
                    console.log('找到 write 特征:', writable.uuid);
                    break;
                  }
                }
              }
              
              if (!writable) {
                reject(new Error('未发现可写特征'));
                return;
              }
              
              // 找一个 notify 特征备用
              var notifyChar = null;
              for (var i = 0; i < chs.length; i++) {
                if (chs[i].properties.notify) {
                  notifyChar = chs[i];
                  console.log('找到 notify 特征:', notifyChar.uuid);
                  break;
                }
              }
              
              // 更新全局数据
              var app = getApp();
              app.globalData.BLEInformation.writeServiceId = service.uuid;
              app.globalData.BLEInformation.writeCharaterId = writable.uuid;
              
              if (notifyChar) {
                app.globalData.BLEInformation.notifyCharaterId = notifyChar.uuid;
                app.globalData.BLEInformation.notifyServiceId = service.uuid;
              }
              
              // 更新缓存
              wx.setStorageSync('bleDeviceInfo', app.globalData.BLEInformation);
              
              console.log('特征发现完成，可写特征ID:', writable.uuid);
              
              resolve({
                serviceId: service.uuid,
                writeCharId: writable.uuid,
                notifyCharId: notifyChar ? notifyChar.uuid : null
              });
            },
            fail: reject
          });
        },
        fail: reject
      });
    });
  },
  
  // 确保 notify 已开启
  ensureNotifyEnabled(deviceId, serviceId, notifyCharId) {
    if (!notifyCharId) {
      console.log('没有 notify 特征，跳过开启');
      return Promise.resolve();
    }
    
    return new Promise(function(resolve, reject) {
      console.log('尝试开启 notify...');
      wx.notifyBLECharacteristicValueChange({
        deviceId: deviceId,
        serviceId: serviceId,
        characteristicId: notifyCharId,
        state: true,
        success: function() {
          console.log('notify 开启成功');
          resolve();
        },
        fail: function(e) {
          console.log('notify 开启失败，继续:', e);
          resolve(); // 即使失败也继续
        }
      });
    });
  },
  
  // 测试打印
  testPrint() {
    console.log('=== testPrint 方法开始执行 ===');
    var that = this;
    var app = getApp();
    
    console.log('检查蓝牙连接状态...');
    
    // 先确保蓝牙连接
    wx.showLoading({
      title: '连接打印机...',
    });
    
    wx.openBluetoothAdapter({
      success: function(res) {
        console.log('蓝牙适配器初始化成功');
        setTimeout(() => {
          wx.createBLEConnection({
            deviceId: app.globalData.BLEInformation.deviceId,
            success: function(res) {
              console.log('重新连接打印机成功');
              
              // 发现并缓存可写特征
              that.discoverAndCacheWritableChar(app.globalData.BLEInformation.deviceId)
                .then(function(result) {
                  console.log('特征发现成功:', result);
                  
                  // 开启 notify（如果存在）
                  return that.ensureNotifyEnabled(
                    app.globalData.BLEInformation.deviceId,
                    result.serviceId,
                    result.notifyCharId
                  );
                })
                .then(function() {
                  console.log('准备开始打印');
                  wx.hideLoading();
                  that.doTSCPrint();
                })
                .catch(function(e) {
                  console.error('发现特征/开启notify失败:', e);
                  wx.hideLoading();
                  wx.showToast({
                    title: '打印机特征发现失败，请重试',
                    icon: 'none'
                  });
                });
            },
            fail: function(err) {
              console.error('重新连接打印机失败:', err);
              wx.hideLoading();
              wx.showToast({
                title: '打印机连接失败，请重新设置',
                icon: 'none'
              });
            }
          });
        }, 500);
      },
      fail: function(err) {
        console.error('蓝牙适配器初始化失败:', err);
        wx.hideLoading();
        wx.showToast({
          title: '请打开蓝牙',
          icon: 'none'
        });
      }
    });
  },
  
  // 执行TSC打印
  doTSCPrint() {
    console.log('=== doTSCPrint 方法开始执行 ===');
    var that = this;
    var app = getApp();
    
    // 获取分销商信息
    var disInfo = this.data.disInfo;
    var printContent = disInfo && disInfo.nxDistributerName 
      ? disInfo.nxDistributerName 
      : '打印机连接成功';
    
    console.log('分销商信息:', disInfo);
    console.log('打印内容:', printContent);
    
    // 使用TSC命令打印（标签打印机）
    console.log('加载 TSC 模块');
    var tsc = require("../../../utils/GPutils/tsc.js").jpPrinter;
    var command = tsc.createNew();
    console.log('创建 TSC 命令对象成功');
    
    // 获取标签尺寸
    var paperSizeMM = that.getPaperSizeMM();
    console.log('使用标签尺寸:', paperSizeMM.width, 'x', paperSizeMM.height, 'mm');
    
    // 设置标签大小
    command.setSize(paperSizeMM.width, paperSizeMM.height);
    // 设置间隙
    command.setGap(0);
    // 清除
    command.setCls();
    // 设置文本 - 打印分销商名称
    command.setText(0, 30, "TSS24.BF2", 0, 1, 1, printContent);
    // 打印
    command.setPagePrint();
    console.log('TSC 命令配置完成');
    
    // 获取打印数据
    var buff = command.getData();
    console.log('打印数据生成成功，长度:', buff.length);
    
    // 发送打印数据
    console.log('调用 sendPrintData 发送数据');
    this.sendPrintData(buff);
  },
  
      // 延迟函数
      delay(ms) {
        return new Promise(function(resolve) {
          setTimeout(resolve, ms);
        });
      },
      
      // 发送打印数据（改进版）
      async reliableSendPrintData(buff) {
        console.log('=== reliableSendPrintData 方法开始执行 ===');
        console.log('数据长度:', buff.length);
        
        var that = this;
        var app = getApp();
        var deviceId = app.globalData.BLEInformation.deviceId;
        var writeServiceId = app.globalData.BLEInformation.writeServiceId;
        var writeCharaterId = app.globalData.BLEInformation.writeCharaterId;
        
        // 校验
        if (!deviceId || !writeServiceId || !writeCharaterId) {
          console.error('缺少必要的特征信息');
          wx.showToast({
            title: '未找到可写特征，请重连打印机',
            icon: 'none'
          });
          return;
        }
        
        console.log('设备ID:', deviceId);
        console.log('写入特征ID:', writeCharaterId);
        
        var oneTime = 20;
        var total = Math.ceil(buff.length / oneTime);
        console.log('分包数量:', total);
        
        for (var i = 0; i < total; i++) {
          var start = i * oneTime;
          var end = Math.min(start + oneTime, buff.length);
          var size = end - start;
          
          if (size <= 0) {
            console.log('跳过空包');
            continue;
          }
          
          console.log('发送第', i + 1, '包，大小:', size);
          
          // 创建数据包
          var buf = new ArrayBuffer(size);
          var view = new DataView(buf);
          for (var j = 0; j < size; j++) {
            view.setUint8(j, buff[start + j]);
          }
          
          // 发送数据包
          try {
            await new Promise(function(resolve, reject) {
              wx.writeBLECharacteristicValue({
                deviceId: deviceId,
                serviceId: writeServiceId,
                characteristicId: writeCharaterId,
                value: buf,
                success: function(res) {
                  console.log('数据包发送成功');
                  resolve(res);
                },
                fail: reject
              });
            });
          } catch (e) {
            console.error('发送失败:', e);
            throw e;
          }
          
          // 每包延时 15ms（iOS 更稳）
          if (i < total - 1) {
            await that.delay(15);
          }
        }
        
        console.log('所有数据发送完成');
        wx.showToast({
          title: '打印完成',
          icon: 'success'
        });
      },
      
      // 发送打印数据（旧版兼容）
      sendPrintData(buff) {
        console.log('调用 reliableSendPrintData');
        this.reliableSendPrintData(buff);
      },
      
      // 设置标签尺寸
      setPaperSize() {
        var that = this;
        wx.showActionSheet({
          itemList: ['4*3cm（横）', '4*6cm（竖）', '5*8cm（竖）'],
          success: function(res) {
            var selectedSize = res.tapIndex + 1; // 0,1,2 转为 1,2,3
            that.setData({
              paperSize: selectedSize
            });
            wx.setStorageSync('paperSize', selectedSize);
            console.log('标签尺寸设置为:', selectedSize);
          }
        });
      },
      
      // 获取标签尺寸（宽，高，单位mm）
      getPaperSizeMM() {
        var size = this.data.paperSize;
        var sizes = {
          1: { width: 40, height: 32 },  // 4*3cm
          2: { width: 40, height: 62 },  // 4*6cm
          3: { width: 50, height: 82 }   // 5*8cm
        };
        return sizes[size] || sizes[1];
      }

})


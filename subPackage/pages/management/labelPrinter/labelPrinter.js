// subPackage/pages/management/labelPrinter/labelPrinter.js
const app = getApp()
const globalData = getApp().globalData;

Page({
  data: {
    deviceList: [],
    isScanning: false,
    isConnected: false,
    connectedDeviceName: '',
    services: [],
    serviceId: 0,
    writeCharacter: false,
    readCharacter: false,
    notifyCharacter: false
  },

  onLoad() {
    const app = getApp();
  
    this.setData({ 
      navBarHeight: app.globalData.navBarHeight,
    });

    // 检查是否已连接
    this.checkConnectionStatus();
  },

  onShow() {
    // 页面显示时检查连接状态
    this.checkConnectionStatus();
  },

  onHide() {
    // 页面隐藏时停止搜索，节省资源
    if (this.data.isScanning) {
      console.log('页面隐藏，停止搜索');
      wx.stopBluetoothDevicesDiscovery({
        complete: function() {
          console.log('搜索已停止');
        }
      });
      this.setData({
        isScanning: false
      });
    }
    
    // 清除搜索定时器
    if (this._searchTimer) {
      clearTimeout(this._searchTimer);
      this._searchTimer = null;
    }
  },

  onUnload() {
    // 页面卸载时停止搜索
    if (this.data.isScanning) {
      wx.stopBluetoothDevicesDiscovery();
    }
    
    // 清除搜索定时器
    if (this._searchTimer) {
      clearTimeout(this._searchTimer);
      this._searchTimer = null;
    }
  },

  // 检查连接状态
  checkConnectionStatus() {
    const app = getApp();
    if (app.globalData.BLEInformation && app.globalData.BLEInformation.isConnected && app.globalData.BLEInformation.deviceId) {
      this.setData({
        isConnected: true,
        connectedDeviceName: app.globalData.BLEInformation.deviceName
      });
    } else {
      this.setData({
        isConnected: false,
        connectedDeviceName: ''
      });
    }
  },

  // 开始搜索蓝牙设备
  startSearch() {
    var that = this;
    
    wx.openBluetoothAdapter({
      success: function(res) {
        wx.getBluetoothAdapterState({
          success: function(res) {
            if (res.available) {
              if (res.discovering) {
                wx.stopBluetoothDevicesDiscovery({
                  success: function(res) {
                    console.log(res)
                  }
                })
              }
              that.checkPermission()
            } else {
              wx.showModal({
                title: '提示',
                content: '本机蓝牙不可用，请打开蓝牙'
              })
            }
          }
        })
      },
      fail: function() {
        wx.showModal({
          title: '提示',
          content: '蓝牙初始化失败，请打开蓝牙'
        })
      }
    })
  },

  // 检查权限
  checkPermission() {
    var that = this;
    
    // 确保 BLEInformation 存在
    if (!app.globalData.BLEInformation) {
      app.globalData.BLEInformation = {
        platform: "",
        deviceId: "",
        deviceName: "",
        writeCharaterId: "",
        writeServiceId: "",
        notifyCharaterId: "",
        notifyServiceId: "",
        readCharaterId: "",
        readServiceId: "",
        isConnected: false
      };
    }
    
    var platform = app.globalData.BLEInformation.platform;
    
    // 设置平台信息
    app.globalData.BLEInformation.platform = wx.getSystemInfoSync().platform;
    
    if (platform == "ios" || !platform) {
      app.globalData.BLEInformation.platform = "ios";
      that.getBluetoothDevices();
    } else if (platform == "android") {
      app.globalData.BLEInformation.platform = "android";
      // Android 6.0以上需授权地理位置权限
      wx.getSetting({
        success: function(res) {
          if (!res.authSetting['scope.userLocation']) {
            wx.authorize({
              scope: 'scope.userLocation',
              complete: function(res) {
                that.getBluetoothDevices()
              }
            })
          } else {
            that.getBluetoothDevices()
          }
        }
      })
    }
  },

  // 获取蓝牙设备列表
  getBluetoothDevices() {
    var that = this;
    
    // 先停止之前的搜索
    wx.stopBluetoothDevicesDiscovery({
      complete: function() {
        // 清空之前的设备列表
        that.setData({
          deviceList: [],
          isScanning: true
        })
        
        wx.showLoading({
          title: '正在搜索设备...',
          mask: true
        })
        
        // 设备列表，用于去重
        var deviceMap = {};
        
        // 先检查蓝牙适配器状态
        wx.getBluetoothAdapterState({
          success: function(res) {
            console.log('蓝牙适配器状态:', res);
            if (!res.available) {
              wx.hideLoading();
              that.setData({
                isScanning: false
              });
              wx.showModal({
                title: '提示',
                content: '蓝牙不可用，请检查蓝牙是否已开启',
                confirmText: '确定'
              });
              return;
            }
            
            // 设备列表，用于去重
            var deviceMap = {};
            
            // 监听设备发现事件
            var onDeviceFound = function(res) {
              console.log('=== 设备发现事件触发 ===');
              console.log('发现设备:', res.devices);
              console.log('设备数量:', res.devices ? res.devices.length : 0);
              
              if (res.devices && res.devices.length > 0) {
                res.devices.forEach(function(device) {
                  console.log('处理设备:', device);
                  // 只添加低功耗蓝牙设备（BLE）
                  if (device.deviceId && !deviceMap[device.deviceId]) {
                    // 显示所有设备，包括没有名称的
                    // 如果设备名称为空，使用设备ID作为显示名称
                    if (!device.name || device.name.trim() === '') {
                      device.displayName = '未知设备 ' + device.deviceId.substring(0, 8);
                    } else {
                      device.displayName = device.name;
                    }
                    
                    deviceMap[device.deviceId] = device;
                    
                    // 更新设备列表
                    var deviceList = [];
                    for (var key in deviceMap) {
                      deviceList.push(deviceMap[key]);
                    }
                    
                    that.setData({
                      deviceList: deviceList
                    });
                    
                    console.log('当前已发现设备数量:', deviceList.length);
                    console.log('设备列表:', deviceList);
                  }
                });
              }
            };
            
            // 监听设备发现事件（必须在搜索前设置）
            console.log('设置设备发现事件监听');
            wx.onBluetoothDeviceFound(onDeviceFound);
            
            // 开始搜索设备
            console.log('开始搜索蓝牙设备...');
            wx.startBluetoothDevicesDiscovery({
              allowDuplicatesKey: false, // 不允许重复上报同一设备
              interval: 0, // 上报新设备的时间间隔
              success: function(res) {
                console.log('搜索启动成功', res);
                console.log('是否正在搜索:', res.isDiscovering);
            
                // 搜索10秒后停止
                var searchTimer = setTimeout(function() {
                  console.log('搜索超时，停止搜索');
                  console.log('搜索期间发现的设备数量:', Object.keys(deviceMap).length);
                  console.log('设备映射:', deviceMap);
                  
                  wx.stopBluetoothDevicesDiscovery({
                    success: function() {
                      console.log('停止搜索成功');
                    },
                    complete: function() {
                      // 取消监听
                      console.log('取消设备发现事件监听');
                      wx.offBluetoothDeviceFound(onDeviceFound);
                      
                      that.setData({
                        isScanning: false
                      });
                      
                      wx.hideLoading();
                      
                      // 再次获取所有已发现的设备（确保不遗漏）
                      wx.getBluetoothDevices({
                        success: function(res) {
                          console.log('获取所有设备:', res.devices);
                          var allDevices = [];
                          var deviceIdSet = {};
                          
                          // 合并已发现的设备和当前获取的设备
                          res.devices.forEach(function(device) {
                            if (device.deviceId && !deviceIdSet[device.deviceId]) {
                              if (!device.name || device.name.trim() === '') {
                                device.displayName = '未知设备 ' + device.deviceId.substring(0, 8);
                              } else {
                                device.displayName = device.name;
                              }
                              allDevices.push(device);
                              deviceIdSet[device.deviceId] = true;
                            }
                          });
                          
                          // 合并设备列表中的设备
                          that.data.deviceList.forEach(function(device) {
                            if (device.deviceId && !deviceIdSet[device.deviceId]) {
                              allDevices.push(device);
                              deviceIdSet[device.deviceId] = true;
                            }
                          });
                          
                          that.setData({
                            deviceList: allDevices
                          });
                          
                          console.log('最终设备列表数量:', allDevices.length);
                          
                          if (allDevices.length === 0) {
                            wx.showModal({
                              title: '未找到设备',
                              content: '未找到蓝牙设备，请确保设备已开启并处于可发现状态',
                              confirmText: '重新搜索',
                              cancelText: '取消',
                              success: function(res) {
                                if (res.confirm) {
                                  that.getBluetoothDevices();
                                }
                              }
                            });
                          } else {
                            wx.showToast({
                              title: '找到 ' + allDevices.length + ' 个设备',
                              icon: 'success',
                              duration: 2000
                            });
                          }
                        },
                        fail: function(err) {
                          console.error('获取设备列表失败:', err);
                          wx.hideLoading();
                          wx.showToast({
                            title: '获取设备列表失败',
                            icon: 'none'
                          });
                        }
                      });
                    }
                  });
                }, 10000); // 搜索10秒
                
                // 保存定时器引用
                that._searchTimer = searchTimer;
              },
              fail: function(err) {
                console.error('启动搜索失败:', err);
                wx.offBluetoothDeviceFound(onDeviceFound);
                that.setData({
                  isScanning: false
                });
                wx.hideLoading();
                
                var errorMsg = '搜索失败，请检查蓝牙是否已开启';
                if (err.errCode === 10001) {
                  errorMsg = '蓝牙适配器未初始化，请重试';
                } else if (err.errMsg) {
                  errorMsg = '搜索失败：' + err.errMsg;
                }
                
                wx.showModal({
                  title: '搜索失败',
                  content: errorMsg,
                  confirmText: '重试',
                  success: function(res) {
                    if (res.confirm) {
                      that.getBluetoothDevices();
                    }
                  }
                });
              }
            });
          },
          fail: function(err) {
            console.error('获取蓝牙适配器状态失败:', err);
            wx.hideLoading();
            that.setData({
              isScanning: false
            });
            wx.showModal({
              title: '错误',
              content: '无法获取蓝牙状态，请检查蓝牙是否已开启',
              confirmText: '确定'
            });
          }
        });
      }
    });
  },

  // 选择设备并连接
  connectDevice(e) {
    var that = this;
    var deviceId = e.currentTarget.dataset.id;
    var deviceName = e.currentTarget.dataset.name;
    
    wx.stopBluetoothDevicesDiscovery({
      success: function(res) {
        console.log(res)
      }
    })
    
    that.setData({
      serviceId: 0,
      writeCharacter: false,
      readCharacter: false,
      notifyCharacter: false
    })
    
    wx.showLoading({
      title: '正在连接...',
    })
    
    // 检查设备是否已经连接
    if (app.globalData.BLEInformation && app.globalData.BLEInformation.deviceId) {
      // 如果是同一个设备，直接获取服务
      if (app.globalData.BLEInformation.deviceId === deviceId) {
        console.log('设备已连接，直接获取服务')
        app.globalData.BLEInformation.deviceId = deviceId;
        app.globalData.BLEInformation.deviceName = deviceName;
        that.getServices()
        return
      } else {
        // 如果是不同设备，先断开旧连接
        console.log('断开旧设备连接')
        wx.closeBLEConnection({
          deviceId: app.globalData.BLEInformation.deviceId,
          success: function() {
            console.log('旧设备断开成功')
            that.doConnect(deviceId, deviceName)
          },
          fail: function(err) {
            console.log('断开旧设备失败，继续连接新设备', err)
            // 即使断开失败，也尝试连接新设备
            that.doConnect(deviceId, deviceName)
          }
        })
        return
      }
    }
    
    // 没有已连接的设备，直接连接
    that.doConnect(deviceId, deviceName)
  },
  
  // 执行连接操作
  doConnect(deviceId, deviceName, retryCount) {
    var that = this;
    retryCount = retryCount || 0;
    var maxRetries = 2; // 最多重试2次
    
    console.log('doConnect 开始连接，设备ID:', deviceId, '重试次数:', retryCount);
    
    wx.createBLEConnection({
      deviceId: deviceId,
      success: function(res) {
        console.log('连接成功', res)
        app.globalData.BLEInformation.deviceId = deviceId;
        app.globalData.BLEInformation.deviceName = deviceName;
        that.getServices()
      },
      fail: function(e) {
        console.log('连接失败，错误信息:', e);
        
        // 如果是已连接错误，直接使用现有连接，获取服务
        if (e.errCode === 1509007 || e.errMsg.indexOf('already connect') !== -1) {
          console.log('设备已连接，直接使用现有连接获取服务')
          app.globalData.BLEInformation.deviceId = deviceId;
          app.globalData.BLEInformation.deviceName = deviceName;
          app.globalData.BLEInformation.isConnected = true;
          that.getServices()
          return;
        }
        
        // 如果未达到最大重试次数，尝试重试
        if (retryCount < maxRetries) {
          console.log('连接失败，将在1秒后重试，当前重试次数:', retryCount + 1);
          setTimeout(function() {
            that.doConnect(deviceId, deviceName, retryCount + 1);
          }, 1000);
          return;
        }
        
        // 达到最大重试次数，显示错误提示
        wx.hideLoading();
        
        // 根据错误码提供更详细的提示
        var errorMsg = '连接失败，请检查：\n1. 设备是否已开启\n2. 设备距离是否过远\n3. 是否被其他应用占用';
        
        if (e.errCode === 10004) {
          errorMsg = '连接超时，请检查设备是否在附近并已开启';
        } else if (e.errCode === 10007) {
          errorMsg = '连接失败，设备可能已断开或被占用';
        } else if (e.errCode === 10009) {
          errorMsg = '设备不支持或连接失败';
        } else if (e.errMsg) {
          errorMsg = '连接失败：' + e.errMsg;
        }
        
        wx.showModal({
          title: '连接失败',
          content: errorMsg,
          confirmText: '重试',
          cancelText: '取消',
          success: function(res) {
            if (res.confirm) {
              // 用户点击重试，重新连接
              wx.showLoading({
                title: '正在连接...',
              });
              that.doConnect(deviceId, deviceName, 0);
            }
          }
        });
      }
    })
  },

  // 获取服务
  getServices() {
    var that = this;
    
    wx.getBLEDeviceServices({
      deviceId: app.globalData.BLEInformation.deviceId,
      success: function(res) {
        console.log('服务列表', res)
        that.setData({
          services: res.services
        })
        that.getCharacteristics()
      },
      fail: function(e) {
        wx.hideLoading()
        console.log('获取服务失败', e)
      }
    })
  },

  // 获取特征值
  getCharacteristics() {
    var that = this;
    var list = that.data.services;
    var num = that.data.serviceId;
    var write = that.data.writeCharacter;
    var read = that.data.readCharacter;
    var notify = that.data.notifyCharacter;
    
    wx.getBLEDeviceCharacteristics({
      deviceId: app.globalData.BLEInformation.deviceId,
      serviceId: list[num].uuid,
      success: function(res) {
        console.log('特征值列表', res)
        
        for (var i = 0; i < res.characteristics.length; i++) {
          var properties = res.characteristics[i].properties;
          var item = res.characteristics[i].uuid;
          
          if (!notify && properties.notify) {
            app.globalData.BLEInformation.notifyCharaterId = item;
            app.globalData.BLEInformation.notifyServiceId = list[num].uuid;
            notify = true;
          }
          
          if (!write && properties.write) {
            app.globalData.BLEInformation.writeCharaterId = item;
            app.globalData.BLEInformation.writeServiceId = list[num].uuid;
            write = true;
          }
          
          if (!read && properties.read) {
            app.globalData.BLEInformation.readCharaterId = item;
            app.globalData.BLEInformation.readServiceId = list[num].uuid;
            read = true;
          }
        }
        
        if (!write || !notify || !read) {
          num++;
          that.setData({
            writeCharacter: write,
            readCharacter: read,
            notifyCharacter: notify,
            serviceId: num
          })
          
          if (num < list.length) {
            that.getCharacteristics()
          } else {
            wx.hideLoading()
            wx.showModal({
              title: '提示',
              content: '找不到该读写的特征值'
            })
          }
        } else {
          // 连接成功，标记为已连接
          app.globalData.BLEInformation.isConnected = true;
          
          // 缓存设备信息到本地（只存储必要字段，避免循环引用）
          var deviceInfoToStore = {
            deviceId: app.globalData.BLEInformation.deviceId,
            deviceName: app.globalData.BLEInformation.deviceName,
            writeServiceId: app.globalData.BLEInformation.writeServiceId,
            writeCharaterId: app.globalData.BLEInformation.writeCharaterId,
            notifyServiceId: app.globalData.BLEInformation.notifyServiceId,
            notifyCharaterId: app.globalData.BLEInformation.notifyCharaterId,
            readServiceId: app.globalData.BLEInformation.readServiceId,
            readCharaterId: app.globalData.BLEInformation.readCharaterId,
            isConnected: true,
            platform: app.globalData.BLEInformation.platform
          };
          
          wx.setStorageSync('bleDeviceInfo', deviceInfoToStore);
          console.log('✅ 已保存打印机信息到缓存:', deviceInfoToStore);
          
          that.setData({
            isConnected: true,
            connectedDeviceName: app.globalData.BLEInformation.deviceName
          })
          
          wx.hideLoading()
          wx.showToast({
            title: '连接成功',
            icon: 'success'
          })
          
          // 连接成功后，打印测试信息
          setTimeout(() => {
            that.testPrint()
          }, 1000)
        }
      },
      fail: function(e) {
        wx.hideLoading()
        console.log('获取特征值失败', e)
      }
    })
  },

  // 测试打印
  testPrint() {
    console.log('testPrint 开始执行');
    var that = this;
    
    // 获取分销商信息
    var disInfo = wx.getStorageSync('disInfo');
    console.log('disInfo:', disInfo);
    var printContent = disInfo && disInfo.nxDistributerName 
      ? disInfo.nxDistributerName 
      : '打印机连接成功';
    console.log('打印内容:', printContent);
    
    // 使用TSC命令打印（标签打印机）
    var tsc = require("../../../../utils/GPutils/tsc.js").jpPrinter;
    console.log('TSC模块加载成功');
    var command = tsc.createNew();
    console.log('创建TSC打印命令对象成功');
    
    // 设置标签大小
    command.setSize(48, 40);
    // 设置间隙
    command.setGap(0);
    // 清除
    command.setCls();
    // 设置文本 - 打印分销商名称
    command.setText(0, 30, "TSS24.BF2", 1, 1, printContent);
    // 打印
    command.setPagePrint();
    
    // 获取打印数据
    var buff = command.getData();
    console.log('打印数据长度:', buff.length);
    console.log('前100字节数据:', buff.slice(0, 100));
    
    // 发送打印数据
    console.log('开始发送打印数据');
    that.sendPrintData(buff, function() {
      console.log('打印数据发送完成');
      
      wx.showToast({
        title: '测试打印完成',
        icon: 'success'
      })
      
      // 打印完成后返回上一页
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    })
  },

  // 发送打印数据
  sendPrintData(buff, callback) {
    console.log('sendPrintData 开始执行');
    var that = this;
    var app = getApp();
    var oneTimeData = 20; // 每次发送20字节
    var loopTime = Math.ceil(buff.length / oneTimeData);
    var currentTime = 0;
    
    console.log('总数据长度:', buff.length, '分包数量:', loopTime);
    
    function sendChunk() {
      console.log('发送第', currentTime + 1, '包，共', loopTime, '包');
      
      if (currentTime >= loopTime) {
        console.log('所有数据发送完成');
        if (callback) callback();
        return;
      }
      
      // 计算本包数据大小
      var buf;
      var dataView;
      
      if (currentTime + 1 < loopTime) {
        // 不是最后一包，发送完整包
        buf = new ArrayBuffer(oneTimeData);
        dataView = new DataView(buf);
        for (var i = 0; i < oneTimeData; i++) {
          dataView.setUint8(i, buff[currentTime * oneTimeData + i]);
        }
      } else {
        // 最后一包，发送剩余数据
        var lastData = buff.length % oneTimeData;
        buf = new ArrayBuffer(lastData);
        dataView = new DataView(buf);
        for (var i = 0; i < lastData; i++) {
          dataView.setUint8(i, buff[currentTime * oneTimeData + i]);
        }
      }
      
      console.log('本包数据大小:', buf.byteLength);
      
      console.log('准备发送数据，设备ID:', app.globalData.BLEInformation.deviceId);
      console.log('写入特征ID:', app.globalData.BLEInformation.writeCharaterId);
      
      wx.writeBLECharacteristicValue({
        deviceId: app.globalData.BLEInformation.deviceId,
        serviceId: app.globalData.BLEInformation.writeServiceId,
        characteristicId: app.globalData.BLEInformation.writeCharaterId,
        value: buf,
        success: function(res) {
          console.log('数据发送成功:', res);
          currentTime++;
          sendChunk();
        },
        fail: function(e) {
          console.error('打印失败:', e);
          wx.showToast({
            title: '打印失败',
            icon: 'none'
          })
        }
      })
    }
    
    sendChunk();
  },

  // 断开连接
  disconnect() {
    var that = this;
    var app = getApp();
    
    if (app.globalData.BLEInformation.deviceId) {
      wx.closeBLEConnection({
        deviceId: app.globalData.BLEInformation.deviceId,
        success: function(res) {
          console.log('断开连接成功')
          
          // 重置连接状态
          app.globalData.BLEInformation.isConnected = false;
          app.globalData.BLEInformation.deviceId = '';
          app.globalData.BLEInformation.deviceName = '';
          
          // 清除缓存
          wx.removeStorageSync('bleDeviceInfo');
          
          that.setData({
            isConnected: false,
            connectedDeviceName: ''
          })
          
          wx.showToast({
            title: '已断开连接',
            icon: 'success'
          })
        },
        fail: function(e) {
          console.error('断开连接失败', e)
        }
      })
    }
  },

  toBack(){
    wx.navigateBack({delta : 1})
  }
})


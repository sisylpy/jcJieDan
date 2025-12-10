var load = require('../../../../lib/load.js');


Page({

  /**
   * 页面的初始数据
   */
  data: {

    
    
    // 蓝牙连接状态
    isBluetoothConnected: false, // 蓝牙是否已连接
    
    // 蓝牙打印相关数据
    buffSize: [],
    oneTimeData: 20,
    printNum: [],
    printerNum: 1,
    looptime: 0,
    currentTime: 1,
    lastData: 0,
    returnResult: "",
    buffIndex: 0,
    printNumIndex: 0,
    currentPrint: 1,
    isReceiptSend: false,
    isLabelSend: false,
    printTimes: 0,
    printOk: false,
    deviceId: '',
    writeServiceId: '',
    writeCharaterId: '',
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

    })
    var value = wx.getStorageSync('userInfo');
    if (value) {
      this.setData({
        disId: value.nxDistributerEntity.nxDistributerId,
        userInfo: value,
        disInfo: value.nxDistributerEntity,
      })
    }

    // 检查是否为打印模式
    var toPrintWx = wx.getStorageSync('toPrintWx');
    if (toPrintWx) {
      this.setData({
        isPrintMode: true
      });
      wx.removeStorageSync('toPrintWx'); // 清除标识
      
      // 初始化打印参数
      this._initPrintParams();
      
      // 检查蓝牙状态
      this._checkBluetoothStatus();
    }

    // 获取商品数组
    var arr = wx.getStorageSync('selArr');
    if (arr && arr.length > 0) {
      this.setData({
        selGoodsArr: arr,
      });
      // 获取数据后立即清除缓存，防止累加
      // wx.removeStorageSync('selArr');
    }

    // 获取显示模式和字段标识
    var stockPrintViewMode = wx.getStorageSync('stockPrintViewMode') || 'category';
    var useSimpleFields = wx.getStorageSync('useSimpleFields') || false;
    var stockCustomerName = wx.getStorageSync('stockCustomerName') || '';
    this.setData({
      stockPrintViewMode: stockPrintViewMode,
      useSimpleFields: useSimpleFields,
      stockCustomerName: stockCustomerName
    });
    console.log('✓ 从index页面获取客户名称:', stockCustomerName);

    this._updatePurData()

  },

  // 初始化打印参数
  _initPrintParams() {
    var list = []
    var numList = []
    var j = 0
    for (var i = 20; i < 200; i += 10) {
      list[j] = i;
      j++
    }
    for (var i = 1; i < 10; i++) {
      numList[i - 1] = i
    }
    this.setData({
      buffSize: list,
      oneTimeData: list[0],
      printNum: numList,
      printerNum: numList[0],
      looptime: 0,
      currentTime: 1,
      lastData: 0,
      returnResult: "",
      buffIndex: 0,
      printNumIndex: 0,
      currentPrint: 1,
      isReceiptSend: false,
      isLabelSend: false,
      printTimes: 0,
    })
  },

  // 检查蓝牙状态
  _checkBluetoothStatus() {
    var that = this;
    // 先初始化蓝牙适配器，再检查状态
    wx.openBluetoothAdapter({
      success: function(res) {
        wx.getBluetoothAdapterState({
          success: function(res) {
            console.log('蓝牙适配器状态:', res);
            if (!res.available) {
              wx.showModal({
                title: '蓝牙不可用',
                content: '请检查蓝牙是否已开启',
                showCancel: false
              });
            } else if (!res.connected) {
              console.log('蓝牙已开启，但未连接设备');
            }
          },
          fail: function(err) {
            console.log('获取蓝牙状态失败:', err);
            // 不显示错误弹窗，因为这只是状态检查
          }
        });
      },
      fail: function(err) {
        console.log('蓝牙初始化失败:', err);
        // 不显示错误弹窗，因为这只是状态检查
      }
    });
  },

  changeHaveOrder() {
    this.setData({
      haveOrder: !this.data.haveOrder
    })
  },

  _updatePurData(){
    var arr = this.data.selGoodsArr;
    var goodsArr = [];
    for (var i = 0; i < arr.length; i++) {
     goodsArr.push(arr[i].item);
    }
    this.setData({
      printGoodsArr: goodsArr
    })

  },
  
  // 关闭确认弹窗
  closeConfirmModal() {
    this.setData({
      showConfirmModal: false,
      pasteContent: ''
    });
  },


  saveBatch(e) {
    if(!this.data.canSave){
      wx.showToast({
        title: '请完善采购数量',
        icon: 'none'
      })
    }else{
      // 生成内容
      var orderContent = this._getPasteContent();
      
      if (this.data.isPrintMode) {
        // 打印模式：直接保存批次并跳转打印页面
        this._savePrintBatch(orderContent);
      } else {
        // 复制模式：显示确认弹窗
        this.setData({
          showConfirmModal: true,
          pasteContent: orderContent
        });
      }
    }
  },


  // 打印采购单
  _printPurchaseOrder() {
    // 参考 orderPrint.js 的打印实现
    var that = this;
    
    // 优先从 receiptPrinterInfo 缓存读取出库单打印机信息
    var receiptPrinterInfo = wx.getStorageSync('receiptPrinterInfo');
    var deviceId = null;
    
    if (receiptPrinterInfo && receiptPrinterInfo.deviceId) {
      // 使用出库单打印机缓存
      deviceId = receiptPrinterInfo.deviceId;
      console.log('✅ 从 receiptPrinterInfo 缓存读取设备ID:', deviceId);
      
      // 同时设置 writeServiceId 和 writeCharaterId（如果缓存中有）
      if (receiptPrinterInfo.writeServiceId && receiptPrinterInfo.writeCharaterId) {
        this.setData({
          deviceId: deviceId,
          writeServiceId: receiptPrinterInfo.writeServiceId,
          writeCharaterId: receiptPrinterInfo.writeCharaterId
        });
        console.log('✅ 已设置 writeServiceId 和 writeCharaterId');
      } else {
        this.setData({
          deviceId: deviceId
        });
      }
    } else {
      // 兼容旧逻辑：从 userInfo 读取
    var value = wx.getStorageSync('userInfo');
    if (!value || !value.nxDiuPrintDeviceId || value.nxDiuPrintDeviceId == -1) {
      wx.showModal({
        title: '提示',
        content: '请先配置蓝牙打印机',
        showCancel: false,
        success: function() {
          wx.navigateTo({
            url: '../../../../pages/order/pSearchPrinter/pSearchPrinter',
          });
        }
      });
      return;
    }
    
      deviceId = value.nxDiuPrintDeviceId;
      console.log('⚠️ 从 userInfo 读取设备ID（兼容旧逻辑）:', deviceId);
    this.setData({
        deviceId: deviceId
    });
    }
    
    // 开始蓝牙连接
    this._startBluetoothConnection();
  },
  
  // 开始蓝牙连接
  _startBluetoothConnection() {
    var that = this;
    
    // 更新加载提示
    wx.showLoading({
      title: '连接打印机中...',
      mask: true
    });
    
    // 先停止可能正在进行的搜索
    wx.stopBluetoothDevicesDiscovery({
      success: function (res) {
        console.log('停止之前的搜索');
      },
      complete: function() {
        // 然后开始新的连接流程
        that._initBluetoothConnection();
      }
    });
  },
  
  // 初始化蓝牙连接
  _initBluetoothConnection() {
    var that = this;
    wx.openBluetoothAdapter({
      success: function (res) {
        wx.getBluetoothAdapterState({
          success: function (res) {
            console.log('openBluetoothAdapter success', res);
            if (res.available) {
              that._getBluetoothDevices();
            } else {
              wx.showModal({
                title: '提示',
                content: '本机蓝牙不可用',
                showCancel: false
              });
            }
          },
        });
      },
      fail: function (e) {
        console.log('蓝牙初始化失败:', e);
        if (e.errCode === 10001) {
          wx.onBluetoothAdapterStateChange(function (res) {
            console.log('onBluetoothAdapterStateChange', res);
            if (res.available) {
              that._getBluetoothDevices();
            }
          });
        }
        wx.showModal({
          title: '提示',
          content: '蓝牙初始化失败，请到设置打开蓝牙',
          showCancel: false
        });
      }
    });
  },
  
  // 获取蓝牙设备信息
  _getBluetoothDevices() {
    var that = this;
    this.setData({
      isScanning: true
    });
    
    // 更新加载提示
    wx.showLoading({
      title: '搜索打印机中...',
      mask: true
    });
    
    console.log('开始搜索蓝牙设备...');
    wx.startBluetoothDevicesDiscovery({
      success: function (res) {
        console.log('开始搜索成功:', res);
        // 减少搜索时间到3秒
        setTimeout(function () {
          wx.getBluetoothDevices({
            success: function (res) {
              console.log('获取设备列表成功:', res.devices);
              var devices = [];
              var num = 0;
              for (var i = 0; i < res.devices.length; ++i) {
                if (res.devices[i].name != "未知设备") {
                  devices[num] = res.devices[i];
                  num++;
                }
              }
              console.log('过滤后的设备列表:', devices);
              
              that.setData({
                list: devices,
                isScanning: false
              });
              
              // 停止搜索
              wx.stopBluetoothDevicesDiscovery({
                success: function (res) {
                  console.log("停止搜索蓝牙成功");
                },
                fail: function(err) {
                  console.log("停止搜索蓝牙失败:", err);
                }
              });
              
              // 检查目标设备是否在扫描到的设备列表中
              that._checkAndConnectDevice(devices);
            },
            fail: function(err) {
              console.log('获取设备列表失败:', err);
              that.setData({
                isScanning: false
              });
              wx.stopBluetoothDevicesDiscovery();
              wx.showModal({
                title: '获取设备失败',
                content: '无法获取蓝牙设备列表',
                showCancel: false
              });
            }
          });
        }, 3000); // 减少到3秒
      },
      fail: function(err) {
        console.log('开始搜索失败:', err);
        that.setData({
          isScanning: false
        });
        wx.showModal({
          title: '搜索失败',
          content: '无法开始蓝牙设备搜索',
          showCancel: false
        });
      }
    });
  },
  
  // 检查并连接设备
  _checkAndConnectDevice(devices) {
    var targetDeviceId = this.data.deviceId;
    var deviceFound = false;
    
    // 检查目标设备是否在扫描到的设备列表中
    for (var i = 0; i < devices.length; i++) {
      if (devices[i].deviceId === targetDeviceId) {
        deviceFound = true;
        console.log('找到目标设备:', devices[i].name);
        break;
      }
    }
    
    if (deviceFound) {
      // 设备存在，开始连接
      this._connectToPrinter();
    } else {
      // 设备不存在，提示用户重新配置
      wx.showModal({
        title: '提示',
        content: '未找到已配置的蓝牙打印机，请重新配置',
        showCancel: false,
        success: function() {
          wx.navigateTo({
            url: '../../../../pages/order/pSearchPrinter/pSearchPrinter',
          });
        }
      });
    }
  },
  
  // 连接到打印机
  _connectToPrinter() {
    var that = this;
    
    // 如果已经连接，直接获取服务
    if (this.data.isBluetoothConnected) {
      console.log('蓝牙已连接，直接获取服务');
      this.setData({
        serviceId: 0,
        writeCharacter: false,
        readCharacter: false,
        notifyCharacter: false
      });
      this._getServiceId();
      return;
    }
    
    wx.stopBluetoothDevicesDiscovery({
      success: function (res) {
        console.log(res);
      },
    });
    
    // 先检查是否已经连接
    wx.getConnectedBluetoothDevices({
      services: [],
      success: function(res) {
        var isConnected = false;
        for (var i = 0; i < res.devices.length; i++) {
          if (res.devices[i].deviceId === that.data.deviceId) {
            isConnected = true;
            console.log('设备已经连接:', res.devices[i].name);
            break;
          }
        }
        
        if (isConnected) {
          // 设备已连接，直接获取服务
          that.setData({
            serviceId: 0,
            writeCharacter: false,
            readCharacter: false,
            notifyCharacter: false,
            isBluetoothConnected: true
          });
          that._getServiceId();
        } else {
          // 设备未连接，开始连接
          that._startBLEConnection();
        }
      },
      fail: function(err) {
        console.log('获取已连接设备失败:', err);
        // 如果获取失败，直接尝试连接
        that._startBLEConnection();
      }
    });
  },
  
  // 开始蓝牙连接
  _startBLEConnection() {
    var that = this;
    this.setData({
      serviceId: 0,
      writeCharacter: false,
      readCharacter: false,
      notifyCharacter: false
    });
    wx.showLoading({
      title: '连接设备中...',
      mask: true
    });
    wx.createBLEConnection({
      deviceId: this.data.deviceId,
      success: function (res) {
        console.log('蓝牙连接成功:', res);
        that.setData({
          isBluetoothConnected: true
        });
        that._getServiceId();
      },
      fail: function (e) {
        console.log('蓝牙连接失败:', e);
        var errorMsg = '连接失败';
        
        // 根据错误码提供更详细的错误信息
        if (e.errCode === 10001) {
          errorMsg = '蓝牙未开启，请检查蓝牙设置';
        } else if (e.errCode === 10012) {
          errorMsg = '连接超时，请检查设备是否在范围内';
        } else if (e.errCode === 10013) {
          errorMsg = '设备连接失败，请检查设备状态';
        } else if (e.errCode === 10014) {
          errorMsg = '设备已断开连接';
        } else if (e.errCode === -1 && e.errMsg.includes('already connect')) {
          errorMsg = '设备已经连接';
          // 如果已经连接，直接获取服务
          that._getServiceId();
          return;
        }
        
        wx.hideLoading();
        wx.showModal({
          title: '连接失败',
          content: errorMsg + '，是否重新配置打印机？',
          success: function(res) {
            if (res.confirm) {
              wx.navigateTo({
                url: '../../../../pages/order/pSearchPrinter/pSearchPrinter',
              });
            }
          }
        });
      },
      complete: function (e) {
        console.log('蓝牙连接完成:', e);
      }
    });
  },
  
  // 获取服务ID
  _getServiceId() {
    var that = this;
    wx.getBLEDeviceServices({
      deviceId: that.data.deviceId,
      success: function (res) {
        console.log('获取服务成功:', res.services);
        that.setData({
          services: res.services
        });
        that._getCharacteristics();
      },
      fail: function (e) {
        console.log('获取服务失败:', e);
        wx.hideLoading();
        wx.showModal({
          title: '获取服务失败',
          content: '无法获取设备服务，请检查设备是否支持蓝牙打印功能',
          showCancel: false,
          success: function() {
            wx.navigateTo({
              url: '../../../../pages/order/pSearchPrinter/pSearchPrinter',
            });
          }
        });
      },
      complete: function (e) {
        console.log('获取服务完成:', e);
      }
    });
  },
  
  // 获取特征值
  _getCharacteristics() {
    var that = this;
    var list = this.data.services;
    var num = this.data.serviceId;
    var write = this.data.writeCharacter;
    var read = this.data.readCharacter;
    var notify = this.data.notifyCharacter;
    wx.getBLEDeviceCharacteristics({
      deviceId: that.data.deviceId,
      serviceId: list[num].uuid,
      success: function (res) {
        console.log(res);
        for (var i = 0; i < res.characteristics.length; ++i) {
          var properties = res.characteristics[i].properties;
          var item = res.characteristics[i].uuid;
          if (!notify) {
            if (properties.notify) {
              that.data.notifyCharaterId = item;
              that.data.notifyServiceId = list[num].uuid;
              notify = true;
            }
          }
          if (!write) {
            if (properties.write) {
              that.data.writeCharaterId = item;
              that.data.writeServiceId = list[num].uuid;
              write = true;
              
              // 更新出库单打印机缓存
              var receiptPrinterInfo = wx.getStorageSync('receiptPrinterInfo') || {};
              receiptPrinterInfo.writeServiceId = list[num].uuid;
              receiptPrinterInfo.writeCharaterId = item;
              receiptPrinterInfo.deviceId = that.data.deviceId;
              receiptPrinterInfo.isConnected = true;
              wx.setStorageSync('receiptPrinterInfo', receiptPrinterInfo);
              console.log('✅ 已更新出库单打印机 receiptPrinterInfo 缓存');
            }
          }
          if (!read) {
            if (properties.read) {
              that.data.readCharaterId = item;
              that.data.readServiceId = list[num].uuid;
              read = true;
            }
          }
        }
        if (!write || !notify || !read) {
          num++;
          that.setData({
            writeCharacter: write,
            readCharacter: read,
            notifyCharacter: notify,
            serviceId: num
          });
          if (num == list.length) {
            wx.showModal({
              title: '提示',
              content: '找不到该读写的特征值',
              showCancel: false
            });
          } else {
            that._getCharacteristics();
          }
        } else {
          wx.hideLoading();
          wx.showToast({
            title: '连接成功',
            icon: 'success'
          });
          that.setData({
            printOk: true
          });
          that._startPrint();
        }
      },
      fail: function (e) {
        console.log(e);
      },
      complete: function (e) {
        console.log("write:" + that.data.writeCharaterId);
        console.log("read:" + that.data.readCharaterId);
        console.log("notify:" + that.data.notifyCharaterId);
      }
    });
  },
  
  // 开始打印
  _startPrint() {
    console.log('=== _startPrint 开始打印 ===');
    wx.showLoading({
      title: '准备打印数据...',
      mask: true
    });
    
    var that = this;
    var viewMode = this.data.stockPrintViewMode || 'category';
    console.log('📊 打印模式:', viewMode);
    console.log('📊 打印商品数量:', this.data.printGoodsArr ? this.data.printGoodsArr.length : 0);
    
    var esc = require("../../../../utils/GPutils/esc.js");
    var command = esc.jpPrinter.createNew();
    command.init();
    
    // 设置打印格式
    command.setPrintAndFeedRow(7);
    command.setSelectJustification(1); // 居中
    command.setCharacterSize(17); // 设置倍高倍宽
    
    // 打印标题：部门模式显示"出库单"，其他模式显示"采购单"
    var titleText = viewMode === 'department' ? "出库单" : "采购单";
    command.setText(titleText);
    console.log('✓ 打印标题:', titleText);
    command.setPrint(); // 打印并换行
    command.setPrint(); // 打印并换行
    
    // 设置居左
    command.setSelectJustification(0);
    command.setCharacterSize(0); // 先设置为默认字体大小
    
    // 如果是按部门显示，先获取客户名称并打印（使用和商品名称一样大的字体）
    var customerName = '';
    if (viewMode === 'department') {
      // 直接使用从index页面传递过来的客户名称
      customerName = this.data.stockCustomerName || '';
      if (customerName) {
        command.setCharacterSize(1); // 设置为和商品名称一样大的字体
        command.setText("客户: " + customerName);
        console.log('✓ 打印客户名称:', customerName);
        command.setPrint(); // 打印并换行
        command.setPrint();
        command.setCharacterSize(0); // 恢复为默认字体大小
      } else {
        console.log('⚠️ 未找到客户名称');
      }
    }
    
    var todayDate = this._getTodayDate();
    command.setText("日期: " + todayDate);
    console.log('✓ 打印日期:', todayDate);
    command.setPrint(); // 打印并换行
    command.setPrint();
    
    // 打印表头
    if (viewMode === 'category') {
      // 按商品显示时，打印表头
      command.setCharacterSize(0); // 表头使用默认字体大小
      command.setText("   商品");
      command.setAbsolutePrintPosition(324);
      command.setText("数量");
      command.setPrint();
      command.setText("------------------------------------------------");
      command.setPrint();
      console.log('✓ 打印表头（商品模式）');
    }
    command.setCharacterSize(1); // 设置倍高倍宽（商品名称字体）
    
    // 打印商品列表
    this._printPurchaseGoods(command);
    
    // 打印结束
    command.setPrint();
    command.setPrint();
    command.setPrint();
    command.setPrint();
    command.setPrint();
    command.setPrint();
    command.setPrint();
    // 打印结束，增加更多空白
    console.log('✓ 打印结束，添加空白行');
    for (var i = 0; i < 10; i++) {
      command.setPrint();
    }
    
    // 准备发送数据
    this._prepareSend(command.getData());
  },
  
  // 获取客户名称（用于按部门显示时在顶部显示）
  _getCustomerName() {
    console.log('=== 获取客户名称 ===');
    var printGoodsArr = this.data.printGoodsArr;
    var useSimpleFields = this.data.useSimpleFields || false;
    
    // 遍历所有商品和订单，找到第一个有效的部门名称
    for (var j = 0; j < printGoodsArr.length; j++) {
      var item = printGoodsArr[j];
      var orderArr = useSimpleFields ? (item.orders || []) : (item.nxDepartmentOrdersEntities || []);
      
      if (orderArr && orderArr.length > 0) {
        for (var k = 0; k < orderArr.length; k++) {
          var order = orderArr[k];
          var depName = '';
          
          // 优先使用订单中的扁平化字段（从stock页面传递的）
          if (order.fatherDepartmentAttrName && order.nxDepartmentAttrName) {
            depName = order.fatherDepartmentAttrName + "." + order.nxDepartmentAttrName;
            console.log('  ✓ 找到客户名称（部门属性）:', depName);
            return depName;
          } else if (order.nxDepartmentAttrName) {
            depName = order.nxDepartmentAttrName;
            console.log('  ✓ 找到客户名称（部门属性）:', depName);
            return depName;
          }
          
          if (order.fatherGbDepartmentName && order.gbDepartmentName) {
            depName = order.fatherGbDepartmentName + "." + order.gbDepartmentName;
            console.log('  ✓ 找到客户名称（GB部门）:', depName);
            return depName;
          } else if (order.gbDepartmentName) {
            depName = order.gbDepartmentName;
            console.log('  ✓ 找到客户名称（GB部门）:', depName);
            return depName;
          }
          
          if (order.nxRestrauntAttrName) {
            depName = order.nxRestrauntAttrName;
            console.log('  ✓ 找到客户名称（餐厅）:', depName);
            return depName;
          }
          
          // 使用新精简字段的扁平化字段
          if (order.gbDepName) {
            depName = order.gbDepName;
            console.log('  ✓ 找到客户名称（GB部门扁平化）:', depName);
            return depName;
          } else if (order.restrauntName) {
            depName = order.restrauntName;
            console.log('  ✓ 找到客户名称（餐厅扁平化）:', depName);
            return depName;
          } else if (order.depName) {
            depName = order.depName;
            console.log('  ✓ 找到客户名称（部门扁平化）:', depName);
            return depName;
          }
        }
      }
    }
    
    console.log('  ⚠️ 未找到客户名称');
    return '';
  },
  
  // 打印采购商品
  _printPurchaseGoods(command) {
    console.log('=== 开始打印采购商品 ===');
    var printGoodsArr = this.data.printGoodsArr;
    var viewMode = this.data.stockPrintViewMode || 'category';
    var useSimpleFields = this.data.useSimpleFields || false;
    
    console.log('📊 打印参数:', {
      goodsCount: printGoodsArr.length,
      viewMode: viewMode,
      useSimpleFields: useSimpleFields
    });
    
    if (viewMode === 'department') {
      // 按部门显示：先打印部门名称，然后商品名称和订货数量在一行显示
      console.log('📋 按部门显示模式打印');
      
      // 按部门分组数据
      var depGroups = {};
      
      for (var j = 0; j < printGoodsArr.length; j++) {
        var item = printGoodsArr[j];
        var goodsName = item.nxDgGoodsName;
        console.log('📦 处理商品:', goodsName);
        
        // 根据是否使用新精简字段来决定使用哪个字段
        var orderArr = useSimpleFields ? (item.orders || []) : (item.nxDepartmentOrdersEntities || []);
        console.log('📋 订单数量:', orderArr.length);
        
        if (orderArr && orderArr.length > 0) {
          for (var k = 0; k < orderArr.length; k++) {
            var order = orderArr[k];
            var orderQuantity = order.nxDoQuantity || '';
            var orderStandard = order.nxDoStandard || '';
            var orderRemark = order.nxDoRemark || '';
            
            // 获取部门名称和类型（用于判断是否打印#）
            var depName = '';
            var isCustomer = false; // 是否是客户（GB部门或餐厅），客户不打印#
            
            // 优先使用订单中的扁平化字段（从stock页面传递的）
            if (order.fatherDepartmentAttrName && order.nxDepartmentAttrName) {
              depName = order.fatherDepartmentAttrName + "." + order.nxDepartmentAttrName;
              isCustomer = false; // NX部门，不是客户
              console.log('  ✓ 使用部门属性名称:', depName);
            } else if (order.nxDepartmentAttrName) {
              depName = order.nxDepartmentAttrName;
              isCustomer = false; // NX部门，不是客户
              console.log('  ✓ 使用部门属性名称:', depName);
            } else if (order.fatherGbDepartmentName && order.gbDepartmentName) {
              depName = order.fatherGbDepartmentName + "." + order.gbDepartmentName;
              isCustomer = true; // GB部门，是客户
              console.log('  ✓ 使用GB部门名称（客户）:', depName);
            } else if (order.gbDepartmentName) {
              depName = order.gbDepartmentName;
              isCustomer = true; // GB部门，是客户
              console.log('  ✓ 使用GB部门名称（客户）:', depName);
            } else if (order.nxRestrauntAttrName) {
              depName = order.nxRestrauntAttrName;
              isCustomer = true; // 餐厅，是客户
              console.log('  ✓ 使用餐厅名称（客户）:', depName);
            } else if (order.gbDepName) {
              depName = order.gbDepName;
              isCustomer = true; // GB部门，是客户
              console.log('  ✓ 使用GB部门名称（扁平化，客户）:', depName);
            } else if (order.restrauntName) {
              depName = order.restrauntName;
              isCustomer = true; // 餐厅，是客户
              console.log('  ✓ 使用餐厅名称（扁平化，客户）:', depName);
            } else if (order.depName) {
              depName = order.depName;
              isCustomer = false; // 可能是NX部门，不是客户
              console.log('  ✓ 使用部门名称（扁平化）:', depName);
            } else {
              // 兼容旧格式
              try {
                var gbDep = order.gbDepartmentEntity;
                if (gbDep && gbDep !== null) {
                  var subAmount = gbDep.gbDepartmentSubAmount;
                  if (subAmount && subAmount > 1) {
                    var fatherGbDep = gbDep.fatherGbDepartmentEntity;
                    if (fatherGbDep && fatherGbDep.gbDepartmentName) {
                      depName = fatherGbDep.gbDepartmentName + "." + (gbDep.gbDepartmentName || '');
                    } else if (gbDep.gbDepartmentName) {
                      depName = gbDep.gbDepartmentName;
                    }
                  } else if (gbDep.gbDepartmentName) {
                    depName = gbDep.gbDepartmentName;
                  }
                  isCustomer = true; // GB部门，是客户
                  console.log('  ✓ 使用GB部门名称（旧格式，客户）:', depName);
                } else {
                  var nxRest = order.nxRestrauntEntity;
                  if (nxRest && nxRest !== null && nxRest.nxRestrauntAttrName) {
                    depName = nxRest.nxRestrauntAttrName;
                    isCustomer = true; // 餐厅，是客户
                    console.log('  ✓ 使用餐厅名称（旧格式，客户）:', depName);
                  } else {
                    var nxDep = order.nxDepartmentEntity;
                    if (nxDep && nxDep !== null) {
                      var fatherNxDep = nxDep.fatherDepartmentEntity;
                      if (fatherNxDep && fatherNxDep !== null && nxDep.nxDepartmentFatherId !== 0 && fatherNxDep.nxDepartmentName) {
                        depName = fatherNxDep.nxDepartmentName + "." + (nxDep.nxDepartmentName || '');
                      } else if (nxDep.nxDepartmentName) {
                        depName = nxDep.nxDepartmentName;
                      }
                      isCustomer = false; // NX部门，不是客户
                      console.log('  ✓ 使用部门名称（旧格式）:', depName);
                    }
                  }
                }
              } catch (e) {
                console.error('  ✗ 处理部门信息时出错:', e);
              }
            }
            
            if (!depName) {
              depName = '未分类';
              isCustomer = false; // 默认不是客户
              console.log('  ⚠️ 未找到部门名称，使用默认值');
            }
            
            // 按部门分组，保存是否是客户的信息
            if (!depGroups[depName]) {
              depGroups[depName] = {
                isCustomer: isCustomer, // 保存是否是客户
                goods: []
              };
            }
            
            depGroups[depName].goods.push({
              goodsName: goodsName,
              quantity: orderQuantity,
              standard: orderStandard,
              remark: orderRemark
            });
            
            console.log('  ✓ 添加到部门分组:', depName, '商品:', goodsName, '数量:', orderQuantity + orderStandard);
          }
        }
      }
      
      // 按部门打印
      console.log('📋 开始按部门打印，部门数量:', Object.keys(depGroups).length);
      var depIndex = 0;
      for (var depNameKey in depGroups) {
        var depGroup = depGroups[depNameKey];
        var isCustomer = depGroup.isCustomer;
        var goodsList = depGroup.goods;
        
        console.log('📌 打印部门:', depNameKey, '商品数量:', goodsList.length, '是否是客户:', isCustomer);
        
        // 打印部门名称：如果是客户（GB部门或餐厅），不打印"#"，如果是NX部门，打印"#"
        if (isCustomer) {
          // 客户模式，不打印"#"
          command.setText(depNameKey);
          console.log('  ✓ 已打印客户名称（无#）:', depNameKey);
        } else {
          // NX部门模式，打印"#"
        command.setText("#" + depNameKey);
          console.log('  ✓ 已打印部门名称（有#）:', depNameKey);
        }
        command.setPrint();
        
        // 打印该部门下的商品（商品名称和订货数量在一行）
        for (var m = 0; m < goodsList.length; m++) {
          var goodsItem = goodsList[m];
          var goodsInfo = (m + 1) + ", " + goodsItem.goodsName;
          var quantityInfo = goodsItem.quantity + goodsItem.standard;
          
          console.log('  📦 打印商品:', goodsInfo, '数量:', quantityInfo);
          
          // 打印商品名称
          command.setText(goodsInfo);
          // 使用绝对位置打印数量（在同一行）
          command.setAbsolutePrintPosition(324);
          command.setText(quantityInfo);
          command.setPrint();
          
          // 如果有备注，打印备注
          if (goodsItem.remark && goodsItem.remark !== "null" && goodsItem.remark.length > 0) {
            command.setText("   备注:" + goodsItem.remark);
            command.setPrint();
            console.log('  ✓ 已打印备注:', goodsItem.remark);
          }
          
          // 在备注行下面（如果有备注）或商品行下面（如果没有备注）打印分隔线
          // 这样备注行上面就不会有分隔线了
          command.setText("------------------------------------------------");
          command.setPrint();
          console.log('  ✓ 已打印分隔线');
        }
        
        // 部门之间打印分隔线
        command.setText("-----------------------------------------------");
        command.setPrint();
      }
      
    } else {
      // 按商品显示：原来的格式不变，使用新精简字段
      console.log('📋 按商品显示模式打印');
      
      for (var j = 0; j < printGoodsArr.length; j++) {
        var item = printGoodsArr[j];
        var goodsName = item.nxDgGoodsName;
        
        console.log('📦 打印商品:', goodsName);
        
        // 打印商品信息
        command.setText(j + 1 + ", ");
        command.setText(goodsName);
        command.setPrint();
        console.log('  ✓ 已打印商品名称:', goodsName);
        
        // 根据是否使用新精简字段来决定使用哪个字段
        var orderArr = useSimpleFields ? (item.orders || []) : (item.nxDepartmentOrdersEntities || []);
        console.log('  📋 订单数量:', orderArr.length);
        
        // 打印订单详情（无"订单详情:"行，每条订单前无序号）
        if (orderArr && orderArr.length > 0) {
          for (var k = 0; k < orderArr.length; k++) {
            var order = orderArr[k];
            var orderQuantity = order.nxDoQuantity;
            var orderStandard = order.nxDoStandard;
            var orderRemark = order.nxDoRemark;
            var orderInfo = "    "; // 不要序号
            
            console.log('  📋 处理订单:', k + 1, '数量:', orderQuantity + orderStandard);
            
            // 添加订单数量和单位
            orderInfo += " 订:" + orderQuantity + orderStandard;
            // 添加备注信息
            if (orderRemark && orderRemark !== "null" && orderRemark.length > 0) {
              orderInfo += " (备注: " + orderRemark + ")";
              console.log('  ✓ 订单有备注:', orderRemark);
            }
            command.setText(orderInfo);
            command.setPrint();
            console.log('  ✓ 已打印订单信息:', orderInfo);
          }
        }
        // 打印分隔线
        command.setText("------------------------------------------------");
        command.setPrint();
      }
    }
    
    console.log('=== 打印采购商品完成 ===');
  },
  
  // 获取今天日期
  _getTodayDate() {
    var dateUtils = require('../../../../utils/dateUtil');
    return dateUtils.getWhichFullDate(0);
  },
  
  // 准备发送数据
  _prepareSend(buff) {
    var that = this;
    var time = 20; // 每次发送字节数
    
    var looptime = parseInt(buff.length / time);
    var lastData = parseInt(buff.length % time);
    
    console.log('\n========== 准备发送打印数据 ==========');
    console.log('📊 数据总长度:', buff.length, '字节');
    console.log('📊 每次发送:', time, '字节');
    console.log('📊 计算分包数:', looptime + 1);
    console.log('📊 最后包大小:', lastData, '字节');
    console.log('📊 打印份数:', that.data.printerNum);
    
    that.setData({
      looptime: looptime + 1,
      lastData: lastData,
      currentTime: 1,
    });
    
    console.log('✅ 开始发送数据到打印机');
    console.log('==========================================\n');
    
    that._sendData(buff);
  },
  
  // 发送数据
  _sendData(buff) {
    var that = this;
    var currentTime = that.data.currentTime;
    var loopTime = that.data.looptime;
    var lastData = that.data.lastData;
    var onTimeData = that.data.oneTimeData;
    var printNum = that.data.printerNum;
    var currentPrint = that.data.currentPrint;
    var buf;
    var dataView;
    if (currentTime < loopTime) {
      buf = new ArrayBuffer(onTimeData);
      dataView = new DataView(buf);
      for (var i = 0; i < onTimeData; ++i) {
        dataView.setUint8(i, buff[(currentTime - 1) * onTimeData + i]);
      }
    } else {
      buf = new ArrayBuffer(lastData);
      dataView = new DataView(buf);
      for (var i = 0; i < lastData; ++i) {
        dataView.setUint8(i, buff[(currentTime - 1) * onTimeData + i]);
      }
    }
    console.log("第" + currentTime + "次发送数据大小为：" + buf.byteLength);
    if (buf.byteLength > 0) {
      console.log("that.data.deviceId==" + that.data.deviceId);
      wx.writeBLECharacteristicValue({
        deviceId: that.data.deviceId,
        serviceId: that.data.writeServiceId,
        characteristicId: that.data.writeCharaterId,
        value: buf,
        success: function (res) {
          var times = that.data.printTimes;
          that.setData({
            showOperation: false,
            printTimes: times + 1,
          });
          if (currentTime == loopTime) {
            // 当前打印份数的最后一包数据发送成功
            console.log('✅ 当前打印份数的最后一包数据发送成功 (currentTime:', currentTime, '== loopTime:', loopTime, ')');
            
            // 注意：这里不隐藏 loading，因为可能还有更多份要打印
            // 只有在 complete 回调中，当所有份数都打印完成时才隐藏
          }
        },
        fail: function (e) {
          console.log(e);
          wx.hideLoading();
          wx.showToast({
            title: '打印第' + currentPrint + '张失败',
            icon: 'none',
          });
        },
        complete: function () {
          currentTime++;
          console.log('📊 发送完成回调 - currentTime:', currentTime, '/ loopTime:', loopTime, '/ currentPrint:', currentPrint, '/ printNum:', printNum);
          
          if (currentTime <= loopTime) {
            // 继续发送下一包数据
            console.log('📤 继续发送下一包数据');
            that.setData({
              currentTime: currentTime
            });
            // 添加延迟，确保打印机有时间处理上一包数据（iOS需要更长的延迟）
            setTimeout(function() {
            that._sendData(buff);
            }, 15); // 每包之间延迟15ms
          } else {
            // 当前打印份数的所有数据已发送完成
            console.log('✅ 当前打印份数的所有数据已发送完成');
            
            if (currentPrint == printNum) {
              // 所有打印份数都已完成
              console.log('\n========== 所有打印数据发送完成 ==========');
              console.log('📊 总打印份数:', printNum);
              console.log('📊 每份数据包数:', loopTime);
              console.log('✅ 数据已全部发送到打印机，等待打印机执行打印');
              
              that.setData({
                looptime: 0,
                lastData: 0,
                currentTime: 1,
                isReceiptSend: false,
                currentPrint: 1
              });
              
              // 延迟一下，确保最后一包数据被打印机接收和处理
              setTimeout(function() {
                // 隐藏加载提示
                wx.hideLoading();
                
                // 显示打印完成提示
                wx.showToast({
                  title: '打印数据已发送',
                  icon: 'success',
                  duration: 2000
                });
                
                console.log('✅ 打印流程完成，已等待打印机处理');
                console.log('==========================================\n');
                
                // 设置打印成功标识，用于返回 stock/index 页面时清空选择数组
                wx.setStorageSync('printSuccess', true);
                
                // 打印完成后断开蓝牙连接，释放打印机资源供其他用户使用
                console.log('📴 准备在500ms后断开出库单打印机连接，释放资源供其他用户使用');
                setTimeout(function() {
                  console.log('📴 开始断开出库单打印机连接...');
                  that._closeBluetoothConnection();
                  
                  // 断开连接后，延迟一下再返回，确保用户能看到打印完成提示
                  setTimeout(function() {
                    console.log('📤 打印成功，自动返回 stock/index 页面');
                    wx.navigateBack({
                      delta: 1
                    });
                  }, 500); // 延迟500ms后返回，让用户看到打印完成提示
                }, 500); // 延迟500ms后断开连接，确保打印机有时间处理数据
              }, 300); // 延迟300ms，确保最后一包数据被打印机处理
            } else {
              // 继续打印下一份
              console.log('📄 继续打印下一份，当前:', currentPrint, '/ 总共:', printNum);
              currentPrint++;
              that.setData({
                currentPrint: currentPrint,
                currentTime: 1,
              });
              that._sendData(buff);
            }
          }
        }
      });
    } else {
      console.log("else===============");
      that.setData({
        printTimes: 0
      });
    }
  },
  
  // 关闭蓝牙连接
  _closeBluetoothConnection() {
    var that = this;
    if (this.data.deviceId) {
      console.log('📴 准备断开出库单打印机连接，deviceId:', this.data.deviceId);
      wx.closeBLEConnection({
        deviceId: this.data.deviceId,
        success: function(res) {
          console.log('✅ 出库单打印机连接已断开');
          // 清除连接状态
          that.setData({
            isBluetoothConnected: false
          });
        },
        fail: function(err) {
          console.log('⚠️ 断开出库单打印机连接失败:', err);
          // 即使断开失败，也清除连接状态标记
          that.setData({
            isBluetoothConnected: false
          });
        }
      });
    } else {
      console.log('⚠️ 出库单打印机信息不存在，无需断开连接');
    }
  },
  
  // 清除缓存的方法
  _clearCache() {
    wx.removeStorageSync('toPrintWx');
    wx.removeStorageSync('selArr');
    wx.removeStorageSync('printGoodsArr');
  },



  closeEditPurGoods() {
    this.setData({
      purchaseGoods: "",
      showEditPurchase: false,
      item: "",
      goodsIndex: "",
      planOrder: "",
      applyStandardName: "",
    })
  },

  toEditPurchaseGoods(e) {
    var puringGoods = e.currentTarget.dataset.item;
    var item = puringGoods.nxDistributerGoodsEntity;
    this.setData({
      purchaseGoods: puringGoods,
      showEditPurchase: true,
      item: item,
      goodsIndex: e.currentTarget.dataset.index,
      planOrder: puringGoods.nxDpgQuantity,
      applyStandardName: puringGoods.nxDpgStandard,
    })
  },


  confirmEditPurGoods(e) {
    console.log(e);
    var id = this.data.purchaseGoods.nxDistributerPurchaseGoodsId;
    var plan = e.detail.planOrder;
    var standard = e.detail.applyStandardName;
    var purGoods = {
      id: id,
      quantity: e.detail.planOrder,
      standard: e.detail.applyStandardName,
      level: e.detail.priceLevel,
    }
    var that = this;
    givePurGoodsQuantity(purGoods).then(res => {
      if (res.result.code == 0) {
        console.log(res);
        var data = "printGoodsArr[" + this.data.goodsIndex + "].nxDpgQuantity";
        var dataS = "printGoodsArr[" + this.data.goodsIndex + "].nxDpgStandard";
        this.setData({
          [data]: plan,
          [dataS]: standard,
          purchaseGoods: "",
          showEditPurchase: false,
          item: "",
          goodsIndex: "",
          planOrder: "",
        })
        that._checkCanSave();
      }
    })
  },




  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },

  onHide() {
    // 页面隐藏时清理蓝牙搜索
    this._cleanupBluetoothSearch();
  },
  
  onUnload() {
    // 页面卸载时清除缓存
    // this._clearCache();
    
    // 清理蓝牙连接
    this._cleanupBluetooth();
  },
  
  // 清理蓝牙搜索
  _cleanupBluetoothSearch() {
    // 只停止蓝牙搜索，不关闭连接
    wx.stopBluetoothDevicesDiscovery({
      success: function(res) {
        console.log('页面隐藏时停止搜索成功');
      },
      fail: function(err) {
        console.log('页面隐藏时停止搜索失败:', err);
      }
    });
  },
  
  // 清理蓝牙连接
  _cleanupBluetooth() {
    // 停止蓝牙搜索
    wx.stopBluetoothDevicesDiscovery({
      success: function(res) {
        console.log('页面卸载时停止搜索成功');
      },
      fail: function(err) {
        console.log('页面卸载时停止搜索失败:', err);
      }
    });
    
    // 如果有连接，关闭连接
    if (this.data.deviceId) {
      wx.closeBLEConnection({
        deviceId: this.data.deviceId,
        success: function(res) {
          console.log('页面卸载时关闭连接成功');
        },
        fail: function(err) {
          console.log('页面卸载时关闭连接失败:', err);
        }
      });
    }
  },







})
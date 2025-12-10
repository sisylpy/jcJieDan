var load = require('../../../../lib/load.js');

import {
  saveDisPurGoodsBatch,
  saveDisPurGoodsBatchByDep,
  givePurGoodsQuantity,
  deleteDisBatch
} from '../../../../lib/apiDepOrder'


Page({

  /**
   * 页面的初始数据
   */
  data: {

    showEditPurchase: false,
    haveOrder: false,
    canSave: false,
    
    // 显示模式相关数据（从 purchase 页面传递）
    purchaseViewMode: 'category',
    purchaseSelectedDepId: null,
    purchaseSelectedDepName: '', // 部门名称，用于复制内容
    
    // 确认弹窗相关数据
    showConfirmModal: false,
    pasteContent: '',
    tempBatchId: '', // 临时保存批次ID
    
    // 打印相关数据
    isPrintMode: false, // 是否为打印模式
    
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
      // 读取显示模式和部门ID信息
      const viewMode = wx.getStorageSync('purchaseViewMode') || 'category';
      const selectedDepId = wx.getStorageSync('purchaseSelectedDepId');
      const selectedDepName = wx.getStorageSync('purchaseSelectedDepName') || '';
      
      // 确保数据格式统一（扁平化）
      var formattedArr = this._formatGoodsData(arr);
      
      this.setData({
        purGoodsArr: formattedArr,
        purchaseViewMode: viewMode,
        purchaseSelectedDepId: selectedDepId,
        purchaseSelectedDepName: selectedDepName,
      });
      // 获取数据后立即清除缓存，防止累加
      wx.removeStorageSync('selArr');
    }

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
    var arr = this.data.purGoodsArr;
    for (var i = 0; i < arr.length; i++) {
      // 适配简化DTO：使用 orders 字段替代 nxDepartmentOrdersEntities
      var orderArr = arr[i].orders || arr[i].nxDepartmentOrdersEntities || [];
      if(orderArr.length > 0){
        var quantityCount = 0;
        var total = 0;
        // 适配简化DTO：使用扁平化的商品字段
        var goodsStandardName = arr[i].nxDgGoodsStandardname || (arr[i].nxDistributerGoodsEntity && arr[i].nxDistributerGoodsEntity.nxDgGoodsStandardname) || '';
        for(var j = 0; j < orderArr.length; j++){
          if(orderArr[j].nxDoStandard == goodsStandardName){
            console.log("orderstmd", orderArr[j].nxDoStandard);
            console.log("orderstmd", orderArr[j].nxDoStandard);
            quantityCount = quantityCount + 1;
            total = Number(total) + Number(orderArr[j].nxDoQuantity);
          }   
        }
        console.log("quaotototo", quantityCount);

        if(quantityCount == orderArr.length){
          var id = this.data.purGoodsArr[i].nxDistributerPurchaseGoodsId;
          var standard = goodsStandardName;
           var purGoods = {
            id: id,
            quantity: total,
            standard: standard,
            level: 1,
          }
          givePurGoodsQuantity(purGoods).then(res => {
            if (res.result.code == 0) {
           
            }
          })

          var data = "purGoodsArr[" + i +"].nxDpgQuantity";
          this.setData({
            [data]: total,
          })
          
        }
      }
    }
    this._checkCanSave();

  },
  _checkCanSave() {
    var arr = this.data.purGoodsArr;
    var canSaveCount = 0;
    for(var i = 0; i < arr.length; i++){
      if(arr[i].nxDpgQuantity !== null){
        canSaveCount = canSaveCount + 1;
      }
    }
    
    if(canSaveCount == this.data.purGoodsArr.length){
      this.setData({
        canSave: true,
      })
    }else{
      this.setData({
        canSave: false
      })
    }
   
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

  // 关闭确认弹窗
  closeConfirmModal() {
    this.setData({
      showConfirmModal: false,
      pasteContent: ''
    });
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 空函数，用于阻止事件冒泡
  },

  // 确认保存批次
  confirmSaveBatch() {
    var batch = {
      nxDpbDistributerId: this.data.disId,
      nxDPGEntities: this.data.purGoodsArr,
      nxDPBPurUserId: this.data.userInfo.nxDistributerUserId,
      nxDpbPurchaseType: 3,
      nxDpbPasteContent: this.data.pasteContent, // 添加复制内容字段
    }
    
    // 如果是按客户模式，添加部门ID
    if (this.data.purchaseViewMode === 'department' && this.data.purchaseSelectedDepId) {
      batch.nxDpbNxDepartmentFatherId = this.data.purchaseSelectedDepId;
    }
    
    load.showLoading("保存中");
    // 根据显示模式选择不同的接口
    const saveApi = (this.data.purchaseViewMode === 'department' && this.data.purchaseSelectedDepId) 
      ? saveDisPurGoodsBatchByDep 
      : saveDisPurGoodsBatch;
    
    saveApi(batch).then(res => {
      load.hideLoading();
      var that = this;
      if (res.result.code == 0) {
        // 先保存pasteContent的值，因为setData会清空它
        var contentToCopy = this.data.pasteContent;
        
        that.setData({
          batchId: res.result.data,
          showConfirmModal: false,
          pasteContent: ''
        })
        
        // 复制到剪贴板（使用之前保存的值）
        wx.setClipboardData({
          data: contentToCopy,
          success(res) {
            wx.showToast({
              title: '订单内容已复制',
              icon: 'success',
              duration: 2000
            });
            // 清除缓存数据
            that._clearCache();
           
            wx.navigateBack({detail: 1});
          },
          fail(err) {
            console.log(err);
            wx.showToast({
              title: '复制失败，请重试',
              icon: 'none',
              duration: 2000
            });
            that.cancelDisBatch();
          }
        });

      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }

    }).catch(err => {
      load.hideLoading();
      console.error('保存批次失败:', err);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      });
    })
  },

  
  cancelDisBatch() {
    deleteDisBatch(this.data.batchId)
    .then(res => {
      if (res.result.code == 0) {
        wx.navigateBack({
          detail: 1
        })
      }
    })
  },

  _getPasteContent() {
    let orderContent = "";
    
    // 如果是部门模式，在复制内容前面加上部门名称
    if (this.data.purchaseViewMode === 'department' && this.data.purchaseSelectedDepName) {
      orderContent += `${this.data.purchaseSelectedDepName}\n`;
    }
    
    const arr = this.data.purGoodsArr;
    for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        if (item.nxDpgQuantity !== null) {
            // 适配简化DTO：使用扁平化的商品字段
            const goodsName = item.nxDgGoodsName || (item.nxDistributerGoodsEntity && item.nxDistributerGoodsEntity.nxDgGoodsName) || '';
            const quantity = item.nxDpgQuantity;
            const standard = item.nxDpgStandard;
            orderContent += `${i + 1}, ${goodsName} ${quantity}${standard}\n`;
        }
    }
    return orderContent;
  },

  // 保存打印批次
  _savePrintBatch(orderContent) {
    // 立即显示打印准备中的提示
    wx.showLoading({
      title: '准备打印中...',
      mask: true
    });
    
    // 先执行打印，打印成功后再保存批次
    this._printPurchaseOrder(orderContent);
  },

  // 打印采购单
  _printPurchaseOrder(orderContent) {
    // 参考 orderPrint.js 的打印实现
    var that = this;
    
    // 检查蓝牙设备
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
    
    // 调试信息
    console.log('用户信息:', value);
    console.log('设备ID:', value.nxDiuPrintDeviceId);
    
    // 设置设备ID
    this.setData({
      deviceId: value.nxDiuPrintDeviceId
    });
    
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
    wx.showLoading({
      title: '准备打印数据...',
      mask: true
    });
    
    var that = this;
    var esc = require("../../../../utils/GPutils/esc.js");
    var command = esc.jpPrinter.createNew();
    command.init();
    
    // 设置打印格式
    command.setPrintAndFeedRow(7);
    command.setSelectJustification(1); // 居中
    command.setCharacterSize(17); // 设置倍高倍宽
    
    // 打印标题
    command.setText("采购单");
    command.setPrint(); // 打印并换行
    command.setPrint(); // 打印并换行
    
    // 设置居左
    command.setSelectJustification(0);
    command.setCharacterSize(0);
    command.setText("日期: " + this._getTodayDate());
    command.setPrint(); // 打印并换行
    command.setPrint();
    
    // 打印表头
    command.setText("   商品");
    command.setAbsolutePrintPosition(324);
    command.setText("数量");
    command.setPrint();
    command.setText("------------------------------------------------");
    command.setPrint();
    command.setCharacterSize(1); // 设置倍高倍宽
    
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
    command.setPrint();
    command.setPrint();
    command.setPrint();
    command.setPrint();
    command.setPrint();
    
    // 准备发送数据
    this._prepareSend(command.getData());
  },
  
  // 打印采购商品
  _printPurchaseGoods(command) {
    var purGoodsArr = this.data.purGoodsArr;
    for (var j = 0; j < purGoodsArr.length; j++) {
      var item = purGoodsArr[j];
      // 适配简化DTO：使用扁平化的商品字段
      var goodsName = item.nxDgGoodsName || (item.nxDistributerGoodsEntity && item.nxDistributerGoodsEntity.nxDgGoodsName) || '';
      var quantity = item.nxDpgQuantity;
      var standard = item.nxDpgStandard || item.nxDgGoodsStandardname || (item.nxDistributerGoodsEntity && item.nxDistributerGoodsEntity.nxDgGoodsStandardname) || '';
      // 打印商品信息
      command.setText(j + 1 + ", ");
      command.setText(goodsName);
      command.setAbsolutePrintPosition(324);
      command.setText("  " + quantity + standard);
      command.setPrint();
      // 打印订单详情（无"订单详情:"行，每条订单前无序号）
      // 适配简化DTO：使用 orders 字段替代 nxDepartmentOrdersEntities
      var orderArr = item.orders || item.nxDepartmentOrdersEntities || [];
      if (orderArr.length > 0) {
        for (var k = 0; k < orderArr.length; k++) {
          var order = orderArr[k];
          var orderQuantity = order.nxDoQuantity;
          var orderStandard = order.nxDoStandard;
          var orderRemark = order.nxDoRemark;
          var orderInfo = "    "; // 不要序号
          // 处理部门信息（适配简化DTO：使用扁平化字段）
          if (order.gbDepName) {
            // 使用扁平化的 GB 部门名称
            orderInfo += order.gbDepName;
          } else if (order.restrauntName) {
            // 使用扁平化的餐厅名称
            orderInfo += order.restrauntName;
          } else if (order.depName) {
            // 使用扁平化的部门名称
            orderInfo += order.depName;
          } else {
            // 兼容旧格式（如果还有嵌套对象）
            if (order.gbDepartmentEntity !== null) {
              if (order.gbDepartmentEntity.gbDepartmentSubAmount > 1) {
                orderInfo += order.gbDepartmentEntity.fatherGbDepartmentEntity.gbDepartmentName + "." + order.gbDepartmentEntity.gbDepartmentName;
              } else {
                orderInfo += order.gbDepartmentEntity.gbDepartmentName;
              }
            } else if (order.nxRestrauntEntity !== null) {
              orderInfo += order.nxRestrauntEntity.nxRestrauntAttrName;
            } else if (order.nxDepartmentEntity !== null) {
              if (order.nxDepartmentEntity.fatherDepartmentEntity !== null) {
                orderInfo += order.nxDepartmentEntity.fatherDepartmentEntity.nxDepartmentName + "." + order.nxDepartmentEntity.nxDepartmentName;
              } else {
                orderInfo += order.nxDepartmentEntity.nxDepartmentName;
              }
            }
          }
          // 添加订单数量和单位
          orderInfo += " 订:" + orderQuantity + orderStandard;
          // 添加备注信息
          if (orderRemark && orderRemark !== "null" && orderRemark.length > 0) {
            orderInfo += " (备注: " + orderRemark + ")";
          }
          command.setText(orderInfo);
          command.setPrint();
        }
      }
      // 打印分隔线
      command.setText("------------------------------------------------");
      command.setPrint();
    }
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
    
    that.setData({
      looptime: looptime + 1,
      lastData: lastData,
      currentTime: 1,
    });
    
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
            // 最后一次，保存订单
            that.setData({
              printTimes: 0
            });
            // 隐藏加载提示
            wx.hideLoading();
            // 打印成功后保存批次
            that._saveBatchAfterPrint();
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
          if (currentTime <= loopTime) {
            that.setData({
              currentTime: currentTime
            });
            that._sendData(buff);
          } else {
            if (currentPrint == printNum) {
              that.setData({
                looptime: 0,
                lastData: 0,
                currentTime: 1,
                isReceiptSend: false,
                currentPrint: 1
              });
            } else {
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
  
  // 打印成功后保存批次
  _saveBatchAfterPrint() {
    // 获取之前生成的打印内容
    var orderContent = this._getPasteContent();
    
    var batch = {
      nxDpbDistributerId: this.data.disId,
      nxDPGEntities: this.data.purGoodsArr,
      nxDPBPurUserId: this.data.userInfo.nxDistributerUserId,
      nxDpbPurchaseType: 1, // 打印类型
      nxDpbPasteContent: orderContent, // 打印内容
    }
    
    // 如果是按客户模式，添加部门ID
    if (this.data.purchaseViewMode === 'department' && this.data.purchaseSelectedDepId) {
      batch.nxDpbNxDepartmentFatherId = this.data.purchaseSelectedDepId;
    }
  
    load.showLoading("保存打印批次中");
    // 根据显示模式选择不同的接口
    const saveApi = (this.data.purchaseViewMode === 'department' && this.data.purchaseSelectedDepId) 
      ? saveDisPurGoodsBatchByDep 
      : saveDisPurGoodsBatch;
    
    saveApi(batch).then(res => {
      load.hideLoading();
      // 无论成功失败都清除缓存
      this._clearCache();
      
      if (res.result.code == 0) {
        wx.showToast({
          title: '打印并保存成功',
          icon: 'success',
          duration: 2000
        });
        
        // 打印成功，保持连接状态
        console.log('打印成功，保持蓝牙连接');
        
        // 返回上一页
        setTimeout(() => {
          wx.navigateBack();
        }, 2000);
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        });
      }
    }).catch(err => {
      load.hideLoading();
      console.error('保存打印批次失败:', err);
      // 失败时也清除缓存
      this._clearCache();
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      });
    });
  },
  
  // 关闭蓝牙连接
  _closeBluetoothConnection() {
    if (this.data.deviceId) {
      wx.closeBLEConnection({
        deviceId: this.data.deviceId,
        success: function(res) {
          console.log('打印完成后关闭连接成功');
        },
        fail: function(err) {
          console.log('打印完成后关闭连接失败:', err);
        }
      });
    }
  },
  
  // 格式化商品数据，确保使用扁平化字段
  _formatGoodsData(arr) {
    if (!arr || arr.length === 0) {
      return arr;
    }
    
    return arr.map(item => {
      // 如果数据已经是扁平化的（有 nxDgGoodsName），直接返回
      if (item.nxDgGoodsName) {
        // 确保 orders 字段存在
        if (!item.orders && item.nxDepartmentOrdersEntities) {
          item.orders = item.nxDepartmentOrdersEntities;
          delete item.nxDepartmentOrdersEntities;
        }
        return item;
      }
      
      // 如果还是旧格式（有嵌套的 nxDistributerGoodsEntity），转换为扁平化格式
      if (item.nxDistributerGoodsEntity) {
        var goodsEntity = item.nxDistributerGoodsEntity;
        var formatted = Object.assign({}, item);
        
        // 扁平化商品字段
        formatted.nxDgGoodsName = goodsEntity.nxDgGoodsName;
        formatted.nxDgGoodsStandardname = goodsEntity.nxDgGoodsStandardname;
        formatted.nxDgGoodsStandardWeight = goodsEntity.nxDgGoodsStandardWeight;
        formatted.nxDgCartonUnit = goodsEntity.nxDgCartonUnit;
        formatted.nxDgGoodsBrand = goodsEntity.nxDgGoodsBrand;
        formatted.nxDgDfgGoodsGrandId = goodsEntity.nxDgDfgGoodsGrandId;
        formatted.nxDgPurchaseAuto = goodsEntity.nxDgPurchaseAuto;
        formatted.nxDgGoodsPlace = goodsEntity.nxDgGoodsPlace;
        formatted.nxDgGoodsDetail = goodsEntity.nxDgGoodsDetail;
        formatted.isSelected = goodsEntity.isSelected || item.isSelected;
        
        // 处理订单列表
        if (item.nxDepartmentOrdersEntities) {
          formatted.orders = item.nxDepartmentOrdersEntities;
          delete formatted.nxDepartmentOrdersEntities;
        } else if (item.orders) {
          formatted.orders = item.orders;
        }
        
        // 删除嵌套对象
        delete formatted.nxDistributerGoodsEntity;
        
        return formatted;
      }
      
      return item;
    });
  },
  
  // 清除缓存的方法
  _clearCache() {
    wx.removeStorageSync('toPrintWx');
    wx.removeStorageSync('selArr');
    wx.removeStorageSync('purGoodsArr');
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
    // 适配简化DTO：如果数据已经是扁平化的，直接使用；否则使用嵌套对象
    var item = puringGoods.nxDistributerGoodsEntity || puringGoods;
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
        var data = "purGoodsArr[" + this.data.goodsIndex + "].nxDpgQuantity";
        var dataS = "purGoodsArr[" + this.data.goodsIndex + "].nxDpgStandard";
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
    this._clearCache();
    
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
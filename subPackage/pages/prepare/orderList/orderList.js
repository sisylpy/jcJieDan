var load = require('../../../../lib/load.js');

import {
  saveBossCopiedPurchaseBatch,
  saveBossPrintedPurchaseBatch,
  saveBossCopiedDepartmentPurchaseBatch,
  saveBossPrintedDepartmentPurchaseBatch,
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
    
    // 打印相关参数（统一使用这些参数）
    printPageType: 'purchase', // 'stock' 出库页面, 'purchase' 采购页面
    printViewMode: 'category', // 'category' 按商品显示, 'department' 按部门显示
    printUseSimpleFields: true, // 是否使用简化字段
    printCustomerName: '', // 客户名称
    
    // 部门信息（用于显示和复制）
    purchaseSelectedDepId: null,
    purchaseSelectedDepName: '', // 部门名称，用于复制内容
    
    // 兼容旧参数（已废弃，保留用于兼容）
    purchaseViewMode: 'category',
    
    // 确认弹窗相关数据
    showConfirmModal: false,
    pasteContent: '',
    tempBatchId: '', // 临时保存批次ID
    onlyGoodsNameAndTotal: false, // 是否只复制商品名称和采购总数
    
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

    // 从缓存中读取"仅商品名称和总数"的设置
    var onlyGoodsNameAndTotal = wx.getStorageSync('onlyGoodsNameAndTotal');
    if (onlyGoodsNameAndTotal !== undefined && onlyGoodsNameAndTotal !== null && onlyGoodsNameAndTotal !== '') {
      this.setData({
        onlyGoodsNameAndTotal: onlyGoodsNameAndTotal
      });
    }

    // 获取商品数组
    var arr = wx.getStorageSync('selArr');
    if (arr && arr.length > 0) {
      // 读取页面类型和显示模式（统一参数）
      var printPageType = wx.getStorageSync('printPageType') || 'purchase'; // 'stock' 出库页面, 'purchase' 采购页面
      var printViewMode = wx.getStorageSync('printViewMode') || 'category'; // 'category' 按商品显示, 'department' 按部门显示
      var printUseSimpleFields = wx.getStorageSync('printUseSimpleFields') !== undefined ? wx.getStorageSync('printUseSimpleFields') : (printViewMode === 'category');
      var printCustomerName = wx.getStorageSync('printCustomerName') || '';
      
      // 兼容旧参数（如果新参数不存在，使用旧参数）
      if (!wx.getStorageSync('printPageType')) {
        const viewMode = wx.getStorageSync('purchaseViewMode');
        if (viewMode) {
          printPageType = 'purchase';
          printViewMode = viewMode;
        }
      }
      
      // 读取部门ID信息（用于显示，不是打印）
      const selectedDepId = wx.getStorageSync('purchaseSelectedDepId');
      const selectedDepName = wx.getStorageSync('purchaseSelectedDepName') || '';
      
      // 确保数据格式统一（扁平化）
      var formattedArr = this._formatGoodsData(arr);
      
      this.setData({
        purGoodsArr: formattedArr,
        // 统一参数（主要使用这些）
        printPageType: printPageType,
        printViewMode: printViewMode,
        printUseSimpleFields: printUseSimpleFields,
        printCustomerName: printCustomerName,
        // 部门信息
        purchaseSelectedDepId: selectedDepId,
        purchaseSelectedDepName: selectedDepName,
        // 兼容旧参数（已废弃，保留用于兼容）
        purchaseViewMode: printViewMode,
      });
      console.log('✓ 打印参数:', {
        pageType: printPageType,
        viewMode: printViewMode,
        useSimpleFields: printUseSimpleFields,
        customerName: printCustomerName
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

  // 切换是否只复制商品名称和采购总数
  changeShowOrder(e) {
    const value = e.detail.value;
    this.setData({
      onlyGoodsNameAndTotal: value
    });
    // 保存到缓存
    wx.setStorageSync('onlyGoodsNameAndTotal', value);
    // 重新生成预览内容
    var orderContent = this._getPasteContent();
    this.setData({
      pasteContent: orderContent
    });
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
            total = (Number(total) + Number(orderArr[j].nxDoQuantity)).toFixed(1);
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

  // 阻止滚动穿透
  preventScroll() {
    // 空函数，用于阻止滚动穿透
    return false;
  },


  // 确认保存批次
  confirmSaveBatch() {
    var batch = {
      nxDpbDistributerId: this.data.disId,
      nxDPGEntities: this.data.purGoodsArr,
      nxDPBPurUserId: this.data.userInfo.nxDistributerUserId,
      nxDpbPasteContent: this.data.pasteContent, // 添加复制内容字段
    }
    
    // 如果是按客户模式，添加部门ID
    if (this.data.printViewMode === 'department' && this.data.purchaseSelectedDepId) {
      batch.nxDpbNxDepartmentFatherId = this.data.purchaseSelectedDepId;
    }
    
    load.showLoading("保存中");
    // 根据显示模式选择不同的接口
    const saveApi = (this.data.printViewMode === 'department' && this.data.purchaseSelectedDepId)
      ? saveBossCopiedDepartmentPurchaseBatch
      : saveBossCopiedPurchaseBatch;
    
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
    if (this.data.printViewMode === 'department' && this.data.purchaseSelectedDepName) {
      orderContent += `${this.data.purchaseSelectedDepName}\n`;
    }
    
    const arr = this.data.purGoodsArr;
    const onlyGoodsNameAndTotal = this.data.onlyGoodsNameAndTotal || false;
    
    for (let i = 0; i < arr.length; i++) {
        const item = arr[i];
        if (item.nxDpgQuantity !== null) {
            // 适配简化DTO：使用扁平化的商品字段
            const goodsName = item.nxDgGoodsName || (item.nxDistributerGoodsEntity && item.nxDistributerGoodsEntity.nxDgGoodsName) || '';
            let quantity = item.nxDpgQuantity;
            let standard = item.nxDpgStandard;
            const weight = item.nxDgGoodsStandardWeight || (item.nxDistributerGoodsEntity && item.nxDistributerGoodsEntity.nxDgGoodsStandardWeight) || '';
            const standardName = item.nxDgGoodsStandardname || (item.nxDistributerGoodsEntity && item.nxDistributerGoodsEntity.nxDgGoodsStandardname) || '';

            // 规格重量信息，例如：6.5kg/桶
            let spec = '';
            if (weight && weight !== 'null' && String(weight).length > 0 && standardName && standardName !== 'null' && String(standardName).length > 0) {
              spec = `(${weight}/${standardName})`;
            } else if (standardName && standardName !== 'null' && String(standardName).length > 0) {
              spec = `(${standardName})`;
            }

            // 如果采购数量为空，但下面有订单，则按订单数量汇总作为商品数量
            const orders = item.orders || [];
            const hasNoQuantity = !quantity || quantity === 'null' || String(quantity).trim().length === 0;
            if (hasNoQuantity && orders.length > 0) {
              let total = 0;
              for (let j = 0; j < orders.length; j++) {
                total += Number(orders[j].nxDoQuantity || 0);
                if (j === 0 && orders[j].nxDoStandard && orders[j].nxDoStandard !== 'null') {
                  standard = orders[j].nxDoStandard;
                }
              }
              quantity = total;
            }
            
            // 输出采购商品信息：序号、名称(规格/重量)、数量单位
            orderContent += `${i + 1}, ${goodsName}${spec} ${quantity}${standard}\n`;
            
            // 如果开关关闭（onlyGoodsNameAndTotal为false），才输出订单详情
            if (!onlyGoodsNameAndTotal) {
              // 遍历该商品下的每个订单
              if (item.orders && item.orders.length > 0) {
                for (let j = 0; j < item.orders.length; j++) {
                  const order = item.orders[j];
                  // 获取部门名称
                  let depName = '';
                  // 协作订单：优先使用 [协作商名称]fatherDepartmentOrderCode（不含空格）
                  const collabId = order.nxDoRequestDisId;
                  const isCollaborative = collabId !== undefined && collabId !== null && collabId !== -1 && String(collabId) !== '-1';
                  if (isCollaborative) {
                    depName = '[' + (order.nxDoRequestDistributerName || '') + ']';
                    const fatherCode = order.fatherDepartmentOrderCode || (order.nxDepartmentEntity && order.nxDepartmentEntity.fatherDepartmentEntity ? order.nxDepartmentEntity.fatherDepartmentEntity.nxDepartmentOrderCode : null);
                    if (fatherCode) depName += fatherCode;
                  } else {
                    depName = order.gbDepName || order.restrauntName || order.depName || order.nxDepartmentOrderCode || '';
                  }
                  const orderQuantity = order.nxDoQuantity || '';
                  const orderStandard = order.nxDoStandard || '';
                  const orderRemark = order.nxDoRemark && order.nxDoRemark !== 'null' && order.nxDoRemark.length > 0 ? order.nxDoRemark : '';
                  
                  // 输出订单信息：部门名称 数量规格 (备注)
                  let orderLine = `   ${depName} ${orderQuantity}${orderStandard}`;
                  if (orderRemark) {
                    orderLine += ` (${orderRemark})`;
                  }
                  orderContent += orderLine + '\n';
                }
              }
            }
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
            url: '/subPackage-order/pages/order/pSearchPrinter/pSearchPrinter',
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
            url: '/subPackage-order/pages/order/pSearchPrinter/pSearchPrinter',
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
                url: '/subPackage-order/pages/order/pSearchPrinter/pSearchPrinter',
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
              url: '/subPackage-order/pages/order/pSearchPrinter/pSearchPrinter',
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
    // 使用统一参数
    var pageType = this.data.printPageType || 'purchase'; // 'stock' 出库页面, 'purchase' 采购页面
    var viewMode = this.data.printViewMode || 'category'; // 'category' 按商品显示, 'department' 按部门显示
    console.log('📊 打印参数:', {
      pageType: pageType,
      viewMode: viewMode,
      goodsCount: this.data.purGoodsArr ? this.data.purGoodsArr.length : 0
    });
    
    var esc = require("../../../../utils/GPutils/esc.js");
    var command = esc.jpPrinter.createNew();
    command.init();
    
    // 设置打印格式
    command.setPrintAndFeedRow(7);
    command.setSelectJustification(1); // 居中
    command.setCharacterSize(17); // 设置倍高倍宽
    
    // 打印标题：根据页面类型判断
    // 出库页面显示"出库单"，采购页面显示"采购单"
    var titleText = pageType === 'stock' ? "出库单" : "采购单";
    command.setText(titleText);
    console.log('✓ 打印标题:', titleText, '(pageType:', pageType, ')');
    command.setPrint(); // 打印并换行
    command.setPrint(); // 打印并换行
    
    // 设置居左
    command.setSelectJustification(0);
    command.setCharacterSize(0); // 先设置为默认字体大小
    
    // 如果是按部门显示，先获取客户名称并打印（使用和商品名称一样大的字体）
    var customerName = '';
    if (viewMode === 'department') {
      // 使用统一参数
      customerName = this.data.printCustomerName || '';
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
    console.log('=== 开始打印采购商品 ===');
    var purGoodsArr = this.data.purGoodsArr;
    // 使用统一参数
    var pageType = this.data.printPageType || 'purchase'; // 'stock' 出库页面, 'purchase' 采购页面
    var viewMode = this.data.printViewMode || 'category'; // 'category' 按商品显示, 'department' 按部门显示
    var useSimpleFields = this.data.printUseSimpleFields !== undefined ? this.data.printUseSimpleFields : (viewMode === 'category');
    
    console.log('📊 打印参数:', {
      pageType: pageType,
      viewMode: viewMode,
      useSimpleFields: useSimpleFields,
      goodsCount: purGoodsArr.length
    });
    
    if (viewMode === 'department') {
      // 按部门显示：先打印部门名称，然后商品名称和订货数量在一行显示
      console.log('📋 按部门显示模式打印');
      
      // 按部门分组数据
      var depGroups = {};
      
      for (var j = 0; j < purGoodsArr.length; j++) {
        var item = purGoodsArr[j];
        // 适配简化DTO：使用扁平化的商品字段
        var goodsName = item.nxDgGoodsName || (item.nxDistributerGoodsEntity && item.nxDistributerGoodsEntity.nxDgGoodsName) || '';
        console.log('📦 处理商品:', goodsName);
        
        // 根据是否使用新精简字段来决定使用哪个字段
        // 出库页面使用 nxDepartmentOrdersEntities，采购页面按商品显示时使用 orders
        var orderArr = [];
        if (useSimpleFields && item.orders) {
          // 采购页面按商品显示：使用 orders 字段
          orderArr = item.orders;
        } else if (item.nxDepartmentOrdersEntities) {
          // 出库页面或采购页面按部门显示：使用 nxDepartmentOrdersEntities 字段
          orderArr = item.nxDepartmentOrdersEntities;
        } else if (item.orders) {
          // 兼容：如果没有 nxDepartmentOrdersEntities，尝试使用 orders
          orderArr = item.orders;
        }
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
            
            // 协作订单：优先使用 [协作商名称]fatherDepartmentOrderCode（不含空格）
            var collabId = order.nxDoRequestDisId;
            var isCollaborative = collabId !== undefined && collabId !== null && collabId !== -1 && String(collabId) !== '-1';
            if (isCollaborative) {
              depName = '[' + (order.nxDoRequestDistributerName || '') + ']';
              var fatherCode = order.fatherDepartmentOrderCode || (order.nxDepartmentEntity && order.nxDepartmentEntity.fatherDepartmentEntity ? order.nxDepartmentEntity.fatherDepartmentEntity.nxDepartmentOrderCode : null);
              if (fatherCode) depName += fatherCode;
              isCustomer = false;
            }
            // 优先使用订单中的扁平化字段
            else if (order.gbDepName) {
              depName = order.gbDepName;
              isCustomer = true; // GB部门，是客户
            } else if (order.restrauntName) {
              depName = order.restrauntName;
              isCustomer = true; // 餐厅，是客户
            } else if (order.depName) {
              depName = order.depName;
              isCustomer = false; // 可能是NX部门，不是客户
            } else if (order.fatherDepartmentAttrName && order.nxDepartmentAttrName) {
              depName = order.fatherDepartmentAttrName + "." + order.nxDepartmentAttrName;
              isCustomer = false; // NX部门，不是客户
            } else if (order.nxDepartmentAttrName) {
              depName = order.nxDepartmentAttrName;
              isCustomer = false; // NX部门，不是客户
            } else if (order.fatherGbDepartmentName && order.gbDepartmentName) {
              depName = order.fatherGbDepartmentName + "." + order.gbDepartmentName;
              isCustomer = true; // GB部门，是客户
            } else if (order.gbDepartmentName) {
              depName = order.gbDepartmentName;
              isCustomer = true; // GB部门，是客户
            } else if (order.nxRestrauntAttrName) {
              depName = order.nxRestrauntAttrName;
              isCustomer = true; // 餐厅，是客户
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
            
            // 判断是否有分部门（用于决定是否打印部门名称行）
            var hasSubDepartment = false;
            if (!isCustomer) {
              // 只有NX部门需要判断是否有分部门
              if (order.nxDoDepartmentFatherId !== undefined && 
                  order.nxDoDepartmentId !== undefined && 
                  order.nxDoDepartmentFatherId !== order.nxDoDepartmentId) {
                hasSubDepartment = true;
              }
            } else {
              // 客户（GB部门或餐厅）总是打印部门名称
              hasSubDepartment = true;
            }
            
            // 按部门分组，保存是否是客户和是否有分部门的信息
            if (!depGroups[depName]) {
              depGroups[depName] = {
                isCustomer: isCustomer, // 保存是否是客户
                hasSubDepartment: hasSubDepartment, // 保存是否有分部门
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
        
        console.log('📌 打印部门:', depNameKey, '商品数量:', goodsList.length, '是否是客户:', isCustomer, '是否有分部门:', depGroup.hasSubDepartment);
        
        // 打印部门名称：只有当有分部门时才打印（客户总是打印，NX部门需要判断）
        if (depGroup.hasSubDepartment) {
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
        } else {
          console.log('  ⚠️ 部门没有分部门，跳过打印部门名称行');
        }
        
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
          command.setText("------------------------------------------------");
          command.setPrint();
          console.log('  ✓ 已打印分隔线');
        }
        
        // 部门之间打印分隔线
        // command.setText("-----------------------------------------------");
        // command.setPrint();
      }
      
    } else {
      // 按商品显示：原来的格式不变，使用新精简字段
      console.log('📋 按商品显示模式打印');
      
      for (var j = 0; j < purGoodsArr.length; j++) {
        var item = purGoodsArr[j];
        // 适配简化DTO：使用扁平化的商品字段
        var goodsName = item.nxDgGoodsName || (item.nxDistributerGoodsEntity && item.nxDistributerGoodsEntity.nxDgGoodsName) || '';
        var quantity = item.nxDpgQuantity;
        var standard = item.nxDpgStandard || item.nxDgGoodsStandardname || (item.nxDistributerGoodsEntity && item.nxDistributerGoodsEntity.nxDgGoodsStandardname) || '';
        
        console.log('📦 打印商品:', goodsName);
        
        // 打印商品信息
        command.setText(j + 1 + ", ");
        command.setText(goodsName);
        command.setAbsolutePrintPosition(324);
        command.setText("  " + quantity + standard);
        command.setPrint();
        console.log('  ✓ 已打印商品名称:', goodsName);
        
        // 根据是否使用新精简字段来决定使用哪个字段
        // 出库页面使用 nxDepartmentOrdersEntities，采购页面按商品显示时使用 orders
        var orderArr = [];
        if (useSimpleFields && item.orders) {
          // 采购页面按商品显示：使用 orders 字段
          orderArr = item.orders;
        } else if (item.nxDepartmentOrdersEntities) {
          // 出库页面或采购页面按部门显示：使用 nxDepartmentOrdersEntities 字段
          orderArr = item.nxDepartmentOrdersEntities;
        } else if (item.orders) {
          // 兼容：如果没有 nxDepartmentOrdersEntities，尝试使用 orders
          orderArr = item.orders;
        }
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
            } else if (order.fatherDepartmentAttrName && order.nxDepartmentAttrName) {
              orderInfo += order.fatherDepartmentAttrName + "." + order.nxDepartmentAttrName;
            } else if (order.nxDepartmentAttrName) {
              orderInfo += order.nxDepartmentAttrName;
            } else if (order.fatherGbDepartmentName && order.gbDepartmentName) {
              orderInfo += order.fatherGbDepartmentName + "." + order.gbDepartmentName;
            } else if (order.gbDepartmentName) {
              orderInfo += order.gbDepartmentName;
            } else if (order.nxRestrauntAttrName) {
              orderInfo += order.nxRestrauntAttrName;
            } else {
              // 兼容旧格式（如果还有嵌套对象）
              if (order.gbDepartmentEntity !== null) {
                if (order.gbDepartmentEntity.gbDepartmentSubAmount > 1) {
                  orderInfo += order.gbDepartmentEntity.fatherGbDepartmentEntity.gbDepartmentName + "." + order.gbDepartmentEntity.gbDepartmentName;
                } else {
                  orderInfo += order.gbDepartmentEntity.gbDepartmentName;
                }
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
      // 如果数据大小为0，且已经是最后一次发送，说明打印完成
      if (currentTime == loopTime) {
        that.setData({
          printTimes: 0
        });
        // 隐藏加载提示
        wx.hideLoading();
        // 打印成功后保存批次
        that._saveBatchAfterPrint();
      } else {
        // 如果不是最后一次，继续发送
        that.setData({
          printTimes: 0,
          currentTime: currentTime + 1
        });
        that._sendData(buff);
      }
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
      nxDpbPasteContent: orderContent, // 打印内容
    }
    
    // 如果是按客户模式，添加部门ID
    if (this.data.printViewMode === 'department' && this.data.purchaseSelectedDepId) {
      batch.nxDpbNxDepartmentFatherId = this.data.purchaseSelectedDepId;
    }
  
    load.showLoading("保存打印批次中");
    // 根据显示模式选择不同的接口
    const saveApi = (this.data.printViewMode === 'department' && this.data.purchaseSelectedDepId)
      ? saveBossPrintedDepartmentPurchaseBatch
      : saveBossPrintedPurchaseBatch;
    
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
    
    return arr.map((item, goodsIndex) => {
      var goodsId = item.nxDistributerPurchaseGoodsId || goodsIndex;
      var result;
      
      // 如果数据已经是扁平化的（有 nxDgGoodsName），直接使用
      if (item.nxDgGoodsName) {
        result = Object.assign({}, item);
        // 确保 orders 字段存在
        if (!result.orders && result.nxDepartmentOrdersEntities) {
          result.orders = result.nxDepartmentOrdersEntities;
          delete result.nxDepartmentOrdersEntities;
        }
      } else if (item.nxDistributerGoodsEntity) {
        // 如果还是旧格式（有嵌套的 nxDistributerGoodsEntity），转换为扁平化格式
        var goodsEntity = item.nxDistributerGoodsEntity;
        result = Object.assign({}, item);
        
        // 扁平化商品字段
        result.nxDgGoodsName = goodsEntity.nxDgGoodsName;
        result.nxDgGoodsStandardname = goodsEntity.nxDgGoodsStandardname;
        result.nxDgGoodsStandardWeight = goodsEntity.nxDgGoodsStandardWeight;
        result.nxDgCartonUnit = goodsEntity.nxDgCartonUnit;
        result.nxDgGoodsBrand = goodsEntity.nxDgGoodsBrand;
        result.nxDgDfgGoodsGrandId = goodsEntity.nxDgDfgGoodsGrandId;
        result.nxDgPurchaseAuto = goodsEntity.nxDgPurchaseAuto;
        result.nxDgGoodsPlace = goodsEntity.nxDgGoodsPlace;
        result.nxDgGoodsDetail = goodsEntity.nxDgGoodsDetail;
        result.isSelected = goodsEntity.isSelected || item.isSelected;
        
        // 处理订单列表
        if (item.nxDepartmentOrdersEntities) {
          result.orders = item.nxDepartmentOrdersEntities;
          delete result.nxDepartmentOrdersEntities;
        } else if (item.orders) {
          result.orders = item.orders;
        }
        
        // 删除嵌套对象
        delete result.nxDistributerGoodsEntity;
      } else {
        result = Object.assign({}, item);
      }
      
      // 为每个订单添加唯一的 key
      if (result.orders && result.orders.length > 0) {
        result.orders = result.orders.map((order, orderIndex) => {
          var orderId = order.nxDepartmentOrdersId || orderIndex;
          return Object.assign({}, order, {
            uniqueKey: goodsId + '-' + orderId + '-' + orderIndex
          });
        });
      }
      
      return result;
    });
  },
  
  // 清除缓存的方法
  _clearCache() {
    wx.removeStorageSync('toPrintWx');
    wx.removeStorageSync('selArr');
    wx.removeStorageSync('purGoodsArr');
    // 清除打印相关缓存（可选，根据需求决定是否清除）
    // wx.removeStorageSync('printPageType');
    // wx.removeStorageSync('printViewMode');
    // wx.removeStorageSync('printUseSimpleFields');
    // wx.removeStorageSync('printCustomerName');
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

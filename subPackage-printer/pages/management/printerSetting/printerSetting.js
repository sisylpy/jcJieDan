import { testFeiEPrinter } from '../../../../lib/apiDepOrder'
import { saveCashFeiePrinterSn } from '../../../../lib/apiDistributer'

var app = getApp();
var esc = require('../../../../utils/GPutils/esc.js');
var tsc = require('../../../../utils/GPutils/tsc.js').jpPrinter;

Page({
  data: {
    navBarHeight: 0,
    receiptPrinter: null,
    cashPrinterSN: '',
    labelPrinter: null,
    paperSize: 1,
    paperSizeText: '4*3cm（横）',
    isConnecting: false
  },

  onLoad: function () {
    this.setData({
      navBarHeight: app.globalData.navBarHeight
    });
  },

  onShow: function () {
    this.loadSettings();
  },

  loadSettings: function () {
    var receiptPrinter = wx.getStorageSync('receiptPrinterInfo') || null;
    var labelPrinter = wx.getStorageSync('bleDeviceInfo') || null;
    var cashPrinterSN = wx.getStorageSync('cashPrinterSN') || '';
    var paperSize = wx.getStorageSync('paperSize') || 1;
    if (receiptPrinter && typeof receiptPrinter === 'string') {
      try { receiptPrinter = JSON.parse(receiptPrinter); } catch (e) { receiptPrinter = null; }
    }
    if (labelPrinter && typeof labelPrinter === 'string') {
      try { labelPrinter = JSON.parse(labelPrinter); } catch (e) { labelPrinter = null; }
    }
    this.setData({
      receiptPrinter: (receiptPrinter && receiptPrinter.deviceId) ? receiptPrinter : null,
      labelPrinter: (labelPrinter && labelPrinter.deviceId) ? labelPrinter : null,
      cashPrinterSN: cashPrinterSN,
      paperSize: paperSize,
      paperSizeText: this.getPaperSizeText(paperSize)
    });
  },

  getPaperSizeText: function (size) {
    var map = {
      1: '4*3cm（横）',
      2: '4*6cm（竖）',
      3: '5*8cm（竖）',
      4: '5*8cm（横）'
    };
    return map[size] || map[1];
  },

  toBack: function () {
    wx.navigateBack({
      delta: 1,
    });
  },

  // 去连接拣货单蓝牙打印机
  goReceiptPrinter: function () {
    wx.navigateTo({
      url: '/subPackage-order/pages/order/pSearchPrinter/pSearchPrinter?from=printerSetting',
    });
  },

  // 去连接标签打印机
  goLabelPrinter: function () {
    wx.navigateTo({
      url: '/subPackage-printer/pages/management/labelPrinter/labelPrinter?from=printerSetting',
    });
  },

  // SN 号输入
  onCashSNInput: function (e) {
    this.setData({ cashPrinterSN: e.detail.value.trim() });
  },

  // 保存现金打印机 SN（同步更新所有现金结算客户的部门记录）
  saveCashSN: function () {
    var that = this;
    var sn = (this.data.cashPrinterSN || '').trim();
    if (!sn) {
      wx.showToast({ title: 'SN 号不能为空', icon: 'none' });
      return;
    }
    wx.setStorageSync('cashPrinterSN', sn);
    wx.showLoading({ title: '正在保存', mask: true });
    saveCashFeiePrinterSn({ sn: sn }).then(function (res) {
      wx.hideLoading();
      var body = res.result || {};
      if (body.code == 0) {
        var count = body.count || 0;
        wx.showToast({ title: '保存成功，已同步 ' + count + ' 个现金客户', icon: 'none' });
      } else {
        wx.showModal({
          title: '保存失败',
          content: body.msg || '请重新登录老板端后重试',
          showCancel: false
        });
      }
    }).catch(function () {
      wx.hideLoading();
      wx.showModal({
        title: '保存失败',
        content: '无法连接服务器，请检查网络',
        showCancel: false
      });
    });
  },

  // 选择标签尺寸
  choosePaperSize: function () {
    var that = this;
    wx.showActionSheet({
      itemList: ['4*3cm（横）', '4*6cm（竖）', '5*8cm（竖）', '5*8cm（横）'],
      success: function (res) {
        var selectedSize = res.tapIndex + 1;
        wx.setStorageSync('paperSize', selectedSize);
        that.setData({
          paperSize: selectedSize,
          paperSizeText: that.getPaperSizeText(selectedSize)
        });
        wx.showToast({ title: '标签尺寸已设置', icon: 'success' });
      }
    });
  },

  // 测试拣货单打印机
  testReceiptPrinter: function () {
    var deviceInfo = this.data.receiptPrinter;
    if (!deviceInfo || !deviceInfo.deviceId) {
      wx.showToast({ title: '请先连接打印机', icon: 'none' });
      return;
    }
    var that = this;
    this.setData({ isConnecting: true });

    var command = esc.jpPrinter.createNew();
    command.init();
    command.setPrintAndFeedRow(2);
    command.setSelectJustification(1);
    command.setCharacterSize(17);
    command.setText('打印机测试成功');
    command.setPrint();
    command.setPrint();
    command.setPrintAndFeedRow(5);

    var data = command.getData();
    this.sendBleData(deviceInfo, data, function () {
      wx.showToast({ title: '测试打印已发送', icon: 'success' });
    }, function (err) {
      wx.showToast({ title: err || '测试打印失败', icon: 'none' });
    }, function () {
      that.setData({ isConnecting: false });
    });
  },

  // 测试现金结账单打印机（飞蛾网络打印机）：调用后端飞蛾云打印接口发送测试小票
  testCashPrinter: function () {
    var that = this;
    var sn = (this.data.cashPrinterSN || '').trim();
    if (!sn) {
      wx.showToast({ title: '请先填写 SN 号', icon: 'none' });
      return;
    }
    wx.setStorageSync('cashPrinterSN', sn);
    that.setData({ isConnecting: true });
    wx.showLoading({ title: '正在测试连接', mask: true });
    testFeiEPrinter({ sn: sn }).then(function (res) {
      wx.hideLoading();
      that.setData({ isConnecting: false });
      var body = res.result || {};
      if (body.code == 0) {
        var data = body.data || {};
        wx.showModal({
          title: '连接成功',
          content: data.message || '测试小票已发送，请检查打印机是否出纸',
          showCancel: false
        });
      } else {
        wx.showModal({
          title: '连接失败',
          content: body.msg || '打印机测试失败，请检查 SN 号',
          showCancel: false
        });
      }
    }).catch(function () {
      wx.hideLoading();
      that.setData({ isConnecting: false });
      wx.showModal({
        title: '连接失败',
        content: '无法连接服务器，请检查网络',
        showCancel: false
      });
    });
  },

  // 测试标签打印机
  testLabelPrinter: function () {
    var deviceInfo = this.data.labelPrinter;
    if (!deviceInfo || !deviceInfo.deviceId) {
      wx.showToast({ title: '请先连接标签打印机', icon: 'none' });
      return;
    }
    var that = this;
    this.setData({ isConnecting: true });

    var sizeMap = {
      1: { w: 48, h: 30 },
      2: { w: 48, h: 60 },
      3: { w: 56, h: 80 },
      4: { w: 80, h: 56 }
    };
    var size = sizeMap[this.data.paperSize] || sizeMap[1];

    var command = tsc.createNew();
    command.setSize(size.w, size.h);
    command.setGap(0);
    command.setCls();
    command.setText(0, 30, 'TSS24.BF2', 1, 1, '标签打印测试');
    command.setPagePrint();

    var data = command.getData();
    this.sendBleData(deviceInfo, data, function () {
      wx.showToast({ title: '标签测试已发送', icon: 'success' });
    }, function (err) {
      wx.showToast({ title: err || '标签测试失败', icon: 'none' });
    }, function () {
      that.setData({ isConnecting: false });
    });
  },

  // 通用 BLE 数据发送：先尝试直接写，失败则建立连接后重试
  sendBleData: function (deviceInfo, data, onSuccess, onError, onComplete) {
    var that = this;
    if (!deviceInfo || !deviceInfo.deviceId || !deviceInfo.writeServiceId || !deviceInfo.writeCharaterId) {
      if (onError) onError('打印机信息不完整');
      if (onComplete) onComplete();
      return;
    }

    wx.openBluetoothAdapter({
      success: function () {
        that._doWrite(deviceInfo, data, function () {
          if (onSuccess) onSuccess();
          if (onComplete) onComplete();
        }, function () {
          // 直接写入失败，尝试建立连接
          wx.createBLEConnection({
            deviceId: deviceInfo.deviceId,
            success: function () {
              setTimeout(function () {
                that._doWrite(deviceInfo, data, function () {
                  if (onSuccess) onSuccess();
                  if (onComplete) onComplete();
                }, function (err) {
                  if (onError) onError(err);
                  if (onComplete) onComplete();
                });
              }, 300);
            },
            fail: function (e) {
              if (e.errCode === 1509007 || (e.errMsg && e.errMsg.indexOf('already connect') !== -1)) {
                that._doWrite(deviceInfo, data, function () {
                  if (onSuccess) onSuccess();
                  if (onComplete) onComplete();
                }, function (err) {
                  if (onError) onError(err);
                  if (onComplete) onComplete();
                });
              } else {
                if (onError) onError('蓝牙连接失败');
                if (onComplete) onComplete();
              }
            }
          });
        });
      },
      fail: function () {
        if (onError) onError('请打开蓝牙');
        if (onComplete) onComplete();
      }
    });
  },

  _doWrite: function (deviceInfo, data, onSuccess, onError) {
    var that = this;
    var oneTimeData = 20;
    var total = data.length;
    var loopTime = Math.ceil(total / oneTimeData);
    var currentTime = 0;

    function writeChunk() {
      if (currentTime >= loopTime) {
        if (onSuccess) onSuccess();
        return;
      }
      var start = currentTime * oneTimeData;
      var end = Math.min(start + oneTimeData, total);
      var len = end - start;
      var buf = new ArrayBuffer(len);
      var dv = new DataView(buf);
      for (var i = 0; i < len; i++) {
        dv.setUint8(i, data[start + i]);
      }
      wx.writeBLECharacteristicValue({
        deviceId: deviceInfo.deviceId,
        serviceId: deviceInfo.writeServiceId,
        characteristicId: deviceInfo.writeCharaterId,
        value: buf,
        success: function () {
          currentTime++;
          setTimeout(writeChunk, 30);
        },
        fail: function (e) {
          if (onError) onError('发送失败');
        }
      });
    }
    writeChunk();
  }
});

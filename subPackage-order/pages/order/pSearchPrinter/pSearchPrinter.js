var app = getApp()
const {
  updateDisUserDeviceId
} = require('../../../../lib/apiDepOrder.js');
var load = require('../../../../lib/load.js');
var esc = require("../../../../utils/GPutils/esc.js");

Page({

  /**
   * 页面的初始数据
   */
  data: {
    list: [],
    services: [],
    serviceId: 0,
    writeCharacter: false,
    readCharacter: false,
    notifyCharacter: false,
    isScanning: false
  },

  //搜索设备
  startSearch: function () {
    console.log("startSearch...")
    var that = this
    wx.openBluetoothAdapter({
      success: function (res) {
        wx.getBluetoothAdapterState({
          success: function (res) {
            console.log('openBluetoothAdapter success', res)
            if (res.available) {
              if (res.discovering) {
                wx.stopBluetoothDevicesDiscovery({
                  success: function (res) {
                    console.log(res)
                  }
                })
              } else {
                // that.startBluetoothDevicesDiscovery()
                that.getBluetoothDevices()
              }
              // that.checkPemission()
            } else {
              wx.showModal({
                title: '提示',
                content: '本机蓝牙不可用',
                showCancel: false
              })
            }
          },
        })
      },
      fail: function () {

        // if (res.errCode === 10001) {
        //   wx.onBluetoothAdapterStateChange(function (res) {
        //     console.log('onBluetoothAdapterStateChange', res)
        //     if (res.available) {
        //       this.startBluetoothDevicesDiscovery()
        //     }
        //   })
        // }

        wx.showModal({
          title: '提示',
          content: '蓝牙初始化失败，请到设置打开蓝牙',
          showCancel: false
        })
      }
    })
  },

  checkPemission: function () { //android 6.0以上需授权地理位置权限
    var that = this
    const globalData = app.globalData;
    var platform = app.BLEInformation.platform
    if (platform == "ios") {
      globalData.platform = "ios"
      that.getBluetoothDevices()
    } else if (platform == "android") {
      globalData.platform = "android"
      console.log(app.getSystem().substring(app.getSystem().length - (app.getSystem().length - 8), app.getSystem().length - (app.getSystem().length - 8) + 1))
      if (app.getSystem().substring(app.getSystem().length - (app.getSystem().length - 8), app.getSystem().length - (app.getSystem().length - 8) + 1) > 5) {
        wx.getSetting({
          success: function (res) {
            console.log(res)
            if (!res.authSetting['scope.userLocation']) {
              wx.authorize({
                scope: 'scope.userLocation',
                complete: function (res) {
                  that.getBluetoothDevices()
                }
              })
            } else {
              that.getBluetoothDevices()
            }
          }
        })
      }
    }
  },

  getBluetoothDevices: function () { //获取蓝牙设备信息
    var that = this
    load.showLoading("正在搜索蓝牙设备")
    that.setData({
      isScanning: true
    })
    wx.startBluetoothDevicesDiscovery({
      success: function (res) {
        console.log(res)
        setTimeout(function () {
          wx.getBluetoothDevices({
            success: function (res) {
              var devices = []
              var num = 0
              for (var i = 0; i < res.devices.length; ++i) {
                if (res.devices[i].name != "未知设备") {
                  devices[num] = res.devices[i]
                  num++
                }
              }
              that.setData({
                list: devices,
                isScanning: false
              })
              wx.hideLoading()
              wx.stopPullDownRefresh()
              wx.stopBluetoothDevicesDiscovery({
                success: function (res) {
                  console.log("停止搜索蓝牙")
                }
              })
            },
          })
        }, 5000)
      },
    })
  },

  bindViewTap: function (e) {
    var that = this
    wx.stopBluetoothDevicesDiscovery({
      success: function (res) {
        console.log(res)
      },
    })
    that.setData({
      serviceId: 0,
      writeCharacter: false,
      readCharacter: false,
      notifyCharacter: false
    })
    console.log(e.currentTarget.dataset.title)
    wx.showLoading({
      title: '正在连接',
    })
    app.BLEInformation.deviceId = e.currentTarget.dataset.title;
    // wx.setStorageSync('deviceId', e.currentTarget.dataset.title);

    wx.createBLEConnection({
      deviceId: e.currentTarget.dataset.title,
      success: function (res) {
        console.log(res)

        that.getSeviceId()
      },
      fail: function (e) {
        wx.showModal({
          title: '提示',
          content: '连接失败',
          showCancel: false
        })
        console.log(e)
        wx.hideLoading()
      },
      complete: function (e) {
        console.log(e)
      }
    })
  },

  getSeviceId: function () {
    var that = this
    var platform = app.BLEInformation.platform
    console.log(app.BLEInformation.deviceId)
    wx.getBLEDeviceServices({
      deviceId: app.BLEInformation.deviceId,
      success: function (res) {
        console.log(res)
        // var realId = ''
        // if (platform == 'android') {
        //   // for(var i=0;i<res.services.length;++i){
        //   // var item = res.services[i].uuid
        //   // if (item == "0000FEE7-0000-1000-8000-00805F9B34FB"){
        //   realId = "0000FEE7-0000-1000-8000-00805F9B34FB"
        //   //       break;
        //   //     }
        //   // }
        // } else if (platform == 'ios') {
        //   // for(var i=0;i<res.services.length;++i){
        //   // var item = res.services[i].uuid
        //   // if (item == "49535343-FE7D-4AE5-8FA9-9FAFD205E455"){
        //   realId = "49535343-FE7D-4AE5-8FA9-9FAFD205E455"
        //   // break
        //   // }
        //   // }
        // }
        // app.BLEInformation.serviceId = realId
        that.setData({
          services: res.services
        })
        that.getCharacteristics()
      },
      fail: function (e) {
        console.log(e)
      },
      complete: function (e) {
        console.log(e)
      }
    })
  },
  getCharacteristics: function () {
    var that = this
    var list = that.data.services
    var num = that.data.serviceId
    var write = that.data.writeCharacter
    var read = that.data.readCharacter
    var notify = that.data.notifyCharacter
    wx.getBLEDeviceCharacteristics({
      deviceId: app.BLEInformation.deviceId,
      serviceId: list[num].uuid,
      success: function (res) {
        console.log(res)
        for (var i = 0; i < res.characteristics.length; ++i) {
          var properties = res.characteristics[i].properties
          var item = res.characteristics[i].uuid
          if (!notify) {
            if (properties.notify) {
              app.BLEInformation.notifyCharaterId = item
              app.BLEInformation.notifyServiceId = list[num].uuid
              notify = true
            }
          }
          if (!write) {
            if (properties.write) {
              app.BLEInformation.writeCharaterId = item
              app.BLEInformation.writeServiceId = list[num].uuid
              write = true
            }
          }
          if (!read) {
            if (properties.read) {
              app.BLEInformation.readCharaterId = item
              app.BLEInformation.readServiceId = list[num].uuid
              read = true
            }
          }
        }
        if (!write || !notify || !read) {
          num++
          that.setData({
            writeCharacter: write,
            readCharacter: read,
            notifyCharacter: notify,
            serviceId: num
          })
          if (num == list.length) {
            wx.showModal({
              title: '提示',
              content: '找不到该读写的特征值',
              showCancel: false
            })
          } else {
            that.getCharacteristics()
          }
        } else {
          // 连接成功，保存出库单打印机信息到独立缓存
          var receiptPrinterInfo = {
            deviceId: app.BLEInformation.deviceId,
            deviceName: app.BLEInformation.deviceName,
            writeServiceId: app.BLEInformation.writeServiceId,
            writeCharaterId: app.BLEInformation.writeCharaterId,
            notifyServiceId: app.BLEInformation.notifyServiceId,
            notifyCharaterId: app.BLEInformation.notifyCharaterId,
            readServiceId: app.BLEInformation.readServiceId,
            readCharaterId: app.BLEInformation.readCharaterId,
            isConnected: true,
            platform: app.BLEInformation.platform
          };
          
          wx.setStorageSync('receiptPrinterInfo', receiptPrinterInfo);
          console.log('✅ 已保存出库单打印机信息到缓存:', receiptPrinterInfo);
          
          wx.showToast({
            title: '连接成功',
          });

          that.receiptTest()
        }
      },
      fail: function (e) {
        console.log(e)
      },
      complete: function (e) {
        console.log("write:" + app.BLEInformation.writeCharaterId)
        console.log("read:" + app.BLEInformation.readCharaterId)
        console.log("notify:" + app.BLEInformation.notifyCharaterId)
      }
    })
  },



  receiptTest: function () { //票据测试

    var that = this;

    var command = esc.jpPrinter.createNew();
    command.init()

    command.setPrintAndFeedRow(5);
    command.setSelectJustification(1) //居中
    command.setCharacterSize(17); //设置倍高倍宽
    command.setText("打印机配置成功");
    command.setPrint();
    command.setPrint();
    command.setPrint();
    command.setPrint();
    command.setPrint();

    that._setUserService()

    // that.prepareSend(command.getData()) //准备发送数据
  },


  prepareSend: function (buff) { //准备发送，根据每次发送字节数来处理分包数量

    var that = this
    var time = that.data.oneTimeData;

    var looptime = parseInt(buff.length / time);
    var lastData = parseInt(buff.length % time);
    that.setData({
      looptime: looptime + 1,
      lastData: lastData,
      currentTime: 1,
    })
    that.Send(buff)
  },


  Send: function (buff) { //分包发送
    var that = this
    var currentTime = that.data.currentTime
    var loopTime = that.data.looptime
    var lastData = that.data.lastData
    var onTimeData = that.data.oneTimeData
    var printNum = that.data.printerNum
    var currentPrint = that.data.currentPrint
    var buf
    var dataView
    if (currentTime < loopTime) {
      buf = new ArrayBuffer(onTimeData)
      dataView = new DataView(buf)
      for (var i = 0; i < onTimeData; ++i) {
        dataView.setUint8(i, buff[(currentTime - 1) * onTimeData + i])
      }
    } else {
      buf = new ArrayBuffer(lastData)
      dataView = new DataView(buf)
      for (var i = 0; i < lastData; ++i) {
        dataView.setUint8(i, buff[(currentTime - 1) * onTimeData + i])
      }
    }
    console.log("第" + currentTime + "次发送数据大小为：" + buf.byteLength)
    wx.writeBLECharacteristicValue({
      deviceId: app.BLEInformation.deviceId,
      serviceId: app.BLEInformation.writeServiceId,
      characteristicId: app.BLEInformation.writeCharaterId,
      value: buf,
      success: function (res) {
        var times = that.data.printTimes;
        that.setData({
          showOperation: false,
          printTimes: times + 1,
        })

        if (currentTime == loopTime) {
          //最后一次，保存订单
          // that._closeBLE();
          that.setData({
            printTimes: 0
          })
          that._setUserService()


        }


      },
      fail: function (e) {
        wx.showToast({
          title: '打印第' + currentPrint + '张失败',
          icon: 'none',
        })
      },
      complete: function () {
        currentTime++
        if (currentTime <= loopTime) {
          that.setData({
            currentTime: currentTime
          })
          that.Send(buff)
        } else {
          if (currentPrint == printNum) {
            that.setData({
              looptime: 0,
              lastData: 0,
              currentTime: 1,
              isReceiptSend: false,
              currentPrint: 1
            })

          } else {
            currentPrint++
            that.setData({
              currentPrint: currentPrint,
              currentTime: 1,
            })
            that.Send(buff)
          }
        }
      }
    })
  },

  _setUserService(id) {
    var that = this;
    var userInfo = that.data.userInfo;
    userInfo.nxDiuPrintDeviceId = app.BLEInformation.deviceId;
    updateDisUserDeviceId(userInfo)
      .then(res => {
        if (res.result.code == 0) {
          wx.setStorageSync('userInfo', userInfo)
          var pages = getCurrentPages();
          var prevPage = pages[pages.length - 2];
          prevPage.setData({
            deviceId: app.BLEInformation.deviceId,
            printOk: true,
            userInfo: userInfo,
          })
          wx.navigateBack({
            delta: 1
          })
        }
      })



  },



  _closeBLE() {
    wx.closeBLEConnection({
      deviceId: app.BLEInformation.deviceId,
      success: function (res) {
        console.log("关闭蓝牙成功")
      },
    })
  },
  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const globalData = getApp().globalData;
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,

    })

    app.BLEInformation.platform = app.getPlatform()
    var that = this;
    that.startSearch()
    var userInfo = wx.getStorageSync('userInfo');
    that.setData({
      userInfo: userInfo
    })

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

  /**
   * 生命周期函数--监听页面卸载
   */
  // onUnload: function () {
  //   wx.closeBLEConnection({
  //     deviceId: app.BLEInformation.deviceId,
  //     success: function(res) {
  //       console.log("关闭蓝牙成功")
  //     },
  //   })
  // },

  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  }

})
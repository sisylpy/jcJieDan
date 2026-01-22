var load = require('../../../../lib/load.js');
var app = getApp()
import apiUrl from '../../../../config'

var load = require('../../../../lib/load.js');
var esc = require("../../../../utils/GPutils/esc.js");
var dateUtils = require('../../../../utils/dateUtil');

import {
  getOrderPage

} from '../../../../lib/apiDepOrder'


Page({


  onShow: function () {
    // 2，打印初始化参数
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


  onLoad: function (options) {
    const globalData = getApp().globalData;

    var todayDate = dateUtils.getWhichFullDate(0);

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      todayDate: todayDate,
      url: apiUrl.server,
      depFatherId: options.depFatherId,
      gbDepFatherId: options.gbDepFatherId,
      resFatherId: options.resFatherId,
      name: options.name,
      printOk: false,
      orderBy: "time",

    })

    var value = wx.getStorageSync('userInfo');
    console.log(value);
    if (value) {
      this.setData({
        disId: value.nxDistributerEntity.nxDistributerId,
        userInfo: value,
        userId: value.nxDistributerUserId,
        deviceId: value.nxDiuPrintDeviceId,
      })
      if (value.nxDiuPrintDeviceId == -1) {
        wx.navigateTo({
          url: '/subPackage-charts/pages/order/pSearchPrinter/pSearchPrinter',
        })
      }else{
        this._initData();
        // if(this.data.printOk){
        //   this._initData();
        // }else{
        // //  this.startSearch();
        // this._initData();
        // }
      }
    }

    var depItem = wx.getStorageSync('depItem');
    if(depItem){
      this.setData({
        depItem: depItem
      })
    }
  
  },



  _initData() {
    load.showLoading("获取商品备货")
    var data = {
      depFatherId: this.data.depFatherId,
      gbDepFatherId: this.data.gbDepFatherId,
      resFatherId:  this.data.resFatherId,
      orderBy: this.data.orderBy,
    }
    load.showLoading("获取订单中")
    getOrderPage(data)
      .then(res => {
        if (res.result.code == 0) {
          console.log(res.result.data);
          load.hideLoading();
            this.setData({
              applyArr: res.result.data.arr,
              total: res.result.data.total,
              profit: res.result.data.profit,
              scale: res.result.data.scale,
              priceCount: res.result.data.priceCount,

            })
          
           
          
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
        load.hideLoading();
      })
  },


  _initDataDep() {
    load.showLoading("获取客户备货");
    var data = {
      disId: this.data.disId,
      goodsType: this.data.goodsType
    }
    disGetStockDepartmentToPrint(data)
      .then(res => {
        if (res.result.code == 0) {
          console.log(res.result.data);
          load.hideLoading();
          this.setData({
            depArr: res.result.data.nxDepArr,
            gbDepArr: res.result.data.gbDepArr,
          })

        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
      })
  },



  startSearch() {
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
      fail: function (e) {
        console.log(e)
        if (e.errCode === 10001) {
          wx.onBluetoothAdapterStateChange(function (res) {
            console.log('onBluetoothAdapterStateChange', res)
            if (res.available) {
              this.getBluetoothDevices()
            }
          })
        }

        wx.showModal({
          title: '提示',
          content: '蓝牙初始化失败，请到设置打开蓝牙',
          showCancel: false
        })
      }
    })
  },

  getBluetoothDevices: function () { //获取蓝牙设备信息
    var that = this
    this.setData({
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
              load.hideLoading()
              wx.stopBluetoothDevicesDiscovery({
                success: function (res) {
                  console.log("停止搜索蓝牙")
                }
              })
            },
          })
        }, 5000)
        that._connn();
      },
    })
  },



  _connn() {
    var that = this;
    wx.stopBluetoothDevicesDiscovery({
      success: function (res) {
        console.log(res)
      },
    })
    this.setData({
      serviceId: 0,
      writeCharacter: false,
      readCharacter: false,
      notifyCharacter: false
    })
    wx.showLoading({
      title: '正在连接',
    })
    wx.createBLEConnection({
      deviceId: this.data.deviceId,
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
      
          wx.navigateTo({
            url: '/subPackage-charts/pages/order/pSearchPrinter/pSearchPrinter',
          })
        
        console.log(e)
        wx.hideLoading()
      },
      complete: function (e) {
        console.log(e);

      }
    })
  },


  getSeviceId: function () {
    var that = this

    wx.getBLEDeviceServices({
      deviceId: that.data.deviceId,
      success: function (res) {
        that.setData({
          services: res.services
        })
        that.getCharacteristics()
      },
      fail: function (e) {
        console.log(e)
        wx.navigateTo({
          url: '../../pSearchPrinter/pSearchPrinter',
        })
      },
      complete: function (e) {}
    })
  },

  getCharacteristics: function () {
    var that = this
    var list = this.data.services
    var num = this.data.serviceId
    var write = this.data.writeCharacter
    var read = this.data.readCharacter
    var notify = this.data.notifyCharacter
    wx.getBLEDeviceCharacteristics({
      deviceId: that.data.deviceId,
      serviceId: list[num].uuid,
      success: function (res) {
        console.log(res)
        for (var i = 0; i < res.characteristics.length; ++i) {
          var properties = res.characteristics[i].properties
          var item = res.characteristics[i].uuid
          if (!notify) {
            if (properties.notify) {
              that.data.notifyCharaterId = item
              that.data.notifyServiceId = list[num].uuid
              notify = true
            }
          }
          if (!write) {
            if (properties.write) {
              that.data.writeCharaterId = item
              that.data.writeServiceId = list[num].uuid
              write = true
            }
          }
          if (!read) {
            if (properties.read) {
              that.data.readCharaterId = item
              that.data.readServiceId = list[num].uuid
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
          wx.showToast({
            title: '连接成功',
          })
          that.setData({
            printOk: true
          })
          that.receiptTest();
        }
      },
      fail: function (e) {
        console.log(e)
      },
      complete: function (e) {
        console.log("write:" + that.data.writeCharaterId)
        console.log("read:" + that.data.readCharaterId)
        console.log("notify:" + that.data.notifyCharaterId)
      }
    })
  },


  receiptTest: function () { //票据测试

    wx.showToast({
      title: '准备数据',
    })
    var that = this;

    var command = esc.jpPrinter.createNew();
    command.init()

    command.setPrintAndFeedRow(7);
    command.setSelectJustification(1) //居中
    command.setCharacterSize(17); //设置倍高倍宽
    var depName = that.data.name;
    command.setText(depName + " 配货单");
    command.setPrint(); //打印并换行
    command.setPrint(); //打印并换行
    command.setSelectJustification(0) //设置居左 
    command.setCharacterSize(0);
    command.setText("日期: " + that.data.todayDate);
    command.setPrint(); //打印并换行
    command.setPrint();
    command.setSelectJustification(0) //设置居左
    command.setText("   商品")
    command.setAbsolutePrintPosition(324)
    command.setText("订货")
    command.setAbsolutePrintPosition(420)
    command.setText("出货")
    command.setPrint();
    command.setText("------------------------------------------------")
    command.setPrint();
    command.setCharacterSize(1); //设置倍高倍宽
    if(this.data.orderBy == 'time'){

      this._printOrderTime(command);

    }else{
      this._printGoodType(command);
    }

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

that.prepareSend(command.getData()) //准备发送数据
  },


  _printOrderTime(command){
    var depItem = this.data.depItem;
    var isMultiDep = depItem && depItem.nxDepartmentSubAmount != 0;
    var ordersArr = this.data.applyArr;
    var itemIndex = 0; // 全局商品序号
    
    if (isMultiDep) {
      // 多部门打印
      for (var i = 0; i < ordersArr.length; i++) {
        var dep = ordersArr[i];
        var depName = dep.depName;
        var orderList = dep.list || [];
        
        // 打印部门名称
        if (depName) {
          command.setPrint(); // 换行
          command.setSelectJustification(0); // 靠左
          command.setCharacterSize(1); // 设置倍高倍宽
          command.setText("【" + depName + "】");
          command.setPrint();
          command.setCharacterSize(0); // 恢复正常大小
          command.setText("------------------------------------------------");
          command.setPrint();
        }
        
        // 打印该部门下的订单
        for (var j = 0; j < orderList.length; j++) {
          var order = orderList[j];
          itemIndex++;
          var brand = order.nxDistributerGoodsEntity.nxDgGoodsBrand;
          var standardName = order.nxDistributerGoodsEntity.nxDgGoodsStandardname;
          var goodsName = order.nxDistributerGoodsEntity.nxDgGoodsName;
          var quantity = order.nxDoQuantity;
          var standard = order.nxDoStandard;
          var weight = order.nxDoWeight;
          
          command.setText(itemIndex + ", ");
          if (brand !== null && brand.length > 0 && brand !== 'null') {
            command.setText(brand + "-");
          }
          
          command.setText(goodsName);
          if (standardName !== '斤') {
            command.setText("(" + standardName + ")");
          }
          command.setAbsolutePrintPosition(324);
          command.setText("  " + quantity + standard);

          if (weight !== null && weight.length > 0) {
            command.setAbsolutePrintPosition(420);
            command.setText(weight + standardName);
          }
          command.setPrint();
          
          var orderRemark = order.nxDoRemark;
          if (orderRemark !== "null" && orderRemark !== null && orderRemark.length > 0) {
            command.setText("   备注:" + orderRemark + "");
            command.setPrint();
          }
          command.setText("------------------------------------------------");
          command.setPrint();
        }
      }
    } else {
      // 单部门打印（原有逻辑）
      for (var j = 0; j < ordersArr.length; j++) {
        var brand = ordersArr[j].nxDistributerGoodsEntity.nxDgGoodsBrand;
        var standardName = ordersArr[j].nxDistributerGoodsEntity.nxDgGoodsStandardname;
        var goodsName = ordersArr[j].nxDistributerGoodsEntity.nxDgGoodsName;
        var quantity = ordersArr[j].nxDoQuantity;
        var standard = ordersArr[j].nxDoStandard;
        var weight = ordersArr[j].nxDoWeight;
        
        command.setText(j + 1 + ", ");
        if (brand !== null && brand.length > 0 && brand !== 'null') {
          command.setText(brand + "-");
        }
        
        command.setText(goodsName);
        if (standardName !== '斤') {
          command.setText("(" + standardName + ")");
        }
        command.setAbsolutePrintPosition(324);
        command.setText("  " + quantity + standard);

        if (weight !== null && weight.length > 0) {
          command.setAbsolutePrintPosition(420);
          command.setText(weight + standardName);
        }
        command.setPrint();
        
        var orderRemark = ordersArr[j].nxDoRemark;
        if (orderRemark !== "null" && orderRemark !== null && orderRemark.length > 0) {
          command.setText("   备注:" + orderRemark + "");
          command.setPrint();
        }
        command.setText("------------------------------------------------");
        command.setPrint();
      }
    }
  },


  _printGoodType(command){
    if(this.data.stockArr.length > 0){
      var ordersArr = this.data.stockArr;
      command.setText("出库");
      command.setPrint();
      command.setPrint();
      for (var j = 0; j < ordersArr.length; j++) {
          var brand = ordersArr[j].nxDistributerGoodsEntity.nxDgGoodsBrand;
          var standardName = ordersArr[j].nxDistributerGoodsEntity.nxDgGoodsStandardname;
          var goodsName = ordersArr[j].nxDistributerGoodsEntity.nxDgGoodsName;
          var quantity = ordersArr[j].nxDoQuantity;
          var standard = ordersArr[j].nxDoStandard;
          var weight = ordersArr[j].nxDoWeight;
            // command.setCharacterSize(1);  
            command.setText(j + 1 + ", ")            
          if (brand !== null && brand.length > 0) {
            command.setText(brand + "-");
          }
        
          command.setText(goodsName);
          if (standardName !== '斤') {
            command.setText("(" + standardName + ")");
          }
          command.setAbsolutePrintPosition(324)
          command.setText("  " + quantity + standard);
  
          if (weight !== null && weight.length > 0) {
            command.setAbsolutePrintPosition(420)
            command.setText(weight + standardName)
          }
          command.setPrint();
          var orderRemark = ordersArr[j].nxDoRemark;
          if (orderRemark !== "null" && orderRemark.length > 0) {
            // command.setCharacterSize(0);
            command.setText("   备注:" + orderRemark + "");
            command.setPrint();
          }
          command.setText("------------------------------------------------")
          command.setPrint();
        
        //
      }
    }
    if(this.data.wxArr.length > 0){
      var ordersArr = this.data.wxArr;
      command.setText("订货");
      command.setPrint();
      command.setPrint();
      for (var j = 0; j < ordersArr.length; j++) {
          var brand = ordersArr[j].nxDistributerGoodsEntity.nxDgGoodsBrand;
          var standardName = ordersArr[j].nxDistributerGoodsEntity.nxDgGoodsStandardname;
          var goodsName = ordersArr[j].nxDistributerGoodsEntity.nxDgGoodsName;
          var quantity = ordersArr[j].nxDoQuantity;
          var standard = ordersArr[j].nxDoStandard;
          var weight = ordersArr[j].nxDoWeight;
            // command.setCharacterSize(1); 
            command.setText(j + 1 + ", ")             
          if (brand !== null && brand.length > 0) {
            command.setText(brand + "-");
          }
        
          command.setText(goodsName);
          if (standardName !== '斤') {
            command.setText("(" + standardName + ")");
          }
          command.setAbsolutePrintPosition(324)
          command.setText("  " + quantity + standard);
  
          if (weight !== null && weight.length > 0) {
            command.setAbsolutePrintPosition(420)
            command.setText(weight + standardName)
          }
          command.setPrint();
          var orderRemark = ordersArr[j].nxDoRemark;
          if (orderRemark !== "null" && orderRemark.length > 0) {
            // command.setCharacterSize(0);
            command.setText("   备注:" + orderRemark + "");
            command.setPrint();
          }
          command.setText("------------------------------------------------")
          command.setPrint();
        
        //
      }
    }
     if(this.data.zicaiArr.length > 0){
      var ordersArr = this.data.zicaiArr;
      command.setText("自采");
      command.setPrint();
      command.setPrint();
      for (var j = 0; j < ordersArr.length; j++) {
          var brand = ordersArr[j].nxDistributerGoodsEntity.nxDgGoodsBrand;
          var standardName = ordersArr[j].nxDistributerGoodsEntity.nxDgGoodsStandardname;
          var goodsName = ordersArr[j].nxDistributerGoodsEntity.nxDgGoodsName;
          var quantity = ordersArr[j].nxDoQuantity;
          var standard = ordersArr[j].nxDoStandard;
          var weight = ordersArr[j].nxDoWeight;
            // command.setCharacterSize(1);  
            command.setText(j + 1 + ", ")      
          if (brand !== null && brand.length > 0) {
            command.setText(brand + "-");
          }
        
          command.setText(goodsName);
          if (standardName !== '斤') {
            command.setText("(" + standardName + ")");
          }
          command.setAbsolutePrintPosition(324)
          command.setText("  " + quantity + standard);
  
          if (weight !== null && weight.length > 0) {
            command.setAbsolutePrintPosition(420)
            command.setText(weight + standardName)
          }
          command.setPrint();
          var orderRemark = ordersArr[j].nxDoRemark;
          if (orderRemark !== "null" && orderRemark.length > 0) {
            // command.setCharacterSize(0);
            command.setText("   备注:" + orderRemark + "");
            command.setPrint();
          }
          command.setText("------------------------------------------------")
          command.setPrint();
        
        //
      }
    }
  

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

  queryStatus: function () { //查询打印机状态
    var that = this
    var buf;
    var dateView;
    /*
    n = 1：传送打印机状态
    n = 2：传送脱机状态
    n = 3：传送错误状态
    n = 4：传送纸传感器状态
    */
    buf = new ArrayBuffer(3)
    dateView = new DataView(buf)
    dateView.setUint8(0, 16)
    dateView.setUint8(1, 4)
    dateView.setUint8(2, 2)
    wx.writeBLECharacteristicValue({
      deviceId: this.data.deviceId,
      serviceId: this.data.writeServiceId,
      characteristicId: this.data.writeCharaterId,
      value: buf,
      success: function (res) {
        console.log("发送成功")
        that.setData({
          isQuery: true
        })
      },
      fail: function (e) {
        wx.showToast({
          title: '发送失败',
          icon: 'none',
        })
        console.log(e)
        return;
      },
      complete: function () {

      }
    })

    wx.notifyBLECharacteristicValueChange({
      deviceId: this.data.deviceId,
      serviceId: this.data.notifyServiceId,
      characteristicId: this.data.notifyCharaterId,
      state: true,
      success: function (res) {
        wx.onBLECharacteristicValueChange(function (r) {
          console.log(`characteristic ${r.characteristicId} has changed, now is ${r}`)
          var result = ab2hex(r.value)
          console.log("返回" + result)
          var tip = ''
          if (result == 12) { //正常
            tip = "正常"
          } else if (result == 32) { //缺纸
            tip = "缺纸"
          } else if (result == 36) { //开盖、缺纸
            tip = "开盖、缺纸"
          } else if (result == 16) {
            tip = "开盖"
          } else if (result == 40) { //其他错误
            tip = "其他错误"
          } else { //未处理错误
            tip = "未知错误"
          }
          wx.showModal({
            title: '打印机状态',
            content: tip,
            showCancel: false
          })
        })
      },
      fail: function (e) {
        wx.showModal({
          title: '打印机状态',
          content: '获取失败',
          showCancel: false
        })
        console.log(e)
      },
      complete: function (e) {
        that.setData({
          isQuery: false
        })
        console.log("执行完成")
      }
    })
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
    if (buf.byteLength > 0) {
      console.log("that.data.deviceId==" + that.data.deviceId)
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
          })
          if (currentTime == loopTime) {
            //最后一次，保存订单
            that.setData({
              printTimes: 0
            })
          }
        },
        fail: function (e) {
          console.log(e);
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
              // 打印完成，返回上一页
              setTimeout(() => {
                wx.showToast({
                  title: '打印完成',
                  icon: 'success',
                  duration: 1500
                })
                setTimeout(() => {
                  wx.navigateBack({
                    delta: 1
                  })
                }, 1500)
              }, 500)

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
    } else {
      console.log("else===============")
      that.setData({
        printTimes: 0
      })
    }

  },

  _savePickerOrders1() {
    var that = this;
    if (this.data.orderCount > 0) {
      if (this.data.showGoods) {
        var names = this._getPrintOrderName();
        var ids = this._getPrintOrderIds();
        var data = {
          nxDwDisId: this.data.disId,
          nxDwUserId: this.data.userId,
          nxDwOrderNames: names,
          nxDwTradeNo: this.data.tradeNo,
          nxDwOrderIds: ids,
          nxDwItemCount: this.data.orderCount
        }
        load.showLoading("保存订单中")
        disSaveWeightStockGoods(data)
          .then(res => {
            if (res.result.code == 0) {
              load.hideLoading();
              that._initData();
            } else {
              load.hideLoading();
              wx.showToast({
                title: res.result.msg,
                icon: 'none'
              })
            }
          })
      } else {
        var names = this._getPrintDepName();
        var ids = this._getPrintOrderIds();
        var data = {
          nxDwDisId: this.data.disId,
          nxDwDepFatherId: this.data.depFatherId,
          nxDwGbDepFatherId: this.data.gbDepFatherId,
          nxDwResFatherId: this.data.resFatherId,
          nxDwOrderNames: names,
          nxDwOrderIds: ids,
          nxDwTradeNo: this.data.tradeNo,
          nxDwItemCount: this.data.orderCount
        }
        disSaveWeightStockGoods(data)
          .then(res => {
            load.hideLoading();
            if (res.result.code == 0) {
              this._initDataDep();

            }
          })
      }

    } else {
      wx.showToast({
        title: '请选择打印称重单商品',
        icon: 'none'
      })
    }

  },


  _getPrintOrderIds() {
    var ids = "";
    var count = 0;
    var arr = this.data.pickOrderArr;
    for (var i = 0; i < arr.length; i++) {
      ids = ids + arr[i].nxDepartmentOrdersId + ",";
      count = Number(count) + Number(1);
    }
    this.setData({
      orderCount: count
    })
    return ids;
  },

  _getPrintDepName() {
    var nameString = "";
    var arr = this.data.pickOrderArr;
    for (var i = 0; i < arr.length; i++) {
      var detail = arr[i].nxDistributerGoodsEntity.nxDgGoodsDetail;
      if (detail == null) {
        detail = ""
      } else {
        detail = " " + detail;
      }
      var standard = arr[i].nxDistributerGoodsEntity.nxDgGoodsStandardname;
      if (standard == '斤') {
        standard = ""
      } else {
        standard = "(" + standard + ")";
      }
      nameString = nameString + arr[i].nxDistributerGoodsEntity.nxDgGoodsName + detail + standard + ",";
    }
    return nameString;
  },



  _getPrintOrderName() {
    var nameString = "";
    var arr = this.data.pickDisGoodsArr;
    for (var i = 0; i < arr.length; i++) {
      var detail = arr[i].nxDgGoodsDetail;
      if (detail == null) {
        detail = ""
      } else {
        detail = " " + detail;
      }
      var standard = arr[i].nxDgGoodsStandardname;
      if (standard == '斤') {
        standard = ""
      } else {
        standard = "(" + standard + ")";
      }
      nameString = nameString + arr[i].nxDgGoodsName + detail + standard + ",";
    }
    return nameString;
  },


  toBack() {
    wx.navigateBack({
      delta: 1
    })
  },







})
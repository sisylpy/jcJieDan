var load = require('../../../lib/load.js');
var app = getApp()
import apiUrl from '../../../config'

var load = require('../../../lib/load.js');
var esc = require("../../../utils/GPutils/esc.js");
var dateUtils = require('../../../utils/dateUtil');

import {
  getOrderPage

} from '../../../lib/apiDepOrder'


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
          url: '../../order/pSearchPrinter/pSearchPrinter',
        })
      }else{
        if(this.data.printOk){
          this._initData();
        }else{
        //  this.startSearch();
        this._initData();
        }
      }
    }
  
  },

  changeType(e) {
   if(this.data.orderBy !== 'time'){
    this.setData({
      orderBy: "time",
    })
   }else{
    this.setData({
      orderBy: "goodsType",
     
    })
   }
    
    this._initData();
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
            if(this.data.orderBy == 'goodsType'){
              this.setData({
                stockArr: res.result.data.mapP.stock,
                zicaiArr: res.result.data.mapP.zicai,
                wxArr: res.result.data.mapP.wx,
              })
            }
           
          
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


  clickFather(e) {
    console.log("clickFatherclickFatherclickFather")
    var fatherIndex = e.currentTarget.dataset.fatherindex;
    var arr = this.data.applyArr[fatherIndex].nxDistributerGoodsEntities;
    var selectedArrTemp = this.data.selectedArr;
    var selectedPrintArrTemp = this.data.selectedPrintArr;
    var choiceTemp = this.data.choiceGoodsTotal;
    if (arr.length > 0) {
      console.log(arr.length)
      var fatherIsSelected = this.data.applyArr[fatherIndex].isSelected;
      if (fatherIsSelected) {
        var father = "applyArr[" + fatherIndex + "].isSelected";
        this.setData({
          [father]: false,
        })
        for (var i = 0; i < arr.length; i++) {
          var itemChoice = "applyArr[" + fatherIndex + "].nxDistributerGoodsEntities[" + i + "].isSelected";
          this.setData({
            [itemChoice]: false
          })
          var purId = arr[i].nxDistributerGoodsId;

          selectedArrTemp = selectedArrTemp.filter(item => item.purGoodsId !== purId);
          selectedPrintArrTemp = selectedPrintArrTemp.filter(item => item.nxDistributerGoodsId !== purId);
          choiceTemp = choiceTemp - 1;
        }
        this.setData({
          selectedArr: selectedArrTemp,
          selectedPrintArr: selectedPrintArrTemp,
          choiceGoodsTotal: choiceTemp,

        })
      } else {
        console.log("falalelellelssss")
        var father = "applyArr[" + fatherIndex + "].isSelected";
        this.setData({
          [father]: true
        })

        for (var i = 0; i < arr.length; i++) {

          var itemChoice = "applyArr[" + fatherIndex + "].nxDistributerGoodsEntities[" + i + "].isSelected";
          this.setData({
            [itemChoice]: true,
          })

          var purId = arr[i].nxDistributerGoodsId;
          var item = {
            fatherIndex: fatherIndex,
            goodsIndex: i,
            purGoodsId: purId,
            item: arr[i]
          }
          selectedArrTemp.push(item);
          selectedPrintArrTemp.push(arr[i]);
          choiceTemp = choiceTemp + 1;
        }
        this.setData({
          selectedArr: selectedArrTemp,
          selectedPrintArr: selectedPrintArrTemp,
          choiceGoodsTotal: choiceTemp,

        })
      }
    }
  },


  // delivery
  choiceGoods(e) {
    console.log("choiceGoodschoiceGoods")
    var fatherIndex = e.currentTarget.dataset.fatherindex;
    var disgoodsindex = e.currentTarget.dataset.disgoodsindex;
    var choiceGoodsTotal = this.data.choiceGoodsTotal;
    var data = "applyArr[" + fatherIndex + "].nxDistributerGoodsEntities[" + disgoodsindex + "].isSelected";
    var choice = this.data.applyArr[fatherIndex].nxDistributerGoodsEntities[disgoodsindex].isSelected;
    var fatherData = "applyArr[" + fatherIndex + "].isSelected";
    if (choice) {
      choiceGoodsTotal = Number(choiceGoodsTotal) - Number(1);
      this.setData({
        [data]: false,
        choiceGoodsTotal: choiceGoodsTotal,
        [fatherData]: false,
      })

    } else {
      choiceGoodsTotal = Number(choiceGoodsTotal) + Number(1);
      this.setData({
        [data]: true,
        choiceGoodsTotal: choiceGoodsTotal,
      })
      var arr = this.data.applyArr[fatherIndex].nxDistributerGoodsEntities;

      if (choiceGoodsTotal == arr.length) {
        this.setData({
          [fatherData]: true
        })
      }
    }
  },


  clickDep(e) {
    console.log("clickDepclickDep")
    var fatherIndex = e.currentTarget.dataset.fatherindex;
    var arr = this.data.depArr[fatherIndex].nxDepartmentOrdersEntities;
    if (arr.length > 0) {
      var fatherIsSelected = this.data.depArr[fatherIndex].isSelected;
      if (fatherIsSelected) {
        var father = "depArr[" + fatherIndex + "].isSelected";
        this.setData({
          [father]: false,
        })
        for (var i = 0; i < arr.length; i++) {
          var itemChoice = "depArr[" + fatherIndex + "].nxDepartmentOrdersEntities[" + i + "].hasChoice";
          this.setData({
            [itemChoice]: false
          })
        }

        var total = this.data.choiceGoodsTotal;
        var newT = Number(total) - Number(arr.length);
        this.setData({
          choiceGoodsTotal: newT
        })

      } else {
        var father = "depArr[" + fatherIndex + "].isSelected";
        this.setData({
          [father]: true
        })
        var unSel = 0;
        for (var i = 0; i < arr.length; i++) {
          var itemChoice = "depArr[" + fatherIndex + "].nxDepartmentOrdersEntities[" + i + "].hasChoice";
          var sel = this.data.depArr[fatherIndex].nxDepartmentOrdersEntities[i].hasChoice;

          if (!sel) {
            unSel = unSel + 1;
            this.setData({
              [itemChoice]: true,
            })
          }
        }
        var total = this.data.choiceGoodsTotal;
        var newT = Number(total) + unSel;
        this.setData({
          choiceGoodsTotal: newT
        })
      }
    }
  },


  clickDepGb(e) {
    console.log("clickDepclickDepgb")
    var fatherIndex = e.currentTarget.dataset.fatherindex;
    var arr = this.data.gbDepArr[fatherIndex].nxDepartmentOrdersEntities;
    if (arr.length > 0) {
      var fatherIsSelected = this.data.gbDepArr[fatherIndex].isSelected;
      if (fatherIsSelected) {
        var father = "gbDepArr[" + fatherIndex + "].isSelected";
        this.setData({
          [father]: false,
        })
        for (var i = 0; i < arr.length; i++) {
          var itemChoice = "gbDepArr[" + fatherIndex + "].nxDepartmentOrdersEntities[" + i + "].hasChoice";
          this.setData({
            [itemChoice]: false
          })
        }

        var total = this.data.choiceGoodsTotal;
        var newT = Number(total) - Number(arr.length);
        this.setData({
          choiceGoodsTotal: newT
        })

      } else {
        var father = "gbDepArr[" + fatherIndex + "].isSelected";
        this.setData({
          [father]: true
        })
        var unSel = 0;
        for (var i = 0; i < arr.length; i++) {
          var itemChoice = "gbDepArr[" + fatherIndex + "].nxDepartmentOrdersEntities[" + i + "].hasChoice";
          var sel = this.data.gbDepArr[fatherIndex].nxDepartmentOrdersEntities[i].hasChoice;

          if (!sel) {
            unSel = unSel + 1;
            this.setData({
              [itemChoice]: true,
            })
          }
        }
        var total = this.data.choiceGoodsTotal;
        var newT = Number(total) + unSel;
        this.setData({
          choiceGoodsTotal: newT
        })
      }
    }
  },

  choiceOrders(e) {
    console.log("choiceOrderschoiceOrders")
    var fatherIndex = e.currentTarget.dataset.fatherindex;
    var orderIndex = e.currentTarget.dataset.orderindex;
    var choiceGoodsTotal = this.data.choiceGoodsTotal;
    var data = "depArr[" + fatherIndex + "].nxDepartmentOrdersEntities[" + orderIndex + "].hasChoice";
    var choice = this.data.depArr[fatherIndex].nxDepartmentOrdersEntities[orderIndex].hasChoice;
    var fatherData = "depArr[" + fatherIndex + "].isSelected";
    if (choice) {
      choiceGoodsTotal = Number(choiceGoodsTotal) - Number(1);
      this.setData({
        [data]: false,
        choiceGoodsTotal: choiceGoodsTotal,
        [fatherData]: false,
      })
    } else {
      choiceGoodsTotal = Number(choiceGoodsTotal) + Number(1);
      this.setData({
        [data]: true,
        choiceGoodsTotal: choiceGoodsTotal
      })

      var arr = this.data.depArr[fatherIndex].nxDepartmentOrdersEntities;
      var fatherGoodsTotal = 0;
      for (var j = 0; j < arr.length; j++) {
        if (arr[j].hasChoice) {
          fatherGoodsTotal = fatherGoodsTotal + 1;
        }
      }
      if (fatherGoodsTotal == arr.length) {
        this.setData({
          [fatherData]: true
        })
      }
    }

  },






  allPrint() {
    var arr = this.data.applyArr;
    var temp = [];
    var tempPrint = [];
    var choiceTemp = 0;
    for (var i = 0; i < arr.length; i++) {
      var goodsArr = arr[i].nxDistributerGoodsEntities;
      var allData = "applyArr[" + i + "].isSelected";
      this.setData({
        [allData]: true,
      })
      for (var j = 0; j < goodsArr.length; j++) {
        var data = "applyArr[" + i + "].nxDistributerGoodsEntities[" + j + "].isSelected";
        var purId = arr[i].nxDistributerGoodsEntities[j].nxDistributerGoodsId;
        var item = {
          fatherIndex: i,
          goodsIndex: j,
          purGoodsId: purId,
          item: arr[i].nxDistributerGoodsEntities[j]
        }
        temp.push(item);
        tempPrint.push(arr[i].nxDistributerGoodsEntities[j]);

        this.setData({
          [data]: true,
        })
      }
      choiceTemp = choiceTemp + goodsArr.length;
    }
    this.setData({
      selectedArr: temp,
      selectedPrintArr: tempPrint,
      openIndexWx: -1,
      choiceGoodsTotal: choiceTemp,

    })
  },




  showCar() {
    this.setData({
      showOperationCar: true,
    })
  },


  deleteOrderGoods(e) {

    var selArr = this.data.selectedArr;
    var selPrintArr = this.data.selectedPrintArr;
    var item = this.data.selectedArr[e.currentTarget.dataset.index];
    var fatherIndex = item.fatherIndex;
    var index = item.goodsIndex;
    var goodsData = "applyArr[" + fatherIndex + "].nxDistributerGoodsEntities[" + index + "].isSelected";
    this.setData({
      [goodsData]: false
    })

    var purId = e.currentTarget.dataset.id;
    var choiceArr = selArr.filter(item => item.purGoodsId !== purId);
    var choicePrintArr = selPrintArr.filter(item => item.nxDistributerGoodsId !== purId);
    var choiceGoodsTotal = this.data.choiceGoodsTotal - 1;

    this.setData({
      selectedArr: choiceArr,
      selectedPrintArr: choicePrintArr,
      choiceGoodsTotal: choiceGoodsTotal
    })


    if (choiceArr.length == 0) {
      this.setData({
        showOperationCar: false,
      })
    }

  },

  clearSelArr() {
    console.log("clearalllll")
    var arr = this.data.applyArr;
    for (var i = 0; i < arr.length; i++) {
      var fatherData = "applyArr[" + i + "].isSelected";
      this.setData({
        [fatherData]: false,
      })
      var goodsArr = arr[i].nxDistributerGoodsEntities;
      for (var j = 0; j < goodsArr.length; j++) {

        var data = "applyArr[" + i + "].nxDistributerGoodsEntities[" + j + "].isSelected";
        this.setData({
          [data]: false,
        })

      }
    }
    this.setData({
      selectedArr: [],
      selectedPrintArr: [],
      choiceGoodsTotal: 0,
      showOperationCar: false
    })
  },



  hideMaskWx() {
    this.setData({
      showOperationCar: false,
    })
  },


  //1
  // startSearch: function () {

  //   if (this.data.deviceId !== "-1") {
  //     if (this.data.choiceGoodsTotal > 0) {
  //       this._openBlue();
  //     } else {
  //       wx.showToast({
  //         title: '请选择打印的商品',
  //         icon: 'none'
  //       })
  //     }

  //   } else {
  //     wx.navigateTo({
  //       url: '../../pSearchPrinter/pSearchPrinter',
  //     })
  //   }
  // },

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
            url: '../../order/pSearchPrinter/pSearchPrinter',
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
   
    var ordersArr = this.data.applyArr;
    // 
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
          command.setText("   备注:" + orderRemark + "");
          command.setPrint();
        }
        command.setText("------------------------------------------------")
        command.setPrint();
      
      //
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
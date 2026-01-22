const innerAudioContext = wx.createInnerAudioContext();
const app = getApp()
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil')

import {
  getOrderPage,
  giveOrderPrice
} from '../../../../lib/apiDepOrder.js'

Page({

  data: {
    hide: false,
    scrollTop: 0,
    depArr: [],
    edit: false,
  },

  onLoad: function (options) {
    const globalData = getApp().globalData;
    var todayDate = dateUtils.getWhichFullDate(0);
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      depFatherId: options.depFatherId,
      resFatherId: options.resFatherId,
      gbDepFatherId: options.gbDepFatherId,
      name: options.name,
      todayDate: todayDate,
      depHasSubs: options.depHasSubs,
      focusIndex: -1,
      focusParentIndex: -1,
    })

    var disValue = wx.getStorageSync('disInfo');
    if (disValue) {
      this.setData({
        disInfo: disValue,
      })
    }

    // 获取初始数据
    this._initData();


    // 监听播放回调  
    innerAudioContext.onPlay(() => {
      console.log('原音开始播放aaaa');
    })

    innerAudioContext.onStop(() => {
      console.log('原音播放停止');
    })
    innerAudioContext.onEnded(() => {
      console.log('原音播放结束');
    })
    innerAudioContext.onError((res) => {
      console.log(res)
    })
  },

  _initData() {
    var data = {
      depFatherId: this.data.depFatherId,
      gbDepFatherId: this.data.gbDepFatherId,
      resFatherId: this.data.resFatherId,
      orderBy: "time",
    }
    load.showLoading("获取订单中")
    getOrderPage(data)
      .then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          this.setData({
            applyArr: res.result.data.arr,
          })

        } else {
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
      })
  },



  // ********
  try (data) {
    var value = wx.getStorageSync("num");
    var obj = "";
    for (var i = 0; i < value.length; i++) {
      var id = value[i].id;
      if (data == id) {
        obj = value[i];
      }
    }
    if (obj) {
      innerAudioContext.autoplay = true;
      innerAudioContext.src = obj.filePath;
      innerAudioContext.play();
    }
  },

  //input methos ======
  //1,输入
  inputValue(e) {
    console.log(e);
    var value = e.currentTarget.dataset.value;
    // begin
    //1，输入数字
    if (value <= 9 && value >= 0) {
      var oldValue = "";
      if (this.data.depHasSubs > 0) {
        oldValue = this.data.applyArr[this.data.focusParentIndex].list[this.data.focusIndex].nxDoPrice;
      } else {
        oldValue = this.data.applyArr[this.data.focusIndex].nxDoPrice;
      }

      // 检查当前值是否已经有小数点，且小数点后已经有2位
      var oldValueStr = String(oldValue || "");
      if (oldValueStr.indexOf(".") !== -1) {
        var dotIndex = oldValueStr.indexOf(".");
        var decimalPlaces = oldValueStr.length - dotIndex - 1;
        if (decimalPlaces >= 2) {
          // 小数点后已经有2位，阻止继续输入
          wx.showToast({
            title: '小数点后只能保留两位',
            icon: 'none'
          })
          this.try("tishi"); // read 提示
          return; // 不更新值
        }
      }

      var newValue = 0;
      // 如果当前值是0.1，直接使用新输入的数字
      if (oldValue === '0.1' || oldValue === 0.1) {
        newValue = value;
      } else if (oldValue !== null && oldValue !== '-1') {
        newValue = oldValue + value;
      } else {
        newValue = value
      }
      
      // 检查是否为0.1，如果是则设置为空字符串
      if (newValue === '0.1' || newValue === 0.1) {
        newValue = '';
      }
      
      // 再次检查新值的小数点位数，确保不超过2位（防止字符串拼接导致的问题）
      var newValueStr = String(newValue);
      if (newValueStr.indexOf(".") !== -1) {
        var dotIndex = newValueStr.indexOf(".");
        var decimalPlaces = newValueStr.length - dotIndex - 1;
        if (decimalPlaces > 2) {
          // 如果超过2位，截取到2位
          var parts = newValueStr.split(".");
          newValue = parts[0] + "." + parts[1].substring(0, 2);
          wx.showToast({
            title: '小数点后只能保留两位',
            icon: 'none'
          })
        }
      }
      
      if (this.data.depHasSubs > 0) {
        this.setData({
          ["applyArr[" + this.data.focusParentIndex + "].list[" + this.data.focusIndex + "].nxDoPrice"]: newValue,
        })
      } else {
        this.setData({
          ["applyArr[" + this.data.focusIndex + "].nxDoPrice"]: newValue,
        })
      }

      this.try(value); // read 数字

    } else {

      console.log("点击了非数字")
      //2，输入"dian"
      if (value == ".") {
        // oldValue = this.data.applyArr[this.data.focusIndex].nxDoPrice;

        if (this.data.depHasSubs > 0) {
          oldValue = this.data.applyArr[this.data.focusParentIndex].list[this.data.focusIndex].nxDoPrice;
        } else {
          oldValue = this.data.applyArr[this.data.focusIndex].nxDoPrice;
        }

        var newValue = 0;
        if (oldValue.indexOf(".") != -1) {
          this.try("tishi");
        } else {
          if (oldValue > 0 && oldValue !== '-1') {
            newValue = oldValue + value;
            this.try("dian") // read 清除
          } else {
            newValue = "0."
            this.try("lingdian") // read 清除
          }
          // this.setData({
          //   ["applyArr[" + this.data.focusIndex + "].nxDoPrice"]: newValue,
          // })
          if (this.data.depHasSubs > 0) {
            this.setData({
              ["applyArr[" + this.data.focusParentIndex + "].list[" + this.data.focusIndex + "].nxDoPrice"]: newValue,
            })
          } else {
            this.setData({
              ["applyArr[" + this.data.focusIndex + "].nxDoPrice"]: newValue,
            })
          }
        }
      }
      //2，输入"删除"
      if (value == "del") {
        // oldValue = this.data.applyArr[this.data.focusIndex].nxDoPrice;

        if (this.data.depHasSubs > 0) {
          oldValue = this.data.applyArr[this.data.focusParentIndex].list[this.data.focusIndex].nxDoPrice;
        } else {
          oldValue = this.data.applyArr[this.data.focusIndex].nxDoPrice;
        }

        newValue = oldValue.substr(0, oldValue.length - 1);
        if (newValue.length > 0) {
          // 检查是否为0.1，如果是则设置为空字符串
          if (newValue === '0.1' || newValue === 0.1) {
            newValue = '';
          }
          
          if (this.data.depHasSubs > 0) {
            this.setData({
              ["applyArr[" + this.data.focusParentIndex + "].list[" + this.data.focusIndex + "].nxDoPrice"]: newValue,
            })
          } else {
            this.setData({
              ["applyArr[" + this.data.focusIndex + "].nxDoPrice"]: newValue,
            })
          }

        } else {
          if (this.data.depHasSubs > 0) {
            this.setData({
              ["applyArr[" + this.data.focusParentIndex + "].list[" + this.data.focusIndex + "].nxDoPrice"]: "",
            })
          } else {
            this.setData({
              ["applyArr[" + this.data.focusIndex + "].nxDoPrice"]: "",
            })
          }
        }
        this.try("delete") // read 清除

      }

      //3，输入“关闭”
      if (value == "close") {
        if (this.data.depHasSubs > 0) {
          if (this.data.applyArr[this.data.focusParentIndex].list[this.data.focusIndex].nxDoPrice !== null) {
            this._save();
          }
          this.setData({
            focusParentIndex: -1,
            focusIndex: -1,
            lastInput: true,
          })
        } else {
          if (this.data.applyArr[this.data.focusIndex].nxDoPrice !== null) {
            this._save();
          }
          this.setData({
            focusIndex: -1,
            lastInput: true,
          })
        }

        this.try("close"); // read 关闭

      }
      //4,输入“下一个”
      if (value == "next") {
        if (this.data.depHasSubs > 0) {

          if (this.data.applyArr[this.data.focusParentIndex].list[this.data.focusIndex].nxDoPrice !== null) {
            this._save();
          }
          var focusIndex = this.data.focusIndex;
          var focusParentIndex = this.data.focusParentIndex;

          if (focusIndex !== this.data.applyArr[this.data.focusParentIndex].list.length - 1) {

            this.setData({
              focusIndex: focusIndex + 1,
            })
          } else {
            if (focusParentIndex !== this.data.applyArr.length - 1) {
              var depIndex = Number(focusParentIndex) + Number(1);
              if (this.data.applyArr[depIndex].list.length > 0) {
                this.setData({
                  focusParentIndex: depIndex,
                  focusIndex: 0,
                  lastInput: true
                })
              }
            } else {
              console.log("lasososososososososoossoo")
              this.setData({
                focusParentIndex: -1,
                focusIndex: -1,
                lastInput: true
              })
            }
          }
        } else {
          if (this.data.applyArr[this.data.focusIndex].nxDoPrice !== null) {
            this._save();
          }
          var focusIndex = this.data.focusIndex;
          if (focusIndex !== this.data.applyArr.length - 1) {
            this.setData({
              focusIndex: focusIndex + 1,
            })
          } else {
            this.setData({
              focusIndex: -1,
              lastInput: true
            })
          }
        }

        this.try("next"); // read 下一个

      }
    }
  },

  changeFocusIndexPrice(e) {
    console.log(e.currentTarget.dataset);
    if (this.data.depHasSubs > 0) {
      if (this.data.focusIndex !== -1 && this.data.focusParentIndex !== -1) {
        var itemPrice = this.data.applyArr[this.data.focusParentIndex].list[this.data.focusIndex].nxDoPrice;
        console.log(itemPrice);
        if (itemPrice !== null && itemPrice > 0) {
          this._save();
        }
      }
      console.log("xunzesnn11111111")
      this.setData({
        focusParentIndex: e.currentTarget.dataset.parentindex,
        focusIndex: e.currentTarget.dataset.index,
        lastInput: false,
      })
    } else {
      if (this.data.focusIndex !== -1) {
        var itemPrice = this.data.applyArr[this.data.focusIndex].nxDoPrice;
        console.log(itemPrice);
        if (itemPrice !== null && itemPrice > 0) {
          this._save();
        }
      }
      this.setData({
        focusIndex: e.currentTarget.dataset.index,
        lastInput: false,
      })
    }

  },

  quickPrice(e) {
    if (this.data.focusIndex !== -1 && this.data.applyArr[this.data.focusIndex].nxDoPrice !== null) {
      this._save();
    }
    var index = e.currentTarget.dataset.index;
    var orderData = this.data.applyArr[index].nxDepartmentDisGoodsEntity.nxDdgOrderPrice;
    var orderPrice = "applyArr[" + index + "].nxDoPrice";
    this.setData({
      focusIndex: index,
      [orderPrice]: orderData,
    })
    this._save();
  },

  quickPriceDep(e) {

    if (this.data.focusParentIndex !== -1 && this.data.focusIndex !== -1 && this.data.applyArr[this.data.focusParentIndex].list[this.data.focusIndex].nxDoPrice !== null) {
      this._save();
    }
    var index = e.currentTarget.dataset.index;
    var parentIndex = e.currentTarget.dataset.depindex;
    var orderData = this.data.applyArr[parentIndex].list[index].nxDepartmentDisGoodsEntity.nxDdgOrderPrice;
    var orderPrice = "applyArr[" + parentIndex + "].list[" + index + "].nxDoPrice";
    this.setData({
      focusParentIndex: parentIndex,
      focusIndex: index,
      [orderPrice]: orderData,
    })
    this._save();
  },

  _save() {
    this._savePriceOrder();
  },


  toGoodsDetail(e) {
    console.log(e)
    var goods = e.currentTarget.dataset.item;
    wx.setStorageSync('disGoods', goods)
    wx.navigateTo({
      url: '../../goods/disGoodsPage/disGoodsPage?disGoodsId=' + goods.nxDistributerGoodsId + '&goodsName=' + goods.nxDgGoodsName + '&type=order',
    })
  },


  _savePriceOrder(e) {
    var itemOrder = ""
    var itemOrderPrice = ""
    if (this.data.depHasSubs > 0) {
      itemOrder = this.data.applyArr[this.data.focusParentIndex].list[this.data.focusIndex];
      itemOrderPrice = this.data.applyArr[this.data.focusParentIndex].list[this.data.focusIndex].nxDoPrice;

    } else {
      itemOrder = this.data.applyArr[this.data.focusIndex];
      itemOrderPrice = this.data.applyArr[this.data.focusIndex].nxDoPrice;
    }
    
    // 检查价格是否为0.1，如果是则不保存
    if (itemOrderPrice === '0.1' || itemOrderPrice === 0.1) {
      return; // 不保存0.1的价格
    }
    
    if (itemOrderPrice !== null && itemOrderPrice > 0) {
      var data = {
        orderId: itemOrder.nxDepartmentOrdersId,
        price: itemOrderPrice
      }
      load.showLoading("保存单价");
      giveOrderPrice(data).then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          this._initData()
        }else{
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
      })
    }
  },


  toBack() {
    if (this.data.depHasSubs > 0) {
      if (this.data.focusParentIndex !== -1 && this.data.focusIndex !== -1 && this.data.applyArr[this.data.focusParentIndex].list[this.data.focusIndex].nxDoPrice !== null) {
        this._save();
      }
    } else {
      if (this.data.focusIndex !== -1 && this.data.applyArr[this.data.focusIndex].nxDoPrice !== null) {
        this._save();
      }
    }

    wx.navigateBack({
      delta: 1,
    })
  },




  _getProfit() {
    console.log("getpfrororor");
    var itemOrder = this.data.applyArr[this.data.focusIndex];
    var costPrice = itemOrder.nxDoCostPrice;
    var weight = itemOrder.nxDoWeight;
    var costSutbotal = (Number(costPrice) * Number(weight)).toFixed(1);
    var price = itemOrder.nxDoPrice;
    var subtotal = (Number(price) * Number(weight)).toFixed(1);
    var proft = (Number(subtotal) - Number(costSutbotal)).toFixed(1);
    var data = "applyArr[" + this.data.focusIndex + "].nxDoProfitSubtotal";
    var dataScale = "applyArr[" + this.data.focusIndex + "].nxDoProfitScale";
    var scale = (((Number(price) - Number(costPrice)) / Number(price)) * Number(100)).toFixed(1);
    this.setData({
      [data]: proft,
      [dataScale]: scale,
    })
  },


  toHistoryPrice(e){
      wx.setStorageSync('disGoods', e.currentTarget.dataset.item);
    wx.navigateTo({
      url: '/subPackage/pages/customer/customerGoodsPrice/customerGoodsPrice?depFatherId='
       + this.data.depFatherId + '&goodsId=' +  e.currentTarget.dataset.id,
    })



  },




})
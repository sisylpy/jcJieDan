var load = require('../../../../lib/load.js');
var esc = require("../../../../utils/GPutils/esc.js");
var dateUtils = require('../../../../utils/dateUtil');

import apiUrl from '../../../../config.js'

import {
 
  updateOrder,
  deleteOrder,
  phoneGetToFillDepOrders,
  phoneGetToFillDepOrdersWithKg,
  phoneGetToFillDepOrdersWithJin,
  saveAccountBillPhoneFeiE,
  saveAccountBillPhone,
  saveAccountBillPhoneSub,
  receiveReturnApplyNx,
  giveOrderWeightListForStockAndFinish,
  giveOrderWeightListForStockShelfGoods,
  cancelOutOrder,
  deliveryOrder,
  cancleDeliveryOrder,
  updateDepPickName,
  confirmDepApplyGoods

} from '../../../../lib/apiDepOrder'

import {
  disSaveStandard,
  disDeleteStandard,

} from '../../../../lib/apiDistributer'


Page({


  onShow() {

    let windowInfo = wx.getWindowInfo();
    let globalData = getApp().globalData;
    this.setData({
      windowWidth: windowInfo.windowWidth * globalData.rpxR,
      windowHeight: windowInfo.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
    });



    this._initData();

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
      canConnect: false,
      printOk: false,
      openType: "",
      saveDepCount: 0,
      depCount: 0,
      // 打印规格修改 tip
      showPrintTip: false,
      currentEditOrderIndex: null,
      editPrintStandard: '',
      currentEditOrder: null,
    })
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    const globalData = getApp().globalData;

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      depFatherId: options.depFatherId,
      gbDepFatherId: options.gbDepFatherId,
      resFatherId: options.resFatherId,
      nxDisId: options.nxDisId,
      gbDisId: options.gbDisId,
      comId: options.comId,
      depHasSubs: options.depHasSubs,
      name: options.name,
      todayDate: dateUtils.getWhichFullDate(0),
      chooseSize: false,
      animationData: {},
      orderBy: "time",
      toType: "time",
      url: apiUrl.server,
      imgUrl: 'userImage/say.png',
      isKgMode: false, // 默认显示斤，false=斤，true=公斤
    })

    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
        disId: userInfo.nxDiuDistributerId,
        deviceId: userInfo.nxDiuPrintDeviceId,
        disInfo: userInfo.nxDistributerEntity,
      })
    }
    var depInfo = wx.getStorageSync('depItem');
    this.setData({
      depInfo: depInfo,
      depSettleType: depInfo.nxDepartmentSettleType,
      depFatherId: depInfo.nxDepartmentId,
      depId: depInfo.nxDepartmentId,
      depName: depInfo.nxDepartmentAttrName,
    })
  },


  _initData() {


    var data = {
      depFatherId: this.data.depFatherId,
      gbDepFatherId: this.data.gbDepFatherId,
      resFatherId: this.data.resFatherId,
      disId: this.data.nxDisId
    }
    load.showLoading("获取数据中");
    // 始终使用原始接口获取数据
    phoneGetToFillDepOrders(data)
      .then(res => {
        load.hideLoading();
        console.log("printdata", res.result.data);
        if (res.result.code == 0) {

          // 遍历所有订单，根据nxDoPrintStandard字段判断是斤还是公斤模式
          let isKgMode = false;
          let foundStandard = false; // 标记是否找到有效的规格
          console.log("[判断斤/公斤模式] depHasSubs:", this.data.depHasSubs);
          console.log("[判断斤/公斤模式] 数据数组长度:", res.result.data.arr ? res.result.data.arr.length : 0);
          
          if (res.result.data.arr && res.result.data.arr.length > 0) {
            if (this.data.depHasSubs > 0) {
              // depArr结构：部门数组，每个部门下有depOrders
              console.log("[判断斤/公斤模式] 使用depArr结构，开始遍历部门");
              for (var i = 0; i < res.result.data.arr.length && !foundStandard; i++) {
                var dep = res.result.data.arr[i];
                if (dep && dep.depOrders && dep.depOrders.length > 0) {
                  console.log("[判断斤/公斤模式] 遍历第" + (i + 1) + "个部门，订单数:", dep.depOrders.length);
                  for (var j = 0; j < dep.depOrders.length && !foundStandard; j++) {
                    var order = dep.depOrders[j];
                    if (order && order.nxDoPrintStandard) {
                      var standard = order.nxDoPrintStandard;
                      var standardLower = standard.toLowerCase(); // 转换为小写以便比较
                      console.log("[判断斤/公斤模式] 部门" + (i + 1) + "订单" + (j + 1) + "的nxDoPrintStandard:", standard);
                      
                      // 判断单位：如果包含"公斤"或"kg"（不区分大小写），则为公斤模式；如果包含"斤"，则为斤模式
                      if (standard.indexOf('公斤') !== -1 || standardLower.indexOf('kg') !== -1) {
                        isKgMode = true;
                        foundStandard = true;
                        console.log("[判断斤/公斤模式] 找到公斤规格，设置isKgMode=true");
                      } else if (standard.indexOf('斤') !== -1) {
                        isKgMode = false;
                        foundStandard = true;
                        console.log("[判断斤/公斤模式] 找到斤规格，设置isKgMode=false");
                      }
                    }
                  }
                }
              }
            } else {
              // applyArr结构：订单数组
              console.log("[判断斤/公斤模式] 使用applyArr结构，开始遍历订单");
              for (var i = 0; i < res.result.data.arr.length && !foundStandard; i++) {
                var order = res.result.data.arr[i];
                if (order && order.nxDoPrintStandard) {
                  var standard = order.nxDoPrintStandard;
                  var standardLower = standard.toLowerCase(); // 转换为小写以便比较
                  console.log("[判断斤/公斤模式] 订单" + (i + 1) + "的nxDoPrintStandard:", standard);
                  
                  // 判断单位：如果包含"公斤"或"kg"（不区分大小写），则为公斤模式；如果包含"斤"，则为斤模式
                  if (standard.indexOf('公斤') !== -1 || standardLower.indexOf('kg') !== -1) {
                    isKgMode = true;
                    foundStandard = true;
                    console.log("[判断斤/公斤模式] 找到公斤规格，设置isKgMode=true");
                  } else if (standard.indexOf('斤') !== -1) {
                    isKgMode = false;
                    foundStandard = true;
                    console.log("[判断斤/公斤模式] 找到斤规格，设置isKgMode=false");
                  }
                }
              }
            }
            
            if (!foundStandard) {
              console.log("[判断斤/公斤模式] 未找到有效的斤/公斤规格，使用默认值: false (斤模式)");
            } else {
              console.log("[判断斤/公斤模式] 最终判断结果 isKgMode:", isKgMode, "(true=公斤模式, false=斤模式)");
            }
          } else {
            console.log("[判断斤/公斤模式] 数据数组为空，使用默认值: false (斤模式)");
          }

          this.setData({
            tradeNo: res.result.data.tradeNo,
            total: res.result.data.total,
            totalHanzi: res.result.data.totalHanzi,
            finishCount: res.result.data.finishCount,
            totalCount: res.result.data.totalCount,
            hasPriceCount: res.result.data.hasPriceCount,
            hasWeightCount: res.result.data.hasWeightCount,
            isKgMode: isKgMode,
          })
          if (this.data.depHasSubs > 0) {
            this.setData({
              depArr: res.result.data.arr,

            })
          } else {
            this.setData({
              applyArr: res.result.data.arr,
            })
          }

        } else {

          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })
        }

      })


  },

  toChangeKg() {
    // 切换显示模式
    var newMode = !this.data.isKgMode;
    this.setData({
      isKgMode: newMode
    });
    
    var data = {
      depFatherId: this.data.depFatherId,
      gbDepFatherId: this.data.gbDepFatherId,
      resFatherId: this.data.resFatherId,
      disId: this.data.nxDisId
    }
    load.showLoading("转换中");
    // 根据切换后的模式选择接口
    // newMode = true: 斤转公斤，调用 phoneGetToFillDepOrdersWithKg
    // newMode = false: 公斤转斤，调用 phoneGetToFillDepOrdersWithJin
    var apiCall = newMode ? phoneGetToFillDepOrdersWithKg(data) : phoneGetToFillDepOrdersWithJin(data);
    apiCall
      .then(res => {
        load.hideLoading();
        console.log("printdata", newMode ? "斤转公斤" : "公斤转斤", res.result.data);
        if (res.result.code == 0) {

          this.setData({
            tradeNo: res.result.data.tradeNo,
            total: res.result.data.total,
            totalHanzi: res.result.data.totalHanzi,
            finishCount: res.result.data.finishCount,
            totalCount: res.result.data.totalCount,
            hasPriceCount: res.result.data.hasPriceCount,
            hasWeightCount: res.result.data.hasWeightCount,
          })
          if (this.data.depHasSubs > 0) {
            this.setData({
              depArr: res.result.data.arr,

            })
          } else {
            this.setData({
              applyArr: res.result.data.arr,
            })
          }

          wx.showToast({
            title: newMode ? '已转换为公斤' : '已转换为斤',
            icon: 'success'
          })

        } else {

          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })
        }

      })
  },


  delStandard(e) {
    this.setData({
      warnContent: e.detail.standardName,
      show: false,
      popupType: 'deleteSpec',
      showPopupWarn: true,
      disStandardId: e.detail.id,
    })
  },


  toDriver() {
    this.setData({
      editDriverShow: true,
      popupType: "road",
      depItem: this.data.depInfo

    })
  },


  toOpenOrder() {
    var appId = this.data.disInfo.nxDistributerAppId;
    console.log('depFatherId=' + this.data.depFatherId + '&disId=' + this.data.disId);

    wx.navigateToMiniProgram({
      appId: appId,
      path: '/pages/ai/customer/chefOrder/chefOrder?depFatherId=' + this.data.depFatherId + '&disId=' + this.data.disId,
      envVersion: 'release', //release develop trial
      success(res) {
        // that.setData({
        //   toOpenMini: false
        // })
      }
    })
  },

  toGoodsAi() {
    wx.navigateTo({
      url: '../../../../subPackage/pages/customer/customerGoodsAi/customerGoodsAi',
    })

  },

  confirmRouteName(e) {
    var depItem = e.detail.depItem;
    console.log(depItem);
    var data = {
      depId: depItem.nxDepartmentId,
      pickName: depItem.nxDepartmentPickName
    }
    updateDepPickName(data).then(res => {
      if (res.result.code == 0) {
        // this.setData({
        //   editDriverShow: false,
        //   popupType: "",
        // })
        // wx.showToast({
        //   title: 'ok',
        //   icon: 'none'
        // })
        var pages = getCurrentPages();

        var prevPage = pages[pages.length - 2]; //上一个页面
        //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
        prevPage.setData({
          update: true,
        })
        wx.navigateBack({
          delta: 1
        })
      }
    })
  },

  closeRouteName() {
    this.setData({
      editDriverShow: false,
      popupType: "",
    })
  },


  delApply() {

    this.setData({
      warnContent: this.data.goodsName + "  " + this.data.applyItem.nxDoQuantity + this.data.applyItem.nxDoStandard,
      deleteShow: true,
      show: false,
      popupType: 'deleteOrder',
      showPopupWarn: true,
      showOperationGoods: false,
      showOperationLinshi: false
    })

    this.setData({
      showOperationGoods: false,
      showOperationLinshi: false
    })
    this.hideModal();

  },


  confirmWarn() {
    if (this.data.popupType == 'deleteSpec') {
      this.deleteStandardApi()
    } else {
      this.deleteApplyApi()
    }
  },

  deleteStandardApi() {
    var that = this;
    disDeleteStandard(this.data.disStandardId).then(res => {
      if (res.result.code == 0) {
        this.setData({
          popupType: "",
          showPopupWarn: false,
          disStandardId: "",
        })

        that.setData({
          itemDis: res.result.data,
          item: res.result.data,
          editApply: true,
          show: true,

        })
        // this._initData();
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },

  deleteApplyApi() {

    this.setData({
      popupType: "",
      showPopupWarn: false,
    })

    load.showLoading("删除订单");
    deleteOrder(this.data.applyItem.nxDepartmentOrdersId).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        this._initData();
        this.setData({
          applyItem: "",
        })
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },


  closeWarn() {
    this.setData({

      warnContent: "",
      show: false,
      popupType: '',
      showPopupWarn: false,
    })
  },


  toCheck() {
    if (this.data.orderBy == 'time') {
      this.setData({
        orderBy: "goodsType"
      })
    } else {
      this.setData({
        orderBy: "time"
      })
    }
    this._initData();
  },


  // new
  toOrder(e) {
    if (this.data.depInfo.nxDepartmentEntities.length > 0) {
      this.setData({
        showChoice: true,
        toType: "order"
      })
    } else {
      this.setData({
        showOperation: true,
      })
    }
  },


  selectDepartment(e) {
    console.log(e.currentTarget.dataset.item);
    var dep = e.currentTarget.dataset.item;
    var depFatherId = dep.nxDepartmentId;
    if (dep.nxDepartmentFatherId > 0) {
      depFatherId = dep.nxDepartmentFatherId;
    }
    var depId = dep.nxDepartmentId;
    var depName = this.data.depInfo.nxDepartmentAttrName + "-" + dep.nxDepartmentName;
    this.setData({
      dep: dep,
      depFatherId: depFatherId,
      depId: depId,
      depName: depName,
    })
    if (this.data.openType == 'paste') {
      wx.navigateTo({
        url: '../paste/paste?depFatherId=' + this.data.depFatherId +
          '&depId=' + this.data.depId + '&depName=' + depName +
          '&gbDepFatherId=-1&resFatherId=-1&depSettleType=' + this.data.depSettleType,
      })
    } else if (this.data.openType == 'voice') {
      wx.navigateTo({
        url: '../../../../subPackage/pages/voice/voice?depFatherId=' + this.data.depFatherId +
          '&depId=' + this.data.depId + '&depName=' + depName +
          '&gbDepFatherId=-1&resFatherId=-1&depSettleType=' + this.data.depSettleType,
      })
    } else if (this.data.openType == 'ocr') {
      wx.navigateTo({
        url: '/subPackage-charts/pages/order/ocrOrder/ocrOrder?depFatherId=' + this.data.depFatherId +
          '&depId=' + this.data.depId + '&depName=' + depName,
      })
    } else {
      wx.navigateTo({
        url: '../resGoodsList/resGoodsList?depFatherId=' + this.data.depFatherId +
          '&depId=' + this.data.depId + '&depName=' + depName +
          '&gbDepFatherId=-1&resFatherId=-1&depSettleType=' + this.data.depSettleType +
          '&beforeId=-1',
      })
    }
  },


  toResGoods(e) {
    var subName = this.data.subName;
    var depName = this.data.depName;
    if (subName.length > 0) {
      depName = depName + "-" + subName;
    }
    this.setData({
      showOperationGoods: false
    })

    wx.navigateTo({
      url: '../resGoodsList/resGoodsList?depFatherId=' + this.data.depFatherId +
        '&depId=' + this.data.depId + '&depName=' + depName +
        '&gbDepFatherId=-1&resFatherId=-1&depSettleType=' + this.data.depSettleType +
        '&beforeId=' + e.currentTarget.dataset.id,
    })
  },


  hideOperation() {
    this.setData({
      showOperation: false
    })
  },


  toAddOrder(e) {

    console.log(e.currentTarget.dataset.type)
    var type = e.currentTarget.dataset.type;
    if (this.data.depInfo.nxDepartmentEntities.length > 0) {
      this.setData({
        showChoice: true,
        openType: type,
      })
    } else {

      if (type == 'paste') {
        wx.navigateTo({
          url: '../paste/paste?depFatherId=' + this.data.depFatherId +
            '&depId=' + this.data.depId + '&depName=' + this.data.depName +
            '&gbDepFatherId=-1&resFatherId=-1&depSettleType=' + this.data.depSettleType,
        })

      } else if (type == 'voice') {
        wx.navigateTo({
          url: '../../../../subPackage/pages/voice/voice?depFatherId=' + this.data.depFatherId +
            '&depId=' + this.data.depId + '&depName=' + this.data.depName +
            '&gbDepFatherId=-1&resFatherId=-1&depSettleType=' + this.data.depSettleType,
        })
      } else {
        wx.navigateTo({
          url: '../resGoodsList/resGoodsList?depFatherId=' + this.data.depFatherId +
            '&depId=' + this.data.depId + '&depName=' + this.data.depName +
            '&gbDepFatherId=-1&resFatherId=-1&depSettleType=' + this.data.depSettleType +
            '&beforeId=-1',
        })
      }
    }
  },


  toRecord() {
    this.hideOperation();
    wx.navigateTo({
      url: '../../../../subPackage/pages/order/record/record?depFatherId=' + this.data.depFatherId +
        '&depId=' + this.data.depId + '&depName=' + this.data.depName +
        '&gbDepFatherId=-1&resFatherId=-1&depSettleType=' + this.data.depSettleType,
    })

  },


  toPasteFromGoods(e) {
    console.log("toPasteFromGoodstoPasteFromGoods")
    this.hideMaskLinshi();
    wx.navigateTo({
      url: '../paste/paste?depFatherId=' + this.data.depFatherId +
        '&depId=' + this.data.depId + '&depName=' + this.data.depName +
        '&gbDepFatherId=-1&resFatherId=-1&depSettleType=' + this.data.depSettleType,
    })

  },

  // 跳转到 OCR 识别页面
  recognizeOrder(e) {
    console.log("========== recognizeOrder 开始 ==========");
    console.log("点击事件 e:", e);
    console.log("dataset:", e.currentTarget.dataset);
    var type = e.currentTarget.dataset.type;
    console.log("type:", type);
    
    console.log("当前部门信息:");
    console.log("  depInfo:", this.data.depInfo);
    console.log("  depFatherId:", this.data.depFatherId);
    console.log("  depId:", this.data.depId);
    console.log("  depName:", this.data.depName);
    
    // 检查是否有子部门
    const hasSubDepartments = this.data.depInfo && 
                              this.data.depInfo.nxDepartmentEntities && 
                              this.data.depInfo.nxDepartmentEntities.length > 0;
    console.log("是否有子部门:", hasSubDepartments);
    if (hasSubDepartments) {
      console.log("子部门数量:", this.data.depInfo.nxDepartmentEntities.length);
      console.log("显示部门选择弹窗");
      this.setData({
        showChoice: true,
        openType: 'ocr',
      })
      console.log("已设置 showChoice: true, openType: 'ocr'");
    } else {
      // 直接跳转到 OCR 识别页面
      // 使用分包路径格式：/分包root/页面路径
      const depName = this.data.depName || '';
      const depFatherId = this.data.depFatherId || '';
      const depId = this.data.depId || '';
      
      // 构建 URL，参数使用 encodeURIComponent 编码（wx.navigateTo 不会自动编码中文）
      const url = '/subPackage-charts/pages/order/ocrOrder/ocrOrder' +
        '?depFatherId=' + depFatherId +
        '&depId=' + depId +
        '&depName=' + encodeURIComponent(depName);
      
      console.log("直接跳转到 OCR 识别页面");
      console.log("跳转 URL:", url);
      console.log("参数详情:", {
        depFatherId: depFatherId,
        depId: depId,
        depName: depName,
        depNameEncoded: encodeURIComponent(depName)
      });
      
      wx.navigateTo({
        url: url,
        success: (res) => {
          console.log("跳转成功:", res);
        },
        fail: (err) => {
          console.error("跳转失败:", err);
          console.error("错误详情:", JSON.stringify(err, null, 2));
          console.error("尝试的 URL:", url);
          
          // 尝试不带参数跳转，测试页面是否存在
          console.log("尝试不带参数跳转测试...");
          wx.navigateTo({
            url: '/subPackage-charts/pages/order/ocrOrder/ocrOrder',
            success: (testRes) => {
              console.log("不带参数跳转成功，说明页面存在，问题可能在参数");
            },
            fail: (testErr) => {
              console.error("不带参数也失败，说明页面配置有问题:", testErr);
              wx.showModal({
                title: '页面未找到',
                content: '请检查：\n1. app.json 中是否已配置页面\n2. 是否需要重新编译小程序\n3. 页面文件是否存在',
                showCancel: false
              });
            }
          });
        }
      })
    }
    console.log("========== recognizeOrder 结束 ==========");
  },



  // toPaste() {
  //   this.hideOperation();

  //   wx.navigateTo({
  //     url: '../paste/paste?depFatherId=' + this.data.depFatherId +
  //       '&depId=' + this.data.depId + '&depName=' + this.data.depName +
  //       '&gbDepFatherId=-1&resFatherId=-1&depSettleType=' + this.data.depSettleType,
  //   })

  // },


  // /////
  chooseSezi: function (e) {
    // 用that取代this，防止不必要的情况发生
    var that = this;
    // 创建一个动画实例
    var animation = wx.createAnimation({
      // 动画持续时间
      duration: 100,
      // 定义动画效果，当前是匀速
      timingFunction: 'linear'
    })
    // 将该变量赋值给当前动画
    that.animation = animation
    // 先在y轴偏移，然后用step()完成一个动画
    animation.translateY(200).step()
    // 用setData改变当前动画
    that.setData({
      // 通过export()方法导出数据
      animationData: animation.export(),
      // 改变view里面的Wx：if
      chooseSize: true
    })
    // 设置setTimeout来改变y轴偏移量，实现有感觉的滑动
    setTimeout(function () {
      animation.translateY(0).step()
      that.setData({
        animationData: animation.export()
      })
    }, 20)
  },


  hideModal: function (e) {
    var that = this;
    var animation = wx.createAnimation({
      duration: 1000,
      timingFunction: 'linear'
    })
    that.animation = animation
    animation.translateY(200).step()
    that.setData({
      animationData: animation.export()
    })

    setTimeout(function () {
      animation.translateY(0).step()
      that.setData({
        animationData: animation.export(),
        chooseSize: false
      })
    }, 200)
  },

  openOperation(e) {
    console.log(e);
    var goodsId = e.currentTarget.dataset.id;
    var name = e.currentTarget.dataset.name;
    var color = e.currentTarget.dataset.color;
    this.setData({
      showOperationGoods: true,
      goodsId: goodsId,
      goodsName: name,
      disGoods: e.currentTarget.dataset.goods,
      color: color,
      applyItem: e.currentTarget.dataset.order,
      isSearching: false,
      depId: e.currentTarget.dataset.depid,
      subName: e.currentTarget.dataset.subname,
    })
    this.chooseSezi();
  },


  openOperationLinshi(e) {
    console.log(e);
    this.setData({
      dep: e.currentTarget.dataset.dep,
      depId: e.currentTarget.dataset.depid,
      showOperationLinshi: true,
      applyItem: e.currentTarget.dataset.item,
      goodsName: e.currentTarget.dataset.name
    })
    this.chooseSezi();
  },



  editDepApplyGoods(e) {
    this.setData({
      showOperationLinshi: false,
      showOperationGoods: false
    })
     wx.setStorageSync('applyItem', this.data.applyItem);
     var type = e.currentTarget.dataset.type;
    wx.navigateTo({
      url: '../../../../subPackage/pages/order/editDepApplyGoods/editDepApplyGoods?type=' + type
       + '&name=' + this.data.applyItem.nxDoGoodsName,
    }) 

  },

  confirmDepApplyGoods() {
    var id = this.data.applyItem.nxDepartmentOrdersId;

    confirmDepApplyGoods(id).then(res => {
      if (res.result.code == 0) {
        this.setData({
          showOperationLinshi: false,
         applyItem: ""
        })
        this._initData();

      }
    })

  },



  delApplyPaste() {
    // this.setData({
    //   applyItem: e.currentTarget.dataset.item
    // })
    var applyItem = this.data.applyItem;
    var id = applyItem.nxDepartmentOrdersId;
    var that = this;

    load.showLoading("删除订单")
    deleteOrder(id).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {

        var pasteDepList = wx.getStorageSync("pasteDepList");
        if (pasteDepList) {

          for (var i = 0; i < pasteDepList.length; i++) {
            var pDepId = pasteDepList[i].depId;
            var pDep = pasteDepList[i];

            if (pDepId == that.data.depId) {
              var orderArr = pasteDepList[i].arr;
              console.log("pasteDepList-pasteDepList", pasteDepList.length);
              console.log("depIdididiidiiid====", that.data.depId);
              var choicePrintArr = pasteDepList.filter(item => Number(item.depId) !== Number(that.data.depId));
              console.log("choicePrintArr-choicePrintArr", choicePrintArr.length);

              var choiceArr = orderArr.filter(item => item.nxDepartmentOrdersId !== this.data.applyItem.nxDepartmentOrdersId);
              console.log("choiceArr.length--0000000", choiceArr.length);
              console.log("filflflflflflfllflfl", choicePrintArr.length);
              if (choiceArr.length > 0) {
                console.log("choiceArr.length----1111", choiceArr.length);
                pDep.arr = choiceArr;
                choicePrintArr.push(pDep);
                wx.setStorageSync('pasteDepList', choicePrintArr);
              } else {
                console.log("choiceArr.length----2222222", choiceArr.length);
                if (choicePrintArr.length > 0) {
                  console.log("choicePrintArr.length----choicePrintArr000000", choicePrintArr.length);
                  wx.setStorageSync('pasteDepList', choicePrintArr);
                } else {
                  console.log("choicePrintArr.length----choicePrintArr111111", choicePrintArr.length);
                  wx.removeStorageSync('pasteDepList');
                }
              }

            }
          }

        }


        this._initData();
        this.setData({
          applyItem: "",
          showOperationLinshi: false
        })

      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })

  },



  toDgGoods(e) {
    var goodsId = this.data.goodsId;
    var name = this.data.goodsName;
    var color = this.data.color;
    var type = e.currentTarget.dataset.type;

    wx.navigateTo({
      url: '../../../../subPackage/pages/goods/disGoodsPage/disGoodsPage?disGoodsId=' + goodsId +
        '&type=' + type + '&color=' + color + '&goodsName=' + name,
    })
  },


  changeStandard: function (e) {
    this.setData({
      applyStandardName: e.detail.applyStandardName,
      priceLevel: e.detail.level,
    })
    var levelTwoStandard = this.data.applyItem.nxDistributerGoodsEntity.nxDgWillPriceTwoStandard;
    if (this.data.applyStandardName == levelTwoStandard) {
      this.setData({
        printStandard: levelTwoStandard
      })
    } else {
      this.setData({
        printStandard: this.data.applyItem.nxDistributerGoodsEntity.nxDgGoodsStandardname
      })
    }
    console.log("thisdaprinfir", this.data.printStandard)
  },

  hideMaskGoods() {
    this.hideModal();
    this.setData({
      showOperationGoods: false,
    })
  },

  hideChoiceMask() {
    this.setData({
      showChoice: false,
    })
  },

  hideMaskLinshi() {
    this.setData({
      showOperationLinshi: false
    })
  },



  toOpenPrint() {
     console.log("toOpenPrint")
    if (this.data.finishCount == this.data.totalCount) {
      var nxDisId = this.data.nxDisId;
      var gbDisId = this.data.gbDisId;
      var comId = this.data.comId;
      var gbDepId = this.data.gbDepFatherId;
      var depId = this.data.depFatherId;
      var resId = this.data.resFatherId;
      var depName = this.data.name;
      console.log('depFatherId=' + depId + '&depName=' + depName +
        '&gbDepFatherId=' + gbDepId + '&resFatherId=' + resId + '&nxDisId=' + nxDisId + '&gbDisId=' + gbDisId + '&comId=' + comId + '&nxDisPurUserId=' + this.data.userInfo.nxDistributerUserId + '&admin=1&commPurUserId=-1&gbDepUserId=-1')
     
      load.showLoading("保存订单中");
      var bill = {
        nxDbTradeNo: this.data.tradeNo,
        nxDbDepId: this.data.depFatherId,
        nxDbDepFatherId: this.data.depFatherId,
        nxDbTotal: this.data.total,
        nxDbIssueUserId: this.data.userInfo.nxDistributerUserId,
        nxOrderIds: this.data.ids,
        nxDbPrintTimes: 0,
        nxDbGbDisId: this.data.gbDisId,
        nxDbDisId: this.data.nxDisId,
        nxDbGbDepId: this.data.gbDepFatherId,
        nxDbNxCommunityId: this.data.comId,
        nxDbNxRestrauntId: this.data.resFatherId
      }

      console.log(bill);
      saveAccountBillPhoneFeiE(bill)
        .then(res => {
          if (res.result.code == 0) {
            load.hideLoading();
            wx.showToast({
              title: '订单保存成功',
              icon: 'none'
            })
            wx.navigateBack({
              delta: 1
            })
          } else {
            load.hideLoading();
            wx.showToast({
              title: res.result.msg,
              icon: 'none'
            })
          }
        })
    }else{
      wx.showToast({
        title: '有未完成订单',
        icon: 'none'
      })
    }
  },



  cancleOutOrder(e) {
    var item = this.data.applyItem;
    cancelOutOrder(item).then(res => {
      if (res.result.code == 0) {
        this.setData({
          showOperationGoods: false
        })
        this.hideModal()
        this._initData()
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },


  toEditHome() {
    wx.navigateTo({
      url: '../../mangement/homePage/homePage',
    })

  },

  /**
   * 修改配送商品申请
   */
  toEditApply() {
    if (this.data.applyItem.nxDoPurchaseStatus < 3) {
      var applyItem = this.data.applyItem;
      if (this.data.depInfo.nxDepartmentSettleType == 0) {
        this.setData({
          showCash: true,
          applySubtotal: applyItem.nxDoSubtotal,
        })
      } else if (this.data.depInfo.nxDepartmentSettleType == 1) {
        this.setData({
          show: true
        })
      }

      this.setData({
        applyStandardName: applyItem.nxDoStandard,
        printStandard: applyItem.nxDoPrintStandard,
        itemDis: this.data.applyItem.nxDistributerGoodsEntity,
        item: this.data.applyItem.nxDepartmentDisGoodsEntity,
        editApply: true,
        applyNumber: applyItem.nxDoQuantity,
        applyRemark: applyItem.nxDoRemark,
        priceLevel: applyItem.nxDoCostPriceLevel
      })
    } else {
      wx.showToast({
        title: '请供货商修改订单状态',
        icon: 'none'
      })

    }
    this.hideModal();
    this.setData({
      showOperationGoods: false
    })
  },

  confirmStandard(e) {
    var data = {
      nxDsDisGoodsId: this.data.itemDis.nxDistributerGoodsId,
      nxDsStandardName: e.detail.newStandardName,
    }
    disSaveStandard(data).
    then(res => {
      if (res.result.code == 0) {
        console.log(res)
        var standardArr = this.data.itemDis.nxDistributerStandardEntities;
        standardArr.push(res.result.data);
        var standards = "itemDis.nxDistributerStandardEntities"
        this.setData({
          [standards]: standardArr,
          applyStandardName: res.result.data.nxDsStandardName,
        })
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },


  confirmCash: function (e) {
    if (this.data.editApply) {
      this._updateDisOrder(e);
    }
    this.setData({
      show: false,
      editApply: false,
      applyItem: "",
      item: "",
      applyNumber: "",
      applyStandardName: "",
      printStandard: "",
    })
  },

  confirm: function (e) {
    if (this.data.editApply) {
      this._updateDisOrder(e);
    }

    this.setData({
      show: false,
      editApply: false,
      applyItem: "",
      item: "",
      applyNumber: "",
      applyStandardName: "",
      printStandard: "",
    })
  },



  /**
   * 修改配送申请
   * @param {} e 
   */
  _updateDisOrder(e) {

    var dg = {
      id: this.data.applyItem.nxDepartmentOrdersId,
      weight: e.detail.applyNumber,
      standard: e.detail.applyStandardName,
      remark: e.detail.applyRemark,
      printStandard: this.data.printStandard,
      priceLevel: this.data.priceLevel
    };
    updateOrder(dg).then(res => {
      load.showLoading("修改订单")
      if (res.result.code == 0) {
        load.hideLoading();
        this._initData();
      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: "none"
        })
      }

    })
  },


  cancle() {
    console.log("cancle....")
    this.setData({
      applyItem: "",
      applyStandardName: "",
      pirntStandard: "",
      showAdd: false,
      applyItem: "",
      applyNumber: "",
      depStandardArr: [],

    })

    if (this.data.isSearching) {
      this.setData({
        isSearching: false,
        searchStr: ""
      })
    }
  },


  haveReceive(e) {
    var status = e.currentTarget.dataset.status;
    var index = e.currentTarget.dataset.index;
    console.log(e.currentTarget.dataset);
    var item = this.data.applyArr[index];
    item.gbDoStatus = status;
    receiveReturnApplyNx(item).then(res => {
      load.showLoading("修改订单")
      if (res.result.code == 0) {
        load.hideLoading();
        this._initData();

      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: "none"
        })
      }
    })
  },

  printPick() {
    console.log("printPickprintPick");
    wx.navigateTo({
      url: '../orderPrint/orderPrint?gbDepFatherId=' + this.data.gbDepFatherId + '&depFatherId=' + this.data.depFatherId + '&resFatherId=' + this.data.resFatherId + '&name=' + this.data.name + '&hasSubAmount=' + this.data.depInfo.nxDepartmentSubAmount,
    })

  },


  toInputNumber() {

    wx.navigateTo({
      url: '../writePrice/writePrice?depFatherId=' + this.data.depFatherId +
        '&name=' + this.data.name + '&gbDepFatherId=-1&resFatherId=-1' +
        '&depHasSubs=' + this.data.depHasSubs,
    })
  },

  toWeightPage() {
    wx.navigateTo({
      url: '../writeWeight/writeWeight?depFatherId=' + this.data.depFatherId +
        '&name=' + this.data.name + '&depHasSubs=' +
        this.data.depHasSubs + '&resFatherId=-1&gbDepFatherId=-1',
    })
  },



  toPrintOrder() {

    if (this.data.finishCount == this.data.totalCount) {
      if (this.data.userInfo.nxDiuPrintDeviceId == -1) {
        wx.navigateTo({
          url: '../pSearchPrinter/pSearchPrinter',
        })
      } else {
        this.setData({
          deviceId: this.data.userInfo.nxDiuPrintDeviceId
        })

        if (!this.data.printOk) {
          console.log("startSearchstartSearchstartSearch")

          this.startSearch();
        } else {
          console.log("receiptTestreceiptTest")
          this.receiptTest();
        }
      }
    } else {
      wx.showToast({
        title: '有未完成订单,不能打印结账单!',
        icon: 'none'
      })
    }
  },


  //1
  startSearch: function () {
    console.log("startSearchstartSearch")
    if (this.data.deviceId !== "-1") {
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
        fail: function (e) {
          console.log(e)
          if (e.errCode === 10001) {
            wx.onBluetoothAdapterStateChange(function (res) {
              console.log('onBluetoothAdapterStateChange', res)
              if (res.available) {
                this.startBluetoothDevicesDiscovery()
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
    } else {
      wx.navigateTo({
        url: '../pSearchPrinter/pSearchPrinter',
      })
    }
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
        // wx.showModal({
        //   title: '提示',
        //   content: '连接失败',
        //   showCancel: false
        // })
        if (e.errno !== 1509007) {
          wx.navigateTo({
            url: '../pSearchPrinter/pSearchPrinter',
          })
        }

        console.log(e)
        // wx.hideLoading()
      },
      complete: function (e) {
        console.log(e)
        that.getSeviceId()

      }
    })
  },


  getSeviceId: function () {
    var that = this

    wx.getBLEDeviceServices({
      deviceId: this.data.deviceId,
      success: function (res) {
        that.setData({
          services: res.services
        })
        that.getCharacteristics()
      },
      fail: function (e) {
        console.log(e)
        wx.navigateTo({
          url: '../pSearchPrinter/pSearchPrinter',
        })
      },
      complete: function (e) {
        // console.log(e)
      }
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
      deviceId: this.data.deviceId,
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
          // that.receiptTest();
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
    console.log("printitititiititiiti")
    command.setPrintAndFeedRow(5);
    command.setSelectJustification(1) //居中
    command.setCharacterSize(17); //设置倍高倍宽
    command.setText(that.data.name);
    command.setPrint(); //打印并换行
    command.setPrint(); //打印并换行
    command.setSelectJustification(0) //设置居左 
    command.setCharacterSize(0);
    command.setText("日期: " + that.data.todayDate);
    command.setPrint(); //打印并换行
    command.setPrint();
    command.setSelectJustification(0) //设置居左
    command.setText("   商品")
    command.setAbsolutePrintPosition(228)
    command.setText("数量")
    command.setAbsolutePrintPosition(324)
    command.setText("单价")
    command.setAbsolutePrintPosition(420)
    command.setText("小计")
    command.setPrint();
    command.setText("===============================================")
    command.setPrint();
    console.log("==================ok next");
    // if(this.data.depHasSubs > 0){
    //   that._printSubDepOrderTime(command);
    // }else{
    //   that._printOrderTime(command);
    // }

    that._printOrderTime(command);

    command.setSelectJustification(0) //设置居左  
    command.setText("“" + that.data.disInfo.nxDistributerName + "”" + "为您提供最优的产品！");
    command.setPrint();
    command.setText("有任何问题联系电话:" + that.data.disInfo.nxDistributerPhone);
    command.setPrint();
    command.setPrintAndFeedRow(5);

    that.prepareSend(command.getData()) //准备发送数据
  },

  _printOrderTime(command) {

    // 
    if (this.data.depHasSubs == 0) {
      var ordersArr = this.data.applyArr;
      console.log("orderArr.lenng", ordersArr.length, "this.data.depHasSubs=", this.data.depHasSubs);

      for (var j = 0; j < ordersArr.length; j++) {
        var brand = ordersArr[j].nxDistributerGoodsEntity.nxDgGoodsBrand;
        var standardName = ordersArr[j].nxDistributerGoodsEntity.nxDgGoodsStandardname;
        var goodsName = ordersArr[j].nxDistributerGoodsEntity.nxDgGoodsName;
        var weight = ordersArr[j].nxDoWeight;
        var price = ordersArr[j].nxDoPrice;
        var subtotal = ordersArr[j].nxDoSubtotal;
        command.setText(j + 1 + ", ")
        if (brand !== null && brand.length > 0) {
          command.setText(brand + "-");
        }
        command.setText(goodsName);
        console.log("orderArr.goodsName", goodsName);
        command.setAbsolutePrintPosition(228)
        command.setText(weight + standardName);

        command.setAbsolutePrintPosition(324)
        command.setText(price);
        command.setAbsolutePrintPosition(420)
        command.setText(subtotal);
        command.setPrint();
        var orderRemark = ordersArr[j].nxDoRemark;
        if (orderRemark !== "null" && orderRemark.length > 0) {
          command.setText("   备注:" + orderRemark + "");
          command.setPrint();
        }
        console.log("orkdieriiririr" + subtotal);
        command.setText("-----------------------------------------------")
        command.setPrint();

        //
      }
    } else {
      console.log("this.data.depHasSubsthis.data.depHasSubs")
      console.log("this.data.depHasSubsthis.data.depHasSubs", this.data.depArr.length);
      for (var i = 0; i < this.data.depArr.length; i++) {
        var depName = this.data.depArr[i].depName;
        console.log("depName", depName);
        command.setText("#" + depName);
        command.setPrint();

        var ordersArr = this.data.depArr[i].depOrders;
        console.log("depName-ordersArr", ordersArr.length);
        for (var j = 0; j < ordersArr.length; j++) {
          var brand = ordersArr[j].nxDistributerGoodsEntity.nxDgGoodsBrand;
          var standardName = ordersArr[j].nxDistributerGoodsEntity.nxDgGoodsStandardname;
          var goodsName = ordersArr[j].nxDistributerGoodsEntity.nxDgGoodsName;
          var weight = ordersArr[j].nxDoWeight;
          var price = ordersArr[j].nxDoPrice;
          var subtotal = ordersArr[j].nxDoSubtotal;
          command.setText(j + 1 + ", ")
          if (brand !== null && brand.length > 0) {
            command.setText(brand + "-");
          }
          command.setText(goodsName);
          console.log("orderArr.goodsName", goodsName);
          command.setAbsolutePrintPosition(228)
          command.setText(weight + standardName);

          command.setAbsolutePrintPosition(324)
          command.setText(price);
          command.setAbsolutePrintPosition(420)
          command.setText(subtotal);
          command.setPrint();
          var orderRemark = ordersArr[j].nxDoRemark;
          if (orderRemark !== "null" && orderRemark.length > 0) {
            command.setText("   备注:" + orderRemark + "");
            command.setPrint();
          }
          console.log("orkdieriiririr" + subtotal);
          command.setText("-----------------------------------------------")
          command.setPrint();

          //
        }

      }

    }

    command.setSelectJustification(2);
    command.setCharacterSize(1);
    command.setText("总计:" + this.data.total + "元");
    command.setPrint();
    command.setText("================================================")
    command.setPrint();
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
      wx.writeBLECharacteristicValue({
        deviceId: this.data.deviceId,
        serviceId: this.data.writeServiceId,
        characteristicId: this.data.writeCharaterId,
        value: buf,
        success: function (res) {
          var times = that.data.printTimes;
          that.setData({
            showOperation: false,
            printTimes: times + 1,
          })

          if (currentTime == loopTime) {
            //最后一次，保存订单

            console.log("buf.ytlentntnntnt>>>>>>>>>>>0");
            that.setData({
              printTimes: 0
            })
            that.confirmSaveBill()

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
    } else {
      that.setData({
        printTimes: 0
      })
      console.log("buf.ytlentntnntnt ====0");
      that.confirmSaveBill();
    }

  },

  finishDelivery() {
    var id = this.data.applyItem.nxDepartmentOrdersId;
    deliveryOrder(id).then(res => {
      if (res.result.code == 0) {
        this.setData({
          showOperationGoods: false
        })
        this._initData();
      }
    })

  },


  cancleDeliveryOrder() {
    var id = this.data.applyItem.nxDepartmentOrdersId;
    cancleDeliveryOrder(id).then(res => {
      if (res.result.code == 0) {
        this.setData({
          showOperationGoods: false
        })
        this._initData();
      }
    })


  },

  saveBill() {


    if (this.data.finishCount == this.data.totalCount) {
      if (this.data.depHasSubs > 0) {
        this.setData({
          showPopupSaveSub: true,
          popupType: "saveBillSubTishi"
        })
      } else {
        this.setData({
          showPopupSave: true,
          warnContent: "确定不需要打印配送单吗？",
          popupType: "saveBillTishi"
        })
      }
    } else {
      wx.showToast({
        title: '有未完成订单',
        icon: 'none'
      })
    }

  },

  closeSaveBillSub(e) {
    this.setData({
      showPopupSaveSub: false
    })
  },


  confirmSaveBillSub(e) {
    console.log("confirmSaveBillSub", e);
    var saveType = e.detail.saveType;

    if (saveType == 0) {
      console.log("00");
      this.confirmSaveBill();

    } else {

      this.saveBillSub();

    }
  },


  saveBillSub() {
    load.showLoading("保存订单中");
    var data = {
      disId: this.data.disId,
      depFatherId: this.data.depFatherId
    }
    saveAccountBillPhoneSub(data)
      .then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          wx.navigateBack({
            delta: 1
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

  closeSaveBill() {
    console.log("closeSaveBillcloseSaveBill")
    this.setData({
      showPopupSave: false,
    })
  },

  confirmSaveBill() {
    load.showLoading("保存订单中");
    var bill = {
      nxDbTradeNo: this.data.tradeNo,
      nxDbDepId: this.data.depFatherId,
      nxDbDepFatherId: this.data.depFatherId,
      nxDbTotal: this.data.total,
      nxDbIssueUserId: this.data.userInfo.nxDistributerUserId,
      nxOrderIds: this.data.ids,
      nxDbPrintTimes: 0,
      nxDbGbDisId: this.data.gbDisId,
      nxDbDisId: this.data.nxDisId,
      nxDbGbDepId: this.data.gbDepFatherId,
      nxDbNxCommunityId: this.data.comId,
      nxDbNxRestrauntId: this.data.resFatherId
    }

    console.log(bill);
    saveAccountBillPhone(bill)
      .then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          wx.showToast({
            title: '订单保存成功',
            icon: 'none'
          })
          wx.navigateBack({
            delta: 1
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


  showIsOut(e) {
    var temp = [];
    var apply = this.data.applyItem;
    apply.hasChoice = true;
    temp.push(apply);
    var itemDis = this.data.disGoods;
    itemDis.nxDepartmentOrdersEntities = temp;
    this.setData({
      item: itemDis,
      showDisOutGoods: true,
      showOperationGoods: false,
    })

  },



  confirmStock(e) {
    var arrNeed = e.detail.item.nxDepartmentOrdersEntities;
    var arr = [];
    if (arrNeed.length > 0) {
      for (var i = 0; i < arrNeed.length; i++) {
        var weightValue = arrNeed[i].nxDoWeight;
        var choice = arrNeed[i].hasChoice;
        if (weightValue !== null && weightValue > 0 && choice) {
          arr.push(arrNeed[i]);
        }
      }
    }

    if (arr.length > 0) {
      load.showLoading("保存数据中");
      if(this.data.disInfo.nxDistributerBusinessTypeId > 1){
        giveOrderWeightListForStockShelfGoods(arr).then(res => {
          load.hideLoading();
          if (res.result.code == 0) {
            this._initData();
          } else {
            wx.showToast({
              title: 'res.result.msg',
              icon: 'none'
            })
          }
        })
      }else{
        giveOrderWeightListForStockAndFinish(arr).then(res => {
          load.hideLoading();
          if (res.result.code == 0) {
            this._initData();
          } else {
            wx.showToast({
              title: 'res.result.msg',
              icon: 'none'
            })
          }
        })
      }
      
    }
  },


  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },

  // 显示打印规格修改 tip
  showPrintStandardTip(e) {
    console.log("========== showPrintStandardTip 开始 ==========");
    console.log("点击事件:", e);
    console.log("dataset:", e.currentTarget.dataset);
    
    const order = e.currentTarget.dataset.order;
    const index = e.currentTarget.dataset.index;
    
    console.log("订单信息:", order);
    console.log("订单索引:", index, "类型:", typeof index);
    console.log("当前 showPrintTip:", this.data.showPrintTip);
    console.log("当前 currentEditOrderIndex:", this.data.currentEditOrderIndex, "类型:", typeof this.data.currentEditOrderIndex);
    
    // 确保 index 是数字类型，与 applyIndex 匹配（wx:for-index 返回的是数字）
    const indexNum = Number(index);
    
    this.setData({
      showPrintTip: true,
      currentEditOrderIndex: indexNum,
      editPrintStandard: order.nxDoPrintStandard || '',
      currentEditOrder: order
    }, () => {
      // setData 回调，确保数据已更新
      console.log("setData 回调 - showPrintTip:", this.data.showPrintTip);
      console.log("setData 回调 - currentEditOrderIndex:", this.data.currentEditOrderIndex, "类型:", typeof this.data.currentEditOrderIndex);
      console.log("setData 回调 - editPrintStandard:", this.data.editPrintStandard);
      
      // 检查 applyArr 中对应索引的订单
      if (this.data.applyArr && this.data.applyArr[indexNum]) {
        console.log("对应索引的订单:", this.data.applyArr[indexNum]);
      }
      
      // 检查条件是否满足
      console.log("检查渲染条件:");
      console.log("  showPrintTip:", this.data.showPrintTip);
      console.log("  currentEditOrderIndex:", this.data.currentEditOrderIndex);
      console.log("  需要匹配的 applyIndex 应该是:", indexNum);
      console.log("  条件结果:", this.data.showPrintTip && this.data.currentEditOrderIndex == indexNum);
    });
    
    console.log("设置后 showPrintTip:", this.data.showPrintTip);
    console.log("设置后 currentEditOrderIndex:", this.data.currentEditOrderIndex, "类型:", typeof this.data.currentEditOrderIndex);
    console.log("设置后 editPrintStandard:", this.data.editPrintStandard);
    console.log("========== showPrintStandardTip 结束 ==========");
  },


  // 取消修改打印规格
  cancelEditPrintStandard() {
    this.setData({
      showPrintTip: false,
      currentEditOrderIndex: null,
      editPrintStandard: '',
      currentEditOrder: null
    });
  },

  // 确认修改打印规格（组件回调）
  onPrintStandardConfirm(e) {
    // 组件已经处理了接口调用，这里只需要刷新数据和重置状态
    this.setData({
      showPrintTip: false,
      currentEditOrderIndex: null,
      editPrintStandard: '',
      currentEditOrder: null
    });
    // 刷新数据
    this._initData();
  },


  toSuyuanPage(){

    wx.navigateTo({
      url: '../orderPageSuyuan/orderPageSuyuan',
    })


  },




})
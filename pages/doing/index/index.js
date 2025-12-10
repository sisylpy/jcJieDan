var load = require('../../../lib/load.js');
let scrollDdirection = 0; // 用来计算滚动的方向

const tabBarHeight = 50; // 根据实际情况调整
const viewBarHeight = 50;

import apiUrl from '../../../config.js'

import {
 
  deletePlanPurchase,
  disGetPurchasingBatch,
  disGetPasteBatch,
  deleteDisPurBatchItem,
  disFinishPurchaseBatch,
  updatePasteBatch


} from '../../../lib/apiDepOrder'

Component({


  data:{
 
    currentPage: 1,
    limit: 10,
    totalPage: 0,
    totalCount: 0,
    hasMore: true,  // 是否还有更多数据
    isLoading: false, // 是否正在加载
    selectedArr: [], // 选中的商品数组
    selectedPrintArr: [], // 选中的打印数组
    
    // 下拉刷新相关数据
    refresherTriggered1: false, // 第一个swiper-item的下拉刷新状态
    refresherTriggered2: false, // 第二个swiper-item的下拉刷新状态
    
    // 确认弹窗相关数据
    showConfirmModal: false,
    pasteContent: '',
    tempBatch: null, // 临时保存批次数据
    
    // 左右联动相关数据
    categoryPositions: [], // 存储分类位置信息
    scrollTimer: null, // 滚动防抖定时器
    isLoadingMoreForCategory: false, // 是否为分类加载更多数据
    
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


  pageLifetimes: {

    show() {
      //tabBar
      if (typeof this.getTabBar === 'function' &&
        this.getTabBar()) {
        this.getTabBar().setData({
          selected: 3
        })
      }

      const app = getApp();
      const globalData = app.globalData;
      const navBarHeight = globalData.navBarHeight;
      const screenHeight = globalData.screenHeight;
      const screenWidth = globalData.screenWidth;
      const rpxRatio = 750 / screenWidth;
      const navBarHeightRpx = navBarHeight * rpxRatio;
      const viewBarHeightRpx = viewBarHeight * rpxRatio;
      const tabBarHeightRpx = 100;
  
      const contentHeight = (screenHeight - navBarHeight - tabBarHeight - viewBarHeight) * rpxRatio;

      this.setData({ 
        contentHeight: contentHeight,
        navBarHeight: navBarHeightRpx,
        tabBarHeight: tabBarHeightRpx,
        viewBarHeight: viewBarHeightRpx,
        leftMenuWidth: 150, // 左侧菜单宽度，单位 rpx
      });

      this.setData({
        windowWidth: globalData.windowWidth * globalData.rpxR,
        windowHeight: globalData.windowHeight * globalData.rpxR,
        statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
        url: apiUrl.server,
        scrollViewTop: 0,
        selectedSub: 0, // 选中的分类
        scrollHeight: 0, // 滚动视图的高度
        toView: 'position0', // 滚动视图跳转的位置
        scrollTopLeft: 0, //  左边滚动位置随着右边分类而滚动
        
        // 重置分页相关数据
        currentPage: 1,
        totalPage: 0,
        totalCount: 0,
        hasMore: true,
        isLoading: false,
        purGoodsArr: [],
        purCataArr: [],
        selectedSubWx: 0,
        toViewWx: '',
        scrollTopLeftWx: 0,
        categoryPositions: [],
        scrollTimer: null,
        isLoadingMoreForCategory: false,
        
        // 重置下拉刷新状态
        refresherTriggered1: false,
        refresherTriggered2: false,
        
        // 重置确认弹窗状态
        showConfirmModal: false,
        pasteContent: '',
        tempBatch: null,
      
        orderType: 1,
        innerCurrent: 0,


        tabs_wx: [{
          name: "采购单",
          amount: "0"
        },
        {
          name: "复制订货",
          amount: "",
          amountOk: "",
        }
      ],
      purType: 1,
      
  

      })

      var value = wx.getStorageSync('userInfo');
      if (value) {
        this.setData({
          userInfo: value,
          disId: value.nxDistributerEntity.nxDistributerId,
        })
        var disValue = wx.getStorageSync('disInfo');
        if (disValue) {
          this.setData({
            disInfo: disValue,
          })
        }
      }
      this.animation = wx.createAnimation({ duration: 300, timingFunction: 'ease' })

      this._getPasteBatch();
      if(this.data.disInfo.nxDistributerBusinessTypeId == 2){
        this.setData({
          tabs_wx: [{
            name: "采购单",
            amount: "0"
          },
          {
            name: "复制订货",
            amount: "",
            amountOk: "",
          },
          {
            name: "小程序订货",
            amount: "",
            amountOk: "",
          }
        ],
        })
      }
    
    },

   

  },


  methods: {



    
    showCar() {
      this.setData({
        showOperationCar: true,
      })
    },

    closeCar() {
      this.setData({
        showOperationCar: false

      })
    },


  toShareBatch(e){
    var id  = e.currentTarget.dataset.id;
    console.log("batchId=" + id + "&retName=" + this.data.disInfo.nxDistributerName + "&disId=" + this.data.disId + "&purUserId=" + this.data.userInfo.nxDistributerUserId + '&fromBuyer=1')
    this.setData({
      enterFromSubMsg: true,
    })
    wx.navigateToMiniProgram({
      appId: 'wx1ea78d3f33234284',
      path: 'pages/txs/prepareBatch/prepareBatch?batchId=' + id + '&retName=' + this.data.disInfo.nxDistributerName + '&disId=' + this.data.disId + '&purUserId=' + this.data.userInfo.nxDistributerUserId + '&fromBuyer=1',
      envVersion: 'trial', //release  develop  trial
      success(res) {
        
      },
      fail() {
     
      },
    })
  },


    onTab1ClickSub: function (e) {
      var that = this;
      if (this.data.innerCurrent === e.currentTarget.dataset.current) {
        return false;
      } else {
        that.setData({
          innerCurrent: e.currentTarget.dataset.current,
          currentTabOrder: e.currentTarget.dataset.current
        })
      }
    },




    // Event handler for inner swiper change
    onInnerSwiperChange(e) {
      this.setData({
        innerCurrent: e.detail.current,
      });
      var that = this;
      that.setData({
        innerCurrent: e.detail.current,
      
        
        // 重置下拉刷新状态
        refresherTriggered1: false,
        refresherTriggered2: false,
        refresherTriggered3: false,

      });
    
      if (that.data.innerCurrent == 0) {
         this.setData({
           purType: 1,
         })
         this._getPasteBatch()
      }
      if (that.data.innerCurrent == 1) {

        this.setData({
          purType: 3,
        })
        this._getPasteBatch()
      }
      if (that.data.innerCurrent == 2) {

        this.setData({
          purType: 2,
        })
        this._getPurchasingBatch()
      }
      
    },


    /**
    * 采购 swiper-item
    */
    _getPurGoods() {
      var data = {
        disId: this.data.disId,
        type: this.data.orderType,
      }
      load.showLoading("获取订单")
      return getDisInputPurGoodsTx(data)
        .then(res => {
          if (res.result.code == 0) {
            load.hideLoading();
            console.log(res.result.data);
            console.log("purGoodsTxxxxx")
            this.setData({
              purGoodsArr: res.result.data.arr,
              selectedArr: [],
              selectedPrintArr: [],
              toTop: 0,
            })
            var data0 = "tabs_wx[0].amount";
            var data1 = "tabs_wx[1].amount";
            this.setData({
              [data0]: res.result.data.unPurCount,
              [data1]: res.result.data.isBatchCountUnRepaly,
            })
           
            if (res.result.data.arr.length > 0) {
              this.lisenerScrollWx();
            }
            return res; // 返回结果
          } else {
            wx.showToast({
              title: res.result.msg,
              icon: 'none'
            })
            this.setData({
              purGoodsArr: []
            })
            return res; // 返回结果
          }
        }).catch(err => {
          console.error('_getPurGoods 请求失败:', err);
          load.hideLoading();
          wx.showToast({
            title: '获取数据失败',
            icon: 'none'
          });
          throw err; // 重新抛出错误
        })
    },


  // 删除采购订单
  deletePlanPurchseOrders(e) {
    var item = e.currentTarget.dataset.item;
    var goodsIndex = e.currentTarget.dataset.index;
    console.log("[deletePlanPurchseOrders] 开始删除采购订单，item:", item);
    load.showLoading("删除进货商品")
    console.log(e.currentTarget.dataset.item);
    deletePlanPurchase(e.currentTarget.dataset.item).then(res => {
      console.log("[deletePlanPurchseOrders] 接口返回数据:", res.result);
      load.hideLoading();
      if (res.result.code == 0) {
        // 删除成功后，从数组中移除该商品
        var purGoodsArr = this.data.purGoodsArr;
        var purId = item.nxDistributerPurchaseGoodsId;
        
        // 从商品数组中移除
        var newPurGoodsArr = purGoodsArr.filter((goods, index) => {
          // 如果是要删除的商品，则过滤掉
          if (goods.nxDistributerPurchaseGoodsId === purId) {
            console.log(`[deletePlanPurchseOrders] 移除商品索引 ${index}:`, goods);
            return false;
          }
          return true;
        });
        
        // 从选中数组中移除
        var selectedArr = this.data.selectedArr || [];
        var newSelectedArr = selectedArr.filter(selectedItem => selectedItem.purGoodsId !== purId);
        
        var selectedPrintArr = this.data.selectedPrintArr || [];
        var newSelectedPrintArr = selectedPrintArr.filter(printItem => printItem.nxDistributerPurchaseGoodsId !== purId);
        
        // 更新数据
        this.setData({
          purGoodsArr: newPurGoodsArr,
          selectedArr: newSelectedArr,
          selectedPrintArr: newSelectedPrintArr
        }, () => {
          console.log(`[deletePlanPurchseOrders] 删除完成，剩余商品数量: ${newPurGoodsArr.length}`);
          console.log(`[deletePlanPurchseOrders] 剩余选中商品数量: ${newSelectedArr.length}`);
          
          // 如果删除后没有选中的商品，隐藏按钮
          if (newSelectedPrintArr.length === 0) {
            this.hideButton();
          }
          
          // 重新计算分类位置
          setTimeout(() => {
            this.calculateCategoryPositions();
          }, 300);
          
          wx.showToast({
            title: '删除成功',
            icon: 'success',
            duration: 1500
          });
        });

      } else {
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    }).catch(err => {
      console.error("[deletePlanPurchseOrders] 删除失败:", err);
      load.hideLoading();
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      });
    })
  },

  
    // 1，选择未采购商品
    selectItem(e) {
      console.log("selectItemselectItem", e);
      var index = e.currentTarget.dataset.index;
      var itemSelected = this.data.purGoodsArr[index].isSelected;
      var selectedData = "purGoodsArr[" + index + "].isSelected";
      if (itemSelected) {
        this.setData({
          [selectedData]: false,
        })

        var arr = this.data.purGoodsArr[index].nxDepartmentOrdersEntities;
        for (var i = 0; i < arr.length; i++) {
          var orderChoicedData = "purGoodsArr[" + index + "].nxDepartmentOrdersEntities[" + i + "].hasChoice";
          this.setData({
            [orderChoicedData]: false
          })
        }

        this._getSelectedArr(false, index);

      } else {
        var userData = "purGoodsArr[" + index + "].nxDpbPurUserId";
        this.setData({
          [selectedData]: true,
          [userData]: this.data.userInfo.nxDistributerUserId,
        })

        var arr = this.data.purGoodsArr[index].nxDepartmentOrdersEntities;
        for (var i = 0; i < arr.length; i++) {
          var orderChoicedData = "purGoodsArr[" + index + "].nxDepartmentOrdersEntities[" + i + "].hasChoice";
          this.setData({
            [orderChoicedData]: true
          })
        }
        this._getSelectedArr(true, index);

      }

    },

    _getSelectedArr(what, index) {
      console.log("selllearrrr", what, index)
      var arr = this.data.selectedArr || [];
      var arrPrint = this.data.selectedPrintArr || [];
      var purGoodsArr = this.data.purGoodsArr;
      if (what) {
        var purId = purGoodsArr[index].nxDistributerPurchaseGoodsId;
        var item = {
          goodsIndex: index,
          purGoodsId: purId,
          item: purGoodsArr[index]
        }
        arr.push(item);
        arrPrint.push(purGoodsArr[index]);

        this.setData({
          selectedArr: arr,
          selectedPrintArr: arrPrint
        })
      } else {
        var purId = purGoodsArr[index].nxDistributerPurchaseGoodsId;
        var choiceStockArr = arr.filter(item => item.purGoodsId !== purId);
        var choicePrintArr = arrPrint.filter(item => item.nxDistributerPurchaseGoodsId !== purId);
        this.setData({
          selectedArr: choiceStockArr,
          selectedPrintArr: choicePrintArr
        })
      }

      if (this.data.selectedPrintArr.length > 0) {
        console.log("wllwwlarrrr")
        this.showButton()
      } else {
        this.hideButton();
      }

    },


    showButton() {
      // this.getTabBar().setData({
      //   showTabBar: false
      // })
      this.animation.translateY(0).step();
      this.setData({
        buttonAnimation: this.animation.export(),
      });
    },

    //复制粘贴
    toPaste(e) {
      wx.setStorageSync('toOrderWx', true);
      wx.setStorageSync('selArr', this.data.selectedPrintArr);
      this.setData({
        selectedArr: [],
        selectedPrintArr: [],
      })
      wx.navigateTo({
        url: '../../../subPackage/pages/prepare/orderList/orderList',
      })
    },
   

  cancelDisBatch() {
    deleteDisBatch(this.data.batchId)
    .then(res => {
      if (res.result.code == 0) {
       this._getPurGoods();
      }
    })
  },




    //swiper-item-2 swiper-item-sub-2
    _getPasteBatch() {
      load.showLoading("获取进货商铺");
      var data = {
        disId: this.data.disId,
        type: this.data.purType
      }
      var that = this;
      disGetPasteBatch(data)
        .then(res => {
          load.hideLoading();
          console.log("pasteapsotebacich")
          console.log(res.result.data)
          if (res.result.code == 0) {
            this.setData({
              batchArr: res.result.data.arr,
              selectedArr: [],
              selectedPrintArr: [],
            })

            that.getTabBar().setData({
              stockCount: res.result.data.stockCount,
              unPurCount: res.result.data.unPurCount,
              puringCount: res.result.data.puringCount,
            })

            var data0 = "tabs_wx[0].amount";
            var data1 = "tabs_wx[1].amount";
            
            that.setData({
              [data0]: res.result.data.printCount,
              [data1]: res.result.data.pasteCount,
            })
            if(this.data.disInfo.nxDistributerBusinessTypeId == 2){
              var data = "tabs_wx[2].amount"; 
            that.setData({
              [data]: res.result.data.wxCount,
            })
            }

          } else {
            wx.showToast({
              title: res.result.msg,
              icon: 'none'
            });
          }
        }).catch(err => {
          load.hideLoading();
          wx.showToast({
            title: '获取数据失败',
            icon: 'none'
          });
        })
    },

    _getPurchasingBatch() {
      load.showLoading("获取进货商铺");
      var data = {
        disId: this.data.disId,
        type: this.data.purType
      }
      var that = this;
      disGetPurchasingBatch(data)
        .then(res => {
          load.hideLoading();
          console.log(res.result.data)
          if (res.result.code == 0) {
            this.setData({
              batchArr: res.result.data.arr,
              selectedArr: [],
              selectedPrintArr: [],
            })

            that.getTabBar().setData({
              stockCount: res.result.data.stockCount,
              unPurCount: res.result.data.unPurCount,
              puringCount: res.result.data.puringCount,
            })
            var data0 = "tabs_wx[0].amount";
            var data1 = "tabs_wx[1].amount";
            that.setData({
              [data0]: res.result.data.printCount,
              [data1]: res.result.data.pasteCount,
            })
            if(this.data.disInfo.nxDistributerBusinessTypeId == 2){
              var data = "tabs_wx[2].amount"; 
            that.setData({
              [data]: res.result.data.wxCount,
            })
            }
          } else {
            wx.showToast({
              title: res.result.msg,
              icon: 'none'
            });
          }
        })
        // .catch(err => {
        //   load.hideLoading();
        //   wx.showToast({
        //     title: '获取数据失败',
        //     icon: 'none'
        //   });
        // })
    },

    cancelDisBatchItem(e) {
      deleteDisPurBatchItem(e.currentTarget.dataset.id)
        .then(res => {
          if (res.result.code == 0) {
            if(this.data.innerCurrent < 2){
              this._getPasteBatch()
            }else{
              this._getPurchasingBatch()
            }
            
          }
        })
    },

    /**
     * showOperationCar
     */
    deleteOrderGoods(e) {
      var selArr = this.data.selectedArr;
      var selPrintArr = this.data.selectedPrintArr;
      var item = this.data.selectedArr[e.currentTarget.dataset.index];
      var index = item.goodsIndex;
      var goodsData = "purGoodsArr[" + index + "].isSelected";
      this.setData({
        [goodsData]: false
      })
      var arr = this.data.purGoodsArr[index].nxDepartmentOrdersEntities;
      for (var i = 0; i < arr.length; i++) {
        var orderChoicedData = "purGoodsArr[" + index + "].nxDepartmentOrdersEntities[" + i + "].hasChoice";
        this.setData({
          [orderChoicedData]: false
        })
      }
      var purId = e.currentTarget.dataset.id;
      var choiceStockArr = selArr.filter(item => item.purGoodsId !== purId);
      var choicePrintArr = selPrintArr.filter(item => item.nxDistributerPurchaseGoodsId !== purId);
      this.setData({
        selectedArr: choiceStockArr,
        selectedPrintArr: choicePrintArr
      })
      if (choiceStockArr.length == 0) {
      
        this.setData({
          showOperationCar: false,
        })
      }
    },

    hideButton() {
    
      this.animation.translateY(100).step();
      this.setData({
        buttonAnimation: this.animation.export(),
      });
    },


    showTools(e) {
      var batchIndex = e.currentTarget.dataset.batchindex;
      var goodsIndex = e.currentTarget.dataset.goodsindex;
      var showTools = this.data.batchArr[batchIndex].nxDPGEntities[goodsIndex].isShowTools;
      var showData = "batchArr[" + batchIndex + "].nxDPGEntities[" + goodsIndex + "].isShowTools";
      console.log(showTools);
      if (!showTools) {
        this.setData({
          [showData]: true
        })
      } else {
        this.setData({
          [showData]: false
        })
      }
    },

    showFinish(e) {
      var item = e.currentTarget.dataset.item;
      var supplierId = e.currentTarget.dataset.item.nxDpbSupplierId;
      var hasSupplier = false;
      if (supplierId !== null) {
        hasSupplier = true;
      }
      
      // 确保自动订货字段有默认值
      if (item.nxDpbOrderIsNotice === undefined) {
        item.nxDpbOrderIsNotice = 0; // 默认关闭自动订货 (0=关闭, 1=开启)
      }
      
      this.setData({
        showPay: true,
        batch: item,
        batchType: item.nxDpbPurchaseType,
        hasSupplier: hasSupplier
      })
    },

   
    _getOrderSubtal() {
      var purGoods = this.data.batch.nxDPGEntities;
      if (purGoods.length > 0) {

        for (var i = 0; i < purGoods.length; i++) {
          var orderArr = purGoods[i].nxDistributerGoodsEntity.nxDepartmentOrdersEntities;
          if (orderArr.length > 0) {
            for (var j = 0; j < orderArr.length; j++) {
              var doPrice = orderArr[j].nxDoPrice;
              var orderWeighValue = orderArr[j].nxDoWeight;
              var costSubtotal = orderArr[j].nxDoCostSubtotal;
              if (doPrice > 0) {
                var orderSubtotalData = "batch.nxDPGEntities[" + i + "].nxDistributerGoodsEntity.nxDepartmentOrdersEntities[" + j + "].nxDoSubtotal";
                var doSubtotal = (Number(doPrice) * Number(orderWeighValue)).toFixed(1);
                var profitSubtotal = (Number(doSubtotal) - Number(costSubtotal)).toFixed(1);
                var profitScale = (Number(profitSubtotal) / Number(doSubtotal) * 100).toFixed(2);
                var profitSubData = "batch.nxDPGEntities[" + i + "].nxDistributerGoodsEntity.nxDepartmentOrdersEntities[" + j + "].nxDoProfitSubtotal";
                var profitScaleData = "batch.nxDPGEntities[" + i + "].nxDistributerGoodsEntity.nxDepartmentOrdersEntities[" + j + "].nxDoProfitScale";
                var statusData = "batch.nxDPGEntities[" + i + "].nxDistributerGoodsEntity.nxDepartmentOrdersEntities[" + j + "].nxDoStatus";
                var updateData = "batch.nxDPGEntities[" + i + "].nxDistributerGoodsEntity.nxDepartmentOrdersEntities[" + j + "].nxDoCostPriceUpdate";
                this.setData({
                  [orderSubtotalData]: doSubtotal,
                  [profitSubData]: profitSubtotal,
                  [profitScaleData]: profitScale,
                  [statusData]: 2,
                  [updateData]: this.data.todayDate
                })
              }

            }
          }
        }
      }
    },


  


    confirmPay(e) {
      
      this._getOrderSubtal();
      var batch = e.detail.item;
      console.log('确认支付，批次数据:', batch);

      // 确保自动订货字段存在
      if (batch.nxDpbOrderIsNotice === undefined) {
        batch.nxDpbOrderIsNotice = 0; // 默认关闭 (0=关闭, 1=开启)
      }

      load.showLoading("保存中");
      disFinishPurchaseBatch(batch)
        .then(res => {
          load.hideLoading();
          if (res.result.code == 0) {
            this.setData({
              showPay: false
            })
            this._getPurchasingBatch();
            wx.showToast({
              title: '保存成功',
              icon: 'success',
              duration: 2000
            });
          } else {
            wx.showToast({
              title: res.result.msg,
              icon: 'none'
            })
          }
        }).catch(err => {
          load.hideLoading();
          console.error('保存失败:', err);
          wx.showToast({
            title: '保存失败，请重试',
            icon: 'none'
          });
        })
    },

    // 第一个swiper-item的下拉刷新
    onRefresh1() {
      console.log('=== 第一个swiper-item下拉刷新开始 ===');
      this.setData({
        refresherTriggered1: true
      });
      
      // 重置分页数据
      this.setData({
        currentPage: 1,
        totalPage: 0,
        totalCount: 0,
        hasMore: true,
        isLoading: false,
        purGoodsArr: [],
        purCataArr: [],
        selectedSubWx: 0,
        toViewWx: '',
        scrollTopLeftWx: 0,
        categoryPositions: [],
        scrollTimer: null,
        isLoadingMoreForCategory: false,
        purType: 1,
      });
      
      // 重新获取数据
      this._getPasteBatch();
      
      // 延迟关闭刷新状态
      setTimeout(() => {
        this.setData({
          refresherTriggered1: false
        });
        console.log('=== 第一个swiper-item下拉刷新完成 ===');
      }, 1000);
    },

    // 第二个swiper-item的下拉刷新
    onRefresh2() {
      console.log('=== 第二个swiper-item下拉刷新开始 ===');
      this.setData({
        refresherTriggered2: true,
        purType: 3,
      });
      
      // 重新获取订货数据
      this._getPasteBatch()
      
      // 延迟关闭刷新状态
      setTimeout(() => {
        this.setData({
          refresherTriggered2: false
        });
        console.log('=== 第二个swiper-item下拉刷新完成 ===');
      }, 1000);
    },
    onRefresh3() {
      console.log('=== 第三个swiper-item下拉刷新开始 ===');
      this.setData({
        refresherTriggered3: true
      });
      
      // 重置分页数据
      this.setData({
        currentPage: 1,
        totalPage: 0,
        totalCount: 0,
        hasMore: true,
        isLoading: false,
        purGoodsArr: [],
        purCataArr: [],
        selectedSubWx: 0,
        toViewWx: '',
        scrollTopLeftWx: 0,
        categoryPositions: [],
        scrollTimer: null,
        isLoadingMoreForCategory: false,
        purType: 2,
      });
      
      // 重新获取数据
      this._getPurchasingBatch();
      
      // 延迟关闭刷新状态
      setTimeout(() => {
        this.setData({
          refresherTriggered3: false
        });
        console.log('=== 第三个swiper-item下拉刷新完成 ===');
      }, 1000);
    },

    // 再次复制功能
    pasteAgain(e) {
      const batch = e.currentTarget.dataset.batch;
      console.log('再次复制批次:', batch);
      
      if (batch && batch.nxDpbPasteContent) {
        // 复制到剪贴板
        wx.setClipboardData({
          data: batch.nxDpbPasteContent,
          success(res) {
            wx.showToast({
              title: '复制成功',
              icon: 'success',
              duration: 2000
            });
          },
          fail(err) {
            console.error('复制失败:', err);
            wx.showToast({
              title: '复制失败，请重试',
              icon: 'none',
              duration: 2000
            });
          }
        });
      } else {
        wx.showToast({
          title: '没有可复制的内容',
          icon: 'none',
          duration: 2000
        });
      }
    },


          updatePasteBatchContent(e){
       // 获取批次ID和索引
       const batchId = e.currentTarget.dataset.batchId;
       const batchIndex = e.currentTarget.dataset.batchIndex;
       console.log('批次ID:', batchId);
       console.log('批次索引:', batchIndex);
       
       if (!batchId) {
         wx.showToast({
           title: '批次ID不存在',
           icon: 'none'
         });
         return;
       }
       
       // 从batchArr中获取批次数据
       const batchArr = this.data.batchArr;
       if (!batchArr || batchIndex >= batchArr.length) {
         wx.showToast({
           title: '批次数据不存在',
           icon: 'none'
         });
         return;
       }
       
       const batch = batchArr[batchIndex];
       
       if (!batch || batch.nxDistributerPurchaseBatchId != batchId) {
         wx.showToast({
           title: '批次数据不匹配',
           icon: 'none'
         });
         return;
       }
       
       // 生成复制内容
       let content = this._generatePasteContentFromBatch(batch);
       
       // 显示确认弹窗
       this.setData({
         showConfirmModal: true,
         pasteContent: content,
         tempBatch: batch // 临时保存批次数据
       });
     },

     // 关闭确认弹窗
     closeConfirmModal() {
       this.setData({
         showConfirmModal: false,
         pasteContent: '',
         tempBatch: null
       });
     },

     // 阻止事件冒泡
     stopPropagation() {
       // 空函数，用于阻止事件冒泡
     },

     // 确认更新复制内容
     confirmUpdatePasteContent() {
       const batch = this.data.tempBatch;
       const pasteContent = this.data.pasteContent; // 保存复制内容
       console.log('确认更新时的批次数据:', batch);
       console.log('准备复制的原始内容:', pasteContent);
       
       if (!batch) {
         wx.showToast({
           title: '批次数据不存在',
           icon: 'none'
         });
         return;
       }
       
       // 尝试不同的批次ID字段
       let batchId = batch.nxDistributerPurchaseBatchId || batch.id || batch.batchId;
       console.log('使用的批次ID:', batchId);
       
       if (!batchId) {
         wx.showToast({
           title: '批次ID不存在',
           icon: 'none'
         });
         return;
       }
       
       var data = {
         content: pasteContent,
         batchId: batchId
       }
       
       console.log('发送的数据:', data);
       load.showLoading("更新中");
       updatePasteBatch(data).then(res =>{
         load.hideLoading();
         if(res.result.code == 0){
           this.setData({
             showConfirmModal: false,
             pasteContent: '',
             tempBatch: null
           });
           
           // 复制内容到剪贴板
           console.log('准备复制的内容:', pasteContent);
           console.log('内容长度:', pasteContent ? pasteContent.length : 0);
           
           wx.setClipboardData({
             data: pasteContent,
             success: () => {
               console.log('复制成功');
               wx.showToast({
                 title: '更新成功，已复制到剪贴板',
                 icon: 'success',
                 duration: 2000
               });
             },
             fail: (err) => {
               console.log('复制失败:', err);
               wx.showToast({
                 title: '更新成功，复制失败',
                 icon: 'none',
                 duration: 2000
               });
             }
           });
           
           this._getPasteBatch();
         } else {
           wx.showToast({
             title: res.result.msg,
             icon: 'none'
           });
         }
       }).catch(err => {
         load.hideLoading();
         console.error('更新失败:', err);
         wx.showToast({
           title: '更新失败，请重试',
           icon: 'none'
         });
       })
     },

     // 生成复制内容的方法
     _generatePasteContent() {
       let content = "";
       const batch = this.data.batch;
       
       if (batch && batch.nxDPGEntities && batch.nxDPGEntities.length > 0) {
         for (let i = 0; i < batch.nxDPGEntities.length; i++) {
           const item = batch.nxDPGEntities[i];
           if (item.nxDpgQuantity && item.nxDpgQuantity > 0) {
             const goodsName = item.nxDistributerGoodsEntity.nxDgGoodsName;
             const quantity = item.nxDpgQuantity;
             const standard = item.nxDpgStandard || item.nxDistributerGoodsEntity.nxDgGoodsStandardname;
             content += `${i + 1}, ${goodsName} ${quantity}${standard}\n`;
           }
         }
       }
       
       console.log('生成的复制内容:', content);
       return content;
     },

     // 从批次数据生成复制内容的方法
     _generatePasteContentFromBatch(batch) {
       let content = "";
       
       // 如果有部门名称，在复制内容前面加上部门名称
       if (batch && batch.nxDpbNxDepartmentName) {
         content += `${batch.nxDpbNxDepartmentName}\n`;
       }
       
       if (batch && batch.nxDPGEntities && batch.nxDPGEntities.length > 0) {
         for (let i = 0; i < batch.nxDPGEntities.length; i++) {
           const item = batch.nxDPGEntities[i];
           if (item.nxDpgQuantity && item.nxDpgQuantity > 0) {
             const goodsName = item.nxDistributerGoodsEntity.nxDgGoodsName;
             const quantity = item.nxDpgQuantity;
             const standard = item.nxDpgStandard || item.nxDistributerGoodsEntity.nxDgGoodsStandardname;
             content += `${i + 1}, ${goodsName} ${quantity}${standard}\n`;
           }
         }
       }
       
       console.log('从批次生成的复制内容:', content);
       return content;
     },
     
     // 打印批次内容的方法
     printBatchContent(e) {
       // 获取批次ID和索引
       const batchId = e.currentTarget.dataset.batchId;
       const batchIndex = e.currentTarget.dataset.batchIndex;
       console.log('打印批次ID:', batchId);
       console.log('打印批次索引:', batchIndex);
       
       if (!batchId) {
         wx.showToast({
           title: '批次ID不存在',
           icon: 'none'
         });
         return;
       }
       
       // 从batchArr中获取批次数据
       const batchArr = this.data.batchArr;
       if (!batchArr || batchIndex >= batchArr.length) {
         wx.showToast({
           title: '批次数据不存在',
           icon: 'none'
         });
         return;
       }
       
       const batch = batchArr[batchIndex];
       
       if (!batch || batch.nxDistributerPurchaseBatchId != batchId) {
         wx.showToast({
           title: '批次数据不匹配',
           icon: 'none'
         });
         return;
       }
       
       // 开始打印流程
       this._startPrintBatch(batch);
     },
     
     // 开始打印批次
     _startPrintBatch(batch) {
       console.log('开始打印批次:', batch);
       
       // 检查蓝牙设备
       var value = wx.getStorageSync('userInfo');
       if (value && value.nxDiuPrintDeviceId == -1) {
         wx.navigateTo({
           url: '../../../pages/order/pSearchPrinter/pSearchPrinter',
         });
         return;
       }
       
       // 设置设备ID
       this.setData({
         deviceId: value.nxDiuPrintDeviceId
       });
       
       // 初始化打印参数
       this._initPrintParams();
       
       // 开始蓝牙连接
       this._startBluetoothConnection(batch);
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
     
     // 开始蓝牙连接
     _startBluetoothConnection(batch) {
       var that = this;
       wx.openBluetoothAdapter({
         success: function (res) {
           wx.getBluetoothAdapterState({
             success: function (res) {
               console.log('openBluetoothAdapter success', res);
               if (res.available) {
                 if (res.discovering) {
                   wx.stopBluetoothDevicesDiscovery({
                     success: function (res) {
                       console.log(res);
                     }
                   });
                 } else {
                   that._getBluetoothDevices(batch);
                 }
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
           console.log(e);
           if (e.errCode === 10001) {
             wx.onBluetoothAdapterStateChange(function (res) {
               console.log('onBluetoothAdapterStateChange', res);
               if (res.available) {
                 that._getBluetoothDevices(batch);
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
     _getBluetoothDevices(batch) {
       var that = this;
       this.setData({
         isScanning: true
       });
       wx.startBluetoothDevicesDiscovery({
         success: function (res) {
           console.log(res);
           setTimeout(function () {
             wx.getBluetoothDevices({
               success: function (res) {
                 var devices = [];
                 var num = 0;
                 for (var i = 0; i < res.devices.length; ++i) {
                   if (res.devices[i].name != "未知设备") {
                     devices[num] = res.devices[i];
                     num++;
                   }
                 }
                 that.setData({
                   list: devices,
                   isScanning: false
                 });
                 load.hideLoading();
                 wx.stopBluetoothDevicesDiscovery({
                   success: function (res) {
                     console.log("停止搜索蓝牙");
                   }
                 });
               },
             });
           }, 5000);
           that._connectToPrinter(batch);
         },
       });
     },
     
     // 连接到打印机
     _connectToPrinter(batch) {
       var that = this;
       wx.stopBluetoothDevicesDiscovery({
         success: function (res) {
           console.log(res);
         },
       });
       this.setData({
         serviceId: 0,
         writeCharacter: false,
         readCharacter: false,
         notifyCharacter: false
       });
       wx.showLoading({
         title: '正在连接',
       });
       wx.createBLEConnection({
         deviceId: this.data.deviceId,
         success: function (res) {
           console.log(res);
           that._getServiceId(batch);
         },
         fail: function (e) {
           wx.showModal({
             title: '提示',
             content: '连接失败',
             showCancel: false
           });
           wx.navigateTo({
             url: '../../../pages/order/pSearchPrinter/pSearchPrinter',
           });
           console.log(e);
           wx.hideLoading();
         },
         complete: function (e) {
           console.log(e);
         }
       });
     },
     
     // 获取服务ID
     _getServiceId(batch) {
       var that = this;
       wx.getBLEDeviceServices({
         deviceId: that.data.deviceId,
         success: function (res) {
           that.setData({
             services: res.services
           });
           that._getCharacteristics(batch);
         },
         fail: function (e) {
           console.log(e);
           wx.navigateTo({
             url: '../../../pages/order/pSearchPrinter/pSearchPrinter',
           });
         },
         complete: function (e) {}
       });
     },
     
     // 获取特征值
     _getCharacteristics(batch) {
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
               that._getCharacteristics(batch);
             }
           } else {
             wx.showToast({
               title: '连接成功',
             });
             that.setData({
               printOk: true
             });
             that._startPrint(batch);
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
     _startPrint(batch) {
       wx.showToast({
         title: '准备数据',
       });
       
       var that = this;
       var esc = require("../../../utils/GPutils/esc.js");
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
       this._printPurchaseGoods(command, batch);
       
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
       command.setPrint();
       
       // 准备发送数据
       this._prepareSend(command.getData());
     },
     
     // 打印采购商品
     _printPurchaseGoods(command, batch) {
       var purGoodsArr = batch.nxDPGEntities;
       
       for (var j = 0; j < purGoodsArr.length; j++) {
         var item = purGoodsArr[j];
         var goodsName = item.nxDistributerGoodsEntity.nxDgGoodsName;
         var quantity = item.nxDpgQuantity;
         var standard = item.nxDpgStandard || item.nxDistributerGoodsEntity.nxDgGoodsStandardname;
         
         // 打印商品信息
         command.setText(j + 1 + ", ");
         command.setText(goodsName);
         command.setAbsolutePrintPosition(324);
         command.setText("  " + quantity + standard);
         command.setPrint();
         
         // 打印订单详情（不打印“订单详情：”这一行）
         if (item.nxDistributerGoodsEntity.nxDepartmentOrdersEntities && item.nxDistributerGoodsEntity.nxDepartmentOrdersEntities.length > 0) {
           for (var k = 0; k < item.nxDistributerGoodsEntity.nxDepartmentOrdersEntities.length; k++) {
             var order = item.nxDistributerGoodsEntity.nxDepartmentOrdersEntities[k];
             var orderQuantity = order.nxDoQuantity;
             var orderStandard = order.nxDoStandard;
             var orderRemark = order.nxDoRemark;
             
             // 构建订单信息字符串
             var orderInfo = "   ";
             
             // 处理部门信息
             if (order.gbDepartmentEntity !== null) {
               if (order.gbDepartmentEntity.gbDepartmentSubAmount > 1) {
                 // 有父部门
                 orderInfo += order.gbDepartmentEntity.fatherGbDepartmentEntity.gbDepartmentName + "." + order.gbDepartmentEntity.gbDepartmentName;
               } else {
                 // 只有当前部门
                 orderInfo += order.gbDepartmentEntity.gbDepartmentName;
               }
             } else if (order.nxRestrauntEntity !== null) {
               // 餐厅信息
               orderInfo += order.nxRestrauntEntity.nxRestrauntAttrName;
             } else if (order.nxDepartmentEntity !== null) {
               // 部门信息
               if (order.nxDepartmentEntity.fatherDepartmentEntity !== null) {
                 // 有父部门
                 orderInfo += order.nxDepartmentEntity.fatherDepartmentEntity.nxDepartmentName + "." + order.nxDepartmentEntity.nxDepartmentName;
               } else {
                 // 只有当前部门
                 orderInfo += order.nxDepartmentEntity.nxDepartmentName;
               }
             }
             
             // 添加订单数量和单位
             orderInfo += " 订:" + orderQuantity + orderStandard;
             
             // 添加备注信息
             if (orderRemark && orderRemark !== "null" && orderRemark.length > 0) {
               orderInfo += " (备注: " + orderRemark + ")";
             }
             
             // 打印订单信息
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
       var dateUtils = require('../../../utils/dateUtil');
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
               // 最后一次，打印完成
               that.setData({
                 printTimes: 0
               });
               wx.showToast({
                 title: '打印完成',
                 icon: 'success',
                 duration: 2000
               });
             }
           },
           fail: function (e) {
             console.log(e);
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
    
    onNavButtonTap() {
      wx.navigateTo({
        url: '../../../subPackage/pages/management/homePage/homePage',
      })
     },
     

    // methods
  },






})
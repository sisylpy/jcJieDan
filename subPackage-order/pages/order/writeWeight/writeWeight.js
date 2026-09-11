
const innerAudioContext = wx.createInnerAudioContext();
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil')

import {
  getOrderPageToOutWeightByDis,
  updateOrderWeight,
  giveOrderWeightListForStockShelfGoods,
  giveOrderWeightListForStockAndFinish
} from '../../../../lib/apiDepOrder.js'

Page({

  data: {
    hide: false,
    scrollTop: 0,
    depArr: [],
    edit: false,
    saveArr:  [],
    
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
        disId: disValue.nxDistributerId
      })
    }
    var userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.setData({
        userInfo: userInfo,
        userId: userInfo.nxDistributerUserId
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





  _initData(){
    var data = {
      disId: this.data.disInfo.nxDistributerId,
      depFatherId: this.data.depFatherId,
      gbDepFatherId: this.data.gbDepFatherId,
      orderBy: "time",
    }
    load.showLoading("获取订单中");
    var that = this;
    getOrderPageToOutWeightByDis(data)
      .then(res => {
        console.log("zahuishaaa" , res);

        if (res.result.code == 0) {
          load.hideLoading();
          var rawArr = (res.result.data && Array.isArray(res.result.data.arr)) ? res.result.data.arr : [];
          if(rawArr.length > 0){
            // 兼容接口返回 depOrders 字段，统一到 list，避免后续 list.length 报错
            var normalizedArr = rawArr;
            if (Number(this.data.depHasSubs) > 0) {
              normalizedArr = rawArr.map(function (dep) {
                if (!dep || typeof dep !== 'object') {
                  return { list: [] };
                }
                if (Array.isArray(dep.list)) {
                  return dep;
                }
                if (Array.isArray(dep.depOrders)) {
                  return Object.assign({}, dep, { list: dep.depOrders });
                }
                return Object.assign({}, dep, { list: [] });
              });
            }
            this.setData({
              applyArr: normalizedArr,
            })
            that._checkCanSave();
          }else{
            wx.navigateBack({delta: 1});
          }
         
      
        }else{
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
        if(this.data.depHasSubs > 0){
          oldValue =  this.data.applyArr[this.data.focusParentIndex].list[this.data.focusIndex].nxDoWeight;
        }else{
          oldValue =  this.data.applyArr[this.data.focusIndex].nxDoWeight;
        }
       
        var newValue = 0;
        if (oldValue !== null && oldValue !== '-1') {
          newValue = oldValue + value;
        } else {
          newValue = value
        }
        
        // 检查小数点后位数，最多保留2位
        var strValue = String(newValue);
        var dotIndex = strValue.indexOf(".");
        if (dotIndex !== -1) {
          var decimalPart = strValue.substring(dotIndex + 1);
          if (decimalPart.length > 2) {
            // 如果小数点后超过2位，不允许继续输入
            wx.showToast({
              title: '小数点后最多保留2位',
              icon: 'none'
            });
            return;
          }
        }
        
        if(this.data.depHasSubs > 0){
          this.setData({
            ["applyArr["+ this.data.focusParentIndex +"].list[" + this.data.focusIndex + "].nxDoWeight"]: newValue,
          })
        }else{
          this.setData({
            ["applyArr[" + this.data.focusIndex + "].nxDoWeight"]: newValue,
          })
        }
        
        this.try(value); // read 数字
       
      } else {

        console.log("点击了非数字")
        //2，输入“dian”
        if (value == ".") {
          // oldValue = this.data.applyArr[this.data.focusIndex].nxDoWeight;
        
        if(this.data.depHasSubs > 0){
          oldValue =  this.data.applyArr[this.data.focusParentIndex].list[this.data.focusIndex].nxDoWeight;
        }else{
          oldValue =  this.data.applyArr[this.data.focusIndex].nxDoWeight;
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
            //   ["applyArr[" + this.data.focusIndex + "].nxDoWeight"]: newValue,
            // })
            if(this.data.depHasSubs > 0){
              this.setData({
                ["applyArr["+ this.data.focusParentIndex +"].list[" + this.data.focusIndex + "].nxDoWeight"]: newValue,
              })
            }else{
              this.setData({
                ["applyArr[" + this.data.focusIndex + "].nxDoWeight"]: newValue,
              })
            }
          }   
        }
        //2，输入“删除”
        if (value == "del") {
          // oldValue = this.data.applyArr[this.data.focusIndex].nxDoWeight;
        
          if(this.data.depHasSubs > 0){
            oldValue =  this.data.applyArr[this.data.focusParentIndex].list[this.data.focusIndex].nxDoWeight;
          }else{
            oldValue =  this.data.applyArr[this.data.focusIndex].nxDoWeight;
          }
         
          newValue = oldValue.substr(0, oldValue.length - 1);
          if (newValue.length > 0) {
            if(this.data.depHasSubs > 0){
              this.setData({
                ["applyArr["+ this.data.focusParentIndex +"].list[" + this.data.focusIndex + "].nxDoWeight"]: newValue,
              })
            }else{
              this.setData({
                ["applyArr[" + this.data.focusIndex + "].nxDoWeight"]: newValue,
              })
            }

          } else {
            if(this.data.depHasSubs > 0){
              this.setData({
                ["applyArr["+ this.data.focusParentIndex +"].list[" + this.data.focusIndex + "].nxDoWeight"]: "",
              })
            }else{
              this.setData({
                ["applyArr[" + this.data.focusIndex + "].nxDoWeight"]: "",
              })
            }
          }
          this.try("delete") // read 清除
          
        }

        //3，输入“关闭”
        if (value == "close") {
          if(this.data.depHasSubs > 0){
            if (this.data.applyArr[this.data.focusParentIndex].list[this.data.focusIndex].nxDoWeight !== null) {
              this._save();
            }
            this.setData({
              focusParentIndex: -1,
              focusIndex: -1,
              lastInput: true,
            })
          }else{
            if (this.data.applyArr[this.data.focusIndex].nxDoWeight !== null) {
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
          if(this.data.depHasSubs > 0){

            if (this.data.applyArr[this.data.focusParentIndex].list[this.data.focusIndex].nxDoWeight !== null) {
              this._save();
            }
            var focusIndex = this.data.focusIndex;
            var focusParentIndex = this.data.focusParentIndex;

            if (focusIndex !== this.data.applyArr[this.data.focusParentIndex].list.length - 1) {
              console.log("order+!11111");
              this.setData({
                focusIndex: focusIndex + 1,
              })
            } else {
              if(focusParentIndex !== this.data.applyArr.length - 1){
                console.log("deppdpdpdppdpdppdpp+!11111");
                this.setData({
                  focusParentIndex: focusParentIndex + 1,
                  focusIndex: 0,
                  lastInput: true
                })
              }else{
                console.log("lasososososososososoossoo")
                this.setData({
                  focusParentIndex: -1,
                  focusIndex: -1,
                  lastInput: true
                })
              }             
            }
          }else{
            if (this.data.applyArr[this.data.focusIndex].nxDoWeight !== null) {
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
    if(this.data.depHasSubs > 0){
      if (this.data.focusIndex !== -1 && this.data.focusParentIndex !== -1) {
        var itemPrice = this.data.applyArr[this.data.focusParentIndex].list[this.data.focusIndex].nxDoWeight;
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
    }else{
      if (this.data.focusIndex !== -1) {
        var itemPrice = this.data.applyArr[this.data.focusIndex].nxDoWeight;
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
    if (this.data.focusIndex !== -1 && this.data.applyArr[this.data.focusIndex].nxDoWeight !== null) {
      this._save();
    }
    var index = e.currentTarget.dataset.index;
    var orderData = this.data.applyArr[index].nxDepartmentDisGoodsEntity.nxDdgOrderPrice;
    var orderPrice = "applyArr[" + index + "].nxDoWeight";
    this.setData({
      focusIndex: index,
      [orderPrice]: orderData,
    })
    this._save();
  },


  _save(){
    this._savePriceOrder();
  },


  toGoodsDetail(e){
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
    if(this.data.depHasSubs > 0){
      itemOrder = this.data.applyArr[this.data.focusParentIndex].list[this.data.focusIndex];
      itemOrderPrice = this.data.applyArr[this.data.focusParentIndex].list[this.data.focusIndex].nxDoWeight;
  
    }else{
      itemOrder = this.data.applyArr[this.data.focusIndex];
      itemOrderPrice = this.data.applyArr[this.data.focusIndex].nxDoWeight;
    }
    if (itemOrderPrice !== null && itemOrderPrice > 0) {
      var data = {
        orderId: itemOrder.nxDepartmentOrdersId,
        weight: itemOrderPrice
      }
      updateOrderWeight(data).then(res => {
        if (res.result.code == 0) { 
          this._initData()
        }
      })
    }
  },


  

  toBack() {
     if(this.data.depHasSubs > 0){
      if (this.data.focusParentIndex !== -1 && this.data.focusIndex !== -1 && this.data.applyArr[this.data.focusParentIndex].list[this.data.focusIndex].nxDoWeight !== null) {
        this._save();
      }
     }else{
      if (this.data.focusIndex !== -1 && this.data.applyArr[this.data.focusIndex].nxDoWeight !== null) {
        this._save();
      }
     }
  
    wx.navigateBack({
      delta: 1,
    })
  },




  _getProfit(){
    console.log("getpfrororor");
    var itemOrder = this.data.applyArr[this.data.focusIndex];
    var costPrice = itemOrder.nxDoCostPrice;
    var weight = itemOrder.nxDoWeight;
    var costSutbotal = (Number(costPrice) * Number(weight)).toFixed(1);
    var price = itemOrder.nxDoWeight;
    var subtotal = (Number(price) * Number(weight)).toFixed(1);
    var proft = (Number(subtotal) - Number(costSutbotal)).toFixed(1);
    var data = "applyArr[" + this.data.focusIndex+"].nxDoProfitSubtotal";
    var dataScale = "applyArr[" + this.data.focusIndex+"].nxDoProfitScale";
    var scale = (((Number(price) - Number(costPrice)) / Number(price))* Number(100)).toFixed(1);
    this.setData({
      [data]: proft,
      [dataScale]: scale,
    })
  },


  selectOrder(e){
    console.log("sellcroor", e);
    var that = this;
    var index = e.currentTarget.dataset.index;
    if(this.data.depHasSubs > 0){
      var depIndex = e.currentTarget.dataset.depindex;
      var choice = this.data.applyArr[depIndex].list[index].purSelected;
      var data = "applyArr[" + depIndex +"].list[" + index +"].purSelected";
      console.log(choice);
      if(choice){
        this.setData({
          [data]: false
        })
      }else{
        this.setData({
          [data]: true
        })
      }

    }else{
      var index = e.currentTarget.dataset.index;
      var choice = this.data.applyArr[index].purSelected;
      var data = "applyArr[" + index +"].purSelected";
      console.log(choice);
      if(choice){
        this.setData({
          [data]: false
        })
      }else{
        this.setData({
          [data]: true
        })
      }
    }

    that._checkCanSave();
   
  },

  _checkCanSave(){
    console.log("========== _checkCanSave 开始 ==========");
    var depHasSubs = this.data.depHasSubs;
    console.log("depHasSubs:", depHasSubs);
    var selCount = 0;
    var temp = [];
    
    if(depHasSubs > 0){
      console.log("--- 处理有子部门的情况 ---");
      var arr = Array.isArray(this.data.applyArr) ? this.data.applyArr : [];
      console.log("applyArr 长度:", arr.length);
      
      for(var i = 0; i < arr.length; i++){
        var depItem = arr[i] || {};
        var list = Array.isArray(depItem.list)
          ? depItem.list
          : (Array.isArray(depItem.depOrders) ? depItem.depOrders : []);
        console.log(`部门[${i}] list 长度:`, list.length);
        
        if(list.length > 0){
          for(var j = 0; j < list.length; j++){ 
            console.log(`商品[${i}][${j}]:`, {
              purSelected: list[j].purSelected,
              nxDoWeight: list[j].nxDoWeight,
              nxDgGoodsName: list[j].nxDgGoodsName
            });
            
            // 检查重量是否有效（不能是 null、'-1'、空字符串、undefined、0）
            var hasValidWeight = list[j].nxDoWeight !== null && 
                                 list[j].nxDoWeight !== '-1' && 
                                 list[j].nxDoWeight !== '' && 
                                 list[j].nxDoWeight !== undefined &&
                                 list[j].nxDoWeight !== 0 &&
                                 list[j].nxDoWeight !== '0';
            
            if(list[j].purSelected && hasValidWeight){
              console.log(`✓ 商品[${i}][${j}] 符合条件，selCount: ${selCount} -> ${selCount + 1}`);
              selCount =  selCount + 1;
              temp.push(list[j]);
            } else {
              console.log(`✗ 商品[${i}][${j}] 不符合条件 (purSelected: ${list[j].purSelected}, hasValidWeight: ${hasValidWeight})`);
              // 如果没有有效重量，自动取消选中
              if(list[j].purSelected && !hasValidWeight){
                console.log(`  → 自动取消选中商品[${i}][${j}]（没有有效重量）`);
                list[j].purSelected = false;
              }
            }
          }
        }
      }
      
    }else{
      console.log("--- 处理无子部门的情况 ---");
      var arr = this.data.applyArr;
      console.log("applyArr 长度:", arr.length);
      
      for(var i = 0; i < arr.length; i++){
        console.log(`商品[${i}]:`, {
          purSelected: arr[i].purSelected,
          nxDoWeight: arr[i].nxDoWeight,
          nxDgGoodsName: arr[i].nxDgGoodsName
        });
        
        // 检查重量是否有效（不能是 null、'-1'、空字符串、undefined、0）
        var hasValidWeight = arr[i].nxDoWeight !== null && 
                             arr[i].nxDoWeight !== '-1' && 
                             arr[i].nxDoWeight !== '' && 
                             arr[i].nxDoWeight !== undefined &&
                             arr[i].nxDoWeight !== 0 &&
                             arr[i].nxDoWeight !== '0';
        
        if(arr[i].purSelected && hasValidWeight){
          console.log(`✓ 商品[${i}] 符合条件，selCount: ${selCount} -> ${selCount + 1}`);
          selCount =  selCount + 1;
          temp.push(arr[i]);
        } else {
          console.log(`✗ 商品[${i}] 不符合条件 (purSelected: ${arr[i].purSelected}, hasValidWeight: ${hasValidWeight})`);
          // 如果没有有效重量，自动取消选中
          if(arr[i].purSelected && !hasValidWeight){
            console.log(`  → 自动取消选中商品[${i}]（没有有效重量）`);
            arr[i].purSelected = false;
          }
        }
      }
    }
    
    console.log("最终 selCount:", selCount);
    console.log("最终 temp 长度:", temp.length);
    
    // 更新数据，触发界面刷新（取消选中没有重量的商品）
    this.setData({
      applyArr: this.data.applyArr
    })
    
    if(selCount > 0){
      this.setData({
        canSave: true,
        saveArr: temp,
      })
      console.log("✓ 可以保存，saveArr:", this.data.saveArr);
    }else{
      this.setData({
        canSave: false,
        saveArr: temp,
      })
      console.log("✗ 不能保存");
    }
    console.log("========== _checkCanSave 结束 ==========\n");
  },
  

  saveStock() {
    var arrNeed = this.data.saveArr;
    var pickUserId = this.data.userId;
    if ((pickUserId === undefined || pickUserId === null || pickUserId === '') && this.data.userInfo) {
      pickUserId = this.data.userInfo.nxDistributerUserId;
    }
    if (arrNeed.length > 0 && pickUserId !== undefined && pickUserId !== null && pickUserId !== '') {
      for (var p = 0; p < arrNeed.length; p++) {
        arrNeed[p].nxDoPickUserId = pickUserId;
      }
    }
    console.log("varrneneelelel" , arrNeed.length);
    if (arrNeed.length > 0) {
      load.showLoading("保存数据中");  if(this.data.disInfo.nxDistributerBusinessTypeId > 2){
        giveOrderWeightListForStockShelfGoods(arrNeed).then(res => {
          load.hideLoading();
          if (res.result.code == 0) {
            this._initData();
          } else {
            wx.showToast({
              title: res.result.msg || '保存失败',
              icon: 'none'
            })
          }
        })
      }else{
        giveOrderWeightListForStockAndFinish(arrNeed).then(res => {
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
      // giveOrderWeightListForStockAndFinish(arrNeed).then(res => {
      //   load.hideLoading();
      //   if (res.result.code == 0) { 

      //   this._initData();
         
      //   }else{
      //     wx.showToast({
      //       title: 'res.result.msg',
      //       icon: 'none'
      //     })
      //   }
      // })

    }else{
      wx.showToast({
        title: '没有可以出库的订单',
        icon: 'none'
      })
    }
  },


})

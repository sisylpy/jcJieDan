
var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config.js';
let windowWidth = 0;
let itemWidth = 0;

import {
  disGetGoodsDetail,
  disSaveStandard,
  disUpdateStandard,
  disGoodsUpdate,
  saveDisAlias,
  disDeleteStandard,
  disDeleteAlias,
  updateDisAlias,
  addTraceReportToGoods,
  updateDepGoodsSellingPrice

} from '../../../../lib/apiDistributer'
//
import {cancleDownDisGoods} from '../../../lib/apiibook'

Page({
  data:{
   
    tabs: ["订货参数","订单", "上货",  "客户"],
    hide: false,
    scrollTop: 0,
    showAdd: false,
    showAddAlias: false,
    type: null,
    depGoodsName: "",
    itemStandard: "",
    modalContentHeight: "",
    modalHeight: "",
    scrollViewTop: "",
    standardName: "",
    depGoodsName: "",
    itemAlias: [],
    modalContentHeight: "",
    modalHeight: "",
    itemStandard: "",
    modalHeight: "",
    modalHeight: "",
    type: "",
    modalHeight: "",
    showOperationPrice: false,
    depGoodsId: "",
    sellingPrice: "",
    orderName: "",
    pickDetail: "",
    // 溯源报告相关
    showAddTraceReport: false,
    traceReportFile: '',
    traceReportFilePreview: '',
    traceReportFileName: '',
    isImageFile: false,
    nxTrSupplierName: '',
    nxTrSupplierContact: '',
    nxTrPurchaseDate: '',
    nxTrStockInDate: '',
    nxTrValidStartDate: '',
    nxTrValidEndDate: '',
    nxTrRemark: ''
  },

  onShow(){
    if(this.data.update){
      this._getGoodsDetail();
    }
   
  },

  onLoad: function(options){
    const app = getApp();
    const globalData = app.globalData;

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      editIndex: options.editIndex,
      disGoodsId: options.disGoodsId,
      goodsName: options.goodsName,
      color: options.color,
      type: options.type,
      fatherName: options.fatherName,
      goods: null,
      from: options.from

    })

   
  //
  var disInfo = wx.getStorageSync('disInfo');
  if(disInfo){
    this.setData({
      disInfo: disInfo
    })
  }
  var value = wx.getStorageSync('userInfo');
  if(value){
    this.setData({
      disId: value.nxDistributerEntity.nxDistributerId,
      userInfo: value
    })
  }

    if(this.data.type == 'order'){
      this.setData({
        tab1Index: 1,
        itemIndex: 1,
      })
    } else if(this.data.type == 'purchase'){
      this.setData({
        tab1Index: 2,
        itemIndex: 2,
      })
    }else{
      this.setData({
        tab1Index:0,
        itemIndex:0,
        sliderOffset: 0,
      })
    }
    this.clueOffset();
    this._getGoodsDetail();
  },
  
  _getGoodsDetail() {
    load.showLoading("获取商品信息")
    disGetGoodsDetail(this.data.disGoodsId).then(res => {
      if (res.result.code == 0) {
        console.log(res.result.data.orderArr);
        load.hideLoading();
        this.setData({
          goods: res.result.data.goodsInfo,
          departmentArr: res.result.data.departmentArr,
          gbDepartmentArr: res.result.data.gbDepartmentArr,
          orderArr: res.result.data.orderArr,
          purchaseArr: res.result.data.purchaseArr,
        })
      }else{
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
        })
      }
       //创建节点选择器
       var that = this;
       var query = wx.createSelectorQuery();
       //选择id
       query.select('#mjltest').boundingClientRect()
       query.exec(function (res) {
         const app = getApp();
         const globalData = app.globalData;
         that.setData({
           topViewHeight: res[0].height * globalData.rpxR
         })
       })
    })
  },
 
  /**
   * 计算偏移量
   */
  clueOffset() {
    var that = this;
    wx.getSystemInfo({
      success: function (res) {
        itemWidth = Math.ceil(res.windowWidth / that.data.tabs.length);
        let tempArr = [];
        for (let i in that.data.tabs) {
          tempArr.push(itemWidth * i);
        }
        // tab 样式初始化
        windowWidth = res.windowWidth;
        const app = getApp();
        const globalData = app.globalData;
        that.setData({
          sliderOffsets: tempArr,
          sliderOffset: tempArr[that.data.itemIndex] ,
          windowWidth: globalData.windowWidth * globalData.rpxR,
          windowHeight: globalData.windowHeight * globalData.rpxR,
        });
      }
    });
  },

  /**
   * tabItme点击
   */
  onTab1Click(event) {
    let index = event.currentTarget.dataset.index;
    this.setData({
      sliderOffset: this.data.sliderOffsets[index],
      tab1Index: index,
      itemIndex: index,
    })
  },

  swiperChange(event) {
    this.setData({
      sliderOffset: this.data.sliderOffsets[event.detail.current],
      tab1Index: event.detail.current,
      itemIndex: event.detail.current,
    })
  },


  /**
   * 显示操作面板，选择被操作商品
   * @param {}} e 
   */
  openOperation(e) {
    this.setData({
      showOperation: true,
      standardName: "",
      depGoodsName: "",
      aliasName: "",
      itemAlias:"",
      itemStandard:""
    })
  },

  /**
   * 添加订货单位
   */
  addStandard(e) {
    this.setData({
      showAdd: true,
      depGoodsName: this.data.goods.nxDgGoodsName,
      standardName: ""
    })
  },


  /**
   * 弹窗获取页面高度
   * @param {*} e 
   */
  getFocus(e) {
    const app = getApp();
    const globalData = app.globalData;
    var modalContentHeight =(globalData.windowHeight - e.detail.keyboardHeight) * globalData.rpxR ;
    this.setData({
      modalContentHeight: modalContentHeight
    })
  },

  /**
   * 点击订货单位
   * @param {*} e 
   */
  clickItem(e) {
    this.setData({
      depGoodsName: this.data.goods.nxDgGoodsName,
    })

    if(e.currentTarget.dataset.type == "standard"){
      this.setData({
        choiceType: "standard",
        showChoice: true,
        showOperation: true,
        indexStandand: e.currentTarget.dataset.index,
        itemStandard: e.currentTarget.dataset.itemstandard,
      })
    }if(e.currentTarget.dataset.type == "alias"){
      this.setData({
        choiceType: "alias",
        showChoice: true,
        showOperation: true,
        indexAlias: e.currentTarget.dataset.index,
        itemAlias: e.currentTarget.dataset.itemalias,
      })
    }
   
  },

  /**
   * 点击订货单位后，选择-“修改”
   * todo
   */
  edit() {
    if(this.data.choiceType == "standard"){
      this.setData({
        showAdd: true,
        editStandard: true,
        showChoice: false,
        showOperation: false,

      })
    }if(this.data.choiceType == "alias"){
      this.setData({
        editAlias: true,
        showAddAlias: true,
        showChoice: false,
        showOperation: false,
      })

    }
   
  },
  /**
   * 点击订货单位后，选择-“删除”
   * todo
   */
  delete() {
    var that  = this;
    if(this.data.choiceType == "standard"){
      var disStandardId = this.data.itemStandard.nxDistributerStandardId;
    
      disDeleteStandard(disStandardId).then(res => {
        if (res.result.code == 0) {
        
          var standardArr = that.data.goods.nxDistributerStandardEntities;
          standardArr.splice(that.data.indexStandand, 1);
          var up = "goods.nxDistributerStandardEntities";
          that.setData({
            [up]: standardArr,
          })
          that._updateLastData();
         
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
        
      })
    }if(this.data.choiceType == "alias"){
      var disAliasId = this.data.itemAlias.nxDistributerAliasId;
      disDeleteAlias(disAliasId).then(res => {
        if (res.result.code == 0) {
          var aliasArr = that.data.goods.nxDistributerAliasEntities;
          aliasArr.splice(that.data.indexAlias, 1);
          var up = "goods.nxDistributerAliasEntities";
          that.setData({
            [up]: aliasArr,
          })
          that._updateLastData();
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
       
      })
    }
    this.setData({
      standardName: "",
      depGoodsName: "",
      itemStandard: "",
      itemAlias: "",
    })
   
  },


  /**
   * 添加或修改订货单位
   * @param {}} e 
   */
  confirmStandard(e) {
    if (this.data.editStandard) {
      this._updateStandard(e);
    } else {
      this._saveStandard(e);
    }
    this.setData({
      standardName: "",
      depGoodsName: "",
      itemStandard: "",
      editStandard: false,
      showChoice: false,
    })
  },
  /**
   * 保存订货单位
   * @param {}} e 
   */
  _saveStandard(e) {
    var data = {
      nxDsDisGoodsId: this.data.goods.nxDistributerGoodsId,
      nxDsStandardName: e.detail.standardName,
    }
    var that = this;
    disSaveStandard(data).
    then(res => {
      if (res.result.code == 0) {
      
        var standardArr = that.data.goods.nxDistributerStandardEntities;
        standardArr.push(res.result.data);
        var standards = "goods.nxDistributerStandardEntities"
        that.setData({
          [standards]: standardArr,
          itemstandard: "",
        })
        that._updateLastData();
      }else{
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },

  _updateLastData(){
    var pages = getCurrentPages();
    var prevPage = pages[pages.length - 2]; //上一个页面
    
    if(this.data.from == 'search'){
      prevPage.setData({
        update: true,
      })
    } else if(this.data.from == 'index'){
      // 从商品列表页面来的，需要更新对应的商品数据
      var editIndex = parseInt(this.data.editIndex);
      if(prevPage.data.goodsList && prevPage.data.goodsList[editIndex]){
        var data = "goodsList[" + editIndex + "]";
        prevPage.setData({
          [data]: this.data.goods,
        })
        console.log("更新商品数据成功，索引:", editIndex);
      } else {
        console.log("无法更新商品数据，索引:", editIndex, "商品列表长度:", prevPage.data.goodsList ? prevPage.data.goodsList.length : 0);
        // 如果无法更新特定商品，则刷新整个列表
        if(prevPage._getCataGoods){
          prevPage._getCataGoods();
        }
      }
      // 设置刷新标识，确保返回商品列表页面时刷新数据
      wx.setStorageSync('goodsNeedRefresh', true);
    } else {
      // 其他情况，尝试更新对应索引的商品
      var data = "goodsList[" + this.data.editIndex + "]";
      prevPage.setData({
        [data]: this.data.goods,
      })
      // 设置刷新标识
      wx.setStorageSync('goodsNeedRefresh', true);
    }
    
    // 更新当前页面的商品名称（顶部显示）
    this.setData({
      goodsName: this.data.goods.nxDgGoodsName
    })
  },
  /**
   * 更新订货单位
   * @param {}} e 
   */
  _updateStandard(e) {
    var data = {
      nxDistributerStandardId: this.data.itemStandard.nxDistributerStandardId,
      nxDsStandardName: e.detail.standardName,
    }
    var that  = this;
    disUpdateStandard(data).
    then(res => {
      if (res.result.code == 0) {
        var standard = "goods.nxDistributerStandardEntities["+ that.data.indexStandand+"]";
        that.setData({
          [standard]: data,
          itemstandard: "",
        })
        that._updateLastData();
      }
    })
  },

  /**
   * 添加Alias
   * @param {} e 
   */
  addDisAlias: function (e) {
    this.setData({
      editAlias:false,
      aliasName: "",
      showAddAlias: true,
      depGoodsName: this.data.goods.nxDgGoodsName,
    })
  },
//

  /**
   * 规格弹窗点击确认
   * @param {*} e 
   */
  confirmAlias: function (e) {

    if (this.data.editAlias) {
      this._updateAlias(e);
    } else {
      this._saveAlias(e);
    }
    this.setData({
      aliasName: "",
      depGoodsName: "",
      itemAlias: "",
      editAlias: false,
      showAlias: false,
    })
  },

  cancle(){
    this.setData({
      aliasName: "",
      depGoodsName: "",
      itemAlias: "",
      editAlias: false,
      showAlias: false,
    })
  },
  /**
   * 修改别名
   * @param {*} e 
   */
  _updateAlias(e) {


    var data = {
      nxDistributerAliasId: this.data.itemAlias.nxDistributerAliasId,
      nxDaAliasName: e.detail.aliasName,
    }
    var that = this;
    load.showLoading("更新别名");
    updateDisAlias(data).then(res => {
      if (res.result.code == 0) {
        load.hideLoading();
        var alias = "goods.nxDistributerAliasEntities["+ that.data.indexAlias+"]";
        that.setData({
          [alias]: data,
          itemAlias: "",
        })
        that._updateLastData();

    } else {
        load.hideLoading();
        wx.showToast({
          title: '更新规格失败',
          icon: 'none'
        })
    }
  })

  },



  /**
   * 保存别名
   * @param {*} e 
   */
  _saveAlias(e) {
    var data = {
      nxDaDisGoodsId: this.data.goods.nxDistributerGoodsId,
      nxDaAliasName: e.detail.aliasName,
    }
    var that = this;
    saveDisAlias(data).then(res => {
      if (res.result.code == 0) {
        var up = "goods"
        that.setData({
          [up]: res.result.data,
          itemAlias: "",
        })
        that._updateLastData();

      } else {
        load.hideLoading();
        wx.showToast({
          title: '获取商品失败',
          icon: 'none'
        })
      }
     
    })
  },



  /**
   * 关闭操作面板
   */
  hideMask() {
    this.setData({
      showOperation: false,
      showChoice: false,
     
    })
  },
  
  //删除商品
  deleteDisGoods(e){

    var data = {
      disId: this.data.disId,
      disGoodsId: this.data.goods.nxDistributerGoodsId,
      disGoodsFatherId: this.data.goods.nxDgDfgGoodsFatherId,
    }
    load.showLoading("删除商品")
    cancleDownDisGoods(data).then(res =>{
      if(res.result.code == 0){
        console.log(res);
        load.hideLoading();
        var pages = getCurrentPages();
        var prevPage1 = pages[pages.length - 2];

        // 判断上一页是否有 goodsList（商品列表页面）
        if (prevPage1 && prevPage1.data.goodsList && prevPage1.data.goodsList.length > 0) {
          var arr = prevPage1.data.goodsList;
          const index = Number(this.data.editIndex);

          if (arr && arr.length > index) {
            arr.splice(index, 1);
            // 更新 prevPage1 的数据
            prevPage1.setData({
              goodsList: arr
            });
          }
        }

        // 如果是从货架商品搜索页面打开的，通知上一页刷新
        if (this.data.from === 'shelfGoodsSearch' && prevPage1 && prevPage1.refreshShelfGoods) {
          prevPage1.refreshShelfGoods();
        }

        // 如果是从货架首页打开的，通知上一页刷新
        if (this.data.from === 'shelfIndex' && prevPage1 && prevPage1.refreshShelfGoods) {
          prevPage1.refreshShelfGoods();
        }

        wx.navigateBack({
          delta: 1
        })

      }else{
        wx.showToast({
          title: res.result.msg,
          icon: "none"
        })
      }
    })
  },

 
  
 //暂停订货
  switchChange(e) {
    if(e.currentTarget.dataset.type == 'pull'){
      // 订货端显示开关
      var pullOff = "goods.nxDgPullOff"
      
      if (e.detail.value) {
        // 开启订货端显示，同时关闭停止配送（互斥）
        this.setData({
          [pullOff]: "1",
          "goods.nxDgGoodsIsHidden": "0"
        })
      } else {
        // 关闭订货端显示，不影响停止配送状态
        this.setData({
          [pullOff]: "0"
        })
      }
     
    } else if(e.currentTarget.dataset.type == 'hidden'){
      // 停止配送开关
      var hidden = "goods.nxDgGoodsIsHidden"
      
      if (e.detail.value) {
        // 开启停止配送，同时关闭订货端显示（互斥）
        this.setData({
          [hidden]: "1",
          "goods.nxDgPullOff": "0"
        })
      } else {
        // 关闭停止配送，不影响订货端显示状态
        this.setData({
          [hidden]: "0"
        })
      } 
    }
    var that = this;
    disGoodsUpdate(this.data.goods).then(res =>{
      if(res.result.code == 0){
        console.log(res.result.data);
        wx.showToast({
          title: '修改成功',
        })
        that._updateLastData();
      }
    })
  },

  toOpenDetail(e){
    console.log("toOpenDetailtoOpenDetail")
    wx.setStorageSync('disGoods', this.data.goods)
    wx.navigateTo({
      url: '../disGoodsDetail/disGoodsDetail?color=' + this.data.color + '&disId=' + this.data.disId ,
      
    })
  },

  
  exchangeGoods(e){
   
    this.setData({
      updatePage: true,
    })
    wx.setStorageSync('exchangeItem', this.data.goods)
    wx.navigateTo({
      url: '../../goods/disAddGoods/greatGrandGoods/greatGrandGoods?disId=' + this.data.disId + '&type=exchange', 
    })
  },



// ////////////


  toDepartments(){
    wx.navigateTo({
      url: '../addDepGoods/addDepGoods?disGoodsId=' + this.data.disGoodsId
       + '&goodsName=' + this.data.goodsName,
    })

  },


  toOut(e){
    wx.setStorageSync('disGoods', this.data.goods)
    wx.navigateTo({
      url: '../shelfGoodsBusiness/shelfGoodsBusiness?name=' + this.data.goodsName
      +'&disGoodsId=' + this.data.disGoodsId,
    })
  },


  addBrotherGoods(){
    wx.setStorageSync('brotherGoods', this.data.goods);
    wx.navigateTo({
      url: '../disAddGoodsNx/disAddGoodsNx?focusIndex=' + this.data.editIndex,
    })
  },


  
  toBack(){
    wx.navigateBack({
      delta: 1,
    })
  },
  

  // 编辑客户商品价格
  selDepartment(e){
    var item = e.currentTarget.dataset.depgoods;
    this.setData({
      depGoodsId: item.nxDepartmentDisGoodsId,
      showOperationPrice: true,
      selectedDepGoods: item,
      sellingPrice: item.nxDdgOrderPrice,
      orderName: item.nxDdgOrderGoodsName,
      pickDetail: item.nxDdgPickDetail
    })
  },

  inputSellingPrice(e){
    this.setData({
      sellingPrice: e.detail.value,
    })
  },

  inputOrderName(e){
    this.setData({
      orderName: e.detail.value,
    })
  },

  inputPickDetail(e){
    this.setData({
      pickDetail: e.detail.value,
    })
  },

  hideMaskPrice(){
    this.setData({
      showOperationPrice: false
    })
  },

  _updateDepGoods(){
    var data = {
      depGoodsId: this.data.depGoodsId,
      sellingPrice: this.data.sellingPrice,
      pickDetail: this.data.pickDetail,
      orderName: this.data.orderName,
    }
    load.showLoading("更新中");
    updateDepGoodsSellingPrice(data).then(res =>{
      if(res.result.code == 0){
        load.hideLoading();
        this.setData({
          showOperationPrice: false,
          depGoodsId: "",
          sellingPrice: "",
          orderName: "",
          pickDetail: ""
        })
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        })
        // 刷新商品详情
        this._getGoodsDetail();
      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },

  // 显示添加溯源报告弹窗
  showAddTraceReport() {
    // 获取今天的日期作为默认开始日期
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;
    
    this.setData({
      showAddTraceReport: true,
      traceReportFile: '',
      traceReportFilePreview: '',
      traceReportFileName: '',
      isImageFile: false,
      nxTrSupplierName: '',
      nxTrSupplierContact: '',
      nxTrPurchaseDate: '',
      nxTrStockInDate: '',
      nxTrValidStartDate: todayStr, // 默认开始日期为今天
      nxTrValidEndDate: '',
      nxTrRemark: ''
    })
  },

  // 关闭添加溯源报告弹窗
  closeAddTraceReport() {
    this.setData({
      showAddTraceReport: false
    })
  },

  // 阻止弹窗关闭
  preventClose() {},

  // 选择溯源报告文件
  chooseTraceReportFile() {
    const that = this;
    wx.showActionSheet({
      itemList: ['选择图片', '选择PDF文件'],
      success(res) {
        if (res.tapIndex === 0) {
          // 选择图片
          wx.chooseImage({
            count: 1,
            sizeType: ['original', 'compressed'],
            sourceType: ['album', 'camera'],
            success(res) {
              const tempFilePath = res.tempFilePaths[0];
              const fileName = tempFilePath.split('/').pop() || 'image.jpg';
              that.setData({
                traceReportFile: tempFilePath,
                traceReportFilePreview: tempFilePath,
                traceReportFileName: fileName,
                isImageFile: true
              });
              wx.showToast({
                title: '图片已选择',
                icon: 'success',
                duration: 1500
              });
            },
            fail(err) {
              console.error('选择图片失败', err);
              wx.showToast({
                title: '选择图片失败',
                icon: 'none'
              });
            }
          });
        } else if (res.tapIndex === 1) {
          // 选择PDF文件
          // 注意：wx.chooseMessageFile 会打开聊天文件选择器，这是正常行为
          wx.chooseMessageFile({
            count: 1,
            type: 'file',
            extension: ['pdf'],
            success(res) {
              if (res.tempFiles && res.tempFiles.length > 0) {
                const tempFilePath = res.tempFiles[0].path;
                const fileName = res.tempFiles[0].name || 'document.pdf';
                that.setData({
                  traceReportFile: tempFilePath,
                  traceReportFilePreview: '',
                  traceReportFileName: fileName,
                  isImageFile: false
                });
                wx.showToast({
                  title: 'PDF文件已选择',
                  icon: 'success',
                  duration: 1500
                });
              } else {
                wx.showToast({
                  title: '未选择文件',
                  icon: 'none'
                });
              }
            },
            fail(err) {
              console.error('选择PDF文件失败', err);
              // 如果是用户取消，不显示错误提示
              if (err.errMsg && !err.errMsg.includes('cancel')) {
                wx.showToast({
                  title: '选择PDF文件失败',
                  icon: 'none'
                });
              }
            }
          });
        }
      }
    });
  },

  // 删除选择的溯源报告文件
  deleteTraceReportFile() {
    this.setData({
      traceReportFile: '',
      traceReportFilePreview: '',
      traceReportFileName: '',
      isImageFile: false
    });
  },

  // 获取供应商名称
  getSupplierName(e) {
    this.setData({
      nxTrSupplierName: e.detail.value
    });
  },

  // 获取供应商联系方式
  getSupplierContact(e) {
    this.setData({
      nxTrSupplierContact: e.detail.value
    });
  },

  // 获取采购日期
  getPurchaseDate(e) {
    this.setData({
      nxTrPurchaseDate: e.detail.value
    });
  },

  // 获取入库日期
  getStockInDate(e) {
    this.setData({
      nxTrStockInDate: e.detail.value
    });
  },

  // 获取有效期开始日期
  getValidStartDate(e) {
    this.setData({
      nxTrValidStartDate: e.detail.value
    });
  },

  // 获取有效期结束日期
  getValidEndDate(e) {
    this.setData({
      nxTrValidEndDate: e.detail.value
    });
  },

  // 获取溯源报告备注
  getTraceReportRemark(e) {
    this.setData({
      nxTrRemark: e.detail.value
    });
  },

  // 确认添加溯源报告
  confirmAddTraceReport() {
    // 使用 goods 对象的 ID
    const goodsId = this.data.goods?.nxDistributerGoodsId;
    if (!goodsId) {
      wx.showToast({
        title: '商品ID不存在',
        icon: 'none'
      });
      return;
    }

    const formData = {
      nxDistributerGoodsId: String(goodsId),
      nxTrSupplierName: this.data.nxTrSupplierName || '',
      nxTrSupplierContact: this.data.nxTrSupplierContact || '',
      nxTrPurchaseDate: this.data.nxTrPurchaseDate || '',
      nxTrStockInDate: this.data.nxTrStockInDate || '',
      nxTrValidStartDate: this.data.nxTrValidStartDate || '',
      nxTrValidEndDate: this.data.nxTrValidEndDate || '',
      nxTrRemark: this.data.nxTrRemark || ''
    };

    // 如果有用户信息，添加创建用户ID
    if (this.data.userInfo && this.data.userInfo.nxDistributerUserId) {
      formData.createUserId = String(this.data.userInfo.nxDistributerUserId);
    }

    load.showLoading('添加中...');
    
    addTraceReportToGoods({
      filePath: this.data.traceReportFile || null,
      ...formData
    }).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        wx.showToast({
          title: '添加成功',
          icon: 'success'
        });
        // 关闭弹窗并刷新商品详情
        this.setData({
          showAddTraceReport: false
        });
        // 刷新商品详情
        this._getGoodsDetail();
      } else {
        wx.showToast({
          title: res.result.msg || '添加失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      load.hideLoading();
      console.error('添加溯源报告失败:', err);
      wx.showToast({
        title: '添加失败，请重试',
        icon: 'none'
      });
    });
  },


  onUnload() {
    wx.removeStorageSync('disGoods');
    wx.removeStorageSync('notUpdate');
  },


})
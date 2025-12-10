var load = require('../../../../lib/load.js');
let scrollDdirection = 0; // 用来计算滚动的方向

import apiUrl from '../../../../config.js'

import {
 

  disGetStockGoodsNew,
  disGetStockGoodsOrdersFatherGoods,
  disGetStockGoodsNewWithDepIds,
  disGetToStockNxDepGoodsFatherGoods,
  giveOrderWeightListForStockAndFinish
} from '../../../../lib/apiDistributer.js'


Page({
 
  



  onLoad: function (options) {
    const app = getApp();
    const globalData = app.globalData;

    this.setData({
      windowWidth: globalData.windowWidth,
      windowHeight: globalData.windowHeight ,
      rpx: globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      url: apiUrl.server,
      goodsType: options.goodsType,
      scrollViewTop: 0,
      selectedSub: 0, // 选中的分类
      scrollHeight: 0, // 滚动视图的高度
      toView: 'position0', // 滚动视图跳转的位置
      scrollTopLeft: 0, //  左边滚动位置随着右边分类而滚动
      outNxDepIds: []
    

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

    // var idsChangeStock = wx.getStorageSync('idsChangeStock');
    // if (idsChangeStock) {
    //   this.setData({
    //     outNxDepIds: idsChangeStock.outNxDepIds,
    //     outGbDepIds: idsChangeStock.outGbDepIds,
    //     outNxDepNames: idsChangeStock.outNxDepNames,
    //     outGbDepNames: idsChangeStock.outGbDepNames,
    //   })
      
    //   this._initNxData();
    // } else { 
    //   this._initData();
    // }
    var idsChangeStock = wx.getStorageSync('idsChangeStock');
    if (idsChangeStock) {
      this.setData({
        outNxDepIds: idsChangeStock.outNxDepIds,
        outGbDepIds: idsChangeStock.outGbDepIds,
        outNxDepNames: idsChangeStock.outNxDepNames,
        outGbDepNames: idsChangeStock.outGbDepNames,
      })
      this._initNxData();
    } else {
      this._initData();
    }

  },



  _initData(){
    var that = this;
     var data = {
       disId: this.data.disId,
       goodsType: 0
     }
    disGetStockGoodsNew(data).then(res =>{
      if(res.result.code == 0){
        console.log(res.result.data)
        this.setData({
          goodsList: res.result.data.cataArr,
          grandList: res.result.data.grandArr,
          waitDepNx: res.result.data.waitDepNx,
          waitDepGb: res.result.data.waitDepGb,
          weightTotal: res.result.data.weightTotal,
        })

        if(res.result.data.cataArr.length > 0){
          this.setData({
            showGreatGrandId: res.result.data.cataArr[0].nxDistributerFatherGoodsId,
          })
        }

        that.lisenerScroll();
      }
    })

  },


  _initNxData(outNxDepIds){
    var that = this;
        var nxL = this.data.outNxDepIds.length;
    var nxids = 0;
    if(nxL > 0){
      nxids = this.data.outNxDepIds;
    }
    var gbL = this.data.outGbDepIds.length;
    var gbids = 0;
    if(gbL > 0){
      gbids = this.data.outGbDepIds;
    }
    var data = {
      nxDepIds:  nxids,
      gbDepIds: gbids,
      nxDisId: this.data.disId,
      goodsType: this.data.goodsType,
    }
    disGetStockGoodsNewWithDepIds(data).then(res =>{
      if(res.result.code == 0){
        console.log(res.result.data)
        this.setData({
          goodsList: res.result.data.cataArr,
          grandList: res.result.data.grandArr,
          waitDep: res.result.data.waitDep,
      
        })
        if(res.result.data.cataArr.length > 0){
          this.setData({
            showGreatGrandId: res.result.data.cataArr[0].nxDistributerFatherGoodsId,
          })
        }


        that.lisenerScroll();
      }
    })

  },

  _updateStorage(){
    var waitDep = this.data.waitDep;
    var newIds = [];
    if(waitDep.length > 0){
      var ids = wx.getStorageSync('outNxDepIds');
      if(ids.length > 0){
        for(var i = 0; i < waitDep.length; i++){
          var wId = waitDep[i].nxDepartmentId;
          for(var j = 0; j < ids.length; j++){
            var sId = ids[j];
            if(wId == sId){
              newIds.push(sId);
            }
          }   
        }
      }
    }
    wx.setStorageSync('outNxDepIds', newIds)
  },


/**
 * 获取右边每个分类的头部偏移量
 */
lisenerScroll() {
  // 获取各分类容器距离顶部的距离
  new Promise(resolve => {
    let query = wx.createSelectorQuery();
    for (let i in this.data.grandList) {
      query.select(`#position${i}`).boundingClientRect();
    }
    query.exec(function(res) {
      resolve(res);
    });
  }).then(res => {
    this.data.grandList.forEach((item, index) => {
      item.offsetTop = res[index].top
    })
    this.setData({
      scrollInfo: res,
      grandList: this.data.grandList
    })
  });
},

/**
 * 跳转滚动条位置
 */
toScrollView(e) {
  const {
    selectedSub
  } = this.data
  const {
    index
  } = e.currentTarget.dataset
  console.log(e);

  let left_ = 0
  if (index > 3) {
    left_ = (index - 3) * 16 // 左边侧栏item高度为50，可以根据自己的item高度设置
  }
  console.log("--------", index);
  this.setData({
    selectedSub: index,
    toView: `position${index}`,
    scrollTopLeft: left_
  })
},



  /**
   * 监听滚动条滚动事件
   */
  scrollTo(e) {
    console.log("scrollToscrollToscrollToscrollToscrollTo")
    const scrollTop = e.detail.scrollTop; //滚动的Y轴
    const {
      selectedSub,
      grandList
    } = this.data;
    let left_ = 0
    if (scrollDdirection < scrollTop) {
      // 向上滑动
      scrollDdirection = scrollTop
      // 计算偏移位置
      if (selectedSub < grandList.length - 1 && scrollTop >= grandList[selectedSub + 1].offsetTop) {
        if (selectedSub > 2) {
          left_ = (selectedSub - 2) * 16
        }
        this.setData({
          selectedSub: selectedSub + 1,
          scrollTopLeft: left_
        })
      }
    } else {
      // 向下滑动
      scrollDdirection = scrollTop
      // 计算偏移位置
      if (selectedSub > 0 && scrollTop < grandList[selectedSub - 1].offsetTop && scrollTop > 0) {
        if (selectedSub > 3) {
          left_ = (selectedSub - 4) * 16
        }
        this.setData({
          selectedSub: selectedSub - 1,
          scrollTopLeft: left_
        })
      }
    }
  },






  changeGreatGrand(e) {
    console.log(e);
    this.setData({
      showGreatGrandId: e.currentTarget.dataset.id,
      showGreatGrandIndex: e.currentTarget.dataset.index,
      showGrandIndex: 0
    })
    if(this.data.outNxDepIds.length > 0){
      this._getDepFatherGoods();

    }else{
      this._getFatherGoods();

    }

  },


  _getFatherGoods() {
    var that = this;
    var data = {
      fatherId: this.data.showGreatGrandId,
      disId: this.data.disId,
      goodsType: this.data.goodsType
    }
    disGetStockGoodsOrdersFatherGoods(data).then(res => {
      if (res.result.code == 0) {
        console.log(res)
        this.setData({
          grandList: res.result.data.grandArr, 
          waitDep: res.result.data.waitDep,         
        })
        that.lisenerScroll();

      }else{
       
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
        this._initData()
      }
    })
  },


  _getDepFatherGoods() {
    var that = this;
    var nxL = this.data.outNxDepIds.length;
      var nxids = 0;
      if(nxL > 0){
        nxids = this.data.outNxDepIds;
      }
      var gbL = this.data.outGbDepIds.length;
      var gbids = 0;
      if(gbL > 0){
        gbids = this.data.outGbDepIds;
      }
    var data ={
      fatherId: this.data.showGreatGrandId,
        nxDepIds: nxids,
        gbDepIds: gbids,
        disId: this.data.disId,
        goodsType: this.data.goodsType
    }
    disGetToStockNxDepGoodsFatherGoods(data).then(res => {
      if (res.result.code == 0) {
        console.log(res)
        this.setData({
          grandList: res.result.data.grandArr, 
          waitDep: res.result.data.waitDepNx,
          waitDepGb: res.result.data.waitDepGb,
       
        })
        that.lisenerScroll();

      }
    })
  },

  showIsOut(e){
    console.log("showIsOutshowIsOut")
    this.setData({
      showDisOutGoodsStock: true,
      item: e.currentTarget.dataset.item,
    })

  },


  confirm(e){
    var arrNeed = e.detail.item.neetNotPurOrders;
    var arr = [];
    if(arrNeed.length > 0){
      for(var i = 0; i < arrNeed.length; i++){
        var weightValue = arrNeed[i].nxDoWeight;
        if(weightValue !== null && weightValue > 0){
          arr.push(arrNeed[i]);
        }
      }
    }

    console.log(arr);
    if(arr.length > 0){
      giveOrderWeightListForStockAndFinish(arr).then(res =>{
        if(res.result.code == 0){
          this._initData();
        }
      })
    }
  },



  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },




  
  

})
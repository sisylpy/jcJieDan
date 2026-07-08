
var load = require('../../../../lib/load.js');
import apiUrl from '../../../../config.js'

import {
  disGetWaitStockGoodsDeps
} from '../../../../lib/apiDistributer.js'

Page({

  onShow(){
    this._initData();
  },

  data: {
    changeIds: false
  },

  onLoad: function (options) {
    const app = getApp();
    const globalData = app.globalData;

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      disId: options.disId,
      goodsType: options.goodsType,

    })
    this._initData();

  },


  _initData() {

    var data = {
      disId: this.data.disId,
      goodsType: this.data.goodsType,
    }
    disGetWaitStockGoodsDeps(data).then(res => {
      load.showLoading("获取客户")
      if (res.result.code == 0) {
        console.log(res.result.data);
        load.hideLoading();
        var haveIds = wx.getStorageSync('idsChangeStock');
        console.log(haveIds);
        if(!haveIds){
          this.setData({
            nxDepArr: res.result.data.nxDep,
            gbDepArr: res.result.data.gbDep
          })
        }else{
          console.log("updateupdate");
          this._updateNxDep(res);
          this._updateGbDep(res);
        }
      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },


  _updateGbDep(res){
    var idsChangeStock = wx.getStorageSync('idsChangeStock');
    var depTempArr = [];
    var outGbDepIds = idsChangeStock.outGbDepIds;
    if(outGbDepIds.length > 0){
      for(var i = 0; i < outGbDepIds.length;i++){
        var id = outGbDepIds[i];
        var depArr = res.result.data.gbDep;
        if(depArr.length > 0){
          for(var j = 0; j < depArr.length; j++){
            var item  = depArr[j];
            var depId = item.gbDepartmentId;
            if(id == depId){
               item.isSelected = true;
            }
            depTempArr.push(depArr[i]);
          }
        }
        this.setData({
          gbDepArr: depTempArr
        })
      }
    }else{
      var depArr = res.result.data.gbDep;
      var depTempArrNx = [];
      if(depArr.length > 0){
        for(var j = 0; j < depArr.length; j++){
          var item  = depArr[j];
           item.isSelected = false;
           depTempArrNx.push(item);
        }
      }
      this.setData({
        gbDepArr: depTempArrNx
      })
    }
  },

  _updateNxDep(res){
    var idsChangeStock = wx.getStorageSync('idsChangeStock');
    var depTempArr = [];
    var outNxDepIds = idsChangeStock.outNxDepIds;
    console.log(idsChangeStock.outNxDepIds);
    if(outNxDepIds.length > 0){
        var depArr = res.result.data.nxDep;
        if(depArr.length > 0){
          for(var j = 0; j < depArr.length; j++){
            var item  = depArr[j];
            var depId = item.nxDepartmentId;
            for(var i = 0; i < outNxDepIds.length;i++){
              var id = outNxDepIds[i];
              if(id == depId){
                item.isSelected = true;
             }
            }
            depTempArr.push(item);
          }
        }
      
      this.setData({
        nxDepArr: depTempArr
      })
    }else{
      var depArr = res.result.data.nxDep;
      var depTempArrNx = [];
      if(depArr.length > 0){
        for(var j = 0; j < depArr.length; j++){
          var item  = depArr[j];
           item.isSelected = false;
           depTempArrNx.push(item);
        }
      }
      this.setData({
        nxDepArr: depTempArrNx
      })
    
    }

  },

  // selectAllDep(res){
  //   var depArr = res.result.data.nxDep;
  //   var depTempArrNx = [];
  //   if(depArr.length > 0){
  //     for(var j = 0; j < depArr.length; j++){
  //       var item  = depArr[j];
  //        item.isSelected = true;
  //        depTempArrNx.push(item);
  //     }
  //   }
  //   this.setData({
  //     nxDepArr: depTempArrNx
  //   })

  //   var depArr = res.result.data.gbDep;
  //   var depTempArrGb = [];
  //   if(depArr.length > 0){
  //     for(var j = 0; j < depArr.length; j++){
  //       var item  = depArr[j];
  //        item.isSelected = true;
  //        depTempArrGb.push(item);
  //     }
  //   }
  //   this.setData({
  //     gbDepArr: depTempArrGb
  //   })
    
  // },

  choiceDep(e) {
    var index = e.currentTarget.dataset.index;
    var type = e.currentTarget.dataset.type;
    if (type == 'nx') {
      var depData = "nxDepArr[" + index + "].isSelected";
      var sel = this.data.nxDepArr[index].isSelected;
      if (sel) {
        this.setData({
          [depData]: false
        })
      } else {
        this.setData({
          [depData]: true
        })
      }
      this._cancleGb();
    }

    if (type == 'gb') {
      var depData = "gbDepArr[" + index + "].isSelected";
      var sel = this.data.gbDepArr[index].isSelected;
      if (sel) {
        this.setData({
          [depData]: false
        })
      } else {
        this.setData({
          [depData]: true
        })
      }
      this._cancleNx();
    }

    this.setData({
      changeIds: true
    })
  },


  _cancleGb(){
    var gbDepArr = this.data.gbDepArr;
    if(gbDepArr.length > 0){
      for(var i =0 ;i < gbDepArr.length; i++){
        var depData = "gbDepArr[" + i + "].isSelected";
        this.setData({
          [depData]:false
        })
      }
    }
  },

  _cancleNx(){
    var nxDepArr = this.data.nxDepArr;
    if(nxDepArr.length > 0){
      for(var i =0 ;i < nxDepArr.length; i++){
        var depData = "nxDepArr[" + i + "].isSelected";
        this.setData({
          [depData]:false
        })
      }
    }
  },
  // 已拣货客户详细
  toCarDep(e) {
    console.log("toCarDeptoCarDep");
    if(e.currentTarget.dataset.type == 'nx'){
      var depId = e.currentTarget.dataset.id;
      var name = e.currentTarget.dataset.name;
      wx.navigateTo({
        url: '../depOutOrder/depOutOrder?depFatherId=' + depId
         + '&gbDepFatherId=-1&goodsType=' + this.data.goodsType
         +'&depName=' + name,
      }) 
    }else{
      var depId = e.currentTarget.dataset.id;
      var name = e.currentTarget.dataset.name;
      wx.navigateTo({
        url: '../depOutOrder/depOutOrder?depFatherId==1&gbDepFatherId='+ depId +  '&goodsType=' + this.data.goodsType
         +'&depName=' + name,
      }) 
    }
      
  },


  toBack() {
    if(this.data.changeIds){
      var nxLeg = this.data.nxDepArr.length;
      var nxIds = [];
      var nxDepName = [];
      if (nxLeg > 0) {
        var nxDepArr = this.data.nxDepArr;
        var nxUn = 0;
        for (var i = 0; i < nxDepArr.length; i++) {
          if (nxDepArr[i].isSelected) {
            nxIds.push(nxDepArr[i].nxDepartmentId);
            nxDepName.push(nxDepArr[i].nxDepartmentName);
          }else{
            nxUn = Number(nxUn) + Number(1);
          }
        }
      }

      var gbLeg = this.data.gbDepArr.length;
      var gbIds = [];
      var gbDepName = [];
      if (gbLeg > 0) {
        var gbDepArr = this.data.gbDepArr;
        var gbUn = 0 ;
        for (var i = 0; i < gbDepArr.length; i++) {
          if (gbDepArr[i].isSelected) {
            gbIds.push(gbDepArr[i].gbDepartmentId);
            gbDepName.push(gbDepArr[i].gbDepartmentName);
          }else{
            gbUn = Number(gbUn) + Number(1);
          }
        }
      }

      // console.log("gbun===", gbUn + "gblend====", gbLeg , "nxun====", nxUn, "nxlieng===", nxLeg);
      if(gbUn !== gbLeg || nxUn !== nxLeg){
        console.log("gbun===", gbUn + "gblend====", gbLeg , "nxun====", nxUn, "nxlieng===", nxLeg);

        var idsChangeStock = {
          haveIds: true,
          outNxDepIds: nxIds,
          outNxDepNames: nxDepName,
          outGbDepIds: gbIds,
          outGbDepNames: gbDepName,
        }
        wx.setStorageSync('idsChangeStock', idsChangeStock);
        console.log("wx.setStorageSync('idsChangeStock', idsChangeStock);")
      }else{
        console.log("nwhhwwh")
        wx.removeStorageSync('idsChangeStock');
      }
     
    }
  
    wx.navigateBack({
      delta: 1,
    })
  },






})
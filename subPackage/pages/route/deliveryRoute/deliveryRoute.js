var load = require('../../../../lib/load.js');

var app = getApp()
var dateUtils = require('../../../../utils/dateUtil');

import {
  getDeliverRoute,
  cancleDeliveryRestraunt
} from '../../../../lib/apiDistributer.js'


Page({

  /**
   * 页面的初始数据
   */
  data: {

  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const globalData = app.globalData;

    var userValue = wx.getStorageSync('userInfo');
    if (userValue) {
      this.setData({
        userInfo: userValue
      })
    }

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      userId: options.id
    })

    this._initData();

  },

  _initData() {

    var data = {
      userId: this.data.userId,
      fromLat: this.data.userInfo.nxCommunityEntity.nxCommunityLat,
      fromLng: this.data.userInfo.nxCommunityEntity.nxCommunityLng,
    }

    getDeliverRoute(data).then(res => {
      if (res.result.code == 0) {
        if(res.result.data.length > 0){

        }else{
          this.setData({
            restrauntArr: []
          })
        }
      } else {
        this.setData({
          restrauntArr: []
        })
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })

  },


  _getData(res){

    this.setData({
      restrauntArr: res.result.data,
    })
    var points = [];
    for (var i = 0; i < res.result.data.length; i++) {
      var item = {
        latitude: res.result.data[i].nxRestrauntLat,
        longitude: res.result.data[i].nxRestrauntLng,
      }
      points.push(item);
    }
    var qidian = {
      latitude: this.data.userInfo.nxCommunityEntity.nxCommunityLat,
      longitude: this.data.userInfo.nxCommunityEntity.nxCommunityLng,
    }
    points.push(qidian);

    this.setData({
      points: points
    })

    var that = this;
    wx.getLocation({
      type: 'wgs84', // 默认为 wgs84 返回 gps 坐标，gcj02 返回可用于 wx.openLocation 的坐标
      success: function (res) {
        //赋值经纬度
        that.setData({
          latitude: res.latitude,
          longitude: res.longitude,
          markers: that._getRestrauntMarkers()
        })
        var mapCtx = wx.createMapContext('myMap')
        mapCtx.includePoints({
          padding: [50],
          points: that.data.points
        })
      }
    })
  },


  /**
   * 获取医院标识
   */
  _getRestrauntMarkers() {
    let markers = [];
    for (var i = 0; i < this.data.restrauntArr.length; i++) {
      let marker = this._createMarker(this.data.restrauntArr[i], i);
      markers.push(marker)
    }
    let marker = {
      iconPath: "/images/zhuye.png",
      id: 0,
      width: 20,
      height: 20,
      name: 'abc',
      latitude: this.data.userInfo.nxCommunityEntity.nxCommunityLat,
      longitude: this.data.userInfo.nxCommunityEntity.nxCommunityLng,
      label: {
        content: this.data.userInfo.nxCommunityEntity.nxCommunityName, //文本
        color: '#187e6e', //文本颜色
        borderRadius: 3, //边筐圆角
        borderWidth: 1, //边筐宽度
        borderColor: '#187e6e', //边筐颜色
        bgColor: '#ffffff', //背景色
        padding: 5, //文本边缘留白
        textAlign: 'center', //文本对齐方式。有效值: left, right, center
        x: 2,
        y: 1,
      }

    };
    markers.push(marker);

    return markers;
  },

  /**
   * 还有地图标识，可以在name上面动手
   */
  _createMarker(point, index) {
    let latitude = point.nxRestrauntLat;
    let longitude = point.nxRestrauntLng;

    let marker = {
      iconPath: "/images/location.png",
      id: point.nxRestrauntId || 0,
      name: point.nxRestrauntAttrName || '',
      latitude: latitude,
      longitude: longitude,
      width: 30,
      height: 30,
      label: {
        content: index + 1 + "," + point.nxRestrauntAttrName, //文本
        color: '#FF0202', //文本颜色
        borderRadius: 3, //边筐圆角
        borderWidth: 1, //边筐宽度
        borderColor: '#FF0202', //边筐颜色
        bgColor: '#ffffff', //背景色
        padding: 5, //文本边缘留白
        textAlign: 'center', //文本对齐方式。有效值: left, right, center
        x: 2,
        y: 1,
      }
    };
    return marker;
  },


  cancelDelivery(e) {

    var that = this;
    wx.showModal({
      title: '重新分派',
      content: '确定要删除该订单吗？',
      showCancel: true, //是否显示取消按钮
      cancelText: "否", //默认是“取消”
      cancelColor: '#9b9999', //取消文字的颜色
      confirmText: "是", //默认是“确定”
      confirmColor: '#187e6e', //确定文字的颜色
      success: function (res) {
        if (res.cancel) {
          //点击取消,默认隐藏弹筐
        } else {
          //点击确定
          cancleDeliveryRestraunt(e.currentTarget.dataset.id)
            .then(res => {
              if (res.result.code == 0) {
                that._initData();
              }
            })
        }
      },
    })
  },

  





})
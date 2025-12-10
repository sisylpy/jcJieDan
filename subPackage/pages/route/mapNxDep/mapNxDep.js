var load = require('../../../../lib/load.js');

var app = getApp()

import {
  getPrepareDeliveryDepartment,

} from '../../../../lib/apiDistributer.js'


Page({
  data: {
    points: [],
    restrauntArr: [],
    update: false,
  },

  onShow() {
    if (this.data.update) {
      this._initData();
    }
  },


  onLoad: function (options) {
    const globalData = app.globalData;

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      comId: options.comId
    })

    this._initData();

  },

  _initData() {
    load.showLoading("获取订单中")
    getPrepareDeliveryDepartment(56).then(res => {
      load.hideLoading();

      if (res.result.code == 0) {
        if (res.result.data.length > 0) {
          this.setData({
            restrauntArr: res.result.data,
          })
          var points = [];
          for (var i = 0; i < res.result.data.length; i++) {
            if(res.result.data[i].nxDepartmentLat !== null){
              var item = {
                latitude: res.result.data[i].nxDepartmentLat,
                longitude: res.result.data[i].nxDepartmentLng,
              }
              points.push(item);
            }
            
          }
          this.setData({
            points: points
          })
        }else{
          this.setData({
            restrauntArr: []
          })
        }

      } else {
        wx.showToast({
          title: '获取订单失败',
        })
      }
    })

    var that = this;
    wx.getLocation({
      type: 'wgs84', // 默认为 wgs84 返回 gps 坐标，gcj02 返回可用于 wx.openLocation 的坐标
      success: function (res) {
        console.log(res);
        //赋值经纬度
        that.setData({
          latitude: res.latitude,
          longitude: res.longitude,
          markers: that.getHospitalMarkers()
        })

        if (that.data.points.length > 0) {
          var mapCtx = wx.createMapContext('myMap')
          mapCtx.includePoints({
            padding: [50],
            points: that.data.points
          })
        }

      }
    })

  },


  checkboxChange(e) {
    console.log(e);
    this.setData({
      resArr: e.detail.value,
    })
  },

  /**
   * 获取客户标识
   */
  getHospitalMarkers() {
    let markers = [];
    if (this.data.restrauntArr.length > 0) {
      for (let date of this.data.restrauntArr) {
        let marker = this.createMarker(date);
        markers.push(marker)
        console.log(markers);
      }
    }
    return markers;
  },

  /**
   * 还有地图标识，可以在name上面动手
   */
  createMarker(point) {
    let latitude = point.nxDepartmentLat;
    let longitude = point.nxDepartmentLng;

    let marker = {
      iconPath: "/images/location.png",
      id: point.nxDepartmentId || 0,
      name: point.nxDepartmentAttrName || '',
      latitude: latitude,
      longitude: longitude,
      //   width: 25,
      //  height: 48,
      label: {
        content: point.nxDepartmentAttrName, //文本
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

  bindEvent() {
    this.mapCtx.initMarkerCluster({
      enableDefaultStyle: true,
      zoomOnClick: true,
      gridSize: 60,
      complete(res) {
        console.log('initMarkerCluster', res)
      }
    })

    // enableDefaultStyle 为 true 时不会触发改事件
    this.mapCtx.on('markerClusterCreate', res => {
      console.log('clusterCreate', res)
      const clusters = res.clusters
      const markers = clusters.map(cluster => {
        const {
          center,
          clusterId,
          markerIds
        } = cluster
        return {
          ...center,
          width: 0,
          height: 0,
          clusterId, // 必须
          label: {
            content: markerIds.length + '',
            fontSize: 20,
            width: 60,
            height: 60,
            bgColor: '#00ff00',
            borderRadius: 30,
            textAlign: 'center',
            anchorX: 0,
            anchorY: -30,
          }
        }
      })
      this.mapCtx.addMarkers({
        markers,
        clear: false,
        complete(res) {
          console.log('clusterCreate addMarkers', res)
        }
      })
    })

  },


  addMarkers() {
    console.log("====adddmarkss")

    let marker = {
      iconPath: "/images/location.png",
      id: 0,
      name: 'abc',
      latitude: 39.958843,
      longitude: 116.82941,
      //   width: 25,
      //  height: 48,
      label: {
        content: 'qidian', //文本
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
  },

  removeMarkers() {
    this.mapCtx.addMarkers({
      clear: true,
      markers: []
    })
  },

  toDriver() {
    console.log(this.data.resArr)
    wx.setStorageSync('resArr', this.data.resArr);
    wx.navigateTo({
      url: '../driver/driver?comId=' + this.data.comId,
    })
  }
})
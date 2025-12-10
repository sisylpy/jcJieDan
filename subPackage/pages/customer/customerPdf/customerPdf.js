import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');
var dateUtils = require('../../../../utils/dateUtil.js');
import * as echarts from '../../../ec-canvas/echarts';

let windowWidth = 0;
let itemWidth = 0;

import {

  getNxDisDepPdf

}
from '../../../../lib/apiDistributer'



Page({



  onShow(){
    if(this.data.update){
      this._initData();
    }
  },
  /**
   * 页面的初始数据
   */
  data: {
    ec: {
      // onInit: initChart
      lazyLoad: true // 延迟加载
    },
    arr: []

  },

  

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const app = getApp();
    const globalData = app.globalData;

    var value = wx.getStorageSync('userInfo');
    if (value) {
      this.setData({
        disId: value.nxDistributerEntity.nxDistributerId,
        userInfo: value,
      })
      var depInfoValue = wx.getStorageSync('depInfo');

      if (depInfoValue.nxDepartmentSubAmount > 0) {
        this.setData({
          subArr: depInfoValue.nxDepartmentEntities,
        })
      } else {
        //没有下级部门
        // 如果是群用户登陆
        this.setData({
          depId: depInfoValue.nxDepartmentId,
          depFatherId: depInfoValue.nxDepartmentFatherId,
          groupName: depInfoValue.nxDepartmentName,
          depType: depInfoValue.nxDepartmentType
        })
        wx.setStorageSync('depFatherId', depInfoValue.nxDepartmentFatherId)
        wx.setStorageSync('depInfo', depInfoValue);
      }
      this.setData({
        depInfo: depInfoValue,
        depFatherId: depInfoValue.nxDepartmentId,
        settleType: depInfoValue.nxDepartmentSettleType,
        editDepName: depInfoValue.nxDepartmentName,
        editDepAttrName: depInfoValue.nxDepartmentAttrName
      })
    }

    var disInfo = wx.getStorageSync('disInfo');
    if (disInfo) {
      this.setData({
        disInfo: disInfo
      })
    }

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      dateType:"month",
      startDate: dateUtils.getFirstDateInMonth(),
      stopDate: dateUtils.getArriveDate(0),
    })


    this._initData();


  },

  toDatePage(){
    this.setData({
      update: true,
    })
    wx.navigateTo({
      url: '../../sel/date/date?startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate + '&dateType=' + this.data.dateType,
    })
  },


  _initData() {
    var data = {
      startDate: this.data.startDate,
      stopDate : this.data.stopDate,
      depFatherId: this.data.depFatherId
    }
    load.showLoading("获取数据")
    getNxDisDepPdf(data).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        console.log(res.result.data);
        this.setData({
          arr: res.result.data.arr,
          total: res.result.data.total,
        })
        if (res.result.data.arr.length > 0) {
            this.init_echarts_total();
          
        }
      }
    })
  },


  //初始化图表
  init_echarts_total: function () {
    console.log("init_echarts_totalinit_echarts_totalinit_echarts_total")
    this.echartsComponnet = this.selectComponent('#mychartProfitIndex');
    this.echartsComponnet.init((canvas, width, height) => {
      // 初始化图表
      const Chart = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: globalData.rpxR
      });
      Chart.setOption(this.getOptionTotal());
      // 注意这里一定要返回 chart 实例，否则会影响事件处理等
      return Chart;
    });
  },
  getOptionTotal() {
    const option = {
      series: [{
        type: 'pie',
        color: this._getAllDataColor(this.data.arr),
        center: ['50%', '50%'], // 设置饼图在画布中心
        radius: ['30','40%'], // 饼图的半径，内外半径
        avoidLabelOverlap: true,
        data: this._getAllData(this.data.arr),
        label: {
          show: true,
          position: 'outside', // 显示在外部
          // formatter: '{b}\n{d}%', // 显示名称和百分比
          textStyle: {
            fontSize: 14,
          },
        },
        labelLine: {
          show: true,
          length: 10,
          length2: 10,
        },
      }],
    };
    return option;
  },
  
  _getAllDataColor(arr) {
    return arr.map(item => item.nxDfgFatherGoodsColor);
  },
  
  _getAllData(arr) {
    const temp = arr.map(item => ({
      value: item.fatherSubtotalTotalString,
      name: `${item.nxDfgFatherGoodsName}\n${item.fatherSubtotalTotalString}元 ${item.fatherProfitScaleString}%`,
    }));
    console.log("Data for pie chart:", temp);
    return temp;
  },
// 导出Excel方法
testPdf() {
  const { depFatherId, startDate, stopDate } = this.data;
  wx.showLoading({ title: '生成文件中...', mask: true });

  wx.downloadFile({
    url: `${apiUrl.apiUrl}download/downloadReportExcelNx?depFatherId=${depFatherId}&startDate=${startDate}&stopDate=${stopDate}`,
    success: (res) => {
      if (res.statusCode === 200) {
        const fs = wx.getFileSystemManager();
        const fileName = `采购分析_${startDate}-${stopDate}.xlsx`;
        const savePath = `${wx.env.USER_DATA_PATH}/${fileName}`;

        fs.saveFile({
          tempFilePath: res.tempFilePath,
          filePath: savePath,
          success: () => {
            wx.hideLoading();
            wx.openDocument({
              filePath: savePath,
              fileType: 'xlsx',
              showMenu: true,
              success: () => console.log('打开文档成功'),
              fail: (err) => {
                console.error('打开失败:', err);
                wx.showModal({
                  title: '提示',
                  content: '文件已保存，请使用办公软件打开',
                  showCancel: false
                });
              }
            });
          },
          fail: (err) => {
            wx.hideLoading();
            console.error('保存失败:', err);
            wx.showToast({ title: '保存失败', icon: 'none' });
          }
        });
      } else {
        wx.hideLoading();
        wx.showToast({ title: '下载失败', icon: 'none' });
      }
    },
    fail: (err) => {
      wx.hideLoading();
      console.error('下载失败:', err);
      wx.showToast({ title: '网络错误', icon: 'none' });
    }
  });
},
  testPdf33() {
  
      var that = this;
      load.showLoading("下载Excel表中....")
      wx.downloadFile({
        url: apiUrl.apiUrl + 'download/downloadReportExcelNx?depFatherId=' + this.data.depFatherId + '&startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate, //仅为示例，并非真实的资源
        header: {},
        success(res) {
          // 只要服务器有响应数据，就会把响应内容写入文件并进入 success 回调，业务需要自行判断是否下载到了想要的内容
          // getFileSystemManager().
          if (res.statusCode === 200) {
            console.log(res);
            var tempFilePath = res.tempFilePath;
            var path = wx.env.USER_DATA_PATH + "/"  + that.data.startDate +"-" + that.data.stopDate +  ".xls"
            wx.saveFile({
              tempFilePath: tempFilePath,
              filePath: path,
              fileType: 'xls',
              success(sRes) {
                wx.openDocument({
                  filePath: sRes.savedFilePath,
                  showMenu: true,
                  fileType: 'xls',
                  success: function (oRes) {
                    console.log("open")
                    // that.hideMask();
                  }
                })
              },
              fail(sF) {
                console.log(sF);
                wx.showToast({
                  title: '保存失败',
                })
              }
  
            })
          }
        },
        fail() {
          wx.showToast({
            title: '下载失败',
            icon: 'none'
          })
  
        },
        complete() {
          load.hideLoading();
  
        }
      })
   
  },

  
  testPdf11() {
    var that = this;
    load.showLoading("下载PDF....");
    wx.downloadFile({
      url: apiUrl.apiUrl + 'nxdepartmentorders/downloadReportPdfNx?depFatherId=' + this.data.depFatherId + '&startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate,
      header: {},
      success(res) {
        if (res.statusCode === 200) {
          console.log('下载成功，临时文件路径：', res.tempFilePath);
          
          // 1. 先保存文件（避免过期）
          wx.saveFile({
            tempFilePath: res.tempFilePath,
            success(savedRes) {
              const savedFilePath = savedRes.savedFilePath;
              console.log('文件已保存：', savedFilePath);
              wx.navigateTo({
                url: '../webview/webview?pdfUrl=' + encodeURIComponent(savedFilePath)
              });
              // 2. 打开PDF
            //   wx.openDocument({
            //     filePath: savedFilePath, // 使用持久化路径
            //     fileType: 'pdf',
            //     success() {
            //       console.log('打开PDF成功');
            //       wx.showToast({ title: '文件已保存到本地' });
            //     },
            //     fail(err) {
            //       console.error('打开PDF失败：', err);
            //     }
            //   });
            },
            fail(err) {
              console.error('保存文件失败：', err);
            }
          });
        } else {
          console.error('下载失败，状态码：', res.statusCode);
        }
      },
      fail(err) {
        console.error('下载失败：', err);
        wx.showToast({ title: '下载失败', icon: 'none' });
      },
      complete() {
        load.hideLoading();
      }
    });
  },



  testPdf2() {
    var that = this;
    load.showLoading("下载PDF....");
    wx.downloadFile({
      url: apiUrl.apiUrl + 'nxdepartmentorders/downloadReportPdfNx?depFatherId=' + this.data.depFatherId + '&startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate,
      header: {},
      success(res) {
        if (res.statusCode === 200) {
          console.log('下载成功，临时文件路径：', res.tempFilePath);
          
          // 1. 先打开PDF（可选，根据需求）
          wx.openDocument({
            filePath: res.tempFilePath,
            fileType: 'pdf',
            success() {
              console.log('打开PDF成功');
              
              // 2. 保存文件到本地（持久化存储）
              wx.saveFile({
                tempFilePath: res.tempFilePath,
                success(savedRes) {
                  const savedFilePath = savedRes.savedFilePath;
                  console.log('文件已保存：', savedFilePath);
                  wx.showToast({ title: '文件已保存到本地' });
                  
                },
                fail(err) {
                  console.error('保存文件失败：', err);
                }
              });
            },
            fail(err) {
              console.error('打开PDF失败：', err);
            }
          });
        } else {
          console.error('下载失败，状态码：', res.statusCode);
        }
      },
      fail(err) {
        console.error('下载失败：', err);
        wx.showToast({ title: '下载失败', icon: 'none' });
      },
      complete() {
        load.hideLoading();
      }
    });
  },


  testPdf1() {
   
    var that = this;
    load.showLoading("下载PDF....")
    wx.downloadFile({
      url: apiUrl.apiUrl + 'nxdepartmentorders/downloadReportPdfNx?depFatherId=' + this.data.depFatherId + '&startDate=' + this.data.startDate + '&stopDate=' + this.data.stopDate,
      header: {},
      success(res) {
        if (res.statusCode === 200) {
          console.log('下载成功，临时文件路径：', res.tempFilePath);
          console.log('文件大小：', res.tempFileSize);

          wx.openDocument({
            filePath: res.tempFilePath,
            fileType: 'pdf',
            success: function () {
              console.log('打开 PDF 成功');
            },
            fail: function (err) {
              console.error('打开 PDF 失败：', err);
            }
          });
        } else {
          console.error('下载失败，状态码：', res.statusCode);
        }
      },
      fail(err) {
        console.error('下载失败：', err);
        wx.showToast({
          title: '下载失败',
          icon: 'none'
        });
      },
      complete() {
        load.hideLoading();
      }
    });


  },

  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },









})
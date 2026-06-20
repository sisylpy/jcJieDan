import apiUrl from '../../../../config.js'

import {
  disGetGoods
} from '../../../lib/apiibook'

Page({


  /**
   * 页面的初始数据
   */
  data: {
    canSave: false,
    imgChanged: false,
    isSelectImg: false,
    goodsName: null
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const app = getApp();
    const globalData = app.globalData;

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      fatherId: options.id,
      fatherName: options.fatherName,
      type: options.type,
      disId: options.disId,
      color: options.color,
      focuxIndex: options.editIndex
      // from: options.from
    })

    // if (options.type == 'edit') {
    var brotherGoods = wx.getStorageSync('brotherGoods');
    if (brotherGoods) {
      this.setData({
        brotherGoods: brotherGoods
      })
    }

    var item = wx.getStorageSync('editNxGoods');
    if (item) {
      this.setData({
        editItem: item,
      })
      if (item.nxGoodsFile !== null && item.nxGoodsFile.length > 0) {
        this.setData({
          type: "edit",
          thumbnailPath: this.data.url + item.nxGoodsFile,
          largeImagePath: this.data.url + item.nxGoodsFileBig,
        })
      } else {
        this.setData({
          type: "add",
        })
      }
    }
  },


  _updateData() {

    disGetGoods(this.data.brotherGoods.nxDistributerGoodsId).then(res => {
      if (res.result.code == 0) {
        console.log("data", res.result.data);
        var pages = getCurrentPages();
        var prevPage1 = pages[pages.length - 2];
        var focuxIndex = this.data.focuxIndex;

        // 先复制数组（避免直接修改引用）
        var newGoodsList = [...prevPage1.data.goodsList];
        // 修改指定索引的数据
        newGoodsList[focuxIndex] = res.result.data;

        // 更新上一页的数据
        prevPage1.setData({
          goodsList: newGoodsList // ✅ 直接替换整个数组
        });

      }
    })


  },



  toBack() {

    wx.navigateBack({
      delta: 1,
    })
  },



  chooseImage: function () {
    const that = this;
    wx.chooseImage({
      count: 1, // 一次选择一张
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        const tempFilePath = res.tempFilePaths[0];
        // 初始化 Canvas 上下文
        that.setData({
          ctx: wx.createCanvasContext('myCanvas')
        });
        // 先处理并上传缩略图
        that.resizeImage(tempFilePath, 'thumbnailPath'); // 处理缩略图
      }
    });
  },

  // 图片缩放处理并上传（处理缩略图后再处理大图）
  resizeImage: function (filePath, key) {
    const that = this;

    // 通过 wx.getImageInfo 获取图片信息
    wx.getImageInfo({
      src: filePath,
      success(info) {
        // 使用你测试有效的方法来绘制缩略图
        if (key === 'thumbnailPath') {
          // 绘制缩略图，尺寸固定为 100x100，居中位置设置为 (10, 0)
          that.data.ctx.drawImage(filePath, 10, 0, 100, 100);
        } else if (key === 'largeImagePath') {
          // 绘制大图，尺寸为 300x300，居中位置可以根据需求调整
          that.data.ctx.drawImage(filePath, 0, 0, 300, 300);
        }

        that.data.ctx.draw(true, () => {
          wx.canvasToTempFilePath({
            canvasId: 'myCanvas',
            width: key === 'thumbnailPath' ? 100 : 300, // 根据 key 确定宽度
            height: key === 'thumbnailPath' ? 100 : 300, // 根据 key 确定高度
            success(res) {
              // 设置缩放后的图片路径
              that.setData({
                [key]: res.tempFilePath
              });

              // 上传缩略图后，处理大图
              if (key === 'thumbnailPath') {
                that.uploadThumbnail(res.tempFilePath).then(() => {
                  // 缩略图上传成功后，处理大图
                  that.resizeImage(filePath, 'largeImagePath');
                });
              } else if (key === 'largeImagePath') {
                that.uploadLargeImage(res.tempFilePath);
              }
            },
            fail(err) {
              console.error('图片处理失败', err);
            }
          });
        });
      },
      fail(err) {
        console.error('获取图片信息失败', err);
      }
    });
  },

  // 上传缩略图
  uploadThumbnail: function (thumbnailPath) {
    const that = this;
    const goodsId = that.data.editItem.nxGoodsId;
    const goodsName = that.data.editItem.nxGoodsName;

    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: that.data.url + 'api/nxgoods/updateFather',
        filePath: thumbnailPath,
        name: 'file',
        formData: {
          goodsName: goodsName,
          id: goodsId
        },
        success(res) {
          console.log('缩略图上传成功', res);
          resolve(); // 上传成功后继续处理大图

        },
        fail(err) {
          console.error('缩略图上传失败', err);
          reject(err);
        }
      });
    });
  },

  // 上传大图
  uploadLargeImage: function (largeImagePath) {
    const that = this;
    const goodsId = that.data.editItem.nxGoodsId;
    const goodsName = that.data.editItem.nxGoodsName;

    wx.uploadFile({
      url: that.data.url + 'api/nxgoods/updateFatherBig',
      filePath: largeImagePath,
      name: 'file',
      formData: {
        goodsName: goodsName,
        id: goodsId
      },
      success(res) {
        console.log('大图上传成功', res);
        that._updateData();
      },
      fail(err) {
        console.error('大图上传失败', err);
      }
    });
  },







})
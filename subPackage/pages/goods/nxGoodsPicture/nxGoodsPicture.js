// pages/your_page/your_page.js

import apiUrl from '../../../../config.js';

import { disGetGoodsDetail } from '../../../../lib/apiDistributer';

Page({
  data: {
    canSave: false,
    imgChanged: false,
    isSelectImg: false,
    goodsName: null,

    windowWidth: 0,
    windowHeight: 0,
    navBarHeight: 0,
    url: '',
    editIndex: null,
    fatherId: null,
    fatherName: null,
    type: null,
    disId: null,
    color: null,
    editItem: null,
    thumbnailPath: '',
    largeImagePath: '',
    canvasWidth: 100, // 默认缩略图宽度
    canvasHeight: 100, // 默认缩略图高度
    ctx: null,
    loading: false,
    canvasType: '2d',

    canvas: null, // Canvas 节点
    originalWidth: 0, // 原图片的宽度
    originalHeight: 0, // 原图片的高度
    // compressedWidth: 0, // 压缩后图片的宽度
    // compressedHeight: 0, // 压缩后图片的高度
    thumbnailWidth: 0, // 缩略图的宽度
  thumbnailHeight: 0, // 缩略图的高度
  largeImageWidth: 0, // 大图的宽度
  largeImageHeight: 0, // 大图的高度
  },


  onLoad: function (options) {
    const app = getApp();
    const globalData = app.globalData;

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      editIndex: options.editIndex,
    });

     // 初始化 Canvas 和上下文
  const query = wx.createSelectorQuery().in(this);
  query
    .select('#myCanvas')
    .fields({ node: true, size: true })
    .exec((res) => {
      if (res[0] && res[0].node) {
        const canvas = res[0].node;
        const ctx = canvas.getContext('2d');

        this.setData({
          canvas,
          ctx,
        });
      } else {
        console.error('无法获取 Canvas 节点。');
      }
    });

    var item = wx.getStorageSync('disGoods');
    if (item) {
      this.setData({
        editItem: item,
      });
      if (item.nxDgGoodsFile !== null && item.nxDgGoodsFile.length > 0) {
        this.setData({
          thumbnailPath: this.data.url + item.nxDgGoodsFile,
          largeImagePath: this.data.url + item.nxDgGoodsFileLarge,
        });
      }
    }
  },

  onUnload() {
    if (this.data.imgChanged) {
      this._getGoodsDetail();
    }
  },

  toBack() {
    if (this.data.imgChanged) {
      this._getGoodsDetail();
    }else{
      wx.navigateBack({delta: 1})
    }
  },

  _getGoodsDetail() {
    if (!this.data.editItem) {
      wx.showToast({
        title: '商品信息不存在',
        icon: 'none',
      });
      return;
    }
    disGetGoodsDetail(this.data.editItem.nxDistributerGoodsId).then((res) => {
      if (res.result.code == 0) {
        var pages = getCurrentPages();
        var prevPage = pages[pages.length - 2]; // 上一个页面
        var data = 'goodsList[' + this.data.editIndex + ']';
        prevPage.setData({
          [data]: res.result.data.goodsInfo,
        });

        wx.navigateBack({
          delta: 1,
        });
      } else {
        wx.showToast({
          title: res.result.msg,
        });
      }
    });
  },

  chooseImage: function () {
    const that = this;
    wx.chooseImage({
      count: 1, // 一次选择一张
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success(res) {
        const tempFilePath = res.tempFilePaths[0];
        that.setData({
          loading: true, // 显示加载状态
          imgChanged: true,
        });

        // 获取原图片尺寸信息
        wx.getImageInfo({
          src: tempFilePath,
          success(info) {
            that.setData({
              originalWidth: info.width,
              originalHeight: info.height,
            });

            // 处理缩略图
            that
              .resizeImage(tempFilePath, 'thumbnailPath')
              .then(() => {
                // 处理大图
                return that.resizeImage(tempFilePath, 'largeImagePath');
              })
              .then(() => {
                that.setData({
                  loading: false, // 隐藏加载状态
                  imgChanged: true,
                });

                // 上传图片
                that.uploadThumbnail(that.data.thumbnailPath).then(() => {
                  that.uploadLargeImage(that.data.largeImagePath);
                });

                wx.showToast({
                  title: '图片上传成功',
                  icon: 'success',
                });
              })
              .catch((err) => {
                console.error('图片处理或上传失败', err);
                that.setData({
                  loading: false,
                });
                wx.showToast({
                  title: '图片上传失败，请重试',
                  icon: 'none',
                });
              });
          },
          fail(err) {
            console.error('获取原图片信息失败', err);
            that.setData({
              loading: false,
            });
            wx.showToast({
              title: '获取原图片信息失败',
              icon: 'none',
            });
          },
        });
      },
      fail(err) {
        console.error('选择图片失败', err);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none',
        });
      },
    });
  },

  resizeImage: function (filePath, key) {
    const that = this;

    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src: filePath,
        success(info) {
          const imgWidth = info.width;
          const imgHeight = info.height;
          let targetWidth, targetHeight;

          if (key === 'thumbnailPath') {
            targetWidth = 100;
            targetHeight = 100;
          } else if (key === 'largeImagePath') {
            targetWidth = 300;
            targetHeight = 300;
          }

          // Calculate the scale and cropping area
          const scale = Math.max(targetWidth / imgWidth, targetHeight / imgHeight);
          const sw = targetWidth / scale;
          const sh = targetHeight / scale;
          const sx = (imgWidth - sw) / 2;
          const sy = (imgHeight - sh) / 2;

          // Ensure the canvas and ctx are initialized
          if (!that.data.canvas || !that.data.ctx) {
            console.error('Canvas or context not initialized');
            reject('Canvas or context not initialized');
            return;
          }

          const canvas = that.data.canvas;
          const ctx = that.data.ctx;

          // Set canvas dimensions
          canvas.width = targetWidth;
          canvas.height = targetHeight;

          // Create the image object
          const image = canvas.createImage();
          image.src = filePath;

          image.onload = () => {
            ctx.clearRect(0, 0, targetWidth, targetHeight);
            ctx.drawImage(image, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);

            wx.canvasToTempFilePath({
              canvas: canvas,
              x: 0,
              y: 0,
              width: targetWidth,
              height: targetHeight,
              destWidth: targetWidth,
              destHeight: targetHeight,
              quality: 0.8, // 压缩质量，范围 0-1
              success(res) {
                that.setData({
                  [key]: res.tempFilePath,
                  // compressedWidth: targetWidth,
                  // compressedHeight: targetHeight,
                });
                if (key === 'thumbnailPath') {
                  that.setData({
                    thumbnailPath: res.tempFilePath,
                    thumbnailWidth: targetWidth,
                    thumbnailHeight: targetHeight,
                  });
                } else if (key === 'largeImagePath') {
                  that.setData({
                    largeImagePath: res.tempFilePath,
                    largeImageWidth: targetWidth,
                    largeImageHeight: targetHeight,
                  });
                }
                resolve();
              },
              fail(err) {
                console.error('Failed to save canvas to temp file path', err);
                reject(err);
              },
            });
          };

          image.onerror = (err) => {
            console.error('Failed to load image', err);
            reject(err);
          };
        },
        fail(err) {
          console.error('Failed to get image info', err);
          reject(err);
        },
      });
    });
  },

  // 上传缩略图
  uploadThumbnail: function (thumbnailPath) {
    const that = this;

    const { nxDistributerGoodsId, nxDgGoodsName } = that.data.editItem;

    return new Promise((resolve, reject) => {
      wx.uploadFile({
        url: that.data.url + 'api/nxdistributergoods/updateFatherNx',
        filePath: thumbnailPath,
        name: 'file',
        formData: {
          goodsName: nxDgGoodsName,
          id: nxDistributerGoodsId,
        },
        success(res) {
          console.log('缩略图上传成功', res);
          resolve(); // 上传成功后继续处理大图
        },
        fail(err) {
          console.error('缩略图上传失败', err);
          reject(err);
        },
      });
    });
  },

  // 上传大图
  uploadLargeImage: function (largeImagePath) {
    const that = this;
    const goodsId = that.data.editItem.nxDistributerGoodsId;
    const goodsName = that.data.editItem.nxDgGoodsName;

    wx.uploadFile({
      url: that.data.url + 'api/nxdistributergoods/updateFatherBigNx',
      filePath: largeImagePath,
      name: 'file',
      formData: {
        goodsName: goodsName,
        id: goodsId,
      },
      success(res) {
        console.log('大图上传成功', res);
      },
      fail(err) {
        console.error('大图上传失败', err);
      },
    });
  },
});

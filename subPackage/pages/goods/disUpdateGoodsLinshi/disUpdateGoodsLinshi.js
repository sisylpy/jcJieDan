// pages/your_page/your_page.js

import apiUrl from '../../../../config.js';

import { disGoodsUpdate, applyAddNewGoods } from '../../../../lib/apiDistributer';
var load = require('../../../../lib/load.js');

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

    var item = wx.getStorageSync('linshiGoods');
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

  // 处理商品名称输入
  onGoodsNameInput: function(e) {
    this.setData({
      'editItem.nxDgGoodsName': e.detail.value,
      imgChanged: true
    });
  },

  // 处理规格输入
  onStandardInput: function(e) {
    this.setData({
      'editItem.nxDgGoodsStandardname': e.detail.value,
      imgChanged: true
    });
  },

  // 处理规格重量输入
  onStandardWeightInput: function(e) {
    this.setData({
      'editItem.nxDgGoodsStandardWeight': e.detail.value,
      imgChanged: true
    });
  },

  // 处理大包装输入
  onCartonUnitInput: function(e) {
    this.setData({
      'editItem.nxDgCartonUnit': e.detail.value,
      imgChanged: true
    });
  },

  // 处理大包装数量输入
  onItemsPerCartonInput: function(e) {
    this.setData({
      'editItem.nxDgItemsPerCarton': e.detail.value,
      imgChanged: true
    });
  },

  // 处理品牌输入
  onBrandInput: function(e) {
    this.setData({
      'editItem.nxDgGoodsBrand': e.detail.value,
      imgChanged: true
    });
  },

  // 处理产地输入
  onPlaceInput: function(e) {
    this.setData({
      'editItem.nxDgGoodsPlace': e.detail.value,
      imgChanged: true
    });
  },

  // 处理详细说明输入
  onDetailInput: function(e) {
    this.setData({
      'editItem.nxDgGoodsDetail': e.detail.value,
      imgChanged: true
    });
  },

  // 选择大图
  chooseLargeImage: function() {
    this.chooseImage('large');
  },

  // 选择小图
  chooseThumbnailImage: function() {
    this.chooseImage('thumbnail');
  },

  // 删除大图
  deleteLargeImage: function() {
    this.setData({
      largeImagePath: '',
      imgChanged: true
    });
  },

  // 删除小图
  deleteThumbnailImage: function() {
    this.setData({
      thumbnailPath: '',
      imgChanged: true
    });
  },

  toBack() {
    if (this.data.imgChanged) {
      this._getGoodsDetail();
    } else {
      wx.navigateBack({delta: 1})
    }
  },

  chooseImage: function (type) {
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

            // 根据类型处理图片
            if (type === 'large') {
              that.resizeImage(tempFilePath, 'largeImagePath', 800, 800).then(() => {
                that.setData({
                  loading: false,
                  imgChanged: true,
                });
                // 上传大图
                that.uploadLargeImage(that.data.largeImagePath);
                wx.showToast({
                  title: '大图上传成功',
                  icon: 'success',
                });
              }).catch((err) => {
                console.error('大图处理失败', err);
                that.setData({
                  loading: false,
                });
                wx.showToast({
                  title: '大图处理失败，请重试',
                  icon: 'none',
                });
              });
            } else if (type === 'thumbnail') {
              that.resizeImage(tempFilePath, 'thumbnailPath', 200, 200).then(() => {
                that.setData({
                  loading: false,
                  imgChanged: true,
                });
                // 上传小图
                that.uploadThumbnail(that.data.thumbnailPath);
                wx.showToast({
                  title: '小图上传成功',
                  icon: 'success',
                });
              }).catch((err) => {
                console.error('小图处理失败', err);
                that.setData({
                  loading: false,
                });
                wx.showToast({
                  title: '小图处理失败，请重试',
                  icon: 'none',
                });
              });
            }
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

  resizeImage: function (filePath, key, targetWidth, targetHeight) {
    const that = this;

    return new Promise((resolve, reject) => {
      wx.getImageInfo({
        src: filePath,
        success(info) {
          const imgWidth = info.width;
          const imgHeight = info.height;

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
          // 使用 info.path 而不是 filePath，确保图片路径正确（特别是相机拍照的情况）
          const image = canvas.createImage();
          image.src = info.path || filePath;

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
      getApp().ownerUploadFile({
        url: that.data.url + 'api/nxdistributergoods/updateFatherNx',
        filePath: thumbnailPath,
        name: 'file',
        formData: {
          goodsName: nxDgGoodsName,
          id: nxDistributerGoodsId,
        },
        success(res) {
          console.log('缩略图上传成功', res);
          resolve();
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

    getApp().ownerUploadFile({
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

  // 申请添加新商品：先保存编辑（如有），再调用 applyAddNewGoods
  updateGoods: function() {
    const that = this;

    if (that.data.loading) {
      wx.showToast({ title: '图片处理中，请稍候', icon: 'none' });
      return;
    }

    const lsGoodsId = that.data.editItem && that.data.editItem.nxDistributerGoodsId;
    if (!lsGoodsId) {
      wx.showToast({ title: '商品信息异常', icon: 'none' });
      return;
    }

    const doApply = () => {
      load.showLoading('提交中');
      applyAddNewGoods(lsGoodsId).then(res => {
        load.hideLoading();
        if (res.result && res.result.code == 0) {
          wx.showToast({ title: '已申请', icon: 'success' });
          setTimeout(() => wx.navigateBack({ delta: 1 }), 1500);
        } else {
          wx.showToast({ title: res.result.msg || '申请失败', icon: 'none' });
        }
      }).catch(err => {
        load.hideLoading();
        console.error('申请失败', err);
        wx.showToast({ title: '申请失败', icon: 'none' });
      });
    };

    if (that.data.imgChanged) {
      load.showLoading('保存中');
      disGoodsUpdate(that.data.editItem).then(res => {
        load.hideLoading();
        if (res.result && res.result.code == 0) {
          that.setData({ imgChanged: false });
          doApply();
        } else {
          wx.showToast({ title: res.result.msg || '保存失败', icon: 'none' });
        }
      }).catch(err => {
        load.hideLoading();
        wx.showToast({ title: '保存失败', icon: 'none' });
      });
    } else {
      doApply();
    }
  },

  // 获取商品详情
  _getGoodsDetail: function() {
    // 这里可以添加获取商品详情的逻辑
    wx.navigateBack({delta: 1});
  }
});

var load = require('../../../../lib/load.js');

import apiUrl from '../../../../config.js'
import {
  disGetShelfList,
  getShelfGoods,
  updateShelfName,
  deleteShelf,
  saveNewShelf,
  deleteShelfGoods,
  staffApplyPurGoods,
  disGetUnshelfGoods,
  disSavePurGoodsSaveStock,
  saveShelfGoodsStock,
  deletePlanPurchaseGoods,
  updatePurchaseGoods,
  downloadShelfStockTemplate,
  downloadShelfGoodsTemplate,
  importShelfGoodsFromExcel,
  uploadShelfStock,
  updateDisStock,
  setShelfLayer,
  clearShelfLayer,
  staffRecievePurGoods
} from '../../../../lib/apiDistributer.js'



const tabBarHeight = 50; // 根据实际情况调整
const viewBarHeight = 60;

Page({

  onShow() {
    console.log('onShow - 页面显示，开始检查刷新条件');
    if (this.data.refreshShelfListOnShow) {
      this._getDisShelfs();
      this.setData({
        refreshShelfListOnShow: false,
        needsRefreshOnShow: false,
        voiceShelfAdded: false,
        voiceShelfNewItems: []
      });
      return;
    }

    if (this.data.needsRefreshOnShow && this.data.shelfId > 0) {
      this.updateShelfGoodsData();
      this.setData({
        needsRefreshOnShow: false
      });
    }

    if (this.data.voiceShelfAdded) {
      this.updateShelfGoodsData();
      this.setData({
        voiceShelfAdded: false,
        voiceShelfNewItems: []
      });
    }

    // 优先检查是否从非货架商品详情页返回
    const fromUnshelf = wx.getStorageSync('fromUnshelfGoods');
    if (fromUnshelf) {
      // 从非货架商品详情页返回，刷新非货架商品列表
      wx.removeStorageSync('fromUnshelfGoods');
      this.getUnShelfGoods();
      return;
    }

    // 检查是否从 ailasGoodsList 页面返回
    const fromAilasGoodsList = wx.getStorageSync('fromAilasGoodsList');
    console.log('onShow - 检查 fromAilasGoodsList:', fromAilasGoodsList);
    if (fromAilasGoodsList) {
      console.log('onShow - 检测到从 ailasGoodsList 返回');
      wx.removeStorageSync('fromAilasGoodsList');
      
      // 检查是否需要刷新（如果更新失败）
      const needRefresh = wx.getStorageSync('needRefreshShelfGoods');
      if (needRefresh) {
        console.log('onShow - 检测到需要刷新，更新失败或商品不在当前列表中');
        wx.removeStorageSync('needRefreshShelfGoods');
        
        const isShowingUnshelfGoods = this.data.shelfIndex === this.data.shelfArr.length;
      if (isShowingUnshelfGoods) {
          this.getUnShelfGoods(true);
      } else if (this.data.shelfId > 0) {
          this.updateShelfGoodsData(null, true);
        }
      } else {
        // 数据已经在 ailasGoodsList 中直接更新了，这里只需要清除标记即可
        // 如果用户没有操作（没有保存商品），数据不会更新，也不需要刷新
        console.log('onShow - 数据已在 ailasGoodsList 中直接更新，无需刷新');
      }
      return;
    }

    if (this.data.update) {
      // 清除 update 标记，避免重复刷新
      this.setData({
        update: false
      });
      
      // 判断当前显示的是未上架商品还是已上架商品
      // shelfIndex === shelfArr.length 表示选中了"非货架"
      const isShowingUnshelfGoods = this.data.shelfIndex === this.data.shelfArr.length;

      if (isShowingUnshelfGoods) {
        // 当前显示未上架商品，刷新未上架商品列表
        this.getUnShelfGoods();
      } else if (this.data.shelfArr && this.data.shelfArr.length > 0) {
        // 当前显示已上架商品，根据 shelfIndex 确定要刷新的货架
        const shelfIndex = this.data.shelfIndex;
        
        // 检查 shelfIndex 是否有效
        if (shelfIndex >= 0 && shelfIndex < this.data.shelfArr.length) {
          const currentShelf = this.data.shelfArr[shelfIndex];
          const currentShelfId = currentShelf?.nxDistributerGoodsShelfId;
          
          // 如果 shelfId 和 shelfIndex 不匹配，先同步 shelfId
          if (this.data.shelfId !== currentShelfId) {
            console.log('onShow - shelfId 和 shelfIndex 不匹配，同步 shelfId');
            this.setData({
              shelfId: currentShelfId,
              shelfItem: currentShelf
            });
          }
          
          // 刷新当前货架的数据
          if (currentShelfId > 0) {
        this.updateShelfGoodsData();
          }
        } else {
          // shelfIndex 无效，重新初始化
          console.warn('onShow - shelfIndex 无效，重新初始化');
          this._getDisShelfs();
        }
      }
    }


  },



  data: {

    contentHeight: 0,
    leftMenuWidth: 200, // 左侧菜单宽度，单位 rpx
    navBarHeight: 0,
    tabBarHeight: 0,

    totalPage: 0,
    totalCount: 0,
    limit: 15,
    currentPage: 1,
    toTop: 0,
    shelfItem: null,
    shelfArr: [],
    shelfGoodsList: [],
    unShelfGoodsList: [],
    shelfId: -1,
    shelfIndex: 0,
    isLoading: false,
    showPlanPurchase: false,
    showInputPurGoods: false,
    showInputPurStock: false,
    showEditPurGoods: false,
    isEditPurchase: false,
    isUnshelfEdit: false,
    restWeight: "0",
    maxRestWeight: 0,
    purchaseGoods: null,
    voiceShelfAdded: false,
    voiceShelfNewItems: [],
    needsRefreshOnShow: false,
    refreshShelfListOnShow: false,
    stockRestWeightTotal: 0,
    showStockDetail: false,
    layerTextMap: {
      1: '第一层结束',
      2: '第二层结束',
      3: '第三层结束',
      4: '第四层结束',
      5: '第五层结束',
      6: '第六层结束',
      7: '第七层结束',
      8: '第八层结束',
      9: '第九层结束',
      10: '第十层结束'
    },
    isListView: false,
    url: '',
    isUnshelfSelected: false,
    showImageModal: false,
    currentImage: '',
    currentGoods: null,
  },

  onLoad(e) {

    const app = getApp();
    const globalData = app.globalData;
    const navBarHeight = globalData.navBarHeight;
    const screenHeight = globalData.screenHeight;
    const screenWidth = globalData.screenWidth;
    const rpxRatio = 750 / screenWidth;
    const navBarHeightRpx = navBarHeight * rpxRatio;
    const tabBarHeightRpx = 100;
    const viewBarHeightRpx = viewBarHeight * rpxRatio;

    const contentHeight = (screenHeight - navBarHeight - viewBarHeight) * rpxRatio;


    this.setData({

      contentHeight: contentHeight,
      navBarHeight: navBarHeightRpx,
      tabBarHeight: tabBarHeightRpx,
      viewBarHeight: viewBarHeightRpx,
      leftMenuWidth: 100, // 左侧菜单宽度，单位 rpx

    });

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      statusBarHeight: globalData.statusBarHeight * globalData.rpxR,
      scrollViewTop: 0,
      showEditPurchase: false,
      show: false,
      showPay: false,
      batchCount: 0,
      hide: false,
      scrollTop: 0,
      shelfIndex: 0,
      url: apiUrl.server,
    })
    // 
    var disInfo = wx.getStorageSync('disInfo');
    if (disInfo) {
      this.setData({
        disInfo: disInfo
      })
    }
    var value = wx.getStorageSync('userInfo');
    if (value) {
      this.setData({
        disId: value.nxDistributerEntity.nxDistributerId,
        userInfo: value,
        userId: value.nxDistributerUserId,
      })
      this._getDisShelfs();

    }


  },

  // ./show

  _formatStockList(list = []) {
    if (!Array.isArray(list)) {
      return [];
    }
    return list.map(item => {
      const stockList = Array.isArray(item.nxDisGoodsShelfStockEntities) ? item.nxDisGoodsShelfStockEntities : [];
      const totalRestWeight = stockList.reduce((sum, stock) => {
        const weight = Number(stock && stock.nxDgssRestWeight ? stock.nxDgssRestWeight : 0);
        return sum + (isNaN(weight) ? 0 : weight);
      }, 0);
      return {
        ...item,
        totalRestWeight
      };
    });
  },

  _formatShelfGoodsList(list = []) {
    return this._formatStockList(list);
  },

  _formatUnShelfGoodsList(list = []) {
    return list.map(item => {
      const stockList = Array.isArray(item.nxDisGoodsShelfStockEntities) ? item.nxDisGoodsShelfStockEntities : [];
      const totalRestWeight = stockList.reduce((sum, stock) => {
        const weight = Number(stock && stock.nxDgssRestWeight ? stock.nxDgssRestWeight : 0);
        return sum + (isNaN(weight) ? 0 : weight);
      }, 0);
      return {
        ...item,
        totalRestWeight,
        stockList
      };
    });
  },

  showType() {
    this.setData({
      isListView: !this.data.isListView
    });
  },

  updateShelfGoodsData(e, keepCurrentPage = false) {
    console.log('updateShelfGoodsData - 开始刷新货架商品，shelfId:', this.data.shelfId, 'keepCurrentPage:', keepCurrentPage);

    // 如果保持当前页且当前页 > 1，需要重新加载所有已加载的页面
    if (keepCurrentPage && this.data.currentPage > 1) {
      console.log('updateShelfGoodsData - 保持当前页，当前页:', this.data.currentPage, '需要重新加载前', this.data.currentPage, '页');
      this._refreshShelfGoodsWithCurrentPage();
      return;
    }

    // 否则只加载第一页
    getShelfGoods(this.data.shelfId, 1, this.data.limit)
      .then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          console.log("res.result.data", res.result.data);
          const pageData = res.result.page || {};
          this.setData({
            unShelfGoodsList: [],
            shelfGoodsList: this._formatShelfGoodsList(pageData.list || []),
            isUnshelfSelected: false,
            totalCount: pageData.totalCount || 0,
            totalPage: pageData.totalPage || 0,
            currentPage: pageData.currPage || 1,
            isLoading: false,
          })
          console.log('updateShelfGoodsData - 刷新完成，商品数量:', pageData.list ? pageData.list.length : 0);
        } else {
          load.hideLoading();
          console.log('updateShelfGoodsData - 刷新失败，code:', res.result.code);
        }
      })
  },

  // 重新加载从第1页到当前页的所有数据，保持滚动位置
  _refreshShelfGoodsWithCurrentPage() {
    const currentPage = this.data.currentPage;
    const shelfId = this.data.shelfId;
    const limit = this.data.limit;

    console.log('_refreshShelfGoodsWithCurrentPage - 开始重新加载，当前页:', currentPage);

    // 记录当前已加载的商品数量（用于计算滚动位置）
    const currentGoodsCount = this.data.shelfGoodsList.length;

    // 清空列表，准备重新加载
    this.setData({
      shelfGoodsList: [],
      isLoading: true
    });

    // 依次加载从第1页到当前页的所有数据
    let allGoods = [];
    let loadedPages = 0;

    const loadPage = (page) => {
      return getShelfGoods(shelfId, page, limit).then(res => {
        if (res.result.code == 0) {
          const pageData = res.result.page || {};
          const pageGoods = this._formatShelfGoodsList(pageData.list || []);
          allGoods = [...allGoods, ...pageGoods];
          loadedPages++;

          // 更新总数和总页数（使用最后一页的数据）
          if (page === currentPage) {
            this.setData({
              shelfGoodsList: allGoods,
              totalCount: pageData.totalCount || 0,
              totalPage: pageData.totalPage || 0,
              currentPage: pageData.currPage || 1,
              isLoading: false,
            });

            // 恢复滚动位置（通过设置 toTop，但这里我们需要保持滚动位置）
            // 由于 scroll-view 的 scroll-top 是像素值，我们无法精确恢复
            // 但可以通过不重置 toTop 来保持大致位置
            console.log('_refreshShelfGoodsWithCurrentPage - 刷新完成，商品数量:', allGoods.length);
            load.hideLoading();
          } else if (page < currentPage) {
            // 继续加载下一页
            return loadPage(page + 1);
          }
        } else {
          console.log('_refreshShelfGoodsWithCurrentPage - 加载第', page, '页失败');
          this.setData({
            isLoading: false
          });
          load.hideLoading();
        }
      });
    };

    load.showLoading("刷新数据中");
    loadPage(1);
  },


  _getShelfGoods() {

    console.log("_getShelfGoods_getShelfGoods")
    load.showLoading("获取商品");
    getShelfGoods(this.data.shelfId, 1, this.data.limit)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          load.hideLoading();
          const pageData = res.result.page || {};
          this.setData({
            shelfGoodsList: this._formatShelfGoodsList(pageData.list || []),
            isUnshelfSelected: false,
            totalCount: pageData.totalCount || 0,
            totalPage: pageData.totalPage || 0,
            currentPage: pageData.currPage || 1,
            isLoading: false,
          })
        } else {
          load.hideLoading();

        }
      })
  },

  // 下载货架商品模板（wxml中调用的方法名）
  downLoadInitShelfGoods() {
    this.downLoadShelfGoodsTemplate();
  },

  // 从Excel导入货架商品（wxml中调用的方法名）
  uploadInitShelfGoods() {
    this.importShelfGoodsFromExcel();
  },

  // 下载货架商品模板
  downLoadShelfGoodsTemplate() {
    const shelfId = this.data.shelfId;
    if (!shelfId || Number(shelfId) <= 0) {
      wx.showToast({
        title: '请先选择货架',
        icon: 'none'
      });
      return;
    }
    load.showLoading('下载模板');
    downloadShelfGoodsTemplate(shelfId)
      .then(tempFilePath => {
        load.hideLoading();
        wx.openDocument({
          filePath: tempFilePath,
          fileType: 'xls',
          showMenu: true,
          success: () => {},
          fail: () => {
            wx.showToast({
              title: '打开模板失败',
              icon: 'none'
            });
          }
        });
      })
      .catch(() => {
        load.hideLoading();
        wx.showToast({
          title: '下载模板失败',
          icon: 'none'
        });
      });
  },

  // 从Excel导入货架商品
  importShelfGoodsFromExcel() {
    const shelfId = this.data.shelfId;
    if (!shelfId || Number(shelfId) <= 0) {
      wx.showToast({
        title: '请先选择货架',
        icon: 'none'
      });
      return;
    }

    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xls'],
      success: (res) => {
        if (res.tempFiles.length === 0) {
          return;
        }
        const filePath = res.tempFiles[0].path;
        load.showLoading('上传中');
        importShelfGoodsFromExcel({
          shelfId,
          filePath,
          operatorId: this.data.userId
        }).then((uploadRes) => {
          load.hideLoading();
          const result = uploadRes.result || {};
          if (result.code === 0) {
            const summary = result.result || {};
            wx.showToast({
              title: `成功${summary.success || 0}条`,
              icon: 'success'
            });
            this.updateShelfGoodsData();
            if (summary.failItems && summary.failItems.length > 0) {
              const failMsg = summary.failItems.map(item => `行 ${item.row}: ${item.message}`).join('\n');
              wx.showModal({
                title: '部分导入失败',
                content: failMsg,
                showCancel: false
              });
            }
          } else {
            wx.showToast({
              title: result.msg || '上传失败',
              icon: 'none'
            });
          }
        }).catch(() => {
          load.hideLoading();
          wx.showToast({
            title: '上传失败',
            icon: 'none'
          });
        });
      },
      fail: () => {}
    });
  },

  downLoadInitStock() {
    const shelfId = this.data.shelfId;
    if (!shelfId || Number(shelfId) <= 0) {
      wx.showToast({
        title: '请先选择货架',
        icon: 'none'
      });
      return;
    }
    load.showLoading('下载模板');
    downloadShelfStockTemplate(shelfId)
      .then(tempFilePath => {
        load.hideLoading();
        wx.openDocument({
          filePath: tempFilePath,
          fileType: 'xls',
          showMenu: true,
          success: () => {},
          fail: () => {
            wx.showToast({
              title: '打开模板失败',
              icon: 'none'
            });
          }
        });
      })
      .catch(() => {
        load.hideLoading();
        wx.showToast({
          title: '下载模板失败',
          icon: 'none'
        });
      });
  },

  uploadInitStock() {
    const shelfId = this.data.shelfId;
    if (!shelfId || Number(shelfId) <= 0) {
      wx.showToast({
        title: '请先选择货架',
        icon: 'none'
      });
      return;
    }

    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['xls'],
      success: (res) => {
        if (res.tempFiles.length === 0) {
          return;
        }
        const filePath = res.tempFiles[0].path;
        load.showLoading('上传中');
        uploadShelfStock({
          shelfId,
          filePath,
          operatorId: this.data.userId
        }).then((uploadRes) => {
          load.hideLoading();
          const result = uploadRes.result || {};
          if (result.code === 0) {
            const summary = result.result || {};
            wx.showToast({
              title: `成功${summary.success || 0}条`,
              icon: 'success'
            });
            this.updateShelfGoodsData();
            if (summary.failItems && summary.failItems.length > 0) {
              const failMsg = summary.failItems.map(item => `行 ${item.row}: ${item.message}`).join('\n');
              wx.showModal({
                title: '部分导入失败',
                content: failMsg,
                showCancel: false
              });
            }
          } else {
            wx.showToast({
              title: result.msg || '上传失败',
              icon: 'none'
            });
          }
        }).catch(() => {
          load.hideLoading();
          wx.showToast({
            title: '上传失败',
            icon: 'none'
          });
        });
      },
      fail: () => {}
    });
  },

  changeShelfId(e) {
    console.log(e);
    console.log("abbdbdbddbds-changeShelfIdchangeShelfId")
    this.setData({
      shelfIndex: e.currentTarget.dataset.index,
      shelfItem: e.currentTarget.dataset.item,
      shelfId: e.currentTarget.dataset.id,
      currentPage: 1, // 切换货架时重置到第一页
      isLoading: false, // 重置加载状态
      toTop: 0, // 滚动到顶部
    })
    load.showLoading("获取数据中");
    getShelfGoods(e.currentTarget.dataset.id, 1, this.data.limit)
      .then(res => {
        load.hideLoading();
        console.log("reeee", res)
        if (res.result.code == 0) {
          const pageData = res.result.page || {};
          this.setData({
            unShelfGoodsList: [],
            shelfGoodsList: this._formatShelfGoodsList(pageData.list || []),
            isUnshelfSelected: false,
            totalCount: pageData.totalCount || 0,
            totalPage: pageData.totalPage || 0,
            currentPage: pageData.currPage || 1,
            isLoading: false,
            toTop: 0, // 确保滚动到顶部
          })
        } else {


        }
      })
  },

  toShowTools(e) {
    if (this.data.isShowTools) {
      this.setData({
        isShowTools: false,
      })
    } else {
      this.setData({
        isShowTools: true,
      })
    }

  },

  hideShowTools() {
    this.setData({
      isShowTools: false,
      isEditShelf: false,
      showOperation: false,
    })
  },

  // 阻止事件冒泡
  stopPropagation(e) {
    // 空方法，仅用于阻止事件冒泡
  },

  hideChoice() {
    this.setData({
      isEditGoods: false,
      showOperation: false,
      item: "",
      isShowTools: false,
      isUnshelfSelected: false,
    })

  },

  changeShelf(e) {
    console.log('=== changeShelf 方法开始 ===');
    console.log('this.data.shelfGoods:', this.data.shelfGoods);
    console.log('this.data.disGoods:', this.data.disGoods);
    console.log('this.data.shelfItem:', this.data.shelfItem);
    
    this.setData({
      showOperation: false
    })
    
    // 如果有 shelfGoods，保存它（更新模式）；否则保存 disGoods（添加模式）
    if (this.data.shelfGoods) {
      // 更新模式：保存 shelfItem 和 shelfGoods
      console.log('📝 更新模式：保存 shelfItem 和 shelfGoods');
      wx.setStorageSync('shelfItem', this.data.shelfItem);
      wx.setStorageSync('shelfGoods', this.data.shelfGoods);
      console.log('保存的 shelfItem:', this.data.shelfItem);
      console.log('保存的 shelfGoods:', this.data.shelfGoods);
    } else {
      // 添加模式：清除 shelfItem 和 shelfGoods，只保存 disGoods
      console.log('📝 添加模式：清除 shelfItem 和 shelfGoods');
      wx.removeStorageSync('shelfItem'); // 清除可能存在的旧数据
      wx.removeStorageSync('shelfGoods'); // 清除可能存在的旧数据
      console.log('已清除 shelfItem 和 shelfGoods');
    }
    
    // 保存 disGoods 用于添加模式
    if (this.data.disGoods) {
      console.log('📝 保存 disGoods 到 goodsItem');
      wx.setStorageSync('goodsItem', this.data.disGoods);
      console.log('保存的 disGoods:', this.data.disGoods);
    }
    
    // 验证 storage 中的值
    console.log('=== 验证 storage 中的值 ===');
    console.log('storage shelfItem:', wx.getStorageSync('shelfItem'));
    console.log('storage shelfGoods:', wx.getStorageSync('shelfGoods'));
    console.log('storage goodsItem:', wx.getStorageSync('goodsItem'));
    
    wx.navigateTo({
      url: '../changeShelf/changeShelf?disId=' + this.data.disId,
    })

  },

  showChoice(e) {
    var disGoods = e.currentTarget.dataset.goods;
    this.setData({
      showOperation: true,
      isEditGoods: true,
      disGoods: disGoods,
      shelfGoods: e.currentTarget.dataset.shelfgoods,
      isUnshelfSelected: false,
    })
  },

  showChoiceUn(e) {
    var disGoods = e.currentTarget.dataset.goods;
    const stockList = Array.isArray(disGoods.nxDisGoodsShelfStockEntities) ? disGoods.nxDisGoodsShelfStockEntities : [];
    const fakeShelfGoods = {
      nxDistributerGoodsEntity: disGoods,
      nxDisGoodsShelfStockEntities: stockList,
    };
    this.setData({
      showOperation: true,
      isEditGoods: true,
      disGoods: disGoods,
      shelfGoods: fakeShelfGoods,
      isUnshelfSelected: true,
    })
  },

  showEditGoods(e) {
    this.setData({
      showChoice: false,
      isEditGoods: true,
    })
  },

  addNew(e) {
    this.setData({
      showAdd: true,
      isEditShelf: false
    })
  },


  /**
   * 修改采购商品（货架商品）
   */
  editPurchaseGoods() {
    console.log('editPurchaseGoods called');
    console.log('shelfGoods:', this.data.shelfGoods);
    console.log('shelfPurGoods:', this.data.shelfGoods.shelfPurGoods);

    this.setData({
      showEditPurGoods: true,
      item: this.data.disGoods,
      applyStandardName: this.data.shelfGoods.shelfPurGoods.nxDpgStandard,
      planOrder: this.data.shelfGoods.shelfPurGoods.nxDpgQuantity.toString(),
      priceLevel: this.data.shelfGoods.shelfPurGoods.nxDpgCostLevel,
      purchaseGoods: this.data.shelfGoods.shelfPurGoods,
      showOperation: false,
      isEditPurchase: true, // 标识为修改模式
    })

    console.log('showEditPurGoods set to true');
  },

  /**
   * 修改采购商品（非货架商品）
   */
  editPurchaseGoodsUnShelf() {
    console.log('editPurchaseGoodsUnShelf called');
    console.log('disGoods:', this.data.disGoods);
    console.log('shelfPurGoods:', this.data.disGoods.shelfPurGoods);

    if (!this.data.disGoods || !this.data.disGoods.shelfPurGoods) {
      wx.showToast({
        title: '采购信息不存在',
        icon: 'none'
      });
      return;
    }

    const shelfPurGoods = this.data.disGoods.shelfPurGoods;

    this.setData({
      showEditPurGoods: true,
      item: this.data.disGoods,
      applyStandardName: shelfPurGoods.nxDpgStandard || this.data.disGoods.nxDgGoodsStandardname,
      planOrder: shelfPurGoods.nxDpgQuantity ? shelfPurGoods.nxDpgQuantity.toString() : '',
      priceLevel: shelfPurGoods.nxDpgCostLevel || '1',
      purchaseGoods: shelfPurGoods,
      showOperation: false,
      isEditPurchase: true, // 标识为修改模式
      isUnshelfEdit: true, // 标识为非货架商品修改
    })

    console.log('showEditPurGoods set to true for unshelf goods');
  },


  /**
   * 确认修改采购商品
   */
  confirmEditPurGoods(e) {
    var purGoods = this.data.purchaseGoods;
    purGoods.nxDpgQuantity = e.detail.planOrder;
    purGoods.nxDpgStandard = e.detail.applyStandardName;
    purGoods.nxDpgCostLevel = e.detail.priceLevel;

    load.showLoading("修改进货商品")
    updatePurchaseGoods(purGoods).then(res => {
      if (res.result.code == 0) {
        wx.showToast({
          title: '进货商品修改成功',
        })
        load.hideLoading();
        
        const isUnshelfEdit = this.data.isUnshelfEdit || false;
        const isUnshelf = isUnshelfEdit || this.data.isUnshelfSelected;
        const disGoods = this.data.disGoods;
        const goodsId = disGoods?.nxDistributerGoodsId;
        const shelfGoodsId = !isUnshelf && this.data.shelfGoods?.nxDistributerGoodsShelfGoodsId;
        
        // 获取更新后的采购商品信息（从接口返回或使用更新后的 purGoods）
        const updatedPurchaseGoods = res.result.data || purGoods;
        
        // 优化：只更新列表中对应商品的采购信息，不刷新整个列表
        if (goodsId) {
          this.updatePurchaseGoodsInList(goodsId, shelfGoodsId, updatedPurchaseGoods, isUnshelf);
        }
        
        this.setData({
          showEditPurGoods: false,
          showOperation: false,
          isEditPurchase: false,
          isUnshelfEdit: false,
        })
      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
    .catch(err => {
      load.hideLoading();
      console.error('confirmEditPurGoods error:', err);
      wx.showToast({
        title: '修改失败，请重试',
        icon: 'none'
      });
    });
  },

  /**
   * 关闭修改采购弹窗
   */
  closeEditPurGoods() {
    this.setData({
      showEditPurGoods: false,
      showOperation: false,
      isEditPurchase: false,
      isUnshelfEdit: false,
    })
  },

  /**
   * 删除采购商品
   */
  deletePurGoods() {
    var id = this.data.purchaseGoods.nxDistributerPurchaseGoodsId;
    if (!id) {
      wx.showToast({
        title: '采购商品数据异常',
        icon: 'none'
      });
      return;
    }

    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个采购商品吗？',
      success: (res) => {
        if (res.confirm) {
          load.showLoading("删除采购商品中");
          deletePlanPurchaseGoods(id).then(res => {
            load.hideLoading();
            if (res.result.code == 0) {
              wx.showToast({
                title: '删除成功',
                icon: 'success'
              })

              // 保存当前是否为非货架商品的标识
              const isUnshelfEdit = this.data.isUnshelfEdit || false;
              const isUnshelf = isUnshelfEdit || this.data.isUnshelfSelected;
              const disGoods = this.data.disGoods;
              const goodsId = disGoods?.nxDistributerGoodsId;
              const shelfGoodsId = !isUnshelf && this.data.shelfGoods?.nxDistributerGoodsShelfGoodsId;

              // 优化：只更新列表中对应商品的采购信息（删除），不刷新整个列表
              if (goodsId) {
                this.updatePurchaseGoodsInList(goodsId, shelfGoodsId, null, isUnshelf);
              }

              this.setData({
                showEditPurGoods: false,
                showOperation: false,
                isEditPurchase: false,
                isUnshelfEdit: false,
              })
            } else {
              wx.showToast({
                title: res.result.msg,
                icon: 'none'
              })
            }
          })
          .catch(err => {
            load.hideLoading();
            console.error('deletePurGoods error:', err);
            wx.showToast({
              title: '删除失败，请重试',
              icon: 'none'
            });
          });
        }
      }
    })
  },


  // auto
  showInputOrder(e) {
    // 根据 nxDgCartonUnit 是否为 null 决定使用哪个规格
    const disGoods = this.data.disGoods;
    const standardName = disGoods.nxDgCartonUnit !== null && disGoods.nxDgCartonUnit !== undefined && disGoods.nxDgCartonUnit !== '' ?
      disGoods.nxDgCartonUnit :
      disGoods.nxDgGoodsStandardname;
    this.setData({
      showPlanPurchase: true,
      item: disGoods,
      applyStandardName: standardName,
      windowHeight: this.data.windowHeight,
      showOperation: false,
    })
  },

  confirm(e) {
    console.log(e);
    var goodsId = this.data.disGoods.nxDistributerGoodsId;
    var fatherGoodsId = this.data.disGoods.nxDgDfgGoodsFatherId;
    var grandGoodsId = this.data.disGoods.nxDgDfgGoodsGrandId;
    var plan = e.detail.planOrder;
    var standard = e.detail.applyStandardName || this.data.item.nxDgGoodsStandardname;
    var restWeight = typeof e.detail.restWeight !== 'undefined' ? e.detail.restWeight : this.data.restWeight;
    if (restWeight === '' || restWeight === null || typeof restWeight === 'undefined') {
      restWeight = 0;
    }
    var restWeightNum = Number(restWeight);
    if (isNaN(restWeightNum) || restWeightNum < 0) {
      restWeightNum = 0;
    }
    var maxRestWeightNum = Number(this.data.maxRestWeight || 0);
    if (maxRestWeightNum && restWeightNum > maxRestWeightNum) {
      wx.showToast({
        title: '剩余库存不能超过' + this.data.maxRestWeight,
        icon: 'none'
      })
      restWeightNum = maxRestWeightNum;
    }
    var usedStockWeight = maxRestWeightNum ? maxRestWeightNum - restWeightNum : 0;
    if (usedStockWeight < 0) {
      usedStockWeight = 0;
    }

    var purGoods = {
      nxDpgDisGoodsId: goodsId,
      nxDpgDisGoodsFatherId: fatherGoodsId,
      nxDpgDisGoodsGrandId: grandGoodsId,
      nxDpgQuantity: plan,
      nxDpgStandard: standard,
      nxDpgDistributerId: this.data.disId,
      nxDpgInputType: 1,
      nxDpgCostLevel: e.detail.priceLevel,
      nxDpgPurchaseType: 0,
      nxDpgPurchaseDate: this.data.arriveDate,
      nxDpgStockRestWeight: usedStockWeight
    }

    // 如果是修改模式，添加采购商品ID
    // 判断是货架商品还是非货架商品
    if (this.data.isEditPurchase) {
      if (this.data.isUnshelfEdit && this.data.disGoods && this.data.disGoods.shelfPurGoods) {
        // 非货架商品：从 disGoods.shelfPurGoods 获取采购商品ID
        purGoods.nxDistributerPurchaseGoodsId = this.data.disGoods.shelfPurGoods.nxDistributerPurchaseGoodsId;
      } else if (this.data.shelfGoods && this.data.shelfGoods.shelfPurGoods) {
        // 货架商品：从 shelfGoods.shelfPurGoods 获取采购商品ID
        purGoods.nxDistributerPurchaseGoodsId = this.data.shelfGoods.shelfPurGoods.nxDistributerPurchaseGoodsId;
      }
    }
    var loadingText = this.data.isEditPurchase ? "修改进货商品" : "保存进货商品";
    var successText = this.data.isEditPurchase ? "进货商品修改成功" : "进货商品保存成功";

    // 保存当前是否为非货架商品的标识（goodsId 和 disGoods 已在上面声明）
    const isUnshelfEdit = this.data.isUnshelfEdit || false;
    const isUnshelf = isUnshelfEdit || this.data.isUnshelfSelected;
    const shelfGoodsId = !isUnshelf && this.data.shelfGoods?.nxDistributerGoodsShelfGoodsId;
    
    purGoods.nxDpgApplyShelfId = this.data.shelfId;
    load.showLoading(loadingText);
    staffApplyPurGoods(purGoods).then(res => {
      if (res.result.code == 0) {
        wx.showToast({
          title: successText,
          icon: 'success'
        });
        load.hideLoading();
        
        // 获取更新后的采购商品信息（从接口返回或使用提交的数据）
        const updatedPurchaseGoods = res.result.data || purGoods;
        
        // 优化：只更新列表中对应商品的采购信息，不刷新整个列表
        if (goodsId) {
          this.updatePurchaseGoodsInList(goodsId, shelfGoodsId, updatedPurchaseGoods, isUnshelf);
        }
        
        this.setData({
          show: false,
          showOperation: false,
          isEditPurchase: false, // 重置修改模式
          isUnshelfEdit: false, // 重置非货架商品标识
        });
      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        });
      }
    })
    .catch(err => {
      load.hideLoading();
      console.error('staffApplyPurGoods error:', err);
      wx.showToast({
        title: '操作失败，请重试',
        icon: 'none'
      });
    });
  },



  // 显示配送商品图片弹窗
  showDisImageModal: function (e) {
    console.log("showDisImageModal", e)
    const goods = e.currentTarget.dataset.goods;
    if (!goods) {
      console.error('商品数据为空');
      return;
    }

    // 优先使用大图，如果没有则使用普通图
    const imageFile = goods.nxDgGoodsFileLarge || goods.nxDgGoodsFile;
    if (!imageFile || imageFile === 'null') {
      wx.showToast({
        title: '该商品暂无图片',
        icon: 'none'
      });
      return;
    }

    // 处理图片URL，对特殊字符进行编码
    const baseUrl = this.data.url;
    // 如果文件名包含路径，需要分别处理路径和文件名
    // 使用 encodeURI 编码整个路径（会保留 / 等路径字符，但编码空格等特殊字符）
    // 如果 encodeURI 没有编码空格，则手动替换
    let imageUrl = baseUrl + imageFile;
    try {
      // 尝试使用 encodeURI，它会编码空格等字符但保留路径分隔符
      const encoded = encodeURI(imageFile);
      // 如果 encodeURI 没有编码空格（某些浏览器可能不编码），手动处理
      imageUrl = baseUrl + encoded.replace(/\s/g, '%20');
    } catch (e) {
      // 如果编码失败，至少处理空格
      imageUrl = baseUrl + imageFile.replace(/\s/g, '%20');
    }
    console.log('原始图片文件:', imageFile);
    console.log('编码后图片URL:', imageUrl);

    this.setData({
      showImageModal: true,
      currentImage: imageUrl,
      currentGoods: goods
    });
  },

  // 隐藏图片弹窗
  hideImageModal: function () {
    this.setData({
      showImageModal: false,
      currentImage: '',
      currentGoods: null
    });
  },

  // 图片加载成功
  onImageLoad: function (e) {
    console.log('图片加载成功');
  },

  // 图片加载失败
  onImageError: function (e) {
    console.error('图片加载失败', e);
    wx.showToast({
      title: '图片加载失败',
      icon: 'none'
    });
  },


  confirmInputPurStock(e) {
    // 从组件获取数据
    const item = e.detail.item;

    // 获取商品基本信息
    const disGoods = this.data.disGoods || item.nxDistributerGoodsEntity;
    const goodsId = disGoods.nxDistributerGoodsId;
    const fatherGoodsId = disGoods.nxDgDfgGoodsFatherId;
    const grandGoodsId = disGoods.nxDgDfgGoodsGrandId;

    // 获取采购相关数据
    // 注意：数量字段是 nxDpgBuyQuantity，保存用户输入的原始数量（箱数或最小单位数量）
    let buyQuantity = item.nxDpgBuyQuantity || item.nxDpgQuantity || ""; // 采购数量（用户输入的原始值）

    const buyPrice = item.nxDpgBuyPrice || ""; // 采购单价
    const buySubtotal = item.nxDpgBuySubtotal || ""; // 小计
    const expectPrice = item.nxDpgExpectPrice || ""; // 期望售价
    const standard = item.nxDpgStandard || disGoods.nxDgGoodsStandardname || ""; // 规格
    const isShowTools = item.isShowTools || false; // 等待入库标识

    // 验证必填字段
    if (!buyQuantity || buyQuantity.length == 0) {
      wx.showToast({
        title: '采购数量不能为空',
        icon: 'none'
      })
      return;
    }

    if (!buyPrice || buyPrice.length == 0) {
      wx.showToast({
        title: '采购单价不能为空',
        icon: 'none'
      })
      return;
    }

    // 构建采购商品数据
    const purGoods = {
      nxDpgDisGoodsId: goodsId,
      nxDpgDisGoodsFatherId: fatherGoodsId,
      nxDpgDisGoodsGrandId: grandGoodsId,
      nxDpgQuantity: buyQuantity, // 采购数量（用户输入的原始值，如：2箱）
      nxDpgStandard: standard, // 规格
      nxDpgBuyPrice: buyPrice, // 采购单价（用户输入的原始价格，后台会计算）
      nxDpgBuySubtotal: buySubtotal, // 小计
      nxDpgExpectPrice: expectPrice, // 期望售价（用户输入的原始价格，后台会计算）
      nxDpgDistributerId: this.data.disId,
      nxDpgInputType: 1,
      nxDpgPurchaseType: -1,
      isShowTools: isShowTools, // 等待入库标识
      nxDpgPurUserId: this.data.userInfo ? this.data.userInfo.nxDistributerUserId : null
    }

    // 根据文档：双单价和双零售价功能
    // 库存批次表需要保存的字段：nxDgssPrice, nxDgssPriceCarton, nxDgssSellingPrice, nxDgssSellingPriceCarton
    // 注意：价格字段直接使用用户输入的原始值，不除以箱数，后台会自己计算
    purGoods.nxDgssPrice = buyPrice; // 采购单价（用户输入的原始价格，后台会计算）
    if (expectPrice) {
      purGoods.nxDgssSellingPrice = expectPrice; // 建议零售价（用户输入的原始价格，后台会计算）
    }

    // 如果商品有外包装，需要同时保存箱单价和箱零售价
    if (disGoods && disGoods.nxDgCartonUnit !== null && disGoods.nxDgCartonUnit !== undefined && disGoods.nxDgCartonUnit !== '') {
      // 从 item 中获取箱单价和箱零售价（如果组件已传递）
      if (item.nxDgssPriceCarton) {
        purGoods.nxDgssPriceCarton = item.nxDgssPriceCarton; // 外包装采购单价
      }
      if (item.nxDgssSellingPriceCarton) {
        purGoods.nxDgssSellingPriceCarton = item.nxDgssSellingPriceCarton; // 外包装建议零售价
      }
    }

    // 如果有到货日期，添加
    if (this.data.arriveDate) {
      purGoods.nxDpgPurchaseDate = this.data.arriveDate;
    }

    // 如果有货架商品ID，添加到提交数据中
    if (this.data.shelfGoods && this.data.shelfGoods.nxDistributerGoodsShelfGoodsId) {
      purGoods.nxDistributerGoodsShelfGoodsId = this.data.shelfGoods.nxDistributerGoodsShelfGoodsId;
    }

    var loadingText = this.data.isEditPurchase ? "修改进货商品" : "保存进货商品";
    var successText = this.data.isEditPurchase ? "进货商品修改成功" : "进货商品保存成功";

    const isUnshelf = this.data.unShelfGoodsList.length > 0;
    const shelfGoodsId = !isUnshelf && this.data.shelfGoods?.nxDistributerGoodsShelfGoodsId;
    
    load.showLoading(loadingText);
    disSavePurGoodsSaveStock(purGoods).then(res => {
      if (res.result.code == 0) {
        wx.showToast({
          title: successText,
          icon: 'success'
        });
        load.hideLoading();
        
        // 优化：只更新列表中对应商品的库存和采购信息，不刷新整个列表
        const resultData = res.result.data || {};
        console.log('disSavePurGoodsSaveStock - 接口返回数据（完整）:', JSON.stringify(resultData, null, 2));
        console.log('disSavePurGoodsSaveStock - 接口返回数据（对象）:', resultData);
        
        if (goodsId) {
          // 如果接口返回了采购商品信息，更新采购信息
          if (resultData.purchaseGoods) {
            console.log('disSavePurGoodsSaveStock - 更新采购信息');
            this.updatePurchaseGoodsInList(goodsId, shelfGoodsId, resultData.purchaseGoods, isUnshelf);
          }
          
          // 检查是否有库存批次信息（可能是列表或单个对象）
          const hasStockList = resultData.stockEntities || resultData.nxDisGoodsShelfStockEntities || resultData.stockList;
          // 检查是否是单个库存对象（有 nxDgssDate 或 nxDistributerGoodsShelfStockId 等字段）
          const isSingleStock = resultData.nxDistributerGoodsShelfStockId || resultData.nxDgssDate;
          
          if (hasStockList || isSingleStock) {
            console.log('disSavePurGoodsSaveStock - 更新库存信息，hasStockList:', hasStockList, 'isSingleStock:', isSingleStock);
            this.updateStockInList(goodsId, shelfGoodsId, null, resultData, isUnshelf);
          } else {
            console.warn('disSavePurGoodsSaveStock - 未找到库存批次信息，返回数据:', resultData);
          }
        }
        
        this.setData({
          showInputPurStock: false,
          showOperation: false,
          isEditPurchase: false, // 重置修改模式
          item: null, // 清空item对象，避免下次打开弹窗时遗留数据
        });
      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg || '保存失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      load.hideLoading();
      console.error('disSavePurGoodsSaveStock error:', err);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      });
    });
  },


  _getDisShelfs() {
    // 1. 先拉左侧所有货架
    disGetShelfList(this.data.disId).then(res => {
      if (res.result.code === 0) {
        console.log("rrr", res.result.data);
        const shelfList = res.result.data.shelfArr || [];
        if (shelfList.length > 0) {
          this.setData({
            shelfItem: res.result.data.shelfArr[0],
            shelfIndex: 0,
            shelfArr: shelfList,
            unShelfTotalCount: res.result.data.unShelfTotalCount,
            shelfId: res.result.data.shelfArr[0].nxDistributerGoodsShelfId,
          }, () => {
            // 2. 拉第一个货架的商品
            this._getShelfGoods();
          });
        }
      }
    });
  },


  /**
   * 接收采购商品
   */
  receivePurGoods() {
    const shelfGoods = this.data.shelfGoods;
    if (!shelfGoods || !shelfGoods.shelfPurGoods) {
      wx.showToast({
        title: '采购商品信息不存在',
        icon: 'none'
      });
      return;
    }

    const goodsName = shelfGoods.nxDistributerGoodsEntity?.nxDgGoodsName || '该商品';
    const purGoods = shelfGoods.shelfPurGoods;
    const goodsId = shelfGoods.nxDistributerGoodsEntity?.nxDistributerGoodsId;
    const shelfGoodsId = shelfGoods.nxDistributerGoodsShelfGoodsId;
    
    wx.showModal({
      title: '确认接收',
      content: `确定要接收商品"${goodsName}"吗？`,
      success: (res) => {
        if (res.confirm) {
          const data = {
            purGoodsId: purGoods.nxDistributerPurchaseGoodsId,
            userId: this.data.userId
          };
          load.showLoading("接收商品中");
          staffRecievePurGoods(data).then(res => {
            load.hideLoading();
            if (res.result.code == 0) {
              wx.showToast({
                title: '商品接收成功',
                icon: 'success'
              });
              
              // 获取更新后的采购商品信息（接收后状态会变化）
              const updatedPurchaseGoods = res.result.data || {
                ...purGoods,
                // 接收后状态通常会变化，如果接口返回了更新后的数据则使用，否则保持原数据
                nxDpgStatus: res.result.data?.nxDpgStatus || purGoods.nxDpgStatus
              };
              
              // 优化：只更新列表中对应商品的采购信息，不刷新整个列表
              if (goodsId) {
                this.updatePurchaseGoodsInList(goodsId, shelfGoodsId, updatedPurchaseGoods, false);
              }
              
              this.setData({
                showOperation: false,
                isEditGoods: false,
              });
            } else {
              wx.showToast({
                title: res.result.msg,
                icon: 'none'
              });
            }
          })
          .catch(err => {
            load.hideLoading();
            console.error('receivePurGoods error:', err);
            wx.showToast({
              title: '接收失败，请重试',
              icon: 'none'
            });
          });
        }
      }
    });
  },


  editShelfState() {
    this.setData({
      needsRefreshOnShow: true,
      refreshShelfListOnShow: true
    });
    wx.navigateTo({
      url: '../editShelf/editShelf?disId=' + this.data.disId,
    })
  },


  toEditPurchaseGoods(e) {
    this.setData({
      isShowTools: false,
      needsRefreshOnShow: true,
    })
    wx.navigateTo({
      url: '../shelfGoodsSort/shelfGoodsSort?shelfId=' + this.data.shelfId,
    })
  },

  toBack() {
    wx.navigateBack({
      delta: 1
    });
  },



  editShelfName() {
    this.setData({
      showOperation: true,
      shelfItem: this.data.shelfArr[shelfIndex],
    })
  },



  toAddShelfGoods(e) {
    this.setData({
      isShowTools: false,
      needsRefreshOnShow: true,
    })

    var sort = this.data.totalCount;

    wx.navigateTo({
      url: '../resGoodsListShelf/resGoodsListShelf?name=' + this.data.shelfItem.nxDistributerGoodsShelfName +
        '&disId=' + this.data.disId + '&shelfId=' + this.data.shelfId + '&sort=' + sort + '&shelfSort=' + this.data.shelfItem.nxDistributerGoodsShelfSort,
    })
  },

  addNewVoice(e) {
    const {
      shelfId,
      shelfName,
      shelfSort,
      sort
    } = e.currentTarget.dataset || {};
    const targetShelfId = shelfId ? Number(shelfId) : this.data.shelfId;
    const targetShelfSort = shelfSort !== undefined ? Number(shelfSort) : (this.data.shelfItem ? this.data.shelfItem.nxDistributerGoodsShelfSort : 0);
    const targetSort = sort !== undefined ? Number(sort) : (this.data.shelfGoodsList ? this.data.shelfGoodsList.length : 0);
    const targetShelfName = shelfName !== undefined ? shelfName : (this.data.shelfItem ? this.data.shelfItem.nxDistributerGoodsShelfName : '');

    if (!targetShelfId || targetShelfId <= 0) {
      wx.showToast({
        title: '请先选择货架',
        icon: 'none'
      });
      return;
    }
    this.setData({
      isShowTools: false,
      needsRefreshOnShow: true,


    })

    const name = encodeURIComponent(targetShelfName || '');
    wx.navigateTo({
      url: `../voiceAddGoods/voiceAddGoods?name=${name}&shelfId=${targetShelfId}&sort=${targetSort}&shelfSort=${targetShelfSort}`
    });
  },

  setShelfLayer() {
    const shelfGoods = this.data.shelfGoods;
    if (!shelfGoods || !shelfGoods.nxDistributerGoodsShelfGoodsId) {
      wx.showToast({
        title: '未找到货架商品',
        icon: 'none'
      });
      return;
    }

    const goodsName = shelfGoods.nxDistributerGoodsEntity ?
      shelfGoods.nxDistributerGoodsEntity.nxDgGoodsName :
      '';
    const shelfGoodsId = shelfGoods.nxDistributerGoodsShelfGoodsId;

    wx.showModal({
      title: '设置层架',
      content: goodsName ? `确认将「${goodsName}」设置为本层结尾？` : '确认设置该商品为本层结尾？',
      success: (res) => {
        if (!res.confirm) {
          return;
        }
        load.showLoading('设置层架');
        setShelfLayer(shelfGoodsId)
          .then((response) => {
            load.hideLoading();
            const result = response.result || {};
            if (result.code === 0) {
              wx.showToast({
                title: result.msg || '设置成功',
                icon: 'success'
              });
              
              // 优化：只更新列表中对应商品的层标记，不刷新整个列表
              // 接口返回的是层架信息，不是商品对象，需要从 assignedLayer 获取层号
              const layerData = result.data || {};
              const assignedLayer = layerData.assignedLayer; // 当前商品被分配的层号
              
              // 只更新商品的层字段，保留其他所有数据
              this.updateShelfGoodsInList(shelfGoodsId, {
                nxDgsgShelfLayer: assignedLayer || null
              });
              
              this.setData({
                showOperation: false
              });
            } else {
              wx.showToast({
                title: result.msg || '设置失败',
                icon: 'none'
              });
            }
          })
          .catch((error) => {
            console.error('setShelfLayer error', error);
            load.hideLoading();
            wx.showToast({
              title: '设置失败，请重试',
              icon: 'none'
            });
          });
      }
    });
  },

  clearShelfLayer() {
    const shelfGoods = this.data.shelfGoods;
    if (!shelfGoods || !shelfGoods.nxDistributerGoodsShelfGoodsId) {
      wx.showToast({
        title: '未找到货架商品',
        icon: 'none'
      });
      return;
    }

    const goodsName = shelfGoods.nxDistributerGoodsEntity ?
      shelfGoods.nxDistributerGoodsEntity.nxDgGoodsName :
      '';
    const shelfGoodsId = shelfGoods.nxDistributerGoodsShelfGoodsId;

    wx.showModal({
      title: '取消层架',
      content: goodsName ? `确认取消「${goodsName}」的层架标记？` : '确认取消该商品的层架标记？',
      success: (res) => {
        if (!res.confirm) {
          return;
        }
        load.showLoading('取消层架');
        clearShelfLayer(shelfGoodsId)
          .then((response) => {
            load.hideLoading();
            const result = response.result || {};
            if (result.code === 0) {
              wx.showToast({
                title: result.msg || '已取消',
                icon: 'success'
              });
              
              // 优化：只更新列表中对应商品的层标记，不刷新整个列表
              // 接口返回的是层架信息，取消时 assignedLayer 为 null
              const layerData = result.data || {};
              const assignedLayer = layerData.assignedLayer; // 取消时为 null
              
              // 只更新商品的层字段，保留其他所有数据
              this.updateShelfGoodsInList(shelfGoodsId, {
                nxDgsgShelfLayer: assignedLayer || null
              });
              
              this.setData({
                showOperation: false
              });
            } else {
              wx.showToast({
                title: result.msg || '取消失败',
                icon: 'none'
              });
            }
          })
          .catch((error) => {
            console.error('clearShelfLayer error', error);
            load.hideLoading();
            wx.showToast({
              title: '取消失败，请重试',
              icon: 'none'
            });
          });
      }
    });
  },

  toAddShelfGoodsSort(e) {
    this.setData({
      showOperation: false,
    })

    var sort = this.data.shelfGoods.nxDgsgSort;
    sort = Number(sort) - Number(1);
    wx.navigateTo({
      url: '../resGoodsListShelf/resGoodsListShelf?name=' + this.data.shelfItem.nxDistributerGoodsShelfName +
        '&disId=' + this.data.disId + '&shelfId=' + this.data.shelfId + '&sort=' + sort + '&shelfSort=' + this.data.shelfItem.nxDistributerGoodsShelfSort,
    })
  },


  toAddPurchaseGoods(e) {
    this.setData({
      isShowTools: false,
      showOperation: false,
    })
    wx.navigateTo({
      url: '../../../../subPackage/pages/shelf/addShelfPurchaseGoods/addShelfPurchaseGoods?shelfId=' + this.data.shelfId + '&disId=' + this.data.disId,
    })
  },





  deleteGoods() {
    const shelfGoodsId = this.data.shelfGoods?.nxDistributerGoodsShelfGoodsId;
    if (!shelfGoodsId) {
      wx.showToast({
        title: '商品数据异常',
        icon: 'none'
      });
      return;
    }

    // 获取被删除商品所属的货架ID（优先从 shelfGoods 获取，否则从 shelfGoodsList 中查找）
    let shelfId = this.data.shelfGoods?.nxDgsgShelfId;
    if (!shelfId) {
      const shelfGoodsList = this.data.shelfGoodsList || [];
      const foundGoods = shelfGoodsList.find(item => 
        item.nxDistributerGoodsShelfGoodsId === shelfGoodsId
      );
      shelfId = foundGoods?.nxDgsgShelfId;
    }

    const goodsName = this.data.shelfGoods?.nxDistributerGoodsEntity?.nxDgGoodsName || '该商品';
    
    // 显示确认弹窗，提示用户删除后的影响
    wx.showModal({
      title: '确认删除',
      content: `确定要删除「${goodsName}」吗？\n\n删除后，该商品将在"非货架商品"中显示，库存等数据都不会删除。`,
      confirmText: '确认删除',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          // 用户确认删除
    load.showLoading("删除货架商品中");
          deleteShelfGoods(shelfGoodsId)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
                // 优化：直接从列表中移除，不刷新整个列表，并更新货架商品数量
                this.removeShelfGoodsFromList(shelfGoodsId, shelfId);
                
          this.setData({
            showOperation: false,
            isEditGoods: false,
            item: "",
            shelfGoods: "",
                });
                
                wx.showToast({
                  title: '删除成功',
                  icon: 'success'
                });
              } else {
                wx.showToast({
                  title: res.result.msg || '删除失败',
                  icon: 'none'
                });
              }
            })
            .catch(err => {
              load.hideLoading();
              console.error('deleteGoods error:', err);
              wx.showToast({
                title: '删除失败，请重试',
                icon: 'none'
              });
            });
        }
        // 如果用户取消，不做任何操作
      }
    });
  },

  /**
   * 弹窗获取页面高度
   * @param {*} e 
   */
  getFocus(e) {
    var modalContentHeight = (globalData.windowHeight - e.detail.keyboardHeight) * globalData.rpxR;
    this.setData({
      modalContentHeight: modalContentHeight
    })
  },

  editShelfName(e) {
    this.setData({
      showAdd: true,
      isShowTools: false,
      isEditShelf: true,
      showOperation: false
    })

  },


  toDeleteShelf() {
    load.showLoading("删除货架中");
    deleteShelf(this.data.shelfId)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          this.setData({
            isShowTools: false,
            shelfIndex: 0,
          })
          this._getDisShelfs();
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
      })
  },


  //添加进货
  confirmShelf(e) {

    var that = this;
    if (!this.data.isEditShelf) {
      var shelf = {
        nxDistributerGoodsShelfName: e.detail.shelfName,
        nxDistributerGoodsShelfDisId: this.data.disId,
        nxDistributerGoodsShelfSort: this.data.shelfArr.length + 1,
      }
      load.showLoading("保存数据中");
      saveNewShelf(shelf)
        .then(res => {
          load.hideLoading();
          if (res.result.code == 0) {
            var arr = that.data.shelfArr;
            arr.push(res.result.data);
            var data = "shelfArr";
            that.setData({
              [data]: arr,
              // shelfId: res.result.data.nxDistributerGoodsShelfId,
              // shelfItem: res.result.data,
              // shelfIndex: that.data.shelfArr.length - 1,
              // shelfGoodsList: [],
            })
          
          }
        })

    } else {

      var shelfId = this.data.shelfItem.nxDistributerGoodsShelfId
      var data = {
        shelfId: shelfId,
        shelfName: e.detail.shelfName
      }
      updateShelfName(data).then(res => {
        if (res.result.code == 0) {
          console.log(res);
          var shelfArrPath = "shelfArr[" + this.data.shelfIndex + "]";
          var item  = res.result.data;
          item.goodsCount =  this.data.shelfArr[this.data.shelfIndex].goodsCount;
          
          // 更新 shelfArr 中的货架信息
          var updateData = {
            showAdd: false,
            [shelfArrPath]: item
          };
          
          // 如果当前 shelfItem 就是被修改的货架，同时更新 shelfItem 的名称
          if (this.data.shelfItem && this.data.shelfItem.nxDistributerGoodsShelfId === shelfId) {
            updateData.shelfItem = {
              ...this.data.shelfItem,
              nxDistributerGoodsShelfName: item.nxDistributerGoodsShelfName
            };
          }
          
          this.setData(updateData);
        } else {
          wx.showToast({
            title: res.result.msg,
            icon: "none"
          })
        }
      })
    }
  },


  toSearch() {
    wx.navigateTo({
      url: '../shelfGoodsSearch/shelfGoodsSearch?disId=' + this.data.disId,
    })

  },

  toSettleStaff() {
    console.log("tttt")
    this.setData({
      isShowTools: false,
    })
    wx.navigateTo({
      url: '../settlePage/settlePage?shelfId=' + this.data.shelfId + '&shelfName=' + this.data.shelfItem.nxDistributerGoodsShelfName,
    })
  },

  toInventoryShelf() {
    this.setData({
      isShowTools: false,
    })
    if (!this.data.shelfId || this.data.shelfId <= 0) {
      wx.showToast({
        title: '请先选择货架',
        icon: 'none'
      });
      return;
    }
    wx.navigateTo({
      url: '../inventory/inventory?shelfId=' + this.data.shelfId + '&shelfName=' + encodeURIComponent(this.data.shelfItem.nxDistributerGoodsShelfName || '货架'),
    })
  },





  toPurchase(e) {
    console.log("nxDisId=" + this.data.disId + '&nxDisPurUserId=' + this.data.userInfo.nxDistributerUserId + '&from=nx');
    wx.navigateToMiniProgram({
      appId: 'wx1ea78d3f33234284',
      path: 'pages/jinriListWithLogin/jinriListWithLogin?nxDisId=' + this.data.disId + '&nxDisPurUserId=' + this.data.userInfo.nxDistributerUserId + '&from=nx',
      envVersion: 'trial', //release  develop  trial
      success(res) {

      },
      fail() {

      },
    })
  },



  getUnShelfGoods(keepCurrentPage = false) {
    console.log('getUnShelfGoods - 开始刷新非货架商品，disId:', this.data.disId, 'keepCurrentPage:', keepCurrentPage);

    // 如果保持当前页且当前页 > 1，需要重新加载所有已加载的页面
    if (keepCurrentPage && this.data.currentPage > 1) {
      console.log('getUnShelfGoods - 保持当前页，当前页:', this.data.currentPage, '需要重新加载前', this.data.currentPage, '页');
      this._refreshUnShelfGoodsWithCurrentPage();
      return;
    }

    load.showLoading("获取数据中");
    disGetUnshelfGoods(this.data.disId, 1, this.data.limit).then(res => {
      if (res.result.code == 0) {
        load.hideLoading();
        const pageData = res.result.page || {};
        this.setData({
          shelfGoodsList: [],
          shelfIndex: this.data.shelfArr.length,
          unShelfGoodsList: this._formatUnShelfGoodsList(pageData.list || []),
          totalCount: pageData.totalCount || 0,
          totalPage: pageData.totalPage || 0,
          currentPage: pageData.currPage || 1,
          isUnshelfSelected: false,
          isLoading: false,
          toTop: 0, // 滚动到顶部
        })
        console.log('getUnShelfGoods - 刷新完成，商品数量:', pageData.list ? pageData.list.length : 0);
      } else {
        load.hideLoading();
        console.log('getUnShelfGoods - 刷新失败，code:', res.result.code);
      }
    })
  },

  // 重新加载从第1页到当前页的所有非货架商品数据
  _refreshUnShelfGoodsWithCurrentPage() {
    const currentPage = this.data.currentPage;
    const disId = this.data.disId;
    const limit = this.data.limit;

    console.log('_refreshUnShelfGoodsWithCurrentPage - 开始重新加载，当前页:', currentPage);

    // 清空列表，准备重新加载
    this.setData({
      unShelfGoodsList: [],
      isLoading: true
    });

    // 依次加载从第1页到当前页的所有数据
    let allGoods = [];

    const loadPage = (page) => {
      return disGetUnshelfGoods(disId, page, limit).then(res => {
        if (res.result.code == 0) {
          const pageData = res.result.page || {};
          const pageGoods = this._formatUnShelfGoodsList(pageData.list || []);
          allGoods = [...allGoods, ...pageGoods];

          // 更新总数和总页数（使用最后一页的数据）
          if (page === currentPage) {
            this.setData({
              shelfGoodsList: [],
              shelfIndex: this.data.shelfArr.length,
              unShelfGoodsList: allGoods,
              totalCount: pageData.totalCount || 0,
              totalPage: pageData.totalPage || 0,
              currentPage: pageData.currPage || 1,
              isUnshelfSelected: false,
              isLoading: false,
              // 不重置 toTop，保持滚动位置
            });

            console.log('_refreshUnShelfGoodsWithCurrentPage - 刷新完成，商品数量:', allGoods.length);
            load.hideLoading();
          } else if (page < currentPage) {
            // 继续加载下一页
            return loadPage(page + 1);
          }
        } else {
          console.log('_refreshUnShelfGoodsWithCurrentPage - 加载第', page, '页失败');
          this.setData({
            isLoading: false
          });
          load.hideLoading();
        }
      });
    };

    load.showLoading("刷新数据中");
    loadPage(1);
  },

  onScrollToLower() {
    // 防止重复请求
    if (this.data.isLoading) return;

    // 判断当前显示的是非货架商品还是货架商品
    const isShowingUnshelfGoods = this.data.shelfIndex === this.data.shelfArr.length;

    if (isShowingUnshelfGoods) {
      // 显示非货架商品，检查是否还有更多数据
      if (this.data.currentPage >= this.data.totalPage || this.data.unShelfGoodsList.length >= this.data.totalCount) {
        return;
      }

      this.setData({
        isLoading: true
      });

      const nextPage = this.data.currentPage + 1;
      disGetUnshelfGoods(this.data.disId, nextPage, this.data.limit).then(res => {
        this.setData({
          isLoading: false
        });

        if (res.result.code == 0) {
          const pageData = res.result.page || {};
          const newItems = this._formatUnShelfGoodsList(pageData.list || []);
          this.setData({
            unShelfGoodsList: [...this.data.unShelfGoodsList, ...newItems],
            totalCount: pageData.totalCount || 0,
            totalPage: pageData.totalPage || 0,
            currentPage: pageData.currPage || 1,
          });
        }
      }).catch(() => {
        this.setData({
          isLoading: false
        });
      });
    } else {
      // 显示货架商品，检查是否还有更多数据
      if (this.data.currentPage >= this.data.totalPage || this.data.shelfGoodsList.length >= this.data.totalCount) {
        return;
      }

      if (!this.data.shelfId || this.data.shelfId <= 0) {
        return;
      }

      this.setData({
        isLoading: true
      });

      const nextPage = this.data.currentPage + 1;
      getShelfGoods(this.data.shelfId, nextPage, this.data.limit).then(res => {
        this.setData({
          isLoading: false
        });

        if (res.result.code == 0) {
          const pageData = res.result.page || {};
          const newItems = this._formatShelfGoodsList(pageData.list || []);
          this.setData({
            shelfGoodsList: [...this.data.shelfGoodsList, ...newItems],
            totalCount: pageData.totalCount || 0,
            totalPage: pageData.totalPage || 0,
            currentPage: pageData.currPage || 1,
          });
        }
      }).catch(() => {
        this.setData({
          isLoading: false
        });
      });
    }
  },

  toGoodsDetail() {
    var id = this.data.disGoods.nxDistributerGoodsId;
    // 判断是否从非货架商品跳转（通过检查是否有 shelfGoods 来判断）
    const isFromUnshelf = !this.data.shelfGoods;

    this.setData({
      isEditGoods: false,
      showOperation: false,
    })
    // 记录是否从非货架商品跳转
    if (isFromUnshelf) {
      wx.setStorageSync('fromUnshelfGoods', true);
    } else {
      wx.removeStorageSync('fromUnshelfGoods');
      
      // 找到当前 shelfGoods 在 shelfGoodsList 中的 index
      if (this.data.shelfGoods && this.data.shelfGoodsList) {
        const shelfGoodsId = this.data.shelfGoods.nxDistributerGoodsShelfGoodsId;
        const index = this.data.shelfGoodsList.findIndex(item => 
          item.nxDistributerGoodsShelfGoodsId === shelfGoodsId
        );
        
        if (index !== -1) {
          console.log('toGoodsDetail - 找到 shelfGoods 在列表中的 index:', index);
          wx.setStorageSync('shelfGoodsListIndex', index);
          // 设置标记，表示从货架页面跳转到 disGoodsDetail
          wx.setStorageSync('fromShelfPage', true);
        } else {
          console.warn('toGoodsDetail - 未找到 shelfGoods 在列表中的位置');
        }
      }
    }
    
    // 清除 ailasGoodsList 标记（如果跳转到 disGoodsDetail）
    wx.removeStorageSync('fromAilasGoodsList');
    wx.setStorageSync('disGoods', this.data.disGoods)

    wx.navigateTo({
      url: '../../goods/disGoodsDetail/disGoodsDetail?id=' + id,
    })
    //  }

    //    else{

    // wx.setStorageSync('linshiGoods', this.data.disGoods)
    // // 设置标记，表示从货架页面跳转到 ailasGoodsList
    // console.log('toGoodsDetail - 设置 fromAilasGoodsList 标记');
    // wx.setStorageSync('fromAilasGoodsList', true)
    // console.log('toGoodsDetail - 标记已设置，准备跳转到 ailasGoodsList');
    // wx.navigateTo({
    //   url: '../../goods/ailasGoodsList/ailasGoodsList?name=' + this.data.disGoods.nxDgGoodsName
    //    + '&id=' + this.data.disGoods.nxDistributerGoodsId + '&standard=' + this.data.disGoods.nxDgGoodsStandardname,
    // })
    //    }

  },



  toFixedLinshi() {
    console.log('=== toFixedLinshi 开始 ===');
    console.log('toFixedLinshi - disGoods:', this.data.disGoods);
    console.log('toFixedLinshi - shelfGoods:', this.data.shelfGoods);
    
    var id = this.data.disGoods.nxDistributerGoodsId;
    console.log('toFixedLinshi - 商品ID:', id);
    console.log('toFixedLinshi - nxDgNxGoodsId:', this.data.disGoods.nxDgNxGoodsId);
    
    // 判断是否从非货架商品跳转（通过检查是否有 shelfGoods 来判断）
    const isFromUnshelf = !this.data.shelfGoods;
    console.log('toFixedLinshi - isFromUnshelf:', isFromUnshelf);

    this.setData({
      isEditGoods: false,
      showOperation: false,
    });
    
    // 记录是否从非货架商品跳转
    if (isFromUnshelf) {
      wx.setStorageSync('fromUnshelfGoods', true);
      console.log('toFixedLinshi - 设置 fromUnshelfGoods 标记');
    } else {
      wx.removeStorageSync('fromUnshelfGoods');
      console.log('toFixedLinshi - 清除 fromUnshelfGoods 标记');
    }
    
    // 清除 ailasGoodsList 标记（如果跳转到 disGoodsDetail）
    wx.removeStorageSync('fromAilasGoodsList');
    
    if (this.data.disGoods.nxDgNxGoodsId != null && this.data.disGoods.nxDgNxGoodsId != '' &&
      this.data.disGoods.nxDgNxGoodsId > 0) {
      console.log('toFixedLinshi - 商品已有 nxDgNxGoodsId，跳转到 disGoodsDetail');
      wx.setStorageSync('disGoods', this.data.disGoods);

      wx.navigateTo({
        url: '../../goods/disGoodsDetail/disGoodsDetail?id=' + id,
      });
    } else {
      console.log('toFixedLinshi - 商品是临时商品，准备跳转到 ailasGoodsList');
      console.log('toFixedLinshi - 保存 linshiGoods 到 storage:', this.data.disGoods);
      
      wx.setStorageSync('linshiGoods', this.data.disGoods);
      
      // 找到当前 shelfGoods 在 shelfGoodsList 中的 index，同时保存 shelfGoodsId 作为备用
      if (this.data.shelfGoods && this.data.shelfGoodsList) {
        const shelfGoodsId = this.data.shelfGoods.nxDistributerGoodsShelfGoodsId;
        const index = this.data.shelfGoodsList.findIndex(item => 
          item.nxDistributerGoodsShelfGoodsId === shelfGoodsId
        );
        
        // 保存 shelfGoodsId，用于在 index 超出范围时查找
        if (shelfGoodsId) {
          console.log('toFixedLinshi - 保存 shelfGoodsId:', shelfGoodsId);
          wx.setStorageSync('shelfGoodsId', shelfGoodsId);
        }
        
        if (index !== -1) {
          console.log('toFixedLinshi - 找到 shelfGoods 在列表中的 index:', index);
          wx.setStorageSync('shelfGoodsListIndex', index);
        } else {
          console.warn('toFixedLinshi - 未找到 shelfGoods 在列表中的位置');
        }
      }
      
      // 设置标记，表示从货架页面跳转到 ailasGoodsList
      console.log('toFixedLinshi - 设置 fromAilasGoodsList 标记');
      wx.setStorageSync('fromAilasGoodsList', true);
      console.log('toFixedLinshi - 标记已设置，准备跳转到 ailasGoodsList');
      
      const url = '../../goods/ailasGoodsList/ailasGoodsList?name=' + this.data.disGoods.nxDgGoodsName +
        '&id=' + this.data.disGoods.nxDistributerGoodsId + '&standard=' + this.data.disGoods.nxDgGoodsStandardname;
      console.log('toFixedLinshi - 跳转URL:', url);
      
      wx.navigateTo({
        url: url,
      });
    }

    console.log('=== toFixedLinshi 结束 ===');
  },




  // 打开订货弹窗name=朝天椒皮&id=26929&type=undefined&standard=袋
  toOpenDisPlanPurchase() {
    // 获取商品信息（从 shelfGoods 中获取）
    console.log("indotuutot");
    const shelfGoods = this.data.shelfGoods || {};
    const stockList = Array.isArray(shelfGoods.nxDisGoodsShelfStockEntities) ? shelfGoods.nxDisGoodsShelfStockEntities : [];
    let restWeightTotal = 0;
    stockList.forEach(item => {
      restWeightTotal += Number(item && item.nxDgssRestWeight ? item.nxDgssRestWeight : 0);
    });
    const disGoods = shelfGoods.nxDistributerGoodsEntity;
    if (!disGoods) {
      console.warn('toOpenDisPlanPurchase: disGoods is undefined');
      return;
    }
    // 根据 nxDgCartonUnit 是否为 null 决定使用哪个规格
    const standardName = disGoods.nxDgCartonUnit !== null && disGoods.nxDgCartonUnit !== undefined && disGoods.nxDgCartonUnit !== '' ?
      disGoods.nxDgCartonUnit :
      disGoods.nxDgGoodsStandardname;
    this.setData({
      showPlanPurchase: true,
      item: disGoods,
      disGoods: disGoods,
      applyStandardName: standardName,
      windowHeight: this.data.windowHeight,
      showOperation: false,
      restWeight: restWeightTotal.toString(),
      maxRestWeight: restWeightTotal
    })
  },


  // 打开采购入库弹窗
  toOpenInputPurGoods() {
    // 获取商品信息（从 shelfGoods 中获取）
    const disGoods = this.data.shelfGoods.nxDistributerGoodsEntity;
    const purGoodsItem = this.data.shelfGoods.shelfPurGoods;
    purGoodsItem.nxDistributerGoodsEntity = disGoods;
    // 初始化等待入库字段，默认 false
    if (purGoodsItem.isShowTools === undefined) {
      purGoodsItem.isShowTools = false;
    }
    this.setData({
      showInputPurGoods: true,
      item: purGoodsItem,
      disGoods: disGoods,
      windowHeight: this.data.windowHeight,
      windowWidth: this.data.windowWidth,
      showOperation: false
    })
  },


  // 打开采购入库弹窗（直接生成采购商品并入库）
  toOpenInputPurSock() {
    const disGoods = this.data.shelfGoods.nxDistributerGoodsEntity;
    // 根据 nxDgCartonUnit 是否为 null 决定使用哪个规格
    const standardName = disGoods.nxDgCartonUnit !== null && disGoods.nxDgCartonUnit !== undefined && disGoods.nxDgCartonUnit !== '' ?
      disGoods.nxDgCartonUnit :
      disGoods.nxDgGoodsStandardname;
    // 初始化采购商品数据
    const purGoodsItem = {
      nxDpgDisGoodsId: disGoods.nxDistributerGoodsId,
      nxDpgDisGoodsFatherId: disGoods.nxDgDfgGoodsFatherId,
      nxDpgDisGoodsGrandId: disGoods.nxDgDfgGoodsGrandId,
      nxDpgBuyPrice: "",
      nxDpgBuyQuantity: "",
      nxDpgBuySubtotal: "",
      nxDpgExpectPrice: "",
      nxDpgStandard: standardName,
      nxDpgDistributerId: this.data.disId,
      isShowTools: false, // 等待入库，默认 false
      nxDistributerGoodsEntity: disGoods
    };
    this.setData({
      showInputPurStock: true,
      item: purGoodsItem,
      disGoods: disGoods,
      applyStandardName: standardName,
      windowHeight: this.data.windowHeight,
      windowWidth: this.data.windowWidth,
      showOperation: false
    })
  },

  // 取消采购入库
  cancleInputPurStock() {
    this.setData({
      showInputPurStock: false,
      item: null, // 清空item对象，避免下次打开弹窗时遗留数据
    })
  },
  // 处理采购入库确认
  confirmInputPurGoods(e) {
    const item = e.detail.item;
    const disGoods = item.nxDistributerGoodsEntity || this.data.disGoods;

    // 注意：nxDpgQuantity 保存用户输入的原始数量（箱数或最小单位数量）
    // 入库时，后端会根据 nxDgItemsPerCarton 自动转换为最小单位存储到库存批次表

    // 根据文档：双单价和双零售价功能
    // 库存批次表需要保存的字段：nxDgssPrice, nxDgssPriceCarton, nxDgssSellingPrice, nxDgssSellingPriceCarton
    // 注意：价格字段直接使用用户输入的原始值，不除以箱数，后台会自己计算
    if (item.nxDpgBuyPrice) {
      item.nxDgssPrice = item.nxDpgBuyPrice; // 采购单价（用户输入的原始价格，后台会计算）
    }
    if (item.nxDpgExpectPrice) {
      item.nxDgssSellingPrice = item.nxDpgExpectPrice; // 建议零售价（用户输入的原始价格，后台会计算）
    }
    // 外包装采购单价和外包装建议零售价已经在组件的 confirm 方法中添加（nxDgssPriceCarton 和 nxDgssSellingPriceCarton）

    const isUnshelf = this.data.unShelfGoodsList.length > 0;
    const goodsId = disGoods?.nxDistributerGoodsId;
    const shelfGoodsId = !isUnshelf && this.data.shelfGoods?.nxDistributerGoodsShelfGoodsId;

    load.showLoading("保存采购入库");
    item.nxDpgPurUserId = this.data.userInfo.nxDistributerUserId;
    saveShelfGoodsStock(item).then(res => {
      if (res.result.code == 0) {
        load.hideLoading();
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
        
        // 优化：只更新列表中对应商品的库存信息，不刷新整个列表
        const resultData = res.result.data || {};
        console.log('saveShelfGoodsStock - 接口返回数据:', resultData);
        
        if (goodsId) {
          // 如果接口返回了库存批次信息，更新库存信息
          if (resultData.stockEntities || resultData.nxDisGoodsShelfStockEntities || resultData.stockList) {
            console.log('saveShelfGoodsStock - 更新库存信息');
            this.updateStockInList(goodsId, shelfGoodsId, null, resultData, isUnshelf);
          }
          // 如果接口返回了采购商品信息，也更新采购信息
          if (resultData.purchaseGoods) {
            console.log('saveShelfGoodsStock - 更新采购信息');
            this.updatePurchaseGoodsInList(goodsId, shelfGoodsId, resultData.purchaseGoods, isUnshelf);
          }
        }
        
        this.setData({
          showInputPurGoods: false,
          item: null, // 清空item对象，避免下次打开弹窗时遗留数据
        });
      } else {
        load.hideLoading();
        wx.showToast({
          title: res.result.msg || '保存失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      load.hideLoading();
      console.error('saveShelfGoodsStock error:', err);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      });
    });
  },

  // 取消采购入库
  cancleInputPurGoods() {
    this.setData({
      showInputPurGoods: false,
      item: null, // 清空item对象，避免下次打开弹窗时遗留数据
    })
  },

  // 取消订货
  canclePlanPurchase() {
    this.setData({
      showPlanPurchase: false,
    })
  },


  showStock() {
    console.log('=== 点击修改库存 ===')
    console.log('shelfGoods:', this.data.shelfGoods)

    if (!this.data.shelfGoods) {
      console.error('错误：shelfGoods为null或undefined')
      wx.showToast({
        title: '商品数据异常',
        icon: 'none'
      })
      return
    }

    console.log('批次数据:', this.data.shelfGoods.nxDisGoodsShelfStockEntities)
    console.log('批次数量:', this.data.shelfGoods.nxDisGoodsShelfStockEntities ? this.data.shelfGoods.nxDisGoodsShelfStockEntities.length : 0)

    const stockList = Array.isArray(this.data.shelfGoods.nxDisGoodsShelfStockEntities) ? this.data.shelfGoods.nxDisGoodsShelfStockEntities : []
    const totalRestWeight = stockList.reduce((sum, item) => {
      const weight = Number(item && item.nxDgssRestWeight ? item.nxDgssRestWeight : 0)
      return sum + (isNaN(weight) ? 0 : weight)
    }, 0)

    console.log('设置showStock为true')
    this.setData({
      showStock: true,
      showOperation: false,
      stockRestWeightTotal: totalRestWeight
    }, () => {
      console.log('setData完成，showStock应该为true')
      console.log('当前showStock值:', this.data.showStock)
      console.log('当前总剩余库存:', this.data.stockRestWeightTotal)
    })
  },

  showStockDetail() {
    console.log('=== 点击查看库存 ===')
    const shelfGoods = this.data.shelfGoods

    if (!shelfGoods) {
      console.error('错误：shelfGoods为null或undefined')
      wx.showToast({
        title: '商品数据异常',
        icon: 'none'
      })
      return
    }

    this.setData({
      showStockDetail: true,
      showOperation: false
    }, () => {
      console.log('showStockDetail 设置完成，当前值:', this.data.showStockDetail)
    })
  },

  confirmStockDetail(e) {
    const {
      stockId,
      restWeight,
      sellingPrice
    } = e.detail || {}
    if (!stockId) {
      console.warn('confirmStockDetail 缺少 stockId', e)
      wx.showToast({
        title: '批次数据异常',
        icon: 'none'
      })
      return
    }

    const shelfGoods = this.data.shelfGoods;
    if (!shelfGoods) {
      wx.showToast({
        title: '商品数据异常',
        icon: 'none'
      });
      return;
    }
    
    const goodsId = shelfGoods.nxDistributerGoodsEntity?.nxDistributerGoodsId;
    const shelfGoodsId = shelfGoods.nxDistributerGoodsShelfGoodsId;
    const isUnshelf = this.data.isUnshelfSelected || this.data.shelfIndex === this.data.shelfArr.length;
    
    load.showLoading('保存中...');
    updateDisStock({
      stockId,
      restWeight,
      sellingPrice,
      disId: this.data.disId,
      userId: this.data.userId
    }).then(res => {
      load.hideLoading();
      if (res.result.code === 0) {
        wx.showToast({
          title: '更新成功',
          icon: 'success'
        });
        
        // 优化：只更新列表中对应商品的库存批次，不刷新整个列表
        const resultData = res.result.data || {};
        if (goodsId) {
          // 如果接口返回了更新后的库存批次列表，使用它
          if (resultData.stockEntities || resultData.nxDisGoodsShelfStockEntities) {
            this.updateStockInList(goodsId, shelfGoodsId, null, resultData, isUnshelf);
          } else {
            // 否则，只更新当前批次的信息（从现有列表中查找并更新）
            const stockList = Array.isArray(shelfGoods.nxDisGoodsShelfStockEntities) 
              ? shelfGoods.nxDisGoodsShelfStockEntities 
              : [];
            const stockIndex = stockList.findIndex(stock => 
              stock.nxDistributerGoodsShelfStockId === stockId
            );
            if (stockIndex !== -1) {
              // 更新该批次的信息
              const updatedStockList = [...stockList];
              updatedStockList[stockIndex] = {
                ...updatedStockList[stockIndex],
                nxDgssRestWeight: restWeight,
                nxDgssSellingPrice: sellingPrice
              };
              this.updateStockInList(goodsId, shelfGoodsId, updatedStockList, null, isUnshelf);
            }
          }
        }
        
        this.setData({
          isEditGoods: false,
          showStockDetail: false
        });
      } else {
        wx.showToast({
          title: res.result.msg || '更新失败',
          icon: 'none'
        });
      }
    }).catch(err => {
      console.error('更新库存失败:', err);
      load.hideLoading();
      wx.showToast({
        title: '网络错误',
        icon: 'none'
      });
    });
  },

  // 关闭库存弹窗
  closeStockModal() {
    this.setData({
      showStock: false,
    })
  },

  closeStockDetailModal() {
    this.setData({
      showStockDetail: false
    })
  },

  // 库存操作成功后刷新数据
  refreshAfterStockOperation() {
    if (this.data.isUnshelfSelected || this.data.shelfIndex === this.data.shelfArr.length) {
      this.getUnShelfGoods();
    } else {
      this.updateShelfGoodsData();
    }
  },

  /**
   * 从货架商品列表中移除指定商品（优化：不刷新整个列表）
   * @param {Number} shelfGoodsId - 货架商品ID
   * @param {Number} shelfId - 货架ID（可选，用于更新货架商品数量）
   */
  removeShelfGoodsFromList(shelfGoodsId, shelfId = null) {
    if (!shelfGoodsId) return;
    
    const shelfGoodsList = this.data.shelfGoodsList || [];
    const filteredList = shelfGoodsList.filter(item => 
      item.nxDistributerGoodsShelfGoodsId !== shelfGoodsId
    );
    
    // 如果列表有变化，更新数据并减少总数
    if (filteredList.length !== shelfGoodsList.length) {
      const updateData = {
        shelfGoodsList: filteredList,
        totalCount: Math.max(0, (this.data.totalCount || 0) - 1)
      };
      
      // 如果提供了 shelfId，更新对应货架的 goodsCount
      if (shelfId) {
        const shelfArr = this.data.shelfArr || [];
        const shelfIndex = shelfArr.findIndex(item => 
          item.nxDistributerGoodsShelfId === shelfId
        );
        
        if (shelfIndex !== -1) {
          const updatedShelfArr = [...shelfArr];
          const currentGoodsCount = updatedShelfArr[shelfIndex].goodsCount || 0;
          updatedShelfArr[shelfIndex] = {
            ...updatedShelfArr[shelfIndex],
            goodsCount: Math.max(0, currentGoodsCount - 1)
          };
          updateData.shelfArr = updatedShelfArr;
        }
      }
      
      this.setData(updateData);
    }
  },

  /**
   * 更新货架商品或非货架商品中的采购商品信息（优化：不刷新整个列表）
   * @param {Number} goodsId - 商品ID（disGoodsId）
   * @param {Number} shelfGoodsId - 货架商品ID（可选，如果有则是货架商品）
   * @param {Object} purchaseGoods - 更新后的采购商品信息（如果为 null 则删除采购信息）
   * @param {Boolean} isUnshelf - 是否为非货架商品
   */
  updatePurchaseGoodsInList(goodsId, shelfGoodsId = null, purchaseGoods = null, isUnshelf = false) {
    if (!goodsId) {
      console.warn('updatePurchaseGoodsInList: goodsId 不能为空');
      return;
    }

    if (isUnshelf) {
      // 更新非货架商品列表
      const unShelfGoodsList = this.data.unShelfGoodsList || [];
      const index = unShelfGoodsList.findIndex(item => 
        item.nxDistributerGoodsId === goodsId
      );
      
      if (index === -1) {
        console.warn('updatePurchaseGoodsInList: 未找到对应的非货架商品，goodsId:', goodsId);
        return;
      }
      
      // 更新采购商品信息
      const updatedGoods = {
        ...unShelfGoodsList[index]
      };
      
      if (purchaseGoods === null) {
        // 删除采购信息：设置为 null，确保 wxml 中的判断 shelfPurGoods !== null 为 false
        updatedGoods.shelfPurGoods = null;
      } else {
        // 更新采购信息
        updatedGoods.shelfPurGoods = purchaseGoods;
      }
      
      const newList = [...unShelfGoodsList];
      newList[index] = updatedGoods;
      
      this.setData({
        unShelfGoodsList: newList
      });
    } else {
      // 更新货架商品列表
      const shelfGoodsList = this.data.shelfGoodsList || [];
      let index = -1;
      
      if (shelfGoodsId) {
        // 如果有 shelfGoodsId，优先使用它查找
        index = shelfGoodsList.findIndex(item => 
          item.nxDistributerGoodsShelfGoodsId === shelfGoodsId
        );
      } else {
        // 否则通过商品ID查找
        index = shelfGoodsList.findIndex(item => 
          item.nxDistributerGoodsEntity && 
          item.nxDistributerGoodsEntity.nxDistributerGoodsId === goodsId
        );
      }
      
      if (index === -1) {
        console.warn('updatePurchaseGoodsInList: 未找到对应的货架商品，goodsId:', goodsId, 'shelfGoodsId:', shelfGoodsId);
        return;
      }
      
      // 更新采购商品信息
      const updatedGoods = {
        ...shelfGoodsList[index]
      };
      
      if (purchaseGoods === null) {
        // 删除采购信息：设置为 null，确保 wxml 中的判断 shelfPurGoods !== null 为 false
        updatedGoods.shelfPurGoods = null;
      } else {
        // 更新采购信息
        updatedGoods.shelfPurGoods = purchaseGoods;
      }
      
      const newList = [...shelfGoodsList];
      newList[index] = updatedGoods;
      
      this.setData({
        shelfGoodsList: newList
      });
    }
  },

  /**
   * 更新货架商品或非货架商品的库存信息（优化：不刷新整个列表）
   * @param {Number} goodsId - 商品ID（disGoodsId）
   * @param {Number} shelfGoodsId - 货架商品ID（可选，如果有则是货架商品）
   * @param {Array} stockEntities - 更新后的库存批次列表（如果为 null 则使用接口返回的数据）
   * @param {Object} responseData - 接口返回的完整商品数据（如果有，会从中提取库存批次）
   * @param {Boolean} isUnshelf - 是否为非货架商品
   */
  updateStockInList(goodsId, shelfGoodsId = null, stockEntities = null, responseData = null, isUnshelf = false) {
    if (!goodsId) {
      console.warn('updateStockInList: goodsId 不能为空');
      return;
    }

    console.log('updateStockInList - 开始更新库存，goodsId:', goodsId, 'shelfGoodsId:', shelfGoodsId, 'isUnshelf:', isUnshelf);
    console.log('updateStockInList - responseData:', responseData);
    console.log('updateStockInList - responseData keys:', responseData ? Object.keys(responseData) : 'null');

    // 确定要使用的库存批次列表
    let updatedStockList = stockEntities;
    if (!updatedStockList && responseData) {
      // 从接口返回的数据中提取库存批次
      if (responseData.nxDisGoodsShelfStockEntities) {
        updatedStockList = responseData.nxDisGoodsShelfStockEntities;
        console.log('updateStockInList - 从 nxDisGoodsShelfStockEntities 提取');
      } else if (responseData.stockEntities) {
        updatedStockList = responseData.stockEntities;
        console.log('updateStockInList - 从 stockEntities 提取');
      } else if (responseData.stockList) {
        updatedStockList = responseData.stockList;
        console.log('updateStockInList - 从 stockList 提取');
      } else if (responseData.stock) {
        // 单个库存对象，转换为数组
        updatedStockList = [responseData.stock];
        console.log('updateStockInList - 从 stock 提取（单个对象）');
      } else if (responseData.nxDistributerGoodsShelfStockId || responseData.nxDgssDate) {
        // 如果返回的数据本身就是单个库存对象（有库存相关字段），转换为数组
        updatedStockList = [responseData];
        console.log('updateStockInList - 返回数据本身就是库存对象，转换为数组');
      }
    }
    
    console.log('updateStockInList - 提取的库存批次列表:', updatedStockList);
    console.log('updateStockInList - 库存批次数量:', updatedStockList ? (Array.isArray(updatedStockList) ? updatedStockList.length : 1) : 0);

    if (isUnshelf) {
      // 更新非货架商品列表
      const unShelfGoodsList = this.data.unShelfGoodsList || [];
      const index = unShelfGoodsList.findIndex(item => 
        item.nxDistributerGoodsId === goodsId
      );
      
      if (index === -1) {
        console.warn('updateStockInList: 未找到对应的非货架商品，goodsId:', goodsId);
        return;
      }
      
      const updatedGoods = {
        ...unShelfGoodsList[index]
      };
      
      if (updatedStockList) {
        const currentStockList = Array.isArray(updatedGoods.nxDisGoodsShelfStockEntities) 
          ? updatedGoods.nxDisGoodsShelfStockEntities 
          : [];
        const newStockList = Array.isArray(updatedStockList) ? updatedStockList : [updatedStockList];
        
        console.log('updateStockInList (非货架) - 当前库存批次数量:', currentStockList.length);
        console.log('updateStockInList (非货架) - 返回的库存批次数量:', newStockList.length);
        
        // 如果当前列表为空，直接使用返回的列表
        if (currentStockList.length === 0) {
          console.log('updateStockInList (非货架) - 当前列表为空，直接使用返回的列表');
          updatedGoods.nxDisGoodsShelfStockEntities = newStockList;
        } else {
          // 当前列表不为空，需要判断是追加还是替换
          // 如果返回的是单个库存对象（长度为1），通常是新增的，追加到末尾
          // 如果返回的是多个库存（可能是完整列表），需要合并
          if (newStockList.length === 1) {
            // 返回的是单个库存对象，追加到现有列表末尾
            console.log('updateStockInList (非货架) - 返回单个库存对象，追加到列表末尾');
            const newStock = newStockList[0];
            // 检查是否已存在（通过ID判断）
            const existingIndex = currentStockList.findIndex(stock => 
              stock.nxDistributerGoodsShelfStockId === newStock.nxDistributerGoodsShelfStockId
            );
            if (existingIndex !== -1) {
              // 已存在，更新
              const mergedStockList = [...currentStockList];
              mergedStockList[existingIndex] = newStock;
              updatedGoods.nxDisGoodsShelfStockEntities = mergedStockList;
            } else {
              // 不存在，追加到末尾
              updatedGoods.nxDisGoodsShelfStockEntities = [...currentStockList, newStock];
            }
          } else {
            // 返回的是多个库存，可能是完整列表，需要合并
            console.log('updateStockInList (非货架) - 返回多个库存，进行合并');
            const mergedStockList = [...currentStockList];
            
            newStockList.forEach(newStock => {
              const existingIndex = mergedStockList.findIndex(stock => 
                stock.nxDistributerGoodsShelfStockId === newStock.nxDistributerGoodsShelfStockId
              );
              if (existingIndex !== -1) {
                // 更新现有批次
                mergedStockList[existingIndex] = newStock;
              } else {
                // 追加新批次到末尾
                mergedStockList.push(newStock);
              }
            });
            
            updatedGoods.nxDisGoodsShelfStockEntities = mergedStockList;
          }
        }
        
        updatedGoods.stockList = updatedGoods.nxDisGoodsShelfStockEntities;
        // 重新计算总剩余库存
        updatedGoods.totalRestWeight = updatedGoods.nxDisGoodsShelfStockEntities.reduce((sum, stock) => {
          const weight = Number(stock && stock.nxDgssRestWeight ? stock.nxDgssRestWeight : 0);
          return sum + (isNaN(weight) ? 0 : weight);
        }, 0);
        
        console.log('updateStockInList (非货架) - 更新后的库存批次数量:', updatedGoods.nxDisGoodsShelfStockEntities.length);
        console.log('updateStockInList (非货架) - 更新后的总剩余库存:', updatedGoods.totalRestWeight);
      }
      
      const newList = [...unShelfGoodsList];
      newList[index] = updatedGoods;
      
      this.setData({
        unShelfGoodsList: newList
      });
    } else {
      // 更新货架商品列表
      const shelfGoodsList = this.data.shelfGoodsList || [];
      let index = -1;
      
      if (shelfGoodsId) {
        index = shelfGoodsList.findIndex(item => 
          item.nxDistributerGoodsShelfGoodsId === shelfGoodsId
        );
      } else {
        index = shelfGoodsList.findIndex(item => 
          item.nxDistributerGoodsEntity && 
          item.nxDistributerGoodsEntity.nxDistributerGoodsId === goodsId
        );
      }
      
      if (index === -1) {
        console.warn('updateStockInList: 未找到对应的货架商品，goodsId:', goodsId, 'shelfGoodsId:', shelfGoodsId);
        return;
      }
      
      const updatedGoods = {
        ...shelfGoodsList[index]
      };
      
      if (updatedStockList) {
        const currentStockList = Array.isArray(updatedGoods.nxDisGoodsShelfStockEntities) 
          ? updatedGoods.nxDisGoodsShelfStockEntities 
          : [];
        const newStockList = Array.isArray(updatedStockList) ? updatedStockList : [updatedStockList];
        
        console.log('updateStockInList - 当前库存批次数量:', currentStockList.length);
        console.log('updateStockInList - 返回的库存批次数量:', newStockList.length);
        
        // 如果当前列表为空，直接使用返回的列表
        if (currentStockList.length === 0) {
          console.log('updateStockInList - 当前列表为空，直接使用返回的列表');
          updatedGoods.nxDisGoodsShelfStockEntities = newStockList;
        } else {
          // 当前列表不为空，需要判断是追加还是替换
          // 如果返回的是单个库存对象（长度为1），通常是新增的，追加到末尾
          // 如果返回的是多个库存（可能是完整列表），需要合并
          if (newStockList.length === 1) {
            // 返回的是单个库存对象，追加到现有列表末尾
            console.log('updateStockInList - 返回单个库存对象，追加到列表末尾');
            const newStock = newStockList[0];
            // 检查是否已存在（通过ID判断）
            const existingIndex = currentStockList.findIndex(stock => 
              stock.nxDistributerGoodsShelfStockId === newStock.nxDistributerGoodsShelfStockId
            );
            if (existingIndex !== -1) {
              // 已存在，更新
              const mergedStockList = [...currentStockList];
              mergedStockList[existingIndex] = newStock;
              updatedGoods.nxDisGoodsShelfStockEntities = mergedStockList;
            } else {
              // 不存在，追加到末尾
              updatedGoods.nxDisGoodsShelfStockEntities = [...currentStockList, newStock];
            }
          } else {
            // 返回的是多个库存，可能是完整列表，需要合并
            console.log('updateStockInList - 返回多个库存，进行合并');
            const mergedStockList = [...currentStockList];
            
            newStockList.forEach(newStock => {
              const existingIndex = mergedStockList.findIndex(stock => 
                stock.nxDistributerGoodsShelfStockId === newStock.nxDistributerGoodsShelfStockId
              );
              if (existingIndex !== -1) {
                // 更新现有批次
                mergedStockList[existingIndex] = newStock;
              } else {
                // 追加新批次到末尾
                mergedStockList.push(newStock);
              }
            });
            
            updatedGoods.nxDisGoodsShelfStockEntities = mergedStockList;
          }
        }
        
        // 重新计算总剩余库存
        updatedGoods.totalRestWeight = updatedGoods.nxDisGoodsShelfStockEntities.reduce((sum, stock) => {
          const weight = Number(stock && stock.nxDgssRestWeight ? stock.nxDgssRestWeight : 0);
          return sum + (isNaN(weight) ? 0 : weight);
        }, 0);
        
        console.log('updateStockInList - 更新后的库存批次数量:', updatedGoods.nxDisGoodsShelfStockEntities.length);
        console.log('updateStockInList - 更新后的总剩余库存:', updatedGoods.totalRestWeight);
      }
      
      const newList = [...shelfGoodsList];
      newList[index] = updatedGoods;
      
      this.setData({
        shelfGoodsList: newList
      });
      
      console.log('updateStockInList - 库存更新完成');
    }
  },

  /**
   * 根据 shelfGoodsId 更新货架商品列表中的 nxDistributerGoodsEntity
   * @param {Number} shelfGoodsId - 货架商品序号
   * @param {Object} updatedDisGoods - 更新后的商品对象
   * @returns {Boolean} 是否成功更新
   */
  updateShelfGoodsEntityByShelfGoodsId(shelfGoodsId, updatedDisGoods) {
    if (!shelfGoodsId) {
      console.warn('updateShelfGoodsEntityByShelfGoodsId: shelfGoodsId 不能为空');
      return false;
    }

    console.log('updateShelfGoodsEntityByShelfGoodsId - 开始查找货架商品，shelfGoodsId:', shelfGoodsId);
    
    const shelfGoodsList = this.data.shelfGoodsList || [];
    console.log('updateShelfGoodsEntityByShelfGoodsId - shelfGoodsList.length:', shelfGoodsList.length);
    
    const index = shelfGoodsList.findIndex(item => 
      item.nxDistributerGoodsShelfGoodsId === shelfGoodsId
    );
    
    console.log('updateShelfGoodsEntityByShelfGoodsId - 查找结果，index:', index);
    
    if (index !== -1) {
      // 找到对应的货架商品，替换它的 nxDistributerGoodsEntity
      const updatedGoods = {
        ...shelfGoodsList[index],
        nxDistributerGoodsEntity: updatedDisGoods // 替换整个商品对象
      };
      
      const newList = [...shelfGoodsList];
      newList[index] = updatedGoods;
      
      this.setData({
        shelfGoodsList: newList
      });
      
      console.log('updateShelfGoodsEntityByShelfGoodsId - 成功更新货架商品的 nxDistributerGoodsEntity');
      return true;
    }
    
    console.warn('updateShelfGoodsEntityByShelfGoodsId: 未找到对应的货架商品，shelfGoodsId:', shelfGoodsId);
    return false;
  },

  /**
   * 更新货架商品或非货架商品的 nxDgNxGoodsId（优化：不刷新整个列表）
   * @param {Number} goodsId - 商品ID（disGoodsId）
   * @param {Number} nxDgNxGoodsId - 更新后的 nxDgNxGoodsId
   * @param {Boolean} isUnshelf - 是否为非货架商品
   * @returns {Boolean} 是否成功更新
   */
  updateGoodsNxGoodsIdInList(goodsId, nxDgNxGoodsId, isUnshelf = false) {
    if (!goodsId) {
      console.warn('updateGoodsNxGoodsIdInList: goodsId 不能为空');
      return false;
    }

    console.log('updateGoodsNxGoodsIdInList - 开始查找商品，goodsId:', goodsId, 'nxDgNxGoodsId:', nxDgNxGoodsId, 'isUnshelf:', isUnshelf);
    console.log('updateGoodsNxGoodsIdInList - shelfGoodsList.length:', this.data.shelfGoodsList?.length || 0);
    console.log('updateGoodsNxGoodsIdInList - unShelfGoodsList.length:', this.data.unShelfGoodsList?.length || 0);

    // 先尝试在指定的列表中查找
    if (isUnshelf) {
      // 更新非货架商品列表
      const unShelfGoodsList = this.data.unShelfGoodsList || [];
      console.log('updateGoodsNxGoodsIdInList - 在非货架商品列表中查找，列表长度:', unShelfGoodsList.length);
      
      // 打印前几个商品的ID，用于调试
      if (unShelfGoodsList.length > 0) {
        console.log('updateGoodsNxGoodsIdInList - 非货架商品列表前3个商品ID:', 
          unShelfGoodsList.slice(0, 3).map(item => item.nxDistributerGoodsId));
      }
      
      const index = unShelfGoodsList.findIndex(item => 
        item.nxDistributerGoodsId === goodsId
      );
      
      console.log('updateGoodsNxGoodsIdInList - 在非货架商品列表中查找结果，index:', index);
      
      if (index !== -1) {
        const updatedGoods = {
          ...unShelfGoodsList[index]
        };
        updatedGoods.nxDgNxGoodsId = nxDgNxGoodsId;
        
        const newList = [...unShelfGoodsList];
        newList[index] = updatedGoods;
        
        this.setData({
          unShelfGoodsList: newList
        });
        console.log('updateGoodsNxGoodsIdInList - 成功更新非货架商品');
        return true;
      }
    } else {
      // 更新货架商品列表
      const shelfGoodsList = this.data.shelfGoodsList || [];
      console.log('updateGoodsNxGoodsIdInList - 在货架商品列表中查找，列表长度:', shelfGoodsList.length);
      
      // 打印前几个商品的ID，用于调试
      if (shelfGoodsList.length > 0) {
        console.log('updateGoodsNxGoodsIdInList - 货架商品列表前3个商品ID:', 
          shelfGoodsList.slice(0, 3).map(item => 
            item.nxDistributerGoodsEntity?.nxDistributerGoodsId || '无商品实体'
          ));
      }
      
      const index = shelfGoodsList.findIndex(item => {
        const itemGoodsId = item.nxDistributerGoodsEntity?.nxDistributerGoodsId;
        const match = itemGoodsId === goodsId;
        if (match) {
          console.log('updateGoodsNxGoodsIdInList - 找到匹配的商品，index:', shelfGoodsList.indexOf(item), 'itemGoodsId:', itemGoodsId);
        }
        return match;
      });
      
      console.log('updateGoodsNxGoodsIdInList - 在货架商品列表中查找结果，index:', index);
      
      if (index !== -1) {
        const updatedGoods = {
          ...shelfGoodsList[index]
        };
        if (updatedGoods.nxDistributerGoodsEntity) {
          updatedGoods.nxDistributerGoodsEntity = {
            ...updatedGoods.nxDistributerGoodsEntity,
            nxDgNxGoodsId: nxDgNxGoodsId
          };
        }
        
        const newList = [...shelfGoodsList];
        newList[index] = updatedGoods;
        
        this.setData({
          shelfGoodsList: newList
        });
        console.log('updateGoodsNxGoodsIdInList - 成功更新货架商品');
        return true;
      }
    }
    
    // 如果在指定列表中找不到，尝试在另一个列表中查找（可能判断错误）
    console.log('updateGoodsNxGoodsIdInList - 在指定列表中未找到，尝试在另一个列表中查找');
    if (isUnshelf) {
      // 尝试在货架商品列表中查找
      const shelfGoodsList = this.data.shelfGoodsList || [];
      const index = shelfGoodsList.findIndex(item => 
        item.nxDistributerGoodsEntity && 
        item.nxDistributerGoodsEntity.nxDistributerGoodsId === goodsId
      );
      
      if (index !== -1) {
        const updatedGoods = {
          ...shelfGoodsList[index]
        };
        if (updatedGoods.nxDistributerGoodsEntity) {
          updatedGoods.nxDistributerGoodsEntity = {
            ...updatedGoods.nxDistributerGoodsEntity,
            nxDgNxGoodsId: nxDgNxGoodsId
          };
        }
        
        const newList = [...shelfGoodsList];
        newList[index] = updatedGoods;
        
        this.setData({
          shelfGoodsList: newList
        });
        console.log('updateGoodsNxGoodsIdInList - 在货架商品列表中找到并更新');
        return true;
      }
    } else {
      // 尝试在非货架商品列表中查找
      const unShelfGoodsList = this.data.unShelfGoodsList || [];
      const index = unShelfGoodsList.findIndex(item => 
        item.nxDistributerGoodsId === goodsId
      );
      
      if (index !== -1) {
        const updatedGoods = {
          ...unShelfGoodsList[index]
        };
        updatedGoods.nxDgNxGoodsId = nxDgNxGoodsId;
        
        const newList = [...unShelfGoodsList];
        newList[index] = updatedGoods;
        
        this.setData({
          unShelfGoodsList: newList
        });
        console.log('updateGoodsNxGoodsIdInList - 在非货架商品列表中找到并更新');
        return true;
      }
    }
    
    // 如果都找不到，返回 false
    console.warn('updateGoodsNxGoodsIdInList: 未找到对应的商品，goodsId:', goodsId, 'isUnshelf:', isUnshelf);
    console.warn('updateGoodsNxGoodsIdInList: 货架商品列表所有ID:', 
      this.data.shelfGoodsList?.map(item => item.nxDistributerGoodsEntity?.nxDistributerGoodsId) || []);
    console.warn('updateGoodsNxGoodsIdInList: 非货架商品列表所有ID:', 
      this.data.unShelfGoodsList?.map(item => item.nxDistributerGoodsId) || []);
    return false;
  },

  /**
   * 更新货架商品列表中的单个商品（优化：不刷新整个列表）
   * @param {Number} shelfGoodsId - 货架商品ID
   * @param {Object} updatedData - 要更新的数据（可以是部分数据）
   * @param {Object} responseData - 接口返回的完整商品数据（如果有）
   */
  updateShelfGoodsInList(shelfGoodsId, updatedData = {}, responseData = null) {
    if (!shelfGoodsId) return;
    
    const shelfGoodsList = this.data.shelfGoodsList || [];
    const index = shelfGoodsList.findIndex(item => 
      item.nxDistributerGoodsShelfGoodsId === shelfGoodsId
    );
    
    if (index === -1) {
      console.warn('updateShelfGoodsInList: 未找到对应的商品，shelfGoodsId:', shelfGoodsId);
      return;
    }
    
    // 如果有接口返回的完整数据，使用它；否则合并更新数据
    let updatedGoods;
    if (responseData) {
      // 格式化返回的数据（确保是数组格式）
      const dataArray = Array.isArray(responseData) ? responseData : [responseData];
      const formatted = this._formatShelfGoodsList(dataArray);
      updatedGoods = formatted[0] || responseData;
    } else {
      // 只更新部分数据，保留原有数据
      updatedGoods = {
        ...shelfGoodsList[index],
        ...updatedData
      };
      // 重新计算 totalRestWeight（如果需要）
      if (updatedData.nxDisGoodsShelfStockEntities) {
        const stockList = Array.isArray(updatedData.nxDisGoodsShelfStockEntities) 
          ? updatedData.nxDisGoodsShelfStockEntities 
          : [];
        updatedGoods.totalRestWeight = stockList.reduce((sum, stock) => {
          const weight = Number(stock && stock.nxDgssRestWeight ? stock.nxDgssRestWeight : 0);
          return sum + (isNaN(weight) ? 0 : weight);
        }, 0);
      }
    }
    
    // 更新列表
    const newList = [...shelfGoodsList];
    newList[index] = updatedGoods;
    
    this.setData({
      shelfGoodsList: newList
    });
  },







})
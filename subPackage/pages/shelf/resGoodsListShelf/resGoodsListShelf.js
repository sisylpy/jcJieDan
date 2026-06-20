
import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');

import {
  
  addShelfGoods,
  queryShelfNxGoodsWithNxDisByQuickSearch
}
from '../../../../lib/apiDistributer'

import { 
  downDisGoods,
}from '../../../lib/apiibook'


Page({

  onShow(){
    if(this.data.add){
      var shelfItem = this.data.addItem;
      var arr = this.data.showArr;
      arr.push(shelfItem);
      this.setData({
        showArr: arr,
        add: false,
        addItem: null
      })
    }
    // 处理从临时商品页面返回的数据
    if(this.data.tempGoodsAdded){
      this.addTempGoodsToShelf(this.data.tempGoodsData);
      this.setData({
        tempGoodsAdded: false,
        tempGoodsData: null
      });
    }
  },

  /**
   * 页面的初始数据
   */
  data: {
   
    showArr: [],
    searchStr: "",
    item: null,
    nxArr: [],
    keyboardVisible: true, // 标记键盘是否可见
    keyboardOffset: 0,
    keyboardHeight: 0, // 键盘高度，用于调整内容区域高度
    searchBoxHeight: 128, // 搜索栏高度（rpx），初始值
    rpxR: 1,
    tempGoodsAdded: false, // 临时商品是否已添加
    tempGoodsData: null, // 临时商品数据
    shelfGoodsAdded: false, // 是否添加了货架商品，用于通知货架页面刷新
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
        userInfo: value
      })
    }

    // ✅ 统一用 px 计算，再转 rpx（彻底避免混单位）
    const win = wx.getWindowInfo(); // 全部是 px
    const rpxR = 750 / win.windowWidth;

    // searchBarHeight 这里就直接用 rpx（因为 wxss 写死了就是 128rpx）
    const searchBarHeightRpx = 128; // 搜索栏最小高度（只有输入框时，实际测量约127rpx）
    const contentPaddingTopRpx = 20; // content 的 padding-top

    // 系统 API 拿到的都是 px，统一转换为 rpx
    const systemHeightRpx = win.windowHeight * rpxR;
    const navBarHeightRpx = globalData.navBarHeight * rpxR; // globalData.navBarHeight 是 px

    // 初始 scroll-view 高度 = 屏幕高度 - 导航栏高度 - 搜索栏高度 - content padding-top
    // 注意：content 容器有 padding-top: 20rpx，scroll-view 在 content 内部，所以需要减去这个 padding
    const initialScrollViewHeight = systemHeightRpx - navBarHeightRpx - searchBarHeightRpx - contentPaddingTopRpx;
    
    console.log('=== 页面高度初始化（修复后） ===');
    console.log('windowHeight (px):', win.windowHeight);
    console.log('navBarHeight (px):', globalData.navBarHeight);
    console.log('rpxR:', rpxR);
    console.log('systemHeightRpx:', systemHeightRpx);
    console.log('navBarHeightRpx:', navBarHeightRpx);
    console.log('searchBarHeightRpx:', searchBarHeightRpx);
    console.log('contentPaddingTopRpx:', contentPaddingTopRpx);
    console.log('initialScrollViewHeight:', initialScrollViewHeight);
    console.log('计算验证:', systemHeightRpx, '=', navBarHeightRpx, '+', searchBarHeightRpx, '+', contentPaddingTopRpx, '+', initialScrollViewHeight);
    
    // 延迟检查实际渲染高度，并根据实际高度动态调整
    setTimeout(() => {
      const query = wx.createSelectorQuery();
      query.select('.search-bar').boundingClientRect((rect) => {
        if (rect) {
          const currentRpxR = this.data.rpxR || rpxR; // 使用 data 中的 rpxR，如果没有则使用局部变量
          const actualSearchBarHeightRpx = rect.height * currentRpxR; // rect.height 是 px，转换为 rpx
          console.log('=== 搜索栏实际高度检查 ===');
          console.log('search-bar 实际高度 (px):', rect.height);
          console.log('search-bar 实际高度 (rpx):', actualSearchBarHeightRpx);
          console.log('设置的 searchBoxHeight (rpx):', searchBarHeightRpx);
          
          // 如果实际高度和设置的高度不一致，更新 scrollViewHeight
          if (Math.abs(actualSearchBarHeightRpx - searchBarHeightRpx) > 10) {
            console.log('检测到搜索栏高度不匹配，更新 scrollViewHeight');
            const correctedScrollViewHeight = this.data.systemHeight - this.data.navBarHeight - actualSearchBarHeightRpx - contentPaddingTopRpx;
            this.setData({
              searchBoxHeight: actualSearchBarHeightRpx,
              scrollViewHeight: correctedScrollViewHeight
            });
            console.log('已更新 scrollViewHeight 为:', correctedScrollViewHeight);
          }
        }
      }).exec();
    }, 500);
 
     this.setData({
       windowWidth: win.windowWidth * rpxR,
       windowHeight: systemHeightRpx,
       navBarHeight: navBarHeightRpx,
       searchBoxHeight: searchBarHeightRpx,
       scrollViewHeight: initialScrollViewHeight, // 初始 scroll-view 高度（无键盘时）
       orderDataHeight: 0,  // 用于存储订单数据区域的高度
       url: apiUrl.server,
       name: options.name,
       shelfId: options.shelfId,
       sort: options.sort,
       shelfSort: options.shelfSort,
       rpxR: rpxR,
       systemHeight: systemHeightRpx, // 保存系统高度，用于后续计算
    })

    var shelf = wx.getStorageSync('shelfItem');
    if(shelf){
      this.setData({
        shelf: shelf
      })
    }
    
  },

  clearNx(){
    this.setData({
      nxArr: [],
    })
  },

  onFocus(e) {
    this.setData({
      keyboardVisible: true, // 键盘弹出
    });
    console.log('输入框获得焦点');
  },

  onKeyboardHeightChange(e) {
    // 监听键盘高度变化
    // e.detail.height 是键盘高度，单位 px
    const keyboardHeightPx = (e.detail && e.detail.height) ? e.detail.height : 0;
    
    if (keyboardHeightPx === 0) {
      // 键盘收起，使用 onBlur 处理
      return;
    }
    
    // 将键盘高度从 px 转换为 rpx
    const keyboardHeightRpx = keyboardHeightPx * (this.data.rpxR || 1);
    
    // keyboardOffset 用于将搜索栏顶到键盘上方，等于键盘高度
    const keyboardOffsetRpx = keyboardHeightRpx;
    
    // 重新计算 scroll-view 高度
    // 键盘弹起时，search-bar 被推上去（bottom: keyboardOffset = keyboardHeight）
    // scroll-view 的可视区域应该是：从导航栏下方开始，到 search-bar 上方结束
    // 由于 content 容器有 padding-top: 20rpx，scroll-view 在 content 内部
    // 所以 scroll-view 高度 = 系统高度 - 导航栏高度 - content padding-top - 键盘高度 - search-bar高度
    const contentPaddingTopRpx = 20; // content 容器的 padding-top
    // 键盘弹起时，scroll-view 的可视区域 = 系统高度 - 导航栏 - content padding-top - 键盘高度 - search-bar高度
    const scrollViewHeight = this.data.systemHeight - this.data.navBarHeight - contentPaddingTopRpx - keyboardHeightRpx - this.data.searchBoxHeight;
    
    console.log('🔍 键盘高度变化（详细）:', {
      keyboardHeightPx: keyboardHeightPx,
      keyboardHeightRpx: keyboardHeightRpx,
      keyboardOffsetRpx: keyboardOffsetRpx,
      scrollViewHeight: scrollViewHeight,
      systemHeight: this.data.systemHeight,
      navBarHeight: this.data.navBarHeight,
      searchBoxHeight: this.data.searchBoxHeight,
      contentPaddingTopRpx: contentPaddingTopRpx,
      rpxR: this.data.rpxR,
      calculation: `${this.data.systemHeight} - ${this.data.navBarHeight} - ${contentPaddingTopRpx} - ${keyboardHeightRpx} - ${this.data.searchBoxHeight} = ${scrollViewHeight}`,
      '可视区域占比': `${((scrollViewHeight / this.data.systemHeight) * 100).toFixed(2)}%`
    });
    
    // 立即更新，不延迟
    this.setData({
      keyboardOffset: keyboardOffsetRpx, // 搜索栏向上偏移，位于键盘上方
      keyboardHeight: keyboardHeightRpx, // 保存键盘高度
      scrollViewHeight: Math.max(0, scrollViewHeight) // 更新 scroll-view 高度，确保不为负数
    });
  },

  onBlur(e) {
    // 延迟一下再设置，避免键盘收起动画和高度更新冲突
    setTimeout(() => {
      // 键盘收起后，重新计算 scroll-view 高度
      // scrollViewHeight = 系统高度 - 导航栏高度 - 搜索栏高度 - content padding-top（无键盘）
      const contentPaddingTopRpx = 20; // 直接使用 rpx，不需要再转换
      const scrollViewHeight = this.data.systemHeight - this.data.navBarHeight - this.data.searchBoxHeight - contentPaddingTopRpx;
      
      this.setData({
        keyboardVisible: false, // 键盘收起
        keyboardOffset: 0, // 搜索栏回到底部
        keyboardHeight: 0, // 键盘高度重置为0
        scrollViewHeight: scrollViewHeight, // 恢复 scroll-view 高度（无键盘时）
        // nxArr: [],
        // focusInput: true,
      });
      console.log('键盘收起，高度已重置:', {
        scrollViewHeight: scrollViewHeight,
        systemHeight: this.data.systemHeight,
        navBarHeight: this.data.navBarHeight,
        searchBoxHeight: this.data.searchBoxHeight
      });
    }, 100);
  },

  getSearchStringNx(e){
    const newValue = e.detail.value;
    const oldValue = this.data.searchStr || '';
    
    // 只有当搜索内容真正改变时才处理
    if(newValue !== oldValue){
      // 更新搜索字符串
      this.setData({
        searchStr: newValue,
      })
      
      if(newValue.length > 0){
        // 有输入内容，清空并重新搜索
        this.setData({
          nxArr: [],
        })
        var data = {
          searchStr: newValue,
          disId: this.data.disId,
        }
        load.showLoading("搜索商品中");
        queryShelfNxGoodsWithNxDisByQuickSearch(data).then(res => {
          console.log('接口返回数据:', res);
          load.hideLoading();
          if (res.result.code == 0) {
            // 处理新的返回数据结构：{nxGoods: [...], nxDisGoods: [...], nxShelfGoods: [...]}
            const resultData = res.result.data || {};
            const nxDisGoods = resultData.nxDisGoods || []; // 配送商商品（不需要下载）
            const nxGoods = resultData.nxGoods || []; // 需要下载的商品
            const nxShelfGoods = resultData.nxShelfGoods || []; // 已上架商品
            
            // 为配送商商品添加类型标记，标记为可以直接添加
            const disGoodsList = nxDisGoods.map(item => ({
              ...item,
              goodsType: 'disGoods', // 标记为配送商商品
              isDirectAdd: true // 可以直接添加，不需要下载
            }));
            
            // 为nxGoods添加类型标记
            const nxGoodsList = nxGoods.map(item => ({
              ...item,
              goodsType: 'nxGoods', // 标记为nxGoods
              isDirectAdd: false // 需要先下载
            }));
            
            // 为已上架商品添加类型标记，标记为可以直接添加（已有货架信息）
            const shelfGoodsList = nxShelfGoods.map(item => ({
              ...item,
              goodsType: 'shelfGoods', // 标记为已上架商品
              isDirectAdd: true // 可以直接添加，不需要下载
            }));
            
            // 合并列表：已上架商品在上，配送商商品在中，nxGoods在下
            const mergedList = [...shelfGoodsList, ...disGoodsList, ...nxGoodsList];
            const totalCount = mergedList.length;
            
            if (totalCount > 0) {
              this.setData({
                nxArr: mergedList,
                count: totalCount,
              })
            } else {
              this.setData({
                nxArr: [],
              })
            }
          } else {
            this.setData({
              nxArr: [],
            })
          }
        }).catch(err => {
          console.error('搜索商品失败:', err);
          load.hideLoading();
          this.setData({
            nxArr: [],
          })
        })
      }
    }
  },


  /**
   * 保存批发商商品
   * @param {*} e 
   */
  downLoadGoods: function (e) {
    this.setData({
      item: e.currentTarget.dataset.item,
      addIndex: e.currentTarget.dataset.index,

    })
    
    var dg = {
      nxDgDistributerId: this.data.disId,
      nxDgNxGoodsId: this.data.item.nxGoodsId,
      nxDgGoodsName: this.data.item.nxGoodsName,
      nxDgNxFatherId: this.data.fatherId,
      nxDgNxFatherImg: this.data.fatherImg,
      nxDgNxFatherName: this.data.fatherName,
      nxDgGoodsDetail: this.data.item.nxGoodsDetail,
      nxDgGoodsPlace: this.data.item.nxGoodsPlace,
      nxDgGoodsBrand: this.data.item.nxGoodsBrand,
      nxDgGoodsStandardname: this.data.item.nxGoodsStandardname,
      nxDgGoodsStandardWeight: this.data.item.nxGoodsStandardWeight,
      nxDgGoodsPinyin: this.data.item.nxGoodsPinyin,
      nxDgGoodsPy: this.data.item.nxGoodsPy,
      nxDgPullOff: 0,
      nxDgGoodsStatus: 0,
      nxDgPurchaseAuto: this.data.purchaseAuto,
      nxDgNxGoodsFatherColor: this.data.color,
      nxStandardEntities: this.data.item.nxGoodsStandardEntities,
      nxAliasEntities: this.data.item.nxAliasEntities,
      nxDgPurchaseAuto: 1,
    };

    load.showLoading("保存商品");
    var that = this;
    downDisGoods(dg)
      .then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          that.downSucuessToAddShelfGoods(res.result.data, that.data.addIndex);
        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
      })
  },

  downSucuessToAddShelfGoods(data,index){
   
    var shelfItem = {
      nxDgsgDisGoodsId: data.nxDistributerGoodsId,
      nxDgsgShelfId: Number(this.data.shelfId),
      nxDistributerGoodsEntity: data,
      nxDgsgSort: Number(this.data.sort) + Number(1),
      nxDgsgShelfSort: this.data.shelfSort
    }
    var temp = [];
    temp.push(shelfItem);
    addShelfGoods(temp)
    .then(res =>{
      if(res.result.code == 0){
        var that  = this;
        var shelfList = that.data.showArr;
        shelfList.push(shelfItem);
        var spIndex = Number(that.data.addIndex);
        that.data.nxArr.splice(spIndex,1);
        if(that.data.nxArr.length == 0){
          that.setData({
            showArr: shelfList,
            sort:  Number(that.data.sort) + Number(1),
            focusInput: true,
            searchStr: "",
            nxArr: [],
            shelfGoodsAdded: true
          })

        }else{
          that.setData({
            nxArr: that.data.nxArr,
            showArr: shelfList,
            sort:  Number(this.data.sort) + Number(1),
            searchStr: "",
            shelfGoodsAdded: true
          })
        }
        this.calculateOrderDataHeight();

      }
    })
  },

  addShelfGoods(e){
    var data = e.currentTarget.dataset.item;
    this.setData({
      addIndex: e.currentTarget.dataset.index,
    })
    var shelfItem = {
      nxDgsgDisGoodsId: data.nxDistributerGoodsId,
      nxDgsgShelfId: Number(this.data.shelfId),
      nxDistributerGoodsEntity: data,
      nxDgsgSort: Number(this.data.sort) + Number(1),
      nxDgsgShelfSort: this.data.shelfSort,
    }
    var temp = [];
    temp.push(shelfItem);
    addShelfGoods(temp)
    .then(res =>{
      if(res.result.code == 0){
        var that  = this;
        var shelfList = that.data.showArr;
        shelfList.push(shelfItem);
        var spIndex = Number(that.data.addIndex);
        that.data.nxArr.splice(spIndex,1);
       if(that.data.nxArr.length == 0){
        this.setData({
          showArr: shelfList,
          sort:  Number(that.data.sort) + Number(1),
          searchStr: "",
          nxArr: [],
          shelfGoodsAdded: true
        })
       }else{
        that.setData({
           nxArr: that.data.nxArr,
          showArr: shelfList,
          sort:  Number(that.data.sort) + Number(1),
          searchStr: "",
          shelfGoodsAdded: true
        })
       }
       this.calculateOrderDataHeight();

      }
    })
  },


  calculateOrderDataHeight: function () {
    const query = wx.createSelectorQuery();
    query.select('.content-scroll').boundingClientRect(rect => {
      if (!rect) {
        return;
      }
      this.setData({
        orderDataHeight: rect.height || 0
      });
    }).exec();
  },

  // 跳转到添加临时商品页面
  toAddTempGoods() {
    if (!this.data.searchStr || this.data.searchStr.trim().length === 0) {
      wx.showToast({
        title: '请先输入商品名称',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: `../../goods/disAddGoodsLinshi/disAddGoodsLinshi?from=shelf&goodsName=${encodeURIComponent(this.data.searchStr || '')}&shelfId=${this.data.shelfId}&sort=${this.data.sort}&shelfSort=${this.data.shelfSort || 0}&cartonUnit=${encodeURIComponent('箱')}`
    });
  },

  // 将临时商品添加为货架商品
  addTempGoodsToShelf(goodsData) {
    if (!goodsData || !goodsData.nxDistributerGoodsId) {
      wx.showToast({
        title: '商品数据错误',
        icon: 'none'
      });
      return;
    }

    var shelfItem = {
      nxDgsgDisGoodsId: goodsData.nxDistributerGoodsId,
      nxDgsgShelfId: Number(this.data.shelfId),
      nxDistributerGoodsEntity: goodsData,
      nxDgsgSort: Number(this.data.sort) + Number(1),
      nxDgsgShelfSort: this.data.shelfSort || 0,
    };
    
    var temp = [];
    temp.push(shelfItem);
    
    load.showLoading("添加货架商品");
    addShelfGoods(temp)
      .then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          var shelfList = this.data.showArr;
          shelfList.push(shelfItem);
          this.setData({
            showArr: shelfList,
            sort: Number(this.data.sort) + Number(1),
            searchStr: "",
            nxArr: [],
            shelfGoodsAdded: true // 标记已添加货架商品
          });
          this.calculateOrderDataHeight();
          wx.showToast({
            title: '添加成功',
            icon: 'success'
          });
        } else {
          wx.showToast({
            title: res.result.msg || '添加失败',
            icon: 'none'
          });
        }
      })
      .catch(err => {
        load.hideLoading();
        wx.showToast({
          title: '添加失败',
          icon: 'none'
        });
      });
  },

  
 toBack() {
   
    wx.navigateBack({
      delta: 1,
    })
  },

  onUnload(){
    // 页面卸载时，如果添加了货架商品，通知货架页面重新请求数据
    if(this.data.shelfGoodsAdded){
      var pages = getCurrentPages();
      if(pages.length > 1){
        var prevPage = pages[pages.length - 2];
        if(prevPage && prevPage.route && (
          prevPage.route.includes('shelf/index') || 
          prevPage.route.includes('shelf/index/index')
        )){
          prevPage.setData({
            needsRefreshOnShow: true
          });
        }
      }
    }
  },
})


  // _againSearchString(e) {
  
  //     var data = {
  //       disId: this.data.disId,
  //       searchStr: this.data.searchStr,
  //       depId: this.data.depId,
  //     }
    
  //      queryDisShelfGoodsByQuickSearch,(data).then(res => {
  //       console.log(res)
  //       if (res.result.code == 0) {
  //         if (res.result.data.nxArr ==  -1) {
  //           this.setData({
  //             strArr: res.result.data.disArr,
  //             nxArr: [],
  //           })
  //         } else {
  //           if(res.result.data.nxArr !==  -1){
  //             this.setData({
  //               nxArr: res.result.data.nxArr,
  //               strArr: [],
  //             })
  //           }else{
  //             this.setData({
  //               strArr: [],
  //               nxArr: []
  //             })
  //           }
            
  //         }
  //       }
  //     })    
  // },



  // changeSearchType(e){
  //   if(this.data.searchType == 0){
  //     this.setData({
  //       searchStr: "",
  //       searchType: 1,
  //       nxArr: [],
  //       strArr: [],
  //       isSearching: false
  //     })
  //   }else{
  //     this.setData({
  //       searchStr: "",
  //       searchType: 0,
  //       nxArr: [],
  //       strArr: [],
  //       isSearching: false
  //     })
  //   }
  // },

 
//  getSearchString(e) {
//   this.setData({
//     isSearching: true,
//   })

//   if (e.detail.value.length > 0) {
//     this.setData({
//       searchStr: e.detail.value,
//     })

//     var data = {
//       disId: this.data.disId,
//       searchStr: e.detail.value,
//     }

//      queryDisShelfGoodsByQuickSearch(data).then(res => {
//       if (res.result.code == 0) {
//         this.setData({
//           strArr: res.result.data,
//           nxArr: [],
//           count: res.result.data.length,
//         })
//       }
//     })
//   } else {
//     this.setData({
//       searchArr: [],
//       isSearching: false,
//       searchStr: "",
//     })
//   }

// },

var app = getApp();

import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');

import {
  disSaveLinshiToAlias,
  disChangeLinshiToSub,
  disSaveLinshiToNxGoods,
  queryLinshiGoodsAndNxGoodsByQuickSearch,
  helpSaveLinshi,
  delNxDisGoods,
  queryDisShelfGoods,
  deleteShelfGoods
}

from '../../../../lib/apiDistributer'


import { 
  downDisGoods,

}from '../../../../lib/apiibook'


let itemWidth = 0;

Page({
  data:{
    strArr:[],
    nxArr: [],
    tab1IndexSearch: 0,
    itemIndexSearch: 0,
    sliderOffsetSearch: 0,
    sliderOffsetsSearch: [],
    sliderLeftSearch: 0,
    sliderWidthSearch: 0,
    tabsSearch: [{
      id: 0,
      amount: 0,
      words: "我的商品"
    }, {
      id: 1,
      amount: 0,
      words: "下载目录"
    }, {
      id: 2,
      amount: 0,
      words: "货架商品"
    }],
    shelfSearchArr: [], // 货架商品搜索结果
    unShelfGoodsList: [], // 非货架商品列表
    isSearching: true,
    searchResult: false,
    placeHolder: "输入商品名称或拼音字母、首字母",
  },


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const globalData = app.globalData;


    var value = wx.getStorageSync('userInfo');
    if (value) {
      this.setData({
        disId: value.nxDistributerEntity.nxDistributerId,
        userInfo: value,
      })
    }

    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      name: options.name,
      searchStr:options.name,
      standard: options.standard,
      linshiId: options.id,
      type: options.type,
    })

    var linshiGoods = wx.getStorageSync('linshiGoods');
    if(linshiGoods){
      this.setData({
        linshiGoods: linshiGoods
      })
    }

    // 先初始化滑块位置，然后在回调中执行搜索
    this.clueOffsetSearch(true); // 传入参数表示初始化时调用

  },

  helpAdd(){
    wx.setStorageSync('linshiGoods', this.data.linshiGoods);
    wx.navigateTo({
      url: '../disUpdateGoodsLinshi/disUpdateGoodsLinshi',
    })
    // helpSaveLinshi(this.data.linshiId).then(res =>{
    //   if(res.result.code == 0){

    //     wx.navigateBack({delta: 1})
    //   }
    // })
  },  


 
  del(e){
    delNxDisGoods(this.data.linshiId)
    .then(res =>{
      if(res.result.code == 0){
        // 检查是否从货架页面跳转过来
        const fromAilasGoodsList = wx.getStorageSync('fromAilasGoodsList');
        const shelfGoodsId = wx.getStorageSync('shelfGoodsId');
        const shelfGoodsListIndex = wx.getStorageSync('shelfGoodsListIndex');
        
        console.log('del - 删除商品成功，检查是否需要更新货架页面');
        console.log('del - fromAilasGoodsList:', fromAilasGoodsList);
        console.log('del - shelfGoodsId:', shelfGoodsId);
        console.log('del - shelfGoodsListIndex:', shelfGoodsListIndex);
        
        if (fromAilasGoodsList && shelfGoodsId) {
          // 获取上一个页面（货架页面）
          const pages = getCurrentPages();
          const prevPage = pages[pages.length - 2]; // 上一个页面
          
          console.log('del - prevPage 存在:', !!prevPage);
          console.log('del - prevPage.setData 存在:', !!(prevPage && prevPage.setData));
          console.log('del - prevPage.data.shelfGoodsList 存在:', !!(prevPage && prevPage.data && prevPage.data.shelfGoodsList));
          
          if (prevPage && prevPage.setData && prevPage.data.shelfGoodsList) {
            const shelfGoodsList = [...prevPage.data.shelfGoodsList];
            let removed = false;
            
            // 优先使用 shelfGoodsListIndex 移除
            if (shelfGoodsListIndex !== undefined && shelfGoodsListIndex !== null) {
              console.log('del - 尝试使用 index 移除，index:', shelfGoodsListIndex, '列表长度:', shelfGoodsList.length);
              if (shelfGoodsList[shelfGoodsListIndex] && 
                  shelfGoodsList[shelfGoodsListIndex].nxDistributerGoodsShelfGoodsId === shelfGoodsId) {
                shelfGoodsList.splice(shelfGoodsListIndex, 1);
                removed = true;
                console.log('del - 成功通过 index 移除 shelfGoodsList[' + shelfGoodsListIndex + ']');
              } else {
                console.warn('del - shelfGoodsListIndex 超出范围或ID不匹配:', shelfGoodsListIndex);
              }
            }
            
            // 如果 index 移除失败，使用 shelfGoodsId 查找并移除
            if (!removed) {
              console.log('del - index 移除失败，尝试使用 shelfGoodsId 查找并移除，shelfGoodsId:', shelfGoodsId);
              const index = shelfGoodsList.findIndex(item => 
                item.nxDistributerGoodsShelfGoodsId === shelfGoodsId
              );
              console.log('del - 通过 shelfGoodsId 查找到的 index:', index);
              
              if (index !== -1) {
                shelfGoodsList.splice(index, 1);
                removed = true;
                console.log('del - 成功通过 shelfGoodsId 移除 shelfGoodsList[' + index + ']');
              } else {
                console.warn('del - 未找到对应的 shelfGoods，shelfGoodsId:', shelfGoodsId);
              }
            }
            
            if (removed) {
              // 更新货架商品列表和总数
              prevPage.setData({
                shelfGoodsList: shelfGoodsList,
                totalCount: Math.max(0, (prevPage.data.totalCount || 0) - 1)
              });
              console.log('del - 成功从货架页面移除商品，已调用 setData');
            } else {
              // 如果移除失败，设置标记让 onShow 刷新整个列表
              wx.setStorageSync('needRefreshShelfGoods', true);
              console.warn('del - 移除失败，已设置 needRefreshShelfGoods 标记，将在返回时刷新整个列表');
            }
          } else {
            console.warn('del - 无法获取上一个页面或页面数据异常');
            // 如果无法获取页面，设置标记让 onShow 刷新整个列表
            wx.setStorageSync('needRefreshShelfGoods', true);
          }
        }
        
        // 清除 storage
        wx.removeStorageSync('fromAilasGoodsList');
        wx.removeStorageSync('shelfGoodsId');
        wx.removeStorageSync('shelfGoodsListIndex');
        
         wx.navigateBack({delta: 1})
      }else{
        wx.showToast({
          title: res.result.msg,
          icon: 'none'
        })
      }
    })
  },
  
  // !!!!!!!!!!!!!!!!!!!search--------------------------------------
  /**
   * 计算偏移量
   */
  clueOffsetSearch(shouldSearch) {
    var that = this;
    console.log('=== clueOffsetSearch 开始 ===');
    console.log('📊 tabsSearch 数量:', that.data.tabsSearch.length);
    console.log('📊 当前 tab1IndexSearch:', that.data.tab1IndexSearch);

    wx.getSystemInfo({
      success: function (res) {
        itemWidth = Math.ceil(res.windowWidth / that.data.tabsSearch.length);
        console.log('📊 windowWidth (px):', res.windowWidth);
        console.log('📊 itemWidth (每个tab宽度, px):', itemWidth);
        
        let tempArr = [];
        for (let i in that.data.tabsSearch) {
          tempArr.push(itemWidth * i);
        }
        console.log('📊 sliderOffsetsSearch 数组:', tempArr);
        
        // tab 样式初始化
        // sliderLeftSearch 设置为 0，滑块从每个tab的左边开始（单位：px）
        var sliderLeft = 0;
        // sliderWidth 用于设置滑块宽度（单位：px）
        var sliderWidth = res.windowWidth / that.data.tabsSearch.length;
        var currentOffset = tempArr[that.data.tab1IndexSearch] || 0;
        
        console.log('📊 sliderLeftSearch (左边偏移, px):', sliderLeft);
        console.log('📊 sliderWidthSearch (滑块宽度, px):', sliderWidth);
        console.log('📊 sliderOffsetSearch (当前偏移, px):', currentOffset);
        console.log('📊 计算后的滑块位置 - left:', sliderLeft, 'px, width:', sliderWidth, 'px, translateX:', currentOffset, 'px');
        console.log('📊 滑块实际位置范围:', currentOffset, 'px 到', (currentOffset + sliderWidth), 'px');
        
        that.setData({
          sliderOffsetsSearch: tempArr,
          sliderOffsetSearch: currentOffset,
          sliderLeftSearch: sliderLeft,
          sliderWidthSearch: sliderWidth, // 添加滑块宽度
         
        });
        
        console.log('✅ clueOffsetSearch 完成，已设置滑块位置');
        
        // 如果是初始化时调用，在设置完滑块位置后执行搜索
        if (shouldSearch) {
          console.log('📊 开始执行搜索...');
          that.searchGoodsWithStr();
        }
        console.log('=== clueOffsetSearch 结束 ===');
      }
    });
  },

  /**
   * tabItme点击
   */
  onTab1ClickSearch(event) {
    let index = event.currentTarget.dataset.index;
    console.log('=== onTab1ClickSearch ===');
    console.log('📊 点击的 tab 索引:', index);
    console.log('📊 sliderOffsetsSearch 数组:', this.data.sliderOffsetsSearch);
    console.log('📊 计算后的偏移量:', this.data.sliderOffsetsSearch[index] || 0);
    this.setData({
      sliderOffsetSearch: this.data.sliderOffsetsSearch[index] || 0,
      tab1IndexSearch: index,
      itemIndexSearch: index,
      showOperation: false
    })
    console.log('✅ tab 切换完成，滑块位置已更新');
  },

  swiperChangeSearch(event) {
    var currentIndex = event.detail.current;
    console.log('=== swiperChangeSearch ===');
    console.log('📊 swiper 切换到的索引:', currentIndex);
    console.log('📊 sliderOffsetsSearch 数组:', this.data.sliderOffsetsSearch);
    console.log('📊 计算后的偏移量:', this.data.sliderOffsetsSearch[currentIndex] || 0);
    this.setData({
      sliderOffsetSearch: this.data.sliderOffsetsSearch[currentIndex] || 0,
      tab1IndexSearch: currentIndex,
      itemIndexSearch: currentIndex,
    })
    console.log('✅ swiper 切换完成，滑块位置已更新');
  },



  toExchange(e){
   
    var id = e.currentTarget.dataset.id;
    var data = {
       nxGoodsId: id,
       lsGoodsId: this.data.linshiId,
       disId: this.data.disId
    }
    console.log("data",data);
    load.showLoading("保存中");
    disSaveLinshiToNxGoods(data).then(res =>{
      load.hideLoading();
      if(res.result.code == 0){
        // 优化：直接更新上一个页面的 shelfGoodsList[index].nxDistributerGoodsEntity
        const updatedGoods = res.result.data; // 接口返回的商品对象
        const shelfGoodsListIndex = wx.getStorageSync('shelfGoodsListIndex');
        
        if (updatedGoods && updatedGoods.nxDistributerGoodsId) {
          console.log('toExchange - 开始更新商品，updatedGoods:', updatedGoods);
          console.log('toExchange - shelfGoodsListIndex:', shelfGoodsListIndex);
          
          // 获取上一个页面（货架页面）
          const pages = getCurrentPages();
          const prevPage = pages[pages.length - 2]; // 上一个页面
          
          console.log('toExchange - prevPage 存在:', !!prevPage);
          console.log('toExchange - prevPage.setData 存在:', !!(prevPage && prevPage.setData));
          console.log('toExchange - prevPage.data.shelfGoodsList 存在:', !!(prevPage && prevPage.data && prevPage.data.shelfGoodsList));
          
          if (prevPage && prevPage.setData && prevPage.data.shelfGoodsList) {
            const shelfGoodsList = [...prevPage.data.shelfGoodsList];
            console.log('toExchange - shelfGoodsList.length:', shelfGoodsList.length);
            let updated = false;
            
            // 优先使用 shelfGoodsListIndex 更新
            if (shelfGoodsListIndex !== undefined && shelfGoodsListIndex !== null) {
              console.log('toExchange - 尝试使用 index 更新，index:', shelfGoodsListIndex, '列表长度:', shelfGoodsList.length);
              if (shelfGoodsList[shelfGoodsListIndex]) {
                shelfGoodsList[shelfGoodsListIndex] = {
                  ...shelfGoodsList[shelfGoodsListIndex],
                  nxDistributerGoodsEntity: updatedGoods // 替换商品实体
                };
                updated = true;
                console.log('toExchange - 成功通过 index 更新 shelfGoodsList[' + shelfGoodsListIndex + '].nxDistributerGoodsEntity');
              } else {
                console.warn('toExchange - shelfGoodsListIndex 超出范围:', shelfGoodsListIndex, '列表长度:', shelfGoodsList.length);
              }
            }
            
            // 如果 index 更新失败，使用 shelfGoodsId 查找
            if (!updated) {
              const shelfGoodsId = wx.getStorageSync('shelfGoodsId');
              console.log('toExchange - index 更新失败，尝试使用 shelfGoodsId 查找，shelfGoodsId:', shelfGoodsId);
              
              if (shelfGoodsId) {
                const index = shelfGoodsList.findIndex(item => 
                  item.nxDistributerGoodsShelfGoodsId === shelfGoodsId
                );
                console.log('toExchange - 通过 shelfGoodsId 查找到的 index:', index);
                
                if (index !== -1) {
                  shelfGoodsList[index] = {
                    ...shelfGoodsList[index],
                    nxDistributerGoodsEntity: updatedGoods // 替换商品实体
                  };
                  updated = true;
                  console.log('toExchange - 成功通过 shelfGoodsId 更新 shelfGoodsList[' + index + '].nxDistributerGoodsEntity');
                } else {
                  console.warn('toExchange - 未找到对应的 shelfGoods，shelfGoodsId:', shelfGoodsId);
                  console.warn('toExchange - shelfGoodsList 中的所有 shelfGoodsId:', shelfGoodsList.map(item => item.nxDistributerGoodsShelfGoodsId));
                }
              } else {
                console.warn('toExchange - shelfGoodsListIndex 超出范围且没有 shelfGoodsId，index:', shelfGoodsListIndex);
              }
            }
            
            if (updated) {
              prevPage.setData({
                shelfGoodsList: shelfGoodsList
              });
              console.log('toExchange - 成功更新 shelfGoodsList，已调用 setData');
            } else {
              // 如果更新失败，设置标记让 onShow 刷新整个列表
              wx.setStorageSync('needRefreshShelfGoods', true);
              console.warn('toExchange - 更新失败，已设置 needRefreshShelfGoods 标记，将在返回时刷新整个列表');
            }
          } else {
            console.warn('toExchange - 无法获取上一个页面或页面数据异常');
            console.warn('toExchange - prevPage:', prevPage);
            console.warn('toExchange - prevPage?.setData:', prevPage?.setData);
            console.warn('toExchange - prevPage?.data?.shelfGoodsList:', prevPage?.data?.shelfGoodsList);
            // 如果无法获取页面，设置标记让 onShow 刷新整个列表
            wx.setStorageSync('needRefreshShelfGoods', true);
          }
          
          // 清除 storage
          wx.removeStorageSync('shelfGoodsListIndex');
          wx.removeStorageSync('shelfGoodsId');
        } else {
          console.warn('toExchange - updatedGoods 无效或没有 nxDistributerGoodsId');
        }
        
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        });
        
        setTimeout(() => {
          wx.navigateBack({
            delta: 1
          });
        }, 500);
      } else {
        wx.showToast({
          title: res.result.msg || '保存失败',
          icon: 'none'
        });
      }
    })
    .catch(err => {
      load.hideLoading();
      console.error('disSaveLinshiToNxGoods error:', err);
      wx.showToast({
        title: '保存失败，请重试',
        icon: 'none'
      });
    });
  },


  toAddSub(e){
   
    var id = e.currentTarget.dataset.id;
    var data = {
       nxGoodsId: id,
       lsGoodsId: this.data.linshiId,
       disId: this.data.disId
    }
    disChangeLinshiToSub(data).then(res =>{
      if(res.result.code == 0){
        wx.navigateBack({
          delete: 1
        }
        )
      }
    })
   
  },

  //

  addAlias(e){

    var id = e.currentTarget.dataset.id;
    var data = {
       nxGoodsId: id,
       lsGoodsId: this.data.linshiId,
       disId: this.data.disId
    }
    disSaveLinshiToAlias(data).then(res =>{
      if(res.result.code == 0){
        wx.navigateBack({
          delete: 1
        }
        )
      }
    })
  },




  _searchGoods(e) {
    this.setData({
      searchStr: e.detail.value
    })
    var searchStr = e.detail.value;
    
    // 搜索临时商品和下载目录商品
    var data = {
      disId: this.data.disId,
      searchStr: searchStr
    }
    load.showLoading("商品搜索中")
    queryLinshiGoodsAndNxGoodsByQuickSearch(data).then(res => {
      console.log(res.result.data);
      console.log("zausish", res.result.data.nxArr)
      if (res.result.code == 0) {
        var depTabCount = "tabsSearch[0].amount";
        var disTabCount = "tabsSearch[1].amount";
        // 确保滑块位置与当前选中的 tab 一致
        var currentTabIndex = this.data.tab1IndexSearch || 0;
        var sliderOffset = this.data.sliderOffsetsSearch[currentTabIndex] || 0;
        console.log('=== _searchGoods 更新滑块位置 ===');
        console.log('📊 当前 tab 索引:', currentTabIndex);
        console.log('📊 sliderOffsetsSearch 数组:', this.data.sliderOffsetsSearch);
        console.log('📊 计算后的偏移量:', sliderOffset);
        this.setData({
          [depTabCount]:  res.result.data.disArr.length,
          [disTabCount] : res.result.data.nxArr.length,
          strArr: res.result.data.disArr,
          nxArr: res.result.data.nxArr,
          sliderOffsetSearch: sliderOffset
        })
        console.log('✅ _searchGoods 完成，滑块位置已更新');
      }
      
      // 同时搜索货架商品
      if (searchStr && searchStr.length > 0) {
        this._searchShelfGoods(searchStr);
      } else {
        this.setData({
          shelfSearchArr: [],
          unShelfGoodsList: []
        });
        load.hideLoading();
      }
    }).catch(err => {
      load.hideLoading();
      console.error('搜索失败:', err);
    })

  },

  // 搜索货架商品
  _searchShelfGoods(searchStr) {
    var data = {
      disId: this.data.disId,
      searchStr: searchStr,
    }
    queryDisShelfGoods(data).then(res => {
      load.hideLoading();
      if (res.result.code == 0) {
        console.log('货架商品搜索结果:', res.result.data);
        // 格式化搜索结果
        const shelfArr = res.result.data.shelfArr || [];
        const formattedShelfArr = shelfArr.map(shelf => {
          if (shelf.nxDisGoodsShelfGoodsEntities && Array.isArray(shelf.nxDisGoodsShelfGoodsEntities)) {
            shelf.nxDisGoodsShelfGoodsEntities = this._formatShelfGoodsList(shelf.nxDisGoodsShelfGoodsEntities);
          }
          return shelf;
        });
        const goodsArr = res.result.data.goodsArr || [];
        
        // 计算货架商品总数
        let shelfGoodsCount = 0;
        formattedShelfArr.forEach(shelf => {
          if (shelf.nxDisGoodsShelfGoodsEntities && Array.isArray(shelf.nxDisGoodsShelfGoodsEntities)) {
            shelfGoodsCount += shelf.nxDisGoodsShelfGoodsEntities.length;
          }
        });
        
        // 格式化非货架商品列表，并添加序号
        const formattedGoodsArr = this._formatUnShelfGoodsList(goodsArr, shelfGoodsCount);
        
        var shelfTabCount = "tabsSearch[2].amount";
        // 确保滑块位置与当前选中的 tab 一致
        var currentTabIndex = this.data.tab1IndexSearch || 0;
        this.setData({
          shelfSearchArr: formattedShelfArr,
          unShelfGoodsList: formattedGoodsArr,
          [shelfTabCount]: shelfGoodsCount + formattedGoodsArr.length,
          sliderOffsetSearch: this.data.sliderOffsetsSearch[currentTabIndex] || 0
        })
      } else {
        wx.showToast({
          title: res.result.msg,
          icon: "none"
        })
      }
    }).catch(err => {
      load.hideLoading();
      console.error('搜索货架商品失败:', err);
    })
  },

  // 格式化货架商品列表
  _formatShelfGoodsList(list = []) {
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

  // 格式化非货架商品列表
  _formatUnShelfGoodsList(list = [], startIndex = 0) {
    return list.map((item, index) => {
      const stockList = Array.isArray(item.nxDisGoodsShelfStockEntities) ? item.nxDisGoodsShelfStockEntities : [];
      const totalRestWeight = stockList.reduce((sum, stock) => {
        const weight = Number(stock && stock.nxDgssRestWeight ? stock.nxDgssRestWeight : 0);
        return sum + (isNaN(weight) ? 0 : weight);
      }, 0);
      return {
        ...item,
        totalRestWeight,
        stockList,
        displayIndex: startIndex + index + 1 // 添加显示序号
      };
    });
  },


  /**
   * 保存批发商商品
   * @param {*} e 
   */
  downLoadGoods: function (e) {
  
    this.setData({
      item: e.currentTarget.dataset.item,
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
      nxDgNxGoodsFatherColor: this.data.color,
      nxStandardEntities: this.data.item.nxGoodsStandardEntities,
      nxAliasEntities: this.data.item.nxAliasEntities,
      nxDgPurchaseAuto: 1,
    };

    load.showLoading("保存商品");
    downDisGoods(dg)
      .then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          this.searchGoodsWithStr();
          
          // 从其他页面跳转过来，保持原有逻辑
          var pages = getCurrentPages();
        var prevPage = pages[pages.length - 3]; //上一个页面
        //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
          if (prevPage && prevPage.setData) {
        prevPage.setData({
          update: true,
          isFirstLoad: true
            });
          }
       
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
        console.error('downLoadGoods error:', err);
        wx.showToast({
          title: '保存失败，请重试',
          icon: 'none'
        });
      });
  },


  searchGoodsWithStr() {
    console.log('=== searchGoodsWithStr 开始 ===');
    console.log('📊 当前 sliderOffsetsSearch 数组:', this.data.sliderOffsetsSearch);
    console.log('📊 当前 tab1IndexSearch:', this.data.tab1IndexSearch);
  
    var data = {
      disId: this.data.disId,
      searchStr: this.data.searchStr
    }
    load.showLoading("商品搜索中")
    queryLinshiGoodsAndNxGoodsByQuickSearch(data).then(res => {
      console.log(res.result.data);
      if (res.result.code == 0) {
        var depTabCount = "tabsSearch[0].amount";
        var disTabCount = "tabsSearch[1].amount";
        var targetIndex = 0;
        if(res.result.data.disArr.length == 0){
          targetIndex = 1; // 如果我的商品为空，切换到下载目录
        }
        var sliderOffset = this.data.sliderOffsetsSearch[targetIndex] || 0;
        console.log('📊 目标 tab 索引:', targetIndex);
        console.log('📊 计算后的滑块偏移量:', sliderOffset);
        console.log('📊 准备设置 itemIndexSearch:', targetIndex, 'tab1IndexSearch:', targetIndex, 'sliderOffsetSearch:', sliderOffset);
        this.setData({
          [depTabCount]:  res.result.data.disArr.length,
          [disTabCount] : res.result.data.nxArr.length,
          strArr: res.result.data.disArr,
          nxArr: res.result.data.nxArr,
          itemIndexSearch: targetIndex,
          tab1IndexSearch: targetIndex,
          sliderOffsetSearch: sliderOffset
        })
        console.log('✅ searchGoodsWithStr 完成，已更新 tab 和滑块位置');
      }
      
      // 同时搜索货架商品
      if (this.data.searchStr && this.data.searchStr.length > 0) {
        this._searchShelfGoods(this.data.searchStr);
      } else {
          this.setData({
          shelfSearchArr: [],
          unShelfGoodsList: []
        });
        load.hideLoading();
      }
    }).catch(err => {
      load.hideLoading();
      console.error('搜索失败:', err);
    })

  },

  toBack() {
   
    wx.navigateBack({
      delta: 1,
    })
  },
  

  


  toAddGoods(e){
    console.log(e);
  
    wx.navigateTo({
      url: '../disAddGoods/disAddGoods?name=' + this.data.name
      + '&id=' + this.data.linshiId + '&standard=' + this.data.standard ,
    })
  },

})
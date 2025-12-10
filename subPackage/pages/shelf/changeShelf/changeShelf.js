var load = require('../../../../lib/load.js');
var app = getApp()

import {
  disGetShelfList,
  addShelfGoods,
  updateShelfGoods
} from '../../../../lib/apiDistributer'

Page({

  /**
   * 页面的初始数据
   */
  data: {
    isAddMode: false, // 是否为添加模式（true：添加新商品，false：更新已有商品）
    selectedShelfId: null, // 选中的货架ID（用于添加模式）
    sort: 0, // 排序号（用于添加模式）
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const globalData = app.globalData;


    this.setData({
     windowWidth: globalData.windowWidth * globalData.rpxR,
        windowHeight: globalData.windowHeight * globalData.rpxR,
        navBarHeight: globalData.navBarHeight * globalData.rpxR,
        disId: options.disId

    })

    console.log('=== changeShelf onLoad 开始 ===');
    
    var shelf = wx.getStorageSync('shelfItem');
    var disGoods = wx.getStorageSync('goodsItem');
    var shelfGoods = wx.getStorageSync('shelfGoods');
    
    console.log('📦 从 storage 读取的数据:');
    console.log('  shelf (shelfItem):', shelf);
    console.log('  disGoods (goodsItem):', disGoods);
    console.log('  shelfGoods:', shelfGoods);
    
    // 判断是添加模式还是更新模式
    // 如果有 shelfGoods，是更新模式；如果只有 disGoods，是添加模式
    var isAddMode = !shelfGoods && disGoods;
    
    console.log('🔍 模式判断:');
    console.log('  shelfGoods 存在:', !!shelfGoods);
    console.log('  disGoods 存在:', !!disGoods);
    console.log('  isAddMode:', isAddMode);
    
    if(disGoods){
      this.setData({
        disGoods: disGoods
      })
      console.log('✅ 已设置 disGoods');
    }
    if(shelfGoods){
      this.setData({
        shelfGoods: shelfGoods
      })
      console.log('✅ 已设置 shelfGoods');
    }
    
    // 添加模式下不设置 shelf，避免默认选中，并清除可能存在的旧数据
    // 更新模式下才设置 shelf，用于显示当前货架
    if (isAddMode) {
      // 添加模式：清除 shelf，确保不会默认选中
      console.log('📝 添加模式：清除 shelf，确保不会默认选中');
      this.setData({
        shelf: null,
        selectedShelfId: null // 添加模式下初始化为 null，不默认选中
      });
      // 清除可能存在的旧 shelfItem
      wx.removeStorageSync('shelfItem');
      console.log('✅ 已清除 shelfItem，shelf 设置为 null，selectedShelfId 设置为 null');
    } else if (shelfGoods) {
      // 更新模式：从 shelfGoods 中获取货架ID，而不是从 shelfItem
      // shelfGoods.nxDgsgShelfId 才是当前商品所在的货架ID
      var currentShelfId = shelfGoods.nxDgsgShelfId;
      console.log('📝 更新模式：从 shelfGoods 获取货架ID');
      console.log('  shelfGoods.nxDgsgShelfId:', currentShelfId);
      console.log('  shelfItem (shelf):', shelf);
      console.log('  shelfItem.nxDistributerGoodsShelfId:', shelf ? shelf.nxDistributerGoodsShelfId : 'N/A');
      
      // 更新模式下，初始化 selectedShelfId 为当前货架ID
      this.setData({
        selectedShelfId: currentShelfId // 初始化选中货架ID
      });
      console.log('✅ 更新模式：初始化 selectedShelfId 为当前货架ID:', currentShelfId);
      
      // 如果 shelfItem 存在且 ID 匹配，使用它；否则需要从 shelfArr 中查找对应的货架
      if (shelf && shelf.nxDistributerGoodsShelfId === currentShelfId) {
        // shelfItem 的 ID 匹配，使用它
        this.setData({
          shelf: shelf
        });
        console.log('✅ 已设置 shelf (从 shelfItem):', shelf);
      } else {
        // shelfItem 的 ID 不匹配或不存在，需要从 shelfArr 中查找
        // 但此时 shelfArr 可能还没加载，先保存 currentShelfId
        this.setData({
          currentShelfId: currentShelfId // 保存当前货架ID，等 shelfArr 加载后再设置 shelf
        });
        console.log('⚠️ shelfItem ID 不匹配，已保存 currentShelfId:', currentShelfId);
        console.log('   将在 _initData 中从 shelfArr 查找对应的货架');
      }
    } else {
      console.log('⚠️ 更新模式但 shelfGoods 不存在');
    }
    
    this.setData({
      isAddMode: isAddMode
    });
    
    console.log('=== changeShelf onLoad 结束 ===');
    console.log('最终状态:');
    console.log('  isAddMode:', this.data.isAddMode);
    console.log('  shelf:', this.data.shelf);
    console.log('  selectedShelfId:', this.data.selectedShelfId);
    console.log('  disGoods:', this.data.disGoods ? '存在' : '不存在');
    console.log('  shelfGoods:', this.data.shelfGoods ? '存在' : '不存在');
    
    // 如果是添加模式，需要获取当前货架的排序号
    if (isAddMode) {
      // 这里可以从上一个页面传递 sort，或者从接口获取
      // 暂时设置为 0，后续可以从接口获取最大排序号
      this.setData({
        sort: 0
      });
    }

    this._initData();
  },

  _initData(){
    console.log('=== _initData 开始 ===');
    console.log('disId:', this.data.disId);
    console.log('isAddMode:', this.data.isAddMode);
    console.log('shelf:', this.data.shelf);
    console.log('selectedShelfId:', this.data.selectedShelfId);

    disGetShelfList(this.data.disId)
    .then(res =>{
      if(res.result.code == 0){
        console.log("📦 货架列表接口返回:", res.result.data);
        var shelfArr = res.result.data.shelfArr || [];
        console.log("货架列表长度:", shelfArr.length);
        this.setData({
          shelfArr: shelfArr
        });
        
        // 检查是否有默认选中的货架
        if (this.data.isAddMode) {
          console.log('✅ 添加模式：不应该有默认选中的货架');
          console.log('  shelf:', this.data.shelf);
          console.log('  selectedShelfId:', this.data.selectedShelfId);
        } else {
          console.log('✅ 更新模式：检查默认选中的货架');
          // 优先从 shelfGoods 获取货架ID
          var currentShelfId = null;
          if (this.data.shelfGoods && this.data.shelfGoods.nxDgsgShelfId) {
            currentShelfId = this.data.shelfGoods.nxDgsgShelfId;
            console.log('  从 shelfGoods.nxDgsgShelfId 获取货架ID:', currentShelfId);
          } else if (this.data.currentShelfId) {
            currentShelfId = this.data.currentShelfId;
            console.log('  从 currentShelfId 获取货架ID:', currentShelfId);
          } else if (this.data.shelf) {
            currentShelfId = this.data.shelf.nxDistributerGoodsShelfId;
            console.log('  从 shelf.nxDistributerGoodsShelfId 获取货架ID:', currentShelfId);
          }
          
          if (currentShelfId) {
            console.log('  默认选中的货架ID:', currentShelfId);
            var foundShelf = shelfArr.find(item => 
              item.nxDistributerGoodsShelfId === currentShelfId
            );
            console.log('  是否在货架列表中找到:', !!foundShelf);
            if (foundShelf) {
              var foundIndex = shelfArr.findIndex(item => 
                item.nxDistributerGoodsShelfId === currentShelfId
              );
              console.log('  找到的货架索引:', foundIndex);
              console.log('  找到的货架名称:', foundShelf.nxDistributerGoodsShelfName);
              // 设置 shelf 为找到的货架对象
              this.setData({
                shelf: foundShelf
              });
              console.log('✅ 已设置 shelf 为找到的货架对象');
            } else {
              console.log('  ⚠️ 在货架列表中未找到对应的货架');
            }
            // 打印前3个货架的信息，用于调试
            console.log('  前3个货架信息:');
            for (var i = 0; i < Math.min(3, shelfArr.length); i++) {
              console.log(`    [${i}] ID: ${shelfArr[i].nxDistributerGoodsShelfId}, 名称: ${shelfArr[i].nxDistributerGoodsShelfName}, 是否匹配: ${shelfArr[i].nxDistributerGoodsShelfId === currentShelfId}`);
            }
          } else {
            console.log('  ⚠️ 无法获取当前货架ID，不应该有默认选中');
          }
        }
      }
    })


  },


  shelfChange(e){
    var index = e.detail.value;
    // 检查索引是否有效
    if (!this.data.shelfArr || index < 0 || index >= this.data.shelfArr.length) {
      console.error('货架索引无效:', index);
      return;
    }
    
    var shelfItem = this.data.shelfArr[index];
    if (!shelfItem) {
      console.error('货架项不存在:', index);
      return;
    }
    
    var shelfId = shelfItem.nxDistributerGoodsShelfId;
    console.log('选中的货架ID:', shelfId);
    
    // 无论是添加模式还是更新模式，都记录选中的货架ID
    var oldShelfId = this.data.selectedShelfId;
    if (oldShelfId !== shelfId) {
      this.setData({
        canSave: true,
        selectedShelfId: shelfId
      });
      console.log('✅ 已选择货架ID:', shelfId);
    }
    
  },

  save(){
    // 无论是添加模式还是更新模式，都使用 addShelfGoods API
    this._addShelfGoods();
  },
  
  // 添加商品到货架（支持添加模式和更新模式）
  _addShelfGoods() {
    // 获取选中的货架ID（更新模式下如果用户没有重新选择，使用当前货架ID）
    var targetShelfId = this.data.selectedShelfId;
    
    // 如果是更新模式且用户没有重新选择货架，使用当前货架的ID
    if (!targetShelfId && !this.data.isAddMode && this.data.shelfGoods) {
      targetShelfId = this.data.shelfGoods.nxDgsgShelfId;
    }
    
    if (!targetShelfId) {
      wx.showToast({
        title: '请选择货架',
        icon: 'none'
      });
      return;
    }
    
    // 获取商品信息（添加模式用 disGoods，更新模式用 shelfGoods.nxDistributerGoodsEntity）
    var goodsEntity = null;
    if (this.data.isAddMode) {
      goodsEntity = this.data.disGoods;
    } else if (this.data.shelfGoods && this.data.shelfGoods.nxDistributerGoodsEntity) {
      goodsEntity = this.data.shelfGoods.nxDistributerGoodsEntity;
    }
    
    if (!goodsEntity) {
      wx.showToast({
        title: '商品信息不存在',
        icon: 'none'
      });
      return;
    }
    
    var shelfItem = this.data.shelfArr.find(item => 
      item.nxDistributerGoodsShelfId === targetShelfId
    );
    
    if (!shelfItem) {
      wx.showToast({
        title: '货架信息不存在',
        icon: 'none'
      });
      return;
    }
    
    // 构建货架商品的数据
    var shelfGoodsItem = {
      nxDgsgDisGoodsId: goodsEntity.nxDistributerGoodsId,
      nxDgsgShelfId: Number(targetShelfId),
      nxDistributerGoodsEntity: goodsEntity,
      nxDgsgSort: Number(this.data.sort) + Number(1),
      nxDgsgShelfSort: shelfItem.nxDistributerGoodsShelfSort || 0,
    };
    
    console.log('📝 准备添加/更新货架商品:', shelfGoodsItem);
    console.log('  模式:', this.data.isAddMode ? '添加' : '更新');
    
    load.showLoading(this.data.isAddMode ? '添加货架商品' : '更新货架商品');
    
    // 根据模式选择不同的接口
    if (this.data.isAddMode) {
      // 添加模式：使用 addShelfGoods 接口（接收数组）
      var temp = [];
      temp.push(shelfGoodsItem);
      
      addShelfGoods(temp).then(res => {
        load.hideLoading();
        if(res.result.code == 0){
          var pages = getCurrentPages();
          var prevPage = pages[pages.length - 2];
          if (prevPage && typeof prevPage.setData === 'function') {
            prevPage.setData({
              update: true
            });
          }
          wx.showToast({
            title: '添加成功',
            icon: 'success'
          });
          wx.navigateBack({delta: 1});
        } else {
          wx.showToast({
            title: res.result.msg || '添加失败',
            icon: 'none'
          });
        }
      }).catch(err => {
        load.hideLoading();
        wx.showToast({
          title: '添加失败，请重试',
          icon: 'none'
        });
      });
    } else {
      // 更新模式：使用 updateShelfGoods 接口（需要包含货架商品ID）
      if (!this.data.shelfGoods || !this.data.shelfGoods.nxDistributerGoodsShelfGoodsId) {
        load.hideLoading();
        wx.showToast({
          title: '货架商品ID不存在，无法更新',
          icon: 'none'
        });
        return;
      }
      
      shelfGoodsItem.nxDistributerGoodsShelfGoodsId = this.data.shelfGoods.nxDistributerGoodsShelfGoodsId;
      
      updateShelfGoods(shelfGoodsItem).then(res => {
        load.hideLoading();
        if(res.result.code == 0){
          var pages = getCurrentPages();
          var prevPage = pages[pages.length - 2];
          if (prevPage && typeof prevPage.setData === 'function') {
            prevPage.setData({
              update: true
            });
          }
          wx.showToast({
            title: '更新成功',
            icon: 'success'
          });
          wx.navigateBack({delta: 1});
        } else {
          wx.showToast({
            title: res.result.msg || '更新失败',
            icon: 'none'
          });
        }
      }).catch(err => {
        load.hideLoading();
        wx.showToast({
          title: '更新失败，请重试',
          icon: 'none'
        });
      });
    }
  },
  

  
  toBack() {
    wx.navigateBack({
      delta: 1,
    })
  },


})
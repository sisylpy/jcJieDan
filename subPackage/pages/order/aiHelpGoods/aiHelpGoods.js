var app = getApp();

import apiUrl from '../../../../config.js'
var load = require('../../../../lib/load.js');

import {

  queryLinshiGoodsAndNxGoodsByQuickSearch,
  testAi,
  editDepApplyGoods,
  exchangeDepApplyGoods
}
from '../../../../lib/apiDistributer'

import {confirmDepApplyGoods} from '../../../../lib/apiDepOrder'

import { 
  downDisGoods,

}from '../../../lib/apiibook'


let itemWidth = 0;

Page({
  data:{
    // 对话相关数据
    chatMessages: [], // 对话消息列表
    inputText: '', // 用户输入文本
    isTyping: false, // AI是否正在输入
    
    // 商品数据
    strArr:[],
    nxArr: [],
    currentGoodsList: [], // 当前展示的商品列表
    
    // 页面状态
    showGoodsList: false, // 是否显示商品列表
    searchMode: false, // 是否处于搜索模式
    
    // Tab相关
    tab1IndexSearch: 0,
    itemIndexSearch: 0,
    sliderOffsetSearch: 0,
    sliderOffsetsSearch: [],
    sliderLeftSearch: 0,
    tabsSearch: [{
      id: 0,
      amount: 0,
      words: "我的商品"
    }, {
      id: 1,
      amount: 0,
      words: "下载目录"
    }],
    
    // 搜索相关
    isSearching: true,
    searchResult: false,
    placeHolder: "请描述您要找的商品特征...",
    
    // 快速建议
    showSuggestions: false,
    suggestions: ['进口葡萄', '巨峰葡萄', '新疆葡萄', 'pt'],
  },


  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    const globalData = app.globalData;

    var value = wx.getStorageSync('linshiOrder');
    if (value) {
      var raw_text = value.nxDoGoodsName + value.nxDoQuantity + value.nxDoStandard + value.nxDoRemark;
      this.setData({
        disId: value.nxDoDistributerId,
        applyItem: value,
        raw_text: raw_text, // 使用实际的订单文本
        
      })
    }
 
    this.setData({
      windowWidth: globalData.windowWidth * globalData.rpxR,
      windowHeight: globalData.windowHeight * globalData.rpxR,
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      url: apiUrl.server,
      name: options.name,
      searchStr: options.name,
      standard: options.standard,
      linshiId: options.id,
      type: options.type,
    })

    this.clueOffsetSearch();

    // 初始化对话界面
    this._initChat();
  },

  // 初始化对话界面
  _initChat() {
    // 添加订单信息消息
    this._addMessage({
      type: 'order',
      content: this.data.raw_text || this.data.name || '订单信息',
      isUser: false,
      timestamp: Date.now()
    });

    // 延迟显示AI分析消息，营造对话感
    setTimeout(() => {
      this._addMessage({
        type: 'text',
        content: '我正在为您分析订单内容，请稍等...',
        isUser: false,
        timestamp: Date.now()
      });
      
      // 开始AI分析
      setTimeout(() => {
    this._text();
      }, 1000);
    }, 500);
  },

  // 添加消息到对话列表
  _addMessage(message) {
    const messages = this.data.chatMessages;
    messages.push(message);
    this.setData({
      chatMessages: messages
    });
    
    // 滚动到底部
    this._scrollToBottom();
  },

  // 滚动到底部
  _scrollToBottom() {
    setTimeout(() => {
      wx.pageScrollTo({
        scrollTop: 99999,
        duration: 300
      });
    }, 100);
  },

  // 用户输入处理
  _handleUserInput() {
    const inputText = this.data.inputText.trim();
    if (!inputText) return;

    // 添加用户消息
    this._addMessage({
      type: 'text',
      content: inputText,
      isUser: true,
      timestamp: Date.now()
    });

    // 清空输入框
    this.setData({
      inputText: ''
    });

    // 显示AI思考状态
    this._addMessage({
      type: 'text',
      content: '让我重新为您搜索...',
      isUser: false,
      timestamp: Date.now()
    });

    // 根据用户输入进行新的AI搜索
    this._aiSearchWithText(inputText);
  },

  // 根据用户输入进行AI搜索
  _aiSearchWithText(searchText) {
    const data = {
      rawText: searchText,
      distributorId: this.data.disId
    };

    load.showLoading("AI智能分析中...");
    testAi(data).then(res => {
      load.hideLoading();
      
      if (res.result.code == 0 && res.result.disArr && res.result.disArr.length > 0) {
        // 添加商品推荐消息
        this._addMessage({
          type: 'goods',
          content: `我找到了${res.result.disArr.length}个相关商品：`,
          goods: res.result.disArr,
          isUser: false,
          timestamp: Date.now()
        });
        
        // 添加操作提示
        this._addMessage({
          type: 'text',
          content: '请选择您要的商品，或者继续告诉我更多信息',
          isUser: false,
          timestamp: Date.now()
        });
        
        // 更新商品数据
        this.setData({
          strArr: res.result.disArr,
          currentGoodsList: res.result.disArr
        });
      } else {
        // 未找到商品
        this._addMessage({
          type: 'text',
          content: '抱歉，我没有找到相关商品。请告诉我更多详细信息，比如：\n• 商品的具体名称\n• 产地或品牌\n• 规格大小\n• 其他特征描述\n\n这样我可以更好地帮您找到合适的商品。',
          isUser: false,
          timestamp: Date.now()
        });
      }
    }).catch(error => {
      load.hideLoading();
      console.error("AI搜索错误:", error);
      this._addMessage({
        type: 'text',
        content: '搜索服务暂时不可用，请稍后重试',
        isUser: false,
        timestamp: Date.now()
      });
    });
  },

_text(){

  // 如果没有原始文本，使用商品名称作为搜索词
  var rawText = this.data.raw_text || this.data.name || "葡萄";
  
  var data = {
    rawText: rawText,
    distributorId: this.data.disId || 56
  }

  console.log("AI分析请求数据:", data);

  testAi(data).then(res =>{
    console.log("AI分析完整响应:", res);
    
    if(res.result.code == 0){
      console.log("AI分析结果:", res.result);
      
      // 处理AI搜索结果
      if(res.result.disArr && res.result.disArr.length > 0){
        // 添加AI推荐消息到对话中
        this._addMessage({
          type: 'goods',
          content: `我为您找到了${res.result.disArr.length}个相关商品：`,
          goods: res.result.disArr,
          isUser: false,
          timestamp: Date.now()
        });
        
        // 添加操作提示
        this._addMessage({
          type: 'text',
          content: '请选择您要的商品，或者告诉我更多信息来帮您找到合适的商品',
          isUser: false,
          timestamp: Date.now()
        });
        
        // 更新商品数据
        this.setData({
          strArr: res.result.disArr,
          nxArr: [],
          currentGoodsList: res.result.disArr,
          searchStr: res.result.searchStr || rawText,
          "tabsSearch[0].amount": res.result.disArr.length,
          "tabsSearch[1].amount": 0,
          tab1IndexSearch: 0,
          itemIndexSearch: 0
        });
        
        console.log("已设置商品数据到页面:", res.result.disArr.length, "个商品");
      } else {
        // AI未找到商品
        this._addMessage({
          type: 'text',
          content: '抱歉，我没有找到相关商品。请告诉我更多详细信息，比如商品的具体名称、产地或特征。',
          isUser: false,
          timestamp: Date.now()
        });
        
        this.setData({
          strArr: [],
          nxArr: [],
          "tabsSearch[0].amount": 0,
          "tabsSearch[1].amount": 0
        });
      }
    } else {
      console.error("AI分析失败:", res.result);
      
      // 根据不同的错误类型给出不同的回复
      let errorMessage = '';
      if (res.result.code === 'NO_CANDIDATE' || res.result.msg.includes('没查到相关商品')) {
        errorMessage = '抱歉，我没有找到相关商品。请告诉我更多详细信息，比如：\n• 商品的具体名称\n• 产地或品牌\n• 规格大小\n• 其他特征描述\n\n这样我可以更好地帮您找到合适的商品。';
      } else {
        errorMessage = '分析遇到了一些问题，请稍后重试或换个说法描述您要找的商品。';
      }
      
      this._addMessage({
        type: 'text',
        content: errorMessage,
        isUser: false,
        timestamp: Date.now()
      });
      
      // 如果是没找到商品，添加搜索建议
      if (res.result.code === 'NO_CANDIDATE' || res.result.msg.includes('没查到相关商品')) {
        setTimeout(() => {
          this._addSearchSuggestions();
        }, 1000);
      }
    }
  }).catch(error => {
    console.error("AI分析错误:", error);
    this._addMessage({
      type: 'text',
      content: 'AI服务暂时不可用，请稍后重试',
      isUser: false,
      timestamp: Date.now()
    });
  });

},



  choiceGoods(e){

    if(this.data.type == 'edit'){
      this._editGoods(e);
    }else{
      this._exchangeGoods(e);
    }
  },

  _editGoods(e){

    var id = e.currentTarget.dataset.id;
    var ordersId = this.data.applyItem.nxDepartmentOrdersId;
    var data = {
      orderId: ordersId,
      goodsId: id
    }

    editDepApplyGoods(data).then(res =>{
      if(res.result.code == 0){
        wx.navigateBack({delta: 1})

      }
    })
  },


  _exchangeGoods(e){

    var id = e.currentTarget.dataset.id;
    var ordersId = this.data.applyItem.nxDepartmentOrdersId;
    var data = {
      orderId: ordersId,
      goodsId: id
    }

    exchangeDepApplyGoods(data).then(res =>{
      if(res.result.code == 0){
        wx.navigateBack({delta: 1})

      }
    })
  },
 
  // !!!!!!!!!!!!!!!!!!!search--------------------------------------
  /**
   * 计算偏移量
   */
  clueOffsetSearch() {
    var that = this;

    wx.getSystemInfo({
      success: function (res) {
        itemWidth = Math.ceil(res.windowWidth / 2);
        let tempArr = [];
        for (let i in that.data.tabsSearch) {
          tempArr.push(itemWidth * i);
        }
        // tab 样式初始化
        that.setData({
          sliderOffsetsSearch: tempArr,
          sliderOffsetSearch: tempArr[that.data.tab1IndexSearch],
          // sliderLeftSearch: globalData.windowWidth / 8 ,
         
        });
      }
    });
  },

  /**
   * tabItme点击
   */
  onTab1ClickSearch(event) {
    let index = event.currentTarget.dataset.index;
    this.setData({
      sliderOffsetSearch: this.data.sliderOffsetsSearch[index],
      tab1IndexSearch: index,
      itemIndexSearch: index,
      showOperation: false
    })
    this.clueOffsetSearch();
  },

  swiperChangeSearch(event) {
    this.setData({
      sliderOffsetSearch: this.data.sliderOffsetsSearch[event.detail.current],
      tab1IndexSearch: event.detail.current,
      itemIndexSearch: event.detail.current,
    })
  },



  confirmDepApplyGoods() {
    var id = this.data.applyItem.nxDepartmentOrdersId;

    confirmDepApplyGoods(id).then(res => {
      if (res.result.code == 0) {
        wx.navigateBack({delta : 1})
      
      }
    })

  },





  _searchGoods(e) {
    this.setData({
      searchStr: e.detail.value
    })
    var data = {
      disId: this.data.disId,
      searchStr: e.detail.value
    }
    load.showLoading("商品搜索中")
    queryLinshiGoodsAndNxGoodsByQuickSearch(data).then(res => {
      load.hideLoading();
      console.log(res.result.data);
      if (res.result.code == 0) {
        var depTabCount = "tabsSearch[0].amount";
        var disTabCount = "tabsSearch[1].amount";
        this.setData({
          [depTabCount]:  res.result.data.disArr.length,
          [disTabCount] : res.result.data.nxArr.length,
          strArr: res.result.data.disArr,
          nxArr: res.result.data.nxArr,
        })

      }
    })

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

    load.showLoading("保存商品")
    downDisGoods(dg)
      .then(res => {
        if (res.result.code == 0) {
          load.hideLoading();
          this.searchGoodsWithStr();
          var pages = getCurrentPages();
        var prevPage = pages[pages.length - 3]; //上一个页面
        //直接调用上一个页面的setData()方法，把数据存到上一个页面中去
        prevPage.setData({
          update: true,
          isFirstLoad: true
        })
       
        } else {
          load.hideLoading();
          wx.showToast({
            title: res.result.msg,
            icon: 'none'
          })
        }
      })
  },


  searchGoodsWithStr() {
  
    var data = {
      disId: this.data.disId,
      searchStr: this.data.searchStr
    }
    load.showLoading("商品搜索中")
    queryLinshiGoodsAndNxGoodsByQuickSearch(data).then(res => {
      load.hideLoading();
      console.log(res.result.data);
      if (res.result.code == 0) {
        var depTabCount = "tabsSearch[0].amount";
        var disTabCount = "tabsSearch[1].amount";
        if(res.result.data.disArr.length > 0){
          this.setData({
            [depTabCount]:  res.result.data.disArr.length,
            [disTabCount] : res.result.data.nxArr.length,
            strArr: res.result.data.disArr,
            nxArr: res.result.data.nxArr,
            itemIndexSearch: 0,
          })
        }
      }
    })

  },

  toBack() {
   
    wx.navigateBack({
      delta: 1,
    })
  },
  
  // 输入框内容变化
  onInputChange(e) {
    this.setData({
      inputText: e.detail.value
    });
  },

  // 发送消息
  onSendMessage() {
    this._handleUserInput();
  },

  // 选择商品后的反馈
  onGoodsSelected(e) {
    const goodsId = e.currentTarget.dataset.id;
    const goods = this.data.strArr.find(item => item.nxDistributerGoodsId == goodsId);
    
    if (goods) {
      // 添加用户确认消息
      this._addMessage({
        type: 'text',
        content: `我选择：${goods.nxDgGoodsName}`,
        isUser: true,
        timestamp: Date.now()
      });
      
      // 执行商品选择逻辑
      this.choiceGoods(e);
    }
  },

  // 用户说"都不是"
  onNoneMatch() {
    this._addMessage({
      type: 'text',
      content: '都不是，我需要更准确的商品',
      isUser: true,
      timestamp: Date.now()
    });
    
    this._addMessage({
      type: 'text',
      content: '好的，请告诉我更多详细信息，比如：\n• 商品的具体名称\n• 产地或品牌\n• 规格大小\n• 其他特征描述\n\n您也可以直接输入商品的拼音首字母来搜索。',
      isUser: false,
      timestamp: Date.now()
    });
  },

  // 添加快速搜索建议
  _addSearchSuggestions() {
    const suggestions = [
      '试试输入：进口葡萄',
      '或者输入：巨峰葡萄',
      '也可以输入：新疆葡萄',
      '输入拼音首字母：pt（葡萄）'
    ];
    
    this._addMessage({
      type: 'text',
      content: '💡 搜索建议：\n' + suggestions.join('\n'),
      isUser: false,
      timestamp: Date.now()
    });
    
    // 显示快速输入建议
    this.setData({
      showSuggestions: true
    });
  },

  // 点击快速建议
  onSuggestionTap(e) {
    const text = e.currentTarget.dataset.text;
    this.setData({
      inputText: text,
      showSuggestions: false
    });
  },

  // 测试企业微信群功能
  testGroupFunction() {
    wx.showToast({
      title: '测试页已移除',
      icon: 'none'
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
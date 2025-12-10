import { addLoss, addReturn, addUse, saveInventoryRecord } from '../../lib/apiDistributer'
var load = require('../../lib/load.js')

Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    shelfGoods: {
      type: Object,
      value: null
    },
    disId: {
      type: Number,
      value: 0
    },
    userId: {
      type: Number,
      value: 0
    },
    totalRestWeight: {
      type: Number,
      value: 0
    },
    // 盘库周期参数
    inventoryType: {
      type: Number,
      value: 2
    },
    inventoryDate: {
      type: String,
      value: ''
    },
    inventoryWeek: {
      type: String,
      value: ''
    },
    inventoryMonth: {
      type: String,
      value: ''
    }
  },

  data: {
    showStockList: false,
    showEditModal: false,
    stockList: [],
    selectedStock: null,
    goodsInfo: null,
    operationType: 2, // 1=使用，3=损耗，4=退货，2=盘库（废弃接口改为盘库）
    inputWeight: '',
    reason: '',
    canSubmit: false,
    totalRestWeightDisplay: '0'
  },

  observers: {
    'show': function(show) {
      console.log('=== inventoryShelfStock observers ===')
      console.log('show值变化:', show)
      console.log('shelfGoods:', this.data.shelfGoods)
      
      if (show && this.data.shelfGoods) {
        console.log('条件满足，初始化数据')
        this.initData()
      } else {
        console.log('条件不满足，跳过初始化')
        console.log('show:', show, 'shelfGoods:', this.data.shelfGoods)
      }
    },
    'totalRestWeight': function(value) {
      console.log('总剩余库存变更:', value)
      const formatted = this.formatWeight(value)
      this.setData({
        totalRestWeightDisplay: formatted,
        // 盘库模式：默认输入框显示总剩余数量
        inputWeight: formatted
      })
    }
  },

  attached() {
    console.log('=== editShelfStock attached ===')
    console.log('初始show值:', this.data.show)
    console.log('初始shelfGoods:', this.data.shelfGoods)
    
    // 如果show为true且有数据，立即初始化
    if (this.data.show && this.data.shelfGoods) {
      console.log('attached中直接初始化')
      this.initData()
    }
  },

  methods: {
    // 初始化数据
    initData() {
      console.log('=== 初始化库存编辑数据 ===')
      console.log('shelfGoods:', this.data.shelfGoods)
      console.log('shelfGoods keys:', Object.keys(this.data.shelfGoods))
      
      // 检查数据结构
      let goodsInfo = null
      let stockList = []
      
      if (this.data.shelfGoods.nxDistributerGoodsEntity) {
        goodsInfo = this.data.shelfGoods.nxDistributerGoodsEntity
        stockList = this.data.shelfGoods.nxDisGoodsShelfStockEntities || []
      } else if (this.data.shelfGoods.nxDisGoodsShelfStockEntities) {
        // 如果没有商品实体，直接使用批次数据
        stockList = this.data.shelfGoods.nxDisGoodsShelfStockEntities || []
        // 尝试从其他字段获取商品信息
        goodsInfo = {
          nxDgGoodsName: '商品',
          nxDgGoodsStandardname: '斤'
        }
      }
      
      console.log('商品信息:', goodsInfo)
      console.log('批次数量:', stockList.length)
      console.log('批次列表:', stockList)
      
      // 使用传入的 totalRestWeight，如果没有则计算
      let totalRestWeight = this.data.totalRestWeight || 0
      if (!totalRestWeight || totalRestWeight === 0) {
        stockList.forEach(stock => {
          const weight = Number(stock.nxDgssRestWeight || 0)
          if (!isNaN(weight)) {
            totalRestWeight += weight
          }
        })
      }
      const formattedWeight = this.formatWeight(totalRestWeight)
      
      this.setData({
        goodsInfo,
        stockList,
        showStockList: false,
        showEditModal: true,
        selectedStock: null,
        operationType: 2, // 盘库模式，默认选择盘库
        inputWeight: formattedWeight, // 默认显示总剩余数量
        reason: '',
        canSubmit: true, // 有默认值，可以提交
        totalRestWeightDisplay: formattedWeight
      })
      
      console.log('=== 设置完成，showStockList应为true ===')
      console.log('当前showStockList:', this.data.showStockList)
    },

    // 阻止事件冒泡
    preventClose() {},

    // 选择批次
    selectStock(e) {
      const index = e.currentTarget.dataset.index
      const selectedStock = this.data.stockList[index]
      
      console.log('=== 选择批次 ===')
      console.log('批次索引:', index)
      console.log('选中批次:', selectedStock)
      
      this.setData({
        selectedStock,
        showStockList: false,
        showEditModal: true,
        operationType: 1, // 默认选择使用
        inputWeight: '',
        reason: ''
      })
      
      this.checkCanSubmit()
    },

    // 操作类型改变
    typeChange(e) {
      const operationType = parseInt(e.detail.value)
      console.log('=== 切换操作类型 ===')
      console.log('新类型:', operationType, this.getOperationName(operationType))
      
      this.setData({
        operationType,
        inputWeight: '',
        reason: ''
      })
      this.checkCanSubmit()
    },

    // 数量输入
    onWeightInput(e) {
      const inputWeight = e.detail.value
      console.log('输入数量:', inputWeight)
      
      this.setData({
        inputWeight
      })
      this.checkCanSubmit()
    },

    // 说明输入
    onReasonInput(e) {
      this.setData({
        reason: e.detail.value
      })
    },

    // 检查是否可以提交
    checkCanSubmit() {
      const { inputWeight, totalRestWeight } = this.data
      console.log('=== checkCanSubmit ===')
      console.log('inputWeight:', inputWeight)
      console.log('totalRestWeight:', totalRestWeight)

      const input = parseFloat(inputWeight)
      const total = parseFloat(totalRestWeight)

      // 盘库模式：输入数量必须 >= 0，且 <= 总剩余数量
      const canSubmit = !!inputWeight &&
                        !isNaN(input) &&
                        input >= 0 &&
                        !isNaN(total) &&
                        total >= 0 &&
                        input <= total

      console.log('canSubmit计算结果:', canSubmit)
      this.setData({ canSubmit })
      console.log('设置后canSubmit:', this.data.canSubmit)
    },

    // 获取操作名称
    getOperationName(type) {
      const names = {
        1: '使用',
        2: '盘库',
        3: '损耗',
        4: '退货'
      }
      return names[type] || '操作'
    },

    // 关闭批次列表
    closeStockList() {
      this.setData({
        showStockList: false
      })
      this.triggerEvent('close')
    },

    // 关闭编辑弹窗
    closeEditModal() {
      this.setData({
        showEditModal: false
      })
    },

    // 返回批次列表
    backToStockList() {
      this.setData({
        showEditModal: false,
        showStockList: true
      })
    },

    // 提交修改
    submit() {
      console.log('=== submit方法被调用 ===')
      console.log('canSubmit:', this.data.canSubmit)
      console.log('当前所有data:', this.data)
      
      if (!this.data.canSubmit) {
        console.log('=== 提交失败 ===')
        console.log('canSubmit:', this.data.canSubmit)
        wx.showToast({
          title: '请先输入有效的数量',
          icon: 'none'
        })
        return
      }

      const { operationType, inputWeight, reason, disId, selectedStock } = this.data
      
      // 获取商品ID
      let disGoodsId = null
      if (this.data.shelfGoods.nxDistributerGoodsId) {
        disGoodsId = this.data.shelfGoods.nxDistributerGoodsId
      } else if (this.data.shelfGoods.nxDistributerGoodsEntity && this.data.shelfGoods.nxDistributerGoodsEntity.nxDistributerGoodsId) {
        disGoodsId = this.data.shelfGoods.nxDistributerGoodsEntity.nxDistributerGoodsId
      } else if (this.data.shelfGoods.nxDgsgDisGoodsId) {
        disGoodsId = this.data.shelfGoods.nxDgsgDisGoodsId
      } else if (this.data.shelfGoods.nxDistributerGoodsShelfGoodsId) {
        disGoodsId = this.data.shelfGoods.nxDistributerGoodsShelfGoodsId
      }
      
      console.log('尝试获取商品ID:')
      console.log('nxDistributerGoodsId:', this.data.shelfGoods.nxDistributerGoodsId)
      console.log('nxDistributerGoodsEntity:', this.data.shelfGoods.nxDistributerGoodsEntity)
      console.log('nxDgsgDisGoodsId:', this.data.shelfGoods.nxDgsgDisGoodsId)
      console.log('最终disGoodsId:', disGoodsId)
      
      console.log('=== 确认提交 ===')
      console.log('操作类型:', operationType, this.getOperationName(operationType))
      console.log('操作数量:', inputWeight)
      console.log('商品ID:', disGoodsId)
      console.log('批发商ID:', disId)
      console.log('选中批次:', selectedStock)
      console.log('shelfGoods完整数据:', this.data.shelfGoods)
      
      wx.showModal({
        title: '确认操作',
        content: `确定要${this.getOperationName(operationType)}${inputWeight}${this.data.goodsInfo.nxDgGoodsStandardname}吗？`,
        success: (res) => {
          if (res.confirm) {
            console.log('用户确认提交')
            this.callAPI(operationType, disId, disGoodsId, inputWeight)
          } else {
            console.log('用户取消提交')
          }
        }
      })
    },

    // 调用API
    callAPI(type, disId, disGoodsId, weight) {
      console.log('=== 调用API ===')
      console.log('API类型:', type, '类型:', typeof type, this.getOperationName(type))
      
      // 确保 type 是数字类型
      const operationType = parseInt(type)
      if (isNaN(operationType) || operationType < 1 || operationType > 4) {
        console.error('无效的操作类型:', type, 'operationType:', operationType)
        load.hideLoading()
        wx.showToast({
          title: `无效的操作类型: ${type}`,
          icon: 'none',
          duration: 2000
        })
        return
      }
      
      // 盘库模式（type=2）：计算损耗 = 总剩余数量 - 输入数量
      let actualWeight = weight
      if (operationType === 2) {
        const totalRestWeight = parseFloat(this.data.totalRestWeight || 0)
        const inputWeight = parseFloat(weight || 0)
        actualWeight = totalRestWeight - inputWeight // 损耗 = 账面 - 实际
        console.log('盘库损耗计算:', {
          totalRestWeight,
          inputWeight,
          actualWeight: actualWeight
        })
        
        // 如果损耗 <= 0，设置为0
        if (actualWeight <= 0) {
          actualWeight = 0
        }
      }
      
      console.log('请求参数:', { disId, disGoodsId, weight: actualWeight, userId: this.data.userId })
      
      load.showLoading('提交中...')
      
      const userId = this.data.userId
      
      // 检查导入的函数是否存在
      console.log('=== 检查导入的函数 ===');
      console.log('addUse:', typeof addUse, addUse);
      console.log('saveInventoryRecord:', typeof saveInventoryRecord, saveInventoryRecord);
      console.log('addLoss:', typeof addLoss, addLoss);
      console.log('addReturn:', typeof addReturn, addReturn);
      
      const apiMap = {
        1: addUse,
        2: saveInventoryRecord, // 盘库使用废弃接口
        3: addLoss,
        4: addReturn
      }
      
      console.log('=== apiMap 详情 ===');
      console.log('apiMap:', apiMap);
      console.log('apiMap[1]:', apiMap[1], typeof apiMap[1]);
      console.log('apiMap[2]:', apiMap[2], typeof apiMap[2]);
      console.log('apiMap[3]:', apiMap[3], typeof apiMap[3]);
      console.log('apiMap[4]:', apiMap[4], typeof apiMap[4]);
      console.log('apiMap keys:', Object.keys(apiMap));
      console.log('operationType:', operationType, typeof operationType);
      console.log('apiMap[operationType]:', apiMap[operationType]);
      
      const api = apiMap[operationType]

      if (!api) {
        console.error(`未找到操作类型 ${operationType} 对应的接口函数`, {
          type: type,
          operationType: operationType,
          operationTypeType: typeof operationType,
          apiMap: Object.keys(apiMap),
          apiMapValues: Object.values(apiMap).map(fn => typeof fn),
          apiMap2: apiMap[2],
          apiMapString2: apiMap['2']
        })
        load.hideLoading()
        wx.showToast({
          title: `未找到操作类型 ${operationType} 对应的接口`,
          icon: 'none',
          duration: 2000
        })
        return
      }
      
      // 构建请求参数
      const requestParams = {
        disId,
        disGoodsId,
        weight: actualWeight,
        userId
      };
      
      // 如果是盘库操作，添加盘库周期参数
      if (operationType === 2) {
        requestParams.inventoryType = this.data.inventoryType;
        if (this.data.inventoryType === 1 && this.data.inventoryDate) {
          requestParams.inventoryDate = this.data.inventoryDate;
        } else if (this.data.inventoryType === 2 && this.data.inventoryWeek) {
          requestParams.inventoryWeek = this.data.inventoryWeek;
        } else if (this.data.inventoryType === 3 && this.data.inventoryMonth) {
          requestParams.inventoryMonth = this.data.inventoryMonth;
        }
      }
      
      console.log('最终请求参数:', requestParams);
      
      api(requestParams).then(res => {
        console.log('=== API响应 ===')
        console.log('响应结果:', res)
        
        load.hideLoading()
        
        if (res.result.code === 0) {
          console.log('操作成功')
          console.log('返回数据:', res.result.data)
          
          wx.showToast({
            title: '操作成功',
            icon: 'success'
          })
          
          // 重置并关闭
          this.setData({
            showStockList: false,
            showEditModal: false
          })
          
          // 通知父组件刷新数据
          this.triggerEvent('success')
          
          // 延迟关闭弹窗
          setTimeout(() => {
            this.triggerEvent('close')
          }, 1000)
          
        } else {
          console.log('操作失败:', res.result.msg)
          
          wx.showToast({
            title: res.result.msg || '操作失败',
            icon: 'none'
          })
        }
      }).catch(err => {
        console.log('=== API错误 ===')
        console.error('错误信息:', err)
        
        load.hideLoading()
        wx.showToast({
          title: '网络错误',
          icon: 'none'
        })
      })
    },

    formatWeight(value) {
      const numeric = Number(value)
      if (isNaN(numeric) || numeric < 0) {
        return '0'
      }
      const fixed = numeric.toFixed(3)
      return fixed.replace(/\.?0+$/, '')
    }
  }
})


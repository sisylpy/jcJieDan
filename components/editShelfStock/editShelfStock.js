import { addLoss, addReturn, addUse, saveInventoryRecord, transferStockFromBatch } from '../../lib/apiDistributer'
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
    sameShelfGoods: {
      type: Array,
      value: []
    }
  },

  data: {
    showStockList: false,
    showEditModal: false,
    stockList: [],
    selectedStock: null,
    goodsInfo: null,
    operationType: 1, // 1=使用，3=损耗，4=退货，2=盘库，5=调出
    inputWeight: '',
    reason: '',
    canSubmit: false,
    totalRestWeightDisplay: '0',
    targetShelfGoodsId: null, // 调出目标货架商品ID
    targetShelfGoodsName: '', // 调出目标货架名称
    targetShelfIndex: -1 // 调出目标货架索引
  },

  observers: {
    'show': function(show) {
      console.log('=== editShelfStock observers ===')
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
      this.setData({
        totalRestWeightDisplay: this.formatWeight(value)
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
      
      this.setData({
        goodsInfo,
        stockList,
        showStockList: false,
        showEditModal: true,
        selectedStock: null,
        operationType: 1,
        inputWeight: '',
        reason: '',
        canSubmit: false
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
      
      // 如果之前已经选择了操作类型（比如调出），保持操作类型
      const operationType = this.data.operationType || 1
      
      this.setData({
        selectedStock,
        showStockList: false,
        showEditModal: true,
        operationType: operationType, // 保持之前选择的操作类型，如果没有则默认为使用
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
      
      // 如果切换到调出操作，但没有选择批次，返回批次列表让用户选择
      if (operationType === 5 && !this.data.selectedStock) {
        // wx.showToast({
        //   title: '调出操作需要选择库存批次',
        //   icon: 'none'
        // })
        // 延迟一下，让用户看到提示
        setTimeout(() => {
          this.setData({
            showEditModal: false,
            showStockList: true,
            operationType: 5 // 记住选择了调出操作
          })
        }, 500)
        return
      }
      
      this.setData({
        operationType,
        inputWeight: '',
        reason: '',
        targetShelfGoodsId: null,
        targetShelfGoodsName: '',
        targetShelfIndex: -1
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
      const { inputWeight, selectedStock, totalRestWeight, operationType, targetShelfGoodsId } = this.data
      console.log('=== checkCanSubmit ===')
      console.log('inputWeight:', inputWeight)
      console.log('selectedStock:', selectedStock)
      console.log('operationType:', operationType)
      console.log('targetShelfGoodsId:', targetShelfGoodsId)

      // 如果是调出操作，必须先选择批次
      if (operationType === 5 && !selectedStock) {
        console.log('调出操作必须选择批次')
        this.setData({ canSubmit: false })
        return
      }

      const input = parseFloat(inputWeight)
      const available = selectedStock 
        ? parseFloat(selectedStock.nxDgssRestWeight)
        : parseFloat(totalRestWeight)

      let canSubmit = !!inputWeight &&
                      !isNaN(input) &&
                      input > 0 &&
                      !isNaN(available) &&
                      available > 0 &&
                      input <= available

      // 如果是调出操作，还需要选择目标货架
      if (operationType === 5) {
        canSubmit = canSubmit && !!targetShelfGoodsId && !!selectedStock
      }

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
        4: '退货',
        5: '调出'
      }
      return names[type] || '操作'
    },

    // 选择目标货架（调出用）
    selectTargetShelf(e) {
      const index = parseInt(e.detail.value)
      const sameShelfGoods = this.data.sameShelfGoods || []
      const item = sameShelfGoods[index]
      
      console.log('=== 选择目标货架 ===')
      console.log('选中索引:', index)
      console.log('选中货架:', item)
      console.log('所有可选货架:', sameShelfGoods)
      
      if (item) {
        // 尝试多种可能的字段名
        const shelfGoodsId = item.nxDistributerGoodsShelfGoodsId || 
                             item.nxDgsgShelfGoodsId || 
                             item.nxDistributerGoodsShelfGoodsId ||
                             item.id
        const shelfName = item.shelfName || item.nxDistributerGoodsShelfName || ''
        
        console.log('货架商品ID:', shelfGoodsId)
        console.log('货架名称:', shelfName)
        
        this.setData({
          targetShelfGoodsId: shelfGoodsId,
          targetShelfGoodsName: shelfName,
          targetShelfIndex: index
        })
        this.checkCanSubmit()
      }
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
      console.log('API类型:', type, this.getOperationName(type))
      console.log('请求参数:', { disId, disGoodsId, weight, userId: this.data.userId })
      
      // 如果是调出操作，使用不同的接口和参数
      if (type === 5) {
        const { selectedStock, targetShelfGoodsId } = this.data
        if (!selectedStock || !selectedStock.nxDistributerGoodsShelfStockId) {
          load.hideLoading()
          wx.showToast({
            title: '请先选择库存批次',
            icon: 'none'
          })
          return
        }
        if (!targetShelfGoodsId) {
          load.hideLoading()
          wx.showToast({
            title: '请选择目标货架',
            icon: 'none'
          })
          return
        }
        
        load.showLoading('调出中...')
        
        transferStockFromBatch({
          sourceStockId: selectedStock.nxDistributerGoodsShelfStockId,
          transferQuantity: weight,
          targetShelfGoodsId: targetShelfGoodsId,
          userId: this.data.userId
        }).then(res => {
          this.handleApiResponse(res)
        }).catch(err => {
          this.handleApiError(err)
        })
        return
      }
      
      load.showLoading('提交中...')
      
      const userId = this.data.userId
      const apiMap = {
        1: addUse,
        2: saveInventoryRecord,
        3: addLoss,
        4: addReturn
      }
      
      const api = apiMap[type]

      if (!api) {
        console.warn(`未找到操作类型 ${type} 对应的接口函数`)
        load.hideLoading()
        wx.showToast({
          title: '未找到对应的操作接口',
          icon: 'none'
        })
        return
      }
      
      api({ disId, disGoodsId, weight, userId }).then(res => {
        this.handleApiResponse(res)
      }).catch(err => {
        this.handleApiError(err)
      })
    },

    // 处理API响应
    handleApiResponse(res) {
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
          showEditModal: false,
          targetShelfGoodsId: null,
          targetShelfGoodsName: '',
          targetShelfIndex: -1
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
    },

    // 处理API错误
    handleApiError(err) {
      console.log('=== API错误 ===')
      console.error('错误信息:', err)
      
      load.hideLoading()
      wx.showToast({
        title: '网络错误',
        icon: 'none'
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


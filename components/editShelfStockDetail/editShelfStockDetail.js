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
    }
  },

  data: {
    showStockList: false,
    showEditModal: false,
    stockList: [],
    selectedStock: null,
    goodsInfo: null,
    editRestWeight: '',
    editSellingPrice: '',
    canSubmit: false
  },

  observers: {
    'show': function(show) {
      console.log('=== editShelfStock observers ===')
      console.log('show值变化:', show)
      console.log('shelfGoods:', this.data.shelfGoods)
      
      if (show && this.data.shelfGoods) {
        console.log('条件满足，初始化数据')
        this.initData()
      } else if (!show) {
        console.log('组件隐藏，重置内部状态')
        this.resetState()
      } else {
        console.log('条件不满足，跳过初始化')
        console.log('show:', show, 'shelfGoods:', this.data.shelfGoods)
      }
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
    resetState() {
      this.setData({
        showStockList: false,
        showEditModal: false,
        stockList: [],
        selectedStock: null,
        editRestWeight: '',
        editSellingPrice: '',
        canSubmit: false,
        goodsInfo: null
      })
    },

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
      console.log('商品外包装信息:', {
        nxDgCartonUnit: goodsInfo?.nxDgCartonUnit,
        nxDgItemsPerCarton: goodsInfo?.nxDgItemsPerCarton,
        nxDgGoodsStandardname: goodsInfo?.nxDgGoodsStandardname
      })
      console.log('批次数量:', stockList.length)
      console.log('批次列表:', stockList)
      
      // 打印每个批次的详细信息
      if (stockList && stockList.length > 0) {
        stockList.forEach((stock, index) => {
          console.log(`批次 ${index + 1}:`, {
            nxDgssWeight: stock.nxDgssWeight,
            nxDgssRestWeight: stock.nxDgssRestWeight,
            '格式化后入库数量': goodsInfo?.nxDgCartonUnit && goodsInfo?.nxDgItemsPerCarton 
              ? `${Math.floor((stock.nxDgssWeight || 0) / (goodsInfo.nxDgItemsPerCarton || 1))}${goodsInfo.nxDgCartonUnit}${((stock.nxDgssWeight || 0) % (goodsInfo.nxDgItemsPerCarton || 1)) > 0 ? ((stock.nxDgssWeight || 0) % (goodsInfo.nxDgItemsPerCarton || 1)) + (goodsInfo.nxDgGoodsStandardname || '个') : ''}`
              : stock.nxDgssWeight + (goodsInfo?.nxDgGoodsStandardname || ''),
            '格式化后剩余数量': goodsInfo?.nxDgCartonUnit && goodsInfo?.nxDgItemsPerCarton 
              ? `${Math.floor((stock.nxDgssRestWeight || 0) / (goodsInfo.nxDgItemsPerCarton || 1))}${goodsInfo.nxDgCartonUnit}${((stock.nxDgssRestWeight || 0) % (goodsInfo.nxDgItemsPerCarton || 1)) > 0 ? ((stock.nxDgssRestWeight || 0) % (goodsInfo.nxDgItemsPerCarton || 1)) + (goodsInfo.nxDgGoodsStandardname || '个') : ''}`
              : stock.nxDgssRestWeight + (goodsInfo?.nxDgGoodsStandardname || '')
          })
        })
      }
      
      this.setData({
        goodsInfo,
        stockList,
        showStockList: true,
        showEditModal: false,
        selectedStock: null,
        editRestWeight: '',
        editSellingPrice: '',
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
      if (selectedStock) {
        try {
          console.log('选中批次字段列表:', Object.keys(selectedStock))
        } catch (err) {
          console.warn('获取选中批次字段列表失败', err)
        }
      }
      
      this.setData({
        selectedStock,
        showStockList: false,
        showEditModal: true,
        editRestWeight: selectedStock && selectedStock.nxDgssRestWeight != null ? String(selectedStock.nxDgssRestWeight) : '',
        editSellingPrice: selectedStock && selectedStock.nxDgssSellingPrice != null ? String(selectedStock.nxDgssSellingPrice) : ''
      })
      
      this.checkCanSubmit()
    },

    onRestWeightInput(e) {
      const value = e.detail.value
      console.log('输入剩余数量:', value)
      this.setData({
        editRestWeight: value
      })
      this.checkCanSubmit()
    },

    onSellingPriceInput(e) {
      const value = e.detail.value
      console.log('输入建议售价:', value)
      this.setData({
        editSellingPrice: value
      })
      this.checkCanSubmit()
    },

    // 检查是否可以提交
    checkCanSubmit() {
      const { editRestWeight, editSellingPrice, selectedStock } = this.data
      console.log('=== checkCanSubmit ===')
      console.log('editRestWeight:', editRestWeight)
      console.log('editSellingPrice:', editSellingPrice)
      console.log('selectedStock:', selectedStock)
      
      const rest = parseFloat(editRestWeight)
      const selling = parseFloat(editSellingPrice)
      const canSubmit = selectedStock &&
                        editRestWeight !== '' &&
                        editSellingPrice !== '' &&
                        !isNaN(rest) && rest >= 0 &&
                        !isNaN(selling) && selling >= 0
      
      console.log('canSubmit计算结果:', canSubmit)
      this.setData({ canSubmit })
      console.log('设置后canSubmit:', this.data.canSubmit)
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
          title: '请先填写有效的数值',
          icon: 'none'
        })
        return
      }

      const { editRestWeight, editSellingPrice, selectedStock } = this.data
      const restWeightNum = parseFloat(editRestWeight)
      const sellingPriceNum = parseFloat(editSellingPrice)

      const stockId = selectedStock.nxDisGoodsShelfStockId ||
                      selectedStock.nxDistributerGoodsShelfStockId ||
                      selectedStock.nxDgssShelfStockId ||
                      selectedStock.nxDgssStockId ||
                      selectedStock.nxDgssId ||
                      selectedStock.nxDgssEntityId ||
                      selectedStock.nxDgssShelfId ||
                      selectedStock.nxDisGoodsStockId ||
                      selectedStock.nxDisGoodsShelfStockEntityId ||
                      selectedStock.id ||
                      selectedStock.stockId

      if (!stockId) {
        console.error('未找到批次ID，selectedStock:', selectedStock)
        wx.showToast({
          title: '批次数据异常',
          icon: 'none'
        })
        return
      }

      const payload = {
        stockId,
        restWeight: restWeightNum,
        sellingPrice: sellingPriceNum,
        disId: this.data.disId,
        userId: this.data.userId
      }

      console.log('=== 确认提交 ===')
      console.log('提交参数:', payload)

      wx.showModal({
        title: '确认修改',
        content: `剩余数量将更新为 ${restWeightNum}${this.data.goodsInfo.nxDgGoodsStandardname}，建议售价为 ¥${sellingPriceNum}，确认提交吗？`,
        success: (res) => {
          if (res.confirm) {
            console.log('用户确认提交')
            this.triggerEvent('confirm', payload)
          } else {
            console.log('用户取消提交')
          }
        }
      })
    },
  }
})


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
    cartonBuyPrice: '', // 箱单价（用户输入的原始值）
    averageBuyPrice: '', // 平均单价（最小单位单价）
    cartonExpectPrice: '', // 箱零售价（用户输入的原始值）
    averageExpectPrice: '', // 平均建议售价（最小单位零售价）
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
        editSellingPrice: '',
        cartonBuyPrice: '',
        averageBuyPrice: '',
        cartonExpectPrice: '',
        averageExpectPrice: '',
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
      
      // 初始化价格数据
      // 根据是否有外包装，决定使用哪个价格字段
      const goodsInfo = this.data.goodsInfo
      const hasCarton = goodsInfo && goodsInfo.nxDgCartonUnit !== null && goodsInfo.nxDgCartonUnit !== undefined && goodsInfo.nxDgCartonUnit !== ''
      
      let buyPrice = ''
      let sellingPrice = ''
      
      if (hasCarton) {
        // 有外包装：优先使用外包装单价
        buyPrice = selectedStock && selectedStock.nxDgssPriceCarton != null ? String(selectedStock.nxDgssPriceCarton) : 
                   (selectedStock && selectedStock.nxDgssPrice != null ? String(selectedStock.nxDgssPrice) : '')
        sellingPrice = selectedStock && selectedStock.nxDgssSellingPriceCarton != null ? String(selectedStock.nxDgssSellingPriceCarton) : 
                       (selectedStock && selectedStock.nxDgssSellingPrice != null ? String(selectedStock.nxDgssSellingPrice) : '')
      } else {
        // 没有外包装：使用最小单位单价
        buyPrice = selectedStock && selectedStock.nxDgssPrice != null ? String(selectedStock.nxDgssPrice) : ''
        sellingPrice = selectedStock && selectedStock.nxDgssSellingPrice != null ? String(selectedStock.nxDgssSellingPrice) : ''
      }
      
      this.setData({
        selectedStock,
        showStockList: false,
        showEditModal: true,
        editSellingPrice: sellingPrice,
        cartonBuyPrice: buyPrice,
        averageBuyPrice: '',
        cartonExpectPrice: sellingPrice,
        averageExpectPrice: ''
      })
      
      // 如果有初始价格，计算平均单价（仅在有外包装时显示）
      if (buyPrice && hasCarton) {
        this._calculateAverageBuyPrice(buyPrice)
      }
      if (sellingPrice && hasCarton) {
        this._calculateAverageExpectPrice(sellingPrice)
      }
      
      this.checkCanSubmit()
    },



    // 计算平均单价
    _calculateAverageBuyPrice(price) {
      const goodsInfo = this.data.goodsInfo
      let averagePrice = ''
      
      // 如果商品有外包装，用户输入的是箱单价，需要计算平均单价（仅用于显示）
      if (goodsInfo && goodsInfo.nxDgCartonUnit !== null && goodsInfo.nxDgCartonUnit !== undefined && goodsInfo.nxDgCartonUnit !== '') {
        const itemsPerCarton = goodsInfo.nxDgItemsPerCarton || 1
        if (itemsPerCarton > 0 && price) {
          // 计算平均单价（最小单位单价，仅用于显示给用户看）
          averagePrice = (Number(price) / Number(itemsPerCarton)).toFixed(1)
        }
      }
      
      this.setData({
        averageBuyPrice: averagePrice
      })
    },

    onSellingPriceInput(e) {
      const price = e.detail.value
      console.log('输入建议售价:', price)
      // 直接保存用户输入的值，包括空字符串
      this.setData({
        editSellingPrice: price,
        cartonExpectPrice: price || '' // 确保即使是空字符串也保存
      })
      // 只有当价格不为空时才计算平均价格
      if (price) {
        this._calculateAverageExpectPrice(price)
      } else {
        this.setData({
          averageExpectPrice: ''
        })
      }
      this.checkCanSubmit()
    },

    // 计算平均建议售价
    _calculateAverageExpectPrice(price) {
      const goodsInfo = this.data.goodsInfo
      let averagePrice = ''
      
      // 如果商品有外包装，用户输入的是箱零售价，需要计算平均建议售价（仅用于显示）
      if (goodsInfo && goodsInfo.nxDgCartonUnit !== null && goodsInfo.nxDgCartonUnit !== undefined && goodsInfo.nxDgCartonUnit !== '') {
        const itemsPerCarton = goodsInfo.nxDgItemsPerCarton || 1
        if (itemsPerCarton > 0 && price) {
          // 计算平均建议售价（最小单位零售价，仅用于显示给用户看）
          averagePrice = (Number(price) / Number(itemsPerCarton)).toFixed(1)
        }
      }
      
      this.setData({
        averageExpectPrice: averagePrice
      })
    },

    // 检查价格
    _checkPrice(e) {
      const price = e.detail.value
      if (price && (isNaN(price) || price < 0)) {
        wx.showToast({
          title: '请输入有效的价格',
          icon: 'none'
        })
      }
    },

    // 检查是否可以提交
    checkCanSubmit() {
      const { editSellingPrice, selectedStock } = this.data
      console.log('=== checkCanSubmit ===')
      console.log('editSellingPrice:', editSellingPrice)
      console.log('selectedStock:', selectedStock)
      
      const selling = parseFloat(editSellingPrice)
      const canSubmit = selectedStock &&
                        editSellingPrice !== '' &&
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

      const { editSellingPrice, cartonExpectPrice, selectedStock, goodsInfo } = this.data
      const cartonSellingPrice = parseFloat(editSellingPrice || cartonExpectPrice)

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

      // 获取当前剩余数量（只读，不修改，但需要传递给后端）
      const restWeight = selectedStock && selectedStock.nxDgssRestWeight != null 
        ? parseFloat(selectedStock.nxDgssRestWeight) 
        : 0

      // 根据商品是否有外包装，决定保存的价格格式
      const hasCarton = goodsInfo && goodsInfo.nxDgCartonUnit !== null && goodsInfo.nxDgCartonUnit !== undefined && goodsInfo.nxDgCartonUnit !== ''
      
      let sellingPrice = cartonSellingPrice // 默认使用用户输入的价格
      
      // 如果商品有外包装，用户输入的是箱零售价，需要计算最小单位零售价
      if (hasCarton && cartonSellingPrice) {
        const itemsPerCarton = goodsInfo.nxDgItemsPerCarton || 1
        if (itemsPerCarton > 0) {
          // 计算最小单位建议零售价（用于 nxDgssSellingPrice）
          sellingPrice = (cartonSellingPrice / itemsPerCarton).toFixed(2)
        }
      }

      const payload = {
        stockId,
        restWeight: restWeight, // 传递当前剩余数量，不修改但需要传给后端
        sellingPrice: parseFloat(sellingPrice), // 最小单位建议零售价
        disId: this.data.disId,
        userId: this.data.userId
      }

      // 如果商品有外包装，需要同时保存箱零售价
      if (hasCarton && cartonSellingPrice) {
        payload.sellingPriceCarton = cartonSellingPrice // 外包装建议零售价
      }

      console.log('=== 确认提交 ===')
      console.log('提交参数:', payload)

      const unit = goodsInfo?.nxDgCartonUnit && goodsInfo.nxDgCartonUnit !== '' && goodsInfo.nxDgCartonUnit !== 'null' 
        ? goodsInfo.nxDgCartonUnit 
        : goodsInfo?.nxDgGoodsStandardname || ''
      
      // 显示给用户的价格（如果有外包装，显示箱零售价；否则显示最小单位零售价）
      const displayPrice = hasCarton ? cartonSellingPrice : parseFloat(sellingPrice)
      
      wx.showModal({
        title: '确认修改',
        content: `建议售价将更新为 ¥${displayPrice}${unit ? '元/' + unit : '元'}，确认提交吗？`,
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


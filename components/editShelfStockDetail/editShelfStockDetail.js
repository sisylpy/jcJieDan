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
    canSubmit: false,
    shelfLifeUnitOptions: [{ label: '天', value: '天' }, { label: '月', value: '月' }, { label: '年', value: '年' }],
    shelfLifeUnitIndex: 0,
    calculatedExpiryDate: '',
    editProduceDate: '',
    editShelfLife: '',
    editShelfLifeUnit: '天',
    editExpiryDate: ''
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
        goodsInfo: null,
        shelfLifeUnitIndex: 0,
        calculatedExpiryDate: '',
        editProduceDate: '',
        editShelfLife: '',
        editShelfLifeUnit: '天',
        editExpiryDate: ''
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
      
      const unitMap = { '天': 0, '月': 1, '年': 2 }
      const lifeUnit = selectedStock.nxDgssShelfLifeUnit || '天'
      const shelfIdx = unitMap[lifeUnit] ?? 0
      const produce = selectedStock.nxDgssProduceDate || ''
      const shelfLifeVal = selectedStock.nxDgssShelfLife !== null && selectedStock.nxDgssShelfLife !== undefined && selectedStock.nxDgssShelfLife !== ''
        ? selectedStock.nxDgssShelfLife
        : ''
      const expiry = selectedStock.nxDgssExpiryDate || ''

      this.setData({
        selectedStock,
        showStockList: false,
        showEditModal: true,
        editSellingPrice: sellingPrice,
        cartonBuyPrice: buyPrice,
        averageBuyPrice: '',
        cartonExpectPrice: sellingPrice,
        averageExpectPrice: '',
        shelfLifeUnitIndex: shelfIdx,
        editProduceDate: produce,
        editShelfLife: shelfLifeVal === '' ? '' : String(shelfLifeVal),
        editShelfLifeUnit: lifeUnit,
        editExpiryDate: expiry,
        calculatedExpiryDate: ''
      }, () => {
        this._computeAndSetExpiryDate()
      })

      // 如果有初始价格，计算平均单价（仅在有外包装时显示）
      if (buyPrice && hasCarton) {
        this._calculateAverageBuyPrice(buyPrice)
      }
      if (sellingPrice && hasCarton) {
        this._calculateAverageExpectPrice(sellingPrice)
      }

      // canSubmit 在 _computeAndSetExpiryDate 完成后的 setData 回调里统一计算
    },

    onProduceDateChange(e) {
      const date = e.detail.value
      this.setData({
        editProduceDate: date,
        editExpiryDate: ''
      }, () => this._computeAndSetExpiryDate())
    },

    onShelfLifeInput(e) {
      const val = e.detail.value
      const parsed = val === '' ? NaN : parseInt(val, 10)
      this.setData({
        editShelfLife: (val === '' || isNaN(parsed)) ? '' : parsed,
        editExpiryDate: ''
      }, () => this._computeAndSetExpiryDate())
    },

    onShelfLifeUnitChange(e) {
      const idx = parseInt(e.detail.value, 10)
      const unit = this.data.shelfLifeUnitOptions[idx].value
      this.setData({
        shelfLifeUnitIndex: idx,
        editShelfLifeUnit: unit,
        editExpiryDate: ''
      }, () => this._computeAndSetExpiryDate())
    },

    onExpiryDateChange(e) {
      this.setData({
        editExpiryDate: e.detail.value
      }, () => this.checkCanSubmit())
    },

    _computeAndSetExpiryDate() {
      const produceDate = this.data.editProduceDate
      const shelfLife = this.data.editShelfLife
      const unit = this.data.editShelfLifeUnit
      let calculatedExpiryDate = ''
      if (produceDate && shelfLife !== '' && shelfLife != null && unit) {
        const sl = parseInt(shelfLife, 10)
        if (!isNaN(sl)) {
          const d = new Date(produceDate)
          if (unit === '天') {
            d.setDate(d.getDate() + sl)
          } else if (unit === '月') {
            d.setMonth(d.getMonth() + sl)
          } else if (unit === '年') {
            d.setFullYear(d.getFullYear() + sl)
          }
          const y = d.getFullYear()
          const m = String(d.getMonth() + 1).padStart(2, '0')
          const day = String(d.getDate()).padStart(2, '0')
          calculatedExpiryDate = `${y}-${m}-${day}`
        }
      }
      this.setData({ calculatedExpiryDate }, () => this.checkCanSubmit())
    },

    /** 生产日期、保质期、单位、过期日期（含推算）是否与选中批次原始值不同 */
    _hasShelfLifeOrDateChanges() {
      const s = this.data.selectedStock
      if (!s) return false
      const norm = (v) => (v == null || v === '' ? '' : String(v).trim())
      const origProduce = norm(s.nxDgssProduceDate)
      const origLife = s.nxDgssShelfLife !== null && s.nxDgssShelfLife !== undefined && s.nxDgssShelfLife !== ''
        ? String(s.nxDgssShelfLife).trim() : ''
      const origUnitRaw = s.nxDgssShelfLifeUnit != null && String(s.nxDgssShelfLifeUnit).trim() !== ''
        ? String(s.nxDgssShelfLifeUnit).trim() : '天'
      const origUnit = norm(origUnitRaw)
      const origExpiry = norm(s.nxDgssExpiryDate)

      const curProduce = norm(this.data.editProduceDate)
      const curLife = this.data.editShelfLife === '' || this.data.editShelfLife == null
        ? '' : String(this.data.editShelfLife).trim()
      const curUnit = norm(this.data.editShelfLifeUnit || '天')
      const effectiveExpiry = norm(this.data.editExpiryDate || this.data.calculatedExpiryDate)

      return curProduce !== origProduce ||
        curLife !== origLife ||
        curUnit !== origUnit ||
        effectiveExpiry !== origExpiry
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

    // 检查是否可以提交：有有效建议售价，或修改了生产日期/保质期/过期日期等（可不填售价）
    checkCanSubmit() {
      const { editSellingPrice, cartonExpectPrice, selectedStock } = this.data
      console.log('=== checkCanSubmit ===')
      console.log('editSellingPrice:', editSellingPrice)
      console.log('selectedStock:', selectedStock)

      if (!selectedStock) {
        this.setData({ canSubmit: false })
        return
      }

      const priceStr = String(editSellingPrice !== undefined && editSellingPrice !== null ? editSellingPrice : cartonExpectPrice || '').trim()
      const selling = parseFloat(priceStr)
      const hasValidPrice = priceStr !== '' && !isNaN(selling) && selling >= 0
      const hasMetaChanges = this._hasShelfLifeOrDateChanges()
      const canSubmit = hasValidPrice || hasMetaChanges

      console.log('canSubmit计算结果:', canSubmit, { hasValidPrice, hasMetaChanges })
      this.setData({ canSubmit })
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
          title: '请填写建议售价或修改日期/保质期',
          icon: 'none'
        })
        return
      }

      const { editSellingPrice, cartonExpectPrice, selectedStock, goodsInfo } = this.data
      const priceInputRaw = String(
        editSellingPrice !== undefined && editSellingPrice !== null ? editSellingPrice : cartonExpectPrice || ''
      ).trim()
      const hasInputPrice = priceInputRaw !== '' && !isNaN(parseFloat(priceInputRaw)) && parseFloat(priceInputRaw) >= 0

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

      let sellingPrice
      let sellingPriceCartonPayload = null

      if (hasInputPrice) {
        const cartonSellingPrice = parseFloat(priceInputRaw)
        sellingPrice = cartonSellingPrice
        if (hasCarton && cartonSellingPrice) {
          const itemsPerCarton = goodsInfo.nxDgItemsPerCarton || 1
          if (itemsPerCarton > 0) {
            sellingPrice = parseFloat((cartonSellingPrice / itemsPerCarton).toFixed(2))
          }
          sellingPriceCartonPayload = cartonSellingPrice
        } else {
          sellingPrice = cartonSellingPrice
        }
      } else {
        const keepMin = selectedStock.nxDgssSellingPrice != null && selectedStock.nxDgssSellingPrice !== ''
          ? parseFloat(selectedStock.nxDgssSellingPrice) : null
        const keepCarton = selectedStock.nxDgssSellingPriceCarton != null && selectedStock.nxDgssSellingPriceCarton !== ''
          ? parseFloat(selectedStock.nxDgssSellingPriceCarton) : null
        if (hasCarton && keepCarton != null && !isNaN(keepCarton)) {
          sellingPriceCartonPayload = keepCarton
          const itemsPerCarton = goodsInfo.nxDgItemsPerCarton || 1
          sellingPrice = itemsPerCarton > 0
            ? parseFloat((keepCarton / itemsPerCarton).toFixed(2))
            : (keepMin != null && !isNaN(keepMin) ? keepMin : 0)
        } else {
          sellingPrice = keepMin != null && !isNaN(keepMin) ? keepMin : 0
        }
      }

      const shelfLifeRaw = this.data.editShelfLife
      const shelfLifeNum = shelfLifeRaw === '' || shelfLifeRaw == null ? null : parseInt(shelfLifeRaw, 10)
      const payload = {
        stockId,
        restWeight: restWeight, // 传递当前剩余数量，不修改但需要传给后端
        sellingPrice: parseFloat(sellingPrice), // 最小单位建议零售价
        disId: this.data.disId,
        userId: this.data.userId,
        nxDgssProduceDate: this.data.editProduceDate || '',
        nxDgssShelfLife: (shelfLifeRaw === '' || shelfLifeRaw == null || isNaN(shelfLifeNum)) ? '' : shelfLifeNum,
        nxDgssShelfLifeUnit: this.data.editShelfLifeUnit || '',
        nxDgssExpiryDate: this.data.editExpiryDate || this.data.calculatedExpiryDate || ''
      }

      if (sellingPriceCartonPayload != null && !isNaN(sellingPriceCartonPayload)) {
        payload.sellingPriceCarton = sellingPriceCartonPayload
      }

      console.log('=== 确认提交 ===')
      console.log('提交参数:', payload)

      const unit = goodsInfo?.nxDgCartonUnit && goodsInfo.nxDgCartonUnit !== '' && goodsInfo.nxDgCartonUnit !== 'null'
        ? goodsInfo.nxDgCartonUnit
        : goodsInfo?.nxDgGoodsStandardname || ''

      const displayPrice = hasCarton && sellingPriceCartonPayload != null && !isNaN(sellingPriceCartonPayload)
        ? sellingPriceCartonPayload
        : sellingPrice

      const confirmContent = hasInputPrice
        ? `建议售价将更新为 ¥${displayPrice}${unit ? '元/' + unit : '元'}，确认提交吗？`
        : '将保存生产日期、保质期与过期日期（建议售价不变），确认提交吗？'

      wx.showModal({
        title: '确认修改',
        content: confirmContent,
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


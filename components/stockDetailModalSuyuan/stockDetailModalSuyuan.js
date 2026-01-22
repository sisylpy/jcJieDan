import apiUrl from '../../config.js'

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    shelfGoods: {
      type: Object,
      value: null
    }
  },
  data: {
    stockList: [],
    goodsInfo: null,
    editVisible: false,
    currentStock: null,
    formData: {
      restWeight: '',
      sellingPrice: '',
      imageUrl: '',
      imagePreview: '',
      remark: ''
    },
    canSubmit: false
  },
  lifetimes: {
    ready() {
      if (this.properties.visible && this.properties.shelfGoods) {
        this.loadData()
      }
    }
  },
  observers: {
    'visible': function(visible) {
      if (visible && this.properties.shelfGoods) {
        this.loadData()
      }
    }
  },
  methods: {
    loadData() {
      const shelfGoods = this.properties.shelfGoods
      if (!shelfGoods) {
        this.setData({ goodsInfo: {}, stockList: [] })
        return
      }
      
      let goodsInfo = null
      let stockList = []
      
      // 优先从 shelfGoods.nxDistributerGoodsEntity 获取
      if (shelfGoods.nxDistributerGoodsEntity) {
        goodsInfo = shelfGoods.nxDistributerGoodsEntity
        stockList = shelfGoods.nxDisGoodsShelfStockEntities || []
      }
      // 其次从 shelfGoods.disGoods 获取
      else if (shelfGoods.disGoods) {
        goodsInfo = shelfGoods.disGoods
        stockList = shelfGoods.disGoods.nxDisGoodsShelfStockEntities || shelfGoods.disGoods.stockList || shelfGoods.nxDisGoodsShelfStockEntities || []
      }
      // 最后从 shelfGoods 本身获取
      else if (shelfGoods.nxDisGoodsShelfStockEntities) {
        stockList = shelfGoods.nxDisGoodsShelfStockEntities || []
        goodsInfo = {
          nxDgGoodsName: shelfGoods.nxDgGoodsName || '商品',
          nxDgGoodsStandardname: shelfGoods.nxDgGoodsStandardname || '斤',
          nxDgCartonUnit: shelfGoods.nxDgCartonUnit,
          nxDgItemsPerCarton: shelfGoods.nxDgItemsPerCarton
        }
      }
      
      this.setData({ goodsInfo: goodsInfo || {}, stockList: Array.isArray(stockList) ? stockList : [] })
    },
    preventClose() {},
    handleCloseList() {
      this.triggerEvent('close')
    },
    handleSelectStock(e) {
      const stock = this.data.stockList[e.currentTarget.dataset.index]
      if (!stock) return
      this.setData({
        currentStock: stock,
        editVisible: true,
        formData: {
          restWeight: String(stock.nxDgssRestWeight || ''),
          sellingPrice: String(stock.nxDgssSellingPrice || ''),
          imageUrl: String(stock.nxDgssStockImage || ''),
          imagePreview: '',
          remark: String(stock.nxDgssStockRemark || '')
        }
      })
      this.checkCanSubmit()
    },
    handleCloseEdit() {
      this.setData({ editVisible: false, currentStock: null })
    },
    handleRestWeightInput(e) {
      this.setData({ 'formData.restWeight': e.detail.value })
      this.checkCanSubmit()
    },
    handleSellingPriceInput(e) {
      this.setData({ 'formData.sellingPrice': e.detail.value })
      this.checkCanSubmit()
    },
    handleImageUrlInput(e) {
      this.setData({ 'formData.imageUrl': e.detail.value, 'formData.imagePreview': '' })
    },
    handleChooseImage() {
      if (!this.data.currentStock) {
        wx.showToast({ title: '请先选择批次', icon: 'none' })
        return
      }
      const stockId = this.data.currentStock.nxDisGoodsShelfStockId || this.data.currentStock.nxDistributerGoodsShelfStockId || this.data.currentStock.nxDgssShelfStockId || this.data.currentStock.nxDgssStockId || this.data.currentStock.nxDgssId || this.data.currentStock.id || this.data.currentStock.stockId
      if (!stockId) {
        wx.showToast({ title: '批次数据异常', icon: 'none' })
        return
      }
      wx.chooseImage({
        count: 1,
        sizeType: ['original', 'compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          this.setData({ 'formData.imagePreview': res.tempFilePaths[0] })
          this.triggerEvent('uploadimage', {
            stockId: stockId,
            imagePath: res.tempFilePaths[0],
            currentStock: this.data.currentStock,
            formData: this.data.formData
          })
        },
        fail: (err) => {
          if (err.errMsg !== 'chooseImage:fail cancel') {
            wx.showToast({ title: '选择图片失败', icon: 'none' })
          }
        }
      })
    },
    updateImageUrl(imageUrl) {
      this.setData({ 'formData.imagePreview': '', 'formData.imageUrl': imageUrl })
      if (this.data.currentStock) {
        const stockId = this.data.currentStock.nxDisGoodsShelfStockId || this.data.currentStock.nxDistributerGoodsShelfStockId || this.data.currentStock.nxDgssShelfStockId || this.data.currentStock.nxDgssStockId || this.data.currentStock.nxDgssId || this.data.currentStock.id || this.data.currentStock.stockId
        if (stockId) {
          this.updateLocalData(stockId, this.data.currentStock.nxDgssRestWeight, this.data.currentStock.nxDgssSellingPrice, imageUrl, this.data.formData.remark || this.data.currentStock.nxDgssStockRemark)
        }
      }
    },
    handleDeleteImage() {
      this.setData({ 'formData.imageUrl': '', 'formData.imagePreview': '' })
    },
    handleRemarkInput(e) {
      this.setData({ 'formData.remark': e.detail.value })
    },
    checkCanSubmit() {
      const { restWeight, sellingPrice } = this.data.formData
      const rest = parseFloat(restWeight)
      const selling = parseFloat(sellingPrice)
      this.setData({
        canSubmit: this.data.currentStock && restWeight && sellingPrice && !isNaN(rest) && rest >= 0 && !isNaN(selling) && selling >= 0
      })
    },
    handleSubmit() {
      if (!this.data.canSubmit) {
        wx.showToast({ title: '请先填写有效的数值', icon: 'none' })
        return
      }
      const { currentStock, formData } = this.data
      const restWeight = parseFloat(formData.restWeight)
      const sellingPrice = parseFloat(formData.sellingPrice)
      const stockId = currentStock.nxDisGoodsShelfStockId || currentStock.nxDistributerGoodsShelfStockId || currentStock.nxDgssShelfStockId || currentStock.nxDgssStockId || currentStock.nxDgssId || currentStock.id || currentStock.stockId
      if (!stockId) {
        wx.showToast({ title: '批次数据异常', icon: 'none' })
        return
      }
      wx.showModal({
        title: '确认修改',
        content: `剩余数量将更新为 ${restWeight}${this.data.goodsInfo.nxDgGoodsStandardname}，建议售价为 ¥${sellingPrice}，确认提交吗？`,
        success: (res) => {
          if (res.confirm) {
            this.triggerEvent('confirm', {
              stockId,
              restWeight,
              sellingPrice,
              nxDgssStockRemark: formData.remark || '',
              nxDgssStockImage: formData.imageUrl || '',
              imagePreview: formData.imagePreview,
              hasNewImage: !!formData.imagePreview
            })
          }
        }
      })
    },
    updateLocalData(stockId, restWeight, sellingPrice, imageUrl, remark) {
      this.setData({
        stockList: this.data.stockList.map(stock => {
          const id = stock.nxDisGoodsShelfStockId || stock.nxDistributerGoodsShelfStockId || stock.nxDgssShelfStockId || stock.nxDgssStockId || stock.nxDgssId || stock.id || stock.stockId
          return id == stockId ? { ...stock, nxDgssRestWeight: restWeight, nxDgssSellingPrice: sellingPrice, nxDgssStockImage: imageUrl, nxDgssStockRemark: remark } : stock
        })
      })
    },
    // 查看溯源报告
    showSuyuan(e) {
      const index = e.currentTarget.dataset.index
      const stock = this.data.stockList[index]
      if (!stock || !stock.nxTraceReportEntity) {
        wx.showToast({
          title: '暂无溯源报告',
          icon: 'none'
        })
        return
      }

      const traceReport = stock.nxTraceReportEntity
      console.log('溯源报告对象:', traceReport)
      
      const reportType = traceReport.nxTrReportType // 'image' 或 'pdf'
      console.log('报告类型:', reportType)
      
      // 获取文件名称（存储在 traceReports/ 目录下）
      const fileName = traceReport.nxTrFilePath || ''
      console.log('文件名:', fileName)
      
      if (!fileName) {
        console.warn('文件名为空，溯源报告对象:', traceReport)
        wx.showToast({
          title: '溯源报告文件不存在',
          icon: 'none'
        })
        return
      }

      // 拼接完整文件路径：服务器地址 + traceReports/ + 文件名
      const serverUrl = apiUrl.server || apiUrl.apiUrl.replace('/api/', '/')
      console.log('服务器地址:', serverUrl)
      
      let filePath = serverUrl.replace(/\/$/, '') + '/' + fileName
      console.log('完整文件路径:', filePath)

      if (reportType === 'image') {
        // 图片：使用预览
        wx.previewImage({
          urls: [filePath],
          current: filePath,
          fail: (err) => {
            console.error('预览图片失败:', err)
            wx.showToast({
              title: '预览失败，请检查网络',
              icon: 'none'
            })
          }
        })
      } else if (reportType === 'pdf') {
        // PDF：先下载，再打开
        wx.showLoading({
          title: '下载中...',
          mask: true
        })
        
        wx.downloadFile({
          url: filePath,
          success: (res) => {
            wx.hideLoading()
            if (res.statusCode === 200) {
              // 下载成功，打开文档
              wx.openDocument({
                filePath: res.tempFilePath,
                showMenu: true, // 显示右上角菜单，可以分享、收藏等
                success: () => {
                  console.log('打开PDF成功')
                },
                fail: (err) => {
                  console.error('打开PDF失败:', err)
                  wx.showToast({
                    title: '打开失败',
                    icon: 'none'
                  })
                }
              })
            } else {
              wx.showToast({
                title: '下载失败',
                icon: 'none'
              })
            }
          },
          fail: (err) => {
            wx.hideLoading()
            console.error('下载PDF失败:', err)
            wx.showToast({
              title: '下载失败，请检查网络',
              icon: 'none'
            })
          }
        })
      } else {
        wx.showToast({
          title: '不支持的文件类型',
          icon: 'none'
        })
      }
    }
  }
})

var load = require('../../../../lib/load.js')

import apiUrl from '../../../../config.js'
import {
  getStockCategoryGoodsPage,
  getStockShelfGoodsPage
} from '../../../../lib/apiDistributer.js'

const VIEW_BAR_HEIGHT_PX = 52
const LEFT_MENU_WIDTH_RPX = 132

Page({
  data: {
    url: '',
    disId: 0,
    navBarHeight: 0,
    viewBarHeight: 0,
    contentHeight: 0,
    categoryHeaderHeight: 84,
    windowWidth: 750,
    leftMenuWidth: LEFT_MENU_WIDTH_RPX,
    shelfMenuWidth: 100,
    viewMode: 'category',
    categoryArr: [],
    selectedCategoryId: null,
    selectedCategoryIndex: 0,
    selectedCategoryName: '',
    shelfArr: [],
    selectedShelfId: null,
    selectedShelfIndex: 0,
    selectedShelfName: '',
    goodsArr: [],
    currentPage: 1,
    totalPage: 0,
    totalCount: 0,
    limit: 15,
    hasMore: false,
    isLoading: false,
    hasLoaded: false,
    refresherTriggered: false,
    goodsScrollTop: 0
  },

  onLoad() {
    this._measurePage()

    const disInfo = wx.getStorageSync('disInfo') || {}
    const ownerDistributerId = Number(wx.getStorageSync('ownerDistributerId'))
    const nestedDisInfo = disInfo.nxDistributerEntity || {}
    const disId = ownerDistributerId || Number(disInfo.nxDistributerId) || Number(nestedDisInfo.nxDistributerId)

    this.setData({
      url: apiUrl.server,
      disId: disId || 0
    })

    if (!disId) {
      wx.showToast({
        title: '未找到配送商信息',
        icon: 'none'
      })
      return
    }

    this._loadCategoryGoods({ reset: true, showLoading: true })
  },

  onShow() {
    this._measurePage()
  },

  _measurePage() {
    const appData = getApp().globalData || {}
    const windowInfo = wx.getWindowInfo ? wx.getWindowInfo() : wx.getSystemInfoSync()
    const rpxRatio = appData.rpxR || (750 / windowInfo.windowWidth)
    const navBarHeightPx = appData.navBarHeight || 0
    const contentHeight = Math.max(0, windowInfo.windowHeight - navBarHeightPx - VIEW_BAR_HEIGHT_PX) * rpxRatio

    this.setData({
      navBarHeight: navBarHeightPx * rpxRatio,
      viewBarHeight: VIEW_BAR_HEIGHT_PX * rpxRatio,
      contentHeight: contentHeight,
      windowWidth: windowInfo.windowWidth * rpxRatio
    })
  },

  _loadCategoryGoods(options) {
    const settings = options || {}
    const reset = settings.reset !== false
    if (this.data.isLoading || !this.data.disId) {
      return
    }

    const page = reset ? 1 : this.data.currentPage + 1
    if (!reset && !this.data.hasMore) {
      return
    }

    const categoryId = settings.categoryId !== undefined
      ? settings.categoryId
      : this.data.selectedCategoryId

    if (settings.showLoading) {
      load.showLoading('获取库存中')
    }
    this.setData({ isLoading: true })

    getStockCategoryGoodsPage({
      disId: this.data.disId,
      categoryId: categoryId,
      page: page,
      limit: this.data.limit
    }).then(res => {
      if (settings.showLoading) {
        load.hideLoading()
      }

      const result = res && res.result ? res.result : {}
      if (result.code !== 0) {
        this.setData({
          isLoading: false,
          refresherTriggered: false,
          hasLoaded: true
        })
        wx.showToast({
          title: result.msg || '库存加载失败',
          icon: 'none'
        })
        return
      }

      const responseData = result.data || {}
      const categoryArr = responseData.categoryArr || []
      const selectedCategoryId = responseData.selectedCategoryId
      const pageGoods = this._decorateGoods(responseData.goodsArr || [], (page - 1) * this.data.limit)
      let selectedCategoryIndex = 0
      let selectedCategoryName = ''

      for (let index = 0; index < categoryArr.length; index += 1) {
        if (categoryArr[index].nxDistributerFatherGoodsId === selectedCategoryId) {
          selectedCategoryIndex = index
          selectedCategoryName = categoryArr[index].nxDfgFatherGoodsName || ''
          break
        }
      }

      this.setData({
        categoryArr: categoryArr,
        selectedCategoryId: selectedCategoryId,
        selectedCategoryIndex: selectedCategoryIndex,
        selectedCategoryName: selectedCategoryName,
        goodsArr: reset ? pageGoods : this.data.goodsArr.concat(pageGoods),
        currentPage: Number(responseData.currentPage) || page,
        totalPage: Number(responseData.totalPage) || 0,
        totalCount: Number(responseData.totalCount) || 0,
        hasMore: responseData.hasMore === true,
        isLoading: false,
        hasLoaded: true,
        refresherTriggered: false
      })
    }).catch(() => {
      if (settings.showLoading) {
        load.hideLoading()
      }
      this.setData({
        isLoading: false,
        refresherTriggered: false,
        hasLoaded: true
      })
    })
  },

  _loadShelfGoods(options) {
    const settings = options || {}
    const reset = settings.reset !== false
    if (this.data.isLoading || !this.data.disId) {
      return
    }

    const page = reset ? 1 : this.data.currentPage + 1
    if (!reset && !this.data.hasMore) {
      return
    }

    const shelfId = settings.shelfId !== undefined
      ? settings.shelfId
      : this.data.selectedShelfId

    if (settings.showLoading) {
      load.showLoading('获取货架库存中')
    }
    this.setData({ isLoading: true })

    getStockShelfGoodsPage({
      disId: this.data.disId,
      shelfId: shelfId,
      page: page,
      limit: this.data.limit
    }).then(res => {
      if (settings.showLoading) {
        load.hideLoading()
      }

      const result = res && res.result ? res.result : {}
      if (result.code !== 0) {
        this.setData({
          isLoading: false,
          refresherTriggered: false,
          hasLoaded: true
        })
        wx.showToast({
          title: result.msg || '货架库存加载失败',
          icon: 'none'
        })
        return
      }

      const responseData = result.data || {}
      const shelfArr = responseData.shelfArr || []
      const selectedShelfId = responseData.selectedShelfId
      const pageGoods = this._decorateShelfGridGoods(
        responseData.shelfGoodsArr || [],
        responseData.goodsArr || [],
        (page - 1) * this.data.limit
      )
      let selectedShelfIndex = 0
      let selectedShelfName = ''

      for (let index = 0; index < shelfArr.length; index += 1) {
        if (shelfArr[index].nxDistributerGoodsShelfId === selectedShelfId) {
          selectedShelfIndex = index
          selectedShelfName = shelfArr[index].nxDistributerGoodsShelfName || ''
          break
        }
      }

      this.setData({
        shelfArr: shelfArr,
        selectedShelfId: selectedShelfId,
        selectedShelfIndex: selectedShelfIndex,
        selectedShelfName: selectedShelfName,
        goodsArr: reset ? pageGoods : this.data.goodsArr.concat(pageGoods),
        currentPage: Number(responseData.currentPage) || page,
        totalPage: Number(responseData.totalPage) || 0,
        totalCount: Number(responseData.totalCount) || 0,
        hasMore: responseData.hasMore === true,
        isLoading: false,
        hasLoaded: true,
        refresherTriggered: false
      })
    }).catch(() => {
      if (settings.showLoading) {
        load.hideLoading()
      }
      this.setData({
        isLoading: false,
        refresherTriggered: false,
        hasLoaded: true
      })
    })
  },

  _decorateShelfGridGoods(shelfGoodsArr, unshelvedGoodsArr, startIndex) {
    const displayOffset = Number(startIndex) || 0
    const source = shelfGoodsArr.length > 0
      ? shelfGoodsArr.map(shelfGoods => ({
        goods: shelfGoods.nxDistributerGoodsEntity || {},
        stockArr: shelfGoods.nxDisGoodsShelfStockEntities || [],
        shelfGoods: shelfGoods
      }))
      : unshelvedGoodsArr.map(goods => ({
        goods: goods,
        stockArr: goods.nxDisGoodsShelfStockEntities || [],
        shelfGoods: null
      }))

    return source.map((sourceItem, index) => {
      const goods = sourceItem.goods
      const stockArr = sourceItem.stockArr
      const brand = this._validText(goods.nxDgGoodsBrand) ? goods.nxDgGoodsBrand : ''
      const standard = this._validText(goods.nxDgGoodsStandardname) ? goods.nxDgGoodsStandardname : '件'
      let restWeight = 0
      stockArr.forEach(stock => {
        const value = Number(stock.nxDgssRestWeight)
        restWeight += Number.isFinite(value) ? value : 0
      })

      return {
        gridKey: sourceItem.shelfGoods
          ? 's-' + sourceItem.shelfGoods.nxDistributerGoodsShelfGoodsId
          : 'u-' + goods.nxDistributerGoodsId,
        nxDistributerGoodsId: goods.nxDistributerGoodsId,
        displayIndex: displayOffset + index + 1,
        displayName: brand + (goods.nxDgGoodsName || ''),
        displayStandard: standard,
        cartonText: this._buildCartonText(goods),
        isTemporary: goods.nxDgNxGoodsId === null || goods.nxDgNxGoodsId === undefined,
        restWeightText: this._formatNumber(restWeight, 2),
        shelfLayer: sourceItem.shelfGoods ? sourceItem.shelfGoods.nxDgsgShelfLayer : null,
        shelfSequence: sourceItem.shelfGoods ? sourceItem.shelfGoods.nxDgsgShelfLayerSeq : null
      }
    })
  },

  _decorateGoods(goodsArr, startIndex) {
    const displayOffset = Number(startIndex) || 0
    return goodsArr.map((goods, goodsIndex) => {
      const item = Object.assign({}, goods)
      const stockArr = (goods.nxDisGoodsShelfStockEntities || []).map((stock, stockIndex) => {
        const batch = Object.assign({}, stock)
        const shelfName = this._validText(stock.shelfName) ? stock.shelfName : ''
        const layer = stock.nxDgsgShelfLayer
        const sequence = stock.nxDgsgShelfLayerSeq
        let locationText = shelfName || '未设置货架'

        if (shelfName && layer !== null && layer !== undefined && layer !== '') {
          locationText += '-L' + layer
        }
        if (shelfName && sequence !== null && sequence !== undefined && sequence !== '') {
          locationText += '-' + sequence
        }

        batch.batchIndex = stockIndex + 1
        batch.locationText = locationText
        batch.inDateText = stock.nxDgssProduceDate || stock.nxDgssInventoryDate || stock.nxDgssDate || ''
        batch.expiryDateText = stock.nxDgssExpiryDate || ''
        batch.priceText = this._formatNumber(stock.nxDgssPrice, 2)
        batch.inWeightText = this._formatNumber(stock.nxDgssWeight, 2)
        batch.inSubtotalText = this._formatNumber(stock.nxDgssSubtotal, 2)
        batch.restWeightText = this._formatNumber(stock.nxDgssRestWeight, 2)
        batch.restSubtotalText = this._formatNumber(stock.nxDgssRestSubtotal, 2)
        return batch
      })

      const locations = []
      stockArr.forEach(stock => {
        if (stock.locationText !== '未设置货架' && locations.indexOf(stock.locationText) < 0) {
          locations.push(stock.locationText)
        }
      })

      const brand = this._validText(goods.nxDgGoodsBrand) ? goods.nxDgGoodsBrand : ''
      item.displayIndex = displayOffset + goodsIndex + 1
      item.displayName = brand + (goods.nxDgGoodsName || '')
      item.displayStandard = this._validText(goods.nxDgGoodsStandardname) ? goods.nxDgGoodsStandardname : '件'
      item.displayStandardWeight = this._validText(goods.nxDgGoodsStandardWeight) ? goods.nxDgGoodsStandardWeight : ''
      item.cartonText = this._buildCartonText(goods)
      item.imagePath = this._goodsImagePath(goods)
      item.shelfText = locations.length > 0 ? locations.join('、') : '未设置货架'
      item.stockArr = stockArr
      item.batchCount = stockArr.length
      item.restWeightText = this._formatNumber(goods.goodsStockWeightTotal, 2)
      item.restAmountText = this._formatNumber(goods.goodsStockTotal, 2)
      return item
    })
  },

  _buildCartonText(goods) {
    if (!this._validText(goods.nxDgCartonUnit) || !this._validText(goods.nxDgItemsPerCarton)) {
      return ''
    }
    const unit = this._validText(goods.nxDgGoodsStandardname) ? goods.nxDgGoodsStandardname : '件'
    return goods.nxDgItemsPerCarton + unit + '/' + goods.nxDgCartonUnit
  },

  _goodsImagePath(goods) {
    const largeFile = this._validText(goods.nxDgGoodsFileLarge) ? goods.nxDgGoodsFileLarge : ''
    const normalFile = this._validText(goods.nxDgGoodsFile) && goods.nxDgGoodsFile !== 'goodsImage/logo.jpg'
      ? goods.nxDgGoodsFile
      : ''
    return largeFile || normalFile
  },

  _validText(value) {
    return value !== null && value !== undefined && value !== '' && value !== 'null'
  },

  _formatNumber(value, digits) {
    const numberValue = Number(value)
    if (!Number.isFinite(numberValue)) {
      return '0'
    }
    return numberValue.toFixed(digits).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')
  },

  changeCategory(e) {
    const categoryId = Number(e.currentTarget.dataset.id)
    const categoryIndex = Number(e.currentTarget.dataset.index)
    if (!categoryId || categoryId === this.data.selectedCategoryId || this.data.isLoading) {
      return
    }

    const category = this.data.categoryArr[categoryIndex] || {}
    this.setData({
      selectedCategoryId: categoryId,
      selectedCategoryIndex: categoryIndex,
      selectedCategoryName: category.nxDfgFatherGoodsName || '',
      goodsArr: [],
      totalCount: Number(category.goodsCount) || 0,
      currentPage: 1,
      totalPage: 0,
      hasMore: false,
      goodsScrollTop: this.data.goodsScrollTop === 0 ? 1 : 0
    }, () => {
      this.setData({ goodsScrollTop: 0 })
      this._loadCategoryGoods({
        reset: true,
        categoryId: categoryId,
        showLoading: true
      })
    })
  },

  changeShelf(e) {
    const shelfId = Number(e.currentTarget.dataset.id)
    const shelfIndex = Number(e.currentTarget.dataset.index)
    if (!Number.isFinite(shelfId) || shelfId === this.data.selectedShelfId || this.data.isLoading) {
      return
    }

    const shelf = this.data.shelfArr[shelfIndex] || {}
    this.setData({
      selectedShelfId: shelfId,
      selectedShelfIndex: shelfIndex,
      selectedShelfName: shelf.nxDistributerGoodsShelfName || '',
      goodsArr: [],
      totalCount: Number(shelf.goodsCount) || 0,
      currentPage: 1,
      totalPage: 0,
      hasMore: false,
      goodsScrollTop: this.data.goodsScrollTop === 0 ? 1 : 0
    }, () => {
      this.setData({ goodsScrollTop: 0 })
      this._loadShelfGoods({
        reset: true,
        shelfId: shelfId,
        showLoading: true
      })
    })
  },

  toggleViewMode() {
    if (this.data.isLoading) {
      return
    }

    const viewMode = this.data.viewMode === 'category' ? 'shelf' : 'category'
    this.setData({
      viewMode: viewMode,
      goodsArr: [],
      currentPage: 1,
      totalPage: 0,
      totalCount: 0,
      hasMore: false,
      hasLoaded: false,
      goodsScrollTop: 0
    }, () => {
      if (viewMode === 'shelf') {
        this._loadShelfGoods({
          reset: true,
          shelfId: this.data.selectedShelfId,
          showLoading: true
        })
      } else {
        this._loadCategoryGoods({
          reset: true,
          categoryId: this.data.selectedCategoryId,
          showLoading: true
        })
      }
    })
  },

  onRefresh() {
    if (this.data.isLoading) {
      return
    }
    this.setData({ refresherTriggered: true })
    if (this.data.viewMode === 'shelf') {
      this._loadShelfGoods({
        reset: true,
        shelfId: this.data.selectedShelfId
      })
    } else {
      this._loadCategoryGoods({
        reset: true,
        categoryId: this.data.selectedCategoryId
      })
    }
  },

  refreshStock() {
    if (this.data.isLoading) {
      return
    }
    if (this.data.viewMode === 'shelf') {
      this._loadShelfGoods({
        reset: true,
        shelfId: this.data.selectedShelfId,
        showLoading: true
      })
    } else {
      this._loadCategoryGoods({
        reset: true,
        categoryId: this.data.selectedCategoryId,
        showLoading: true
      })
    }
  },

  onScrollToLower() {
    if (this.data.viewMode === 'shelf') {
      this._loadShelfGoods({ reset: false })
    } else {
      this._loadCategoryGoods({ reset: false })
    }
  },

  previewImage(e) {
    const path = e.currentTarget.dataset.path
    if (!path) {
      return
    }
    const url = this.data.url + path
    wx.previewImage({ current: url, urls: [url] })
  },

  toBack() {
    wx.navigateBack({ delta: 1 })
  }
})

import apiUrl from '../../../../config.js'

import {
  getDepartmentGoodsStandardDimensions,
  getDepartmentGoodsCurrentStandard,
  updateDepartmentGoodsRelation,
  getDepartmentGoodsStandardHistory,
  queryDisGoodsAndNxGoodsByQuickSearch,
  saveDepartmentGoodsStandard,
  uploadDepartmentGoodsStandardImage
} from '../../../../lib/apiDistributer'

const DIMENSION_LABELS = {
  SIZE: '大小',
  COLOR: '颜色',
  FRESHNESS: '新鲜度',
  ROOT: '根部',
  PACKAGING: '包装',
  SUBSTITUTE: '替代',
  OTHER: '其他'
}

const IMAGE_ROLE_OPTIONS = [
  { code: 'PASS', name: '合格参考', viewName: '合格参考' },
  { code: 'PROHIBITED', name: '禁止这样', viewName: '禁止这样' },
  { code: 'REFERENCE', name: '普通参考', viewName: '参考' }
]

const IMPORTANCE_OPTIONS = [
  { value: 1, name: '1 普通' },
  { value: 2, name: '2 注意' },
  { value: 3, name: '3 重要' },
  { value: 4, name: '4 重点' },
  { value: 5, name: '5 关键' }
]

function parseSnapshot(value) {
  if (!value) return {}
  if (typeof value === 'object') return value
  try {
    return JSON.parse(value)
  } catch (e) {
    return {}
  }
}

function firstValue(object, keys, fallback) {
  const source = object || {}
  for (let i = 0; i < keys.length; i += 1) {
    const value = source[keys[i]]
    if (value !== undefined && value !== null && value !== '') return value
  }
  return fallback
}

function uuid() {
  return 'c_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8)
}

Page({
  data: {
    navBarHeight: 0,
    windowHeight: 0,
    departmentDisGoodsId: null,
    distributerId: null,
    operatorUserId: null,
    operatorName: '',
    goodsName: '',
    customerGoodsName: '',
    departmentName: '',
    pageLoading: true,
    pageError: '',
    dimensionMap: {},
    requirementItems: [],
    imageGrid: [],
    // 参考图片：本次新增尚未保存的图（上传中/完成/失败）
    pendingGridImages: [],
    removedGridImageIds: [],
    gridSaving: false,
    standardHasContent: false,
    standardPreviewUrls: [],
    linkedDisGoodsId: null,
    linkedDisGoodsName: '',
    linkedDisGoodsStandardName: '',
    linkedDisGoodsBrand: '',
    linkedDisGoodsDetail: '',
    linkedDisGoodsImage: '',
    showGoodsRelationPicker: false,
    relationSearchText: '',
    relationSearchResults: [],
    relationSearching: false,
    relationSaving: false,
    showHistoryPopup: false,
    historyLoading: false,
    historyList: []
  },

  onLoad(options) {
    const app = getApp()
    const globalData = app.globalData || {}
    const userInfo = wx.getStorageSync('userInfo')
    const distributerEntity = userInfo && userInfo.nxDistributerEntity
    const departmentDisGoodsId = Number(options.departmentDisGoodsId || options.depDisGoodsId)

    if (!departmentDisGoodsId || !userInfo || !userInfo.nxDistributerUserId || !distributerEntity) {
      wx.showToast({
        title: !departmentDisGoodsId ? '缺少客户商品关系ID' : '登录信息已失效',
        icon: 'none'
      })
      setTimeout(() => wx.navigateBack({ delta: 1 }), 1200)
      return
    }

    this.setData({
      navBarHeight: (globalData.navBarHeight || 0) * (globalData.rpxR || 1),
      windowHeight: (globalData.windowHeight || 0) * (globalData.rpxR || 1),
      departmentDisGoodsId,
      distributerId: distributerEntity.nxDistributerId,
      operatorUserId: userInfo.nxDistributerUserId,
      operatorName: userInfo.nxDiuWxNickName || userInfo.nxDiuName || '',
      goodsName: decodeURIComponent(options.goodsName || ''),
      customerGoodsName: decodeURIComponent(options.customerGoodsName || ''),
      departmentName: decodeURIComponent(options.departmentName || ''),
      imageServer: apiUrl.server
    })

    this._loadPage()
  },

  onShow() {
    // 从添加/编辑页返回后刷新列表
    if (this._loadedOnce) {
      this._loadCurrentStandard().catch(() => {})
    }
    this._loadedOnce = true
  },

  _scopeData() {
    return {
      distributerId: this.data.distributerId,
      operatorUserId: this.data.operatorUserId
    }
  },

  _loadPage() {
    this.setData({ pageLoading: true, pageError: '' })
    this._loadDimensions()
      .then(() => this._loadCurrentStandard())
      .then(() => this.setData({ pageLoading: false }))
      .catch((error) => {
        this.setData({
          pageLoading: false,
          pageError: error && error.message ? error.message : '客户商品标准加载失败'
        })
      })
  },

  retryLoad() {
    this._loadPage()
  },

  _loadDimensions() {
    return getDepartmentGoodsStandardDimensions().then((res) => {
      if (!res.result || res.result.code !== 0) {
        throw new Error((res.result && res.result.msg) || '标准维度加载失败')
      }

      const codes = Array.isArray(res.result.data) ? res.result.data : []
      const options = codes.map((code) => ({
        code,
        name: DIMENSION_LABELS[code] || code
      }))

      if (!options.length) throw new Error('后台未返回可用标准维度')

      const dimensionMap = {}
      options.forEach((item) => { dimensionMap[item.code] = item.name })
      this.setData({ dimensionOptions: options, dimensionMap })
    })
  },

  _loadCurrentStandard() {
    return getDepartmentGoodsCurrentStandard(
      this.data.departmentDisGoodsId,
      this._scopeData()
    ).then((res) => {
      if (!res.result || res.result.code !== 0) {
        throw new Error((res.result && res.result.msg) || '当前标准加载失败')
      }
      const current = res.result.data || { items: [], images: [] }
      const view = this._buildCurrentView(current)
      this.setData({
        goodsName: current.disGoodsName || this.data.goodsName,
        linkedDisGoodsId: current.disGoodsId || null,
        linkedDisGoodsName: current.disGoodsName || '',
        linkedDisGoodsStandardName: current.disGoodsStandardName || '',
        linkedDisGoodsBrand: current.disGoodsBrand || '',
        linkedDisGoodsDetail: current.disGoodsDetail || '',
        linkedDisGoodsImage: this._absoluteImageUrl(current.disGoodsFile || ''),
        requirementItems: view.requirementItems,
        imageGrid: view.imageGrid,
        standardHasContent: view.hasContent,
        standardPreviewUrls: view.previewUrls
      })
    })
  },

  _buildCurrentView(current) {
    const dimensionMap = this.data.dimensionMap || {}
    const rawItems = Array.isArray(current.items) ? current.items : []
    const rawImages = Array.isArray(current.images) ? current.images : []
    const images = rawImages.map((image) => this._normalizeViewImage(image))

    // 客户要求：编号列表
    const items = rawItems.map((item) => {
      const itemId = item.nxDdgsiId
      const dimensionCode = item.nxDdgsiDimensionCode
      const importance = Number(item.nxDdgsiImportanceLevel || 3)
      const itemImages = images.filter((image) => String(image.standardItemId || '') === String(itemId))
      const thumbnailImage = itemImages[0]
      return {
        itemId,
        dimensionName: item.nxDdgsiDimensionName || dimensionMap[dimensionCode] || dimensionCode,
        requirementText: item.nxDdgsiRequirementText,
        importanceLevel: importance,
        stars: '★★★★★'.slice(0, importance),
        sort: Number(item.nxDdgsiSort || 0),
        thumbnail: thumbnailImage ? thumbnailImage.previewUrl : ''
      }
    }).sort((a, b) => b.importanceLevel - a.importanceLevel || a.sort - b.sort)

    // 参考图片：宫格（未绑定具体要求的整体图片）
    const gridRoleOrder = { PASS: 0, PROHIBITED: 1, REFERENCE: 2 }
    const gridImages = images
      .filter((image) => !image.standardItemId)
      .map((image) => Object.assign({}, image, {
        isPass: image.imageRole === 'PASS',
        isProhibited: image.imageRole === 'PROHIBITED'
      }))
      .sort((a, b) => {
        return (gridRoleOrder[a.imageRole] || 9) - (gridRoleOrder[b.imageRole] || 9) ||
          b.importanceLevel - a.importanceLevel || a.sort - b.sort
      })

    return {
      requirementItems: items,
      imageGrid: gridImages,
      hasContent: items.length > 0 || gridImages.length > 0,
      previewUrls: images.map((image) => image.previewUrl)
    }
  },

  _normalizeViewImage(image) {
    const imageUrl = image.nxDdgimgImageUrl || ''
    const role = image.nxDdgimgImageRole || 'REFERENCE'
    return {
      imageId: image.nxDdgimgId,
      standardItemId: image.nxDdgimgStandardItemId,
      imageUrl,
      previewUrl: this._absoluteImageUrl(imageUrl),
      imageRole: role,
      roleName: this._roleName(role),
      description: image.nxDdgimgDescription || '',
      importanceLevel: Number(image.nxDdgimgImportanceLevel || 3),
      sort: Number(image.nxDdgimgSort || 0)
    }
  },

  _absoluteImageUrl(imageUrl) {
    if (!imageUrl) return ''
    if (/^(https?:|wxfile:|blob:)/i.test(imageUrl)) return imageUrl
    return (this.data.imageServer || apiUrl.server) + imageUrl.replace(/^\//, '')
  },

  _roleName(role) {
    const item = IMAGE_ROLE_OPTIONS.find((option) => option.code === role)
    return item ? item.viewName : role
  },

  previewStandardImage(e) {
    const current = e.currentTarget.dataset.url
    const urls = this.data.standardPreviewUrls || []
    if (!current) return
    wx.previewImage({ current, urls: urls.length ? urls : [current] })
  },

  // —— 跳转添加/编辑页 ——

  toAddRequirement() {
    this._gotoEditPage('item', null)
  },

  toEditRequirement(e) {
    const itemId = Number(e.currentTarget.dataset.id)
    if (!itemId) return
    this._gotoEditPage('item', itemId)
  },

  // —— 参考图片：在当前页直接添加 / 删除 / 保存（不跳转编辑页） ——

  chooseGridImages() {
    if (this.data.gridSaving) return
    const uploading = this.data.pendingGridImages.filter((image) => image.uploadStatus === 'uploading')
    if (uploading.length) {
      wx.showToast({ title: '图片上传中，请稍候', icon: 'none' })
      return
    }
    const total = this.data.imageGrid.length + this.data.pendingGridImages.length
    const max = Math.max(0, 9 - total)
    if (max <= 0) {
      wx.showToast({ title: '参考图片最多 9 张', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: max,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const files = (res.tempFiles || []).map((file) => ({
          clientKey: uuid(),
          localPath: file.tempFilePath,
          previewUrl: file.tempFilePath,
          imageId: null,
          uploadStatus: 'pending'
        }))
        if (!files.length) return
        const pendingGridImages = this.data.pendingGridImages.concat(files)
        this.setData({ pendingGridImages })
        files.forEach((file, offset) => {
          const index = pendingGridImages.length - files.length + offset
          this._uploadGridImage(index)
        })
      }
    })
  },

  _uploadGridImage(index) {
    const pending = this.data.pendingGridImages
    const image = pending[index]
    if (!image || image.uploadStatus === 'uploading') return
    this.setData({ ['pendingGridImages[' + index + '].uploadStatus']: 'uploading' })
    uploadDepartmentGoodsStandardImage({
      departmentDisGoodsId: this.data.departmentDisGoodsId,
      distributerId: this.data.distributerId,
      operatorUserId: this.data.operatorUserId,
      filePath: image.localPath
    }).then((res) => {
      if (!res.result || res.result.code !== 0) {
        throw new Error((res.result && res.result.msg) || '图片上传失败')
      }
      const uploaded = res.result.data && res.result.data[0]
      const uploadedUrl = uploaded && (uploaded.fileUrl || uploaded.url || uploaded.imageUrl)
      if (!uploadedUrl) throw new Error('图片上传结果异常')
      this.setData({
        ['pendingGridImages[' + index + '].uploadStatus']: 'done',
        ['pendingGridImages[' + index + '].previewUrl']: uploadedUrl,
        ['pendingGridImages[' + index + '].imageUrl']: uploadedUrl
      })
      this._maybeFlushGridChanges()
    }).catch((error) => {
      this.setData({ ['pendingGridImages[' + index + '].uploadStatus']: 'failed' })
      wx.showToast({
        title: error && error.message ? error.message : '图片上传失败',
        icon: 'none'
      })
    })
  },

  // 所有待上传图片处理完后统一保存一次
  _maybeFlushGridChanges() {
    const pending = this.data.pendingGridImages
    if (!pending.length) return
    if (pending.some((image) => image.uploadStatus === 'uploading')) return
    this._flushGridChanges()
  },

  _flushGridChanges() {
    const newImages = this.data.pendingGridImages
      .filter((image) => image.uploadStatus === 'done' && image.imageUrl)
      .map((image, index) => ({
        imageId: null,
        clientKey: image.clientKey,
        imageUrl: image.imageUrl,
        imageRole: 'REFERENCE',
        description: '',
        importanceLevel: 3,
        sort: index + 1,
        dimensionCode: 'OTHER'
      }))
    const removedIds = this.data.removedGridImageIds || []
    if (!newImages.length && !removedIds.length) {
      this.setData({ pendingGridImages: [] })
      return
    }
    this.setData({ gridSaving: true })
    wx.showLoading({ title: '保存中...', mask: true })
    saveDepartmentGoodsStandard(this.data.departmentDisGoodsId, {
      distributerId: this.data.distributerId,
      operatorUserId: this.data.operatorUserId,
      operatorName: this.data.operatorName,
      confirmed: true,
      changeReason: '',
      sourceType: 'MANUAL',
      items: [],
      images: newImages,
      inactiveItemIds: [],
      inactiveImageIds: removedIds
    }).then((res) => {
      wx.hideLoading()
      if (!res.result || res.result.code !== 0) {
        throw new Error((res.result && res.result.msg) || '保存失败')
      }
      this.setData({
        pendingGridImages: [],
        removedGridImageIds: [],
        gridSaving: false
      })
      wx.showToast({ title: '已保存', icon: 'success' })
      return this._loadCurrentStandard()
    }).catch((error) => {
      wx.hideLoading()
      this.setData({ gridSaving: false })
      wx.showToast({
        title: error && error.message ? error.message : '保存失败',
        icon: 'none',
        duration: 2500
      })
    })
  },

  removeGridImage(e) {
    if (this.data.gridSaving) return
    const dataset = e.currentTarget.dataset
    // 本次新增尚未保存的图：直接本地移除，无需调接口
    if (dataset.key === 'pending') {
      const pendingGridImages = this.data.pendingGridImages.slice()
      pendingGridImages.splice(Number(dataset.index), 1)
      this.setData({ pendingGridImages })
      return
    }
    const imageId = Number(dataset.id)
    if (!imageId) return
    wx.showModal({
      title: '移除参考图片',
      content: '确定移除这张参考图片吗？',
      confirmText: '移除',
      confirmColor: '#d63e3e',
      success: (modal) => {
        if (!modal.confirm) return
        const removedGridImageIds = (this.data.removedGridImageIds || []).slice()
        if (removedGridImageIds.indexOf(imageId) < 0) removedGridImageIds.push(imageId)
        const imageGrid = this.data.imageGrid.filter((image) => image.imageId !== imageId)
        this.setData({ removedGridImageIds, imageGrid })
        this._flushGridChanges()
      }
    })
  },

  _gotoEditPage(mode, itemId) {
    const query = [
      'departmentDisGoodsId=' + this.data.departmentDisGoodsId,
      'mode=' + mode,
      'goodsName=' + encodeURIComponent(this.data.goodsName || ''),
      'customerGoodsName=' + encodeURIComponent(this.data.customerGoodsName || ''),
      'departmentName=' + encodeURIComponent(this.data.departmentName || '')
    ]
    if (itemId) query.push('itemId=' + itemId)
    wx.navigateTo({
      url: '../customerGoodsStandardEdit/customerGoodsStandardEdit?' + query.join('&')
    })
  },

  // —— 更换关联商品 ——

  openGoodsRelationPicker() {
    if (this.data.pageLoading || this.data.pageError) return
    const keyword = String(this.data.customerGoodsName || this.data.goodsName || '').trim()
    this.setData({
      showGoodsRelationPicker: true,
      relationSearchText: keyword,
      relationSearchResults: []
    })
    if (keyword) this.searchRelationGoods()
  },

  closeGoodsRelationPicker() {
    if (this.data.relationSaving) return
    this.setData({ showGoodsRelationPicker: false })
  },

  onRelationSearchInput(e) {
    this.setData({ relationSearchText: e.detail.value })
  },

  onRelationSearchConfirm(e) {
    if (e && e.detail && e.detail.value !== undefined) {
      this.setData({ relationSearchText: e.detail.value })
    }
    this.searchRelationGoods()
  },

  searchRelationGoods() {
    const keyword = String(this.data.relationSearchText || '').trim()
    if (!keyword) {
      wx.showToast({ title: '请输入配送商商品名称', icon: 'none' })
      return
    }
    if (this.data.relationSearching) return
    this.setData({ relationSearching: true, relationSearchResults: [] })
    queryDisGoodsAndNxGoodsByQuickSearch({
      disId: this.data.distributerId,
      searchStr: keyword
    }).then((res) => {
      if (!res.result || res.result.code !== 0) {
        throw new Error((res.result && res.result.msg) || '配送商商品搜索失败')
      }
      const source = res.result.data && Array.isArray(res.result.data.disArr)
        ? res.result.data.disArr : []
      const seen = {}
      const results = []
      source.forEach((goods) => {
        const id = Number(goods.nxDistributerGoodsId)
        if (!id || seen[id] || Number(goods.nxDgDistributerId) !== Number(this.data.distributerId)) return
        seen[id] = true
        results.push({
          id,
          name: goods.nxDgGoodsName || ('配送商商品 #' + id),
          standardName: goods.nxDgGoodsStandardname || '',
          brand: goods.nxDgGoodsBrand || '',
          detail: goods.nxDgGoodsDetail || '',
          imageUrl: this._absoluteImageUrl(goods.nxDgGoodsFileLarge || goods.nxDgGoodsFile || ''),
          current: id === Number(this.data.linkedDisGoodsId)
        })
      })
      this.setData({ relationSearchResults: results, relationSearching: false })
    }).catch((error) => {
      this.setData({ relationSearching: false })
      wx.showToast({
        title: error && error.message ? error.message : '配送商商品搜索失败',
        icon: 'none'
      })
    })
  },

  selectRelationGoods(e) {
    const targetId = Number(e.currentTarget.dataset.id)
    const target = this.data.relationSearchResults.find((item) => item.id === targetId)
    if (!target || target.current || this.data.relationSaving) return
    const customerGoods = this.data.customerGoodsName || this.data.goodsName || '当前客户商品'
    wx.showModal({
      title: '确认关联商品',
      content: '将“' + customerGoods + '”关联到配送商商品“' + target.name + '”。客户标准、备注和历史订单不会改变。',
      confirmText: '确认关联',
      success: (modal) => {
        if (!modal.confirm) return
        this.saveGoodsRelation(target)
      }
    })
  },

  saveGoodsRelation(target) {
    this.setData({ relationSaving: true })
    wx.showLoading({ title: '正在关联' })
    updateDepartmentGoodsRelation(this.data.departmentDisGoodsId, {
      distributerId: this.data.distributerId,
      operatorUserId: this.data.operatorUserId,
      disGoodsId: target.id
    }).then((res) => {
      if (!res.result || res.result.code !== 0) {
        throw new Error((res.result && res.result.msg) || '关联失败')
      }
      this.setData({ showGoodsRelationPicker: false })
      return this._loadCurrentStandard()
    }).then(() => {
      wx.showToast({ title: '关联成功', icon: 'success' })
    }).catch((error) => {
      wx.showToast({
        title: error && error.message ? error.message : '关联失败',
        icon: 'none',
        duration: 2500
      })
    }).finally(() => {
      wx.hideLoading()
      this.setData({ relationSaving: false })
    })
  },

  // —— 修改记录弹层 ——

  openHistory() {
    if (this.data.historyLoading) return
    this.setData({ showHistoryPopup: true, historyLoading: true, historyList: [] })
    getDepartmentGoodsStandardHistory(
      this.data.departmentDisGoodsId,
      this._scopeData()
    ).then((res) => {
      if (!res.result || res.result.code !== 0) {
        throw new Error((res.result && res.result.msg) || '修改记录加载失败')
      }
      this.setData({
        historyLoading: false,
        historyList: this._formatHistory(res.result.data || [])
      })
    }).catch((error) => {
      this.setData({ historyLoading: false })
      wx.showToast({
        title: error && error.message ? error.message : '修改记录加载失败',
        icon: 'none'
      })
    })
  },

  closeHistory() {
    this.setData({ showHistoryPopup: false })
  },

  noop() {},

  _formatHistory(versions) {
    const list = Array.isArray(versions) ? versions : []
    return list.map((version) => {
      const changes = Array.isArray(version.changes) ? version.changes : []
      const lines = []
      const imageCounters = {}

      changes.forEach((change) => {
        const objectType = change.nxDdgscObjectType || change.objectType
        const action = change.nxDdgscAction || change.action
        const before = parseSnapshot(change.nxDdgscBeforeSnapshot || change.beforeSnapshot)
        const after = parseSnapshot(change.nxDdgscAfterSnapshot || change.afterSnapshot)
        if (objectType === 'ITEM') {
          this._appendItemHistoryLines(lines, action, before, after)
        } else if (objectType === 'IMAGE') {
          const snapshot = action === 'INACTIVATE' ? before : after
          const role = firstValue(snapshot, ['nxDdgimgImageRole', 'imageRole'], 'REFERENCE')
          const key = action + '-' + role
          imageCounters[key] = (imageCounters[key] || 0) + 1
        }
      })

      Object.keys(imageCounters).forEach((key) => {
        const splitIndex = key.indexOf('-')
        const action = key.slice(0, splitIndex)
        const role = key.slice(splitIndex + 1)
        const actionName = action === 'CREATE' ? '新增' : action === 'INACTIVATE' ? '失效' : '更新'
        lines.push(actionName + ' ' + imageCounters[key] + ' 张' + this._roleName(role) + '图')
      })

      if (!lines.length) lines.push('记录了 ' + changes.length + ' 项标准变化')
      const changedBy = version.changedBy || (changes[0] && changes[0].nxDdgscChangedBy)
      const operator = String(changedBy) === String(this.data.operatorUserId) && this.data.operatorName
        ? this.data.operatorName
        : (version.changedByName || version.operatorName || (changedBy ? '用户 ' + changedBy : '未知'))
      return {
        versionNo: version.versionNo,
        timeText: this._formatHistoryTime(version.changedAt || (changes[0] && changes[0].nxDdgscChangedAt)),
        title: version.changeReason || '修改客户商品标准',
        operator,
        lines
      }
    })
  },

  _appendItemHistoryLines(lines, action, before, after) {
    const source = action === 'INACTIVATE' ? before : after
    const dimensionCode = firstValue(source, ['nxDdgsiDimensionCode', 'dimensionCode'], 'OTHER')
    const dimensionName = firstValue(
      source,
      ['nxDdgsiDimensionName', 'dimensionName'],
      this.data.dimensionMap[dimensionCode] || dimensionCode
    )
    const beforeText = firstValue(before, ['nxDdgsiRequirementText', 'requirementText'], '')
    const afterText = firstValue(after, ['nxDdgsiRequirementText', 'requirementText'], '')
    const beforeImportance = firstValue(before, ['nxDdgsiImportanceLevel', 'importanceLevel'], '')
    const afterImportance = firstValue(after, ['nxDdgsiImportanceLevel', 'importanceLevel'], '')
    const beforeDimensionCode = firstValue(before, ['nxDdgsiDimensionCode', 'dimensionCode'], '')
    const afterDimensionCode = firstValue(after, ['nxDdgsiDimensionCode', 'dimensionCode'], '')

    if (action === 'CREATE') {
      lines.push(dimensionName + '：新增“' + afterText + '”')
    } else if (action === 'INACTIVATE') {
      lines.push(dimensionName + '：“' + beforeText + '”已失效')
    } else {
      if (beforeDimensionCode !== afterDimensionCode) {
        lines.push(
          '维度：' + (this.data.dimensionMap[beforeDimensionCode] || beforeDimensionCode) +
          ' → ' + (this.data.dimensionMap[afterDimensionCode] || afterDimensionCode)
        )
      }
      if (beforeText !== afterText) lines.push(dimensionName + '：' + beforeText + ' → ' + afterText)
      if (String(beforeImportance) !== String(afterImportance)) {
        lines.push(dimensionName + '重要度：' + beforeImportance + ' → ' + afterImportance)
      }
    }
  },

  _formatHistoryTime(value) {
    if (!value) return ''
    const text = String(value)
    const match = text.match(/(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})/)
    if (match) return Number(match[2]) + '月' + Number(match[3]) + '日 ' + match[4].padStart(2, '0') + ':' + match[5]
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return text
    return (date.getMonth() + 1) + '月' + date.getDate() + '日 ' +
      String(date.getHours()).padStart(2, '0') + ':' + String(date.getMinutes()).padStart(2, '0')
  },

  toBack() {
    wx.navigateBack({ delta: 1 })
  }
})

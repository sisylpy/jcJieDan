import apiUrl from '../../../../config.js'

import {
  getDepartmentGoodsStandardDimensions,
  getDepartmentGoodsCurrentStandard,
  updateDepartmentGoodsRelation,
  saveDepartmentGoodsStandard,
  getDepartmentGoodsStandardHistory,
  uploadDepartmentGoodsStandardImage,
  queryDisGoodsAndNxGoodsByQuickSearch
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

function createClientKey(prefix) {
  return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8)
}

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

Page({
  data: {
    navBarHeight: 0,
    windowHeight: 0,
    departmentDisGoodsId: null,
    distributerId: null,
    operatorUserId: null,
    goodsName: '',
    customerGoodsName: '',
    departmentName: '',
    pageMode: 'view',
    pageLoading: true,
    pageError: '',
    dimensionOptions: [],
    dimensionMap: {},
    importanceOptions: IMPORTANCE_OPTIONS,
    imageRoleOptions: IMAGE_ROLE_OPTIONS,
    standardGroups: [],
    generalImageSections: [],
    standardHasContent: false,
    standardPreviewUrls: [],
    currentStandardRaw: null,
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
    editItems: [],
    editImages: [],
    imageBindOptions: [],
    inactiveItemIds: [],
    inactiveImageIds: [],
    standardDirty: false,
    uploadingCount: 0,
    savingStandard: false,
    historyLoading: false,
    historyList: []
  },

  onLoad(options) {
    const app = getApp()
    const globalData = app.globalData || {}
    const userInfo = wx.getStorageSync('userInfo')
    const distributerEntity = userInfo && userInfo.nxDistributerEntity
    const departmentDisGoodsId = Number(options.departmentDisGoodsId)

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
        currentStandardRaw: current,
        goodsName: current.disGoodsName || this.data.goodsName,
        linkedDisGoodsId: current.disGoodsId || null,
        linkedDisGoodsName: current.disGoodsName || '',
        linkedDisGoodsStandardName: current.disGoodsStandardName || '',
        linkedDisGoodsBrand: current.disGoodsBrand || '',
        linkedDisGoodsDetail: current.disGoodsDetail || '',
        linkedDisGoodsImage: this._absoluteImageUrl(current.disGoodsFile || ''),
        standardGroups: view.groups,
        generalImageSections: view.generalImageSections,
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

    const items = rawItems.map((item) => {
      const itemId = item.nxDdgsiId
      const dimensionCode = item.nxDdgsiDimensionCode
      const importance = Number(item.nxDdgsiImportanceLevel || 3)
      const itemImages = images.filter((image) => String(image.standardItemId || '') === String(itemId))
      return {
        itemId,
        dimensionCode,
        dimensionName: item.nxDdgsiDimensionName || dimensionMap[dimensionCode] || dimensionCode,
        requirementText: item.nxDdgsiRequirementText,
        importanceLevel: importance,
        importanceText: IMPORTANCE_OPTIONS[importance - 1].name,
        stars: '★★★★★'.slice(0, importance),
        sort: Number(item.nxDdgsiSort || 0),
        imageSections: this._buildImageSections(itemImages)
      }
    })

    const groupMap = {}
    items.forEach((item) => {
      if (!groupMap[item.dimensionCode]) {
        groupMap[item.dimensionCode] = {
          code: item.dimensionCode,
          name: dimensionMap[item.dimensionCode] || item.dimensionName || item.dimensionCode,
          maxImportance: 0,
          items: []
        }
      }
      groupMap[item.dimensionCode].items.push(item)
      groupMap[item.dimensionCode].maxImportance = Math.max(
        groupMap[item.dimensionCode].maxImportance,
        item.importanceLevel
      )
    })

    const dimensionOrder = {}
    this.data.dimensionOptions.forEach((item, index) => { dimensionOrder[item.code] = index })
    const groups = Object.keys(groupMap).map((code) => {
      const group = groupMap[code]
      group.items.sort((a, b) => b.importanceLevel - a.importanceLevel || a.sort - b.sort)
      return group
    }).sort((a, b) => {
      return b.maxImportance - a.maxImportance ||
        (dimensionOrder[a.code] || 0) - (dimensionOrder[b.code] || 0)
    })

    const generalImages = images.filter((image) => !image.standardItemId)
    return {
      groups,
      generalImageSections: this._buildImageSections(generalImages),
      hasContent: items.length > 0 || generalImages.length > 0,
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

  _buildImageSections(images) {
    return IMAGE_ROLE_OPTIONS.map((role) => {
      const roleImages = images
        .filter((image) => image.imageRole === role.code)
        .sort((a, b) => b.importanceLevel - a.importanceLevel || a.sort - b.sort)
      return {
        role: role.code,
        name: role.viewName,
        className: role.code.toLowerCase(),
        images: roleImages
      }
    }).filter((section) => section.images.length > 0)
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

  openGoodsRelationPicker() {
    if (this.data.pageMode !== 'view') return
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

  openEdit() {
    const current = this.data.currentStandardRaw || { items: [], images: [] }
    const dimensionOptions = this.data.dimensionOptions
    const items = (current.items || []).map((item) => {
      const importance = Number(item.nxDdgsiImportanceLevel || 3)
      const dimensionIndex = Math.max(0, dimensionOptions.findIndex(
        (option) => option.code === item.nxDdgsiDimensionCode
      ))
      return {
        uiKey: 'item-' + item.nxDdgsiId,
        itemId: item.nxDdgsiId,
        clientKey: '',
        dimensionCode: item.nxDdgsiDimensionCode,
        dimensionName: item.nxDdgsiDimensionName || '',
        dimensionIndex,
        requirementText: item.nxDdgsiRequirementText || '',
        importanceLevel: importance,
        importanceIndex: importance - 1,
        sort: Number(item.nxDdgsiSort || 0),
        isNew: false,
        dirty: false
      }
    })

    const images = (current.images || []).map((image) => {
      const role = image.nxDdgimgImageRole || 'REFERENCE'
      const importance = Number(image.nxDdgimgImportanceLevel || 3)
      const linkedItem = items.find((item) => String(item.itemId) === String(image.nxDdgimgStandardItemId))
      return {
        uiKey: 'image-' + image.nxDdgimgId,
        imageId: image.nxDdgimgId,
        linkedItemKey: linkedItem ? linkedItem.uiKey : '',
        bindIndex: 0,
        serverImageUrl: image.nxDdgimgImageUrl,
        previewUrl: this._absoluteImageUrl(image.nxDdgimgImageUrl),
        dimensionCode: image.nxDdgimgDimensionCode || (linkedItem && linkedItem.dimensionCode) || 'OTHER',
        imageRole: role,
        roleClass: role.toLowerCase(),
        roleIndex: Math.max(0, IMAGE_ROLE_OPTIONS.findIndex((option) => option.code === role)),
        description: image.nxDdgimgDescription || '',
        importanceLevel: importance,
        importanceIndex: importance - 1,
        sort: Number(image.nxDdgimgSort || 0),
        isNew: false,
        dirty: false,
        uploadStatus: 'success',
        uploadProgress: 100
      }
    })

    const rebuilt = this._rebuildImageBindOptions(items, images)
    this.setData({
      pageMode: 'edit',
      editItems: items,
      editImages: rebuilt.images,
      imageBindOptions: rebuilt.options,
      inactiveItemIds: [],
      inactiveImageIds: [],
      standardDirty: false,
      uploadingCount: 0
    })
  },

  _rebuildImageBindOptions(items, images) {
    const options = [{ key: '', name: '整个客户商品' }]
    items.forEach((item) => {
      options.push({
        key: item.uiKey,
        name: (this.data.dimensionMap[item.dimensionCode] || item.dimensionName || item.dimensionCode) +
          ' · ' + (item.requirementText || '未填写要求')
      })
    })
    const nextImages = images.map((image) => {
      const bindIndex = options.findIndex((option) => option.key === image.linkedItemKey)
      return Object.assign({}, image, { bindIndex: bindIndex < 0 ? 0 : bindIndex })
    })
    return { options, images: nextImages }
  },

  addStandardItem() {
    const dimension = this.data.dimensionOptions[0]
    if (!dimension) return
    const maxSort = this.data.editItems.reduce((max, item) => Math.max(max, item.sort || 0), 0)
    const items = this.data.editItems.concat([{
      uiKey: createClientKey('item'),
      itemId: null,
      clientKey: createClientKey('client'),
      dimensionCode: dimension.code,
      dimensionName: dimension.name,
      dimensionIndex: 0,
      requirementText: '',
      importanceLevel: 3,
      importanceIndex: 2,
      sort: maxSort + 10,
      isNew: true,
      dirty: true
    }])
    const rebuilt = this._rebuildImageBindOptions(items, this.data.editImages)
    this.setData({
      editItems: items,
      editImages: rebuilt.images,
      imageBindOptions: rebuilt.options,
      standardDirty: true
    })
  },

  onItemDimensionChange(e) {
    const index = Number(e.currentTarget.dataset.index)
    const dimensionIndex = Number(e.detail.value)
    const option = this.data.dimensionOptions[dimensionIndex]
    if (!option || !this.data.editItems[index]) return
    const items = this.data.editItems.slice()
    const images = this.data.editImages.slice()
    const item = Object.assign({}, items[index], {
      dimensionIndex,
      dimensionCode: option.code,
      dimensionName: option.name,
      dirty: true
    })
    items[index] = item
    images.forEach((image, imageIndex) => {
      if (image.linkedItemKey === item.uiKey) {
        images[imageIndex] = Object.assign({}, image, {
          dimensionCode: option.code,
          dirty: true
        })
      }
    })
    const rebuilt = this._rebuildImageBindOptions(items, images)
    this.setData({
      editItems: items,
      editImages: rebuilt.images,
      imageBindOptions: rebuilt.options,
      standardDirty: true
    })
  },

  onItemTextInput(e) {
    const index = Number(e.currentTarget.dataset.index)
    if (!this.data.editItems[index]) return
    const items = this.data.editItems.slice()
    items[index] = Object.assign({}, items[index], {
      requirementText: e.detail.value,
      dirty: true
    })
    const rebuilt = this._rebuildImageBindOptions(items, this.data.editImages)
    this.setData({
      editItems: items,
      editImages: rebuilt.images,
      imageBindOptions: rebuilt.options,
      standardDirty: true
    })
  },

  onItemImportanceChange(e) {
    const index = Number(e.currentTarget.dataset.index)
    const importanceIndex = Number(e.detail.value)
    if (!this.data.editItems[index]) return
    const items = this.data.editItems.slice()
    items[index] = Object.assign({}, items[index], {
      importanceIndex,
      importanceLevel: IMPORTANCE_OPTIONS[importanceIndex].value,
      dirty: true
    })
    this.setData({ editItems: items, standardDirty: true })
  },

  removeStandardItem(e) {
    const index = Number(e.currentTarget.dataset.index)
    const item = this.data.editItems[index]
    if (!item) return
    const content = item.isNew
      ? '移除这条尚未保存的文字要求？'
      : '失效这条文字要求？它关联的正式标准图片也会一并失效。'
    wx.showModal({
      title: item.isNew ? '移除要求' : '失效要求',
      content,
      success: (res) => {
        if (res.confirm) this._removeStandardItem(index)
      }
    })
  },

  _removeStandardItem(index) {
    const items = this.data.editItems.slice()
    const item = items[index]
    const inactiveItemIds = this.data.inactiveItemIds.slice()
    let images = this.data.editImages.slice()
    if (!item.isNew) inactiveItemIds.push(item.itemId)
    items.splice(index, 1)

    if (item.isNew) {
      images = images.map((image) => {
        if (image.linkedItemKey !== item.uiKey) return image
        return Object.assign({}, image, {
          linkedItemKey: '',
          dimensionCode: 'OTHER',
          dirty: true
        })
      })
    } else {
      images = images.filter((image) => image.linkedItemKey !== item.uiKey)
    }

    const rebuilt = this._rebuildImageBindOptions(items, images)
    this.setData({
      editItems: items,
      editImages: rebuilt.images,
      imageBindOptions: rebuilt.options,
      inactiveItemIds,
      standardDirty: true
    })
  },

  chooseStandardImages() {
    const newImageCount = this.data.editImages.filter((image) => image.isNew).length
    const remaining = 20 - newImageCount
    if (remaining <= 0) {
      wx.showToast({ title: '本批最多添加20张图片', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: Math.min(9, remaining),
      mediaType: ['image'],
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => this._prepareSelectedImages(res.tempFiles || []),
      fail: (error) => {
        if (!error.errMsg || error.errMsg.indexOf('cancel') < 0) {
          wx.showToast({ title: '选择图片失败', icon: 'none' })
        }
      }
    })
  },

  _prepareSelectedImages(files) {
    const validFiles = []
    let tooLarge = 0
    let unsupported = 0
    files.forEach((file) => {
      const path = file.tempFilePath || ''
      const extensionMatch = path.toLowerCase().match(/\.([a-z0-9]+)(?:\?|$)/)
      const extension = extensionMatch ? extensionMatch[1] : ''
      if (Number(file.size || 0) > 10 * 1024 * 1024) {
        tooLarge += 1
      } else if (extension && ['jpg', 'jpeg', 'png', 'webp'].indexOf(extension) < 0) {
        unsupported += 1
      } else {
        validFiles.push(file)
      }
    })

    if (tooLarge || unsupported) {
      const messages = []
      if (tooLarge) messages.push(tooLarge + '张超过10MB')
      if (unsupported) messages.push(unsupported + '张格式不支持')
      wx.showToast({ title: messages.join('，'), icon: 'none', duration: 2500 })
    }
    if (!validFiles.length) return

    const maxSort = this.data.editImages.reduce((max, image) => Math.max(max, image.sort || 0), 0)
    const newImages = validFiles.map((file, index) => ({
      uiKey: createClientKey('image'),
      imageId: null,
      linkedItemKey: '',
      bindIndex: 0,
      localPath: file.tempFilePath,
      serverImageUrl: '',
      previewUrl: file.tempFilePath,
      dimensionCode: 'OTHER',
      imageRole: 'REFERENCE',
      roleClass: 'reference',
      roleIndex: 2,
      description: '',
      importanceLevel: 3,
      importanceIndex: 2,
      sort: maxSort + (index + 1) * 10,
      isNew: true,
      dirty: true,
      uploadStatus: 'uploading',
      uploadProgress: 0,
      uploadError: ''
    }))
    const images = this.data.editImages.concat(newImages)
    const rebuilt = this._rebuildImageBindOptions(this.data.editItems, images)
    this.setData({
      editImages: rebuilt.images,
      imageBindOptions: rebuilt.options,
      uploadingCount: this.data.uploadingCount + newImages.length,
      standardDirty: true
    })
    newImages.forEach((image) => this._uploadStandardImage(image.uiKey))
  },

  _uploadStandardImage(uiKey) {
    const image = this.data.editImages.find((item) => item.uiKey === uiKey)
    if (!image) return
    uploadDepartmentGoodsStandardImage({
      departmentDisGoodsId: this.data.departmentDisGoodsId,
      distributerId: this.data.distributerId,
      operatorUserId: this.data.operatorUserId,
      filePath: image.localPath,
      onProgress: (progress) => this._updateImageUploadProgress(uiKey, progress.progress)
    }).then((res) => {
      if (!res.result || res.result.code !== 0) {
        throw new Error((res.result && res.result.msg) || '图片上传失败')
      }
      const uploaded = Array.isArray(res.result.data) ? res.result.data[0] : res.result.data
      if (!uploaded || !uploaded.imageUrl) throw new Error('后台未返回图片地址')
      this._updateEditImage(uiKey, {
        serverImageUrl: uploaded.imageUrl,
        previewUrl: this._absoluteImageUrl(uploaded.imageUrl),
        uploadStatus: 'success',
        uploadProgress: 100,
        uploadError: ''
      })
    }).catch((error) => {
      this._updateEditImage(uiKey, {
        uploadStatus: 'failed',
        uploadError: error && error.message ? error.message : '上传失败'
      })
    }).finally(() => {
      this.setData({ uploadingCount: Math.max(0, this.data.uploadingCount - 1) })
    })
  },

  _updateImageUploadProgress(uiKey, progress) {
    this._updateEditImage(uiKey, { uploadProgress: progress })
  },

  _updateEditImage(uiKey, values) {
    const images = this.data.editImages.slice()
    const index = images.findIndex((image) => image.uiKey === uiKey)
    if (index < 0) return
    images[index] = Object.assign({}, images[index], values)
    this.setData({ editImages: images })
  },

  retryStandardImage(e) {
    const uiKey = e.currentTarget.dataset.key
    const image = this.data.editImages.find((item) => item.uiKey === uiKey)
    if (!image || image.uploadStatus === 'uploading') return
    this._updateEditImage(uiKey, { uploadStatus: 'uploading', uploadProgress: 0, uploadError: '' })
    this.setData({ uploadingCount: this.data.uploadingCount + 1 })
    this._uploadStandardImage(uiKey)
  },

  removeStandardImage(e) {
    const index = Number(e.currentTarget.dataset.index)
    const image = this.data.editImages[index]
    if (!image) return
    if (image.isNew) {
      const images = this.data.editImages.slice()
      images.splice(index, 1)
      this.setData({ editImages: images, standardDirty: true })
      return
    }
    wx.showModal({
      title: '失效正式图片',
      content: '正式标准图片不会替换原文件。确认后旧图将失效，如需换图请再上传新图。',
      confirmText: '确认失效',
      success: (res) => {
        if (!res.confirm) return
        const images = this.data.editImages.slice()
        const inactiveImageIds = this.data.inactiveImageIds.concat([image.imageId])
        images.splice(index, 1)
        this.setData({ editImages: images, inactiveImageIds, standardDirty: true })
      }
    })
  },

  previewEditImage(e) {
    const current = e.currentTarget.dataset.url
    const urls = this.data.editImages.map((image) => image.previewUrl).filter(Boolean)
    if (current) wx.previewImage({ current, urls })
  },

  onImageRoleChange(e) {
    const index = Number(e.currentTarget.dataset.index)
    const roleIndex = Number(e.detail.value)
    this._patchImageAt(index, {
      roleIndex,
      imageRole: IMAGE_ROLE_OPTIONS[roleIndex].code,
      roleClass: IMAGE_ROLE_OPTIONS[roleIndex].code.toLowerCase(),
      dirty: true
    })
  },

  onImageBindChange(e) {
    const index = Number(e.currentTarget.dataset.index)
    const bindIndex = Number(e.detail.value)
    const option = this.data.imageBindOptions[bindIndex]
    const item = this.data.editItems.find((editItem) => editItem.uiKey === option.key)
    this._patchImageAt(index, {
      bindIndex,
      linkedItemKey: option.key,
      dimensionCode: item ? item.dimensionCode : 'OTHER',
      dirty: true
    })
  },

  onImageDescriptionInput(e) {
    this._patchImageAt(Number(e.currentTarget.dataset.index), {
      description: e.detail.value,
      dirty: true
    })
  },

  onImageImportanceChange(e) {
    const importanceIndex = Number(e.detail.value)
    this._patchImageAt(Number(e.currentTarget.dataset.index), {
      importanceIndex,
      importanceLevel: IMPORTANCE_OPTIONS[importanceIndex].value,
      dirty: true
    })
  },

  _patchImageAt(index, values) {
    if (!this.data.editImages[index]) return
    const images = this.data.editImages.slice()
    images[index] = Object.assign({}, images[index], values)
    this.setData({ editImages: images, standardDirty: true })
  },

  saveStandard() {
    if (this.data.savingStandard) return
    if (this.data.uploadingCount > 0) {
      wx.showToast({ title: '请等待图片上传完成', icon: 'none' })
      return
    }
    if (this.data.editImages.some((image) => image.uploadStatus === 'failed')) {
      wx.showToast({ title: '请重试或移除上传失败的图片', icon: 'none' })
      return
    }

    const emptyItem = this.data.editItems.find((item) => !String(item.requirementText || '').trim())
    if (emptyItem) {
      wx.showToast({ title: '请填写完整的文字要求', icon: 'none' })
      return
    }

    const changedItems = this.data.editItems.filter((item) => item.isNew || item.dirty)
    const changedImages = this.data.editImages.filter((image) => image.isNew || image.dirty)
    const changeCount = changedItems.length + changedImages.length +
      this.data.inactiveItemIds.length + this.data.inactiveImageIds.length
    if (!changeCount) {
      wx.showToast({ title: '没有需要保存的变化', icon: 'none' })
      return
    }

    const items = changedItems.map((item) => ({
      itemId: item.isNew ? null : item.itemId,
      clientKey: item.isNew ? item.clientKey : null,
      dimensionCode: item.dimensionCode,
      dimensionName: item.dimensionCode === 'OTHER' ? (item.dimensionName || '其他') : null,
      requirementText: String(item.requirementText).trim(),
      importanceLevel: item.importanceLevel,
      sort: item.sort,
      sourceType: item.isNew ? 'MANUAL' : null
    }))

    const images = changedImages.map((image) => {
      const linkedItem = this.data.editItems.find((item) => item.uiKey === image.linkedItemKey)
      const payload = {
        imageId: image.isNew ? null : image.imageId,
        standardItemId: linkedItem && !linkedItem.isNew ? linkedItem.itemId : null,
        standardItemClientKey: linkedItem && linkedItem.isNew ? linkedItem.clientKey : null,
        clearStandardItem: !image.isNew && !linkedItem,
        dimensionCode: linkedItem ? linkedItem.dimensionCode : (image.dimensionCode || 'OTHER'),
        imageRole: image.imageRole,
        description: String(image.description || '').trim(),
        importanceLevel: image.importanceLevel,
        sort: image.sort,
        sourceType: image.isNew ? 'MANUAL' : null
      }
      if (image.isNew) payload.imageUrl = image.serverImageUrl
      return payload
    })

    const request = {
      distributerId: this.data.distributerId,
      operatorUserId: this.data.operatorUserId,
      confirmed: true,
      changeReason: '小程序维护客户商品标准',
      sourceType: 'MANUAL',
      items,
      images,
      inactiveItemIds: this.data.inactiveItemIds,
      inactiveImageIds: this.data.inactiveImageIds
    }

    this.setData({ savingStandard: true })
    saveDepartmentGoodsStandard(this.data.departmentDisGoodsId, request)
      .then((res) => {
        if (!res.result || res.result.code !== 0) {
          throw new Error((res.result && res.result.msg) || '保存失败')
        }
        this.setData({
          pageMode: 'view',
          pageLoading: true,
          pageError: '',
          standardDirty: false
        })
        return this._loadCurrentStandard()
      })
      .then(() => {
        this.setData({ pageLoading: false, savingStandard: false })
        wx.showToast({ title: '保存成功', icon: 'success' })
      })
      .catch((error) => {
        this.setData({ savingStandard: false, pageLoading: false })
        wx.showToast({
          title: error && error.message ? error.message : '保存失败',
          icon: 'none',
          duration: 2500
        })
      })
  },

  openHistory() {
    this.setData({ pageMode: 'history', historyLoading: true, historyList: [] })
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
    if (this.data.pageMode === 'history') {
      this.setData({ pageMode: 'view' })
      return
    }
    if (this.data.pageMode === 'edit') {
      this.cancelEdit()
      return
    }
    wx.navigateBack({ delta: 1 })
  },

  cancelEdit() {
    if (!this.data.standardDirty) {
      this.setData({ pageMode: 'view' })
      return
    }
    wx.showModal({
      title: '放弃本次编辑？',
      content: '尚未保存的文字和图片设置将不会生效。',
      confirmText: '放弃',
      success: (res) => {
        if (res.confirm) this.setData({ pageMode: 'view', standardDirty: false })
      }
    })
  }
})

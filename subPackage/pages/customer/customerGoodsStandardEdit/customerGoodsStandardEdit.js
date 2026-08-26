import {
  getDepartmentGoodsStandardDimensions,
  getDepartmentGoodsCurrentStandard,
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
    mode: 'item', // item 文字要求 | image 参考图片
    itemId: null,
    isEditMode: false,
    pageLoading: true,
    pageError: '',
    dimensionOptions: [],
    importanceOptions: IMPORTANCE_OPTIONS,
    imageRoleOptions: IMAGE_ROLE_OPTIONS,
    dimensionIndex: 0,
    importanceIndex: 2,
    requirementText: '',
    images: [],
    removedImageIds: [],
    uploadingCount: 0,
    saving: false
  },

  onLoad(options) {
    const app = getApp()
    const globalData = app.globalData || {}
    const userInfo = wx.getStorageSync('userInfo')
    const distributerEntity = userInfo && userInfo.nxDistributerEntity
    const departmentDisGoodsId = Number(options.departmentDisGoodsId || options.depDisGoodsId)
    const itemId = Number(options.itemId || 0)
    const mode = options.mode === 'image' ? 'image' : 'item'

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
      mode,
      itemId: itemId || null,
      isEditMode: !!itemId
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
      .then(() => {
        if (this.data.isEditMode || this.data.mode === 'image') {
          return this._loadCurrentStandard()
        }
        return Promise.resolve()
      })
      .then(() => this.setData({ pageLoading: false }))
      .catch((error) => {
        this.setData({
          pageLoading: false,
          pageError: error && error.message ? error.message : '标准加载失败'
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
      this.setData({ dimensionOptions: options })
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
      const rawItems = Array.isArray(current.items) ? current.items : []
      const rawImages = Array.isArray(current.images) ? current.images : []

      if (this.data.mode === 'image') {
        // 参考图片模式：未绑定具体要求的整体图
        const images = rawImages
          .filter((image) => !image.nxDdgimgStandardItemId)
          .map((image) => this._toEditImage(image))
        this.setData({ images })
      } else {
        // item 模式
        const itemId = this.data.itemId
        const target = rawItems.find((item) => Number(item.nxDdgsiId) === Number(itemId))
        if (!target) throw new Error('未找到该客户要求，可能已被删除')
        const dimensionCode = target.nxDdgsiDimensionCode || 'OTHER'
        const dimensionIndex = Math.max(0, this.data.dimensionOptions.findIndex((o) => o.code === dimensionCode))
        const importance = Number(target.nxDdgsiImportanceLevel || 3)
        const importanceIndex = Math.max(0, IMPORTANCE_OPTIONS.findIndex((o) => o.value === importance))
        const images = rawImages
          .filter((image) => String(image.nxDdgimgStandardItemId || '') === String(itemId))
          .map((image) => this._toEditImage(image))
        this.setData({
          dimensionIndex,
          importanceIndex,
          requirementText: target.nxDdgsiRequirementText || '',
          images
        })
      }
    })
  },

  _toEditImage(image) {
    const imageUrl = image.nxDdgimgImageUrl || ''
    const role = image.nxDdgimgImageRole || 'REFERENCE'
    const importanceLevel = Number(image.nxDdgimgImportanceLevel || 3)
    return {
      imageId: image.nxDdgimgId || null,
      clientKey: uuid(),
      previewUrl: imageUrl,
      localPath: '',
      uploadStatus: 'done',
      progress: 100,
      imageRole: role,
      roleIndex: Math.max(0, IMAGE_ROLE_OPTIONS.findIndex((o) => o.code === role)),
      importanceLevel,
      importanceIndex: Math.max(0, IMPORTANCE_OPTIONS.findIndex((o) => o.value === importanceLevel)),
      description: image.nxDdgimgDescription || '',
      sort: Number(image.nxDdgimgSort || 0),
      isNew: false
    }
  },

  // —— 表单 ——

  onDimensionChange(e) {
    this.setData({ dimensionIndex: Number(e.detail.value) })
  },

  onImportanceChange(e) {
    this.setData({ importanceIndex: Number(e.detail.value) })
  },

  onRequirementInput(e) {
    this.setData({ requirementText: e.detail.value })
  },

  onImageRoleChange(e) {
    const index = Number(e.currentTarget.dataset.index)
    const value = Number(e.detail.value)
    const role = this.data.imageRoleOptions[value]
    if (!role || this.data.images[index] === undefined) return
    this.setData({
      ['images[' + index + '].imageRole']: role.code,
      ['images[' + index + '].roleIndex']: value
    })
  },

  onImageImportanceChange(e) {
    const index = Number(e.currentTarget.dataset.index)
    const value = Number(e.detail.value)
    const option = this.data.importanceOptions[value]
    if (!option || this.data.images[index] === undefined) return
    this.setData({
      ['images[' + index + '].importanceLevel']: option.value,
      ['images[' + index + '].importanceIndex']: value
    })
  },

  onImageDescriptionInput(e) {
    const index = Number(e.currentTarget.dataset.index)
    if (this.data.images[index] === undefined) return
    this.setData({
      ['images[' + index + '].description']: e.detail.value
    })
  },

  // —— 图片 ——

  chooseImages() {
    if (this.data.saving || this.data.uploadingCount > 0) return
    const remaining = 9 - this.data.images.length
    if (remaining <= 0) {
      wx.showToast({ title: '最多上传 9 张图片', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const files = res.tempFiles || []
        if (!files.length) return
        const newImages = files.map((file) => ({
          imageId: null,
          clientKey: uuid(),
          previewUrl: file.tempFilePath,
          localPath: file.tempFilePath,
          uploadStatus: 'pending',
          progress: 0,
          imageRole: this.data.mode === 'image' ? 'REFERENCE' : 'PASS',
          roleIndex: this.data.mode === 'image'
            ? IMAGE_ROLE_OPTIONS.findIndex((o) => o.code === 'REFERENCE')
            : IMAGE_ROLE_OPTIONS.findIndex((o) => o.code === 'PASS'),
          description: '',
          importanceLevel: 3,
          importanceIndex: IMPORTANCE_OPTIONS.findIndex((o) => o.value === 3),
          sort: 0,
          isNew: true
        }))
        const images = this.data.images.concat(newImages)
        this.setData({ images })
        newImages.forEach((image, offset) => {
          const index = this.data.images.length - newImages.length + offset
          this._uploadImage(index)
        })
      }
    })
  },

  _uploadImage(index) {
    const image = this.data.images[index]
    if (!image || image.uploadStatus === 'uploading') return
    this.setData({ uploadingCount: this.data.uploadingCount + 1 })
    this._patchImage(index, { uploadStatus: 'uploading', progress: 0 })
    uploadDepartmentGoodsStandardImage({
      departmentDisGoodsId: this.data.departmentDisGoodsId,
      distributerId: this.data.distributerId,
      operatorUserId: this.data.operatorUserId,
      filePath: image.localPath,
      onProgress: (event) => {
        this._patchImage(index, { progress: event.progress || 0 })
      }
    }).then((res) => {
      if (!res.result || res.result.code !== 0) {
        throw new Error((res.result && res.result.msg) || '图片上传失败')
      }
      const uploaded = res.result.data && res.result.data[0]
      const uploadedUrl = uploaded && (uploaded.fileUrl || uploaded.url || uploaded.imageUrl)
      if (!uploadedUrl) throw new Error('图片上传结果异常')
      this._patchImage(index, {
        uploadStatus: 'done',
        progress: 100,
        previewUrl: uploadedUrl,
        imageUrl: uploadedUrl
      })
    }).catch((error) => {
      this._patchImage(index, { uploadStatus: 'failed' })
      wx.showToast({
        title: error && error.message ? error.message : '图片上传失败',
        icon: 'none'
      })
    }).finally(() => {
      this.setData({ uploadingCount: Math.max(0, this.data.uploadingCount - 1) })
    })
  },

  retryUploadImage(e) {
    const index = Number(e.currentTarget.dataset.index)
    const image = this.data.images[index]
    if (!image || image.uploadStatus !== 'failed') return
    this._uploadImage(index)
  },

  removeImage(e) {
    const index = Number(e.currentTarget.dataset.index)
    const image = this.data.images[index]
    if (!image || this.data.saving) return
    if (this.data.uploadingCount > 0) {
      wx.showToast({ title: '图片上传中，请稍候', icon: 'none' })
      return
    }
    wx.showModal({
      title: '移除图片',
      content: image.imageId ? '该图片将从参考图库移除，确定？' : '确定移除这张图片？',
      confirmText: '移除',
      success: (modal) => {
        if (!modal.confirm) return
        const images = this.data.images.slice()
        images.splice(index, 1)
        const removedImageIds = this.data.removedImageIds.slice()
        if (image.imageId && removedImageIds.indexOf(image.imageId) < 0) {
          removedImageIds.push(image.imageId)
        }
        this.setData({ images, removedImageIds })
      }
    })
  },

  previewImage(e) {
    const current = e.currentTarget.dataset.url
    const urls = this.data.images.map((image) => image.previewUrl)
    if (!current) return
    wx.previewImage({ current, urls: urls.length ? urls : [current] })
  },

  _patchImage(index, patch) {
    if (this.data.images[index] === undefined) return
    this.setData({
      ['images[' + index + ']']: Object.assign({}, this.data.images[index], patch)
    })
  },

  // —— 保存 / 删除 ——

  _validate() {
    if (this.data.mode === 'item') {
      const text = String(this.data.requirementText || '').trim()
      if (!text) {
        wx.showToast({ title: '请填写客户要求内容', icon: 'none' })
        return false
      }
    }
    const pending = this.data.images.filter((image) => image.uploadStatus !== 'done')
    if (pending.length) {
      wx.showToast({ title: '有图片尚未上传完成', icon: 'none' })
      return false
    }
    return true
  },

  _buildPayload() {
    const common = {
      distributerId: this.data.distributerId,
      operatorUserId: this.data.operatorUserId,
      operatorName: this.data.operatorName,
      confirmed: true,
      changeReason: '',
      sourceType: 'MANUAL'
    }

    if (this.data.mode === 'item') {
      const dimensionCode = this.data.dimensionOptions[this.data.dimensionIndex]
        ? this.data.dimensionOptions[this.data.dimensionIndex].code : 'OTHER'
      const importanceLevel = this.data.importanceOptions[this.data.importanceIndex].value
      const itemClientKey = uuid()
      const items = [{
        itemId: this.data.itemId || null,
        clientKey: itemClientKey,
        dimensionCode,
        requirementText: String(this.data.requirementText || '').trim(),
        importanceLevel,
        sort: 1,
        sourceType: 'MANUAL'
      }]
      // 图片绑定到当前这条要求：
      //  - 已有图片（imageId 存在）已绑定，保留即可
      //  - 新上传图片通过 standardItemClientKey / standardItemId 绑定到本条
      const images = this.data.images.map((image) => {
        const mutation = {
          imageId: image.imageId || null,
          clientKey: image.clientKey,
          imageUrl: image.previewUrl,
          imageRole: image.imageRole,
          description: image.description,
          importanceLevel: image.importanceLevel,
          sort: image.sort
        }
        if (!image.imageId) {
          if (this.data.itemId) {
            mutation.standardItemId = this.data.itemId
          } else {
            mutation.standardItemClientKey = itemClientKey
          }
        }
        return mutation
      })
      return Object.assign({}, common, {
        items,
        images,
        inactiveItemIds: [],
        inactiveImageIds: this.data.removedImageIds
      })
    }

    const images = this.data.images.map((image) => ({
      imageId: image.imageId || null,
      clientKey: image.clientKey,
      imageUrl: image.previewUrl,
      imageRole: image.imageRole,
      description: image.description,
      importanceLevel: image.importanceLevel,
      sort: image.sort,
      dimensionCode: 'OTHER'
    }))
    return Object.assign({}, common, {
      items: [],
      images,
      inactiveItemIds: [],
      inactiveImageIds: this.data.removedImageIds
    })
  },

  saveEdit() {
    if (!this._validate() || this.data.saving) return
    this.setData({ saving: true })
    wx.showLoading({ title: '正在保存' })
    saveDepartmentGoodsStandard(this.data.departmentDisGoodsId, this._buildPayload())
      .then((res) => {
        if (!res.result || res.result.code !== 0) {
          throw new Error((res.result && res.result.msg) || '保存失败')
        }
        wx.hideLoading()
        wx.showToast({ title: '保存成功', icon: 'success' })
        setTimeout(() => wx.navigateBack({ delta: 1 }), 900)
      })
      .catch((error) => {
        wx.hideLoading()
        this.setData({ saving: false })
        wx.showToast({
          title: error && error.message ? error.message : '保存失败',
          icon: 'none',
          duration: 2500
        })
      })
  },

  deleteItem() {
    if (!this.data.isEditMode || this.data.saving) return
    wx.showModal({
      title: '删除客户要求',
      content: '该条客户要求及其关联图片将被删除，确定？',
      confirmText: '删除',
      confirmColor: '#d63e3e',
      success: (modal) => {
        if (!modal.confirm) return
        this.setData({ saving: true })
        wx.showLoading({ title: '正在删除' })
        saveDepartmentGoodsStandard(this.data.departmentDisGoodsId, {
          distributerId: this.data.distributerId,
          operatorUserId: this.data.operatorUserId,
          operatorName: this.data.operatorName,
          confirmed: true,
          changeReason: '',
          sourceType: 'MANUAL',
          items: [],
          images: [],
          inactiveItemIds: [this.data.itemId],
          inactiveImageIds: this.data.images
            .filter((image) => image.imageId)
            .map((image) => image.imageId)
            .concat(this.data.removedImageIds)
        }).then((res) => {
          if (!res.result || res.result.code !== 0) {
            throw new Error((res.result && res.result.msg) || '删除失败')
          }
          wx.hideLoading()
          wx.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => wx.navigateBack({ delta: 1 }), 900)
        }).catch((error) => {
          wx.hideLoading()
          this.setData({ saving: false })
          wx.showToast({
            title: error && error.message ? error.message : '删除失败',
            icon: 'none',
            duration: 2500
          })
        })
      }
    })
  },

  toBack() {
    wx.navigateBack({ delta: 1 })
  }
})

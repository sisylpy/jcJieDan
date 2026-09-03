import {
  getAfterSalesDictionaries,
  createDepartmentAfterSales,
  createSalesReturnWithAfterSales,
  uploadDepartmentAfterSalesImage
} from '../../../../lib/apiDistributer'

Page({
  data: {
    navBarHeight: 0,
    distributerId: null,
    operatorUserId: null,
    draft: null,
    orders: [],
    severityOptions: [],
    issueTypeOptions: [],
    severity: 'MEDIUM',
    issueType: 'QUALITY',
    issueScopeMode: 'ITEM',
    issueScope: 'ITEM',
    description: '',
    photos: [],
    photoTargetOptions: [{ label: '整张售后', departmentDisGoodsId: null }],
    photoTargetIndex: 0,
    saving: false,
    loading: true,
    isReturn: false,
    returnSourceType: 'POST_DELIVERY'
  },

  onLoad() {
    var app = getApp()
    var user = wx.getStorageSync('userInfo') || {}
    var dis = user.nxDistributerEntity || {}
    var draft = wx.getStorageSync('afterSalesCreateDraft')
    if (!draft || !Array.isArray(draft.orders) || !draft.orders.length) {
      wx.showToast({ title: '缺少原配送订单信息', icon: 'none' })
      setTimeout(function () { wx.navigateBack({ delta: 1 }) }, 1200)
      return
    }
    this.setData({
      navBarHeight: (app.globalData.navBarHeight || 0) * (app.globalData.rpxR || 1),
      distributerId: dis.nxDistributerId,
      operatorUserId: user.nxDistributerUserId,
      draft: draft,
      orders: draft.orders.map(function (item) {
        return Object.assign({}, item, { returnQuantity: item.quantity || '' })
      }),
      isReturn: draft.resolutionIntent === 'RETURN',
      photoTargetOptions: this.buildPhotoTargets(draft.orders),
      photoTargetIndex: this.buildPhotoTargets(draft.orders).length === 2 ? 1 : 0
    })
    getAfterSalesDictionaries().then((res) => {
      if (!res.result || res.result.code !== 0) throw new Error((res.result && res.result.msg) || '字典加载失败')
      var data = res.result.data || {}
      var issueTypeOptions = data.issueTypes || []
      var currentType = issueTypeOptions.filter((item) => item.code === this.data.issueType)[0] || {}
      var scopeMode = currentType.scopeMode || 'ITEM'
      this.setData({
        loading: false,
        severityOptions: data.severities || [],
        issueTypeOptions: issueTypeOptions,
        issueScopeMode: scopeMode,
        issueScope: this.data.isReturn ? 'ITEM' : (scopeMode === 'ORDER' ? 'ORDER' : 'ITEM')
      })
    }).catch((error) => {
      this.setData({ loading: false })
      wx.showToast({ title: error.message || '字典加载失败', icon: 'none' })
    })
  },

  toggleOrder(e) {
    var index = Number(e.currentTarget.dataset.index)
    var key = 'orders[' + index + '].selected'
    this.setData({ [key]: !this.data.orders[index].selected }, () => {
      var targets = this.buildPhotoTargets(this.data.orders)
      this.setData({ photoTargetOptions: targets, photoTargetIndex: targets.length === 2 ? 1 : 0 })
    })
  },

  buildPhotoTargets(orders) {
    var targets = [{ label: '整张售后', departmentDisGoodsId: null }]
    ;(orders || []).filter(function (item) { return item.selected }).forEach(function (item) {
      targets.push({ label: item.goodsName || '问题商品', departmentDisGoodsId: item.departmentDisGoodsId })
    })
    return targets
  },

  onPhotoTargetChange(e) { this.setData({ photoTargetIndex: Number(e.detail.value) }) },

  selectSeverity(e) { this.setData({ severity: e.currentTarget.dataset.code }) },
  selectIssueType(e) {
    var code = e.currentTarget.dataset.code
    var option = this.data.issueTypeOptions.filter(function (item) { return item.code === code })[0] || {}
    var scopeMode = option.scopeMode || 'ITEM'
    this.setData({
      issueType: code,
      issueScopeMode: scopeMode,
      issueScope: scopeMode === 'ORDER' || scopeMode === 'FLEXIBLE' ? 'ORDER' : 'ITEM'
    })
  },
  selectIssueScope(e) { this.setData({ issueScope: e.currentTarget.dataset.scope }) },
  onDescriptionInput(e) { this.setData({ description: e.detail.value }) },
  onReturnQuantityInput(e) { this.setData({ ['orders[' + Number(e.currentTarget.dataset.index) + '].returnQuantity']: e.detail.value }) },

  choosePhotos() {
    var remaining = 20 - this.data.photos.length
    if (remaining <= 0) {
      wx.showToast({ title: '一次最多20张问题照片', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: Math.min(9, remaining),
      mediaType: ['image'],
      sizeType: ['original', 'compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        var tooLarge = 0
        var unsupported = 0
        var target = this.data.photoTargetOptions[this.data.photoTargetIndex] || this.data.photoTargetOptions[0]
        var additions = (res.tempFiles || []).filter(function (file) {
          var path = String(file.tempFilePath || '').toLowerCase()
          var extension = (path.match(/\.([a-z0-9]+)(?:\?|$)/) || [])[1]
          if (file.size && file.size > 10 * 1024 * 1024) { tooLarge += 1; return false }
          if (extension && ['jpg', 'jpeg', 'png', 'webp'].indexOf(extension) < 0) { unsupported += 1; return false }
          return true
        }).map(function (file) {
          return {
            path: file.tempFilePath, progress: 0, status: 'waiting', statusText: '待上传',
            targetLabel: target.label, departmentDisGoodsId: target.departmentDisGoodsId
          }
        })
        if (tooLarge || unsupported) {
          var messages = []
          if (tooLarge) messages.push(tooLarge + '张超过10MB')
          if (unsupported) messages.push(unsupported + '张格式不支持')
          wx.showToast({ title: messages.join('，'), icon: 'none' })
        }
        this.setData({ photos: this.data.photos.concat(additions) })
      },
      fail: function (error) {
        if (!error.errMsg || error.errMsg.indexOf('cancel') < 0) wx.showToast({ title: '选择图片失败', icon: 'none' })
      }
    })
  },

  previewPhoto(e) {
    wx.previewImage({ current: e.currentTarget.dataset.url, urls: this.data.photos.map(function (item) { return item.path }) })
  },

  removePhoto(e) {
    var photos = this.data.photos.slice()
    photos.splice(Number(e.currentTarget.dataset.index), 1)
    this.setData({ photos: photos })
  },

  save() {
    if (this.data.saving) return
    var selected = this.data.orders.filter(function (item) { return item.selected })
    if (this.data.issueScope === 'ITEM' && !selected.length) {
      wx.showToast({ title: '请选择问题商品', icon: 'none' })
      return
    }
    if (!this.data.description.trim()) {
      wx.showToast({ title: '请填写问题说明', icon: 'none' })
      return
    }
    if (this.data.isReturn) {
      for (var ri = 0; ri < selected.length; ri++) {
        var requested = Number(selected[ri].returnQuantity)
        var maximum = Number(selected[ri].quantity)
        if (!requested || requested <= 0 || (maximum > 0 && requested > maximum)) {
          wx.showToast({ title: '请正确填写退货数量，不能超过原配送数量', icon: 'none' })
          return
        }
      }
    }
    var anchorId = this.data.draft.anchorHistoryOrderId
    var anchor = this.data.orders.filter(function (item) {
      return String(item.historyOrderId) === String(anchorId)
    })[0] || selected[0] || this.data.orders[0]
    if (!anchor || !anchor.historyOrderId) {
      wx.showToast({ title: '缺少原订单信息', icon: 'none' })
      return
    }
    var itemScoped = this.data.issueScope === 'ITEM'
    var request = {
      distributerId: this.data.distributerId,
      operatorUserId: this.data.operatorUserId,
      originalHistoryOrderId: anchor.historyOrderId,
      severity: this.data.severity,
      issueType: this.data.issueType,
      issueScope: this.data.issueScope,
      issueDescription: this.data.description.trim(),
      items: itemScoped ? selected.map((item) => ({
        originalHistoryOrderId: item.historyOrderId,
        departmentDisGoodsId: item.departmentDisGoodsId,
        issueQuantity: item.quantity ? item.quantity + (item.standard || '') : '',
        issueTag: this.data.issueType,
        issueDescription: this.data.description.trim()
      })) : []
    }
    if (this.data.draft.originalShipmentTaskId) {
      request.originalShipmentTaskId = this.data.draft.originalShipmentTaskId
    }
    this.setData({ saving: true })
    wx.showLoading({ title: this.data.isReturn ? '提交退货申请' : '创建售后' })
    var createPromise = this.data.isReturn
      ? createSalesReturnWithAfterSales({
        afterSales: request,
        sourceType: this.data.returnSourceType,
        reason: this.data.description.trim(),
        requestKey: 'RETURN-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10),
        items: selected.map(function (item) {
          return { originalHistoryOrderId: item.historyOrderId,
            requestedQuantity: String(item.returnQuantity || ''), reason: request.issueDescription }
        })
      })
      : createDepartmentAfterSales(request)
    createPromise.then((res) => {
      if (!res.result || res.result.code !== 0) throw new Error((res.result && res.result.msg) || '创建售后失败')
      var payload = res.result.data || {}
      var detail = this.data.isReturn ? (payload.afterSales || {}) : payload
      var afterSalesId = detail.nxDasId
      if (!afterSalesId) throw new Error('后台未返回售后单ID')
      if (!this.data.photos.length) return { afterSalesId: afterSalesId, failed: 0 }
      return this.uploadPhotos(afterSalesId, detail.items || []).then(function (failed) {
        return { afterSalesId: afterSalesId, failed: failed }
      })
    }).then((result) => {
      wx.hideLoading()
      this.setData({ saving: false })
      var nameCache = wx.getStorageSync('afterSalesCustomerNames') || {}
      nameCache[String(result.afterSalesId)] = this.data.draft.customerName || ''
      wx.setStorageSync('afterSalesCustomerNames', nameCache)
      wx.removeStorageSync('afterSalesCreateDraft')
      if (result.failed) wx.showToast({ title: result.failed + '张照片上传失败，可在详情补传', icon: 'none' })
      else wx.showToast({ title: this.data.isReturn ? '退货申请已提交' : '售后已创建', icon: 'success' })
      setTimeout(function () {
        wx.redirectTo({ url: '../detail/detail?afterSalesId=' + result.afterSalesId })
      }, result.failed ? 1500 : 500)
    }).catch((error) => {
      wx.hideLoading()
      this.setData({ saving: false })
      wx.showToast({ title: error.message || '创建失败', icon: 'none' })
    })
  },

  uploadPhotos(afterSalesId, afterSalesItems) {
    var itemIdByGoods = {}
    ;(afterSalesItems || []).forEach(function (item) {
      itemIdByGoods[String(item.nxDasiDepartmentDisGoodsId)] = item.nxDasiId
    })
    var jobs = this.data.photos.map((photo, index) => {
      var statusKey = 'photos[' + index + '].status'
      var textKey = 'photos[' + index + '].statusText'
      this.setData({ [statusKey]: 'uploading', [textKey]: '上传中' })
      return uploadDepartmentAfterSalesImage({
        afterSalesId: afterSalesId,
        distributerId: this.data.distributerId,
        operatorUserId: this.data.operatorUserId,
        afterSalesItemId: photo.departmentDisGoodsId ? itemIdByGoods[String(photo.departmentDisGoodsId)] : null,
        stage: 'EVIDENCE',
        description: this.data.description.trim(),
        filePath: photo.path,
        onProgress: (progress) => this.setData({
          ['photos[' + index + '].progress']: progress.progress,
          ['photos[' + index + '].statusText']: '上传中 ' + progress.progress + '%'
        })
      }).then((res) => {
        if (!res.result || res.result.code !== 0) throw new Error((res.result && res.result.msg) || '上传失败')
        this.setData({ [statusKey]: 'success', [textKey]: '已上传' })
        return false
      }).catch(() => {
        this.setData({ [statusKey]: 'failed', [textKey]: '上传失败' })
        return true
      })
    })
    return Promise.all(jobs).then(function (results) { return results.filter(Boolean).length })
  },

  toBack() { wx.navigateBack({ delta: 1 }) }
})

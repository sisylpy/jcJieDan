import {
  getAfterSalesDictionaries,
  createDepartmentAfterSales,
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
    description: '',
    photos: [],
    saving: false,
    loading: true
  },

  onLoad() {
    var app = getApp()
    var user = wx.getStorageSync('userInfo') || {}
    var dis = user.nxDistributerEntity || {}
    var draft = wx.getStorageSync('afterSalesCreateDraft')
    if (!draft || !draft.originalShipmentTaskId || !Array.isArray(draft.orders) || !draft.orders.length) {
      wx.showToast({ title: '缺少原配送订单信息', icon: 'none' })
      setTimeout(function () { wx.navigateBack({ delta: 1 }) }, 1200)
      return
    }
    this.setData({
      navBarHeight: (app.globalData.navBarHeight || 0) * (app.globalData.rpxR || 1),
      distributerId: dis.nxDistributerId,
      operatorUserId: user.nxDistributerUserId,
      draft: draft,
      orders: draft.orders
    })
    getAfterSalesDictionaries().then((res) => {
      if (!res.result || res.result.code !== 0) throw new Error((res.result && res.result.msg) || '字典加载失败')
      var data = res.result.data || {}
      this.setData({
        loading: false,
        severityOptions: data.severities || [],
        issueTypeOptions: data.issueTypes || []
      })
    }).catch((error) => {
      this.setData({ loading: false })
      wx.showToast({ title: error.message || '字典加载失败', icon: 'none' })
    })
  },

  toggleOrder(e) {
    var index = Number(e.currentTarget.dataset.index)
    var key = 'orders[' + index + '].selected'
    this.setData({ [key]: !this.data.orders[index].selected })
  },

  selectSeverity(e) { this.setData({ severity: e.currentTarget.dataset.code }) },
  selectIssueType(e) { this.setData({ issueType: e.currentTarget.dataset.code }) },
  onDescriptionInput(e) { this.setData({ description: e.detail.value }) },

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
        var additions = (res.tempFiles || []).filter(function (file) {
          var path = String(file.tempFilePath || '').toLowerCase()
          var extension = (path.match(/\.([a-z0-9]+)(?:\?|$)/) || [])[1]
          if (file.size && file.size > 10 * 1024 * 1024) { tooLarge += 1; return false }
          if (extension && ['jpg', 'jpeg', 'png', 'webp'].indexOf(extension) < 0) { unsupported += 1; return false }
          return true
        }).map(function (file) {
          return { path: file.tempFilePath, progress: 0, status: 'waiting', statusText: '待上传' }
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
    if (!selected.length) {
      wx.showToast({ title: '请选择问题商品', icon: 'none' })
      return
    }
    if (!this.data.description.trim()) {
      wx.showToast({ title: '请填写问题说明', icon: 'none' })
      return
    }
    var first = selected[0]
    var request = {
      distributerId: this.data.distributerId,
      operatorUserId: this.data.operatorUserId,
      originalShipmentTaskId: this.data.draft.originalShipmentTaskId,
      originalHistoryOrderId: first.historyOrderId,
      severity: this.data.severity,
      issueType: this.data.issueType,
      items: selected.map((item) => ({
        originalHistoryOrderId: item.historyOrderId,
        departmentDisGoodsId: item.departmentDisGoodsId,
        issueQuantity: item.quantity ? item.quantity + (item.standard || '') : '',
        issueTag: this.data.issueType,
        issueDescription: this.data.description.trim()
      }))
    }
    this.setData({ saving: true })
    wx.showLoading({ title: '创建售后' })
    createDepartmentAfterSales(request).then((res) => {
      if (!res.result || res.result.code !== 0) throw new Error((res.result && res.result.msg) || '创建售后失败')
      var detail = res.result.data || {}
      var afterSalesId = detail.nxDasId
      var afterSalesItemId = detail.items && detail.items[0] && detail.items[0].nxDasiId
      if (!afterSalesId) throw new Error('后台未返回售后单ID')
      if (!this.data.photos.length) return { afterSalesId: afterSalesId, failed: 0 }
      return this.uploadPhotos(afterSalesId, afterSalesItemId).then(function (failed) {
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
      else wx.showToast({ title: '售后已创建', icon: 'success' })
      setTimeout(function () {
        wx.redirectTo({ url: '../detail/detail?afterSalesId=' + result.afterSalesId })
      }, result.failed ? 1500 : 500)
    }).catch((error) => {
      wx.hideLoading()
      this.setData({ saving: false })
      wx.showToast({ title: error.message || '创建失败', icon: 'none' })
    })
  },

  uploadPhotos(afterSalesId, afterSalesItemId) {
    var jobs = this.data.photos.map((photo, index) => {
      var statusKey = 'photos[' + index + '].status'
      var textKey = 'photos[' + index + '].statusText'
      this.setData({ [statusKey]: 'uploading', [textKey]: '上传中' })
      return uploadDepartmentAfterSalesImage({
        afterSalesId: afterSalesId,
        distributerId: this.data.distributerId,
        operatorUserId: this.data.operatorUserId,
        afterSalesItemId: afterSalesItemId,
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

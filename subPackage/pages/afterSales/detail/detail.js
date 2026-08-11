import apiUrl from '../../../../config.js'
import {
  getAfterSalesDictionaries,
  getDepartmentAfterSalesDetail,
  addDepartmentAfterSalesAction,
  createAfterSalesReplenishment,
  deliverAfterSalesReplenishment,
  confirmDepartmentAfterSales,
  completeDepartmentAfterSales,
  writebackAfterSalesStandard,
  uploadDepartmentAfterSalesImage,
  getDepartmentGoodsStandardDimensions,
  getAfterSalesCompensationCoupons,
  grantAfterSalesCompensation
} from '../../../../lib/apiDistributer'
import { getDrivers } from '../../../../lib/apiRouteDispatch'

const DIMENSION_LABELS = {
  SIZE: '大小', COLOR: '颜色', FRESHNESS: '新鲜度', ROOT: '根部',
  PACKAGING: '包装', SUBSTITUTE: '替代', OTHER: '其他'
}

const COMP_TYPE_LABELS = {
  quality: '商品质量', delivery_delay: '配送延迟', out_of_stock: '缺货',
  service_complaint: '服务投诉', other: '其他'
}

function formatTime(value) {
  if (!value) return ''
  return String(value).replace('T', ' ').slice(5, 16)
}

function absoluteImage(url) {
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return String(apiUrl.server || '').replace(/\/$/, '') + '/' + String(url).replace(/^\//, '')
}

Page({
  data: {
    navBarHeight: 0,
    afterSalesId: null,
    customerName: '',
    customerDisplayName: '',
    distributerId: null,
    operatorUserId: null,
    loading: true,
    errorText: '',
    detail: null,
    items: [],
    images: [],
    evidenceImages: [],
    processImages: [],
    resultImages: [],
    actions: [],
    replenishments: [],
    severityMap: {}, issueTypeMap: {}, statusMap: {}, actionTypeMap: {}, confirmMap: {},
    actionOptions: [],
    drivers: [],
    dimensionOptions: [],
    importanceOptions: ['1 普通', '2 注意', '3 重要', '4 重点', '5 关键'],
    showActionForm: false,
    actionType: 'COMMUNICATION', actionRemark: '', actionResult: '',
    showReplenishmentForm: false,
    replenishmentItemIndex: 0, replenishmentQuantity: '', replenishmentStandard: '斤', driverIndex: 0,
    showCompensationForm: false,
    compensationCoupons: [], compensationCouponIndex: 0, compensationRemark: '',
    showWritebackForm: false,
    writebackItemIndex: 0, writebackDimensionIndex: 0, writebackRequirement: '', writebackImportance: 5,
    selectedWritebackImageIds: [],
    submitting: false,
    hasWrittenBack: false
  },

  onLoad(options) {
    var app = getApp()
    var user = wx.getStorageSync('userInfo') || {}
    var dis = user.nxDistributerEntity || {}
    var customerCache = wx.getStorageSync('afterSalesCustomerNames') || {}
    var afterSalesId = Number(options.afterSalesId)
    var customerName = decodeURIComponent(options.customerName || customerCache[String(afterSalesId)] || '')
    this.setData({
      navBarHeight: (app.globalData.navBarHeight || 0) * (app.globalData.rpxR || 1),
      afterSalesId: afterSalesId,
      customerName: customerName,
      customerDisplayName: customerName,
      distributerId: dis.nxDistributerId,
      operatorUserId: user.nxDistributerUserId
    })
    this.loadInitial()
  },

  onPullDownRefresh() { this.loadDetail(true) },

  onShow() {
    if (this._shownOnce) this.loadCompensationCoupons()
    this._shownOnce = true
  },

  scope() { return { distributerId: this.data.distributerId, operatorUserId: this.data.operatorUserId } },

  loadInitial() {
    Promise.all([
      getAfterSalesDictionaries(),
      getDrivers({ disId: this.data.distributerId }),
      getDepartmentGoodsStandardDimensions(),
      getAfterSalesCompensationCoupons(this.scope())
    ])
      .then((results) => {
        var dict = results[0].result || {}
        if (dict.code !== 0) throw new Error(dict.msg || '字典加载失败')
        var data = dict.data || {}
        var driverResult = results[1].result || {}
        var dimensionResult = results[2].result || {}
        var compensationResult = results[3].result || {}
        this.setData({
          severityMap: this.toMap(data.severities), issueTypeMap: this.toMap(data.issueTypes),
          statusMap: this.toMap(data.statuses), actionTypeMap: this.toMap(data.actionTypes),
          confirmMap: this.toMap(data.confirmStatuses), actionOptions: data.actionTypes || [],
          drivers: (driverResult.code === 0 ? driverResult.data : []).map(function (driver) {
            return { id: driver.nxDistributerUserId, name: driver.nxDiuWxNickName || ('司机 #' + driver.nxDistributerUserId) }
          }),
          dimensionOptions: (dimensionResult.code === 0 ? dimensionResult.data : []).map(function (code) {
            return { code: code, label: DIMENSION_LABELS[code] || code }
          }),
          compensationCoupons: (compensationResult.code === 0 ? compensationResult.data : []).map(function (coupon) {
            return Object.assign({}, coupon, {
              displayText: coupon.nxDistributerCouponName + ' · ¥' + (coupon.nxDcPrice || '0'),
              compTypeText: COMP_TYPE_LABELS[coupon.nxDcCompType] || '其他',
              validityText: '发放后' + (coupon.nxDcValidityDays || 7) + '天有效'
            })
          })
        })
        return this.loadDetail()
      }).catch((error) => this.setData({ loading: false, errorText: error.message || '加载失败' }))
  },

  toMap(list) { var map = {}; (list || []).forEach(function (item) { map[item.code] = item.label }); return map },

  loadCompensationCoupons() {
    return getAfterSalesCompensationCoupons(this.scope()).then((res) => {
      if (!res.result || res.result.code !== 0) return
      this.setData({
        compensationCoupons: (res.result.data || []).map(function (coupon) {
          return Object.assign({}, coupon, {
            displayText: coupon.nxDistributerCouponName + ' · ¥' + (coupon.nxDcPrice || '0'),
            compTypeText: COMP_TYPE_LABELS[coupon.nxDcCompType] || '其他',
            validityText: '发放后' + (coupon.nxDcValidityDays || 7) + '天有效'
          })
        }),
        compensationCouponIndex: 0
      })
    }).catch(function () {})
  },

  loadDetail(fromPullDown) {
    if (!fromPullDown) this.setData({ loading: true, errorText: '' })
    return getDepartmentAfterSalesDetail(this.data.afterSalesId, this.scope()).then((res) => {
      if (!res.result || res.result.code !== 0) throw new Error((res.result && res.result.msg) || '详情加载失败')
      this.applyDetail(res.result.data || {})
    }).catch((error) => this.setData({ loading: false, errorText: error.message || '详情加载失败' }))
      .finally(function () { if (fromPullDown) wx.stopPullDownRefresh() })
  },

  applyDetail(raw) {
    var driverMap = {}; this.data.drivers.forEach(function (driver) { driverMap[driver.id] = driver.name })
    var items = (raw.items || []).map(function (item) {
      return Object.assign({}, item, {
        id: item.nxDasiId, departmentDisGoodsId: item.nxDasiDepartmentDisGoodsId,
        goodsName: item.nxDasiGoodsName, issueQuantity: item.nxDasiIssueQuantity,
        description: item.nxDasiIssueDescription
      })
    })
    var itemMap = {}; items.forEach(function (item) { itemMap[item.id] = item })
    var replenishmentRawMap = {}
    ;(raw.replenishments || []).forEach(function (row) { replenishmentRawMap[row.nxDasrId] = row })
    var images = (raw.images || []).map(function (image) {
      var replenishment = replenishmentRawMap[image.nxDasimgReplenishmentId]
      var linkedItemId = image.nxDasimgAfterSalesItemId || (replenishment && replenishment.nxDasrAfterSalesItemId)
      var linked = itemMap[linkedItemId]
      return Object.assign({}, image, {
        id: image.nxDasimgId, stage: image.nxDasimgStage,
        previewUrl: absoluteImage(image.nxDasimgUrl), goodsName: linked ? linked.goodsName : '',
        converted: !!image.nxDasimgConvertedStandardImageId,
        linkedDepartmentDisGoodsId: linked ? linked.departmentDisGoodsId : null,
        writebackSelected: false
      })
    })
    var actions = (raw.actions || []).map((action) => ({
      id: action.nxDasaId, timeText: formatTime(action.nxDasaCreatedAt),
      typeLabel: this.data.actionTypeMap[action.nxDasaActionType] || action.nxDasaActionType,
      operatorText: '操作人 #' + action.nxDasaOperatorUserId,
      remark: action.nxDasaRemark, result: action.nxDasaResult
    }))
    var replenishments = (raw.replenishments || []).map(function (row) {
      var linked = itemMap[row.nxDasrAfterSalesItemId]
      return Object.assign({}, row, {
        id: row.nxDasrId, goodsName: linked ? linked.goodsName : '补货商品',
        driverName: driverMap[row.nxDasrDriverUserId] || ('司机 #' + row.nxDasrDriverUserId),
        statusLabel: row.nxDasrStatus === 'DELIVERED' ? '已送达' : '补货中'
      })
    })
    var status = raw.nxDasStatus
    var convertedImage = images.filter(function (image) { return image.converted && image.linkedDepartmentDisGoodsId })[0]
    var writtenBackItemIndex = convertedImage
      ? items.findIndex(function (item) { return item.departmentDisGoodsId === convertedImage.linkedDepartmentDisGoodsId })
      : this.data.writebackItemIndex
    this.setData({
      loading: false,
      customerDisplayName: this.data.customerName || ('客户 #' + raw.nxDasDepartmentId),
      detail: Object.assign({}, raw, {
        statusLabel: this.data.statusMap[status] || status,
        severityLabel: this.data.severityMap[raw.nxDasSeverity] || raw.nxDasSeverity,
        issueTypeLabel: this.data.issueTypeMap[raw.nxDasIssueType] || raw.nxDasIssueType,
        confirmLabel: this.data.confirmMap[raw.nxDasCustomerConfirmStatus] || raw.nxDasCustomerConfirmStatus,
        createdText: formatTime(raw.nxDasCreatedAt), completedText: formatTime(raw.nxDasCompletedAt),
        completed: status === 'COMPLETED'
      }),
      items: items, images: images,
      evidenceImages: images.filter(function (image) { return image.stage === 'EVIDENCE' }),
      processImages: images.filter(function (image) { return image.stage === 'PROCESS' }),
      resultImages: images.filter(function (image) { return image.stage === 'REPLENISHMENT_RESULT' }),
      actions: actions, replenishments: replenishments,
      writebackItemIndex: writtenBackItemIndex >= 0 ? writtenBackItemIndex : 0,
      hasWrittenBack: images.some(function (image) { return image.converted }) || this.data.hasWrittenBack
    })
  },

  previewImage(e) { wx.previewImage({ current: e.currentTarget.dataset.url, urls: this.data.images.map(function (item) { return item.previewUrl }) }) },

  chooseEvidencePhotos() { this.chooseAndUploadPhotos('EVIDENCE', this.data.items[0] && this.data.items[0].id, null) },
  chooseResultPhotos(e) { this.chooseAndUploadPhotos('REPLENISHMENT_RESULT', null, e.currentTarget.dataset.id) },

  chooseAndUploadPhotos(stage, itemId, replenishmentId) {
    wx.chooseMedia({
      count: 9, mediaType: ['image'], sourceType: ['album', 'camera'],
      success: (res) => {
        var tooLarge = 0; var unsupported = 0
        var files = (res.tempFiles || []).filter(function (file) {
          var path = String(file.tempFilePath || '').toLowerCase()
          var extension = (path.match(/\.([a-z0-9]+)(?:\?|$)/) || [])[1]
          if (file.size && file.size > 10 * 1024 * 1024) { tooLarge += 1; return false }
          if (extension && ['jpg', 'jpeg', 'png', 'webp'].indexOf(extension) < 0) { unsupported += 1; return false }
          return true
        })
        if (tooLarge || unsupported) {
          var messages = []
          if (tooLarge) messages.push(tooLarge + '张超过10MB')
          if (unsupported) messages.push(unsupported + '张格式不支持')
          wx.showToast({ title: messages.join('，'), icon: 'none' })
        }
        if (!files.length) return
        wx.showLoading({ title: '上传照片 0/' + files.length })
        var done = 0; var failed = 0
        Promise.all(files.map((file) => uploadDepartmentAfterSalesImage({
          afterSalesId: this.data.afterSalesId, distributerId: this.data.distributerId,
          operatorUserId: this.data.operatorUserId, stage: stage,
          afterSalesItemId: itemId, replenishmentId: replenishmentId,
          filePath: file.tempFilePath,
          onProgress: function () {}
        }).then(function (upload) {
          done += 1; wx.showLoading({ title: '上传照片 ' + done + '/' + files.length })
          if (!upload.result || upload.result.code !== 0) failed += 1
        }).catch(function () { done += 1; failed += 1 }))).then(() => {
          wx.hideLoading(); if (failed) wx.showToast({ title: failed + '张上传失败', icon: 'none' })
          this.loadDetail()
        })
      },
      fail: function (error) {
        if (!error.errMsg || error.errMsg.indexOf('cancel') < 0) wx.showToast({ title: '选择图片失败', icon: 'none' })
      }
    })
  },

  openActionForm() {
    this.setData({
      actionType: ['REPLENISHMENT', 'COMPENSATION_COUPON'].indexOf(this.data.actionType) >= 0 ? 'COMMUNICATION' : this.data.actionType,
      showActionForm: true,
      showReplenishmentForm: false,
      showCompensationForm: false
    })
  },
  openActionByType(e) {
    var type = e.currentTarget.dataset.code
    if (!type) return
    if (type === 'REPLENISHMENT') {
      this.setData({ actionType: type, showActionForm: false, showReplenishmentForm: true, showCompensationForm: false })
      return
    }
    if (type === 'COMPENSATION_COUPON') {
      if (!this.data.compensationCoupons.length) {
        wx.showModal({
          title: '尚未配置补偿券',
          content: '请先在“设置 → 补偿券管理”中新增可发放的补偿券。',
          confirmText: '去配置',
          success: (res) => { if (res.confirm) this.toCompensationManagement() }
        })
        return
      }
      this.setData({ actionType: type, showActionForm: false, showReplenishmentForm: false, showCompensationForm: true })
      return
    }
    this.setData({ actionType: type, showActionForm: true, showReplenishmentForm: false, showCompensationForm: false })
  },
  closeForms() { this.setData({ showActionForm: false, showReplenishmentForm: false, showCompensationForm: false, showWritebackForm: false }) },
  selectActionType(e) {
    var type = e.currentTarget.dataset.code
    if (type === 'REPLENISHMENT') {
      this.setData({ actionType: type, showActionForm: false, showReplenishmentForm: true })
    } else if (type === 'COMPENSATION_COUPON') {
      this.openActionByType({ currentTarget: { dataset: { code: type } } })
    } else this.setData({ actionType: type })
  },
  onActionRemarkInput(e) { this.setData({ actionRemark: e.detail.value }) },
  onActionResultInput(e) { this.setData({ actionResult: e.detail.value }) },

  saveAction() {
    if (this.data.submitting || ['REPLENISHMENT', 'COMPENSATION_COUPON'].indexOf(this.data.actionType) >= 0) return
    this.submit(addDepartmentAfterSalesAction(this.data.afterSalesId, Object.assign(this.scope(), {
      actionType: this.data.actionType, remark: this.data.actionRemark, result: this.data.actionResult
    })), '处理动作已记录', () => this.setData({ showActionForm: false, actionRemark: '', actionResult: '' }))
  },

  onReplenishmentItemChange(e) { this.setData({ replenishmentItemIndex: Number(e.detail.value) }) },
  onReplenishmentQuantityInput(e) { this.setData({ replenishmentQuantity: e.detail.value }) },
  onReplenishmentStandardInput(e) { this.setData({ replenishmentStandard: e.detail.value }) },
  onDriverChange(e) { this.setData({ driverIndex: Number(e.detail.value) }) },

  onCompensationCouponChange(e) { this.setData({ compensationCouponIndex: Number(e.detail.value) }) },
  onCompensationRemarkInput(e) { this.setData({ compensationRemark: e.detail.value }) },

  saveCompensation() {
    if (this.data.submitting) return
    var coupon = this.data.compensationCoupons[this.data.compensationCouponIndex]
    if (!coupon) { wx.showToast({ title: '请选择补偿券', icon: 'none' }); return }
    wx.showModal({
      title: '确认发放补偿券',
      content: '将“' + coupon.nxDistributerCouponName + '”发放给当前客户？发放后会进入客户可用券。',
      success: (res) => {
        if (!res.confirm || this.data.submitting) return
        this.submit(grantAfterSalesCompensation(this.data.afterSalesId, Object.assign(this.scope(), {
          couponId: coupon.nxDistributerCouponId,
          remark: this.data.compensationRemark
        })), '补偿券已发放', () => this.setData({ showCompensationForm: false, compensationRemark: '' }))
      }
    })
  },

  toCompensationManagement() {
    wx.navigateTo({
      url: '../../management/compensationCoupon/compensationCoupon?disId=' + this.data.distributerId
    })
  },

  saveReplenishment() {
    if (this.data.submitting) return
    var item = this.data.items[this.data.replenishmentItemIndex]
    var driver = this.data.drivers[this.data.driverIndex]
    if (!item || !this.data.replenishmentQuantity.trim() || !this.data.replenishmentStandard.trim() || !driver) {
      wx.showToast({ title: '请完整填写商品、数量、规格和司机', icon: 'none' }); return
    }
    this.submit(createAfterSalesReplenishment(this.data.afterSalesId, Object.assign(this.scope(), {
      afterSalesItemId: item.id, quantity: this.data.replenishmentQuantity.trim(),
      standard: this.data.replenishmentStandard.trim(), driverUserId: driver.id
    })), '补货已安排', () => this.setData({ showReplenishmentForm: false, replenishmentQuantity: '' }))
  },

  markDelivered(e) {
    var id = e.currentTarget.dataset.id
    wx.showModal({ title: '确认补货送达', content: '确认司机已经将本次售后补货送达客户？', success: (res) => {
      if (!res.confirm) return
      if (this.data.submitting) return
      this.submit(deliverAfterSalesReplenishment(id, Object.assign(this.scope(), { deliveryResult: '售后补货已送达' })), '已送达')
    } })
  },

  confirmCustomer(e) {
    var status = e.currentTarget.dataset.status
    if (status === 'PENDING') { wx.showToast({ title: '当前保持待确认，无需提交', icon: 'none' }); return }
    var label = status === 'ACCEPTED' ? '客户接受' : '仍不满意'
    wx.showModal({ title: '记录客户反馈', content: '确认记录为“' + label + '”？', editable: true, placeholderText: '可填写电话或微信反馈', success: (res) => {
      if (!res.confirm) return
      if (this.data.submitting) return
      this.submit(confirmDepartmentAfterSales(this.data.afterSalesId, Object.assign(this.scope(), {
        confirmStatus: status, remark: res.content || ''
      })), '客户反馈已记录')
    } })
  },

  completeCase() {
    wx.showModal({ title: '完成售后', content: '客户已接受，确认完成本次售后？', success: (res) => {
      if (!res.confirm) return
      if (this.data.submitting) return
      this.submit(completeDepartmentAfterSales(this.data.afterSalesId, Object.assign(this.scope(), { result: '客户接受，售后完成' })), '售后已完成')
    } })
  },

  submit(promise, successText, callback) {
    if (this.data.submitting) return
    this.setData({ submitting: true }); wx.showLoading({ title: '提交中' })
    promise.then((res) => {
      if (!res.result || res.result.code !== 0) throw new Error((res.result && res.result.msg) || '操作失败')
      if (callback) callback(res.result.data)
      wx.showToast({ title: successText, icon: 'success' })
      return this.loadDetail()
    }).catch((error) => wx.showToast({ title: error.message || '操作失败', icon: 'none' }))
      .finally(() => { wx.hideLoading(); this.setData({ submitting: false }) })
  },

  openWriteback() {
    var item = this.data.items[this.data.writebackItemIndex] || this.data.items[0]
    var candidates = this.data.images.filter(function (image) {
      return item && image.linkedDepartmentDisGoodsId === item.departmentDisGoodsId && !image.converted &&
        (image.stage === 'EVIDENCE' || image.stage === 'REPLENISHMENT_RESULT')
    })
    var ids = candidates.map(function (image) { return image.id })
    this.setData({
      showWritebackForm: true,
      selectedWritebackImageIds: ids,
      images: this.data.images.map(function (image) {
        var eligible = item && image.linkedDepartmentDisGoodsId === item.departmentDisGoodsId && !image.converted &&
          (image.stage === 'EVIDENCE' || image.stage === 'REPLENISHMENT_RESULT')
        return Object.assign({}, image, { writebackEligible: eligible, writebackSelected: eligible && ids.indexOf(image.id) >= 0 })
      })
    })
  },
  onWritebackItemChange(e) {
    var itemIndex = Number(e.detail.value)
    var item = this.data.items[itemIndex]
    var ids = this.data.images.filter(function (image) {
      return item && image.linkedDepartmentDisGoodsId === item.departmentDisGoodsId && !image.converted &&
        (image.stage === 'EVIDENCE' || image.stage === 'REPLENISHMENT_RESULT')
    }).map(function (image) { return image.id })
    this.setData({
      writebackItemIndex: itemIndex,
      selectedWritebackImageIds: ids,
      images: this.data.images.map(function (image) {
        var eligible = item && image.linkedDepartmentDisGoodsId === item.departmentDisGoodsId && !image.converted &&
          (image.stage === 'EVIDENCE' || image.stage === 'REPLENISHMENT_RESULT')
        return Object.assign({}, image, { writebackEligible: eligible, writebackSelected: eligible && ids.indexOf(image.id) >= 0 })
      })
    })
  },
  onDimensionChange(e) { this.setData({ writebackDimensionIndex: Number(e.detail.value) }) },
  onWritebackRequirementInput(e) { this.setData({ writebackRequirement: e.detail.value }) },
  onImportanceChange(e) { this.setData({ writebackImportance: Number(e.detail.value) + 1 }) },
  toggleWritebackImage(e) {
    var id = Number(e.currentTarget.dataset.id); var selected = this.data.selectedWritebackImageIds.slice(); var index = selected.indexOf(id)
    var target = this.data.images.filter(function (image) { return image.id === id })[0]
    if (!target || !target.writebackEligible) return
    if (index >= 0) selected.splice(index, 1); else selected.push(id)
    this.setData({
      selectedWritebackImageIds: selected,
      images: this.data.images.map(function (image) { return Object.assign({}, image, { writebackSelected: selected.indexOf(image.id) >= 0 }) })
    })
  },

  saveWriteback() {
    if (this.data.submitting) return
    var item = this.data.items[this.data.writebackItemIndex]
    var dimension = this.data.dimensionOptions[this.data.writebackDimensionIndex]
    var requirement = this.data.writebackRequirement.trim()
    if (!item || !dimension || !requirement) { wx.showToast({ title: '请填写标准维度和要求', icon: 'none' }); return }
    var clientKey = 'after-sales-' + Date.now()
    var selectedIds = this.data.selectedWritebackImageIds
    var images = this.data.images.filter(function (image) { return selectedIds.indexOf(image.id) >= 0 }).map(function (image, index) {
      return {
        afterSalesImageId: image.id, standardItemClientKey: clientKey,
        imageRole: image.stage === 'EVIDENCE' ? 'PROHIBITED' : 'PASS',
        description: image.stage === 'EVIDENCE' ? '售后问题照片：禁止这样' : '补货后客户认可：合格参考',
        importanceLevel: 5, sort: index
      }
    })
    this.submit(writebackAfterSalesStandard(this.data.afterSalesId, Object.assign(this.scope(), {
      departmentDisGoodsId: item.departmentDisGoodsId,
      changeReason: '售后完成后人工沉淀客户商品标准',
      standards: [{
        clientKey: clientKey, dimensionCode: dimension.code,
        requirementText: requirement, importanceLevel: this.data.writebackImportance, sort: 0
      }],
      images: images
    })), '已加入客户商品标准', () => this.setData({ showWritebackForm: false, hasWrittenBack: true }))
  },

  viewCustomerStandard() {
    var item = this.data.items[this.data.writebackItemIndex] || this.data.items[0]
    if (!item) return
    var query = [
      'departmentDisGoodsId=' + item.departmentDisGoodsId,
      'goodsName=' + encodeURIComponent(item.goodsName || ''),
      'customerGoodsName=' + encodeURIComponent(item.goodsName || '')
    ]
    wx.navigateTo({ url: '../../customer/customerGoodsStandard/customerGoodsStandard?' + query.join('&') })
  },

  toBack() { wx.navigateBack({ delta: 1 }) }
})

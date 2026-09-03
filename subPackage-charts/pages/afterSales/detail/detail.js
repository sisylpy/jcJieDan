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
  grantAfterSalesCompensation,
  createAfterSalesFinancialAdjustment,
  finishAfterSalesReplenishment,
  getAfterSalesAnnouncement,
  publishAfterSalesAnnouncement,
  withdrawAfterSalesAnnouncement,
  approveSalesReturn,
  rejectSalesReturn,
  receiveSalesReturn
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

function inputDateTime(offsetMinutes) {
  var date = new Date(Date.now() + (offsetMinutes || 0) * 60000)
  var pad = function (value) { return value < 10 ? '0' + value : String(value) }
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
    ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes())
}

function requestKey(prefix) {
  return prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10)
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
    financialAdjustments: [],
    feedbackHistory: [],
    replenishments: [],
    salesReturns: [],
    severityMap: {}, issueTypeMap: {}, statusMap: {}, actionTypeMap: {}, confirmMap: {}, actionStatusMap: {},
    communicationChannelMap: {}, communicationResultMap: {},
    actionOptions: [],
    allActionOptions: [],
    communicationChannels: [], communicationResults: [], financialTypes: [], feedbackChannels: [],
    otherStatusOptions: [{ code: 'PENDING', label: '待执行' }, { code: 'PROCESSING', label: '处理中' }, { code: 'COMPLETED', label: '已完成' }],
    drivers: [],
    responsibleOptions: [],
    dimensionOptions: [],
    importanceOptions: ['1 普通', '2 注意', '3 重要', '4 重点', '5 关键'],
    showActionForm: false, showFinancialForm: false, showFeedbackForm: false,
    showReturnApprovalForm: false, showReturnReceiveForm: false,
    activeReturnId: null, returnPickupRequired: true, returnRouteDate: '',
    returnApprovalRemark: '', returnApprovalItems: [], returnReceiveRemark: '', returnReceiveItems: [],
    financialSalesReturnId: null,
    returnDispositionOptions: ['返库', '报损', '退供应商'],
    showDeliveryForm: false, showOutcomeForm: false, showAnnouncementForm: false,
    actionType: 'COMMUNICATION', actionStatus: 'COMPLETED', actionRemark: '', actionResult: '',
    actionMethodCode: 'PHONE', actionResultCode: 'AGREED', actionContactName: '',
    actionCommitmentPlan: '', actionOccurredAt: inputDateTime(), actionExpectedAt: '',
    otherTitle: '', otherPlan: '', otherResponsibleIndex: 0,
    financialTypeIndex: 0, financialAmount: '', financialReason: '', financialResultNote: '',
    financialExternalRefundNo: '', financialIdempotencyKey: '',
    showReplenishmentForm: false,
    replenishmentItemIndex: 0, replenishmentQuantity: '', replenishmentUnit: '斤', replenishmentStandard: '斤',
    replenishmentExpectedAt: '', replenishmentNote: '', replenishmentIdempotencyKey: '', driverIndex: 0,
    deliveryReplenishmentId: null, deliveryActualQuantity: '', deliveryResult: '',
    outcomeReplenishmentId: null, outcomeStatus: 'FAILED', outcomeReason: '',
    feedbackStatus: 'ACCEPTED', feedbackChannelIndex: 0, feedbackContent: '', feedbackRecordedAt: inputDateTime(),
    completionSummary: '',
    showCompensationForm: false,
    compensationCoupons: [], compensationCouponIndex: 0, compensationRemark: '',
    showWritebackForm: false,
    writebackItemIndex: 0, writebackDimensionIndex: 0, writebackRequirement: '', writebackImportance: 5,
    selectedWritebackImageIds: [],
    announcement: null, announcementTitle: '', announcementNote: '', announcementAudienceAll: true,
    announcementRoleCodes: [],
    announcementRoles: [
      { code: 0, label: '老板' }, { code: 1, label: '录单员' },
      { code: 2, label: '出货/库房' }, { code: 4, label: '采购员' }
    ],
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
          allActionOptions: data.actionTypes || [],
          actionStatusMap: this.toMap(data.actionStatuses),
          communicationChannelMap: this.toMap(data.communicationChannels),
          communicationResultMap: this.toMap(data.communicationResults),
          communicationChannels: data.communicationChannels || [],
          communicationResults: data.communicationResults || [],
          financialTypes: data.financialTypes || [],
          feedbackChannels: data.feedbackChannels || [],
          drivers: (driverResult.code === 0 ? driverResult.data : []).map(function (driver) {
            return { id: driver.nxDistributerUserId, name: driver.nxDiuWxNickName || ('司机 #' + driver.nxDistributerUserId) }
          }),
          responsibleOptions: [{ id: this.data.operatorUserId, name: '当前操作人' }].concat(
            (driverResult.code === 0 ? driverResult.data : []).filter((driver) => driver.nxDistributerUserId !== this.data.operatorUserId).map(function (driver) {
              return { id: driver.nxDistributerUserId, name: driver.nxDiuWxNickName || ('员工 #' + driver.nxDistributerUserId) }
            })
          ),
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
        return Promise.all([this.loadDetail(), this.loadAnnouncement()])
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

  loadAnnouncement() {
    return getAfterSalesAnnouncement(this.data.afterSalesId).then((res) => {
      if (!res.result || res.result.code !== 0) return
      var row = res.result.data || null
      this.setData({
        announcement: row,
        announcementTitle: row ? row.nxDaTitle : '',
        announcementNote: row ? (row.nxDaPublisherNote || '') : '',
        announcementAudienceAll: row ? !!row.audienceAll : true,
        announcementRoleCodes: row ? (row.audienceRoleCodes || []).map(Number) : [],
        announcementRoles: this.data.announcementRoles.map(function (role) {
          return Object.assign({}, role, { selected: !!row && (row.audienceRoleCodes || []).map(Number).indexOf(role.code) >= 0 })
        })
      })
    }).catch(function () {})
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
    var actionRawMap = {}
    ;(raw.actions || []).forEach(function (action) { actionRawMap[action.nxDasaId] = action })
    var actions = (raw.actions || []).map((action) => ({
      id: action.nxDasaId, timeText: formatTime(action.nxDasaOccurredAt || action.nxDasaCreatedAt),
      typeLabel: this.data.actionTypeMap[action.nxDasaActionType] || action.nxDasaActionType,
      statusLabel: this.data.actionStatusMap[action.nxDasaStatus] || action.nxDasaStatus,
      methodCode: action.nxDasaMethodCode, resultCode: action.nxDasaResultCode,
      expectedText: formatTime(action.nxDasaExpectedAt), structuredData: action.structuredData || {},
      operatorText: '操作人 #' + action.nxDasaOperatorUserId,
      remark: action.nxDasaRemark, result: action.nxDasaResult,
      proofImages: images.filter(function (image) { return image.nxDasimgActionId === action.nxDasaId })
    }))
    var financialAdjustments = (raw.financialAdjustments || []).map(function (row) {
      return Object.assign({}, row, {
        amountText: '¥' + row.nxDasfaAmount,
        typeLabel: ({ ACCOUNT_OFFSET: '账款冲减', UNBILLED_REDUCTION: '未出账减免', OFFLINE_REFUND: '线下退款' })[row.nxDasfaAdjustmentType] || row.nxDasfaAdjustmentType,
        postingLabel: ({ POSTED: '已冲减入账', OPEN: '待后续账单抵扣', REFUNDED: '已线下退款' })[row.nxDasfaPostingStatus] || row.nxDasfaPostingStatus,
        processedText: formatTime(row.nxDasfaProcessedAt)
      })
    })
    var feedbackHistory = (raw.feedbackHistory || []).map((row) => ({
      id: row.nxDasfId,
      status: row.nxDasfStatus,
      statusLabel: this.data.confirmMap[row.nxDasfStatus] || row.nxDasfStatus,
      content: row.nxDasfContent,
      channel: row.nxDasfChannel,
      recordedText: formatTime(row.nxDasfRecordedAt)
    }))
    var replenishments = (raw.replenishments || []).map(function (row) {
      var linked = itemMap[row.nxDasrAfterSalesItemId]
      return Object.assign({}, row, {
        id: row.nxDasrId, goodsName: linked ? linked.goodsName : '补货商品',
        driverName: driverMap[row.nxDasrDriverUserId] || ('司机 #' + row.nxDasrDriverUserId),
        actionId: row.nxDasrActionId,
        quantityText: row.nxDasrQuantityValue || row.nxDasrQuantity,
        unitText: row.nxDasrUnit || row.nxDasrStandard,
        expectedText: formatTime(row.nxDasrExpectedAt),
        statusLabel: ({ ASSIGNED: '已派单', DELIVERED: '已送达', FAILED: '已失败', CANCELLED: '已取消', CREATING: '创建中' })[row.nxDasrStatus] || row.nxDasrStatus
      })
    })
    var returnStatusLabels = {
      SUBMITTED: '待审核', APPROVED: '已审核', PROCESSING: '处理中', WAIT_FINANCIAL: '待财务处理',
      WAIT_CONFIRM: '待客户确认', COMPLETED: '已完成', REJECTED: '已驳回', CANCELLED: '已取消'
    }
    var logisticsLabels = {
      WAIT_APPROVAL: '待审核', WAIT_ASSIGN: '待路线分派', ASSIGNED: '已分派司机', IN_TRANSIT: '运输回仓',
      RECEIVED: '仓库已收货', NOT_REQUIRED: '无需物流'
    }
    var salesReturns = (raw.salesReturns || []).map(function (row) {
      return Object.assign({}, row, {
        id: row.nxDsrId, returnNo: row.nxDsrNo,
        statusLabel: returnStatusLabels[row.nxDsrBusinessStatus] || row.nxDsrBusinessStatus,
        logisticsLabel: logisticsLabels[row.nxDsrLogisticsStatus] || row.nxDsrLogisticsStatus,
        amountText: '¥' + (row.nxDsrActualCreditAmount || row.nxDsrEstimatedCreditAmount || '0'),
        items: (row.items || []).map(function (item) {
          return Object.assign({}, item, { id: item.nxDsriId, goodsName: item.nxDsriGoodsName,
            requestedQuantity: item.nxDsriRequestedQuantity, approvedQuantity: item.nxDsriApprovedQuantity,
            pickedQuantity: item.nxDsriPickedQuantity })
        })
      })
    })
    var status = raw.nxDasStatus
    var issueScope = raw.nxDasIssueScope || (items.length ? 'ITEM' : 'ORDER')
    var allActionOptions = this.data.allActionOptions.length ? this.data.allActionOptions : this.data.actionOptions
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
        issueScope: issueScope,
        orderScoped: issueScope === 'ORDER',
        issueDescription: raw.nxDasIssueDescription || (items[0] && items[0].description) || '',
        confirmLabel: this.data.confirmMap[raw.nxDasCustomerConfirmStatus] || raw.nxDasCustomerConfirmStatus,
        createdText: formatTime(raw.nxDasCreatedAt), completedText: formatTime(raw.nxDasCompletedAt),
        completed: status === 'COMPLETED'
      }),
      items: items, images: images,
      evidenceImages: images.filter(function (image) { return image.stage === 'EVIDENCE' }),
      processImages: images.filter(function (image) { return image.stage === 'PROCESS' }),
      resultImages: images.filter(function (image) { return image.stage === 'REPLENISHMENT_RESULT' }),
      actions: actions, financialAdjustments: financialAdjustments,
      feedbackHistory: feedbackHistory, replenishments: replenishments, salesReturns: salesReturns,
      actionOptions: allActionOptions.filter(function (item) {
        if (item.code === 'RETURN') return false
        return issueScope !== 'ORDER' || item.code !== 'REPLENISHMENT'
      }),
      writebackItemIndex: writtenBackItemIndex >= 0 ? writtenBackItemIndex : 0,
      hasWrittenBack: images.some(function (image) { return image.converted }) || this.data.hasWrittenBack
    })
  },

  previewImage(e) { wx.previewImage({ current: e.currentTarget.dataset.url, urls: this.data.images.map(function (item) { return item.previewUrl }) }) },

  chooseEvidencePhotos() {
    var options = ['整张售后'].concat(this.data.items.map(function (item) { return item.goodsName }))
    wx.showActionSheet({
      itemList: options,
      success: (res) => {
        var selected = res.tapIndex > 0 ? this.data.items[res.tapIndex - 1] : null
        this.chooseAndUploadPhotos('EVIDENCE', selected && selected.id, null, null)
      }
    })
  },
  chooseResultPhotos(e) { this.chooseAndUploadPhotos('REPLENISHMENT_RESULT', null, e.currentTarget.dataset.id, e.currentTarget.dataset.actionId) },
  chooseActionPhotos(e) { this.chooseAndUploadPhotos('PROCESS', null, null, e.currentTarget.dataset.id) },

  chooseAndUploadPhotos(stage, itemId, replenishmentId, actionId) {
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
          actionId: actionId,
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
      actionType: ['REPLENISHMENT', 'COMPENSATION_COUPON', 'REFUND_ADJUSTMENT'].indexOf(this.data.actionType) >= 0 ? 'COMMUNICATION' : this.data.actionType,
      showActionForm: true, showFinancialForm: false,
      showReplenishmentForm: false,
      showCompensationForm: false
    })
  },
  openActionByType(e) {
    var type = e.currentTarget.dataset.code
    if (!type) return
    if (type === 'RETURN') {
      wx.showToast({ title: this.data.salesReturns.length ? '退货进度请在上方退货单中处理' : '请从客户送货单发起退货', icon: 'none' })
      return
    }
    if (type === 'REPLENISHMENT') {
      if (!this.data.items.length) {
        wx.showToast({ title: '整单问题不能按商品补货', icon: 'none' })
        return
      }
      this.setData({
        actionType: type, showActionForm: false, showFinancialForm: false,
        showReplenishmentForm: true, showCompensationForm: false,
        replenishmentExpectedAt: inputDateTime(180), replenishmentIdempotencyKey: requestKey('replenishment')
      })
      return
    }
    if (type === 'REFUND_ADJUSTMENT') {
      this.setData({
        actionType: type, showActionForm: false, showFinancialForm: true,
        showReplenishmentForm: false, showCompensationForm: false,
        financialSalesReturnId: null,
        financialIdempotencyKey: requestKey('financial')
      })
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
    this.setData({
      actionType: type, showActionForm: true, showFinancialForm: false,
      showReplenishmentForm: false, showCompensationForm: false,
      actionOccurredAt: inputDateTime()
    })
  },
  closeForms() {
    this.setData({
      showActionForm: false, showFinancialForm: false, showReplenishmentForm: false,
      showCompensationForm: false, showWritebackForm: false, showFeedbackForm: false,
      showDeliveryForm: false, showOutcomeForm: false, showAnnouncementForm: false,
      showReturnApprovalForm: false, showReturnReceiveForm: false,
      financialSalesReturnId: null
    })
  },
  selectActionType(e) {
    var type = e.currentTarget.dataset.code
    if (type === 'REPLENISHMENT') {
      this.setData({ actionType: type, showActionForm: false, showReplenishmentForm: true })
    } else if (type === 'COMPENSATION_COUPON' || type === 'REFUND_ADJUSTMENT') {
      this.openActionByType({ currentTarget: { dataset: { code: type } } })
    } else this.setData({ actionType: type })
  },
  onActionRemarkInput(e) { this.setData({ actionRemark: e.detail.value }) },
  onActionResultInput(e) { this.setData({ actionResult: e.detail.value }) },
  onActionContactInput(e) { this.setData({ actionContactName: e.detail.value }) },
  onActionCommitmentInput(e) { this.setData({ actionCommitmentPlan: e.detail.value }) },
  onActionOccurredInput(e) { this.setData({ actionOccurredAt: e.detail.value }) },
  onActionExpectedInput(e) { this.setData({ actionExpectedAt: e.detail.value }) },
  onCommunicationChannelChange(e) { this.setData({ actionMethodCode: this.data.communicationChannels[Number(e.detail.value)].code }) },
  onCommunicationResultChange(e) { this.setData({ actionResultCode: this.data.communicationResults[Number(e.detail.value)].code }) },
  onOtherTitleInput(e) { this.setData({ otherTitle: e.detail.value }) },
  onOtherPlanInput(e) { this.setData({ otherPlan: e.detail.value }) },
  onOtherResponsibleChange(e) { this.setData({ otherResponsibleIndex: Number(e.detail.value) }) },
  onOtherStatusChange(e) { this.setData({ actionStatus: this.data.otherStatusOptions[Number(e.detail.value)].code }) },

  saveAction() {
    if (this.data.submitting || ['REPLENISHMENT', 'COMPENSATION_COUPON'].indexOf(this.data.actionType) >= 0) return
    var data = Object.assign(this.scope(), {
      actionType: this.data.actionType,
      status: this.data.actionType === 'OTHER' ? this.data.actionStatus : 'COMPLETED',
      occurredAt: this.data.actionOccurredAt,
      expectedAt: this.data.actionExpectedAt || null,
      remark: this.data.actionRemark,
      result: this.data.actionResult
    })
    if (this.data.actionType === 'COMMUNICATION') {
      Object.assign(data, {
        methodCode: this.data.actionMethodCode, resultCode: this.data.actionResultCode,
        contactName: this.data.actionContactName, commitmentPlan: this.data.actionCommitmentPlan
      })
    } else if (this.data.actionType === 'OTHER') {
      var responsible = this.data.responsibleOptions[this.data.otherResponsibleIndex]
      Object.assign(data, {
        treatmentTitle: this.data.otherTitle, treatmentPlan: this.data.otherPlan,
        responsibleUserId: responsible && responsible.id,
        methodCode: 'OTHER', resultCode: this.data.actionStatus
      })
    }
    this.submit(addDepartmentAfterSalesAction(this.data.afterSalesId, data), '处理动作已记录', () => this.setData({
      showActionForm: false, actionRemark: '', actionResult: '', actionContactName: '',
      actionCommitmentPlan: '', otherTitle: '', otherPlan: '', actionExpectedAt: ''
    }))
  },

  onFinancialTypeChange(e) { this.setData({ financialTypeIndex: Number(e.detail.value) }) },
  onFinancialAmountInput(e) { this.setData({ financialAmount: e.detail.value }) },
  onFinancialReasonInput(e) { this.setData({ financialReason: e.detail.value }) },
  onFinancialResultInput(e) { this.setData({ financialResultNote: e.detail.value }) },
  onFinancialExternalRefundNoInput(e) { this.setData({ financialExternalRefundNo: e.detail.value }) },
  saveFinancialAdjustment() {
    if (this.data.submitting) return
    var type = this.data.financialTypes[this.data.financialTypeIndex]
    if (!type || !this.data.financialAmount.trim() || !this.data.financialReason.trim() || !this.data.financialResultNote.trim()) {
      wx.showToast({ title: '请完整填写方式、金额、原因和结果', icon: 'none' }); return
    }
    if (type.code === 'OFFLINE_REFUND' && !this.data.financialExternalRefundNo.trim()) {
      wx.showToast({ title: '请填写线下退款凭证号', icon: 'none' }); return
    }
    this.submit(createAfterSalesFinancialAdjustment(this.data.afterSalesId, Object.assign(this.scope(), {
      adjustmentType: type.code, amount: this.data.financialAmount.trim(), currency: 'CNY',
      reason: this.data.financialReason.trim(), resultNote: this.data.financialResultNote.trim(),
      externalRefundNo: type.code === 'OFFLINE_REFUND' ? this.data.financialExternalRefundNo.trim() : null,
      idempotencyKey: this.data.financialIdempotencyKey,
      salesReturnId: this.data.financialSalesReturnId || null
    })), '财务处理已记录', () => this.setData({
      showFinancialForm: false, financialAmount: '', financialReason: '', financialResultNote: '',
      financialExternalRefundNo: '', financialSalesReturnId: null
    }))
  },

  openReturnApproval(e) {
    var row = this.data.salesReturns.filter(function (item) { return item.id === Number(e.currentTarget.dataset.id) })[0]
    if (!row) return
    this.setData({ showReturnApprovalForm: true, activeReturnId: row.id,
      returnPickupRequired: true, returnRouteDate: row.nxDsrRouteDate || inputDateTime().slice(0, 10),
      returnApprovalRemark: '', returnApprovalItems: row.items.map(function (item) {
        return { id: item.id, goodsName: item.goodsName, requestedQuantity: item.requestedQuantity,
          approvedQuantity: String(item.requestedQuantity || '') }
      }) })
  },
  onReturnPickupChange(e) { this.setData({ returnPickupRequired: !!e.detail.value }) },
  onReturnRouteDateChange(e) { this.setData({ returnRouteDate: e.detail.value }) },
  onReturnApprovalRemarkInput(e) { this.setData({ returnApprovalRemark: e.detail.value }) },
  onReturnApprovedQuantityInput(e) { this.setData({ ['returnApprovalItems[' + Number(e.currentTarget.dataset.index) + '].approvedQuantity']: e.detail.value }) },
  saveReturnApproval() {
    this.submit(approveSalesReturn(this.data.activeReturnId, Object.assign(this.scope(), {
      pickupRequired: this.data.returnPickupRequired,
      routeDate: this.data.returnPickupRequired ? this.data.returnRouteDate : null,
      approvalRemark: this.data.returnApprovalRemark,
      items: this.data.returnApprovalItems.map(function (item) { return { returnItemId: item.id, approvedQuantity: item.approvedQuantity } })
    })), this.data.returnPickupRequired ? '已审核，取货任务已进入路线分派' : '已审核，等待仓库收货',
    () => this.setData({ showReturnApprovalForm: false, activeReturnId: null }))
  },
  rejectReturn(e) {
    var id = Number(e.currentTarget.dataset.id)
    wx.showModal({ title: '驳回退货申请', editable: true, placeholderText: '请输入驳回原因', success: (res) => {
      if (!res.confirm || !(res.content || '').trim()) return
      this.submit(rejectSalesReturn(id, Object.assign(this.scope(), { reason: res.content.trim() })), '退货申请已驳回')
    } })
  },
  openReturnReceive(e) {
    var row = this.data.salesReturns.filter(function (item) { return item.id === Number(e.currentTarget.dataset.id) })[0]
    if (!row) return
    this.setData({ showReturnReceiveForm: true, activeReturnId: row.id, returnReceiveRemark: '',
      returnReceiveItems: row.items.map(function (item) {
        var ceiling = item.pickedQuantity || item.approvedQuantity || item.requestedQuantity || ''
        return { id: item.id, goodsName: item.goodsName, ceiling: ceiling, receivedQuantity: String(ceiling),
          acceptedQuantity: String(ceiling), conditionCode: 'NORMAL', dispositionCode: 'RESTOCK', temperature: '' }
      }) })
  },
  onReturnReceiveInput(e) { var index = Number(e.currentTarget.dataset.index), field = e.currentTarget.dataset.field; this.setData({ ['returnReceiveItems[' + index + '].' + field]: e.detail.value }) },
  onReturnDispositionChange(e) { this.setData({ ['returnReceiveItems[' + Number(e.currentTarget.dataset.index) + '].dispositionCode']: ['RESTOCK', 'SCRAP', 'RETURN_TO_SUPPLIER'][Number(e.detail.value)] }) },
  onReturnReceiveRemarkInput(e) { this.setData({ returnReceiveRemark: e.detail.value }) },
  saveReturnReceive() {
    this.submit(receiveSalesReturn(this.data.activeReturnId, Object.assign(this.scope(), {
      remark: this.data.returnReceiveRemark,
      items: this.data.returnReceiveItems.map(function (item) { return { returnItemId: item.id,
        receivedQuantity: item.receivedQuantity, acceptedQuantity: item.acceptedQuantity,
        conditionCode: item.conditionCode, dispositionCode: item.dispositionCode, temperature: item.temperature || null } })
    })), '退货验收已完成', () => this.setData({ showReturnReceiveForm: false, activeReturnId: null }))
  },
  openReturnFinancial(e) {
    var row = this.data.salesReturns.filter(function (item) { return item.id === Number(e.currentTarget.dataset.id) })[0]
    if (!row) return
    this.setData({ showFinancialForm: true, financialSalesReturnId: row.id,
      financialAmount: String(row.nxDsrActualCreditAmount || ''), financialReason: '客户退货验收冲减',
      financialResultNote: '', financialExternalRefundNo: '',
      financialIdempotencyKey: requestKey('return-financial') })
  },

  onReplenishmentItemChange(e) { this.setData({ replenishmentItemIndex: Number(e.detail.value) }) },
  onReplenishmentQuantityInput(e) { this.setData({ replenishmentQuantity: e.detail.value }) },
  onReplenishmentUnitInput(e) { this.setData({ replenishmentUnit: e.detail.value }) },
  onReplenishmentStandardInput(e) { this.setData({ replenishmentStandard: e.detail.value }) },
  onReplenishmentExpectedInput(e) { this.setData({ replenishmentExpectedAt: e.detail.value }) },
  onReplenishmentNoteInput(e) { this.setData({ replenishmentNote: e.detail.value }) },
  onDriverChange(e) { this.setData({ driverIndex: Number(e.detail.value) }) },

  onCompensationCouponChange(e) { this.setData({ compensationCouponIndex: Number(e.detail.value) }) },
  onCompensationRemarkInput(e) { this.setData({ compensationRemark: e.detail.value }) },

  saveCompensation() {
    if (this.data.submitting) return
    var coupon = this.data.compensationCoupons[this.data.compensationCouponIndex]
    if (!coupon) { wx.showToast({ title: '请选择补偿券', icon: 'none' }); return }
    if (!this.data.compensationRemark.trim()) { wx.showToast({ title: '请填写补偿原因', icon: 'none' }); return }
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
    if (!item || !this.data.replenishmentQuantity.trim() || !this.data.replenishmentUnit.trim() ||
      !this.data.replenishmentStandard.trim() || !this.data.replenishmentExpectedAt.trim() ||
      !this.data.replenishmentNote.trim() || !driver) {
      wx.showToast({ title: '请完整填写补货信息', icon: 'none' }); return
    }
    this.submit(createAfterSalesReplenishment(this.data.afterSalesId, Object.assign(this.scope(), {
      afterSalesItemId: item.id, quantity: this.data.replenishmentQuantity.trim(),
      quantityValue: this.data.replenishmentQuantity.trim(), unit: this.data.replenishmentUnit.trim(),
      standard: this.data.replenishmentStandard.trim(), driverUserId: driver.id,
      expectedAt: this.data.replenishmentExpectedAt.trim(), handlingNote: this.data.replenishmentNote.trim(),
      idempotencyKey: this.data.replenishmentIdempotencyKey
    })), '补货已安排', () => this.setData({
      showReplenishmentForm: false, replenishmentQuantity: '', replenishmentNote: ''
    }))
  },

  markDelivered(e) {
    var row = this.data.replenishments.filter(function (item) { return item.id === Number(e.currentTarget.dataset.id) })[0]
    this.setData({
      showDeliveryForm: true, deliveryReplenishmentId: row && row.id,
      deliveryActualQuantity: row ? String(row.quantityText || '') : '', deliveryResult: ''
    })
  },

  onDeliveryActualInput(e) { this.setData({ deliveryActualQuantity: e.detail.value }) },
  onDeliveryResultInput(e) { this.setData({ deliveryResult: e.detail.value }) },
  saveDelivery() {
    if (!this.data.deliveryActualQuantity.trim() || !this.data.deliveryResult.trim()) {
      wx.showToast({ title: '请填写实际送达数量和结果', icon: 'none' }); return
    }
    this.submit(deliverAfterSalesReplenishment(this.data.deliveryReplenishmentId, Object.assign(this.scope(), {
      actualQuantityValue: this.data.deliveryActualQuantity.trim(), deliveryResult: this.data.deliveryResult.trim()
    })), '已确认送达', () => this.setData({ showDeliveryForm: false }))
  },
  openOutcomeForm(e) {
    this.setData({ showOutcomeForm: true, outcomeReplenishmentId: Number(e.currentTarget.dataset.id), outcomeStatus: e.currentTarget.dataset.status, outcomeReason: '' })
  },
  onOutcomeReasonInput(e) { this.setData({ outcomeReason: e.detail.value }) },
  saveOutcome() {
    if (!this.data.outcomeReason.trim()) { wx.showToast({ title: '请填写原因', icon: 'none' }); return }
    this.submit(finishAfterSalesReplenishment(this.data.outcomeReplenishmentId, Object.assign(this.scope(), {
      status: this.data.outcomeStatus, reason: this.data.outcomeReason.trim()
    })), this.data.outcomeStatus === 'FAILED' ? '已记录补货失败' : '已取消补货', () => this.setData({ showOutcomeForm: false }))
  },

  confirmCustomer(e) {
    var status = e.currentTarget.dataset.status
    if (status === 'PENDING') { wx.showToast({ title: '当前保持待确认，无需提交', icon: 'none' }); return }
    this.setData({ showFeedbackForm: true, feedbackStatus: status, feedbackContent: '', feedbackRecordedAt: inputDateTime() })
  },

  onFeedbackChannelChange(e) { this.setData({ feedbackChannelIndex: Number(e.detail.value) }) },
  onFeedbackContentInput(e) { this.setData({ feedbackContent: e.detail.value }) },
  onFeedbackRecordedInput(e) { this.setData({ feedbackRecordedAt: e.detail.value }) },
  saveFeedback() {
    var channel = this.data.feedbackChannels[this.data.feedbackChannelIndex]
    if (!channel || !this.data.feedbackContent.trim() || !this.data.feedbackRecordedAt.trim()) {
      wx.showToast({ title: '请填写反馈渠道、内容和时间', icon: 'none' }); return
    }
    this.submit(confirmDepartmentAfterSales(this.data.afterSalesId, Object.assign(this.scope(), {
      confirmStatus: this.data.feedbackStatus, remark: this.data.feedbackContent.trim(),
      feedbackContent: this.data.feedbackContent.trim(), feedbackChannel: channel.code,
      recordedAt: this.data.feedbackRecordedAt.trim()
    })), '客户反馈已记录', () => this.setData({ showFeedbackForm: false }))
  },

  completeCase() {
    wx.showModal({ title: '完成售后', content: '客户已接受，请填写最终解决摘要。', editable: true, placeholderText: '例：已线下退款并取得客户认可', success: (res) => {
      if (!res.confirm) return
      if (this.data.submitting) return
      if (!(res.content || '').trim()) { wx.showToast({ title: '最终解决摘要不能为空', icon: 'none' }); return }
      this.submit(completeDepartmentAfterSales(this.data.afterSalesId, Object.assign(this.scope(), {
        result: (res.content || '').trim(), finalResolutionSummary: (res.content || '').trim()
      })), '售后已完成')
    } })
  },

  openAnnouncementForm() {
    var detail = this.data.detail || {}
    this.setData({
      showAnnouncementForm: true,
      announcementTitle: this.data.announcementTitle || (this.data.customerDisplayName + '反馈：' + detail.issueTypeLabel),
      announcementAudienceAll: this.data.announcement ? !!this.data.announcement.audienceAll : true
    })
  },
  onAnnouncementTitleInput(e) { this.setData({ announcementTitle: e.detail.value }) },
  onAnnouncementNoteInput(e) { this.setData({ announcementNote: e.detail.value }) },
  selectAnnouncementAll() {
    this.setData({
      announcementAudienceAll: true, announcementRoleCodes: [],
      announcementRoles: this.data.announcementRoles.map(function (role) { return Object.assign({}, role, { selected: false }) })
    })
  },
  toggleAnnouncementRole(e) {
    var code = Number(e.currentTarget.dataset.code)
    var selected = this.data.announcementRoleCodes.slice()
    var index = selected.indexOf(code)
    if (index >= 0) selected.splice(index, 1); else selected.push(code)
    this.setData({
      announcementAudienceAll: false, announcementRoleCodes: selected,
      announcementRoles: this.data.announcementRoles.map(function (role) {
        return Object.assign({}, role, { selected: selected.indexOf(role.code) >= 0 })
      })
    })
  },
  saveAnnouncement() {
    if (!this.data.announcementTitle.trim()) { wx.showToast({ title: '请填写公告标题', icon: 'none' }); return }
    if (!this.data.announcementAudienceAll && !this.data.announcementRoleCodes.length) {
      wx.showToast({ title: '请选择公告受众', icon: 'none' }); return
    }
    this.submit(publishAfterSalesAnnouncement(this.data.afterSalesId, {
      title: this.data.announcementTitle.trim(), publisherNote: this.data.announcementNote.trim(),
      audienceAll: this.data.announcementAudienceAll,
      roleCodes: this.data.announcementAudienceAll ? [] : this.data.announcementRoleCodes
    }), '公告已发布', () => {
      this.setData({ showAnnouncementForm: false })
      this.loadAnnouncement()
    })
  },
  withdrawAnnouncement() {
    wx.showModal({ title: '撤回公告', content: '撤回后公司员工将不再看到这条公告，是否继续？', success: (res) => {
      if (!res.confirm) return
      this.submit(withdrawAfterSalesAnnouncement(this.data.afterSalesId), '公告已撤回', () => this.loadAnnouncement())
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

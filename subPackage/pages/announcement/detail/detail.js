import {
  getVisibleDistributerAnnouncements,
  getAfterSalesAnnouncement,
  publishAfterSalesAnnouncement,
  withdrawAfterSalesAnnouncement
} from '../../../../lib/apiDistributer'

const ROLE_LABELS = {
  0: '老板',
  1: '录单员',
  2: '出货/库房',
  4: '采购员'
}

const SOURCE_LABELS = {
  AFTER_SALES: '售后反馈',
  DELIVERY: '配送通知',
  PURCHASE: '采购通知',
  MARKET: '市场信息',
  SYSTEM: '系统通知',
  MANUAL: '公司公告'
}

const AFTER_SALES_STATUS = {
  PENDING: '待处理',
  PROCESSING: '处理中',
  WAIT_CONFIRM: '待确认',
  COMPLETED: '已完成',
  CLOSED: '已关闭'
}

function pad(value) {
  return Number(value) < 10 ? '0' + Number(value) : String(value)
}

function formatDateTime(value) {
  if (!value) return '未记录'
  var date = null
  if (typeof value === 'number' || /^\d{10,13}$/.test(String(value))) {
    var timestamp = Number(value)
    date = new Date(timestamp < 100000000000 ? timestamp * 1000 : timestamp)
  } else {
    date = new Date(value)
    if (isNaN(date.getTime())) date = new Date(String(value).replace(/-/g, '/').replace('T', ' '))
  }
  if (date && !isNaN(date.getTime())) {
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' +
      pad(date.getHours()) + ':' + pad(date.getMinutes())
  }
  return String(value).replace('T', ' ').slice(0, 16)
}

function text(value) {
  return value == null ? '' : String(value).trim()
}

Page({
  data: {
    navBarHeight: 0,
    announcementId: null,
    sourceType: '',
    sourceId: null,
    loading: true,
    submitting: false,
    errorText: '',
    announcement: null,
    isWriter: false,
    currentUserId: null,
    currentUserName: '',
    showEditForm: false,
    editTitle: '',
    editNote: '',
    editAudienceAll: true,
    editRoleCodes: [],
    roleOptions: [
      { code: 0, label: '老板', selected: false },
      { code: 1, label: '录单员', selected: false },
      { code: 2, label: '出货/库房', selected: false },
      { code: 4, label: '采购员', selected: false }
    ]
  },

  onLoad(options) {
    var app = getApp()
    var user = wx.getStorageSync('userInfo') || {}
    var roleValue = user.nxDiuAdmin
    if (roleValue === undefined || roleValue === null || roleValue === '') {
      roleValue = wx.getStorageSync('ownerRoleCode')
    }
    var roleCode = Number(roleValue)
    this.setData({
      navBarHeight: (app.globalData.navBarHeight || 0) * (app.globalData.rpxR || 1),
      announcementId: options.id ? Number(options.id) : null,
      sourceType: decodeURIComponent(options.sourceType || ''),
      sourceId: options.sourceId ? Number(options.sourceId) : null,
      isWriter: roleCode === 0 || roleCode === 1,
      currentUserId: user.nxDistributerUserId,
      currentUserName: text(user.nxDiuWxNickName)
    })
    this.loadAnnouncement()
  },

  onShow() {
    if (this._loadedOnce) this.loadAnnouncement()
    this._loadedOnce = true
  },

  onPullDownRefresh() {
    this.loadAnnouncement(true)
  },

  loadAnnouncement(fromPullDown) {
    this.setData({ loading: true, errorText: '' })
    var promise = this.loadManagerAnnouncement().catch(() => this.loadVisibleAnnouncement())
    promise.then((row) => {
      if (!row) throw new Error('公告不存在、已撤回或当前账号无权查看')
      this.setData({ loading: false, announcement: this.normalizeAnnouncement(row) })
    }).catch((error) => {
      this.setData({ loading: false, errorText: error.message || '公告加载失败' })
    }).finally(() => {
      if (fromPullDown) wx.stopPullDownRefresh()
    })
  },

  loadManagerAnnouncement() {
    if (!this.data.isWriter || this.data.sourceType !== 'AFTER_SALES' || !this.data.sourceId) {
      return Promise.reject(new Error('manager endpoint not applicable'))
    }
    return getAfterSalesAnnouncement(this.data.sourceId).then((res) => {
      var result = res.result || {}
      if (result.code !== 0) throw new Error(result.msg || '公告加载失败')
      return result.data || null
    })
  },

  loadVisibleAnnouncement() {
    return getVisibleDistributerAnnouncements().then((res) => {
      var result = res.result || {}
      if (result.code !== 0) throw new Error(result.msg || '公告加载失败')
      var rows = Array.isArray(result.data) ? result.data : []
      var id = Number(this.data.announcementId)
      var sourceId = Number(this.data.sourceId)
      var sourceType = this.data.sourceType
      return rows.find(function (row) {
        if (id && Number(row.nxDaId) === id) return true
        return sourceType && sourceId && row.nxDaSourceType === sourceType && Number(row.nxDaSourceId) === sourceId
      }) || null
    })
  },

  normalizeAnnouncement(row) {
    var sourceType = text(row.nxDaSourceType) || 'MANUAL'
    var roles = Array.isArray(row.audienceRoleCodes) ? row.audienceRoleCodes.map(Number) : []
    var audienceAll = !!row.audienceAll
    var audienceLabel = audienceAll
      ? '全公司'
      : (roles.length ? roles.map(function (code) { return ROLE_LABELS[code] || '角色 #' + code }).join('、') : '当前账号在接收范围内')
    var publisherId = row.nxDaPublisherUserId
    var publisherLabel = publisherId && Number(publisherId) === Number(this.data.currentUserId)
      ? (this.data.currentUserName || '当前账号')
      : (publisherId ? '员工 #' + publisherId : '公司发布')
    var published = row.nxDaStatus === 'PUBLISHED'
    var sourceStatus = text(row.sourceAfterSalesStatus)
    return Object.assign({}, row, {
      announcementId: row.nxDaId,
      title: text(row.nxDaTitle) || '无标题公告',
      content: text(row.nxDaPublisherNote) || '未填写内部说明。',
      sourceType: sourceType,
      sourceId: row.nxDaSourceId,
      sourceLabel: SOURCE_LABELS[sourceType] || '其它公告',
      sourceReference: this.sourceReference(row),
      sourceStatusLabel: AFTER_SALES_STATUS[sourceStatus] || sourceStatus,
      statusLabel: published ? '生效中' : '已撤回',
      statusClass: published ? 'published' : 'withdrawn',
      publisherLabel: publisherLabel,
      publishedText: formatDateTime(row.nxDaPublishedAt),
      updatedText: formatDateTime(row.nxDaUpdatedAt),
      audienceAll: audienceAll,
      audienceRoleCodes: roles,
      audienceLabel: audienceLabel,
      audienceKnown: audienceAll || roles.length > 0,
      canEdit: this.data.isWriter && sourceType === 'AFTER_SALES' && (audienceAll || roles.length > 0),
      canWithdraw: this.data.isWriter && sourceType === 'AFTER_SALES' && published
    })
  },

  sourceReference(row) {
    if (row.nxDaSourceType === 'AFTER_SALES') {
      return row.sourceAfterSalesNo ? '售后单 #' + row.sourceAfterSalesNo : '售后单 #' + row.nxDaSourceId
    }
    return row.nxDaSourceId ? '来源编号 #' + row.nxDaSourceId : '无关联业务'
  },

  openSource() {
    var item = this.data.announcement || {}
    if (item.sourceType !== 'AFTER_SALES' || !item.sourceId) {
      wx.showToast({ title: '当前公告没有可打开的关联页面', icon: 'none' })
      return
    }
    wx.navigateTo({ url: '/subPackage-charts/pages/afterSales/detail/detail?afterSalesId=' + item.sourceId })
  },

  openEditForm() {
    var item = this.data.announcement
    if (!item || !item.canEdit) return
    var selected = item.audienceRoleCodes || []
    this.setData({
      showEditForm: true,
      editTitle: item.title,
      editNote: item.nxDaPublisherNote || '',
      editAudienceAll: item.audienceAll,
      editRoleCodes: selected,
      roleOptions: this.data.roleOptions.map(function (role) {
        return Object.assign({}, role, { selected: selected.indexOf(Number(role.code)) >= 0 })
      })
    })
  },

  closeEditForm() {
    if (!this.data.submitting) this.setData({ showEditForm: false })
  },

  preventClose() {},

  onEditTitleInput(event) {
    this.setData({ editTitle: event.detail.value || '' })
  },

  onEditNoteInput(event) {
    this.setData({ editNote: event.detail.value || '' })
  },

  selectAudienceAll() {
    this.setData({
      editAudienceAll: true,
      editRoleCodes: [],
      roleOptions: this.data.roleOptions.map(function (role) {
        return Object.assign({}, role, { selected: false })
      })
    })
  },

  toggleAudienceRole(event) {
    var code = Number(event.currentTarget.dataset.code)
    var selected = this.data.editRoleCodes.slice()
    var index = selected.indexOf(code)
    if (index >= 0) selected.splice(index, 1)
    else selected.push(code)
    this.setData({
      editAudienceAll: false,
      editRoleCodes: selected,
      roleOptions: this.data.roleOptions.map(function (role) {
        return Object.assign({}, role, { selected: selected.indexOf(Number(role.code)) >= 0 })
      })
    })
  },

  saveEdit() {
    var title = text(this.data.editTitle)
    if (!title) {
      wx.showToast({ title: '请填写公告标题', icon: 'none' })
      return
    }
    if (!this.data.editAudienceAll && !this.data.editRoleCodes.length) {
      wx.showToast({ title: '请选择接收范围', icon: 'none' })
      return
    }
    if (this.data.submitting) return
    this.setData({ submitting: true })
    publishAfterSalesAnnouncement(this.data.sourceId, {
      title: title,
      publisherNote: text(this.data.editNote),
      audienceAll: this.data.editAudienceAll,
      roleCodes: this.data.editAudienceAll ? [] : this.data.editRoleCodes
    }).then((res) => {
      var result = res.result || {}
      if (result.code !== 0) throw new Error(result.msg || '公告保存失败')
      this.setData({ showEditForm: false })
      wx.showToast({ title: '公告已保存', icon: 'success' })
      this.loadAnnouncement()
    }).catch((error) => {
      wx.showToast({ title: error.message || '公告保存失败', icon: 'none' })
    }).finally(() => this.setData({ submitting: false }))
  },

  withdraw() {
    var item = this.data.announcement
    if (!item || !item.canWithdraw || this.data.submitting) return
    wx.showModal({
      title: '撤回公告',
      content: '撤回后，公告将立即从员工的公告牌中消失。是否继续？',
      confirmText: '确认撤回',
      confirmColor: '#c54d43',
      success: (result) => {
        if (!result.confirm) return
        this.setData({ submitting: true })
        withdrawAfterSalesAnnouncement(this.data.sourceId).then((res) => {
          var response = res.result || {}
          if (response.code !== 0) throw new Error(response.msg || '公告撤回失败')
          wx.showToast({ title: '公告已撤回', icon: 'success' })
          this.loadAnnouncement()
        }).catch((error) => {
          wx.showToast({ title: error.message || '公告撤回失败', icon: 'none' })
        }).finally(() => this.setData({ submitting: false }))
      }
    })
  },

  retry() {
    this.loadAnnouncement()
  },

  toBack() {
    wx.navigateBack({ delta: 1 })
  }
})

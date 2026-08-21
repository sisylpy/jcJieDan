import { getVisibleDistributerAnnouncements } from '../../../../lib/apiDistributer'

const SOURCE_META = {
  AFTER_SALES: { label: '售后反馈', className: 'after-sales' },
  DELIVERY: { label: '配送通知', className: 'delivery' },
  PURCHASE: { label: '采购通知', className: 'purchase' },
  MARKET: { label: '市场信息', className: 'market' },
  SYSTEM: { label: '系统通知', className: 'system' },
  MANUAL: { label: '公司公告', className: 'manual' }
}

function pad(value) {
  return Number(value) < 10 ? '0' + Number(value) : String(value)
}

function formatDateTime(value) {
  if (!value) return '时间未记录'
  var date = null
  if (typeof value === 'number' || /^\d{10,13}$/.test(String(value))) {
    var timestamp = Number(value)
    date = new Date(timestamp < 100000000000 ? timestamp * 1000 : timestamp)
  } else {
    date = new Date(String(value).replace(/-/g, '/').replace('T', ' '))
  }
  if (date && !isNaN(date.getTime())) {
    return pad(date.getMonth() + 1) + '-' + pad(date.getDate()) + ' ' +
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
    loading: true,
    errorText: '',
    searchText: '',
    activeTab: 'ALL',
    tabs: [
      { code: 'ALL', label: '全部' },
      { code: 'AFTER_SALES', label: '售后反馈' }
    ],
    allAnnouncements: [],
    announcements: []
  },

  onLoad() {
    var app = getApp()
    this.setData({
      navBarHeight: (app.globalData.navBarHeight || 0) * (app.globalData.rpxR || 1)
    })
    this.loadAnnouncements()
  },

  onShow() {
    if (this._loadedOnce) this.loadAnnouncements()
    this._loadedOnce = true
  },

  onPullDownRefresh() {
    this.loadAnnouncements(true)
  },

  loadAnnouncements(fromPullDown) {
    this.setData({ loading: true, errorText: '' })
    getVisibleDistributerAnnouncements().then((res) => {
      var result = res.result || {}
      if (result.code !== 0) throw new Error(result.msg || '公告加载失败')
      var rows = Array.isArray(result.data) ? result.data : []
      var normalized = rows.map((row) => this.normalizeAnnouncement(row))
      this.setData({ loading: false, allAnnouncements: normalized })
      this.applyFilters()
    }).catch((error) => {
      this.setData({ loading: false, errorText: error.message || '公告加载失败' })
    }).finally(() => {
      if (fromPullDown) wx.stopPullDownRefresh()
    })
  },

  normalizeAnnouncement(row) {
    var sourceType = text(row.nxDaSourceType) || 'MANUAL'
    var source = SOURCE_META[sourceType] || { label: '其它公告', className: 'other' }
    var note = text(row.nxDaPublisherNote)
    var sourceNo = text(row.sourceAfterSalesNo)
    var search = [row.nxDaTitle, note, source.label, sourceNo, row.nxDaPublisherUserId]
      .map(text).join(' ').toLowerCase()
    return Object.assign({}, row, {
      announcementId: row.nxDaId,
      sourceType: sourceType,
      sourceId: row.nxDaSourceId,
      sourceLabel: source.label,
      sourceClass: source.className,
      title: text(row.nxDaTitle) || '无标题公告',
      summary: note || (sourceType === 'AFTER_SALES' ? '点击查看关联售后与公告详情' : '暂无补充说明'),
      publisherLabel: row.nxDaPublisherUserId ? '员工 #' + row.nxDaPublisherUserId : '公司发布',
      publishedText: formatDateTime(row.nxDaPublishedAt),
      statusLabel: row.nxDaStatus === 'PUBLISHED' ? '生效中' : '已撤回',
      statusClass: row.nxDaStatus === 'PUBLISHED' ? 'published' : 'withdrawn',
      searchText: search
    })
  },

  onSearchInput(event) {
    this.setData({ searchText: event.detail.value || '' })
    this.applyFilters()
  },

  clearSearch() {
    this.setData({ searchText: '' })
    this.applyFilters()
  },

  onTabTap(event) {
    this.setData({ activeTab: event.currentTarget.dataset.code || 'ALL' })
    this.applyFilters()
  },

  applyFilters() {
    var keyword = text(this.data.searchText).toLowerCase()
    var activeTab = this.data.activeTab
    var rows = (this.data.allAnnouncements || []).filter(function (row) {
      if (activeTab !== 'ALL' && row.sourceType !== activeTab) return false
      return !keyword || row.searchText.indexOf(keyword) >= 0
    })
    this.setData({ announcements: rows })
  },

  openDetail(event) {
    var item = event.currentTarget.dataset.item || {}
    wx.navigateTo({
      url: '../detail/detail?id=' + encodeURIComponent(item.announcementId || '') +
        '&sourceType=' + encodeURIComponent(item.sourceType || '') +
        '&sourceId=' + encodeURIComponent(item.sourceId || '')
    })
  },

  retry() {
    this.loadAnnouncements()
  },

  toBack() {
    wx.navigateBack({ delta: 1 })
  }
})

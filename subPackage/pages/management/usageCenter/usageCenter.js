var app = getApp()
import apiUrl from '../../../../config.js'

const ACTION_NAMES = {
  GRANT: '增加额度',
  CONSUME: '订单消费',
  REFUND: '冲正返还',
  ADJUST: '额度调整',
  EXPIRE: '到期失效',
  OBSERVE: '用量记录'
}

const SCOPE_NAMES = {
  SUBSCRIPTION_CYCLE: '套餐周期额度',
  ADDON: '额外加量包',
  MANUAL: '管理员增加'
}

Page({
  data: {
    navBarHeight: 0,
    loading: false,
    loadingMore: false,
    account: {
      grantedQuantity: 0,
      consumedQuantity: 0,
      availableQuantity: 0,
      expiredQuantity: 0
    },
    items: [],
    page: 1,
    pageSize: 20,
    hasMore: false
  },

  onLoad() {
    this.setData({ navBarHeight: (app.globalData.navBarHeight || 44) * (app.globalData.rpxR || 2) })
  },

  onShow() {
    this.loadLedger(true)
  },

  onPullDownRefresh() {
    this.loadLedger(true).finally(() => wx.stopPullDownRefresh())
  },

  onReachBottom() {
    if (this.data.hasMore && !this.data.loadingMore) this.loadLedger(false)
  },

  toBack() {
    wx.navigateBack({ delta: 1 })
  },

  loadLedger(reset) {
    if (this.data.loading || this.data.loadingMore) return Promise.resolve()
    const nextPage = reset ? 1 : this.data.page + 1
    this.setData(reset ? { loading: true } : { loadingMore: true })
    return new Promise((resolve, reject) => {
      app.ownerRequest({
        url: apiUrl.apiUrl + 'commercial-usage/me/ledger?page=' + nextPage + '&pageSize=' + this.data.pageSize,
        method: 'GET',
        success: response => {
          const body = response.data || {}
          if (body.code !== 0 || !body.data) {
            reject(new Error(body.msg || '额度明细读取失败'))
            return
          }
          const data = body.data
          const account = data.account || this.data.account
          const incoming = (data.items || []).map(item => this.decorateItem(item))
          wx.setStorageSync('commercialUsage', account)
          this.setData({
            account,
            items: reset ? incoming : this.data.items.concat(incoming),
            page: Number(data.page || nextPage),
            hasMore: !!data.hasMore
          })
          resolve(data)
        },
        fail: reject,
        complete: () => this.setData({ loading: false, loadingMore: false })
      })
    }).catch(error => {
      wx.showToast({ title: (error && error.message) || '额度明细读取失败', icon: 'none' })
      return null
    })
  },

  decorateItem(item) {
    const action = item.action || ''
    const positive = action === 'GRANT' || action === 'REFUND' || action === 'ADJUST'
    let subject = item.reason || '订单额度变动'
    if (item.businessType === 'NX_DEPARTMENT_ORDER') {
      subject = '订单商品行 #' + item.businessId
    } else if (action === 'EXPIRE') {
      subject = item.reason || '未使用额度到期'
    }
    return Object.assign({}, item, {
      actionName: ACTION_NAMES[action] || '额度变动',
      scopeName: SCOPE_NAMES[item.grantScope] || '',
      subject,
      signedQuantity: (positive ? '+' : '-') + Number(item.quantity || 0),
      positive,
      createdText: this.formatTimestamp(item.createdAt)
    })
  },

  formatTimestamp(value) {
    if (!value) return '-'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return String(value)
    const pad = number => String(number).padStart(2, '0')
    return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
      ' ' + pad(date.getHours()) + ':' + pad(date.getMinutes())
  },

  requestMoreQuota() {
    wx.navigateTo({
      url: '/subPackage/pages/management/payPage/payPage'
    })
  }
})

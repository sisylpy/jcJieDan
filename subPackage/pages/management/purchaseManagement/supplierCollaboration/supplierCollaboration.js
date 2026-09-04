import {
  createSupplierInvitation,
  reissueSupplierInvitation,
  getSupplierInvitations,
  getSupplierCollaborationRelations,
  getSupplierCollaborationBatches,
  getSupplierCollaborationBatch,
  actSupplierRemainingDemand,
  assignSupplierResponsiblePurchaser,
  getPurchaseManagementPurchasers
} from '../../../../../lib/apiDistributer.js'

const app = getApp()
const body = response => {
  const value = (response && response.result) || {}
  if (value.code !== 0) throw new Error(value.msg || '操作失败')
  return value.data
}
const key = prefix => prefix + '-' + Date.now() + '-' + Math.random().toString(36).slice(2, 10)

Page({
  data: {
    navBarHeight: 0,
    tab: 'BATCH', loading: false, error: '',
    batches: [], relations: [], invitations: [], purchasers: [], detail: null,
    showInvite: false, supplierName: '', targetContact: '', goodsId: '',
    replacementSupplierRelationId: '', assigningRelationId: null, invitationToken: ''
  },
  onLoad() {
    this.setData({ navBarHeight: app.globalData.navBarHeight * app.globalData.rpxR })
    this.load()
  },
  onPullDownRefresh() { this.load(true) },
  toBack() { wx.navigateBack({ delta: 1 }) },
  switchTab(e) { this.setData({ tab: e.currentTarget.dataset.tab, detail: null, error: '' }); this.load() },
  input(e) { this.setData({ [e.currentTarget.dataset.field]: e.detail.value }) },
  openInvite() { this.setData({ showInvite: true }) },
  closeInvite() { this.setData({ showInvite: false }) },
  load(refresh) {
    if (this.data.loading) return
    this.setData({ loading: true, error: '' })
    let request
    if (this.data.tab === 'RELATION') request = Promise.all([getSupplierCollaborationRelations({ pageSize: 100 }), getPurchaseManagementPurchasers({ pageSize: 100 })])
    else if (this.data.tab === 'INVITE') request = getSupplierInvitations({ pageSize: 100 })
    else request = getSupplierCollaborationBatches({ pageSize: 100 })
    Promise.resolve(request).then(result => {
      if (this.data.tab === 'RELATION') this.setData({ relations: body(result[0]) || [], purchasers: (body(result[1]) || {}).items || [] })
      else if (this.data.tab === 'INVITE') this.setData({ invitations: body(result) || [] })
      else this.setData({ batches: body(result) || [] })
    }).catch(e => this.setData({ error: e.message || '加载失败' }))
      .then(() => { this.setData({ loading: false }); if (refresh) wx.stopPullDownRefresh() })
  },
  submitInvite() {
    const supplierName = String(this.data.supplierName || '').trim()
    if (!supplierName) return wx.showToast({ title: '请填写供应商名称', icon: 'none' })
    const payload = { supplierName, targetContact: String(this.data.targetContact || '').trim() }
    const goodsId = Number(this.data.goodsId)
    if (goodsId > 0) payload.goodsId = goodsId
    wx.showLoading({ title: '生成邀请' })
    createSupplierInvitation(payload, key('owner-invite')).then(res => {
      const invitation = body(res) || {}
      this.setData({ showInvite: false, supplierName: '', targetContact: '', goodsId: '', tab: 'INVITE', invitationToken: invitation.invitationToken || '' })
      if (invitation.invitationToken) wx.showToast({ title: '安全邀请已生成', icon: 'success' })
      this.load()
    }).catch(e => wx.showToast({ title: e.message || '邀请失败', icon: 'none' }))
      .then(() => wx.hideLoading())
  },
  copyTokenValue(e) { this.copyToken(e.currentTarget.dataset.token) },
  reissue(e) {
    reissueSupplierInvitation(Number(e.currentTarget.dataset.id)).then(res => {
      const invitation = body(res) || {}; this.setData({ invitationToken: invitation.invitationToken || '' }); wx.showToast({ title: '新邀请已生成', icon: 'success' }); this.load()
    }).catch(err => wx.showToast({ title: err.message || '重新生成失败', icon: 'none' }))
  },
  copyToken(token) {
    if (!token) return wx.showToast({ title: '安全令牌仅在创建时返回，请重新生成邀请', icon: 'none' })
    const path = '/pkgSeller/pages/seller/supplierInvitation/supplierInvitation?token=' + encodeURIComponent(token)
    wx.setClipboardData({ data: path, success: () => wx.showToast({ title: '邀请路径已复制', icon: 'none' }) })
  },
  openInvitation() {
    const token = this.data.invitationToken
    if (!token) return wx.showToast({ title: '请先生成邀请', icon: 'none' })
    wx.navigateToMiniProgram({
      appId: 'wx1ea78d3f33234284',
      path: 'pkgSeller/pages/seller/supplierInvitation/supplierInvitation?token=' + encodeURIComponent(token),
      envVersion: 'trial'
    })
  },
  choosePurchaser(e) {
    const relationId = Number(e.currentTarget.dataset.id)
    const purchaser = this.data.purchasers[Number(e.detail.value)] || {}
    const purchaserId = purchaser.purchaserUserId || purchaser.userId
    if (!purchaserId) return wx.showToast({ title: '采购员数据无效', icon: 'none' })
    assignSupplierResponsiblePurchaser(relationId, purchaserId).then(res => {
      body(res); wx.showToast({ title: '负责人已交接', icon: 'success' }); this.load()
    }).catch(e => wx.showToast({ title: e.message || '交接失败', icon: 'none' }))
  },
  openBatch(e) {
    const id = Number(e.currentTarget.dataset.id)
    wx.showLoading({ title: '加载详情' })
    getSupplierCollaborationBatch(id).then(res => this.setData({ detail: body(res) || null }))
      .catch(err => wx.showToast({ title: err.message || '加载失败', icon: 'none' }))
      .then(() => wx.hideLoading())
  },
  closeDetail() { this.setData({ detail: null }) },
  actRemaining(e) {
    const detail = this.data.detail || {}
    const goodsId = Number(e.currentTarget.dataset.goods)
    const actionType = e.currentTarget.dataset.action
    const payload = { actionType }
    if (actionType === 'CHANGE_SUPPLIER') {
      const replacement = Number(this.data.replacementSupplierRelationId)
      if (!replacement) return wx.showToast({ title: '请填写新供应商关系ID', icon: 'none' })
      payload.replacementSupplierRelationId = replacement
    }
    actSupplierRemainingDemand(detail.batchId, goodsId, payload, key('owner-remaining')).then(res => {
      body(res); wx.showToast({ title: '已记录处理决定', icon: 'success' }); this.openBatch({ currentTarget: { dataset: { id: detail.batchId } } })
    }).catch(err => wx.showToast({ title: err.message || '处理失败', icon: 'none' }))
  }
})

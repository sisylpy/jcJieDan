import apiUrl from '../../../../config.js'
import { searchVoicePurchaseGoods, saveVoicePurchaseGoods } from '../../../../lib/apiDepOrder'

const DRAFT_STORAGE_KEY = 'voicePurchaseConfirmDraft'

Page({
  data: {
    navBarHeight: 0,
    windowHeight: 0,
    disId: null,
    purchaserId: null,
    rows: [],
    selectedCount: 0,
    submitting: false,
    url: apiUrl.server
  },

  onLoad() {
    const globalData = getApp().globalData || {}
    const ratio = Number(globalData.rpxR || 2)
    const draft = wx.getStorageSync(DRAFT_STORAGE_KEY) || {}
    const rows = this._decorateRows(draft.items || [])
    this.setData({
      navBarHeight: Number(globalData.navBarHeight || 44) * ratio,
      windowHeight: (Number(globalData.windowHeight || 667) - Number(globalData.navBarHeight || 44)) * ratio,
      disId: Number(draft.disId || 0),
      purchaserId: Number(draft.purchaserId || 0),
      rows
    })
    this._refreshSelectedCount()
    if (!rows.length) wx.showToast({ title: '采购确认数据已失效，请返回重试', icon: 'none' })
  },

  _decorateRows(rows) {
    return rows.map((source, index) => {
      const candidates = (source.candidates || []).map((candidate) => {
        const brand = candidate.nxDgGoodsBrand && candidate.nxDgGoodsBrand !== 'null'
          ? candidate.nxDgGoodsBrand : ''
        const name = candidate.nxDgGoodsName || '未命名商品'
        const baseSpec = [candidate.nxDgGoodsStandardWeight, candidate.nxDgGoodsStandardname]
          .filter((value) => value && value !== 'null').join('/')
        const cartonSpec = candidate.nxDgCartonUnit
          ? candidate.nxDgCartonUnit + (candidate.nxDgItemsPerCarton ? '（' + candidate.nxDgItemsPerCarton + candidate.nxDgGoodsStandardname + '）' : '')
          : ''
        return Object.assign({}, candidate, {
          nameText: brand + name,
          specText: [baseSpec, cartonSpec].filter(Boolean).join(' · '),
          imageUrl: this._imageUrl(candidate.nxDgGoodsFile)
        })
      })
      const selectedDisGoodsId = Number(source.selectedDisGoodsId || 0) || null
      const matchedByTraining = !!source.matchedByTraining
      const selectedCandidate = matchedByTraining
        ? candidates.find((candidate) => Number(candidate.nxDistributerGoodsId) === selectedDisGoodsId)
        : null
      return Object.assign({}, source, {
        sourceIndex: source.sourceIndex == null ? index : source.sourceIndex,
        originalGoodsName: source.originalGoodsName || source.goodsName || '',
        selectedDisGoodsId,
        matchedByTraining,
        candidates,
        visibleCandidates: selectedCandidate ? [selectedCandidate] : candidates,
        searchText: source.goodsName || '',
        searching: false
      })
    })
  },

  _imageUrl(path) {
    if (!path || path === 'null') return ''
    if (/^https?:\/\//.test(path)) return path
    return apiUrl.server + path
  },

  _refreshSelectedCount() {
    this.setData({
      selectedCount: this.data.rows.filter((row) => Number(row.selectedDisGoodsId) > 0).length
    })
  },

  chooseCandidate(e) {
    const index = Number(e.currentTarget.dataset.index)
    const candidateId = Number(e.currentTarget.dataset.candidateId)
    const row = this.data.rows[index]
    if (!row || row.matchedByTraining || !(candidateId > 0)) return
    this.setData({
      [`rows[${index}].selectedDisGoodsId`]: candidateId,
      [`rows[${index}].matchedByTraining`]: false,
      [`rows[${index}].visibleCandidates`]: row.candidates
    }, () => this._refreshSelectedCount())
  },

  updateRow(e) {
    const index = Number(e.currentTarget.dataset.index)
    const field = e.currentTarget.dataset.field
    if (!this.data.rows[index] || !field) return
    const updates = { [`rows[${index}].${field}`]: e.detail.value }
    if (field === 'standard' && String(e.detail.value || '').trim() !== String(this.data.rows[index].standard || '').trim()) {
      updates[`rows[${index}].selectedDisGoodsId`] = null
      updates[`rows[${index}].matchedByTraining`] = false
      updates[`rows[${index}].visibleCandidates`] = this.data.rows[index].candidates
    }
    this.setData(updates, () => {
      if (field === 'standard') this._refreshSelectedCount()
    })
  },

  async searchAgain(e) {
    const index = Number(e.currentTarget.dataset.index)
    const row = this.data.rows[index]
    if (!row || row.searching) return
    const keyword = String(row.searchText || '').trim()
    if (!keyword) return wx.showToast({ title: '请输入商品关键词', icon: 'none' })
    this.setData({ [`rows[${index}].searching`]: true })
    try {
      const response = await searchVoicePurchaseGoods({
        disId: this.data.disId,
        items: [{
          sourceIndex: row.sourceIndex,
          goodsName: keyword,
          originalGoodsName: row.originalGoodsName || row.goodsName,
          quantity: row.quantity,
          standard: row.standard,
          remark: row.remark
        }]
      })
      const result = response && response.result
      if (!result || result.code != 0) throw new Error((result && result.msg) || '商品查询失败')
      const fresh = this._decorateRows(result.data || [])[0]
      if (!fresh) throw new Error('没有返回商品查询结果')
      fresh.goodsName = row.goodsName
      fresh.quantity = row.quantity
      fresh.standard = row.standard
      fresh.remark = row.remark
      fresh.searching = false
      // 用户主动重新搜索时，本次不再套用旧训练选择，完整展示新候选供其改选。
      fresh.matchedByTraining = false
      fresh.visibleCandidates = fresh.candidates
      fresh.selectedDisGoodsId = fresh.candidates.length === 1
        ? Number(fresh.candidates[0].nxDistributerGoodsId)
        : null
      this.setData({ [`rows[${index}]`]: fresh }, () => this._refreshSelectedCount())
      if (!fresh.candidates.length) wx.showToast({ title: '没有找到匹配商品，请换关键词', icon: 'none' })
    } catch (error) {
      wx.showToast({ title: error.message || '商品查询失败', icon: 'none' })
      this.setData({ [`rows[${index}].searching`]: false })
    }
  },

  _validateRows() {
    if (!this.data.rows.length) return '没有可确认的采购商品'
    for (let index = 0; index < this.data.rows.length; index++) {
      const row = this.data.rows[index]
      if (!(Number(row.selectedDisGoodsId) > 0)) return `第${index + 1}条请选择具体商品`
      if (!(Number(row.quantity) > 0)) return `第${index + 1}条数量需要大于0`
      if (!String(row.standard || '').trim()) return `第${index + 1}条缺少采购单位`
    }
    return ''
  },

  async submitPurchase() {
    if (this.data.submitting) return
    const invalid = this._validateRows()
    if (invalid) return wx.showToast({ title: invalid, icon: 'none' })
    this.setData({ submitting: true })
    wx.showLoading({ title: '正在生成采购商品' })
    try {
      const response = await saveVoicePurchaseGoods({
        disId: this.data.disId,
        purchaserId: this.data.purchaserId,
        items: this.data.rows.map((row) => ({
          disGoodsId: row.selectedDisGoodsId,
          goodsName: String(row.goodsName || '').trim(),
          originalGoodsName: String(row.originalGoodsName || row.goodsName || '').trim(),
          quantity: String(row.quantity).trim(),
          standard: String(row.standard).trim(),
          remark: String(row.remark || '').trim()
        }))
      })
      const result = response && response.result
      if (!result || result.code != 0) throw new Error((result && result.msg) || '语音采购保存失败')
      wx.removeStorageSync(DRAFT_STORAGE_KEY)
      wx.hideLoading()
      this.setData({ submitting: false })
      wx.showModal({
        title: '采购商品已生成',
        content: `已生成${(result.data || []).length}种待采购商品，可在备货页继续选择采购方式。`,
        showCancel: false,
        success: () => wx.navigateBack({ delta: 2 })
      })
    } catch (error) {
      wx.hideLoading()
      this.setData({ submitting: false })
      wx.showToast({ title: error.message || '语音采购保存失败', icon: 'none' })
    }
  },

  toBack() {
    wx.navigateBack({ delta: 1 })
  }
})

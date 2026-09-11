import { parseOrderFromTextV2 } from '../../../../lib/orderParserV2'
import { getAsrCredentials } from '../../../../lib/miniProgramCloud'
import { searchVoicePurchaseGoods } from '../../../../lib/apiDepOrder'

const plugin = requirePlugin('QCloudAIVoice')
const speechRecognizerManager = plugin.speechRecognizerManager()
const config = require('../../../../config')
const TENCENT_CLOUD_ENGINE_MODEL_TYPE = config.tencentCloud?.engineModelType || '16k_zh'
const TENCENT_CLOUD_VOICE_FORMAT = config.tencentCloud?.voiceFormat || 1
const DRAFT_STORAGE_KEY = 'voicePurchaseConfirmDraft'

Page({
  data: {
    navBarHeight: 0,
    windowHeight: 0,
    disId: null,
    purchaserId: null,
    inputContent: '',
    items: [],
    isRecording: false,
    recognitionStatus: '',
    duration: 0,
    timer: null,
    searching: false,
    exampleText: '千禾酱油2桶\n王守义十三香3盒\n油菜10斤'
  },

  onLoad() {
    const globalData = getApp().globalData || {}
    const userInfo = wx.getStorageSync('userInfo') || {}
    const disInfo = wx.getStorageSync('disInfo') || userInfo.nxDistributerEntity || {}
    const disId = Number(wx.getStorageSync('ownerDistributerId') || disInfo.nxDistributerId || 0)
    const purchaserId = Number(wx.getStorageSync('ownerUserId') || userInfo.nxDistributerUserId || 0)
    const ratio = Number(globalData.rpxR || 2)
    this.setData({
      disId,
      purchaserId,
      navBarHeight: Number(globalData.navBarHeight || 44) * ratio,
      windowHeight: (Number(globalData.windowHeight || 667) - Number(globalData.navBarHeight || 44)) * ratio
    })
    this._bindSpeechCallbacks()
  },

  onUnload() {
    if (this.data.timer) clearInterval(this.data.timer)
    if (this.data.isRecording) {
      try { speechRecognizerManager.stop() } catch (error) {}
    }
  },

  _bindSpeechCallbacks() {
    speechRecognizerManager.OnRecognitionStart = () => {
      this.setData({ recognitionStatus: '正在听，请说采购清单…' })
    }
    speechRecognizerManager.OnRecognitionResultChange = (res) => {
      if (!res || !res.result || res.result.voice_text_str == null) return
      const spokenText = String(res.result.voice_text_str).trim()
      const inputContent = [this._recordingBaseText, spokenText].filter(Boolean).join('\n')
      this.setData({ inputContent, recognitionStatus: '正在识别…' })
    }
    speechRecognizerManager.OnRecognitionComplete = () => {
      this._finishRecording('语音识别完成')
      if (String(this.data.inputContent || '').trim()) this.parseContent()
    }
    speechRecognizerManager.OnRecorderStop = () => {
      this._finishRecording(this.data.inputContent ? '语音识别完成' : '录音已停止')
    }
    speechRecognizerManager.OnError = (res) => {
      if (res && res.code === 4008) {
        this.setData({ recognitionStatus: '请继续说话…' })
        return
      }
      this._finishRecording('语音识别失败')
      wx.showToast({
        title: res && res.code === 6000 ? '语音服务连接失败' : '语音识别失败',
        icon: 'none'
      })
    }
  },

  _finishRecording(status) {
    if (this.data.timer) clearInterval(this.data.timer)
    this.setData({ timer: null, isRecording: false, recognitionStatus: status })
  },

  _ensureRecordPermission() {
    if (!wx.authorize) return Promise.resolve(true)
    return new Promise((resolve) => {
      wx.authorize({
        scope: 'scope.record',
        success: () => resolve(true),
        fail: () => {
          wx.showModal({
            title: '需要麦克风权限',
            content: '请允许使用麦克风后，再使用语音采购。',
            confirmText: '去设置',
            success: (result) => {
              if (!result.confirm || !wx.openSetting) return resolve(false)
              wx.openSetting({
                success: (setting) => resolve(!!(setting.authSetting && setting.authSetting['scope.record'])),
                fail: () => resolve(false)
              })
            },
            fail: () => resolve(false)
          })
        }
      })
    })
  },

  async startRecord() {
    if (this.data.isRecording) return
    if (!(this.data.disId > 0) || !(this.data.purchaserId > 0)) {
      wx.showToast({ title: '采购身份信息不完整', icon: 'none' })
      return
    }
    const allowed = await this._ensureRecordPermission()
    if (!allowed) return
    let credentials
    try {
      credentials = await getAsrCredentials()
    } catch (error) {
      wx.showToast({ title: error.message || '语音服务初始化失败', icon: 'none' })
      return
    }
    this._recordingBaseText = String(this.data.inputContent || '').trim()
    this.setData({ isRecording: true, recognitionStatus: '准备录音…', duration: 0 })
    const timer = setInterval(() => this.setData({ duration: this.data.duration + 1 }), 1000)
    this.setData({ timer })
    try {
      speechRecognizerManager.start({
        secretkey: credentials.secretKey,
        secretid: credentials.secretId,
        token: credentials.token,
        appid: credentials.appId,
        engine_model_type: TENCENT_CLOUD_ENGINE_MODEL_TYPE,
        voice_format: TENCENT_CLOUD_VOICE_FORMAT
      })
    } catch (error) {
      this._finishRecording('启动录音失败')
      wx.showToast({ title: '启动录音失败', icon: 'none' })
    }
  },

  stopRecord() {
    if (!this.data.isRecording) return
    this._finishRecording('正在完成识别…')
    try { speechRecognizerManager.stop() } catch (error) {}
  },

  onInput(e) {
    this.setData({ inputContent: e.detail.value, items: [] })
  },

  pasteFromClipboard() {
    if (this.data.isRecording) return
    wx.getClipboardData({
      success: (res) => {
        const text = String(res.data || '').trim()
        if (!text) return wx.showToast({ title: '剪贴板为空', icon: 'none' })
        this.setData({ inputContent: text, items: [] })
        this.parseContent()
      }
    })
  },

  useExample() {
    this.setData({ inputContent: this.data.exampleText, items: [] })
    this.parseContent()
  },

  clearAll() {
    if (this.data.isRecording) this.stopRecord()
    this.setData({ inputContent: '', items: [], recognitionStatus: '', duration: 0 })
  },

  parseContent() {
    const text = String(this.data.inputContent || '').trim()
    if (!text) {
      wx.showToast({ title: '请先录音或输入采购清单', icon: 'none' })
      return
    }
    const parsed = parseOrderFromTextV2(text, {
      disId: this.data.disId,
      userId: this.data.purchaserId
    })
    const items = (parsed.orders || []).map((order, index) => ({
      sourceIndex: index,
      goodsName: order.nxDoGoodsName || '',
      originalGoodsName: order.nxDoGoodsOriginalName || order.nxDoGoodsName || '',
      quantity: order.nxDoQuantity || '',
      standard: order.nxDoStandard || '',
      remark: order.nxDoRemark || '',
      needsReview: !!order.v2NeedsReview,
      warning: order.v2Warning || ''
    }))
    this.setData({ items })
    if (!items.length) wx.showToast({ title: '没有识别到商品', icon: 'none' })
  },

  updateItem(e) {
    const index = Number(e.currentTarget.dataset.index)
    const field = e.currentTarget.dataset.field
    if (!this.data.items[index] || !field) return
    this.setData({ [`items[${index}].${field}`]: e.detail.value })
  },

  removeItem(e) {
    const index = Number(e.currentTarget.dataset.index)
    this.setData({ items: this.data.items.filter((_, itemIndex) => itemIndex !== index) })
  },

  addItem() {
    this.setData({
      items: this.data.items.concat({
        sourceIndex: this.data.items.length,
        goodsName: '',
        originalGoodsName: '',
        quantity: '',
        standard: '',
        remark: '',
        needsReview: true,
        warning: '请补全商品信息'
      })
    })
  },

  _validateItems() {
    if (!this.data.items.length) return '请先解析采购清单'
    for (let index = 0; index < this.data.items.length; index++) {
      const item = this.data.items[index]
      if (!String(item.goodsName || '').trim()) return `第${index + 1}条缺少商品名称`
      if (!(Number(item.quantity) > 0)) return `第${index + 1}条数量需要大于0`
      if (!String(item.standard || '').trim()) return `第${index + 1}条缺少采购单位`
    }
    return ''
  },

  async searchAndConfirm() {
    if (this.data.searching) return
    const invalid = this._validateItems()
    if (invalid) return wx.showToast({ title: invalid, icon: 'none' })
    this.setData({ searching: true })
    wx.showLoading({ title: '正在查找商品' })
    try {
      const response = await searchVoicePurchaseGoods({
        disId: this.data.disId,
        items: this.data.items
      })
      const result = response && response.result
      if (!result || result.code != 0) throw new Error((result && result.msg) || '商品查询失败')
      wx.setStorageSync(DRAFT_STORAGE_KEY, {
        disId: this.data.disId,
        purchaserId: this.data.purchaserId,
        sourceText: this.data.inputContent,
        items: result.data || []
      })
      wx.navigateTo({ url: '/subPackage-order/pages/purchase/voiceConfirm/voiceConfirm' })
    } catch (error) {
      wx.showToast({ title: error.message || '商品查询失败', icon: 'none' })
    } finally {
      wx.hideLoading()
      this.setData({ searching: false })
    }
  },

  toBack() {
    wx.navigateBack({ delta: 1 })
  }
})

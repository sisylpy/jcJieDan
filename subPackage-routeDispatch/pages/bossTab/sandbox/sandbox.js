var load = require('../../../../lib/load.js')

import {
  getDispatchSandboxToday,
  overrideSandboxStopTimeWindow
} from '../../../../lib/apiRouteDispatch.js'

import { resolveSession } from '../../routeDispatch/_session.js'
import {
  getPageViewModel,
  pickSectionCard,
  pickTimelineNode
} from '../../routeDispatch/_pageView.js'
import { normalizeMapOverview, resetMapViewport } from '../../routeDispatch/_mapOverview.js'

var timeWindowModal = require('../../../utils/timeWindowModal.js')

var BATCH_CODE = 'MORNING'

function eventCardIndexes(e) {
  if (e && e.detail && e.detail.sectionIndex != null) {
    return e.detail
  }
  return (e && e.currentTarget && e.currentTarget.dataset) || {}
}

function applyPageViewModel(page, data) {
  var pageViewModel = getPageViewModel(data)
  if (pageViewModel) {
    var rawMapOverview = pageViewModel.mapOverview
    pageViewModel = Object.assign({}, pageViewModel, {
      mapOverview: rawMapOverview ? normalizeMapOverview(rawMapOverview) : null
    })
  }
  page.setData({
    loading: false,
    pageViewModel: pageViewModel,
    loadError: pageViewModel ? '' : '后端未返回 pageViewModel',
    mapOverviewVisible: true
  })
}

Component({
  properties: {
    active: {
      type: Boolean,
      value: false
    },
    loadKey: {
      type: Number,
      value: 0
    }
  },

  data: {
    loading: true,
    pageViewModel: null,
    loadError: '',
    pageScrollEnabled: true,
    refresherTriggered: false,
    mapOverviewPadding: [48, 48, 48, 48],
    mapOverviewVisible: true,
    timeWindowModalVisible: false,
    timeWindowSubmitting: false,
    timeWindowPayload: null
  },

  observers: {
    'active, loadKey': function (active, loadKey) {
      if (active && loadKey) {
        this.scheduleLoad()
      }
    }
  },

  methods: {
    noop: function () {},

    scheduleLoad: function (forceRefresh) {
    if (forceRefresh) {
      this._pendingForceLoad = true
    }
    if (this._loadScheduled) {
      return
    }
    this._loadScheduled = true
    var that = this
    setTimeout(function () {
      that._loadScheduled = false
      var force = that._pendingForceLoad
      that._pendingForceLoad = false
      that.loadPageInternal(!!force)
    }, 0)
  },

  onRefreshMap: function () {
    var mapOverview = this.data.pageViewModel && this.data.pageViewModel.mapOverview
    resetMapViewport(this, {
      mapOverview: mapOverview,
      padding: this.data.mapOverviewPadding
    })
  },

  onMapTouchStart: function () {
    if (this.data.pageScrollEnabled) {
      this.setData({ pageScrollEnabled: false })
    }
  },

  onMapTouchEnd: function () {
    if (!this.data.pageScrollEnabled) {
      this.setData({ pageScrollEnabled: true })
    }
  },

  loadPage: function (fromPullDown) {
    if (fromPullDown) {
      this.loadPageInternal(true, false)
      return
    }
    this.scheduleLoad(false)
  },

  onScrollRefresh: function () {
    this.setData({ refresherTriggered: true })
    this.loadPageInternal(true, true)
  },

  finishSilentRefresh: function (fromPullDown, fromRefresher) {
    if (fromPullDown) {
      wx.stopPullDownRefresh()
    }
    if (fromRefresher) {
      this.setData({ refresherTriggered: false })
    }
  },

  loadPageInternal: function (forceRefresh, fromRefresher) {
    var that = this
    fromRefresher = !!fromRefresher
    var fromPullDown = !!forceRefresh && !fromRefresher
    var force = !!forceRefresh
    var loadKey = this.properties.loadKey
    if (this._inflightLoadKey !== null && this._inflightLoadKey !== undefined) {
      this.finishSilentRefresh(fromPullDown, fromRefresher)
      return
    }
    if (!force) {
      if (this._loadedKey === loadKey && this.data.pageViewModel && !this.data.loadError) {
        return
      }
    }
    var disId = resolveSession().disId
    if (!disId) {
      this.setLoadError('未获取到配送商信息，请重新登录', fromPullDown, fromRefresher)
      return
    }
    this._inflightLoadKey = loadKey
    var seq = (this._loadSeq || 0) + 1
    this._loadSeq = seq
    if (!force) {
      load.showLoading('加载今日计划')
    }
    getDispatchSandboxToday({
      disId: disId,
      batchCode: BATCH_CODE
    }).then(function (res) {
      if (seq !== that._loadSeq) {
        return
      }
      that._inflightLoadKey = null
      if (!force) {
        load.hideLoading()
      }
      that.finishSilentRefresh(fromPullDown, fromRefresher)
      if (!res.result || res.result.code !== 0) {
        that.setLoadError((res.result && res.result.msg) || '加载失败', false, false)
        return
      }
      that._loadedKey = loadKey
      applyPageViewModel(that, res.result.data)
    }).catch(function () {
      if (seq !== that._loadSeq) {
        return
      }
      that._inflightLoadKey = null
      if (!force) {
        load.hideLoading()
      }
      that.finishSilentRefresh(fromPullDown, fromRefresher)
      that.setLoadError('网络异常，请稍后重试', false, false)
    })
  },

  setLoadError: function (loadError, fromPullDown, fromRefresher) {
    this.setData({
      loading: false,
      pageViewModel: null,
      loadError: loadError
    })
    this.finishSilentRefresh(!!fromPullDown, !!fromRefresher)
  },

  onRouteCardPrimaryAction: function (e) {
    var ds = eventCardIndexes(e)
    var card = pickSectionCard(this.data.pageViewModel, ds.sectionIndex, ds.cardIndex)
    if (card && card.cardType === 'DRIVER_ROUTE' && card.primaryAction) {
      this.executePrimaryAction(card.primaryAction)
    }
  },

  onTimelineStopHeadTap: function (e) {
    var ds = eventCardIndexes(e)
    var node = pickTimelineNode(this.data.pageViewModel, ds.sectionIndex, ds.cardIndex, ds.nodeIndex)
    if (node && node.primaryAction) {
      this.executePrimaryAction(node.primaryAction)
    }
  },

  onDriverRouteEditTap: function (e) {
    var ds = eventCardIndexes(e)
    var card = pickSectionCard(this.data.pageViewModel, ds.sectionIndex, ds.cardIndex)
    if (!card || card.cardType !== 'DRIVER_ROUTE') {
      return
    }
    this.openDriverRouteEditFromAction(card.routeEditAction)
  },

  onIdleDriverRouteEditTap: function (e) {
    var driverIndex = e.currentTarget.dataset.driverIndex
    var drivers = (this.data.pageViewModel && this.data.pageViewModel.availableDrivers) || []
    var item = drivers[driverIndex]
    if (!item) {
      return
    }
    this.openDriverRouteEditFromAction(item.routeEditAction)
  },

  openDriverRouteEditFromAction: function (action) {
    action = action || {}
    if (action.enabled === false) {
      wx.showToast({
        title: action.editDisabledMessage || action.disabledReason || '当前不可编辑路线',
        icon: 'none'
      })
      return
    }
    if (!action.payload || typeof action.payload !== 'object') {
      wx.showToast({ title: '路线编辑参数缺失，请刷新后重试', icon: 'none' })
      return
    }
    wx.setStorageSync('routeDispatchDriverRouteEditPayload', action.payload)
    wx.navigateTo({
      url: '/subPackage-routeDispatch/pages/routeDispatch/driverRouteEdit/driverRouteEdit'
    })
  },

  onCardPrimaryAction: function (e) {
    var ds = eventCardIndexes(e)
    var card = pickSectionCard(this.data.pageViewModel, ds.sectionIndex, ds.cardIndex)
    if (card) {
      this.executePrimaryAction(card.primaryAction)
    }
  },

  onTimelineNodePrimaryAction: function (e) {
    var ds = e.currentTarget.dataset
    var node = pickTimelineNode(this.data.pageViewModel, ds.sectionIndex, ds.cardIndex, ds.nodeIndex)
    if (node && node.primaryAction) {
      this.executePrimaryAction(node.primaryAction)
    }
  },

  executePrimaryAction: function (action) {
    var that = this
    action = action || {}

    if (!action.actionType) {
      wx.showToast({ title: '缺少 primaryAction.actionType', icon: 'none' })
      return
    }

    var actionType = String(action.actionType).toUpperCase()
    if (actionType === 'STATUS_ONLY') {
      return
    }

    if (actionType === 'RETURN_TO_SANDBOX'
        || actionType === 'CONFIRM_SANDBOX_STOP'
        || actionType === 'CONFIRM_ASSIGN') {
      return
    }

    if (action.enabled === false) {
      wx.showToast({ title: action.disabledReason || '当前不可操作', icon: 'none' })
      return
    }

    if (!action.payload || typeof action.payload !== 'object') {
      wx.showToast({ title: '缺少 primaryAction.payload', icon: 'none' })
      return
    }

    if (actionType === 'GO_LOADING') {
      wx.showToast({ title: '请切换到装车 Tab 查看', icon: 'none' })
      return
    }

    if (actionType === 'START_MANUAL_DISPATCH') {
      this.openManualDispatchDrivers(action.payload)
      return
    }

    if (actionType === 'OPEN_DRIVER_ROUTE_EDIT') {
      this.openDriverRouteEdit(action.payload, action)
      return
    }

    if (actionType === 'EDIT_TODAY_TIME_WINDOW') {
      this.openTimeWindowModal(action.payload)
      return
    }

    wx.showToast({ title: '未接入 actionType: ' + actionType, icon: 'none' })
  },

  openTimeWindowModal: function (payload) {
    this.setData({
      timeWindowModalVisible: true,
      timeWindowPayload: payload || {}
    })
  },

  closeTimeWindowModal: function () {
    if (this.data.timeWindowSubmitting) {
      return
    }
    this.setData({
      timeWindowModalVisible: false,
      timeWindowPayload: null
    })
  },

  submitTimeWindowModal: function (e) {
    var that = this
    if (this.data.timeWindowSubmitting) {
      return
    }
    var form = (e && e.detail && e.detail.form) || {}
    var payload = this.data.timeWindowPayload || {}
    var session = resolveSession()
    var request = timeWindowModal.buildTimeWindowRequest(form, payload, {
      session: session,
      batchCode: BATCH_CODE
    })
    this.setData({ timeWindowSubmitting: true })
    load.showLoading('保存中')
    overrideSandboxStopTimeWindow(request).then(function (resp) {
      load.hideLoading()
      that.setData({ timeWindowSubmitting: false })
      if (!resp.result || resp.result.code !== 0) {
        wx.showToast({ title: (resp.result && resp.result.msg) || '保存失败', icon: 'none' })
        return
      }
      that.setData({ timeWindowModalVisible: false, timeWindowPayload: null })
      wx.showToast({ title: '已更新送达时间', icon: 'success' })
      applyPageViewModel(that, resp.result.data)
    }).catch(function () {
      load.hideLoading()
      that.setData({ timeWindowSubmitting: false })
      wx.showToast({ title: '网络异常', icon: 'none' })
    })
  },

  openDriverRouteEdit: function (payload, action) {
    this.openDriverRouteEditFromAction(Object.assign({}, action || {}, { payload: payload }))
  },

  openDriverRouteEditFromAction: function (action) {
    action = action || {}
    if (action.enabled === false) {
      wx.showToast({
        title: action.editDisabledMessage || action.disabledReason || '当前不可编辑路线',
        icon: 'none'
      })
      return
    }
    if (!action.payload || typeof action.payload !== 'object') {
      wx.showToast({ title: '路线编辑参数缺失，请刷新后重试', icon: 'none' })
      return
    }
    wx.setStorageSync('routeDispatchDriverRouteEditPayload', action.payload)
    wx.navigateTo({
      url: '/subPackage-routeDispatch/pages/routeDispatch/driverRouteEdit/driverRouteEdit'
    })
  },

  openManualDispatchDrivers: function (payload) {
    if (!payload.driverPanoramaPath) {
      wx.showToast({ title: 'payload 缺少 driverPanoramaPath', icon: 'none' })
      return
    }
    wx.setStorageSync('routeDispatchManualDispatchPayload', payload)
    wx.navigateTo({
      url: '/subPackage-routeDispatch/pages/routeDispatch/manualDispatchDrivers/manualDispatchDrivers'
    })
  },

  submitGoLoading: function () {
    wx.showToast({ title: '请切换到装车 Tab 查看', icon: 'none' })
  }
  }
})

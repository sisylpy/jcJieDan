var load = require('../../../../lib/load.js')
var app = getApp()

import { postManualDispatchEditPage } from '../../../../lib/apiRouteDispatch.js'
import { getPageViewModel } from '../_pageView.js'

var EDIT_PAYLOAD_STORAGE_KEY = 'routeDispatchManualRouteEditPayload'

function clonePayload(payload) {
  return JSON.parse(JSON.stringify(payload || {}))
}

function applyEditPage(page, data) {
  var pageViewModel = getPageViewModel(data)
  if (pageViewModel && pageViewModel.actions && pageViewModel.actions.editPagePath) {
    page._editPagePath = pageViewModel.actions.editPagePath
  }
  page.setData({
    loading: false,
    pageViewModel: pageViewModel,
    loadError: pageViewModel ? '' : '后端未返回 pageViewModel'
  })
}

Page({
  data: {
    loading: true,
    pageViewModel: null,
    loadError: '',
    drawerVisible: false,
    drawerForm: {
      manualArrivalSpecified: false,
      requiredLatestArrivalAt: '',
      requiredLatestArrivalTime: '',
      preferredArrivalAt: '',
      preferredArrivalTime: '',
      allowLate: null,
      remarkReason: ''
    },
    requestPayload: null,
    initialPayload: null
  },

  _extractTimePart: function (dateTimeStr) {
    if (!dateTimeStr) {
      return ''
    }
    var str = String(dateTimeStr)
    var match = str.match(/(\d{1,2}:\d{2})/)
    return match ? match[1] : ''
  },

  _buildDateTime: function (timeText) {
    var routeDate = (this.data.requestPayload && this.data.requestPayload.routeDate) || ''
    var time = String(timeText || '').trim()
    if (!time) {
      return ''
    }
    if (time.indexOf(' ') >= 0) {
      return time
    }
    return routeDate ? routeDate + ' ' + time + ':00' : time
  },

  _getIncomingConstraint: function () {
    var vm = this.data.pageViewModel || {}
    return vm.incomingManualTimeConstraint || {}
  },

  _getSelectedManualStopSeq: function () {
    var vm = this.data.pageViewModel || {}
    if (vm.selectedManualStopSeq != null) {
      return vm.selectedManualStopSeq
    }
    var payload = this.data.requestPayload || {}
    return payload.manualStopSeq
  },

  onLoad: function () {
    var globalData = app.globalData
    var payload = wx.getStorageSync(EDIT_PAYLOAD_STORAGE_KEY) || null
    wx.removeStorageSync(EDIT_PAYLOAD_STORAGE_KEY)
    this.setData({
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      requestPayload: payload,
      initialPayload: clonePayload(payload)
    })
    if (!payload || !payload.driverUserId) {
      this.setLoadError('缺少人工路线编辑参数')
      return
    }
    this.loadPage()
  },

  buildRequestPayload: function (extra) {
    var payload = Object.assign({}, this.data.requestPayload || {}, extra || {})
    if (this._editPagePath) {
      payload.editPagePath = this._editPagePath
    }
    if (extra && extra.clearManualStopSeq) {
      delete payload.manualStopSeq
    }
    delete payload.clearManualStopSeq
    return payload
  },

  loadPage: function (extra, silent) {
    var that = this
    var payload = this.buildRequestPayload(extra)
    if (!payload.driverUserId) {
      this.setLoadError('缺少 driverUserId')
      return
    }
    if (!silent) {
      load.showLoading(extra && extra.manualStopSeq != null ? '模拟中' : '加载路线')
    }
    postManualDispatchEditPage(payload).then(function (res) {
      if (!silent) {
        load.hideLoading()
      }
      if (!res.result || res.result.code !== 0) {
        that.setLoadError((res.result && res.result.msg) || '加载失败')
        return
      }
      that.setData({ requestPayload: payload })
      applyEditPage(that, res.result.data)
    }).catch(function () {
      if (!silent) {
        load.hideLoading()
      }
      that.setLoadError('网络异常，请稍后重试')
    })
  },

  setLoadError: function (loadError) {
    this.setData({
      loading: false,
      pageViewModel: null,
      loadError: loadError
    })
  },

  onInsertPositionTap: function (e) {
    var manualStopSeq = e.currentTarget.dataset.manualStopSeq
    if (manualStopSeq == null || manualStopSeq === '') {
      return
    }
    this.loadPage({ manualStopSeq: manualStopSeq })
  },

  onReselectPosition: function () {
    var that = this
    var payload = clonePayload(this.data.initialPayload)
    if (!payload || !payload.driverUserId) {
      return
    }
    delete payload.manualStopSeq
    this.setData({ requestPayload: payload }, function () {
      that.loadPage({ clearManualStopSeq: true })
    })
  },

  onOpenConstraintDrawer: function () {
    var incoming = this._getIncomingConstraint()
    this.setData({
      drawerVisible: true,
      drawerForm: {
        manualArrivalSpecified: incoming.manualArrivalSpecified,
        requiredLatestArrivalAt: incoming.requiredLatestArrivalAt || '',
        requiredLatestArrivalTime: this._extractTimePart(incoming.requiredLatestArrivalAt),
        preferredArrivalAt: incoming.preferredArrivalAt || '',
        preferredArrivalTime: this._extractTimePart(incoming.preferredArrivalAt),
        allowLate: incoming.allowLate,
        remarkReason: incoming.remarkReason || ''
      }
    })
  },

  onCloseConstraintDrawer: function () {
    this.setData({ drawerVisible: false })
  },

  onDrawerMaskTap: function () {
    this.setData({ drawerVisible: false })
  },

  onDrawerSpecifiedChange: function (e) {
    this.setData({
      'drawerForm.manualArrivalSpecified': !!e.detail.value
    })
  },

  onDrawerRequiredTimeChange: function (e) {
    this.setData({
      'drawerForm.requiredLatestArrivalTime': e.detail.value || ''
    })
  },

  onDrawerPreferredTimeChange: function (e) {
    this.setData({
      'drawerForm.preferredArrivalTime': e.detail.value || ''
    })
  },

  onDrawerAllowLateTap: function (e) {
    var val = e.currentTarget.dataset.value
    this.setData({
      'drawerForm.allowLate': val === '1'
    })
  },

  onDrawerRemarkInput: function (e) {
    this.setData({
      'drawerForm.remarkReason': (e.detail.value || '').slice(0, 50)
    })
  },

  onDrawerClear: function () {
    this.setData({
      drawerForm: {
        manualArrivalSpecified: false,
        requiredLatestArrivalAt: '',
        requiredLatestArrivalTime: '',
        preferredArrivalAt: '',
        preferredArrivalTime: '',
        allowLate: null,
        remarkReason: ''
      }
    })
    var extra = {
      requiredLatestArrivalAt: '',
      clearManualStopSeq: false
    }
    var manualStopSeq = this._getSelectedManualStopSeq()
    if (manualStopSeq != null) {
      extra.manualStopSeq = manualStopSeq
    }
    this.loadPage(extra)
    this.setData({ drawerVisible: false })
  },

  onDrawerSave: function () {
    var form = this.data.drawerForm || {}
    var extra = {}
    var manualStopSeq = this._getSelectedManualStopSeq()
    if (manualStopSeq != null) {
      extra.manualStopSeq = manualStopSeq
    }
    if (form.manualArrivalSpecified && form.requiredLatestArrivalTime) {
      extra.requiredLatestArrivalAt = this._buildDateTime(form.requiredLatestArrivalTime)
    } else if (!form.manualArrivalSpecified) {
      extra.requiredLatestArrivalAt = ''
    }
    if (form.preferredArrivalTime) {
      extra.preferredArrivalAt = this._buildDateTime(form.preferredArrivalTime)
    }
    if (form.allowLate != null) {
      extra.allowLate = form.allowLate
    }
    if (form.remarkReason) {
      extra.remarkReason = form.remarkReason
    }
    this.loadPage(extra)
    this.setData({ drawerVisible: false })
  },

  onBottomReset: function () {
    var initial = clonePayload(this.data.initialPayload)
    if (!initial || !initial.driverUserId) {
      return
    }
    delete initial.manualStopSeq
    this.setData({
      requestPayload: initial,
      drawerForm: {
        manualArrivalSpecified: false,
        requiredLatestArrivalAt: '',
        requiredLatestArrivalTime: '',
        preferredArrivalAt: '',
        preferredArrivalTime: '',
        allowLate: null,
        remarkReason: ''
      }
    })
    this.loadPage({ clearManualStopSeq: true })
  },

  onBottomResimulate: function () {
    var extra = {}
    var manualStopSeq = this._getSelectedManualStopSeq()
    if (manualStopSeq != null) {
      extra.manualStopSeq = manualStopSeq
    }
    var form = this.data.drawerForm || {}
    var incoming = this._getIncomingConstraint()
    if (form.requiredLatestArrivalTime) {
      extra.requiredLatestArrivalAt = this._buildDateTime(form.requiredLatestArrivalTime)
    } else if (incoming.requiredLatestArrivalAt) {
      extra.requiredLatestArrivalAt = incoming.requiredLatestArrivalAt
    }
    this.loadPage(extra, true)
  },

  onBottomConfirmTap: function () {
    var vm = this.data.pageViewModel || {}
    var actions = vm.actions || {}
    if (!actions.confirmEnabled) {
      wx.showToast({ title: '确认排单暂未开放', icon: 'none' })
    }
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 })
  }
})

var load = require('../../../../lib/load.js')
var app = getApp()

import {
  postDriverRouteEditPage,
  postDriverRouteEditPreview,
  postDriverRouteEditConfirm
} from '../../../../lib/apiRouteDispatch.js'
import { getPageViewModel } from '../_pageView.js'
import { normalizeMapOverview } from '../_mapOverview.js'

var EDIT_PAYLOAD_STORAGE_KEY = 'routeDispatchDriverRouteEditPayload'

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value || {}))
}

function extractStopKeys(routeStops) {
  return (routeStops || []).map(function (item) {
    return item && item.stopKey
  }).filter(function (key) {
    return !!key
  })
}

function normalizeStopList(stops) {
  return (stops || []).map(function (stop, index) {
    if (!stop || typeof stop !== 'object') {
      return stop
    }
    return Object.assign({}, stop, {
      seq: stop.seq != null ? stop.seq : index + 1
    })
  })
}

function indexStopMap(stops) {
  var map = {}
  ;(stops || []).forEach(function (stop) {
    if (stop && stop.stopKey) {
      map[stop.stopKey] = stop
    }
  })
  return map
}

function mergeStopMap(baseMap, stops) {
  var next = Object.assign({}, baseMap || {})
  ;(stops || []).forEach(function (stop) {
    if (stop && stop.stopKey) {
      next[stop.stopKey] = Object.assign({}, next[stop.stopKey] || {}, stop)
    }
  })
  return next
}

function getWarnings(pageViewModel) {
  var vm = pageViewModel || {}
  if (Array.isArray(vm.warnings)) {
    return vm.warnings
  }
  if (Array.isArray(vm.riskWarnings)) {
    return vm.riskWarnings
  }
  return []
}

function hasErrorWarning(pageViewModel) {
  return getWarnings(pageViewModel).some(function (item) {
    return String(item.level || '').toLowerCase() === 'error'
  })
}

function computeConfirmReady(pageViewModel) {
  var actions = (pageViewModel && pageViewModel.actions) || {}
  return !!actions.confirmEnabled && !hasErrorWarning(pageViewModel)
}

Page({
  data: {
    loading: true,
    previewing: false,
    confirming: false,
    pageViewModel: null,
    loadError: '',
    requestPayload: null,
    initialPayload: null,
    pageTitle: '编辑司机路线',
    stopKeys: [],
    stopMap: {},
    routeStops: [],
    addableStops: [],
    displayWarnings: [],
    confirmReady: false,
    pageScrollEnabled: true,
    mapOverviewPadding: [56, 32, 72, 32]
  },

  onLoad: function () {
    var globalData = app.globalData
    var payload = wx.getStorageSync(EDIT_PAYLOAD_STORAGE_KEY) || null
    wx.removeStorageSync(EDIT_PAYLOAD_STORAGE_KEY)
    this.setData({
      navBarHeight: globalData.navBarHeight * globalData.rpxR,
      requestPayload: payload,
      initialPayload: cloneJson(payload),
      pageTitle: payload && payload.manualDispatch ? '调整送货顺序' : '编辑司机路线'
    })
    if (!payload || !payload.driverUserId) {
      this.setLoadError('缺少司机路线编辑参数')
      return
    }
    this.loadPage()
  },

  buildRequestPayload: function () {
    return Object.assign({}, this.data.requestPayload || {}, {
      stopKeys: (this.data.stopKeys || []).slice()
    })
  },

  rememberActionPaths: function (pageViewModel) {
    var actions = (pageViewModel && pageViewModel.actions) || {}
    this._previewPath = actions.previewPath || actions.previewPagePath
    this._confirmPath = actions.confirmPath || actions.confirmPagePath
    if (actions.editPagePath) {
      this._editPagePath = actions.editPagePath
    }
  },

  applyPageViewModel: function (data, options) {
    options = options || {}
    var pageViewModel = getPageViewModel(data)
    if (!pageViewModel) {
      this.setLoadError('后端未返回 pageViewModel')
      return
    }
    this.rememberActionPaths(pageViewModel)
    var rawMapOverview = pageViewModel.mapOverview
    if (rawMapOverview) {
      pageViewModel = Object.assign({}, pageViewModel, {
        mapOverview: normalizeMapOverview(rawMapOverview)
      })
    }
    var routeStopsFromVm = pageViewModel.routeStops || []
    var addableFromVm = pageViewModel.addableStops || pageViewModel.availableCustomers || []
    var stopMap = mergeStopMap(this.data.stopMap, routeStopsFromVm.concat(addableFromVm))
    var stopKeys = options.keepStopKeys
      ? (this.data.stopKeys || []).slice()
      : ((pageViewModel.stopKeys && pageViewModel.stopKeys.length)
        ? pageViewModel.stopKeys.slice()
        : extractStopKeys(routeStopsFromVm))
    var that = this
    this.setData({
      loading: false,
      previewing: false,
      pageViewModel: pageViewModel,
      stopMap: stopMap,
      stopKeys: stopKeys,
      displayWarnings: getWarnings(pageViewModel),
      confirmReady: computeConfirmReady(pageViewModel),
      loadError: '',
      pageTitle: pageViewModel.pageTitle || this.data.pageTitle
    }, function () {
      that.rebuildLists()
    })
  },

  rebuildLists: function () {
    var stopKeys = this.data.stopKeys || []
    var stopMap = this.data.stopMap || {}
    var pageViewModel = this.data.pageViewModel || {}
    var incomingDepId = this.data.requestPayload && (this.data.requestPayload.departmentId || this.data.requestPayload.depFatherId)
    var currentSet = {}
    var routeStops = []
    if (stopKeys.length > 0) {
      routeStops = stopKeys.map(function (stopKey, index) {
        currentSet[stopKey] = true
        var stop = stopMap[stopKey] || { stopKey: stopKey }
        return Object.assign({}, stop, {
          stopKey: stopKey,
          seq: index + 1,
          isIncomingStop: incomingDepId != null && stop.departmentId === incomingDepId
        })
      })
    } else if ((pageViewModel.routeStops || []).length > 0) {
      routeStops = normalizeStopList(pageViewModel.routeStops).map(function (stop) {
        if (stop && stop.stopKey) {
          currentSet[stop.stopKey] = true
        }
        return Object.assign({}, stop, {
          isIncomingStop: incomingDepId != null && stop.departmentId === incomingDepId
        })
      })
    }
    var addableStops = Object.keys(stopMap).filter(function (stopKey) {
      return !currentSet[stopKey]
    }).map(function (stopKey) {
      return stopMap[stopKey]
    })
    this.setData({
      routeStops: routeStops,
      addableStops: addableStops
    })
  },

  loadPage: function () {
    var that = this
    var payload = cloneJson(this.data.initialPayload)
    if (!payload || !payload.driverUserId) {
      this.setLoadError('缺少 driverUserId')
      return
    }
    load.showLoading('加载路线')
    postDriverRouteEditPage(payload).then(function (res) {
      load.hideLoading()
      if (!res.result || res.result.code !== 0) {
        that.setLoadError((res.result && res.result.msg) || '加载失败')
        return
      }
      that.setData({ requestPayload: payload, stopMap: {} })
      that.applyPageViewModel(res.result.data)
    }).catch(function () {
      load.hideLoading()
      that.setLoadError('网络异常，请稍后重试')
    })
  },

  previewPage: function () {
    var that = this
    if (this.data.previewing) {
      return
    }
    var payload = this.buildRequestPayload()
    if (!payload.driverUserId) {
      wx.showToast({ title: '缺少 driverUserId', icon: 'none' })
      return
    }
    this.setData({ previewing: true })
    load.showLoading('重新试算')
    postDriverRouteEditPreview(payload).then(function (res) {
      load.hideLoading()
      if (!res.result || res.result.code !== 0) {
        that.setData({ previewing: false })
        wx.showToast({ title: (res.result && res.result.msg) || '试算失败', icon: 'none' })
        return
      }
      that.setData({ requestPayload: payload })
      that.applyPageViewModel(res.result.data, { keepStopKeys: true })
    }).catch(function () {
      load.hideLoading()
      that.setData({ previewing: false })
    })
  },

  setLoadError: function (loadError) {
    this.setData({
      loading: false,
      previewing: false,
      pageViewModel: null,
      loadError: loadError
    })
  },

  onMoveStop: function (e) {
    var index = Number(e.currentTarget.dataset.index)
    var direction = Number(e.currentTarget.dataset.direction)
    if (isNaN(index) || !direction) {
      return
    }
    var stopKeys = (this.data.stopKeys || []).slice()
    var target = index + direction
    if (target < 0 || target >= stopKeys.length) {
      return
    }
    var temp = stopKeys[index]
    stopKeys[index] = stopKeys[target]
    stopKeys[target] = temp
    this.setData({ stopKeys: stopKeys })
    this.rebuildLists()
  },

  onRemoveStop: function (e) {
    var index = Number(e.currentTarget.dataset.index)
    if (isNaN(index)) {
      return
    }
    var stopKeys = (this.data.stopKeys || []).slice()
    if (index < 0 || index >= stopKeys.length) {
      return
    }
    stopKeys.splice(index, 1)
    this.setData({ stopKeys: stopKeys })
    this.rebuildLists()
  },

  onAddStop: function (e) {
    var stopKey = e.currentTarget.dataset.stopKey
    if (!stopKey) {
      return
    }
    var stopKeys = (this.data.stopKeys || []).slice()
    if (stopKeys.indexOf(stopKey) >= 0) {
      return
    }
    stopKeys.push(stopKey)
    this.setData({ stopKeys: stopKeys })
    this.rebuildLists()
  },

  onBottomReset: function () {
    var initial = cloneJson(this.data.initialPayload)
    this.setData({
      requestPayload: initial,
      stopMap: {},
      stopKeys: [],
      pageTitle: initial && initial.manualDispatch ? '调整送货顺序' : '编辑司机路线'
    })
    this.loadPage()
  },

  onBottomPreview: function () {
    this.previewPage()
  },

  onBottomConfirm: function () {
    var that = this
    var pageViewModel = this.data.pageViewModel || {}
    var actions = pageViewModel.actions || {}
    if (!this.data.confirmReady) {
      wx.showToast({
        title: actions.confirmDisabledReason || '当前不可确认派单',
        icon: 'none'
      })
      return
    }
    if (this.data.confirming) {
      return
    }
    var payload = this.buildRequestPayload()
    this.setData({ confirming: true })
    load.showLoading('确认中')
    postDriverRouteEditConfirm(payload).then(function (res) {
      load.hideLoading()
      that.setData({ confirming: false })
      if (!res.result || res.result.code !== 0) {
        wx.showToast({ title: (res.result && res.result.msg) || '确认失败', icon: 'none' })
        return
      }
      var data = (res.result && res.result.data) || {}
      if (data.enteredLoading) {
        wx.showToast({ title: '已确认并进入装车', icon: 'success' })
        setTimeout(function () {
          wx.redirectTo({
            url: '/subPackage-routeDispatch/pages/routeDispatch/loading/loading'
          })
        }, 400)
        return
      }
      if (that.data.requestPayload && that.data.requestPayload.manualDispatch) {
        wx.showToast({ title: '已确认派单', icon: 'success' })
        setTimeout(function () {
          wx.navigateBack({ delta: 2 })
        }, 400)
        return
      }
      if (data.enterLoadingBlockedReason) {
        wx.showToast({ title: data.enterLoadingBlockedReason, icon: 'none', duration: 2500 })
      } else {
        wx.showToast({ title: '已确认派单', icon: 'success' })
      }
      setTimeout(function () {
        wx.navigateBack({ delta: 1 })
      }, 400)
    }).catch(function () {
      load.hideLoading()
      that.setData({ confirming: false })
    })
  },

  toBack: function () {
    wx.navigateBack({ delta: 1 })
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
  }
})

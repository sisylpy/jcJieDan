import {
  completeDeliveryStop,
  markDeliveryStopException
} from '../../../lib/apiRouteDispatch.js'

export var DELIVERY_EXCEPTION_TYPES = [
  { type: 'CUSTOMER_NOT_AVAILABLE', label: '客户不在' },
  { type: 'SHORTAGE', label: '少货' },
  { type: 'RETURN_GOODS', label: '退货' },
  { type: 'ADDRESS_ERROR', label: '地址异常' },
  { type: 'TEMP_CHANGE', label: '临时改送' },
  { type: 'OTHER', label: '其他' }
]

export var NAV_PENDING_LABEL = '导航功能待接入'

export function showExceptionTypePicker(onSelect) {
  wx.showActionSheet({
    itemList: DELIVERY_EXCEPTION_TYPES.map(function (item) {
      return item.label
    }),
    success: function (res) {
      var picked = DELIVERY_EXCEPTION_TYPES[res.tapIndex]
      if (picked && onSelect) {
        onSelect(picked)
      }
    }
  })
}

export function submitDeliveryComplete(options) {
  var deliveryStopId = options.deliveryStopId
  var operatorUserId = options.operatorUserId
  var onSuccess = options.onSuccess
  var onFail = options.onFail
  var onAlways = options.onAlways

  if (!deliveryStopId) {
    wx.showToast({ title: '缺少 deliveryStopId', icon: 'none' })
    return
  }

  wx.showModal({
    title: '确认送达',
    content: '确认该客户已送达？',
    confirmText: '确认',
    success: function (res) {
      if (!res.confirm) {
        return
      }
      if (options.onSubmitStart) {
        options.onSubmitStart()
      }
      completeDeliveryStop(deliveryStopId, {
        operatorUserId: operatorUserId,
        remark: options.remark || ''
      }).then(function (resp) {
        if (resp.result.code !== 0) {
          wx.showToast({
            title: resp.result.msg || '操作失败',
            icon: 'none'
          })
          if (onFail) {
            onFail(resp)
          }
          return
        }
        wx.showToast({
          title: '已送达',
          icon: 'success'
        })
        if (onSuccess) {
          onSuccess(resp)
        }
      }).catch(function () {
        if (onFail) {
          onFail()
        }
      }).then(function () {
        if (onAlways) {
          onAlways()
        }
      })
    }
  })
}

export function submitDeliveryException(options) {
  var deliveryStopId = options.deliveryStopId
  var operatorUserId = options.operatorUserId
  var onSuccess = options.onSuccess
  var onFail = options.onFail
  var onAlways = options.onAlways

  if (!deliveryStopId) {
    wx.showToast({ title: '缺少 deliveryStopId', icon: 'none' })
    return
  }

  showExceptionTypePicker(function (picked) {
    if (options.onSubmitStart) {
      options.onSubmitStart()
    }
    markDeliveryStopException(deliveryStopId, {
      operatorUserId: operatorUserId,
      exceptionType: picked.type,
      remark: picked.label
    }).then(function (resp) {
      if (resp.result.code !== 0) {
        wx.showToast({
          title: resp.result.msg || '上报失败',
          icon: 'none'
        })
        if (onFail) {
          onFail(resp)
        }
        return
      }
      wx.showToast({
        title: '已上报异常',
        icon: 'success'
      })
      if (onSuccess) {
        onSuccess(resp)
      }
    }).catch(function () {
      if (onFail) {
        onFail()
      }
    }).then(function () {
      if (onAlways) {
        onAlways()
      }
    })
  })
}

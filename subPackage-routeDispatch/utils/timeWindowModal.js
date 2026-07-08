function secondsToPickerValue(seconds) {
  if (seconds == null || seconds === '') {
    return ''
  }
  var total = parseInt(seconds, 10)
  if (isNaN(total)) {
    return ''
  }
  var h = Math.floor(total / 3600)
  var m = Math.floor((total % 3600) / 60)
  return ('0' + h).slice(-2) + ':' + ('0' + m).slice(-2)
}

function pickerValueToSeconds(timeStr) {
  if (!timeStr || typeof timeStr !== 'string') {
    return null
  }
  var parts = timeStr.split(':')
  if (parts.length < 2) {
    return null
  }
  var h = parseInt(parts[0], 10)
  var m = parseInt(parts[1], 10)
  if (isNaN(h) || isNaN(m)) {
    return null
  }
  return h * 3600 + m * 60
}

function buildFormFromPayload(payload) {
  payload = payload || {}
  return {
    customerName: payload.customerName || '客户',
    customerWindowLabel: payload.customerWindowLabel || '',
    earliestPicker: secondsToPickerValue(payload.earliestDeliveryTimeS),
    latestPicker: secondsToPickerValue(payload.latestDeliveryTimeS),
    reason: ''
  }
}

function validateTimeWindowForm(form) {
  form = form || {}
  if (pickerValueToSeconds(form.latestPicker) == null) {
    return { ok: false, message: '请选择最晚送达时间' }
  }
  return { ok: true }
}

function buildTimeWindowRequest(form, payload, options) {
  form = form || {}
  payload = payload || {}
  options = options || {}
  var session = options.session || {}
  return Object.assign({}, payload, {
    disId: payload.disId || session.disId,
    batchCode: payload.batchCode || options.batchCode,
    operatorUserId: payload.operatorUserId || session.operatorUserId,
    earliestDeliveryTimeS: pickerValueToSeconds(form.earliestPicker),
    latestDeliveryTimeS: pickerValueToSeconds(form.latestPicker),
    reason: (form.reason || '').trim()
  })
}

module.exports = {
  secondsToPickerValue: secondsToPickerValue,
  pickerValueToSeconds: pickerValueToSeconds,
  buildFormFromPayload: buildFormFromPayload,
  validateTimeWindowForm: validateTimeWindowForm,
  buildTimeWindowRequest: buildTimeWindowRequest
}

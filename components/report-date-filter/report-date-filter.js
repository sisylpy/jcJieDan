Component({
  properties: {
    label: { type: String, value: '本月' },
    startDate: { type: String, value: '' },
    stopDate: { type: String, value: '' },
    emptyText: { type: String, value: '请选择日期' }
  },
  data: { rangeText: '请选择日期' },
  observers: {
    'startDate, stopDate, emptyText': function (startDate, stopDate, emptyText) {
      this.setData({ rangeText: formatRange(startDate, stopDate, emptyText) })
    }
  },
  methods: {
    selectDate() { this.triggerEvent('select') }
  }
})

function formatRange(startDate, stopDate, emptyText) {
  if (!startDate && !stopDate) return emptyText || '请选择日期'
  if (!startDate || !stopDate) return startDate || stopDate
  const start = parts(startDate)
  const stop = parts(stopDate)
  if (!start || !stop) return startDate === stopDate ? startDate : startDate + '–' + stopDate
  if (startDate === stopDate) return start.month + '月' + start.day + '日'
  if (start.year === stop.year) {
    return start.month + '月' + start.day + '日–' + stop.month + '月' + stop.day + '日'
  }
  return start.year + '年' + start.month + '月' + start.day + '日–' +
    stop.year + '年' + stop.month + '月' + stop.day + '日'
}

function parts(value) {
  const match = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value || '')
  return match ? { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) } : null
}

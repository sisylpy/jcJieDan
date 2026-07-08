var timeWindowModal = require('../../utils/timeWindowModal.js')

Component({
  properties: {
    visible: {
      type: Boolean,
      value: false
    },
    submitting: {
      type: Boolean,
      value: false
    },
    payload: {
      type: Object,
      value: null
    }
  },

  data: {
    form: {
      customerName: '',
      customerWindowLabel: '',
      earliestPicker: '',
      latestPicker: '',
      reason: ''
    }
  },

  observers: {
    'visible, payload': function (visible, payload) {
      if (visible && payload) {
        this.setData({
          form: timeWindowModal.buildFormFromPayload(payload)
        })
      }
    }
  },

  methods: {
    stopPropagation: function () {},

    onEarliestChange: function (e) {
      this.setData({ 'form.earliestPicker': e.detail.value })
    },

    onLatestChange: function (e) {
      this.setData({ 'form.latestPicker': e.detail.value })
    },

    onReasonInput: function (e) {
      this.setData({ 'form.reason': e.detail.value })
    },

    onCancel: function () {
      if (this.data.submitting) {
        return
      }
      this.triggerEvent('cancel')
    },

    onConfirm: function () {
      if (this.data.submitting) {
        return
      }
      var validation = timeWindowModal.validateTimeWindowForm(this.data.form)
      if (!validation.ok) {
        wx.showToast({ title: validation.message, icon: 'none' })
        return
      }
      this.triggerEvent('confirm', {
        form: this.data.form
      })
    }
  }
})

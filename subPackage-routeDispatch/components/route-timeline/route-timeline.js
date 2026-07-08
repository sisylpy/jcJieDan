Component({
  properties: {
    timeline: {
      type: Array,
      value: []
    },
    variant: {
      type: String,
      value: 'default'
    },
    showIncomingTag: {
      type: Boolean,
      value: false
    },
    routeStopsLength: {
      type: Number,
      value: 0
    },
    removingStop: {
      type: Boolean,
      value: false
    },
    sectionIndex: {
      type: Number,
      value: -1
    },
    cardIndex: {
      type: Number,
      value: -1
    }
  },

  methods: {
    relay: function (e) {
      this.triggerEvent(e.type, e.detail)
    }
  }
})

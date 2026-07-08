Component({
  properties: {
    stop: {
      type: Object,
      value: null
    },
    mode: {
      type: String,
      value: 'timeline'
    },
    variant: {
      type: String,
      value: 'default'
    },
    seq: {
      type: Number,
      value: 0
    },
    badgeLabel: {
      type: String,
      value: ''
    },
    driverLabel: {
      type: String,
      value: ''
    },
    primaryAction: {
      type: Object,
      value: null
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
    },
    nodeIndex: {
      type: Number,
      value: -1
    }
  },

  methods: {
    emitMeta: function (name, extra) {
      var payload = {
        sectionIndex: this.properties.sectionIndex,
        cardIndex: this.properties.cardIndex,
        nodeIndex: this.properties.nodeIndex
      }
      if (extra) {
        Object.assign(payload, extra)
      }
      this.triggerEvent(name, payload)
    },

    onHeadTap: function () {
      if (this.properties.mode === 'unassigned') {
        return
      }
      this.emitMeta('headtap')
    },

    onPrimaryAction: function () {
      this.emitMeta('primaryaction')
    },

    onExceptionAction: function () {
      this.emitMeta('exceptionaction')
    },

    onMoveStop: function (e) {
      var ds = e.currentTarget.dataset
      this.emitMeta('movestop', {
        index: ds.index,
        direction: ds.direction
      })
    },

    onRemoveStop: function (e) {
      var ds = e.currentTarget.dataset
      this.emitMeta('removestop', {
        index: ds.index
      })
    }
  }
})

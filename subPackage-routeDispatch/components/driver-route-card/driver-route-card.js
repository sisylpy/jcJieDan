Component({
  properties: {
    card: {
      type: Object,
      value: null
    },
    variant: {
      type: String,
      value: 'dispatch'
    },
    sectionIndex: {
      type: Number,
      value: -1
    },
    cardIndex: {
      type: Number,
      value: -1
    },
    cardId: {
      type: String,
      value: ''
    }
  },

  methods: {
    relay: function (e) {
      var detail = Object.assign({}, e.detail || {}, {
        sectionIndex: this.properties.sectionIndex,
        cardIndex: this.properties.cardIndex
      })
      this.triggerEvent(e.type, detail)
    },

    onRouteEditTap: function () {
      this.triggerEvent('routeedit', {
        sectionIndex: this.properties.sectionIndex,
        cardIndex: this.properties.cardIndex
      })
    },

    onViewRouteTap: function () {
      this.triggerEvent('viewroute', {
        sectionIndex: this.properties.sectionIndex,
        cardIndex: this.properties.cardIndex
      })
    },

    onRouteCardPrimaryAction: function () {
      this.triggerEvent('routecardprimaryaction', {
        sectionIndex: this.properties.sectionIndex,
        cardIndex: this.properties.cardIndex
      })
    }
  }
})

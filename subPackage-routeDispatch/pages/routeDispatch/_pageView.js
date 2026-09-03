/** 从接口 data 取出 pageViewModel；退货站点允许按独立 stopKey 恢复业务标识。 */

function hasReturnPickupKey(stop) {
  if (!stop || typeof stop !== 'object') return false
  var keys = [stop.sandboxStopKey, stop.cardKey, stop.stopKey]
  for (var i = 0; i < keys.length; i++) {
    if (typeof keys[i] === 'string' && keys[i].indexOf('return-pickup:') === 0) {
      return true
    }
  }
  return false
}

function decorateReturnPickupStop(stop) {
  if (!stop || typeof stop !== 'object') return stop
  var returnPickup = stop.isReturnPickup === true
    || stop.taskType === 'RETURN_PICKUP'
    || hasReturnPickupKey(stop)
  if (!returnPickup) return stop
  return Object.assign({}, stop, {
    isReturnPickup: true,
    taskType: 'RETURN_PICKUP',
    businessTypeLabel: stop.businessTypeLabel || '客户退货取货'
  })
}

function decorateCard(card) {
  if (!card || typeof card !== 'object') return card
  var next = decorateReturnPickupStop(card)
  if (Array.isArray(card.timeline)) {
    next = Object.assign({}, next, {
      timeline: card.timeline.map(decorateReturnPickupStop)
    })
  }
  return next
}

function decorateReturnPickupPage(pageViewModel) {
  var next = Object.assign({}, pageViewModel)
  if (Array.isArray(pageViewModel.sections)) {
    next.sections = pageViewModel.sections.map(function (section) {
      if (!section || !Array.isArray(section.cards)) return section
      return Object.assign({}, section, { cards: section.cards.map(decorateCard) })
    })
  }
  ;['routeStops', 'addableStops', 'availableCustomers'].forEach(function (field) {
    if (Array.isArray(pageViewModel[field])) {
      next[field] = pageViewModel[field].map(decorateReturnPickupStop)
    }
  })
  if (pageViewModel.storeCard && typeof pageViewModel.storeCard === 'object') {
    next.storeCard = decorateReturnPickupStop(pageViewModel.storeCard)
  }
  return next
}

export function getPageViewModel(data) {
  data = data || {}
  if (data.pageViewModel && typeof data.pageViewModel === 'object') {
    return decorateReturnPickupPage(data.pageViewModel)
  }
  return null
}

export function pickSectionCard(pageViewModel, sectionIndex, cardIndex) {
  var sections = (pageViewModel && pageViewModel.sections) || []
  var section = sections[sectionIndex]
  if (!section || !Array.isArray(section.cards)) {
    return null
  }
  return section.cards[cardIndex] || null
}

export function pickTimelineNode(pageViewModel, sectionIndex, cardIndex, nodeIndex) {
  var card = pickSectionCard(pageViewModel, sectionIndex, cardIndex)
  if (!card || !Array.isArray(card.timeline)) {
    return null
  }
  return card.timeline[nodeIndex] || null
}

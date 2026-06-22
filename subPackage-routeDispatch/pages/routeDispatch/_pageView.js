/** 从接口 data 取出 pageViewModel，不做字段校验与组装。 */

export function getPageViewModel(data) {
  data = data || {}
  if (data.pageViewModel && typeof data.pageViewModel === 'object') {
    return data.pageViewModel
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

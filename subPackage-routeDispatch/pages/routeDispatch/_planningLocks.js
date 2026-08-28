function stopDepartmentId(stop) {
  stop = stop || {}
  if (stop.depFatherId != null) return stop.depFatherId
  if (stop.departmentId != null) return stop.departmentId
  if (stop.depId != null) return stop.depId
  return null
}

function lockLabel(lock) {
  var driverName = lock && lock.driverName != null
    ? String(lock.driverName).trim()
    : ''
  return driverName ? '已锁定给 ' + driverName : '已锁定司机'
}

function decorateStop(stop, lockByDepartmentId) {
  if (!stop || typeof stop !== 'object') return stop
  var departmentId = stopDepartmentId(stop)
  var lock = departmentId != null
    ? lockByDepartmentId[String(departmentId)]
    : null
  if (!lock) return stop
  return Object.assign({}, stop, {
    driverLocked: true,
    lockedDriverUserId: lock.driverUserId,
    lockedDriverName: lock.driverName || '',
    driverLockLabel: lockLabel(lock),
    driverLockWarning: lock.warning || ''
  })
}

/**
 * 只把 Server planning.stopLocks 的事实映射到页面站点，绝不根据路线归属推断锁定。
 */
export function decoratePlanningLocks(pageViewModel) {
  if (!pageViewModel || typeof pageViewModel !== 'object') return pageViewModel
  var planning = pageViewModel.planning || {}
  var stopLocks = Array.isArray(planning.stopLocks) ? planning.stopLocks : []
  if (!stopLocks.length) return pageViewModel

  var lockByDepartmentId = {}
  stopLocks.forEach(function (lock) {
    if (lock && lock.depFatherId != null) {
      lockByDepartmentId[String(lock.depFatherId)] = lock
    }
  })
  if (!Object.keys(lockByDepartmentId).length) return pageViewModel

  var sections = Array.isArray(pageViewModel.sections) ? pageViewModel.sections : []
  return Object.assign({}, pageViewModel, {
    sections: sections.map(function (section) {
      if (!section || !Array.isArray(section.cards)) return section
      return Object.assign({}, section, {
        cards: section.cards.map(function (card) {
          if (!card || typeof card !== 'object') return card
          var decoratedCard = decorateStop(card, lockByDepartmentId)
          if (!Array.isArray(card.timeline)) return decoratedCard
          return Object.assign({}, decoratedCard, {
            timeline: card.timeline.map(function (node) {
              return decorateStop(node, lockByDepartmentId)
            })
          })
        })
      })
    })
  })
}

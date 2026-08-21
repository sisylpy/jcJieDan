/** 将 pageViewModel.mapOverview 转为微信 map 组件可接受的形态（字段映射 + 类型），不做业务计算。 */

var MARKER_ICON = {
  DEPOT: '/images/Focus-Auto.png',
  CUSTOMER: '/images/primitive-dot.png',
  UNASSIGNED: '/images/primitive-dot.png',
  DEFAULT: '/images/primitive-dot.png'
}

var MARKER_SIZE = {
  width: 14,
  height: 14
}

var MAP_SETTING = {
  enablePoi: false,
  enableBuilding: false,
  enableTraffic: false,
  enableIndoorMap: false
}

function toNum(value) {
  if (value == null || value === '') {
    return null
  }
  var n = Number(value)
  return isFinite(n) ? n : null
}

function readCoord(source) {
  if (!source || typeof source !== 'object') {
    return null
  }
  var latitude = toNum(source.latitude != null ? source.latitude : source.lat)
  var longitude = toNum(source.longitude != null ? source.longitude : source.lng)
  if (latitude == null || longitude == null) {
    return null
  }
  return { latitude: latitude, longitude: longitude }
}

function applyMarkerIcon(target, markerType, source) {
  source = source || {}
  target.iconPath = source.iconPath || MARKER_ICON[markerType] || MARKER_ICON.DEFAULT
  target.width = toNum(source.width) || MARKER_SIZE.width
  target.height = toNum(source.height) || MARKER_SIZE.height
}

function buildDepotLabel(name) {
  return {
    content: String(name || '市场'),
    color: '#ffffff',
    fontSize: 10,
    bgColor: '#1f2933',
    borderRadius: 12,
    padding: 4,
    anchorX: 0,
    anchorY: -30,
    textAlign: 'center'
  }
}

function buildBadgeLabel(badgeText, color) {
  if (!badgeText) {
    return null
  }
  return {
    content: String(badgeText),
    color: '#ffffff',
    fontSize: 12,
    bgColor: color || '#1AAD19',
    borderRadius: 13,
    padding: 4,
    anchorX: 0,
    anchorY: -14,
    textAlign: 'center'
  }
}

function buildMarkerCallout(marker, markerType) {
  var title = marker.displayTitle || marker.customerName
  if (!title && markerType === 'UNASSIGNED') {
    title = '未分配客户'
  }
  if (!title) {
    return null
  }
  var subtitle = marker.displaySubtitle || marker.arrivalLabel
  var content = String(title)
  if (subtitle) {
    content += '\n' + String(subtitle)
  }
  var color = markerType === 'UNASSIGNED' ? '#344054' : '#1d2939'
  var isCustomer = markerType === 'CUSTOMER'
  return {
    content: content,
    color: color,
    fontSize: isCustomer ? 11 : 10,
    borderRadius: isCustomer ? 0 : 5,
    bgColor: isCustomer ? 'rgba(255,255,255,0)' : 'rgba(255,255,255,0.86)',
    padding: isCustomer ? 0 : 3,
    display: shouldAlwaysShowCallout(marker, markerType) ? 'ALWAYS' : 'BYCLICK',
    textAlign: 'center'
  }
}

function shouldAlwaysShowCallout(marker, markerType) {
  return markerType === 'CUSTOMER' || markerType === 'UNASSIGNED'
}

function normalizeDepotMarker(depot) {
  var coord = readCoord(depot)
  if (!coord) {
    return null
  }
  var marker = {
    id: 0,
    latitude: coord.latitude,
    longitude: coord.longitude
  }
  applyMarkerIcon(marker, 'DEPOT', depot)
  marker.label = buildDepotLabel(depot.name || '市场')
  marker.callout = {
    content: String(depot.name || '市场'),
    color: '#1d2939',
    fontSize: 9,
    borderRadius: 5,
    bgColor: 'rgba(255,255,255,0.88)',
    padding: 3,
    display: 'ALWAYS',
    textAlign: 'center'
  }
  return marker
}

function normalizeMarker(marker, markerId) {
  if (!marker || typeof marker !== 'object') {
    return null
  }
  var coord = readCoord(marker)
  if (!coord) {
    return null
  }
  var id = toNum(marker.id)
  if (id == null) {
    id = markerId
  }
  var markerType = marker.markerType === 'DEPOT'
    ? 'DEPOT'
    : (marker.markerType === 'UNASSIGNED' ? 'UNASSIGNED' : 'CUSTOMER')
  var next = {
    id: id,
    latitude: coord.latitude,
    longitude: coord.longitude
  }
  applyMarkerIcon(next, markerType, marker)
  var badge = buildBadgeLabel(marker.badgeText || (marker.stopSeq != null ? String(marker.stopSeq) : ''), marker.color)
  if (badge) {
    next.label = badge
  }
  var callout = buildMarkerCallout(marker, markerType)
  if (callout) {
    next.callout = callout
  }
  if (marker.customerName) {
    next.title = String(marker.customerName)
  }
  return next
}

function normalizePolyline(line) {
  if (!line || typeof line !== 'object') {
    return null
  }
  var points = (line.points || []).map(readCoord).filter(Boolean)
  if (points.length === 0) {
    return null
  }
  return {
    points: points,
    color: line.color || '#008c7a',
    width: toNum(line.width) || (line.lineStyle === 'DASHED' ? 2 : 3),
    borderWidth: 0,
    arrowLine: line.lineStyle !== 'DASHED',
    dottedLine: line.lineStyle === 'DASHED'
  }
}

function normalizeMissingStops(stops) {
  if (!Array.isArray(stops)) {
    return []
  }
  return stops.filter(function (item) {
    return item && typeof item === 'object'
  })
}

function buildMissingHint(stops) {
  if (!stops || stops.length === 0) {
    return ''
  }
  if (stops.length === 1) {
    var name = stops[0].customerName || '1 个客户'
    return name + ' 缺少坐标，未显示在地图上'
  }
  return stops.length + ' 个客户缺少坐标，未显示在地图上'
}

function pushPoint(points, latitude, longitude) {
  if (latitude == null || longitude == null) {
    return
  }
  points.push({
    latitude: latitude,
    longitude: longitude
  })
}

function buildIncludePoints(markers, polylines) {
  var points = []
  ;(markers || []).forEach(function (marker) {
    if (!marker || marker.id === 0) {
      return
    }
    pushPoint(points, marker.latitude, marker.longitude)
  })
  ;(polylines || []).forEach(function (line) {
    ;(line.points || []).forEach(function (point) {
      pushPoint(points, point.latitude, point.longitude)
    })
  })
  if (points.length === 0) {
    ;(markers || []).forEach(function (marker) {
      if (marker) {
        pushPoint(points, marker.latitude, marker.longitude)
      }
    })
  }
  if (points.length <= 1) {
    return points
  }

  var minLat = points[0].latitude
  var maxLat = points[0].latitude
  var minLng = points[0].longitude
  var maxLng = points[0].longitude
  points.forEach(function (point) {
    minLat = Math.min(minLat, point.latitude)
    maxLat = Math.max(maxLat, point.latitude)
    minLng = Math.min(minLng, point.longitude)
    maxLng = Math.max(maxLng, point.longitude)
  })

  var latSpan = Math.max(maxLat - minLat, 0.008)
  var lngSpan = Math.max(maxLng - minLng, 0.008)
  var latPad = latSpan * 0.28
  var lngPad = lngSpan * 0.28
  pushPoint(points, minLat - latPad, minLng - lngPad)
  pushPoint(points, maxLat + latPad, maxLng + lngPad)
  return points
}

function normalizeLayerStyle(value) {
  var style = toNum(value)
  return style == null || style <= 0 ? null : style
}

export function normalizeMapOverview(mapOverview) {
  if (!mapOverview || typeof mapOverview !== 'object') {
    return null
  }

  var rawMarkers = mapOverview.markers || []
  var markers = []
  var depotMarker = normalizeDepotMarker(mapOverview.depot)
  if (depotMarker) {
    markers.push(depotMarker)
  }
  rawMarkers.forEach(function (marker, index) {
    var next = normalizeMarker(marker, index + 1)
    if (next) {
      markers.push(next)
    }
  })

  var polylines = (mapOverview.polylines || mapOverview.polyline || [])
    .map(normalizePolyline)
    .filter(Boolean)

  var missingCoordinateStops = normalizeMissingStops(mapOverview.missingCoordinateStops)
  var latitude = toNum(mapOverview.centerLat)
  var longitude = toNum(mapOverview.centerLng)
  var scale = toNum(mapOverview.suggestedScale)

  var next = {
    markers: markers,
    polylines: polylines,
    legend: Array.isArray(mapOverview.legend) ? mapOverview.legend : [],
    missingCoordinateStops: missingCoordinateStops,
    missingHint: buildMissingHint(missingCoordinateStops),
    summary: mapOverview.summary || null,
    emptyHint: mapOverview.emptyHint || '',
    hasMap: latitude != null && longitude != null,
    setting: MAP_SETTING
  }

  if (latitude != null && longitude != null) {
    next.latitude = latitude
    next.longitude = longitude
  }
  if (scale != null) {
    next.scale = scale
  }
  var layerStyle = normalizeLayerStyle(mapOverview.layerStyle)
  if (layerStyle != null) {
    next.layerStyle = layerStyle
  }
  var includePoints = buildIncludePoints(markers, polylines)
  if (includePoints.length > 0) {
    next.includePoints = includePoints
  }
  if (mapOverview.title) {
    next.title = mapOverview.title
  }
  return next
}

function cloneIncludePoints(points) {
  if (!Array.isArray(points)) {
    return []
  }
  return points.map(function (point) {
    if (!point) {
      return point
    }
    return {
      latitude: point.latitude,
      longitude: point.longitude
    }
  })
}

/** 将地图视口恢复到 pageViewModel.mapOverview 的初始范围（不重新拉接口）。 */
export function resetMapViewport(host, options) {
  options = options || {}
  if (!host || typeof host.setData !== 'function') {
    return
  }
  var mapOverview = options.mapOverview
  if (!mapOverview || !mapOverview.hasMap) {
    return
  }

  var mapId = options.mapId || 'routeDispatchMapOverview'
  var padding = options.padding || [48, 48, 48, 48]
  var visibleKey = options.visibleKey || 'mapOverviewVisible'
  var points = cloneIncludePoints(mapOverview.includePoints)

  var applyIncludePoints = function () {
    if (points.length === 0) {
      return
    }
    var mapCtx = wx.createMapContext(mapId, host)
    if (mapCtx && mapCtx.includePoints) {
      mapCtx.includePoints({
        points: points,
        padding: padding
      })
    }
  }

  if (host.data[visibleKey] === false) {
    host.setData({ [visibleKey]: true }, applyIncludePoints)
    return
  }

  host.setData({ [visibleKey]: false }, function () {
    host.setData({ [visibleKey]: true }, function () {
      if (typeof wx.nextTick === 'function') {
        wx.nextTick(applyIncludePoints)
      } else {
        setTimeout(applyIncludePoints, 50)
      }
    })
  })
}

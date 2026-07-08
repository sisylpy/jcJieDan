/** 会话信息（disId / operatorUserId），与页面业务组装无关。 */

export function resolveSession() {
  var userInfo = wx.getStorageSync('userInfo') || {}
  var disInfo = wx.getStorageSync('disInfo') || userInfo.nxDistributerEntity || {}
  var disId = disInfo.nxDistributerId
  if (!disId && userInfo.nxDistributerEntity) {
    disId = userInfo.nxDistributerEntity.nxDistributerId
  }
  if (!disId) {
    disId = userInfo.nxDiuDistributerId
  }
  return {
    userInfo: userInfo,
    disId: disId,
    operatorUserId: userInfo.nxDistributerUserId,
    driverUserId: 1
  }
}


export function getTodayDateStr() {
  var d = new Date()
  var y = d.getFullYear()
  var m = ('0' + (d.getMonth() + 1)).slice(-2)
  var day = ('0' + d.getDate()).slice(-2)
  return y + '-' + m + '-' + day
}

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


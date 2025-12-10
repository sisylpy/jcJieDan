var temp = {

  gorRunnerLobby: function () {
    console.log("@22")
    wx.requestSubscribeMessage({
      tmplIds: ['iBEpT3V5qQy4xXOPsDAuIU1n-Z0ruTuOB3NN_6xFSKU'],
      success(res) {
        console.log("可以给用户推送一条中奖通知了。。。");
      },
      fail(res) {

        console.log('fail  失败')

        console.log(res)

        logger.warn('订阅消息fail', res)

      },
    })



  },
}
//导出，供外部使用
export default temp
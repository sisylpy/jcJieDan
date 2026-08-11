// 开发版/体验版只访问 Test Tomcat；正式版继续固定访问正式 Tomcat。
// 不允许为了联调直接改写正式版地址。
const PROD_SERVER = 'https://grainservice.club:8443/nongxinle/'
const TEST_SERVER = 'https://test-api.grainservice.club/nongxinle/'

function currentEnvVersion() {
  try {
    return wx.getAccountInfoSync().miniProgram.envVersion || 'release'
  } catch (e) {
    return 'release'
  }
}

const server = currentEnvVersion() === 'release' ? PROD_SERVER : TEST_SERVER

module.exports = {
  apiUrl: server + 'api/',
  server: server,
  envVersion: currentEnvVersion(),
  tencentCloud: {
    engineModelType: '16k_zh',
    voiceFormat: 1
  }
}

module.exports = {
  // 本地调试服务器（当前启用）
  // 本地 Tomcat Application context 是 /nongxinle_server_war_exploded，
  // 不要再叠加业务前缀 /nongxinle（那是正式服务器 contextPath 才有的），
  // 否则 Shiro 的 /api/**=anon 匹配不到，会被拦截 302 到 login.html。
  // apiUrl: 'http://192.168.0.102:8081/nongxinle_server_war_exploded/api/',
  // server: 'http://192.168.0.102:8081/nongxinle_server_war_exploded/',
// 
  // 正式服务器：发布正式环境时，注释上面的本地地址并启用这一组。
  apiUrl: 'https://grainservice.club:8443/nongxinle/api/',
  server: 'https://grainservice.club:8443/nongxinle/',

  // 测试服务器：测试时启用这一组。
  // apiUrl: 'https://test-api.grainservice.club/nongxinle/api/',
  // server: 'https://test-api.grainservice.club/nongxinle/',

  tencentCloud: {
    engineModelType: '16k_zh',
    voiceFormat: 1
  }
}

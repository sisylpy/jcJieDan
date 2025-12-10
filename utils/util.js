

function getBillTradeNo(disId) {
  var areaCode = "1";

  var  random =  Number(Math.random());
  var checkCode = random*9000
				checkCode +=1000;

  return areaCode + disId + parseInt(checkCode);
}


let getQueryString = function (url, name) {
  console.log("url = " + url)
  console.log("name = " + name)
  var reg = new RegExp('(^|&|/?)' + name + '=([^&|/?]*)(&|/?|$)', 'i')
  var r = url.substr(1).match(reg)
  if (r != null) {
    console.log("r = " + r)
    console.log("r[2] = " + r[2])
    return r[2]
  }
  return null;
}

// 动态获取当前小程序环境版本
function getCurrentEnvVersion() {
  try {
    const accountInfo = wx.getAccountInfoSync();
    return accountInfo.miniProgram.envVersion;
  } catch (error) {
    console.error('获取环境版本失败:', error);
    // 默认返回 develop，避免体验版问题
    return 'develop';
  }
}

module.exports = {
  getBillTradeNo: getBillTradeNo,
  getQueryString: getQueryString,
  getCurrentEnvVersion: getCurrentEnvVersion,
}

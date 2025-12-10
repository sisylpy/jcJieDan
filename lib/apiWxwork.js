import Promise from './bluebird'
import apiUrl from '../config.js'
import load from './load.js'

/**
 * 企业微信第三方应用登录
 * @param {Object} data - 登录数据 {nxDiuCode: string}
 */
export const wxworkLogin = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'api/nxdistributeruser/wxworkLogin',
      method: 'POST',
      data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '企业微信登录失败，请检查网络',
          icon: 'none'
        })
      }
    })
  })
}

/**
 * 企业微信第三方应用注册
 * @param {Object} data - 注册数据
 */
export const wxworkRegister = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributer/disAndUserSaveWork',
      method: 'POST',
      data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '企业微信注册失败，请重试',
          icon: 'none'
        })
      }
    })
  })
}

/**
 * 获取企业微信用户信息
 * @param {Object} data - 用户数据
 */
export const wxworkGetUserInfo = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'wxwork/user/getUserInfo',
      method: 'POST',
      data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}

/**
 * 企业微信回调验证
 * @param {Object} data - 回调数据
 */
export const wxworkCallbackVerify = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'wxwork/callback/verify',
      method: 'POST',
      data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
      }
    })
  })
}

/**
 * 获取企业信息
 * @param {Object} data - 企业数据
 */
export const wxworkGetCorpInfo = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'wxwork/corp/getInfo',
      method: 'POST',
      data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}

/**
 * 企业微信用户退出登录
 */
export const wxworkLogout = () => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'wxwork/user/logout',
      method: 'POST',
      data: {
        userId: wx.getStorageSync('userInfo')?.userId
      },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
      }
    })
  })
}

/**
 * 获取企业微信客户群列表
 * @param {Object} data - 查询参数 {corpId: string, statusFilter: number, offset: number, limit: number}
 */
export const wxworkGetCustomerGroupList = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'qywx/customergroup/list',
      method: 'GET',
      data: {
        corpId: 'ww9778dea409045fe6',
        statusFilter: 0,
        offset: 0,
        limit: 100,
        ...data
      },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '获取客户群列表失败',
          icon: 'none'
        })
      }
    })
  })
}

/**
 * 测试后台配置
 * @param {Object} data - 测试数据 {corpId: string}
 */
export const wxworkTestBackendConfig = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'qywx/customergroup/test',
      method: 'GET',
      data: {
        corpId: 'ww9778dea409045fe6',
        ...data
      },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}

/**
 * 测试数据库配置
 * @param {Object} data - 测试数据 {corpId: string}
 */
export const wxworkTestDatabaseConfig = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'qywx/customergroup/db-test',
      method: 'GET',
      data: {
        corpId: 'ww9778dea409045fe6',
        ...data
      },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}

/**
 * 测试获取access_token
 * @param {Object} data - 测试数据 {corpId: string}
 */
export const wxworkTestAccessToken = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'qywx/customergroup/token-test',
      method: 'GET',
      data: {
        corpId: 'ww9778dea409045fe6',
        ...data
      },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}

/**
 * 获取用户列表
 * @param {Object} data - 查询参数 {corpId: string, departmentId: number, fetchChild: number}
 */
export const wxworkGetUsers = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'qywx/customergroup/users',
      method: 'GET',
      data: {
        corpId: 'ww9778dea409045fe6',
        departmentId: 1,
        fetchChild: 1,
        ...data
      },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}

/**
 * 测试客户群列表API
 * @param {Object} data - 测试数据 {corpId: string}
 */
export const wxworkTestGroupChatListAPI = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'qywx/customergroup/groupchat-test',
      method: 'GET',
      data: {
        corpId: 'ww9778dea409045fe6',
        ...data
      },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
      }
    })
  })
}


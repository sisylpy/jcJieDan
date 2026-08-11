import Promise from './bluebird'
import apiUrl from '../config.js'
import load from './load.js'

function persistDispatchAuth(responseBody) {
  var auth = responseBody && responseBody.data && responseBody.data.dispatchAuth
  if (!auth || !auth.accessToken) {
    return
  }
  wx.setStorageSync('dispatchAccessToken', auth.accessToken)
  wx.setStorageSync('dispatchPermissions', auth.permissions || [])
  wx.setStorageSync('dispatchTokenExpiresAt', auth.expiresAt || '')
  delete auth.accessToken
}

/**
 * 企业微信第三方应用登录
 * @param {Object} data - 登录数据 {nxDiuCode: string}
 */
export const wxworkLogin = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributeruser/wxworkLogin',
      method: 'POST',
      data,
      success: (res) => {
        persistDispatchAuth(res.data)
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
 * 企业微信第三方应用注册
 * @param {Object} data - 注册数据
 */
export const wxworkRegister = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
  return getApp().ownerLogout().then(res => ({ result: res && res.data }))
}

/**
 * 获取企业微信客户群列表
 * @param {Object} data - 查询参数 {corpId: string, statusFilter: number, offset: number, limit: number}
 */
export const wxworkGetCustomerGroupList = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
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
 * 获取用户列表
 * @param {Object} data - 查询参数 {corpId: string, departmentId: number, fetchChild: number}
 */
export const wxworkGetUsers = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
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

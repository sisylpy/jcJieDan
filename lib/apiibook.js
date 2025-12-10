
import Promise from './bluebird'
import apiUrl from '../config.js'

var load = require('./load.js');





/**
 * 添加批发商商品
 */
export const disGetGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/disGetGoods/' + data,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
        })
      }
    })
  })
}



/**
 * 添加批发商商品
 */
export const disSaveDisGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/disSaveDisGoods',
      method: 'POST',
      data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
        })
      }
    })
  })
}



/**
 * 保存批发商商品
 * @param {*} data 
 */
export const downDisGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/postDgnGoods',
      method: 'POST',
      data: data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}



/**
 * 搜索类别商品
 * @param {*} data 
 */
export const queryNxGoodsWithNxDisByQuickSearch = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxgoods/queryNxGoodsWithNxDisByQuickSearch',
      method: 'POST',
      data: {
        "searchStr": data.searchStr,
        "disId": data.disId,
        
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}



/**
 * 删除批发商商品
 * @param {*} data 
 */
export const cancleDownDisGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/canclePostDgnGoods',
      method: 'POST',
      data: {
        "disId" : data.disId,
        "disGoodsId": data.disGoodsId,
        "disGoodsFatherId" : data.disGoodsFatherId,
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}
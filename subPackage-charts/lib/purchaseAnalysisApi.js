import Promise from '../../lib/bluebird'
import apiUrl from '../../config.js'
var load = require('../../lib/load.js')

const requestNxPurchaseAnalysis = (path, data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + path,
      method: 'POST',
      data: data,
      header: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
      },
      success: function (res) {
        resolve({ result: res.data })
      },
      fail: function (error) {
        reject(error)
        load.hideLoading()
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}

export const getNxSelfPurchaseAnalysis = data =>
  requestNxPurchaseAnalysis('nxdistributerpurchasegoods/getNxSelfPurchaseAnalysis', data)

export const getNxPurchaseCountAnalysis = data =>
  requestNxPurchaseAnalysis('nxdistributerpurchasegoods/getNxPurchaseCountAnalysis', data)

export const getNxUnitPriceAnalysis = data =>
  requestNxPurchaseAnalysis('nxdistributerpurchasegoods/getNxUnitPriceAnalysis', data)

export const getNxPurchaseCategoryDetail = data =>
  requestNxPurchaseAnalysis('nxdistributerpurchasegoods/getNxPurchaseCategoryDetail', data)

export const getNxSupplierAnalysis = data =>
  requestNxPurchaseAnalysis('nxdistributerpurchasegoods/getNxSupplierAnalysis', data)

export const getNxInventoryBusinessAnalysis = data =>
  requestNxPurchaseAnalysis('nxdistributergoodsshelfstockreduce/getNxInventoryBusinessAnalysis', data)

import Promise from '../../lib/bluebird'
import apiUrl from '../../config.js'
var load = require('../../lib/load.js');



/**
 * NX项目：获取门店库存类型周期统计
 * @param {Object} data - 请求参数
 * @param {Number} data.disId - 批发商ID
 * @param {Number} data.whichDay - 查询天数（0-今天，1-昨天，2-前天，3-3天前，4-4天前，5-超过4天）
 * @param {String} data.searchDepIds - 部门ID列表（逗号分隔，"-1"表示全部）
 * @param {String} data.searchDepId - 单个部门ID（"-1"表示全部）
 */
export const getMendianStockTypePeriod = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelfstock/getMendianStockTypePeriod',
      method: 'POST',
      data: {
        disId: data.disId,
        whichDay: data.whichDay,
        searchDepIds: data.searchDepIds || '-1',
        searchDepId: data.searchDepId || '-1'
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

/**
 * NX项目：根据商品分类ID获取某一天的库存详情
 * @param {Object} data - 请求参数
 * @param {Number} data.disId - 批发商ID
 * @param {Number} data.searchDepId - 部门ID
 * @param {Number} data.greatId - 商品分类ID
 * @param {Number} data.whichDay - 查询天数
 * @param {Number} data.type - 类型
 */
export const disGetDayStockByGreatId = (data) => {
  return new Promise((resolve, reject) => {
    // 安全地转换 type 参数
    let typeValue = 0; // 默认按天查询
    if (data.type !== undefined && data.type !== null && data.type !== 'undefined' && data.type !== '' && !isNaN(data.type)) {
      const parsedType = parseInt(data.type);
      if (!isNaN(parsedType)) {
        typeValue = parsedType;
      }
    }
    
    // 安全地转换 whichDay 参数
    let whichDayValue = 99; // 默认查询全部
    if (data.whichDay !== undefined && data.whichDay !== null && data.whichDay !== 'undefined' && data.whichDay !== '' && !isNaN(data.whichDay)) {
      const parsedWhichDay = parseInt(data.whichDay);
      if (!isNaN(parsedWhichDay)) {
        whichDayValue = parsedWhichDay;
      }
    }
    
    // 确保参数类型正确，并提供默认值
    const requestData = {
      disId: data.disId ? parseInt(data.disId) : null,
      searchDepId: data.searchDepId || '-1',
      greatId: data.greatId ? String(data.greatId) : null,
      whichDay: whichDayValue,
      type: typeValue
    };
    
    console.log('disGetDayStockByGreatId 请求参数:', requestData);
    
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelfstock/disGetDayStockByGreatId',
      method: 'POST',
      data: requestData,
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

/**
 * NX项目：根据搜索日期获取库存详情
 * @param {Object} data - 请求参数
 * @param {Number} data.disId - 批发商ID
 * @param {Number} data.searchDepId - 部门ID
 * @param {String} data.searchDate - 搜索日期
 */
export const disGetDayStockBySearchDay = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelfstock/disGetDayStockBySearchDay',
      method: 'POST',
      data: {
        disId: data.disId,
        searchDepId: data.searchDepId || -1,
        searchDate: data.searchDate
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

import Promise from './bluebird'
import apiUrl from '../config.js'

var load = require('./load.js');

//

export const disGetOfferDis = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributernxdistributer/disGetOfferDis/' + data,
      method: 'GET',
      success: function (res) {
        resolve({ result: res.data })
      },
      fail: function (e) {
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

export const finishTask = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'ocr/finishTask/' + data,
      method: 'GET',
      success: function (res) {
        resolve({ result: res.data })
      },
      fail: function (e) {
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

export const deleteTaskData = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/deleteTaskData/' + data,
      method: 'GET',
      success: function (res) {
        resolve({ result: res.data })
      },
      fail: function (e) {
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


export const depFatherGetTaskListJustCount = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'ocr/depFatherGetTaskListJustCount/' + data,
      method: 'GET',
      success: function (res) {
        resolve({ result: res.data })
      },
      fail: function (e) {
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
 * 获取任务的订单列表（支持分页）
 * @param {String|Number} taskId - 任务ID
 * @param {Object} options - 分页参数（可选）
 * @param {Number} options.page - 页码，从1开始，默认为1
 * @param {Number} options.limit - 每页大小，默认为10
 * @param {Boolean} options.processStatus - 是否处理状态为-2的订单，默认为true
 */
export const getTaskOrders = (taskId, options = {}) => {
  const { page = 1, limit = 10, processStatus = true } = options;
  
  // 构建查询参数
  const params = [];
  if (page !== undefined && page !== null) {
    params.push(`page=${page}`);
  }
  if (limit !== undefined && limit !== null) {
    params.push(`limit=${limit}`);
  }
  if (processStatus !== undefined && processStatus !== null) {
    params.push(`processStatus=${processStatus}`);
  }
  
  const queryString = params.length > 0 ? '?' + params.join('&') : '';
  
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'ocr/getTaskOrders/' + taskId + queryString,
      method: 'GET',
      success: function (res) {
        resolve({ result: res.data })
      },
      fail: function (e) {
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

export const updateOrderPrint = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/updateOrderPrint',
      method: 'POST',
      data: {
        orderId: data.orderId,
        printName: data.printName,
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: function (res) {
        resolve({ result: res.data })
      },
      fail: function (e) {
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

export const getNxPurGoodsDetailList = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerpurchasegoods/getNxPurGoodsDetailList',
      method: 'POST',
      data: {
        disGoodsId: data.disGoodsId,
        startDate: data.startDate,
        stopDate: data.stopDate,
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: function (res) {
        resolve({ result: res.data })
      },
      fail: function (e) {
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

export const getNxPurGoodsStatisticsForDis = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerpurchasegoods/getNxPurGoodsStatisticsForDis',
      method: 'POST',
      data: {
        supplierIds: data.supplierIds,
        purUserIds: data.purUserIds,
        disId: data.disId,
        startDate: data.startDate,
        stopDate: data.stopDate
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: function (res) {
        resolve({ result: res.data })
      },
      fail: function (e) {
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

export const getNxCostGoodsStatistics = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelfstockreduce/getNxCostGoodsStatistics',
      method: 'POST',
      data: {
        supplierIds: data.supplierIds,
        purUserIds: data.purUserIds,
        disId: data.disId,
        startDate: data.startDate,
        stopDate: data.stopDate
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: function (res) {
        resolve({ result: res.data })
      },
      fail: function (e) {
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

export const disGetPurchaseCata = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerpurchasegoods/disGetPurchaseCata' ,
      method: 'POST',
      data: {
        disId: data.disId,
        startDate: data.startDate,
        stopDate: data.stopDate,
        supplierId: data.supplierId,
        purUserId: data.purUserId,
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
          icon: 'none',
        })
      }
    })
  })
}

// NX系统：获取出货成本统计
export const getNxGoodsCostStatistics = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerpurchasegoods/getNxGoodsCostStatistics',
      method: 'POST',
      data: {
        disId: data.disId,
        startDate: data.startDate,
        stopDate: data.stopDate,
        greatId: data.greatId
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: function (res) {
        resolve({ result: res.data })
      },
      fail: function (e) {
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

// NX系统：获取出货商品列表
export const getNxGoodsCostList = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerpurchasegoods/getNxGoodsCostList',
      method: 'POST',
      data: {
        disId: data.disId,
        startDate: data.startDate,
        stopDate: data.stopDate,
        type: data.type, // 可选: sales, waste, loss
        page: data.page,
        limit: data.limit,
        greatId: data.greatId
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: function (res) {
        resolve({ result: res.data })
      },
      fail: function (e) {
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

// NX系统：获取库存商品列表
export const getNxStockGoodsList = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerpurchasegoods/getNxStockGoodsList',
      method: 'POST',
      data: {
        disId: data.disId,
        startDate: data.startDate,
        stopDate: data.stopDate,
        page: data.page,
        limit: data.limit,
        greatId: data.greatId
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: function (res) {
        resolve({ result: res.data })
      },
      fail: function (e) {
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

//

// NX系统：按人员分组统计
export const getNxPurchaseDetailType = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerpurchasegoods/disGetPurchaseDetailType',
      method: 'POST',
      data: {
        startDate: data.startDate,
        stopDate: data.stopDate,
        disId: data.disId,
        supplierIds: data.supplierIds,
        purUserIds: data.purUserIds,
        type: data.type,
        greatId: data.greatId,
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
          icon: 'none',
        })
      }
    })
  })
}

// NX系统：获取采购商品列表
export const disGetPurchaseGoodsList = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerpurchasegoods/disGetPurchaseGoodsList',
      method: 'POST',
      data: {
        disId: data.disId,
        startDate: data.startDate,
        stopDate: data.stopDate,
        page: data.page,
        limit: data.limit,
        greatId: data.greatId
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: function (res) {
        resolve({ result: res.data })
      },
      fail: function (e) {
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

// NX系统：获取采购统计汇总
export const disGetPurchaseStatistics = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerpurchasegoods/disGetPurchaseStatistics',
      method: 'POST',
      data: {
        disId: data.disId,
        startDate: data.startDate,
        stopDate: data.stopDate,
         greatId: data.greatId
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: function (res) {
        resolve({ result: res.data })
      },
      fail: function (e) {
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

//

export const disGetRetailDate = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentbill/disGetRetailDate',
      method: 'POST',
      data: {
        startDate: data.startDate,
        stopDate: data.stopDate,
        disId: data.disId,
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
        })
      }
    })
  })
}

export const disGetPurchaseDate = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerpurchasegoods/disGetPurchaseDate',
      method: 'POST',
      data: {
        startDate: data.startDate,
        stopDate: data.stopDate,
        disId: data.disId,
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
        })
      }
    })
  })
}

//

/**
 * 获取客户配送商品
 * @param {} data 
 */
export const updatePasteBatch = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerpurchasebatch/updatePasteBatch'  ,
      method: 'POST',
      data:{
        batchId: data.batchId,
        content: data.content,
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
 * 今日待配送客户 — 腾讯地图最优送货顺序
 * @param {{ disId: number|string, fromLat: string|number, fromLng: string|number }} data
 */

/**
 * 今日待配送客户 — 起点到各客户距离矩阵（未排序）
 * @param {{ disId: number|string, fromLat: string|number, fromLng: string|number }} data
 */

/**
 * 获取客户配送商品
 * @param {} data 
 */
export const disGetTypePreparePurGoodsPage = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerpurchasegoods/disGetTypePreparePurGoodsPage'  ,
      method: 'POST',
      data:{
        disId: data.disId,
        page: data.page,
        limit: data.limit,
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
 * 获取客户配送商品
 * @param {} data 
 */
export const disGetLinshiGoodsList = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributergoodslinshi/disGetLinshiGoodsList'  ,
      method: 'POST',
      data:{
        disId: data.disId,
        page: data.page,
        limit: data.limit,
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
 * 根据搜索词查询临时商品（支持分页）
 * @param {Object} data
 * @param {String} data.searchGoodsName 搜索关键词（商品名称，支持拼音）
 * @param {Number} data.disId 配送商ID
 * @param {Number} [data.status] 可选，0=未处理，1=推荐，2=申请添加，-1=已替换；不传则查全部
 * @param {Number} [data.page=1] 页码
 * @param {Number} [data.limit=10] 每页条数
 */
export const searchLinshiGoods = (data) => {
  return new Promise((resolve, reject) => {
    const params = {
      disId: data.disId,
      page: data.page || 1,
      limit: data.limit || 10,
    }
    if (data.searchGoodsName != null && data.searchGoodsName !== '') {
      params.searchGoodsName = data.searchGoodsName
    }
    if (data.status != null) {
      params.status = data.status
    }
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributergoodslinshi/searchLinshiGoods',
      method: 'POST',
      data: params,
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

//

/**
 * 获取客户配送商品
 * @param {} data 
 */
export const disGetCollReplyOutPage = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/disGetCollReplyOutPage'  ,
      method: 'POST',
      data:{
        disId: data.disId,
        page: data.page,
        limit: data.limit,
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
 * 获取客户配送商品
 * @param {} data 
 */
export const disGetCollPrepareOutPage = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/disGetCollPrepareOutPage'  ,
      method: 'POST',
      data:{
        disId: data.disId,
        page: data.page,
        limit: data.limit,
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
 * 获取客户配送商品
 * @param {} data 
 */
export const disGetTypePrepareOutPage = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/disGetTypePrepareOutPage'  ,
      method: 'POST',
      data:{
        disId: data.disId,
        page: data.page,
        limit: data.limit,
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

export const disGetLinshiOrders = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/disGetLinshiOrders/' + data,
      method: 'GET',
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

export const confirmDepApplyGoods = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/confirmDepApplyGoods/' + data,
      method: 'GET',
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

export const cancleDeliveryOrder = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/cancleDeliveryOrder/' + data,
      method: 'GET',
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

export const deliveryOrder = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/deliveryOrder/' + data,
      method: 'GET',
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


export const stockerGetStockGoodsKfPage = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/stockerGetStockGoodsKfPage',
      method: 'POST',
      data: {
        disId: data.disId,
        page: data.page,
        limit: data.limit,
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
        })
      }
    })
  })
}

export const stockerGetShelfList = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/stockerGetShelfList/' + data,
      method: 'GET',
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

export const updateDepPickName = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartment/updateDepPickName' ,
      method: 'POST',
      data:{
        depId: data.depId,
        pickName: data.pickName
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

export const getFatherGoods = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxgoods/getFatherGoods'  ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none',
        })
      }
    })
  })
}

export const nxDisPrintGbPurBatch = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/nxDisPrintGbPurBatch/' +data ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none',
        })
      }
    })
  })
}

export const addRecord = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerpaylist/disAaddRecord' ,
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
          icon: 'none',
        })
      }
    })
  })
}

export const getDate = () => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributer/getDate' ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '请检查网络',
          icon: 'none',
        })
      }
    })
  })
}

export const saveGbReturn = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentbill/saveGbReturn/' + data ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e)
      }
    })
  })
}

export const updateBillOrders = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentbill/updateBillOrders' ,
      method: 'POST',
      data:{
        billId: data.billId,
        orderId: data.orderId,
        billSubtotal: data.billSubtotal,
        orderPrice: data.orderPrice,
        orderWeight: data.orderWeight,
        orderSubtotal: data.orderSubtotal, 
       
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

export const changePrintName = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'gbdistributer/changePrintName' ,
      method: 'POST',
      data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e)
      }
    })
  })
}

//

export const cancleGbOrderSx = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/cancleGbOrderSx/' + data ,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e)
      }
    })
  })
}
/**
 * 获取客户xiaoshou单
 * @param {*} data 
 */
export const sellerAndBuyerGetAccountBillsGb = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentbill/sellerAndBuyerGetAccountBillsGb',
      method: 'POST',
      data:{
        gbDisId: data.gbDisId,
        disId: data.disId,
        nxCommId: data.nxCommId
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
 * 保存订单的数量
 * @param {*} data 
 */
export const updateDisUserDeviceId = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributeruser/updateDisUserDeviceId',
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
          icon: 'none'
        })
      }
    })
  })
}

export const getOrderPageGb = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/getOrderPageGb' ,
      method: 'POST',
      data:{
        depFatherId: data.depFatherId,
        gbDepFatherId: data.gbDepFatherId,
        orderBy: data.orderBy
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

export const disGetUnPayAccountBills = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentbill/disGetUnPayAccountBills/' + data ,
      method: 'GET',
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

export const disGetUnPayAccountBillsGb = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentbill/disGetUnPayAccountBillsGb/' + data ,
      method: 'GET',
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
 * 打印销售单据
 * @param {*} data 
 */
export const pasteSearchGoods = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'ocr/pasteSearchGoods',
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
          icon: 'none'
        })
      }
    })
  })
}

export const choiceGoodsForApply = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/choiceGoodsForApply',
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
          icon: 'none'
        })
      }
    })
  })
}

//

/**
 * 添加订货申请
 * @param {*} data 
 */
export const saveCashBefore = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/saveCashBefore' ,
      method: 'POST',
      data: data,
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
 * 添加订货申请
 * @param {*} data 
 */
export const saveCashBeforeTask = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/saveCashBeforeTask' ,
      method: 'POST',
      data: data,
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
 * 添加订货申请
 * @param {*} data 
 */
export const saveCash = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/saveCash' ,
      method: 'POST',
      data: data,
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
 * 修改订货申请
 * @param {*} data 
 */
export const updateOrderReturn = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/updateOrderReturn' ,
      method: 'POST',
      data:{
        id: data.id,
        weight: data.weight,
        subtotal: data.subtotal,
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
      }
    })
  })
}

//
export const disGetToPlanPurchaseGoodsSearch = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/disGetToPlanPurchaseGoodsSearch',
      method: 'POST',
      data:{
        disId: data.disId,
        searchStr: data.searchStr,
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
 * 获取录入单价和数量订单
 * @param {*} data
 */
export const nxDisGetGbBatchOrdersUnOut = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/nxDisGetGbBatchOrdersUnOut/' + data ,
      method: 'GET',
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

/** 按配送商客户页参数读取 GB/精彩账本客户已经进入 NX 的订单。 */
export const phoneGetToFillDepOrdersGb = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/phoneGetToFillDepOrdersGb',
      method: 'POST',
      data: data,
      header: {
        'content-type': 'application/x-www-form-urlencoded'
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
 * 获取录入单价和数量订单
 * @param {*} data 
 */
export const phoneGetToFillDepOrdersWithKg = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/phoneGetToFillDepOrdersWithKg' ,
      method: 'POST',
      data:{
        depFatherId: data.depFatherId,
        gbDepFatherId: data.gbDepFatherId,
        disId: data.disId
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
 * 获取录入单价和数量订单
 * @param {*} data 
 */
export const getOrderPageWithTraceReport = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/getOrderPageWithTraceReport' ,
      method: 'POST',
      data:{
        depFatherId: data.depFatherId,
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
 * 获取录入单价和数量订单
 * @param {*} data 
 */
export const getCollectionDisDepOrdersFinish = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/getCollectionDisDepOrdersFinish' ,
      method: 'POST',
      data:{
        collDisId: data.collDisId,
        disId: data.nxDisId
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
 * 获取录入单价和数量订单
 * @param {*} data 
 */
export const getCollectionDisOrders = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/getCollectionDisOrders' ,
      method: 'POST',
      data:{
        collDisId: data.collDisId,
        disId: data.disId
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
 * 获取录入单价和数量订单
 * @param {*} data 
 */
export const phoneGetToFillRetailOrders = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/phoneGetToFillRetailOrders' ,
      method: 'POST',
      data:{
        depFatherId: data.depFatherId,
        disId: data.disId
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
 * 获取录入单价和数量订单
 * @param {*} data 
 */
export const phoneGetToFillDepOrders = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/phoneGetToFillDepOrders' ,
      method: 'POST',
      data:{
        depFatherId: data.depFatherId,
        gbDepFatherId: data.gbDepFatherId,
        disId: data.disId
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
 * 获取录入单价和数量订单（公斤转斤）
 * @param {*} data 
 */
export const phoneGetToFillDepOrdersWithJin = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/phoneGetToFillDepOrdersWithJin' ,
      method: 'POST',
      data:{
        depFatherId: data.depFatherId,
        gbDepFatherId: data.gbDepFatherId,
        disId: data.disId
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
 * 打印销售单据
 * @param {*} data 
 */
export const saveAccountBillPhone = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentbill/saveAccountBillPhone',
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
          icon: 'none'
        })
      }
    })
  })
}

//

/**
 * 打印销售单据
 * @param {*} data 
 */
export const saveCollationoBill = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerbill/saveCollationoBill',
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
          icon: 'none'
        })
      }
    })
  })
}

/**
 * 打印销售单据
 * @param {*} data 
 */
export const saveAccountBillPhoneFeiE = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentbill/saveAccountBillPhoneFeiE',
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
          icon: 'none'
        })
      }
    })
  })
}

/**
 * 测试飞鹅网络打印机连接（现金结账单打印机）
 * @param {*} data { sn: '飞鹅打印机SN' }
 */
export const testFeiEPrinter = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentbill/testFeiEPrinter',
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
          icon: 'none'
        })
      }
    })
  })
}

/**
 * 打印销售单据
 * @param {*} data 
 */
export const saveAccountBillPhoneGb = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentbill/saveAccountBillPhoneGb',
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
          icon: 'none'
        })
      }
    })
  })
}

/**
 * 打印销售单据
 * @param {*} data 
 */
export const saveAccountBillPhoneSubGb = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentbill/saveAccountBillPhoneSubGb' ,
      method: 'POST',
      data:{
        disId: data.disId,
        depFatherId: data.depFatherId,
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

//

/**
 * 打印销售单据
 * @param {*} data 
 */
export const saveAccountBillPhoneRetail = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentbill/saveAccountBillPhoneRetail' ,
      method: 'POST',
      data:{
        disId: data.disId,
        depId: data.depId,
        depFatherId: data.depFatherId,
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
 * 打印销售单据
 * @param {*} data 
 */
export const saveAccountBillPhoneSub = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentbill/saveAccountBillPhoneSub' ,
      method: 'POST',
      data:{
        disId: data.disId,
        depFatherId: data.depFatherId,
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
 * 送货单完成结账
 * @param {*} data 
 */
export const settleDepBillsGb = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentbill/settleDepBillsGb' ,
      method: 'POST',
      data,
      header: {
        "content-type": 'application/json'
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
 * 送货单完成结账
 * @param {*} data 
 */
export const settleDepBills = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentbill/settleDepBills' ,
      method: 'POST',
      data,
      header: {
        "content-type": 'application/json'
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

export const getBillApplys = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentbill/getBillApplys' ,
      method: 'POST',
      data:{
        billId: data.billId,
        depFatherId: data.depFatherId,
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

export const disGetUnSettleAccountBills = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentbill/disGetUnSettleAccountBills/' + data ,
      method: 'GET',
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

export const disGetUnSettleAccountBillsGb = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentbill/disGetUnSettleAccountBillsGb' ,
      method: 'POST',
      data:{
        nxDisId: data.nxDisId,
        gbDisId: data.gbDisId,
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
 * 添加进货商品，修改订单状态
 * @param {*} data 
 */
export const givePurGoodsQuantity = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerpurchasegoods/givePurGoodsQuantity',
      method: 'POST',
      data:{
        id: data.id,
        quantity: data.quantity,
        standard : data.standard,
        level: data.level
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

export const cancelOutOrder = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/cancelOutOrder',
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

export const getHaveNotOutCataGoods = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/getHaveNotOutCataGoods' ,
      method: 'POST',
      data:{
        depFatherId: data.depFatherId,
        gbDepFatherId: data.gbDepFatherId,
        goodsType: data.goodsType
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

export const getHaveOutCataGoods = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/getHaveOutCataGoods' ,
      method: 'POST',
      data:{
        depFatherId: data.depFatherId,
        gbDepFatherId: data.gbDepFatherId,
        goodsType: data.goodsType
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

export const getBillApplysGbDep = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentbill/getBillApplysGbDep',
      method: 'POST',
      data:{
        billId: data.billId,
        depFatherId: data.depFatherId  
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e)
      }
    })
  })
}

export const deleteDisPurBatchItem = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerpurchasebatch/deleteDisPurBatchItem/' + data,
      method: 'POST',
      data: {
        reasonCode: 'OWNER_REMOVE_BATCH_ITEM',
        reason: '老板端撤销采购批次商品'
      },
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



export const disGetToStockGoodsWithDepIds = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/disGetToStockGoodsWithDepIds',
      method: 'POST',
      data: {
        nxDepIds: data.nxDepIds,
        gbDepIds: data.gbDepIds,
        nxDisId: data.nxDisId,
        goodsType: data.goodsType,
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
      }
    })
  })
}

/**
 * 修改订货申请
 * @param {*} data 
 */
export const receiveReturnApplyNx = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'gbdepartmentorders/receiveReturnApplyNx' ,
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

export const deleteDisBatch = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerpurchasebatch/deleteDisBatch/' + data,
      method: 'POST',
      data: {
        reasonCode: 'OWNER_CANCEL_BATCH',
        reason: '老板端撤销采购批次'
      },
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
 * 添加进货商品，修改订单状态
 * @param {*} data 
 */
export const deletePlanPurchase = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerpurchasegoods/deletePlanPurchase/' + data,
      method: 'POST',
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
 * 分享进货商品
 * @param {*} data 
 */
export const purchaseGetGoodsByDemandScope = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerpurchasegoods/purchaseGetGoodsByDemandScope/' + data.disId,
      method: 'GET',
      data: { demandScope: data.demandScope },
      success: (res) => resolve({ result: res.data }),
      fail: reject
    })
  })
}

/** 语音采购候选商品查询：只查询当前配送商商品，不创建客户订单。 */
export const searchVoicePurchaseGoods = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerpurchasegoods/searchVoicePurchaseGoods',
      method: 'POST',
      data,
      success: (res) => resolve({ result: res.data }),
      fail: reject
    })
  })
}

/** 语音采购确认：生成 NxDistributerPurchaseGoods，不生成部门订单。 */
export const saveVoicePurchaseGoods = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerpurchasegoods/saveVoicePurchaseGoods',
      method: 'POST',
      data,
      success: (res) => resolve({ result: res.data }),
      fail: reject
    })
  })
}

export const purchaseGetPasteBatch = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerpurchasebatch/purchaseGetPasteBatch',
      method: 'POST',
      data: {
        disId: data.disId,
        demandScope: data.demandScope,
        startDate: data.startDate || '',
        stopDate: data.stopDate || ''
      },
      header: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
      },
      success: (res) => resolve({ result: res.data }),
      fail: reject
    })
  })
}

const saveBossPurchaseBatchCommand = (endpoint, data, idempotencyKey) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerpurchasebatch/' + endpoint,
      method: 'POST',
      data,
      header: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
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

export const saveBossPurchaseBatch = (data, idempotencyKey) =>
  saveBossPurchaseBatchCommand('saveBossPurchaseBatch', data, idempotencyKey)

export const saveBossInventoryPurchaseBatch = (data, idempotencyKey) =>
  saveBossPurchaseBatchCommand('saveBossInventoryPurchaseBatch', data, idempotencyKey)

export const saveBossDepartmentPurchaseBatch = (data, idempotencyKey) =>
  saveBossPurchaseBatchCommand('saveBossDepartmentPurchaseBatch', data, idempotencyKey)

export const saveBossCopiedPurchaseBatch = (data) =>
  saveBossPurchaseBatchCommand('saveBossCopiedPurchaseBatch', data)

export const saveBossCopiedInventoryPurchaseBatch = (data, idempotencyKey) =>
  saveBossPurchaseBatchCommand('saveBossCopiedInventoryPurchaseBatch', data, idempotencyKey)

export const saveBossPrintedPurchaseBatch = (data) =>
  saveBossPurchaseBatchCommand('saveBossPrintedPurchaseBatch', data)

export const saveBossCopiedDepartmentPurchaseBatch = (data) =>
  saveBossPurchaseBatchCommand('saveBossCopiedDepartmentPurchaseBatch', data)

export const saveBossPrintedDepartmentPurchaseBatch = (data) =>
  saveBossPurchaseBatchCommand('saveBossPrintedDepartmentPurchaseBatch', data)

/** Boss订单自采：只提交采购价及各订单实际采购数量。 */
export const completeBossSelfPurchase = (data, idempotencyKey) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerpurchasegoods/completeBossSelfPurchase',
      method: 'POST',
      data,
      header: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
      success: (res) => resolve({ result: res.data }),
      fail: (e) => {
        reject(e)
        load.hideLoading()
        wx.showToast({ title: '请检查网络', icon: 'none' })
      }
    })
  })
}

/** 老板确认供货商已经完成备货。 */
export const disFinishPurchaseBatch = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerpurchasebatch/disFinishPurchaseBatch',
      method: 'POST',
      data,
      success: (res) => resolve({ result: res.data }),
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({ title: '请检查网络', icon: 'none' });
      }
    })
  })
}

/** 查询一个供货商采购批次及其商品明细。 */
export const getDisPurchaseGoodsBatch = (batchId) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerpurchasebatch/getDisPurchaseGoodsBatch/' + batchId,
      method: 'GET',
      success: (res) => resolve({ result: res.data }),
      fail: reject
    })
  })
}

/**
 * 获取上货商品列表
 * @param {*} data 
 */
export const disGetPurchasingBatch= (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerpurchasebatch/disGetPurchasingBatch',
      method: 'POST',
      data:{
        disId: data.disId,
        type: data.type
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
//

//

/**
 * 添加进货商品，修改订单状态
 * @param {*} data 
 */
export const savePlanPurchaseOrderBundle = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerpurchasegoods/savePlanPurchaseOrderBundle',
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
          icon: 'none'
        })
      }
    })
  })
}

export const disGetCollNxPrepareOutCata = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/disGetCollNxPrepareOutCata' ,
      method: 'POST',
      data: {
        orderDisId: data.orderDisId,
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

export const disGetTypePrepareOutCata = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/disGetTypePrepareOutCata' ,
      method: 'POST',
      data: {
        disId: data.disId,
        purType: data.purType,
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

// 按部门查询准备出库/采购的部门列表
export const disGetTypePrepareOutDepCata = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/disGetTypePrepareOutDepCata',
      method: 'POST',
      data: {
        disId: data.disId,
        purType: data.purType,
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

// 根据部门ID查询商品分类、商品和订单
export const disGetTypePrepareOutDepGoodsPage = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/disGetTypePrepareOutDepGoodsPage',
      method: 'POST',
      data: {
        disId: data.disId,
        depId: data.depId,
        purType: data.purType,
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: (res) => {
        console.log('disGetTypePrepareOutDepGoodsPage 接口返回:', res);
        if (res.statusCode === 404) {
          console.error('接口不存在，请检查接口路径:', apiUrl.apiUrl + 'nxdepartmentorders/disGetTypePrepareOutDepGoodsPage');
          reject(new Error('接口不存在 (404)'));
        } else {
          resolve({ result: res.data })
        }
      },
      fail: (e) => {
        console.error('disGetTypePrepareOutDepGoodsPage 请求失败:', e);
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

//

export const disGetTypePrepareOutByCollDis = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/disGetTypePrepareOutByCollDis',
      method: 'POST',
      data: {
        disId: data.disId,
        collDisId: data.collDisId,
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: (res) => {
        console.log('disGetTypePrepareOutByDep 接口返回:', res);
        if (res.statusCode === 404) {
          console.error('接口不存在，请检查接口路径:', apiUrl.apiUrl + 'nxdepartmentorders/disGetTypePrepareOutByDep');
          reject(new Error('接口不存在 (404)'));
        } else {
          resolve({ result: res.data })
        }
      },
      fail: (e) => {
        console.error('disGetTypePrepareOutByDep 请求失败:', e);
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

export const disGetTypePrepareOutByDep = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/disGetTypePrepareOutByDep',
      method: 'POST',
      data: {
        disId: data.disId,
        depId: data.depId,
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: (res) => {
        console.log('disGetTypePrepareOutByDep 接口返回:', res);
        if (res.statusCode === 404) {
          console.error('接口不存在，请检查接口路径:', apiUrl.apiUrl + 'nxdepartmentorders/disGetTypePrepareOutByDep');
          reject(new Error('接口不存在 (404)'));
        } else {
          resolve({ result: res.data })
        }
      },
      fail: (e) => {
        console.error('disGetTypePrepareOutByDep 请求失败:', e);
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

export const giveOrderWeightListForStockShelfGoods = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/giveOrderWeightListForStockShelfGoods',
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

export const giveOrderWeightListForStockAndFinish = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/giveOrderWeightListForStockAndFinish',
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
 * 添加订货申请
 * @param {*} data 
 */
export const saveOrderBefore = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/saveBefore' ,
      method: 'POST',
      data: data,
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

export const giveOrderPrice = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/giveOrderPrice',
      method: 'POST',
      data: {
        orderId: data.orderId,
        price: data.price,
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
        })
      }
    })
  })
}

export const giveOrderPriceColl = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/giveOrderPriceColl',
      method: 'POST',
      data: {
        orderId: data.orderId,
        price: data.price,
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
        })
      }
    })
  })
}

export const updateOrderWeight = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/updateOrderWeight',
      method: 'POST',
      data: {
        orderId: data.orderId,
        weight: data.weight,
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
        })
      }
    })
  })
}

export const updateOrderWeightGb = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/updateOrderWeightGb',
      method: 'POST',
      data: {
        orderId: data.orderId,
        weight: data.weight,
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
        })
      }
    })
  })
}

/**
 * 删除订货申请
 * @param {*} data 
 */
export const deleteOrder = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/delete/' + data ,
      method: 'GET',
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
 * 删除订货申请
 * @param {*} data 
 */
export const deleteTaskOrder = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/deleteTaskOrder/' + data ,
      method: 'GET',
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
 * 删除订货申请
 * @param {*} data 
 */
export const revertTaskOrder = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/revertTaskOrder/' + data ,
      method: 'GET',
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
 * 修改订货申请
 * @param {*} data 
 */
export const updateOrder = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/updateOrder' ,
      method: 'POST',
      data:{
        id: data.id,
        weight: data.weight,
        standard: data.standard,
        remark: data.remark,
        printStandard: data.printStandard,
        priceLevel: data.priceLevel
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
      }
    })
  })
}

export const getOrderPageToOutWeightByDis = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/getOrderPageToOutWeightByDis' ,
      method: 'POST',
      data:{
        disId: data.disId,
        depFatherId: data.depFatherId,
        gbDepFatherId: data.gbDepFatherId,
        orderBy: data.orderBy
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

export const getOrderPageToOutWeightGb = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/getOrderPageToOutWeightGb' ,
      method: 'POST',
      data:{
        disId: data.disId,
        gbDepFatherId: data.gbDepFatherId,
        orderBy: data.orderBy
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

export const getOrderPage = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/getOrderPage' ,
      method: 'POST',
      data:{
        depFatherId: data.depFatherId,
        gbDepFatherId: data.gbDepFatherId,
        orderBy: data.orderBy,
        disId: data.disId
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

export const getOrderPageByDis = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/getOrderPageByDis' ,
      method: 'POST',
      data:{
        disId: data.disId,
        depFatherId: data.depFatherId,
        gbDepFatherId: data.gbDepFatherId,
        orderBy: data.orderBy
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
 * 添加订货申请
 * @param {*} data 
 */
export const saveOrder = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/save' ,
      method: 'POST',
      data: data,
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

/** 配送商替精彩账本饭馆下单；后台仍复用普通订单的保存和计价规则。 */
export const saveJczbProxyOrder = (data, options) => {
  options = options || {};
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/saveJczbProxy' +
        '?gbDisId=' + encodeURIComponent(options.gbDisId) +
        '&gbDepId=' + encodeURIComponent(options.gbDepId) +
        '&cashOrder=' + (options.cashOrder ? 'true' : 'false') +
        '&beforeOrder=' + (options.beforeOrder ? 'true' : 'false'),
      method: 'POST',
      data: data,
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
 * 添加订货申请
 * @param {*} data 
 */
export const saveOrderBeforeTask = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/saveOrderBeforeTask' ,
      method: 'POST',
      data: data,
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
 * page：order
 * 获取订货客户的订单
 * @param {*} data 
 */
export const disGetTodayOrderCustomer = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/disGetTodayOrderCustomer/' + data,
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '"' + e +'"',
          icon: 'none',
          duration: 5000
        })
       
      }
    })
  })
}

/**
 * 平台客户今日订货列表（与 disGetTodayOrderCustomer 分离）
 * @param {number} disId 配送商 ID
 */
export const getPlatformCustomersToday = (disId) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'platform/distributer/customers/today',
      method: 'POST',
      header: { 'content-type': 'application/json' },
      data: { disId: disId },
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
 * 获取司机最优路线
 * @param {Object} data 包含driverRoutes的数据
 */

/**
 * OCR识别订单（图片）
 * @param {Object} data 包含 ImageBase64, depId, disId 等；云密钥仅由后台持有
 */
export const recognizeOrder = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'ocr/recognizeOrder',
      method: 'POST',
      timeout: 180000, // 3分钟超时
      header: {
        'Content-Type': 'application/json'
      },
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
 * OCR识别订单（图片）
 * @param {Object} data 包含 ImageBase64, depId, disId 等；云密钥仅由后台持有
 */
export const recognizeOrderAsync = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'ocr/recognizeOrderAsync',
      method: 'POST',
      timeout: 180000, // 3分钟超时
      header: {
        'Content-Type': 'application/json'
      },
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
 * OCR快速识别订单（图片）
 * @param {Object} data 包含 depId, disId, depFatherId, userId
 */
export const recognizeOrderFast = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'ocr/recognizeOrderFast',
      method: 'POST',
      timeout: 60000, // 3分钟超时
      header: {
        'Content-Type': 'application/json'
      },
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
 * OCR识别订单（Excel文件）
 * @param {Object} data 包含 filePath, depId, disId, depFatherId, userId
 */
export const recognizeOrderFromExcel = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerUploadFile({
      url: apiUrl.apiUrl + 'ocr/recognizeOrderFromExcel',
      filePath: data.filePath,
      name: 'file',
      timeout: 180000, // 3分钟超时
      formData: {
        depId: data.depId || '',
        disId: data.disId || '',
        depFatherId: data.depFatherId || '',
        userId: data.userId || ''
      },
      success: (res) => {
        try {
          const result = JSON.parse(res.data);
          resolve({ result: result })
        } catch (e) {
          reject(e);
          load.hideLoading();
          wx.showToast({
            title: '解析响应失败',
            icon: 'none'
          })
        }
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
 * 批量删除订单
 * @param {Object} data 包含 orderIds 数组
 */

/**
 * 订单修正接口
 * @param {Object} data 包含 orderItems, userInstructions, depId, disId 等
 */

/**
 * 单个订单修正接口
 * @param {Object} ordersEntity 订单实体对象，包含 nxDoGoodsName, nxDoStandard, nxDoQuantity 等字段
 */
export const correctOrder = (ordersEntity) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'ocr/correctOrder',
      method: 'POST',
      timeout: 60000, // 60秒超时
      header: {
        'Content-Type': 'application/json'
      },
      data: ordersEntity,
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
 * 根据 prompt_key 获取 prompt
 * @param {String} promptKey prompt 的唯一键（如：OCR_IMAGE, OCR_EXCEL, OCR_PASTE）
 */

/**
 * 未出账订单批次预览：运费估算 + 可用优惠券
 */
export const orderGroupPreview = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/order-group/preview',
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data: data,
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
 * 腾讯云语音合成（TTS）- 订单朗读
 * @param {Object} data 包含 orderItems, sessionId 等
 * orderItems: [{name: "商品名", qty: "数量", unit: "单位", remark: "备注"}]
 */
export const textToSpeech = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'ocr/textToSpeech',
      method: 'POST',
      timeout: 60000, // 60秒超时（批量合成可能需要更长时间）
      header: {
        'Content-Type': 'application/json'
      },
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

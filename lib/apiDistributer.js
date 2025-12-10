import Promise from './bluebird'
import apiUrl from '../config.js'

var load = require('./load.js');

//





export const disGetDepGoodsHistoryPrice = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentorderhistory/disGetDepGoodsHistoryPrice',
      method: 'POST',
      data: {
        depFatherId: data.depFatherId,
        goodsId: data.goodsId,
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



export const disGetGbSupplierBillsWithStatus = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributerpurchasebatch/disGetGbSupplierBillsWithStatus',
      method: 'POST',
      data: {
        supplierId: data.supplierId,
        status: data.status,
        startDate: data.startDate,
        stopDate: data.stopDate,
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
        })
      }
    })
  })
}


export const getGoodsReduceWithDayData = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelfstockreduce/getGoodsReduceWithDayData' ,
      method: 'POST',
      data: {
        disGoodsId: data.disGoodsId,
        startDate: data.startDate,
        stopDate: data.stopDate,
        searchDepId: data.searchDepId
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
 * 添加进货商品，修改订单状态subPackage-charts/pages/mangement/purGoodsFenxi/purGoodsFenxi
 * @param {*} data 
 */
export const staffRecievePurGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributerpurchasegoods/staffRecievePurGoods' ,
      method: 'POST',
      data: {
        purGoodsId: data.purGoodsId,
        userId: data.userId
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
export const getBrandForPrompts = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/getBrandForPrompts' ,
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
 * 添加进货商品，修改订单状态
 * @param {*} data 
 */
export const updateDisStock = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelfstock/updateDisStock' ,
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



export const pasteSearchGoodsForShelf = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentorders/pasteSearchGoodsForShelf',
      method: 'POST',
      data: {
        shelfId: data.shelfId,
        disId: data.disId,
        items: data.items,
      },
      header: {
        'Content-Type': 'application/json'
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
export const deletePlanPurchaseGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributerpurchasegoods/deletePlanPurchaseGoods/' + data,
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
 * 添加进货商品，修改订单状态
 * @param {*} data 
 */
export const updatePurchaseGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributerpurchasegoods/updatePurchaseGoods',
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



export const saveShelfGoodsStock = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributerpurchasegoods/saveShelfGoodsStock' ,
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


export const disGetUnshelfGoods = (disId, page = 1, limit = 10) => {
  return new Promise((resolve, reject) => {
    let url = apiUrl.apiUrl + 'nxdistributergoodsshelfgoods/disGetUnshelfGoods/' + disId;
    // 添加查询参数
    const params = [];
    if (page) params.push('page=' + page);
    if (limit) params.push('limit=' + limit);
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    wx.request({
      url: url,
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


export const cancelSupplierGoods = (data) => {
  return new Promise((resolve, reject) => {
    // 参数验证
    console.log('cancelSupplierGoods 接收到的参数:', data);
    
    if (!data) {
      reject(new Error('参数为空'));
      return;
    }
    
    if (!data.ids) {
      reject(new Error('缺少 ids 参数'));
      return;
    }
    
    if (typeof data.ids !== 'string') {
      reject(new Error(`ids 不是字符串，当前类型: ${typeof data.ids}`));
      return;
    }
    
    if (data.ids.trim() === '') {
      reject(new Error('ids 字符串为空'));
      return;
    }
    
    console.log('参数验证通过，准备发送请求');

    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/cancelSupplierGoods',
      method: 'POST',
      data: {
        ids: data.ids,
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: (res) => {
        // 检查响应状态
        if (res.statusCode === 200) {
          resolve({ result: res.data });
        } else {
          reject(new Error(`HTTP错误: ${res.statusCode}`));
        }
      },
      fail: (e) => {
        console.error('取消供货商品请求失败:', e);
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '网络连接失败，请检查网络',
          icon: 'none',
          duration: 2000
        });
      }
    });
  });
}

export const disGetStockGoodsNew = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentorders/disGetStockGoodsNew',
      method: 'POST',
      data: {
        disId: data.disId,
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
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
        
      }
    })
  })
}

//

 

export const testAi = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'ai/linshi/round1',
      method: 'POST',
      data: {
        rawText: data.rawText,
        distributorId: data.distributorId,
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


export const exchangeDepApplyGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentorders/exchangeDepApplyGoods',
      method: 'POST',
      data: {
        orderId: data.orderId,
        goodsId: data.goodsId,
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



export const editDepApplyGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentorders/editDepApplyGoods',
      method: 'POST',
      data: {
        orderId: data.orderId,
        goodsId: data.goodsId,
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


export const changeDeps = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartment/changeDeps',
      method: 'POST',
      data: {
        oldDepId: data.oldDepId,
        newDepId: data.newDepId,
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

export const getPrepareDeliveryDepartment = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartment/getPrepareDeliveryDepartment/' + data,
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

export const updateGbDisAttrName = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributer/updateGbDisAttrName',
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

export const disGetGbDisGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentdisgoods/disGetGbDisGoods',
      method: 'POST',
      data: {
        disId: data.disId,
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


export const updateDepGoodsSellingPrice = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentdisgoods/updateDepGoodsSellingPrice',
      method: 'POST',
      data: {
        depGoodsId: data.depGoodsId,
        sellingPrice: data.sellingPrice,
        pickDetail: data.pickDetail,
        orderName: data.orderName
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

 
export const saveSupplierGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/saveSupplierGoods' ,
      method: 'POST',
      data:{
        ids: data.ids,
        supplierId: data.supplierId
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
 * 批发商商品列表
 * @param {*} data 
 */
export const disGetDisTypeGoodsListByFatherId = (data) => {
  return new Promise((resolve, reject) => {
    // 构建请求参数，只有当 hasCartonUnit 不为 null 且不为 undefined 时才添加
    var requestData = {
        fatherId: data.fatherId,
        goodsType: data.goodsType,
        limit: data.limit,
        page: data.page
    };
    if (data.hasCartonUnit != null && data.hasCartonUnit !== undefined) {
      requestData.hasCartonUnit = data.hasCartonUnit;
    }
    
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/disGetDisTypeGoodsListByFatherId' ,
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
        })
      }
    })
  })
}


/**
 * 批发商商品列表
 * @param {*} data 
 */
export const disGetDisGoodsListByFatherId = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/disGetDisGoodsListByFatherId' ,
      method: 'POST',
      data: {
        disId: data.disId,
        fatherId: data.fatherId
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
 * 获取客户配送商品
 * @param {} data 
 */
export const supplierGetGoodsListByFatherId = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/supplierGetGoodsListByFatherId' ,
      method: 'POST',
      data:{
        limit: data.limit,
        page: data.page,
        supplierId: data.supplierId,
        fatherId: data.fatherId
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


export const getNxDisDepPdf = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentorders/getNxDisDepPdf' ,
      method: 'POST',
      data: {
        depFatherId: data.depFatherId,
        startDate: data.startDate,
        stopDate: data.stopDate
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




export const finishPayPurchaseBatchGb = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/finishPayPurchaseBatchGb',
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


export const disCheckUnPayBillsGb = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/disCheckUnPayBillsGb',
      method: 'POST',
      data:{
        disId: data.disId,
        supplierId: data.supplierId,
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




export const supplierEditBatchGb = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/supplierEditBatchGb/' + data,
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



export const nxDisFinishPurchaseGoodsBatchGb = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/nxDisFinishPurchaseGoodsBatchGb' ,
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

export const nxDisSaveGbPurchaserBatch = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/nxDisSaveGbPurchaserBatch' ,
      method: 'POST',
      data: {
        batchId: data.batchId,
        nxDisId: data.nxDisId,
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

export const getDisPurchaseGoodsBatchGb = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasebatch/getDisPurchaseGoodsBatchGb/' + data ,
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


export const supplierGetStars = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdepartmentgoodsstock/supplierGetStars' ,
      method: 'POST',
      data: {
        supplierId: data.supplierId,
        startDate: data.startDate,
        stopDate: data.stopDate,
        nxDisId: data.nxDisId
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



export const gbDisSaveBusiness = (data) => { 
  return new Promise((resolve, reject) => {
     wx.request({
       url: apiUrl.apiUrl + 'nxdistributergbdistributer/gbDisSaveBusiness',//演示域
       method: 'POST',
       data: {
        gbDisId: data.gbDisId,
        nxDisId: data.nxDisId
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
       },
 
     })
   })
 }


export const queryDisInfoBusiness = (data) => { 
  return new Promise((resolve, reject) => {
     wx.request({
       url: apiUrl.apiUrl + 'nxdistributergbdistributer/queryDisInfoBusiness',//演示域
      method: 'POST',
       data: {
        gbDisId: data.gbDisId,
        nxDisId: data.nxDisId
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
       },

     })
   })
 }



export const buyMachines = (data) => { 
  return new Promise((resolve, reject) => {
     wx.request({
       url: apiUrl.apiUrl + 'nxdistributerpay/buyMachines',//演示域
       method: 'POST',
       data,
       success: function (res) {
         resolve({ result: res.data })
       },
       fail: function (e) {
         reject(e);
         load.hideLoading();
       },

     })
   })
 }


 
export const disGetPayListDetail = (data) => { 
  return new Promise((resolve, reject) => {
     wx.request({
       url: apiUrl.apiUrl + 'nxdistributerpaylist/disGetPayListDetail' ,//演示域
       method: 'POST',
       data:{
         disId: data.disId,
         limit: data.limit,
         page: data.page,
         type: data.type
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
       },
 
     })
   })
 }


export const disPayUser = (data) => { 
  return new Promise((resolve, reject) => {
     wx.request({
       url: apiUrl.apiUrl + 'nxdistributerpay/disPayUser',//演示域
       method: 'POST',
       data: {
        payId: data.payId,
        openId: data.openId,
        subtotal: data.subtotal
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
       },
 
     })
   })
 }


export const updatePassword = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.server + 'sys/user/updatePassword',
      method: 'POST',
      data:{
        disId: data.disId,
        newPassword: data.newPassword,
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

export const disGetWebUser = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.server + 'sys/user/disGetWebUser/' +data,
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



export const nxDisGetPurchaseGoodsGb = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasegoods/nxDisGetPurchaseGoodsGb',
      method: 'POST',
      data: {
        disId: data.disId,
        nxDisId: data.nxDisId,
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


export const nxDisSavePurGoodsPriceSx = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasegoods/nxDisSavePurGoodsPriceSx',
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

export const nxDisSavePurGoodsPrice = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'gbdistributerpurchasegoods/nxDisSavePurGoodsPrice',
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




export const changeBusinessStatus = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergbdistributer/changeBusinessStatus' ,
      method: 'POST',
      data: {
        id: data.id,
        status: data.status,
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


export const delteNxAndGbBusiness = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergbdistributer/delteNxAndGbBusiness/' + data,
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


export const jjshUserSaveWithFileInvite = (filePathList, code, marketId,disName,userName, address,phone, disId) => { 
  return new Promise((resolve, reject) => {
     wx.uploadFile({
       url: apiUrl.apiUrl + 'nxdistributer/jjshUserSaveWithFileInvite',//演示域名、自行配置
       filePath: filePathList[0],
       name: 'file',
       header: {
         "Content-Type": "multipart/form-data"
       },
       formData: {
         code: code,
        marketId: marketId,
        disName: disName,
        userName: userName,
        address: address,
        phone: phone,
        disId: disId
       },
       success: function (res) {
         resolve({ result: res.data })
       },
       fail: function (e) {
         reject(e);
         load.hideLoading();
       },
 
     })
   })
 }


export const jjshUserSaveWithFile = (filePathList, code, marketId,disName,userName, address,phone) => { 
  return new Promise((resolve, reject) => {
     wx.uploadFile({
       url: apiUrl.apiUrl + 'nxdistributer/jjshUserSaveWithFile',//演示域名、自行配置
       filePath: filePathList[0],
       name: 'file',
       header: {
         "Content-Type": "multipart/form-data"
       },
       formData: {
         code: code,
        marketId: marketId,
        disName: disName,
        userName: userName,
        address: address,
        phone: phone
       },
       success: function (res) {
         resolve({ result: res.data })
       },
       fail: function (e) {
         reject(e);
         load.hideLoading();
       },
 
     })
   })
 }


 export const jjshUserSaveWithFileByGbInvite = (filePathList, code, marketId,disName,userName, address,phone, gbDisId) => { 
  return new Promise((resolve, reject) => {
     wx.uploadFile({
       url: apiUrl.apiUrl + 'nxdistributer/jjshUserSaveWithFileByGbInvite',//演示域名、自行配置
       filePath: filePathList[0],
       name: 'file',
       header: {
         "Content-Type": "multipart/form-data"
       },
       formData: {
         code: code,
        marketId: marketId,
        disName: disName,
        userName: userName,
        address: address,
        phone: phone,
        gbDisId: gbDisId
       },
       success: function (res) {
         resolve({ result: res.data })
       },
       fail: function (e) {
         reject(e);
         load.hideLoading();
       },
 
     })
   })
 }

export const disUserSaveWithFile = (filePathList, userName,code, disId,admin, phone) => { 
  return new Promise((resolve, reject) => {
     wx.uploadFile({
       url: apiUrl.apiUrl + 'nxdistributeruser/disUserSaveWithFile',//演示域名、自行配置
       filePath: filePathList[0],
       name: 'file',
       header: {
         "Content-Type": "multipart/form-data"
       },
       formData: {
        userName: userName,
        code: code,
        disId: disId,
        admin: admin,
        phone: phone || ""
       },
       success: function (res) {
         resolve({ result: res.data })
        
      
       },
       fail: function (e) {
         reject(e);
         load.hideLoading();
       },
 
     })
   })
 }

 
/**
 * 批发商管理员注册
 * @param {} data 
 */
export const disUserSave = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributeruser/disUserSave',
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


export const disSaveDepGoodsName = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentdisgoods/disSaveDepGoodsName',    
      method: 'POST',
      data:{
        depId: data.depId,
        goodsName: data.goodsName,
        disGoodsId: data.disGoodsId
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


export const changeMultiDeps = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartment/changeMultiDeps',    
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


export const supplierGetDisGoodsCata = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/supplierGetDisGoodsCata',    
      method: 'POST',
      data:{
        disId: data.disId,
        supplierId: data.supplierId,
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


export const jjshGetMarket = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'syscitymarket/jjshGetMarket',
      method: 'POST',
      data:{
        maId: data.maId,
        cityId: data.cityId,
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
 * 批发商注册
 * @param {*} data 批发商entity
 */
export const disAndUserSave = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributer/disAndUserSave',
      method: 'POST',
      data,
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        
        load.showLoading("设置商品需要2分钟时间。");
        setTimeout(() => {
          load.hideLoading();
          wx.showToast({
          title: '已注册,请点击微信登录',
        })
        
         }, 120000);

      }
    })
  })
}

/**
 * 批发商添加客户
 * @param {*} data 
 */
export const saveOneCustomer = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartment/saveOneCustomer' ,
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


export const queryDisExchangeGoodsByQuickSearch = (data) => { 
  return new Promise((resolve, reject) => {
     wx.request({
       url: apiUrl.apiUrl + 'nxdistributergoods/queryDisExchangeGoodsByQuickSearch',//演示域
       method: 'POST',
       data: {
        disId: data.disId,
        fatherId: data.fatherId,
        searchStr: data.searchStr
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
       },
 
     })
   })
 }



export const disBuyApp = (data) => { 
  return new Promise((resolve, reject) => {
     wx.request({
       url: apiUrl.apiUrl + 'nxdistributerpay/disBuyApp',//演示域
       method: 'POST',
       data: {
        disId: data.disId,
        openId: data.openId,
        subtotal: data.subtotal,
        quantity: data.quantity,
        type: data.type,
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
       },
 
     })
   })
 }
 


export const disBuyUser = (data) => { 
  return new Promise((resolve, reject) => {
     wx.request({
       url: apiUrl.apiUrl + 'nxdistributerpay/disBuyUser',//演示域
       method: 'POST',
       data: {
        disId: data.disId,
        openId: data.openId,
        subtotal: data.subtotal,
        quantity: data.quantity,
        type: data.type,
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
       },
 
     })
   })
 }
 

export const disBuyUserMarket = (data) => { 
  return new Promise((resolve, reject) => {
     wx.request({
       url: apiUrl.apiUrl + 'nxdistributerpay/disBuyUserMarket',//演示域
       method: 'POST',
       data: {
        disId: data.disId,
        openId: data.openId,
        subtotal: data.subtotal,
        quantity: data.quantity,
        type: data.type,
        marketId: data.marketId
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
       },
 
     })
   })
 }
 
 
 /**
  * 用户修改信息
  * @param {*} data 
  */
 export const updateDisInfo = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributer/updateDisInfo' ,
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



export const updateDisInfoWithFile = (filePathList, name,address, id) => { 
  return new Promise((resolve, reject) => {
     wx.uploadFile({
       url: apiUrl.apiUrl + 'nxdistributer/updateDisInfoWithFile',//演示域名、自行配置
       filePath: filePathList[0],
       name: 'file',
       header: {
         "Content-Type": "multipart/form-data"
       },
       formData: {
        name: name,
        address: address,
        id: id
       },
       success: function (res) {
         resolve({ result: res.data })
        
      
       },
       fail: function (e) {
         reject(e);
         load.hideLoading();
       },
 
     })
   })
 }


/**
 * 获取客户xiaoshou单
 * @param {*} data 
 */
export const sellerAndBuyerGetSalesBills = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentbill/sellerAndBuyerGetSalesBills',
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

 
export const exchangeNewGoodsDis = (data) => { 
  return new Promise((resolve, reject) => {
     wx.request({
       url: apiUrl.apiUrl + 'nxdistributergoods/exchangeNewGoodsDis',//演示域
       method: 'POST',
       data: {
        changeId: data.changeId,
        toGoodsId: data.toGoodsId,
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
       },
 
     })
   })
 }
 
/**
 * 批发商商品列表
 * @param {*} data 
 */
export const disGetNxDisGoodsListByFatherId = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/disGetNxDisGoodsListByFatherId' ,
      method: 'POST',
      data: {
        disId: data.disId,
        fatherId: data.fatherId
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



export const helpSaveLinshi = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/helpSaveLinshi/' + data,
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

export const delNxDisGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/delNxDisGoods/' + data,
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



export const updateNxDep = (data) => { 
  return new Promise((resolve, reject) => {
     wx.request({
       url: apiUrl.apiUrl + 'nxdepartment/updateNxDep',//演示域
       method: 'POST',
       data,
       success: function (res) {
         resolve({ result: res.data })
       },
       fail: function (e) {
         reject(e);
         load.hideLoading();
       },

     })
   })
 }

//

export const delSubDep = (data) => { 
  return new Promise((resolve, reject) => {
     wx.request({
       url: apiUrl.apiUrl + 'nxdepartment/delSubDep/' + data,//演示域
       method: 'GET',
       success: function (res) {
         resolve({ result: res.data })
       },
       fail: function (e) {
         reject(e);
         load.hideLoading();
       },

     })
   })
 }

export const disDeleteSubDeps = (data) => { 
  return new Promise((resolve, reject) => {
     wx.request({
       url: apiUrl.apiUrl + 'nxdepartment/disDeleteSubDeps/' + data,//演示域
       method: 'GET',
       success: function (res) {
         resolve({ result: res.data })
       },
       fail: function (e) {
         reject(e);
         load.hideLoading();
       },

     })
   })
 }


export const saveNxDisLinshiGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/saveNxDisLinshiGoods',
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
 * 添加损耗记录
 * @param {*} data {disId, disGoodsId, weight, userId}
 */
export const addUse = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelfstockreduce/addUse',
      method: 'POST',
      data: {
        disId: data.disId,
        disGoodsId: data.disGoodsId,
        weight: data.weight,
        userId: data.userId
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
 * 添加损耗记录
 * @param {*} data {disId, disGoodsId, weight, userId}
 */
export const addLoss = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelfstockreduce/addLoss',
      method: 'POST',
      data: {
        disId: data.disId,
        disGoodsId: data.disGoodsId,
        weight: data.weight,
        userId: data.userId
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
 * 添加退货记录
 * @param {*} data {disId, disGoodsId, weight, userId}
 */
export const addReturn = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelfstockreduce/addReturn',
      method: 'POST',
      data: {
        disId: data.disId,
        disGoodsId: data.disGoodsId,
        weight: data.weight,
        userId: data.userId
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
 * 库存调拨（调出）
 * @param {*} data {sourceStockId, transferQuantity, targetShelfGoodsId, userId}
 */
export const transferStockFromBatch = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributerpurchasegoods/transferStockFromBatch',
      method: 'POST',
      data: {
        sourceStockId: data.sourceStockId,
        transferQuantity: data.transferQuantity,
        targetShelfGoodsId: data.targetShelfGoodsId,
        userId: data.userId
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
 * 添加废弃记录
 * @param {*} data {disId, disGoodsId, weight, userId}
 */
export const addWaste = (data) => {
  return new Promise((resolve, reject) => {
    // 构建请求参数，包含所有传入的参数
    const requestData = {
      disId: data.disId,
      disGoodsId: data.disGoodsId,
      weight: data.weight,
      userId: data.userId
    };
    
    // 添加盘库周期参数（如果存在）
    if (data.inventoryType !== undefined) {
      requestData.inventoryType = parseInt(data.inventoryType);
    }
    if (data.inventoryDate) {
      requestData.inventoryDate = data.inventoryDate;
    }
    if (data.inventoryWeek) {
      requestData.inventoryWeek = String(data.inventoryWeek);
    }
    if (data.inventoryMonth) {
      requestData.inventoryMonth = data.inventoryMonth;
    }
    
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelfstockreduce/saveInventoryRecord',
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

// 导出别名，用于盘库操作
export const saveInventoryRecord = addWaste

/**
 * 查询未盘库货架商品列表
 * @param {*} data {shelfId, inventoryType, inventoryDate, inventoryWeek, inventoryMonth, page, limit}
 */
export const queryUnInventoriedShelfGoods = (data) => {
  return new Promise((resolve, reject) => {
    // 确保 inventoryType 是整数类型
    const inventoryType = parseInt(data.inventoryType);
    
    // 构建请求参数，只包含有值的字段
    const requestData = {
      shelfId: parseInt(data.shelfId),
      inventoryType: inventoryType,
      page: parseInt(data.page || 1),
      limit: parseInt(data.limit || 15)
    };
    
    // 根据盘库类型添加对应的周期参数
    if (inventoryType === 1 && data.inventoryDate) {
      requestData.inventoryDate = data.inventoryDate;
    } else if (inventoryType === 2 && data.inventoryWeek) {
      requestData.inventoryWeek = String(data.inventoryWeek);
    } else if (inventoryType === 3 && data.inventoryMonth) {
      requestData.inventoryMonth = data.inventoryMonth;
    }
    
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelfgoods/queryUnInventoriedShelfGoods',
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
 * 获取上货商品列表
 * @param {*} data 
 */
export const updateShelfGoods= (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelfgoods/updateShelfGoods',
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


export const disSaveSelfGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/disSaveSelfGoods',
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

export const getLevelOneGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributerfathergoods/getLevelOneGoods/' + data,
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


export const getFatherGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/getFatherGoods/' + data,
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

//

export const disChangeLinshiToSub = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/disChangeLinshiToSub',
      method: 'POST',
      data: {
        nxGoodsId: data.nxGoodsId,
        lsGoodsId: data.lsGoodsId,
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
        })
      }
    })
  })
}


export const disSaveLinshiToNxGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentorders/disSaveLinshiToNxGoods',
      method: 'POST',
      data: {
        nxGoodsId: data.nxGoodsId,
        lsGoodsId: data.lsGoodsId,
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
        })
      }
    })
  })
}


export const disSaveLinshiToAlias = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/disSaveLinshiToAlias',
      method: 'POST',
      data: {
        nxGoodsId: data.nxGoodsId,
        lsGoodsId: data.lsGoodsId,
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
        })
      }
    })
  })
}


export const updateJrdhSupplier = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxjrdhsupplier/updateJrdhSupplier' ,
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




export const saveJrdhSupplier = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxjrdhsupplier/saveJrdhSupplier' ,
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

export const getDisLinshiGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/getDisLinshiGoods/' + data,
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

export const disGetBuyTypeMarket = (data) => { 
  return new Promise((resolve, reject) => {
     wx.request({
       url: apiUrl.apiUrl + 'nxdistributerpay/disGetBuyTypeMarket',//演示域
       method: 'POST',
       data: {
        marketId: data.marketId,
        type: data.type
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
       },
 
     })
   })
 }


export const disGetBuyType = (data) => { 
  return new Promise((resolve, reject) => {
     wx.request({
       url: apiUrl.apiUrl + 'nxdistributerpay/disGetBuyType',//演示域
       method: 'POST',
       data: {
        disId: data.disId,
        type: data.type
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
       },
 
     })
   })
 }

export const updateFatherNx = (filePathList, goodsName,goodsId) => { 
  return new Promise((resolve, reject) => {
     wx.uploadFile({
       url: apiUrl.apiUrl + 'nxdistributergoods/updateFatherNx',//演示域名、自行配置
       filePath: filePathList,
       name: 'file',
       header: {
         "Content-Type": "multipart/form-data"
       },
       formData: {
        goodsName: goodsName,
        id: goodsId,
       },
       success: function (res) {
         resolve({ result: res.data })
       },
       fail: function (e) {
         reject(e);
       }, 
     })
   })
 }
 export const updateFatherBigNx = (filePathList, goodsName,goodsId) => { 
  return new Promise((resolve, reject) => {
     wx.uploadFile({
       url: apiUrl.apiUrl + 'nxdistributergoods/updateFatherBigNx',//演示域名、自行配置
       filePath: filePathList,
       name: 'file',
       header: {
         "Content-Type": "multipart/form-data"
       },
       formData: {
        goodsName: goodsName,
        id: goodsId,
       },
       success: function (res) {
         resolve({ result: res.data })
       },
       fail: function (e) {
         reject(e);
       }, 
     })
   })
 }


export const updateDisUserAdmin = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributeruser/updateDisUserAdmin',
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
 * 删除管理员
 * @param {} data 
 */
export const deleteJrdhUser = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxjrdhuser/deleteJrdhUser/' + data,
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
 * 删除管理员
 * @param {} data 
 */
export const deleteDisUser = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributeruser/deleteDisUser/' + data,
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


export const disGetPayList = (data) => { 
  return new Promise((resolve, reject) => {
     wx.request({
       url: apiUrl.apiUrl + 'nxdistributerpay/disGetPayList',//演示域
       method: 'POST',
       data: {
        disId: data.disId,
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
       },
 
     })
   })
 }
 

 /**
  * 用户修改信息
  * @param {*} data 
  */
export const updateDisUser = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributeruser/updateDisUser' ,
      method: 'POST',
      data: {
        userName: data.userName,
        userId: data.userId,
        phone: data.phone,
        deviceId: data.deviceId
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


export const updateDisUserWithFile = (filePathList, userName,userId  ) => { 
  return new Promise((resolve, reject) => {
     wx.uploadFile({
       url: apiUrl.apiUrl + 'nxdistributeruser/updateDisUserWithFile',//演示域名、自行配置
       filePath: filePathList[0],
       name: 'file',
       header: {
         "Content-Type": "multipart/form-data"
       },
       formData: {
        userName: userName,
        userId: userId,
       },
       success: function (res) {
         resolve({ result: res.data })
        
      
       },
       fail: function (e) {
         reject(e);
         load.hideLoading();
       },
 
     })
   })
 }


/**
 * 获取客户配送商品
 * @param {} data 
 */
export const disGetGbDepGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentdisgoods/disGetGbDepGoods/' + data ,
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

//


/**
 * 获取客户配送商品
 * @param {} data 
 */
export const disGetSubDepAiOrder = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentordershistory/disGetSubDepAiOrder/' + data ,
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
 * 获取客户配送商品
 * @param {} data 
 */
export const disGetDepGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentdisgoods/disGetDepGoods/' + data ,
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
 * 获取群用户列表
 * @param {*} data 
 */
export const getDepUsersByFatherId = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentuser/getDepUsersByFatherId/' + data ,
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



export const deleteBillAgain = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentbill/deleteBillAgain/' + data,
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

export const deleteBillAgainGb = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentbill/deleteBillAgainGb/' + data,
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


export const deleteBill = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentbill/deleteBill/' + data,
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


export const deleteBillGb = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentbill/deleteBillGb/' + data,
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
 * 获取客户送货单
 * @param {*} data 
 */
export const sellerAndBuyerGetAccountBills = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentbill/sellerAndBuyerGetAccountBills',
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






export const delHisotory = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentordershistory/delHisotory/' + data ,
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



export const deleteDepUser = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentuser/deleteDepUser/' + data ,
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
 * 保存订单的数量
 * @param {*} data 
 */
export const updateDepUserAdmin = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentuser/updateDepUserAdmin',
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
 * 获取订货群子部门
 * @param {}} data 
 */
export const updateGroupNameWithNxDisBusiness = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartment/updateGroupNameWithNxDisBusiness',
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


export const updateGroupName = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartment/updateGroupName',
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


export const deleteDepGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentdisgoods/deleteDepGoods/' +data,
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


export const deleteGroupDep = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartment/deleteGroupDep',
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


export const getGbDisDepInfo = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartment/getGbDisDepInfo/' + data ,
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

export const getDepInfo = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartment/getDepInfo/' + data ,
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


export const saveOneCustomerDesk = (data) => { 
  return new Promise((resolve, reject) => {
     wx.request({
       url: apiUrl.apiUrl + 'nxdepartment/saveOneCustomerDesk',//演示域
       method: 'POST',
       data,
       success: function (res) {
         resolve({ result: res.data })
       },
       fail: function (e) {
         reject(e);
         load.hideLoading();
       },

     })
   })
 }


export const disGetAllGbDistributer = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergbdistributer/disGetAllGbDistributer/' + data,
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
 * 搜索类别商品
 * @param {*} data 
 */
export const queryShelfNxGoodsWithNxDisByQuickSearch = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxgoods/queryShelfNxGoodsWithNxDisByQuickSearch',
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


//

//


/**
 * 搜索批发商商品
 */
export const queryDisShelfGoodsWithNxGoodsId = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelfgoods/queryDisShelfGoodsWithNxGoodsId' ,
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
        })
      }
    })
  })
}

/**
 * 搜索批发商商品
 */
export const queryDisShelfGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelfgoods/queryDisShelfGoods' ,
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
        })
      }
    })
  })
}


/**
 * 搜索批发商商品
 */
export const queryDisShelfGoodsByQuickSearch = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/queryDisShelfGoodsByQuickSearch' ,
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
        })
      }
    })
  })
}



export const updateShelfSort = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelf/updateShelfSort',
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

export const deleteShelfGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelfgoods/deleteShelfGoods/' + data,
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

export const setShelfLayer = (shelfGoodsId) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelfgoods/setShelfLayer',
      method: 'POST',
      data: {
        shelfGoodsId
      },
      header: {
        'content-type': 'application/json'
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

export const clearShelfLayer = (shelfGoodsId) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelfgoods/clearShelfLayer',
      method: 'POST',
      data: {
        shelfGoodsId
      },
      header: {
        'content-type': 'application/json'
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


export const updateShelfGoodsSort = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelfgoods/updateShelfGoodsSort',
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
        })
      }
    })
  })
}

export const addShelfGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelfgoods/addShelfGoods',
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
        })
      }
    })
  })
}
//

// 下载货架商品模板
export const downloadShelfGoodsTemplate = (shelfId) => {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url: `${apiUrl.apiUrl}nxdepartmentorders/downloadShelfGoodsTemplate?shelfId=${shelfId}`,
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.tempFilePath);
        } else {
          const error = new Error('下载失败');
          error.statusCode = res.statusCode;
          error.data = res;
          reject(error);
          load.hideLoading();
          wx.showToast({
            title: '下载失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        const error = new Error('下载失败，请检查网络');
        error.originalError = err;
        reject(error);
        load.hideLoading();
        wx.showToast({
          title: '下载失败，请检查网络',
          icon: 'none'
        });
      }
    });
  });
};

// 下载货架库存模板
export const downloadShelfStockTemplate = (shelfId) => {
  return new Promise((resolve, reject) => {
    wx.downloadFile({
      url: `${apiUrl.apiUrl}nxdistributergoodsshelfstock/downloadShelfStockTemplate?shelfId=${shelfId}`,
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res.tempFilePath);
        } else {
          reject(res);
          wx.showToast({
            title: '下载失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        reject(err);
        load.hideLoading();
        wx.showToast({
          title: '下载失败，请检查网络',
          icon: 'none'
        });
      }
    });
  });
};

//

// 从Excel导入货架商品
export const importShelfGoodsFromExcel = (params) => {
  const { shelfId, filePath, operatorId } = params;
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${apiUrl.apiUrl}nxdepartmentorders/importShelfGoodsFromExcel`,
      filePath,
      name: 'file',
      formData: {
        shelfId,
        operatorId: operatorId || ''
      },
      success: (res) => {
        try {
          const data = JSON.parse(res.data);
          resolve({ result: data });
        } catch (error) {
          reject(error);
          wx.showToast({
            title: '上传失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        reject(err);
        load.hideLoading();
        wx.showToast({
          title: '上传失败，请检查网络',
          icon: 'none'
        });
      }
    });
  });
};

export const uploadShelfStock = (params) => {
  const { shelfId, filePath, operatorId } = params;
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: `${apiUrl.apiUrl}nxdistributergoodsshelfstock/uploadShelfStock`,
      filePath,
      name: 'file',
      formData: {
        shelfId,
        operatorId: operatorId || ''
      },
      success: (res) => {
        try {
          const data = JSON.parse(res.data);
          resolve({ result: data });
        } catch (error) {
          reject(error);
          wx.showToast({
            title: '上传失败',
            icon: 'none'
          });
        }
      },
      fail: (err) => {
        reject(err);
        load.hideLoading();
        wx.showToast({
          title: '上传失败，请检查网络',
          icon: 'none'
        });
      }
    });
  });
};

export const disGetToPlanPurchaseShelfGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelf/disGetToPlanPurchaseShelfGoods' ,
      method: 'POST',
      data:{
        disId: data.disId,
        shelfId: data.shelfId,
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
 * 添加进货商品，修改订单状态
 * @param {*} data 
 */
export const disSavePurGoodsSaveStock = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributerpurchasegoods/disSavePurGoodsSaveStock',
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
 * 添加进货商品，修改订单状态
 * @param {*} data 
 */
export const staffApplyPurGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributerpurchasegoods/staffApplyPurGoods',
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




export const getShelfGoods = (shelfId, page = 1, limit = 15) => {
  return new Promise((resolve, reject) => {
    let url = apiUrl.apiUrl + 'nxdistributergoodsshelf/getShelfGoods/' + shelfId;
    // 添加查询参数
    const params = [];
    if (page) params.push('page=' + page);
    if (limit) params.push('limit=' + limit);
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    wx.request({
      url: url,
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



export const deleteShelf = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelf/deleteShelf/' + data,
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


export const updateShelfName = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelf/updateShelfName'  ,
      method: 'POST',
      data: {
        shelfId: data.shelfId,
        shelfName: data.shelfName
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

export const disGetShelfList = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelf/disGetShelfList/' + data,
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

export const disGetShelfsWithDetail = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelf/disGetShelfsWithDetail/' + data,
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

export const updateShelf = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelf/updateShelf',
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

export const saveNewShelf = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelf/saveNewShelf',
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





export const supplierGetPurchaseBatchs = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributerpurchasebatch/supplierGetPurchaseBatchs',
      method: 'POST',
      data:{
        disId: data.disId,
        supplierId: data.supplierId,
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


export const deleteNxDisSuppler = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxjrdhsupplier/deleteNxDisSuppler/' + data,
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

export const nxDisGetAllSuppliers = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxjrdhsupplier/nxDisGetAllSuppliers',
      method: 'POST',
      data:{
        nxDisId: data.nxDisId,
        userId: data.userId,
        startDate: data.startDate,
        stopDate: data.stopDate
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
 * 获取管理员
 * @param {} data 
 */
export const getDisUsers = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributeruser/getDisUsers/' + data,
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

export const getDisUserInfo = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributeruser/getDisUserInfo/' + data,
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
 * 搜索批发商商品
 */
export const queryDisGoodsAndNxGoodsByQuickSearch = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/queryDisGoodsAndNxGoodsByQuickSearch' ,
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
        })
      }
    })
  })
}


/**
 * 搜索批发商商品
 */
export const queryLinshiGoodsAndNxGoodsByQuickSearch = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/queryLinshiGoodsAndNxGoodsByQuickSearch' ,
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
        })
      }
    })
  })
}

//




/**
 * 修改批发商商品暂时停订
 * @param {*} data 
 */
export const disGoodsUpdate = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/disGoodsUpdate',
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


export const disGetWaitStockGoodsDeps = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentorders/disGetWaitStockGoodsDeps',
      method: 'POST',
      data: {
        disId: data.disId,
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
        wx.showToast({
          title: '请检查网络',
        })
      }
    })
  })
}


/**
 * 添加批发商订货规格
 * @param {*} data 
 */
export const disSaveStandard = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributerstandard/disSaveStandard' ,
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
 * 搜索批发商商品
 */
export const queryDisGoodsByQuickSearchWithDepId = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/queryDisGoodsByQuickSearchWithDepId' ,
      method: 'POST',
      data:{
        disId: data.disId,
        searchStr: data.searchStr,
        depId: data.depId
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
 * 搜索批发商商品
 */
export const queryDisGoodsByQuickSearchWithDepIdDis = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/queryDisGoodsByQuickSearchWithDepIdDis' ,
      method: 'POST',
      data:{
        disId: data.disId,
        searchStr: data.searchStr,
        depId: data.depId
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
 * 获取批发商客户列表
 * @param {*} data 
 */
export const disGetAllCustomer = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartment/disGetAllCustomer/' + data,
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
 * 跟新批发商别名
 */
export const disDeleteAlias = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributeralias/disDeleteAlias/' + data,
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
 * 跟新批发商别名
 */
export const updateDisAlias = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributeralias/updateDisAlias',
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
 * 添加批发商品别名
 */
export const saveDisAlias = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributeralias/saveDisAlias',
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
 * 删除批发商订货规格
 * @param {*} data 
 */
export const disDeleteStandard = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributerstandard/disDeleteStandard/' + data ,
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
 * 修改批发商订货规格
 * @param {*} data 
 */
export const disUpdateStandard = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributerstandard/disUpdateStandard' ,
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
 * 批发商商品详细
 * @param {*} data 
 */
export const disGetGoodsDetail = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/disGetGoodsDetail/' + data ,
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

export const disGetUpdatePriceGoods = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoods/disGetUpdatePriceGoods',
      method: 'POST',
      data: {
        disId: data.disId,
        type: data.type,
        page: data.page || 1,
        limit: data.limit || 20,
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


export const disUpdateBuyingPrice = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdepartmentorders/disUpdateBuyingPrice',
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
 * 批发商商品类别列表
 * @param {*} data 
 */
export const getDisGoodsByGrandId = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributerfathergoods/getDisGoodsByGrandId' ,
      method: 'POST',
      data:{
        fatherId: data.fatherId,
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
 * 批发商商品类别列表
 * @param {*} data 
 */
export const getDisGoodsByGreatGrandIdWithCount = (data) => {
  return new Promise((resolve, reject) => {
    // 构建请求参数，只有当 hasCartonUnit 不为 null 且不为 undefined 时才添加
    var requestData = {
        fatherId: data.fatherId,
        limit: data.limit,
        page: data.page,
        disId: data.disId,
        goodsType: data.goodsType,
    };
    if (data.hasCartonUnit != null && data.hasCartonUnit !== undefined) {
      requestData.hasCartonUnit = data.hasCartonUnit;
    }
    
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributerfathergoods/getDisGoodsByGreatGrandIdWithCount' ,
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
        })
       
      }
    })
  })
}

export const getDisGoodsCataWithCount = (data) => {
  return new Promise((resolve, reject) => {
    // 构建请求参数，只有当 hasCartonUnit 不为 null 且不为 undefined 时才添加
    var requestData = {
      disId: data.disId,
      goodsType: data.goodsType
    };
    if (data.hasCartonUnit != null && data.hasCartonUnit !== undefined) {
      requestData.hasCartonUnit = data.hasCartonUnit;
    }
    
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributerfathergoods/getDisGoodsCataWithCount' ,
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
        })
       
      }
    })
  })
}



/**
 * 批发商登陆
 * @param {*} data 
 */
export const disLogin = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributeruser/disLogin',
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
 * 批发商登陆
 * @param {*} data 
 */
export const printDisLogin = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributeruser/printDisLogin',
      method: 'POST',
      data:{
        code: data.code,
        sessionId: data.sessionId,
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

export const setShelfUser = (data) => {
  return new Promise((resolve, reject) => {
    wx.request({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelf/setShelfUser',
      method: 'POST',
      data:{
        shelfId: data.shelfId,
        userId: data.userId,
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


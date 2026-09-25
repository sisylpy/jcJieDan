import Promise from './bluebird'
import apiUrl from '../config.js'

var load = require('./load.js');

export const saveRetailDepartment = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartment/saveRetailDepartment/' + data,
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

export const changeDisBillStatus = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerbill/changeDisBillStatus'  ,
      method: 'POST',
      data: {
        status: data.status,
        billId: data.billId
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
 * 打印销售单据
 * @param {*} data 
 */
export const disGetConfirmBills = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerbill/disGetConfirmBills/' + data,
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

export const getNxDisBillDetail = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorderhistory/getNxDisBillDetail'  ,
      method: 'POST',
      data: {
        requestDisId: data.requestDisId,
        billId: data.billId
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

 export const disGetNxDistributerBillsWithStatus = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerbill/disGetNxDistributerBillsWithStatus' ,
      method: 'POST',
      data: {
        orderDisId: data.orderDisId,
        offerDisId: data.offerDisId,
        startDate: data.startDate,
        stopDate: data.stopDate,
        type: data.type,
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
 * 获取扫码图片地址（从服务器）
 * @param {Object} params 可选参数，如 { id: 'xxx' }
 * @returns {Promise<{imageUrl: string}>} 返回图片完整 URL
 */
export const getScanImageUrl = (params = {}) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'scan/getImageUrl',
      method: 'GET',
      data: params,
      success: (res) => {
        const d = res.data;
        // 兼容多种返回格式：{ code:0, data:{ imageUrl } } / { imageUrl } / { code:0, imageUrl }
        const imageUrl = d?.data?.imageUrl || d?.imageUrl;
        if (imageUrl) {
          resolve({ result: { imageUrl } });
        } else {
          reject(d || new Error('获取图片失败'));
        }
      },
      fail: (e) => reject(e)
    });
  });
};

/**
 * 服务端解析图片中的二维码（无需摄像头）
 * @param {string} imageUrl 图片地址
 * @returns {Promise<{result: string}>} 返回解析结果
 */
export const decodeQrFromImage = (imageUrl) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'scan/decodeQr',
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
      data: { imageUrl },
      success: (res) => {
        if (res.data && res.data.code === 0) {
          resolve({ result: res.data.data?.result || res.data.result });
        } else {
          reject(res.data || new Error('解析失败'));
        }
      },
      fail: (e) => reject(e)
    });
  });
};

//

export const updateWeighterWithFile = (filePathList, userName,userId  ) => { 
  return new Promise((resolve, reject) => {
     getApp().ownerUploadFile({
       url: apiUrl.apiUrl + 'nxdistributeruser/updateWeighterWithFile',//演示域名、自行配置
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
  * 用户修改信息
  * @param {*} data 
  */
export const updateWeightUser = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributeruser/updateWeightUser' ,
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

/**
 * 首衡项目：保存采购商品并入库（包含库存图片和说明）
 * @param {*} data 包含 nxDgssStockImage 和 nxDgssStockRemark 字段
 */
export const disSavePurGoodsSaveStockSunHola = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerpurchasegoods/disSavePurGoodsSaveStockSunHola',
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
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
 * 首衡项目：修改库存接口（JSON格式，不传文件）
 * @param {*} data 
 */
export const updateDisStockSunHola = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelfstock/updateDisStockSunHola',
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
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
 * 首衡项目：修改库存接口（Multipart格式，上传文件）
 * @param {Object} options - 包含 filePath（图片路径）和其他参数
 */
export const updateDisStockSunHolaWithFile = (options) => {
  return new Promise((resolve, reject) => {
    const { filePath, stockId, restWeight, sellingPrice, nxDgssStockRemark, disId, userId } = options;
    
    getApp().ownerUploadFile({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelfstock/updateDisStockSunHolaWithFile',
      filePath: filePath,
      name: 'file',
      formData: {
        stockId: String(stockId),
        restWeight: String(restWeight),
        sellingPrice: sellingPrice ? String(sellingPrice) : '',
        nxDgssStockRemark: nxDgssStockRemark || '',
        disId: disId ? String(disId) : '',
        userId: userId ? String(userId) : ''
      },
      success: (res) => {
        try {
          const data = JSON.parse(res.data);
          resolve({ result: data });
        } catch (e) {
          reject(new Error('解析响应数据失败'));
        }
      },
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({
          title: '上传失败，请检查网络',
          icon: 'none'
        });
      }
    });
  });
}

/**
 * 首衡项目：保存采购商品入库并生成溯源报告（支持上传溯源报告文件）
 * @param {Object} options - 包含采购商品参数和溯源报告参数
 * @param {String} options.filePath - 溯源报告文件路径（可选，支持图片或PDF）
 */
export const disSavePurGoodsSaveStockWithTraceReport = (options, idempotencyKey) => {
  return new Promise((resolve, reject) => {
    const { filePath, ...formData } = options;
    const idempotencyHeader = idempotencyKey
      ? { 'X-Idempotency-Key': idempotencyKey }
      : {};
    
    // 如果有文件，使用 uploadFile
    if (filePath) {
      getApp().ownerUploadFile({
        url: apiUrl.apiUrl + 'nxdistributerpurchasegoods/disSavePurGoodsSaveStockWithTraceReport',
        filePath: filePath,
        name: 'traceReportFile',
        header: idempotencyHeader,
        formData: Object.keys(formData).reduce((acc, key) => {
          acc[key] = formData[key] !== null && formData[key] !== undefined ? String(formData[key]) : '';
          return acc;
        }, {}),
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            resolve({ result: data });
          } catch (e) {
            reject(new Error('解析响应数据失败'));
          }
        },
        fail: (e) => {
          reject(e);
          load.hideLoading();
          wx.showToast({
            title: '上传失败，请检查网络',
            icon: 'none'
          });
        }
      });
    } else {
      // 没有文件，使用 request
      getApp().ownerRequest({
        url: apiUrl.apiUrl + 'nxdistributerpurchasegoods/disSavePurGoodsSaveStockWithTraceReport',
        method: 'POST',
        header: Object.assign({
          'Content-Type': 'application/json'
        }, idempotencyHeader),
        data: formData,
        success: (res) => {
          resolve({ result: res.data });
        },
        fail: (e) => {
          reject(e);
          load.hideLoading();
          wx.showToast({
            title: '请检查网络',
            icon: 'none'
          });
        }
      });
    }
  });
}

/**
 * 为分销商商品添加溯源报告
 * @param {Object} options - 包含商品ID和溯源报告参数
 * @param {String} options.filePath - 溯源报告文件路径（可选，支持图片或PDF）
 */
export const addTraceReportToGoods = (options) => {
  return new Promise((resolve, reject) => {
    const { filePath, ...formData } = options;
    
    // 如果有文件，使用 uploadFile
    if (filePath) {
      getApp().ownerUploadFile({
        url: apiUrl.apiUrl + 'nxdistributergoods/addTraceReportToGoods',
        filePath: filePath,
        name: 'traceReportFile',
        formData: Object.keys(formData).reduce((acc, key) => {
          acc[key] = formData[key] !== null && formData[key] !== undefined ? String(formData[key]) : '';
          return acc;
        }, {}),
        success: (res) => {
          try {
            const data = JSON.parse(res.data);
            resolve({ result: data });
          } catch (e) {
            reject(new Error('解析响应数据失败'));
          }
        },
        fail: (e) => {
          reject(e);
          load.hideLoading();
          wx.showToast({
            title: '上传失败，请检查网络',
            icon: 'none'
          });
        }
      });
    } else {
      // 没有文件，使用 request
      getApp().ownerRequest({
        url: apiUrl.apiUrl + 'nxdistributergoods/addTraceReportToGoods',
        method: 'POST',
        header: {
          'Content-Type': 'application/json'
        },
        data: formData,
        success: (res) => {
          resolve({ result: res.data });
        },
        fail: (e) => {
          reject(e);
          load.hideLoading();
          wx.showToast({
            title: '请检查网络',
            icon: 'none'
          });
        }
      });
    }
  });
}

//

export const disGetCollGoodsHistoryPrice = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorderhistory/disGetCollGoodsHistoryPrice',
      method: 'POST',
      data: {
        requestDisId: data.requestDisId,
        goodsId: data.goodsId,
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

export const disGetDepGoodsHistoryPrice = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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

function purchaseReceiptRequest(batchId, suffix, method, data, idempotencyKey) {
  return new Promise((resolve, reject) => {
    const header = { 'Content-Type': 'application/json;charset=utf-8' }
    if (idempotencyKey) header['X-Idempotency-Key'] = idempotencyKey
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'purchasereceipts/batches/' + batchId + (suffix || ''),
      method: method,
      data: data,
      header: header,
      success: (res) => resolve({ result: res.data }),
      fail: (e) => reject(e)
    })
  })
}

export const getPurchaseReceiptSummary = (batchId) =>
  purchaseReceiptRequest(batchId, '', 'GET')

export const confirmPurchaseReceipt = (batchId, data, idempotencyKey) =>
  purchaseReceiptRequest(batchId, '/receipts', 'POST', data, idempotencyKey)

export const stockInPurchaseReceipt = (batchId, data, idempotencyKey) =>
  purchaseReceiptRequest(batchId, '/stock-ins', 'POST', data, idempotencyKey)

export const returnPurchaseReceiptToSupplier = (batchId, data, idempotencyKey) =>
  purchaseReceiptRequest(batchId, '/supplier-returns', 'POST', data, idempotencyKey)

/**
 * 添加进货商品，修改订单状态
 * @param {*} data 
 */
export const getBrandForPrompts = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorderspart/pasteSearchGoodsForShelf',
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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

export const saveShelfGoodsStock = (data, idempotencyKey) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerpurchasegoods/saveShelfGoodsStock' ,
      method: 'POST',
      data,
      header: idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {},
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

export const saveShelfGoodsStockBatch = (data, idempotencyKey) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerpurchasegoods/saveShelfGoodsStockBatch',
      method: 'POST',
      data,
      header: idempotencyKey ? { 'X-Idempotency-Key': idempotencyKey } : {},
      success: (res) => resolve({ result: res.data }),
      fail: reject
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
    getApp().ownerRequest({
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

//

 

export const testAi = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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

export const updateGbDisAttrName = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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

 
export const saveAutoPurchase = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributergoods/saveAutoPurchase' ,
      method: 'POST',
      data:{
        ids: data.ids,
        purchaseType: data.purchaseType
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

export const saveShelfGoods = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributergoods/saveShelfGoods' ,
      method: 'POST',
      data:{
        ids: data.ids,
        shelfId: data.shelfId
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
    getApp().ownerRequest({
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
 * 批发商商品列表fatherId=22300&goodsType=99&name=酱油醋&hasCartonUnit=null&hasPerCarton=0&hasTraceReport=null
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
    if (data.hasPerCarton != null && data.hasPerCarton !== undefined) {
      requestData.hasPerCarton = data.hasPerCarton;
    }
    if (data.hasTraceReport != null && data.hasTraceReport !== undefined) {
      requestData.hasTraceReport = data.hasTraceReport;
    }
    
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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

export const getNxDisDepPdf = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorderspart/getNxDisDepPdf' ,
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
    getApp().ownerRequest({
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

export const supplierEditBatchGb = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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

// 跨服务读取精彩账本订单：小程序只访问配送服务，由配送服务再访问精彩账本服务。
export const getJczbBatchForNx = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributergoods/getJczbBatchForNx',
      method: 'GET',
      data: {
        batchId: data.batchId,
        nxDisId: data.nxDisId,
      },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e)
        load.hideLoading()
      }
    })
  })
}

export const nxDisImportJczbBatch = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributergoods/nxDisImportJczbBatch',
      method: 'POST',
      data: {
        batchId: data.batchId,
        nxDisId: data.nxDisId,
      },
      header: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
      },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e)
        load.hideLoading()
      }
    })
  })
}

export const supplierGetStars = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
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
     getApp().ownerRequest({
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
     getApp().ownerRequest({
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
     getApp().ownerRequest({
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
     getApp().ownerRequest({
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
     getApp().ownerRequest({
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
    getApp().ownerRequest({
      url: apiUrl.server + 'owner/sys/user/updatePassword',
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
    getApp().ownerRequest({
      url: apiUrl.server + 'owner/sys/user/disGetWebUser/' +data,
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
    getApp().ownerRequest({
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

export const nxDisSavePurGoodsPrice = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
     getApp().ownerUploadFile({
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

export const jjshUserSaveWithFile = (filePathList, code, marketId,disName,userName, address,phone, downloadAllGoods) => { 
  return new Promise((resolve, reject) => {
     getApp().ownerUploadFile({
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
        phone: phone,
        downloadAllGoods: downloadAllGoods ? 'true' : 'false'
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
     getApp().ownerUploadFile({
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

export const disUserSaveWithFile = (filePathList, userName, code, inviteCode, phone) => {
  return new Promise((resolve, reject) => {
     getApp().ownerUploadFile({
       url: apiUrl.apiUrl + 'nxdistributeruser/disUserSaveWithFile',//演示域名、自行配置
       filePath: filePathList[0],
       name: 'file',
       header: {
         "Content-Type": "multipart/form-data"
       },
       formData: {
        userName: userName,
        code: code,
        inviteCode: inviteCode,
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

 

export const disSaveDepGoodsName = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
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

export const createStaffInvite = (role) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributeruser/createStaffInvite/' + role,
      method: 'POST',
      success: (res) => resolve({ result: res.data }),
      fail: (e) => reject(e)
    })
  })
}

export const changeMultiDeps = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
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

export const jjshGetMarket = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartment/saveOneCustomer' ,
      method: 'POST',
      header: { 'Content-Type': 'application/json' },
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

export const updateCustomerResponsibility = (customerId, data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartment/' + customerId + '/responsibility',
      method: 'PUT',
      header: { 'Content-Type': 'application/json' },
      data: data,
      success: (res) => resolve({ result: res.data }),
      fail: reject
    })
  })
}

export const queryDisExchangeGoodsByQuickSearch = (data) => { 
  return new Promise((resolve, reject) => {
     getApp().ownerRequest({
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
     getApp().ownerRequest({
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
     getApp().ownerRequest({
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
     getApp().ownerRequest({
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
    getApp().ownerRequest({
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
     getApp().ownerUploadFile({
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
    getApp().ownerRequest({
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
     getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
     getApp().ownerRequest({
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
     getApp().ownerRequest({
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
     getApp().ownerRequest({
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
    getApp().ownerRequest({
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
 * 添加使用（出库）记录
 * @param {*} data {disId, disGoodsId, weight, userId, shelfGoodsId?} shelfGoodsId 即 nxDistributerGoodsShelfGoodsId
 */
export const addUse = (data) => {
  const postData = {
    disId: data.disId,
    disGoodsId: data.disGoodsId,
    weight: data.weight,
    userId: data.userId
  }
  if (data.shelfGoodsId != null && data.shelfGoodsId !== '') {
    postData.shelfGoodsId = data.shelfGoodsId
  }
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelfstockreduce/addUse',
      method: 'POST',
      data: postData,
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
 * @param {*} data {disId, disGoodsId, weight, userId, shelfGoodsId?} shelfGoodsId 即 nxDistributerGoodsShelfGoodsId
 */
export const addLoss = (data) => {
  const postData = {
    disId: data.disId,
    disGoodsId: data.disGoodsId,
    weight: data.weight,
    userId: data.userId
  }
  if (data.shelfGoodsId != null && data.shelfGoodsId !== '') {
    postData.shelfGoodsId = data.shelfGoodsId
  }
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelfstockreduce/addLoss',
      method: 'POST',
      data: postData,
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
 * @param {*} data {disId, disGoodsId, weight, userId, shelfGoodsId?} shelfGoodsId 即 nxDistributerGoodsShelfGoodsId
 */
export const addReturn = (data) => {
  const postData = {
    disId: data.disId,
    disGoodsId: data.disGoodsId,
    weight: data.weight,
    userId: data.userId
  }
  if (data.shelfGoodsId != null && data.shelfGoodsId !== '') {
    postData.shelfGoodsId = data.shelfGoodsId
  }
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelfstockreduce/addReturn',
      method: 'POST',
      data: postData,
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
    getApp().ownerRequest({
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

// 导出别名，用于盘库操作
/**
 * 添加废弃记录 / 盘库记录
 * @param {*} data {disId, disGoodsId, stockId, waste, operatorId, inventoryType, inventoryDate, inventoryWeek, inventoryMonth}
 * 支持两种模式：
 * - 按批次盘库：stockId + waste（推荐）
 * - 按总数盘库：disId + disGoodsId + waste（批量自动分配）
 */
export const addWaste = (data) => {
  return new Promise((resolve, reject) => {
    // 构建请求参数
    const requestData = {}

    // 按批次盘库（推荐）
    if (data.stockId) {
      requestData.stockId = parseInt(data.stockId)
    }

    // 按总数盘库需要 disGoodsId 和 disId
    if (data.disGoodsId) {
      requestData.disGoodsId = parseInt(data.disGoodsId)
    }
    if (data.disId) {
      requestData.disId = parseInt(data.disId)
    }

    // 损耗数量（使用 waste 字段）
    if (data.waste !== undefined && data.waste !== null) {
      requestData.waste = String(data.waste)
    }

    // 操作员ID（使用 operatorId）
    if (data.operatorId) {
      requestData.operatorId = parseInt(data.operatorId)
    }
    
    // 盘库周期参数（如果存在）
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
    
    console.log('=== addWaste 请求参数 ===')
    console.log(requestData)
    
    getApp().ownerRequest({
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
    
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/disSaveLinshiToAlias',
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

export const saveBusiness = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributernxdistributer/saveBusiness' ,
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
 * 获取临时商品列表（支持 status 参数）
 * @param {number} disId 配送商 ID
 * @param {number} status 0=未处理，1=推荐，2=申请添加；不传默认 0
 */
export const getDisLinshiGoods = (disId, status) => {
  let url = apiUrl.apiUrl + 'nxdistributergoods/getDisLinshiGoods/' + disId
  if (status !== undefined && status !== null) {
    url += '?status=' + status
  }
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
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

/**
 * 申请添加新商品（推荐都不对时）
 * @param {number} lsGoodsId 临时商品 ID
 */
export const applyAddNewGoods = (lsGoodsId) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributergoodslinshi/applyAddNewGoods',
      method: 'POST',
      data: { lsGoodsId },
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

export const disGetBuyTypeMarket = (data) => { 
  return new Promise((resolve, reject) => {
     getApp().ownerRequest({
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
     getApp().ownerRequest({
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
     getApp().ownerUploadFile({
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
     getApp().ownerUploadFile({
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
    getApp().ownerRequest({
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

export const updateSalesDefaultClerk = (salesUserId, clerkUserId) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributeruser/' + salesUserId + '/defaultClerk',
      method: 'PUT',
      data: { clerkUserId: clerkUserId },
      success: (res) => resolve({ result: res.data }),
      fail: reject
    })
  })
}

/**
 * 删除管理员
 * @param {} data 
 */
export const deleteJrdhUser = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
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
export const deleteWeightUser = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributeruser/deleteWeightUser/' + data,
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
    getApp().ownerRequest({
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
     getApp().ownerRequest({
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
    getApp().ownerRequest({
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
     getApp().ownerUploadFile({
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

//

/**
 * 获取客户配送商品
 * @param {} data
 */
/**
 * 获取客户配送商品
 * @param {} data
 */
export const disGetDepGoods = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
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
 * 老板端客户商品画像轻量列表。
 * 只返回列表展示所需字段，避免完整商品、客户和订单实体树进入小程序。
 */
export const disGetDepGoodsProfile = (depFatherId) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentdisgoods/disGetDepGoodsProfile/' + depFatherId,
      method: 'GET',

      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e)
        load.hideLoading()
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}

/**
 * 老板端单客户订货异常报告。
 * Server按部门商品关系计算，前端只展示，不在本地推断异常或原因。
 */
export const disGetDepOrderAnomalies = (depFatherId) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentdisgoods/disGetDepOrderAnomalies/' + depFatherId,
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
 * 老板小程序销售分析。配送商范围由 Owner Token 决定，客户端不传 disId。
 */
const ownerSalesAnalysisGet = (path, data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'sales-analysis/' + path,
      method: 'GET',
      data: data || {},
      success: (res) => resolve({ result: res.data }),
      fail: (e) => reject(e)
    })
  })
}

export const getSalesAnalysisOverview = (range) => {
  return ownerSalesAnalysisGet('overview', range)
}

export const getSalesAnalysisCategory = (categoryId, range) => {
  return ownerSalesAnalysisGet(
    'categories/' + encodeURIComponent(categoryId),
    range
  )
}

export const getSalesAnalysisProductCustomers = (goodsId, range, limit = 200) => {
  return ownerSalesAnalysisGet(
    'products/' + encodeURIComponent(goodsId) + '/customers',
    Object.assign({}, range || {}, { limit })
  )
}

/**
 * 老板小程序智能备货。
 * 预测、库存事实与采购写入使用三个独立接口；客户端不提交采购来源、业务事件或货架号。
 */
const ownerSmartReplenishmentRequest = (path, method, data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'purchase-prediction-lab/' + path,
      method: method,
      data: data || {},
      header: method === 'GET' ? {} : { 'Content-Type': 'application/json' },
      success: (res) => resolve({ result: res.data }),
      fail: (e) => reject(e)
    })
  })
}

export const getSmartReplenishmentCatalog = (distributerId) => {
  return ownerSmartReplenishmentRequest('catalog', 'GET', { distributerId })
}

export const forecastSmartReplenishment = (data) => {
  return ownerSmartReplenishmentRequest('forecasts', 'POST', data)
}

export const getSmartReplenishmentContexts = (data) => {
  return ownerSmartReplenishmentRequest('procurement-contexts', 'POST', data)
}

export const createSmartReplenishmentProcurement = (data) => {
  return ownerSmartReplenishmentRequest('procurement-items', 'POST', data)
}

export const updateSmartReplenishmentProcurement = (purchaseGoodsId, data) => {
  return ownerSmartReplenishmentRequest(
    'procurement-items/' + encodeURIComponent(purchaseGoodsId) + '/quantity',
    'POST',
    data
  )
}

export const deleteSmartReplenishmentProcurement = (purchaseGoodsId, data) => {
  return ownerSmartReplenishmentRequest(
    'procurement-items/' + encodeURIComponent(purchaseGoodsId) + '/delete',
    'POST',
    data
  )
}

export const getSmartReplenishmentGoodsDetail = (distributerId, goodsId) => {
  return ownerSmartReplenishmentRequest(
    'goods/' + encodeURIComponent(goodsId),
    'GET',
    { distributerId }
  )
}

/**
 * 老板端当前配送商全部客户订货异常汇总。
 * 配送商范围由Owner Token在Server端确定，客户端不传disId。
 */
export const disGetAllCustomerOrderAnomalies = () => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentdisgoods/disGetAllCustomerOrderAnomalies',
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
 * 获取群用户列表
 * @param {*} data 
 */
export const getDepUsersByFatherId = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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

/**
 * 打印设置 - 保存现金客户小票打印机（飞鹅网络打印机）SN
 * 后端会同步更新该配送商下所有现金结算客户的部门记录
 * @param {*} data { sn: '飞鹅打印机SN' }
 */
export const saveCashFeiePrinterSn = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartment/saveCashFeiePrinterSn',
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

export const updateCustomerImage = (filePath, departmentId) => {
  return new Promise((resolve, reject) => {
    getApp().ownerUploadFile({
      url: apiUrl.apiUrl + 'nxdepartment/updateCustomerImage',
      filePath,
      name: 'file',
      formData: { departmentId },
      success: (res) => {
        let result = res.data
        try {
          result = typeof result === 'string' ? JSON.parse(result) : result
        } catch (e) {
          reject(new Error('客户图片返回数据无效'))
          return
        }
        resolve({ result })
      },
      fail: reject
    })
  })
}

export const deleteDepGoods = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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

// Boss 客户业务成长页：只读取客户、账单、优惠券和业务轨迹汇总。
// 常购商品不在首屏接口中加载，进入商品页后再按需查询。
export const getCustomerGrowth = (departmentId) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartment/customers/' + departmentId + '/growth',
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

// Boss 端可见的客户业态字典（系统预置 + 当前配送商自定义）。
export const getDepartmentBusinessTypes = () => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartment/business-types',
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: reject
    })
  })
}

// 查询客户根部门上的业态；传入子部门时由后台返回继承结果。
export const getCustomerBusinessTypes = (departmentId) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartment/customers/' + departmentId + '/business-types',
      method: 'GET',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: reject
    })
  })
}

// 只修改客户业态关系，不修改 nxDepartmentType 或客户其它资料。
export const updateCustomerBusinessType = (departmentId, primaryBusinessTypeId, businessTypeIds) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartment/customers/' + departmentId + '/business-types',
      method: 'PUT',
      data: {
        primaryBusinessTypeId,
        businessTypeIds: businessTypeIds || [primaryBusinessTypeId]
      },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: reject
    })
  })
}

export const saveOneCustomerDesk = (data) => { 
  return new Promise((resolve, reject) => {
     getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
export const queryDisShelfGoods = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerDownloadFile({
      url: `${apiUrl.apiUrl}nxdepartmentorderspart/downloadShelfGoodsTemplate?shelfId=${shelfId}`,
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

/**
 * 解析 Content-Disposition 或 X-File-Name 获取文件名
 */
function parseFileNameFromHeaders(header) {
  if (!header || typeof header !== 'object') return null;
  const cd = header['Content-Disposition'] || header['content-disposition'];
  if (cd) {
    const m = cd.match(/filename\*?=(?:UTF-8'')?["']?([^"';]+)["']?/i) || cd.match(/filename=["']?([^"';]+)["']?/i);
    if (m) return decodeURIComponent(m[1].trim());
  }
  const xfn = header['X-File-Name'] || header['x-file-name'];
  if (xfn) return decodeURIComponent(xfn.trim());
  return null;
}

/**
 * 下载账单Excel（需后端实现 download/downloadBillExcelNx 接口）
 * 后端需在响应头中返回文件名：Content-Disposition: attachment; filename="xxx.xlsx" 或 X-File-Name: xxx.xlsx
 * @param {string} billId - 账单ID (nxDepartmentBillId)
 * @returns {Promise<{arrayBuffer: ArrayBuffer, fileName: string}>}
 */
export const downloadBillExcel = (billId) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: `${apiUrl.apiUrl}download/downloadBillExcelNx?billId=${billId}`,
      method: 'GET',
      responseType: 'arraybuffer',
      success: (res) => {
        if (res.statusCode === 200) {
          const fileName = parseFileNameFromHeaders(res.header) || `账单_${billId}.xlsx`;
          resolve({ arrayBuffer: res.data, fileName });
        } else {
          const error = new Error(res.statusCode === 404 ? '接口未实现，请联系后端开发' : '下载失败');
          error.statusCode = res.statusCode;
          reject(error);
        }
      },
      fail: (err) => reject(err)
    });
  });
};

// 下载货架库存模板
export const downloadShelfStockTemplate = (shelfId) => {
  return new Promise((resolve, reject) => {
    getApp().ownerDownloadFile({
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
    getApp().ownerUploadFile({
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
    getApp().ownerUploadFile({
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

//

/**
 * 添加进货商品，修改订单状态
 * @param {*} data 
 */
export const disSavePurGoodsSaveStock = (data, idempotencyKey) => {
  return new Promise((resolve, reject) => {
    const header = { 'Content-Type': 'application/json' }
    if (idempotencyKey) header['X-Idempotency-Key'] = idempotencyKey
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerpurchasegoods/disSavePurGoodsSaveStock',
      method: 'POST',
      data,
      header,
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
    getApp().ownerRequest({
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

/**
 * 分页查询货架商品
 * @param {*} data
 * @param {number} [data.shelfGoodsQuerySort] 列表排序（默认 0，与后端约定）：
 *   0 默认（层内/架上原顺序）
 *   1 库存金额 高→低
 *   2 库存金额 低→高
 *   3 库存到期时间 高→低（晚到期在前，具体以后端为准）
 *   4 库存到期时间 低→高（早到期在前）
 */
export const getShelfGoods = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelf/getShelfGoods' ,
      method: 'POST',
      data: {
        shelfId: data.shelfId,
        page: data.page,
        limit: data.limit,
        shelfGoodsType: data.shelfGoodsType,
        shelfGoodsQuerySort: data.shelfGoodsQuerySort != null && data.shelfGoodsQuerySort !== ''
          ? Number(data.shelfGoodsQuerySort)
          : 0
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
 * 新库存页：一级商品分类及当前分类的有效库存商品。
 * 与旧的按日期库存统计接口相互独立。
 */
export const getStockCategoryGoodsPage = (data) => {
  return new Promise((resolve, reject) => {
    const requestData = {
      disId: data.disId,
      page: data.page,
      limit: data.limit
    }
    // 首次加载没有选中分类。不要把 null 序列化成字符串 "null"，
    // 否则 Spring 无法将其绑定到 Integer 参数并在进入 Controller 前返回 400。
    if (data.categoryId !== null && data.categoryId !== undefined && data.categoryId !== '') {
      requestData.categoryId = data.categoryId
    }

    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelfstock/getStockCategoryGoodsPage',
      method: 'POST',
      data: requestData,
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e)
        load.hideLoading()
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}

/** 当前库存按货架分页；shelfId=-1 表示无货架库存。 */
export const getStockShelfGoodsPage = (data) => {
  return new Promise((resolve, reject) => {
    const requestData = {
      disId: data.disId,
      page: data.page,
      limit: data.limit
    }
    if (data.shelfId !== null && data.shelfId !== undefined && data.shelfId !== '') {
      requestData.shelfId = data.shelfId
    }

    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelfstock/getStockShelfGoodsPage',
      method: 'POST',
      data: requestData,
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e)
        load.hideLoading()
        wx.showToast({
          title: '请检查网络',
          icon: 'none'
        })
      }
    })
  })
}

/** 仅查询货架有效层号列表（1、2、3…），不含商品明细 */
export const getShelfLayerlist = (shelfId) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelfgoods/getShelfLayerlist/' + shelfId,
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

/** 按货架 + 有效层级查询该层商品（顺序与架上 sort 一致） */
export const getShelfGoodsByLayer = (shelfId, layer) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelfgoods/getShelfGoodsByLayer',
      method: 'POST',
      data: {
        shelfId: shelfId,
        layer: layer
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
 * 查询带有溯源报告的货架商品列表
 * 只返回那些库存批次中至少有一个批次带有溯源报告的货架商品
 * @param {Number} shelfId 货架ID
 * @param {Number} page 页码，默认1
 * @param {Number} limit 每页数量，默认15
 */
export const getShelfGoodsWithTraceReport = (shelfId, page = 1, limit = 15) => {
  return new Promise((resolve, reject) => {
    let url = apiUrl.apiUrl + 'nxdistributergoodsshelf/getShelfGoodsWithTraceReport/' + shelfId;
    // 添加查询参数
    const params = [];
    if (page) params.push('page=' + page);
    if (limit) params.push('limit=' + limit);
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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

export const disGetShelfListByType = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributergoodsshelf/disGetShelfListByType',
      method: 'POST',
      data: {
        disId: data.disId,
        shelfGoodsType: data.shelfGoodsType
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

export const saveNewShelf = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
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

export const deleteNxDisSuppler = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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

//

export const unblockPartner = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributernxdistributer/unblockPartner',
      method: 'POST',
      data:{
        blockerDisId: data.blockerDisId,
        blockedDisId: data.blockedDisId,
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

export const blockPartner = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributernxdistributer/blockPartner',
      method: 'POST',
      data:{
        blockerDisId: data.blockerDisId,
        blockedDisId: data.blockedDisId,
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

/** 解除协作关系 */
export const removePartner = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributernxdistributer/removePartner',
      method: 'POST',
      data: {
        myDisId: data.myDisId,
        partnerDisId: data.partnerDisId,
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: (res) => resolve({ result: res.data }),
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({ title: '请检查网络', icon: 'none' });
      }
    })
  })
}

/** 不给他看我的商品 */
export const setHideMyCatalogFromPartner = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributernxdistributer/setHideMyCatalogFromPartner',
      method: 'POST',
      data: {
        myDisId: data.myDisId,
        partnerDisId: data.partnerDisId,
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: (res) => resolve({ result: res.data }),
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({ title: '请检查网络', icon: 'none' });
      }
    })
  })
}

/** 取消「不给他看我的商品」 */
export const unsetHideMyCatalogFromPartner = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributernxdistributer/unsetHideMyCatalogFromPartner',
      method: 'POST',
      data: {
        myDisId: data.myDisId,
        partnerDisId: data.partnerDisId,
      },
      header: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8"
      },
      success: (res) => resolve({ result: res.data }),
      fail: (e) => {
        reject(e);
        load.hideLoading();
        wx.showToast({ title: '请检查网络', icon: 'none' });
      }
    })
  })
}

export const nxDisGetAllOfferNxDis = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributernxdistributer/nxDisGetAllOfferNxDis',
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
    getApp().ownerRequest({
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

export const updateDeliverySettings = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartment/updateDeliverySettings',
      method: 'POST',
      data,
      success: (res) => {
        resolve({
          result: res.data || {},
          statusCode: res.statusCode
        })
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

export const getDisUserInfo = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
// 配送商商品的 decimal 字段：空串写入 MySQL 会报 Incorrect decimal value，
// 提交前统一将空串/undefined 转为 null（覆盖"加载即空串、原样回传"的情况）。
var NXDG_DECIMAL_FIELDS = [
  'nxDgGoodsStandardWeight',
  'nxDgBuyingPriceOne', 'nxDgBuyingPriceTwo',
  'nxDgWillPriceOne', 'nxDgWillPriceTwo', 
  'nxDgWillPriceOneWeight', 'nxDgWillPriceTwoWeight',
  'nxDgOutTotalWeight', 'nxDgQuantityDays', 'nxDgItemsPerCarton',
  'nxDgGrossWeightJin', 'nxDgNetWeightJin', 
  'nxDgOuterGrossWeightJin', 'nxDgOuterNetWeightJin', 
  'nxDgGoodsHighestPrice', 'nxDgGoodsLowestPrice',
];

export const disGoodsUpdate = (data) => {
  var payload = Object.assign({}, data);
  NXDG_DECIMAL_FIELDS.forEach(function (k) {
    if (payload[k] === '' || payload[k] === undefined) {
      payload[k] = null;
    }
  });
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributergoods/disGoodsUpdate',
      method: 'POST',
      data: payload,
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
export const queryNxGoodsByQuickSearch = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributergoods/queryNxGoodsByQuickSearch' ,
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

//

/**
 * 搜索批发商商品
 */
export const queryDisGoodsByQuickSearchCollDis = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributergoods/queryDisGoodsByQuickSearchCollDis' ,
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
export const queryDisGoodsByQuickSearchWithDepIdCollDis = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributergoods/queryDisGoodsByQuickSearchWithDepIdCollDis' ,
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
 * @param {string|number} disId - 配送商ID
 * @param {string|number} labelId - 可选，标签ID用于筛选
 * @param {string|number} responsibleUserId - 可选，按负责业务员或录单员筛选
 */
export const disGetAllCustomer = (disId, labelId, responsibleUserId) => {
  return new Promise((resolve, reject) => {
    let url = apiUrl.apiUrl + 'nxdepartment/disGetAllCustomer/' + disId;
    const query = [];
    if (labelId !== undefined && labelId !== null && labelId !== '') {
      query.push('labelId=' + encodeURIComponent(labelId));
    }
    if (responsibleUserId !== undefined && responsibleUserId !== null && responsibleUserId !== '') {
      query.push('responsibleUserId=' + encodeURIComponent(responsibleUserId));
    }
    if (query.length > 0) {
      url += '?' + query.join('&');
    }
    getApp().ownerRequest({
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

/**
 * 跟新批发商别名
 */
export const disDeleteAlias = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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
  var payload = Object.assign({}, data);
  NXDG_DECIMAL_FIELDS.forEach(function (k) {
    if (payload[k] === '' || payload[k] === undefined) {
      payload[k] = null;
    }
  });
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentorders/disUpdateBuyingPrice',
      method: 'POST',
      data: payload,
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
    getApp().ownerRequest({
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
    console.log("🔍 API getDisGoodsByGreatGrandIdWithCount - 接收到的 data:", data);
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
      console.log("🔍 API getDisGoodsByGreatGrandIdWithCount - 添加 hasCartonUnit:", data.hasCartonUnit);
    }
    if (data.hasPerCarton != null && data.hasPerCarton !== undefined) {
      requestData.hasPerCarton = data.hasPerCarton;
      console.log("🔍 API getDisGoodsByGreatGrandIdWithCount - 添加 hasPerCarton:", data.hasPerCarton);
    }
    if (data.hasTraceReport != null && data.hasTraceReport !== undefined) {
      requestData.hasTraceReport = data.hasTraceReport;
      console.log("🔍 API getDisGoodsByGreatGrandIdWithCount - 添加 hasTraceReport:", data.hasTraceReport);
    }
    console.log("🔍 API getDisGoodsByGreatGrandIdWithCount - 最终 requestData:", requestData);
    
    getApp().ownerRequest({
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
    console.log("🔍 API getDisGoodsCataWithCount - 接收到的 data:", data);
    // 构建请求参数，只有当 hasCartonUnit 不为 null 且不为 undefined 时才添加
    var requestData = {
      disId: data.disId,
      goodsType: data.goodsType
    };
    if (data.hasCartonUnit != null && data.hasCartonUnit !== undefined) {
      requestData.hasCartonUnit = data.hasCartonUnit;
      console.log("🔍 API - 添加 hasCartonUnit:", data.hasCartonUnit);
    }
    if (data.hasPerCarton != null && data.hasPerCarton !== undefined) {
      requestData.hasPerCarton = data.hasPerCarton;
      console.log("🔍 API - 添加 hasPerCarton:", data.hasPerCarton);
    }
    if (data.hasTraceReport != null && data.hasTraceReport !== undefined) {
      requestData.hasTraceReport = data.hasTraceReport;
      console.log("🔍 API - 添加 hasTraceReport:", data.hasTraceReport);
    }
    console.log("🔍 API getDisGoodsCataWithCount - 最终 requestData:", requestData);
    
    getApp().ownerRequest({
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

export const disLogin = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributeruser/disLogin',
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
 * 批发商登陆
 * @param {*} data 
 */
export const printDisLogin = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
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
    getApp().ownerRequest({
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

/**
 * 验证并消费邀请码
 * @param {String} inviteCode 邀请码
 * @return Promise
 */
export const getInviteCode = (inviteCode) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributer/getInviteCode',
      method: 'POST',
      data: {
        inviteCode: inviteCode
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
// ============ 配送商标签管理 API ============

/**
 * 获取标签列表和已选标签（编辑客户标签时获取数据）
 * @param {object} params - {disId, depId}
 */
export const disGetLabelData = (params) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentlabel/disGetLabelData',
      method: 'GET',
      data: params,
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
 * 同步客户标签（对比同步客户标签）
 * @param {object} data - {depId, disId, labelIds}
 */
export const disSyncDepartmentLabels = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentlabel/disSyncDepartmentLabels',
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

/**
 * 删除部门标签关系（只解绑，不删标签定义）
 * @param {number} depId - 部门ID
 * @param {number} labelId - 标签ID
 */
export const deleteDepartmentLabel = (depId, labelId) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentlabel/delete',
      method: 'POST',
      data: { depId, labelId },
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
 * 配送商获取自己的标签列表
 * @param {number} disId - 配送商ID
 */
export const disGetLabels = (disId) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerlabel/disGetLabels/' + disId,
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
 * 配送商新增标签
 * @param {object} data - {nxDlDistributerId, nxDlName, nxDlSort, nxDlStatus}
 */
export const saveLabel = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerlabel/save',
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

/**
 * 配送商修改标签
 * @param {object} data - {nxDistributerLabelId, nxDlName, nxDlSort, nxDlStatus}
 */
export const updateLabel = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerlabel/update',
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

/**
 * 配送商删除标签
 * @param {number} labelId - 标签ID
 */
export const deleteLabel = (labelId) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerlabel/delete/' + labelId,
      method: 'POST',
      success: (res) => {
        resolve({ result: res.data })
      },
      fail: (e) => {
        reject(e)
      }
    })
  })
}

// ============ 配送商配送策略（运费规则）API ============
// 注意：后端 NxDistributerDeliveryFeeRuleController 尚未实现，以下为前端预置接口，待后端补全
export const saveDeliveryFeeRule = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerdeliveryfeerule/save',
      method: 'POST',
      data,
      success: (res) => { resolve({ result: res.data }) },
      fail: (e) => { reject(e); load.hideLoading(); wx.showToast({ title: '请检查网络', icon: 'none' }) }
    })
  })
}

export const updateDeliveryFeeRule = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerdeliveryfeerule/update',
      method: 'POST',
      data,
      success: (res) => { resolve({ result: res.data }) },
      fail: (e) => { reject(e); load.hideLoading(); wx.showToast({ title: '请检查网络', icon: 'none' }) }
    })
  })
}

export const getDeliveryFeeRuleList = (distributerId) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerdeliveryfeerule/listByDistributer/' + distributerId,
      method: 'GET',
      success: (res) => { resolve({ result: res.data }) },
      fail: (e) => { reject(e); load.hideLoading(); wx.showToast({ title: '请检查网络', icon: 'none' }) }
    })
  })
}

export const deleteDeliveryFeeRule = (id) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributerdeliveryfeerule/delete/' + id,
      method: 'GET',
      success: (res) => { resolve({ result: res.data }) },
      fail: (e) => { reject(e); load.hideLoading(); wx.showToast({ title: '请检查网络', icon: 'none' }) }
    })
  })
}

// ============ 配送商优惠券 API ============
// 注意：后端 NxDistributerCouponController 目前为空 stub，以下为前端预置接口，待后端补全
export const saveDistributerCoupon = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributercoupon/save',
      method: 'POST',
      data,
      success: (res) => { resolve({ result: res.data }) },
      fail: (e) => { reject(e); load.hideLoading(); wx.showToast({ title: '请检查网络', icon: 'none' }) }
    })
  })
}

export const updateDistributerCoupon = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributercoupon/update',
      method: 'POST',
      data,
      success: (res) => { resolve({ result: res.data }) },
      fail: (e) => { reject(e); load.hideLoading(); wx.showToast({ title: '请检查网络', icon: 'none' }) }
    })
  })
}

export const getDistributerCouponList = (distributerId) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributercoupon/listByDistributer/' + distributerId,
      method: 'GET',
      success: (res) => { resolve({ result: res.data }) },
      fail: (e) => { reject(e); load.hideLoading(); wx.showToast({ title: '请检查网络', icon: 'none' }) }
    })
  })
}

export const deleteDistributerCoupon = (id) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributercoupon/delete/' + id,
      method: 'GET',
      success: (res) => { resolve({ result: res.data }) },
      fail: (e) => { reject(e); load.hideLoading(); wx.showToast({ title: '请检查网络', icon: 'none' }) }
    })
  })
}

export const updateDistributerCouponStatus = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributercoupon/updateStatus',
      method: 'POST',
      data,
      success: (res) => { resolve({ result: res.data }) },
      fail: (e) => { reject(e); load.hideLoading(); wx.showToast({ title: '请检查网络', icon: 'none' }) }
    })
  })
}

// ============ 售后补偿券独立管理 API ============
const compensationCouponRequest = (path, method, data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributercompensationcoupon/' + path,
      method: method || 'GET',
      data: data || {},
      header: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      success: (res) => resolve({ result: res.data }),
      fail: reject
    })
  })
}

export const getDistributerCompensationCouponList = (distributerId, operatorUserId, status) => {
  var data = { operatorUserId: operatorUserId }
  if (status !== undefined && status !== null) data.status = status
  return compensationCouponRequest('list/' + distributerId, 'GET', data)
}

export const saveDistributerCompensationCoupon = (data) => compensationCouponRequest('save', 'POST', data)
export const updateDistributerCompensationCoupon = (data) => compensationCouponRequest('update', 'POST', data)
export const updateDistributerCompensationCouponStatus = (data) => compensationCouponRequest('status', 'POST', data)

// ============ 精彩接单 V2 售后闭环 API ============
const afterSalesRequest = (path, method, data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentaftersales/' + path,
      method: method || 'GET',
      data: data || {},
      header: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      success: (res) => resolve({ result: res.data }),
      fail: reject
    })
  })
}

export const getAfterSalesDictionaries = () => afterSalesRequest('dictionaries', 'GET')
export const getAfterSalesStatistics = (data) => afterSalesRequest('statistics', 'GET', data)
export const getAfterSalesOverview = (data) => afterSalesRequest('overview', 'GET', data)
export const getAfterSalesList = (data) => afterSalesRequest('list', 'GET', data)
export const createDepartmentAfterSales = (data) => afterSalesRequest('create', 'POST', data)
export const getDepartmentAfterSalesDetail = (afterSalesId, data) => afterSalesRequest('detail/' + afterSalesId, 'GET', data)
export const addDepartmentAfterSalesAction = (afterSalesId, data) => afterSalesRequest('action/' + afterSalesId, 'POST', data)
export const createAfterSalesFinancialAdjustment = (afterSalesId, data) => afterSalesRequest('financial-adjustment/' + afterSalesId, 'POST', data)
export const createAfterSalesReplenishment = (afterSalesId, data) => afterSalesRequest('replenishment/' + afterSalesId, 'POST', data)
export const deliverAfterSalesReplenishment = (replenishmentId, data) => afterSalesRequest('replenishment/' + replenishmentId + '/delivered', 'POST', data)
export const finishAfterSalesReplenishment = (replenishmentId, data) => afterSalesRequest('replenishment/' + replenishmentId + '/outcome', 'POST', data)
export const confirmDepartmentAfterSales = (afterSalesId, data) => afterSalesRequest('confirm/' + afterSalesId, 'POST', data)
export const completeDepartmentAfterSales = (afterSalesId, data) => afterSalesRequest('complete/' + afterSalesId, 'POST', data)
export const writebackAfterSalesStandard = (afterSalesId, data) => afterSalesRequest('standardWriteback/' + afterSalesId, 'POST', data)
export const getAfterSalesCompensationCoupons = (data) => afterSalesRequest('compensationCoupons', 'GET', data)
export const grantAfterSalesCompensation = (afterSalesId, data) => afterSalesRequest('compensation/' + afterSalesId, 'POST', data)

// ============ 客户退货闭环 API ============
const salesReturnRequest = (path, method, data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentsalesreturn/' + path,
      method: method || 'GET', data: data || {},
      header: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      success: (res) => resolve({ result: res.data }), fail: reject
    })
  })
}
export const createSalesReturnWithAfterSales = (data) => salesReturnRequest('create-with-after-sales', 'POST', data)
export const getSalesReturnList = (data) => salesReturnRequest('list', 'GET', data)
export const getSalesReturnDetail = (returnId, data) => salesReturnRequest('detail/' + returnId, 'GET', data)
export const approveSalesReturn = (returnId, data) => salesReturnRequest(returnId + '/approve', 'POST', data)
export const rejectSalesReturn = (returnId, data) => salesReturnRequest(returnId + '/reject', 'POST', data)
export const receiveSalesReturn = (returnId, data) => salesReturnRequest(returnId + '/receive', 'POST', data)

export const uploadDepartmentAfterSalesImage = (options) => {
  return new Promise((resolve, reject) => {
    const formData = {
      distributerId: String(options.distributerId),
      operatorUserId: String(options.operatorUserId),
      stage: options.stage
    }
    if (options.afterSalesItemId) formData.afterSalesItemId = String(options.afterSalesItemId)
    if (options.replenishmentId) formData.replenishmentId = String(options.replenishmentId)
    if (options.actionId) formData.actionId = String(options.actionId)
    if (options.description) formData.description = options.description
    const task = getApp().ownerUploadFile({
      url: apiUrl.apiUrl + 'nxdepartmentaftersales/uploadImages/' + options.afterSalesId,
      filePath: options.filePath,
      name: 'files',
      formData: formData,
      success: (res) => {
        try { resolve({ result: JSON.parse(res.data) }) }
        catch (e) { reject(new Error('图片上传结果解析失败')) }
      },
      fail: reject
    })
    if (task && task.onProgressUpdate && options.onProgress) task.onProgressUpdate(options.onProgress)
  })
}

const announcementRequest = (path, method, data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'distributerannouncements/' + path,
      method: method || 'GET',
      data: data || {},
      header: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
      success: (res) => resolve({ result: res.data }),
      fail: reject
    })
  })
}

export const getAfterSalesAnnouncement = (afterSalesId) => announcementRequest('after-sales/' + afterSalesId, 'GET')
export const publishAfterSalesAnnouncement = (afterSalesId, data) => announcementRequest('after-sales/' + afterSalesId, 'POST', data)
export const withdrawAfterSalesAnnouncement = (afterSalesId) => announcementRequest('after-sales/' + afterSalesId + '/withdraw', 'POST')
export const getVisibleDistributerAnnouncements = () => announcementRequest('visible', 'GET')
// ===== 配送商商品阶梯价 =====
export const disGetGoodsTierPriceList = (distributerGoodsId) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributergoodstierprice/listByGoods/' + distributerGoodsId,
      method: 'GET',
      success: (res) => { resolve({ result: res.data }) },
      fail: (e) => { reject(e); load.hideLoading(); wx.showToast({ title: '请检查网络', icon: 'none' }) }
    })
  })
}

export const disSaveGoodsTierPrices = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributergoodstierprice/saveTierPrices',
      method: 'POST',
      data,
      success: (res) => { resolve({ result: res.data }) },
      fail: (e) => { reject(e); load.hideLoading(); wx.showToast({ title: '请检查网络', icon: 'none' }) }
    })
  })
}

export const disDeleteGoodsTierPrice = (tierPriceId) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributergoodstierprice/deleteTier/' + tierPriceId,
      method: 'GET',
      success: (res) => { resolve({ result: res.data }) },
      fail: (e) => { reject(e); load.hideLoading(); wx.showToast({ title: '请检查网络', icon: 'none' }) }
    })
  })
}

export const disUpdateGoodsTierPriceStatus = (data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdistributergoodstierprice/updateStatus',
      method: 'POST',
      data,
      success: (res) => { resolve({ result: res.data }) },
      fail: (e) => { reject(e); load.hideLoading(); wx.showToast({ title: '请检查网络', icon: 'none' }) }
    })
  })
}

// ===== 客户商品标准 =====
export const getDepartmentGoodsStandardDimensions = () => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentdisgoodsstandard/dimensions',
      method: 'GET',
      success: (res) => { resolve({ result: res.data }) },
      fail: (e) => { reject(e) }
    })
  })
}

export const getDepartmentGoodsCurrentStandard = (departmentDisGoodsId, data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentdisgoodsstandard/current/' + departmentDisGoodsId,
      method: 'GET',
      data: {
        distributerId: data.distributerId,
        operatorUserId: data.operatorUserId
      },
      success: (res) => { resolve({ result: res.data }) },
      fail: (e) => { reject(e) }
    })
  })
}

export const updateDepartmentGoodsRelation = (departmentDisGoodsId, data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentdisgoodsstandard/relation/' + departmentDisGoodsId,
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data,
      success: (res) => { resolve({ result: res.data }) },
      fail: (e) => { reject(e) }
    })
  })
}

export const saveDepartmentGoodsStandard = (departmentDisGoodsId, data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentdisgoodsstandard/save/' + departmentDisGoodsId,
      method: 'POST',
      header: {
        'Content-Type': 'application/json'
      },
      data,
      success: (res) => { resolve({ result: res.data }) },
      fail: (e) => { reject(e) }
    })
  })
}

export const getDepartmentGoodsStandardHistory = (departmentDisGoodsId, data) => {
  return new Promise((resolve, reject) => {
    getApp().ownerRequest({
      url: apiUrl.apiUrl + 'nxdepartmentdisgoodsstandard/history/' + departmentDisGoodsId,
      method: 'GET',
      data: {
        distributerId: data.distributerId,
        operatorUserId: data.operatorUserId
      },
      success: (res) => { resolve({ result: res.data }) },
      fail: (e) => { reject(e) }
    })
  })
}

export const uploadDepartmentGoodsStandardImage = (options) => {
  return new Promise((resolve, reject) => {
    const uploadTask = getApp().ownerUploadFile({
      url: apiUrl.apiUrl + 'nxdepartmentdisgoodsstandard/uploadImages/' + options.departmentDisGoodsId,
      filePath: options.filePath,
      name: 'files',
      formData: {
        distributerId: String(options.distributerId),
        operatorUserId: String(options.operatorUserId)
      },
      success: (res) => {
        try {
          resolve({ result: JSON.parse(res.data) })
        } catch (e) {
          reject(new Error('图片上传结果解析失败'))
        }
      },
      fail: (e) => { reject(e) }
    })

    if (uploadTask && uploadTask.onProgressUpdate && options.onProgress) {
      uploadTask.onProgressUpdate(options.onProgress)
    }
  })
}

function inventoryBatchRequest(path, method, data, idempotencyKey) {
  return new Promise((resolve, reject) => {
    const header = { 'Content-Type': 'application/json' }
    if (idempotencyKey) header['X-Idempotency-Key'] = idempotencyKey
    getApp().ownerRequest({
      url: apiUrl.apiUrl + path,
      method: method || 'GET',
      data: data,
      header: header,
      success: res => resolve({ result: res.data }),
      fail: reject
    })
  })
}

export const getInventoryBatchBusiness = stockBatchId =>
  inventoryBatchRequest('inventory-batches/' + stockBatchId, 'GET')

export const addInventoryBatchLossFact = (stockBatchId, data, key) =>
  inventoryBatchRequest('inventory-batches/' + stockBatchId + '/loss-facts', 'POST', data, key)

export const reverseInventoryBatchLossFact = (stockBatchId, factId, data, key) =>
  inventoryBatchRequest('inventory-batches/' + stockBatchId + '/loss-facts/' + factId + '/reversals', 'POST', data, key)

export const changeInventoryBatchPrice = (stockBatchId, data, key) =>
  inventoryBatchRequest('inventory-batches/' + stockBatchId + '/price-versions', 'POST', data, key)

export const getInventoryPurchasePerformance = data =>
  inventoryBatchRequest('inventory-performance', 'GET', data)

function purchaseManagementRequest(path, data) {
  return inventoryBatchRequest('purchase-management/' + path, 'GET', data || {})
}

export const getPurchaseManagementOverview = data => purchaseManagementRequest('overview', data)
export const getPurchaseManagementPurchaseAmountRecords = data => purchaseManagementRequest('purchase-amount-records', data)
export const getPurchaseManagementPurchasers = data => purchaseManagementRequest('purchasers', data)
export const getPurchaseManagementPurchaser = (id, data) => purchaseManagementRequest('purchasers/' + id, data)
export const getPurchaseManagementPurchaserTasks = (id, data) => purchaseManagementRequest('purchasers/' + id + '/tasks', data)
export const getPurchaseManagementPurchaserBatches = (id, data) => purchaseManagementRequest('purchasers/' + id + '/batches', data)
export const getPurchaseManagementPurchaserDirectPurchases = (id, data) => purchaseManagementRequest('purchasers/' + id + '/direct-purchases', data)
// V1 supplier list is still used as a purchase-batch filter outside this stage.
export const getPurchaseManagementSuppliers = data => purchaseManagementRequest('suppliers', data)
export const getPurchaseManagementBatches = data => purchaseManagementRequest('batches', data)
export const getPurchaseManagementBatch = id => purchaseManagementRequest('batches/' + id)
export const getPurchaseManagementExceptions = data => purchaseManagementRequest('exceptions', data)

function purchaseSupplierV2Request(path, data, method) {
  return inventoryBatchRequest('purchase-management/v2/suppliers' + path, method || 'GET', data || {})
}

export const getPurchaseSupplierV2List = data => purchaseSupplierV2Request('', data)
export const syncPurchaseSupplierV2 = data => purchaseSupplierV2Request('/sync', data, 'POST')
export const getPurchaseSupplierV2Detail = (id, data) => purchaseSupplierV2Request('/' + id, data)
export const getPurchaseSupplierV2Facts = (id, data) => purchaseSupplierV2Request('/' + id + '/facts', data)
export const getPurchaseSupplierV2Goods = (id, data) => purchaseSupplierV2Request('/' + id + '/goods', data)

// ===== 采购资金中心（资金事实主权；不调用旧付款完成接口） =====
function purchaseFinanceRequest(path, method, data, idempotencyKey) {
  const header = { 'Content-Type': 'application/json' }
  if (idempotencyKey) header['Idempotency-Key'] = idempotencyKey
  return new Promise((resolve, reject) => getApp().ownerRequest({
    url: apiUrl.apiUrl + 'purchase-finance/' + path,
    method: method || 'GET', data: data || {}, header,
    success: res => resolve({ result: res.data }), fail: reject
  }))
}
export const getPurchaseFinanceOverview = data => purchaseFinanceRequest('overview','GET',data)
export const getPurchaseFundingSources = data => purchaseFinanceRequest('funding-sources','GET',data)
export const classifyPurchaseFunding = (data,key) => purchaseFinanceRequest('funding-allocations','POST',data,key)
export const getPurchaseFundingAllocations = data => purchaseFinanceRequest('funding-allocations','GET',data)
export const confirmPurchaseFundingAllocation = (id,data) => purchaseFinanceRequest('funding-allocations/'+id+'/confirmation','POST',data)
export const reversePurchaseFundingAllocation = (id,data) => purchaseFinanceRequest('funding-allocations/'+id+'/reverse','POST',data)
export const getPurchaserReimbursements = data => purchaseFinanceRequest('reimbursements','GET',data)
export const getPurchaserReimbursementPeople = () => purchaseFinanceRequest('reimbursement-purchasers','GET')
export const createPurchaserReimbursement = (data,key) => purchaseFinanceRequest('reimbursements','POST',data,key)
export const getPurchaserReimbursement = id => purchaseFinanceRequest('reimbursements/'+id,'GET')
export const replacePurchaserReimbursementLines = (id,data) => purchaseFinanceRequest('reimbursements/'+id+'/lines','PUT',data)
export const submitPurchaserReimbursement = (id,data) => purchaseFinanceRequest('reimbursements/'+id+'/submit','POST',data)
export const reviewPurchaserReimbursement = (id,data) => purchaseFinanceRequest('reimbursements/'+id+'/review','POST',data)
export const getSupplierSettlements = data => purchaseFinanceRequest('settlements','GET',data)
export const createSupplierSettlement = (data,key) => purchaseFinanceRequest('settlements','POST',data,key)
export const getSupplierSettlement = id => purchaseFinanceRequest('settlements/'+id,'GET')
export const replaceSupplierSettlementLines = (id,data) => purchaseFinanceRequest('settlements/'+id+'/lines','PUT',data)
export const submitSupplierSettlement = (id,data) => purchaseFinanceRequest('settlements/'+id+'/submit','POST',data)
export const reviewSupplierSettlement = (id,data) => purchaseFinanceRequest('settlements/'+id+'/review','POST',data)
export const recordPurchaseFinancePayment = (type,id,data,key) => purchaseFinanceRequest(type+'/'+id+'/payments','POST',data,key)
export const getPurchaseFinancePayments = data => purchaseFinanceRequest('payments','GET',data)
export const getPurchasePaymentLedger = data => purchaseFinanceRequest('payment-ledger','GET',data)
export const getPurchaseFinancePayment = id => purchaseFinanceRequest('payments/'+id,'GET')
export const reversePurchaseFinancePayment = (id,data,key) => purchaseFinanceRequest('payments/'+id+'/reverse','POST',data,key)
export const getPurchasePaymentVouchers = id => purchaseFinanceRequest('payments/'+id+'/vouchers','GET')
export const voidPurchasePaymentVoucher = (id,data) => purchaseFinanceRequest('vouchers/'+id+'/void','POST',data)
export const getPurchaseFinanceExceptions = data => purchaseFinanceRequest('exceptions','GET',data)
export const uploadPurchasePaymentVoucher = (paymentId,filePath,key) => new Promise((resolve,reject)=>getApp().ownerUploadFile({
  url:apiUrl.apiUrl+'purchase-finance/payments/'+paymentId+'/vouchers',filePath,name:'file',
  header:{'Idempotency-Key':key},success:res=>{try{resolve({result:JSON.parse(res.data)})}catch(e){reject(e)}},fail:reject
}))
export const downloadPurchasePaymentVoucher = voucherId => new Promise((resolve,reject)=>getApp().ownerDownloadFile({
  url:apiUrl.apiUrl+'purchase-finance/vouchers/'+voucherId+'/content',
  success:res=>res.statusCode===200?resolve(res.tempFilePath):reject(new Error('凭证下载失败')),
  fail:reject
}))

/**
 * 标签打印工具类
 * 支持多种标签尺寸和打印模式
 * 适用于微信小程序 TSC 标签打印机
 * 
 * @author Auto
 * @date 2025
 */

const tsc = require('./GPutils/tsc.js').jpPrinter;

/**
 * 标签尺寸配置
 */
const LABEL_SIZES = {
  1: { width: 40, height: 30, name: '4*3cm' },   // 小尺寸
  2: { width: 40, height: 60, name: '4*6cm' },   // 中尺寸
  3: { width: 50, height: 80, name: '5*8cm' }    // 大尺寸
};

/**
 * 打印机配置
 */
const PRINTER_CONFIG = {
  DPI: 203,                    // 打印机分辨率
  GAP: 2,                      // 标签间隙（mm）
  FONT_NAME: 'TSS24.BF2',      // 默认字体
  MARGIN: 2,                   // 边距（mm）
  SPEED: null,                 // 打印速度（可选，null 表示使用默认值，范围通常 1-14）
  DENSITY: null                // 打印浓度（可选，null 表示使用默认值，范围通常 0-15）
};

/**
 * 标签打印工具类
 */
class LabelPrinter {
  constructor() {
    this.command = null;
    this.paperSize = null;
    this.DPMM = PRINTER_CONFIG.DPI / 25.4; // 每毫米的点数，约 8 点/mm
  }

  /**
   * 初始化打印命令
   * @param {Number} paperSizeId - 标签尺寸ID (1: 4*3cm, 2: 4*6cm, 3: 5*8cm)
   * @param {Object} options - 可选配置
   * @param {Number} options.speed - 打印速度（可选，范围通常 1-14）
   * @param {Number} options.density - 打印浓度（可选，范围通常 0-15）
   * @returns {Object} 打印命令对象
   */
  init(paperSizeId, options = {}) {
    // 从缓存获取标签尺寸，如果没有则使用传入的参数
    const cachedPaperSize = wx.getStorageSync('paperSize') || paperSizeId || 1;
    this.paperSize = LABEL_SIZES[cachedPaperSize] || LABEL_SIZES[1];
    
    // 创建 TSC 命令对象
    this.command = tsc.createNew();
    
    // 设置标签大小
    this.command.setSize(this.paperSize.width, this.paperSize.height);
    
    // 设置间隙
    this.command.setGap(PRINTER_CONFIG.GAP);
    
    // 设置打印速度（如果指定）
    if (options.speed !== undefined && options.speed !== null) {
      this.command.setSpeed(options.speed);
      console.log(`[LabelPrinter] 设置打印速度: ${options.speed}`);
    } else if (PRINTER_CONFIG.SPEED !== null) {
      this.command.setSpeed(PRINTER_CONFIG.SPEED);
    }
    
    // 设置打印浓度（如果指定）
    if (options.density !== undefined && options.density !== null) {
      this.command.setDensity(options.density);
      console.log(`[LabelPrinter] 设置打印浓度: ${options.density}`);
    } else if (PRINTER_CONFIG.DENSITY !== null) {
      this.command.setDensity(PRINTER_CONFIG.DENSITY);
    }
    
    // 设置方向
    this.command.setDirection(0);
    
    // 设置参考点
    this.command.setReference(0, 0);
    
    // 清除缓冲区
    this.command.setCls();
    
    console.log(`[LabelPrinter] 初始化标签尺寸: ${this.paperSize.name} (${this.paperSize.width}*${this.paperSize.height}mm)`);
    
    return this.command;
  }

  /**
   * 从订单对象中提取客户名称
   * @param {Object} order - 订单对象
   * @returns {String} 客户名称
   */
  extractCustomerName(order) {
    if (!order) return '';
    
    let customerName = '';
    
    // 优先使用扁平化字段（stock/index 页面使用）
    if (order.fatherDepartmentAttrName) {
      // 只使用 fatherDepartmentAttrName（不拼接其他字段）
      customerName = order.fatherDepartmentAttrName;
    } else if (order.fatherGbDepartmentName && order.gbDepartmentName) {
      // GB部门扁平化字段
      customerName = order.fatherGbDepartmentName + '.' + order.gbDepartmentName;
    } else if (order.gbDepartmentName) {
      // GB部门名称（扁平化）
      customerName = order.gbDepartmentName;
    } else if (order.nxDepartmentAttrName) {
      // NX部门属性名称（扁平化）
      customerName = order.nxDepartmentAttrName;
    } else if (order.nxRestrauntAttrName) {
      // 餐厅属性名称（扁平化）
      customerName = order.nxRestrauntAttrName;
    }
    // 其次使用嵌套对象（兼容旧格式）
    else if (order.gbDepartmentEntity) {
      customerName = order.gbDepartmentEntity.gbDepartmentAttrName || 
                    order.gbDepartmentEntity.gbDepartmentName || '';
      // 如果有父部门，拼接父部门名称
      if (order.gbDepartmentEntity.fatherGbDepartmentEntity && customerName) {
        const fatherName = order.gbDepartmentEntity.fatherGbDepartmentEntity.gbDepartmentName || 
                          order.gbDepartmentEntity.fatherGbDepartmentEntity.gbDepartmentAttrName || '';
        if (fatherName) {
          customerName = fatherName + '.' + customerName;
        }
      }
    } 
    // 其次使用 nxDepartmentEntity
    else if (order.nxDepartmentEntity) {
      customerName = order.nxDepartmentEntity.nxDepartmentAttrName || 
                    order.nxDepartmentEntity.nxDepartmentName || '';
      // 如果有父部门，拼接父部门名称
      if (order.nxDepartmentEntity.fatherDepartmentEntity && customerName) {
        const fatherName = order.nxDepartmentEntity.fatherDepartmentEntity.nxDepartmentName || 
                          order.nxDepartmentEntity.fatherDepartmentEntity.nxDepartmentAttrName || '';
        if (fatherName) {
          customerName = fatherName + '.' + customerName;
        }
      }
    } 
    // 最后使用 nxRestrauntEntity
    else if (order.nxRestrauntEntity) {
      customerName = order.nxRestrauntEntity.nxRestrauntAttrName || 
                    order.nxRestrauntEntity.nxRestrauntName || '';
    }
    
    return customerName || '';
  }

  /**
   * 从订单对象中提取商品名称
   * @param {Object} order - 订单对象
   * @param {Object} goodsItem - 商品对象（可选，从 this.data.item 获取）
   * @returns {String} 商品名称
   */
  extractGoodsName(order, goodsItem) {
    // 优先从商品对象获取
    if (goodsItem && goodsItem.nxDgGoodsName) {
      return goodsItem.nxDgGoodsName;
    }
    
    // 其次从订单对象的 _goodsItem 字段获取（stock/index 页面使用）
    if (order._goodsItem && order._goodsItem.nxDgGoodsName) {
      return order._goodsItem.nxDgGoodsName;
    }
    
    // 备用方案：从订单对象中查找
    if (order.nxDistributerGoodsEntity) {
      return order.nxDistributerGoodsEntity.nxDgGoodsName || '';
    } else if (order.nxDepartmentDisGoodsEntity) {
      if (order.nxDepartmentDisGoodsEntity.nxDistributerGoodsEntity) {
        return order.nxDepartmentDisGoodsEntity.nxDistributerGoodsEntity.nxDgGoodsName || '';
      } else if (order.nxDepartmentDisGoodsEntity.nxDgGoodsName) {
        return order.nxDepartmentDisGoodsEntity.nxDgGoodsName;
      }
    } else if (order.nxDgGoodsName) {
      return order.nxDgGoodsName;
    }
    
    return '';
  }

  /**
   * 打印订单列表（竖版模式）
   * @param {Array} orderArray - 订单数组
   * @param {Object} options - 配置选项
   * @param {Object} options.goodsItem - 商品对象（用于获取商品名称）
   * @param {Boolean} options.printRemark - 是否打印备注（默认 false，仅大尺寸标签）
   */
  printVerticalOrders(orderArray, options = {}) {
    if (!this.command) {
      console.error('[LabelPrinter] 请先调用 init() 初始化');
      return;
    }

    const { goodsItem = null, printRemark = false } = options;
    const isVertical = this.paperSize.height >= 60;
    
    if (!isVertical) {
      console.warn('[LabelPrinter] 当前标签尺寸不支持竖版打印，请使用 printHorizontalOrders');
      return;
    }

    // 计算标签尺寸（点数）
    const labelWidthPoints = Math.floor(this.paperSize.width * this.DPMM);
    const labelHeightPoints = Math.floor(this.paperSize.height * this.DPMM);
    
    // 计算 x 坐标（水平方向，从左到右）
    const x1 = Math.floor(PRINTER_CONFIG.MARGIN * this.DPMM); // 左边距
    const x2 = Math.floor(labelWidthPoints * 0.4);  // 40% 位置（商品名称）
    const x3 = Math.floor(labelWidthPoints * 0.6);  // 60% 位置（数量）
    const x4 = Math.floor(labelWidthPoints * 0.85); // 85% 位置（备注，仅大尺寸标签）
    
    // 计算 y 坐标（垂直方向，从底部开始）
    const verticalLineHeight = Math.floor(60 * this.DPMM); // 每行高度约 60 点（约 7.5mm）
    let currentY = labelHeightPoints - Math.floor(8 * this.DPMM); // 从底部向上偏移 8mm
    const minY = Math.floor(PRINTER_CONFIG.MARGIN * this.DPMM); // 最小 y 坐标
    
    // 字体配置
    const fontName = PRINTER_CONFIG.FONT_NAME;
    const goodsScale = 2; // 商品名称固定 scale = 2（不再根据长度判断）
    const quantityScale = 2; // 数量行使用 scale = 2（保持原值）
    const rotation = 270; // 竖版旋转 270 度
    // 根据标签尺寸设置部门名称的 scale
    let departmentScale;
    if (this.paperSize.height === 80) {
      // 5*8cm 标签：部门名称使用更大的 scale = 5
      departmentScale = 5;
    } else {
      // 4*6cm 标签：部门名称 scale = 4
      departmentScale = 4; // 固定为 4
    }
    
    console.log(`[LabelPrinter] 开始打印 ${orderArray.length} 个订单（竖版模式）`);
    console.log(`[LabelPrinter] 标签尺寸: ${labelWidthPoints}x${labelHeightPoints} 点`);
    console.log(`[LabelPrinter] X坐标: x1=${x1}, x2=${x2}, x3=${x3}`);
    
    // 遍历订单数组
    for (let orderIdx = 0; orderIdx < orderArray.length; orderIdx++) {
      const order = orderArray[orderIdx];
      
      // 提取信息
      const customerName = this.extractCustomerName(order);
      const goodsName = this.extractGoodsName(order, goodsItem);
      // 支持多种数量字段：优先使用 nxDoQuantity，其次使用 nxDoWeight
      const quantity = order.nxDoQuantity !== undefined && order.nxDoQuantity !== null && order.nxDoQuantity !== '' 
        ? order.nxDoQuantity 
        : (order.nxDoWeight || 0);
      // 支持多种单位字段：优先使用 nxDoPrintStandard，其次使用 nxDoStandard
      const standard = order.nxDoPrintStandard || order.nxDoStandard || '';
      const remark = order.nxDoRemark || '';
      
      // 所有内容使用相同的 y 坐标，确保在同一行
      const y = currentY;
      
      console.log(`[LabelPrinter] 订单[${orderIdx}]: 客户=${customerName}, 商品=${goodsName}, 数量=${quantity}${standard}, 备注=${remark}`);
      
      // 打印部门名称（第一列，字体大）
      if (customerName && customerName.trim()) {
        // 根据部门名称长度动态调整字体大小
        const customerNameLength = customerName.length;
        let finalDepartmentScale = departmentScale;
        
        if (this.paperSize.height === 60) {
          // 4*6cm 标签的调整规则
          if (customerNameLength > 6) {
            // 超过 6 个字，缩小到 scale = 2（和商品名称默认一样）
            finalDepartmentScale = 2;
            console.log(`[LabelPrinter]   部门名称过长（${customerNameLength} 字），缩小字体 scale=${finalDepartmentScale}`);
          } else if (customerNameLength > 4) {
            // 5-6 个字，缩小到 scale = 3
            finalDepartmentScale = 3;
            console.log(`[LabelPrinter]   部门名称较长（${customerNameLength} 字），缩小字体 scale=${finalDepartmentScale}`);
          }
        } else if (this.paperSize.height === 80) {
          // 5*8cm 标签的调整规则
          if (customerNameLength > 4) {
            // 超过 4 个字，缩小到 scale - 1
            finalDepartmentScale = departmentScale - 1; // scale = 4
            console.log(`[LabelPrinter]   部门名称过长（${customerNameLength} 字），缩小字体 scale=${finalDepartmentScale}`);
          }
        }
        
        this.command.setText(x1, y, fontName, rotation, finalDepartmentScale, finalDepartmentScale, customerName);
        console.log(`[LabelPrinter]   ✓ 部门名称: ${customerName} (${customerNameLength} 字, x=${x1}, y=${y}, scale=${finalDepartmentScale})`);
      }
      
      // 打印商品名称（第二列）
      if (goodsName && goodsName.trim()) {
        // 商品名称固定使用 scale = 2，不再根据长度判断
        const goodsNameLength = goodsName.length;
        this.command.setText(x2, y, fontName, rotation, goodsScale, goodsScale, goodsName);
        console.log(`[LabelPrinter]   ✓ 商品名称: ${goodsName} (${goodsNameLength} 字, x=${x2}, y=${y}, scale=${goodsScale})`);
      }
      
      // 打印数量（第三列）
      if (quantity || standard) {
        const quantityText = (quantity || 0) + (standard ? standard : '');
        this.command.setText(x3, y, fontName, rotation, quantityScale, quantityScale, quantityText);
        console.log(`[LabelPrinter]   ✓ 数量: ${quantityText} (x=${x3}, y=${y}, scale=${quantityScale})`);
      }
      
      // 打印备注（第四列，仅大尺寸标签且启用时）
      if (printRemark && this.paperSize.height === 80 && remark && remark.trim()) {
        const remarkText = '备注：' + remark;
        this.command.setText(x4, y, fontName, rotation, quantityScale, quantityScale, remarkText);
        console.log(`[LabelPrinter]   ✓ 备注: ${remarkText} (x=${x4}, y=${y}, scale=${quantityScale})`);
      }
      
      // 下一个订单的 y 坐标递减（从底部向上）
      currentY -= verticalLineHeight;
      
      // 如果超出标签顶部，停止打印
      if (currentY < minY) {
        console.warn(`[LabelPrinter] 订单数量过多，超出标签高度，停止打印后续订单`);
        break;
      }
    }
    
    console.log(`[LabelPrinter] 订单打印命令生成完成`);
  }

  /**
   * 打印订单列表（横版模式）
   * @param {Array} orderArray - 订单数组
   * @param {Object} options - 配置选项
   * @param {Object} options.goodsItem - 商品对象（用于获取商品名称）
   */
  printHorizontalOrders(orderArray, options = {}) {
    if (!this.command) {
      console.error('[LabelPrinter] 请先调用 init() 初始化');
      return;
    }

    const { goodsItem = null } = options;
    const isVertical = this.paperSize.height >= 60;
    
    if (isVertical) {
      console.warn('[LabelPrinter] 当前标签尺寸不支持横版打印，请使用 printVerticalOrders');
      return;
    }

    // 字体配置
    const fontName = PRINTER_CONFIG.FONT_NAME;
    const scale = 2; // 小标签使用适中的缩放，以便显示更多内容
    const rotation = 0; // 横版不旋转
    
    // 计算起始位置
    const startX = Math.floor(PRINTER_CONFIG.MARGIN * this.DPMM);
    // 小标签向下移动更多，增加顶部空间（从 2mm 增加到 4mm）
    const startY = Math.floor(4 * this.DPMM); // 从顶部向下 4mm，而不是 2mm
    const lineHeight = 60; // 行高（减小以便显示更多行）
    
    console.log(`[LabelPrinter] 开始打印 ${orderArray.length} 个订单（横版模式）`);
    
    // 遍历订单数组
    for (let i = 0; i < orderArray.length; i++) {
      const order = orderArray[i];
      
      // 提取信息
      const customerName = this.extractCustomerName(order);
      const goodsName = this.extractGoodsName(order, goodsItem);
      // 支持多种数量字段：优先使用 nxDoQuantity，其次使用 nxDoWeight
      const quantity = order.nxDoQuantity !== undefined && order.nxDoQuantity !== null && order.nxDoQuantity !== '' 
        ? order.nxDoQuantity 
        : (order.nxDoWeight || 0);
      // 支持多种单位字段：优先使用 nxDoPrintStandard，其次使用 nxDoStandard
      const standard = order.nxDoPrintStandard || order.nxDoStandard || '';
      
      // 计算当前订单的起始 y 坐标
      const orderStartY = startY + i * (lineHeight * 3); // 每个订单占3行
      
      // 打印客户名称（第一行）
      if (customerName && customerName.trim()) {
        this.command.setText(startX, orderStartY, fontName, rotation, scale, scale, customerName);
        console.log(`[LabelPrinter] 订单[${i}] 客户: ${customerName} (x=${startX}, y=${orderStartY})`);
      }
      
      // 打印商品名称（第二行）
      if (goodsName && goodsName.trim()) {
        const goodsY = orderStartY + lineHeight;
        this.command.setText(startX, goodsY, fontName, rotation, scale, scale, goodsName);
        console.log(`[LabelPrinter] 订单[${i}] 商品: ${goodsName} (x=${startX}, y=${goodsY})`);
      }
      
      // 打印数量（第三行）
      if (quantity || standard) {
        const quantityY = orderStartY + lineHeight * 2;
        const quantityText = (quantity !== undefined && quantity !== null && quantity !== '') 
          ? (quantity + (standard || '')) 
          : (standard || '');
        this.command.setText(startX, quantityY, fontName, rotation, scale, scale, quantityText);
        console.log(`[LabelPrinter] 订单[${i}] 数量: ${quantityText} (x=${startX}, y=${quantityY})`);
      }
      
      // 如果超出标签高度，停止打印
      const maxY = Math.floor(this.paperSize.height * this.DPMM);
      if (orderStartY + lineHeight * 3 > maxY) {
        console.warn(`[LabelPrinter] 订单数量过多，超出标签高度，停止打印后续订单`);
        break;
      }
    }
    
    console.log(`[LabelPrinter] 订单打印命令生成完成`);
  }

  /**
   * 打印订单列表（自动选择模式）
   * 根据标签尺寸自动选择横版或竖版
   * @param {Array} orderArray - 订单数组
   * @param {Object} options - 配置选项
   */
  printOrders(orderArray, options = {}) {
    const isVertical = this.paperSize.height >= 60;
    
    if (isVertical) {
      this.printVerticalOrders(orderArray, options);
    } else {
      this.printHorizontalOrders(orderArray, options);
    }
  }

  /**
   * 生成打印数据
   * @returns {ArrayBuffer} 打印数据缓冲区
   */
  generatePrintData() {
    if (!this.command) {
      console.error('[LabelPrinter] 请先调用 init() 初始化');
      return null;
    }

    // 生成打印命令
    this.command.setPagePrint();
    const buff = this.command.getData();
    
    console.log(`[LabelPrinter] 打印数据生成成功，长度: ${buff.length} 字节`);
    
    return buff;
  }

  /**
   * 重置命令对象（用于多次打印）
   */
  reset() {
    if (this.command) {
      this.command.setCls();
    }
  }

  /**
   * 设置打印速度（参考厂家 demo）
   * @param {Number} speed - 打印速度（范围通常 1-14，数值越大速度越快）
   */
  setSpeed(speed) {
    if (this.command && speed >= 1 && speed <= 14) {
      this.command.setSpeed(speed);
      console.log(`[LabelPrinter] 设置打印速度: ${speed}`);
    }
  }

  /**
   * 设置打印浓度（参考厂家 demo）
   * @param {Number} density - 打印浓度（范围通常 0-15，数值越大浓度越高）
   */
  setDensity(density) {
    if (this.command && density >= 0 && density <= 15) {
      this.command.setDensity(density);
      console.log(`[LabelPrinter] 设置打印浓度: ${density}`);
    }
  }

  /**
   * 打印二维码（参考厂家 demo）
   * @param {Number} x - x 坐标
   * @param {Number} y - y 坐标
   * @param {String} content - 二维码内容
   * @param {String} level - 纠错级别（L, M, Q, H，默认 L）
   * @param {Number} width - 模块宽度（默认 5）
   * @param {String} mode - 模式（A 或 M，默认 A）
   */
  printQRCode(x, y, content, level = 'L', width = 5, mode = 'A') {
    if (this.command && content) {
      this.command.setQR(x, y, level, width, mode, content);
      console.log(`[LabelPrinter] 打印二维码: ${content} (x=${x}, y=${y})`);
    }
  }

  /**
   * 打印条形码（参考厂家 demo）
   * @param {Number} x - x 坐标
   * @param {Number} y - y 坐标
   * @param {String} codetype - 条形码类型（如 EAN8, EAN13, CODE128 等）
   * @param {Number} height - 条形码高度
   * @param {Number} readable - 是否可读（0 或 1）
   * @param {Number} narrow - 窄条宽度
   * @param {Number} wide - 宽条宽度
   * @param {String} content - 条形码内容
   */
  printBarCode(x, y, codetype, height, readable, narrow, wide, content) {
    if (this.command && content) {
      this.command.setBarCode(x, y, codetype, height, readable, narrow, wide, content);
      console.log(`[LabelPrinter] 打印条形码: ${content} (x=${x}, y=${y}, type=${codetype})`);
    }
  }

  /**
   * 控制纸张进纸（参考厂家 demo）
   * @param {Number} feed - 进纸距离（点数）
   */
  feed(feed) {
    if (this.command) {
      this.command.setFeed(feed);
      console.log(`[LabelPrinter] 进纸: ${feed} 点`);
    }
  }

  /**
   * 控制纸张退纸（参考厂家 demo）
   * @param {Number} backup - 退纸距离（点数）
   */
  backFeed(backup) {
    if (this.command) {
      this.command.setBackFeed(backup);
      console.log(`[LabelPrinter] 退纸: ${backup} 点`);
    }
  }

  /**
   * 找到下一张标签纸的位置（参考厂家 demo）
   */
  home() {
    if (this.command) {
      this.command.setHome();
      console.log(`[LabelPrinter] 定位到下一张标签纸`);
    }
  }

  /**
   * 控制蜂鸣器（参考厂家 demo）
   * @param {Number} level - 音量级别（0-3）
   * @param {Number} interval - 间隔时间（毫秒）
   */
  sound(level = 1, interval = 100) {
    if (this.command) {
      this.command.setSound(level, interval);
      console.log(`[LabelPrinter] 蜂鸣器: level=${level}, interval=${interval}ms`);
    }
  }
}

/**
 * 导出单例实例
 */
module.exports = {
  LabelPrinter: LabelPrinter,
  
  /**
   * 创建新的打印实例
   * @param {Number} paperSizeId - 标签尺寸ID
   * @param {Object} options - 可选配置（speed, density）
   * @returns {LabelPrinter} 打印实例
   */
  create(paperSizeId, options = {}) {
    const printer = new LabelPrinter();
    printer.init(paperSizeId, options);
    return printer;
  },
  
  /**
   * 快速打印方法（一步完成）
   * @param {Array} orderArray - 订单数组
   * @param {Object} options - 配置选项
   * @param {Number} options.paperSizeId - 标签尺寸ID
   * @param {Object} options.goodsItem - 商品对象
   * @param {Number} options.speed - 打印速度（可选，范围 1-14）
   * @param {Number} options.density - 打印浓度（可选，范围 0-15）
   * @returns {ArrayBuffer} 打印数据缓冲区
   */
  quickPrint(orderArray, options = {}) {
    const { paperSizeId, speed, density, ...printOptions } = options;
    const printer = new LabelPrinter();
    printer.init(paperSizeId, { speed, density });
    printer.printOrders(orderArray, printOptions);
    return printer.generatePrintData();
  },
  
  // 导出常量
  LABEL_SIZES: LABEL_SIZES,
  PRINTER_CONFIG: PRINTER_CONFIG
};


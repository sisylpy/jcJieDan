/**
 * 标签打印工具类使用示例
 * 
 * 这个文件展示了如何在页面中使用 labelPrinter.js
 */

// ========== 方式一：快速打印（推荐） ==========
const labelPrinter = require('./labelPrinter.js');

// 快速打印订单列表
function quickPrintExample() {
  const orderArray = [
    {
      nxDepartmentEntity: {
        nxDepartmentName: '湘菜馆',
        nxDepartmentAttrName: '湘菜馆'
      },
      nxDoWeight: 2,
      nxDoPrintStandard: 'kg',
      nxDoRemark: '备注信息'
    },
    // ... 更多订单
  ];
  
  const goodsItem = {
    nxDgGoodsName: '大豆油'
  };
  
  // 一步完成打印数据生成
  const printData = labelPrinter.quickPrint(orderArray, {
    paperSizeId: 3,        // 5*8cm 标签
    goodsItem: goodsItem,  // 商品对象（用于获取商品名称）
    printRemark: true      // 是否打印备注
  });
  
  // 发送打印数据到打印机
  sendToPrinter(printData);
}

// ========== 方式二：分步打印（更灵活） ==========
function stepByStepExample() {
  const orderArray = [
    {
      nxDepartmentEntity: {
        nxDepartmentName: '湘菜馆',
        nxDepartmentAttrName: '湘菜馆'
      },
      nxDoWeight: 2,
      nxDoPrintStandard: 'kg'
    }
  ];
  
  // 1. 创建打印实例
  const printer = labelPrinter.create(3); // 5*8cm 标签
  
  // 2. 打印订单列表
  printer.printOrders(orderArray, {
    goodsItem: { nxDgGoodsName: '大豆油' },
    printRemark: true
  });
  
  // 3. 生成打印数据
  const printData = printer.generatePrintData();
  
  // 4. 发送到打印机
  sendToPrinter(printData);
}

// ========== 方式三：在页面中使用 ==========
// 在 pages/stock/goods/goods.js 中的使用示例：

Page({
  // ... 其他代码
  
  // 打印订单信息
  printCustomers(orderArray) {
    const that = this;
    const labelPrinter = require('../../../utils/labelPrinter.js');
    
    // 获取商品对象（从页面数据中）
    const goodsItem = this.data.item;
    
    // 生成打印数据
    const printData = labelPrinter.quickPrint(orderArray, {
      paperSizeId: wx.getStorageSync('paperSize') || 1, // 从缓存获取标签尺寸
      goodsItem: goodsItem,
      printRemark: true
    });
    
    if (!printData) {
      wx.showToast({
        title: '打印数据生成失败',
        icon: 'none'
      });
      return;
    }
    
    // 发送到打印机
    this.sendPrintData(printData);
  },
  
  // 发送打印数据到蓝牙打印机
  sendPrintData(buff) {
    // ... 蓝牙发送逻辑
  }
});

// ========== 方式四：自定义打印逻辑 ==========
function customPrintExample() {
  const { LabelPrinter } = require('./labelPrinter.js');
  
  // 创建打印实例
  const printer = new LabelPrinter();
  printer.init(3); // 5*8cm 标签
  
  // 只打印竖版订单
  printer.printVerticalOrders(orderArray, {
    goodsItem: goodsItem,
    printRemark: true
  });
  
  // 或者只打印横版订单
  // printer.printHorizontalOrders(orderArray, {
  //   goodsItem: goodsItem
  // });
  
  // 生成打印数据
  const printData = printer.generatePrintData();
  
  return printData;
}

// ========== 支持的标签尺寸 ==========
console.log('支持的标签尺寸:');
console.log('1: 4*3cm (小尺寸，横版)');
console.log('2: 4*6cm (中尺寸，竖版)');
console.log('3: 5*8cm (大尺寸，竖版)');

// ========== 订单对象格式说明 ==========
/**
 * 订单对象应包含以下字段（至少一个）：
 * 
 * 客户信息（三选一）：
 * - gbDepartmentEntity: { gbDepartmentName, gbDepartmentAttrName, fatherGbDepartmentEntity }
 * - nxDepartmentEntity: { nxDepartmentName, nxDepartmentAttrName, fatherDepartmentEntity }
 * - nxRestrauntEntity: { nxRestrauntName, nxRestrauntAttrName }
 * 
 * 商品信息（可选，优先从 goodsItem 参数获取）：
 * - nxDistributerGoodsEntity: { nxDgGoodsName }
 * - nxDepartmentDisGoodsEntity: { nxDistributerGoodsEntity, nxDgGoodsName }
 * - nxDgGoodsName: 直接的商品名称
 * 
 * 订单信息：
 * - nxDoWeight: 数量/重量
 * - nxDoPrintStandard: 打印单位（优先）
 * - nxDoStandard: 单位（备用）
 * - nxDoRemark: 备注
 */


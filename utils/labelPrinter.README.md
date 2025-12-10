# 标签打印工具类 (LabelPrinter)

通用的微信小程序标签打印工具类，支持多种标签尺寸和打印模式，适用于 TSC 标签打印机。

## 特性

- ✅ 支持多种标签尺寸：4*3cm、4*6cm、5*8cm
- ✅ 自动选择横版/竖版打印模式
- ✅ 统一的打印逻辑，所有页面共用
- ✅ 易于集成到其他项目
- ✅ 支持自定义打印选项（速度、浓度等）
- ✅ 支持二维码和条形码打印（扩展功能）
- ✅ 支持纸张控制和蜂鸣器控制（扩展功能）
- ✅ 完善的日志输出，便于调试
- ✅ 参考厂家 demo，兼容性更好

## 快速开始

### 1. 基本使用

```javascript
const labelPrinter = require('../../utils/labelPrinter.js');

// 订单数组
const orderArray = [
  {
    nxDepartmentEntity: {
      nxDepartmentName: '湘菜馆',
      nxDepartmentAttrName: '湘菜馆'
    },
    nxDoWeight: 2,
    nxDoPrintStandard: 'kg',
    nxDoRemark: '备注信息'
  }
];

// 商品对象（可选）
const goodsItem = {
  nxDgGoodsName: '大豆油'
};

// 快速打印
const printData = labelPrinter.quickPrint(orderArray, {
  paperSizeId: 3,        // 5*8cm 标签
  goodsItem: goodsItem,   // 商品对象
  printRemark: true       // 是否打印备注
});

// 发送到打印机
sendToPrinter(printData);
```

### 2. 在页面中使用

```javascript
// pages/stock/goods/goods.js
const labelPrinter = require('../../../utils/labelPrinter.js');

Page({
  // 打印订单信息
  printCustomers(orderArray) {
    const printData = labelPrinter.quickPrint(orderArray, {
      paperSizeId: wx.getStorageSync('paperSize') || 1,
      goodsItem: this.data.item,
      printRemark: true
    });
    
    if (printData) {
      this.sendPrintData(printData);
    }
  },
  
  // 发送到蓝牙打印机
  sendPrintData(buff) {
    // ... 蓝牙发送逻辑
  }
});
```

## API 文档

### 快速打印

```javascript
labelPrinter.quickPrint(orderArray, options)
```

**参数：**
- `orderArray` (Array): 订单数组
- `options` (Object): 配置选项
  - `paperSizeId` (Number): 标签尺寸ID (1: 4*3cm, 2: 4*6cm, 3: 5*8cm)
  - `goodsItem` (Object): 商品对象（可选，用于获取商品名称）
  - `printRemark` (Boolean): 是否打印备注（默认 true，仅大尺寸标签）
  - `speed` (Number): 打印速度（可选，范围 1-14，数值越大速度越快）
  - `density` (Number): 打印浓度（可选，范围 0-15，数值越大浓度越高）

**返回：**
- `ArrayBuffer`: 打印数据缓冲区

### 分步打印

```javascript
// 1. 创建打印实例
const printer = labelPrinter.create(paperSizeId);

// 2. 打印订单列表
printer.printOrders(orderArray, {
  goodsItem: goodsItem,
  printRemark: true
});

// 3. 生成打印数据
const printData = printer.generatePrintData();
```

### 高级用法

```javascript
const { LabelPrinter } = require('../../utils/labelPrinter.js');

// 创建实例
const printer = new LabelPrinter();
printer.init(3); // 5*8cm 标签

// 只打印竖版订单
printer.printVerticalOrders(orderArray, {
  goodsItem: goodsItem,
  printRemark: true
});

// 或者只打印横版订单
printer.printHorizontalOrders(orderArray, {
  goodsItem: goodsItem
});

// 生成打印数据
const printData = printer.generatePrintData();
```

## 标签尺寸

| ID | 尺寸 | 模式 | 说明 |
|---|---|---|---|
| 1 | 4*3cm | 横版 | 小尺寸，只打印客户名称 |
| 2 | 4*6cm | 竖版 | 中尺寸，打印客户、商品、数量 |
| 3 | 5*8cm | 竖版 | 大尺寸，打印客户、商品、数量、备注 |

## 订单对象格式

订单对象应包含以下字段：

### 客户信息（三选一）

```javascript
// 方式1: GB部门
{
  gbDepartmentEntity: {
    gbDepartmentName: '部门名称',
    gbDepartmentAttrName: '部门别名',
    fatherGbDepartmentEntity: {
      gbDepartmentName: '父部门名称'
    }
  }
}

// 方式2: NX部门
{
  nxDepartmentEntity: {
    nxDepartmentName: '部门名称',
    nxDepartmentAttrName: '部门别名',
    fatherDepartmentEntity: {
      nxDepartmentName: '父部门名称'
    }
  }
}

// 方式3: 餐厅
{
  nxRestrauntEntity: {
    nxRestrauntName: '餐厅名称',
    nxRestrauntAttrName: '餐厅别名'
  }
}
```

### 商品信息（可选）

```javascript
// 优先从 goodsItem 参数获取
// 备用方案：从订单对象中查找
{
  nxDistributerGoodsEntity: {
    nxDgGoodsName: '商品名称'
  }
}
```

### 订单信息

```javascript
{
  nxDoWeight: 2,              // 数量/重量
  nxDoPrintStandard: 'kg',    // 打印单位（优先）
  nxDoStandard: 'kg',         // 单位（备用）
  nxDoRemark: '备注信息'       // 备注
}
```

## 打印布局

### 竖版（4*6cm, 5*8cm）

```
┌─────────────────┐
│ 部门名称 (大)    │  ← x1 (2mm)
│ 商品名称        │  ← x2 (40%)
│ 数量：2kg       │  ← x3 (60%)
│ 备注：xxx       │  ← x4 (85%, 仅5*8cm)
└─────────────────┘
```

### 横版（4*3cm）

```
┌─────────────────────────┐
│ 部门名称 商品名称 数量   │
└─────────────────────────┘
```

## 迁移指南

### 从现有代码迁移

**原来的代码：**
```javascript
// pages/stock/goods/goods.js
doPrint(orderArray) {
  var tsc = require("../../../utils/GPutils/tsc.js").jpPrinter;
  var command = tsc.createNew();
  // ... 大量打印逻辑
}
```

**迁移后：**
```javascript
// pages/stock/goods/goods.js
doPrint(orderArray) {
  const labelPrinter = require('../../../utils/labelPrinter.js');
  const printData = labelPrinter.quickPrint(orderArray, {
    paperSizeId: wx.getStorageSync('paperSize') || 1,
    goodsItem: this.data.item,
    printRemark: true
  });
  this.sendPrintData(printData);
}
```

## 注意事项

1. **标签尺寸**：默认从 `wx.getStorageSync('paperSize')` 获取，如果没有则使用传入的 `paperSizeId`
2. **商品名称**：优先从 `goodsItem` 参数获取，如果没有则从订单对象中查找
3. **备注打印**：仅 5*8cm 标签支持打印备注
4. **坐标系统**：竖版使用 rotation=270，坐标系统不变，x 为水平方向，y 为垂直方向

## 扩展功能

### 打印二维码

```javascript
const printer = labelPrinter.create(3);
printer.printQRCode(100, 200, 'https://example.com', 'L', 5, 'A');
const printData = printer.generatePrintData();
```

### 打印条形码

```javascript
const printer = labelPrinter.create(3);
printer.printBarCode(100, 200, 'EAN13', 64, 1, 3, 3, '1234567890123');
const printData = printer.generatePrintData();
```

### 纸张控制

```javascript
const printer = labelPrinter.create(3);
printer.feed(50);      // 进纸 50 点
printer.backFeed(20); // 退纸 20 点
printer.home();        // 定位到下一张标签纸
```

### 蜂鸣器控制

```javascript
const printer = labelPrinter.create(3);
printer.sound(2, 200); // 音量级别 2，间隔 200ms
```

### 设置打印速度和浓度

```javascript
const printData = labelPrinter.quickPrint(orderArray, {
  paperSizeId: 3,
  speed: 6,    // 打印速度（1-14）
  density: 10  // 打印浓度（0-15）
});
```

## 常见问题

### Q: 如何自定义字体大小？

A: 修改 `utils/labelPrinter.js` 中的字体配置：
```javascript
const departmentScale = scale + 2; // 部门名称缩放
const scale = 2; // 其他内容缩放
```

### Q: 如何调整打印位置？

A: 修改 `printVerticalOrders` 方法中的 x 坐标计算：
```javascript
const x2 = Math.floor(labelWidthPoints * 0.4); // 调整百分比
```

### Q: 如何支持其他标签尺寸？

A: 在 `LABEL_SIZES` 中添加新尺寸：
```javascript
const LABEL_SIZES = {
  4: { width: 60, height: 100, name: '6*10cm' }
};
```

### Q: 如何设置打印速度和浓度？

A: 在 `quickPrint` 或 `init` 方法中传入配置：
```javascript
// 方式1：快速打印时设置
labelPrinter.quickPrint(orderArray, {
  paperSizeId: 3,
  speed: 6,
  density: 10
});

// 方式2：创建实例时设置
const printer = labelPrinter.create(3, { speed: 6, density: 10 });
```

## 更新日志

### v1.0.0 (2025)
- ✅ 初始版本
- ✅ 支持 3 种标签尺寸
- ✅ 支持横版/竖版自动切换
- ✅ 统一的打印逻辑

## 许可证

MIT License


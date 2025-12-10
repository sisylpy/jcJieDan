# NX项目库存接口说明

## 📋 接口信息

### 接口路径
`POST /api/nxdistributergoodsshelfstock/getMendianStockTypePeriod`

### 功能说明
获取门店库存类型周期统计，参考GB项目的 `getMendianStockTypePeriod` 接口实现。

### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| disId | Integer | 是 | 批发商ID |
| whichDay | Integer | 否 | 查询天数（0-今天，1-昨天，2-前天，3-3天前，4-4天前，5-超过4天） |
| searchDepIds | String | 否 | 部门ID列表（逗号分隔，"-1"表示全部） |
| searchDepId | String | 否 | 单个部门ID（"-1"表示全部） |

### 请求示例

```json
{
  "disId": 1,
  "whichDay": 0,
  "searchDepIds": "1,2,3",
  "searchDepId": "-1"
}
```

---

## 📊 返回数据结构

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "total": {
      "dateString": "全部",
      "restTotal": "12345.6"
    },
    "arr": [
      // 商品树结构列表（NxDistributerFatherGoodsEntity）
    ],
    "in": {
      "dateString": "12月4日",
      "zeroTotal": "1000.0"
    },
    "one": {
      "dateString": "12月3日",
      "oneTotal": "800.0"
    },
    "two": {
      "dateString": "12月2日",
      "twoTotal": "600.0"
    },
    "three": {
      "dateString": "12月1日",
      "threeTotal": "400.0"
    },
    "exceed": {
      "dateString": "11月30日以前",
      "exceedThreeTotal": "200.0"
    },
    "depArr": [
      // 部门列表
    ]
  }
}
```

---

## 🔧 实现逻辑

### 1. 主接口流程

```
1. 解析部门ID列表（searchDepIds）
   ↓
2. 构建基础查询条件（disId, dayuStatus, restWeight）
   ↓
3. 根据searchDepId或searchDepIds设置部门过滤条件
   ↓
4. 查询库存商品总数和剩余金额总额
   ↓
5. 根据whichDay参数查询不同日期的库存
   ↓
6. 获取商品树结构（getStockGoodsFatherRestSubTotal）
   ↓
7. 查询各日期段的入库金额（今天、昨天、前天、3天前、超过3天）
   ↓
8. 查询部门列表及各自的库存金额
   ↓
9. 返回完整结果
```

### 2. 辅助方法

#### `getStockGoodsFatherRestSubTotal`
- **功能**：获取库存商品树结构（带剩余金额小计）
- **参数**：
  - `map0`：查询参数
  - `total`：总金额
  - `map0W`：废弃查询参数（暂不使用）

#### `getStockFatherGoodsTreeSet`
- **功能**：获取库存商品树结构
- **实现**：调用 `queryStockTreeFatherGoodsByParams` 获取商品分类树

#### `getStockFatherGoodsRestSubtotal`
- **功能**：计算商品树结构的剩余金额小计
- **逻辑**：
  - 遍历商品树结构
  - 计算每个分类的库存金额
  - 计算百分比（如果实体有对应字段）

#### `queryExceedData`
- **功能**：查询超过3天的入库数据
- **实现**：查询 `stopDate` 小于等于4天前的库存数据

---

## 🔄 GB项目与NX项目的对应关系

| GB项目 | NX项目 | 说明 |
|--------|--------|------|
| `GbDepartmentGoodsStockService` | `NxDistributerGoodsShelfStockService` | 库存服务 |
| `queryGoodsStockCount` | `queryStockGoodsCount` | 查询库存商品数量 |
| `queryDepGoodsRestTotal` | `queryShelfStockRestTotal` | 查询剩余金额总额 |
| `queryDepStockTreeFatherGoodsByParams` | `queryStockTreeFatherGoodsByParams` | 查询商品树结构 |
| `GbDistributerFatherGoodsEntity` | `NxDistributerFatherGoodsEntity` | 商品分类实体 |
| `GbDepartmentEntity` | `NxDepartmentEntity` | 部门实体 |

---

## ⚠️ 注意事项

### 1. 实体字段差异

NX项目的 `NxDistributerFatherGoodsEntity` **没有以下字段**：
- `fatherStockTotal`
- `fatherStockTotalString`
- `fatherWasteTotalString`
- `fatherStockTotalPercent`

因此代码中已注释掉这些字段的设置。如果需要这些字段，需要：
1. 在实体类中添加对应字段
2. 取消注释相关代码

### 2. 废弃金额查询

GB项目中有 `queryDepGoodsWasteTotal` 方法查询废弃金额，但NX项目暂未实现对应方法。如果需要，可以：
- 使用 `NxDistributerGoodsShelfStockReduceService` 查询废弃记录
- 或添加对应的查询方法

### 3. 参数说明

- `dayuStatus: -1`：表示查询所有状态的库存
- `restWeight: 0`：表示只查询有剩余库存的商品（剩余数量>0）
- `whichDay`：
  - `null` 或 `0`：查询全部
  - `1-4`：查询对应天数前的库存
  - `5`：查询超过4天的库存

### 4. 日期格式

- `DateUtils.formatWhatDay(n)`：返回日期字符串（如 "2025-12-04"）
- `DateUtils.formatWhatDayString(n)`：返回中文日期（如 "12月4日"）

---

## 📝 使用示例

### 查询今天的库存

```javascript
wx.request({
  url: 'http://your-domain.com/api/nxdistributergoodsshelfstock/getMendianStockTypePeriod',
  method: 'POST',
  data: {
    disId: 1,
    whichDay: 0,
    searchDepIds: '-1',
    searchDepId: '-1'
  },
  success: (res) => {
    console.log('库存数据:', res.data);
  }
});
```

### 查询指定部门的库存

```javascript
wx.request({
  url: 'http://your-domain.com/api/nxdistributergoodsshelfstock/getMendianStockTypePeriod',
  method: 'POST',
  data: {
    disId: 1,
    whichDay: 1,  // 查询昨天的库存
    searchDepIds: '-1',
    searchDepId: '5'  // 查询部门ID为5的库存
  },
  success: (res) => {
    console.log('部门库存数据:', res.data);
  }
});
```

---

## 🔍 调试建议

1. **查看日志**：接口中已添加 `System.out.println` 输出查询参数
2. **检查Service方法**：确认 `queryStockTreeFatherGoodsByParams` 等方法已实现
3. **验证参数**：确保 `disId`、`searchDepIds` 等参数正确传递
4. **数据库查询**：可以直接查询数据库验证数据是否正确

---

## 📞 相关文件

- **Controller**: `NxDistributerGoodsShelfStockController.java`
- **Service**: `NxDistributerGoodsShelfStockService.java`
- **DAO**: `NxDistributerGoodsShelfStockDao.java`
- **参考接口**: `GbDepartmentGoodsStockController.getMendianStockTypePeriod`

---

**创建时间**：2025-12-04  
**参考项目**：GB项目 `getMendianStockTypePeriod` 接口


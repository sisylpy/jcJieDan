# NX项目按时间段查询库存接口说明

## 📋 接口信息

### 接口路径
`POST /api/nxdistributergoodsshelfstock/disGetDayStockByGreatId`

### 功能说明
根据商品大类ID查询按时间段分类的库存统计，参考GB项目的 `disGetDayStockByGreatId` 接口实现。

### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| disId | Integer | 是 | 批发商ID |
| searchDepId | String | 否 | 部门ID（"-1"表示全部，暂未使用） |
| greatId | String | 是 | 商品大类ID |
| whichDay | Integer | 否 | 查询天数（0-今天，1-昨天，2-前天，3-3天前，4-4天前，99-全部） |
| type | Integer | 否 | 查询类型（0-按天，1-按周，2-按月，默认0） |

### 请求示例

```json
{
  "disId": 1,
  "searchDepId": "-1",
  "greatId": "10",
  "whichDay": 0,
  "type": 0
}
```

---

## 📊 返回数据结构

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "oneDay": {
      "arr": [
        // 商品列表（NxDistributerGoodsEntity）
      ],
      "dateString": "今天",
      "total": 12345.6
    }
  }
}
```

---

## 🔧 实现逻辑

### 1. 主接口流程

```
1. 接收请求参数（disId, searchDepId, greatId, whichDay, type）
   ↓
2. 根据whichDay判断查询范围
   - whichDay == 99 或 0：查询全部
   - 其他：查询指定天数前的库存
   ↓
3. 调用disGetStockDayStockByGreatId获取库存数据
   ↓
4. 返回结果
```

### 2. 日期范围计算

根据 `type` 参数选择不同的日期计算方式：

#### type = 0（按天）
- `whichDay = 0`：查询今天的库存
- `whichDay = 1`：查询昨天的库存
- `whichDay = -4`：查询4天前的库存（使用stopDate）

#### type = 1（按周，7天周期）
- `whichDay = 0`：查询本周的库存（今天往前推7天）
- `whichDay = -1`：查询1周前的库存（7天前往前推7天）
- `whichDay = -4`：查询3周以前的库存（使用stopDate）

#### type = 2（按月，30天周期）
- `whichDay = 0`：查询本月的库存（今天往前推30天）
- `whichDay = -1`：查询1个月前的库存（30天前往前推30天）
- `whichDay = -4`：查询3个月以前的库存（使用stopDate）

### 3. 辅助方法

#### `disGetStockDayStockByGreatId`
- **功能**：根据商品大类ID查询库存商品列表
- **参数**：
  - `disId`：批发商ID
  - `greatId`：商品大类ID
  - `which`：查询天数偏移量
  - `type`：查询类型
- **返回**：包含商品列表、日期说明、总金额的Map

#### `getDateRange`
- **功能**：根据偏移量和查询类型获取日期范围
- **返回**：`[startDate, stopDate]` 数组

#### `getDateString`
- **功能**：根据偏移量和查询类型获取汉字说明
- **示例**：
  - `offset=0, type=0` → "今天"
  - `offset=-1, type=0` → "昨天"
  - `offset=0, type=1` → "本周"
  - `offset=-1, type=2` → "1个月"

#### `getWeekStartDate` / `getWeekStopDate`
- **功能**：计算周的开始和结束日期（7天周期）

#### `getMonthStartDate` / `getMonthStopDate`
- **功能**：计算月的开始和结束日期（30天周期）

---

## 🔄 GB项目与NX项目的对应关系

| GB项目 | NX项目 | 说明 |
|--------|--------|------|
| `GbDepartmentGoodsStockService.queryDisGoodsStockByParams` | `NxDistributerGoodsShelfStockService.queryGoodsStockList` | 查询商品列表 |
| `queryGoodsStockCount` | `queryStockGoodsCount` | 查询商品数量 |
| `queryDepGoodsRestTotal` | `queryShelfStockRestTotal` | 查询剩余金额总额 |
| `disGoodsGreatId` | `disGoodsGreatId` | 商品大类ID参数 |
| `GbDistributerGoodsEntity` | `NxDistributerGoodsEntity` | 商品实体 |

---

## ⚠️ 注意事项

### 1. 废弃金额查询

GB项目中有 `queryDepGoodsWasteTotal` 方法查询废弃金额，但NX项目暂未实现对应方法。代码中已注释相关逻辑，如果需要可以：
- 使用 `NxDistributerGoodsShelfStockReduceService` 查询废弃记录
- 或添加对应的查询方法

### 2. 参数说明

- `whichDay`：
  - `null` 或 `99` 或 `0`：查询全部库存
  - `1-4`：查询对应天数前的库存
  - 负数：在内部方法中使用，表示往前推的天数
- `type`：
  - `0`：按天查询（默认）
  - `1`：按周查询（7天周期）
  - `2`：按月查询（30天周期）

### 3. 日期格式

- `DateUtils.formatWhatDay(n)`：返回日期字符串（如 "2025-12-04"）
- `getDateString`：返回中文日期说明（如 "今天"、"昨天"、"本周"）

### 4. 查询条件

- `restWeight: 0`：表示只查询有剩余库存的商品（剩余数量>0）
- `disGoodsGreatId`：通过商品分类的 `nx_dfg_fathers_father_id` 字段关联查询

---

## 📝 使用示例

### 查询今天的库存

```javascript
wx.request({
  url: 'http://your-domain.com/api/nxdistributergoodsshelfstock/disGetDayStockByGreatId',
  method: 'POST',
  data: {
    disId: 1,
    searchDepId: '-1',
    greatId: '10',
    whichDay: 0,
    type: 0
  },
  success: (res) => {
    console.log('库存数据:', res.data);
  }
});
```

### 查询本周的库存（按周）

```javascript
wx.request({
  url: 'http://your-domain.com/api/nxdistributergoodsshelfstock/disGetDayStockByGreatId',
  method: 'POST',
  data: {
    disId: 1,
    searchDepId: '-1',
    greatId: '10',
    whichDay: 0,
    type: 1  // 按周查询
  },
  success: (res) => {
    console.log('本周库存数据:', res.data);
  }
});
```

### 查询全部库存

```javascript
wx.request({
  url: 'http://your-domain.com/api/nxdistributergoodsshelfstock/disGetDayStockByGreatId',
  method: 'POST',
  data: {
    disId: 1,
    searchDepId: '-1',
    greatId: '10',
    whichDay: 99,  // 或 0
    type: 0
  },
  success: (res) => {
    console.log('全部库存数据:', res.data);
  }
});
```

---

## 🔍 调试建议

1. **查看日志**：接口中已添加 `System.out.println` 输出查询参数和结果
2. **检查Service方法**：确认 `queryGoodsStockList` 等方法已实现并支持 `disGoodsGreatId` 参数
3. **验证参数**：确保 `disId`、`greatId` 等参数正确传递
4. **数据库查询**：可以直接查询数据库验证数据是否正确

---

## 📞 相关文件

- **Controller**: `NxDistributerGoodsShelfStockController.java`
- **Service**: `NxDistributerGoodsShelfStockService.java`
- **DAO**: `NxDistributerGoodsShelfStockDao.xml`
- **参考接口**: `GbDepartmentGoodsStockController.disGetDayStockByGreatId`

---

## 🎯 功能特点

1. **支持多种时间维度**：按天、按周、按月查询
2. **灵活的日期范围**：支持查询今天、昨天、前天、3天前、4天前或全部
3. **商品分类查询**：根据商品大类ID查询库存
4. **完整的日志输出**：便于调试和问题排查

---

**创建时间**：2025-12-04  
**参考项目**：GB项目 `disGetDayStockByGreatId` 接口


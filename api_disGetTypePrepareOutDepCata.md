
# 按部门查询准备出库/采购的接口文档

## 接口1：查询部门列表

### 接口信息

- **接口路径**: `/api/nxdepartmentorders/disGetTypePrepareOutDepCata`
- **请求方法**: `POST`
- **接口描述**: 按部门查询准备出库或采购的部门列表，只返回部门信息（不包含商品分类），按部门订单数量降序排序

## 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| disId | Integer | 是 | 分销商ID |
| purType | Integer | 是 | 采购类型：<br/>- `0`: 出库商品（purchaseAuto = -1）<br/>- `1`: 采购商品（purchaseAuto = 1） |

### 返回数据结构

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "arr": [
      {
        "depId": 1370,
        "depName": "客订",
        "depFatherId": 1369,
        "depAttrName": "客订",
        "orderCount": 10
      }
    ],
    "stockCount": 5,
    "unPurCount": 3,
    "puringCount": 2
  }
}
```

### 返回字段说明

#### data 对象

| 字段名 | 类型 | 说明 |
|--------|------|------|
| arr | Array | 部门列表，按订单数量降序排序 |
| stockCount | Integer | 全局统计：出库商品数量 |
| unPurCount | Integer | 全局统计：未采购商品数量 |
| puringCount | Integer | 全局统计：采购中商品数量 |

#### arr 数组中的部门对象

| 字段名 | 类型 | 说明 |
|--------|------|------|
| depId | Integer | 部门ID |
| depName | String | 部门名称 |
| depFatherId | Integer | 部门父级ID |
| depAttrName | String | 部门属性名称 |
| orderCount | Integer | 该部门的订单数量 |

### 请求示例

#### 查询出库商品的部门列表（purType = 0）

```javascript
// 使用 axios
axios.post('/api/nxdepartmentorders/disGetTypePrepareOutDepCata', {
  disId: 153,
  purType: 0  // 出库商品
}).then(response => {
  console.log(response.data);
});
```

#### 查询采购商品的部门列表（purType = 1）

```javascript
// 使用 axios
axios.post('/api/nxdepartmentorders/disGetTypePrepareOutDepCata', {
  disId: 153,
  purType: 1  // 采购商品
}).then(response => {
  console.log(response.data);
});
```

---

## 接口2：根据部门ID查询商品分类、商品和订单

### 接口信息

- **接口路径**: `/api/nxdepartmentorders/disGetTypePrepareOutDepGoodsPage`
- **请求方法**: `POST`
- **接口描述**: 根据部门ID查询该部门的商品分类列表，每个分类下包含商品和订单信息

### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| disId | Integer | 是 | 分销商ID |
| depId | Integer | 是 | 部门ID（部门父级ID） |
| purType | Integer | 是 | 采购类型：<br/>- `0`: 出库商品（purchaseAuto = -1）<br/>- `1`: 采购商品（purchaseAuto = 1） |

### 返回数据结构

```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "arr": [
      {
        "nxDistributerFatherGoodsId": 19680,
        "nxDFGFatherGoodsName": "蔬菜",
        "nxDfgFatherGoodsSort": 1,
        "grandNxDfgFathersFatherId": null,
        "greatGrandNxDistributerFatherGoodsId": null,
        "greatGrandNxDfgFatherGoodsSort": null,
        "newOrderCount": 5,
        // 商品分类下的商品列表和订单信息
        // ... 其他商品分类相关字段
      }
    ]
  }
}
```

### 返回字段说明

#### data 对象

| 字段名 | 类型 | 说明 |
|--------|------|------|
| arr | Array | 商品分类列表，按大类sort排序，每个分类下包含商品和订单 |

#### arr 数组中的商品分类对象

| 字段名 | 类型 | 说明 |
|--------|------|------|
| nxDistributerFatherGoodsId | Integer | 商品分类ID（大类ID） |
| nxDFGFatherGoodsName | String | 商品分类名称 |
| nxDfgFatherGoodsSort | Integer | 商品分类排序号 |
| newOrderCount | Integer | 该分类下的订单数量 |
| ... | ... | 商品分类下的商品列表和订单信息（具体结构参考 `disGetTypePrepareOutCata` 接口） |

### 请求示例

```javascript
// 使用 axios
axios.post('/api/nxdepartmentorders/disGetTypePrepareOutDepGoodsPage', {
  disId: 153,
  depId: 1370,  // 部门ID
  purType: 0    // 出库商品
}).then(response => {
  console.log(response.data);
});
```

---

## 业务逻辑说明

### 接口1（部门列表）

1. **商品类型过滤**：
   - `purType = 0`：查询出库商品（`nxDgPurchaseAuto = -1`）
   - `purType = 1`：查询采购商品（`nxDgPurchaseAuto = 1`）

2. **部门排序**：
   - 部门列表按 `orderCount`（订单数量）降序排序
   - 订单数量多的部门排在前面

3. **订单状态过滤**：
   - 只查询 `status < 3` 且 `purStatus < 4` 的订单

4. **统计信息**：
   - `stockCount`：出库商品数量（`goodsType = -1`）
   - `unPurCount`：未采购商品数量（`goodsType = 1`, `batchId = 0`）
   - `puringCount`：采购中商品数量（`goodsType = 1`, `batchId = 1`）

### 接口2（商品分类）

1. **根据部门ID过滤**：
   - 只查询指定部门（`depFatherId = depId`）的商品分类

2. **商品类型过滤**：
   - `purType = 0`：查询出库商品（`nxDgPurchaseAuto = -1`）
   - `purType = 1`：查询采购商品（`nxDgPurchaseAuto = 1`）

3. **商品分类排序**：
   - 商品分类列表按 `nxDfgFatherGoodsSort`（大类排序号）排序

4. **订单状态过滤**：
   - 只查询 `status < 3` 且 `purStatus < 4` 的订单

## 注意事项

1. **接口1**：
   - `purType` 参数必须提供，用于区分查询出库商品还是采购商品
   - 当 `purType = 1` 时，查询条件会自动添加 `batchId = 0` 的限制
   - 部门列表已按订单数量降序排序，无需前端再次排序
   - 如果某个部门没有符合条件的订单，该部门不会出现在返回列表中

2. **接口2**：
   - `depId` 参数必须提供，用于指定查询的部门
   - `purType` 参数必须提供，用于区分查询出库商品还是采购商品
   - 商品分类列表已按大类排序号排序，无需前端再次排序
   - 返回的商品分类结构包含商品和订单信息，具体结构参考 `disGetTypePrepareOutCata` 接口

## 使用流程

1. 调用**接口1**获取部门列表（按订单数量排序）
2. 用户选择某个部门后，调用**接口2**，传入该部门的 `depId`，获取该部门的商品分类、商品和订单信息

## 相关接口

- `/api/nxdepartmentorders/disGetTypePrepareOutCata` - 按商品类别查询准备出库的分类（不按部门分组，返回所有部门的商品分类）


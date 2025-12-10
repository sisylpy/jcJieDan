# 货架商品层级管理说明

## 背景

为支持货架多层陈列及语音播报的层级提示，货架商品增加了“层尾标记”的概念。  
同一层的最后一个商品会记录层号，其余商品为空，从而准确标记每层的结束位置。

## 数据结构调整

- 表 `nx_distributer_goods_shelf_goods` 新增字段 `nx_DGSG_shelf_layer` (`INT`，可空)。  
  - `NULL` 表示该商品不是层尾。  
  - 正整数表示其所在层级的结束商品。

> **部署前请确保数据库已添加该列，否则接口会抛出 SQL 异常。**

## 新增接口

### 1. 设置层尾

- **URL**：`POST /api/nxdistributergoodsshelfgoods/setShelfLayer`
- **参数**：`shelfGoodsId`（必填）
- **行为**：
  - 按 `nxDgsgSort` 重新拉取该货架所有商品；
  - 将指定商品作为层尾插入层列表；
  - 自动对其后的层号整体顺延，保持层号连续。
- **返回示例**

```json
{
  "code": 0,
  "data": {
    "shelfId": 12,
    "assignedLayer": 3,
    "totalLayers": 5,
    "layers": [
      { "shelfGoodsId": 101, "layer": 1 },
      { "shelfGoodsId": 108, "layer": 2 },
      { "shelfGoodsId": 115, "layer": 3 },
      { "shelfGoodsId": 126, "layer": 4 },
      { "shelfGoodsId": 132, "layer": 5 }
    ]
  }
}
```

### 2. 取消层尾

- **URL**：`POST /api/nxdistributergoodsshelfgoods/clearShelfLayer`
- **参数**：`shelfGoodsId`（必填）
- **行为**：
  - 若目标商品当前是层尾，则清空其层号；
  - 将其后的层号整体向前收缩 1；
  - 若目标本就未标记层尾，则返回提示信息。
- **返回示例**

```json
{
  "code": 0,
  "data": {
    "shelfId": 12,
    "assignedLayer": null,
    "totalLayers": 4,
    "layers": [
      { "shelfGoodsId": 101, "layer": 1 },
      { "shelfGoodsId": 108, "layer": 2 },
      { "shelfGoodsId": 126, "layer": 3 },
      { "shelfGoodsId": 132, "layer": 4 }
    ]
  }
}
```

## 调用注意事项

- `shelfGoodsId` 对应的 `nxDistributerGoodsShelfGoodsEntity` 必须存在且归属同一货架。
- sort（`nxDgsgSort`）是层级计算基准，后台按照升序处理，仓库已假设该字段不重复。
- 接口内部使用 FIFO 逻辑维护层号，可放心插层、删层，始终保持层号从 1 连续递增。
- 接口返回值建议前端实时刷新，展示哪个商品是层尾以及总层数，便于语音或 UI 提示。

## 排错建议

- **报“货架商品不存在”**：检查 `shelfGoodsId` 是否正确、是否已删除。
- **报“货架暂无商品”**：目标货架为空，需先完成上架。
- **SQL 错误**：确认数据库字段 `nx_DGSG_shelf_layer` 是否已创建，类型是否为 `INT`。

## 后续扩展

- 若需支持批量调整层级，可基于 `queryShelfGoodsBasic` 拉取基础数据后一次性提交调整。
- 可在前端增加层标识 UI，调用上述接口实现拖拽或按钮式层级操作。


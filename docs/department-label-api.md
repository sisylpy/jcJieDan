# 配送商私有客户标签接口文档（前端对接）

## 1. 说明

- 现在标签体系分为两层：
  - 配送商标签主表：`nx_distributer_label`
  - 客户-标签关系表：`nx_department_distributer_label`
- 返回格式统一为 `R`（成功通常 `code = 0`）。

## 2. 路径

- 配送商标签管理：`/api/nxdistributerlabel`
- 客户标签关系：`/api/nxdepartmentlabel`
- 客户列表筛选：`/api/nxdepartment`

## 3. 接口总览

1. 配送商获取自己的标签列表
2. 配送商新增标签
3. 配送商修改标签
4. 配送商删除标签
5. 编辑客户标签时获取“标签列表+已选标签”
6. 对比同步客户标签（增删）
7. 获取客户已选标签 id
8. 按标签筛客户

## 4. 详细接口

### 4.1 配送商获取自己的标签列表

- **URL**: `GET /api/nxdistributerlabel/disGetLabels/{disId}`
- **用途**: 标签管理页展示当前配送商自己的全部标签

返回 `data` 为标签数组，单项结构：

```json
{
  "nxDistributerLabelId": 12,
  "nxDlDistributerId": 33,
  "nxDlName": "重点客户",
  "nxDlSort": 10,
  "nxDlStatus": 1
}
```

### 4.2 配送商新增标签

- **URL**: `POST /api/nxdistributerlabel/save`
- **Body(JSON)**:

```json
{
  "nxDlDistributerId": 33,
  "nxDlName": "账期客户",
  "nxDlSort": 20,
  "nxDlStatus": 1
}
```

> `nxDlSort` / `nxDlStatus` 可不传，后端默认 `0 / 1`。

### 4.3 配送商修改标签

- **URL**: `POST /api/nxdistributerlabel/update`
- **Body(JSON)**:

```json
{
  "nxDistributerLabelId": 12,
  "nxDlName": "重点客户-新",
  "nxDlSort": 5,
  "nxDlStatus": 1
}
```

### 4.4 配送商删除标签

- **URL**: `POST /api/nxdistributerlabel/delete/{labelId}`

示例：

`POST /api/nxdistributerlabel/delete/12`

### 4.5 编辑客户标签时获取数据（推荐）

- **URL**: `GET /api/nxdepartmentlabel/disGetLabelData?disId={disId}&depId={depId}`
- **用途**: 一次性获取
  - `labelList`: 该配送商的标签列表
  - `selectedLabelIds`: 该客户已选标签 id 列表

返回示例：

```json
{
  "code": 0,
  "disId": 33,
  "labelList": [
    {
      "nxDistributerLabelId": 12,
      "nxDlDistributerId": 33,
      "nxDlName": "重点客户",
      "nxDlSort": 10,
      "nxDlStatus": 1
    }
  ],
  "selectedLabelIds": [12, 15]
}
```

### 4.6 对比同步客户标签（推荐）

- **URL**: `POST /api/nxdepartmentlabel/disSyncDepartmentLabels`
- **Body(JSON)**:

```json
{
  "depId": 1001,
  "disId": 33,
  "labelIds": [12, 15, 18]
}
```

说明：

- 后端按差异增删，不做全量重建
- `labelIds` 可传空数组 `[]` 表示清空客户标签

### 4.7 获取客户已选标签 id

- **URL**: `GET /api/nxdepartmentlabel/getLabelIds/{depId}`

返回示例：

```json
{
  "code": 0,
  "data": [12, 15]
}
```

### 4.8 按标签筛客户

- 小程序/APP:
  - `GET /api/nxdepartment/disGetAllCustomer/{disId}?labelId={labelId}`
- Web:
  - `GET /api/nxdepartment/disGetAllCustomerWeb/{disId}?labelId={labelId}`

说明：

- `labelId` 不传：返回全部客户（原逻辑）
- `labelId` 传值：仅返回绑定该标签的客户

## 5. 前端调用建议

1. 标签管理页：调 `disGetLabels` 做 CRUD。
2. 客户标签弹窗：调 `disGetLabelData` 渲染可选项和选中态。
3. 保存客户标签：统一调 `disSyncDepartmentLabels`。
4. 点击标签筛选客户：客户列表接口带 `labelId`。

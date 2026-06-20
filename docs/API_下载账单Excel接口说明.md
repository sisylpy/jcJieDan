# 下载账单 Excel 接口说明

## 概述

客户页「下载Excel」功能需要后端提供接口，将指定账单的订单明细导出为 Excel 文件。

## 接口信息

| 项目 | 说明 |
|------|------|
| 路径 | `GET /api/download/downloadBillExcelNx` |
| 参数 | `billId` (必填) - 账单ID，即 `nxDepartmentBillId` |
| 返回 | 直接返回 `.xlsx` 文件流 |

## 请求示例

```
GET /nongxinle/api/download/downloadBillExcelNx?billId=123456
```

## 响应

- **成功**: `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- 返回 Excel 二进制流

### 响应头（文件名，必填）

前端从响应头读取文件名用于保存，支持以下任一方式：

1. **Content-Disposition**（推荐）:
   ```
   Content-Disposition: attachment; filename="账单_20250117_001.xlsx"
   ```
   或 RFC 5987 格式（中文需 URL 编码）:
   ```
   Content-Disposition: attachment; filename*=UTF-8''%E8%B4%A6%E5%8D%95_001.xlsx
   ```

2. **X-File-Name**（自定义头）:
   ```
   X-File-Name: 账单_20250117_001.xlsx
   ```

若未返回文件名，前端将使用默认名 `账单_{billId}.xlsx`。

## Excel 内容建议

参考 `issuePage` 的账单详情展示，建议包含：

| 列 | 说明 |
|----|------|
| 序号 | 行号 |
| 商品名称 | `nxDistributerGoodsEntity.nxDgGoodsName` |
| 品牌 | `nxDistributerGoodsEntity.nxDgGoodsBrand` |
| 数量 | `nxDoWeight` + `nxDoPrintStandard` |
| 单价 | `nxDoPrice` |
| 小计 | `nxDoSubtotal` |
| 退货数量 | 如有退货 |
| 退货金额 | 如有退货 |

表头可包含：单号、日期、部门、送货员等账单信息。

## 数据来源

- 账单数据：`nxdepartmentbill` 表
- 订单明细：`getBillApplys` 接口返回的 `bill.nxDepartmentOrdersEntities` 或 `applyArr`

## 参考

- 现有类似接口：`download/downloadReportExcelNx`（采购分析导出，参数：depFatherId、startDate、stopDate）

# 货架管理-API接口文档

## 1. 设置货架负责员工

### 接口说明
为指定货架设置负责员工

### 请求URL
```
POST /api/nxdistributergoodsshelf/setShelfUser
```

### 请求参数
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| shelfId | Integer | 是 | 货架ID |
| userId | Integer | 是 | 员工ID |

### 请求示例
```
POST /api/nxdistributergoodsshelf/setShelfUser
Content-Type: application/x-www-form-urlencoded

shelfId=1&userId=10
```

### 返回参数
| 参数名 | 类型 | 说明 |
|--------|------|------|
| code | Integer | 状态码，0表示成功 |
| msg | String | 返回消息 |
| data | Object | 更新后的货架实体 |

### 返回示例
```json
{
  "code": 0,
  "msg": "success",
  "data": {
    "nxDistributerGoodsShelfId": 1,
    "nxDistributerGoodsShelfName": "货架1",
    "nxDistributerGoodsShelfSort": 1,
    "nxDistributerGoodsShelfDisId": 1,
    "nxDistributerGoodsShelfUserId": 10,
    "responsibleUser": {
      "nxDistributerUserId": 10,
      "nxDiuWxNickName": "张三",
      "nxDiuWxPhone": "13800138000"
    }
  }
}
```

### 数据库变更
需要先执行 `添加货架负责员工字段.sql` 添加数据库字段


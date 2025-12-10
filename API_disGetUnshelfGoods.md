# 获取未上架商品列表接口文档

## 接口信息

- **接口名称：** 获取分销商未上架商品列表（分页）
- **接口地址：** `/api/nxdistributergoodsshelfgoods/disGetUnshelfGoods/{disId}`
- **请求方式：** `GET`
- **接口描述：** 查询指定分销商的所有未上架商品，支持分页查询

---

## 请求参数

### 路径参数（Path Parameters）

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| disId | Integer | 是 | 分销商ID |

### 查询参数（Query Parameters）

| 参数名 | 类型 | 必填 | 默认值 | 说明 |
|--------|------|------|--------|------|
| page | Integer | 否 | 1 | 当前页码，从1开始 |
| limit | Integer | 否 | 10 | 每页显示条数 |

---

## 请求示例

### 示例 1：获取第1页数据（使用默认每页10条）
```
GET /api/nxdistributergoodsshelfgoods/disGetUnshelfGoods/123
```

### 示例 2：获取第2页，每页显示20条
```
GET /api/nxdistributergoodsshelfgoods/disGetUnshelfGoods/123?page=2&limit=20
```

### 示例 3：获取第1页，每页显示50条
```
GET /api/nxdistributergoodsshelfgoods/disGetUnshelfGoods/123?page=1&limit=50
```

### JavaScript/Ajax 调用示例
```javascript
// 使用 jQuery
$.ajax({
    url: '/api/nxdistributergoodsshelfgoods/disGetUnshelfGoods/123',
    type: 'GET',
    data: {
        page: 1,
        limit: 20
    },
    success: function(response) {
        if (response.code === 0) {
            const pageData = response.page;
            console.log('商品列表:', pageData.list);
            console.log('总记录数:', pageData.totalCount);
            console.log('总页数:', pageData.totalPage);
        }
    }
});

// 使用 axios
axios.get('/api/nxdistributergoodsshelfgoods/disGetUnshelfGoods/123', {
    params: {
        page: 1,
        limit: 20
    }
}).then(response => {
    if (response.data.code === 0) {
        const pageData = response.data.page;
        console.log('商品列表:', pageData.list);
        console.log('总记录数:', pageData.totalCount);
    }
});
```

---

## 返回数据

### 返回格式
```json
{
    "code": 0,
    "msg": "success",
    "page": {
        "totalCount": 100,
        "pageSize": 10,
        "totalPage": 10,
        "currPage": 1,
        "list": [
            {
                "nxDistributerGoodsId": 1001,
                "nxDgGoodsName": "有机西红柿",
                "nxDgGoodsBrand": "绿源",
                "nxDgGoodsPlace": "山东",
                "nxDgGoodsStandardname": "500g/盒",
                "nxDgGoodsStandardWeight": "500",
                "nxDgGoodsFile": "/upload/goods/tomato.jpg",
                "nxDgGoodsFileLarge": "/upload/goods/tomato_large.jpg",
                "nxDgBuyingPrice": "8.50",
                "nxDgWillPriceOne": "12.00",
                "nxDgWillPriceTwo": "11.00",
                "nxDgWillPriceThree": "10.00",
                "nxDgGoodsSort": 1,
                "nxDgGoodsSonsSort": 1,
                "nxDgGoodsStatus": 1,
                "nxDgPullOff": 0,
                "nxDgGoodsPinyin": "youjixihongshi",
                "nxDgGoodsPy": "yjxhs"
            }
            // ... 更多商品
        ]
    }
}
```

### 返回字段说明

#### 基础响应字段

| 字段名 | 类型 | 说明 |
|--------|------|------|
| code | Integer | 响应状态码，0表示成功 |
| msg | String | 响应消息 |
| page | Object | 分页数据对象 |

#### 分页对象字段（page）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| totalCount | Integer | 总记录数 |
| pageSize | Integer | 每页显示条数 |
| totalPage | Integer | 总页数 |
| currPage | Integer | 当前页码 |
| list | Array | 商品列表数据 |

#### 商品对象字段（list 数组中的每个元素）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| nxDistributerGoodsId | Integer | 商品ID |
| nxDgGoodsName | String | 商品名称 |
| nxDgGoodsBrand | String | 商品品牌 |
| nxDgGoodsPlace | String | 商品产地 |
| nxDgGoodsDetail | String | 商品详情 |
| nxDgGoodsStandardname | String | 商品规格名称（如"500g/盒"） |
| nxDgGoodsStandardWeight | String | 商品规格重量 |
| nxDgGoodsFile | String | 商品图片URL（小图） |
| nxDgGoodsFileLarge | String | 商品图片URL（大图） |
| nxDgBuyingPrice | String | 采购价格 |
| nxDgWillPriceOne | String | 一级售价 |
| nxDgWillPriceTwo | String | 二级售价 |
| nxDgWillPriceThree | String | 三级售价 |
| nxDgPriceProfitOne | String | 一级利润率 |
| nxDgPriceProfitTwo | String | 二级利润率 |
| nxDgPriceProfitThree | String | 三级利润率 |
| nxDgGoodsSort | Integer | 商品排序 |
| nxDgGoodsSonsSort | Integer | 子商品排序 |
| nxDgGoodsStatus | Integer | 商品状态 |
| nxDgPullOff | Integer | 是否下架（0-否，1-是） |
| nxDgGoodsPinyin | String | 商品名称拼音全拼 |
| nxDgGoodsPy | String | 商品名称拼音简拼 |
| nxDgNxGoodsId | Integer | 关联的农心乐商品ID |
| nxDgNxFatherId | Integer | 父级商品ID |
| nxDgNxGrandId | Integer | 祖级商品ID |
| nxDgNxGreatGrandId | Integer | 曾祖级商品ID |
| nxDgPurchaseAuto | Integer | 自动采购标识 |

---

## 业务说明

### 什么是"未上架商品"？

未上架商品是指：
- 该商品属于指定的分销商
- 该商品未被隐藏（`nx_dg_goods_is_hidden = 0`）
- 该商品**未关联到任何货架**（在 `nx_distributer_goods_shelf_goods` 表中不存在关联记录）

### 数据排序

返回的商品列表按以下规则排序：
1. 优先按 `nxDgGoodsSort`（商品排序）升序
2. 其次按 `nxDgGoodsSonsSort`（子商品排序）升序

---

## 错误处理

### 常见错误码

| 错误码 | 说明 | 处理建议 |
|--------|------|----------|
| 0 | 请求成功 | - |
| 500 | 服务器内部错误 | 检查服务器日志，联系后端开发 |

### 异常情况处理

1. **分销商不存在：** 返回空列表，totalCount 为 0
2. **该分销商没有未上架商品：** 返回空列表，totalCount 为 0
3. **页码超出范围：** 返回空列表
4. **参数为空或非法：** 使用默认值（page=1, limit=10）

---

## 前端开发建议

### 1. 分页组件集成
```javascript
// Vue.js 示例
data() {
    return {
        goodsList: [],
        currentPage: 1,
        pageSize: 10,
        totalCount: 0
    }
},
methods: {
    loadGoods(page) {
        axios.get(`/api/nxdistributergoodsshelfgoods/disGetUnshelfGoods/${this.disId}`, {
            params: {
                page: page || this.currentPage,
                limit: this.pageSize
            }
        }).then(res => {
            if (res.data.code === 0) {
                this.goodsList = res.data.page.list;
                this.totalCount = res.data.page.totalCount;
                this.currentPage = res.data.page.currPage;
            }
        });
    },
    handlePageChange(page) {
        this.currentPage = page;
        this.loadGoods(page);
    }
}
```

### 2. 图片显示处理
```javascript
// 图片URL可能需要拼接域名
function getFullImageUrl(imagePath) {
    if (!imagePath) return '/default-goods.png';
    if (imagePath.startsWith('http')) return imagePath;
    return 'https://yourdomain.com' + imagePath;
}
```

### 3. 价格格式化
```javascript
// 价格显示格式化（保留2位小数）
function formatPrice(price) {
    return price ? '¥' + parseFloat(price).toFixed(2) : '¥0.00';
}
```

---

## 测试数据

可以使用以下参数进行测试：

```
# 测试分销商ID：123
# 预期结果：返回该分销商的未上架商品

GET /api/nxdistributergoodsshelfgoods/disGetUnshelfGoods/123?page=1&limit=10
```

---

## 更新日志

| 版本 | 日期 | 更新内容 |
|------|------|----------|
| v1.0 | 2025-11-06 | 初始版本，实现基础分页查询功能 |

---

## 联系方式

如有接口问题，请联系后端开发人员。


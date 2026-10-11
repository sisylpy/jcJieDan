# 老客户查询 SKILL（精彩接单 · 配送商端）

> 场景：配送商（老板端登录用户）在微信 AI 对话里，用自然语言查询**已有客户**的配送/订单/对账情况。
> 不覆盖新客获客（配送范围、配送费），那套后续单独做。

## 业务流程

```
用户意图
├─ "今天有哪些客户要送货"      → getTodayDeliveryCustomers → 今日配送客户卡片
├─ "XX 客户今天订了什么"        → getCustomerOrders(depFatherId) → 订单明细卡片
└─ "XX 客户这周欠多少 / 对账"   → getCustomerBill(depFatherId) → 对账卡片
```

## 接口依赖

| 接口 | 作用 | 前置条件 |
|------|------|----------|
| getTodayDeliveryCustomers | 今日有待配送单的客户清单 | 老板端已登录 |
| getCustomerOrders | 某客户今日订单明细 | 已知 depFatherId（可由客户名先问 getTodayDeliveryCustomers 拿到） |
| getCustomerBill | 某客户对账/账单 | 已知 depFatherId |

## 业务约束（铁律）

- 所有成功返回必须展示卡片，禁止纯文本罗列。
- 所有枚举值用英文，禁止中文 label。
- 不暴露任何写操作（下单/改单/打印）给微信 AI；本 SKILL 只读。
- depFatherId 必须来自上游接口原值，禁止编造。
- 涉及金额以 `structuredContent` 返回，单位「元」。

## 用户意图分流

- "今天要送谁" / "今天几个客户" → getTodayDeliveryCustomers
- "XX 订了啥" / "XX 今天的单" → getCustomerOrders
- "XX 欠多少" / "XX 对账" / "XX 账单" → getCustomerBill

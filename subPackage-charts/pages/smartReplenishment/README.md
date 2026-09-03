# boss-mini 智能备货模块边界

## 页面职责

- 本模块是桌面端独立“智能备货”的移动端投影，不是订单工作台的“订单提醒”。
- 主页面展示服务端 `/forecasts` 返回的完整 A/B 采购预估，并提供日期、等级、分类和商品搜索。
- 客户较多时必须进入独立 `customerPicker` 页面搜索和选择；主页面不得重新塞入长客户列表。
- A 级含义为“直接备货”，B 级含义为“联系确认”；C 级和服务端 abstain 结果不展示，客户端不得自行升级等级。

## 日期与客户口径

- “今天”只使用 catalog 返回的自然日 `forecastDate`，不得使用手机日期或按 02:30 切换的 `businessDate`。
- 支持今天、明天、未来 7 天和自定义范围；自定义单次最多 31 天，且不得超过 `maxForecastDate`。
- 首次进入默认选择有历史记录的第一个父客户；客户选择页同时提供“全部客户”。
- 全部客户预测仍由服务端逐客户预测后汇总，客户端不得先混合客户历史再计算。

## 库存与采购边界

- 预测 `/forecasts`、库存及活动采购 `/procurement-contexts`、人工新增 `/procurement-items` 是三个独立请求。
- 库存和采购状态只用于展示，不得删减、升级、降级或改写 A/B 预测结果。
- 状态读取失败必须显示“库存未知 / 状态未知”，不得伪造为 0 库存或“暂无采购”，并且不得开放“添加采购”。
- “采购中”只统计 `SHELF_REPLENISHMENT` 和 `SMART_REPLENISHMENT`；客户订单产生的 `ORDER_GENERATED` 必须排除。
- 用户点击并二次确认后，客户端只提交 `distributerId`、`goodsId`、`quantity`、`unit`。不得提交或伪造来源、业务事件、采购模式、货架号。
- 智能备货新增时没有货架号；真实入库时再选择当前配送商真实货架。服务端负责来源、事件和幂等去重。

## 身份与接口

- 设置页入口只对 `nxDiuAdmin == 0` 的老板账号显示；服务端 `PurchasePredictionLabController` 在 Owner 上下文存在时再次校验管理员角色。
- boss-mini 通过 Owner Token 请求 `/api/owner/purchase-prediction-lab/**`，网关校验请求中的配送商 ID 必须与登录账号一致。
- 商品图片与规格通过智能备货专用最小详情接口读取；服务端先校验商品属于当前配送商，只返回图片路径和展示所需规格，不调用开放的通用商品详情接口。
- 桌面端不带 Owner 上下文的原接口保持不变。

## 修改要求

修改本模块前必须同时阅读：

1. `nongxinle-server/docs/ai/purchase-prediction/smart-replenishment-change-log.md`
2. `nongxinle-server/docs/ai/purchase-prediction/smart-replenishment-procurement-boundary.md`
3. `nongxinle-server/docs/ai/purchase-prediction/replenishment-lifecycle-boundary.md`
4. 本文件
5. `boss-mini/docs/智能备货迁移-变更日志.md`

修改完成后必须更新变更日志和对应回归测试，尤其不能把订单提醒、订单采购、库存事实和独立智能备货预测重新混成一个口径。

## 商品图片与卡片展示

- 商品卡片优先使用配送商品大图、普通图；配送商品未单独上传图片时，继续使用 `nxDgNxFatherImg` 平台父类图，再使用平台商品大图/普通图；所有来源都没有时才显示小程序本地占位图。
- 服务端只返回图片相对路径，不拼接客户端域名；boss-mini 使用当前环境的 `server` 地址生成完整图片 URL。
- 图片、规格和视觉层级只是展示投影，不得参与 A/B 排序、可信度、预估数量、库存或采购状态判断。
- 卡片必须保持“商品 → 建议数量 → 库存/动作/采购 → 需求客户 → 预测依据”的阅读顺序，不能为了美化隐藏采购状态或客户需求。

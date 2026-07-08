# 派单分包（subPackage-routeDispatch）

**完整交接文档见：**

[`docs/route-dispatch/Route-Dispatch-Frontend-Handoff-20260622.md`](../../docs/route-dispatch/Route-Dispatch-Frontend-Handoff-20260622.md)

## 快速原则

- 前台只展示 / 点击 / 传参 / loading / `loadError`
- 业务数据：`setData({ pageViewModel })` 或 `setData({ pageData: result.data })`
- 缺字段 → 对应区块不显示或 `loadError`，不拼假数据、无合同红条
- 仅保留 `_pageView.js`、`_session.js`、`_driverDeliveryActions.js`

## 页面入口（app.json → routeDispatch 分包）

### 老板底部 Tab「配送」（正式）

主包 Tab 壳：`pages/dispatch/index/index`（swiper 三栏）

| 子 Tab | 正式组件路径 | 接口 |
|---|---|---|
| 分派中 | `pages/bossTab/sandbox/sandbox` | `GET dispatch/sandbox/today` |
| 装车中 | `pages/bossTab/myLoading/myLoading` | `GET loading/today` |
| 配送中 | `pages/bossTab/myDelivery/myDelivery` | `GET delivery/today` |

### 测试页（homePage 菜单，后续可删）

| 页面 | 路径 |
|---|---|
| 司机可派状态 | `pages/routeDispatch/duty/duty` |
| 今日派车 | `pages/routeDispatch/today/today` |
| 装车 | `pages/routeDispatch/loading/loading` |
| 配送任务 | `pages/routeDispatch/delivery/delivery` |
| 司机装车 | `pages/routeDispatch/driverLoading/driverLoading` |
| 司机配送 | `pages/routeDispatch/driverDelivery/driverDelivery` |
| 站点详情 | `pages/routeDispatch/driverStopDetail/driverStopDetail` |
| 人工调度 | `pages/routeDispatch/manualDispatchDrivers/manualDispatchDrivers` |
| 人工路线编辑 | `pages/routeDispatch/manualRouteEdit/manualRouteEdit` |

API：`lib/apiRouteDispatch.js`

**入口：** 管理首页 `subPackage/pages/management/homePage` → 派单菜单（9 页中 7 个直达，2 个链式：`manualDispatch*`）。

**静态审计：** 见交接文档 **§18**（2026-06-22 adapter 删除后全仓搜索结论）。

## 司机端（KNOWN GAP）

- `driverLoading` / `driverDelivery` / `driverStopDetail` 当前**临时**调用老板端 `GET loading/today`、`GET delivery/today`（传 `driverUserId` 过滤）。
- 旧 HTTP **`driver/loading/today`、`driver/delivery/today` 已删除**；`apiRouteDispatch.js` 中 `getDriverLoadingToday` / `getDriverDeliveryToday` 为遗留封装，**不是**司机正式接口，**勿迁回**。
- 后续应由**后台提供新的司机端 `pageViewModel`**（及 `stopDetail` 等子节点），前台 `setData` 直读即可；不是接回旧 `driver/*/today`。

详见交接文档 §2.7–§2.9、§13–§14、§18.7。

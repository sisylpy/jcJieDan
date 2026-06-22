# 派单分包（subPackage-routeDispatch）

**完整交接文档见：**

[`docs/route-dispatch/Route-Dispatch-Frontend-Handoff-20260622.md`](../../docs/route-dispatch/Route-Dispatch-Frontend-Handoff-20260622.md)

## 快速原则

- 前台只展示 / 点击 / 传参 / loading / `loadError`
- 业务数据：`setData({ pageViewModel })` 或 `setData({ pageData: result.data })`
- 缺字段 → 对应区块不显示或 `loadError`，不拼假数据、无合同红条
- 仅保留 `_pageView.js`、`_session.js`、`_driverDeliveryActions.js`

## 页面入口（app.json → routeDispatch 分包）

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

**重要：** 司机端 `driverLoading` / `driverDelivery` 当前调用老板端 `GET loading/today`、`GET delivery/today`（非 `driver/*/today`），见交接文档 §13–§14、§18.6。

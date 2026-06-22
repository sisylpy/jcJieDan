# 派单前台交接文档（Route Dispatch Frontend Handoff）

> 更新日期：2026-06-22  
> 分包路径：`subPackage-routeDispatch/`  
> API 封装：`lib/apiRouteDispatch.js`  
> 原则：**前台只展示、点击、传参、loading/error；业务 ViewModel 由后端提供。**

---

## 1. 核心原则

```text
宁可少留，不要多留。
少了以后可以补。
多留会造成歧义。
```

- 缺字段 → 页面自然不显示，或显示 `loadError`（如「后端未返回 pageViewModel」），**不在前台拼业务文案或假数据**。
- **adapter 层已删除**；仅保留 `_pageView.js`（取根 + 点击索引）与 `_session.js`、`_driverDeliveryActions.js`。
- **禁止恢复**旧组装逻辑与业务兜底（见第 9 节）。

---

## 2. 派单前台页面总表

### 2.1 今日派车页

| 项 | 内容 |
|---|---|
| **页面** | 今日派车 |
| **文件路径** | `subPackage-routeDispatch/pages/routeDispatch/today/` |
| **接口** | `GET /api/nxdisroutedispatch/sandbox/today`（`getSandboxToday`，注释标注可迁 `getDispatchSandboxToday`） |
| **正式数据根** | `result.data.pageViewModel` |
| **是否 pageViewModel** | 是（唯一读模型根） |
| **是否 storeCard / driverCard** | 否；消费 `sections[].cards[]`（`DRIVER_ROUTE` / `UNASSIGNED_CUSTOMER` 等） |
| **仍依赖 helper** | `_pageView.js`、`_session.js` |
| **当前前台行为** | `setData({ pageViewModel })`；WXML 直读 `pageViewModel.*` |
| **禁止前端兜底** | `司机 N`、`scheduleHeadline` 拼装、`topMetrics` 对象转数组、`cardKey` 合成 |

### 2.2 装车页（老板端）

| 项 | 内容 |
|---|---|
| **页面** | 司机装车（调度端） |
| **文件路径** | `subPackage-routeDispatch/pages/routeDispatch/loading/` |
| **接口** | `GET /api/nxdisroutedispatch/loading/today` |
| **正式数据根** | `result.data.pageViewModel` |
| **是否 pageViewModel** | 是 |
| **是否 storeCard / driverCard** | 否；同 today 结构 |
| **仍依赖 helper** | `_pageView.js`、`_session.js` |
| **当前前台行为** | 同上 |
| **禁止前端兜底** | 同上 |

### 2.3 配送任务页（老板端）

| 项 | 内容 |
|---|---|
| **页面** | 配送任务 |
| **文件路径** | `subPackage-routeDispatch/pages/routeDispatch/delivery/` |
| **接口** | `GET /api/nxdisroutedispatch/delivery/today` |
| **正式数据根** | `result.data.pageViewModel` |
| **是否 pageViewModel** | 是（目标态） |
| **是否 storeCard / driverCard** | 否 |
| **仍依赖 helper** | `_pageView.js`、`_session.js` |
| **当前前台行为** | 同上；缺 `pageViewModel` 显示 `loadError` |
| **禁止前端兜底** | 从 `executionDriverRoutes` 组装司机卡/时间轴 |

### 2.4 人工调度司机选择页

| 项 | 内容 |
|---|---|
| **页面** | 人工调度 |
| **文件路径** | `subPackage-routeDispatch/pages/routeDispatch/manualDispatchDrivers/` |
| **接口** | `POST /api/nxdisroutedispatch/sandbox/manual-dispatch/driver-panorama` |
| **正式数据根** | `result.data`（根级，非嵌套 pageViewModel） |
| **是否 pageViewModel** | 否 |
| **是否 storeCard / driverCard** | **是**：`storeCard` + `drivers[]`（字段在项顶层，同 `driverCards[]` 形态） |
| **仍依赖 helper** | 无（`setData({ pageData: result.data })`） |
| **当前前台行为** | WXML 直读 `pageData.storeCard`、`pageData.drivers[]`、`pageData.summary` |
| **禁止前端兜底** | `summaryLine` 拼装、`暂无可选司机` 硬编码、`可确认落库` 文案 |

### 2.5 人工路线编辑页

| 项 | 内容 |
|---|---|
| **页面** | 人工路线编辑 |
| **文件路径** | `subPackage-routeDispatch/pages/routeDispatch/manualRouteEdit/` |
| **接口** | `POST /api/nxdisroutedispatch/sandbox/manual-dispatch/edit-page` |
| **正式数据根** | `result.data.pageViewModel` |
| **是否 pageViewModel** | 是 |
| **是否 storeCard / driverCard** | 否；`pageViewModel.customer` + `pageViewModel.driver` |
| **仍依赖 helper** | `_pageView.js` |
| **当前前台行为** | WXML 直读 `pageViewModel.routeTimeline[]` 等；无 timeline 则不展示 |
| **禁止前端兜底** | 从 `baselineRoute.stops` 拼 timeline、`模拟后：`、`已选择：`、`人工约束：未设置` |

### 2.6 司机可派状态页

| 项 | 内容 |
|---|---|
| **页面** | 司机可派状态 |
| **文件路径** | `subPackage-routeDispatch/pages/routeDispatch/duty/` |
| **接口** | `GET /api/nxdisroutedispatch/drivers/available`；写：`POST .../duty/on|off` |
| **正式数据根** | `result.data`（`driverCards[]` + `summary`） |
| **是否 pageViewModel** | 否 |
| **是否 storeCard / driverCard** | **是**：`driverCards[]` |
| **仍依赖 helper** | 无 |
| **当前前台行为** | `setData({ pageData })`；WXML 读 `pageData.driverCards[]`、`pageData.summary.summaryLine` |
| **禁止前端兜底** | 前台统计 `onDutyCount`、`暂无司机` 业务 empty |

### 2.7 司机端装车页

| 项 | 内容 |
|---|---|
| **页面** | 我的装车 |
| **文件路径** | `subPackage-routeDispatch/pages/routeDispatch/driverLoading/` |
| **接口** | **实际调用**：`GET /api/nxdisroutedispatch/loading/today`（`getDispatchLoadingToday`，传 `disId` + `driverUserId`）<br>**未使用**：`GET driver/loading/today`（`getDriverLoadingToday`） |
| **正式数据根** | `result.data.pageViewModel` |
| **是否 pageViewModel** | 是 |
| **是否 storeCard / driverCard** | 否；`stopList[]` + `pageHeader` |
| **仍依赖 helper** | `_pageView.js`、`_session.js` |
| **当前 known gap** | **高风险：司机端复用老板端 `loading/today`** |
| **禁止前端兜底** | `sections→stopList` flatten、`summaryCard` 重命名 |

### 2.8 司机端配送页

| 项 | 内容 |
|---|---|
| **页面** | 我的配送 |
| **文件路径** | `subPackage-routeDispatch/pages/routeDispatch/driverDelivery/` |
| **接口** | **实际调用**：`GET /api/nxdisroutedispatch/delivery/today`（`getDispatchDeliveryToday`，传 `disId` + `driverUserId`）<br>**未使用**：`GET driver/delivery/today`（`getDriverDeliveryToday`） |
| **正式数据根** | `result.data.pageViewModel` |
| **是否 pageViewModel** | 是 |
| **是否 storeCard / driverCard** | 否；`stopList[]` + `timeline[]` |
| **仍依赖 helper** | `_pageView.js`、`_driverDeliveryActions.js`、`_session.js` |
| **当前 known gap** | **高风险：司机端复用老板端 `delivery/today`**（见 §13） |
| **禁止前端兜底** | 按 status 猜按钮、拼 `deliveryStatusLabel` |

### 2.9 司机站点详情页

| 项 | 内容 |
|---|---|
| **页面** | 配送客户详情 |
| **文件路径** | `subPackage-routeDispatch/pages/routeDispatch/driverStopDetail/` |
| **接口** | 暂用 `GET loading/today` 或 `GET delivery/today`（同司机端列表） |
| **正式数据根** | `result.data.pageViewModel.stopDetail`（目标态） |
| **是否 pageViewModel** | 是（子节点 `stopDetail`） |
| **是否 storeCard / driverCard** | 否 |
| **仍依赖 helper** | `_pageView.js`、`_driverDeliveryActions.js` |
| **当前前台行为** | 只读 `pageViewModel.stopDetail`；无则显示「后端暂未返回 stopDetail」 |
| **禁止前端兜底** | 从大列表遍历 stop 拼详情、`executionDriverRoutes[]` |

---

## 3. helper 职责表（adapter 已删除）

### `_pageView.js`（新增，极薄）

| 项 | 内容 |
|---|---|
| **被引用** | today、loading、delivery、manualRouteEdit、driverLoading、driverDelivery、driverStopDetail |
| **保留原因** | 统一从 `data.pageViewModel` 取值；点击时按 section/card 索引取节点 |
| **函数** | `getPageViewModel(data)`、`pickSectionCard(vm, si, ci)`、`pickTimelineNode(vm, si, ci, ni)` |
| **不做** | 合同校验、字段搬运、emptyPageView、头像 URL 拼接 |

### `_session.js`

| 项 | 内容 |
|---|---|
| **被引用** | today、loading、delivery、duty、driverLoading、driverDelivery、driverStopDetail |
| **保留原因** | 会话与日期与业务 ViewModel 无关 |
| **现在只做什么** | `resolveSession()`、`getTodayDateStr()` |
| **业务组装** | 否 |
| **fallback** | 多路径读 `disId`（storage 结构兼容） |
| **未来删除条件** | 全局 auth 模块统一后可内联到 app |

### `_driverDeliveryActions.js`

| 项 | 内容 |
|---|---|
| **被引用** | driverDelivery、driverStopDetail |
| **保留原因** | 配送完成/异常 **API 提交** + 异常类型 ActionSheet |
| **现在只做什么** | `submitDeliveryComplete`、`submitDeliveryException` |
| **业务组装** | 否（已删 `resolveStopDeliveryActions`） |
| **fallback** | toast 文案、空 `remark` |
| **未来删除条件** | 可保留为 action 层，或并入 page.js |

### 各 `page.js`

| 项 | 内容 |
|---|---|
| **职责** | onLoad、loadData、setData(`pageViewModel` / `pageData`)、事件、loading、`loadError` |
| **禁止** | 拼 pageViewModel、拼 timeline、合同校验红条 |

---

## 4. 页面消费形态一览

| 页面 | 数据根 | 状态 |
|---|---|---|
| 今日派车 | `pageViewModel` | 已只消费 pageViewModel |
| 装车（老板） | `pageViewModel` | 已只消费 pageViewModel |
| 配送任务（老板） | `pageViewModel` | 已只消费；**pageViewModel 待部署验证** |
| 人工调度 | `storeCard` + `drivers[]` | 已只消费 |
| 人工路线编辑 | `pageViewModel` | 已只消费；**routeTimeline 待部署验证** |
| 司机可派状态 | `driverCards[]` + `summary` | 已只消费 |
| 司机装车 | `pageViewModel` | 已只消费；**接口混用老板端 loading/today** |
| 司机配送 | `pageViewModel` | 已只消费；**接口混用老板端 delivery/today** |
| 站点详情 | `pageViewModel.stopDetail` | **KNOWN GAP**；无 stopDetail 显示文案 |

### 已删除的 adapter 文件（2026-06-22）

`_todayViewModel.js`、`_driverHelpers.js`、`_manualRouteEditAdapter.js`、`_manualDispatchViewModel.js`、`_driverDutyViewModel.js`

删除内容：`mapTodayDispatchPageView`、`buildDriver*PageView`、`normalizeManualRouteEditPage`、`mapManualDispatchDriverPanorama`、`mapDriverDutyPage`、`pushContractError`、`empty*PageView`、`contractErrors`、`viewModelErrors`、`resolveImageUrl`（adapter 内）、`pickViewModelRoot`、timeline 组装链。

---

## 5. 已删除的旧组装逻辑

| 已删除 | 说明 |
|---|---|
| 整文件 `_helpers.js`（原 ~3880 行） | `buildExecutionPageView`、`buildLoadingPageView`、`mapDriverDutyList` 等 |
| `components/manualRouteStopCard/` | 无引用孤儿组件 |
| `_manualRouteEditAdapter` timeline 组装链 | `buildTimelineFromRoute`、`mapInsertButtons` 等 |
| `_todayViewModel.mapTopMetricsUi` 对象分支 | 硬编码「名司机/个客户/…」 |
| `_driverHelpers` sections→stopList | flatten |
| `_driverHelpers.pickViewModelRoot` 多嵌套 | legacy 根路径 |
| `_driverDeliveryActions.resolveStopDeliveryActions` | 死代码 |
| `_driverDutyViewModel.onDutyCount` 客户端统计 | — |
| WXML `人工约束：未设置`、`暂无司机` 等 | 业务兜底文案 |
| 五个 adapter 整文件 | 合同校验 + pageView 组装层 |
| `viewmodel-error-panel` / `contractErrors` 红条 | 全页面 WXML |

---

## 6. 禁止恢复的旧兜底逻辑

```text
司机 1 / 司机 N
0.0 km / 0 分钟
未设置 / 待后端补充（业务展示）
buildExecutionPageView / buildLoadingPageView / buildDriverStopDetailView
从 executionDriverRoutes[] 遍历拼详情
从 baselineRoute.stops 拼 routeTimeline
拼 summaryLine / routeStatsLine / scheduleHeadline / 模拟后：/ 已选择：
topMetrics 对象转数组（前台拼 icon+label）
cardKey = 'driver-' + driverUserId
缺 driverName 补假名
缺距离时间补 0
```

---

## 7. 后端缺字段时的前台行为（无合同红条）

| 页面 | 后端应返回 | 当前前台行为 | 后续由后台补 |
|---|---|---|---|
| today/loading/delivery | `data.pageViewModel` | 无则 `loadError: 后端未返回 pageViewModel` | 完整 pageViewModel |
| duty | `driverCards[]`、`summary` | 无数据则 `loadError`；字段缺则 WXML 不渲染 | `summary.summaryLine`、tone/badge |
| manualDispatch | `storeCard`、`drivers[]`、`summary` | WXML 直读 `pageData.drivers[]` 项顶层字段 | `summary.summaryLine` |
| manualRouteEdit | `pageViewModel.routeTimeline[]` 等 | 无 timeline 区块为空 | routeTimeline、simulationSummary |
| driverLoading/Delivery | `pageViewModel` | 直读 `pageViewModel.stopList` 等 | 司机专用 API + VM |
| driverStopDetail | `pageViewModel.stopDetail` | 无则「后端暂未返回 stopDetail」 | stopDetail 读模型 |

**不再检测** `executionDriverRoutes[]`、`loadingDriverRoutes[]`、`plan.driverRoutes[]` 等旧形态。

---

## 8. 后端待补 / 待部署验证字段清单

> 低 token 阶段逐个对接；**前台不为这些字段恢复组装或合同红条。**  
> 缺字段 → 对应 UI 区块不显示，或 `loadError` 提示。

### 8.1 待部署验证（后端已补，勿写死为「一定缺」）

| 字段 | 页面 | 后端说明 | 部署后验证点 | 优先级 |
|---|---|---|---|---|
| `data.pageViewModel` | 配送任务（老板）`delivery/today` | GET delivery/today 已返 pageViewModel | 列表/卡片正常渲染 | P0 |
| `pageViewModel.routeTimeline[]` | 人工路线编辑 | POST edit-page 已写入 | 时间轴 + 插入按钮 | P0 |
| `pageViewModel.simulationSummary` | 人工路线编辑 | 选中 manualStopSeq 后返回 | 模拟摘要行 | P0 |
| `summary.summaryLine` | 司机可派 / 人工调度 | DTO 已补 summaryLine | 顶部摘要行 | P0 |

### 8.2 仍待后端补（非「已补待验证」）

| 字段 | 页面 | 当前前台表现 | 阻塞打开 | 后端补后前台可删 | 优先级 |
|---|---|---|---|---|---|
| `pageViewModel.selectedPositionHint` | 人工路线编辑 | 选中后提示区为空 | 否 | — | P0 |
| `pageViewModel.drawerSubtitle` | 人工路线编辑 | 抽屉副标题空 | 否 | — | P1 |
| `pageViewModel.bottomHint` | 人工路线编辑 | 底栏 hint 空 | 否 | — | P2 |
| `incomingManualTimeConstraint.summaryLabel` | 人工路线编辑 | 约束摘要不显示 | 否 | — | P1 |
| `routeTimeline[].stop.manualConstraintSummary` | 人工路线编辑 | 插入站约束不显示 | 否 | — | P1 |
| `pageViewModel.topMetrics[]` | 今日/装车/配送 | 顶栏指标区不显示 | 否 | — | P1 |
| `driverCards[].dutyBadgeTone` 等 | 可派状态 | badge 样式类可能无效 | 否 | — | P2 |
| `drivers[]` 顶层字段 | 人工调度 | 曾误绑 `driver.driverCard.*` 导致空白 | 已改 WXML 直读 `item.*` |
| `drivers[].confirmHintLabel` | 人工调度 | 无确认提示 | 否 | — | P2 |
| `pageViewModel.stopDetail` | 站点详情 | 显示「后端暂未返回 stopDetail」 | 是（详情） | 详情读模型 | P0 |
| `pageViewModel.stopList[]` 等 | 司机端 | 列表区为空 | 视环境 | — | P0 |
| `driverAvatarUrl` 相对路径 | duty/manualDispatch | 头像可能裂图（已删 adapter URL 拼接） | 否 | 后端返完整 URL | P2 |

### 8.3 历史条目（已合并到 8.1/8.2，勿重复修字段）

<details>
<summary>展开旧表（归档）</summary>

| 字段 | 页面 | 备注 |
|---|---|---|
| `pageViewModel.simulationSummary.routeSummary` | 人工路线编辑 | 已并入 8.1 simulationSummary |
| `pageViewModel.simulationSummary.deltaLine` | 人工路线编辑 | P1，非阻塞 |
| `summary.summaryLine` | duty / manual-dispatch | 已并入 8.1 |

</details>

---

## 12. 页面入口与跳转关系表

**统一入口：** `subPackage/pages/management/homePage/homePage`（管理首页菜单 `onRouteMenuTap` / `navigateRouteDispatch`）。

| 页面 | 路径 | 入口来源 | 入口参数 | 是否有效 | 风险 |
|---|---|---|---|---|---|
| 司机可派状态 | `duty/duty` | homePage 菜单 | 无 | 是 | 低 |
| 今日派车 | `today/today` | homePage 菜单 | 无 | 是 | today 用 deprecated `getSandboxToday` |
| 装车（老板） | `loading/loading` | homePage 菜单 | 无 | 是 | 低 |
| 配送任务（老板） | `delivery/delivery` | homePage 菜单 | 无 | 是 | pageViewModel 待部署验证 |
| 我的装车 | `driverLoading/driverLoading` | homePage 菜单 | 无（session 取 driverUserId） | 是 | **混用老板 loading/today** |
| 我的配送 | `driverDelivery/driverDelivery` | homePage 菜单 | 无 | 是 | **混用老板 delivery/today** |
| 人工调度 | `manualDispatchDrivers/` | **仅** today 页 `START_MANUAL_DISPATCH` | storage：`routeDispatchManualDispatchPayload`（含 `driverPanoramaPath` 等） | 是 | 无 URL 参数，缺 payload 则 empty |
| 人工路线编辑 | `manualRouteEdit/` | **仅** manualDispatchDrivers `onSimulateAction` | storage：`routeDispatchManualRouteEditPayload` | 是 | 无 URL 参数 |
| 站点详情 | `driverStopDetail/` | **仅** driverDelivery `onStopTap` | URL：`deliveryStopId`、`source=delivery` | 是 | KNOWN GAP stopDetail；**也混用老板 GET** |

**分包内跳转链：**

```text
homePage → today → (primaryAction START_MANUAL_DISPATCH) → manualDispatchDrivers
         → manualDispatchDrivers → (simulate) → manualRouteEdit
homePage → driverDelivery → driverStopDetail
```

**无入口 / 不可直达：**

- `manualDispatchDrivers`、`manualRouteEdit`：无 homePage 菜单项，必须从 today 链进入。
- `driverStopDetail`：无菜单，必须从司机配送列表进入。

**旧入口：**

- `subPackage/pages/routeDispatch/`：**已不存在**（磁盘无此目录）。
- `pages/driver/index`：**不在 app.json**，非当前派单主链。
- `subPackage-charts/.../route/`：**已删除**，git 状态为 D。

---

## 13. API service 方法总表（`lib/apiRouteDispatch.js`）

| 方法 | HTTP | 路径 | 调用页面 | 正式/旧链 | 前端可删 |
|---|---|---|---|---|---|
| `getDispatchSandboxToday` | GET | `dispatch/sandbox/today` | **无** | 正式（推荐） | 否，待 today 迁移 |
| `getSandboxToday` | GET | `sandbox/today` | **today.js** | deprecated 调试链 | 迁上项后可删调用 |
| `getDispatchLoadingToday` | GET | `loading/today` | loading.js、**driverLoading.js**、driverStopDetail | 老板正式；**司机端混用** | 司机迁走后仍保留老板 |
| `getDispatchDeliveryToday` | GET | `delivery/today` | delivery.js、**driverDelivery.js**、driverStopDetail | 老板正式；**司机端混用** | 同上 |
| `getDriverLoadingToday` | GET | `driver/loading/today` | **无引用** | 正式（司机专用） | API 保留，待司机页接入 |
| `getDriverDeliveryToday` | GET | `driver/delivery/today` | **无引用** | 正式（司机专用） | 同上 |
| `getAvailableDrivers` | GET | `drivers/available` | duty.js | 正式 | 否 |
| `driverCheckIn` / `driverCheckOut` | POST | `drivers/{id}/duty/on|off` | duty.js | 正式 | 否 |
| `confirmSandboxStop` | POST | `sandbox/stops/confirm` | today.js | 正式 | 否 |
| `returnSandboxStopToSandbox` | POST | `sandbox/stops/{id}/return-to-sandbox` | today.js | 正式 | 否 |
| `enterDriverRouteLoading` | POST | `driver-routes/{id}/enter-loading` | today.js | 正式 | 否 |
| `returnDriverRouteToDispatch` | POST | `driver-routes/{id}/return-to-dispatch` | loading.js | 正式 | 否 |
| `confirmTaskLoading` | POST | `tasks/{id}/confirm-loading` | driverLoading.js | 正式 | 否 |
| `confirmRouteLoadingAll` | POST | `driver-routes/{id}/confirm-loading-all` | driverLoading.js | 正式 | 否 |
| `confirmDriverDepart` | POST | `drivers/{id}/depart` | driverLoading.js | 正式 | 否 |
| `completeDeliveryStop` | POST | `delivery/stops/{id}/complete` | _driverDeliveryActions | 正式 | 否 |
| `markDeliveryStopException` | POST | `delivery/stops/{id}/exception` | _driverDeliveryActions | 正式 | 否 |
| `postManualDispatchDriverPanorama` | POST | `sandbox/manual-dispatch/driver-panorama`（或 payload 路径） | manualDispatchDrivers | 正式 | 否 |
| `postManualDispatchEditPage` | POST | `sandbox/manual-dispatch/edit-page` | manualRouteEdit | 正式 | 否 |
| `simulateRoute` | POST | `simulate` | **无引用** | deprecated 调试 | 前端无引用，可标后端仅调试 |
| `getDrivers` | GET | `drivers` | **无引用** | 正式 | 前端无引用 |
| `getPlanToday` | GET | `plan/today` | **无引用** | legacy | 前端无引用 |
| `getPlanById` | GET | `plan/{id}` | **无引用** | 正式 CRUD | 前端无引用 |
| `getTaskById` | GET | `tasks/{id}` | **无引用** | 正式 CRUD | 前端无引用 |
| `assignTask` / `moveTask` / `unlockTask` | POST | `tasks/{id}/...` | **无引用** | 正式写操作 | 前端无引用 |
| `overrideTaskTimeWindow` | POST | `tasks/{id}/time-window` | **无引用** | 正式 | 前端无引用 |
| `preview` / `confirm` / `eligibleDrivers` | — | — | **不存在于 api 文件** | 旧链已禁止 | — |

---

## 14. 老板端与司机端接口边界

| 页面 | 角色 | 当前实际 HTTP | 应用接口 | 是否混用 | 处理建议 |
|---|---|---|---|---|---|
| today | 老板 | `GET sandbox/today` | getSandboxToday | 否（但应用 deprecated 路径） | 低 token：改 getDispatchSandboxToday |
| loading | 老板 | `GET loading/today` | getDispatchLoadingToday | 否 | — |
| delivery | 老板 | `GET delivery/today` | getDispatchDeliveryToday | 否 | pageViewModel 待部署验证 |
| duty | 老板 | `GET drivers/available` | getAvailableDrivers | 否 | — |
| manualDispatch* | 老板 | POST sandbox/manual-dispatch/* | postManual* | 否 | — |
| driverLoading | **司机** | `GET loading/today` + disId + driverUserId | getDispatchLoadingToday | **是（高风险）** | 迁 `getDriverLoadingToday` → `driver/loading/today` |
| driverDelivery | **司机** | `GET delivery/today` + disId + driverUserId | getDispatchDeliveryToday | **是（高风险）** | 迁 `getDriverDeliveryToday` → `driver/delivery/today` |
| driverStopDetail | **司机** | 同上（按 source 二选一） | getDispatch*Today | **是** | 待 stopDetail 专用 API |

**结论：** `getDriverLoadingToday` / `getDriverDeliveryToday` 已在 `apiRouteDispatch.js` 定义，**派单分包页面未使用**；司机三页实际走老板读接口并靠 `driverUserId` 过滤。这是架构级 known gap，低 token 阶段单独迁移，本轮不改代码。

---

## 15. 旧入口 / 孤儿页面清单

| 路径 | 是否有入口 | 是否保留 | 处理建议 |
|---|---|---|---|
| `duty` | homePage | 保留 | — |
| `today` | homePage | 保留 | API 路径待迁正式 |
| `loading` | homePage | 保留 | — |
| `delivery` | homePage | 保留 | — |
| `driverLoading` | homePage | 保留 | 待迁司机 API |
| `driverDelivery` | homePage | 保留 | 待迁司机 API |
| `manualDispatchDrivers` | today 链 only | 保留 | 非孤儿 |
| `manualRouteEdit` | manualDispatch 链 only | 保留 | 非孤儿 |
| `driverStopDetail` | driverDelivery 链 only | 保留 | KNOWN GAP |
| `subPackage/pages/routeDispatch/*` | 无 | **已不存在** | 勿恢复 |
| `pages/driver/index` | 不在 app.json | 仓库可能有残留 | **非派单分包**，不扩 scope 删 |
| `components/manualRouteStopCard` | 无 | **已删** | — |

---

## 16. 各 page.js 接口调用一览

| page.js | 读接口 | 写接口 |
|---|---|---|
| today.js | getSandboxToday | confirmSandboxStop, returnSandboxStopToSandbox, enterDriverRouteLoading |
| loading.js | getDispatchLoadingToday | returnDriverRouteToDispatch |
| delivery.js | getDispatchDeliveryToday | — |
| duty.js | getAvailableDrivers | driverCheckIn, driverCheckOut |
| manualDispatchDrivers.js | postManualDispatchDriverPanorama | — |
| manualRouteEdit.js | postManualDispatchEditPage | —（约束通过 edit-page body 回传） |
| driverLoading.js | getDispatchLoadingToday | confirmTaskLoading, confirmRouteLoadingAll, confirmDriverDepart |
| driverDelivery.js | getDispatchDeliveryToday | complete/exception（经 _driverDeliveryActions） |
| driverStopDetail.js | getDispatchLoading/DeliveryToday | complete/exception |

---

## 17. 正式页面旧字段消费审计

| 页面 | 旧字段 | 是否仍消费 | 说明 |
|---|---|---|---|
| today/loading/delivery | `executionDriverRoutes[]` 等 | **否** | adapter 已删，仅 `getPageViewModel` |
| 全部正式页 | `dispatchWorkbench` / `executionSummary` | **否** | 分包内无引用 |
| 全部正式页 | `eligibleDrivers` / `simulateAction` API | **否** | 无此类 API；`onSimulateAction` 为事件名 |
| today | `getSandboxToday`（旧路径） | **是（读）** | 仍调 `sandbox/today` 非 `dispatch/sandbox/today`；低 token 迁移 |

**删除条件：** 旧字段检测逻辑可在后端全量 pageViewModel 且部署验证通过后简化报错分支。

---

| 模式 | 分类 | 说明 |
|---|---|---|
| `司机 1` / `司机 N` | 可立即删除 | **无匹配** |
| `0.0 km` / `0 分钟` | 可立即删除 | **无匹配** |
| `buildExecutionPageView` 等 | 可立即删除 | **无匹配**（已删） |
| `executionDriverRoutes` | 无消费 | adapter 已删 |
| `simulateAction` | 非旧字段 | `onSimulateAction` 为事件名 |
| `mock` / `fake` / `demo` | 无 | 分包内无 |
| `未设置`（业务） | 已删除 | 仅剩抽屉「请选择时间」UI |
| `eligibleDrivers` / `dispatchWorkbench` | 无消费 | 分包内无 |
| `plan` | 无消费 | adapter 已删 |
| `fallback`（代码注释） | 无业务兜底 | 仅剩 `|| ''` 与网络 toast |

---

## 10. 前台下一阶段低 token 任务（勿本轮做）

1. **部署验证** §8.1：`delivery/today` pageViewModel、`edit-page` routeTimeline、`summaryLine`  
2. 司机页迁 `getDriverLoadingToday` / `getDriverDeliveryToday`（解除老板端混用）  
3. `stopDetail` 独立接口或嵌入响应  
4. `driverAvatarUrl` 后端返绝对 URL  
5. today.js：`getSandboxToday` → `getDispatchSandboxToday`  

---

## 11. 目录结构（当前）

```text
subPackage-routeDispatch/
  pages/routeDispatch/
    _session.js
    _pageView.js
    _driverDeliveryActions.js
    today/ loading/ delivery/ duty/
    manualDispatchDrivers/ manualRouteEdit/
    driverLoading/ driverDelivery/ driverStopDetail/
  pages/routeDispatch/driverCommon.wxss
```

`components/` 目录已删除（原 `manualRouteStopCard` 孤儿组件）。

---

## 18. 静态安全审计（2026-06-22，adapter 删除后）

### 18.1 已删除文件 import 搜索

| 关键词 | 代码命中 | 说明 |
|---|---|---|
| `_todayViewModel` | **无** | 仅文档 §5 已删除清单 |
| `_driverHelpers` | **无** | 同上 |
| `_manualRouteEditAdapter` | **无** | 同上 |
| `_manualDispatchViewModel` | **无** | 同上 |
| `_driverDutyViewModel` | **无** | 同上 |
| `_helpers`（派单） | **无** | 原 ~3880 行整文件已删 |
| `manualRouteStopCard` | **无** | 组件已删；`app.json` / 各 `page.json` 无声明 |

当前页面 import 仅：`_pageView.js`、`_session.js`、`_driverDeliveryActions.js`、`lib/apiRouteDispatch.js`。

### 18.2 合同校验 / 错误面板残留

| 关键词 | 代码命中 | 处理 |
|---|---|---|
| `viewmodel-error-panel` | **无 WXML** | 已删；`today.wxss` 死样式已清理 |
| `contractErrors` / `viewModelErrors` | **无** | — |
| `hasContractError` / `hasViewModelError` | **无** | — |
| `pushContractError` / `validateStoreCard` / `isPresent` | **无** | — |
| `接口缺少` | **无**（duty 已改为「缺少 driverName」） | action 缺参 toast，非合同面板 |

页面统一用 `loadError`（如「后端未返回 pageViewModel」「后端暂未返回 stopDetail」）。

### 18.3 旧业务兜底搜索（`subPackage-routeDispatch/`）

| 关键词 | 命中 | 分类 |
|---|---|---|
| `司机 1` / `司机 N` / `0.0 km` / `0 分钟` | **无** | — |
| `未设置` / `待后端补充` / `暂无路线` / `暂无数据` | **无** | — |
| `暂无司机` | **无**（duty 硬编码已删，改读 `pageData.emptyText`） | — |
| `配送中` | **无** | — |
| `确认出发` / `整车确认装车` | `driverLoading.js` | **UI 文案**：`wx.showModal` 确认框，非业务数据兜底 |
| 导航栏默认标题 | today/loading/delivery WXML | **页面 chrome**：`|| '今日派车'` 等 |
| `请选择时间` | manualRouteEdit 抽屉 | **表单 UI 占位** |
| `司机：` 前缀 | driverLoading/Delivery WXML | **展示标签**；值来自 `pageViewModel.driverName` |

### 18.4 旧字段消费搜索

| 旧字段 | 分包代码消费 |
|---|---|
| `executionDriverRoutes[]` | **否** |
| `executionSummary` / `dispatchWorkbench` / `*Workbench` | **否** |
| `loadingDriverRoutes[]` / `plan.driverRoutes[]` | **否** |
| `eligibleDrivers` | **否** |
| `simulateAction` | **否**（仅事件名 `onSimulateAction`） |

`lib/apiRouteDispatch.js` JSDoc 仍提及旧字段名 → **注释/文档**，非页面消费。

### 18.5 逐页 setData / WXML 数据根

| 页面 | page.js setData 根 | WXML 读取 | 中间 adapter 字段 |
|---|---|---|---|
| today | `pageViewModel`, `loadError` | `pageViewModel.*` | **无** |
| loading | 同上 | 同上 | **无** |
| delivery | 同上 | 同上 | **无** |
| manualDispatchDrivers | `pageData`, `loadError` | `pageData.storeCard` / `drivers[]` / `summary` | **无** |
| manualRouteEdit | `pageViewModel`, `loadError`, `drawerForm`（UI） | `pageViewModel.*` | **无** |
| duty | `pageData`, `loadError` | `pageData.driverCards[]`, `pageData.summary` | **无** |
| driverLoading | `pageViewModel`, `loadError` | `pageViewModel.*` | **无** |
| driverDelivery | 同上 | 同上 | **无** |
| driverStopDetail | `pageViewModel`, `stopDetail`, `loadError` | `stopDetail.*` | **无** |

### 18.6 页面入口与 API（当前）

| 页面 | 入口 | 读 API | 路径 | 端 | 旧链 |
|---|---|---|---|---|---|
| duty | homePage 菜单 | `getAvailableDrivers` | `drivers/available` | 老板 | 否 |
| today | homePage 菜单 | `getSandboxToday` | `sandbox/today` | 老板 | **deprecated 路径** |
| loading | homePage 菜单 | `getDispatchLoadingToday` | `loading/today` | 老板 | 否 |
| delivery | homePage 菜单 | `getDispatchDeliveryToday` | `delivery/today` | 老板 | 否 |
| driverLoading | homePage 菜单 | `getDispatchLoadingToday` + `driverUserId` | `loading/today` | **混用老板** | 否 |
| driverDelivery | homePage 菜单 | `getDispatchDeliveryToday` + `driverUserId` | `delivery/today` | **混用老板** | 否 |
| manualDispatchDrivers | today → `START_MANUAL_DISPATCH` | `postManualDispatchDriverPanorama` | payload 路径 | 老板 | 否 |
| manualRouteEdit | manualDispatch → simulate | `postManualDispatchEditPage` | edit-page | 老板 | 否 |
| driverStopDetail | driverDelivery → `onStopTap` | `getDispatchDeliveryToday`（或 loading） | 同左 | **混用老板** | 否 |

写 API：duty on/off；today sandbox/loading 写；driverLoading 装车/出发；driverDelivery/stopDetail 完成/异常（经 `_driverDeliveryActions`）。

### 18.7 仍存在的 known gap（本轮不改）

1. 司机三页混用老板 `loading/today`、`delivery/today`（`getDriver*Today` 未接入）
2. `driverStopDetail` 依赖 `pageViewModel.stopDetail`（无则 loadError）
3. `today.js` 仍用 `getSandboxToday` 非 `getDispatchSandboxToday`
4. 后端字段缺则 UI 自然空白（见 §8），前台不补

---

*本文档为派单前台唯一交接入口；字段级修补请在第 8 节登记后分批进行，勿恢复前台组装。*

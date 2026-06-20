# ocrOrder 页面状态参数整理方案

## 一、按优先级修改清单

### 高优先级：删除死代码（已完成 / 待执行）

| 序号 | 操作 | 状态 | 说明 |
|------|------|------|------|
| 1 | 删除 `scrollViewLocked` | ✅ 已完成 | wxml 未使用，已移除 data 及所有 setData |
| 2 | 删除 `playerHidden` | ✅ 已完成 | wxml 无引用，已移除 data 及所有 setData |
| 3 | 删除 `scrollViewHeight` | ✅ 已完成 | wxml 未使用，已删除 |
| 4 | 删除 `scrollViewHeightReading` | ✅ 已完成 | 已删除 data 及 onLoad 中的赋值 |

### 中优先级：语义分组与注释（已完成）

| 序号 | 操作 | 状态 | 说明 |
|------|------|------|------|
| 5 | data 分组注释 | ✅ 已完成 | 已按「布局 / 订单 / 编辑 / 搜索 / 朗读 / 弹窗」分组 |
| 6 | orderArrIndex 注释完善 | ✅ 已完成 | 已明确其 6 大用途 |

### 低优先级：可选优化

| 序号 | 操作 | 说明 |
|------|------|------|
| 7 | 评估 `currentReadingText` | ocrOrder.wxml 未使用，ocrPaste 使用，可考虑删除 ocrOrder 中的 |
| 8 | 评估 `isOrderInputFocused` 与 `orderArrIndex` | 若时序允许，可尝试用 orderArrIndex >= 0 替代 |
| 9 | 拆分 orderArrIndex（可选） | 仅在确有需要时考虑，会增加同步逻辑 |

---

## 二、当前状态参数总览（按业务分类）

### 2.1 布局/尺寸相关（8 个）
| 参数 | 用途 | 备注 |
|------|------|------|
| windowWidth, windowHeight | 窗口尺寸 | 必需 |
| imagePreviewHeight | 图片区高度 | 必需 |
| statusBarHeight, navBarHeight, safeAreaBottom | 安全区域 | 必需 |
| scrollViewHeight | 非朗读模式滚动区高度 | 未在 wxml 中直接使用，可能冗余 |
| scrollViewHeightReading | 朗读模式滚动区高度 | 未在 wxml 中直接使用，可能冗余 |
| orderListScrollMaxHeightRpx | 朗读模式订单列表最大高度 | 可能用于计算 |

### 2.2 订单列表相关（6 个）
| 参数 | 用途 | 备注 |
|------|------|------|
| orderArr | 订单列表 | 核心数据 |
| currentPage, totalPages, pageSize, totalOrders | 分页 | 必需 |
| isLoadingRemainingPages | 分页加载中 | 必需 |

### 2.3 当前编辑/聚焦订单（核心复用参数）
| 参数 | 用途 | 复用场景 |
|------|------|----------|
| **orderArrIndex** | 当前正在编辑/操作的订单索引 | ① 商品搜索（显示 strArr/nxArr 给哪个订单）② 编辑订单弹窗 ③ 操作菜单 ④ 显示推荐商品 ⑤ 订单聚焦高亮（orderstop）⑥ 输入框聚焦时底部留白 |

**问题**：`orderArrIndex` 承担了太多职责，导致：
- 修改订单、朗读、插入商品、搜索、聚焦、操作菜单等逻辑都依赖它
- 清除时需要多处同步，容易遗漏

### 2.4 商品搜索/推荐相关（5 个）
| 参数 | 用途 | 备注 |
|------|------|------|
| strArr | 配送商商品搜索结果 | 显示在 orderArrIndex 对应订单下 |
| nxArr | 系统商品搜索结果 | 同上 |
| searchStr | 搜索关键词 | 用于防抖 |
| _searchRequestId | 搜索请求序列号 | 防竞态 |
| _searchDebounceTimer | 防抖定时器 | 防抖 |

**说明**：订单项内的 `nxDoIsAgent` 表示该订单是否展开商品列表（'2'=展开）。`orderArrIndex` 与 `nxDoIsAgent == '2'` 的订单项共同决定「显示哪个订单的商品」。

### 2.5 操作菜单相关（4 个）
| 参数 | 用途 | 备注 |
|------|------|------|
| showOperationPaste | 是否显示操作菜单 | 覆盖层 |
| orderItem | 当前操作的订单项 | 菜单显示商品名 |
| playerHidden | 播放器是否隐藏 | 操作菜单打开时隐藏，**未在 wxml 中直接使用** |
| findGoods | 从添加临时商品页面返回后是否更新 | 页面跳转用 |

### 2.6 编辑订单弹窗相关（12 个）
| 参数 | 用途 | 备注 |
|------|------|------|
| show | 是否显示编辑弹窗 | 必需 |
| editApply | 是否为编辑模式（vs 新增） | 必需 |
| applyItem | 当前编辑的订单项 | 可考虑用 orderArr[orderArrIndex] 替代 |
| applyNumber, applyStandardName, applyRemark | 编辑表单 | 必需 |
| itemDis, item | 商品信息 | 必需 |
| applyGoodsName, applyGoodsId, newStandardName | 商品相关 | 必需 |
| printStandard, priceLevel, disStandardId | 规格相关 | 必需 |

### 2.7 警告/修正弹窗（4 个）
| 参数 | 用途 |
|------|------|
| showPopupWarn, popupType, warnContent | 警告弹窗 |
| showCorrectionModal, correctionDefaultText | 修正弹窗 |

### 2.8 TTS 朗读相关（14 个）
| 参数 | 用途 | 备注 |
|------|------|------|
| isTTSReading | 是否正在朗读（布局） | 必需 |
| isCheckMode | 检查模式（不朗读） | 必需 |
| isTTSPlaying | 是否正在播放 | 必需 |
| isTTSLoading | 是否正在加载音频 | 必需 |
| ttsQueue, ttsAudioCache | 队列与缓存 | 必需 |
| currentTTSIndex | 当前播放索引 | 必需 |
| stoppedIndex, stoppedOrderRef | 停止时的索引/引用 | 必需 |
| isStoppedByStatusMinus2 | 是否因订单状态-2停止 | 必需 |
| ttsSessionId, ttsAudio, ttsError | 会话/实例/错误 | 必需 |
| currentReadingText | 当前朗读文本 | ocrOrder.wxml 未使用，ocrPaste 使用 |
| scrollIntoViewId | scroll-into-view 目标 | 必需 |
| _pendingFocusOrderIndex | 聚焦时先滚动再设 orderArrIndex | 时序用 |
| _ttsRequestingIndex | 防止重复请求 | 必需 |
| scrollTop | scroll-view 滚动位置 | 必需 |
| ~~scrollViewLocked~~ | ~~展开推荐商品时锁定外层 scroll~~ | **已删除：wxml 未使用** |
| **scrollLockedForGoods** | 是否因显示商品/搜索锁定滚动 | 由 observer 计算，用于 scroll-y |

### 2.9 其他 UI 状态（5 个）
| 参数 | 用途 | 备注 |
|------|------|------|
| recognitionModalOpen | 识别弹窗打开（提高 z-index） | 必需 |
| recentlyModifiedOrderIndex | 刚修改的订单（淡蓝高亮） | 2 秒后清除 |
| showPlayerMenu | 播放器菜单展开 | 必需 |
| imageTransformCache | 图片变换缓存 | 必需 |
| isOrderInputFocused | 订单输入框聚焦（底部留白） | 与 orderArrIndex 部分重叠 |

---

## 三、冗余与可合并项说明

| 项 | 类型 | 说明 |
|----|------|------|
| scrollViewLocked | 已删除 | wxml 未使用，已用 scrollLockedForGoods 替代 |
| playerHidden | 可删除 | wxml 无引用 |
| scrollViewHeight, scrollViewHeightReading | 可删除 | wxml 未使用 |
| isOrderInputFocused | 保留 | 失焦时键盘可能尚未收起，需短暂留白 |
| applyItem | 保留 | 编辑时用 snapshot 更安全；若后续只读 orderArr 可考虑合并 |

---

## 四、整理后的 data 结构建议（精简版）

```javascript
data: {
  // === 布局/尺寸 ===
  windowWidth: 0, windowHeight: 0, imagePreviewHeight: 0,
  statusBarHeight: 0, navBarHeight: 0, safeAreaBottom: 0,
  orderListScrollMaxHeightRpx: 0, url: '',

  // === 订单列表 ===
  orderArr: [], currentPage: 1, totalPages: 1, pageSize: 10,
  totalOrders: 0, isLoadingRemainingPages: false,

  // === 当前操作订单（orderArrIndex 统一表示：编辑/聚焦/搜索/显示商品） ===
  orderArrIndex: -1,
  strArr: [], nxArr: [], searchStr: '',
  _searchRequestId: 0, _searchDebounceTimer: null,

  // === 操作菜单 ===
  showOperationPaste: false, orderItem: null, findGoods: false,

  // === 编辑订单弹窗 ===
  show: false, editApply: false, applyItem: null,
  applyNumber: '', applyStandardName: '', applyRemark: '',
  itemDis: null, item: null, applyGoodsName: '', applyGoodsId: '',
  newStandardName: '', printStandard: '', priceLevel: '', disStandardId: '',

  // === 弹窗 ===
  showPopupWarn: false, popupType: '', warnContent: '',
  showCorrectionModal: false, correctionDefaultText: '',

  // === TTS 朗读 ===
  isTTSReading: false, isCheckMode: false, isTTSPlaying: false, isTTSLoading: false,
  ttsQueue: [], ttsAudioCache: {}, currentTTSIndex: -1,
  stoppedIndex: -1, stoppedOrderRef: null, isStoppedByStatusMinus2: false,
  ttsSessionId: '', ttsAudio: null, ttsError: '', currentReadingText: '',
  scrollIntoViewId: '', _pendingFocusOrderIndex: -1, _ttsRequestingIndex: -1,
  scrollTop: 0,

  // === 其他 UI ===
  recognitionModalOpen: false, recentlyModifiedOrderIndex: -1,
  showPlayerMenu: false, imageTransformCache: null,
  isOrderInputFocused: false, scrollLockedForGoods: false // 由 observer 计算
}
```

**删除项**：`scrollViewLocked`、`scrollViewHeight`、`scrollViewHeightReading`、`playerHidden`（需确认无引用）

---

## 五、实施步骤

1. **第一步**：全局搜索 `scrollViewLocked`、`playerHidden`、`scrollViewHeight`、`scrollViewHeightReading`、`currentReadingText` 的引用，确认可删除。
2. **第二步**：删除 `scrollViewLocked` 及其所有 setData 调用。
3. **第三步**：按上述分组重排 data 注释，便于后续维护。
4. **第四步**：若确认 `playerHidden` 等无引用，一并删除。
5. **第五步**：跑一遍主流程（朗读、编辑、搜索、操作菜单、添加订单）做回归测试。

---

## 六、附录：orderArrIndex 使用场景汇总

| 场景 | 设置 orderArrIndex | 清除 orderArrIndex |
|------|-------------------|-------------------|
| 点击订单展开商品 | index | -1（关闭时） |
| 聚焦输入框 | index（或 _pendingFocusOrderIndex 后设） | 失焦时 -1 |
| 打开操作菜单 | index | 关闭菜单/返回时 -1 |
| 编辑订单弹窗 | 通过 orderArrIndex 取 applyItem | 关闭弹窗不清 |
| 搜索商品 | 保持当前 index | 关闭商品列表时 -1 |
| 开始/继续朗读 | -1 | - |
| 订单状态 -2 停止 | 由 _handleOrderStatusMinus2 等处理 | - |

# ocrOrderList 组件冗余字段分析

## 一、Properties（父组件传入）

| 属性 | 用途 | 状态 |
|------|------|------|
| list | 订单列表 | ✅ 必需 |
| activeIndex | 当前朗读索引 | ✅ 必需 |
| isReadingMode | 是否朗读模式 | ✅ 必需 |
| isPlaying | 是否正在播放 | ✅ 必需 |
| stoppedIndex | 停止时的订单索引 | ✅ 必需 |
| orderArrIndex | 当前编辑的订单索引 | ✅ 必需 |
| recentlyModifiedOrderIndex | 刚修改的订单（淡蓝高亮） | ✅ 必需 |
| strArr, nxArr | 商品搜索结果 | ✅ 必需 |
| windowWidth | 窗口宽度 | ✅ 必需 |
| scrollIntoViewId | 滚动目标 | ✅ 必需 |
| depId, depFatherId, disId, userId | 接口参数 | ✅ 必需 |

**无冗余**，均为业务必需。

---

## 二、Data（组件内部状态）

### 1. 商品搜索相关

| 字段 | 用途 | 状态 |
|------|------|------|
| **lastSearchValue** | 上次搜索的值，用于避免重复搜索 | ⚠️ **冗余**：只被 setData 写入，从未被读取使用 |
| **hasConfirmed** | 是否已按确认键 | ✅ 用于聚焦时重置，允许重新搜索 |

### 2. 语音识别相关

| 字段 | 用途 | 状态 |
|------|------|------|
| recognitionText | 识别到的文本（弹窗显示） | ✅ 必需，wxml 使用 |
| **liveRecognitionText** | 实时识别文本（录音过程中使用） | ⚠️ **冗余**：与 recognitionText 同步设置，但 wxml 只显示 recognitionText，从未使用 liveRecognitionText |
| showRecognitionModal | 是否显示识别弹窗 | ✅ 必需 |
| recordingOrderIndex | 正在录音的订单索引 | ✅ 必需 |
| recordingOrderId | 正在录音的订单ID | ✅ 必需 |
| isRecording | 是否正在录音 | ✅ 必需 |
| timer | 录音时长定时器 | ✅ 必需 |

### 3. DeepSeek 优化

| 字段 | 用途 | 状态 |
|------|------|------|
| **brandPrompts** | 品牌列表（用于 DeepSeek 优化） | ⚠️ **半冗余**：初始化为 []，从未被 setData 更新，optimizeTextWithDeepSeek 始终收到空数组。若未来不打算从订单/接口拉取品牌列表，可删除；若预留扩展则保留 |

### 4. 删除动画

| 字段 | 用途 | 状态 |
|------|------|------|
| deletingIndex | 正在删除的订单索引（动画） | ✅ 必需，wxml 使用 |

---

## 三、WXML 中未定义的引用

| 引用 | 说明 |
|------|------|
| **showTools** | wxml 第 349 行 `wx:if="{{showTools}}"`，但组件 **未定义** showTools（非 property 非 data）。父组件 ocrOrder、ocrPaste 也未传入。该区块（添加订单、开始朗读、添加临时商品）**永不显示**，相当于死代码 |

---

## 四、未使用的方法

| 方法 | 说明 |
|------|------|
| **_scrollToItem** | 定义于 196 行，**从未被调用**。滚动逻辑由 observer 监听 scrollIntoViewId 直接 triggerEvent('scrollToItem') 完成，该方法冗余 |

---

## 五、建议操作

### 高优先级（可安全删除）✅ 已完成

1. **删除 `liveRecognitionText`**：✅ 已删除 data 及所有 setData
2. **删除 `lastSearchValue`**：✅ 已删除 data 及 setData
3. **删除 `_scrollToItem` 方法**：✅ 已删除

### 中优先级（视需求决定）✅ 已完成

4. **showTools 区块**：✅ 已删除整个 `wx:if="{{showTools}}"` 区块（父组件未传入，永不显示）

5. **brandPrompts**：✅ 已删除，optimizeTextWithDeepSeek 调用处改为 `brandList: []`

---

## 六、删除后的 data 精简示例

```javascript
data: {
  hasConfirmed: false,
  isRecording: false,
  recognitionText: '',
  showRecognitionModal: false,
  recordingOrderIndex: -1,
  recordingOrderId: null,
  timer: null,
  deletingIndex: -1
  // 已删除: lastSearchValue, liveRecognitionText
  // brandPrompts 视需求保留或删除
}
```

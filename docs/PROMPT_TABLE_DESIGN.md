# Prompt 数据库表设计文档

## 📋 表设计概述

设计一个数据库表来统一管理系统中使用的各种 AI Prompt，实现 Prompt 的集中管理、版本控制和动态配置。

## 🎯 设计目标

1. **集中管理**：将所有 Prompt 从代码中抽离，统一存储在数据库中
2. **版本控制**：支持 Prompt 的版本管理和历史追溯
3. **动态配置**：支持不重启服务的情况下更新 Prompt
4. **场景区分**：通过分类和标签区分不同使用场景
5. **接口关联**：明确每个 Prompt 对应的 API 接口路径

## 📊 表结构设计

### 字段设计

| 字段名 | 类型 | 说明 | 约束 |
|--------|------|------|------|
| `id` | BIGINT | 主键，自增 | PRIMARY KEY, AUTO_INCREMENT |
| `prompt_key` | VARCHAR(100) | Prompt 唯一标识键（如：ocr_order_parse, excel_parse） | UNIQUE, NOT NULL |
| `prompt_name` | VARCHAR(200) | Prompt 名称/描述（如：OCR订单解析、Excel文件解析） | NOT NULL |
| `prompt_content` | TEXT/LONGTEXT | Prompt 的具体内容 | NOT NULL |
| `category` | VARCHAR(50) | 分类（如：OCR、Excel、Voice、General） | NOT NULL, INDEX |
| `api_endpoint` | VARCHAR(255) | 调用该 Prompt 的 API 接口路径（如：/api/ocr/parse） | NULL |
| `version` | INT | 版本号，每次更新递增 | DEFAULT 1 |
| `is_active` | TINYINT(1) | 是否启用（1=启用，0=禁用） | DEFAULT 1, INDEX |
| `created_at` | DATETIME | 创建时间 | DEFAULT CURRENT_TIMESTAMP |
| `updated_at` | DATETIME | 最后更新时间 | DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP |
| `created_by` | VARCHAR(100) | 创建人 | NULL |
| `updated_by` | VARCHAR(100) | 最后更新人 | NULL |
| `description` | VARCHAR(500) | Prompt 的详细说明 | NULL |
| `tags` | VARCHAR(200) | 标签，多个用逗号分隔（如：订单,语音识别,品牌识别） | NULL |

## 💡 设计讨论

### 1. `prompt_key` vs `prompt_name`

**建议使用 `prompt_key`**：
- ✅ `prompt_key`：用于程序内部引用，保持稳定（如：`ocr_order_parse`）
- ✅ `prompt_name`：用于显示给用户，可以随时修改（如：`OCR订单解析`）
- ✅ 这样设计的好处：代码中引用 `prompt_key`，即使名称改了也不影响代码

**示例**：
```sql
prompt_key: 'ocr_order_parse'
prompt_name: 'OCR订单解析助手'
```

### 2. `category` vs `type`

**建议使用 `category`**：
- ✅ `category` 更通用，语义更清晰
- ✅ 可以建立索引，提高查询效率
- ✅ 建议使用枚举值：`OCR`, `EXCEL`, `VOICE`, `GENERAL` 等

### 3. `api_endpoint` 字段的必要性

**讨论点**：
- ✅ **支持**：明确 Prompt 与接口的关联关系，便于管理和调试
- ⚠️ **注意**：一个 Prompt 可能被多个接口使用，或者一个接口可能使用多个 Prompt
- 💡 **建议**：如果存在多对多关系，可以考虑：
  1. 将 `api_endpoint` 设为可空，允许多个接口使用同一个 Prompt
  2. 或者创建关联表 `prompt_api_mapping`（如果关系复杂）

### 4. `version` vs `last_updated`

**建议两者都保留**：
- ✅ `version`：版本号，用于版本管理和回滚
- ✅ `updated_at`：时间戳，用于查看最后更新时间
- 💡 **额外建议**：可以考虑添加 `version_history` 表来保存历史版本

### 5. 额外建议的字段

**`is_active`**：
- ✅ 支持禁用某个 Prompt 而不删除，便于快速回滚

**`description`**：
- ✅ 记录 Prompt 的用途、注意事项等

**`tags`**：
- ✅ 支持更灵活的查询和分类

**`created_by` / `updated_by`**：
- ✅ 记录操作人，便于审计

## 🔍 使用场景示例

### 场景1：OCR 订单识别
```sql
INSERT INTO prompts (
  prompt_key, 
  prompt_name, 
  prompt_content, 
  category, 
  api_endpoint,
  description
) VALUES (
  'ocr_order_parse',
  'OCR订单解析',
  '你是一个专业的餐饮行业订单解析助手...',
  'OCR',
  '/api/ocr/parse',
  '用于识别图片中的订单信息，转换为结构化数据'
);
```

### 场景2：Excel 文件解析
```sql
INSERT INTO prompts (
  prompt_key,
  prompt_name,
  prompt_content,
  category,
  api_endpoint,
  description
) VALUES (
  'excel_order_parse',
  'Excel订单解析',
  '你是一个专业的Excel订单解析助手...',
  'EXCEL',
  '/api/excel/parse',
  '用于解析Excel文件中的订单数据'
);
```

### 场景3：语音识别优化
```sql
INSERT INTO prompts (
  prompt_key,
  prompt_name,
  prompt_content,
  category,
  api_endpoint,
  description,
  tags
) VALUES (
  'voice_order_optimize',
  '语音订单优化',
  '你是货架商品语音录入助手...',
  'VOICE',
  '/api/voice/optimize',
  '用于优化语音识别结果，纠正同音词错误',
  '订单,语音识别,品牌识别'
);
```

## 📝 SQL 建表语句

```sql
CREATE TABLE `prompts` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `prompt_key` VARCHAR(100) NOT NULL COMMENT 'Prompt唯一标识键',
  `prompt_name` VARCHAR(200) NOT NULL COMMENT 'Prompt名称/描述',
  `prompt_content` LONGTEXT NOT NULL COMMENT 'Prompt具体内容',
  `category` VARCHAR(50) NOT NULL COMMENT '分类：OCR/EXCEL/VOICE/GENERAL',
  `api_endpoint` VARCHAR(255) DEFAULT NULL COMMENT 'API接口路径',
  `version` INT NOT NULL DEFAULT 1 COMMENT '版本号',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用：1=启用，0=禁用',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '详细说明',
  `tags` VARCHAR(200) DEFAULT NULL COMMENT '标签，多个用逗号分隔',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  `created_by` VARCHAR(100) DEFAULT NULL COMMENT '创建人',
  `updated_by` VARCHAR(100) DEFAULT NULL COMMENT '更新人',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_prompt_key` (`prompt_key`),
  KEY `idx_category` (`category`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_updated_at` (`updated_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Prompt管理表';
```

## 🔄 版本历史表（可选）

如果需要保存历史版本，可以创建：

```sql
CREATE TABLE `prompt_versions` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `prompt_id` BIGINT NOT NULL COMMENT 'Prompt ID',
  `version` INT NOT NULL COMMENT '版本号',
  `prompt_content` LONGTEXT NOT NULL COMMENT 'Prompt内容',
  `change_log` VARCHAR(500) DEFAULT NULL COMMENT '变更说明',
  `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `created_by` VARCHAR(100) DEFAULT NULL COMMENT '创建人',
  PRIMARY KEY (`id`),
  KEY `idx_prompt_id_version` (`prompt_id`, `version`),
  CONSTRAINT `fk_prompt_versions_prompt_id` FOREIGN KEY (`prompt_id`) REFERENCES `prompts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Prompt版本历史表';
```

## 🚀 使用建议

### 1. 代码中获取 Prompt

```javascript
// 通过 prompt_key 获取当前启用的 Prompt
async function getPrompt(promptKey) {
  const response = await wx.request({
    url: `${apiUrl}/api/prompts/get`,
    method: 'GET',
    data: { prompt_key: promptKey }
  });
  return response.data.prompt_content;
}
```

### 2. 缓存策略

- 建议在应用启动时加载所有启用的 Prompt 到内存
- 设置缓存过期时间（如 5 分钟）
- 当 Prompt 更新时，可以通过消息通知或定时刷新来更新缓存

### 3. 版本管理

- 每次更新 Prompt 时，自动递增 `version`
- 可以选择性地将旧版本保存到 `prompt_versions` 表
- 支持版本回滚功能

## ❓ 待讨论的问题

1. **是否需要支持多语言**？
   - 如果系统需要支持多语言，可以考虑添加 `language` 字段

2. **Prompt 参数化**？
   - 如果 Prompt 需要动态参数（如品牌列表），可以考虑：
     - 在 `prompt_content` 中使用占位符（如 `{{brandList}}`）
     - 或者添加 `parameters` JSON 字段存储参数配置

3. **权限控制**？
   - 是否需要控制哪些用户可以修改 Prompt？
   - 可以考虑添加权限字段或关联权限表

4. **Prompt 模板**？
   - 如果多个 Prompt 结构相似，是否需要支持模板功能？

5. **测试环境**？
   - 是否需要区分生产环境和测试环境的 Prompt？
   - 可以考虑添加 `environment` 字段

## 📌 总结

这个设计提供了：
- ✅ 清晰的字段定义和约束
- ✅ 灵活的查询和分类能力
- ✅ 版本管理和历史追溯
- ✅ 良好的扩展性

可以根据实际需求进行调整和优化。


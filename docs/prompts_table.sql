-- ============================================
-- Prompt 管理表
-- 用于统一管理系统中的 AI Prompt
-- ============================================

-- 主表：prompts
CREATE TABLE `prompts` (
  `id` BIGINT NOT NULL AUTO_INCREMENT COMMENT '主键ID',
  `prompt_key` VARCHAR(100) NOT NULL COMMENT 'Prompt唯一标识键（如：ocr_order_parse）',
  `prompt_name` VARCHAR(200) NOT NULL COMMENT 'Prompt名称/描述（如：OCR订单解析）',
  `prompt_content` LONGTEXT NOT NULL COMMENT 'Prompt具体内容',
  `category` VARCHAR(50) NOT NULL COMMENT '分类：OCR/EXCEL/VOICE/GENERAL',
  `api_endpoint` VARCHAR(255) DEFAULT NULL COMMENT 'API接口路径（如：/api/ocr/parse）',
  `version` INT NOT NULL DEFAULT 1 COMMENT '版本号，每次更新递增',
  `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT '是否启用：1=启用，0=禁用',
  `description` VARCHAR(500) DEFAULT NULL COMMENT '详细说明',
  `tags` VARCHAR(200) DEFAULT NULL COMMENT '标签，多个用逗号分隔（如：订单,语音识别,品牌识别）',
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

-- ============================================
-- 版本历史表（可选，用于保存历史版本）
-- ============================================
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

-- ============================================
-- 初始化数据示例
-- ============================================

-- OCR 订单解析 Prompt
INSERT INTO `prompts` (
  `prompt_key`,
  `prompt_name`,
  `prompt_content`,
  `category`,
  `api_endpoint`,
  `description`,
  `tags`,
  `created_by`
) VALUES (
  'ocr_order_parse',
  'OCR订单解析',
  '你是一个专业的餐饮行业订单解析助手。请将用户输入的OCR识别文本转换为标准化的订单 JSON 数据。

重要规则：
1. **输入来源**：内容来自OCR识别，可能存在识别错误，需要智能纠正。
2. **输出格式**：必须输出一个标准的 JSON 数组。
3. **字段说明**：
   - name: 商品名称（必填）
   - qty: 数量（必填）
   - unit: 单位（必填）
   - remark: 备注（可选）

请严格按照上述格式输出，只输出 JSON 数组，不要添加任何其他内容。',
  'OCR',
  '/api/ocr/parse',
  '用于识别图片中的订单信息，转换为结构化数据',
  '订单,OCR,图片识别',
  'system'
);

-- Excel 订单解析 Prompt
INSERT INTO `prompts` (
  `prompt_key`,
  `prompt_name`,
  `prompt_content`,
  `category`,
  `api_endpoint`,
  `description`,
  `tags`,
  `created_by`
) VALUES (
  'excel_order_parse',
  'Excel订单解析',
  '你是一个专业的Excel订单解析助手。请将Excel文件中的订单数据转换为标准化的 JSON 格式。

重要规则：
1. **输入来源**：内容来自Excel文件解析。
2. **输出格式**：必须输出一个标准的 JSON 数组。
3. **字段说明**：
   - name: 商品名称（必填）
   - qty: 数量（必填）
   - unit: 单位（必填）
   - remark: 备注（可选）

请严格按照上述格式输出，只输出 JSON 数组，不要添加任何其他内容。',
  'EXCEL',
  '/api/excel/parse',
  '用于解析Excel文件中的订单数据',
  '订单,Excel,文件解析',
  'system'
);

-- 语音订单优化 Prompt
INSERT INTO `prompts` (
  `prompt_key`,
  `prompt_name`,
  `prompt_content`,
  `category`,
  `api_endpoint`,
  `description`,
  `tags`,
  `created_by`
) VALUES (
  'voice_order_optimize',
  '语音订单优化',
  '你是货架商品语音录入助手。用户的语音顺序通常为"商品名称、规格提示词（如规格斤/单位/箱）、规格重量（可省略）、品牌（可省略）"。

请在整理文本时遵循以下要求：
1. 逐条语句独立输出，每行保持原有顺序。
2. 仅保留用户原本说出的信息，不要猜测或补充默认数量、单位、品牌。
3. 尽量纠正常见错别字和同音词。
4. 输出格式示例：
   - 语音："千禾酱油桶" → 输出："千禾酱油:规格桶"
   - 语音："千禾酱油桶 5000ml" → 输出："千禾酱油:规格桶 5000ml"

请严格按照用户原文保留或留空对应字段。',
  'VOICE',
  '/api/voice/optimize',
  '用于优化语音识别结果，纠正同音词错误',
  '订单,语音识别,品牌识别',
  'system'
);

-- ============================================
-- 查询示例
-- ============================================

-- 1. 根据 prompt_key 获取启用的 Prompt
-- SELECT * FROM prompts WHERE prompt_key = 'ocr_order_parse' AND is_active = 1;

-- 2. 根据分类查询所有启用的 Prompt
-- SELECT * FROM prompts WHERE category = 'OCR' AND is_active = 1 ORDER BY updated_at DESC;

-- 3. 根据 API 接口路径查询 Prompt
-- SELECT * FROM prompts WHERE api_endpoint = '/api/ocr/parse' AND is_active = 1;

-- 4. 查询所有启用的 Prompt（用于缓存）
-- SELECT prompt_key, prompt_content FROM prompts WHERE is_active = 1;

-- 5. 更新 Prompt（版本号自动递增）
-- UPDATE prompts 
-- SET prompt_content = '新的Prompt内容', 
--     version = version + 1, 
--     updated_by = 'admin',
--     updated_at = NOW()
-- WHERE prompt_key = 'ocr_order_parse';


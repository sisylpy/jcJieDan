/**
 * DeepSeek API 工具类
 * 用于优化语音识别文本，支持不同业务使用不同的 prompt
 */

import { completeWithDeepSeek } from './miniProgramCloud';

/**
 * 默认的订单解析 prompt（用于订单识别场景）
 */
const DEFAULT_ORDER_PROMPT = `你是一个专业的餐饮行业订单解析助手。请将用户输入的语音识别文本转换为标准化的订单 JSON 数据。

重要规则：
1. **输入来源**：内容来自腾讯语音识别，可能存在大量同音词错误，需要智能纠正为正确的商品名称。
2. **品牌识别优先级最高**：
   - 即使识别出的词在字面意思上是通顺的（如"冬菇"），如果它的发音与品牌库中的品牌（如"东古"）完全一致或极度相似，且上下文符合调料/商品场景，必须优先纠正为品牌名！
   - "一品鲜"、"酱油"、"陈醋"、"生抽"等词前面的通常是品牌名，需要特别注意识别。
3. **特殊商品名**：以下商品名称是完整的，不要拆分：
   - "去叶中葱"、"去叶大葱"、"去根胡萝卜"、"去皮土豆" 等
   - "西兰苔"、"板蓝根" 等
4. **语音识别错误纠正**：
   - "实质" → "10只"
   - "死机" → "4斤"
   - "无间" → "5斤"
   - "溜达" → "6大"
   - "9枝话梅" → "九制话梅"
   - "诸侯酱" → "柱侯酱"
   - "小米腊" → "小米辣"
   - "第儿" → "地儿"
5. **同音词归一**："1000元餐盒" → "1000圆餐盒"
6. **"各"字处理**："红黄彩椒各" 视为一个完整商品名

输出要求：
- 必须输出一个标准的 JSON 数组，不要包含 Markdown 标记、代码块标记或其他文字说明
- 只输出纯 JSON 数组，格式如下：
[{"name": "商品名称", "qty": "数量", "unit": "单位", "remark": "备注"}]

字段说明：
- name: 商品名称（必填，字符串）
- qty: 数量（必填，字符串，如 "5"、"10"）
- unit: 单位（必填，字符串，如 "斤"、"个"、"包"、"根"、"棵"、"条"、"盒"、"捆"、"袋"、"瓶"、"罐"、"桶"、"箱"）
- remark: 备注（可选，字符串，如 "要新鲜的"、"小颗的"）

默认值：
- 如果数量后没有单位，默认使用 "斤"
- 如果没有备注，使用空字符串 ""

请严格按照上述格式输出，只输出 JSON 数组，不要添加任何其他内容。`;

/**
 * 生成品牌识别 prompt
 * @param {Array} brandList - 品牌列表
 * @returns {string} 品牌识别 prompt
 */
function generateBrandPrompt(brandList) {
  if (!Array.isArray(brandList) || brandList.length === 0) {
    return '';
  }

  const HIGH_PRIORITY_CORRECTIONS = [
    "东古(易误识为:冬菇、东顾、东谷)",
    "紫林(易误识为:紫菱、子林、紫灵)",
    "安琪(易误识为:安奇、按期、安记)",
    "宜客(易误识为:一克、翼克、翼客)",
    "李锦记(易误识为:李金记、李进记)",
    "海天(易误识为:海添、海田)",
    "千禾(易误识为:千和、前和)",
    "恒顺(易误识为:恒舜、横顺)"
  ];

  return `以下是当前配送商的常见品牌词列表：${brandList.join('、')}。

在识别商品名称时，如果商品名称中包含品牌词，请遵循以下规则（优先级最高）：
1. **品牌识别优先级最高**：即使识别出的词在字面意思上是通顺的（如"冬菇"），如果它的发音与品牌库中的品牌（如"东古"）完全一致或极度相似，且上下文符合调料/商品场景，必须优先纠正为品牌名！
2. 将用户语音中的品牌词转换为拼音后，与列表中品牌的拼音比较，寻找读音或结构最接近的项。
3. 如果存在同音、近音或常见错别字，必须输出列表中的标准写法。
4. 当有多个候选时，选择距离最小（发音最接近或编辑距离最短）的品牌。
5. 只有在确认列表中没有合适的对应项时，才保留用户原始品牌词。
6. 品牌词应该包含在商品名称（name字段）中，而不是单独作为备注。

常见语音识别错误修正表（请严格参考）：
${HIGH_PRIORITY_CORRECTIONS.join('\n')}

特别注意：
- "一品鲜"、"酱油"、"陈醋"、"生抽"、"老抽"等词前面的通常是品牌名，需要特别注意识别。
- 即使"冬菇"、"紫菱"等词在字面意思上通顺，但在调料/商品场景下，如果发音与品牌列表中的品牌相似，必须优先纠正为品牌名。`;
}

/**
 * 使用 DeepSeek API 优化文本
 * @param {string} text - 原始文本
 * @param {Object} options - 配置选项
 * @param {string} options.systemPrompt - 自定义 system prompt（可选，默认使用订单解析 prompt）
 * @param {Array} options.brandList - 品牌列表（可选）
 * @param {number} options.temperature - 温度参数（默认 0.2）
 * @param {string} options.logPrefix - 日志前缀（可选，用于区分不同调用来源）
 * @returns {Promise<string>} 优化后的文本
 */
async function optimizeTextWithDeepSeek(text, options = {}) {
  // 兼容历史调用 optimizeTextWithDeepSeek(text, temperature, brandList)。
  if (typeof options === 'number') {
    options = { temperature: options, brandList: arguments[2] || [] };
  }
  const {
    systemPrompt = DEFAULT_ORDER_PROMPT,
    brandList = [],
    temperature = 0.2,
    logPrefix = '[DeepSeekHelper]'
  } = options;

  try {
    let effectivePrompt = systemPrompt;
    if (Array.isArray(brandList) && brandList.length > 0) {
      const brandPrompt = generateBrandPrompt(brandList);
      if (brandPrompt) effectivePrompt += `\n\n${brandPrompt}`;
    }
    return await completeWithDeepSeek({
      text,
      systemPrompt: effectivePrompt,
      temperature
    });
  } catch (error) {
    console.error(`${logPrefix} AI 服务调用失败:`, error && error.message);
    return Promise.reject(error);
  }
}

/**
 * 业务类型判断 prompt（用于判断修改/删除/新增）
 */
/**
 * 生成业务类型判断 prompt（支持订单修改）
 * @param {Object} originalOrder - 原订单信息（可选）
 * @returns {string} prompt 文本
 */
function generateBusinessTypePrompt(originalOrder = null) {
  let prompt = `你是一个专业的餐饮行业订单操作意图识别助手。请分析用户的语音识别文本，判断用户想要执行的操作类型。

操作类型说明：
1. **修改订单（modify）**：用户想要修改当前订单的商品名称、数量或规格
   - 关键词：包含商品名称、数量、规格等信息
   - 示例："改成5斤"、"改成土豆"、"改成10个"、"5斤"、"土豆10斤"
   - 特点：有明确的商品信息，但没有"删除"、"新增"、"添加"等关键词

2. **删除订单（delete）**：用户想要删除当前订单
   - 关键词：删除、去掉、不要、取消、删掉、移除、不要了
   - 示例："删除"、"不要这个"、"去掉"、"取消订单"、"删掉"
   - 特点：明确表达删除意图，通常没有商品信息

3. **新增订单（add）**：用户想要在当前订单之前添加新订单
   - 关键词：新增、添加、加一个、插入、加上、新加
   - 示例："新增一个"、"添加土豆5斤"、"加一个西红柿"、"新加一个"
   - 特点：有"新增"、"添加"等关键词，通常包含商品信息

判断规则：
- 优先识别明确的动作关键词（删除、新增、添加）
- 如果包含商品信息但没有动作关键词，默认为"修改"
- 如果只有动作关键词没有商品信息，根据关键词判断（删除/新增）`;

  // 如果有原订单信息，添加修改订单的特殊处理
  if (originalOrder) {
    prompt += `

**重要：当前订单信息**
- 商品名称：${originalOrder.nxDoGoodsName || ''}
- 数量：${originalOrder.nxDoQuantity || ''}
- 规格：${originalOrder.nxDoStandard || ''}
- 备注：${originalOrder.nxDoRemark || ''}

如果判断为"修改订单"，请根据用户的语音识别文本，智能更新订单字段：

**重要原则**：
1. **字段解析规则**：必须从语音文本中解析出商品名称、数量、规格三个独立字段
   - 商品名称：提取商品名称部分（不包含数量和规格）
   - 数量：提取数字部分（如"一"→"1"，"二"→"2"，"十"→"10"）
   - 规格：提取计量单位部分（如"袋"、"包"、"斤"、"个"等）
   
2. **更新规则**：
   - 用户提到的字段需要更新，未提到的字段保持原值
   - 如果用户只提到数量，只更新数量，商品名称和规格保持不变
   - 如果用户只提到规格，只更新规格，商品名称和数量保持不变
   - 如果用户提到商品名称，更新商品名称，数量和规格根据用户描述更新或保持原值
   - 备注字段：如果用户明确提到备注，更新备注；否则返回空字符串（清空原备注）

3. **中文数字转换规则**：
   - "一" → "1"
   - "二" → "2"
   - "三" → "3"
   - "四" → "4"
   - "五" → "5"
   - "六" → "6"
   - "七" → "7"
   - "八" → "8"
   - "九" → "9"
   - "十" → "10"
   - "十一" → "11"
   - "二十" → "20"
   - 等等

**语音识别错误纠正规则（重要）**：
- "戴" → "袋"（"戴"不是计量单位，应纠正为"袋"，如"一戴"应识别为"一袋"）
- "代" → "袋"（"代"不是计量单位，应纠正为"袋"，如"1代"应识别为"1袋"）
- "只" → "只"（保持不变）
- "个" → "个"（保持不变）
- "斤" → "斤"（保持不变）
- "包" → "包"（保持不变）
- "箱" → "箱"（保持不变）
- "桶" → "桶"（保持不变）
- "瓶" → "瓶"（保持不变）
- "罐" → "罐"（保持不变）
- "盒" → "盒"（保持不变）
- "捆" → "捆"（保持不变）
- "根" → "根"（保持不变）
- "棵" → "棵"（保持不变）
- "条" → "条"（保持不变）

**儿化音处理规则（重要）**：
- **必须去除儿化音中的"儿"字**，因为返回的内容要进行数据库查询，不能带多余的"儿"字
- 例如："花儿" → "花"，"苹果儿" → "苹果"，"土豆儿" → "土豆"，"萝卜儿" → "萝卜"
- 如果商品名称末尾有"儿"字，必须去除（除非"儿"是商品名称的固有部分，如"女儿红"等特殊商品）
- 规格字段中的"儿"字也要去除，如"个儿" → "个"

特别注意：
- **备注清空规则**：用户语音中未提到备注时，nxDoRemark 必须返回空字符串 ""，不要保留原订单的备注
- 如果识别出的规格是"戴"或"代"，必须纠正为"袋"
- 规格字段必须是有效的计量单位，不能是动作词（如"戴"、"穿"等）
- **必须将商品名称、数量、规格分开解析**，不能把"商品名称+数量+规格"整个放在商品名称字段中
- **所有返回的字段值必须去除儿化音的"儿"字**，确保可以直接用于数据库查询

示例：
示例1：
原订单：商品名称"平菇"，数量"10"，规格"斤"，备注""
用户说："1 包"
应返回：
{
  "action": "modify",
  "updatedOrder": {
    "nxDoGoodsName": "平菇",
    "nxDoQuantity": "1",
    "nxDoStandard": "包",
    "nxDoRemark": ""
  }
}

示例2：
原订单：商品名称"土豆"，数量"5"，规格"斤"，备注""
用户说："改成10斤"
应返回：
{
  "action": "modify",
  "updatedOrder": {
    "nxDoGoodsName": "土豆",
    "nxDoQuantity": "10",
    "nxDoStandard": "斤",
    "nxDoRemark": ""
  }
}

示例3：
原订单：商品名称"西红柿"，数量"3"，规格"斤"，备注""
用户说："改成黄瓜"
应返回：
{
  "action": "modify",
  "updatedOrder": {
    "nxDoGoodsName": "黄瓜",
    "nxDoQuantity": "3",
    "nxDoStandard": "斤",
    "nxDoRemark": ""
  }
}

示例4：
原订单：商品名称"白菜"，数量"5"，规格"斤"，备注"要新鲜的"
用户说："10斤"
应返回：
{
  "action": "modify",
  "updatedOrder": {
    "nxDoGoodsName": "白菜",
    "nxDoQuantity": "10",
    "nxDoStandard": "斤",
    "nxDoRemark": "要新鲜的"
  }
}

示例5（语音识别错误纠正）：
原订单：商品名称"网帽"，数量"10"，规格"个"，备注""
用户说："一戴" 或 "帽一戴"
应返回：
{
  "action": "modify",
  "updatedOrder": {
    "nxDoGoodsName": "网帽",
    "nxDoQuantity": "1",
    "nxDoStandard": "袋",
    "nxDoRemark": ""
  }
}
（注意："戴"不是计量单位，应纠正为"袋"，"一戴"应识别为"一袋"）

示例6（完整解析商品名称+数量+规格）：
原订单：商品名称"薄荷糖1代"，数量""，规格""，备注""
用户说："薄荷糖一袋"
应返回：
{
  "action": "modify",
  "updatedOrder": {
    "nxDoGoodsName": "薄荷糖",
    "nxDoQuantity": "1",
    "nxDoStandard": "袋",
    "nxDoRemark": ""
  }
}
（注意：必须将"薄荷糖一袋"解析为：商品名称"薄荷糖"，数量"1"，规格"袋"，不能把整个"薄荷糖一袋"放在商品名称中）

示例6b（备注清空：用户未提到备注时清空原备注）：
原订单：商品名称"生姜"，数量""，规格""，备注"析"
用户说："生姜八斤"
应返回：
{
  "action": "modify",
  "updatedOrder": {
    "nxDoGoodsName": "生姜",
    "nxDoQuantity": "8",
    "nxDoStandard": "斤",
    "nxDoRemark": ""
  }
}
（注意：用户未提到备注，必须清空原备注，nxDoRemark 返回 ""）

示例8（儿化音处理）：
原订单：商品名称"花"，数量"5"，规格"朵"，备注""
用户说："花儿10朵"
应返回：
{
  "action": "modify",
  "updatedOrder": {
    "nxDoGoodsName": "花",
    "nxDoQuantity": "10",
    "nxDoStandard": "朵",
    "nxDoRemark": ""
  }
}
（注意："花儿"要去除"儿"字，输出为"花"）

示例9（儿化音处理）：
原订单：商品名称"苹果"，数量"3"，规格"斤"，备注""
用户说："苹果儿5斤"
应返回：
{
  "action": "modify",
  "updatedOrder": {
    "nxDoGoodsName": "苹果",
    "nxDoQuantity": "5",
    "nxDoStandard": "斤",
    "nxDoRemark": ""
  }
}
（注意："苹果儿"要去除"儿"字，输出为"苹果"）

示例7（完整解析商品名称+数量+规格）：
原订单：商品名称"土豆"，数量"5"，规格"斤"，备注""
用户说："西红柿10个"
应返回：
{
  "action": "modify",
  "updatedOrder": {
    "nxDoGoodsName": "西红柿",
    "nxDoQuantity": "10",
    "nxDoStandard": "个",
    "nxDoRemark": ""
  }
}
（注意：必须将"西红柿10个"解析为：商品名称"西红柿"，数量"10"，规格"个"）

输出格式（修改订单时）：
{
  "action": "modify",
  "updatedOrder": {
    "nxDoGoodsName": "修改后的商品名称（字符串）",
    "nxDoQuantity": "修改后的数量（字符串）",
    "nxDoStandard": "修改后的规格（字符串）",
    "nxDoRemark": "修改后的备注（字符串，如果没有提到备注，保持原值）"
  }
}

输出格式（删除/新增订单时）：
{
  "action": "delete" 或 "add"
}`;
  } else {
    prompt += `

输出要求：
- 必须输出一个标准的 JSON 对象，不要包含 Markdown 标记、代码块标记或其他文字说明
- 只输出纯 JSON 对象，格式如下：
{"action": "modify|delete|add"}

字段说明：
- action: 操作类型（必填，字符串，只能是 "modify"、"delete"、"add" 之一）`;
  }

  // 添加示例（根据是否有原订单信息显示不同的示例）
  if (originalOrder) {
    prompt += `

示例：
输入："改成5斤"
输出：{"action": "modify", "updatedOrder": {"nxDoGoodsName": "${originalOrder.nxDoGoodsName || ''}", "nxDoQuantity": "5", "nxDoStandard": "斤", "nxDoRemark": "${originalOrder.nxDoRemark || ''}"}}

输入："1 包"
输出：{"action": "modify", "updatedOrder": {"nxDoGoodsName": "${originalOrder.nxDoGoodsName || ''}", "nxDoQuantity": "1", "nxDoStandard": "包", "nxDoRemark": "${originalOrder.nxDoRemark || ''}"}}

输入："删除"
输出：{"action": "delete"}

输入："新增一个土豆5斤"
输出：{"action": "add"}`;
  } else {
    prompt += `

示例：
输入："改成5斤"
输出：{"action": "modify"}

输入："删除"
输出：{"action": "delete"}

输入："新增一个土豆5斤"
输出：{"action": "add"}`;
  }

  prompt += `

请严格按照上述格式输出，只输出 JSON 对象，不要添加任何其他内容。`;

  return prompt;
}

const BUSINESS_TYPE_PROMPT = generateBusinessTypePrompt();

/**
 * 判断业务类型（修改/删除/新增）
 * @param {string} text - 识别文本
 * @param {Object} options - 配置选项
 * @param {Object} options.originalOrder - 原订单信息（可选，包含 nxDoGoodsName, nxDoQuantity, nxDoStandard, nxDoRemark）
 * @param {string} options.logPrefix - 日志前缀
 * @returns {Promise<{action: string, updatedOrder?: Object}>} 返回业务类型和修改后的订单（如果是修改）
 */
async function detectBusinessType(text, options = {}) {
  const { logPrefix = '[DeepSeekHelper]', originalOrder = null } = options;
  
  try {
    // 根据是否有原订单信息生成不同的 prompt
    const prompt = originalOrder ? generateBusinessTypePrompt(originalOrder) : BUSINESS_TYPE_PROMPT;
    
    const result = await optimizeTextWithDeepSeek(text, {
      systemPrompt: prompt,
      temperature: 0.1, // 降低温度，提高判断准确性
      logPrefix: logPrefix
    });
    
    // 解析 JSON 结果
    try {
      const parsed = JSON.parse(result);
      const action = parsed.action || 'modify'; // 默认修改
      
      // 如果是修改订单且有 updatedOrder，返回修改后的订单
      if (action === 'modify' && parsed.updatedOrder) {
        return { 
          action, 
          updatedOrder: parsed.updatedOrder 
        };
      }
      
      return { action };
    } catch (e) {
      console.error(`${logPrefix} 解析业务类型失败`);
      // 默认返回修改
      return { action: 'modify' };
    }
  } catch (error) {
    console.error(`${logPrefix} 业务类型判断失败:`, error && error.message);
    // 默认返回修改
    return { action: 'modify' };
  }
}

module.exports = {
  optimizeTextWithDeepSeek,
  detectBusinessType,
  DEFAULT_ORDER_PROMPT,
  generateBusinessTypePrompt
};

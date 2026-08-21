/**
 * 餐饮订单文字解析器 V2
 *
 * 设计目标：
 * 1. 先识别饭馆部门标题，再解析商品，避免把“凉菜/面点/后厨”当成商品。
 * 2. 以数量为锚点从右向左拆分，单位写错时仍能保住商品名和数量。
 * 3. 合法订单、自动修正项和待确认项同时返回，不因一行错误丢掉整批订单。
 * 4. 保留纯函数实现，便于小程序、桌面端和自动化测试复用。
 */

const CHINESE_NUMBER_CHARS = '零〇一二两三四五六七八九十百千万半';
const QUANTITY_TOKEN_SOURCE = `(?:\\d+(?:\\.\\d+)?|[${CHINESE_NUMBER_CHARS}]+)`;

const UNIT_DEFINITIONS = [
  { unit: '公斤', aliases: ['公斤', '千克', 'kg', 'KG', 'Kg', '㎏'] },
  { unit: '毫升', aliases: ['毫升', 'ml', 'ML', 'Ml', '㎖'] },
  { unit: '毫克', aliases: ['毫克', 'mg', 'MG', 'Mg'] },
  { unit: '斤', aliases: ['斤', '今', '金'] },
  { unit: '两', aliases: ['两', '俩'] },
  { unit: '克', aliases: ['克', 'g', 'G'] },
  { unit: '升', aliases: ['升', 'L', 'l'] },
  { unit: '个', aliases: ['个', '各'] },
  { unit: '只', aliases: ['只'] },
  { unit: '支', aliases: ['支', '枝'] },
  { unit: '对', aliases: ['对'] },
  { unit: '包', aliases: ['包'] },
  { unit: '扎', aliases: ['扎'] },
  { unit: '把', aliases: ['把'] },
  { unit: '束', aliases: ['束'] },
  { unit: '根', aliases: ['根'] },
  { unit: '棵', aliases: ['棵'] },
  { unit: '颗', aliases: ['颗'] },
  { unit: '条', aliases: ['条'] },
  { unit: '尾', aliases: ['尾'] },
  { unit: '头', aliases: ['头'] },
  { unit: '张', aliases: ['张'] },
  { unit: '板', aliases: ['板', '版'] },
  { unit: '盒', aliases: ['盒', '合'] },
  { unit: '听', aliases: ['听'] },
  { unit: '捆', aliases: ['捆'] },
  { unit: '袋', aliases: ['袋', '代', '戴'] },
  { unit: '提', aliases: ['提'] },
  { unit: '跟', aliases: ['跟'] },
  { unit: '块', aliases: ['块'] },
  { unit: '瓶', aliases: ['瓶', '平'] },
  { unit: '罐', aliases: ['罐', '灌'] },
  { unit: '桶', aliases: ['桶', '捅', '筒', '同'] },
  { unit: '箱', aliases: ['箱'] },
  { unit: '件', aliases: ['件', '建'] },
  { unit: '筐', aliases: ['筐', '框'] },
  { unit: '篮', aliases: ['篮', '蓝'] },
  { unit: '盘', aliases: ['盘'] },
  { unit: '卷', aliases: ['卷'] },
  { unit: '杯', aliases: ['杯'] },
  { unit: '套', aliases: ['套'] },
  { unit: '枚', aliases: ['枚'] },
  { unit: '组', aliases: ['组'] },
  { unit: '份', aliases: ['份'] },
  { unit: '盆', aliases: ['盆'] },
  { unit: '壶', aliases: ['壶'] },
  { unit: '缸', aliases: ['缸'] },
  { unit: '肠', aliases: ['肠'] },
  { unit: '目', aliases: ['目'] }
];

const UNIT_ALIAS_MAP = buildUnitAliasMap();
const UNIT_ALIASES = Array.from(UNIT_ALIAS_MAP.keys()).sort((a, b) => b.length - a.length);

function buildUnitAliasMap() {
  const map = new Map();
  UNIT_DEFINITIONS.forEach(definition => {
    definition.aliases.forEach(alias => {
      map.set(alias, definition.unit);
    });
  });
  return map;
}

function fullWidthToHalf(text) {
  return String(text == null ? '' : text).replace(/[！-～]/g, char =>
    String.fromCharCode(char.charCodeAt(0) - 0xFEE0)
  ).replace(/　/g, ' ');
}

function normalizeText(content) {
  return fullWidthToHalf(content)
    .replace(/\r\n?/g, '\n')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/王守义13[箱香]/g, '王守义十三香')
    .replace(/[^\S\n]+/g, ' ')
    .trim();
}

function normalizeDepartmentName(name) {
  return fullWidthToHalf(name)
    .trim()
    .replace(/[：:，,。；;、\s]/g, '')
    .replace(/(?:部门|档口|档|组|部)$/g, '')
    .toLowerCase();
}

function departmentAliases(name) {
  const raw = String(name || '').trim();
  const aliases = new Set();
  if (!raw) return aliases;
  aliases.add(normalizeDepartmentName(raw));
  raw.split(/[-—_\/]/).forEach(part => {
    const normalized = normalizeDepartmentName(part);
    if (normalized) aliases.add(normalized);
  });
  return aliases;
}

function normalizeDepartments(departments, options) {
  const result = [];
  const seen = new Set();
  const add = department => {
    if (!department) return;
    const id = department.id != null ? department.id : department.nxDepartmentId;
    const name = department.name || department.nxDepartmentName || department.nxDepartmentAttrName || '';
    if (id == null || !name) return;
    const key = String(id);
    if (seen.has(key)) return;
    seen.add(key);
    result.push({
      id,
      fatherId: department.fatherId != null
        ? department.fatherId
        : (department.nxDepartmentFatherId != null ? department.nxDepartmentFatherId : options.depFatherId),
      name,
      aliases: departmentAliases(name)
    });
  };

  (Array.isArray(departments) ? departments : []).forEach(add);
  add({
    id: options.depId,
    fatherId: options.depFatherId,
    name: options.depName || options.defaultDepartmentName || ''
  });
  return result;
}

function findDepartmentHeader(segment, departments) {
  const normalized = normalizeDepartmentName(segment);
  if (!normalized || /\d/.test(normalized)) return null;
  return departments.find(department => department.aliases.has(normalized)) || null;
}

function chineseNumberToArabic(chineseNum) {
  if (!chineseNum) return null;
  if (chineseNum === '半') return 0.5;
  const digitMap = {
    零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4,
    五: 5, 六: 6, 七: 7, 八: 8, 九: 9
  };
  const unitMap = { 十: 10, 百: 100, 千: 1000, 万: 10000 };
  let total = 0;
  let section = 0;
  let number = 0;
  let hasUnit = false;

  for (const char of chineseNum) {
    if (char === '半') {
      total += 0.5;
      continue;
    }
    if (digitMap[char] != null) {
      number = digitMap[char];
      continue;
    }
    const unit = unitMap[char];
    if (unit) {
      hasUnit = true;
      if (unit === 10000) {
        section = (section + (number || 0)) * unit;
        total += section;
        section = 0;
      } else {
        section += (number || 1) * unit;
      }
      number = 0;
    }
  }
  if (!hasUnit) {
    const digits = Array.from(chineseNum)
      .filter(char => digitMap[char] != null)
      .map(char => digitMap[char])
      .join('');
    return digits ? Number(digits) : null;
  }
  return total + section + number;
}

function parseQuantity(raw) {
  if (/^\d+(?:\.\d+)?$/.test(raw)) return Number(raw);
  return chineseNumberToArabic(raw);
}

function splitItems(text) {
  const result = [];
  let depth = 0;
  let current = '';
  for (const char of text) {
    if ('（(【['.includes(char)) {
      depth += 1;
      current += char;
    } else if ('）)】]'.includes(char)) {
      depth = Math.max(0, depth - 1);
      current += char;
    } else if ('，,、；;。!！|\t'.includes(char) && depth === 0) {
      if (current.trim()) result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  if (current.trim()) result.push(current.trim());
  return result;
}

function extractRemark(segment) {
  const remarks = [];
  const cleaned = segment.replace(/(?:（|\(|【|\[)(.+?)(?:）|\)|】|\])/g, (_, remark) => {
    if (remark && remark.trim()) remarks.push(remark.trim());
    return '';
  }).trim();
  return { cleaned, remark: remarks.join(' ') };
}

function matchUnitCandidate(suffix) {
  const compact = String(suffix || '').replace(/\s+/g, '');
  if (!compact) return null;
  for (const alias of UNIT_ALIASES) {
    if (compact.startsWith(alias)) {
      const canonical = UNIT_ALIAS_MAP.get(alias);
      return {
        unit: canonical,
        rawUnit: alias,
        remainder: compact.slice(alias.length),
        corrected: canonical !== alias,
        confidence: canonical === alias ? 1 : 0.96
      };
    }
  }
  return null;
}

function quantityMatches(text) {
  const regex = new RegExp(QUANTITY_TOKEN_SOURCE, 'g');
  return Array.from(text.matchAll(regex));
}

function cleanGoodsName(name) {
  return String(name || '')
    .replace(/^\d+[、.．]\s*/, '')
    .replace(/^[：:\-—]+/, '')
    .replace(/\s+/g, '')
    .trim();
}

function parseSegment(segment) {
  const sourceText = segment.trim();
  const remarkResult = extractRemark(sourceText.replace(/[。，,、；;]+$/g, ''));
  let text = remarkResult.cleaned
    .replace(/^\d+[、.．]\s*/, '')
    .replace(/^备注[:：]\s*/, '')
    .trim();

  // “加2箱起酥油”“再加丁香油一桶”中的“加”属于口语命令，不属于商品名。
  text = text.replace(/^(?:再?加上?|来)\s*(?=.*(?:\d|[一二两三四五六七八九十百千万半]))/, '');
  if (!text) return null;

  const matches = quantityMatches(text);
  for (let index = matches.length - 1; index >= 0; index -= 1) {
    const match = matches[index];
    const before = text.slice(0, match.index).trim();
    const after = text.slice(match.index + match[0].length).trim();
    const unitMatch = matchUnitCandidate(after);
    if (!unitMatch) continue;

    let goodsName = cleanGoodsName(before);
    let remainder = unitMatch.remainder;
    // 数量在开头：2箱满特起酥油
    if (!goodsName) {
      goodsName = cleanGoodsName(remainder);
      remainder = '';
    }
    if (!goodsName || !/[\u3400-\u9fffA-Za-z]/.test(goodsName)) continue;

    const quantity = parseQuantity(match[0]);
    if (!(quantity > 0)) continue;
    const trailingRemark = remainder ? remainder : '';
    const remark = [remarkResult.remark, trailingRemark].filter(Boolean).join(' ');
    return {
      goodsName,
      quantity,
      unit: unitMatch.unit,
      rawUnit: unitMatch.rawUnit,
      remark,
      corrected: unitMatch.corrected,
      confidence: unitMatch.confidence,
      sourceText
    };
  }

  // 找到了数量但单位不认识：仍保留拆分结果，交给用户或 AI 修正。
  if (matches.length > 0) {
    const match = matches[matches.length - 1];
    const before = cleanGoodsName(text.slice(0, match.index));
    const after = text.slice(match.index + match[0].length).replace(/\s+/g, '');
    const quantity = parseQuantity(match[0]);
    if (before && quantity > 0 && after && after.length <= 4) {
      return {
        goodsName: before,
        quantity,
        unit: after,
        rawUnit: after,
        remark: remarkResult.remark,
        corrected: false,
        confidence: 0.45,
        needsReview: true,
        warning: `单位“${after}”未识别`,
        sourceText
      };
    }
  }

  return {
    goodsName: cleanGoodsName(text),
    quantity: null,
    unit: '',
    rawUnit: '',
    remark: remarkResult.remark,
    corrected: false,
    confidence: 0.3,
    needsReview: true,
    warning: '缺少数量或单位',
    sourceText
  };
}

function makeOrderItem(parsed, department, options) {
  const departmentId = department && department.id != null ? department.id : options.depId;
  const departmentFatherId = department && department.fatherId != null
    ? department.fatherId
    : options.depFatherId;
  const valid = !!(parsed.goodsName && parsed.quantity > 0 && parsed.unit && !parsed.needsReview);
  return {
    nxDoGoodsName: parsed.goodsName || '',
    nxDoGoodsOriginalName: parsed.goodsName || '',
    nxDoQuantity: parsed.quantity != null ? String(parsed.quantity) : '',
    nxDoStandard: parsed.unit || '',
    nxDoRemark: parsed.remark || '',
    nxDoAddRemark: !!parsed.remark,
    nxDoStatus: -2,
    nxDoDepartmentId: departmentId,
    nxDoDepartmentFatherId: departmentFatherId,
    nxDoDisGoodsId: null,
    nxDoStandardWarn: 0,
    goodsNameWarn: 0,
    nxDoDistributerId: options.disId != null ? options.disId : null,
    nxDoPurchaseUserId: -1,
    nxDoOrderUserId: options.userId != null ? options.userId : -1,
    nxDoIsAgent: -1,
    standardWeight: '',
    cartonUnit: '',
    itemUnit: '',
    itemsPerCarton: '',
    nxDoIsValid: valid,
    v2DepartmentName: department ? department.name : (options.depName || ''),
    v2Confidence: parsed.confidence >= 0.9 ? 'high' : (parsed.confidence >= 0.65 ? 'medium' : 'low'),
    v2NeedsReview: !valid,
    v2Warning: parsed.warning || '',
    v2SourceText: parsed.sourceText || '',
    v2CorrectionText: parsed.corrected ? `${parsed.rawUnit} → ${parsed.unit}` : ''
  };
}

function validateJsonItem(item) {
  if (!item || typeof item !== 'object') return null;
  const unitMatch = matchUnitCandidate(item.unit || item.standard || '');
  const quantity = parseQuantity(String(item.qty != null ? item.qty : item.quantity || ''));
  return {
    goodsName: String(item.name || item.goodsName || '').trim(),
    quantity,
    unit: unitMatch ? unitMatch.unit : String(item.unit || item.standard || '').trim(),
    rawUnit: unitMatch ? unitMatch.rawUnit : String(item.unit || item.standard || '').trim(),
    remark: String(item.remark || '').trim(),
    corrected: !!(unitMatch && unitMatch.corrected),
    confidence: unitMatch ? unitMatch.confidence : 0.55,
    needsReview: !(item.name || item.goodsName) || !(quantity > 0) || !unitMatch,
    warning: !unitMatch ? 'AI返回的单位仍需确认' : '',
    sourceText: JSON.stringify(item),
    departmentName: item.departmentName || item.department || ''
  };
}

function parseJsonOrders(content, departments, options) {
  let jsonText = content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
  let parsed;
  try {
    parsed = JSON.parse(jsonText);
  } catch (error) {
    return null;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return null;

  const orders = [];
  const corrections = [];
  parsed.forEach((item, index) => {
    const normalized = validateJsonItem(item);
    if (!normalized) return;
    const namedDepartment = normalized.departmentName
      ? findDepartmentHeader(normalized.departmentName, departments)
      : null;
    const department = namedDepartment || departments.find(dep => String(dep.id) === String(options.depId)) || null;
    const order = makeOrderItem(normalized, department, options);
    orders.push(order);
    if (normalized.corrected) {
      corrections.push({
        lineIndex: index,
        segmentText: normalized.sourceText,
        type: 'unit',
        from: normalized.rawUnit,
        to: normalized.unit,
        message: `${normalized.rawUnit}已修正为${normalized.unit}`
      });
    }
  });
  return { orders, corrections, departmentSegments: [] };
}

function summarize(orders, corrections, departmentSegments) {
  const reviewCount = orders.filter(order => order.v2NeedsReview).length;
  return {
    totalCount: orders.length,
    validCount: orders.length - reviewCount,
    reviewCount,
    correctionCount: corrections.length,
    departmentCount: new Set(orders.map(order => String(order.nxDoDepartmentId))).size,
    headerCount: departmentSegments.length
  };
}

function parseOrderFromTextV2(content, options = {}) {
  const normalizedContent = normalizeText(content);
  if (!normalizedContent) {
    return {
      orders: [], corrections: [], departmentSegments: [], unresolvedSegments: [],
      summary: summarize([], [], []), contentForHighlight: ''
    };
  }

  const departments = normalizeDepartments(options.departments, options);
  const defaultDepartment = departments.find(dep => String(dep.id) === String(options.depId)) || departments[0] || null;
  const jsonResult = parseJsonOrders(normalizedContent, departments, options);
  if (jsonResult) {
    const unresolvedSegments = jsonResult.orders
      .map((order, index) => order.v2NeedsReview ? { lineIndex: index, segmentText: order.v2SourceText, warning: order.v2Warning } : null)
      .filter(Boolean);
    return {
      ...jsonResult,
      unresolvedSegments,
      summary: summarize(jsonResult.orders, jsonResult.corrections, jsonResult.departmentSegments),
      contentForHighlight: normalizedContent
    };
  }

  const orders = [];
  const corrections = [];
  const departmentSegments = [];
  const unresolvedSegments = [];
  let currentDepartment = defaultDepartment;
  const lines = normalizedContent.split('\n');

  lines.forEach((rawLine, lineIndex) => {
    const line = rawLine.trim();
    if (!line) return;

    const directHeader = findDepartmentHeader(line, departments);
    if (directHeader) {
      currentDepartment = directHeader;
      departmentSegments.push({
        lineIndex,
        segmentText: line,
        departmentId: directHeader.id,
        departmentName: directHeader.name
      });
      return;
    }

    // 支持“凉菜：木耳2斤”这种部门标题与第一条商品写在同一行的情况。
    let itemLine = line;
    const inlineHeaderMatch = line.match(/^([^:：]{1,20})[:：]\s*(.+)$/);
    if (inlineHeaderMatch) {
      const inlineDepartment = findDepartmentHeader(inlineHeaderMatch[1], departments);
      if (inlineDepartment) {
        currentDepartment = inlineDepartment;
        departmentSegments.push({
          lineIndex,
          segmentText: inlineHeaderMatch[1],
          departmentId: inlineDepartment.id,
          departmentName: inlineDepartment.name
        });
        itemLine = inlineHeaderMatch[2].trim();
      }
    }

    if (/^备注[:：]/.test(itemLine) && orders.length > 0) {
      const note = itemLine.replace(/^备注[:：]/, '').trim();
      const last = orders[orders.length - 1];
      last.nxDoRemark = [last.nxDoRemark, note].filter(Boolean).join(' ');
      last.nxDoAddRemark = !!last.nxDoRemark;
      return;
    }

    splitItems(itemLine).forEach(segment => {
      const header = findDepartmentHeader(segment, departments);
      if (header) {
        currentDepartment = header;
        departmentSegments.push({
          lineIndex,
          segmentText: segment,
          departmentId: header.id,
          departmentName: header.name
        });
        return;
      }

      const parsed = parseSegment(segment);
      if (!parsed || !parsed.goodsName) return;
      const order = makeOrderItem(parsed, currentDepartment, options);
      orders.push(order);

      if (parsed.corrected) {
        corrections.push({
          lineIndex,
          segmentText: segment,
          type: 'unit',
          from: parsed.rawUnit,
          to: parsed.unit,
          message: `“${parsed.rawUnit}”已自动修正为“${parsed.unit}”`
        });
      }
      if (order.v2NeedsReview) {
        unresolvedSegments.push({
          lineIndex,
          segmentText: segment,
          warning: order.v2Warning
        });
      }
    });
  });

  return {
    orders,
    corrections,
    departmentSegments,
    unresolvedSegments,
    summary: summarize(orders, corrections, departmentSegments),
    contentForHighlight: normalizedContent
  };
}

export {
  parseOrderFromTextV2,
  chineseNumberToArabic,
  normalizeDepartmentName,
  UNIT_DEFINITIONS
};

/**
 * 校验单条订单（与 PlaceOrder.checkOrderContent 规则一致）
 * @returns {string|null} 错误信息，通过返回 null
 */
function validateOrder(order) {
  if (!order.nxDoGoodsName || order.nxDoGoodsName.trim() === '') {
    return '商品名称为空';
  }
  const qty = order.nxDoQuantity;
  if (qty === undefined || qty === null || String(qty).trim() === '') {
    return '数量为空';
  }
  const qtyNum = Number(qty);
  if (Number.isNaN(qtyNum)) {
    return '数量必须是数字';
  }
  if (qtyNum <= 0) {
    return '数量必须大于 0';
  }
  if (!order.nxDoStandard || order.nxDoStandard.trim() === '') {
    return '规格为空';
  }
  const spec = order.nxDoStandard.trim();
  const chineseOnly = /^[\u4e00-\u9fff]+$/;
  if (!chineseOnly.test(spec)) {
    return '规格必须为汉字';
  }
  if (spec.length > 2) {
    return `规格汉字数量不能大于 2 个，当前为 ${spec.length} 个`;
  }
  return null;
}

/**
 * 粘贴订单解析 - 从 cankao/formatOrder.js（微信小程序）提取
 * 本地解析，不调用 DeepSeek
 * @returns {{ orders: Array, formatted: string, invalidLineIndices: number[] }}
 */
export function parseOrderFromText(content) {
  if (!content || (typeof content === 'string' && content.trim() === '')) {
    return { orders: [], formatted: '', invalidLineIndices: [] };
  }
  content = String(content);

  console.log('[formatOrderContent] 入参 content:', content);
  let orders = [];
  const allLines = content.split(/\r?\n/);

  function shouldProcessLine(line) {
    const trimmed = line.trim();
    if (!trimmed) return false;
    if (/^备注[:：]/.test(trimmed)) return true;
    const orderRegex = /^\d+[、，\.．]\s*(.+?)[:：]\s*(.+)$/;
    if (orderRegex.test(trimmed)) return true;
    const commaRegex = /^(.*?)\s*[\,，]\s*(.+)$/;
    if (commaRegex.test(trimmed)) return true;
    const hasNumber = /[\d零一二两三四五六七八九十百千万半]/.test(trimmed);
    return hasNumber;
  }
  
  // ============ A. 中文数字转阿拉伯数字 ============
  function chineseNumberToArabic(chineseNum) {
    const map = {
      '零': 0, '一': 1, '二': 2, '两': 2, '三': 3,
      '四': 4, '五': 5, '六': 6, '七': 7, '八': 8,
      '九': 9, '十': 10, '百': 100, '千': 1000,
      '万': 10000, '半': 0.5
    };
    let result = 0, temp = 0;
    for (let i = 0; i < chineseNum.length; i++) {
      const char = chineseNum[i];
      if (char === '半') {
        result += 0.5;
      } else if (map[char] >= 10) {
        if (temp === 0) temp = 1;
        result += temp * map[char];
        temp = 0;
      } else if (map[char] !== undefined) {
        temp = temp * 10 + map[char];
      }
    }
    result += temp;
    return result;
  }
  
  // ============ B. 从尾部解析「名称 + 括号备注 + 数量+单位」 ============
  const validUnits = ['斤', '个', '包', '根', '棵', '条', '盒', '捆', '袋', '跟', '块', '瓶', '罐', '桶', '箱', '件'];

  function parseSegmentEndOfLine(segment) {
    segment = segment.trim().replace(/[,，、。.]+$/g, '');
  
    // 「加」字前缀：加2箱满特起酥油 → 2箱满特起酥油（便于按数量单位前置格式解析）
    if (/^加\s*[\d\.一二两三四五六七八九十百千万半]/.test(segment)) {
      segment = segment.replace(/^加\s*/, '').trim();
    }
  
    // 先移除说明文字，避免被当作备注
    segment = segment.replace(/（说明.+?）/g, '');
    
    const bracketRegex = /(?:（|\(|【)(.+?)(?:）|\)|】)/;
    let remarkText = '';
    const bracketMatch = segment.match(bracketRegex);
    if (bracketMatch) {
      remarkText = bracketMatch[1];
      segment = segment.replace(bracketRegex, '').trim();
    }
  
    const hasArabic = /[0-9]/.test(segment);
    let name = segment, qtyVal = '', qtyUnit = '', regex;

    // 优先：数量+单位 前置格式，如 "2箱满特起酥油"
    if (hasArabic) {
      const unitPattern = validUnits.join('|');
      const fromLeftRegex = new RegExp(`^([\\d\\.]+)(${unitPattern})(.+)$`);
      const mLeft = segment.match(fromLeftRegex);
      if (mLeft) {
        const leftQty = mLeft[1].trim();
        const leftUnit = mLeft[2];
        const leftName = mLeft[3].trim().replace(/\s+/g, '');
        if (leftName && /[\u4e00-\u9fa5]/.test(leftName)) {
          name = leftName;
          qtyVal = leftQty;
          qtyUnit = leftUnit;
          console.log('[parseSegmentEndOfLine] 数量单位前置解析成功:', { name, qtyVal, qtyUnit });
          return {
            nxDoGoodsName: name,
            nxDoGoodsOrignialName: name,
            nxDoQuantity: qtyVal,
            nxDoStandard: qtyUnit,
            nxDoRemark: remarkText,
          };
        }
      }
    }
  
    // 支持数量与单位之间的空格，如「黄贡椒 1 件」
    if (hasArabic) {
      regex = /^(.*?)([\d\.]+)\s*(\S*)$/;
    } else {
      regex = /^(.*?)([一二两三四五六七八九十百千万半]+)\s*(\S*)$/;
    }
    const m = segment.match(regex);
    if (m) {
      let potentialName = m[1].trim().replace(/\s+/g, '');
      let potentialQty  = m[2].trim();
      let potentialUnit = m[3].trim();
      name = potentialName;
  
      console.log('[parseSegmentEndOfLine] 解析结果:', {
        segment,
        potentialName,
        potentialQty,
        potentialUnit
      });
  
      // 数量值
      if (/^[\d\.]+$/.test(potentialQty)) {
        qtyVal = potentialQty;
      } else {
        qtyVal = chineseNumberToArabic(potentialQty).toString();
      }
  
      // 单位列表
      let foundUnit = '';
      for (let u of validUnits) {
        if (potentialUnit.startsWith(u)) {
          foundUnit = u; break;
        }
      }
      if (foundUnit) {
        qtyUnit = foundUnit;
        const extra = potentialUnit.slice(foundUnit.length).trim();
        if (extra) remarkText = remarkText ? (remarkText + ' ' + extra) : extra;
      } else {
        qtyUnit = potentialUnit;
      }
      
      // 兜底：当商品名为空或规格无效（非1-2汉字）时，尝试从右往左解析
      // 场景：商品名含数字如 "1.6蒸鱼3箱"、"1.5丘比培煎芝麻沙拉汁1箱"、"800美级1箱"
      const specValid = qtyUnit && /^[\u4e00-\u9fff]+$/.test(qtyUnit) && qtyUnit.length <= 2;
      if ((!name || !specValid) && hasArabic) {
        const unitPattern = validUnits.join('|');
        const fromRightRegex = new RegExp(`^(.+?)([\\d\\.]+)(${unitPattern})$`);
        const m2 = segment.match(fromRightRegex);
        if (m2) {
          const rightName = m2[1].trim().replace(/\s+/g, '');
          const rightQty = m2[2].trim();
          const rightUnit = m2[3];
          if (rightName && /[\u4e00-\u9fa5]/.test(rightName)) {
            name = rightName;
            qtyVal = rightQty;
            qtyUnit = rightUnit;
            console.log('[parseSegmentEndOfLine] 从右往左兜底成功:', { name, qtyVal, qtyUnit });
          }
        }
      }
      
      console.log('[parseSegmentEndOfLine] 最终结果:', {
        name,
        qtyVal,
        qtyUnit,
        remarkText
      });
    }
  
    return {
      nxDoGoodsName: name,
      nxDoGoodsOrignialName: name, // 保存原始商品名称
      nxDoQuantity:  qtyVal,
      nxDoStandard:  qtyUnit,
      nxDoRemark:    remarkText,
    };
  }
  
  // ============ C. 序号格式解析 ============
  function parseLineWithSerial(line) {
    const match = line.match(/^(\d+)[、，\.．]\s*(.+?)[:：]\s*(.+)$/);
    if (!match) return null;
  
    let namePart = match[2].trim().replace(/\s+/g, '');
    let qtyPart  = match[3].trim().replace(/[\.。]+$/g, '').trim();
  
    // 先移除说明文字，避免被当作备注
    namePart = namePart.replace(/（说明.+?）/g, '');
    qtyPart = qtyPart.replace(/（说明.+?）/g, '');
  
    let remarkText = '';
    const br = namePart.match(/(?:（|\(|【)(.+?)(?:）|\)|】)/);
    if (br) { remarkText = br[1]; namePart = namePart.replace(/(?:（|\(|【).+?(?:）|\)|】)/, '').trim(); }
  
    const qMatch = qtyPart.match(/^([\d一二三四五六七八九十百千万半\.]+)\s*(\S*)$/);
    let val = '', unit = '';
    if (qMatch) { val = qMatch[1]; unit = qMatch[2]; }
    if (/[零一二两三四五六七八九十百千万半]/.test(val)) {
      val = chineseNumberToArabic(val).toString();
    }
    if (unit === '两' || unit === '量') {
      let v = parseFloat(val) / 10; v = +v.toFixed(1);
      val = v.toString(); unit = '斤';
    }
  
    return {
      nxDoGoodsName: namePart,
      nxDoGoodsOrignialName: namePart, // 保存原始商品名称
      nxDoQuantity:  val,
      nxDoStandard:  unit,
      nxDoRemark:    remarkText
    };
  }
  
  // ============ D. 拆逗号分隔 ============
  function splitByCommaOutsideBrackets(str) {
    let res = [], depth = 0, cur = '';
    for (let c of str) {
      if ('（(【'.includes(c)) { depth++; cur += c; }
      else if ('）)】'.includes(c)) { depth = Math.max(0, depth - 1); cur += c; }
      else if ((c === ','||c==='，'||c==='、') && depth === 0) {
        if (cur.trim()) res.push(cur.trim());
        cur = '';
      } else cur += c;
    }
    if (cur.trim()) res.push(cur.trim());
    return res;
  }
  
  function parseLineWithComma(line) {
    console.log('[parseLineWithComma] 开始解析行:', line);
    
    // 先移除说明文字（格式：说明...），避免说明文字中的逗号影响分割
    // 说明文字格式：（说明...）或（说明...）
    let remarkText = '';
    const remarkMatch = line.match(/（说明(.+?)）/);
    if (remarkMatch) {
      remarkText = remarkMatch[1];
      line = line.replace(/（说明.+?）/g, '').trim();
      console.log('[parseLineWithComma] 移除说明文字后:', line, '说明内容:', remarkText);
    }
    
    // 先按逗号分割，处理逗号分隔的商品
    if (/[，,]/.test(line)) {
      let commaParts = line.split(/[，,]/);
      let arr = [];
      
      console.log('[parseLineWithComma] 按逗号分割后的部分:', commaParts);
      
      for (let i = 0; i < commaParts.length; i++) {
        let item = commaParts[i].trim();
        if (!item) continue;
        
                  console.log('[parseLineWithComma] 处理逗号分割部分:', item);
        
        // 检查是否包含多个商品（用空格分隔）
        if (/\s/.test(item) && item.length > 10) {
          console.log('[parseLineWithComma] 检测到可能包含多个商品，尝试进一步分割:', item);
          let subParts = item.split(/\s+/);
          let subArr = [];
          
          for (let j = 0; j < subParts.length; j++) {
            let subItem = subParts[j].trim();
            if (!subItem) continue;
            
            console.log('[parseLineWithComma] 处理子部分:', subItem);
            
            // 检查子部分是否包含数字
            const subItemHasNumber = /[\d一二两三四五六七八九十百千万半]/.test(subItem);
            
            // 如果子部分没有数字，且下一部分有数字+单位格式，优先组合处理
            if (!subItemHasNumber && j < subParts.length - 1) {
              let nextSubItem = subParts[j + 1].trim();
              const nextSubItemHasNumberUnit = /^[\d一二两三四五六七八九十百千万半\.]+[斤个包根棵条盒捆袋跟块瓶罐桶箱毫升升克千克公斤件]+/.test(nextSubItem);
              
              if (nextSubItem && nextSubItemHasNumberUnit) {
                let combinedSub = subItem + nextSubItem;
                console.log('[parseLineWithComma] 子部分无数字，优先组合:', combinedSub);
                
                // 使用从右往左匹配
                const unitMatch = combinedSub.match(/([斤个包根棵条盒捆袋跟块瓶罐桶箱毫升升克千克公斤]+)$/);
                if (unitMatch) {
                  let unit = unitMatch[1];
                  const beforeUnit = combinedSub.slice(0, -unit.length);
                  
                  const qtyMatch = beforeUnit.match(/([\d一二两三四五六七八九十百千万半\.]+)$/);
                  if (qtyMatch) {
                    const quantity = qtyMatch[1];
                    const goodsName = beforeUnit.slice(0, -quantity.length).trim();
                    
                    if (goodsName && /[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0) {
                      let qtyVal = quantity;
                      if (/[零一二两三四五六七八九十百千万半]/.test(quantity)) {
                        qtyVal = chineseNumberToArabic(quantity).toString();
                      }
                      
                      let subRemarkText = '';
                      const bracketRegex = /(?:（|\(|【)(.+?)(?:）|\)|】)/;
                      const bracketMatch = unit.match(bracketRegex);
                      if (bracketMatch) {
                        subRemarkText = bracketMatch[1];
                        unit = unit.replace(bracketRegex, '').trim();
                      }
                      
                      console.log('[parseLineWithComma] 子部分组合成功:', { goodsName, qtyVal, unit });
                      subArr.push({
                        nxDoGoodsName: goodsName,
                        nxDoGoodsOrignialName: goodsName, // 保存原始商品名称
                        nxDoQuantity: qtyVal,
                        nxDoStandard: unit,
                        nxDoRemark: subRemarkText || remarkText
                      });
                      j++; // 跳过下一个部分
                      continue;
                    }
                  }
                }
              }
            }
            
            // 对子部分进行解析
            let subMm = subItem.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)(\S*)$/);
            if (subMm) {
              let subGoodsName = subMm[1].trim();
              let subQuantity = subMm[2].trim();
              let subUnit = subMm[3].trim().replace(/[。，,\.]+$/, ''); // 去掉末尾的标点符号
              
              console.log('[parseLineWithComma] 子部分匹配成功:', { subGoodsName, subQuantity, subUnit });
              
              // 验证：如果数量是单个中文字符，且商品名以中文结尾，可能是误匹配
              const isSingleChineseNumber = /^[一二两三四五六七八九十]$/.test(subQuantity);
              const subGoodsNameEndsWithChinese = /[\u4e00-\u9fa5]$/.test(subGoodsName);
              
              if (isSingleChineseNumber && subGoodsNameEndsWithChinese && j < subParts.length - 1) {
                // 可能是误匹配，跳过这个子部分，让下一轮循环处理组合
                console.log('[parseLineWithComma] 子部分可能是误匹配，跳过');
                continue;
              }
              
              if (/[\u4e00-\u9fa5]/.test(subGoodsName) && subGoodsName.length > 0 && subGoodsName.length <= 10) {
                let subQtyVal = subQuantity;
                if (/[零一二两三四五六七八九十百千万半]/.test(subQuantity)) {
                  subQtyVal = chineseNumberToArabic(subQuantity).toString();
                }
                
                console.log('[parseLineWithComma] 添加子商品:', { subGoodsName, subQtyVal, subUnit });
                subArr.push({
                  nxDoGoodsName: subGoodsName,
                  nxDoGoodsOrignialName: subGoodsName, // 保存原始商品名称
                  nxDoQuantity: subQtyVal,
                  nxDoStandard: subUnit,
                  nxDoRemark: remarkText
                });
              }
            } else {
              // 尝试使用 parseSegmentEndOfLine 解析子部分
              let subParsed = parseSegmentEndOfLine(subItem);
              if (subParsed && subParsed.nxDoQuantity) {
                console.log('[parseLineWithComma] 子部分 parseSegmentEndOfLine 解析结果:', subParsed);
                if (remarkText) {
                  subParsed.nxDoRemark = (subParsed.nxDoRemark || '') + ' ' + remarkText;
                }
                // 确保有原始商品名称字段
                if (!subParsed.nxDoGoodsOrignialName) {
                  subParsed.nxDoGoodsOrignialName = subParsed.nxDoGoodsName || '';
                }
                subArr.push(subParsed);
              }
            }
          }
          
          if (subArr.length > 0) {
            console.log('[parseLineWithComma] 子部分解析成功，添加多个商品:', subArr);
            arr.push(...subArr);
            continue;
          }
        }
        
        // 1. 尝试匹配 "商品名+数字+单位" 格式
        let mm = item.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)(\S*)$/);
        console.log('[parseLineWithComma] 正则匹配结果:', mm);
        if (mm) {
          let goodsName = mm[1].trim();
          let quantity = mm[2].trim();
          let unit = mm[3].trim().replace(/[。，,\.]+$/, ''); // 去掉末尾的标点符号
          
          console.log('[parseLineWithComma] 匹配到格式1:', { goodsName, quantity, unit });
          
          // 验证商品名包含中文字符，并且商品名不能太长（避免匹配到多个商品）
          console.log('[parseLineWithComma] 验证商品名:', { goodsName, hasChinese: /[\u4e00-\u9fa5]/.test(goodsName), length: goodsName.length });
          if (/[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0 && goodsName.length <= 10) {
            let qtyVal = quantity;
            if (/[零一二两三四五六七八九十百千万半]/.test(quantity)) {
              qtyVal = chineseNumberToArabic(quantity).toString();
            }
            
            console.log('[parseLineWithComma] 添加商品:', { goodsName, qtyVal, unit });
            arr.push({
              nxDoGoodsName: goodsName,
              nxDoGoodsOrignialName: goodsName, // 保存原始商品名称
              nxDoQuantity: qtyVal,
              nxDoStandard: unit,
              nxDoRemark: '',
              _sourceSegmentText: item
            });
            continue;
          } else {
            console.log('[parseLineWithComma] 商品名验证失败:', { goodsName, hasChinese: /[\u4e00-\u9fa5]/.test(goodsName), length: goodsName.length });
          }
        }
        
        // 2. 尝试使用 parseSegmentEndOfLine 解析
        let parsed = parseSegmentEndOfLine(item);
        if (parsed && parsed.nxDoQuantity) {
          console.log('[parseLineWithComma] parseSegmentEndOfLine 解析结果:', parsed);
          // 确保有原始商品名称字段
          if (!parsed.nxDoGoodsOrignialName) {
            parsed.nxDoGoodsOrignialName = parsed.nxDoGoodsName || '';
          }
          parsed._sourceSegmentText = item;
          arr.push(parsed);
          continue;
        }
        
        // 3. 如果都失败了，尝试匹配纯数字格式
        mm = item.match(/^(.+?)(\d+)(.+)$/);
        if (mm) {
          let goodsName = mm[1].trim();
          if (/[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0) {
            console.log('[parseLineWithComma] 匹配到纯数字格式:', mm);
            arr.push({
              nxDoGoodsName: goodsName,
              nxDoGoodsOrignialName: goodsName, // 保存原始商品名称
              nxDoQuantity: mm[2].trim(),
              nxDoStandard: mm[3].trim(),
              nxDoRemark: '',
              _sourceSegmentText: item
            });
            continue;
          }
        }
        
        // 4. 新增：尝试组合相邻部分
        if (i < commaParts.length - 1) {
          let nextItem = commaParts[i + 1].trim();
          if (nextItem) {
            let combined = item + nextItem;
            console.log('[parseLineWithComma] 尝试组合:', combined);
            
            // 尝试匹配组合后的格式
            mm = combined.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)(\S*)$/);
            if (mm) {
              let goodsName = mm[1].trim();
              let quantity = mm[2].trim();
              let unit = mm[3].trim().replace(/[。，,\.]+$/, '');
              
              console.log('[parseLineWithComma] 组合匹配成功:', { goodsName, quantity, unit });
              
              if (/[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0) {
                let qtyVal = quantity;
                if (/[零一二两三四五六七八九十百千万半]/.test(quantity)) {
                  qtyVal = chineseNumberToArabic(quantity).toString();
                }
                
                console.log('[parseLineWithComma] 添加组合商品:', { goodsName, qtyVal, unit });
                arr.push({
                  nxDoGoodsName: goodsName,
                  nxDoGoodsOrignialName: goodsName, // 保存原始商品名称
                  nxDoQuantity: qtyVal,
                  nxDoStandard: unit,
                  nxDoRemark: ''
                });
                i++; // 跳过下一个部分，因为已经组合处理了
                continue;
              }
            }
          }
        }
        
        // 5. 新增：处理被分割的商品名（如"油 菜"）
        if (i < commaParts.length - 2) {
          let nextItem = commaParts[i + 1].trim();
          let nextNextItem = commaParts[i + 2].trim();
          
          // 检查当前项和下一项是否都是中文字符，且下一项的下一个项包含数字
          if (/^[\u4e00-\u9fa5]+$/.test(item) && 
              /^[\u4e00-\u9fa5]+$/.test(nextItem) && 
              /[\d一二两三四五六七八九十百千万半]/.test(nextNextItem)) {
            
            let combinedName = item + nextItem;
            let combined = combinedName + nextNextItem;
            console.log('[parseLineWithComma] 尝试组合商品名:', combined);
            
            // 尝试匹配组合后的格式
            mm = combined.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)(\S*)$/);
            if (mm) {
              let goodsName = mm[1].trim();
              let quantity = mm[2].trim();
              let unit = mm[3].trim().replace(/[。，,\.]+$/, '');
              
              console.log('[parseLineWithComma] 商品名组合匹配成功:', { goodsName, quantity, unit });
              
              if (/[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0) {
                let qtyVal = quantity;
                if (/[零一二两三四五六七八九十百千万半]/.test(quantity)) {
                  qtyVal = chineseNumberToArabic(quantity).toString();
                }
                
                console.log('[parseLineWithComma] 添加组合商品名商品:', { goodsName, qtyVal, unit });
                arr.push({
                  nxDoGoodsName: goodsName,
                  nxDoGoodsOrignialName: goodsName, // 保存原始商品名称
                  nxDoQuantity: qtyVal,
                  nxDoStandard: unit,
                  nxDoRemark: ''
                });
                i += 2; // 跳过两个部分，因为已经组合处理了
                continue;
              }
            }
          }
        }
      }
      
      console.log('[parseLineWithComma] 逗号分割最终解析结果:', arr);
      if (arr.length) {
        return arr;
      }
    }

    // 如果没有逗号，尝试按空格分割
    if (/\s/.test(line)) {
      let spaceParts = line.split(/\s+/);
      let arr = [];
      
      console.log('[parseLineWithComma] 按空格分割后的部分:', spaceParts);
      
      for (let i = 0; i < spaceParts.length; i++) {
        let item = spaceParts[i].trim();
        if (!item) continue;
        
        console.log('[parseLineWithComma] 处理空格分割部分:', item);
        
        // 检查当前部分是否包含数字（用于判断是否需要与下一部分组合）
        const hasNumberInItem = /[\d一二两三四五六七八九十百千万半]/.test(item);
        
        // 优先处理：如果下一部分有明确的"数字+单位"格式，优先组合处理
        // 这样可以避免商品名中的数字（如"一品鲜"中的"一"）被误识别为数量
        if (i < spaceParts.length - 1) {
          let nextItem = spaceParts[i + 1].trim();
          // 检查下一部分是否是明确的"数字+单位"格式（如"1瓶"、"2斤"等）
          const nextItemHasNumberUnit = /^[\d一二两三四五六七八九十百千万半\.]+[斤个包根棵条盒捆袋跟块瓶罐桶箱毫升升克千克公斤件]+/.test(nextItem);
          
          if (nextItem && nextItemHasNumberUnit) {
            let combined = item + nextItem;
            console.log('[parseLineWithComma] 下一部分有数字+单位格式，优先组合:', combined);
            
            // 使用从右往左匹配：先匹配单位，再匹配数量，最后是商品名
            // 这样可以避免商品名中的数字被误识别
                const unitMatch = combined.match(/([斤个包根棵条盒捆袋跟块瓶罐桶箱毫升升克千克公斤件]+)$/);
            if (unitMatch) {
              let unit = unitMatch[1];
              const beforeUnit = combined.slice(0, -unit.length);
              
              // 从右往左匹配数量（阿拉伯数字或中文数字）
              const qtyMatch = beforeUnit.match(/([\d一二两三四五六七八九十百千万半\.]+)$/);
              if (qtyMatch) {
                const quantity = qtyMatch[1];
                const goodsName = beforeUnit.slice(0, -quantity.length).trim();
                
                // 验证商品名不为空且包含中文字符
                if (goodsName && /[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0) {
                  let qtyVal = quantity;
                  if (/[零一二两三四五六七八九十百千万半]/.test(quantity)) {
                    qtyVal = chineseNumberToArabic(quantity).toString();
                  }
                  
                  // 处理备注：从单位中提取括号内的备注
                  let remarkText = '';
                  const bracketRegex = /(?:（|\(|【)(.+?)(?:）|\)|】)/;
                  const bracketMatch = unit.match(bracketRegex);
                  if (bracketMatch) {
                    remarkText = bracketMatch[1];
                    unit = unit.replace(bracketRegex, '').trim();
                  }
                  
                  console.log('[parseLineWithComma] 从右往左匹配成功:', { goodsName, qtyVal, unit, remarkText });
                  arr.push({
                    nxDoGoodsName: goodsName,
                    nxDoGoodsOrignialName: goodsName, // 保存原始商品名称
                    nxDoQuantity: qtyVal,
                    nxDoStandard: unit,
                    nxDoRemark: remarkText
                  });
                  i++; // 跳过下一个部分，因为已经组合处理了
                  continue;
                }
              }
            }
            
            // 如果从右往左匹配失败，尝试使用原来的正则匹配
            let mm = combined.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)([斤个包根棵条盒捆袋跟块瓶罐桶箱毫升升克千克公斤件]+)$/);
            if (mm) {
              let goodsName = mm[1].trim();
              let quantity = mm[2].trim();
              let unit = mm[3].trim();
              
              console.log('[parseLineWithComma] 组合匹配成功:', { goodsName, quantity, unit });
              
              // 验证：商品名应该包含当前部分的内容
              if (/[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0 && goodsName.includes(item)) {
                let qtyVal = quantity;
                if (/[零一二两三四五六七八九十百千万半]/.test(quantity)) {
                  qtyVal = chineseNumberToArabic(quantity).toString();
                }
                
                // 处理备注：从单位中提取括号内的备注
                let remarkText = '';
                const bracketRegex = /(?:（|\(|【)(.+?)(?:）|\)|】)/;
                const bracketMatch = unit.match(bracketRegex);
                if (bracketMatch) {
                  remarkText = bracketMatch[1];
                  unit = unit.replace(bracketRegex, '').trim();
                }
                
                console.log('[parseLineWithComma] 添加组合商品:', { goodsName, qtyVal, unit, remarkText });
                arr.push({
                  nxDoGoodsName: goodsName,
                  nxDoGoodsOrignialName: goodsName, // 保存原始商品名称
                  nxDoQuantity: qtyVal,
                  nxDoStandard: unit,
                  nxDoRemark: remarkText
                });
                i++; // 跳过下一个部分，因为已经组合处理了
                continue;
              }
            }
          }
        }
        
        // 1. 尝试匹配 "商品名+数字+单位" 格式
        let mm = item.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)(\S*)$/);
        console.log('[parseLineWithComma] 正则匹配结果:', mm);
        if (mm) {
          let goodsName = mm[1].trim();
          let quantity = mm[2].trim();
          let unit = mm[3].trim().replace(/[。，,\.]+$/, ''); // 去掉末尾的标点符号
          
          console.log('[parseLineWithComma] 匹配到格式1:', { goodsName, quantity, unit });
          
          // 验证：如果数量是单个中文字符（如"一"），且商品名以中文字符结尾，可能是误匹配
          // 例如："李锦记一品鲜" 中的 "一" 不应该被识别为数量
          const isSingleChineseNumber = /^[一二两三四五六七八九十]$/.test(quantity);
          const goodsNameEndsWithChinese = /[\u4e00-\u9fa5]$/.test(goodsName);
          
          if (isSingleChineseNumber && goodsNameEndsWithChinese && i < spaceParts.length - 1) {
            // 可能是误匹配，尝试与下一部分组合
            let nextItem = spaceParts[i + 1].trim();
            if (nextItem && /[\d一二两三四五六七八九十百千万半]/.test(nextItem)) {
              console.log('[parseLineWithComma] 检测到可能的误匹配，尝试组合下一部分');
              let combined = item + nextItem;
              
              // 使用从右往左匹配：先匹配单位，再匹配数量，最后是商品名
                const unitMatch = combined.match(/([斤个包根棵条盒捆袋跟块瓶罐桶箱毫升升克千克公斤件]+)$/);
              if (unitMatch) {
                const combinedUnit = unitMatch[1];
                const beforeUnit = combined.slice(0, -combinedUnit.length);
                
                // 从右往左匹配数量
                const qtyMatch = beforeUnit.match(/([\d一二两三四五六七八九十百千万半\.]+)$/);
                if (qtyMatch) {
                  const combinedQuantity = qtyMatch[1];
                  const combinedGoodsName = beforeUnit.slice(0, -combinedQuantity.length).trim();
                  
                  // 验证组合后的商品名包含原始商品名，且数量不在商品名中
                  if (combinedGoodsName && /[\u4e00-\u9fa5]/.test(combinedGoodsName) && combinedGoodsName.includes(goodsName)) {
                    console.log('[parseLineWithComma] 组合后从右往左匹配成功，使用组合结果:', { combinedGoodsName, combinedQuantity, combinedUnit });
                    let qtyVal = combinedQuantity;
                    if (/[零一二两三四五六七八九十百千万半]/.test(combinedQuantity)) {
                      qtyVal = chineseNumberToArabic(combinedQuantity).toString();
                    }
                    
                    let remarkText = '';
                    const bracketRegex = /(?:（|\(|【)(.+?)(?:）|\)|】)/;
                    const bracketMatch = combinedUnit.match(bracketRegex);
                    if (bracketMatch) {
                      remarkText = bracketMatch[1];
                      combinedUnit = combinedUnit.replace(bracketRegex, '').trim();
                    }
                    
                    arr.push({
                      nxDoGoodsName: combinedGoodsName,
                      nxDoGoodsOrignialName: combinedGoodsName, // 保存原始商品名称
                      nxDoQuantity: qtyVal,
                      nxDoStandard: combinedUnit,
                      nxDoRemark: remarkText
                    });
                    i++; // 跳过下一个部分
                    continue;
                  }
                }
              }
              
              // 如果从右往左匹配失败，尝试使用原来的正则匹配
              let combinedMm = combined.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)([斤个包根棵条盒捆袋跟块瓶罐桶箱毫升升克千克公斤]+)$/);
              if (combinedMm) {
                let combinedGoodsName = combinedMm[1].trim();
                let combinedQuantity = combinedMm[2].trim();
                let combinedUnit = combinedMm[3].trim();
                
                // 验证组合后的商品名包含原始商品名
                if (/[\u4e00-\u9fa5]/.test(combinedGoodsName) && combinedGoodsName.includes(goodsName)) {
                  console.log('[parseLineWithComma] 组合后匹配成功，使用组合结果:', { combinedGoodsName, combinedQuantity, combinedUnit });
                  let qtyVal = combinedQuantity;
                  if (/[零一二两三四五六七八九十百千万半]/.test(combinedQuantity)) {
                    qtyVal = chineseNumberToArabic(combinedQuantity).toString();
                  }
                  
                  let remarkText = '';
                  const bracketRegex = /(?:（|\(|【)(.+?)(?:）|\)|】)/;
                  const bracketMatch = combinedUnit.match(bracketRegex);
                  if (bracketMatch) {
                    remarkText = bracketMatch[1];
                    combinedUnit = combinedUnit.replace(bracketRegex, '').trim();
                  }
                  
                  arr.push({
                    nxDoGoodsName: combinedGoodsName,
                    nxDoGoodsOrignialName: combinedGoodsName, // 保存原始商品名称
                    nxDoQuantity: qtyVal,
                    nxDoStandard: combinedUnit,
                    nxDoRemark: remarkText
                  });
                  i++; // 跳过下一个部分
                  continue;
                }
              }
            }
          }
          
          // 验证商品名包含中文字符，并且商品名不能太长（避免匹配到多个商品）
          console.log('[parseLineWithComma] 验证商品名:', { goodsName, hasChinese: /[\u4e00-\u9fa5]/.test(goodsName), length: goodsName.length });
          if (/[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0 && goodsName.length <= 10) {
            let qtyVal = quantity;
            if (/[零一二两三四五六七八九十百千万半]/.test(quantity)) {
              qtyVal = chineseNumberToArabic(quantity).toString();
            }
            
            console.log('[parseLineWithComma] 添加商品:', { goodsName, qtyVal, unit });
            arr.push({
              nxDoGoodsName: goodsName,
              nxDoGoodsOrignialName: goodsName, // 保存原始商品名称
              nxDoQuantity: qtyVal,
              nxDoStandard: unit,
              nxDoRemark: ''
            });
            continue;
          } else {
            console.log('[parseLineWithComma] 商品名验证失败:', { goodsName, hasChinese: /[\u4e00-\u9fa5]/.test(goodsName), length: goodsName.length });
          }
        }
        
        // 2. 尝试使用 parseSegmentEndOfLine 解析
        let parsed = parseSegmentEndOfLine(item);
        if (parsed && parsed.nxDoQuantity) {
          console.log('[parseLineWithComma] parseSegmentEndOfLine 解析结果:', parsed);
          // 确保有原始商品名称字段
          if (!parsed.nxDoGoodsOrignialName) {
            parsed.nxDoGoodsOrignialName = parsed.nxDoGoodsName || '';
          }
          arr.push(parsed);
          continue;
        }
        
        // 3. 如果都失败了，尝试匹配纯数字格式
        mm = item.match(/^(.+?)(\d+)(.+)$/);
        if (mm) {
          let goodsName = mm[1].trim();
          if (/[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0) {
            console.log('[parseLineWithComma] 匹配到纯数字格式:', mm);
            arr.push({
              nxDoGoodsName: goodsName,
              nxDoGoodsOrignialName: goodsName, // 保存原始商品名称
              nxDoQuantity: mm[2].trim(),
              nxDoStandard: mm[3].trim(),
              nxDoRemark: ''
            });
            continue;
          }
        }
        
        // 4. 新增：尝试组合相邻部分
        if (i < spaceParts.length - 1) {
          let nextItem = spaceParts[i + 1].trim();
          if (nextItem) {
            let combined = item + nextItem;
            console.log('[parseLineWithComma] 尝试组合:', combined);
            
            // 尝试匹配组合后的格式
            mm = combined.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)(\S*)$/);
            if (mm) {
              let goodsName = mm[1].trim();
              let quantity = mm[2].trim();
              let unit = mm[3].trim().replace(/[。，,\.]+$/, '');
              
              console.log('[parseLineWithComma] 组合匹配成功:', { goodsName, quantity, unit });
              
              if (/[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0) {
                let qtyVal = quantity;
                if (/[零一二两三四五六七八九十百千万半]/.test(quantity)) {
                  qtyVal = chineseNumberToArabic(quantity).toString();
                }
                
                // 处理备注：从单位中提取括号内的备注
                let remarkText = '';
                const bracketRegex = /(?:（|\(|【)(.+?)(?:）|\)|】)/;
                const bracketMatch = unit.match(bracketRegex);
                if (bracketMatch) {
                  remarkText = bracketMatch[1];
                  unit = unit.replace(bracketRegex, '').trim();
                }
                
                console.log('[parseLineWithComma] 添加组合商品:', { goodsName, qtyVal, unit, remarkText });
                arr.push({
                  nxDoGoodsName: goodsName,
                  nxDoGoodsOrignialName: goodsName, // 保存原始商品名称
                  nxDoQuantity: qtyVal,
                  nxDoStandard: unit,
                  nxDoRemark: remarkText
                });
                i++; // 跳过下一个部分，因为已经组合处理了
                continue;
              }
            }
          }
        }
        
        // 5. 新增：处理被分割的商品名（如"油 菜"）
        if (i < spaceParts.length - 2) {
          let nextItem = spaceParts[i + 1].trim();
          let nextNextItem = spaceParts[i + 2].trim();
          
          // 检查当前项和下一项是否都是中文字符，且下一项的下一个项包含数字
          if (/^[\u4e00-\u9fa5]+$/.test(item) && 
              /^[\u4e00-\u9fa5]+$/.test(nextItem) && 
              /[\d一二两三四五六七八九十百千万半]/.test(nextNextItem)) {
            
            let combinedName = item + nextItem;
            let combined = combinedName + nextNextItem;
            console.log('[parseLineWithComma] 尝试组合商品名:', combined);
            
            // 尝试匹配组合后的格式
            mm = combined.match(/^(.+?)([\d一二两三四五六七八九十百千万半\.]+)(\S*)$/);
            if (mm) {
              let goodsName = mm[1].trim();
              let quantity = mm[2].trim();
              let unit = mm[3].trim().replace(/[。，,\.]+$/, '');
              
              console.log('[parseLineWithComma] 商品名组合匹配成功:', { goodsName, quantity, unit });
              
              if (/[\u4e00-\u9fa5]/.test(goodsName) && goodsName.length > 0) {
                let qtyVal = quantity;
                if (/[零一二两三四五六七八九十百千万半]/.test(quantity)) {
                  qtyVal = chineseNumberToArabic(quantity).toString();
                }
                
                // 处理备注：从单位中提取括号内的备注
                let remarkText = '';
                const bracketRegex = /(?:（|\(|【)(.+?)(?:）|\)|】)/;
                const bracketMatch = unit.match(bracketRegex);
                if (bracketMatch) {
                  remarkText = bracketMatch[1];
                  unit = unit.replace(bracketRegex, '').trim();
                }
                
                console.log('[parseLineWithComma] 添加组合商品名商品:', { goodsName, qtyVal, unit, remarkText });
                arr.push({
                  nxDoGoodsName: goodsName,
                  nxDoGoodsOrignialName: goodsName, // 保存原始商品名称
                  nxDoQuantity: qtyVal,
                  nxDoStandard: unit,
                  nxDoRemark: remarkText
                });
                i += 2; // 跳过两个部分，因为已经组合处理了
                continue;
              }
            }
          }
        }
      }
      
      console.log('[parseLineWithComma] 空格分割最终解析结果:', arr);
      if (arr.length) {
        return arr;
      }
    }

    // 逗号分隔
    line = line.replace(/[\u3002]+/g, ',');
    let segs = splitByCommaOutsideBrackets(line), arr = [];
    segs.forEach(seg => {
      let result = parseSegmentEndOfLine(seg);
      if (result) arr.push(result);
    });
    return arr;
  }
  
  // ============ E. 逐行处理 ============
  for (let lineIndex = 0; lineIndex < allLines.length; lineIndex++) {
    let line = allLines[lineIndex].trim();
    if (!line) continue;
    if (!shouldProcessLine(line)) continue;

    if (/^备注[:：]/.test(line)) {
      if (orders.length) {
        let last = orders[orders.length - 1];
        last.nxDoRemark = (last.nxDoRemark || '') + ' ' + line.replace(/^备注[:：]/, '').trim();
      }
      continue;
    }

    // 1) 序号格式
    let obj1 = parseLineWithSerial(line);
    if (obj1) {
      orders.push({
        ...obj1,
        _sourceLineIndex: lineIndex,
        nxDoAddRemark: !!obj1.nxDoRemark,
        nxDoStatus: -2,
        nxDoDepartmentId: null,
        nxDoDepartmentFatherId: null,
        nxDoDisGoodsId: null,
        nxDoStandardWarn: 0,
        goodsNameWarn: 0,
        nxDoDistributerId: null,
        nxDoPurchaseUserId: -1,
        nxDoOrderUserId: null,
        nxDoIsAgent: -1,
        standardWeight: "",
        cartonUnit: "",
        itemUnit: "",
        itemsPerCarton: "",
      });
      continue;
    }

    // 2) 冒号替换为空格
    if (/^(.*?)[:：](.+)$/.test(line)) {
      console.log('[formatOrderContent] 检测到冒号，替换为空格');
      line = line.replace(/^(.+?)[:：](.+)$/, '$1 $2');
      console.log('[formatOrderContent] 冒号替换后:', line);
    }

    // 3) 逗号分隔

    let arr2 = parseLineWithComma(line);
    if (arr2 && arr2.length) {
      arr2.forEach(i => {
        if (i && i.nxDoGoodsName) {
          const originalName = i.nxDoGoodsOrignialName || i.nxDoGoodsName;
          orders.push({
            ...i,
            _sourceLineIndex: lineIndex,
            nxDoGoodsOrignialName: originalName,
            nxDoAddRemark: !!i.nxDoRemark,
            nxDoStatus: -2,
            nxDoDepartmentId: null,
            nxDoDepartmentFatherId: null,
            nxDoDisGoodsId: null,
            nxDoStandardWarn: 0,
            goodsNameWarn: 0,
            nxDoDistributerId: null,
            nxDoPurchaseUserId: -1,
            nxDoOrderUserId: null,
            nxDoIsAgent: -1,
            standardWeight: "",
            cartonUnit: "",
            itemUnit: "",
            itemsPerCarton: "",
          });
        }
      });
      continue;
    }

    // 4) 空格分隔（兜底）
    let parts = line.split(/\s+/);
    parts.forEach(item => {
      let mm = item.match(/^(.+?)(\d+)(.+)$/);
      if (mm) {
        const goodsName = mm[1].trim();
        orders.push({
          nxDoGoodsName: goodsName,
          nxDoGoodsOrignialName: goodsName,
          nxDoQuantity:  mm[2].trim(),
          nxDoStandard:  mm[3].trim(),
          nxDoRemark:    '',
          _sourceLineIndex: lineIndex,
          nxDoAddRemark: false,
          nxDoStatus: -2,
          nxDoDepartmentId: null,
          nxDoDepartmentFatherId: null,
          nxDoDisGoodsId: null,
          nxDoStandardWarn: 0,
          goodsNameWarn: 0,
          nxDoDistributerId: null,
          nxDoPurchaseUserId: -1,
          nxDoOrderUserId: null,
          nxDoIsAgent: -1,
          standardWeight: "",
          cartonUnit: "",
          itemUnit: "",
          itemsPerCarton: "",
        });
      }
    });
  }
  

  
  // ============ F3. 最终新增 nxDoAddRemark 字段（保险） ============
  orders = orders.map(o => ({
    ...o,
    nxDoAddRemark: !!o.nxDoRemark
  }));

  // ============ G. 校验订单并收集不合格片段（用于片段级高亮，避免整行标红） ============
  const invalidSegments = []; // { lineIndex, segmentText }
  const invalidLineIndices = []; // 兼容：不合格行索引
  for (let i = 0; i < orders.length; i++) {
    let o = orders[i];
    let err = validateOrder(o);
    if (err != null && o._sourceLineIndex != null) {
      // 补救：对校验失败的订单，用原始文本尝试 parseSegmentEndOfLine 再解析（如「黄贡椒：1 件」空格拆分导致规格丢失）
      const segmentToRetry = (o._sourceSegmentText != null && String(o._sourceSegmentText).trim() !== '')
        ? o._sourceSegmentText
        : (() => {
            const rawLine = allLines[o._sourceLineIndex] || '';
            return rawLine.replace(/^(.+?)[:：](.+)$/, '$1 $2');
          })();
      const retried = parseSegmentEndOfLine(segmentToRetry);
      if (retried && retried.nxDoQuantity && validateOrder(retried) == null) {
        orders[i] = {
          ...o,
          nxDoGoodsName: retried.nxDoGoodsName,
          nxDoGoodsOrignialName: retried.nxDoGoodsOrignialName || retried.nxDoGoodsName,
          nxDoQuantity: retried.nxDoQuantity,
          nxDoStandard: retried.nxDoStandard,
          nxDoRemark: retried.nxDoRemark,
          nxDoAddRemark: !!retried.nxDoRemark,
        };
        console.log('[parseOrderFromText] 补救解析成功:', segmentToRetry, '→', retried);
        continue;
      }
      // 补救失败，加入不合格列表
      const segmentText = (o._sourceSegmentText != null && String(o._sourceSegmentText).trim() !== '')
        ? o._sourceSegmentText
        : `${o.nxDoGoodsName} ${o.nxDoQuantity} ${o.nxDoStandard}`.trim();
      if (!invalidSegments.some(s => s.lineIndex === o._sourceLineIndex && s.segmentText === segmentText)) {
        invalidSegments.push({ lineIndex: o._sourceLineIndex, segmentText });
        console.log('[parseOrderFromText] 不合格片段（用于高亮）:', segmentText);
      }
      if (!invalidLineIndices.includes(o._sourceLineIndex)) {
        invalidLineIndices.push(o._sourceLineIndex);
      }
      console.warn('[parseOrderFromText] 校验不合格，行索引:', o._sourceLineIndex, '片段:', segmentText, '原因:', err);
    }
  }
  if (invalidSegments.length > 0) {
    console.log('[parseOrderFromText] 校验不合格片段:', invalidSegments);
  }

  // 移除内部字段 _sourceLineIndex、_sourceSegmentText，保持对外接口整洁
  orders = orders.map(({ _sourceLineIndex, _sourceSegmentText, ...o }) => o);

  // ============ H. 可选：返回预览字符串 ============
  const formatted = orders.map(o => {
    let str = `${o.nxDoGoodsName}${o.nxDoQuantity}${o.nxDoStandard}`;
    if (o.nxDoRemark) str += `（${o.nxDoRemark}）`;
    return str;
  }).join('\n');
  console.log('[parseOrderFromText] 解析完成:', { ordersCount: orders.length, invalidLineIndices, invalidSegments });
  return { orders, formatted, invalidLineIndices, invalidSegments };
}

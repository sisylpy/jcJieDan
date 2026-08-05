/**
 * 现金/零售：大包装单位名、零售价解析（与 myDismodalCashSingle 展示规则一致）
 */

function dbg(tag, payload) {
  console.log("[retailPriceLevel]", tag, payload);
}

export function trimStandardName(s) {
  if (s == null || s === undefined) {
    return "";
  }
  return String(s).trim();
}

/** 是否配置了「大包装」单位名（不要求已有有效大包装价） */
export function hasBigPackUnitDefined(disGoodsEntity) {
  if (!disGoodsEntity) {
    return false;
  }
  const t = trimStandardName(disGoodsEntity.nxDgWillPriceTwoStandard);
  return t !== "" && t !== "null";
}

/**
 * 订货规格名是否等于大包装单位名（优先于基本单位判断，避免二者同名时误用 nxDgWillPriceOne）
 */
export function isBigPackStandardName(disGoodsEntity, standardName) {
  if (!disGoodsEntity || standardName == null || standardName === "") {
    return false;
  }
  if (!hasBigPackUnitDefined(disGoodsEntity)) {
    return false;
  }
  return (
    trimStandardName(standardName) ===
    trimStandardName(disGoodsEntity.nxDgWillPriceTwoStandard)
  );
}

/**
 * 大包装字段里是否有「有效」零售价（非空、非占位 0.1）
 */
function hasValidBigWillPrice(disGoods) {
  if (!disGoods) {
    return false;
  }
  const two = disGoods.nxDgWillPriceTwo;
  return (
    two != null &&
    two !== "" &&
    String(two).trim() !== "" &&
    String(two) !== "0.1" &&
    Number(two) !== 0.1
  );
}

function isPlaceholderWillPrice(p) {
  if (p == null || p === "") {
    return true;
  }
  const s = String(p).trim();
  if (s === "" || s === "0.1") {
    return true;
  }
  const n = Number(p);
  return n === 0.1;
}

/** 是否为系统占位单价/成本 0.1（有值且等于 0.1） */
export function isSentinelPrice01(v) {
  if (v == null || v === "") {
    return false;
  }
  const s = String(v).trim();
  if (s === "0.1") {
    return true;
  }
  return Number(v) === 0.1;
}

/** 进货价占位（与零售价 0.1 待报价一致时不应作为成本提交） */
function isPlaceholderBuyingPrice(p) {
  return isPlaceholderWillPrice(p);
}

/**
 * @param {Object|null} disGoodsEntity
 * @param {string} standardName
 * @returns {number} 1 | 2
 */
export function resolveNxDoCostPriceLevel(disGoodsEntity, standardName) {
  const isBig = isBigPackStandardName(disGoodsEntity, standardName);
  const lv = isBig ? 2 : 1;
  dbg("resolveNxDoCostPriceLevel", { standardName, level: lv });
  return lv;
}

/**
 * 与弹窗单价一致：先按大包装名取 nxDgWillPriceTwo，再按基本单位取 one / nxDgWillPriceOne
 * @returns {string|number|null} 无有效标价时 null
 */
export function getRetailWillPriceForStandard(disGoodsEntity, standardName) {
  if (!disGoodsEntity || standardName == null || standardName === "") {
    dbg("getRetailWillPriceForStandard", { branch: "no-entity-or-std", out: null });
    return null;
  }
  const gid = disGoodsEntity.nxDistributerGoodsId;
  const stdT = trimStandardName(standardName);
  const twoStdT = trimStandardName(disGoodsEntity.nxDgWillPriceTwoStandard);
  const baseT = trimStandardName(disGoodsEntity.nxDgGoodsStandardname);
  const bigPack = isBigPackStandardName(disGoodsEntity, standardName);
  const snap = {
    gid,
    standardName,
    standardTrim: stdT,
    base: disGoodsEntity.nxDgGoodsStandardname,
    baseTrim: baseT,
    twoStd: disGoodsEntity.nxDgWillPriceTwoStandard,
    twoStdTrim: twoStdT,
    bigPackMatch: bigPack,
    hasBigPackUnit: hasBigPackUnitDefined(disGoodsEntity),
    willTwo: disGoodsEntity.nxDgWillPriceTwo,
    willTwoType: typeof disGoodsEntity.nxDgWillPriceTwo,
    willOne: disGoodsEntity.nxDgWillPriceOne,
    will: disGoodsEntity.nxDgWillPriceOne,
  };
  dbg("getRetailWillPriceForStandard:enter", snap);
  if (bigPack) {
    const p = disGoodsEntity.nxDgWillPriceTwo;
    const ph = isPlaceholderWillPrice(p);
    const out = ph ? null : p;
    dbg("getRetailWillPriceForStandard", {
      branch: "big-pack",
      ...snap,
      placeholder: ph,
      out,
    });
    return out;
  }
  if (stdT === baseT) {
    const one = disGoodsEntity.nxDgWillPriceOne;
    const w = disGoodsEntity.nxDgWillPriceOne;
    if (!isPlaceholderWillPrice(one)) {
      dbg("getRetailWillPriceForStandard", {
        branch: "base-unit-willOne",
        ...snap,
        out: one,
      });
      return one;
    }
    if (!isPlaceholderWillPrice(w)) {
      dbg("getRetailWillPriceForStandard", {
        branch: "base-unit-nxDgWillPriceOne",
        ...snap,
        out: w,
      });
      return w;
    }
    dbg("getRetailWillPriceForStandard", {
      branch: "base-unit-both-placeholder",
      ...snap,
      out: null,
    });
    return null;
  }
  dbg("getRetailWillPriceForStandard", { branch: "other-spec-no-price", ...snap, out: null });
  return null;
}

/** 对应进货价（用于成本小计） */
export function getRetailBuyingPriceForStandard(disGoodsEntity, standardName) {
  if (!disGoodsEntity || standardName == null || standardName === "") {
    return null;
  }
  if (isBigPackStandardName(disGoodsEntity, standardName)) {
    const t = disGoodsEntity.nxDgBuyingPriceTwo;
    if (
      t != null &&
      t !== "" &&
      String(t).trim() !== "" &&
      !isPlaceholderBuyingPrice(t)
    ) {
      dbg("getRetailBuyingPriceForStandard", { branch: "buyingTwo", out: t });
      return t;
    }
  }
  if (
    trimStandardName(standardName) ===
    trimStandardName(disGoodsEntity.nxDgGoodsStandardname)
  ) {
    const one = disGoodsEntity.nxDgBuyingPriceOne;
    if (
      one != null &&
      one !== "" &&
      String(one).trim() !== "" &&
      !isPlaceholderBuyingPrice(one)
    ) {
      dbg("getRetailBuyingPriceForStandard", { branch: "buyingOne", out: one });
      return one;
    }
  }
  const b = disGoodsEntity.nxDgBuyingPriceOne;
  const out =
    b != null && b !== "" && String(b).trim() !== "" && !isPlaceholderBuyingPrice(b)
      ? b
      : null;
  dbg("getRetailBuyingPriceForStandard", { branch: "buyingFallback", out });
  return out;
}

/** 兼容旧调用：有大包装有效价且单位已配置 */
export function hasBigRetailPrice(disGoodsEntity) {
  return (
    hasBigPackUnitDefined(disGoodsEntity) &&
    hasValidBigWillPrice(disGoodsEntity)
  );
}

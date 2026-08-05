import {
  isBigPackStandardName,
  resolveNxDoCostPriceLevel,
  hasBigPackUnitDefined,
  trimStandardName,
} from "../../lib/retailPriceLevel";

Component({
  properties: {
    show: {
      type: Boolean,
      value: false,
    },
    applyStandardName: {
      type: String,
      value: "",
    },
    applyRemark: {
      type: String,
      value: "",
    },
    item: {
      type: Object,
      value: null,
    },
    applyNumber: {
      type: String,
      value: "",
    },
    editApply: {
      type: Boolean,
      value: false,
    },
    depStandardArr: {
      type: Array,
      value: [],
    },
    windowWidth: {
      type: Number,
      value: "",
    },
    windowHeight: {
      type: Number,
      value: "",
    },
    maskHeight: {
      type: Number,
      value: "",
    },
    statusBarHeight: {
      type: Number,
      value: "",
    },
    newStandardName: {
      type: String,
      value: "",
    },
    applySubtotal: {
      type: String,
      value: "",
    },
    /** 1=小包装（基本/其它订货规格） 2=大包装 */
    level: {
      type: Number,
      value: 1,
    },
  },

  data: {
    showInput: false,
    canSave: false,
    localSubtotal: "-",
    hasLevelTwo: false,
    packLevel: 1,
    showAddStandard: false,
  },

  observers: {
    show(show) {
      if (show) {
        const item = this.properties.item;
        const std = this.properties.applyStandardName || "";
        const pl =
          item && std !== ""
            ? resolveNxDoCostPriceLevel(item, std)
            : Number(this.properties.level) || 1;
        this.setData({
          applyNumber:
            this.properties.applyNumber != null ? String(this.properties.applyNumber) : "",
          applyRemark: this.properties.applyRemark || "",
          packLevel: pl,
        });
      }
    },
    "item, level, applyStandardName, show": function (item, level, applyStandardName, show) {
      if (!show || !item) {
        return;
      }
      const hasTwoUnit = hasBigPackUnitDefined(item);
      const effLv = resolveNxDoCostPriceLevel(item, applyStandardName);
      this.setData({
        hasLevelTwo: !!hasTwoUnit,
        packLevel: effLv,
      });
      const numStr =
        this.data.applyNumber != null && this.data.applyNumber !== ""
          ? String(this.data.applyNumber)
          : this.properties.applyNumber != null
            ? String(this.properties.applyNumber)
            : "";
      this._recalcSubtotal(item, numStr, applyStandardName);
    },
  },

  methods: {
    noop() {},

    _recalcSubtotal(item, numStr, standardName) {
      if (!item) {
        return;
      }
      const num =
        numStr === "" || numStr === null || numStr === undefined ? 0 : Number(numStr);
      let sub = "-";
      let canSave = num > 0;

      if (isBigPackStandardName(item, standardName)) {
        const p = item.nxDgWillPriceTwo;
        if (p == null || p === "" || String(p).trim() === "0.1" || Number(p) === 0.1) {
          sub = "-";
        } else if (Number.isFinite(num) && Number.isFinite(Number(p))) {
          sub = (num * Number(p)).toFixed(1);
        }
      } else {
        const baseStd = item.nxDgGoodsStandardname;
        if (trimStandardName(standardName) === trimStandardName(baseStd)) {
          const p =
            item.nxDgWillPriceOne != null && item.nxDgWillPriceOne !== ""
              ? item.nxDgWillPriceOne
              : item.nxDgWillPriceOne;
          if (p == null || p === "" || String(p).trim() === "0.1" || Number(p) === 0.1) {
            sub = "-";
          } else if (Number.isFinite(num) && Number.isFinite(Number(p))) {
            sub = (num * Number(p)).toFixed(1);
          }
        } else {
          sub = "无";
        }
      }

      console.log("[myDismodalCashSingle] _recalcSubtotal", {
        standardName,
        num,
        sub,
        bigPack: isBigPackStandardName(item, standardName),
        nxDgWillPriceTwo: item.nxDgWillPriceTwo,
        nxDgWillPriceOne: item.nxDgWillPriceOne,
        nxDgWillPriceOne: item.nxDgWillPriceOne,
        nxDgWillPriceTwoStandard: item.nxDgWillPriceTwoStandard,
        nxDgGoodsStandardname: item.nxDgGoodsStandardname,
      });

      this.setData({
        localSubtotal: sub,
        canSave,
      });
    },

    onPickPack(e) {
      const name = e.currentTarget.dataset.name;
      const item = this.properties.item;
      const level = resolveNxDoCostPriceLevel(item, name);
      this.setData({ packLevel: level });
      this.triggerEvent("changeStandard", {
        applyStandardName: name,
        level,
      });
      this._recalcSubtotal(
        item,
        this.data.applyNumber || this.properties.applyNumber,
        name,
      );
    },

    onDelStandard(e) {
      this.triggerEvent("delStandard", {
        id: e.currentTarget.dataset.id,
        standardName: e.currentTarget.dataset.name,
      });
    },

    showInputStandard() {
      this.setData({
        showAddStandard: true,
      });
    },
    cancleStandard() {
      this.setData({
        showAddStandard: false,
      });
    },

    confirmStandard() {
      if (this.data.newStandardName.length > 0) {
        this.triggerEvent("confirmStandard", {
          newStandardName: this.data.newStandardName,
        });
        this.setData({
          showAddStandard: false,
          newStandardName: "",
        });
      }
    },

    clickMask() {
      this.setData({
        applyNumber: "",
        applyRemark: "",
        remarkContent: "",
        goodsStandard: "",
        editApply: false,
      });
      this.triggerEvent("cancle");
    },

    cancle() {
      this.setData({
        applyNumber: "",
        applyRemark: "",
        remarkContent: "",
        goodsStandard: "",
        editApply: false,
        depStandardArr: [],
        localSubtotal: "-",
        packLevel: 1,
        showAddStandard: false,
        newStandardName: "",
      });
      this.triggerEvent("cancle");
    },

    confirm() {
      if (this.data.showAddStandard) {
        wx.showModal({
          title: "有未完成操作",
          content: "请完成新规格",
        });
        return;
      }
      if (Number(this.data.applyNumber) > 0) {
        let apply = "";
        const n = (this.data.applyNumber != null ? this.data.applyNumber : "").toString();
        if (n.indexOf(".") !== -1) {
          apply = n;
        } else {
          apply = n.replace(/^[0]+/, "");
        }
        if (apply === "") {
          apply = n;
        }
        this.triggerEvent("confirm", {
          applyNumber: apply,
          applyStandardName: this.properties.applyStandardName,
          applyRemark: this.data.applyRemark != null ? this.data.applyRemark : this.properties.applyRemark,
        });
        this.setData({
          applyNumber: "",
          applyRemark: "",
          remarkContent: "",
          goodsStandard: "",
          editApply: false,
          localSubtotal: "-",
          packLevel: 1,
          showAddStandard: false,
          newStandardName: "",
        });
      } else {
        wx.showToast({
          title: "数量只能填写数字",
          icon: "none",
        });
      }
    },

    getApplyNumber(e) {
      const raw = e.detail.value;
      const prev = (this.data.applyNumber != null ? this.data.applyNumber : this.properties.applyNumber || "").toString();
      const dot = String(raw).indexOf(".");
      let decLen = 0;
      if (dot !== -1) {
        decLen = String(raw).length - dot - 1;
      }

      let next = raw;
      if (raw !== "" && Number(raw) > 9999) {
        wx.showToast({
          title: "最大不能超过9999",
          icon: "none",
        });
        next = prev;
      } else if (decLen > 1) {
        wx.showToast({
          title: "小数点只能保留一位",
          icon: "none",
        });
        next = raw.substring(0, raw.length - 1);
      } else if (raw === "" || !isNaN(Number(raw))) {
        next = raw;
      } else {
        wx.showToast({
          title: "只能填写数字",
          icon: "none",
        });
        next = prev;
      }

      this.setData({ applyNumber: next });

      const item = this.properties.item;
      const std = this.properties.applyStandardName;
      this._recalcSubtotal(item, String(next), std);
    },

    addRemark(e) {
      if (e.detail.value.length < 15) {
        this.setData({
          applyRemark: e.detail.value,
        });
      } else {
        wx.showToast({
          title: "最多输入15个字符。",
          icon: "none",
        });
        const str = this.properties.applyRemark || "";
        this.setData({
          applyRemark: str.substring(0, 15),
        });
      }
    },

    changeStandard() {},

    addStanard(e) {
      this.setData({
        newStandardName: e.detail.value,
      });
    },

    delApply() {
      this.triggerEvent("delApply");
      this.setData({
        applyNumber: "",
        applyRemark: "",
        remarkContent: "",
        goodsStandard: "",
        editApply: false,
        localSubtotal: "-",
        packLevel: 1,
      });
    },
  },
});

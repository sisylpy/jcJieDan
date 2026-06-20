Component({
  properties: {
    show: {
      type: Boolean,
      value: false,
    },
    item: {
      type: Object,
      value: null,
    },
    windowWidth: {
      type: Number,
      value: 750,
    },
  },

  data: {
    editItem: null,
    hasCarton: false,
    displayTwoAboutPrice: '',
  },

  observers: {
    'item, show': function (item, show) {
      if (show && item) {
        let copy;
        try {
          copy = JSON.parse(JSON.stringify(item));
        } catch (e) {
          copy = Object.assign({}, item);
        }
        const carton = copy.nxDgCartonUnit;
        const twoStd = copy.nxDgWillPriceTwoStandard;
        const itemsCount = this.getPackItemCount(copy);
        const itemsOk = Number.isFinite(itemsCount) && itemsCount > 0;
        const hasCarton =
          itemsOk &&
          ((carton && carton !== '' && carton !== 'null') ||
            (twoStd && twoStd !== '' && twoStd !== 'null'));
        const baseStd = copy.nxDgGoodsStandardname;
        const baseOk = baseStd && baseStd !== '' && String(baseStd) !== 'null';
        if (
          baseOk &&
          (!copy.nxDgWillPriceOneStandard ||
            copy.nxDgWillPriceOneStandard === '' ||
            String(copy.nxDgWillPriceOneStandard) === 'null')
        ) {
          copy.nxDgWillPriceOneStandard = String(baseStd);
        }
        this.setData({
          editItem: copy,
          hasCarton,
          displayTwoAboutPrice: this.computeDisplayTwoAbout(copy, true),
        });
      } else if (!show) {
        this.setData({
          editItem: null,
          hasCarton: false,
          displayTwoAboutPrice: '',
        });
      }
    },
  },

  methods: {
    /**
     * 大包装内含基本单位个数：nxDgItemsPerCarton 与 nxDgWillPriceTwoWeight 业务上一致，任一有效即可。
     */
    /** nxDgWillPriceTwoAboutPrice：保留 1 位小数 */
    formatAboutPriceOneDecimal(num) {
      const n = Number(num);
      if (!Number.isFinite(n)) {
        return '';
      }
      return n.toFixed(1);
    },

    getPackItemCount(editItem) {
      if (!editItem) {
        return NaN;
      }
      const fromCarton = Number(editItem.nxDgItemsPerCarton);
      if (Number.isFinite(fromCarton) && fromCarton > 0) {
        return fromCarton;
      }
      const fromWeight = Number(editItem.nxDgWillPriceTwoWeight);
      if (Number.isFinite(fromWeight) && fromWeight > 0) {
        return fromWeight;
      }
      return NaN;
    },

    /**
     * 大包装价 ÷ 件数 → 折合基本单位均价。
     * allowApiFallback：仅打开弹窗时为 true，用接口 nxDgWillPriceTwoAboutPrice 兜底；输入过程中为 false，避免清空输入后仍显示旧值。
     */
    computeDisplayTwoAbout(editItem, allowApiFallback) {
      if (!editItem) {
        return '';
      }
      const items = this.getPackItemCount(editItem);
      const twoRaw = editItem.nxDgWillPriceTwo;
      const twoEmpty = twoRaw === '' || twoRaw === null || twoRaw === undefined;
      const twoNum = twoEmpty ? NaN : Number(twoRaw);
      if (Number.isFinite(twoNum) && Number.isFinite(items) && items > 0) {
        const avg = twoNum / items;
        if (!Number.isFinite(avg)) {
          return '';
        }
        return this.formatAboutPriceOneDecimal(avg);
      }
      if (allowApiFallback) {
        const about = editItem.nxDgWillPriceTwoAboutPrice;
        if (about !== null && about !== undefined && about !== '') {
          return this.formatAboutPriceOneDecimal(about);
        }
      }
      return '';
    },

    noop() {},

    noopInner() {},

    onWillOne(e) {
      const v = e.detail.value;
      const item = this.data.editItem;
      const baseStd = item && item.nxDgGoodsStandardname;
      const baseOk = baseStd && baseStd !== '' && String(baseStd) !== 'null';
      const patch = { 'editItem.nxDgWillPriceOne': v };
      if (baseOk) {
        patch['editItem.nxDgWillPriceOneStandard'] = String(baseStd);
      }
      this.setData(patch);
    },

    onWillTwo(e) {
      const v = e.detail.value;
      const editItem = Object.assign({}, this.data.editItem, { nxDgWillPriceTwo: v });
      this.setData({
        'editItem.nxDgWillPriceTwo': v,
        displayTwoAboutPrice: this.computeDisplayTwoAbout(editItem, false),
      });
    },

    onCancel() {
      this.triggerEvent('cancel');
    },

    onConfirm() {
      const editItem = this.data.editItem;
      if (!editItem) {
        this.triggerEvent('cancel');
        return;
      }
      let payload;
      try {
        payload = JSON.parse(JSON.stringify(editItem));
      } catch (e) {
        payload = Object.assign({}, editItem);
      }
      const baseStd = payload.nxDgGoodsStandardname;
      if (baseStd != null && baseStd !== '' && String(baseStd) !== 'null') {
        payload.nxDgWillPriceOneStandard = String(baseStd);
      }
      if (this.data.hasCarton) {
        const cnt = this.getPackItemCount(payload);
        if (Number.isFinite(cnt) && cnt > 0) {
          payload.nxDgItemsPerCarton = cnt;
          payload.nxDgWillPriceTwoWeight = cnt;
        }
        const ca = payload.nxDgCartonUnit;
        const st = payload.nxDgWillPriceTwoStandard;
        const unitName =
          ca && ca !== '' && ca !== 'null'
            ? String(ca)
            : st && st !== '' && st !== 'null'
              ? String(st)
              : '';
        if (unitName) {
          payload.nxDgCartonUnit = unitName;
          payload.nxDgWillPriceTwoStandard = unitName;
        }
        const about = this.computeDisplayTwoAbout(payload, true);
        if (about !== '') {
          payload.nxDgWillPriceTwoAboutPrice = about;
        }
      }
      this.triggerEvent('confirm', { item: payload });
    },
  },
});

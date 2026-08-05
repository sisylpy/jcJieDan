Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 是否显示弹窗
    show: {
      type: Boolean,
      value: false
    },
    // 当前商品（仅作为数据源，编辑时复制到 form，不直接改它）
    item: {
      type: Object,
      value: null,
      observer: function (newVal) {
        if (newVal && typeof newVal === 'object') {
          var form = Object.assign({}, newVal);
          var std = newVal.nxDgWillPriceTwoStandard;
          var carton = newVal.nxDgCartonUnit;
          var hasOuter = (std && std !== '' && std !== 'null') ||
            (carton && carton !== '' && carton !== 'null' &&
              (Number(newVal.nxDgItemsPerCarton) > 0 || Number(newVal.nxDgWillPriceTwoWeight) > 0));
          // 弹窗显示时，根据初始采购价/售价计算毛利率
          var profitOne = this._calc(newVal.nxDgWillPriceOne, newVal.nxDgBuyingPriceOne);
          if (profitOne !== '') form.nxDgPriceProfitOne = profitOne;
          if (hasOuter) {
            var profitTwo = this._calc(newVal.nxDgWillPriceTwo, newVal.nxDgBuyingPriceTwo);
            if (profitTwo !== '') form.nxDgPriceProfitTwo = profitTwo;
          }
          this.setData({ form: form, hasOuter: hasOuter });
        } else {
          this.setData({ form: {}, hasOuter: false });
        }
      }
    },
    consultItem: {
      type: Object,
      value: null
    },
    windowHeight: {
      type: Number,
      value: 0
    },
    windowWidth: {
      type: Number,
      value: 0
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    hasOuter: false,
    form: {}
  },

  /**
   * 组件的方法列表
   */
  methods: {

    cancle() {
      this.setData({
        show: false,
        form: {},
        item: null
      });
      this.triggerEvent('cancle');
    },

    confirm() {
      this.triggerEvent('confirm', {
        item: this.data.form
      });
      this.setData({
        show: false,
        form: {},
        item: null
      });
    },

    getBuyingPrice(e) {
      var level = e.currentTarget.dataset.level;
      var field = level == 1 ? 'form.nxDgBuyingPriceOne' : 'form.nxDgBuyingPriceTwo';
      this.setData({
        [field]: e.detail.value
      });
      this._getPercent(level);
    },

    getWillPrice(e) {
      var level = e.currentTarget.dataset.level;
      var field = level == 1 ? 'form.nxDgWillPriceOne' : 'form.nxDgWillPriceTwo';
      this.setData({
        [field]: e.detail.value
      });
      this._getPercent(level);
    },

    _getPercent(level) {
      var form = this.data.form;
      var will = level == 1 ? form.nxDgWillPriceOne : form.nxDgWillPriceTwo;
      var buy = level == 1 ? form.nxDgBuyingPriceOne : form.nxDgBuyingPriceTwo;
      var percent = this._calc(will, buy);
      var field = level == 1 ? 'form.nxDgPriceProfitOne' : 'form.nxDgPriceProfitTwo';
      this.setData({
        [field]: percent
      });
    },

    _calc(will, buy) {
      will = Number(will);
      buy = Number(buy);
      if (!will || will <= 0) return '';
      var p = ((will - buy) / will) * 100;
      return p.toFixed(2);
    }

  }
});

Component({
  properties: {
    list: {
      type: Array,
      value: [],
    },
    purpose: {
      type: String,
      value: 'save',
    },
  },

  data: {
    selectedDepId: '',
    titleText: '选择已完成散客并保存',
    confirmLabel: '保存订单',
  },

  observers: {
    list() {
      this.setData({ selectedDepId: '' });
    },
    purpose(p) {
      var printSave = p === 'printSave';
      this.setData({
        titleText: printSave
          ? '选择已完成的零售客户打印小票'
          : '选择已完成的零售客户',
        confirmLabel: printSave ? '打印小票' : '保存小票',
        selectedDepId: '',
      });
    },
  },

  methods: {
    onClose() {
      this.triggerEvent('close');
    },

    onRadioChange(e) {
      this.setData({
        selectedDepId: e.detail.value,
      });
    },

    onConfirm() {
      var sel = this.data.selectedDepId;
      if (!sel) {
        wx.showToast({
          title: '请先选择散客',
          icon: 'none',
        });
        return;
      }
      var list = this.properties.list || [];
      var picked = null;
      for (var i = 0; i < list.length; i++) {
        if (String(list[i].depId) === String(sel)) {
          picked = list[i];
          break;
        }
      }
      if (!picked) {
        wx.showToast({
          title: '选择无效',
          icon: 'none',
        });
        return;
      }
      var detail = {
        depId: picked.depId,
        depName: picked.depName,
        depSubtotal: picked.depSubtotal,
        depTradeNo: picked.depTradeNo != null && picked.depTradeNo !== '' ? picked.depTradeNo : (picked.tradeNo || ''),
      };
      if (this.properties.purpose === 'printSave') {
        this.triggerEvent('print', detail);
      } else {
        this.triggerEvent('save', detail);
      }
    },

    stopPropagation() {},
  },
});

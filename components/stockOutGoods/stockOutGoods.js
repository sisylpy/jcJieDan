var platformDisplay = require('../../utils/platformOrderDisplay.js');

Component({
  properties: {
    show: {
      type: Boolean,
      value: true
    },
    item: {
      type: Object,
      value: ""
    },
    statusBarHeight: {
      type: Number,
      value: ""
    },
    windowHeight: {
      type: Number,
      value: ""
    },
    windowWidth: {
      type: Number,
      value: ""
    },
    url: {
      type: String,
      value: ""
    }
  },

  observers: {
    item: function (item) {
      if (!item || !item.nxDepartmentOrdersEntities) return;
      var normalized = platformDisplay.processGoodsItem(JSON.parse(JSON.stringify(item)));
      this.setData({
        displayItem: normalized
      });
    }
  },

  data: {
    displayItem: null
  },

  methods: {
    _currentItem() {
      return this.data.displayItem || this.data.item;
    },

    clickMask() {
      this.setData({ show: false });
    },

    cancle() {
      this.setData({
        show: false,
        item: "",
        displayItem: null
      });
      this.triggerEvent('cancle');
    },

    confirm() {
      var item = this._currentItem();
      var arr = item.nxDepartmentOrdersEntities;
      var empty = 0;
      for (var i = 0; i < arr.length; i++) {
        var weight = arr[i].nxDoWeight;
        var choice = arr[i].hasChoice;
        if (choice) {
          if (weight == null || weight == "" || weight == 0) {
            wx.showToast({
              title: '未填写出货数量',
              icon: 'none'
            });
            empty = 1;
          }
        }
      }
      if (empty == 0) {
        this.triggerEvent('confirm', { item: item });
        this.setData({
          show: false,
          item: "",
          displayItem: null
        });
      }
    },

    choiceOrder(e) {
      var index = e.currentTarget.dataset.index;
      var data = "displayItem.nxDepartmentOrdersEntities[" + index + "].hasChoice";
      var choice = this._currentItem().nxDepartmentOrdersEntities[index].hasChoice;
      this.setData({
        [data]: !choice
      });
    },

    getOrderWeight(e) {
      var index = e.currentTarget.dataset.index;
      var doWeightData = "displayItem.nxDepartmentOrdersEntities[" + index + "].nxDoWeight";
      var orderWeighValue = e.detail.value;
      var weightValue = "";
      if (orderWeighValue.length > 0) {
        weightValue = orderWeighValue;

        if (orderWeighValue.indexOf("..") !== -1) {
          wx.showToast({ title: '不允许连续的小数点', icon: 'none' });
          weightValue = this._currentItem().nxDepartmentOrdersEntities[index].nxDoWeight || "";
          this.setData({ [doWeightData]: weightValue });
          return;
        }

        var dotCount = (orderWeighValue.match(/\./g) || []).length;
        if (dotCount > 1) {
          wx.showToast({ title: '只能输入一个小数点', icon: 'none' });
          weightValue = this._currentItem().nxDepartmentOrdersEntities[index].nxDoWeight || "";
          this.setData({ [doWeightData]: weightValue });
          return;
        }

        var y = String(orderWeighValue).indexOf(".");
        var count = 0;
        if (y !== -1) {
          count = String(orderWeighValue).length - y - 1;
        }
        if (count > 2) {
          wx.showToast({ title: '小数点只能保留两位', icon: 'none' });
          var parts = String(orderWeighValue).split(".");
          if (parts.length > 1 && parts[1].length > 2) {
            weightValue = parts[0] + "." + parts[1].substring(0, 2);
          } else {
            weightValue = Number(orderWeighValue.substring(0, orderWeighValue.length - 1));
          }
        }
        if (e.detail.value > 99999) {
          wx.showToast({ title: '最大不能超过九万九千九百九十九', icon: "none" });
          weightValue = Number(orderWeighValue.substring(0, orderWeighValue.length - 1));
        }
        this.setData({ [doWeightData]: weightValue });
      } else {
        this.setData({ [doWeightData]: "" });
      }
    },

    getOrderPrice(e) {
      var index = e.currentTarget.dataset.index;
      var priceData = "displayItem.nxDepartmentOrdersEntities[" + index + "].actualPrice";
      var nxPriceData = "displayItem.nxDepartmentOrdersEntities[" + index + "].nxDoPrice";
      var diffData = "displayItem.nxDepartmentOrdersEntities[" + index + "].priceDifferent";
      var displayDiff = "displayItem.nxDepartmentOrdersEntities[" + index + "]._displayPriceDiff";
      var displayActual = "displayItem.nxDepartmentOrdersEntities[" + index + "]._displayActualPrice";
      var value = e.detail.value;
      var order = this._currentItem().nxDepartmentOrdersEntities[index];
      var expect = order.expectPrice || order.nxDoExpectPrice;
      var diff = '';
      if (value !== '' && expect !== null && expect !== undefined && expect !== '') {
        var d = parseFloat(value) - parseFloat(expect);
        if (!isNaN(d)) {
          diff = String(Math.round(d * 100) / 100);
        }
      }
      this.setData({
        [priceData]: value,
        [nxPriceData]: value,
        [diffData]: diff,
        [displayDiff]: platformDisplay.formatPriceDiff(diff),
        [displayActual]: platformDisplay.formatPrice(value),
        ["displayItem.nxDepartmentOrdersEntities[" + index + "]._priceChanged"]: true
      });
    }
  }
});

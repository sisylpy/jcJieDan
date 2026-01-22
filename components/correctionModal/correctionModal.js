Component({
  properties: {
    show: {
      type: Boolean,
      value: false
    },
    defaultText: {
      type: String,
      value: ''
    }
  },

  data: {
    correctionText: ''
  },

  observers: {
    'show, defaultText': function(show, defaultText) {
      console.log('[correctionModal] observers triggered, show:', show, 'defaultText:', defaultText);
      if (show) {
        // 弹窗显示时，设置默认文本
        const text = defaultText || this.properties.defaultText || '';
        console.log('[correctionModal] 设置文本:', text);
        this.setData({
          correctionText: text
        });
      } else {
        // 弹窗隐藏时，清空文本
        this.setData({
          correctionText: ''
        });
      }
    }
  },

  methods: {
    onInputChange(e) {
      this.setData({
        correctionText: e.detail.value
      });
    },

    onCancel() {
      this.triggerEvent('cancel');
    },

    onConfirm() {
      const text = this.data.correctionText.trim();
      if (!text) {
        wx.showToast({
          title: '请输入修改要求',
          icon: 'none'
        });
        return;
      }
      this.triggerEvent('confirm', {
        correctionText: text
      });
    },

    stopPropagation(event) {
      // 阻止事件冒泡，防止点击内容区域关闭弹窗
      // catchtap 已经阻止了冒泡，这个方法保留作为备用
      if (event && event.stopPropagation) {
        event.stopPropagation();
      }
    }
  }
});


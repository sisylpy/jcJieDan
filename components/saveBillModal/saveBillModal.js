Component({
  
  properties: {
    showPopup: Boolean,
    type: String, // 操作类型
    message: String,
    warnContent: String,
  },

  observers: {
    'type': function(type) {
      if (type === 'saveBillTishi') {
        this.setData({
          popupTitle: '保存订单',
          message: '显示在未结账的订单列表中'
        });
      } else if (type === 'deleteOrder') {
        this.setData({
          popupTitle: '删除订单',
          message: '您确定要删除该订单吗？'
        });
      }
      // 其他类型的处理
    }
  },

  data: {
    popupTitle: '',
    message: ''
  },

  methods: {
    onCancel() {
      this.triggerEvent('closeSaveBill');
    },
    onConfirm() {
      this.triggerEvent('confirmSaveBill');
    },
    stopPropagation(event) {
      // event.stopPropagation(); // 防止点击内容区域关闭弹出窗口
    }
  }
});

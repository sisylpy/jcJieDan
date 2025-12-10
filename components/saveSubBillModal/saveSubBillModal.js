Component({
  
  properties: {
    showPopup: Boolean,
    type: String, // 操作类型
    message: String,
    warnContent: String,
  },

  observers: {
    'type': function(type) {
      if (type === 'saveBillSubTishi') {
        this.setData({
          popupTitle: '订单保存方式',
          message: '全部将生成一份订单',
          saveType: 0,
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

    radioChange(e){
      console.log(e);
      var value = e.detail.value;
      this.setData({
        saveType: value,
      })
      if(value == 0){
        this.setData({
          message: '全部将生成一份订单',
        })
      }else{
        this.setData({
          message: '分部门将按部门订货生成订单',
        })
      }
    },
    
    onCancel() {
      this.triggerEvent('closeSaveBillSub');
    },
    onConfirm() {
      this.triggerEvent('confirmSaveBillSub', {
        saveType: this.data.saveType, 
      });
    },
    stopPropagation(event) {
      // event.stopPropagation(); // 防止点击内容区域关闭弹出窗口
    }
  }
});

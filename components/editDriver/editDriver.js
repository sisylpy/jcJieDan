const { disGetToStockGoodsWithDepIds } = require("../../lib/apiDepOrder");

Component({
  
  properties: {
    showPopup: Boolean,
    type: String, // 操作类型
    message: String,
    warnContent: String,
    depItem: Object,
  },

  observers: {
    'type': function(type) {
      if (type === 'road') {
        this.setData({
          popupTitle: '今日路线',
          message: '写出路线名称'
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

    getName(e){
      var depItem  = this.data.depItem;
      depItem.nxDepartmentPickName = e.detail.value;
      var data = "depItem";
      console.log("evual", e);
      console.log(depItem);
      this.setData({
        [data]: depItem
      })
    },

    isTrue(){

      this.setData({
        true: true,
      })
      

      },

    onCancel() {
      this.triggerEvent('closeRouteName');
    },
    onConfirm() {
      this.triggerEvent('confirmRouteName', {
        depItem: this.data.depItem

      });
    },
    stopPropagation(event) {
      // event.stopPropagation(); // 防止点击内容区域关闭弹出窗口
    }
  }
});

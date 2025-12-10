var load = require('../../lib/load.js');
import { updateOrderPrint } from '../../lib/apiDepOrder';

Component({
  /**
   * 组件的属性列表
   */
  properties: {
    // 是否显示弹窗
    show: {
      type: Boolean,
      value: false,
      observer: function(newVal, oldVal) {
        console.log("[editPrintStandard] show 属性变化:", { newVal, oldVal });
      }
    },
    // 当前编辑的订单
    order: {
      type: Object,
      value: null,
      observer: function(newVal, oldVal) {
        console.log("[editPrintStandard] order 属性变化:", { newVal, oldVal });
      }
    },
    // 初始打印规格值
    printStandard: {
      type: String,
      value: '',
      observer: function(newVal, oldVal) {
        console.log("[editPrintStandard] printStandard 属性变化:", { newVal, oldVal });
      }
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    editPrintStandard: ''
  },

  /**
   * 组件生命周期
   */
  attached() {
    console.log("[editPrintStandard] 组件 attached，当前属性:", {
      show: this.properties.show,
      order: this.properties.order,
      printStandard: this.properties.printStandard
    });
  },

  ready() {
    console.log("[editPrintStandard] 组件 ready，当前属性:", {
      show: this.properties.show,
      order: this.properties.order,
      printStandard: this.properties.printStandard
    });
    console.log("[editPrintStandard] 组件 data:", this.data);
  },

  /**
   * 组件生命周期
   */
  observers: {
    'show, printStandard': function(show, printStandard) {
      console.log("[editPrintStandard] observer 触发:", { show, printStandard });
      if (show) {
        console.log("[editPrintStandard] 显示弹窗，设置 editPrintStandard:", printStandard);
        this.setData({
          editPrintStandard: printStandard || ''
        });
      }
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 阻止事件冒泡
    stopPropagation(e) {
      // 阻止事件冒泡，防止点击弹窗内容时关闭弹窗
      // 不执行任何操作，只是阻止事件冒泡
    },

    // 输入打印规格
    onInput(e) {
      this.setData({
        editPrintStandard: e.detail.value
      });
    },

    // 取消修改
    cancel() {
      this.setData({
        show: false,
        editPrintStandard: ''
      });
      this.triggerEvent('cancel');
    },

    // 确认修改
    confirm() {
      const printName = this.data.editPrintStandard.trim();
      
      if (!printName) {
        wx.showToast({
          title: '请输入打印规格名称',
          icon: 'none'
        });
        return;
      }

      // 使用 properties 中的 order，而不是 data 中的 order
      const order = this.properties.order;
      console.log("[editPrintStandard] confirm - order:", order);
      
      if (!order || !order.nxDepartmentOrdersId) {
        console.error("[editPrintStandard] 订单信息错误:", order);
        wx.showToast({
          title: '订单信息错误',
          icon: 'none'
        });
        return;
      }

      load.showLoading('修改中');
      updateOrderPrint({
        orderId: order.nxDepartmentOrdersId,
        printName: printName
      }).then(res => {
        load.hideLoading();
        if (res.result.code == 0) {
          wx.showToast({
            title: '修改成功',
            icon: 'success'
          });
          this.setData({
            editPrintStandard: ''
          });
          // 触发确认事件，通知父组件刷新数据
          this.triggerEvent('confirm', {
            order: order,
            printStandard: printName
          });
        } else {
          wx.showToast({
            title: res.result.msg || '修改失败',
            icon: 'none'
          });
        }
      }).catch(err => {
        load.hideLoading();
        console.error("[editPrintStandard] 修改失败:", err);
        wx.showToast({
          title: '修改失败',
          icon: 'none'
        });
      });
    }
  }
});


Component({
  
  properties: {
    showPopup: Boolean,
    item: {
      type: Object,
      value: ""
    },
    planOrder: {
      type: String,
      value: ""
    },
 
    applyStandardName: {
      type: String,
      value: ""
    },
    
    

  },

  

  data: {
    priceLevel: 1,
    canConfirm: false
  },

  lifetimes: {
    attached() {
      this.checkCanConfirm();
    }
  },

  methods: {

    getPlanOrder: function(e){
      this.setData({
        planOrder: e.detail.value
      })
      this.checkCanConfirm();
    },

    getStandard: function(e){
      this.setData({
        applyStandardName: e.detail.value
      })
      this.checkCanConfirm();
    },

    checkCanConfirm: function() {
      const canConfirm = this.data.planOrder && this.data.planOrder.trim() && 
                        this.data.applyStandardName && this.data.applyStandardName.trim();
      this.setData({
        canConfirm: canConfirm
      });
    },
    cancle() {
      this.setData({
        show: false,
      })
      this.triggerEvent('cancle')
    },
    delete(){
      // this.setData({
      //   show: false,
      // })
      console.log("delPurGoodsdelPurGoods")
      this.triggerEvent('delPurGoods')

    },

    confirmEdit(e) {
        // 验证两个输入框是否都有有效值
        if (!this.data.canConfirm) {
          wx.showToast({
            title: '请填写采购数量和采购单位',
            icon: 'none',
            duration: 2000
          });
          return;
        }

        console.log("commdmddedididid")
        this.triggerEvent('confirmEditGoods', {
        
          planOrder: this.data.planOrder,
          applyStandardName: this.data.applyStandardName,
          priceLevel: 1

        })

        this.setData({
          show: false,
          ids: [],
          planOrder: "",
          canConfirm: false
        })
    

     
    },



    onCancel() {
      this.triggerEvent('closeEditPurGoods');
    },
    // onConfirm() {
    //   this.triggerEvent('confirmWarn');
    // },
    stopPropagation(event) {
      // event.stopPropagation(); // 防止点击内容区域关闭弹出窗口
    }
  }
});

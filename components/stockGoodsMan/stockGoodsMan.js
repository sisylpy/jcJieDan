Component({
  /**
   * 组件的属性列表
   */
  properties: {
    //是否显示modal
    show: {
      type: Boolean,
      value: true
    },

    item: {
      type: Object,
      value: {
        gbDgsStars: 3, // 默认值，外部传入
      },
    },
    modalHeight: {
      type: Number,
      value: ""
    },
    scrollViewTop: {
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

    consultItem: {
      type: Object,
      value: ""
    },
    canSure: {
      type: Boolean,
      value: true
    },
    nowTime: {
      type: String,
      value: ""
    },
    canWaste: {
      type: Boolean,
      value: false,
    },
    resWeight: {
      type: String,
      value: "0"
    },
    showType: {
      type: String,
      value: ""
    },
    resultTime: {
      type: String,
      value: ""
    },
    depGoods: {
      type: Object,
      value: ""
    },
    depList: {
      type: Array,
      value: []
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    items: [{
        name: '3',
        value: '退货',
      },
      {
        name: '4',
        value: '废弃',
      },
      {
        name: '6',
        value: '转部门',
      }
    ],

    // 转部门相关数据
    selectedDepIndex: -1,
    originalDepName: "",
    originalDepId: "",
    
    reason: "",
    src: ""
  },

  /**
   * 组件的方法列表
   */
  methods: {
    // 转部门相关方法
    onDepChange(e) {
      console.log("=== onDepChange 触发 ===");
      console.log("选择器事件:", e.detail);
      console.log("选择的索引:", e.detail.value);
      console.log("当前depList:", this.data.depList);
      
      var selectedIndex = e.detail.value;
      var selectedDep = this.data.depList[selectedIndex];
      
      console.log("选中的部门:", selectedDep);
      console.log("原部门ID:", this.data.originalDepId);
      
      // 检查是否选择了原部门
      if (selectedDep && selectedDep.gbDepartmentId === this.data.originalDepId) {
        console.log("⚠️ 选择了原部门，不允许转部门");
        wx.showToast({
          title: '不能转给原部门',
          icon: 'none'
        });
        return;
      }
      
      this.setData({
        selectedDepIndex: selectedIndex
      });
      
      console.log("设置后的selectedDepIndex:", this.data.selectedDepIndex);
      
      this._checkTransferCanSure();
    },

    // 检查转部门是否可以确认
    _checkTransferCanSure() {
      console.log("=== _checkTransferCanSure 执行 ===");
      console.log("当前selectedDepIndex:", this.data.selectedDepIndex);
      console.log("当前depList:", this.data.depList);
      console.log("depList长度:", this.data.depList ? this.data.depList.length : 0);
      
      var selectedDepIndex = this.data.selectedDepIndex;
      
      if (selectedDepIndex >= 0 && 
          this.data.depList && this.data.depList.length > 0) {
        console.log("✅ 条件满足，设置canSure为true");
        this.setData({
          canSure: true
        });
      } else {
        console.log("❌ 条件不满足，设置canSure为false");
        console.log("selectedDepIndex !== undefined:", selectedDepIndex !== undefined);
        console.log("depList存在:", !!this.data.depList);
        console.log("depList长度 > 0:", this.data.depList ? this.data.depList.length > 0 : false);

      this.setData({
          canSure: false
      });
      }
      
      console.log("最终canSure状态:", this.data.canSure);
    },

    radioChange(e) {
      var type = e.detail.value;
      console.log("radioChange", type);
      
      // 直接切换显示类型，简化逻辑
        this._changeShowType(e);
    },

    _showTishi() {
      this.setData({
        showType: this.data.showType,
        canChange: false
      })
      wx.showModal({
        title: '有未完成操作',
        content: '只能一次操作一种库存。',
        complete: (res) => {
          if (res.cancel) {
            
          }
      
          if (res.confirm) {
            
          }
        }
      })
    },

    _changeShowType(e) {
      var type = e.detail.value;
      var myReturnWeightData = "item.gbDgsMyReturnWeight";
      var myLossWeightData = "item.gbDgsMyLossWeight";
      this.setData({
        showType: type,
        [myReturnWeightData]: "-1",
        [myLossWeightData]: "-1",
        resWeight: 0,
        // 重置转部门相关数据
        selectedDepIndex: -1,
        canSure: false
      })

      if (type == 3) {
        // 退货
        this.setData({
          canSure: false
        })
      } else if (type == 4) {
        // 废弃
        this.setData({
          canSure: false
        })
      } else if (type == 6) {
        // 转部门
        this.setData({
          canSure: false,
          selectedDepIndex: 0
        })
      }
    },

    getWasteWeight(e) {
      var myProduceWeightData = "item.gbDgsMyProduceWeight";
      var myWasteWeightData = "item.gbDgsMyWasteWeight";
      var restWeight = this.data.item.gbDgsRestWeight;
      var proWeight = (Number(restWeight) - Number(e.detail.value)).toFixed(1);
      if (e.detail.value.length > 0) {
        if (Number(e.detail.value) < Number(restWeight) || Number(e.detail.value) == Number(restWeight)) {
          this.setData({
            [myProduceWeightData]: proWeight,
            canSure: true,
            [myWasteWeightData]: e.detail.value,
           
          })
        } else {

          wx.showToast({
            title: '输入不正确ww,不能大于剩余数量ww',
            icon: 'none'
          })
          this.setData({
            [myWasteWeightData]: "",
            canSure: false,
            [myProduceWeightData]: "-1",

          })
        }
      } else {
        this.setData({
          canSure: false,
          [myWasteWeightData]: "",
          [myProduceWeightData]: "-1",
        })
      }
    },

    getReturnWeight(e) {
      var myReturnWeightData = "item.gbDgsMyReturnWeight";
      var restWeight = this.data.item.gbDgsRestWeight;
      if (e.detail.value.length > 0) {
        if (Number(e.detail.value) < Number(restWeight) || Number(e.detail.value) == Number(restWeight)) {
          this.setData({
            [myReturnWeightData]: e.detail.value,
            canSure: true,
          })
        } else {

          wx.showToast({
            title: '输入不正确,不能大于剩余数量',
            icon: 'none'
          })
          this.setData({
            [myReturnWeightData]: "-1",
            canSure: false,
          })
        }
      } else {
        this.setData({
          [myReturnWeightData]: "-1",
          canSure: false,
        })
      }
    },

    cancle() {
      this.setData({
        show: false,
        showType: 4,
        canSure: true,
        stockArr: [],
        resWeight: 0,
        reason: "",
        src: ""
      })
      this.triggerEvent('cancle')
    },


    costFocusWaste() {
      console.log("acd")
      var inventoryWeight = "item.gbDgsMyWasteWeight";
      this.setData({
        [inventoryWeight]: "",
        canSure: false,
      })
    },

    
    confirm(e) {
      var showType = this.data.showType;
      
      if (showType == 6) {
        // 转部门操作
        if (this.data.selectedDepIndex === undefined || this.data.depList.length === 0) {
          wx.showToast({
            title: '请选择目标部门',
            icon: 'none'
          });
          return;
        }
        
        // 转部门数据验证通过
        this.triggerEvent('confirm', {
          item: this.data.item,
          showType: showType,
          stockId: this.data.item.gbDepartmentGoodsStockId,
          targetDepId: this.data.depList[this.data.selectedDepIndex].gbDepartmentId,
          targetDepName: this.data.depList[this.data.selectedDepIndex].gbDepartmentName
        });
        
        this.setData({
          show: false,
          showType: "3",
          canSure: false,
          selectedDepIndex: -1
        });
        
      } else if (this.data.canSure) {
        // 其他操作（退货、废弃）
        console.log("stockfonfimrmr", this.data.src);
        this.triggerEvent('confirm', {
          item: this.data.item,
          showType: showType,
          src: this.data.src,
          reason: this.data.reason,
        });
        
        this.setData({
          show: false,
          showType: "3",
          canSure: true,
          reason: "",
          src: "",
          resWeight: "0"
        });
      } else {
        wx.showToast({
          title: '请完善操作信息',
          icon: 'none'
        });
      }
    }
  },

  lifetimes: {
    attached() {
      // 组件初始化
      console.log("stockGoodsMan 组件已加载");
      console.log("=== 组件初始化日志 ===");
      console.log("item:", this.data.item);
      console.log("item.gbDepartmentEntity:", this.data.item ? this.data.item.gbDepartmentEntity : "item为空");
      console.log("depList:", this.data.depList);
      console.log("depList长度:", this.data.depList ? this.data.depList.length : 0);
      console.log("selectedDepIndex:", this.data.selectedDepIndex);
      
      // 设置原部门名称和ID
      if (this.data.item && this.data.item.gbDepartmentEntity) {
        console.log("✅ 找到原部门信息");
        console.log("原部门实体:", this.data.item.gbDepartmentEntity);
        console.log("原部门名称:", this.data.item.gbDepartmentEntity.gbDepartmentName);
        console.log("原部门ID:", this.data.item.gbDepartmentEntity.gbDepartmentId);
        
        this.setData({
          originalDepName: this.data.item.gbDepartmentEntity.gbDepartmentName,
          originalDepId: this.data.item.gbDepartmentEntity.gbDepartmentId
        });
        
        console.log("设置后的originalDepName:", this.data.originalDepName);
        console.log("设置后的originalDepId:", this.data.originalDepId);
      } else {
        console.log("⚠️ 无法获取原部门信息");
        if (!this.data.item) {
          console.log("原因: item为空");
        } else if (!this.data.item.gbDepartmentEntity) {
          console.log("原因: item.gbDepartmentEntity为空");
          console.log("item的完整结构:", this.data.item);
        }
      }
      
      // 检查depList数据
      if (this.data.depList && this.data.depList.length > 0) {
        console.log("部门列表数据:");
        this.data.depList.forEach((dep, index) => {
          console.log(`部门${index}:`, {
            id: dep.gbDepartmentId,
            name: dep.gbDepartmentName,
            index: index
          });
        });
      } else {
        console.log("⚠️ depList为空或未定义");
      }
    },
  },

  observers: {
    'depList': function(depList) {
      console.log("=== depList 属性变化 ===");
      console.log("新的depList:", depList);
      console.log("depList长度:", depList ? depList.length : 0);
      
      if (depList && depList.length > 0) {
        console.log("部门列表数据:");
        depList.forEach((dep, index) => {
          console.log(`部门${index}:`, {
            id: dep.gbDepartmentId,
            name: dep.gbDepartmentName,
            index: index
          });
        });
      } else {
        console.log("⚠️ depList为空或未定义");
      }
    },
    
    'item': function(item) {
      console.log("=== item 属性变化 ===");
      console.log("新的item:", item);
      console.log("item.gbDepartmentEntity:", item ? item.gbDepartmentEntity : "item为空");
      
      if (item && item.gbDepartmentEntity) {
        console.log("✅ item变化后找到原部门信息");
        console.log("原部门实体:", item.gbDepartmentEntity);
        console.log("原部门名称:", item.gbDepartmentEntity.gbDepartmentName);
        console.log("原部门ID:", item.gbDepartmentEntity.gbDepartmentId);
        
        this.setData({
          originalDepName: item.gbDepartmentEntity.gbDepartmentName,
          originalDepId: item.gbDepartmentEntity.gbDepartmentId
        });
        
        console.log("设置后的originalDepName:", this.data.originalDepName);
        console.log("设置后的originalDepId:", this.data.originalDepId);
      } else {
        console.log("⚠️ item变化后仍无法获取原部门信息");
        if (!item) {
          console.log("原因: item为空");
        } else if (!item.gbDepartmentEntity) {
          console.log("原因: item.gbDepartmentEntity为空");
          console.log("item的完整结构:", item);
        }
      }
    }
  },
})
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
      value: ""
    },
    maskHeight: {
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
    scaleInput: {
      type: Boolean,
      value: "false"
    }
  },

  /**
   * 组件的初始数据
   */
  data: {
    cartonBuyPrice: '', // 箱单价（用户输入的原始值）
    averageBuyPrice: '', // 平均单价（最小单位单价）
    cartonExpectPrice: '', // 箱零售价（用户输入的原始值）
    averageExpectPrice: '', // 平均建议售价（最小单位零售价）
    scrollViewHeight: 600, // scroll-view 高度（默认值，会根据 windowHeight 计算）
    // 首衡项目：溯源报告相关字段
    traceReportFile: '', // 溯源报告文件路径（临时路径）
    traceReportFilePreview: '', // 溯源报告文件预览（图片预览）
    traceReportFileName: '', // 溯源报告文件名
    isImageFile: false, // 是否为图片文件
    nxTrSupplierId: '', // 供应商ID
    nxTrSupplierName: '', // 供应商名称
    nxTrSupplierContact: '', // 供应商联系方式
    nxTrValidStartDate: '', // 报告有效期开始日期（格式：yyyy-MM-dd）
    nxTrValidEndDate: '', // 报告有效期结束日期（格式：yyyy-MM-dd）
    nxTrRemark: '' // 备注说明
  },

  /**
   * 组件属性监听器
   */
  observers: {
    // 监听 windowHeight 变化，计算 scroll-view 高度
    'windowHeight': function(windowHeight) {
      if (windowHeight) {
        // 计算 scroll-view 高度：80vh 减去头部(120rpx)和按钮区域(约120rpx)
        // 将 px 转换为 rpx (假设 1px = 2rpx，实际根据设备调整)
        const vh = windowHeight * 0.8; // 80vh
        const headerHeight = 120; // 头部高度 rpx
        const buttonHeight = 120; // 按钮区域高度 rpx
        const scrollHeight = (vh * 2) - headerHeight - buttonHeight; // 转换为 rpx
        this.setData({
          scrollViewHeight: Math.max(400, scrollHeight) // 最小高度 400rpx
        });
      }
    },
    // 监听 show 属性变化，关闭时重置内部状态
    'show': function(show) {
      if (!show) {
        // 弹窗关闭时，重置内部状态
        this.setData({
          cartonBuyPrice: '',
          averageBuyPrice: '',
          cartonExpectPrice: '',
          averageExpectPrice: '',
          traceReportFile: '',
          traceReportFilePreview: '',
          traceReportFileName: '',
          isImageFile: false,
          nxTrSupplierId: '',
          nxTrSupplierName: '',
          nxTrSupplierContact: '',
          nxTrValidStartDate: '',
          nxTrValidEndDate: '',
          nxTrRemark: ''
        })
      } else if (this.data.windowHeight) {
        // 弹窗打开时，重新计算高度
        const windowHeight = this.data.windowHeight;
        const vh = windowHeight * 0.8;
        const headerHeight = 120;
        const buttonHeight = 120;
        const scrollHeight = (vh * 2) - headerHeight - buttonHeight;
        this.setData({
          scrollViewHeight: Math.max(400, scrollHeight)
        });
      }
    },
    // 监听 item 属性变化，打开弹窗时重置内部状态
    'item': function(item) {
      if (item && this.data.show) {
        // 获取今天的日期（格式：yyyy-MM-dd）
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const todayStr = `${year}-${month}-${day}`;
        
        // 弹窗打开时，重置内部状态，并设置默认开始日期为今天
        this.setData({
          cartonBuyPrice: '',
          averageBuyPrice: '',
          cartonExpectPrice: '',
          averageExpectPrice: '',
          traceReportFile: '',
          traceReportFilePreview: '',
          traceReportFileName: '',
          isImageFile: false,
          nxTrSupplierId: '',
          nxTrSupplierName: '',
          nxTrSupplierContact: '',
          nxTrValidStartDate: todayStr, // 默认开始日期为今天
          nxTrValidEndDate: '',
          nxTrRemark: ''
        })
      }
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {

    clickMask() {
      this.setData({
        show: false,
      })
    },

    cancle() {
      this.setData({
        show: false,
        editApply: false,
        item: "",
      })
      this.triggerEvent('cancle')
    },

    finish(e){
      this.setData({
        show: false,
        editApply: false,
        item: "",
        
      })
      this.triggerEvent('finish')
    },

    
    // 获取采购单价
    getPurchasePrice(e) {
      console.log("eee")
      var price = e.detail.value;
      const disGoods = this.data.item.nxDistributerGoodsEntity;
      let averagePrice = ''; // 平均单价（最小单位单价，仅用于显示）
      
      // 如果商品有外包装，用户输入的是箱单价，需要计算平均单价（仅用于显示）
      if (disGoods && disGoods.nxDgCartonUnit !== null && disGoods.nxDgCartonUnit !== undefined && disGoods.nxDgCartonUnit !== '') {
        const itemsPerCarton = disGoods.nxDgItemsPerCarton || 1;
        if (itemsPerCarton > 0 && price) {
          // 计算平均单价（最小单位单价，仅用于显示给用户看）
          averagePrice = (Number(price) / Number(itemsPerCarton)).toFixed(1);
          // 保存用户输入的原始价格到 item.nxDpgBuyPrice（用于提交，不除以箱数）
          // 保存箱单价到 cartonBuyPrice（用于显示）
          this.setData({
            'item.nxDpgBuyPrice': price, // 直接保存用户输入的原始价格，后台会计算
            cartonBuyPrice: price,
            averageBuyPrice: averagePrice // 仅用于显示
          });
        } else {
          this.setData({
            'item.nxDpgBuyPrice': price,
            cartonBuyPrice: price,
            averageBuyPrice: ''
          });
        }
      } else {
        // 没有外包装，直接使用输入的价格
        this.setData({
          'item.nxDpgBuyPrice': price,
          cartonBuyPrice: '',
          averageBuyPrice: ''
        });
      }
      
      this._calculateSubtotal();
    },

    // 获取建议售价
    getPurchaseExpectPrice(e) {
      var price = e.detail.value;
      const disGoods = this.data.item.nxDistributerGoodsEntity;
      let averagePrice = ''; // 平均建议售价（最小单位零售价，仅用于显示）
      
      // 如果商品有外包装，用户输入的是箱零售价，需要计算平均建议售价（仅用于显示）
      if (disGoods && disGoods.nxDgCartonUnit !== null && disGoods.nxDgCartonUnit !== undefined && disGoods.nxDgCartonUnit !== '') {
        const itemsPerCarton = disGoods.nxDgItemsPerCarton || 1;
        if (itemsPerCarton > 0 && price) {
          // 计算平均建议售价（最小单位零售价，仅用于显示给用户看）
          averagePrice = (Number(price) / Number(itemsPerCarton)).toFixed(1);
          // 保存用户输入的原始价格到 item.nxDpgExpectPrice（用于提交，不除以箱数）
          // 保存箱零售价到 cartonExpectPrice（用于显示）
          this.setData({
            'item.nxDpgExpectPrice': price, // 直接保存用户输入的原始价格，后台会计算
            cartonExpectPrice: price,
            averageExpectPrice: averagePrice // 仅用于显示
          });
        } else {
          this.setData({
            'item.nxDpgExpectPrice': price,
            cartonExpectPrice: price,
            averageExpectPrice: ''
          });
        }
      } else {
        // 没有外包装，直接使用输入的价格
        this.setData({
          'item.nxDpgExpectPrice': price,
          cartonExpectPrice: '',
          averageExpectPrice: ''
        });
      }
    },

    // 获取采购数量
    getPurchaseQuantity(e) {
      var quantity = e.detail.value;
      this.setData({
        'item.nxDpgBuyQuantity': quantity
      });
      this._calculateSubtotal();
    },

    // 计算总金额
    _calculateSubtotal() {
      const disGoods = this.data.item.nxDistributerGoodsEntity;
      var quantity = Number(this.data.item.nxDpgBuyQuantity) || 0;
      var subtotal = 0;
      
      // 如果商品有外包装，用户输入的是箱数和箱单价，应该用箱单价 × 箱数计算总金额
      if (disGoods && disGoods.nxDgCartonUnit !== null && disGoods.nxDgCartonUnit !== undefined && disGoods.nxDgCartonUnit !== '') {
        // 使用箱单价 × 箱数计算总金额（避免精度误差）
        const cartonPrice = Number(this.data.cartonBuyPrice || this.data.item.nxDpgBuyPrice) || 0;
        if (cartonPrice > 0 && quantity > 0) {
          subtotal = (cartonPrice * quantity).toFixed(2);
        }
      } else {
        // 没有外包装，使用最小单位单价 × 最小单位数量
        var price = Number(this.data.item.nxDpgBuyPrice) || 0;
        subtotal = (price * quantity).toFixed(2);
      }
      
      this.setData({
        'item.nxDpgBuySubtotal': subtotal
      });
    },

    // 检查价格
    _checkPrice(e) {
      var price = e.detail.value;
      if (price && (isNaN(price) || price < 0)) {
        wx.showToast({
          title: '请输入有效的价格',
          icon: 'none'
        });
      }
    },

    // 检查数量
    _checkQuantity(e) {
      var quantity = e.detail.value;
      if (quantity && (isNaN(quantity) || quantity <= 0)) {
        wx.showToast({
          title: '请输入有效的数量',
          icon: 'none'
        });
      }
    },

    // 切换等待入库状态
    changeWait(e) {
      const checked = e.detail.value;
      this.setData({
        'item.isShowTools': checked
      });
    },

    // 首衡项目：选择溯源报告文件（支持图片和PDF）
    chooseTraceReportFile() {
      const that = this;
      // 先让用户选择文件类型
      wx.showActionSheet({
        itemList: ['选择图片', '选择PDF文件'],
        success(res) {
          if (res.tapIndex === 0) {
            // 选择图片
            wx.chooseImage({
              count: 1,
              sizeType: ['original', 'compressed'],
              sourceType: ['album', 'camera'],
              success(res) {
                const tempFilePath = res.tempFilePaths[0];
                const fileName = tempFilePath.split('/').pop() || 'image.jpg';
                that.setData({
                  traceReportFile: tempFilePath,
                  traceReportFilePreview: tempFilePath,
                  traceReportFileName: fileName,
                  isImageFile: true
                });
                wx.showToast({
                  title: '图片已选择',
                  icon: 'success',
                  duration: 1500
                });
              },
              fail(err) {
                console.error('选择图片失败', err);
                wx.showToast({
                  title: '选择图片失败',
                  icon: 'none'
                });
              }
            });
          } else if (res.tapIndex === 1) {
            // 选择PDF文件
            wx.chooseMessageFile({
              count: 1,
              type: 'file',
              extension: ['pdf'],
              success(res) {
                const tempFilePath = res.tempFiles[0].path;
                const fileName = res.tempFiles[0].name || 'document.pdf';
                that.setData({
                  traceReportFile: tempFilePath,
                  traceReportFilePreview: '',
                  traceReportFileName: fileName,
                  isImageFile: false
                });
                wx.showToast({
                  title: 'PDF文件已选择',
                  icon: 'success',
                  duration: 1500
                });
              },
              fail(err) {
                console.error('选择PDF文件失败', err);
                wx.showToast({
                  title: '选择PDF文件失败',
                  icon: 'none'
                });
              }
            });
          }
        }
      });
    },

    // 首衡项目：删除选择的溯源报告文件
    deleteTraceReportFile() {
      this.setData({
        traceReportFile: '',
        traceReportFilePreview: '',
        traceReportFileName: '',
        isImageFile: false
      });
    },

    // 首衡项目：获取供应商名称
    getSupplierName(e) {
      const value = e.detail.value;
      this.setData({
        nxTrSupplierName: value
      });
    },

    // 首衡项目：获取供应商联系方式
    getSupplierContact(e) {
      const value = e.detail.value;
      this.setData({
        nxTrSupplierContact: value
      });
    },

    // 首衡项目：获取有效期开始日期
    getValidStartDate(e) {
      const value = e.detail.value;
      this.setData({
        nxTrValidStartDate: value
      });
    },

    // 首衡项目：获取有效期结束日期
    getValidEndDate(e) {
      const value = e.detail.value;
      this.setData({
        nxTrValidEndDate: value
      });
    },

    // 首衡项目：获取溯源报告备注
    getTraceReportRemark(e) {
      const value = e.detail.value;
      this.setData({
        nxTrRemark: value
      });
    },

    confirm(e) {
        // 验证采购单价
        if (!this.data.item.nxDpgBuyPrice || this.data.item.nxDpgBuyPrice.length == 0) {
          wx.showToast({
            title: '采购单价不能为空',
            icon: 'none'
          })
          return;
        }

        // 验证采购数量
        if (!this.data.item.nxDpgBuyQuantity || this.data.item.nxDpgBuyQuantity.length == 0) {
          wx.showToast({
            title: '采购数量不能为空',
            icon: 'none'
          })
          return;
        }

        // 根据文档：双单价和双零售价功能
        // 如果商品有外包装，需要同时保存箱单价和箱零售价
        const disGoods = this.data.item.nxDistributerGoodsEntity;
        if (disGoods && disGoods.nxDgCartonUnit !== null && disGoods.nxDgCartonUnit !== undefined && disGoods.nxDgCartonUnit !== '') {
          // 有外包装，保存箱单价和箱零售价
          // nxDgssPrice: 最小单位采购单价（已保存在 item.nxDpgBuyPrice）
          // nxDgssPriceCarton: 外包装采购单价（保存在 cartonBuyPrice）
          if (this.data.cartonBuyPrice) {
            this.data.item.nxDgssPriceCarton = this.data.cartonBuyPrice;
          }
          // nxDgssSellingPrice: 最小单位建议零售价（已保存在 item.nxDpgExpectPrice）
          // nxDgssSellingPriceCarton: 外包装建议零售价（保存在 cartonExpectPrice）
          if (this.data.cartonExpectPrice) {
            this.data.item.nxDgssSellingPriceCarton = this.data.cartonExpectPrice;
          }
        }

        // 首衡项目：保存溯源报告相关信息
        // 溯源报告文件路径
        if (this.data.traceReportFile) {
          this.data.item.traceReportFile = this.data.traceReportFile;
        }
        // 供应商信息
        if (this.data.nxTrSupplierId) {
          this.data.item.nxTrSupplierId = this.data.nxTrSupplierId;
        }
        if (this.data.nxTrSupplierName) {
          this.data.item.nxTrSupplierName = this.data.nxTrSupplierName;
        }
        if (this.data.nxTrSupplierContact) {
          this.data.item.nxTrSupplierContact = this.data.nxTrSupplierContact;
        }
        // 有效期
        if (this.data.nxTrValidStartDate) {
          this.data.item.nxTrValidStartDate = this.data.nxTrValidStartDate;
        }
        if (this.data.nxTrValidEndDate) {
          this.data.item.nxTrValidEndDate = this.data.nxTrValidEndDate;
        }
        // 备注
        if (this.data.nxTrRemark) {
          this.data.item.nxTrRemark = this.data.nxTrRemark;
        }

        console.log(this.data.item)
        this.triggerEvent('confirm', {
          item: this.data.item
        })
        this.setData({
          show: false,
        })
    },


    // getPurchasePrice: function (e) {
    //   console.log("getPurchasePrice_getBuySubtotal")
    //   var itemData = "item.nxDpgBuyPrice";
    //   var numberStr = e.detail.value;
    //   //输入非空 
    //   if (e.detail.value.length > 0) {
    //     //0
    //     this.setData({
    //       [itemData]: numberStr,
    //     })
    //     //1. 小数点
    //     var y = String(numberStr).indexOf("."); //获取小数点的位置
    //     if (y !== -1) {
    //       var count = String(numberStr).length - y; //获取小数点后的个数
    //     }
    //     if (count > 2) {
    //       wx.showToast({
    //         title: '小数点只能保留一位',
    //       })
    //       this.setData({
    //         [itemData]: numberStr.substring(0, numberStr.length - 1),
    //       })
    //     }
    //     //2. 值大小判断
    //     if (numberStr > 99999) {
    //       wx.showToast({
    //         title: '最大不能超过九万九千九百九十九',
    //         icon: "none"
    //       })
    //       this.setData({
    //         [itemData]: numberStr.substring(0, numberStr.length - 1),
    //       })
    //     }
    //     this._getBuySubtotal();
    //     this._countOrderCostPrice();
    //   } else {
    //     this._emptyInputPrice();
    //   }
    // },

    getOrderWeight(e) {
      var index = e.currentTarget.dataset.index;
      var doWeightData = "item.nxDepartmentOrdersEntities[" + index + "].nxDoWeight";
      var costSubtotalData = "item.nxDepartmentOrdersEntities[" + index + "].nxDoCostSubtotal";
      var orderWeighValue = e.detail.value;
      var costPrice = this.data.item.nxDepartmentOrdersEntities[index].nxDoCostPrice;    
      var costSubtotal = (Number(costPrice) * Number(orderWeighValue)).toFixed(1);

      //输入非空 
      if (orderWeighValue.length > 0) {

        console.log(costSubtotal);
        console.log("yisagnshicostsubtototototo")
        this.setData({
          [doWeightData]: orderWeighValue,
          [costSubtotalData]: costSubtotal
        })
        var doPrice = this.data.item.nxDepartmentOrdersEntities[index].nxDoPrice; 
        if(doPrice !== null){
          var orderSubtotalData = "item.nxDepartmentOrdersEntities[" + index + "].nxDoSubtotal";
           var doSubtotal = (Number(doPrice) * Number(orderWeighValue)).toFixed(1);
           var profitSubtotal = (Number(doSubtotal) - Number(costSubtotal)).toFixed(1);        
           var profitScale = (Number(profitSubtotal) / Number(doSubtotal) * 100).toFixed(2);
           var profitSubData = "item.nxDepartmentOrdersEntities[" + index + "].nxDoProfitSubtotal";
           var profitScaleData = "item.nxDepartmentOrdersEntities[" + index + "].nxDoProfitScale";
           this.setData({
             [orderSubtotalData] : doSubtotal,
             [profitSubData]: profitSubtotal,
             [profitScaleData]:  profitScale
           })
        }
        

        //1. 小数点
        var y = String(orderWeighValue).indexOf("."); //获取小数点的位置
        console.log(y);
        if (y !== -1) {
          var count = String(orderWeighValue).length - y; //获取小数点后的个数
        }
        if (count > 2) {
          wx.showToast({
            title: '小数点只能保留一位',
          })
          
          var newWeight = Number(orderWeighValue.substring(0, orderWeighValue.length - 1));
          var costSubtotal = (Number(costPrice) * newWeight).toFixed(1);
          this.setData({
            [orderWeightData]: newWeight,
            [costSubtotalData]: costSubtotal
          })
          if(doPrice !== null){
            var orderSubtotalData = "item.nxDepartmentOrdersEntities[" + index + "].nxDoSubtotal";
             var doSubtotal = (Number(doPrice) * Number(newWeight)).toFixed(1);
             var profitSubtotal = (Number(doSubtotal) - Number(costSubtotal)).toFixed(1);        
             var profitScale = (Number(profitSubtotal) / Number(doSubtotal) * 100).toFixed(2);
             var profitSubData = "item.nxDepartmentOrdersEntities[" + index + "].nxDoProfitSubtotal";
             var profitScaleData = "item.nxDepartmentOrdersEntities[" + index + "].nxDoProfitScale";
             this.setData({
               [orderSubtotalData] : doSubtotal,
               [profitSubData]: profitSubtotal,
               [profitScaleData]:  profitScale
             })
          }
          


        }
        //2. 值大小判断
        if (e.detail.value > 99999) {
          wx.showToast({
            title: '最大不能超过九万九千九百九十九',
            icon: "none"
          })
          var newWeight = Number(orderWeighValue.substring(0, orderWeighValue.length - 1));
          var costSubtotal = (Number(price) * newWeight).toFixed(1);
          this.setData({
            [orderWeightData]: newWeight,
            [costSubtotalData]: costSubtotal
          })
          if(doPrice !== null){
            var orderSubtotalData = "item.nxDepartmentOrdersEntities[" + index + "].nxDoSubtotal";
             var doSubtotal = (Number(doPrice) * Number(newWeight)).toFixed(1);
             var profitSubtotal = (Number(doSubtotal) - Number(costSubtotal)).toFixed(1);        
             var profitScale = (Number(profitSubtotal) / Number(doSubtotal) * 100).toFixed(2);
             var profitSubData = "item.nxDepartmentOrdersEntities[" + index + "].nxDoProfitSubtotal";
             var profitScaleData = "item.nxDepartmentOrdersEntities[" + index + "].nxDoProfitScale";
             this.setData({
               [orderSubtotalData] : doSubtotal,
               [profitSubData]: profitSubtotal,
               [profitScaleData]:  profitScale
             })
          }
        
        }
      
      } else {
        this.setData({
          [orderWeightData]: "",
          [subData]: ""
        })
      }
      this._getBuySubtotal();
    },

    _emptyInputPrice() {
      var arr = this.data.item.nxDepartmentOrdersEntities;
      for (var i = 0; i < arr.length; i++) {
        var orderPriceData = "item.nxDepartmentOrdersEntities[" + i + "].nxDoCostPrice";
        var subData = "item.nxDepartmentOrdersEntities[" + i + "].nxDoCostSubtotal";
        this.setData({
          [orderPriceData]: "",
          [subData]: ""
        })
      }
      var subData = "item.nxDpgBuySubtotal";
      var priceData = "item.nxDpgBuyPrice";
      this.setData({
        [subData]: "",
        [priceData]: "",
      })
    },
    
   
    _countOrderCostPrice() {
      var buyPrice = Number(this.data.item.nxDpgBuyPrice);
      var arr = this.data.item.nxDepartmentOrdersEntities;
      for (var i = 0; i < arr.length; i++) {
        var costPriceData = "item.nxDepartmentOrdersEntities[" + i + "].nxDoCostPrice";
        this.setData({
          [costPriceData]: buyPrice,         
        })
        var doWeight = this.data.item.nxDepartmentOrdersEntities[i].nxDoWeight;
        if(doWeight !== null && doWeight > 0){
          var costSubtotalData = "item.nxDepartmentOrdersEntities[" + i + "].nxDoCostSubtotal";
          var costSubtotal = (Number(buyPrice) * Number(doWeight)).toFixed(1);
          this.setData({
            [costSubtotalData]: costSubtotal,         
          })
        }
      }
      this._getBuySubtotal();
    },

    _getBuySubtotal(e) {
      var arr = this.data.item.nxDepartmentOrdersEntities;
      var purGoodsBuyQuantity = "";
      var buyPrice = this.data.item.nxDpgBuyPrice;

      for (var i = 0; i < arr.length; i++) {
       var doWeight = arr[i].nxDoWeight;
        purGoodsBuyQuantity = (Number(purGoodsBuyQuantity) + Number(doWeight)).toFixed(1);
      }
      var purGoodsBuySubtotal = (Number(purGoodsBuyQuantity) * Number(buyPrice)).toFixed(1);
      var purGoodsBuySubtotalData = "item.nxDpgBuySubtotal";
      var purGoodsBuyQuantityData = "item.nxDpgBuyQuantity";
      this.setData({
        [purGoodsBuySubtotalData]: purGoodsBuySubtotal,
        [purGoodsBuyQuantityData]: purGoodsBuyQuantity,
      })
    },

    
    _countOrderSubtotal(){
      var doPrice = this.data.item.nxDpgBuyPrice;
      var arr = this.data.item.nxDepartmentOrdersEntities;
      for(var i = 0; i < arr.length; i++){
        var priceData = "item.nxDepartmentOrdersEntities[" + i +"].nxDoCostPrice";
        this.setData({
          [priceData]: doPrice,
        })
      }
    },












  },




})
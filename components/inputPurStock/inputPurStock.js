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
    shelfLifeUnitOptions: [{ label: '天', value: '天' }, { label: '月', value: '月' }, { label: '年', value: '年' }],
    shelfLifeUnitIndex: 0,
    calculatedExpiryDate: '', // 根据生产日期+保质期自动计算的过期日期，仅用于展示
    /** 有外包装单位时可与最小单位切换 */
    hasPurchasableCarton: false,
    /** true：数量/单价按箱；false：按最小单位（nxDgGoodsStandardname） */
    purchaseUseCartonUnit: true
  },

  /**
   * 组件属性监听器
   */
  observers: {
    // 监听 show 属性变化，关闭时重置内部状态
    'show': function(show) {
      if (!show) {
        this.setData({
          cartonBuyPrice: '',
          averageBuyPrice: '',
          cartonExpectPrice: '',
          averageExpectPrice: '',
          calculatedExpiryDate: '',
          shelfLifeUnitIndex: 0
        })
      } else {
        const item = this.data.item;
        const disGoods = item && item.nxDistributerGoodsEntity;
        const hasCarton = this._hasOuterCarton(disGoods);
        const purchaseUseCarton = hasCarton ? this._inferPurchaseUseCartonUnit(disGoods, item) : false;
        const qtyU = this._quantityInputStr(item);
        console.log('[inputPurStock] show=true', {
          hasPurchasableCarton: hasCarton,
          nxDgCartonUnit: disGoods && disGoods.nxDgCartonUnit,
          nxDgGoodsStandardname: disGoods && disGoods.nxDgGoodsStandardname,
          purchaseUseCartonUnit: purchaseUseCarton,
          nxDpgStandard: item && item.nxDpgStandard,
          qtyUnified: qtyU
        });
        const openPatch = {
          hasPurchasableCarton: hasCarton,
          purchaseUseCartonUnit: purchaseUseCarton
        };
        if (item && qtyU !== '') {
          openPatch['item.nxDpgBuyQuantity'] = qtyU;
          openPatch['item.nxDpgQuantity'] = qtyU;
        }
        this.setData(openPatch);
      }
    },
    // 监听 item：须与 show 解耦同步「是否有箱单位」，否则先赋值 item 再打开 show 会一直走最小单位展示
    'item': function(item) {
      if (!item || typeof item !== 'object') {
        return;
      }
      const disGoods = item.nxDistributerGoodsEntity;
      const hasCarton = this._hasOuterCarton(disGoods);
      const purchaseUseCarton = hasCarton ? this._inferPurchaseUseCartonUnit(disGoods, item) : false;
      const qtyU = this._quantityInputStr(item);
      console.log('[inputPurStock] item change', {
        show: this.data.show,
        hasPurchasableCarton: hasCarton,
        nxDgCartonUnit: disGoods && disGoods.nxDgCartonUnit,
        nxDgGoodsStandardname: disGoods && disGoods.nxDgGoodsStandardname,
        purchaseUseCartonUnit: purchaseUseCarton,
        nxDpgBuyQuantity: item.nxDpgBuyQuantity,
        nxDpgQuantity: item.nxDpgQuantity
      });
      const unitMap = { '天': 0, '月': 1, '年': 2 };
      const idx = unitMap[item.nxDpgShelfLifeUnit] ?? 0;
      if (this.data.show) {
        const patch = {
          cartonBuyPrice: '',
          averageBuyPrice: '',
          cartonExpectPrice: '',
          averageExpectPrice: '',
          shelfLifeUnitIndex: idx,
          hasPurchasableCarton: hasCarton,
          purchaseUseCartonUnit: purchaseUseCarton
        };
        if (qtyU !== '') {
          patch['item.nxDpgBuyQuantity'] = qtyU;
          patch['item.nxDpgQuantity'] = qtyU;
        }
        this.setData(patch);
        this._computeAndSetExpiryDate(item);
      } else {
        this.setData({
          hasPurchasableCarton: hasCarton,
          purchaseUseCartonUnit: purchaseUseCarton
        });
      }
    }
  },

  /**
   * 组件的方法列表
   */
  methods: {

    _hideKeyboard() {
      if (typeof wx.hideKeyboard !== 'function') return;
      wx.hideKeyboard({
        fail: function() {}
      });
    },

    hideKeyboard() {
      this._hideKeyboard();
    },

    _hasOuterCarton(disGoods) {
      if (!disGoods) return false;
      const u = disGoods.nxDgCartonUnit;
      if (u == null) return false;
      const s = String(u).trim();
      if (s === '' || s === 'null' || s === 'undefined') return false;
      return true;
    },

    /** 与父页面提交字段对齐：输入框用 nxDpgBuyQuantity，接口/列表常用 nxDpgQuantity */
    _quantityInputStr(item) {
      if (!item || typeof item !== 'object') return '';
      const a = item.nxDpgBuyQuantity;
      const b = item.nxDpgQuantity;
      if (a != null && String(a).length > 0) return String(a);
      if (b != null && String(b).length > 0) return String(b);
      return '';
    },

    /**
     * 根据已保存的 nxDpgStandard 推断当前是按箱还是按最小单位录入（与 shelf 打开时默认箱价逻辑一致）
     */
    _inferPurchaseUseCartonUnit(disGoods, item) {
      if (!this._hasOuterCarton(disGoods) || !item) return false;
      const stdName = String(disGoods.nxDgGoodsStandardname || '').trim();
      const cartonName = String(disGoods.nxDgCartonUnit || '').trim();
      const saved = String(item.nxDpgStandard || '').trim();
      if (saved && stdName && saved === stdName) return false;
      if (saved && cartonName && saved === cartonName) return true;
      return true;
    },

    /** 当前是否按箱录入（与展示单位一致） */
    _useCartonPurchaseMode() {
      return this.data.hasPurchasableCarton && this.data.purchaseUseCartonUnit;
    },

    _isNearlyInteger(n, eps) {
      var e = eps == null ? 1e-5 : eps;
      if (n == null || isNaN(n)) return false;
      return Math.abs(n - Math.round(n)) < e;
    },

    /**
     * 按大件（箱）录入：数量×每箱件数 必须为小单位整数，否则后台/展示会出现「1箱1.7999桶」
     */
    _checkCartonQtyIntegerSmall(qtyStr) {
      if (!this._useCartonPurchaseMode()) return { ok: true };
      var disGoods = this.data.item && this.data.item.nxDistributerGoodsEntity;
      if (!this._hasOuterCarton(disGoods)) return { ok: true };
      var ipc = Number(disGoods.nxDgItemsPerCarton) || 1;
      var q = Number(qtyStr);
      if (!qtyStr || String(qtyStr).trim() === '' || isNaN(q) || q <= 0) return { ok: true };
      var smallTotal = q * ipc;
      if (this._isNearlyInteger(smallTotal)) return { ok: true };
      var cartonLabel = String(disGoods.nxDgCartonUnit || '').trim() || '大件';
      var smallLabel = String(disGoods.nxDgGoodsStandardname || '').trim() || '小单位';
      var displaySmall = Number.isFinite(smallTotal)
        ? String(Math.round(smallTotal * 1000) / 1000)
        : String(smallTotal);
      return {
        ok: false,
        kind: 'carton_to_small',
        cartonLabel: cartonLabel,
        smallLabel: smallLabel,
        qtyStr: qtyStr,
        ipc: ipc,
        smallTotal: displaySmall
      };
    },

    /** 按小单位录入切换到箱：小单位数量须为每箱件数的整数倍 */
    _checkSmallQtyIntegerCartons(qtyStr) {
      if (this._useCartonPurchaseMode()) return { ok: true };
      var disGoods = this.data.item && this.data.item.nxDistributerGoodsEntity;
      if (!this._hasOuterCarton(disGoods)) return { ok: true };
      var ipc = Number(disGoods.nxDgItemsPerCarton) || 1;
      if (ipc <= 1) return { ok: true };
      var q = Number(qtyStr);
      if (!qtyStr || String(qtyStr).trim() === '' || isNaN(q) || q <= 0) return { ok: true };
      var cartons = q / ipc;
      if (this._isNearlyInteger(cartons)) return { ok: true };
      var cartonLabel = String(disGoods.nxDgCartonUnit || '').trim() || '大件';
      var smallLabel = String(disGoods.nxDgGoodsStandardname || '').trim() || '小单位';
      var displayCartons = Number.isFinite(cartons)
        ? String(Math.round(cartons * 1000) / 1000)
        : String(cartons);
      return {
        ok: false,
        kind: 'small_to_carton',
        cartonLabel: cartonLabel,
        smallLabel: smallLabel,
        qtyStr: qtyStr,
        ipc: ipc,
        cartons: displayCartons
      };
    },

    _showIntegerQtyMismatchModal(r) {
      var content = '';
      if (r.kind === 'carton_to_small') {
        content = '按【' + r.cartonLabel + '】录入 ' + r.qtyStr + '，换算成【' + r.smallLabel + '】为 ' + r.smallTotal + '，不是整数。\n\n请改为整【' + r.cartonLabel + '】数量（使换算后【' + r.smallLabel + '】为整数），或点击蓝色单位切换为【' + r.smallLabel + '】后按小单位填写。';
      } else {
        content = '当前【' + r.smallLabel + '】数量为 ' + r.qtyStr + '，每' + r.cartonLabel + '含 ' + r.ipc + r.smallLabel + '，折算为 ' + r.cartons + r.cartonLabel + '，不是整数。\n\n请把【' + r.smallLabel + '】数量改成 ' + r.ipc + ' 的整数倍，或保持按【' + r.smallLabel + '】录入。';
      }
      wx.showModal({
        title: '数量无法整除',
        content: content,
        showCancel: false,
        confirmText: '知道了'
      });
    },

    _fmtQty(n) {
      if (n == null || isNaN(n)) return '';
      const x = Math.round(Number(n) * 1000) / 1000;
      let s = String(x);
      if (s.indexOf('.') >= 0) s = s.replace(/\.?0+$/, '');
      return s;
    },

    _fmtPrice(n) {
      if (n == null || isNaN(n)) return '';
      const x = Math.round(Number(n) * 100) / 100;
      let s = x.toFixed(2);
      if (s.endsWith('.00')) s = s.slice(0, -3);
      else if (/0$/.test(s)) s = s.replace(/0+$/, '').replace(/\.$/, '');
      return s;
    },

    /** 有外包装时点击单位：箱 ↔ 最小单位，并按每件/每箱数换算数量与单价 */
    togglePurchaseUnit() {
      this._hideKeyboard();
      if (!this.data.hasPurchasableCarton) return;
      const disGoods = this.data.item.nxDistributerGoodsEntity;
      console.log('[inputPurStock] togglePurchaseUnit', {
        fromCarton: this.data.purchaseUseCartonUnit,
        ipc: disGoods.nxDgItemsPerCarton
      });
      const ipc = Number(disGoods.nxDgItemsPerCarton) || 1;
      const fromCarton = this.data.purchaseUseCartonUnit;
      const patch = { purchaseUseCartonUnit: !fromCarton };

      const qStr = this._quantityInputStr(this.data.item);
      const q = parseFloat(qStr);
      const hasQty = qStr !== '' && qStr != null && !isNaN(q);

      if (fromCarton && hasQty) {
        const badCarton = this._checkCartonQtyIntegerSmall(qStr);
        if (!badCarton.ok) {
          this._showIntegerQtyMismatchModal(badCarton);
          return;
        }
      }
      if (!fromCarton && hasQty) {
        const badSmall = this._checkSmallQtyIntegerCartons(qStr);
        if (!badSmall.ok) {
          this._showIntegerQtyMismatchModal(badSmall);
          return;
        }
      }

      const stdLabel = String(disGoods.nxDgGoodsStandardname || '').trim();
      const cartonLabel = String(disGoods.nxDgCartonUnit || '').trim();
      patch['item.nxDpgStandard'] = fromCarton ? stdLabel : cartonLabel;

      if (fromCarton) {
        if (hasQty) {
          const nq = this._fmtQty(q * ipc);
          patch['item.nxDpgBuyQuantity'] = nq;
          patch['item.nxDpgQuantity'] = nq;
        }
        const bp = parseFloat(this.data.item.nxDpgBuyPrice);
        if (this.data.item.nxDpgBuyPrice !== '' && this.data.item.nxDpgBuyPrice != null && !isNaN(bp)) {
          patch['item.nxDpgBuyPrice'] = this._fmtPrice(bp / ipc);
        }
        patch.cartonBuyPrice = '';
        patch.averageBuyPrice = '';
        const ep = parseFloat(this.data.item.nxDpgExpectPrice);
        if (this.data.item.nxDpgExpectPrice !== '' && this.data.item.nxDpgExpectPrice != null && !isNaN(ep)) {
          patch['item.nxDpgExpectPrice'] = this._fmtPrice(ep / ipc);
        }
        patch.cartonExpectPrice = '';
        patch.averageExpectPrice = '';
      } else {
        if (hasQty) {
          const nq = this._fmtQty(q / ipc);
          patch['item.nxDpgBuyQuantity'] = nq;
          patch['item.nxDpgQuantity'] = nq;
        }
        const bp = parseFloat(this.data.item.nxDpgBuyPrice);
        if (this.data.item.nxDpgBuyPrice !== '' && this.data.item.nxDpgBuyPrice != null && !isNaN(bp)) {
          const cartonP = bp * ipc;
          patch['item.nxDpgBuyPrice'] = this._fmtPrice(cartonP);
          patch.cartonBuyPrice = patch['item.nxDpgBuyPrice'];
          patch.averageBuyPrice = bp > 0 ? bp.toFixed(1) : '';
        }
        const ep = parseFloat(this.data.item.nxDpgExpectPrice);
        if (this.data.item.nxDpgExpectPrice !== '' && this.data.item.nxDpgExpectPrice != null && !isNaN(ep)) {
          const cartonE = ep * ipc;
          patch['item.nxDpgExpectPrice'] = this._fmtPrice(cartonE);
          patch.cartonExpectPrice = patch['item.nxDpgExpectPrice'];
          patch.averageExpectPrice = ep > 0 ? ep.toFixed(1) : '';
        } else {
          patch.cartonExpectPrice = '';
          patch.averageExpectPrice = '';
        }
      }

      this.setData(patch);
      console.log('[inputPurStock] togglePurchaseUnit after', {
        purchaseUseCartonUnit: patch.purchaseUseCartonUnit,
        nxDpgStandard: patch['item.nxDpgStandard'],
        nxDpgBuyQuantity: patch['item.nxDpgBuyQuantity'],
        nxDpgQuantity: patch['item.nxDpgQuantity']
      });
      this._calculateSubtotal();
    },

    clickMask() {
      this._hideKeyboard();
      this.setData({
        show: false,
      })
    },

    cancle() {
      this._hideKeyboard();
      this.setData({
        show: false,
        editApply: false,
        item: "",
      })
      this.triggerEvent('cancle')
    },

    finish(e){
      this._hideKeyboard();
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
      
      // 如果按箱录入，用户输入的是箱单价，需要计算平均单价（仅用于显示）
      if (this._useCartonPurchaseMode()) {
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
      
      // 如果按箱录入，用户输入的是箱零售价，需要计算平均建议售价（仅用于显示）
      if (this._useCartonPurchaseMode()) {
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
        'item.nxDpgBuyQuantity': quantity,
        'item.nxDpgQuantity': quantity
      });
      this._calculateSubtotal();
    },

    // 计算总金额
    _calculateSubtotal() {
      const disGoods = this.data.item.nxDistributerGoodsEntity;
      var quantity = Number(this._quantityInputStr(this.data.item)) || 0;
      var subtotal = 0;
      
      // 按箱录入：箱单价 × 箱数
      if (this._useCartonPurchaseMode()) {
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
      this._hideKeyboard();
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
      this._hideKeyboard();
      var quantity = e.detail.value;
      if (quantity && (isNaN(quantity) || quantity <= 0)) {
        wx.showToast({
          title: '请输入有效的数量',
          icon: 'none'
        });
        return;
      }
      var chk = this._checkCartonQtyIntegerSmall(quantity != null ? String(quantity) : '');
      if (!chk.ok) {
        this._showIntegerQtyMismatchModal(chk);
      }
    },

    // 切换等待入库状态
    changeWait(e) {
      this._hideKeyboard();
      const checked = e.detail.value;
      this.setData({
        'item.isShowTools': checked
      });
    },

    // 生产日期
    onProduceDateChange(e) {
      this._hideKeyboard();
      const date = e.detail.value;
      this.setData({
        'item.nxDpgProduceDate': date
      });
      this._computeAndSetExpiryDate();
    },

    // 保质期数值
    onShelfLifeInput(e) {
      const val = e.detail.value;
      const parsed = val === '' ? NaN : parseInt(val, 10);
      this.setData({
        'item.nxDpgShelfLife': (val === '' || isNaN(parsed)) ? '' : parsed
      });
      this._computeAndSetExpiryDate();
    },

    // 保质期单位
    onShelfLifeUnitChange(e) {
      this._hideKeyboard();
      const idx = parseInt(e.detail.value, 10);
      const unit = this.data.shelfLifeUnitOptions[idx].value;
      this.setData({
        shelfLifeUnitIndex: idx,
        'item.nxDpgShelfLifeUnit': unit
      });
      this._computeAndSetExpiryDate();
    },

    // 过期日期（用户手动选择时使用，不传则后端自动计算）
    onExpiryDateChange(e) {
      this._hideKeyboard();
      const date = e.detail.value;
      this.setData({
        'item.nxDpgExpiryDate': date
      });
    },

    // 根据生产日期+保质期计算过期日期（仅用于展示）
    _computeAndSetExpiryDate(item) {
      const it = item || this.data.item;
      const produceDate = it.nxDpgProduceDate;
      const shelfLife = it.nxDpgShelfLife;
      const unit = it.nxDpgShelfLifeUnit;
      if (!produceDate || !shelfLife || !unit) {
        this.setData({ calculatedExpiryDate: '' });
        return;
      }
      const d = new Date(produceDate);
      if (unit === '天') {
        d.setDate(d.getDate() + parseInt(shelfLife, 10));
      } else if (unit === '月') {
        d.setMonth(d.getMonth() + parseInt(shelfLife, 10));
      } else if (unit === '年') {
        d.setFullYear(d.getFullYear() + parseInt(shelfLife, 10));
      }
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const calculated = `${y}-${m}-${day}`;
      this.setData({
        calculatedExpiryDate: calculated
      });
    },

    confirm(e) {
        this._hideKeyboard();
        const disGoods = this.data.item.nxDistributerGoodsEntity;
        const qtyStr = this._quantityInputStr(this.data.item);
        this.data.item.nxDpgBuyQuantity = qtyStr;
        this.data.item.nxDpgQuantity = qtyStr;
        if (disGoods) {
          if (this._useCartonPurchaseMode()) {
            this.data.item.nxDpgStandard = String(disGoods.nxDgCartonUnit || '').trim();
          } else {
            this.data.item.nxDpgStandard = String(disGoods.nxDgGoodsStandardname || '').trim();
          }
        }

        // 验证采购单价
        if (!this.data.item.nxDpgBuyPrice || this.data.item.nxDpgBuyPrice.length == 0) {
          wx.showToast({
            title: '采购单价不能为空',
            icon: 'none'
          })
          return;
        }

        // 验证采购数量
        if (!qtyStr || qtyStr.length == 0) {
          wx.showToast({
            title: '采购数量不能为空',
            icon: 'none'
          })
          return;
        }

        var cartonChk = this._checkCartonQtyIntegerSmall(qtyStr);
        if (!cartonChk.ok) {
          this._showIntegerQtyMismatchModal(cartonChk);
          return;
        }

        // 根据文档：双单价和双零售价功能
        // 如果商品有外包装，需要同时保存箱单价和箱零售价
        if (this._hasOuterCarton(disGoods)) {
          const ipc = Number(disGoods.nxDgItemsPerCarton) || 1;
          if (this.data.purchaseUseCartonUnit) {
            if (this.data.cartonBuyPrice) {
              this.data.item.nxDgssPriceCarton = this.data.cartonBuyPrice;
            }
            if (this.data.cartonExpectPrice) {
              this.data.item.nxDgssSellingPriceCarton = this.data.cartonExpectPrice;
            }
          } else {
            const bp = Number(this.data.item.nxDpgBuyPrice);
            const ep = Number(this.data.item.nxDpgExpectPrice);
            if (!isNaN(bp) && bp > 0) {
              this.data.item.nxDgssPriceCarton = this._fmtPrice(bp * ipc);
            }
            if (!isNaN(ep) && ep > 0) {
              this.data.item.nxDgssSellingPriceCarton = this._fmtPrice(ep * ipc);
            }
          }
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

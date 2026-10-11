Component({
  data: {
    kind: '',
    total: 0,
    customers: [],
    items: [],
    billCount: 0,
    unsettledAmount: 0
  },
  lifetimes: {
    created() {
      // 原子组件通过 wx.modelContext 与 AI 对话流交互，接收原子接口返回结果
      if (!wx.modelContext) return
      this._modelCtx = wx.modelContext.getContext(this)
      this._modelCtx.on(wx.modelContext.NotificationType.Result, (data) => {
        const result = (data && data.result) || {}
        const sc = result.structuredContent || {}
        const meta = result._meta || {}
        if (sc.customers) {
          this.setData({ kind: 'customers', total: sc.total, customers: meta.customers || sc.customers })
        } else if (sc.items) {
          this.setData({ kind: 'orders', items: meta.items || sc.items })
        } else if (sc.billCount !== undefined) {
          this.setData({ kind: 'bill', billCount: sc.billCount, unsettledAmount: sc.unsettledAmount })
        }
      })
    }
  }
})

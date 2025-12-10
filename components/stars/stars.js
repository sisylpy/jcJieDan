Component({
  properties: {
    value: { // 评分值
      type: Number,
      value: 0
    },
    total: { // 总星数
      type: Number,
      value: 5
    }
  },
  data: {
    // 用于遍历
    starList: []
  },
  lifetimes: {
    attached() {
      this.initStarList();
    }
  },
  observers: {
    'value, total'() {
      this.initStarList();
    }
  },
  methods: {
    initStarList() {
      const { value, total } = this.data;
      // starList = [1,2,3,4,5] 固定 5 个
      const arr = [];
      for (let i = 1; i <= total; i++) {
        arr.push({
          active: i <= value // active 为 true 则是绿色星星，否则灰色星星
        });
      }
      this.setData({ starList: arr });
    }
  }
});

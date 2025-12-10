
Page({
  data: {
    showOrder: false,
    selectedDish: '',
    avatarAnimation: null
  },

  onLoad() {
    this.animateAvatar();
  },

  animateAvatar() {
    const animation = wx.createAnimation({
      duration: 1000,
      timingFunction: 'ease-in-out',
    });

    setInterval(() => {
      animation.translateY(-10).step().translateY(0).step();
      this.setData({ avatarAnimation: animation.export() });
    }, 2000);
  },

  onAiTap() {
    wx.navigateTo({ url: '/pages/recommend/recommend' });
  },

  onInput(e) {
    const dishName = e.detail.value.trim();
    if (dishName) {
      this.setData({ selectedDish: dishName, showOrder: true });
    } else {
      this.setData({ showOrder: false });
    }
  },

  confirmOrder() {
    wx.showToast({ title: `已下单：${this.data.selectedDish}`, icon: 'success' });
    this.setData({ showOrder: false, selectedDish: '' });
  },

  cancelOrder() {
    this.setData({ showOrder: false });
  }
});
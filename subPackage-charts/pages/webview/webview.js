// 用于打开扫码结果等外部链接（如微信公众号 weixin.qq.com）
Page({
  data: {
    url: ''
  },
  onLoad(options) {
    const url = options.url ? decodeURIComponent(options.url) : '';
    this.setData({ url });
  }
});

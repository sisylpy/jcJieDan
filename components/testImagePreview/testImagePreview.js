// 最简单的测试组件
console.log('[testImagePreview组件] ========== 组件文件开始加载 ==========');
console.log('[testImagePreview组件] 文件路径: components/testImagePreview/testImagePreview.js');
console.log('[testImagePreview组件] 当前时间:', new Date().toISOString());

Component({
  properties: {
    testProp: {
      type: String,
      value: '默认值'
    }
  },
  data: {
    testData: '测试数据'
  },
  attached: function() {
    console.log('[testImagePreview组件] ========== attached 生命周期 ==========');
    console.log('[testImagePreview组件] testProp:', this.properties.testProp);
    console.log('[testImagePreview组件] testData:', this.data.testData);
    console.log('[testImagePreview组件] ========================================');
  },
  methods: {}
})

